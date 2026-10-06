import { useRef, type RefObject } from 'react';
import { GameButton } from './GameButton';
import { useDialogFocus } from './useDialogFocus';

interface StartGameDialogProps {
  open: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onStart: () => void;
}

export function StartGameDialog({ open, triggerRef, onClose, onStart }: StartGameDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const startRef = useDialogFocus({ open, triggerRef, onClose, containerRef: panelRef });
  if (!open) return null;

  return <div className="store-dialog-overlay" onClick={onClose}>
    <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="start-game-dialog-title"
      aria-describedby="start-game-dialog-description" className="store-dialog-panel start-game-dialog"
      onClick={(event) => event.stopPropagation()}>
      <p id="start-game-dialog-description">已选择小企鹅 PIKO</p>
      <h2 id="start-game-dialog-title">是否立即开始游戏？</h2>
      <div className="start-game-dialog__actions">
        <GameButton ref={startRef} onClick={onStart}>开始游戏</GameButton>
        <GameButton className="start-game-dialog__secondary" onClick={onClose}>继续选角色</GameButton>
      </div>
    </div>
  </div>;
}
