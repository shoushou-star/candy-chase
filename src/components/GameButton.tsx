import type { ButtonHTMLAttributes, RefAttributes } from "react";
import "../styles/controls.css";

export type GameButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & RefAttributes<HTMLButtonElement>;

export function GameButton({ className, type = "button", ...props }: GameButtonProps) {
  return <button {...props} type={type} className={["game-button", className].filter(Boolean).join(" ")} />;
}
