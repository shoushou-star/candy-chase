import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { isCurrentGameMessage } from './bridge';
import { parseResult, type RhythmGameResult } from './result';
export interface GameplayFrameProps {
  runId: number;
  active: boolean;
  onReady: () => void;
  onComplete: (result: RhythmGameResult) => void;
  onError: (message: string) => void;
}
export function GameplayFrame(props: GameplayFrameProps) {
  return <GameInstance key={props.runId} {...props} />;
}

function GameInstance({ runId, active, onReady, onComplete, onError }: GameplayFrameProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const callbacks = useRef({ active, onReady, onComplete, onError });
  callbacks.current = { active, onReady, onComplete, onError };
  const readyOnce = useRef(false);
  const started = useRef(false);
  const completed = useRef(false);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const frame = frameRef.current!;
    const fail = () => {
      if (completed.current) return;
      completed.current = true;
      callbacks.current.onError('游戏加载失败，请重新加载。');
    };
    const receive = (event: MessageEvent<unknown>) => {
      if (!isCurrentGameMessage(event, frameRef.current?.contentWindow ?? null, location.origin, runId)) return;
      if (completed.current) return;
      const data = event.data as Record<string, unknown>;
      if (data.type === 'rhythmgame:ready' && !readyOnce.current) {
        readyOnce.current = true;
        setReady(true);
        callbacks.current.onReady();
      } else if (data.type === 'rhythmgame:complete' && callbacks.current.active && started.current && !completed.current) {
        completed.current = true;
        const result = parseResult(data.result);
        if (result) callbacks.current.onComplete(result);
        else callbacks.current.onError('游戏成绩数据无效，请重新开始。');
      }
    };
    // iframe errors do not bubble; React only attaches its native load listener.
    frame.addEventListener('error', fail);
    window.addEventListener('message', receive);
    return () => {
      frame.removeEventListener('error', fail);
      window.removeEventListener('message', receive);
    };
  }, [runId]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!active || !ready || started.current || completed.current || !frame?.contentWindow) return;
    started.current = true;
    frame.focus();
    frame.contentWindow.postMessage({ type: 'rhythmgame:start', runId }, location.origin);
  }, [active, ready, runId]);

  return <iframe ref={frameRef} title="节奏游戏" className="gameplay-frame"
    src={`${import.meta.env.BASE_URL}rhythm-game/index.html?embed=1&runId=${runId}`}
    allow="autoplay" inert={!active} aria-hidden={!active} tabIndex={active ? 0 : -1} />;
}
