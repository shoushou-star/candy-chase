import type { KeyboardEvent } from "react";
import { HEROES } from "./heroes";
import { HeroCard } from "./HeroCard";
import { getAdjacentHeroId } from "./selection";
import type { HeroAssetState, HeroDirection, HeroId } from "./types";

interface HeroCardListProps {
  selectedHeroId: HeroId;
  assetLoadState: HeroAssetState;
  onSelectHero: (heroId: HeroId) => void;
}

export function HeroCardList({ selectedHeroId, assetLoadState, onSelectHero }: HeroCardListProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (!event.currentTarget.contains(document.activeElement)) return;
    event.preventDefault();
    const direction: HeroDirection = event.key === "ArrowLeft" ? -1 : 1;
    onSelectHero(getAdjacentHeroId(selectedHeroId, direction));
  }

  return (
    <div className="hero-card-list" role="group" aria-label="角色卡列表" onKeyDown={handleKeyDown}>
      {HEROES.map((hero) => (
        <HeroCard
          key={hero.id}
          hero={hero}
          selected={hero.id === selectedHeroId}
          status={assetLoadState[hero.id]}
          onSelect={() => onSelectHero(hero.id)}
        />
      ))}
    </div>
  );
}
