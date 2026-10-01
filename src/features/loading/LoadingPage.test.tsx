import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoadingPage } from "./LoadingPage";

afterEach(() => vi.restoreAllMocks());

describe("LoadingPage", () => {
  it("renders one shared progress value across the visual and accessible UI", () => {
    render(<LoadingPage progress={50} />);

    const page = screen.getByRole("main", { name: "游戏加载" });
    const progressbar = screen.getByRole("progressbar", { name: "游戏加载进度" });

    expect(page).toHaveStyle("--loading-progress: 0.5");
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "100");
    expect(progressbar).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "CLICK TO START" })).not.toBeInTheDocument();
  });

  it("turns the completed progress bar into the start-game action", async () => {
    const user = userEvent.setup();
    const onStartGame = vi.fn();
    render(<LoadingPage progress={100} onStartGame={onStartGame} />);

    const startGame = screen.getByRole("button", { name: "CLICK TO START" });
    expect(startGame).toHaveTextContent("CLICK TO START");
    expect(screen.queryByRole("progressbar", { name: "游戏加载进度" })).not.toBeInTheDocument();

    await user.click(startGame);
    expect(onStartGame).toHaveBeenCalledOnce();
  });

  it("keeps the five Figma corner controls decorative in this phase", () => {
    render(<LoadingPage progress={100} />);
    expect(screen.getAllByTestId("loading-control")).toHaveLength(5);
  });

  it("starts the audible intro after a click, then switches to the muted loop", async () => {
    const user = userEvent.setup();
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    render(<LoadingPage progress={50} />);

    const intro = screen.getByTestId("loading-intro-video");
    const loop = screen.getByTestId("loading-loop-video");
    expect(intro).toHaveProperty("muted", false);
    expect(loop).toHaveProperty("muted", true);
    expect(loop).toHaveAttribute("loop");

    await user.click(screen.getByRole("button", { name: "开始加载" }));
    expect(play).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "开始加载" })).not.toBeInTheDocument();

    fireEvent.ended(intro);
    await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
    expect(loop).toHaveClass("loading-page__video--active");
  });

  it("keeps the start control visible when audible playback is rejected", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new DOMException("Playback blocked", "NotAllowedError"));
    render(<LoadingPage progress={0} />);

    await user.click(screen.getByRole("button", { name: "开始加载" }));
    expect(screen.getByRole("button", { name: "重新开始" })).toBeInTheDocument();
    expect(screen.getByText("浏览器未能播放声音，请再次点击")).toBeInTheDocument();
  });
});
