import { describe, expect, it } from "vitest";
import { judgeError, worseJudgement } from "./judgement";

describe("judgeError", () => {
  it.each([
    [0, "perfect"],
    [0.09, "perfect"],
    [-0.09, "perfect"],
    [0.090001, "good"],
    [-0.090001, "good"],
    [0.18, "good"],
    [-0.18, "good"],
    [0.180001, "miss"],
    [-0.180001, "miss"],
  ] as const)("classifies %s seconds as %s", (errorSeconds, expected) => {
    expect(judgeError(errorSeconds)).toBe(expected);
  });
});

describe("worseJudgement", () => {
  it("keeps the worse of the hold press and release", () => {
    expect(worseJudgement("perfect", "good")).toBe("good");
    expect(worseJudgement("good", "miss")).toBe("miss");
    expect(worseJudgement("perfect", "perfect")).toBe("perfect");
  });
});
