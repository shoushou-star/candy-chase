# Rhythm HUD Design Specification

## Goal

Add the approved Figma-inspired HUD to the existing 60-second rhythm game without changing note timing, judgement windows, scoring, candy movement, or attack effects.

## Visual contract

- The HUD sits at the bottom center of the 16:9 stage and does not receive pointer input.
- Five stars on the left show the score grade. They light permanently at repair thresholds 20%, 40%, 60%, 75%, and 90%.
- The cyan progress bar on the right shows music time only. It is 0% during the countdown, advances from the Web Audio game clock while playing, reaches 100% at the end, and resets on restart.
- The start and result overlays remain visually unchanged. The HUD is visible only for countdown and active play.
- Motion is restrained and respects `prefers-reduced-motion`.

## Data contract

`repairPercent` is the current score divided by the actual schedule's theoretical maximum score. `accuracy` is weighted by Perfect = 1, Good = 0.5, Miss = 0. Both values are clamped to 0–100 and rounded to two decimals.

The existing `rhythmgame:complete` event remains backward compatible and adds:

- `perfect`
- `good`
- `miss`
- `accuracy`
- `repairPercent`

It continues to expose `finalScore` and `maxCombo`.

## Safety constraints

- Do not add dependencies or asset files.
- Do not delete files.
- Keep `app.js` as the sole owner of gameplay input and completion dispatch.
- Derive the theoretical maximum from the generated schedule length; never hardcode 116 notes.
- Use the existing AudioContext clock for progress so note travel and progress cannot drift.

