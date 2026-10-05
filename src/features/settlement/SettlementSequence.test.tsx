import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettlementSequence } from "./SettlementSequence";

const result = {
  score: 8200, stars: 4, perfect: 60, good: 15, miss: 5, maxCombo: 40,
  onRetry: () => undefined, onNext: () => undefined,
};

describe("settlement video sequence", () => {
  const play = vi.fn<() => Promise<void>>();
  const pause = vi.fn<() => void>();

  beforeEach(() => {
    play.mockReset();
    pause.mockReset();
    play.mockResolvedValue(undefined);
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: play,
    });
    Object.defineProperty(HTMLMediaElement.prototype, "pause", {
      configurable: true,
      value: pause,
    });
  });

  it("starts with the audible intro above a muted preloaded loop", () => {
    render(<SettlementSequence {...result} />);

    const intro = screen.getByLabelText("结算开场动画") as HTMLVideoElement;
    const loop = screen.getByLabelText("结算循环动画") as HTMLVideoElement;

    expect(intro.muted).toBe(false);
    expect(intro.loop).toBe(false);
    expect(loop.muted).toBe(true);
    expect(loop.loop).toBe(true);
    expect(loop.preload).toBe("auto");
  });

  it("reveals the UI at 2.75 seconds while keeping actions locked", () => {
    render(<SettlementSequence {...result} />);
    const intro = screen.getByLabelText("结算开场动画") as HTMLVideoElement;
    const ui = screen.getByTestId("settlement-ui");

    Object.defineProperty(intro, "currentTime", { configurable: true, value: 2.74 });
    fireEvent.timeUpdate(intro);
    expect(ui).not.toHaveClass("settlement-ui--visible");

    Object.defineProperty(intro, "currentTime", { configurable: true, value: 2.75 });
    fireEvent.timeUpdate(intro);
    expect(ui).toHaveClass("settlement-ui--visible");
    expect(screen.getByRole("button", { name: "重新挑战" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "继续" })).toBeDisabled();
  });

  it("primes the muted loop at 3.9 seconds and enables actions only after the intro ends", () => {
    render(<SettlementSequence {...result} />);
    const intro = screen.getByLabelText("结算开场动画") as HTMLVideoElement;
    const media = screen.getByTestId("settlement-media");
    play.mockClear();

    Object.defineProperty(intro, "currentTime", { configurable: true, value: 3.89 });
    fireEvent.timeUpdate(intro);
    expect(media).not.toHaveClass("settlement-media--crossfading");
    expect(play).not.toHaveBeenCalled();

    Object.defineProperty(intro, "currentTime", { configurable: true, value: 3.9 });
    fireEvent.timeUpdate(intro);
    expect(media).toHaveClass("settlement-media--crossfading");
    expect(play).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "重新挑战" })).toBeDisabled();

    fireEvent.ended(intro);
    expect(media).toHaveClass("settlement-media--looping");
    expect(screen.getByRole("button", { name: "重新挑战" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "继续" })).toBeEnabled();
  });

  it("falls forward to the muted loop and usable UI when the intro fails", () => {
    render(<SettlementSequence {...result} />);
    const intro = screen.getByLabelText("结算开场动画") as HTMLVideoElement;

    fireEvent.error(intro);

    expect(screen.getByTestId("settlement-ui")).toHaveClass("settlement-ui--visible");
    expect(screen.getByTestId("settlement-media")).toHaveClass("settlement-media--looping");
    expect(screen.getByRole("button", { name: "重新挑战" })).toBeEnabled();
  });

  it("keeps the intro queued and requests a user gesture when audible autoplay is blocked", async () => {
    play.mockRejectedValueOnce(new DOMException("Autoplay blocked", "NotAllowedError"));
    render(<SettlementSequence {...result} />);

    const intro = screen.getByLabelText("结算开场动画") as HTMLVideoElement;
    const media = screen.getByTestId("settlement-media");
    const ui = screen.getByTestId("settlement-ui");
    const startButton = await screen.findByRole("button", { name: "播放结算动画" });

    expect(media).not.toHaveClass("settlement-media--looping");
    expect(ui).not.toHaveClass("settlement-ui--visible");
    expect(intro.muted).toBe(false);

    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "播放结算动画" })).not.toBeInTheDocument();
    });
    expect(intro.currentTime).toBe(0);
    expect(media).not.toHaveClass("settlement-media--looping");
    expect(ui).not.toHaveClass("settlement-ui--visible");
  });
});
