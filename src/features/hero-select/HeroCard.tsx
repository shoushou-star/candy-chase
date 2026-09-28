import { GameButton } from "../../components/GameButton";
import type { AssetStatus, Hero } from "./types";

interface HeroCardProps {
  hero: Hero;
  selected: boolean;
  status: AssetStatus;
  onSelect: () => void;
}

export function HeroCard({ hero, selected, status, onSelect }: HeroCardProps) {
  return (
    <GameButton
      className={`hero-card${selected ? " hero-card--selected" : ""}`}
      aria-label={`选择 ${hero.displayName}`}
      aria-pressed={selected}
      disabled={hero.disabled}
      onClick={onSelect}
    >
      <span className="hero-card__art">
        {status === "ready" ? (
          <img src={hero.cardSrc} alt={`${hero.displayName}角色卡`} />
        ) : (
          <span className="hero-card__fallback">
            {status === "error" ? `无法加载 ${hero.displayName}` : `正在加载 ${hero.displayName}`}
          </span>
        )}
      </span>
      <span className="hero-card__name" aria-hidden="true">{hero.displayName}</span>
    </GameButton>
  );
}
