import { useEffect, useRef, type RefObject } from "react";

interface DialogFocusOptions {
  open: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  containerRef?: RefObject<HTMLDivElement | null>;
}

export function useDialogFocus({ open, triggerRef, onClose, containerRef }: DialogFocusOptions) {
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
        const buttons = containerRef?.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
        if (buttons?.length) {
          const items = Array.from(buttons);
          const current = items.indexOf(document.activeElement as HTMLButtonElement);
          const next = current < 0 ? (event.shiftKey ? items.length - 1 : 0)
            : (current + (event.shiftKey ? -1 : 1) + items.length) % items.length;
          items[next].focus();
        } else closeButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [open, triggerRef, containerRef]);

  return closeButtonRef;
}
