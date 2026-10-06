const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright-core');

const projectDir = resolve(__dirname, '..');
const outputDir = resolve(projectDir, '..', 'docs', 'qa');
const targetUrl = `${pathToFileURL(resolve(projectDir, 'index.html')).href}?qa=note-types`;
let browser;

async function nextFrame(page) {
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
}

async function setTime(page, time) {
  await page.evaluate((value) => window.__setMediaTime(value), time);
  await nextFrame(page);
}

async function restartRound(page) {
  await page.evaluate(() => document.querySelector('#gameBgm').dispatchEvent(new Event('ended')));
  await page.locator('#restartButton').click();
  await page.locator('#countdown').waitFor({ state: 'visible' });
  await page.evaluate(() => window.__advanceSfxTime(3.05));
  await page.waitForFunction(() => document.querySelector('#countdown').hidden
    && !document.querySelector('#gameBgm').paused);
  await page.evaluate(() => { window.__attacks.length = 0; });
}

async function holdState(page) {
  return page.evaluate(() => {
    const head = document.querySelector(`.note-hold[data-note-id="${window.__holdId}"]`);
    const tail = document.querySelector(`.hold-note-tail-layer[data-note-id="${window.__holdId}"] .hold-note-tail`);
    const canvas = document.querySelector('.magic-attack-stage');
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let litPixels = 0;
    for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 0) litPixels += 1;
    return {
      score: Number(document.querySelector('#scoreValue').textContent.replaceAll(',', '')),
      combo: Number(document.querySelector('#comboValue').textContent),
      holding: Boolean(head?.classList.contains('is-holding')),
      sustained: canvas.classList.contains('is-holding'),
      tailLength: tail ? Number(tail.getAttribute('stroke-dasharray').split(' ')[0]) : null,
      tailOffset: tail ? Number(tail.getAttribute('stroke-dashoffset')) : null,
      litPixels,
      attacks: window.__attacks.map((detail) => ({ ...detail })),
    };
  });
}

async function finishRound(page) {
  await page.evaluate(() => document.querySelector('#gameBgm').dispatchEvent(new Event('ended')));
  return page.evaluate(() => window.__completions.at(-1));
}

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

async function sampleLateOvershoot(page, note) {
  await setTime(page, note.hitTime + 0.15);
  const sample = await page.locator(`.note[data-note-id="${note.id}"]`).evaluate((element) => {
    const path = document.querySelector('#travelPath');
    const length = path.getTotalLength();
    const end = path.getPointAtLength(length);
    const beforeEnd = path.getPointAtLength(length - 8);
    const stage = document.querySelector('#gameStage').getBoundingClientRect();
    const bounds = element.getBoundingClientRect();
    const dx = (bounds.x + bounds.width / 2 - stage.x) / stage.width * 2048 - end.x;
    const dy = (bounds.y + bounds.height / 2 - stage.y) / stage.height * 1152 - end.y;
    const tangentLength = Math.hypot(end.x - beforeEnd.x, end.y - beforeEnd.y);
    return {
      expectedDistance: length * 0.075,
      tangentDistance: (dx * (end.x - beforeEnd.x) + dy * (end.y - beforeEnd.y)) / tangentLength,
      perpendicularDistance: Math.abs(dx * (end.y - beforeEnd.y) - dy * (end.x - beforeEnd.x)) / tangentLength,
    };
  });
  assert.ok(Math.abs(sample.tangentDistance - sample.expectedDistance) < 0.08,
    `${note.type} must retain its +150ms tangent overshoot`);
  assert.ok(sample.perpendicularDistance < 0.08);
  return sample;
}

(async () => {
  mkdirSync(outputDir, { recursive: true });
  browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  const expectedAudioErrors = [];
  let injectingAudioError = false;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') (injectingAudioError ? expectedAudioErrors : errors).push(message.text());
  });
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
    HTMLMediaElement.prototype.play = async function play() {
      window.__mediaPlayCount += 1;
      this.__paused = false;
    };
    HTMLMediaElement.prototype.pause = function pause() { this.__paused = true; };
    window.__setMediaTime = (value) => { mediaTime = value; };
    window.__setSfxTime = (value) => { sfxTime = value; };
    window.__advanceSfxTime = (value) => { sfxTime += value; };
    window.__attacks = [];
    window.__completions = [];
    window.__pauseCount = 0;
    window.__mediaPlayCount = 0;
    window.__deferredSfxResumes = [];
    window.__setHidden = (hidden) => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
      document.dispatchEvent(new Event('visibilitychange'));
    };
    window.addEventListener('rhythmgame:attack', (event) => window.__attacks.push(event.detail));
    window.addEventListener('rhythmgame:complete', (event) => window.__completions.push(event.detail));
    window.addEventListener('rhythmgame:pause', () => { window.__pauseCount += 1; });
    class AudioNode {
      constructor() { this.frequency = this.gain = { setValueAtTime() {}, exponentialRampToValueAtTime() {} }; }
      connect(target) { return target; }
      start() {}
      stop() {}
    }
    class AudioContext {
      constructor() {
        this.destination = new AudioNode();
        this.state = 'suspended';
        window.__fakeSfxContext = this;
      }
      get currentTime() { return sfxTime; }
      async resume() {
        if (window.__deferNextSfxResume) {
          window.__deferNextSfxResume = false;
          await new Promise((resolveResume) => {
            const settle = () => {
              this.state = 'running';
              window.__resolveDeferredSfxResume = null;
              resolveResume();
              queueMicrotask(() => { window.__deferredSfxResumeSettled = true; });
            };
            window.__resolveDeferredSfxResume = settle;
            window.__deferredSfxResumes.push(settle);
          });
          return;
        }
        this.state = 'running';
      }
      async suspend() { this.state = 'suspended'; }
      createOscillator() { return new AudioNode(); }
      createGain() { return new AudioNode(); }
    }
    window.AudioContext = window.webkitAudioContext = AudioContext;
    window.__getFakeSfxState = () => window.__fakeSfxContext?.state || 'missing';
  });
  await page.goto(targetUrl, { waitUntil: 'load' });
  await page.evaluate(() => {
    window.__setHidden(true);
    window.dispatchEvent(new Event('blur'));
    window.__setHidden(false);
  });
  await page.keyboard.press('Space');
  await page.mouse.click(1500, 850);
  assert.equal(await page.locator('#startOverlay').isVisible(), true);
  assert.equal(await page.evaluate(() => window.__pauseCount), 0, 'idle focus events must not pause');
  assert.deepEqual(await page.evaluate(() => window.__attacks), [], 'idle input must not attack');
  await page.locator('#startButton').click();
  await page.locator('#countdown').waitFor({ state: 'visible' });
  await page.evaluate(() => window.__setSfxTime(3.05));
  await page.waitForFunction(() => document.querySelector('#countdown').hidden
    && !document.querySelector('#gameBgm').paused);
  const definitions = await page.evaluate(() => ({
    normal: window.RhythmGameChart.NOTES.find((note) => note.type === 'normal'),
    speed: window.RhythmGameChart.NOTES.find((note) => note.type === 'speed'),
    hold: window.RhythmGameChart.NOTES.find((note) => note.type === 'hold'),
    beforeHold: window.RhythmGameChart.NOTES[54],
  }));
  // Breaks caught: lost focus leaving input latched, dropped hold starts,
  // judging a paused release, unbounded re-entry, and partial/duplicate completion.
  const lifecycleHold = definitions.hold;
  await page.evaluate((id) => { window.__holdId = id; }, lifecycleHold.id);
  await setTime(page, lifecycleHold.hitTime + 0.15);
  await page.keyboard.down('Space');
  await setTime(page, lifecycleHold.hitTime + 0.35);
  const beforeHoldPause = await holdState(page);
  await page.locator('#pauseButton').click();
  await page.keyboard.up('Space');
  const duringHoldPause = await holdState(page);
  assert.equal(duringHoldPause.score, 0, 'release during pause must preserve the unresolved start');
  assert.equal(duringHoldPause.tailLength, beforeHoldPause.tailLength);
  await setTime(page, lifecycleHold.hitTime + 5);
  assert.equal((await holdState(page)).tailLength, beforeHoldPause.tailLength,
    'paused fake media seeks must not move the hold tail');
  await page.locator('#resumeButton').click();
  await nextFrame(page);
  const holdReentry = await page.locator('#countdown').evaluate((cue) => ({
    visible: !cue.hidden, text: cue.textContent, fontSize: parseFloat(getComputedStyle(cue).fontSize),
    mediaPaused: document.querySelector('#gameBgm').paused,
    mediaTime: document.querySelector('#gameBgm').currentTime,
  }));
  assert.equal(holdReentry.mediaPaused, true, 'resume of an interrupted hold must await a fresh press');
  assert.equal(holdReentry.visible, true);
  assert.equal(holdReentry.text, 'HOLD');
  assert.ok(holdReentry.fontSize > 0, 'HOLD cue must render text rather than a countdown image');
  assert.equal(holdReentry.mediaTime, lifecycleHold.hitTime + 0.35,
    're-entry must restore the original frozen media position');
  await page.screenshot({ path: resolve(outputDir, 'rhythm-game-hold-reentry.png') });
  await page.setViewportSize({ width: 658, height: 383 });
  await page.screenshot({ path: resolve(outputDir, 'rhythm-game-hold-reentry-small.png') });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.keyboard.down('Space');
  await page.waitForFunction(() => !document.querySelector('#gameBgm').paused);
  assert.equal(await page.locator('#countdown').isHidden(), true);
  assert.equal((await holdState(page)).score, 0, 're-entry must not score or rejudge the start');
  assert.equal((await holdState(page)).tailLength, beforeHoldPause.tailLength);
  assert.equal((await holdState(page)).sustained, true, 're-entry must restore sustained feedback');
  await setTime(page, lifecycleHold.holdEndTime);
  await page.keyboard.up('Space');
  assert.equal((await holdState(page)).score, 150, 'original Good start plus Perfect release must remain 150');

  await restartRound(page);
  await setTime(page, lifecycleHold.hitTime);
  await page.mouse.move(1500, 850);
  await page.mouse.down();
  await nextFrame(page);
  const pauseCountBeforeFocusLoss = await page.evaluate(() => window.__pauseCount);
  await page.evaluate(() => {
    window.__setHidden(true);
    window.dispatchEvent(new Event('blur'));
    window.__setHidden(true);
  });
  await nextFrame(page);
  assert.equal(await page.locator('#pauseOverlay').isVisible(), true,
    'visibility loss must pause the game');
  assert.equal(await page.evaluate(() => window.__pauseCount), pauseCountBeforeFocusLoss + 1,
    'visibility and blur for one pause must emit one transition event');
  assert.equal((await holdState(page)).litPixels, 0, 'focus loss must clear active attack particles');
  await page.mouse.up();
  await page.evaluate(() => window.__setHidden(false));
  await page.locator('#resumeButton').click();
  await page.waitForTimeout(650);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForTimeout(1000);
  assert.equal(await page.locator('#gameBgm').evaluate((media) => media.paused), true,
    'another focus loss must cancel the earlier re-entry deadline');
  assert.equal((await holdState(page)).score, 0);
  await page.locator('#resumeButton').click();
  await page.keyboard.down('Space');
  await page.waitForFunction(() => !document.querySelector('#gameBgm').paused);
  await setTime(page, lifecycleHold.holdEndTime);
  await page.keyboard.up('Space');
  assert.equal((await holdState(page)).score, 200,
    'fresh keyboard re-entry must replace a lost pointer latch');

  await restartRound(page);
  await setTime(page, lifecycleHold.hitTime);
  await page.keyboard.down('Space');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  assert.equal(await page.locator('#pauseOverlay').isVisible(), true, 'blur alone must pause');
  await page.locator('#resumeButton').click();
  // A repeat from a key still physically down cannot satisfy fresh re-entry.
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', repeat: true })));
  await page.waitForTimeout(650);
  assert.equal(await page.locator('#gameBgm').evaluate((media) => media.paused), true,
    're-entry must allow the full 1500ms wall-clock interval');
  assert.equal((await holdState(page)).score, 0);
  await page.waitForFunction(() => !document.querySelector('#gameBgm').paused, null, { timeout: 2000 });
  const reentryTimeout = await holdState(page);
  assert.equal(reentryTimeout.score, 100, 'timeout retains Perfect start points and misses the release');
  assert.equal(reentryTimeout.combo, 0);
  assert.equal(reentryTimeout.holding, false);
  assert.equal(reentryTimeout.tailLength, null);
  assert.equal(reentryTimeout.litPixels, 0);
  await page.keyboard.up('Space');
  assert.equal((await holdState(page)).score, 100, 'later release cannot repeat timeout resolution');

  await restartRound(page);
  await setTime(page, lifecycleHold.hitTime);
  await page.keyboard.down('Space');
  await page.locator('#pauseButton').click();
  await page.keyboard.up('Space');
  await page.locator('#resumeButton').click();
  const completionsBeforeEarlyEnd = await page.evaluate(() => window.__completions.length);
  const playsBeforeEarlyEnd = await page.evaluate(() => window.__mediaPlayCount);
  await finishRound(page);
  await finishRound(page);
  const earlyEnd = await page.evaluate(() => window.__completions.at(-1));
  assert.equal(await page.evaluate(() => window.__completions.length), completionsBeforeEarlyEnd + 1,
    'ended twice must dispatch exactly one completion');
  assert.deepEqual(earlyEnd, {
    finalScore: 100, maxCombo: 0, perfect: 0, good: 0, miss: 80,
    accuracy: 1.09, repairPercent: 1.09, starRating: 0, totalNotes: 80, judgedNotes: 80,
  }, 'completion must resolve the interrupted hold and all remaining chart events once');
  await page.waitForTimeout(1600);
  assert.equal(await page.evaluate(() => window.__mediaPlayCount), playsBeforeEarlyEnd,
    'completion must cancel the pending re-entry timeout');
  assert.equal((await holdState(page)).litPixels, 0);
  const resultPauseCount = await page.evaluate(() => window.__pauseCount);
  await page.evaluate(() => {
    window.__setHidden(true);
    window.dispatchEvent(new Event('blur'));
    window.__setHidden(false);
  });
  assert.equal(await page.evaluate(() => window.__pauseCount), resultPauseCount,
    'result focus events must not create pause transitions');
  assert.equal(await page.locator('#resultOverlay').isVisible(), true);
  await page.keyboard.press('Space');
  await page.mouse.click(1500, 850);
  assert.equal((await holdState(page)).attacks.length, 1, 'result input cannot dispatch attacks');
  const lifecycle = { beforeHoldPause, duringHoldPause, holdReentry, reentryTimeout, earlyEnd };
  await restartRound(page);
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
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Breaks caught: scoring the press, duplicate results, ignoring release offsets,
  // detached tails, expiring held heads at the start, and raw-input effect ownership.
  const firstHold = definitions.hold;
  await page.evaluate((id) => { window.__holdId = id; }, firstHold.id);
  await restartRound(page);
  const lateHoldSelector = `.note-hold[data-note-id="${firstHold.id}"]`;
  const lateHoldUnpressed = await sampleAt(page, firstHold.hitTime + 0.15, lateHoldSelector, 1);
  assert.equal((await holdState(page)).holding, false);
  const lateTailEnd = await page.locator(`.hold-note-tail-layer[data-note-id="${firstHold.id}"] .hold-note-tail`)
    .evaluate((tail) => Number(tail.getAttribute('stroke-dasharray').split(' ')[0])
      - Number(tail.getAttribute('stroke-dashoffset')));
  const trackLength = await page.locator('#travelPath').evaluate((path) => path.getTotalLength());
  assert.ok(Math.abs(lateTailEnd - trackLength) < 0.001, 'unpressed late hold tail must end at the clamped head');
  const headBeforePress = await page.locator(lateHoldSelector).evaluate((head) => ({
    left: head.style.left, top: head.style.top,
  }));
  await page.keyboard.down('Space');
  await nextFrame(page);
  const headAfterPress = await page.locator(lateHoldSelector).evaluate((head) => ({
    left: head.style.left, top: head.style.top,
  }));
  assert.deepEqual(headAfterPress, headBeforePress, 'valid late press must not jump the hold head');
  assert.deepEqual((await holdState(page)).attacks, [{ strength: 'good', phase: 'hold-start' }]);
  await setTime(page, firstHold.holdEndTime);
  await page.keyboard.up('Space');
  assert.equal((await holdState(page)).score, 150, 'clamped late hold must retain its Good start judgement');

  await restartRound(page);
  const normalLateOvershoot = await sampleLateOvershoot(page, definitions.normal);
  await page.keyboard.press('Space');
  assert.equal((await holdState(page)).score, 50);
  const speedLateOvershoot = await sampleLateOvershoot(page, definitions.speed);
  await page.keyboard.press('Space');
  assert.equal((await holdState(page)).score, 100);

  const holdScenarios = [];
  for (const scenario of [
    { name: 'PP', press: 0, release: 0, points: 200, judgement: 'perfect' },
    { name: 'PG', press: 0, release: 0.15, points: 150, judgement: 'good' },
    { name: 'GG', press: -0.15, release: 0.15, points: 100, judgement: 'good' },
    { name: 'early-Perfect-boundary', press: -0.1, release: -0.1, points: 200, judgement: 'perfect', strength: 'perfect' },
    { name: 'late-Perfect-boundary', press: 0.1, release: 0.1, points: 200, judgement: 'perfect', strength: 'perfect' },
    { name: 'early-Good-boundary', press: -0.2, release: -0.2, points: 100, judgement: 'good', strength: 'good' },
    { name: 'late-Good-boundary', press: 0.2, release: 0.2, points: 100, judgement: 'good', strength: 'good' },
    { name: 'late-release-Miss', press: 0, release: 0.25, points: 100, judgement: 'miss' },
    { name: 'early-release-Miss', press: 0, release: -0.25, points: 100, judgement: 'miss' },
    { name: 'Good-start-Miss-end', press: 0.15, release: -0.25, points: 50, judgement: 'miss' },
  ]) {
    await restartRound(page);
    await setTime(page, firstHold.hitTime + scenario.press);
    const beforePress = await holdState(page);
    assert.equal(beforePress.score, 0);
    await page.keyboard.down('Space');
    await nextFrame(page);
    const pressed = await holdState(page);
    assert.equal(pressed.score, 0, `${scenario.name}: press must not score a completed note`);
    assert.equal(pressed.combo, 0, `${scenario.name}: press must not increment combo`);
    assert.equal(pressed.holding, true);
    assert.equal(pressed.sustained, true);
    assert.deepEqual(pressed.attacks, [{ strength: scenario.strength || (scenario.press ? 'good' : 'perfect'), phase: 'hold-start' }]);
    const geometry = await page.locator('.hold-note-tail').first().evaluate((tail) => ({
      d: tail.getAttribute('d'), viewBox: tail.parentElement.getAttribute('viewBox'),
      reference: document.querySelector('#travelPath').getAttribute('d'),
      pointerEvents: getComputedStyle(tail).pointerEvents,
    }));
    assert.equal(geometry.d, geometry.reference, 'tail must clone the exact approved track');
    assert.equal(geometry.viewBox, '0 0 2048 1152');
    assert.equal(geometry.pointerEvents, 'none');
    await page.keyboard.down('Space');
    await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 99 })));
    assert.deepEqual((await holdState(page)).attacks, pressed.attacks,
      'repeat press and another source release must not complete the hold');

    if (scenario.name === 'PP') {
      await sampleAt(page, firstHold.hitTime + 0.4992, '.note-hold', 1);
      const midpoint = await holdState(page);
      assert.equal(midpoint.score, 0);
      assert.equal(midpoint.holding, true);
      assert.ok(midpoint.tailLength > 0 && midpoint.tailLength < pressed.tailLength);
      const length = await page.locator('#travelPath').evaluate((path) => path.getTotalLength());
      assert.ok(Math.abs(midpoint.tailLength - length * 0.2496) < 0.001,
        'half-duration tail is half the hold duration projected onto the exact path');
      assert.ok(Math.abs(-midpoint.tailOffset + midpoint.tailLength - length) < 0.001,
        'remaining tail must end exactly at the pinned head');
      await page.screenshot({ path: resolve(outputDir, 'rhythm-game-hold-sustained.png') });
      await page.setViewportSize({ width: 658, height: 383 });
      await sampleAt(page, firstHold.hitTime + 0.4992, '.note-hold', 1);
      await page.screenshot({ path: resolve(outputDir, 'rhythm-game-hold-sustained-small.png') });
      await page.setViewportSize({ width: 1920, height: 1080 });
      // A sustained connection must survive the original 920ms burst lifetime.
      await page.waitForTimeout(1050);
      assert.ok((await holdState(page)).litPixels > 0, 'held magic connection must stay visible');
    }
    await setTime(page, firstHold.holdEndTime + scenario.release);
    await page.keyboard.up('Space');
    const immediateRelease = await holdState(page);
    if (scenario.judgement === 'miss') {
      assert.equal(immediateRelease.litPixels, 0, 'Miss release must clear without a success flash');
    } else {
      assert.ok(immediateRelease.litPixels > 0, 'successful release must immediately render its finish flash');
      if (scenario.name === 'PP') {
        await page.screenshot({ path: resolve(outputDir, 'rhythm-game-hold-finish.png') });
      }
    }
    await nextFrame(page);
    const released = await holdState(page);
    assert.equal(released.score, scenario.points);
    assert.equal(released.combo, scenario.judgement === 'miss' ? 0 : 1);
    assert.equal(released.holding, false);
    assert.equal(released.sustained, false);
    assert.equal(released.tailLength, null);
    if (scenario.judgement === 'miss') assert.equal(released.litPixels, 0);
    assert.equal(released.attacks.length, 2);
    assert.equal(released.attacks[1].phase, 'hold-end');
    assert.equal(released.attacks[1].strength, scenario.judgement === 'miss' ? 'miss'
      : scenario.strength || (scenario.release ? 'good' : 'perfect'));
    await page.keyboard.up('Space');
    await nextFrame(page);
    assert.deepEqual({ ...await holdState(page), litPixels: 0 }, { ...released, litPixels: 0 },
      'duplicate release must not score or attack again');
    await page.waitForTimeout(320);
    await nextFrame(page);
    assert.equal((await holdState(page)).litPixels, 0, 'finish flash must fully clean itself after 260ms');
    const result = await finishRound(page);
    assert.equal(result.finalScore, scenario.points);
    assert.equal(result.perfect, scenario.judgement === 'perfect' ? 1 : 0);
    assert.equal(result.good, scenario.judgement === 'good' ? 1 : 0);
    assert.equal(result.miss, scenario.judgement === 'miss' ? 80 : 79);
    assert.equal(result.judgedNotes, 80, 'completion must resolve all queued events, including each hold once');
    holdScenarios.push({ ...scenario, pressed, immediateRelease, released, result });
  }

  await restartRound(page);
  await page.setViewportSize({ width: 1920, height: 1200 });
  const pointerStage = await page.locator('#gameStage').boundingBox();
  assert.ok(pointerStage.y > 5, 'pointer release coordinate must be outside the letterboxed stage');
  await setTime(page, firstHold.hitTime);
  await page.mouse.move(1500, 850);
  await page.mouse.down();
  await setTime(page, firstHold.holdEndTime);
  await page.keyboard.press('Space');
  assert.equal((await holdState(page)).score, 0, 'keyboard input cannot release a pointer-owned hold');
  await page.mouse.move(5, 5);
  await page.mouse.up();
  await nextFrame(page);
  assert.equal((await holdState(page)).score, 200, 'pointer release outside stage must finish a hold');
  assert.equal((await holdState(page)).attacks.length, 2);
  await page.setViewportSize({ width: 1920, height: 1080 });

  await restartRound(page);
  await setTime(page, definitions.beforeHold.hitTime);
  await page.keyboard.press('Space');
  assert.equal((await holdState(page)).combo, 1);
  await setTime(page, firstHold.hitTime);
  await page.keyboard.down('Space');
  assert.equal((await holdState(page)).score, 100);
  assert.equal((await holdState(page)).combo, 1, 'hold start must retain the existing combo');
  await setTime(page, firstHold.holdEndTime - 0.25);
  await page.keyboard.up('Space');
  assert.equal((await holdState(page)).score, 200);
  assert.equal((await holdState(page)).combo, 0, 'a missed hold release must reset an existing combo');
  const comboReset = await finishRound(page);
  assert.equal(comboReset.maxCombo, 1);
  assert.equal(comboReset.perfect, 1);
  assert.equal(comboReset.miss, 79);
  assert.equal(comboReset.judgedNotes, 80);

  await restartRound(page);
  await setTime(page, firstHold.hitTime + 0.15);
  await page.mouse.move(1500, 850);
  await page.mouse.down();
  await setTime(page, firstHold.holdEndTime - 0.25);
  const beforePointerCancel = await holdState(page);
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 })));
  await page.mouse.up();
  await nextFrame(page);
  assert.equal(await page.locator('#pauseOverlay').isVisible(), true, 'pointercancel must enter safe pause');
  assert.equal(await page.locator('#gameBgm').evaluate((media) => media.paused), true);
  const pointerCancelled = await holdState(page);
  assert.equal(pointerCancelled.score, 0, 'pointercancel must preserve the unresolved hold start');
  assert.equal(pointerCancelled.combo, 0);
  assert.equal(pointerCancelled.holding, true);
  assert.equal(pointerCancelled.tailLength, beforePointerCancel.tailLength);
  assert.equal(pointerCancelled.sustained, false);
  assert.equal(pointerCancelled.litPixels, 0, 'cancellation must clear without a finish flash');
  assert.deepEqual(pointerCancelled.attacks, [{ strength: 'good', phase: 'hold-start' }]);
  await page.locator('#resumeButton').click();
  assert.equal(await page.locator('#countdown').textContent(), 'HOLD');
  assert.equal(await page.locator('#gameBgm').evaluate((media) => media.paused), true);
  await page.keyboard.down('Space');
  await page.waitForFunction(() => !document.querySelector('#gameBgm').paused);
  assert.equal((await holdState(page)).score, 0, 'fresh input must re-enter without rejudging the start');
  await setTime(page, firstHold.holdEndTime);
  await page.keyboard.up('Space');
  assert.equal((await holdState(page)).score, 150, 'cancelled pointer hold must retain Good start credit');
  assert.equal((await holdState(page)).combo, 1);
  assert.deepEqual((await holdState(page)).attacks, [
    { strength: 'good', phase: 'hold-start' },
    { strength: 'good', phase: 'hold-start' },
    { strength: 'perfect', phase: 'hold-end' },
  ]);
  await page.keyboard.up('Space');
  assert.equal((await holdState(page)).score, 150, 'duplicate release cannot complete the hold twice');
  const beforeCancelledCompletion = await page.evaluate(() => window.__completions.length);
  const pointerCancelResult = await finishRound(page);
  await finishRound(page);
  assert.equal(await page.evaluate(() => window.__completions.length), beforeCancelledCompletion + 1);
  assert.equal(pointerCancelResult.finalScore, 150);
  assert.equal(pointerCancelResult.good, 1);
  assert.equal(pointerCancelResult.miss, 79);
  assert.equal(pointerCancelResult.judgedNotes, 80);

  await restartRound(page);
  await setTime(page, firstHold.hitTime);
  await page.keyboard.down('Space');
  await setTime(page, firstHold.holdEndTime + 0.25);
  const expiredHold = await holdState(page);
  assert.equal(expiredHold.score, 100, 'unreleased hold must retain earned start points');
  assert.equal(expiredHold.combo, 0);
  assert.equal(expiredHold.sustained, false);
  assert.equal(expiredHold.attacks.length, 2);
  await page.keyboard.up('Space');
  assert.deepEqual(await holdState(page), expiredHold, 'keyup after timeout must not repeat completion');

  await restartRound(page);
  await setTime(page, firstHold.hitTime + 0.25);
  assert.equal(await page.locator(`.note-hold[data-note-id="${firstHold.id}"]`).count(), 0,
    'missed start must remove the head');
  assert.equal(await page.locator(`.hold-note-tail-layer[data-note-id="${firstHold.id}"]`).count(), 0,
    'missed start must remove the tail');
  const missedStart = await finishRound(page);
  assert.equal(missedStart.finalScore, 0);
  assert.equal(missedStart.miss, 80);
  assert.equal(missedStart.accuracy, 0);

  // Lifecycle cleanup must not create another attack after the game has stopped.
  await restartRound(page);
  await setTime(page, firstHold.hitTime);
  await page.keyboard.down('Space');
  await page.locator('#pauseButton').click();
  await nextFrame(page);
  const paused = await holdState(page);
  assert.equal(paused.sustained, false);
  assert.equal(paused.litPixels, 0);
  await page.keyboard.up('Space');
  assert.equal((await holdState(page)).attacks.length, 1, 'paused release cannot fire an attack');
  await finishRound(page);
  const endedAttacks = (await holdState(page)).attacks.length;
  await page.keyboard.press('Space');
  await page.mouse.click(1500, 850);
  assert.equal((await holdState(page)).attacks.length, endedAttacks);
  await restartRound(page);
  const restarted = await holdState(page);
  assert.equal(restarted.score, 0);
  assert.equal(restarted.sustained, false);
  assert.equal(restarted.litPixels, 0);

  await setTime(page, firstHold.hitTime);
  await page.keyboard.down('Space');
  await page.locator('#pauseButton').click();
  await page.keyboard.up('Space');
  await page.locator('#resumeButton').click();
  const playsBeforeAudioError = await page.evaluate(() => window.__mediaPlayCount);
  injectingAudioError = true;
  await page.evaluate(() => document.querySelector('#gameBgm').dispatchEvent(new Event('error')));
  await page.locator('#audioLoadError').waitFor({ state: 'visible' });
  await nextFrame(page);
  const failedAudio = await holdState(page);
  assert.equal(failedAudio.holding, false);
  assert.equal(failedAudio.sustained, false);
  assert.equal(failedAudio.tailLength, null);
  assert.equal(failedAudio.litPixels, 0);
  await page.keyboard.up('Space');
  await page.keyboard.press('Space');
  assert.equal((await holdState(page)).attacks.length, failedAudio.attacks.length,
    'audio failure must clear input and suppress later attacks');
  await page.waitForTimeout(1600);
  assert.equal(await page.evaluate(() => window.__mediaPlayCount), playsBeforeAudioError,
    'audio failure must cancel re-entry before it can restart BGM');
  assert.equal(await page.locator('#gameBgm').evaluate((media) => media.paused), true);
  injectingAudioError = false;
  assert.equal(expectedAudioErrors.length, 1);
  assert.match(expectedAudioErrors[0], /BGM playback failed/);

  await page.locator('#startButton').click();
  await page.locator('#countdown').waitFor({ state: 'visible' });
  await page.keyboard.press('Space');
  await page.evaluate(() => window.__advanceSfxTime(3.05));
  await page.waitForFunction(() => document.querySelector('#countdown').hidden
    && !document.querySelector('#gameBgm').paused);
  await setTime(page, definitions.normal.hitTime);
  await page.keyboard.press('Space');
  assert.equal((await holdState(page)).score, 100, 'retry must reset a previously held input latch');

  // A native AudioContext can remain `suspended` while resume() is pending.
  // Its older resume must not escape a newer HOLD re-entry after blur.
  await restartRound(page);
  await setTime(page, firstHold.hitTime);
  await page.keyboard.down('Space');
  await page.locator('#pauseButton').click();
  await page.keyboard.up('Space');
  await page.waitForFunction(() => window.__getFakeSfxState() === 'suspended');
  await page.locator('#resumeButton').click();
  await page.locator('#countdown').waitFor({ state: 'visible' });
  await page.evaluate(() => { window.__deferNextSfxResume = true; });
  await page.keyboard.down('Space');
  await page.waitForFunction(() => typeof window.__resolveDeferredSfxResume === 'function');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForFunction(() => !document.querySelector('#pauseOverlay').hidden
    && window.__getFakeSfxState() === 'suspended');
  await page.keyboard.up('Space');
  await page.locator('#resumeButton').click();
  assert.equal(await page.locator('#countdown').textContent(), 'HOLD');
  assert.equal(await page.evaluate(() => window.__getFakeSfxState()), 'suspended');
  await page.evaluate(() => { window.__deferredSfxResumeSettled = false; });
  await page.evaluate(() => window.__resolveDeferredSfxResume());
  await page.waitForFunction(() => window.__deferredSfxResumeSettled === true);
  assert.equal(await page.locator('#countdown').textContent(), 'HOLD');
  assert.equal(await page.evaluate(() => window.__getFakeSfxState()), 'suspended',
    'stale SFX resume settling during a newer HOLD deadline must re-suspend the context');

  // Resume A must not pause the BGM already owned by pending Resume B.
  await restartRound(page);
  await page.locator('#pauseButton').click();
  await page.evaluate(() => {
    window.__deferredSfxResumes.length = 0;
    window.__deferNextSfxResume = true;
  });
  await page.locator('#resumeButton').click();
  await page.waitForFunction(() => window.__deferredSfxResumes.length === 1);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.locator('#pauseOverlay').waitFor({ state: 'visible' });
  await page.evaluate(() => { window.__deferNextSfxResume = true; });
  await page.locator('#resumeButton').click();
  await page.waitForFunction(() => window.__deferredSfxResumes.length === 2);
  await page.evaluate(() => window.__deferredSfxResumes[0]());
  await nextFrame(page);
  const afterStaleResume = await page.locator('#gameBgm').evaluate((media) => ({ paused: media.paused }));
  await page.keyboard.press('Space');
  assert.deepEqual(await page.evaluate(() => window.__attacks), [], 'pending Resume B must still gate input');
  await page.evaluate(() => window.__deferredSfxResumes[1]());
  await nextFrame(page);
  const overlappingResume = await page.evaluate(() => ({
    mediaPaused: document.querySelector('#gameBgm').paused,
    overlayHidden: document.querySelector('#pauseOverlay').hidden,
    audioState: window.__getFakeSfxState(),
  }));
  await setTime(page, definitions.normal.hitTime);
  await page.keyboard.press('Space');
  assert.equal((await holdState(page)).score, 100, 'the current resume must accept gameplay input');
  assert.deepEqual(overlappingResume, { mediaPaused: false, overlayHidden: true, audioState: 'running' },
    'settling Resume A then Resume B must never accept gameplay with paused BGM');
  assert.equal(afterStaleResume.paused, false, 'Resume A cannot pause BGM owned by pending Resume B');

  await restartRound(page);
  await setTime(page, firstHold.hitTime);
  await page.keyboard.down('Space');
  await page.locator('#pauseButton').click();
  await page.keyboard.up('Space');
  await page.locator('#resumeButton').click();
  const playsBeforePagehide = await page.evaluate(() => window.__mediaPlayCount);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.waitForTimeout(1600);
  assert.equal(await page.evaluate(() => window.__mediaPlayCount), playsBeforePagehide,
    'pagehide must cancel the re-entry timeout');
  assert.equal(await page.locator('#gameBgm').evaluate((media) => media.paused), true);
  assert.equal(await page.locator('#countdown').isHidden(), true);
  const attacksBeforePagehideInput = (await holdState(page)).attacks.length;
  await page.keyboard.press('Space');
  await page.mouse.click(1500, 850);
  assert.equal((await holdState(page)).attacks.length, attacksBeforePagehideInput,
    'pagehide must block later input');
  assert.equal((await holdState(page)).sustained, false);
  assert.equal((await holdState(page)).litPixels, 0);

  assert.deepEqual(errors, [], 'browser must remain free of console and page errors');
  process.stdout.write(`${JSON.stringify({ normalSamples, before, transition, after, arrived, hold,
    lateHoldUnpressed, headBeforePress, headAfterPress, normalLateOvershoot, speedLateOvershoot,
    lifecycle, holdScenarios, comboReset, expiredHold, missedStart, paused, restarted, failedAudio,
    pointerCancelled, pointerCancelResult, afterStaleResume, overlappingResume,
    expectedAudioErrors: expectedAudioErrors.map((message) => message.split('\n')[0]),
    accelerationTransitions: 1, errors }, null, 2)}\n`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => { await browser?.close(); });
