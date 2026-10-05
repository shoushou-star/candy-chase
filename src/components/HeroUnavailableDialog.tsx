import { useEffect, useRef, type RefObject } from "react";
import { GameButton } from "./GameButton";

export interface HeroUnavailableDialogProps {
  open: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

export function HeroUnavailableDialog({ open, triggerRef, onClose }: HeroUnavailableDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      } else if (event.key === "Tab") {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [open, triggerRef]);

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
