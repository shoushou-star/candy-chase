import type { ReactNode } from "react";
import backgroundUrl from "../../assets/settlement/background.png";
import crownUrl from "../../assets/settlement/crown.svg";
import goodNoteUrl from "../../assets/settlement/good-note.svg";
import missNoteUrl from "../../assets/settlement/miss-note.svg";
import nextIconUrl from "../../assets/settlement/next.svg";
import perfectNoteUrl from "../../assets/settlement/perfect-note.svg";
import recordCrownUrl from "../../assets/settlement/record-crown.svg";
import retryIconUrl from "../../assets/settlement/retry.svg";
import stageClearUrl from "../../assets/settlement/stage-clear.png";
import starUrl from "../../assets/settlement/star-lit.png";
import "../../styles/settlement.css";

const TOTAL_STARS = 5;
const STAR_POSITIONS = [
  { left: 1015, top: 151, size: 204 },
  { left: 1183, top: 133, size: 216 },
  { left: 1358, top: 121, size: 224 },
  { left: 1539, top: 133, size: 216 },
  { left: 1715, top: 151, size: 204 },
] as const;
const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export interface SettlementPageProps {
  score: number;
  stars: number;
  perfect: number;
  good: number;
  miss: number;
  maxCombo: number;
  isNewRecord?: boolean;
  mediaLayer?: ReactNode;
  isUiVisible?: boolean;
  actionsEnabled?: boolean;
  onRetry: () => void;
  onNext: () => void;
}

interface ResultCardProps {
  accent: "perfect" | "good" | "miss";
  iconUrl: string;
  label: string;
  left: number;
  value: number;
}

function normalizeCount(value: number): number {
  return Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0));
}

function formatCount(value: number): string {
  return numberFormatter.format(normalizeCount(value));
}

function ResultCard({ accent, iconUrl, label, left, value }: ResultCardProps) {
  return (
    <article
      className={`settlement-stat settlement-stat--${accent}`}
      aria-label={`${label} ${formatCount(value)}`}
      style={{ left, top: 320, width: 272, height: 142 }}
    >
      <img aria-hidden="true" className="settlement-stat__icon" src={iconUrl} alt="" />
      <p className="settlement-stat__label">{label}</p>
      <p className="settlement-stat__value">{formatCount(value)}</p>
    </article>
  );
}

export function SettlementPage({
  score,
  stars,
  perfect,
  good,
  miss,
  maxCombo,
  isNewRecord = false,
  mediaLayer,
  isUiVisible = true,
  actionsEnabled = true,
  onRetry,
  onNext,
}: SettlementPageProps) {
  const earnedStars = Math.min(TOTAL_STARS, normalizeCount(stars));
  const formattedScore = formatCount(score);
  const scoreFontSize = formattedScore.length > 10 ? 52 : formattedScore.length > 8 ? 70 : 98;

  return (
    <main className="settlement-page" aria-label="关卡结算">
      <img aria-hidden="true" className="settlement-page__background" src={backgroundUrl} alt="" />
      {mediaLayer}
      <div aria-hidden="true" className="settlement-page__vignette" />

      <div
        aria-hidden={!isUiVisible}
        className={`settlement-ui${isUiVisible ? " settlement-ui--visible" : ""}`}
        data-testid="settlement-ui"
      >
        <img
          className="settlement-title"
          data-testid="stage-clear-art"
          style={{ left: 73, top: 38, width: 631, height: 355 }}
          src={stageClearUrl}
          alt="STAGE CLEAR! GREAT MUSIC! KEEP GOING!"
        />

        <div className="settlement-stars" role="img" aria-label={`获得 ${earnedStars} 颗星，共 ${TOTAL_STARS} 颗`}>
        {Array.from({ length: TOTAL_STARS }, (_, index) => {
          const earned = index < earnedStars;
          const position = STAR_POSITIONS[index];
          return (
            <img
              aria-hidden="true"
              className={`settlement-stars__star${earned ? " settlement-stars__star--earned" : " settlement-stars__star--empty"}`}
              data-testid={earned ? "earned-star" : "empty-star"}
              key={index}
              src={starUrl}
              alt=""
              style={{
                left: position.left,
                top: position.top,
                width: position.size,
                height: position.size,
                "--star-index": index,
              } as React.CSSProperties}
            />
          );
        })}
        </div>

        <section
        className="settlement-results"
        data-testid="results-panel"
        aria-label="结算成绩"
        style={{ left: 1000, top: 232, width: 934, height: 620 }}
      >
        <section className="settlement-score" aria-label={`得分 ${formattedScore}`}>
          <div className="settlement-score__heading">
            <span>SCORE</span>
          </div>
          <p className="settlement-score__value" style={{ fontSize: scoreFontSize }}>{formattedScore}</p>
          {isNewRecord && (
            <div className="settlement-record" role="status" style={{ left: 692, top: 168, width: 290, height: 116 }}>
              <div className="settlement-record__badge">
                <img aria-hidden="true" src={recordCrownUrl} alt="" />
                <span>NEW RECORD!</span>
              </div>
            </div>
          )}
        </section>

        <section className="settlement-stats" aria-label="判定统计">
          <ResultCard accent="perfect" iconUrl={perfectNoteUrl} label="PERFECT" left={30} value={perfect} />
          <ResultCard accent="good" iconUrl={goodNoteUrl} label="GOOD" left={331} value={good} />
          <ResultCard accent="miss" iconUrl={missNoteUrl} label="MISS" left={632} value={miss} />
        </section>

        <section
          className="settlement-combo"
          aria-label={`最大连击 ${formatCount(maxCombo)}`}
          style={{ left: 30, top: 490, width: 874, height: 100 }}
        >
          <img aria-hidden="true" src={crownUrl} alt="" />
          <span>MAX COMBO</span>
          <strong>{formatCount(maxCombo)}</strong>
        </section>

        </section>

        <div className="settlement-actions" aria-label="结算操作">
        <button
          className="settlement-action settlement-action--retry"
          type="button"
          disabled={!actionsEnabled}
          onClick={onRetry}
          aria-label="重新挑战"
          style={{ left: 996, top: 882, width: 460, height: 140 }}
        >
          <img aria-hidden="true" src={retryIconUrl} alt="" />
          <span>RETRY</span>
        </button>
        <button
          className="settlement-action settlement-action--next"
          type="button"
          disabled={!actionsEnabled}
          onClick={onNext}
          aria-label="继续"
          style={{ left: 1468, top: 882, width: 470, height: 140 }}
        >
          <img aria-hidden="true" src={nextIconUrl} alt="" />
          <span>NEXT</span>
        </button>
        </div>
      </div>
    </main>
  );
}
