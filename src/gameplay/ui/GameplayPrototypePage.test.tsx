import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionSnapshot } from "../domain/RhythmSession";
import { GameplayPrototypePage } from "./GameplayPrototypePage";

const start = vi.fn(async () => undefined);
const restart = vi.fn(async () => undefined);
const destroy = vi.fn();
let subscriber: ((snapshot: SessionSnapshot) => void) | null = null;

vi.mock("../render/createGameplayGame", () => ({
  createGameplayGame: () => ({
    start,
    restart,
    destroy,
    subscribe: (listener: (snapshot: SessionSnapshot) => void) => {
      subscriber = listener;
      return () => {
        subscriber = null;
      };
    },
  }),
}));

const completeSnapshot: SessionSnapshot = {
  status: "complete",
  songTime: 45,
  combo: 0,
  maxCombo: 12,
  perfect: 24,
  good: 4,
  miss: 2,
  repairPercent: 88,
  activeHoldId: null,
  resolvedEventIds: [],
  lastOutcome: null,
  result: {
    perfect: 24,
    good: 4,
    miss: 2,
    maxCombo: 12,
    repairPercent: 88,
    title: "全场点亮",
  },
};

describe("GameplayPrototypePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscriber = null;
  });

  it("renders a direct gameplay start surface and starts from a user gesture", async () => {
    const user = userEvent.setup();
    render(<GameplayPrototypePage />);

    expect(screen.getByRole("main", { name: "糖果追击玩法原型" })).toBeInTheDocument();
    expect(screen.getByText(/空格键、鼠标左键或触摸/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "开始节奏测试" }));
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("shows the final result and restarts through the gameplay controller", async () => {
    const user = userEvent.setup();
    render(<GameplayPrototypePage />);

    act(() => subscriber?.(completeSnapshot));

    expect(screen.getByRole("heading", { name: "全场点亮" })).toBeInTheDocument();
    expect(screen.getByText("88%" )).toBeInTheDocument();
    expect(screen.getByText("24", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("12", { selector: "strong" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "重新开始" }));
    expect(restart).toHaveBeenCalledTimes(1);
  });
});
