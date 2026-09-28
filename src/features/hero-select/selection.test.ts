import { describe, expect, it } from "vitest";
import { HEROES } from "./heroes";
import { getAdjacentHeroId, getHeroById } from "./selection";

describe("hero selection", () => {
  it("wraps left from the first hero to the last", () => {
    expect(getAdjacentHeroId("nibby", -1)).toBe("bongo");
  });

  it("wraps right from the last hero to the first", () => {
    expect(getAdjacentHeroId("bongo", 1)).toBe("nibby");
  });

  it("moves right according to the carousel order", () => {
    expect(getAdjacentHeroId("piko", 1)).toBe("mira");
  });

  it("looks up the requested hero", () => {
    expect(getHeroById("nibby").displayName).toBe("NIBBY");
  });

  it("contains exactly five distinct heroes in Figma order", () => {
    expect(HEROES.map((hero) => hero.id)).toEqual([
      "nibby",
      "piko",
      "mira",
      "riff",
      "bongo",
    ]);
    expect(new Set(HEROES.map((hero) => hero.id)).size).toBe(5);
  });

  it("rejects an inconsistent hero lookup", () => {
    expect(() => getHeroById("missing" as never)).toThrow("Unknown hero: missing");
  });
});
