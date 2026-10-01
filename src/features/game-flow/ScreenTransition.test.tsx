import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScreenTransition, useScreenTransition } from "./ScreenTransition";

function Harness() {
  const { durationMs, phase, requestScreen, screen: currentScreen } = useScreenTransition("loading");
  return (
    <>
      <output aria-label="当前页面">{currentScreen}</output>
      <button type="button" onClick={() => requestScreen("lobby", 220)}>进入大厅</button>
      <button type="button" onClick={() => requestScreen("hero-select", 220)}>进入角色选择</button>
      <ScreenTransition durationMs={durationMs} phase={phase} />
    </>
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("ScreenTransition", () => {
  it("ignores a second destination until the active transition finishes", () => {
    vi.useFakeTimers();
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "进入大厅" }));
    fireEvent.click(screen.getByRole("button", { name: "进入角色选择" }));

    expect(screen.getByTestId("screen-transition")).toHaveAttribute("data-phase", "covering");
    expect(screen.getByRole("status", { name: "当前页面" })).toHaveTextContent("loading");

    act(() => vi.advanceTimersByTime(110));
    expect(screen.getByRole("status", { name: "当前页面" })).toHaveTextContent("lobby");
    expect(screen.getByTestId("screen-transition")).toHaveAttribute("data-phase", "revealing");

    act(() => vi.advanceTimersByTime(110));
    expect(screen.getByTestId("screen-transition")).toHaveAttribute("data-phase", "idle");
  });

  it("shortens transitions to 60ms when reduced motion is requested", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "进入大厅" }));
    act(() => vi.advanceTimersByTime(30));
    expect(screen.getByRole("status", { name: "当前页面" })).toHaveTextContent("lobby");

    act(() => vi.advanceTimersByTime(30));
    expect(screen.getByTestId("screen-transition")).toHaveAttribute("data-phase", "idle");
  });
});
