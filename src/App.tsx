import { useRef, useState } from "react";
import { StageFrame } from "./components/StageFrame";
import { StoreUnavailableDialog } from "./components/StoreUnavailableDialog";
import { HEROES } from "./features/hero-select/heroes";
import { HeroSelectPage } from "./features/hero-select/HeroSelectPage";
import { getHeroById } from "./features/hero-select/selection";
import type { HeroId, Page } from "./features/hero-select/types";
import { useHeroAssets } from "./features/hero-select/useHeroAssets";
import { GamePlaceholderPage } from "./pages/GamePlaceholderPage";
import { TemporaryHomePage } from "./pages/TemporaryHomePage";

export function App() {
  const [currentPage, setCurrentPage] = useState<Page>("hero-select");
  const [selectedHeroId, setSelectedHeroId] = useState<HeroId>("piko");
  const [playbackRequestId, setPlaybackRequestId] = useState(0);
  const [confirmedHeroId, setConfirmedHeroId] = useState<HeroId>("piko");
  const [isStoreNoticeOpen, setStoreNoticeOpen] = useState(false);
  const storeNoticeTrigger = useRef<HTMLButtonElement>(null);
  const assetLoadState = useHeroAssets(HEROES);

  function confirmHero(heroId: HeroId) {
    setConfirmedHeroId(heroId);
    setCurrentPage("game-placeholder");
  }

  function openStore(trigger: HTMLButtonElement) {
    if (isStoreNoticeOpen) return;
    storeNoticeTrigger.current = trigger;
    setStoreNoticeOpen(true);
  }

  function runOutsideModal(action: () => void) {
    if (!isStoreNoticeOpen) action();
  }

  function selectHero(heroId: HeroId) {
    runOutsideModal(() => {
      setSelectedHeroId(heroId);
      setPlaybackRequestId((previous) => previous + 1);
    });
  }

  function showHeroSelect() {
    setPlaybackRequestId(0);
    setCurrentPage("hero-select");
  }

  return (
    <StageFrame>
      <div inert={isStoreNoticeOpen}>
        {currentPage === "hero-select" && (
          <HeroSelectPage
            selectedHeroId={selectedHeroId}
            playbackRequestId={playbackRequestId}
            assetLoadState={assetLoadState}
            onSelectHero={selectHero}
            onConfirm={(heroId) => runOutsideModal(() => confirmHero(heroId))}
            onBack={() => runOutsideModal(() => setCurrentPage("home"))}
            onOpenStore={openStore}
          />
        )}
        {currentPage === "home" && (
          <TemporaryHomePage
            selectedHero={getHeroById(selectedHeroId)}
            onEnterHeroSelect={showHeroSelect}
          />
        )}
        {currentPage === "game-placeholder" && (
          <GamePlaceholderPage
            confirmedHero={getHeroById(confirmedHeroId)}
            onReturnToHeroSelect={showHeroSelect}
          />
        )}
      </div>
      <StoreUnavailableDialog
        open={isStoreNoticeOpen}
        triggerRef={storeNoticeTrigger}
        onClose={() => setStoreNoticeOpen(false)}
      />
    </StageFrame>
  );
}
