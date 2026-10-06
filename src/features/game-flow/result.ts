import type { SettlementSequenceProps } from "../settlement/SettlementSequence";

export interface RhythmGameResult {
  finalScore: number;
  maxCombo: number;
  perfect: number;
  good: number;
  miss: number;
  accuracy: number;
  repairPercent: number;
  starRating: number;
  totalNotes: number;
  judgedNotes: number;
}

export function parseResult(value: unknown): RhythmGameResult | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const data = value as Record<string, unknown>;
  const result = {
    finalScore: data.finalScore,
    maxCombo: data.maxCombo,
    perfect: data.perfect,
    good: data.good,
    miss: data.miss,
    accuracy: data.accuracy,
    repairPercent: data.repairPercent,
    starRating: data.starRating,
    totalNotes: data.totalNotes,
    judgedNotes: data.judgedNotes,
  } as RhythmGameResult;

  if (Object.values(result).some((field) => typeof field !== "number" || !Number.isFinite(field) || field < 0)) {
    return null;
  }
  if ([result.maxCombo, result.perfect, result.good, result.miss, result.totalNotes, result.judgedNotes, result.starRating]
    .some((count) => !Number.isInteger(count))) return null;
  if (result.starRating > 5 || result.accuracy > 100 || result.repairPercent > 100) return null;
  if (result.perfect + result.good + result.miss !== result.judgedNotes) return null;
  if (result.judgedNotes !== result.totalNotes || result.maxCombo > result.totalNotes) return null;

  return result;
}

export function toSettlementProps(result: RhythmGameResult): Pick<
  SettlementSequenceProps,
  "score" | "stars" | "perfect" | "good" | "miss" | "maxCombo"
> {
  return {
    score: result.finalScore,
    stars: result.starRating,
    perfect: result.perfect,
    good: result.good,
    miss: result.miss,
    maxCombo: result.maxCombo,
  };
}

export function recordResult(result: RhythmGameResult, previousBest: number | null): {
  bestScore: number;
  isNewRecord: boolean;
} {
  return {
    bestScore: previousBest === null ? result.finalScore : Math.max(previousBest, result.finalScore),
    isNewRecord: previousBest !== null && result.finalScore > previousBest,
  };
}
