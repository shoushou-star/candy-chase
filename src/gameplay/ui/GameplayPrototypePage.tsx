import { useEffect, useRef, useState } from "react";
import type { SessionSnapshot } from "../domain/RhythmSession";
import { STAGE_DURATION_SECONDS } from "../domain/chart";
import { createGameplayGame, type GameplayController } from "../render/createGameplayGame";
import "../styles/gameplay.css";

const INITIAL_SNAPSHOT: SessionSnapshot = {
  status: "ready",
  songTime: 0,
  combo: 0,
  maxCombo: 0,
  perfect: 0,
  good: 0,
  miss: 0,
  repairPercent: 0,
  activeHoldId: null,
  resolvedEventIds: [],
  lastOutcome: null,
  result: null,
};

function feedbackLabel(snapshot: SessionSnapshot): string {
  const outcome = snapshot.lastOutcome;
  if (!outcome) return "";
  if (outcome.kind === "empty") return "连击中断";
  if (outcome.kind === "ignored") return "";
  if (outcome.kind === "hold-start") return "HOLD";
  return outcome.judgement.toUpperCase();
}

export function GameplayPrototypePage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<GameplayController | null>(null);
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(INITIAL_SNAPSHOT);
  const [hasStarted, setHasStarted] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!hostRef.current) return;
    const controller = createGameplayGame(hostRef.current);
    const unsubscribe = controller.subscribe(setSnapshot);
    controllerRef.current = controller;
    return () => {
      unsubscribe();
      controller.destroy();
      controllerRef.current = null;
    };
  }, []);

  const handleStart = async () => {
    if (starting) return;
    setStarting(true);
    try {
      await controllerRef.current?.start();
      setHasStarted(true);
    } finally {
      setStarting(false);
    }
  };

  const handleRestart = async () => {
    if (starting) return;
    setStarting(true);
    try {
      await controllerRef.current?.restart();
      setHasStarted(true);
    } finally {
      setStarting(false);
    }
  };

  const countdown = snapshot.status === "playing" && snapshot.songTime < 2
    ? Math.max(1, Math.ceil((2 - snapshot.songTime) / 0.5))
    : null;
  const remaining = Math.max(0, STAGE_DURATION_SECONDS - snapshot.songTime);
  const feedback = feedbackLabel(snapshot);

  return (
    <main className="gameplay-prototype" aria-label="糖果追击玩法原型">
      <div className="gameplay-prototype__stage" aria-label="节奏游戏画面">
        <div ref={hostRef} className="gameplay-prototype__canvas" aria-hidden="true" />

        {hasStarted && snapshot.status !== "complete" && (
          <section className="gameplay-hud" aria-label="玩法状态">
            <div className="gameplay-hud__score-card">
              <span>糖罐修复</span>
              <div className="gameplay-hud__meter" aria-label={`糖罐修复 ${snapshot.repairPercent}%`}>
                <span style={{ width: `${snapshot.repairPercent}%` }} />
              </div>
              <strong>{snapshot.repairPercent}%</strong>
            </div>
            <div className="gameplay-hud__time">
              <span>剩余</span>
              <strong>{remaining.toFixed(1)}s</strong>
            </div>
            <div className="gameplay-hud__combo" data-active={snapshot.combo > 1}>
              <strong>{snapshot.combo}</strong>
              <span>COMBO</span>
            </div>
            <div className="gameplay-hud__feedback" aria-live="polite">{feedback}</div>
            {snapshot.activeHoldId && <div className="gameplay-hud__hold">保持按住</div>}
            {countdown && <div className="gameplay-hud__countdown" aria-live="polite">{countdown}</div>}
          </section>
        )}

        {!hasStarted && (
          <section className="gameplay-overlay gameplay-overlay--start">
            <div className="gameplay-overlay__eyebrow">GREYBOX PLAYTEST · 120 BPM</div>
            <h1>糖果追击</h1>
            <p>糖果进入左侧星形判定点时进行攻击。</p>
            <p className="gameplay-overlay__controls">空格键、鼠标左键或触摸：点击 / 按住 / 松开</p>
            <button type="button" onClick={handleStart} disabled={starting}>
              {starting ? "正在准备音频…" : "开始节奏测试"}
            </button>
          </section>
        )}

        {snapshot.status === "complete" && snapshot.result && (
          <section className="gameplay-overlay gameplay-overlay--result" aria-label="游戏结算">
            <div className="gameplay-overlay__eyebrow">STAR JAR RESTORATION</div>
            <h1>{snapshot.result.title}</h1>
            <div className="result-repair">
              <strong>{snapshot.result.repairPercent}%</strong>
              <span>糖罐修复率</span>
            </div>
            <div className="result-grid">
              <div><span>PERFECT</span><strong>{snapshot.result.perfect}</strong></div>
              <div><span>GOOD</span><strong>{snapshot.result.good}</strong></div>
              <div><span>MISS</span><strong>{snapshot.result.miss}</strong></div>
              <div><span>MAX COMBO</span><strong>{snapshot.result.maxCombo}</strong></div>
            </div>
            <button type="button" onClick={handleRestart} disabled={starting}>
              {starting ? "正在重新开始…" : "重新开始"}
            </button>
          </section>
        )}

        <aside className="gameplay-debug" aria-label="原型调试数据">
          <span>TIME {snapshot.songTime.toFixed(3)}</span>
          <span>P {snapshot.perfect}</span>
          <span>G {snapshot.good}</span>
          <span>M {snapshot.miss}</span>
        </aside>
      </div>
    </main>
  );
}
