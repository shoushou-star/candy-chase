export type Page = "home" | "hero-select" | "game-placeholder";
export type HeroId = "piko" | "riff" | "bongo" | "nibby" | "mira";
export type HeroDirection = -1 | 1;
export type AssetStatus = "idle" | "loading" | "ready" | "error";

export interface Hero {
  id: HeroId;
  displayName: string;
  backgroundSrc: string;
  logoSrc: string;
  cardSrc: string;
  disabled?: boolean;
}
