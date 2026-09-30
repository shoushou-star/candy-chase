import type { LobbyState } from "./types";

export const DEFAULT_LOBBY_STATE: LobbyState = {
  playerName: "Player",
  level: 12,
  experiencePercent: 59,
  currencies: {
    coins: 623736,
    energy: 2311,
    gems: 2139,
  },
  hasUnreadMail: false,
};
