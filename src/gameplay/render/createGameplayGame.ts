import Phaser from "phaser";
import type { SessionSnapshot } from "../domain/RhythmSession";
import { GameplayScene } from "./GameplayScene";
import { GAME_HEIGHT, GAME_WIDTH } from "./motion";

export interface GameplayController {
  start: () => Promise<void>;
  restart: () => Promise<void>;
  subscribe: (listener: (snapshot: SessionSnapshot) => void) => () => void;
  destroy: () => void;
}

export function createGameplayGame(parent: HTMLElement): GameplayController {
  const listeners = new Set<(snapshot: SessionSnapshot) => void>();
  let latestSnapshot: SessionSnapshot | null = null;
  let resolveReady: ((scene: GameplayScene) => void) | null = null;
  const ready = new Promise<GameplayScene>((resolve) => {
    resolveReady = resolve;
  });

  const scene = new GameplayScene({
    onReady: (readyScene) => resolveReady?.(readyScene),
    onSnapshot: (snapshot) => {
      latestSnapshot = snapshot;
      listeners.forEach((listener) => listener(snapshot));
    },
  });

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#160c2c",
    scene: [scene],
    render: { antialias: true, pixelArt: false, roundPixels: false },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
  });

  const run = async () => {
    const readyScene = await ready;
    await readyScene.startStage();
  };

  return {
    start: run,
    restart: run,
    subscribe: (listener) => {
      listeners.add(listener);
      if (latestSnapshot) listener(latestSnapshot);
      return () => listeners.delete(listener);
    },
    destroy: () => {
      listeners.clear();
      game.destroy(true);
    },
  };
}
