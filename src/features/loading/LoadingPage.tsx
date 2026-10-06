import { useRef, useState, type CSSProperties } from "react";
import { useLoadingProgress } from "./useLoadingProgress";
import candyCircle from "../../assets/loading/control-candy-circle.svg";
import loadingBackground from "../../assets/loading/loading-background.png";
import loadingIntroVideo from "../../assets/loading/loading-intro.mp4";
import loadingLoopVideo from "../../assets/loading/loading-loop.mp4";
import loadingLogo from "../../assets/loading/loading-logo.png";
import soundIcon from "../../assets/loading/icon-sound.svg";
import musicIcon from "../../assets/loading/icon-music.svg";
import settingsIcon from "../../assets/loading/icon-settings.svg";
import accountIcon from "../../assets/loading/icon-account.svg";
import noticeIcon from "../../assets/loading/icon-notice.svg";
import progressStar from "../../assets/loading/progress-star.svg";

type LoadingPageProps = {
  progress?: number;
  onStartGame?: () => void;
};

type PlaybackPhase = "waiting" | "intro" | "loop" | "blocked";

const controls = [
  { className: "loading-control--sound", icon: soundIcon },
  { className: "loading-control--music", icon: musicIcon },
  { className: "loading-control--settings", icon: settingsIcon },
  { className: "loading-control--account", icon: accountIcon },
  { className: "loading-control--notice", icon: noticeIcon },
] as const;

export function LoadingPage({ progress, onStartGame }: LoadingPageProps) {
  const [playbackPhase, setPlaybackPhase] = useState<PlaybackPhase>("waiting");
  const introVideoRef = useRef<HTMLVideoElement>(null);
  const loopVideoRef = useRef<HTMLVideoElement>(null);
  const hasStarted = playbackPhase === "intro" || playbackPhase === "loop";
  const animatedProgress = useLoadingProgress(hasStarted);
  const safeProgress = Math.min(Math.max(progress ?? animatedProgress, 0), 100);
  const roundedProgress = Math.round(safeProgress);
  const style = {
    "--loading-progress": safeProgress / 100,
  } as CSSProperties;

  async function startIntro() {
    const introVideo = introVideoRef.current;
    if (!introVideo) return;

    introVideo.currentTime = 0;
    introVideo.muted = false;

    try {
      await introVideo.play();
      setPlaybackPhase("intro");
    } catch {
      setPlaybackPhase("blocked");
    }
  }

  function startLoop() {
    const loopVideo = loopVideoRef.current;
    if (!loopVideo) return;

    loopVideo.currentTime = 0;
    loopVideo.muted = true;
    setPlaybackPhase("loop");
    void loopVideo.play().catch(() => undefined);
  }

  const progressContents = (
    <div className="loading-progress__track">
      <div className="loading-progress__fill" />
      <div className="loading-progress__star" aria-hidden="true">
        <img src={progressStar} alt="" />
      </div>
      <span className="loading-progress__label">
        {roundedProgress >= 100 ? "CLICK TO START" : `${roundedProgress}%`}
      </span>
    </div>
  );

  return (
    <main className="loading-page" aria-label="游戏加载" style={style}>
      <img className="loading-page__background" src={loadingBackground} alt="" aria-hidden="true" />

      <video
        ref={introVideoRef}
        className={`loading-page__video${playbackPhase === "intro" ? " loading-page__video--active" : ""}`}
        data-testid="loading-intro-video"
        src={loadingIntroVideo}
        poster={loadingBackground}
        preload="auto"
        playsInline
        muted={false}
        onEnded={startLoop}
        aria-hidden="true"
      />
      <video
        ref={loopVideoRef}
        className={`loading-page__video${playbackPhase === "loop" ? " loading-page__video--active" : ""}`}
        data-testid="loading-loop-video"
        src={loadingLoopVideo}
        preload="auto"
        playsInline
        muted
        loop
        aria-hidden="true"
      />

      <img className="loading-page__logo" src={loadingLogo} alt="Candy Chase" />

      <div className="loading-controls" aria-hidden="true">
        {controls.map((control) => (
          <div className={`loading-control ${control.className}`} data-testid="loading-control" key={control.className}>
            <img className="loading-control__candy" src={candyCircle} alt="" />
            <img className="loading-control__icon" src={control.icon} alt="" />
          </div>
        ))}
      </div>

      {roundedProgress >= 100 ? (
        <button className="loading-progress loading-progress--complete" type="button" aria-label="CLICK TO START" onClick={onStartGame}>
          {progressContents}
        </button>
      ) : (
        <div className="loading-progress" role="progressbar" aria-label="游戏加载进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={roundedProgress}>
          {progressContents}
        </div>
      )}

      {!hasStarted && (
        <button
          className="loading-start-overlay"
          type="button"
          aria-label={playbackPhase === "blocked" ? "重新开始" : "开始加载"}
          onClick={() => void startIntro()}
        >
          <span className="loading-start-overlay__panel">
            <span className="loading-start-overlay__title">
              {playbackPhase === "blocked" ? "再次点击开始" : "点击开始"}
            </span>
            <span className="loading-start-overlay__hint">
              {playbackPhase === "blocked" ? "浏览器未能播放声音，请再次点击" : "开启声音并进入加载画面"}
            </span>
          </span>
        </button>
      )}
    </main>
  );
}
