import { describe, expect, it } from "vitest";
import { summarizeResults } from "./score";

describe("summarizeResults", () => {
  it("weights Perfect as 100 percent, Good as 60 percent, and Miss as zero", () => {
    const summary = summarizeResults(["perfect", "good", "miss", "perfect"], 3);

    expect(summary).toEqual({
      perfect: 2,
      good: 1,
      miss: 1,
      maxCombo: 3,
      repairPercent: 65,
      title: "庆典重启",
    });
  });

  it.each([
    [["miss", "miss"] as const, "星光待续"],
    [["good", "good"] as const, "庆典重启"],
    [["perfect", "good"] as const, "全场点亮"],
  ])("assigns the expected result title for %j", (results, expectedTitle) => {
    expect(summarizeResults([...results], 0).title).toBe(expectedTitle);
  });
});
