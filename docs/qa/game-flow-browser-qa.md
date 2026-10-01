# Game Flow Browser QA

**Date:** 2026-10-01

**Branch:** `codex/game-flow-integration`

**Preview:** `http://127.0.0.1:4176/`

## Result

PASS — the loading page, lobby, hero selection, explicit confirmation, return flow, PLAY entry, and future-game placeholder operate as one application.

## Automated path

1. Opened the loading page.
2. Clicked the audible-loading entry.
3. Waited for `CLICK TO START` and entered the lobby.
4. Opened `HERO`.
5. Selected RIFF and clicked `SELECT`.
6. Verified the action became `SELECTED`.
7. Returned to the lobby and clicked `PLAY`.
8. Verified the placeholder received RIFF.
9. Returned to the lobby.
10. Opened hero selection, changed the draft to MIRA, and returned without selecting.
11. Re-entered hero selection and verified RIFF remained confirmed.
12. Reloaded and verified the demo restarted at loading with no persisted session selection.

## Responsive stage checks

| Viewport | Rendered stage | Result |
|---|---|---|
| 2048×1152 | 2048×1152 at (0, 0) | PASS |
| 1366×768 | 1365.33×768, centered | PASS |
| 1400×900 | 1400×787.5, vertically centered | PASS |

The fixed 2048×1152 stage scales proportionally without stretching or cropping.

## Runtime checks

- Console errors: 0
- Uncaught page errors: 0
- Non-aborted request failures: 0
- HTTP responses ≥400: 0
- Expected media aborts during page unmount/reload were recorded separately and did not indicate missing resources.

## Evidence

- `docs/qa/game-flow-loading.png`
- `docs/qa/game-flow-lobby.png`
- `docs/qa/game-flow-hero-selected.png`
- `docs/qa/game-flow-placeholder.png`
- `docs/qa/game-flow-browser-qa.json`

## Visual review

- Loading page fills the stage and exposes a clear initial action.
- Lobby controls remain unobstructed and visually unchanged.
- Hero selection retains the approved purple back control and displays `SELECTED` after confirmation.
- The placeholder clearly communicates that gameplay is under development and provides a return-to-lobby action.
- No white transition frame, clipped primary control, or page-scale distortion was observed.
