import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Hero } from "./types";
import { useHeroAssets } from "./useHeroAssets";

const heroes: Hero[] = [
  {
    id: "piko",
    displayName: "PIKO",
    backgroundSrc: "/piko-background.png",
    videoSrc: "/piko-video.mp4",
    logoSrc: "/piko-logo.png",
    cardSrc: "/piko-card.png",
  },
  {
    id: "riff",
    displayName: "RIFF",
    backgroundSrc: "/riff-background.png",
    videoSrc: "/riff-video.mp4",
    logoSrc: "/riff-logo.png",
    cardSrc: "/riff-card.png",
  },
];

class ControlledImage {
  static instances: ControlledImage[] = [];
  onload: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  src = "";

  constructor() {
    ControlledImage.instances.push(this);
  }

  static named(src: string) {
    const image = ControlledImage.instances.find((instance) => instance.src === src);
    if (!image) throw new Error(`Image not requested: ${src}`);
    return image;
  }

  succeed() {
    this.onload?.(new Event("load"));
  }

  fail() {
    this.onerror?.(new Event("error"));
  }
}

describe("useHeroAssets", () => {
  const nativeImage = globalThis.Image;

  beforeEach(() => {
    ControlledImage.instances = [];
    vi.stubGlobal("Image", ControlledImage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.Image = nativeImage;
    vi.restoreAllMocks();
  });

  it("starts each hero loading and requests all three independent images", () => {
    const { result } = renderHook(() => useHeroAssets(heroes));

    expect(result.current.piko).toBe("loading");
    expect(result.current.riff).toBe("loading");
    expect(ControlledImage.instances.map((image) => image.src)).toEqual([
      "/piko-background.png", "/piko-logo.png", "/piko-card.png",
      "/riff-background.png", "/riff-logo.png", "/riff-card.png",
    ]);
  });

  it("marks a hero ready only after its third image loads", () => {
    const { result } = renderHook(() => useHeroAssets(heroes));

    act(() => ControlledImage.named("/piko-background.png").succeed());
    expect(result.current.piko).toBe("loading");
    act(() => ControlledImage.named("/piko-logo.png").succeed());
    expect(result.current.piko).toBe("loading");
    act(() => ControlledImage.named("/piko-card.png").succeed());
    expect(result.current.piko).toBe("ready");
    expect(result.current.riff).toBe("loading");
  });

  it("marks only the owner of a failed image as error and logs its path", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { result } = renderHook(() => useHeroAssets(heroes));

    act(() => ControlledImage.named("/piko-logo.png").fail());

    expect(result.current.piko).toBe("error");
    expect(result.current.riff).toBe("loading");
    expect(error).toHaveBeenCalledWith("Failed to load hero asset", {
      heroId: "piko",
      src: "/piko-logo.png",
    });
  });

  it("keeps a successful hero ready when another hero fails", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { result } = renderHook(() => useHeroAssets(heroes));

    act(() => {
      ControlledImage.named("/riff-background.png").succeed();
      ControlledImage.named("/riff-logo.png").succeed();
      ControlledImage.named("/riff-card.png").succeed();
      ControlledImage.named("/piko-card.png").fail();
    });

    expect(result.current.riff).toBe("ready");
    expect(result.current.piko).toBe("error");
  });

  it("does not update state or log late image events after unmount", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { unmount } = renderHook(() => useHeroAssets(heroes));
    const late = ControlledImage.named("/piko-logo.png");
    unmount();

    act(() => {
      late.succeed();
      late.fail();
    });

    expect(error).not.toHaveBeenCalled();
  });

  it("does not restart preloading when an equivalent heroes array is rendered again", () => {
    const { rerender, result } = renderHook(({ items }) => useHeroAssets(items), {
      initialProps: { items: heroes },
    });
    const requested = ControlledImage.instances.length;

    rerender({ items: heroes.map((hero) => ({ ...hero })) });

    expect(ControlledImage.instances).toHaveLength(requested);
    expect(result.current.piko).toBe("loading");
  });
});
