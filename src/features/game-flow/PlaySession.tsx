import { useEffect, useRef, useState } from 'react';
import { GameButton } from '../../components/GameButton';
import { GameplayFrame } from './GameplayFrame';
import { PregameVideo } from './PregameVideo';
import type { RhythmGameResult } from './result';
import '../../styles/play-session.css';
export interface PlaySessionProps {
  runId: number;
  playIntro: boolean;
  onComplete: (result: RhythmGameResult) => void;
  onRetryLoad: () => void;
  onReturnToLobby: () => void;
  onGameplayStarted?: () => void;
}
export function PlaySession(props: PlaySessionProps) {
  // A run owns the iframe and every timer. Phase changes keep that instance alive.
  return <SessionInstance key={props.runId} {...props} />;
}

function SessionInstance({ runId, playIntro, onComplete, onRetryLoad, onReturnToLobby, onGameplayStarted }: PlaySessionProps) {
  const [ready, setReady] = useState(false);
  const [finished, setFinished] = useState(!playIntro);
  const [error, setError] = useState<string | null>(null);
  const [presented, setPresented] = useState(false);
  const notified = useRef(false);
  const retryRef = useRef<HTMLButtonElement>(null);
  const startedCallback = useRef(onGameplayStarted);
  startedCallback.current = onGameplayStarted;
  const active = ready && finished && !error;
  const showError = finished && !!error;

  useEffect(() => {
    if (!active) return;
    // The iframe becomes visible and receives start before the intro layer is
    // removed. Two paint boundaries allow its previously hidden surface to be
    // composed; this is frame-driven, not a guessed decoding delay.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setPresented(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);

  useEffect(() => {
    if (!finished || ready || error) return;
    const timeout = window.setTimeout(() => setError('游戏加载超时，请重新加载。'), 10000);
    return () => window.clearTimeout(timeout);
  }, [finished, ready, error]);

  useEffect(() => {
    if (active && !notified.current) {
      notified.current = true;
      startedCallback.current?.();
    }
  }, [active]);

  useEffect(() => { if (showError) retryRef.current?.focus(); }, [showError]);

  return <section className="play-session" aria-label="游戏会话">
    {!error && <GameplayFrame runId={runId} active={active} onReady={() => setReady(true)}
      onComplete={onComplete} onError={setError} />}
    {playIntro && !presented && !showError && <PregameVideo onFinished={() => setFinished(true)} />}
    {finished && !ready && !error && <div className="play-session-loading" role="status">LOADING...</div>}
    {showError && <div className="play-session-overlay">
      <div className="play-session-error" role="alert">
        <h2>暂时无法开始游戏</h2><p>{error}</p>
        <div className="play-session-actions">
          <GameButton ref={retryRef} className="play-session-button" onClick={onRetryLoad}>重新加载</GameButton>
          <GameButton className="play-session-button play-session-button-secondary" onClick={onReturnToLobby}>返回大厅</GameButton>
        </div>
      </div>
    </div>}
  </section>;
}
