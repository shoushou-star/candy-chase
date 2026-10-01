import { useRef, useState } from "react";
import { StageFrame } from "./components/StageFrame";
import { StoreUnavailableDialog } from "./components/StoreUnavailableDialog";
import type { AppScreen, StartGameHandler } from "./features/game-flow/types";
import { HEROES } from "./features/hero-select/heroes";
import { HeroSelectPage } from "./features/hero-select/HeroSelectPage";
import { getHeroById } from "./features/hero-select/selection";
import type { HeroId } from "./features/hero-select/types";
import { useHeroAssets } from "./features/hero-select/useHeroAssets";
import { LoadingPage } from "./features/loading/LoadingPage";
import { DEFAULT_LOBBY_STATE } from "./features/lobby/lobby-data";
import { LobbyPage } from "./features/lobby/LobbyPage";
import { GamePlaceholderPage } from "./pages/GamePlaceholderPage";

export function App() {
  const [screen, setScreen] = useState<AppScreen>("loading");
  const [draftHeroId, setDraftHeroId] = useState<HeroId>("piko");
  const [confirmedHeroId, setConfirmedHeroId] = useState<HeroId | null>(null);
  const [launchedHeroId, setLaunchedHeroId] = useState<HeroId | null>(null);

  function openHeroSelect() {
    setDraftHeroId(confirmedHeroId ?? "piko");
    setScreen("hero-select");
  }

  const startGame: StartGameHandler = ({ heroId }) => {
    setLaunchedHeroId(heroId);
    setScreen("game-placeholder");
  };

  function play() {
    if (confirmedHeroId === null) {
      openHeroSelect();
      return;
    }
    startGame({ heroId: confirmedHeroId });
  }

  return (
    <StageFrame>
      {screen === "loading" && <LoadingPage onStartGame={() => setScreen("lobby")} />}
      {screen === "lobby" && (
        <LobbyPage
          state={DEFAULT_LOBBY_STATE}
          onOpenHeroSelect={openHeroSelect}
          onPlay={play}
        />
      )}
      {screen === "hero-select" && (
        <IntegratedHeroSelect
          confirmedHeroId={confirmedHeroId}
          selectedHeroId={draftHeroId}
          onBack={() => setScreen("lobby")}
          onConfirm={setConfirmedHeroId}
          onSelectHero={setDraftHeroId}
        />
      )}
      {screen === "game-placeholder" && launchedHeroId !== null && (
        <GamePlaceholderPage
          confirmedHero={getHeroById(launchedHeroId)}
          onReturnToLobby={() => setScreen("lobby")}
        />
      )}
    </StageFrame>
  );
}

interface IntegratedHeroSelectProps {
  confirmedHeroId: HeroId | null;
  selectedHeroId: HeroId;
  onBack: () => void;
  onConfirm: (heroId: HeroId) => void;
  onSelectHero: (heroId: HeroId) => void;
}

function IntegratedHeroSelect({
  confirmedHeroId,
  selectedHeroId,
  onBack,
  onConfirm,
  onSelectHero,
}: IntegratedHeroSelectProps) {
  const [playbackRequestId, setPlaybackRequestId] = useState(0);
  const [isStoreNoticeOpen, setStoreNoticeOpen] = useState(false);
  const storeNoticeTrigger = useRef<HTMLButtonElement>(null);
  const assetLoadState = useHeroAssets(HEROES);

  function selectHero(heroId: HeroId) {
    if (isStoreNoticeOpen) return;
    onSelectHero(heroId);
    setPlaybackRequestId((previous) => previous + 1);
  }

  function openStore(trigger: HTMLButtonElement) {
    if (isStoreNoticeOpen) return;
    storeNoticeTrigger.current = trigger;
    setStoreNoticeOpen(true);
  }

  return (
    <>
      <div inert={isStoreNoticeOpen}>
        <HeroSelectPage
          selectedHeroId={selectedHeroId}
          confirmedHeroId={confirmedHeroId}
          playbackRequestId={playbackRequestId}
          assetLoadState={assetLoadState}
          onSelectHero={selectHero}
          onConfirm={onConfirm}
          onBack={onBack}
          onOpenStore={openStore}
        />
      </div>
      <StoreUnavailableDialog
        open={isStoreNoticeOpen}
        triggerRef={storeNoticeTrigger}
        onClose={() => setStoreNoticeOpen(false)}
      />
    </>
  );
}
