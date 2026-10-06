import type { Judgement } from "./types";

export const PERFECT_WINDOW_SECONDS = 0.09;
export const GOOD_WINDOW_SECONDS = 0.18;

export function judgeError(errorSeconds: number): Judgement {
  const absoluteError = Math.abs(errorSeconds);
  if (absoluteError <= PERFECT_WINDOW_SECONDS) return "perfect";
  if (absoluteError <= GOOD_WINDOW_SECONDS) return "good";
  return "miss";
}

export function worseJudgement(first: Judgement, second: Judgement): Judgement {
  const rank: Record<Judgement, number> = { perfect: 0, good: 1, miss: 2 };
  return rank[first] >= rank[second] ? first : second;
}
