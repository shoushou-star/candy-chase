import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { HEROES } from "./heroes";
import type { HeroId } from "./types";

const FRAME_DURATION_SECONDS = 1 / 24;
const LOGO_REVEAL_LEAD_SECONDS = 0.8;

interface HeroVideoBackgroundProps {
  selectedHeroId: HeroId;
  playbackRequestId: number;
  onLogoReveal: () => void;
}

export function HeroVideoBackground({
  selectedHeroId,
  playbackRequestId,
  onLogoReveal,
}: HeroVideoBackgroundProps) {
  const [failedVideos, setFailedVideos] = useState<Set<HeroId>>(() => new Set());
  const activeVideoRef = useRef<HTMLVideoElement>(null);
  const selectedHero = HEROES.find((hero) => hero.id === selectedHeroId) ?? HEROES[0];

  useEffect(() => {
    const video = activeVideoRef.current;
    if (!video || typeof video.requestVideoFrameCallback !== "function") return;

    let frameRequestId = 0;
    const inspectFrame: VideoFrameRequestCallback = (_now, metadata) => {
      const thresholdTolerance = Number.EPSILON * video.duration * 2;
      if (
        Number.isFinite(video.duration) &&
        video.duration - metadata.mediaTime <= LOGO_REVEAL_LEAD_SECONDS + thresholdTolerance
      ) {
        onLogoReveal();
        return;
      }
      frameRequestId = video.requestVideoFrameCallback(inspectFrame);
    };

    frameRequestId = video.requestVideoFrameCallback(inspectFrame);
    return () => video.cancelVideoFrameCallback(frameRequestId);
  }, [selectedHeroId, playbackRequestId, onLogoReveal]);

  function holdFinalFrame(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    if (Number.isFinite(video.duration)) {
      video.currentTime = Math.max(0, video.duration - FRAME_DURATION_SECONDS);
    }
    onLogoReveal();
  }

  function markVideoFailed(heroId: HeroId) {
    setFailedVideos((previous) => new Set(previous).add(heroId));
    if (heroId === selectedHeroId) onLogoReveal();
  }

  function revealLogoNearEnd(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    const thresholdTolerance = Number.EPSILON * video.duration * 2;
    if (
      Number.isFinite(video.duration) &&
      video.duration - video.currentTime <= LOGO_REVEAL_LEAD_SECONDS + thresholdTolerance
    ) {
      onLogoReveal();
    }
  }

  return (
    <div className="hero-select-page__background">
      {HEROES.map((hero) => {
        const active = hero.id === selectedHeroId;
        return (
          <video
            key={active ? `${hero.id}-${playbackRequestId}` : `${hero.id}-preload`}
            aria-label={`${hero.displayName}角色背景视频`}
            autoPlay={active}
            className={`hero-select-page__video${active && !failedVideos.has(hero.id) ? " hero-select-page__video--active" : ""}`}
            data-active={active ? "true" : "false"}
            muted={!active || playbackRequestId === 0}
            playsInline
            poster={hero.backgroundSrc}
            preload="auto"
            ref={active ? activeVideoRef : undefined}
            src={hero.videoSrc}
            onEnded={holdFinalFrame}
            onError={() => markVideoFailed(hero.id)}
            onTimeUpdate={active ? revealLogoNearEnd : undefined}
          />
        );
      })}
      {failedVideos.has(selectedHeroId) && (
        <img
          className="hero-select-page__video-fallback"
          src={selectedHero.backgroundSrc}
          alt={`${selectedHero.displayName}角色背景`}
        />
      )}
    </div>
  );
}
