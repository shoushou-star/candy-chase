# Rhythm Game BGM and Three-Note-Type Design

**Date:** 2026-10-05  
**Status:** Approved design; implementation has not started  
**Project:** `D:\05 ai作品集\04\游戏操作文件\rhythm-game`

## 1. Objective

Replace the current fixed 60-second metronome-driven round with a deterministic chart authored for the supplied BGM. The game will support three candy types while preserving the existing single-track presentation, judgement target, character, attack effects, HUD, and result overlay.

The intended experience is a standard-difficulty, single-input rhythm game in which candy motion communicates the required action before the candy reaches the judgement star.

## 2. Audio Source and Timing Facts

Source audio supplied by the user:

`C:\Users\25283\Documents\Codex\2026-10-05\bang-w\outputs\20261005_003537_纯音频.m4a`

Measured properties:

- Container/codec: M4A/AAC
- Duration: approximately 69.218 seconds
- Sample rate: 44.1 kHz stereo
- Detected tempo: approximately 120.19 BPM; confidence high
- Practical chart grid: approximately 120 BPM, or one beat every 0.5 seconds
- Strong transition into the main section: approximately 4.481 seconds
- First approved playable judgement: approximately 4.981 seconds
- Latest intended judgement: no later than approximately 66.88 seconds
- Remaining approximately 2.3 seconds: music-only outro before settlement

The complete 69.218-second track will be used. It will not be cropped to 60 seconds.

## 3. Approved Scope

### Must preserve

- Existing background, penguin character, track geometry, judgement star, attack visual style, top HUD, progress HUD, pause UI, and current result overlay.
- Existing Perfect/Good/Miss timing windows unless playtesting demonstrates a concrete fairness problem.
- Keyboard, mouse, and touch input support.
- The completed `rhythmgame:complete` event contract.

### This feature adds

- Real BGM playback from a project-relative asset path.
- A fixed chart containing explicit note times and types.
- Pink normal candies.
- Yellow acceleration candies.
- Blue hold candies with a glowing tail.
- Press and release input states.
- Weighted maximum-score calculation based on note type.

### Explicitly excluded from the first version

- Multiple lanes.
- Simultaneous required inputs.
- Required tap notes during an active hold judgement.
- One-beat or four-beat holds.
- Random or procedurally generated charts.
- Runtime beat detection.
- Difficulty selection.
- Fake-out speed changes, reverse motion, or deceleration notes.
- Redesigning the current result page.
- Replacing the character or background assets.

## 4. Audio and Game Clock

The BGM playback position is the authoritative game clock.

1. The BGM is copied into a project asset directory such as `assets/audio/game-bgm.m4a` and referenced by a relative URL.
2. The Start control remains unavailable until audio metadata is loaded successfully.
3. The existing three-second countdown runs before audio playback.
4. When the countdown completes, the BGM begins at time zero.
5. Note motion, judgement timing, progress display, pause, resume, and round completion all read from the audio playback position.
6. The round ends from the audio `ended` state, not from a hard-coded 60-second timer.
7. Any unresolved chart entries are resolved as misses before the completion event is dispatched.

Using the audio clock prevents independent JavaScript timers from drifting away from the music.

## 5. Fixed Chart Contract

The first chart contains exactly 80 candy events:

- 48 normal candies
- 20 acceleration candies
- 12 hold candies

Each entry has an explicit judgement time. A representative schema is:

```js
{
  id: 1,
  type: 'normal', // 'normal' | 'speed' | 'hold'
  hitTime: 4.981,
  holdEndTime: null,
  accelerationAt: null
}
```

A hold entry is:

```js
{
  id: 32,
  type: 'hold',
  hitTime: 28.941,
  holdEndTime: 29.939,
  accelerationAt: null
}
```

Rules:

- `id` is unique.
- Entries are ordered by `hitTime`.
- The first judgement is approximately 4.981 seconds.
- The final judgement is no later than approximately 66.88 seconds.
- A hold lasts exactly two musical beats, encoded as explicit times, normally about 0.998–1.000 seconds.
- No other note may require input while a hold is active.
- A future note may be visible travelling during a hold only if its judgement window begins after the hold ends. This preserves readable flow without requiring simultaneous input.
- The chart, rather than a random generator, determines candy type and timing.

## 6. Candy Identity

Candy color alone identifies the required interaction:

- Pink: normal tap
- Yellow: acceleration tap
- Blue: hold and release

Color assignment is no longer random. Motion and tails reinforce the action but do not redefine the type.

## 7. Motion Design

### Normal candy

- Appears approximately two seconds before `hitTime`.
- Travels along the existing approved SVG path at a consistent readable speed.
- Is judged on press when it reaches the judgement star.

State flow:

```text
queued -> travelling -> hit | missed
```

### Acceleration candy

- Uses the same total travel duration and final `hitTime` as a normal candy.
- During the first 65% of travel time, covers approximately 35% of path length.
- At the acceleration point, emits one brief flash.
- During the final 35% of travel time, covers approximately 65% of path length.
- The player presses when the candy reaches the target, not when the acceleration flash occurs.

State flow:

```text
queued -> slow-travel -> acceleration-flash -> fast-travel -> hit | missed
```

### Hold candy

- A blue candy head is followed by a glowing tail aligned with the approved track path.
- The head reaches the judgement star at `hitTime`.
- A valid press locks the head near the target while the tail is absorbed into the star.
- The player releases at `holdEndTime`.
- The penguin uses a sustained casting state during the hold instead of repeatedly firing tap attacks.

State flow:

```text
queued -> travelling -> waiting-for-press -> holding
       -> waiting-for-release -> completed | missed
```

## 8. Input Model

- Keyboard press: `keydown` for Space.
- Keyboard release: `keyup` for Space.
- Pointer/touch press: `pointerdown`.
- Pointer/touch release: `pointerup`.
- Keyboard repeat events are ignored.
- One physical action cannot resolve the same note twice.
- Normal and acceleration candies consume only the press event.
- Hold candies consume one press and one release.
- Additional press events during an active hold do not add score or combo.
- Empty presses may play the existing weak attack but never alter score or combo.
- Pointer cancellation or loss of page focus triggers a safe pause rather than leaving input permanently latched.

## 9. Judgement and Scoring

Judgement windows for press and release:

- Perfect: within approximately ±100 ms
- Good: outside Perfect but within approximately ±200 ms
- Miss: outside Good

### Normal and acceleration score

- Perfect: 100
- Good: 50
- Miss: 0 and combo reset

Acceleration does not receive a narrower judgement window or an extra score multiplier.

### Hold score

The start and end are independently worth up to 100 points.

| Start | End | Score | Result counter |
|---|---|---:|---|
| Perfect | Perfect | 200 | Perfect |
| Perfect | Good | 150 | Good |
| Good | Perfect | 150 | Good |
| Good | Good | 100 | Good |
| Perfect | Miss | 100 | Miss |
| Good | Miss | 50 | Miss |
| Miss | Not entered | 0 | Miss |

Any missed endpoint makes the overall hold a Miss and resets combo, but points already earned by a valid start remain. A successfully completed hold increases combo once, not once per endpoint.

The Perfect, Good, and Miss counters count candy events. Their sum therefore equals the 80 chart entries, not the number of physical input transitions.

## 10. Maximum Score, Accuracy, Repair, and Stars

Maximum score is derived from chart content:

```text
normal count × 100
+ acceleration count × 100
+ hold count × 200
```

For the approved 48/20/12 distribution, maximum score is 9,200.

- `accuracy`: earned points divided by the maximum points of already resolved chart events.
- `repairPercent`: earned points divided by the entire chart maximum score.
- At round completion, all events are resolved, so the two values will normally match.
- Existing repair-to-star thresholds remain unchanged unless separately redesigned.

The completion event continues to provide:

```js
{
  finalScore,
  maxCombo,
  perfect,
  good,
  miss,
  accuracy,
  repairPercent,
  starRating,
  totalNotes,
  judgedNotes
}
```

The current result overlay is not redesigned in this phase. A future result page can directly bind Score, Perfect, Good, Miss, Max Combo, and five-star state from this payload.

## 11. Attack Feedback

- Normal and acceleration presses fire one existing magic attack.
- A hold press begins a sustained energy connection from the guitar to the judgement target.
- A successful hold release produces one finish flash.
- A hold does not create repeated tap attacks on every animation frame.
- No attack effect may appear from input while the game is idle, paused, or showing results.

## 12. Pause, Focus Loss, and Recovery

- Pause freezes BGM playback, note motion, judgement timing, and progress together.
- Page visibility loss or window focus loss automatically pauses the game.
- If pause occurs during a hold, the valid start judgement and remaining hold duration are preserved.
- Release events during pause do not judge the hold.
- Resume presents a short re-entry cue and allows the player to re-engage the held input without repeating or scoring the start judgement.
- Restart resets audio position, chart index, note states, active hold state, score, combo, progress, character state, and transient effects.

## 13. Failure Handling

- If audio metadata or playback cannot load, the round does not start.
- The UI shows an explicit music-load failure and retry action.
- If playback ends unexpectedly, unresolved notes are resolved consistently before one completion event is sent.
- Completion must be idempotent: audio ending, animation frames, or repeated events cannot open settlement more than once.
- Input cancellation must clear any latched physical input state.

## 14. Proposed Component Boundaries

Implementation should keep responsibilities separate:

- **Chart data:** immutable event definitions and chart metadata.
- **Chart validation:** ordering, type, duration, overlap, color mapping, and maximum-score checks.
- **Game core:** pure judgement, hold combination, score, combo, accuracy, repair, and result payload calculations.
- **Audio clock:** load, play, pause, resume, current time, duration, and end notification.
- **Note renderer:** maps chart state and audio time to position, tail geometry, and visual state.
- **Input controller:** normalizes keyboard and pointer press/release events.
- **Game coordinator:** advances state, resolves misses, drives HUD, character feedback, and completion.

These boundaries keep chart authoring and result UI independent from the low-level rendering implementation.

## 15. Verification and Acceptance Criteria

The implementation is acceptable only when all of the following are actually verified:

1. The project-relative BGM plays for approximately 69.218 seconds without being truncated at 60 seconds.
2. The first note judgement occurs at approximately 4.981 seconds.
3. The chart contains exactly 80 entries with the approved 48/20/12 distribution.
4. Pink, yellow, and blue always map to normal, acceleration, and hold respectively.
5. Acceleration motion changes visibly but does not change `hitTime`.
6. Hold press and release independently produce Perfect, Good, or Miss results.
7. No other note requires input while a hold is active.
8. The chart maximum score is calculated as 9,200 from note weights rather than hard-coded independently.
9. Perfect + Good + Miss equals total chart entries at completion.
10. Pause, resume, focus loss, and restart do not desynchronize audio and visuals.
11. Audio completion dispatches `rhythmgame:complete` exactly once with the full contract.
12. Keyboard, mouse, and touch each complete at least one normal, acceleration, and hold interaction.
13. The approved track geometry remains unchanged at multiple 16:9 viewport sizes.
14. Hold tails remain aligned to the track and do not cover the judgement art or HUD.
15. Browser console and page-error logs contain no new errors.
16. Existing unit tests remain green and new pure-state tests cover each note type and boundary.

## 16. Implementation Sequence

After this specification is reviewed and approved, implementation planning should proceed in this order:

1. Audio asset packaging and audio-clock abstraction.
2. Fixed chart schema, validation, and initial 80-entry chart.
3. Pure core scoring and state-machine tests.
4. Press/release input normalization.
5. Normal and acceleration motion.
6. Hold head, tail, and sustained feedback.
7. Pause/focus/restart integration.
8. Completion metrics and browser playtesting.

