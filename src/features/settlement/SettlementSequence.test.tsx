import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
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

  it("covers the static result background until the browser presents the first intro frame", async () => {
    const callbacks = new Map<HTMLVideoElement, VideoFrameRequestCallback>();
    const request = vi.fn(function (this: HTMLVideoElement, callback: VideoFrameRequestCallback) { callbacks.set(this, callback); return 7; });
    Object.defineProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback', { configurable: true, value: request });
    Object.defineProperty(HTMLVideoElement.prototype, 'cancelVideoFrameCallback', { configurable: true, value: vi.fn() });
    const view = render(<SettlementSequence {...result} />);
    try {
      expect(screen.getByTestId('settlement-media')).toHaveAttribute('data-frame-ready', 'false');
      fireEvent.loadedData(screen.getByLabelText('结算开场动画'));
      expect(screen.getByTestId('settlement-media')).toHaveAttribute('data-frame-ready', 'false');
      const intro = screen.getByLabelText('结算开场动画') as HTMLVideoElement;
      await act(async () => callbacks.get(intro)!(0, {} as VideoFrameCallbackMetadata));
      expect(screen.getByTestId('settlement-media')).toHaveAttribute('data-frame-ready', 'true');
    } finally {
      view.unmount();
      delete (HTMLVideoElement.prototype as Partial<HTMLVideoElement>).requestVideoFrameCallback;
      delete (HTMLVideoElement.prototype as Partial<HTMLVideoElement>).cancelVideoFrameCallback;
    }
  });

  it("uses loadeddata only as the first-frame fallback for browsers without frame callbacks", () => {
    render(<SettlementSequence {...result} />);
    expect(screen.getByTestId('settlement-media')).toHaveAttribute('data-frame-ready', 'false');
    fireEvent.loadedData(screen.getByLabelText('结算循环动画'));
    expect(screen.getByTestId('settlement-media')).toHaveAttribute('data-frame-ready', 'false');
    fireEvent.loadedData(screen.getByLabelText('结算开场动画'));
    expect(screen.getByTestId('settlement-media')).toHaveAttribute('data-frame-ready', 'true');
  });

  it("reveals the UI at 2.75 seconds while keeping actions locked", () => {
    render(<SettlementSequence {...result} />);
    const intro = screen.getByLabelText("结算开场动画") as HTMLVideoElement;
    const ui = screen.getByTestId("settlement-ui");

    intro.currentTime = 2.74;
    fireEvent.timeUpdate(intro);
    expect(ui).not.toHaveClass("settlement-ui--visible");

    intro.currentTime = 2.75;
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

    intro.currentTime = 3.89;
    fireEvent.timeUpdate(intro);
    expect(media).not.toHaveClass("settlement-media--crossfading");
    expect(play).not.toHaveBeenCalled();

    intro.currentTime = 3.9;
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

  // jsdom cannot decode media. These deferred requests preserve the observable
  // playing/paused consequence so the tests catch detached playback, not spy counts.
  function pendingPlay() {
    let resolve!: () => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
  }

  function trackMedia() {
    const playing = new Set<HTMLMediaElement>();
    pause.mockImplementation(function (this: HTMLMediaElement) { playing.delete(this); });
    return playing;
  }

  function expectUsableResults() {
    expect(screen.getByTestId("settlement-ui")).toHaveClass("settlement-ui--visible");
    expect(screen.getByRole("button", { name: "重新挑战" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "继续" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "播放结算动画" })).not.toBeInTheDocument();
  }

  for (const event of ["error", "ended"] as const) {
    it(`preserves usable results after ${event} followed by a late initial rejection`, async () => {
      const pending = pendingPlay();
      play.mockReturnValueOnce(pending.promise);
      const retry = vi.fn();
      const next = vi.fn();
      render(<SettlementSequence {...result} onRetry={retry} onNext={next} />);
      fireEvent[event](screen.getByLabelText("结算开场动画"));
      await act(async () => pending.reject(new DOMException("decode failure", "NotSupportedError")));
      expectUsableResults();
      fireEvent.click(screen.getByRole("button", { name: "重新挑战" }));
      fireEvent.click(screen.getByRole("button", { name: "继续" }));
      expect(retry).toHaveBeenCalledOnce();
      expect(next).toHaveBeenCalledOnce();
    });
  }

  for (const outcome of ["resolve", "reject"] as const) {
    it(`preserves usable results after error while gesture play later ${outcome}s`, async () => {
      const pending = pendingPlay();
      play.mockRejectedValueOnce(new DOMException("policy", "NotAllowedError"));
      play.mockReturnValueOnce(pending.promise);
      render(<SettlementSequence {...result} />);
      fireEvent.click(await screen.findByRole("button", { name: "播放结算动画" }));
      fireEvent.error(screen.getByLabelText("结算开场动画"));
      await act(async () => outcome === "resolve" ? pending.resolve() : pending.reject(new DOMException("policy", "NotAllowedError")));
      expectUsableResults();
    });
  }

  it("falls forward on current decode rejection rather than asking for a gesture", async () => {
    play.mockRejectedValueOnce(new DOMException("decode", "NotSupportedError"));
    render(<SettlementSequence {...result} />);
    await waitFor(expectUsableResults);
  });

  it("does not hide revealed results when a late policy rejection arrives", async () => {
    const pending = pendingPlay();
    play.mockReturnValueOnce(pending.promise);
    render(<SettlementSequence {...result} />);
    const intro = screen.getByLabelText("结算开场动画") as HTMLVideoElement;
    intro.currentTime = 2.75;
    fireEvent.timeUpdate(intro);
    await act(async () => pending.reject(new DOMException("policy", "NotAllowedError")));
    expect(screen.getByTestId("settlement-ui")).toHaveClass("settlement-ui--visible");
    fireEvent.ended(intro);
    expectUsableResults();
  });

  for (const target of ["intro", "loop"] as const) {
    it(`stops and resets detached ${target} after pending play resolves`, async () => {
      const pending = pendingPlay();
      const playing = trackMedia();
      play.mockImplementation(function (this: HTMLMediaElement) {
        const media = this;
        return (media.getAttribute("aria-label") === (target === "intro" ? "结算开场动画" : "结算循环动画") ? pending.promise : Promise.resolve())
          .then(() => { playing.add(media); });
      });
      const view = render(<SettlementSequence {...result} />);
      const intro = screen.getByLabelText("结算开场动画") as HTMLVideoElement;
      const loop = screen.getByLabelText("结算循环动画") as HTMLVideoElement;
      if (target === "loop") fireEvent.ended(intro);
      intro.currentTime = 4;
      loop.currentTime = 1;
      view.unmount();
      await act(async () => pending.resolve());
      expect(intro.isConnected).toBe(false);
      expect(loop.isConnected).toBe(false);
      expect(playing.size).toBe(0);
      expect(intro.currentTime).toBe(0);
      expect(loop.currentTime).toBe(0);
    });
  }

  it("ignores an old StrictMode request without stopping the current intro", async () => {
    const first = pendingPlay();
    const second = pendingPlay();
    const playing = trackMedia();
    let count = 0;
    play.mockImplementation(function (this: HTMLMediaElement) {
      const media = this;
      return (++count === 1 ? first.promise : second.promise).then(() => { playing.add(media); });
    });
    render(<StrictMode><SettlementSequence {...result} /></StrictMode>);
    const intro = screen.getByLabelText("结算开场动画") as HTMLVideoElement;
    await act(async () => second.resolve());
    intro.currentTime = 1;
    await act(async () => first.resolve());
    expect(playing.has(intro)).toBe(true);
    expect(intro.currentTime).toBe(1);
    intro.currentTime = 2.75;
    fireEvent.timeUpdate(intro);
    expect(screen.getByTestId("settlement-ui")).toHaveClass("settlement-ui--visible");
    fireEvent.ended(intro);
    expectUsableResults();
  });

  it("ignores StrictMode's old policy rejection while the current intro progresses", async () => {
    const first = pendingPlay();
    play.mockReturnValueOnce(first.promise);
    render(<StrictMode><SettlementSequence {...result} /></StrictMode>);
    const intro = screen.getByLabelText("结算开场动画") as HTMLVideoElement;
    await act(async () => first.reject(new DOMException("policy", "NotAllowedError")));
    expect(screen.queryByRole("button", { name: "播放结算动画" })).not.toBeInTheDocument();
    intro.currentTime = 2.75;
    fireEvent.timeUpdate(intro);
    expect(screen.getByTestId("settlement-ui")).toHaveClass("settlement-ui--visible");
    fireEvent.ended(intro);
    expectUsableResults();
  });

  it("keeps a replacement settlement usable when a detached loop request rejects", async () => {
    const oldLoop = pendingPlay();
    play.mockResolvedValueOnce(undefined).mockReturnValueOnce(oldLoop.promise);
    const old = render(<SettlementSequence {...result} />);
    fireEvent.ended(screen.getByLabelText("结算开场动画"));
    old.unmount();
    render(<SettlementSequence {...result} />);
    fireEvent.ended(screen.getByLabelText("结算开场动画"));
    await act(async () => oldLoop.reject(new DOMException("decode", "NotSupportedError")));
    expectUsableResults();
    expect(screen.getByTestId("settlement-media")).toHaveClass("settlement-media--looping");
  });

  it("stops an old StrictMode intro success after the current effect has recovered from error", async () => {
    const first = pendingPlay();
    const playing = trackMedia();
    let count = 0;
    play.mockImplementation(function (this: HTMLMediaElement) {
      const media = this;
      return (++count === 1 ? first.promise : Promise.resolve()).then(() => { playing.add(media); });
    });
    render(<StrictMode><SettlementSequence {...result} /></StrictMode>);
    const intro = screen.getByLabelText("结算开场动画") as HTMLVideoElement;
    await act(async () => {});
    fireEvent.error(intro);
    await act(async () => first.resolve());
    expectUsableResults();
    expect(playing.has(intro)).toBe(false);
    expect(playing.has(screen.getByLabelText("结算循环动画") as HTMLVideoElement)).toBe(true);
  });
});
