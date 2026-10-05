# Rhythm Game BGM and Three-Note-Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 60-second generated metronome round with the complete 69.218-second BGM and an exact 80-event chart containing normal, acceleration, and two-beat hold candies.

**Architecture:** Keep `game-core.js` pure and extend it with chart validation, movement curves, weighted score application, and hold-result combination. Add focused UMD modules for immutable chart data and an injected HTML media clock; let `app.js` coordinate those modules, DOM rendering, normalized press/release input, pause recovery, effects, and completion. The existing SVG track path remains the single geometric source for normal motion, acceleration motion, and hold-tail rendering.

**Tech Stack:** Static HTML/CSS/JavaScript, HTMLMediaElement for BGM playback, existing Web Audio API for short SFX only, Node.js built-in test runner, Playwright Core with installed Microsoft Edge.

**Spec:** `docs/superpowers/specs/2026-10-05-rhythm-game-bgm-note-types-design.md`

## Global Constraints

- Use the complete supplied 69.218-second M4A; do not crop it to 60 seconds.
- Package the audio under `rhythm-game/assets/audio/` and reference it with a relative URL.
- The first chart contains exactly 80 events: 48 normal, 20 acceleration, and 12 hold.
- Candy identity is color-only: pink normal, yellow acceleration, blue hold.
- Holds last exactly two musical beats and no other note may require input during an active hold.
- Preserve the current background, character assets, approved track `d` geometry, judgement star, attack style, HUD, pause overlay, and result overlay.
- Do not add third-party runtime libraries or runtime beat detection.
- Do not redesign settlement, add lanes, add simultaneous inputs, add difficulty selection, or add random chart generation.
- Use test-driven development: every production behavior starts with a failing test and a verified expected failure.
- Do not delete project files.

## File Responsibility Map

- Create `rhythm-game/assets/audio/game-bgm.m4a`: packaged BGM binary.
- Create `rhythm-game/game-chart.js`: immutable chart metadata and exact deterministic 80-event data.
- Create `rhythm-game/audio-clock.js`: small HTMLMediaElement wrapper used as the authoritative game clock.
- Create `rhythm-game/tests/audio-asset.test.js`: packaging and HTML wiring contract.
- Create `rhythm-game/tests/game-chart.test.js`: chart count, distribution, bounds, timing, and overlap contract.
- Create `rhythm-game/tests/audio-clock.test.js`: media clock lifecycle contract.
- Create `rhythm-game/tests/gameplay-note-types-qa.cjs`: end-to-end press, acceleration, hold, pause, restart, and completion QA.
- Modify `rhythm-game/game-core.js`: pure movement, scoring, hold combination, chart maximum, and metrics.
- Modify `rhythm-game/tests/game-core.test.js`: pure behavior regression coverage.
- Modify `rhythm-game/index.html`: audio element, load-error UI, and script order only; no track-path edits.
- Modify `rhythm-game/app.js`: BGM lifecycle, chart-driven notes, press/release state, rendering, pause, restart, and completion.
- Modify `rhythm-game/styles.css`: acceleration flash, hold head/tail, sustained state, and audio-load error presentation.
- Modify `rhythm-game/magic-attack-d.js`: optional attack-event phase handling for sustained hold start/end.
- Modify `rhythm-game/magic-attack-d.css`: sustained hold beam state while preserving current burst visuals.
- Modify `rhythm-game/attack-event-contract.test.js`: semantic input ownership and hold-effect event contract.
- Modify `rhythm-game/tests/hud-browser-qa.cjs`: replace the old fake timer assumptions with a controllable fake media clock.
- Modify `rhythm-game/README.md`: real BGM, three candy types, controls, scoring, and verification commands.

---

### Task 1: Package and Wire the BGM Asset

**Files:**
- Create: `rhythm-game/assets/audio/game-bgm.m4a`
- Create: `rhythm-game/tests/audio-asset.test.js`
- Modify: `rhythm-game/index.html:121-205`

**Interfaces:**
- Consumes: source file `C:\Users\25283\Documents\Codex\2026-10-05\bang-w\outputs\20261005_003537_纯音频.m4a`
- Produces: `<audio id="gameBgm" preload="auto" src="assets/audio/game-bgm.m4a">` for `AudioClock`

- [ ] **Step 1: Write the failing packaging test**

```js
// rhythm-game/tests/audio-asset.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audioPath = path.join(projectDir, 'assets', 'audio', 'game-bgm.m4a');
const html = fs.readFileSync(path.join(projectDir, 'index.html'), 'utf8');

test('the complete BGM is packaged and wired with a relative URL', () => {
  assert.equal(fs.existsSync(audioPath), true);
  assert.ok(fs.statSync(audioPath).size > 500_000);
  assert.match(html, /<audio[^>]+id="gameBgm"[^>]+preload="auto"[^>]+src="assets\/audio\/game-bgm\.m4a"/);
  assert.doesNotMatch(html, /C:\\Users\\25283/);
});
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run:

```powershell
node --test rhythm-game/tests/audio-asset.test.js
```

Expected: FAIL because `assets/audio/game-bgm.m4a` and `#gameBgm` do not exist.

- [ ] **Step 3: Copy the approved binary without transcoding**

```powershell
New-Item -ItemType Directory -Force -Path "rhythm-game\assets\audio"
Copy-Item -LiteralPath "C:\Users\25283\Documents\Codex\2026-10-05\bang-w\outputs\20261005_003537_纯音频.m4a" -Destination "rhythm-game\assets\audio\game-bgm.m4a"
```

Add immediately inside `#gameStage`, before visual layers:

```html
<audio
  id="gameBgm"
  preload="auto"
  src="assets/audio/game-bgm.m4a"
  aria-hidden="true"
></audio>
```

- [ ] **Step 4: Verify the asset duration and test**

Run:

```powershell
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "rhythm-game\assets\audio\game-bgm.m4a"
node --test rhythm-game/tests/audio-asset.test.js
```

Expected: duration approximately `69.218005`; test PASS.

- [ ] **Step 5: Commit only this task**

```powershell
git add rhythm-game/assets/audio/game-bgm.m4a rhythm-game/index.html rhythm-game/tests/audio-asset.test.js
git commit -m "feat: package rhythm game BGM"
```

---

### Task 2: Add the Exact Fixed Chart

**Files:**
- Create: `rhythm-game/game-chart.js`
- Create: `rhythm-game/tests/game-chart.test.js`
- Modify: `rhythm-game/index.html:198-205`

**Interfaces:**
- Produces: `globalThis.RhythmGameChart.META`
- Produces: `globalThis.RhythmGameChart.NOTES`
- Note shape: `{ id, beatIndex, type, spawnTime, hitTime, holdEndTime, accelerationAt }`
- Consumes later: `Core.validateChart(Chart.NOTES, Chart.META)` and `app.js`

- [ ] **Step 1: Write the failing chart contract test**

```js
// rhythm-game/tests/game-chart.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import '../game-chart.js';

const { META, NOTES } = globalThis.RhythmGameChart;

test('the approved chart has exact duration, counts, and boundaries', () => {
  assert.equal(META.audioDuration, 69.218005);
  assert.equal(META.bpm, 120);
  assert.equal(META.beatSeconds, 0.4992);
  assert.equal(NOTES.length, 80);
  assert.equal(NOTES.filter((note) => note.type === 'normal').length, 48);
  assert.equal(NOTES.filter((note) => note.type === 'speed').length, 20);
  assert.equal(NOTES.filter((note) => note.type === 'hold').length, 12);
  assert.equal(NOTES[0].hitTime, 4.981);
  assert.ok(NOTES.at(-1).hitTime <= 66.88 + 0.01);
});

test('holds last two beats and never overlap another judgement', () => {
  for (const note of NOTES.filter((entry) => entry.type === 'hold')) {
    assert.equal(note.holdEndTime, Number((note.hitTime + META.beatSeconds * 2).toFixed(4)));
    assert.equal(
      NOTES.some((other) => other.id !== note.id
        && other.hitTime > note.hitTime
        && other.hitTime <= note.holdEndTime),
      false,
    );
  }
});
```

- [ ] **Step 2: Run the chart test and verify the expected failure**

Run:

```powershell
node --test rhythm-game/tests/game-chart.test.js
```

Expected: FAIL because `game-chart.js` does not exist.

- [ ] **Step 3: Implement immutable deterministic chart data**

Use the project’s existing UMD/global style:

```js
(function attachChart(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RhythmGameChart = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createChart() {
  'use strict';

  const META = Object.freeze({
    bpm: 120,
    beatSeconds: 0.4992,
    audioDuration: 69.218005,
    firstHitTime: 4.981,
    lastHitTime: 66.8818,
    travelTimeSeconds: 2,
  });

  const REST_BEATS = new Set([1,3,5,7,9,12,15,18,22,26,30,34,38,42,46,50,54,58,62,66,70]);
  const HOLD_BEATS = new Set([76,80,84,88,92,96,100,104,108,112,116,120]);
  const SPEED_BEATS = new Set([21,25,29,33,37,41,45,49,53,57,61,65,69,73,79,87,95,103,111,119]);
  const BLOCKED_BEATS = new Set([...HOLD_BEATS].flatMap((beat) => [beat + 1, beat + 2]));

  const beatIndices = Array.from({ length: 125 }, (_, index) => index)
    .filter((beat) => !REST_BEATS.has(beat) && !BLOCKED_BEATS.has(beat));

  const NOTES = Object.freeze(beatIndices.map((beatIndex, id) => {
    const type = HOLD_BEATS.has(beatIndex)
      ? 'hold'
      : SPEED_BEATS.has(beatIndex) ? 'speed' : 'normal';
    const hitTime = Number((META.firstHitTime + beatIndex * META.beatSeconds).toFixed(4));
    const spawnTime = Number((hitTime - META.travelTimeSeconds).toFixed(4));
    return Object.freeze({
      id,
      beatIndex,
      type,
      spawnTime,
      hitTime,
      holdEndTime: type === 'hold'
        ? Number((hitTime + META.beatSeconds * 2).toFixed(4))
        : null,
      accelerationAt: type === 'speed'
        ? Number((spawnTime + META.travelTimeSeconds * 0.65).toFixed(4))
        : null,
    });
  }));

  return Object.freeze({ META, NOTES });
}));
```

Load the script after `game-core.js` and before `audio-clock.js`/`app.js`:

```html
<script src="game-core.js"></script>
<script src="game-chart.js"></script>
```

- [ ] **Step 4: Run the chart test**

Run:

```powershell
node --test rhythm-game/tests/game-chart.test.js
```

Expected: 2 tests PASS, exact counts 48/20/12.

- [ ] **Step 5: Commit only this task**

```powershell
git add rhythm-game/game-chart.js rhythm-game/tests/game-chart.test.js rhythm-game/index.html
git commit -m "feat: add fixed BGM chart"
```

---

### Task 3: Add Pure Chart Validation, Movement, and Weighted Scoring

**Files:**
- Modify: `rhythm-game/game-core.js:16-221`
- Modify: `rhythm-game/tests/game-core.test.js:5-166`

**Interfaces:**
- Produces: `validateChart(notes, meta): true`
- Produces: `travelProgress(note, gameTime, travelTimeSeconds): number`
- Produces: `combineHoldJudgements(startJudgement, endJudgement): { judgement, points, maxPoints }`
- Produces: `applyNoteResult(state, result): ScoreState`
- Produces: `calculateChartMaxScore(notes): number`
- Preserves: `judgeOffsetMs`, `applyJudgement`, `calculateMusicProgress`, `buildCompletionDetail`

- [ ] **Step 1: Write failing validation and movement tests**

Import `game-chart.js` after `game-core.js`, destructure `validateChart`, `travelProgress`, `combineHoldJudgements`, `applyNoteResult`, and `calculateChartMaxScore` from `globalThis.RhythmGameCore`, then add these focused cases:

```js
test('validateChart accepts the approved chart and rejects overlapping hold judgements', () => {
  assert.equal(validateChart(globalThis.RhythmGameChart.NOTES, globalThis.RhythmGameChart.META), true);
  assert.throws(() => validateChart([
    { id: 0, type: 'hold', spawnTime: 0, hitTime: 2, holdEndTime: 3, accelerationAt: null },
    { id: 1, type: 'normal', spawnTime: 1, hitTime: 2.5, holdEndTime: null, accelerationAt: null },
  ], { audioDuration: 10 }), /hold judgement overlap/);
});

test('speed progress is slow before 65 percent and still reaches one on time', () => {
  const note = { type: 'speed', spawnTime: 10, hitTime: 12 };
  assert.equal(travelProgress(note, 10, 2), 0);
  assert.equal(travelProgress(note, 11.3, 2), 0.35);
  assert.equal(travelProgress(note, 12, 2), 1);
});
```

- [ ] **Step 2: Write failing hold score and weighted metric tests**

```js
test('combineHoldJudgements applies the approved score matrix', () => {
  assert.deepEqual(combineHoldJudgements('perfect', 'perfect'), {
    judgement: 'perfect', points: 200, maxPoints: 200,
  });
  assert.deepEqual(combineHoldJudgements('perfect', 'good'), {
    judgement: 'good', points: 150, maxPoints: 200,
  });
  assert.deepEqual(combineHoldJudgements('good', 'miss'), {
    judgement: 'miss', points: 50, maxPoints: 200,
  });
});

test('applyNoteResult increments combo once for a completed hold', () => {
  const next = applyNoteResult(createScoreState(), {
    judgement: 'perfect', points: 200, maxPoints: 200,
  });
  assert.equal(next.score, 200);
  assert.equal(next.combo, 1);
  assert.equal(next.perfect, 1);
  assert.equal(next.resolvedMaxScore, 200);
});

test('the approved chart maximum is 9200', () => {
  assert.equal(calculateChartMaxScore(globalThis.RhythmGameChart.NOTES), 9200);
});
```

- [ ] **Step 3: Run pure tests and verify expected failures**

Run:

```powershell
node --test rhythm-game/tests/game-core.test.js rhythm-game/tests/game-chart.test.js
```

Expected: FAIL because the five new exports are missing.

- [ ] **Step 4: Implement the minimal pure APIs**

Use these contracts:

```js
function noteMaxScore(note) {
  return note.type === 'hold' ? 200 : 100;
}

function calculateChartMaxScore(notes) {
  return notes.reduce((sum, note) => sum + noteMaxScore(note), 0);
}

function validateChart(notes, meta) {
  if (!Array.isArray(notes) || notes.length === 0) {
    throw new TypeError('chart notes must be a non-empty array');
  }
  const ids = new Set();
  let previousHitTime = -Infinity;
  let activeHoldEnd = -Infinity;

  for (const note of notes) {
    if (ids.has(note.id)) throw new RangeError('duplicate chart note id');
    ids.add(note.id);
    if (!['normal', 'speed', 'hold'].includes(note.type)) {
      throw new TypeError('unknown chart note type');
    }
    if (![note.spawnTime, note.hitTime].every(Number.isFinite)) {
      throw new TypeError('chart note times must be finite');
    }
    if (note.spawnTime > note.hitTime || note.hitTime < previousHitTime) {
      throw new RangeError('chart notes must be ordered');
    }
    if (note.hitTime > meta.audioDuration) throw new RangeError('chart note exceeds audio');
    if (note.hitTime <= activeHoldEnd) throw new RangeError('hold judgement overlap');
    if (note.type === 'hold') {
      if (!Number.isFinite(note.holdEndTime) || note.holdEndTime <= note.hitTime) {
        throw new RangeError('hold end must follow hit time');
      }
      activeHoldEnd = note.holdEndTime;
    }
    if (note.type === 'speed'
      && (!Number.isFinite(note.accelerationAt)
        || note.accelerationAt <= note.spawnTime
        || note.accelerationAt >= note.hitTime)) {
      throw new RangeError('speed acceleration must occur during travel');
    }
    previousHitTime = note.hitTime;
  }
  return true;
}

function travelProgress(note, gameTime, travelTimeSeconds = CONFIG.travelTimeSeconds) {
  const elapsedRatio = clamp((gameTime - note.spawnTime) / travelTimeSeconds, 0, 1);
  if (note.type !== 'speed') return elapsedRatio;
  if (elapsedRatio <= 0.65) return (elapsedRatio / 0.65) * 0.35;
  return 0.35 + ((elapsedRatio - 0.65) / 0.35) * 0.65;
}

function combineHoldJudgements(startJudgement, endJudgement) {
  const pointsFor = (value) => value === 'perfect' ? 100 : value === 'good' ? 50 : 0;
  const missed = startJudgement === 'miss' || endJudgement === 'miss';
  return {
    judgement: missed
      ? 'miss'
      : startJudgement === 'perfect' && endJudgement === 'perfect' ? 'perfect' : 'good',
    points: pointsFor(startJudgement) + pointsFor(endJudgement),
    maxPoints: 200,
  };
}

function applyNoteResult(state, { judgement, points, maxPoints }) {
  const next = {
    ...state,
    score: state.score + points,
    resolvedMaxScore: (state.resolvedMaxScore ?? 0) + maxPoints,
  };
  if (judgement === 'perfect' || judgement === 'good') {
    next.combo += 1;
    next.maxCombo = Math.max(next.maxCombo, next.combo);
    next[judgement] += 1;
    return next;
  }
  if (judgement === 'miss') {
    next.combo = 0;
    next.miss += 1;
    return next;
  }
  throw new TypeError(`Unknown judgement: ${judgement}`);
}
```

Extend score state with `resolvedMaxScore: 0`. Implement `applyNoteResult` so it adds `points`, adds `maxPoints` to `resolvedMaxScore`, increments exactly one result counter, increments combo once for Perfect/Good, and resets combo for Miss. Make `applyJudgement` a compatibility wrapper that passes 100/50/0 points and `maxPoints: 100`.

Change metrics to accept `chartMaxScore`, while preserving a safe compatibility default:

```js
function calculateRoundMetrics(state, totalNotes, chartMaxScore = totalNotes * 100) {
  const resolvedMaximum = state.resolvedMaxScore
    ?? ((state.perfect + state.good + state.miss) * 100);
  const accuracy = resolvedMaximum > 0
    ? roundToTwo(clamp((state.score / resolvedMaximum) * 100, 0, 100))
    : 0;
  const repairPercent = chartMaxScore > 0
    ? roundToTwo(clamp((state.score / chartMaxScore) * 100, 0, 100))
    : 0;
  return { accuracy, repairPercent, starRating: starRatingForRepair(repairPercent) };
}
```

Update `buildCompletionDetail(state, totalNotes, chartMaxScore)` to pass the weighted maximum.

- [ ] **Step 5: Run pure tests and repair existing expectations**

Run:

```powershell
node --test rhythm-game/tests/game-core.test.js rhythm-game/tests/game-chart.test.js
```

Expected: all tests PASS. Existing deep-equality expectations must include `resolvedMaxScore` where score state is asserted.

- [ ] **Step 6: Commit only this task**

```powershell
git add rhythm-game/game-core.js rhythm-game/tests/game-core.test.js
git commit -m "feat: add weighted note scoring core"
```

---

### Task 4: Add the Authoritative HTML Media Clock

**Files:**
- Create: `rhythm-game/audio-clock.js`
- Create: `rhythm-game/tests/audio-clock.test.js`
- Modify: `rhythm-game/index.html:198-207`

**Interfaces:**
- Produces: `new globalThis.RhythmAudioClock.AudioClock(mediaElement)`
- Methods: `whenReady()`, `unlock()`, `playFromStart()`, `pause()`, `resume()`, `reset()`
- Getters: `currentTime`, `duration`, `ended`, `paused`
- Consumes later: `app.js`

- [ ] **Step 1: Write failing lifecycle tests with an injected fake media element**

```js
// rhythm-game/tests/audio-clock.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import '../audio-clock.js';

class FakeMedia extends EventTarget {
  constructor() {
    super();
    this.readyState = 1;
    this.currentTime = 0;
    this.duration = 69.218005;
    this.paused = true;
    this.ended = false;
  }
  async play() { this.paused = false; }
  pause() { this.paused = true; }
  load() {}
}

test('AudioClock starts, pauses, resumes, and resets the injected media', async () => {
  const media = new FakeMedia();
  const clock = new globalThis.RhythmAudioClock.AudioClock(media);
  await clock.whenReady();
  await clock.unlock();
  await clock.playFromStart();
  assert.equal(clock.paused, false);
  media.currentTime = 12.5;
  clock.pause();
  assert.equal(clock.currentTime, 12.5);
  await clock.resume();
  clock.reset();
  assert.equal(clock.currentTime, 0);
  assert.equal(clock.paused, true);
});
```

- [ ] **Step 2: Run and verify the expected module-missing failure**

Run:

```powershell
node --test rhythm-game/tests/audio-clock.test.js
```

Expected: FAIL because `audio-clock.js` does not exist.

- [ ] **Step 3: Implement the wrapper with no independent timer**

```js
class AudioClock {
  constructor(media) {
    if (!media) throw new TypeError('AudioClock requires a media element');
    this.media = media;
  }
  get currentTime() { return Number(this.media.currentTime) || 0; }
  get duration() { return Number.isFinite(this.media.duration) ? this.media.duration : 0; }
  get ended() { return Boolean(this.media.ended); }
  get paused() { return Boolean(this.media.paused); }
  whenReady() {
    if (this.media.readyState >= 1 && this.duration > 0) return Promise.resolve(this.duration);
    return new Promise((resolve, reject) => {
      this.media.addEventListener('loadedmetadata', () => resolve(this.duration), { once: true });
      this.media.addEventListener('error', () => reject(new Error('BGM metadata failed to load')), { once: true });
      this.media.load();
    });
  }
  async unlock() {
    const previousMuted = this.media.muted;
    this.media.muted = true;
    await this.media.play();
    this.media.pause();
    this.media.currentTime = 0;
    this.media.muted = previousMuted;
  }
  async playFromStart() { this.media.currentTime = 0; await this.media.play(); }
  pause() { this.media.pause(); }
  async resume() { await this.media.play(); }
  reset() { this.media.pause(); this.media.currentTime = 0; }
}
```

Expose it through the same UMD pattern as `game-core.js`. Load `audio-clock.js` after `game-chart.js` and before `app.js`.

- [ ] **Step 4: Run the clock test**

Run:

```powershell
node --test rhythm-game/tests/audio-clock.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit only this task**

```powershell
git add rhythm-game/audio-clock.js rhythm-game/tests/audio-clock.test.js rhythm-game/index.html
git commit -m "feat: add BGM audio clock"
```

---

### Task 5: Replace Generated Beats with BGM and Fixed Chart Playback

**Files:**
- Modify: `rhythm-game/app.js:1-498`
- Modify: `rhythm-game/tests/hud-browser-qa.cjs:1-291`
- Modify: `rhythm-game/styles.css:676-724`

**Interfaces:**
- Consumes: `RhythmGameChart.NOTES`, `RhythmGameChart.META`, `RhythmAudioClock.AudioClock`
- Produces: audio-driven game states `idle | arming | countdown | starting-audio | playing | paused | reengaging | result`
- Preserves: `rhythmgame:attack`, `rhythmgame:pause`, and `rhythmgame:complete`

- [ ] **Step 1: Update browser QA first to install a controllable media clock**

In `page.addInitScript`, wrap HTMLMediaElement behavior:

```js
let mediaTime = 0;
Object.defineProperties(HTMLMediaElement.prototype, {
  duration: { configurable: true, get: () => 69.218005 },
  currentTime: {
    configurable: true,
    get() { return mediaTime; },
    set(value) { mediaTime = Number(value) || 0; },
  },
  readyState: { configurable: true, get: () => 4 },
  paused: { configurable: true, get() { return this.__paused !== false; } },
});
HTMLMediaElement.prototype.play = async function play() { this.__paused = false; };
HTMLMediaElement.prototype.pause = function pause() { this.__paused = true; };
window.__setMediaTime = (value) => { mediaTime = value; };
```

Change assertions to expect 80 chart notes, BGM duration `69.218005`, progress from media time, and exactly one completion event after dispatching `ended`.

- [ ] **Step 2: Run browser QA and verify it fails against the current generated schedule**

Run:

```powershell
node rhythm-game/tests/hud-browser-qa.cjs
```

Expected: FAIL because `app.js` still builds 116 generated beats and uses the 60-second AudioContext clock.

- [ ] **Step 3: Replace scheduling state in `app.js`**

At startup, require all three modules:

```js
const Core = globalThis.RhythmGameCore;
const Chart = globalThis.RhythmGameChart;
const { AudioClock } = globalThis.RhythmAudioClock;
const bgmClock = new AudioClock(document.querySelector('#gameBgm'));
const chartMaxScore = Core.calculateChartMaxScore(Chart.NOTES);
Core.validateChart(Chart.NOTES, Chart.META);
```

Remove `beatScheduler`, `songStartTime`, `nextBeatIndex`, `scheduleMetronome()`, and the generated `buildBeatSchedule()` call from the runtime path. Keep Web Audio only for short hit SFX. Rename `audioContext` to `sfxContext` and rename `createAudioContext()` to `createSfxContext()`; the renamed function retains the existing responsibility of creating/resuming the SFX context and does not expose gameplay time.

During initial page setup, disable Start until `bgmClock.whenReady()` resolves. Re-enable it after metadata is available. The direct Start click calls `bgmClock.unlock()` before its first asynchronous boundary so delayed playback after the three-second countdown remains permitted by browser autoplay policy.

At the beginning of `startGame()` use:

```js
const unlockPromise = bgmClock.unlock();
status = 'arming';
await Promise.all([unlockPromise, bgmClock.whenReady(), createSfxContext()]);
```

Make `prepareNotes()` clone chart state:

```js
function prepareNotes() {
  notes = Chart.NOTES.map((definition) => ({
    ...definition,
    state: 'queued',
    element: null,
    tailElement: null,
    startJudgement: null,
  }));
}
```

- [ ] **Step 4: Start BGM exactly after countdown and use it in the frame loop**

During `arming`, await the unlock promise and `bgmClock.whenReady()`. Run the existing three-second countdown with the SFX context clock. Avoid awaiting media playback inside the animation frame; use a guarded transition:

```js
async function beginBgmPlayback() {
  if (status !== 'starting-audio') return;
  try {
    await bgmClock.playFromStart();
    status = 'playing';
  } catch (error) {
    showAudioLoadError(error);
  }
}

if (remaining <= 0 && status === 'countdown') {
  status = 'starting-audio';
  elements.countdown.hidden = true;
  void beginBgmPlayback();
}
```

During play:

```js
const gameTime = bgmClock.currentTime;
renderMusicProgress(Core.calculateMusicProgress(gameTime, bgmClock.duration));
renderNotes(gameTime);
expireMissedNotes(gameTime);
```

Listen for the media `ended` event and call idempotent `endGame()`. Pass `chartMaxScore` into HUD metrics and completion detail.

- [ ] **Step 5: Add explicit audio-load failure UI using the existing overlay**

Add a hidden message beside the Start button:

```html
<p id="audioLoadError" class="audio-load-error" role="alert" hidden>
  MUSIC FAILED TO LOAD
</p>
```

On load failure, call an explicit recovery function:

```js
function showAudioLoadError(error) {
  status = 'idle';
  bgmClock.reset();
  elements.startOverlay.hidden = false;
  elements.audioLoadError.hidden = false;
  elements.startButton.textContent = 'RETRY';
  elements.startButton.disabled = false;
  console.error(error);
}
```

This allows another `whenReady()` attempt. Do not disable the button permanently.

- [ ] **Step 6: Run unit, contract, and browser tests**

Run:

```powershell
node --test rhythm-game/tests/audio-asset.test.js rhythm-game/tests/audio-clock.test.js rhythm-game/tests/game-chart.test.js rhythm-game/tests/game-core.test.js rhythm-game/attack-event-contract.test.js
node rhythm-game/tests/hud-browser-qa.cjs
node --check rhythm-game/app.js
```

Expected: all PASS; no console or page errors.

- [ ] **Step 7: Commit only this task**

```powershell
git add rhythm-game/app.js rhythm-game/index.html rhythm-game/styles.css rhythm-game/tests/hud-browser-qa.cjs
git commit -m "feat: drive rhythm game from BGM clock"
```

---

### Task 6: Render Normal and Acceleration Candy Motion

**Files:**
- Modify: `rhythm-game/app.js:242-350`
- Modify: `rhythm-game/styles.css:217-254`
- Create: `rhythm-game/tests/gameplay-note-types-qa.cjs`

**Interfaces:**
- Consumes: `Core.travelProgress(note, gameTime)`
- Produces: `.note-normal`, `.note-speed`, and one `.is-accelerating` transition per speed note
- Uses asset mapping: `{ normal: pink, speed: yellow, hold: blue }`

- [ ] **Step 1: Write browser assertions for color identity and speed curve**

The test uses `window.__setMediaTime()` to sample one normal and one speed note:

```js
const snapshot = await page.evaluate(() => ({
  normalSrc: document.querySelector('.note-normal img, img.note-normal')?.getAttribute('src'),
  speedSrc: document.querySelector('.note-speed img, img.note-speed')?.getAttribute('src'),
  speedProgress: Number(document.querySelector('.note-speed')?.dataset.progress),
}));
assert.match(snapshot.normalSrc, /candy-pink\.png$/);
assert.match(snapshot.speedSrc, /candy-yellow\.png$/);
assert.ok(snapshot.speedProgress <= 0.36);
```

Advance time past `accelerationAt` and assert `.is-accelerating` appears once and progress reaches 1 at `hitTime`.

- [ ] **Step 2: Run QA and verify the old random-color renderer fails**

Run:

```powershell
node rhythm-game/tests/gameplay-note-types-qa.cjs
```

Expected: FAIL because current notes use random `colorIndex` and linear motion.

- [ ] **Step 3: Replace array-index color selection with type mapping**

```js
const CANDY_SOURCES = Object.freeze({
  normal: 'assets/candies/candy-pink.png',
  speed: 'assets/candies/candy-yellow.png',
  hold: 'assets/candies/candy-blue.png',
});
```

`createNoteElement(note)` adds `note-${note.type}` and uses `CANDY_SOURCES[note.type]`.

- [ ] **Step 4: Use pure travel progress and fire one acceleration transition**

```js
const progress = Core.travelProgress(note, gameTime, Chart.META.travelTimeSeconds);
const point = elements.path.getPointAtLength(pathLength * progress);
note.element.dataset.progress = progress.toFixed(4);

if (note.type === 'speed' && gameTime >= note.accelerationAt && !note.didAccelerate) {
  note.didAccelerate = true;
  note.element.classList.add('is-accelerating');
  window.setTimeout(() => note.element?.classList.remove('is-accelerating'), 220);
}
```

Add a 220ms yellow-white scale/glow flash; do not translate the element independently of the path.

- [ ] **Step 5: Run all focused tests**

Run:

```powershell
node --test rhythm-game/tests/game-core.test.js rhythm-game/tests/game-chart.test.js
node rhythm-game/tests/gameplay-note-types-qa.cjs
```

Expected: PASS; speed note position remains on the approved SVG path.

- [ ] **Step 6: Commit only this task**

```powershell
git add rhythm-game/app.js rhythm-game/styles.css rhythm-game/tests/gameplay-note-types-qa.cjs
git commit -m "feat: render acceleration candies"
```

---

### Task 7: Add Hold Press/Release State, Tail, and Sustained Attack Feedback

**Files:**
- Modify: `rhythm-game/app.js:242-480`
- Modify: `rhythm-game/styles.css:217-254`
- Modify: `rhythm-game/magic-attack-d.js`
- Modify: `rhythm-game/magic-attack-d.css`
- Modify: `rhythm-game/attack-event-contract.test.js`
- Modify: `rhythm-game/tests/gameplay-note-types-qa.cjs`

**Interfaces:**
- Produces: `handlePressInput(source)` and `handleReleaseInput(source)`
- Produces: optional `rhythmgame:attack.detail.phase` values `burst | hold-start | hold-end`
- Consumes: `Core.combineHoldJudgements()` and `Core.applyNoteResult()`
- Preserves: `strength` in every attack event for existing renderer compatibility

- [ ] **Step 1: Extend the static attack contract before production edits**

```js
test('app owns release input and exposes semantic hold phases', () => {
  assert.match(appSource, /addEventListener\(['"]keyup['"]/);
  assert.match(appSource, /addEventListener\(['"]pointerup['"]/);
  assert.match(appSource, /phase:\s*['"]hold-start['"]/);
  assert.match(appSource, /phase:\s*['"]hold-end['"]/);
  assert.doesNotMatch(effectSource, /addEventListener\(['"]keyup['"]/);
  assert.doesNotMatch(effectSource, /addEventListener\(['"]pointerup['"]/);
});
```

- [ ] **Step 2: Add browser scenarios for PP, PG, and release Miss**

Use the fake media clock to target the first hold:

```js
await page.evaluate((time) => window.__setMediaTime(time), firstHold.hitTime);
await page.keyboard.down('Space');
await page.evaluate((time) => window.__setMediaTime(time), firstHold.holdEndTime);
await page.keyboard.up('Space');
```

Assert one completed hold, score +200, combo +1, and one Perfect. Repeat after restart with a +150ms release for +150/Good, then with a release later than +200ms for partial score/Miss/combo reset.

- [ ] **Step 3: Run tests and verify release behavior is absent**

Run:

```powershell
node --test rhythm-game/attack-event-contract.test.js
node rhythm-game/tests/gameplay-note-types-qa.cjs
```

Expected: FAIL because only press input exists and hold state is absent.

- [ ] **Step 4: Split press and release handling**

Replace `handleHitInput()` with:

```js
function handlePressInput(source) {
  if (status !== 'playing' || isInputHeld) return;
  isInputHeld = true;
  const gameTime = bgmClock.currentTime;
  // Select nearest active note. Resolve normal/speed immediately.
  // For hold, store startJudgement and transition to 'holding'.
}

function handleReleaseInput(source) {
  if (!isInputHeld) return;
  isInputHeld = false;
  if (status !== 'playing' || !activeHold) return;
  const endJudgement = judgementOrMiss(bgmClock.currentTime, activeHold.holdEndTime);
  const result = Core.combineHoldJudgements(activeHold.startJudgement, endJudgement);
  finishNote(activeHold, result);
}
```

Add the helpers used above:

```js
function judgementOrMiss(gameTime, targetTime) {
  const judgement = Core.judgeOffsetMs((gameTime - targetTime) * 1000);
  return judgement === 'none' ? 'miss' : judgement;
}

function finishNote(note, result) {
  note.state = result.judgement === 'miss' ? 'missed' : 'hit';
  removeNote(note);
  scoreState = Core.applyNoteResult(scoreState, result);
  activeHold = null;
  renderHud();
  showJudgement(result.judgement);
}
```

Normal and acceleration notes call `finishNote` with `{ judgement, points, maxPoints: 100 }`; hold notes call it with the object returned by `combineHoldJudgements`.

Register `keyup`, `pointerup`, and `pointercancel`. Keep all input ownership in `app.js`.

- [ ] **Step 5: Render the hold tail from the exact track path**

For each hold note, create an absolute SVG using viewBox `0 0 2048 1152`, clone `elements.path.getAttribute('d')`, and add `.hold-note-tail`. Update only `stroke-dasharray` and `stroke-dashoffset` to show the segment ending at the head. While holding, pin the head to the track endpoint and shrink the remaining tail according to:

```js
const remaining = clamp(
  (note.holdEndTime - gameTime) / (note.holdEndTime - note.hitTime),
  0,
  1,
);
```

CSS requirements:

```css
.hold-note-tail {
  fill: none;
  stroke: rgba(116, 226, 255, 0.86);
  stroke-width: 22;
  stroke-linecap: round;
  filter: blur(2px) drop-shadow(0 0 12px #7c8dff) drop-shadow(0 0 22px #52e7ff);
  pointer-events: none;
}
```

The tail stays below the candy head and above the base track.

- [ ] **Step 6: Extend attack events without adding new raw input listeners**

```js
function fireAttack(strength, phase = 'burst') {
  window.dispatchEvent(new CustomEvent('rhythmgame:attack', {
    detail: { strength, phase },
  }));
}
```

Hold start sends `phase: 'hold-start'`; successful or failed release sends `phase: 'hold-end'`. `magic-attack-d.js` keeps the current burst path for `burst`, holds one sustained connection for `hold-start`, and clears it on `hold-end`, pause, completion, or restart.

- [ ] **Step 7: Run unit, contract, and browser tests**

Run:

```powershell
node --test rhythm-game/tests/audio-asset.test.js rhythm-game/tests/audio-clock.test.js rhythm-game/tests/game-chart.test.js rhythm-game/tests/game-core.test.js rhythm-game/attack-event-contract.test.js
node rhythm-game/tests/gameplay-note-types-qa.cjs
node --check rhythm-game/app.js
node --check rhythm-game/magic-attack-d.js
```

Expected: all PASS; no duplicate input ownership; each hold increases combo at most once.

- [ ] **Step 8: Commit only this task**

```powershell
git add rhythm-game/app.js rhythm-game/styles.css rhythm-game/magic-attack-d.js rhythm-game/magic-attack-d.css rhythm-game/attack-event-contract.test.js rhythm-game/tests/gameplay-note-types-qa.cjs
git commit -m "feat: add hold candy interaction"
```

---

### Task 8: Integrate Pause, Focus Loss, Hold Re-entry, Restart, and Completion

**Files:**
- Modify: `rhythm-game/app.js:75-498`
- Modify: `rhythm-game/tests/gameplay-note-types-qa.cjs`
- Modify: `rhythm-game/tests/hud-browser-qa.cjs`

**Interfaces:**
- Consumes: `bgmClock.pause()`, `bgmClock.resume()`, `bgmClock.reset()`
- Produces: `reengaging` state for an interrupted active hold
- Preserves: one `rhythmgame:pause` and one `rhythmgame:complete` event per transition/round

- [ ] **Step 1: Add failing browser cases**

Cover these exact scenarios:

1. Pause at media time 20.0; changing fake media time while paused does not move notes or progress.
2. Dispatch `visibilitychange` with hidden state; status becomes paused and active attack particles clear.
3. Pause during a hold; the start judgement remains, release during pause does not score, and resume requests re-engagement.
4. Re-press within 1.5 seconds; BGM resumes and the original hold end remains relative to the frozen media time.
5. Do not re-press within 1.5 seconds; the hold resolves as Miss and BGM resumes.
6. Restart resets media time to 0, score/combo/progress to 0, clears notes/tails/effects, and rebuilds exactly 80 queued events.
7. Dispatch media `ended` twice; completion details length remains 1.

- [ ] **Step 2: Run QA and verify expected pause/re-entry failures**

Run:

```powershell
node rhythm-game/tests/gameplay-note-types-qa.cjs
node rhythm-game/tests/hud-browser-qa.cjs
```

Expected: FAIL on media pause/re-entry and idempotent completion assertions.

- [ ] **Step 3: Make pause freeze both clocks and normalize input state**

`pauseGame()` pauses BGM and suspends the SFX context. It records whether an active hold needs re-engagement and clears physical input latch state. Add:

```js
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseGame();
});
window.addEventListener('blur', () => pauseGame());
```

Guard both handlers so idle/result states remain unchanged.

- [ ] **Step 4: Implement bounded hold re-entry**

If a hold was active when paused, `resumeGame()` enters `reengaging`, keeps BGM paused, displays `HOLD`, and starts a 1,500ms wall-clock deadline. A valid press during that interval restores `holding`, hides the cue, and resumes BGM without rejudging the start. Timeout applies a release Miss through `combineHoldJudgements`, then resumes BGM.

Clear the re-entry timeout on successful press, restart, completion, and pagehide.

- [ ] **Step 5: Make completion and restart idempotent**

Use a per-round boolean `completionDispatched`. Reset it only in `startGame()`. `endGame()` returns immediately when already set, resolves remaining notes once, builds detail with `(scoreState, notes.length, chartMaxScore)`, then dispatches once.

`startGame()` calls `bgmClock.reset()`, clears notes/tails, clears active hold and input latch, resets the SFX context state, rebuilds chart notes, and begins a fresh countdown.

- [ ] **Step 6: Run complete automated regression**

Run:

```powershell
node --test rhythm-game/tests/audio-asset.test.js rhythm-game/tests/audio-clock.test.js rhythm-game/tests/game-chart.test.js rhythm-game/tests/game-core.test.js rhythm-game/attack-event-contract.test.js
node rhythm-game/tests/hud-browser-qa.cjs
node rhythm-game/tests/gameplay-note-types-qa.cjs
node --check rhythm-game/game-core.js
node --check rhythm-game/game-chart.js
node --check rhythm-game/audio-clock.js
node --check rhythm-game/app.js
node --check rhythm-game/magic-attack-d.js
```

Expected: all commands exit 0; console errors and page errors arrays are empty.

- [ ] **Step 7: Commit only this task**

```powershell
git add rhythm-game/app.js rhythm-game/tests/gameplay-note-types-qa.cjs rhythm-game/tests/hud-browser-qa.cjs
git commit -m "feat: integrate BGM pause and recovery"
```

---

### Task 9: Update Documentation and Perform Visual Playtest

**Files:**
- Modify: `rhythm-game/README.md`
- Modify only if defects are observed: `rhythm-game/app.js`, `rhythm-game/styles.css`, `rhythm-game/magic-attack-d.js`, `rhythm-game/magic-attack-d.css`
- Output: `docs/qa/rhythm-game-bgm-note-types-*.png`
- Output: `docs/qa/rhythm-game-bgm-note-types-report.json`

**Interfaces:**
- Consumes: completed implementation and automated test commands
- Produces: reproducible operating instructions and visual evidence

- [ ] **Step 1: Replace obsolete README rules**

Document:

```markdown
- Full BGM duration: approximately 69.218 seconds
- Pink: tap
- Yellow: tap after the mid-path acceleration
- Blue: press at the head and release at the end of the glowing tail
- Perfect: ±100ms
- Good: ±200ms
- Chart: 80 events, maximum score 9,200
```

Update the completion-event example to show all ten fields already exposed by the project.

- [ ] **Step 2: Run the complete automated suite fresh**

Run:

```powershell
node --test rhythm-game/tests/audio-asset.test.js rhythm-game/tests/audio-clock.test.js rhythm-game/tests/game-chart.test.js rhythm-game/tests/game-core.test.js rhythm-game/attack-event-contract.test.js
node rhythm-game/tests/hud-browser-qa.cjs
node rhythm-game/tests/gameplay-note-types-qa.cjs
```

Expected: all PASS with zero console and page errors.

- [ ] **Step 3: Inspect the real page at three 16:9 sizes**

Capture and inspect:

- 1920×1080 active normal candy
- 1280×720 acceleration flash
- 658×370 hold head/tail and release
- paused during hold
- final result after media end

Reject the build if the track `d` value changes, the hold tail separates from the track, the candy appears behind the track, or HUD/judgement art is obscured.

- [ ] **Step 4: Perform one real-audio manual pass**

With the actual packaged M4A rather than the fake clock:

1. Confirm audio begins after the three-second countdown.
2. Confirm the first hit lands near 4.981 seconds.
3. Confirm acceleration cues land before their target beats.
4. Complete at least one hold with keyboard and one with pointer input.
5. Pause/resume once during normal travel and once during a hold.
6. Let the complete 69.218-second file end naturally.
7. Confirm settlement appears once and Restart returns audio to zero.

Record observed duration, input method, event payload, console errors, and any visual defects in `docs/qa/rhythm-game-bgm-note-types-report.json`.

- [ ] **Step 5: Commit documentation and verified QA artifacts**

```powershell
git add rhythm-game/README.md docs/qa/rhythm-game-bgm-note-types-*.png docs/qa/rhythm-game-bgm-note-types-report.json
git commit -m "docs: verify BGM note type gameplay"
```

---

## Final Verification Gate

Before claiming completion, run every command below from `D:\05 ai作品集\04\游戏操作文件` and read every exit code:

```powershell
node --test rhythm-game/tests/audio-asset.test.js rhythm-game/tests/audio-clock.test.js rhythm-game/tests/game-chart.test.js rhythm-game/tests/game-core.test.js rhythm-game/attack-event-contract.test.js
node rhythm-game/tests/hud-browser-qa.cjs
node rhythm-game/tests/gameplay-note-types-qa.cjs
node --check rhythm-game/game-core.js
node --check rhythm-game/game-chart.js
node --check rhythm-game/audio-clock.js
node --check rhythm-game/app.js
node --check rhythm-game/magic-attack-d.js
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 rhythm-game/assets/audio/game-bgm.m4a
```

Required evidence:

- All Node tests pass.
- Both browser QA scripts exit 0.
- All syntax checks exit 0.
- Audio duration is approximately 69.218 seconds.
- Chart counts are exactly 48 normal, 20 acceleration, 12 hold.
- Chart maximum score is exactly 9,200.
- Browser console and page error collections are empty.
- Screenshots confirm the approved track geometry is unchanged and hold tails remain aligned at all tested sizes.
