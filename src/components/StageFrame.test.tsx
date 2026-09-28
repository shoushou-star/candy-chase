import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../styles/global.css";
import { getStageScale, StageFrame } from "./StageFrame";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getStageScale", () => {
  it("fits a fixed 2048 by 1152 stage to common viewport sizes", () => {
    expect(getStageScale(2048, 1152)).toBe(1);
    expect(getStageScale(1920, 1080)).toBe(0.9375);
    expect(getStageScale(1280, 720)).toBe(0.625);
    expect(getStageScale(1200, 1000)).toBeCloseTo(1200 / 2048);
  });
});

describe("StageFrame", () => {
  it("exposes a fixed-size, labelled logical game area", () => {
    render(<StageFrame>Game content</StageFrame>);

    const stage = screen.getByRole("region", { name: "游戏画面" });
    expect(stage).toHaveStyle({ width: "2048px", height: "1152px" });
    expect(stage).toHaveTextContent("Game content");
  });

  it("positions the stage from the viewport center before scaling", () => {
    render(<StageFrame />);

    const stage = screen.getByRole("region", { name: "游戏画面" });
    const stageStyle = getComputedStyle(stage);
    expect(stageStyle.position).toBe("absolute");
    expect(stageStyle.left).toBe("50%");
    expect(stageStyle.top).toBe("50%");
    expect(stageStyle.translate).toBe("-50% -50%");
  });

  it("updates scale on viewport resize and removes its listener on unmount", () => {
    vi.stubGlobal("innerWidth", 1920);
    vi.stubGlobal("innerHeight", 1080);
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<StageFrame />);
    const viewport = screen.getByRole("region", { name: "游戏画面" }).parentElement;

    expect(viewport).toHaveStyle("--stage-scale: 0.9375");

    vi.stubGlobal("innerWidth", 1400);
    vi.stubGlobal("innerHeight", 900);
    act(() => window.dispatchEvent(new Event("resize")));
    expect(viewport).toHaveStyle(`--stage-scale: ${1400 / 2048}`);

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});
