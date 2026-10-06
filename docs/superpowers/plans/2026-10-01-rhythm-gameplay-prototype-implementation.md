# Candy Chase Rhythm Gameplay Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a standalone, directly playable 45-second greybox rhythm stage implementing the approved normal, rush, and hold candy rules.

**Architecture:** Pure TypeScript modules own deterministic rhythm rules and are tested without Phaser. A thin Phaser scene renders the simulation and adapts keyboard/pointer input, while React supplies the standalone start, HUD, and result overlays. Web Audio is the time source and synthesizes temporary cues.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Phaser, Web Audio API

**Spec:** `docs/superpowers/specs/2026-10-01-rhythm-gameplay-prototype-design.md`

## Global Constraints

- Do not delete or replace existing loading, lobby, hero-selection, assets, tests, or documentation.
- Expose the prototype through `gameplay.html`; keep the existing `index.html` application behavior unchanged.
- Use 120 BPM, 45 seconds, 30 chart events, four-beat travel, and the approved judgement/scoring rules exactly.
- Keep gameplay rules outside Phaser scene mutation and reference renderer assets through stable manifest keys.
- Write and run a failing behavior test before each production behavior.

---

### Task 1: Install Phaser and add a standalone build entry

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.ts`
- Create: `gameplay.html`
- Create: `src/gameplay-main.tsx`

**Interfaces:**
- Produces: a Vite entry at `/gameplay.html` mounting `GameplayPrototypePage` into `#gameplay-root`.

- [ ] Install `phaser` with npm so the manifest and lockfile agree.
- [ ] Add the `gameplay.html` Rollup input alongside the existing index input.
- [ ] Create the HTML mount point and minimal React entry import.
- [ ] Run `npm run typecheck`; the expected initial failure is the missing `GameplayPrototypePage` module, proving the new entry is compiled.

### Task 2: Implement judgement and scoring with TDD

**Files:**
- Create: `src/gameplay/domain/types.ts`
- Create: `src/gameplay/domain/judgement.test.ts`
- Create: `src/gameplay/domain/judgement.ts`
- Create: `src/gameplay/domain/score.test.ts`
- Create: `src/gameplay/domain/score.ts`

**Interfaces:**
- Produces: `judgeError(errorSeconds): Judgement`, `worseJudgement(a, b): Judgement`, and `summarizeResults(results, maxCombo): ResultSummary`.

- [ ] Write boundary tests proving 90 ms is Perfect, values just above it are Good, 180 ms is Good, and values outside are Miss.
- [ ] Run the test file and verify failure because the production module does not exist.
- [ ] Implement the minimal judgement functions and rerun to green.
- [ ] Write failing scoring tests using literal expected percentages and result titles.
- [ ] Implement scoring and rerun the complete domain test group.

### Task 3: Define and validate the 30-event chart with TDD

**Files:**
- Create: `src/gameplay/domain/chart.test.ts`
- Create: `src/gameplay/domain/chart.ts`

**Interfaces:**
- Produces: `STAGE_CHART: RhythmEvent[]` and `validateChart(events): string[]`.

- [ ] Write tests requiring exactly 30 unique ordered events, 20 normal, 6 rush, 4 hold, four-beat travel metadata, one-second holds, and no input overlap during holds.
- [ ] Run the test and verify the missing module failure.
- [ ] Add the hand-authored chart and validator.
- [ ] Run the chart tests and adjust only production data until green.

### Task 4: Implement the rhythm session state machine with TDD

**Files:**
- Create: `src/gameplay/domain/RhythmSession.test.ts`
- Create: `src/gameplay/domain/RhythmSession.ts`

**Interfaces:**
- Consumes: `RhythmEvent`, judgement functions, and result summary.
- Produces: `press(songTime)`, `release(songTime)`, `advance(songTime)`, `restart()`, and `snapshot()`.

- [ ] Write a failing test that a normal press within 90 ms returns Perfect and increments combo once.
- [ ] Implement the smallest normal-note path and rerun to green.
- [ ] Add failing tests proving empty press resets combo without changing counts or accuracy.
- [ ] Implement empty-input behavior and rerun.
- [ ] Add failing tests for rush notes using the same fixed hit-time judgement.
- [ ] Implement rush-note input and rerun.
- [ ] Add failing tests for hold start/release aggregation, early release Miss, and late auto-Miss.
- [ ] Implement hold state and rerun.
- [ ] Add failing tests for auto-Miss of untouched events, 45-second completion, result summary, and complete restart.
- [ ] Implement advancement/completion/restart and run all domain tests.

### Task 5: Add the Web Audio clock and temporary sound cues

**Files:**
- Create: `src/gameplay/audio/PrototypeAudio.ts`

**Interfaces:**
- Produces: `start()`, `getSongTime()`, `scheduleMetronome()`, `playRushCue()`, `playJudgement()`, and `destroy()`.

- [ ] Implement a user-gesture-started AudioContext clock with a small start lead-in.
- [ ] Schedule 120 BPM count-in/metronome oscillators using absolute audio times rather than animation frames.
- [ ] Add short distinct synthesized rush, Perfect, Good, and Miss cues.
- [ ] Ensure every oscillator and timer is stopped or disconnected by `destroy()`.
- [ ] Run type checking.

### Task 6: Render the perspective lane in a thin Phaser scene

**Files:**
- Create: `src/gameplay/render/assetManifest.ts`
- Create: `src/gameplay/render/GameplayScene.ts`
- Create: `src/gameplay/render/createGameplayGame.ts`

**Interfaces:**
- Consumes: `RhythmSession`, `PrototypeAudio`, and `STAGE_CHART`.
- Produces: `GameplayController` with `start()`, `restart()`, `destroy()`, and snapshot subscription.

- [ ] Register stable greybox keys for Piko, three candies, hit point, depth marker, and effects.
- [ ] Draw the 1920x1080 greybox environment and left-side performer using generated Phaser graphics textures.
- [ ] Render event position from song time: upper-right spawn to lower-left target, 35%-100% scale, maximum three visible candies.
- [ ] Render rush two-phase motion and its cue flash; render holds as a perspective strip between head and tail.
- [ ] Brighten the hit point during the final beat and burst it on judgement.
- [ ] Adapt Space and primary pointer press/release into session actions while ignoring key repeat.
- [ ] Emit throttled immutable snapshots to the React HUD.
- [ ] Run type checking and unit tests.

### Task 7: Build the standalone React HUD, start overlay, and result overlay

**Files:**
- Create: `src/gameplay/ui/GameplayPrototypePage.test.tsx`
- Create: `src/gameplay/ui/GameplayPrototypePage.tsx`
- Create: `src/gameplay/styles/gameplay.css`

**Interfaces:**
- Consumes: `GameplayController` and session snapshots.
- Produces: accessible controls for start and restart plus live DOM HUD.

- [ ] Write a failing component test proving the start overlay, gameplay landmark, and controls copy render.
- [ ] Implement the minimal page shell and rerun to green.
- [ ] Add a failing test proving a completed snapshot shows the correct result title, counts, repair percentage, and restart button.
- [ ] Implement HUD/result rendering and rerun.
- [ ] Add responsive 16:9 layout, keyboard focus styling, reduced-motion handling, and unobtrusive debug timing output.
- [ ] Run all tests and type checking.

### Task 8: Verify the real prototype

**Files:**
- Create: `docs/qa/rhythm-gameplay-browser-qa.md`

**Interfaces:**
- Consumes: the built prototype at `/gameplay.html`.
- Produces: reproducible QA evidence and a list of any remaining limitations.

- [ ] Run `npm run test:run` and require a clean pass.
- [ ] Run `npm run typecheck` and require a clean pass.
- [ ] Run `npm run verify:assets` and require a clean pass.
- [ ] Run `npm run build` and require a clean pass containing both entry pages.
- [ ] Start the local Vite server and open `/gameplay.html` in a real browser.
- [ ] Verify start, count-in, normal input, empty press, rush cue, hold press/release, result, restart, resizing, and console cleanliness.
- [ ] Record observed evidence and any browser-specific audio constraint in the QA document.

## Self-Review

- Spec coverage: every approved timing, input, path, event, scoring, result, isolation, and verification requirement maps to Tasks 2-8.
- Placeholder scan: no implementation behavior is deferred; final visual replacement is deliberately outside this prototype spec.
- Type consistency: `RhythmEvent`, `Judgement`, `ResultSummary`, session actions, and controller methods are introduced once and consumed by later tasks under the same names.
