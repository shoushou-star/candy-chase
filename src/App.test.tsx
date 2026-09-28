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
