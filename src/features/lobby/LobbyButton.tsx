import type { ButtonHTMLAttributes } from "react";
import { finishLobbyClickAnimation, startLobbyClickAnimation } from "./button-feedback";

type LobbyButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  primary?: boolean;
};

export function LobbyButton({
  className = "",
  onAnimationEnd,
  onClick,
  primary = false,
  type = "button",
  ...props
}: LobbyButtonProps) {
  const classes = ["lobby-button", primary && "lobby-button--primary", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...props}
      className={classes}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) finishLobbyClickAnimation(event.currentTarget);
        onAnimationEnd?.(event);
      }}
      onClick={(event) => {
        startLobbyClickAnimation(event.currentTarget);
        onClick?.(event);
      }}
      type={type}
    />
  );
}
