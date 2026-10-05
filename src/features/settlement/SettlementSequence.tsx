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

  const playLoop = () => {
    const loop = loopRef.current;
    if (!loop) return;
    loop.muted = true;
    void loop.play().catch(() => setPhase("fallback"));
  };

  useEffect(() => {
    const intro = introRef.current;
    const loop = loopRef.current;
    if (!intro || !loop) return;

    intro.muted = false;
    loop.muted = true;
    void intro.play().catch(() => setPhase("awaiting-start"));

    return () => {
      intro.pause();
      loop.pause();
    };
  }, []);

  const handleIntroTimeUpdate = () => {
    const time = introRef.current?.currentTime ?? 0;
    if (time >= LOOP_PRIME_TIME && phase !== "crossfading" && phase !== "looping") {
      setPhase("crossfading");
      playLoop();
      return;
    }
    if (time >= UI_REVEAL_TIME && phase === "intro") {
      setPhase("revealing");
    }
  };

  const handleIntroEnded = () => {
    setPhase("looping");
    if (loopRef.current?.paused) playLoop();
  };

  const handleIntroError = () => {
    setPhase("looping");
    playLoop();
  };

  const handleStartIntro = () => {
    const intro = introRef.current;
    if (!intro) return;

    intro.currentTime = 0;
    intro.muted = false;
    void intro.play()
      .then(() => setPhase("intro"))
      .catch(() => setPhase("fallback"));
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
        onEnded={handleIntroEnded}
        onError={handleIntroError}
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
        onError={() => setPhase("fallback")}
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
