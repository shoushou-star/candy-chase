# Rhythm Gameplay Browser QA

**Date:** 2026-10-01  
**Entry:** `http://127.0.0.1:4174/gameplay.html`  
**Browser:** Microsoft Edge via Playwright Core, headless  
**Result:** Passed

## Automated playthrough

- Loaded the standalone gameplay entry and found the first actionable start control.
- Confirmed the Phaser canvas uses the intended 1920×1080 internal resolution.
- Started Web Audio from a real button gesture.
- Observed the four-beat count-in and live DOM HUD.
- Hit the first normal candy, first rush candy, and first hold candy through keyboard input.
- Issued an empty press between events.
- Held Space across the one-second hold interval and released at the tail.
- Completed the full 45-second chart and reached the result overlay.
- Restarted from results and observed the song clock reset below one second.

The scripted sparse playthrough produced three Perfect judgements and 27 Miss judgements. The low score is intentional: the automation exercises representative event types rather than autoplaying the complete chart.

## Responsive checks

| Viewport | Stage bounds | Result |
| --- | --- | --- |
| 1280×720 | 1280×720 at (0, 0) | Fits exactly |
| 1400×900 | 1400×787.5 at (0, 56.25) | Correct centered 16:9 letterbox |

## Visual review

- Piko's left-side silhouette, guitar beam, foreground hit point, depth markers, and upper-right spawn point form one readable action line.
- The lane is implied rather than rendered as a continuous traditional rhythm-game track.
- The count-in is prominent without permanently occupying the playfield.
- Repair, time, combo, feedback, and debug text stay at the edges or appear transiently.
- The cyan hold strip clearly links its head and tail along the perspective direction.
- The result overlay remains readable while retaining the greybox scene underneath.

## Runtime diagnostics

- Console errors: 0
- Uncaught page errors: 0
- Failed requests: 0
- HTTP 4xx/5xx responses: 0
- Restart song time observed: 0.181 seconds

Machine-readable evidence: `docs/qa/rhythm-gameplay-browser-qa.json`

Screenshots:

- `docs/qa/rhythm-gameplay-start.png`
- `docs/qa/rhythm-gameplay-countdown.png`
- `docs/qa/rhythm-gameplay-hold.png`
- `docs/qa/rhythm-gameplay-result.png`

## Remaining playtest limitation

Headless automation verifies timing paths and rendering states but cannot establish subjective musical feel or real-device audio latency. The ±90 ms/±180 ms windows and any global input offset still require a human playtest on the intended desktop and mobile hardware before final music is authored.
