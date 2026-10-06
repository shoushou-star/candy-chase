import type { RhythmEvent } from "../domain/types";

export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;
export const SPAWN_POINT = { x: GAME_WIDTH * 0.72, y: GAME_HEIGHT * 0.3 };
export const HIT_POINT = { x: GAME_WIDTH * 0.42, y: GAME_HEIGHT * 0.72 };

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function eventProgress(event: RhythmEvent, songTime: number): number {
  const spawnTime = event.hitTime - event.travelSeconds;
  const elapsed = songTime - spawnTime;
  const normalized = clamp(elapsed / event.travelSeconds);
  if (event.type !== "rush") return normalized;

  if (normalized <= 0.5) return normalized * 0.5;
  const acceleratedHalf = (normalized - 0.5) / 0.5;
  return 0.25 + 0.75 * acceleratedHalf * acceleratedHalf;
}

export function perspectivePoint(progress: number): { x: number; y: number; scale: number } {
  const normalized = clamp(progress);
  return {
    x: Math.round(SPAWN_POINT.x + (HIT_POINT.x - SPAWN_POINT.x) * normalized),
    y: Math.round(SPAWN_POINT.y + (HIT_POINT.y - SPAWN_POINT.y) * normalized),
    scale: 0.35 + 0.65 * normalized,
  };
}
