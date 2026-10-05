const { mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const projectDir = resolve(__dirname, '..');
const outputDir = resolve(projectDir, '..', 'docs', 'qa');
const targetUrl = `${pathToFileURL(resolve(projectDir, 'index.html')).href}?qa=hud`;

mkdirSync(outputDir, { recursive: true });
let browser;

(async () => {
  browser = await chromium.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const consoleErrors = [];
  const pageErrors = [];
  const expectedAudioErrors = [];
  let collectingAudioFailures = false;
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const errors = collectingAudioFailures ? expectedAudioErrors : consoleErrors;
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.addInitScript(() => {
    let fakeTime = 0;
    let mediaTime = 0;
    let mediaReady = !location.search.includes('audioScenario=delayed');
    let mediaError = null;
    window.__mediaPlayCalls = [];
    Object.defineProperties(HTMLMediaElement.prototype, {
      duration: { configurable: true, get: () => mediaReady ? 69.218005 : NaN },
      currentTime: {
        configurable: true,
        get: () => mediaTime,
        set(value) { mediaTime = Number(value) || 0; },
      },
      readyState: { configurable: true, get: () => mediaReady ? 4 : 0 },
      paused: { configurable: true, get() { return this.__paused !== false; } },
      error: { configurable: true, get: () => mediaError },
    });
    HTMLMediaElement.prototype.play = async function play() {
      window.__mediaPlayCalls.push({ muted: this.muted, time: mediaTime, sfxTime: fakeTime });
      if (window.__rejectNextPlay) {
        window.__rejectNextPlay = false;
        throw new Error('Controlled BGM playback failure');
      }
      if (window.__deferNextPlay) {
        window.__deferNextPlay = false;
        await new Promise((resolve) => { window.__resolveMediaPlay = resolve; });
      }
      this.__paused = false;
    };
    HTMLMediaElement.prototype.pause = function pause() { this.__paused = true; };
    HTMLMediaElement.prototype.load = function load() { mediaError = null; };
    window.__setMediaTime = (value) => { mediaTime = value; };
    window.__setMediaReady = () => {
      mediaReady = true;
      mediaError = null;
      document.querySelector('#gameBgm').dispatchEvent(new Event('loadedmetadata'));
    };
    window.__failMediaLoad = () => {
      mediaError = { code: 4 };
      document.querySelector('#gameBgm').dispatchEvent(new Event('error'));
    };
    // The controlled fixture emits metadata itself; suppress native preload events.
    document.addEventListener('loadedmetadata', (event) => {
      if (event.isTrusted) event.stopImmediatePropagation();
    }, true);
    class FakeAudioParam {
      setValueAtTime() {}
      exponentialRampToValueAtTime() {}
    }
    class FakeAudioNode {
      constructor() {
        this.frequency = new FakeAudioParam();
        this.gain = new FakeAudioParam();
        this.type = 'sine';
      }
      connect(target) { return target; }
      start() {}
      stop() {}
    }
    class FakeAudioContext {
      constructor() {
        this.destination = new FakeAudioNode();
        this.state = 'suspended';
      }
      get currentTime() { return fakeTime; }
      resume() {
        this.state = 'running';
        return Promise.resolve();
      }
      suspend() {
        this.state = 'suspended';
        return Promise.resolve();
      }
      createOscillator() { return new FakeAudioNode(); }
      createGain() { return new FakeAudioNode(); }
    }
    let fakeAudioContext = null;
    class TrackedFakeAudioContext extends FakeAudioContext {
      constructor() {
        super();
        fakeAudioContext = this;
      }
    }
    window.AudioContext = TrackedFakeAudioContext;
    window.webkitAudioContext = TrackedFakeAudioContext;
    window.__setFakeAudioTime = (value) => { fakeTime = value; };
    window.__getFakeAudioState = () => fakeAudioContext?.state || 'missing';
    window.__completionDetails = [];
    window.addEventListener('rhythmgame:complete', (event) => {
      window.__completionDetails.push(event.detail);
    });
  });

  await page.goto(targetUrl, { waitUntil: 'load' });
  const topHud = await page.evaluate(() => ({
    scorePanel: Boolean(document.querySelector('.hud-score-panel')),
    scoreStar: Boolean(document.querySelector('.hud-score-star')),
    comboLabelPanel: Boolean(document.querySelector('.hud-combo-label-panel')),
    comboValuePanel: Boolean(document.querySelector('.hud-combo-value-panel')),
    pauseButton: Boolean(document.querySelector('#pauseButton')),
  }));
  const hud = page.locator('#rhythmProgressHud');
  const startHidden = await hud.isHidden();
  await page.locator('#startButton').click();
  await page.waitForTimeout(40);
  const countdown = await page.evaluate(() => ({
    hudHidden: document.querySelector('#rhythmProgressHud').hidden,
    progress: document.querySelector('#musicProgress').getAttribute('aria-valuenow'),
    earnedStars: document.querySelectorAll('[data-rating-star].is-earned').length,
  }));
  await page.screenshot({ path: resolve(outputDir, 'rhythm-game-hud-countdown.png') });

  await page.evaluate(() => window.__setFakeAudioTime(3.05));
  await page.waitForTimeout(40);

  await page.evaluate(() => window.__setMediaTime(1.3843601));
  await page.waitForTimeout(40);
  assert.equal(await page.locator('#musicProgress').getAttribute('aria-valuenow'), '2',
    'music progress must come from BGM currentTime / 69.218005');
  await page.evaluate(() => window.__setFakeAudioTime(13.05));
  await page.waitForTimeout(40);
  assert.equal(await page.locator('#musicProgress').getAttribute('aria-valuenow'), '2',
    'advancing SFX time must not advance the song');
  const playbackStart = await page.evaluate(() => ({
    duration: document.querySelector('#gameBgm').duration,
    calls: window.__mediaPlayCalls,
  }));
  assert.equal(playbackStart.duration, 69.218005);
  assert.deepEqual(playbackStart.calls, [
    { muted: true, time: 0, sfxTime: 0 },
    { muted: false, time: 0, sfxTime: 3.05 },
  ], 'unlock must precede countdown and audible playback must start once afterward');
  const hitTimes = await page.evaluate(() => window.RhythmGameChart.NOTES.map((note) => note.hitTime));
  assert.equal(hitTimes.length, 80);
  for (let index = 0; index < 56; index += 1) {
    await page.evaluate((time) => window.__setMediaTime(time), hitTimes[index]);
    await page.waitForTimeout(50);
    await page.keyboard.press('Space');
  }
  await page.waitForFunction(() => document.querySelector('#musicProgress').getAttribute('aria-valuenow') === '62');

  const active = await page.evaluate(() => {
    const stage = document.querySelector('#gameStage').getBoundingClientRect();
    const hudElement = document.querySelector('#rhythmProgressHud');
    const hudRect = hudElement.getBoundingClientRect();
    const characterRect = document.querySelector('#characterLayer').getBoundingClientRect();
    return {
      progress: Number(document.querySelector('#musicProgress').getAttribute('aria-valuenow')),
      earnedStars: document.querySelectorAll('[data-rating-star].is-earned').length,
      hud: { x: hudRect.x, y: hudRect.y, width: hudRect.width, height: hudRect.height },
      stage: { x: stage.x, y: stage.y, width: stage.width, height: stage.height },
      character: { x: characterRect.x, y: characterRect.y, width: characterRect.width, height: characterRect.height },
      pointerEvents: getComputedStyle(hudElement).pointerEvents,
      scoreText: document.querySelector('#scoreValue').textContent,
    };
  });
  await page.screenshot({ path: resolve(outputDir, 'rhythm-game-hud-active.png') });

  const attacksBeforePause = await page.evaluate(() => {
    window.__attackCount = 0;
    window.addEventListener('rhythmgame:attack', () => { window.__attackCount += 1; });
    return window.__attackCount;
  });
  await page.locator('#pauseButton').click();
  await page.waitForTimeout(30);
  const pausedBeforeInput = await page.evaluate(() => ({
    pressed: document.querySelector('#pauseButton').getAttribute('aria-pressed'),
    overlayVisible: !document.querySelector('#pauseOverlay').hidden,
    audioState: window.__getFakeAudioState(),
    mediaPaused: document.querySelector('#gameBgm').paused,
    attackCount: window.__attackCount,
  }));
  await page.screenshot({ path: resolve(outputDir, 'rhythm-game-hud-paused.png') });
  await page.keyboard.press('Space');
  await page.waitForTimeout(20);
  const pausedAfterInput = await page.evaluate(() => ({
    attackCount: window.__attackCount,
    scoreText: document.querySelector('#scoreValue').textContent,
  }));
  await page.locator('#resumeButton').click();
  await page.waitForTimeout(30);
  const resumed = await page.evaluate(() => ({
    pressed: document.querySelector('#pauseButton').getAttribute('aria-pressed'),
    overlayHidden: document.querySelector('#pauseOverlay').hidden,
    audioState: window.__getFakeAudioState(),
    mediaPaused: document.querySelector('#gameBgm').paused,
  }));

  await page.setViewportSize({ width: 1280, height: 720 });
  const compact = await page.evaluate(() => {
    const stage = document.querySelector('#gameStage').getBoundingClientRect();
    const hudElement = document.querySelector('#rhythmProgressHud').getBoundingClientRect();
    const scorePanel = document.querySelector('.hud-score-panel').getBoundingClientRect();
    const controls = document.querySelector('.hud-controls').getBoundingClientRect();
    return {
      stage: { x: stage.x, y: stage.y, width: stage.width, height: stage.height },
      hud: { x: hudElement.x, y: hudElement.y, width: hudElement.width, height: hudElement.height },
      scorePanel: { x: scorePanel.x, y: scorePanel.y, width: scorePanel.width, height: scorePanel.height },
      controls: { x: controls.x, y: controls.y, width: controls.width, height: controls.height },
    };
  });
  await page.screenshot({ path: resolve(outputDir, 'rhythm-game-hud-1280x720.png') });

  await page.setViewportSize({ width: 658, height: 383 });
  const small = await page.evaluate(() => {
    const stage = document.querySelector('#gameStage').getBoundingClientRect();
    const scorePanel = document.querySelector('.hud-score-panel').getBoundingClientRect();
    const scoreStar = document.querySelector('.hud-score-star').getBoundingClientRect();
    const controls = document.querySelector('.hud-controls').getBoundingClientRect();
    const comboGroup = document.querySelector('.hud-combo-group').getBoundingClientRect();
    const comboLabelElement = document.querySelector('.hud-combo-label-panel');
    const comboValueElement = document.querySelector('.hud-combo-value-panel');
    const comboLabel = comboLabelElement.getBoundingClientRect();
    const comboValue = comboValueElement.getBoundingClientRect();
    return {
      stage: { x: stage.x, y: stage.y, width: stage.width, height: stage.height },
      scorePanel: { x: scorePanel.x, y: scorePanel.y, width: scorePanel.width, height: scorePanel.height },
      scoreStar: { x: scoreStar.x, y: scoreStar.y, width: scoreStar.width, height: scoreStar.height },
      controls: { x: controls.x, y: controls.y, width: controls.width, height: controls.height },
      comboGroup: { x: comboGroup.x, y: comboGroup.y, width: comboGroup.width, height: comboGroup.height },
      comboLabel: { x: comboLabel.x, y: comboLabel.y, width: comboLabel.width, height: comboLabel.height },
      comboValue: { x: comboValue.x, y: comboValue.y, width: comboValue.width, height: comboValue.height },
      comboLabelRightRadius: parseFloat(getComputedStyle(comboLabelElement).borderTopRightRadius),
      comboLabelZ: Number(getComputedStyle(comboLabelElement).zIndex) || 0,
      comboValueZ: Number(getComputedStyle(comboValueElement).zIndex) || 0,
    };
  });
  await page.screenshot({ path: resolve(outputDir, 'rhythm-game-hud-658x383.png') });

  for (let index = 56; index < 80; index += 1) {
    await page.evaluate((time) => window.__setMediaTime(time), hitTimes[index]);
    await page.waitForTimeout(50);
    await page.keyboard.press('Space');
  }
  const finalStarCount = await page.locator('[data-rating-star].is-earned').count();

  await page.evaluate(() => window.__setMediaTime(69.218005));
  await page.waitForTimeout(40);
  assert.equal(await page.locator('#resultOverlay').isHidden(), true,
    'completion must wait for the media ended event');
  await page.evaluate(() => document.querySelector('#gameBgm').dispatchEvent(new Event('ended')));
  await page.waitForFunction(
    () => !document.querySelector('#resultOverlay').hidden,
    null,
    { timeout: 1500 },
  );
  await page.evaluate(() => document.querySelector('#gameBgm').dispatchEvent(new Event('ended')));
  const result = await page.evaluate(() => ({
    resultVisible: !document.querySelector('#resultOverlay').hidden,
    hudHidden: document.querySelector('#rhythmProgressHud').hidden,
    completionDetails: window.__completionDetails,
  }));
  await page.screenshot({ path: resolve(outputDir, 'rhythm-game-hud-result.png') });

  await page.locator('#restartButton').click();
  await page.waitForTimeout(40);
  const restart = await page.evaluate(() => ({
    hudHidden: document.querySelector('#rhythmProgressHud').hidden,
    progress: document.querySelector('#musicProgress').getAttribute('aria-valuenow'),
    earnedStars: document.querySelectorAll('[data-rating-star].is-earned').length,
  }));

  collectingAudioFailures = true;
  await page.goto(`${targetUrl}&audioScenario=delayed`, { waitUntil: 'load' });
  const initialReadiness = await page.locator('#startButton').isDisabled();
  assert.equal(initialReadiness, true, 'Start must wait for BGM metadata');
  await page.evaluate(() => window.__failMediaLoad());
  await page.locator('#audioLoadError').waitFor({ state: 'visible' });
  const loadFailure = await page.evaluate(() => ({
    retryEnabled: !document.querySelector('#startButton').disabled,
    buttonText: document.querySelector('#startButton').textContent,
    mediaPaused: document.querySelector('#gameBgm').paused,
    mediaTime: document.querySelector('#gameBgm').currentTime,
  }));
  assert.deepEqual(loadFailure, {
    retryEnabled: true, buttonText: 'RETRY', mediaPaused: true, mediaTime: 0,
  });
  await page.locator('#startButton').click();
  await page.waitForTimeout(30);
  assert.equal(await page.locator('#countdown').isHidden(), true,
    'retry must await metadata rather than begin countdown early');
  await page.evaluate(() => window.__setMediaReady());
  await page.locator('#countdown').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#audioLoadError').isHidden(), true);

  await page.evaluate(() => {
    window.__rejectNextPlay = true;
    window.__setFakeAudioTime(3.05);
  });
  await page.locator('#audioLoadError').waitFor({ state: 'visible' });
  const playFailure = await page.evaluate(() => ({
    retryEnabled: !document.querySelector('#startButton').disabled,
    startVisible: !document.querySelector('#startOverlay').hidden,
    hudHidden: document.querySelector('#rhythmProgressHud').hidden,
    mediaPaused: document.querySelector('#gameBgm').paused,
    completions: window.__completionDetails.length,
  }));
  assert.deepEqual(playFailure, {
    retryEnabled: true, startVisible: true, hudHidden: true, mediaPaused: true, completions: 0,
  });
  await page.locator('#startButton').click();
  await page.locator('#countdown').waitFor({ state: 'visible' });
  await page.evaluate(() => {
    window.__deferNextPlay = true;
    window.__setFakeAudioTime(6.1);
  });
  await page.waitForFunction(() => Boolean(window.__resolveMediaPlay));
  const callsBeforePlaying = await page.evaluate(() => window.__mediaPlayCalls.length);
  await page.evaluate(() => {
    window.__setFakeAudioTime(12);
    window.__setMediaTime(4.981);
  });
  await page.waitForTimeout(80);
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#scoreValue').textContent(), '0',
    'input must remain blocked until BGM play resolves');
  assert.equal(await page.locator('#musicProgress').getAttribute('aria-valuenow'), '0');
  assert.equal(await page.evaluate(() => window.__mediaPlayCalls.length), callsBeforePlaying,
    'pending BGM play must not be reissued by subsequent animation frames');
  await page.evaluate(() => window.__resolveMediaPlay());
  await page.waitForTimeout(40);
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#scoreValue').textContent(), '100');
  const audioRecovery = {
    initialReadiness, loadFailure, playFailure, callsBeforePlaying, expectedAudioErrors,
  };

  const report = {
    targetUrl,
    topHud,
    startHidden,
    countdown,
    active,
    attacksBeforePause,
    pausedBeforeInput,
    pausedAfterInput,
    resumed,
    compact,
    small,
    playbackStart,
    finalStarCount,
    result,
    restart,
    audioRecovery,
    consoleErrors,
    pageErrors,
  };
  writeFileSync(
    resolve(outputDir, 'rhythm-game-hud-integration.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  await browser.close();

  const detail = result.completionDetails[0];
  if (!startHidden) process.exitCode = 1;
  if (!Object.values(topHud).every(Boolean)) process.exitCode = 1;
  if (countdown.hudHidden || countdown.progress !== '0' || countdown.earnedStars !== 0) process.exitCode = 1;
  if (active.progress !== 62 || active.earnedStars !== 3 || active.scoreText !== '5,600') process.exitCode = 1;
  if (active.pointerEvents !== 'none') process.exitCode = 1;
  if (!/^\d{1,3}(,\d{3})+$/.test(active.scoreText)) process.exitCode = 1;
  if (pausedBeforeInput.pressed !== 'true' || !pausedBeforeInput.overlayVisible || pausedBeforeInput.audioState !== 'suspended' || !pausedBeforeInput.mediaPaused) process.exitCode = 1;
  if (pausedAfterInput.attackCount !== pausedBeforeInput.attackCount || pausedAfterInput.scoreText !== active.scoreText) process.exitCode = 1;
  if (resumed.pressed !== 'false' || !resumed.overlayHidden || resumed.audioState !== 'running' || resumed.mediaPaused) process.exitCode = 1;
  if (compact.scorePanel.x < compact.stage.x || compact.controls.x + compact.controls.width > compact.stage.x + compact.stage.width) process.exitCode = 1;
  const smallScoreWidthRatio = small.scorePanel.width / small.stage.width;
  const smallControlsWidthRatio = small.controls.width / small.stage.width;
  const smallScoreHeightRatio = small.scorePanel.height / small.stage.height;
  const smallControlsHeightRatio = small.controls.height / small.stage.height;
  const smallTopOffsetRatio = (small.scorePanel.y - small.stage.y) / small.stage.height;
  if (smallScoreWidthRatio < 0.2 || smallScoreWidthRatio > 0.24) process.exitCode = 1;
  if (smallControlsWidthRatio < 0.23 || smallControlsWidthRatio > 0.28) process.exitCode = 1;
  if (smallScoreHeightRatio > 0.11 || smallControlsHeightRatio > 0.11) process.exitCode = 1;
  if (smallTopOffsetRatio > 0.04) process.exitCode = 1;
  if (small.scoreStar.height / small.scorePanel.height < 0.65) process.exitCode = 1;
  const comboOverlapRatio = (
    small.comboLabel.x + small.comboLabel.width - small.comboValue.x
  ) / small.comboGroup.width;
  const comboHeightRatio = small.comboValue.height / small.comboLabel.height;
  const comboVerticalCenterDelta = Math.abs(
    (small.comboLabel.y + small.comboLabel.height / 2)
      - (small.comboValue.y + small.comboValue.height / 2),
  );
  if (comboOverlapRatio < 0.09) process.exitCode = 1;
  if (comboHeightRatio < 1.15 || comboHeightRatio > 1.3) process.exitCode = 1;
  if (comboVerticalCenterDelta > 1) process.exitCode = 1;
  if (small.comboLabelRightRadius <= 0) process.exitCode = 1;
  if (small.comboValueZ <= small.comboLabelZ) process.exitCode = 1;
  // Holds retain their future 200-point denominator; Task 7 adds endpoint scoring.
  if (finalStarCount !== 4) process.exitCode = 1;
  if (!result.resultVisible || !result.hudHidden || result.completionDetails.length !== 1) process.exitCode = 1;
  if (!detail || ![
    'finalScore',
    'maxCombo',
    'perfect',
    'good',
    'miss',
    'accuracy',
    'repairPercent',
    'starRating',
    'totalNotes',
    'judgedNotes',
  ].every((key) => key in detail)) process.exitCode = 1;
  assert.deepEqual(detail, {
    finalScore: 8000, maxCombo: 80, perfect: 80, good: 0, miss: 0,
    accuracy: 100, repairPercent: 86.96, starRating: 4, totalNotes: 80, judgedNotes: 80,
  });
  if (restart.hudHidden || restart.progress !== '0' || restart.earnedStars !== 0) process.exitCode = 1;
  assert.deepEqual(expectedAudioErrors.map((message) => message.split('\n')[0]), [
    'Error: BGM metadata failed to load',
    'Error: Controlled BGM playback failure',
  ], 'only the deliberately injected load/play failures may reach the console');
  if (consoleErrors.length || pageErrors.length) process.exitCode = 1;
})().catch(async (error) => {
  console.error(error);
  if (browser) await browser.close();
  process.exitCode = 1;
});
