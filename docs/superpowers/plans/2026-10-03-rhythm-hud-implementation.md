# Rhythm HUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a five-star score-grade HUD, a music-time progress bar, and a complete result event payload to the existing rhythm game.

**Architecture:** Pure calculations live in `game-core.js` and are covered by Node tests. `app.js` reads those calculations and owns DOM state transitions, using its existing AudioContext time source. HTML and CSS provide a pointer-transparent themed HUD without touching gameplay geometry.

**Tech Stack:** Vanilla HTML, CSS, JavaScript, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-10-03-rhythm-hud-design.md`

## Global Constraints

- Do not delete files or introduce dependencies.
- Do not modify judgement windows, note scheduling, candy movement, scoring, or attack rendering.
- Progress is based on the existing AudioContext clock.
- Grade thresholds are exactly 20%, 40%, 60%, 75%, and 90%.
- The existing result page design remains unchanged.

---

### Task 1: Pure HUD and result metrics

**Files:**
- Modify: `rhythm-game/tests/game-core.test.js`
- Modify: `rhythm-game/game-core.js`

**Interfaces:**
- Produces: `calculateMusicProgress(elapsedSeconds, durationSeconds): number`
- Produces: `calculateRoundMetrics(scoreState, totalNotes): { accuracy, repairPercent, starRating }`
- Produces: `buildCompletionDetail(scoreState, totalNotes): CompletionDetail`

- [ ] **Step 1: Write failing boundary and payload tests**
- [ ] **Step 2: Run `node --test tests/game-core.test.js` and confirm missing-function failures**
- [ ] **Step 3: Implement clamped progress, weighted metrics, grade thresholds, and completion payload**
- [ ] **Step 4: Run the test again and confirm it passes**

### Task 2: HUD markup and visual treatment

**Files:**
- Modify: `rhythm-game/index.html`
- Modify: `rhythm-game/styles.css`

**Interfaces:**
- Consumes: five star elements using `[data-rating-star]`
- Produces: `#rhythmProgressHud`, `#musicProgress`, and `#musicProgressFill`

- [ ] **Step 1: Add semantic, pointer-transparent HUD markup**
- [ ] **Step 2: Add the Figma-derived purple backplate, five stars, cyan progress track, responsive sizing, and reduced-motion behavior**
- [ ] **Step 3: Confirm the HUD does not change the existing overlay or playfield element hierarchy**

### Task 3: Game-state integration and completion contract

**Files:**
- Modify: `rhythm-game/app.js`

**Interfaces:**
- Consumes: Task 1 core functions and Task 2 DOM IDs
- Produces: live music progress, monotonic grade display, reset behavior, and expanded `rhythmgame:complete` detail

- [ ] **Step 1: Register required HUD elements in the existing element map**
- [ ] **Step 2: Reset and show the HUD during countdown with 0% time progress**
- [ ] **Step 3: Update time progress from `audioContext.currentTime - songStartTime` only while playing**
- [ ] **Step 4: Update grade stars after score changes using the actual note count**
- [ ] **Step 5: Dispatch `buildCompletionDetail(...)` exactly once from `endGame()` and preserve the current result UI**

### Task 4: Verification

**Files:**
- Verify: `rhythm-game/game-core.js`
- Verify: `rhythm-game/app.js`
- Verify: `rhythm-game/index.html`
- Verify: `rhythm-game/styles.css`

- [ ] **Step 1: Run Node syntax checks for all changed JavaScript**
- [ ] **Step 2: Run all existing rhythm-game Node tests**
- [ ] **Step 3: Play through start, countdown, active play, result, and restart in the browser**
- [ ] **Step 4: Check 16:9 wide and narrow viewports, console errors, input behavior, and result event fields**

