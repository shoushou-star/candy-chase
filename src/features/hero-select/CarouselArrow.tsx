import { GameButton } from "../../components/GameButton";
import type { HeroDirection } from "./types";

interface CarouselArrowProps {
  direction: HeroDirection;
  onClick: () => void;
}

export function CarouselArrow({ direction, onClick }: CarouselArrowProps) {
  const previous = direction === -1;
  return (
    <GameButton
      className={`carousel-arrow carousel-arrow--${previous ? "previous" : "next"}`}
      aria-label={previous ? "上一位角色" : "下一位角色"}
      onClick={onClick}
    >
      <span aria-hidden="true">{previous ? "‹" : "›"}</span>
    </GameButton>
  );
}
