import type { RhythmGameResult } from "./result";

export interface RhythmGameReadyMessage {
  type: "rhythmgame:ready";
  runId: number;
}

export interface RhythmGameStartMessage {
  type: "rhythmgame:start";
  runId: number;
}

export interface RhythmGameCompleteMessage {
  type: "rhythmgame:complete";
  runId: number;
  result: RhythmGameResult;
}

export type RhythmGameMessage =
  | RhythmGameReadyMessage
  | RhythmGameStartMessage
  | RhythmGameCompleteMessage;

// Validates the current message envelope; consumers still check phase, type and result.
export function isCurrentGameMessage(
  event: MessageEvent<unknown>,
  frameWindow: Window | null,
  origin: string,
  runId: number,
): boolean {
  if (frameWindow === null || event.source !== frameWindow || event.origin !== origin || !Number.isInteger(runId)) {
    return false;
  }
  const data = event.data;
  return typeof data === "object" && data !== null && !Array.isArray(data)
    && "runId" in data && data.runId === runId;
}
