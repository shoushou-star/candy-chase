import type { HeroId } from "../hero-select/types";

export type AppScreen = "loading" | "lobby" | "hero-select" | "game-placeholder";

export interface GameLaunchRequest {
  heroId: HeroId;
}

export type StartGameHandler = (request: GameLaunchRequest) => void;
