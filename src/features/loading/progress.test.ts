import { describe, expect, it } from "vitest";
import { progressFromElapsed } from "./progress";

describe("progressFromElapsed", () => {
  it.each([
    { elapsedMs: -250, expected: 0 },
    { elapsedMs: 0, expected: 0 },
    { elapsedMs: 1000, expected: 25 },
    { elapsedMs: 2000, expected: 50 },
    { elapsedMs: 3000, expected: 75 },
    { elapsedMs: 4000, expected: 100 },
    { elapsedMs: 9000, expected: 100 },
  ])("maps $elapsedMs ms to $expected percent", ({ elapsedMs, expected }) => {
    expect(progressFromElapsed(elapsedMs, 4000)).toBe(expected);
  });
});
