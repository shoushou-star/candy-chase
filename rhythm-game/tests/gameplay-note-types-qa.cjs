const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright-core');

const projectDir = resolve(__dirname, '..');
const outputDir = resolve(projectDir, '..', 'docs', 'qa');
const targetUrl = `${pathToFileURL(resolve(projectDir, 'index.html')).href}?qa=note-types`;
let browser;

async function sampleAt(page, time, selector, expectedProgress) {
  await page.evaluate((value) => window.__setMediaTime(value), time);
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  const sample = await page.locator(selector).first().evaluate((element, progress) => {
    const path = document.querySelector('#travelPath');
    const stage = document.querySelector('#gameStage').getBoundingClientRect();
    const point = path.getPointAtLength(path.getTotalLength() * progress);
    const bounds = element.getBoundingClientRect();
    return {
      src: element.getAttribute('src'),
      progress: Number(element.dataset.progress),
      accelerating: element.classList.contains('is-accelerating'),
      centerError: Math.hypot(
        bounds.x + bounds.width / 2 - (stage.x + point.x / 2048 * stage.width),
        bounds.y + bounds.height / 2 - (stage.y + point.y / 1152 * stage.height),
      ),
    };
  }, expectedProgress);
  assert.ok(Math.abs(sample.progress - expectedProgress) <= 0.000051,
    `${selector} progress should be ${expectedProgress}, received ${sample.progress}`);
  assert.ok(sample.centerError < 0.08, `${selector} must stay centered on the SVG path: ${sample.centerError}px`);
  return sample;
}

(async () => {
  browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  // Only audio clocks are controlled; the chart, renderer, assets and SVG geometry are real.
  await page.addInitScript(() => {
    let mediaTime = 0;
    let sfxTime = 0;
    Object.defineProperties(HTMLMediaElement.prototype, {
      duration: { configurable: true, get: () => 69.218005 },
      currentTime: { configurable: true, get: () => mediaTime, set: (value) => { mediaTime = value; } },
      readyState: { configurable: true, get: () => 4 },
      paused: { configurable: true, get() { return this.__paused !== false; } },
    });
    HTMLMediaElement.prototype.play = async function play() { this.__paused = false; };
    HTMLMediaElement.prototype.pause = function pause() { this.__paused = true; };
    window.__setMediaTime = (value) => { mediaTime = value; };
    window.__setSfxTime = (value) => { sfxTime = value; };
    class AudioNode {
      constructor() { this.frequency = this.gain = { setValueAtTime() {}, exponentialRampToValueAtTime() {} }; }
      connect(target) { return target; }
      start() {}
      stop() {}
    }
    class AudioContext {
      constructor() { this.destination = new AudioNode(); this.state = 'suspended'; }
      get currentTime() { return sfxTime; }
      async resume() { this.state = 'running'; }
      async suspend() { this.state = 'suspended'; }
      createOscillator() { return new AudioNode(); }
      createGain() { return new AudioNode(); }
    }
    window.AudioContext = window.webkitAudioContext = AudioContext;
  });
  await page.goto(targetUrl, { waitUntil: 'load' });
  await page.locator('#startButton').click();
  await page.locator('#countdown').waitFor({ state: 'visible' });
  await page.evaluate(() => window.__setSfxTime(3.05));
  await page.waitForFunction(() => document.querySelector('#countdown').hidden
    && !document.querySelector('#gameBgm').paused);
  const definitions = await page.evaluate(() => ({
    normal: window.RhythmGameChart.NOTES.find((note) => note.type === 'normal'),
    speed: window.RhythmGameChart.NOTES.find((note) => note.type === 'speed'),
    hold: window.RhythmGameChart.NOTES.find((note) => note.type === 'hold'),
  }));
  // Breaks caught: ID-based colors, linear speed motion, drifting centers, and repeated flashes.
  await page.evaluate((time) => window.__setMediaTime(time), definitions.normal.spawnTime + 0.5);
  await page.waitForFunction(() => document.querySelectorAll('.note').length > 0);
  assert.equal(await page.locator('.note-normal').count(), 1, 'normal candy must expose its type identity');
  const normalSamples = [];
  for (const [elapsed, progress] of [[0.5, 0.25], [1.3, 0.65], [1.65, 0.825], [2, 1]]) {
    const sample = await sampleAt(page, definitions.normal.spawnTime + elapsed, '.note-normal', progress);
    assert.match(sample.src, /candy-pink\.png$/);
    assert.equal(sample.accelerating, false);
    normalSamples.push(sample);
  }
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#scoreValue').textContent(), '100', 'normal arrival uses the existing hit time');

  const before = await sampleAt(page, definitions.speed.spawnTime + 0.5, '.note-speed', 0.134615384615);
  assert.match(before.src, /candy-yellow\.png$/);
  assert.equal(before.accelerating, false);
  const normalSources = await page.locator('.note-normal').evaluateAll((elements) => elements.map((element) => element.getAttribute('src')));
  assert.ok(normalSources.length > 0);
  normalSources.forEach((src) => assert.match(src, /candy-pink\.png$/));
  await page.locator('.note-speed').evaluate((element) => {
    window.__speedFlashCount = 0;
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (!mutation.oldValue.split(' ').includes('is-accelerating')
          && element.classList.contains('is-accelerating')) window.__speedFlashCount += 1;
      }
    }).observe(element, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  });
  const transition = await sampleAt(page, definitions.speed.accelerationAt, '.note-speed', 0.35);
  assert.equal(transition.accelerating, true);
  assert.equal(await page.locator('.note-speed').evaluate((element) => getComputedStyle(element).animationDuration), '0.22s');
  mkdirSync(outputDir, { recursive: true });
  await page.screenshot({ path: resolve(outputDir, 'rhythm-game-note-types-acceleration.png') });
  await page.waitForFunction(() => !document.querySelector('.note-speed').classList.contains('is-accelerating'));
  const after = await sampleAt(page, definitions.speed.spawnTime + 1.65, '.note-speed', 0.675);
  assert.equal(after.accelerating, false, 'acceleration flash must not replay on later frames');
  const arrived = await sampleAt(page, definitions.speed.hitTime, '.note-speed', 1);
  assert.equal(await page.evaluate(() => window.__speedFlashCount), 1);
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#scoreValue').textContent(), '200', 'speed arrival uses the same chart hit-time judgement');

  await page.setViewportSize({ width: 658, height: 383 });
  const hold = await sampleAt(page, definitions.hold.spawnTime + 0.5, '.note-hold', 0.25);
  assert.match(hold.src, /candy-blue\.png$/);
  await page.screenshot({ path: resolve(outputDir, 'rhythm-game-note-types-small.png') });
  assert.deepEqual(errors, [], 'browser must remain free of console and page errors');
  process.stdout.write(`${JSON.stringify({ normalSamples, before, transition, after, arrived, hold, accelerationTransitions: 1, errors }, null, 2)}\n`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => { await browser?.close(); });
