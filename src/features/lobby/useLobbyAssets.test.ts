import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLobbyAssets } from "./useLobbyAssets";

class ControlledImage {
  static instances: ControlledImage[] = [];
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = "";

  constructor() {
    ControlledImage.instances.push(this);
  }

  static named(src: string) {
    const image = ControlledImage.instances.find((instance) => instance.src === src);
    if (!image) throw new Error(`Image not requested: ${src}`);
    return image;
  }

  succeed() { this.onload?.(); }
  fail() { this.onerror?.(); }
}

const sources = ["/background.png", "/avatar.png", "/play.svg"] as const;

describe("useLobbyAssets", () => {
  beforeEach(() => {
    ControlledImage.instances = [];
    vi.stubGlobal("Image", ControlledImage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("stays loading until every source succeeds", () => {
    const { result } = renderHook(() => useLobbyAssets(sources));
    expect(result.current).toBe("loading");
    expect(ControlledImage.instances.map((image) => image.src)).toEqual(sources);

    act(() => ControlledImage.named("/background.png").succeed());
    act(() => ControlledImage.named("/avatar.png").succeed());
    expect(result.current).toBe("loading");
    act(() => ControlledImage.named("/play.svg").succeed());
    expect(result.current).toBe("ready");
  });

  it("reports an error with the failed source", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { result } = renderHook(() => useLobbyAssets(sources));

    act(() => ControlledImage.named("/avatar.png").fail());

    expect(result.current).toBe("error");
    expect(error).toHaveBeenCalledWith("Failed to load lobby asset", { src: "/avatar.png" });
  });

  it("ignores late callbacks after unmount", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { unmount } = renderHook(() => useLobbyAssets(sources));
    const late = ControlledImage.named("/play.svg");
    unmount();

    act(() => {
      late.succeed();
      late.fail();
    });

    expect(error).not.toHaveBeenCalled();
  });
});
