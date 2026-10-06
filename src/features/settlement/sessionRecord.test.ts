import { describe, expect, it } from "vitest";
import { isSessionNewRecord } from "./sessionRecord";

describe("isSessionNewRecord", () => {
  it("does not call the first completed score a new record", () => {
    expect(isSessionNewRecord(39560, undefined)).toBe(false);
  });

  it("requires the score to strictly exceed the previous session best", () => {
    expect(isSessionNewRecord(39560, 39560)).toBe(false);
    expect(isSessionNewRecord(39559, 39560)).toBe(false);
    expect(isSessionNewRecord(39561, 39560)).toBe(true);
  });
});
