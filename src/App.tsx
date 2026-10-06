import { StageFrame } from "./components/StageFrame";
import { DEFAULT_LOBBY_STATE } from "./features/lobby/lobby-data";
import { LobbyPage } from "./features/lobby/LobbyPage";
import type { LobbyAction } from "./features/lobby/types";

const RHYTHM_GAME_URL = "/rhythm-game/";

export function App() {
  return (
    <StageFrame>
      <LobbyPage onAction={handleLobbyAction} state={DEFAULT_LOBBY_STATE} />
    </StageFrame>
  );
}

function handleLobbyAction(action: LobbyAction) {
  if (action === "play") {
    window.location.assign(RHYTHM_GAME_URL);
  }
}
