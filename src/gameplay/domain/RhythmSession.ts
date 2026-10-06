import { GOOD_WINDOW_SECONDS, judgeError, worseJudgement } from "./judgement";
import { summarizeResults } from "./score";
import type { HoldRhythmEvent, Judgement, ResultSummary, RhythmEvent } from "./types";

export type InputOutcome =
  | { kind: "judged"; eventId: string; judgement: Judgement; errorSeconds: number }
  | { kind: "hold-start"; eventId: string; judgement: Judgement; errorSeconds: number }
  | { kind: "empty" }
  | { kind: "ignored" };

export interface SessionSnapshot {
  status: "ready" | "playing" | "complete";
  songTime: number;
  combo: number;
  maxCombo: number;
  perfect: number;
  good: number;
  miss: number;
  repairPercent: number;
  activeHoldId: string | null;
  resolvedEventIds: string[];
  lastOutcome: InputOutcome | null;
  result: ResultSummary | null;
}

interface ActiveHold {
  event: HoldRhythmEvent;
  pressJudgement: Judgement;
}

const RESULT_WEIGHT: Record<Judgement, number> = { perfect: 1, good: 0.6, miss: 0 };

export class RhythmSession {
  private readonly events: RhythmEvent[];
  private readonly duration: number;
  private readonly results = new Map<string, Judgement>();
  private status: SessionSnapshot["status"] = "ready";
  private songTime = 0;
  private combo = 0;
  private maxCombo = 0;
  private activeHold: ActiveHold | null = null;
  private lastOutcome: InputOutcome | null = null;
  private finalResult: ResultSummary | null = null;

  constructor(events: RhythmEvent[], duration: number) {
    this.events = events.map((event) => ({ ...event }));
    this.duration = duration;
  }

  press(songTime: number): InputOutcome {
    this.advance(songTime);
    if (this.status === "complete" || this.activeHold) return this.remember({ kind: "ignored" });

    const candidate = this.events
      .filter((event) => !this.results.has(event.id))
      .filter((event) => Math.abs(songTime - event.hitTime) <= GOOD_WINDOW_SECONDS)
      .sort((first, second) => Math.abs(songTime - first.hitTime) - Math.abs(songTime - second.hitTime))[0];

    if (!candidate) {
      this.combo = 0;
      return this.remember({ kind: "empty" });
    }

    const errorSeconds = songTime - candidate.hitTime;
    const judgement = judgeError(errorSeconds);
    if (candidate.type === "hold") {
      this.activeHold = { event: candidate, pressJudgement: judgement };
      return this.remember({ kind: "hold-start", eventId: candidate.id, judgement, errorSeconds });
    }

    this.finalize(candidate.id, judgement);
    return this.remember({ kind: "judged", eventId: candidate.id, judgement, errorSeconds });
  }

  release(songTime: number): InputOutcome {
    this.songTime = Math.max(0, songTime);
    if (!this.activeHold || this.status === "complete") return this.remember({ kind: "ignored" });

    const { event, pressJudgement } = this.activeHold;
    const errorSeconds = songTime - event.endTime;
    const releaseJudgement = judgeError(errorSeconds);
    const judgement = worseJudgement(pressJudgement, releaseJudgement);
    this.activeHold = null;
    this.finalize(event.id, judgement);
    return this.remember({ kind: "judged", eventId: event.id, judgement, errorSeconds });
  }

  advance(songTime: number): void {
    this.songTime = Math.max(0, songTime);
    if (this.status === "ready" && this.songTime > 0) this.status = "playing";
    if (this.status === "complete") return;

    for (const event of this.events) {
      const isActiveHold = this.activeHold?.event.id === event.id;
      if (!isActiveHold && !this.results.has(event.id) && this.songTime > event.hitTime + GOOD_WINDOW_SECONDS) {
        this.finalize(event.id, "miss");
      }
    }

    if (this.activeHold && this.songTime > this.activeHold.event.endTime + GOOD_WINDOW_SECONDS) {
      const missedId = this.activeHold.event.id;
      this.activeHold = null;
      this.finalize(missedId, "miss");
    }

    if (this.songTime >= this.duration) {
      for (const event of this.events) {
        if (!this.results.has(event.id)) this.finalize(event.id, "miss");
      }
      this.activeHold = null;
      this.status = "complete";
      this.finalResult = summarizeResults(this.orderedResults(), this.maxCombo);
    }
  }

  restart(): void {
    this.results.clear();
    this.status = "ready";
    this.songTime = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.activeHold = null;
    this.lastOutcome = null;
    this.finalResult = null;
  }

  snapshot(): SessionSnapshot {
    const orderedResults = this.orderedResults();
    const counts = orderedResults.reduce(
      (current, judgement) => ({ ...current, [judgement]: current[judgement] + 1 }),
      { perfect: 0, good: 0, miss: 0 },
    );
    const earnedWeight = orderedResults.reduce((sum, judgement) => sum + RESULT_WEIGHT[judgement], 0);

    return {
      status: this.status,
      songTime: this.songTime,
      combo: this.combo,
      maxCombo: this.maxCombo,
      ...counts,
      repairPercent: Math.round((earnedWeight / this.events.length) * 100),
      activeHoldId: this.activeHold?.event.id ?? null,
      resolvedEventIds: this.events.filter((event) => this.results.has(event.id)).map((event) => event.id),
      lastOutcome: this.lastOutcome,
      result: this.finalResult,
    };
  }

  private orderedResults(): Judgement[] {
    return this.events.flatMap((event) => {
      const judgement = this.results.get(event.id);
      return judgement ? [judgement] : [];
    });
  }

  private finalize(eventId: string, judgement: Judgement): void {
    if (this.results.has(eventId)) return;
    this.results.set(eventId, judgement);
    if (judgement === "miss") {
      this.combo = 0;
    } else {
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
    }
  }

  private remember(outcome: InputOutcome): InputOutcome {
    this.lastOutcome = outcome;
    return outcome;
  }
}
