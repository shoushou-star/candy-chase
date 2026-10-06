import { describe, expect, it } from "vitest";
import type { RhythmEvent } from "./types";
import { RhythmSession } from "./RhythmSession";

const normal = (id: string, hitTime: number): RhythmEvent => ({
  id,
  type: "normal",
  hitTime,
  travelSeconds: 2,
});

const rush = (id: string, hitTime: number): RhythmEvent => ({
  id,
  type: "rush",
  hitTime,
  travelSeconds: 2,
});

const hold = (id: string, hitTime: number): RhythmEvent => ({
  id,
  type: "hold",
  hitTime,
  endTime: hitTime + 1,
  travelSeconds: 2,
});

describe("RhythmSession", () => {
  it("judges a normal press inside 90 ms as Perfect and increments combo", () => {
    const session = new RhythmSession([normal("n1", 4)], 10);

    expect(session.press(4.05)).toMatchObject({ kind: "judged", eventId: "n1", judgement: "perfect" });
    expect(session.snapshot()).toMatchObject({ combo: 1, maxCombo: 1, perfect: 1, good: 0, miss: 0 });
  });

  it("breaks combo on an empty press without changing judgement counts", () => {
    const session = new RhythmSession([normal("n1", 4), normal("n2", 6)], 10);
    session.press(4);

    expect(session.press(5)).toEqual({ kind: "empty" });
    expect(session.snapshot()).toMatchObject({ combo: 0, maxCombo: 1, perfect: 1, good: 0, miss: 0 });
  });

  it("judges rush notes against their fixed hit time", () => {
    const session = new RhythmSession([rush("r1", 8)], 10);

    expect(session.press(8.14)).toMatchObject({ kind: "judged", eventId: "r1", judgement: "good" });
  });

  it("uses the worse of hold press and release as one final result", () => {
    const session = new RhythmSession([hold("h1", 10)], 15);

    expect(session.press(10.05)).toMatchObject({ kind: "hold-start", eventId: "h1", judgement: "perfect" });
    expect(session.release(11.15)).toMatchObject({ kind: "judged", eventId: "h1", judgement: "good" });
    expect(session.snapshot()).toMatchObject({ combo: 1, perfect: 0, good: 1, miss: 0, activeHoldId: null });
  });

  it("marks an early hold release as Miss", () => {
    const session = new RhythmSession([hold("h1", 10)], 15);
    session.press(10);

    expect(session.release(10.5)).toMatchObject({ kind: "judged", judgement: "miss" });
    expect(session.snapshot()).toMatchObject({ combo: 0, miss: 1 });
  });

  it("automatically misses a hold that remains pressed after the late window", () => {
    const session = new RhythmSession([hold("h1", 10)], 15);
    session.press(10);

    session.advance(11.181);

    expect(session.snapshot()).toMatchObject({ combo: 0, miss: 1, activeHoldId: null });
  });

  it("automatically misses untouched events after their late window", () => {
    const session = new RhythmSession([normal("n1", 4)], 10);

    session.advance(4.181);

    expect(session.snapshot()).toMatchObject({ miss: 1, combo: 0 });
  });

  it("completes at the stage duration and scores every unresolved event as Miss", () => {
    const session = new RhythmSession([normal("n1", 4), rush("r1", 6)], 10);
    session.press(4);

    session.advance(10);

    expect(session.snapshot()).toMatchObject({ status: "complete", perfect: 1, miss: 1 });
    expect(session.snapshot().result).toMatchObject({ repairPercent: 50, title: "庆典重启" });
  });

  it("restores a clean ready state on restart", () => {
    const session = new RhythmSession([normal("n1", 4)], 10);
    session.press(4);
    session.advance(10);

    session.restart();

    expect(session.snapshot()).toMatchObject({
      status: "ready",
      songTime: 0,
      combo: 0,
      maxCombo: 0,
      perfect: 0,
      good: 0,
      miss: 0,
      activeHoldId: null,
      result: null,
    });
  });
});
