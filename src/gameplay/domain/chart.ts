import type { HoldRhythmEvent, RhythmEvent } from "./types";

export const BPM = 120;
export const BEAT_SECONDS = 60 / BPM;
export const STAGE_DURATION_SECONDS = 45;
export const TRAVEL_SECONDS = BEAT_SECONDS * 4;
export const HOLD_SECONDS = BEAT_SECONDS * 2;

function tap(id: string, type: "normal" | "rush", hitTime: number): RhythmEvent {
  return { id, type, hitTime, travelSeconds: TRAVEL_SECONDS };
}

function hold(id: string, hitTime: number): HoldRhythmEvent {
  return {
    id,
    type: "hold",
    hitTime,
    endTime: hitTime + HOLD_SECONDS,
    travelSeconds: TRAVEL_SECONDS,
  };
}

export const STAGE_CHART: RhythmEvent[] = [
  tap("normal-01", "normal", 4),
  tap("normal-02", "normal", 5),
  tap("normal-03", "normal", 6),
  tap("normal-04", "normal", 7),
  tap("normal-05", "normal", 8),
  tap("normal-06", "normal", 9),
  tap("normal-07", "normal", 10),
  tap("normal-08", "normal", 11),
  tap("normal-09", "normal", 12),
  tap("normal-10", "normal", 13),
  tap("combo-01", "normal", 14),
  tap("combo-02", "normal", 14.5),
  tap("combo-03", "normal", 15.5),
  tap("combo-04", "normal", 16),
  tap("combo-05", "normal", 17),
  tap("combo-06", "normal", 17.5),
  tap("rush-01", "rush", 23),
  tap("rush-02", "rush", 24.5),
  tap("bridge-01", "normal", 25.25),
  tap("rush-03", "rush", 26),
  tap("rush-04", "rush", 27.5),
  tap("bridge-02", "normal", 29),
  hold("hold-01", 32),
  hold("hold-02", 34),
  hold("hold-03", 36),
  tap("bridge-03", "normal", 38),
  tap("rush-05", "rush", 39.5),
  tap("final-normal", "normal", 41),
  hold("hold-04", 42),
  tap("rush-06", "rush", 44.5),
];

export function validateChart(events: RhythmEvent[]): string[] {
  const errors: string[] = [];
  if (events.length !== 30) errors.push("chart must contain 30 events");
  if (new Set(events.map((event) => event.id)).size !== events.length) errors.push("event ids must be unique");

  events.forEach((event, index) => {
    if (event.travelSeconds !== TRAVEL_SECONDS) errors.push(`${event.id} has invalid travel time`);
    if (index > 0 && events[index - 1].hitTime > event.hitTime) errors.push("events must be ordered");
    if (event.hitTime - event.travelSeconds < 2) errors.push(`${event.id} spawns before the count-in ends`);
    if (event.type === "hold" && event.endTime - event.hitTime !== HOLD_SECONDS) {
      errors.push(`${event.id} has invalid hold duration`);
    }
  });

  const counts = {
    normal: events.filter((event) => event.type === "normal").length,
    rush: events.filter((event) => event.type === "rush").length,
    hold: events.filter((event) => event.type === "hold").length,
  };
  if (counts.normal !== 20 || counts.rush !== 6 || counts.hold !== 4) errors.push("event type mix must be 20/6/4");

  for (const activeHold of events.filter((event): event is HoldRhythmEvent => event.type === "hold")) {
    if (events.some((event) => event.id !== activeHold.id && event.hitTime > activeHold.hitTime && event.hitTime <= activeHold.endTime)) {
      errors.push(`${activeHold.id} overlaps another required input`);
    }
  }

  return errors;
}
