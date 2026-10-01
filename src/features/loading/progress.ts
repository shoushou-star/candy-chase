export const LOADING_DURATION_MS = 4000;

export function progressFromElapsed(
  elapsedMs: number,
  durationMs = LOADING_DURATION_MS,
): number {
  if (durationMs <= 0) return 100;
  const clampedElapsed = Math.min(Math.max(elapsedMs, 0), durationMs);
  return (clampedElapsed / durationMs) * 100;
}
