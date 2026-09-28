import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GameButton } from "./GameButton";

describe("GameButton", () => {
  it("renders a native button with a safe default type", () => {
    render(<GameButton>SELECT</GameButton>);
    expect(screen.getByRole("button", { name: "SELECT" })).toHaveAttribute("type", "button");
  });

  it("forwards native attributes and appends the shared class", () => {
    render(<GameButton aria-label="上一位角色" className="arrow" type="submit">←</GameButton>);
    const button = screen.getByRole("button", { name: "上一位角色" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveClass("game-button", "arrow");
  });

  it("forwards its DOM ref for dialog focus management", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<GameButton ref={ref}>知道了</GameButton>);
    expect(ref.current).toBe(screen.getByRole("button", { name: "知道了" }));
  });

  it("activates by mouse, Enter, and Space", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<GameButton onClick={onClick}>SELECT</GameButton>);
    const button = screen.getByRole("button", { name: "SELECT" });

    await user.click(button);
    button.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("does not activate when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<GameButton disabled onClick={onClick}>SELECT</GameButton>);
    const button = screen.getByRole("button", { name: "SELECT" });

    await user.click(button);
    button.focus();
    await user.keyboard("{Enter} ");
    expect(onClick).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });
});
