import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HEROES } from "./features/hero-select/heroes";
import { useHeroAssets } from "./features/hero-select/useHeroAssets";
import { App } from "./App";

vi.mock("./features/hero-select/useHeroAssets", () => ({
  useHeroAssets: vi.fn(() => ({
    nibby: "ready",
    piko: "ready",
    mira: "ready",
    riff: "ready",
    bongo: "ready",
  })),
}));

describe("App", () => {
  beforeEach(() => vi.clearAllMocks());

  it("starts on the hero selection page", () => {
    render(<App />);
    const stage = screen.getByRole("region", { name: "游戏画面" });
    expect(within(stage).getByRole("main", { name: "角色选择" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择 PIKO" })).toHaveAttribute("aria-pressed", "true");
    expect(useHeroAssets).toHaveBeenCalledExactlyOnceWith(HEROES);
  });

  it("preserves the selected hero through Back, home, and re-entry", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "选择 RIFF" }));
    await user.click(screen.getByRole("button", { name: "返回首页" }));
    const stage = screen.getByRole("region", { name: "游戏画面" });
    expect(within(stage).getByRole("main", { name: "临时首页" })).toBeInTheDocument();
    expect(within(stage).getByText(/RIFF/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "进入角色选择" }));
    expect(within(stage).getByRole("main", { name: "角色选择" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择 RIFF" })).toHaveAttribute("aria-pressed", "true");
  });

  it("confirms Riff before showing the game page and retains selection on return", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "选择 RIFF" }));
    await user.click(screen.getByRole("button", { name: "确认选择 RIFF" }));
    const stage = screen.getByRole("region", { name: "游戏画面" });
    expect(within(stage).getByRole("main", { name: "游戏占位页" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "RIFF 已准备就绪" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "RIFF角色卡" })).toBeInTheDocument();
    expect(screen.getByText("游戏内容正在开发中")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "返回角色选择" }));
    expect(within(stage).getByRole("main", { name: "角色选择" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择 RIFF" })).toHaveAttribute("aria-pressed", "true");
  });

  it("settles rapid next and previous input on the mathematically correct hero", async () => {
    const user = userEvent.setup();
    render(<App />);
    const next = screen.getByRole("button", { name: "下一位角色" });
    const previous = screen.getByRole("button", { name: "上一位角色" });
    await user.click(next);
    await user.click(next);
    await user.click(next);
    await user.click(previous);
    expect(screen.getByRole("button", { name: "选择 RIFF" })).toHaveAttribute("aria-pressed", "true");
  });

  it("does not enter the game when the selected hero asset failed", async () => {
    vi.mocked(useHeroAssets).mockReturnValueOnce({
      nibby: "ready", piko: "error", mira: "ready", riff: "ready", bongo: "ready",
    });
    const user = userEvent.setup();
    render(<App />);
    const confirm = screen.getByRole("button", { name: "确认选择 PIKO" });
    expect(confirm).toBeDisabled();
    await user.click(confirm);
    expect(screen.getByRole("main", { name: "角色选择" })).toBeInTheDocument();
    expect(screen.queryByRole("main", { name: "游戏占位页" })).not.toBeInTheDocument();
  });

  it("allows a ready hero to be confirmed when another hero failed", async () => {
    vi.mocked(useHeroAssets).mockReturnValueOnce({
      nibby: "ready", piko: "error", mira: "ready", riff: "ready", bongo: "ready",
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "选择 RIFF" }));
    await user.click(screen.getByRole("button", { name: "确认选择 RIFF" }));
    expect(screen.getByRole("heading", { name: "RIFF 已准备就绪" })).toBeInTheDocument();
  });

  it("keeps modal background controls from changing state or focus restoration", async () => {
    const user = userEvent.setup();
    render(<App />);
    const originalTrigger = screen.getByRole("button", { name: "打开金币商店" });
    await user.click(originalTrigger);
    await user.click(screen.getByRole("button", { name: "选择 RIFF" }));
    await user.click(screen.getByRole("button", { name: "打开体力商店" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "选择 PIKO" })).toHaveAttribute("aria-pressed", "true");
    expect(originalTrigger).toHaveFocus();
  });

  it("gives every hero-selection button a unique accessible name", () => {
    render(<App />);
    const names = screen.getAllByRole("button").map((button) =>
      button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "",
    );
    expect(names).not.toContain("");
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(["金币", "体力", "宝石"])("returns focus to the %s plus button after Escape", async (name) => {
    const user = userEvent.setup();
    render(<App />);
    const trigger = screen.getByRole("button", { name: `打开${name}商店` });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "商店功能暂未开放" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByText("商店功能暂未开放")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "知道了" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
