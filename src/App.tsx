import { useEffect, useRef, useState } from "react";
import { StageFrame } from "./components/StageFrame";
import { HeroUnavailableDialog } from "./components/HeroUnavailableDialog";
import { StoreUnavailableDialog } from "./components/StoreUnavailableDialog";
import { ScreenTransition, useScreenTransition } from "./features/game-flow/ScreenTransition";
import { PlaySession } from "./features/game-flow/PlaySession";
import { recordResult, toSettlementProps, type RhythmGameResult } from "./features/game-flow/result";
import type { AppScreen, StartGameHandler } from "./features/game-flow/types";
import { HEROES } from "./features/hero-select/heroes";
import { HeroSelectPage } from "./features/hero-select/HeroSelectPage";
import type { HeroId } from "./features/hero-select/types";
import { useHeroAssets } from "./features/hero-select/useHeroAssets";
import { LoadingPage } from "./features/loading/LoadingPage";
import { DEFAULT_LOBBY_STATE } from "./features/lobby/lobby-data";
import { LobbyPage } from "./features/lobby/LobbyPage";
import { SettlementSequence } from "./features/settlement/SettlementSequence";

type RunStatus = "waiting" | "playing" | "completed" | "leaving";

export function App() {
  const { durationMs, phase, requestScreen, screen: transitionScreen } = useScreenTransition("loading");
  const [draftHeroId, setDraftHeroId] = useState<HeroId>("piko");
  const [confirmedHeroId, setConfirmedHeroId] = useState<HeroId | null>(null);
  const [gameRunId, setGameRunId] = useState(0);
  const [playIntro, setPlayIntro] = useState(true);
  const [gameplayStarted, setGameplayStarted] = useState(false);
  const [latestResult, setLatestResult] = useState<RhythmGameResult | null>(null);
  const [sessionBestScore, setSessionBestScore] = useState<number | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const currentRun = useRef<{ id: number; status: RunStatus } | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<{ runId: number; screen: AppScreen } | null>(null);
  const screen: AppScreen = transitionScreen === "pregame-video" && (gameplayStarted || !playIntro)
    ? "gameplay"
    : transitionScreen;

  // Game events can arrive while the previous navigation is still revealing.
  // A queued destination belongs to its run and cannot navigate a later run.
  useEffect(() => {
    if (!pendingNavigation || phase !== "idle") return;
    if (currentRun.current?.id !== pendingNavigation.runId) {
      setPendingNavigation(null);
      return;
    }
    if (requestScreen(pendingNavigation.screen, 350)) setPendingNavigation(null);
  }, [pendingNavigation, phase, requestScreen]);

  function createRun(withIntro: boolean) {
    const id = (currentRun.current?.id ?? 0) + 1;
    currentRun.current = { id, status: "waiting" };
    setGameRunId(id);
    setPlayIntro(withIntro);
    setGameplayStarted(false);
    setLatestResult(null);
    setIsNewRecord(false);
    setPendingNavigation(null);
    return id;
  }

  function openHeroSelect() {
    if (!requestScreen("hero-select", 220)) return;
    setDraftHeroId(confirmedHeroId ?? "piko");
  }

  const startGame: StartGameHandler = ({ heroId }) => {
    if (heroId !== "piko" || confirmedHeroId !== "piko" || !requestScreen("pregame-video", 350)) return;
    createRun(true);
  };

  function play() {
    if (confirmedHeroId !== "piko") {
      openHeroSelect();
      return;
    }
    startGame({ heroId: confirmedHeroId });
  }

  function markGameplayStarted(runId: number) {
    const run = currentRun.current;
    if (run?.id !== runId || run.status !== "waiting") return;
    run.status = "playing";
    setGameplayStarted(true);
  }

  function completeGame(runId: number, result: RhythmGameResult) {
    const run = currentRun.current;
    if (run?.id !== runId || run.status !== "playing") return;
    run.status = "completed";
    const record = recordResult(result, sessionBestScore);
    setLatestResult({ ...result });
    setIsNewRecord(record.isNewRecord);
    setSessionBestScore(record.bestScore);
    setPendingNavigation({ runId, screen: "settlement" });
  }

  function retryGame(runId: number, source: "session" | "settlement") {
    const run = currentRun.current;
    if (run?.id !== runId || run.status === "leaving") return;
    const fromSettlement = run.status === "completed";
    if ((source === "settlement") !== fromSettlement) return;
    const nextRunId = createRun(false);
    // An error reload already occupies the shared session slot. It must work
    // without requesting the same screen, which the transition hook rejects.
    if (fromSettlement) setPendingNavigation({ runId: nextRunId, screen: "gameplay" });
  }

  function returnToLobby(runId: number, source: "session" | "settlement") {
    const run = currentRun.current;
    if (run?.id !== runId || run.status === "leaving") return;
    if ((source === "settlement") !== (run.status === "completed")) return;
    run.status = "leaving";
    setPendingNavigation({ runId, screen: "lobby" });
  }

  return (
    <StageFrame>
      <div data-testid="app-screen" data-screen={screen} style={{ display: "contents" }}>
        {screen === "loading" && <LoadingPage onStartGame={() => requestScreen("lobby", 350)} />}
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
            onBack={() => requestScreen("lobby", 220)}
            onConfirm={setConfirmedHeroId}
            onSelectHero={setDraftHeroId}
          />
        )}
        {(screen === "pregame-video" || screen === "gameplay") && (
          <PlaySession
            runId={gameRunId}
            playIntro={playIntro}
            onGameplayStarted={() => markGameplayStarted(gameRunId)}
            onComplete={(result) => completeGame(gameRunId, result)}
            onRetryLoad={() => retryGame(gameRunId, "session")}
            onReturnToLobby={() => returnToLobby(gameRunId, "session")}
          />
        )}
        {screen === "settlement" && latestResult !== null && (
          <SettlementSequence
            {...toSettlementProps(latestResult)}
            isNewRecord={isNewRecord}
            onRetry={() => retryGame(gameRunId, "settlement")}
            onNext={() => returnToLobby(gameRunId, "settlement")}
          />
        )}
        <ScreenTransition durationMs={durationMs} phase={phase} />
      </div>
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
  const [isHeroNoticeOpen, setHeroNoticeOpen] = useState(false);
  const storeNoticeTrigger = useRef<HTMLButtonElement>(null);
  const heroNoticeTrigger = useRef<HTMLButtonElement>(null);
  const assetLoadState = useHeroAssets(HEROES);
  const isNoticeOpen = isStoreNoticeOpen || isHeroNoticeOpen;

  function selectHero(heroId: HeroId) {
    if (isNoticeOpen) return;
    onSelectHero(heroId);
    setPlaybackRequestId((previous) => previous + 1);
  }

  function openStore(trigger: HTMLButtonElement) {
    if (isNoticeOpen) return;
    storeNoticeTrigger.current = trigger;
    setStoreNoticeOpen(true);
  }

  function confirmPlayableHero(heroId: HeroId) {
    if (isNoticeOpen) return;
    if (heroId !== "piko") {
      setHeroNoticeOpen(true);
      return;
    }
    onConfirm(heroId);
  }

  return (
    <>
      <div inert={isNoticeOpen}>
        <HeroSelectPage
          selectedHeroId={selectedHeroId}
          confirmedHeroId={confirmedHeroId}
          playbackRequestId={playbackRequestId}
          assetLoadState={assetLoadState}
          onSelectHero={selectHero}
          confirmButtonRef={heroNoticeTrigger}
          onConfirm={confirmPlayableHero}
          onBack={() => { if (!isNoticeOpen) onBack(); }}
          onOpenStore={openStore}
        />
      </div>
      <StoreUnavailableDialog
        open={isStoreNoticeOpen}
        triggerRef={storeNoticeTrigger}
        onClose={() => setStoreNoticeOpen(false)}
      />
      <HeroUnavailableDialog
        open={isHeroNoticeOpen}
        triggerRef={heroNoticeTrigger}
        onClose={() => setHeroNoticeOpen(false)}
      />
    </>
  );
}
