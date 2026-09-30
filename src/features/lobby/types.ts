export type LobbyAction =
  | "coins"
  | "energy"
  | "gems"
  | "settings"
  | "play"
  | "songs"
  | "challenges"
  | "hero"
  | "daily"
  | "mail"
  | "gift"
  | "crown";

export interface LobbyState {
  playerName: string;
  level: number;
  experiencePercent: number;
  currencies: {
    coins: number;
    energy: number;
    gems: number;
  };
  hasUnreadMail: boolean;
}
