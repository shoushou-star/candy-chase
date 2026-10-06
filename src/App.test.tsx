import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaySessionProps } from "./features/game-flow/PlaySession";
import type { RhythmGameResult } from "./features/game-flow/result";
import { useHeroAssets } from "./features/hero-select/useHeroAssets";
import { HeroSelectExperience } from "./features/hero-select/HeroSelectExperience";
import { App } from "./App";

// Retain the real session, while allowing delayed callbacks from an obsolete run.
const sessionCallbacks = vi.hoisted(() => [] as PlaySessionProps[]);
vi.mock("./features/game-flow/PlaySession", async (importOriginal) => {
  const original = await importOriginal<typeof import("./features/game-flow/PlaySession")>();
  return { PlaySession: (props: PlaySessionProps) => {
    sessionCallbacks.push(props);
    return <original.PlaySession {...props} />;
  } };
});

vi.mock("./features/hero-select/useHeroAssets", () => ({
  useHeroAssets: vi.fn(() => ({
    nibby: "ready",
    piko: "ready",
    mira: "ready",
    riff: "ready",
    bongo: "ready",
  })),
}));

vi.mock("./features/loading/useLoadingProgress", () => ({
  useLoadingProgress: vi.fn(() => 100),
}));

vi.mock("./features/lobby/useLobbyAssets", () => ({
  useLobbyAssets: vi.fn(() => "ready"),
}));

async function waitForTransition() {
  await waitFor(() => {
    expect(screen.getByTestId("screen-transition")).toHaveAttribute("data-phase", "idle");
  });
}

const gameResult: RhythmGameResult = {
  finalScore: 1234, maxCombo: 50, perfect: 61, good: 15, miss: 4,
  accuracy: 90, repairPercent: 70, starRating: 4, totalNotes: 80, judgedNotes: 80,
};

function currentFrame() {
  return screen.getByTitle("节奏游戏") as HTMLIFrameElement;
}

function frameRunId(frame: HTMLIFrameElement) {
  return Number(new URL(frame.src).searchParams.get("runId"));
}

function gameMessage(frame: HTMLIFrameElement, type: "ready" | "complete", result = gameResult) {
  fireEvent(window, new MessageEvent("message", {
    origin: location.origin, source: frame.contentWindow,
    data: { type: `rhythmgame:${type}`, runId: frameRunId(frame), result },
  }));
}

async function openConfirmedGame() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "CLICK TO START" }));
  await waitForTransition();
  await user.click(screen.getByRole("button", { name: "打开角色" }));
  await waitForTransition();
  await user.click(screen.getByRole("button", { name: "确认选择 PIKO" }));
  await user.click(screen.getByRole("button", { name: "继续选角色" }));
  await user.click(screen.getByRole("button", { name: "返回首页" }));
  await waitForTransition();
  // Two synchronous inputs must allocate just one run.
  const play = screen.getByRole("button", { name: "开始游戏" });
  fireEvent.click(play);
  fireEvent.click(play);
  await waitForTransition();
  expect(frameRunId(currentFrame())).toBe(1);
  return user;
}

function activateGame() {
  const frame = currentFrame();
  gameMessage(frame, "ready");
  const video = screen.queryByLabelText("游戏开场视频");
  if (video) fireEvent.ended(video);
  return frame;
}

async function settleGame(score = 1234) {
  const frame = activateGame();
  gameMessage(frame, "complete", { ...gameResult, finalScore: score });
  await waitForTransition();
  expect(screen.getByRole("main", { name: "关卡结算" })).toBeInTheDocument();
  fireEvent.ended(screen.getByLabelText("结算开场动画"));
}

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionCallbacks.length = 0;
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("starts on the loading page", () => {
    render(<App />);
    const stage = screen.getByRole("region", { name: "游戏画面" });
    expect(within(stage).getByRole("main", { name: "游戏加载" })).toBeInTheDocument();
    expect(within(stage).queryByRole("main", { name: "游戏大厅" })).not.toBeInTheDocument();
  });

  it("covers the loading page before revealing the lobby", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "CLICK TO START" }));

    expect(screen.getByTestId("screen-transition")).toHaveAttribute("data-phase", "covering");
    expect(screen.getByRole("main", { name: "游戏加载" })).toBeInTheDocument();
    expect(await screen.findByRole("main", { name: "游戏大厅" })).toBeInTheDocument();
  });

  it("runs confirmed PIKO through the intro and the same gameplay iframe into real settlement", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "CLICK TO START" }));
    await waitForTransition();
    expect(screen.getByRole("main", { name: "游戏大厅" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "打开角色" }));
    await waitForTransition();
    await user.click(screen.getByRole("button", { name: "确认选择 PIKO" }));
    expect(screen.getByRole("button", { name: "已选择 PIKO" })).toHaveTextContent("SELECTED");
    await user.click(screen.getByRole("button", { name: "继续选角色" }));
    expect(screen.getByRole("main", { name: "角色选择" })).toBeInTheDocument();
    expect(screen.getByTestId("screen-transition")).toHaveAttribute("data-phase", "idle");

    await user.click(screen.getByRole("button", { name: "返回首页" }));
    await waitForTransition();
    expect(screen.getByRole("main", { name: "游戏大厅" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "开始游戏" }));
    await waitForTransition();

    expect(screen.getByTestId("app-screen")).toHaveAttribute("data-screen", "pregame-video");
    const frame = currentFrame();
    const video = screen.getByLabelText("游戏开场视频");
    expect(frame).toHaveAttribute("inert");
    gameMessage(frame, "ready");
    expect(frame).toHaveAttribute("inert");
    (video as HTMLVideoElement).currentTime = 12;
    fireEvent.ended(video);
    expect(screen.getByTestId("app-screen")).toHaveAttribute("data-screen", "gameplay");
    expect(currentFrame()).toBe(frame);
    expect(frame).not.toHaveAttribute("inert");
    expect(screen.getByLabelText("游戏开场视频")).toBe(video);
    await waitFor(() => expect(screen.queryByLabelText("游戏开场视频")).not.toBeInTheDocument());
    expect(video).toHaveProperty("currentTime", 12);
    gameMessage(frame, "complete");
    await waitForTransition();
    expect(screen.queryByTitle("节奏游戏")).not.toBeInTheDocument();
    expect(screen.getByRole("main", { name: "关卡结算" })).toBeInTheDocument();
    expect(screen.getByTestId("settlement-ui")).toHaveAttribute("aria-hidden", "true");
    fireEvent.ended(screen.getByLabelText("结算开场动画"));
    expect(screen.getByRole("region", { name: "得分 1,234" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "获得 4 颗星，共 5 颗" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "PERFECT 61" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "GOOD 15" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "MISS 4" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "最大连击 50" })).toBeInTheDocument();
    expect(screen.queryByText("NEW RECORD!")).not.toBeInTheDocument();
  });

  it("retries once with a new run, no intro or stale settlement, and ignores obsolete callbacks", async () => {
    await openConfirmedGame();
    const oldFrame = activateGame();
    const oldCallbacks = sessionCallbacks.at(-1)!;
    await settleGame();
    const retry = screen.getByRole("button", { name: "重新挑战" });
    fireEvent.click(retry);
    fireEvent.click(retry);
    await waitForTransition();
    const frame = currentFrame();
    expect(frame).not.toBe(oldFrame);
    expect(frameRunId(frame)).toBe(frameRunId(oldFrame) + 1);
    expect(screen.queryByLabelText("游戏开场视频")).not.toBeInTheDocument();
    expect(screen.queryByRole("main", { name: "关卡结算" })).not.toBeInTheDocument();
    act(() => {
      oldCallbacks.onComplete({ ...gameResult, finalScore: 9000 });
      oldCallbacks.onGameplayStarted?.();
      oldCallbacks.onRetryLoad();
      oldCallbacks.onReturnToLobby();
    });
    expect(currentFrame()).toBe(frame);
    expect(frame).toHaveAttribute("inert");
    await settleGame(2000);
    expect(screen.getByRole("region", { name: "得分 2,000" })).toBeInTheDocument();
    expect(screen.getByText("NEW RECORD!")).toBeInTheDocument();
  });

  it("uses the first completion only and compares strict session records across Retry and Next", async () => {
    const user = await openConfirmedGame();
    const firstCallbacks = sessionCallbacks.at(-1)!;
    await settleGame(1234);
    act(() => firstCallbacks.onComplete({ ...gameResult, finalScore: 9000 }));
    act(() => {
      firstCallbacks.onRetryLoad();
      firstCallbacks.onReturnToLobby();
    });
    expect(screen.getByRole("region", { name: "得分 1,234" })).toBeInTheDocument();
    expect(screen.queryByText("NEW RECORD!")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "重新挑战" }));
    await waitForTransition();
    await settleGame(2000);
    expect(screen.getByText("NEW RECORD!")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "继续" }));
    await waitForTransition();
    expect(screen.getByRole("main", { name: "游戏大厅" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "开始游戏" }));
    await waitForTransition();
    expect(screen.getByLabelText("游戏开场视频")).toBeInTheDocument();
    await settleGame(2000);
    expect(screen.queryByText("NEW RECORD!")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "重新挑战" }));
    await waitForTransition();
    await settleGame(1500);
    expect(screen.queryByText("NEW RECORD!")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "重新挑战" }));
    await waitForTransition();
    await settleGame(2500);
    expect(screen.getByText("NEW RECORD!")).toBeInTheDocument();
  }, 15000);

  it("reloads an ended intro with a new run even when the transition screen is unchanged", async () => {
    await openConfirmedGame();
    const oldFrame = currentFrame();
    fireEvent.error(oldFrame);
    fireEvent.ended(screen.getByLabelText("游戏开场视频"));
    const oldCallbacks = sessionCallbacks.at(-1)!;
    const reload = screen.getByRole("button", { name: "重新加载" });
    fireEvent.click(reload);
    fireEvent.click(reload);
    const frame = currentFrame();
    expect(frameRunId(frame)).toBe(frameRunId(oldFrame) + 1);
    expect(screen.queryByLabelText("游戏开场视频")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    act(() => oldCallbacks.onReturnToLobby());
    expect(currentFrame()).toBe(frame);
    gameMessage(frame, "ready");
    expect(currentFrame()).toBe(frame);
    expect(screen.getByTestId("app-screen")).toHaveAttribute("data-screen", "gameplay");
    expect(frame).not.toHaveAttribute("inert");
  });

  it("does not lose an immediate completion while the initial game transition is revealing", async () => {
    const user = await openConfirmedGame();
    fireEvent.error(currentFrame());
    fireEvent.ended(screen.getByLabelText("游戏开场视频"));
    await user.click(screen.getByRole("button", { name: "返回大厅" }));
    await waitForTransition();
    await user.click(screen.getByRole("button", { name: "开始游戏" }));
    const frame = await screen.findByTitle("节奏游戏") as HTMLIFrameElement;
    expect(screen.getByTestId("screen-transition")).toHaveAttribute("data-phase", "revealing");
    gameMessage(frame, "ready");
    fireEvent.ended(screen.getByLabelText("游戏开场视频"));
    gameMessage(frame, "complete");
    await screen.findByRole("main", { name: "关卡结算" });
    await waitForTransition();
    fireEvent.ended(screen.getByLabelText("结算开场动画"));
    expect(screen.getByRole("region", { name: "得分 1,234" })).toBeInTheDocument();
  });

  it("routes PLAY to hero selection when no hero has been confirmed", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "CLICK TO START" }));
    await waitForTransition();
    await user.click(screen.getByRole("button", { name: "开始游戏" }));
    await waitForTransition();

    expect(screen.getByRole("main", { name: "角色选择" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择 PIKO" })).toHaveAttribute("aria-pressed", "true");
  });

  it.each(["打开角色", "开始游戏"])("offers direct start after SELECT from %s without returning to the lobby", async (entry) => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'CLICK TO START' }));
    await waitForTransition();
    await user.click(screen.getByRole('button', { name: entry }));
    await waitForTransition();
    await user.click(screen.getByRole('button', { name: '确认选择 PIKO' }));
    const dialog = screen.getByRole('dialog', { name: '是否立即开始游戏？' });
    expect(within(dialog).getByText('已选择小企鹅 PIKO')).toBeInTheDocument();
    const start = within(dialog).getByRole('button', { name: '开始游戏' });
    expect(start).toHaveFocus();
    expect(screen.queryByTitle('节奏游戏')).not.toBeInTheDocument();
    fireEvent.click(start); fireEvent.click(start);
    await waitForTransition();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('游戏开场视频')).toBeInTheDocument();
    const frame = currentFrame();
    expect(frameRunId(frame)).toBe(1);
    expect(frame).toHaveAttribute('inert');
    gameMessage(frame, 'ready'); fireEvent.ended(screen.getByLabelText('游戏开场视频'));
    expect(currentFrame()).toBe(frame);
    expect(frame).not.toHaveAttribute('inert');
  });

  it('retains selection after dismissing direct start, reopens SELECTED and restores focus', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'CLICK TO START' }));
    await waitForTransition();
    await user.click(screen.getByRole('button', { name: '打开角色' }));
    await waitForTransition();
    await user.click(screen.getByRole('button', { name: '确认选择 PIKO' }));
    await user.tab(); expect(screen.getByRole('button', { name: '继续选角色' })).toHaveFocus();
    await user.tab(); expect(within(screen.getByRole('dialog')).getByRole('button', { name: '开始游戏' })).toHaveFocus();
    await user.tab({ shift: true }); expect(screen.getByRole('button', { name: '继续选角色' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: '继续选角色' }));
    const selected = screen.getByRole('button', { name: '已选择 PIKO' });
    expect(selected).toBeEnabled(); expect(selected).toHaveFocus();
    expect(screen.queryByTitle('节奏游戏')).not.toBeInTheDocument();
    await user.click(selected); expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}'); expect(selected).toHaveFocus();
    await user.click(selected);
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(selected).toHaveFocus();
    await user.click(screen.getByRole('button', { name: '返回首页' }));
    await waitForTransition();
    await user.click(screen.getByRole('button', { name: '开始游戏' }));
    await waitForTransition();
    expect(screen.getByLabelText('游戏开场视频')).toBeInTheDocument();
  });

  it('locks background selection and navigation while direct start is open', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'CLICK TO START' }));
    await waitForTransition();
    await user.click(screen.getByRole('button', { name: '打开角色' }));
    await waitForTransition();
    const back = screen.getByRole('button', { name: '返回首页' });
    const riff = screen.getByRole('button', { name: '选择 RIFF' });
    await user.click(screen.getByRole('button', { name: '确认选择 PIKO' }));
    expect(screen.getByRole('dialog', { name: '是否立即开始游戏？' })).toBeInTheDocument();
    fireEvent.click(back); fireEvent.click(riff);
    expect(screen.getByTestId('app-screen')).toHaveAttribute('data-screen', 'hero-select');
    expect(screen.getByRole('button', { name: '选择 PIKO' })).toHaveAttribute('aria-pressed', 'true');
    expect(back.closest('[inert]')).not.toBeNull();
    await user.keyboard('{Escape}');
  });

  it("discards a draft hero that was not confirmed", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "CLICK TO START" }));
    await waitForTransition();
    await user.click(screen.getByRole("button", { name: "打开角色" }));
    await waitForTransition();
    await user.click(screen.getByRole("button", { name: "确认选择 PIKO" }));
    await user.click(screen.getByRole("button", { name: "继续选角色" }));
    await user.click(screen.getByRole("button", { name: "返回首页" }));
    await waitForTransition();

    await user.click(screen.getByRole("button", { name: "打开角色" }));
    await waitForTransition();
    await user.click(screen.getByRole("button", { name: "选择 MIRA" }));
    await user.click(screen.getByRole("button", { name: "返回首页" }));
    await waitForTransition();
    await user.click(screen.getByRole("button", { name: "打开角色" }));
    await waitForTransition();

    expect(screen.getByRole("button", { name: "选择 PIKO" })).toHaveAttribute("aria-pressed", "true");
  });

  it.each(["NIBBY", "MIRA", "RIFF", "BONGO"])("keeps %s as the draft after unavailable SELECT and refuses PLAY without PIKO", async (name) => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "CLICK TO START" }));
    await waitForTransition();
    await user.click(screen.getByRole("button", { name: "打开角色" }));
    await waitForTransition();
    await user.click(screen.getByRole("button", { name: `选择 ${name}` }));
    const select = screen.getByRole("button", { name: `确认选择 ${name}` });
    await user.click(select);

    const dialog = screen.getByRole("dialog", { name: "该角色暂未开发，请选择 PIKO 开始游戏" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByRole("button", { name: "知道了" })).toHaveFocus();
    await user.click(within(dialog).getByRole("button", { name: "知道了" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(select).toHaveFocus();
    expect(screen.getByRole("button", { name: `选择 ${name}` })).toHaveAttribute("aria-pressed", "true");
    expect(select).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "返回首页" }));
    await waitForTransition();
    await user.click(screen.getByRole("button", { name: "开始游戏" }));
    await waitForTransition();
    expect(screen.getByRole("main", { name: "角色选择" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择 PIKO" })).toHaveAttribute("aria-pressed", "true");
  });

  it("preserves confirmed PIKO after another hero SELECT", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "CLICK TO START" }));
    await waitForTransition();
    await user.click(screen.getByRole("button", { name: "打开角色" }));
    await waitForTransition();
    await user.click(screen.getByRole("button", { name: "确认选择 PIKO" }));
    await user.click(screen.getByRole("button", { name: "继续选角色" }));
    await user.click(screen.getByRole("button", { name: "选择 RIFF" }));
    await user.click(screen.getByRole("button", { name: "确认选择 RIFF" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "确认选择 RIFF" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "选择 PIKO" }));
    expect(screen.getByRole("button", { name: "已选择 PIKO" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "返回首页" }));
    await waitForTransition();
    await user.click(screen.getByRole("button", { name: "开始游戏" }));
    await waitForTransition();
    expect(screen.getByLabelText("游戏开场视频")).toBeInTheDocument();
  });

  it("traps focus and blocks background actions while the hero notice is open", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "CLICK TO START" }));
    await waitForTransition();
    await user.click(screen.getByRole("button", { name: "打开角色" }));
    await waitForTransition();
    await user.click(screen.getByRole("button", { name: "选择 RIFF" }));
    const select = screen.getByRole("button", { name: "确认选择 RIFF" });
    const back = screen.getByRole("button", { name: "返回首页" });
    const piko = screen.getByRole("button", { name: "选择 PIKO" });
    const store = screen.getByRole("button", { name: "打开金币商店" });
    await user.click(select);
    const dialog = screen.getByRole("dialog");
    const close = within(dialog).getByRole("button", { name: "知道了" });
    expect(screen.getByRole("main", { name: "角色选择" }).parentElement).toHaveAttribute("inert");
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(close).toHaveFocus();
    await user.click(dialog);
    expect(dialog).toBeInTheDocument();
    await user.click(piko);
    await user.click(store);
    await user.click(select);
    await user.click(back);
    await waitForTransition();
    expect(screen.getByRole("dialog", { name: "该角色暂未开发，请选择 PIKO 开始游戏" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择 RIFF" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("main", { name: "角色选择" })).toBeInTheDocument();
    await user.click(dialog.parentElement!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(select).toHaveFocus();
  });

  it("restarts the current hero video with sound after a user selection", async () => {
    const user = userEvent.setup();
    render(<HeroSelectExperience />);

    expect(screen.getByLabelText("PIKO角色背景视频")).toHaveProperty("muted", true);
    await user.click(screen.getByRole("button", { name: "选择 PIKO" }));
    expect(screen.getByLabelText("PIKO角色背景视频")).toHaveProperty("muted", false);
  });

  it("preserves the selected hero through Back, home, and re-entry", async () => {
    const user = userEvent.setup();
    render(<HeroSelectExperience />);
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
    render(<HeroSelectExperience />);
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
    render(<HeroSelectExperience />);
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
    render(<HeroSelectExperience />);
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
    render(<HeroSelectExperience />);
    await user.click(screen.getByRole("button", { name: "选择 RIFF" }));
    await user.click(screen.getByRole("button", { name: "确认选择 RIFF" }));
    expect(screen.getByRole("heading", { name: "RIFF 已准备就绪" })).toBeInTheDocument();
  });

  it("keeps modal background controls from changing state or focus restoration", async () => {
    const user = userEvent.setup();
    render(<HeroSelectExperience />);
    const originalTrigger = screen.getByRole("button", { name: "打开金币商店" });
    await user.click(originalTrigger);
    await user.click(screen.getByRole("button", { name: "选择 RIFF" }));
    await user.click(screen.getByRole("button", { name: "打开体力商店" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "选择 PIKO" })).toHaveAttribute("aria-pressed", "true");
    expect(originalTrigger).toHaveFocus();
  });

  it("gives every hero-selection button a unique accessible name", () => {
    render(<HeroSelectExperience />);
    const names = screen.getAllByRole("button").map((button) =>
      button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "",
    );
    expect(names).not.toContain("");
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(["金币", "体力", "宝石"])("returns focus to the %s plus button after Escape", async (name) => {
    const user = userEvent.setup();
    render(<HeroSelectExperience />);
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
