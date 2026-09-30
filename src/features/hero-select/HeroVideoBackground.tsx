import { useState, type SyntheticEvent } from "react";
import { HEROES } from "./heroes";
import type { HeroId } from "./types";

const FRAME_DURATION_SECONDS = 1 / 24;

interface HeroVideoBackgroundProps {
  selectedHeroId: HeroId;
  playbackRequestId: number;
}

export function HeroVideoBackground({
  selectedHeroId,
  playbackRequestId,
}: HeroVideoBackgroundProps) {
  const [failedVideos, setFailedVideos] = useState<Set<HeroId>>(() => new Set());
  const selectedHero = HEROES.find((hero) => hero.id === selectedHeroId) ?? HEROES[0];

  function holdFinalFrame(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    if (Number.isFinite(video.duration)) {
      video.currentTime = Math.max(0, video.duration - FRAME_DURATION_SECONDS);
    }
  }

  function markVideoFailed(heroId: HeroId) {
    setFailedVideos((previous) => new Set(previous).add(heroId));
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
            src={hero.videoSrc}
            onEnded={holdFinalFrame}
            onError={() => markVideoFailed(hero.id)}
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
