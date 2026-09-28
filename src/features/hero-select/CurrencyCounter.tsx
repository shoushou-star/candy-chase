import type { MouseEvent } from "react";
import { GameButton } from "../../components/GameButton";

interface CurrencyCounterProps {
  name: string;
  iconSrc: string;
  value: number;
  onOpenStore: (trigger: HTMLButtonElement) => void;
}

export function CurrencyCounter({ name, iconSrc, value, onOpenStore }: CurrencyCounterProps) {
  function openStore(event: MouseEvent<HTMLButtonElement>) {
    onOpenStore(event.currentTarget);
  }

  return (
    <div className="currency-counter">
      <img className="currency-counter__icon" src={iconSrc} alt="" />
      <span className="currency-counter__value" aria-label={`${name} ${value}`}>{value}</span>
      <GameButton className="currency-counter__plus" aria-label={`打开${name}商店`} onClick={openStore}>
        <span aria-hidden="true">+</span>
      </GameButton>
    </div>
  );
}
