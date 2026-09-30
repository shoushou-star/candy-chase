import { StageFrame } from "./components/StageFrame";
import { DEFAULT_LOBBY_STATE } from "./features/lobby/lobby-data";
import { LobbyPage } from "./features/lobby/LobbyPage";

export function App() {
  return (
    <StageFrame>
      <LobbyPage state={DEFAULT_LOBBY_STATE} />
    </StageFrame>
  );
}
