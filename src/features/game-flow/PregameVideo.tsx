import { useEffect, useRef, useState } from 'react';
import { GameButton } from '../../components/GameButton';
import { pregameIntroUrl } from './media';

export interface PregameVideoProps { onFinished: () => void }
export function PregameVideo({ onFinished }: PregameVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const callback = useRef(onFinished);
  callback.current = onFinished;
  const resume = useRef<() => void>(() => {});
  const lifecycle = useRef(0);
  const [needsGesture, setNeedsGesture] = useState(false);

  useEffect(() => {
    const video = videoRef.current!;
    const instance = ++lifecycle.current;
    let alive = true;
    let finished = false;
    let request = 0;
    // Keep the decoded frame intact even during teardown. Seeking a removed
    // video can race the compositor's final paint of its still-visible layer.
    const stop = () => { video.pause(); };
    const finish = () => {
      if (!alive || finished) return;
      finished = true;
      request++;
      stop();
      setNeedsGesture(false);
      callback.current();
    };
    const play = () => {
      if (!alive || finished || document.visibilityState === 'hidden') return;
      const attempt = ++request;
      const rejected = (error: unknown) => {
        if (!alive || instance !== lifecycle.current || attempt !== request || finished) return;
        const name = error && typeof error === 'object' && 'name' in error ? error.name : '';
        if (name === 'NotAllowedError') setNeedsGesture(true);
        else if (name === 'NotSupportedError' || video.error) finish();
        else if (name !== 'AbortError') setNeedsGesture(true);
      };
      try {
        void video.play().then(() => {
          // A detached element can resolve play() after React has removed it.
          // StrictMode's earlier effect must not pause its replacement effect.
          if (!alive || instance !== lifecycle.current) {
            if (!video.isConnected) stop();
            return;
          }
          if (finished || document.visibilityState === 'hidden') { stop(); return; }
          if (attempt === request) setNeedsGesture(false);
        }, rejected);
      } catch (error) { rejected(error); }
    };
    const visibility = () => {
      if (document.visibilityState === 'hidden') { request++; stop(); }
      else play();
    };
    resume.current = play;
    video.addEventListener('ended', finish);
    video.addEventListener('error', finish);
    document.addEventListener('visibilitychange', visibility);
    play();
    return () => {
      alive = false;
      request++;
      resume.current = () => {};
      video.removeEventListener('ended', finish);
      video.removeEventListener('error', finish);
      document.removeEventListener('visibilitychange', visibility);
      stop();
    };
  }, []);

  return <div className="pregame-video">
    <video ref={videoRef} src={pregameIntroUrl} aria-label="游戏开场视频" playsInline preload="auto"
      disablePictureInPicture disableRemotePlayback tabIndex={-1} />
    {needsGesture && <div className="play-session-overlay">
      <GameButton className="play-session-button" onClick={() => resume.current()}>点击继续播放</GameButton>
    </div>}
  </div>;
}
