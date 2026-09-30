import type { ButtonHTMLAttributes } from "react";

type LobbyButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  primary?: boolean;
};

export function LobbyButton({ className = "", primary = false, type = "button", ...props }: LobbyButtonProps) {
  const classes = ["lobby-button", primary && "lobby-button--primary", className]
    .filter(Boolean)
    .join(" ");

  return <button {...props} className={classes} type={type} />;
}
