import { useEffect, useRef, useState } from "react";
import introVideoUrl from "../../assets/settlement/settlement-intro.mp4";
import loopVideoUrl from "../../assets/settlement/settlement-loop.mp4";
import { SettlementPage, type SettlementPageProps } from "./SettlementPage";

const UI_REVEAL_TIME = 2.75;
const LOOP_PRIME_TIME = 3.9;

type SequencePhase =
  | "intro"
  | "awaiting-start"
  | "revealing"
  | "crossfading"
  | "looping"
  | "fallback";

export type SettlementSequenceProps = Omit<
  SettlementPageProps,
  "mediaLayer" | "isUiVisible" | "actionsEnabled"
>;

export function SettlementSequence(props: SettlementSequenceProps) {
  const introRef = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<SequencePhase>("intro");
  const phaseRef = useRef<SequencePhase>("intro");
  const lifecycle = useRef({ active: false, generation: 0, introAttempt: 0, loopAttempt: 0 });

  const moveTo = (next: SequencePhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const stop = (media: HTMLMediaElement) => {
    media.pause();
    media.currentTime = 0;
  };

  const handleLoopError = () => {
    if (!lifecycle.current.active) return;
    lifecycle.current.introAttempt++;
    lifecycle.current.loopAttempt++;
    if (introRef.current) stop(introRef.current);
    if (loopRef.current) stop(loopRef.current);
    moveTo("fallback");
  };

  const playLoop = () => {
    const loop = loopRef.current;
    if (!loop) return;
    const owner = lifecycle.current;
    const generation = owner.generation;
    const attempt = ++owner.loopAttempt;
    loop.muted = true;
    void loop.play().then(() => {
      // An earlier StrictMode effect shares the same DOM element. It must not
      // stop the new effect's playback; detached or abandoned media must stop.
      if (!owner.active || loopRef.current !== loop || phaseRef.current === "fallback") stop(loop);
    }).catch(() => {
      if (owner.active && owner.generation === generation && owner.loopAttempt === attempt) handleLoopError();
    });
  };

  const handleIntroFinished = () => {
    if (!lifecycle.current.active || phaseRef.current === "looping" || phaseRef.current === "fallback") return;
    lifecycle.current.introAttempt++;
    introRef.current?.pause();
    moveTo("looping");
    if (loopRef.current?.paused) playLoop();
  };

  const playIntro = () => {
    const intro = introRef.current;
    if (!intro) return;
    const owner = lifecycle.current;
    const generation = owner.generation;
    const attempt = ++owner.introAttempt;
    intro.muted = false;
    void intro.play().then(() => {
      if (!owner.active || introRef.current !== intro || phaseRef.current === "looping" || phaseRef.current === "fallback") stop(intro);
    }).catch((error: unknown) => {
      if (!owner.active || owner.generation !== generation || owner.introAttempt !== attempt) return;
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        if (phaseRef.current === "intro" || phaseRef.current === "awaiting-start") moveTo("awaiting-start");
      } else {
        handleIntroFinished();
      }
    });
  };

  useEffect(() => {
    const intro = introRef.current;
    const loop = loopRef.current;
    if (!intro || !loop) return;

    const owner = lifecycle.current;
    owner.active = true;
    owner.generation++;
    loop.muted = true;
    playIntro();

    return () => {
      owner.active = false;
      owner.generation++;
      owner.introAttempt++;
      owner.loopAttempt++;
      stop(intro);
      stop(loop);
    };
  }, []);

  const handleIntroTimeUpdate = () => {
    const time = introRef.current?.currentTime ?? 0;
    const current = phaseRef.current;
    if (!lifecycle.current.active || current === "looping" || current === "fallback" || current === "awaiting-start") return;
    if (time >= LOOP_PRIME_TIME && current !== "crossfading") {
      moveTo("crossfading");
      playLoop();
      return;
    }
    if (time >= UI_REVEAL_TIME && current === "intro") {
      moveTo("revealing");
    }
  };

  const handleStartIntro = () => {
    const intro = introRef.current;
    if (!intro || !lifecycle.current.active || phaseRef.current !== "awaiting-start") return;

    intro.currentTime = 0;
    moveTo("intro");
    playIntro();
  };

  const mediaClassName = [
    "settlement-media",
    phase === "crossfading" ? "settlement-media--crossfading" : "",
    phase === "looping" ? "settlement-media--looping" : "",
    phase === "fallback" ? "settlement-media--fallback" : "",
  ].filter(Boolean).join(" ");

  const mediaLayer = (
    <div className={mediaClassName} data-testid="settlement-media">
      <video
        aria-label="结算开场动画"
        className="settlement-media__video settlement-media__intro"
        onEnded={handleIntroFinished}
        onError={handleIntroFinished}
        onTimeUpdate={handleIntroTimeUpdate}
        playsInline
        preload="auto"
        ref={introRef}
        src={introVideoUrl}
      />
      <video
        aria-label="结算循环动画"
        className="settlement-media__video settlement-media__loop"
        loop
        muted
        onError={handleLoopError}
        playsInline
        preload="auto"
        ref={loopRef}
        src={loopVideoUrl}
      />
      {phase === "awaiting-start" ? (
        <button
          aria-label="播放结算动画"
          className="settlement-media__start"
          onClick={handleStartIntro}
          type="button"
        >
          点击播放结算动画
        </button>
      ) : null}
    </div>
  );

  return (
    <SettlementPage
      {...props}
      actionsEnabled={phase === "looping" || phase === "fallback"}
      isUiVisible={phase !== "intro" && phase !== "awaiting-start"}
      mediaLayer={mediaLayer}
    />
  );
}
