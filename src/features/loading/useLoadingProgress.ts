import { useEffect, useState } from "react";
import { LOADING_DURATION_MS, progressFromElapsed } from "./progress";

export function useLoadingProgress(
  active = true,
  durationMs = LOADING_DURATION_MS,
): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) return;

    const startedAt = performance.now();
    let animationFrameId = 0;

    const update = (timestamp: number) => {
      const nextProgress = progressFromElapsed(timestamp - startedAt, durationMs);
      setProgress(nextProgress);

      if (nextProgress < 100) {
        animationFrameId = requestAnimationFrame(update);
      }
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [active, durationMs]);

  return progress;
}
