import { describe, expect, it } from "vitest";
import { parseResult, recordResult, toSettlementProps } from "./result";

const completed = {
  finalScore: 9200,
  maxCombo: 80,
  perfect: 80,
  good: 0,
  miss: 0,
  accuracy: 100,
  repairPercent: 100,
  starRating: 5,
  totalNotes: 80,
  judgedNotes: 80,
};
const fields = Object.keys(completed) as Array<keyof typeof completed>;
const counts = ["maxCombo", "perfect", "good", "miss", "totalNotes", "judgedNotes", "starRating"] as const;

describe("parseResult", () => {
  it("preserves every result field in an independent snapshot", () => {
    const input = { ...completed, extra: "not part of a result" };
    const result = parseResult(input);
    expect(result).toEqual(completed);
    expect(result).not.toBe(input);
    input.finalScore = 0;
    expect(result?.finalScore).toBe(9200);
  });

  it.each([null, undefined, false, 9200, "9200", [], [completed]])("rejects non-object results: %j", (value) => {
    expect(parseResult(value)).toBeNull();
  });

  it.each(fields)("requires the %s field", (field) => {
    const input: Partial<typeof completed> = { ...completed };
    delete input[field];
    expect(parseResult(input)).toBeNull();
  });

  it.each(fields)("rejects invalid numeric values in %s", (field) => {
    for (const value of [Infinity, -Infinity, NaN, -1, "0", null, undefined, false]) {
      expect(parseResult({ ...completed, [field]: value })).toBeNull();
    }
  });

  it.each(counts)("requires integer %s", (field) => {
    expect(parseResult({ ...completed, [field]: 0.5 })).toBeNull();
  });

  it.each(["accuracy", "repairPercent", "starRating"] as const)("rejects out-of-range %s", (field) => {
    expect(parseResult({ ...completed, [field]: field === "starRating" ? 6 : 100.01 })).toBeNull();
  });

  it("rejects unfinished counts and non-finite scores", () => {
    expect(parseResult({ ...completed, judgedNotes: 79 })).toBeNull();
    expect(parseResult({ ...completed, perfect: 79, judgedNotes: 79 })).toBeNull();
    expect(parseResult({ ...completed, finalScore: Infinity })).toBeNull();
  });

  it("rejects mismatched judgment totals and combos beyond the chart", () => {
    expect(parseResult({ ...completed, perfect: 79 })).toBeNull();
    expect(parseResult({ ...completed, good: 1 })).toBeNull();
    expect(parseResult({ ...completed, miss: 1 })).toBeNull();
    expect(parseResult({ ...completed, maxCombo: 81 })).toBeNull();
  });

  it("accepts zero boundaries without substituting demo values", () => {
    expect(parseResult({
      finalScore: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0,
      accuracy: 0, repairPercent: 0, starRating: 0, totalNotes: 0, judgedNotes: 0,
    })).toEqual({
      finalScore: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0,
      accuracy: 0, repairPercent: 0, starRating: 0, totalNotes: 0, judgedNotes: 0,
    });
  });

  it("accepts different charts, partial hold scores and fractional percentages", () => {
    const result = {
      finalScore: 12345.5, maxCombo: 45, perfect: 70, good: 20, miss: 10,
      accuracy: 89.25, repairPercent: 80.5, starRating: 4, totalNotes: 100, judgedNotes: 100,
    };
    expect(parseResult(result)).toEqual(result);
  });
});

describe("toSettlementProps", () => {
  it("maps score and stars while retaining actual judgment statistics", () => {
    expect(toSettlementProps({
      ...completed, finalScore: 7123, starRating: 3, maxCombo: 31,
      perfect: 50, good: 20, miss: 10,
    })).toEqual({ score: 7123, stars: 3, maxCombo: 31, perfect: 50, good: 20, miss: 10 });
  });
});

describe("recordResult", () => {
  it("establishes the first session best without claiming a record", () => {
    expect(recordResult(completed, null)).toEqual({ bestScore: 9200, isNewRecord: false });
  });

  it("compares against the old session best before updating it", () => {
    expect(recordResult(completed, 9000)).toEqual({ bestScore: 9200, isNewRecord: true });
    expect(recordResult(completed, 0)).toEqual({ bestScore: 9200, isNewRecord: true });
  });

  it("keeps the existing best for ties and lower scores", () => {
    expect(recordResult(completed, 9200)).toEqual({ bestScore: 9200, isNewRecord: false });
    expect(recordResult(completed, 10000)).toEqual({ bestScore: 10000, isNewRecord: false });
  });
});
