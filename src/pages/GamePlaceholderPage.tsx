import { GameButton } from "../components/GameButton";
import type { Hero } from "../features/hero-select/types";
import "../styles/placeholder-pages.css";

interface GamePlaceholderPageProps {
  confirmedHero: Hero;
  onReturnToHeroSelect: () => void;
}

export function GamePlaceholderPage({ confirmedHero, onReturnToHeroSelect }: GamePlaceholderPageProps) {
  return (
    <main className="placeholder-page" aria-label="游戏占位页">
      <div className="placeholder-page__content">
        <img className="placeholder-page__hero" src={confirmedHero.cardSrc} alt={`${confirmedHero.displayName}角色卡`} />
        <h1>{confirmedHero.displayName} 已准备就绪</h1>
        <p>游戏内容正在开发中</p>
        <GameButton className="placeholder-page__button" onClick={onReturnToHeroSelect}>
          返回角色选择
        </GameButton>
      </div>
    </main>
  );
}
