import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLoadingProgress } from "./useLoadingProgress";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useLoadingProgress", () => {
  it("does not start before the loading experience is activated", () => {
    const requestAnimationFrame = vi.fn();
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const { result } = renderHook(() => useLoadingProgress(false));

    expect(result.current).toBe(0);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("advances linearly for four seconds, reaches 100, and then stops", () => {
    let nextFrame: FrameRequestCallback | undefined;
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      nextFrame = callback;
      return requestAnimationFrame.mock.calls.length;
    });

    vi.spyOn(performance, "now").mockReturnValue(0);
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const { result } = renderHook(() => useLoadingProgress());
    expect(result.current).toBe(0);

    act(() => nextFrame?.(1000));
    expect(result.current).toBe(25);

    act(() => nextFrame?.(4000));
    expect(result.current).toBe(100);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
  });

  it("cancels the pending animation frame when unmounted", () => {
    const cancelAnimationFrame = vi.fn();
    vi.spyOn(performance, "now").mockReturnValue(0);
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 17));
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrame);

    const { unmount } = renderHook(() => useLoadingProgress());
    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(17);
  });
});
