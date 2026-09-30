import type { LobbyAction } from "./types";
import { finishLobbyClickAnimation, startLobbyClickAnimation } from "./button-feedback";

type LobbyCurrencyCounterProps = {
  action: Extract<LobbyAction, "coins" | "energy" | "gems">;
  label: string;
  value: number;
  iconSrc: string;
  onAction?: (action: LobbyAction) => void;
};

export function LobbyCurrencyCounter({ action, label, value, iconSrc, onAction }: LobbyCurrencyCounterProps) {
  return (
    <div aria-label={`${label}余额`} className="lobby-currency" role="group">
      <img alt="" className="lobby-currency__icon" src={iconSrc} />
      <span className="lobby-currency__value">{value}</span>
      <button
        aria-label={`增加${label}`}
        className="lobby-currency__plus"
        onAnimationEnd={(event) => finishLobbyClickAnimation(event.currentTarget)}
        onClick={(event) => {
          startLobbyClickAnimation(event.currentTarget);
          onAction?.(action);
        }}
        type="button"
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}
