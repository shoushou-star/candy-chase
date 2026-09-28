import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

const STAGE_WIDTH = 2048;
const STAGE_HEIGHT = 1152;

export function getStageScale(width: number, height: number): number {
  return Math.min(width / STAGE_WIDTH, height / STAGE_HEIGHT);
}

type StageFrameProps = {
  children?: ReactNode;
};

export function StageFrame({ children }: StageFrameProps) {
  const [scale, setScale] = useState(() =>
    getStageScale(window.innerWidth, window.innerHeight),
  );

  useEffect(() => {
    const updateScale = () => {
      setScale(getStageScale(window.innerWidth, window.innerHeight));
    };

    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <div
      className="stage-viewport"
      style={{ "--stage-scale": scale, position: "relative" } as CSSProperties}
    >
      <section
        aria-label="游戏画面"
        className="stage-frame"
        style={{
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          position: "absolute",
          left: "50%",
          top: "50%",
          translate: "-50% -50%",
        }}
      >
        {children}
      </section>
    </div>
  );
}
