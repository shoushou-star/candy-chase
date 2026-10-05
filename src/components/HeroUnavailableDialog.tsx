import type { RefObject } from "react";
import { GameButton } from "./GameButton";
import { useDialogFocus } from "./useDialogFocus";

export interface HeroUnavailableDialogProps {
  open: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

export function HeroUnavailableDialog({ open, triggerRef, onClose }: HeroUnavailableDialogProps) {
  const closeButtonRef = useDialogFocus({ open, triggerRef, onClose });

  if (!open) return null;

  return (
    <div className="store-dialog-overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hero-dialog-title"
        className="store-dialog-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="hero-dialog-title">该角色暂未开发，请选择 PIKO 开始游戏</h2>
        <GameButton ref={closeButtonRef} onClick={onClose}>知道了</GameButton>
      </div>
    </div>
  );
}
