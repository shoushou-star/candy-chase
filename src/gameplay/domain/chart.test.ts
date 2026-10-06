import { describe, expect, it } from "vitest";
import { STAGE_CHART, validateChart } from "./chart";

describe("STAGE_CHART", () => {
  it("contains the approved ordered 20/6/4 event mix", () => {
    expect(STAGE_CHART).toHaveLength(30);
    expect(new Set(STAGE_CHART.map((event) => event.id)).size).toBe(30);
    expect(STAGE_CHART.map((event) => event.hitTime)).toEqual(
      [...STAGE_CHART].map((event) => event.hitTime).sort((a, b) => a - b),
    );
    expect(STAGE_CHART.filter((event) => event.type === "normal")).toHaveLength(20);
    expect(STAGE_CHART.filter((event) => event.type === "rush")).toHaveLength(6);
    expect(STAGE_CHART.filter((event) => event.type === "hold")).toHaveLength(4);
  });

  it("uses two-second travel and one-second holds", () => {
    expect(STAGE_CHART.every((event) => event.travelSeconds === 2)).toBe(true);
    expect(
      STAGE_CHART.filter((event) => event.type === "hold").every(
        (event) => event.endTime - event.hitTime === 1,
      ),
    ).toBe(true);
  });

  it("does not require another input while a hold is active", () => {
    const holds = STAGE_CHART.filter((event) => event.type === "hold");
    for (const hold of holds) {
      expect(
        STAGE_CHART.some(
          (event) => event.id !== hold.id && event.hitTime > hold.hitTime && event.hitTime <= hold.endTime,
        ),
      ).toBe(false);
    }
  });

  it("passes the chart validator", () => {
    expect(validateChart(STAGE_CHART)).toEqual([]);
  });
});
