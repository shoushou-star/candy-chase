import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CurrencyCounter } from "./CurrencyCounter";
import { HeroSelectPage } from "./HeroSelectPage";
import type { HeroAssetState, HeroId } from "./types";

const ready: HeroAssetState = {
  nibby: "ready",
  piko: "ready",
  mira: "ready",
  riff: "ready",
  bongo: "ready",
};

function props(selectedHeroId: HeroId = "piko", assetLoadState = ready) {
  return {
    selectedHeroId,
    playbackRequestId: 0,
    assetLoadState,
    onSelectHero: vi.fn(),
    onConfirm: vi.fn(),
    onBack: vi.fn(),
    onOpenStore: vi.fn(),
  };
}

function ControlledPage({ initialHeroId = "piko" }: { initialHeroId?: HeroId }) {
  const [selectedHeroId, setSelectedHeroId] = useState<HeroId>(initialHeroId);
  return (
    <HeroSelectPage
      {...props(selectedHeroId)}
      onSelectHero={setSelectedHeroId}
    />
  );
}

describe("HeroSelectPage", () => {
  it("renders the approved target copy, rarity, and currency balances", () => {
    render(<HeroSelectPage {...props()} />);

    expect(screen.getByRole("heading", { name: "SELECT HERO" })).toBeInTheDocument();
    expect(screen.getByText("Choose your hero")).toBeInTheDocument();
    expect(screen.getByText("EPIC")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "金币余额" })).getByText("623736")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "体力余额" })).getByText("2311")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "宝石余额" })).getByText("2139")).toBeInTheDocument();
  });

  it("shows a check badge only on the selected hero card", () => {
    render(<HeroSelectPage {...props()} />);
    const cards = within(screen.getByRole("group", { name: "角色卡列表" })).getAllByRole("button");

    expect(cards.filter((card) => card.querySelector(".hero-card__selected-mark"))).toEqual([
      screen.getByRole("button", { name: "选择 PIKO" }),
    ]);
  });

  it("starts the selected PIKO background video muted and preloads every hero video", () => {
    render(<HeroSelectPage {...props()} />);

    const videos = screen.getAllByLabelText(/角色背景视频$/);
    expect(videos).toHaveLength(5);
    const pikoVideo = screen.getByLabelText("PIKO角色背景视频");
    expect(pikoVideo).toHaveAttribute("data-active", "true");
    expect(pikoVideo).toHaveProperty("autoplay", true);
    expect(pikoVideo).toHaveProperty("muted", true);
    expect(videos.every((video) => video.getAttribute("preload") === "auto")).toBe(true);
  });

  it("starts a user-selected hero video from zero with sound", () => {
    const pageProps = props();
    const { rerender } = render(<HeroSelectPage {...pageProps} />);

    rerender(
      <HeroSelectPage
        {...pageProps}
        selectedHeroId="riff"
        playbackRequestId={1}
      />,
    );

    const riffVideo = screen.getByLabelText("RIFF角色背景视频");
    expect(riffVideo).toHaveAttribute("data-active", "true");
    expect(riffVideo).toHaveProperty("autoplay", true);
    expect(riffVideo).toHaveProperty("muted", false);
  });

  it("reveals the hero logo only during the final 0.8 seconds", () => {
    render(<HeroSelectPage {...props()} playbackRequestId={1} />);
    const video = screen.getByLabelText("PIKO角色背景视频") as HTMLVideoElement;
    const logo = screen.getByAltText("PIKO角色标志");
    Object.defineProperty(video, "duration", { configurable: true, value: 4.064 });

    video.currentTime = 3.2;
    fireEvent.timeUpdate(video);
    expect(logo).not.toHaveClass("hero-identity__logo--visible");

    video.currentTime = 3.264;
    fireEvent.timeUpdate(video);
    expect(logo).toHaveClass("hero-identity__logo--visible");
  });

  it("uses rendered video frames to reveal the logo without timeupdate throttling", () => {
    const callbacks: VideoFrameRequestCallback[] = [];
    const requestDescriptor = Object.getOwnPropertyDescriptor(
      HTMLVideoElement.prototype,
      "requestVideoFrameCallback",
    );
    const cancelDescriptor = Object.getOwnPropertyDescriptor(
      HTMLVideoElement.prototype,
      "cancelVideoFrameCallback",
    );
    Object.defineProperty(HTMLVideoElement.prototype, "requestVideoFrameCallback", {
      configurable: true,
      value: (callback: VideoFrameRequestCallback) => {
        callbacks.push(callback);
        return callbacks.length;
      },
    });
    Object.defineProperty(HTMLVideoElement.prototype, "cancelVideoFrameCallback", {
      configurable: true,
      value: () => undefined,
    });

    let unmount: () => void = () => undefined;
    try {
      ({ unmount } = render(<HeroSelectPage {...props()} playbackRequestId={1} />));
      const video = screen.getByLabelText("PIKO角色背景视频") as HTMLVideoElement;
      Object.defineProperty(video, "duration", { configurable: true, value: 4.064 });
      expect(callbacks).toHaveLength(1);

      act(() => callbacks[0](0, { mediaTime: 3.264 } as VideoFrameCallbackMetadata));

      expect(screen.getByAltText("PIKO角色标志")).toHaveClass("hero-identity__logo--visible");
    } finally {
      unmount();
      if (requestDescriptor) {
        Object.defineProperty(HTMLVideoElement.prototype, "requestVideoFrameCallback", requestDescriptor);
      } else {
        delete (HTMLVideoElement.prototype as Partial<HTMLVideoElement>).requestVideoFrameCallback;
      }
      if (cancelDescriptor) {
        Object.defineProperty(HTMLVideoElement.prototype, "cancelVideoFrameCallback", cancelDescriptor);
      } else {
        delete (HTMLVideoElement.prototype as Partial<HTMLVideoElement>).cancelVideoFrameCallback;
      }
    }
  });

  it("hides a revealed logo again when the current hero is replayed", () => {
    const pageProps = props();
    const { rerender } = render(<HeroSelectPage {...pageProps} playbackRequestId={1} />);
    const video = screen.getByLabelText("PIKO角色背景视频") as HTMLVideoElement;
    Object.defineProperty(video, "duration", { configurable: true, value: 4.064 });
    video.currentTime = 3.264;
    fireEvent.timeUpdate(video);
    expect(screen.getByAltText("PIKO角色标志")).toHaveClass("hero-identity__logo--visible");

    rerender(<HeroSelectPage {...pageProps} playbackRequestId={2} />);

    expect(screen.getByAltText("PIKO角色标志")).not.toHaveClass("hero-identity__logo--visible");
  });

  it("holds the final decoded frame when the active video ends", () => {
    render(<HeroSelectPage {...props()} playbackRequestId={1} />);
    const video = screen.getByLabelText("PIKO角色背景视频") as HTMLVideoElement;
    Object.defineProperty(video, "duration", { configurable: true, value: 4 });
    video.currentTime = 4;

    fireEvent.ended(video);

    expect(video.currentTime).toBeCloseTo(4 - 1 / 24, 5);
    expect(screen.getByAltText("PIKO角色标志")).toHaveClass("hero-identity__logo--visible");
  });

  it("falls back to the approved static background when video loading fails", () => {
    render(<HeroSelectPage {...props()} />);

    fireEvent.error(screen.getByLabelText("PIKO角色背景视频"));

    expect(screen.getByRole("img", { name: "PIKO角色背景" })).toBeInTheDocument();
    expect(screen.getByAltText("PIKO角色标志")).toHaveClass("hero-identity__logo--visible");
  });

  it("renders five cards in carousel order and updates identity after parent selection", async () => {
    const user = userEvent.setup();
    render(<ControlledPage />);
    const cards = within(screen.getByRole("group", { name: "角色卡列表" })).getAllByRole("button");
    expect(cards.map((card) => card.getAttribute("aria-label"))).toEqual([
      "选择 NIBBY", "选择 PIKO", "选择 MIRA", "选择 RIFF", "选择 BONGO",
    ]);
    await user.click(screen.getByRole("button", { name: "选择 RIFF" }));
    expect(screen.getByRole("button", { name: "选择 RIFF" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img", { name: "RIFF角色标志" })).toBeInTheDocument();
  });

  it("requests selection again when the current hero card is clicked", async () => {
    const user = userEvent.setup();
    const pageProps = props();
    const { rerender } = render(<HeroSelectPage {...pageProps} />);
    await user.click(screen.getByRole("button", { name: "选择 RIFF" }));
    expect(pageProps.onSelectHero).toHaveBeenCalledExactlyOnceWith("riff");
    expect(screen.getByRole("button", { name: "选择 PIKO" })).toHaveAttribute("aria-pressed", "true");
    rerender(<HeroSelectPage {...pageProps} selectedHeroId="riff" />);
    expect(screen.getByRole("button", { name: "选择 RIFF" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "选择 RIFF" }));
    expect(pageProps.onSelectHero).toHaveBeenCalledTimes(2);
    expect(pageProps.onSelectHero).toHaveBeenLastCalledWith("riff");
  });

  it("selects BONGO from a NIBBY-selected previous-arrow render", async () => {
    const user = userEvent.setup();
    const pageProps = props("nibby");
    render(<HeroSelectPage {...pageProps} />);
    await user.click(screen.getByRole("button", { name: "上一位角色" }));
    expect(pageProps.onSelectHero).toHaveBeenCalledExactlyOnceWith("bongo");
  });

  it("selects NIBBY from a BONGO-selected next-arrow render", async () => {
    const user = userEvent.setup();
    const pageProps = props("bongo");
    render(<HeroSelectPage {...pageProps} />);
    await user.click(screen.getByRole("button", { name: "下一位角色" }));
    expect(pageProps.onSelectHero).toHaveBeenCalledExactlyOnceWith("nibby");
  });

  it("wraps with arrow keys only when focus is inside the card list", () => {
    const pageProps = props("nibby");
    render(<HeroSelectPage {...pageProps} />);
    const card = screen.getByRole("button", { name: "选择 NIBBY" });
    card.focus();
    const left = fireEvent.keyDown(card, { key: "ArrowLeft" });
    expect(left).toBe(false);
    expect(pageProps.onSelectHero).toHaveBeenCalledExactlyOnceWith("bongo");
    const back = screen.getByRole("button", { name: "返回首页" });
    back.focus();
    expect(fireEvent.keyDown(back, { key: "ArrowRight" })).toBe(true);
    expect(pageProps.onSelectHero).toHaveBeenCalledTimes(1);
    card.focus();
    expect(fireEvent.keyDown(card, { key: "Tab" })).toBe(true);
    expect(fireEvent.keyDown(card, { key: "Escape" })).toBe(true);
    expect(pageProps.onSelectHero).toHaveBeenCalledTimes(1);
  });

  it("wraps right from a BONGO-selected focused card", () => {
    const pageProps = props("bongo");
    render(<HeroSelectPage {...pageProps} />);
    const card = screen.getByRole("button", { name: "选择 BONGO" });
    card.focus();
    expect(fireEvent.keyDown(card, { key: "ArrowRight" })).toBe(false);
    expect(pageProps.onSelectHero).toHaveBeenCalledExactlyOnceWith("nibby");
  });

  it("confirms only the current ready hero and runs Back", async () => {
    const user = userEvent.setup();
    const pageProps = props();
    render(<HeroSelectPage {...pageProps} />);
    await user.click(screen.getByRole("button", { name: "确认选择 PIKO" }));
    expect(pageProps.onConfirm).toHaveBeenCalledExactlyOnceWith("piko");
    await user.click(screen.getByRole("button", { name: "返回首页" }));
    expect(pageProps.onBack).toHaveBeenCalledOnce();
  });

  it.each(["loading", "error"] as const)("disables SELECT when current hero is %s", async (status) => {
    const user = userEvent.setup();
    const pageProps = props("piko", { ...ready, piko: status });
    render(<HeroSelectPage {...pageProps} />);
    const confirm = screen.getByRole("button", { name: "确认选择 PIKO" });
    expect(confirm).toBeDisabled();
    await user.click(confirm);
    expect(pageProps.onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("img", { name: "PIKO角色标志" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "PIKO角色背景" })).not.toBeInTheDocument();
  });

  it.each([
    ["loading", "正在加载 RIFF"],
    ["error", "无法加载 RIFF"],
  ] as const)("shows %s card fallback without a broken image", (status, label) => {
    render(<HeroSelectPage {...props("piko", { ...ready, riff: status })} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "RIFF角色卡" })).not.toBeInTheDocument();
  });

  it("passes each currency button element to the store callback", async () => {
    const user = userEvent.setup();
    const pageProps = props();
    render(<HeroSelectPage {...pageProps} />);
    for (const name of ["金币", "体力", "宝石"]) {
      const button = screen.getByRole("button", { name: `打开${name}商店` });
      await user.click(button);
      expect(pageProps.onOpenStore).toHaveBeenLastCalledWith(button);
    }
    expect(pageProps.onOpenStore).toHaveBeenCalledTimes(3);
  });

  it("associates each currency name with its displayed value in the accessibility tree", () => {
    render(
      <>
        <CurrencyCounter name="金币" iconSrc="/coins.svg" value={7} onOpenStore={vi.fn()} />
        <CurrencyCounter name="体力" iconSrc="/energy.svg" value={13} onOpenStore={vi.fn()} />
        <CurrencyCounter name="宝石" iconSrc="/gems.svg" value={29} onOpenStore={vi.fn()} />
      </>,
    );
    for (const [name, value] of [["金币", "7"], ["体力", "13"], ["宝石", "29"]] as const) {
      const counter = screen.getByRole("group", { name: `${name}余额` });
      expect(within(counter).getByText(value)).toBeInTheDocument();
      expect(within(counter).getByRole("button", { name: `打开${name}商店` })).toBeInTheDocument();
    }
  });
});
