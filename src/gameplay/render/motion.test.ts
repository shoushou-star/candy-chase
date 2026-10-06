import { describe, expect, it } from "vitest";
import type { RhythmEvent } from "../domain/types";
import { eventProgress, perspectivePoint } from "./motion";

const normal: RhythmEvent = { id: "normal", type: "normal", hitTime: 4, travelSeconds: 2 };
const rush: RhythmEvent = { id: "rush", type: "rush", hitTime: 4, travelSeconds: 2 };

describe("eventProgress", () => {
  it("moves normal candy evenly from spawn to hit time", () => {
    expect(eventProgress(normal, 2)).toBe(0);
    expect(eventProgress(normal, 3)).toBe(0.5);
    expect(eventProgress(normal, 4)).toBe(1);
  });

  it("keeps rush candy slow for two beats then accelerates to the same hit time", () => {
    expect(eventProgress(rush, 2)).toBe(0);
    expect(eventProgress(rush, 3)).toBe(0.25);
    expect(eventProgress(rush, 3.5)).toBeCloseTo(0.4375);
    expect(eventProgress(rush, 4)).toBe(1);
  });
});

describe("perspectivePoint", () => {
  it("interpolates position and grows candy from 35 to 100 percent", () => {
    expect(perspectivePoint(0)).toEqual({ x: 1382, y: 324, scale: 0.35 });
    expect(perspectivePoint(1)).toEqual({ x: 806, y: 778, scale: 1 });
  });
});
