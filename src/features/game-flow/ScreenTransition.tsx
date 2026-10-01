import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { AppScreen } from "./types";

export type TransitionPhase = "idle" | "covering" | "revealing";

const REDUCED_MOTION_DURATION_MS = 60;

export function useScreenTransition(initialScreen: AppScreen) {
  const [screen, setScreen] = useState<AppScreen>(initialScreen);
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const phaseRef = useRef<TransitionPhase>("idle");
  const screenRef = useRef(initialScreen);
  const timersRef = useRef<number[]>([]);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const requestScreen = useCallback((nextScreen: AppScreen, requestedDurationMs: number) => {
    if (phaseRef.current !== "idle" || nextScreen === screenRef.current) return false;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const effectiveDuration = reduceMotion ? REDUCED_MOTION_DURATION_MS : requestedDurationMs;
    const coveredAt = Math.ceil(effectiveDuration / 2);

    phaseRef.current = "covering";
    setDurationMs(effectiveDuration);
    setPhase("covering");

    timersRef.current = [
      window.setTimeout(() => {
        screenRef.current = nextScreen;
        setScreen(nextScreen);
        phaseRef.current = "revealing";
        setPhase("revealing");
      }, coveredAt),
      window.setTimeout(() => {
        phaseRef.current = "idle";
        setPhase("idle");
        timersRef.current = [];
      }, effectiveDuration),
    ];

    return true;
  }, []);

  return { durationMs, phase, requestScreen, screen };
}

interface ScreenTransitionProps {
  durationMs: number;
  phase: TransitionPhase;
}

export function ScreenTransition({ durationMs, phase }: ScreenTransitionProps) {
  const style = {
    "--screen-transition-half-duration": `${Math.ceil(durationMs / 2)}ms`,
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className="screen-transition"
      data-phase={phase}
      data-testid="screen-transition"
      style={style}
    />
  );
}
