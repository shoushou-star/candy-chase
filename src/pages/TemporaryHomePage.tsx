import { GameButton } from "../components/GameButton";
import type { Hero } from "../features/hero-select/types";
import "../styles/placeholder-pages.css";

interface TemporaryHomePageProps {
  selectedHero: Hero;
  onEnterHeroSelect: () => void;
}

export function TemporaryHomePage({ selectedHero, onEnterHeroSelect }: TemporaryHomePageProps) {
  return (
    <main className="placeholder-page" aria-label="临时首页">
      <div className="placeholder-page__content">
        <p className="placeholder-page__eyebrow">CHOOSE YOUR HERO</p>
        <h1>英雄冒险</h1>
        <p>当前选择：{selectedHero.displayName}</p>
        <GameButton className="placeholder-page__button" onClick={onEnterHeroSelect}>
          进入角色选择
        </GameButton>
      </div>
    </main>
  );
}
