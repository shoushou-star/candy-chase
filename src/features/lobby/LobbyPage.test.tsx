import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_LOBBY_STATE } from "./lobby-data";
import { LobbyPage } from "./LobbyPage";
import type { LobbyAction } from "./types";

describe("LobbyPage", () => {
  it("shows the default player and balances without turning the profile into a button", () => {
    render(<LobbyPage state={DEFAULT_LOBBY_STATE} assetsReady />);

    expect(screen.getByRole("main", { name: "游戏大厅" })).toBeInTheDocument();
    expect(screen.getByText("Player")).toBeInTheDocument();
    expect(screen.getByText("Lv. 12")).toBeInTheDocument();
    expect(screen.getByText("623736")).toBeInTheDocument();
    expect(screen.getByText("2311")).toBeInTheDocument();
    expect(screen.getByText("2139")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Player/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("有未读邮件")).not.toBeInTheDocument();
  });

  it("exposes every agreed entrance as one uniquely named semantic button", () => {
    render(<LobbyPage state={DEFAULT_LOBBY_STATE} assetsReady />);

    const names = screen.getAllByRole("button").map((button) =>
      button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "",
    );

    expect(names).toEqual([
      "增加金币",
      "增加能量",
      "增加宝石",
      "打开设置",
      "开始游戏",
      "打开歌曲",
      "打开挑战",
      "打开角色",
      "打开每日挑战",
      "打开邮件",
      "打开礼物",
      "打开排行榜",
    ]);
    expect(new Set(names).size).toBe(names.length);
  });

  it("reports the exact action for pointer activation", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn<(action: LobbyAction) => void>();
    render(<LobbyPage state={DEFAULT_LOBBY_STATE} assetsReady onAction={onAction} />);
    const cases: Array<[string, LobbyAction]> = [
      ["增加金币", "coins"], ["增加能量", "energy"], ["增加宝石", "gems"],
      ["打开设置", "settings"], ["开始游戏", "play"], ["打开歌曲", "songs"],
      ["打开挑战", "challenges"], ["打开角色", "hero"], ["打开每日挑战", "daily"],
      ["打开邮件", "mail"], ["打开礼物", "gift"], ["打开排行榜", "crown"],
    ];

    for (const [name] of cases) await user.click(screen.getByRole("button", { name }));

    expect(onAction.mock.calls.map(([action]) => action)).toEqual(cases.map(([, action]) => action));
  });

  it("exposes dedicated HERO and PLAY navigation callbacks", async () => {
    const user = userEvent.setup();
    const onOpenHeroSelect = vi.fn();
    const onPlay = vi.fn();
    render(
      <LobbyPage
        state={DEFAULT_LOBBY_STATE}
        assetsReady
        onOpenHeroSelect={onOpenHeroSelect}
        onPlay={onPlay}
      />,
    );

    await user.click(screen.getByRole("button", { name: "打开角色" }));
    await user.click(screen.getByRole("button", { name: "开始游戏" }));

    expect(onOpenHeroSelect).toHaveBeenCalledOnce();
    expect(onPlay).toHaveBeenCalledOnce();
  });

  it("keeps a visible click animation active after a quick pointer click", async () => {
    const user = userEvent.setup();
    render(<LobbyPage state={DEFAULT_LOBBY_STATE} assetsReady />);
    const play = screen.getByRole("button", { name: "开始游戏" });
    const coins = screen.getByRole("button", { name: "增加金币" });

    await user.click(play);
    expect(play).toHaveClass("is-click-animating");

    await user.click(coins);
    expect(coins).toHaveClass("is-click-animating");
  });

  it("uses native Enter and Space activation for keyboard users", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn<(action: LobbyAction) => void>();
    render(<LobbyPage state={DEFAULT_LOBBY_STATE} assetsReady onAction={onAction} />);
    const play = screen.getByRole("button", { name: "开始游戏" });

    play.focus();
    await user.keyboard("{Enter}");
    await user.keyboard("[Space]");

    expect(onAction).toHaveBeenNthCalledWith(1, "play");
    expect(onAction).toHaveBeenNthCalledWith(2, "play");
  });

  it("shows the unread indicator only when mail state says it exists", () => {
    const { rerender } = render(<LobbyPage state={DEFAULT_LOBBY_STATE} assetsReady />);
    expect(screen.queryByLabelText("有未读邮件")).not.toBeInTheDocument();

    rerender(
      <LobbyPage state={{ ...DEFAULT_LOBBY_STATE, hasUnreadMail: true }} assetsReady />,
    );

    expect(screen.getByLabelText("有未读邮件")).toBeInTheDocument();
  });

  it("keeps the composition hidden while critical assets are loading", () => {
    render(<LobbyPage state={DEFAULT_LOBBY_STATE} assetsReady={false} />);

    expect(screen.getByRole("main", { name: "游戏大厅" })).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
