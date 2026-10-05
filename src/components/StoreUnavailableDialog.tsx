import type { RefObject } from "react";
import { GameButton } from "./GameButton";
import { useDialogFocus } from "./useDialogFocus";

export interface StoreUnavailableDialogProps {
  open: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

export function StoreUnavailableDialog({ open, triggerRef, onClose }: StoreUnavailableDialogProps) {
  const closeButtonRef = useDialogFocus({ open, triggerRef, onClose });

  if (!open) return null;

  return (
    <div className="store-dialog-overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-dialog-title"
        className="store-dialog-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="store-dialog-title">商店功能暂未开放</h2>
        <GameButton ref={closeButtonRef} onClick={onClose}>知道了</GameButton>
      </div>
    </div>
  );
}
