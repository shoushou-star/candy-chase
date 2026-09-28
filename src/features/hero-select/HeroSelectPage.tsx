import { GameButton } from "../../components/GameButton";
import coinsIcon from "../../assets/figma/icon-coins.svg";
import energyIcon from "../../assets/figma/icon-energy.svg";
import gemsIcon from "../../assets/figma/icon-gems.svg";
import { CarouselArrow } from "./CarouselArrow";
import { CurrencyCounter } from "./CurrencyCounter";
import { HeroCardList } from "./HeroCardList";
import { HeroIdentity } from "./HeroIdentity";
import { getAdjacentHeroId, getHeroById } from "./selection";
import type { HeroAssetState, HeroDirection, HeroId } from "./types";
import "../../styles/hero-select.css";

export interface HeroSelectPageProps {
  selectedHeroId: HeroId;
  assetLoadState: HeroAssetState;
  onSelectHero: (heroId: HeroId) => void;
  onConfirm: (heroId: HeroId) => void;
  onBack: () => void;
  onOpenStore: (trigger: HTMLButtonElement) => void;
}

export function HeroSelectPage({
  selectedHeroId,
  assetLoadState,
  onSelectHero,
  onConfirm,
  onBack,
  onOpenStore,
}: HeroSelectPageProps) {
  const selectedHero = getHeroById(selectedHeroId);
  const currentStatus = assetLoadState[selectedHeroId];

  function selectAdjacent(direction: HeroDirection) {
    onSelectHero(getAdjacentHeroId(selectedHeroId, direction));
  }

  return (
    <main className="hero-select-page" aria-label="角色选择">
      <div className="hero-select-page__background">
        {currentStatus === "ready" ? (
          <img src={selectedHero.backgroundSrc} alt={`${selectedHero.displayName}角色背景`} />
        ) : (
          <span role="status">
            {currentStatus === "error" ? `无法加载 ${selectedHero.displayName} 背景` : `正在加载 ${selectedHero.displayName} 背景`}
          </span>
        )}
      </div>
      <div className="hero-select-page__overlay" aria-hidden="true" />
      <header className="hero-select-page__header">
        <GameButton className="hero-select-page__back" aria-label="返回首页" onClick={onBack}>
          <span aria-hidden="true">←</span>
        </GameButton>
        <div className="hero-select-page__currencies">
          <CurrencyCounter name="金币" iconSrc={coinsIcon} value={0} onOpenStore={onOpenStore} />
          <CurrencyCounter name="体力" iconSrc={energyIcon} value={0} onOpenStore={onOpenStore} />
          <CurrencyCounter name="宝石" iconSrc={gemsIcon} value={0} onOpenStore={onOpenStore} />
        </div>
      </header>
      <HeroIdentity hero={selectedHero} status={currentStatus} />
      <div className="hero-select-page__selection">
        <CarouselArrow direction={-1} onClick={() => selectAdjacent(-1)} />
        <CarouselArrow direction={1} onClick={() => selectAdjacent(1)} />
        <GameButton
          className="hero-select-page__confirm"
          aria-label={`确认选择 ${selectedHero.displayName}`}
          disabled={currentStatus !== "ready" || selectedHero.disabled}
          onClick={() => onConfirm(selectedHeroId)}
        >
          SELECT
        </GameButton>
        <HeroCardList
          selectedHeroId={selectedHeroId}
          assetLoadState={assetLoadState}
          onSelectHero={onSelectHero}
        />
      </div>
    </main>
  );
}
