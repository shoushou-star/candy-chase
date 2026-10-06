import type { Judgement, ResultSummary } from "./types";

const WEIGHTS: Record<Judgement, number> = {
  perfect: 1,
  good: 0.6,
  miss: 0,
};

function resultTitle(repairPercent: number): ResultSummary["title"] {
  if (repairPercent >= 80) return "全场点亮";
  if (repairPercent >= 50) return "庆典重启";
  return "星光待续";
}

export function summarizeResults(results: Judgement[], maxCombo: number): ResultSummary {
  const counts = results.reduce(
    (current, result) => ({ ...current, [result]: current[result] + 1 }),
    { perfect: 0, good: 0, miss: 0 },
  );
  const repairPercent = results.length === 0
    ? 0
    : Math.round((results.reduce((total, result) => total + WEIGHTS[result], 0) / results.length) * 100);

  return {
    ...counts,
    maxCombo,
    repairPercent,
    title: resultTitle(repairPercent),
  };
}
