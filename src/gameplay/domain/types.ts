export type Judgement = "perfect" | "good" | "miss";

export interface ResultSummary {
  perfect: number;
  good: number;
  miss: number;
  maxCombo: number;
  repairPercent: number;
  title: "星光待续" | "庆典重启" | "全场点亮";
}

interface BaseRhythmEvent {
  id: string;
  hitTime: number;
  travelSeconds: number;
}

export interface TapRhythmEvent extends BaseRhythmEvent {
  type: "normal" | "rush";
}

export interface HoldRhythmEvent extends BaseRhythmEvent {
  type: "hold";
  endTime: number;
}

export type RhythmEvent = TapRhythmEvent | HoldRhythmEvent;
