# Candy Chase Rhythm Gameplay Prototype Design

**Date:** 2026-10-01  
**Status:** Approved in conversation  
**Scope:** Standalone rhythm-gameplay prototype only

## Objective

Build a directly playable 45-second greybox of Piko's candy-chase rhythm mechanic. Loading, lobby, hero selection, story, tutorial, and final visual assets are excluded and remain untouched.

## Runtime Flow

`start prompt -> four-beat count-in -> 45-second stage -> result -> restart`

The prototype is served from `gameplay.html` so the existing application entry and completed pages do not need to change.

## Timing and Input

- 120 BPM, 4/4 time; one beat is 0.5 seconds.
- The audio clock is authoritative. Rendering derives positions from current song time and target hit time.
- Keyboard Space, primary mouse button, and single-pointer touch share the same press/release actions.
- Keyboard auto-repeat is ignored.
- Perfect window: absolute error up to 90 ms.
- Good window: absolute error above 90 ms and up to 180 ms.
- Anything later than the Good window is Miss.
- An empty press only breaks the current combo. It does not add a Miss or reduce accuracy.
- There is no mid-song failure.

## Playfield

- 16:9 logical canvas, 1920 by 1080.
- Piko is represented by a greybox performer on the left.
- Candy spawns near the upper-right background and moves along a straight diagonal perspective lane toward a hit point near Piko in the lower-left foreground.
- The complete lane is not drawn. Two to three faint depth markers communicate perspective.
- Candy scale grows from roughly 35% to 100% as it approaches.
- Up to three candy events may be visible at once.
- The hit point stays dim, brightens during the final beat, and bursts on judgement.

## Event Types

### Normal

- Spawns four beats, or 2 seconds, before `hitTime`.
- Travels with stable perspective motion.
- The player presses at `hitTime`.

### Rush

- Spawns four beats before `hitTime`.
- Travels slowly for the first two beats.
- At `hitTime - 1 second`, it flashes and emits an audio cue.
- It then visibly accelerates and still arrives at the fixed `hitTime`.

### Hold

- The head reaches the hit point at `hitTime`; the player presses and holds.
- The tail reaches the hit point exactly two beats, or 1 second, later; the player releases.
- Press and release errors are recorded separately, but the event receives one result equal to the worse judgement.
- Releasing before the early Good boundary, failing to press, or remaining held after the late Good boundary results in Miss.
- No other event may require input while a hold is active.

## Chart

The stage contains 30 events and uses progressive implicit onboarding without tutorial text:

| Time | Content | Events |
| --- | --- | ---: |
| 0-2 s | Four-beat count-in | 0 |
| 2-14 s | Normal foundation | 10 |
| 14-23 s | Normal combinations | 6 |
| 23-32 s | Four rush and two normal | 6 |
| 32-39 s | Three hold and one normal | 4 |
| 39-45 s | Two rush, one hold, one normal | 4 |

## Scoring

- Perfect contributes 1.0.
- Good contributes 0.6.
- Miss contributes 0.
- Repair percentage is the average contribution across all 30 chart events.
- Combo increments for Perfect and Good, and resets on Miss or empty press.
- Combo does not multiply score.
- Results show Perfect, Good, Miss, maximum combo, and repair percentage.
- Result titles: 0-49 `星光待续`, 50-79 `庆典重启`, 80-100 `全场点亮`.

## Architecture

- React owns the standalone page, start overlay, HUD, and result controls.
- Phaser owns canvas rendering and input adaptation.
- Pure TypeScript domain modules own chart data, judgement, scoring, and session state.
- Web Audio supplies the authoritative clock, metronome, rush cue, and judgement tones.
- Stable manifest keys are used even for generated greybox textures so final assets can replace them without changing gameplay rules.

## Verification

- Unit tests cover window boundaries, empty presses, hold aggregation, auto-Miss, score calculation, combo behavior, and chart validity.
- Component tests cover start, HUD reporting, result display, and restart through the public runtime boundary where practical.
- Type checking, asset verification, unit tests, production build, and a real-browser smoke test must pass.
- No existing page, asset, or source file is deleted.
