import { createRef, useRef, useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StoreUnavailableDialog } from "./StoreUnavailableDialog";

function DialogHarness() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={triggerRef} onClick={() => setOpen(true)}>打开商店</button>
      <button>背景操作</button>
      <StoreUnavailableDialog open={open} triggerRef={triggerRef} onClose={() => setOpen(false)} />
    </>
  );
}

describe("StoreUnavailableDialog", () => {
  it("renders only while open with the required modal semantics and copy", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "打开商店" }));
    const dialog = screen.getByRole("dialog", { name: "商店功能暂未开放" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("商店功能暂未开放")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "知道了" })).toHaveFocus();
  });

  it("closes by the acknowledgement button and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "打开商店" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "知道了" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes by clicking the overlay but not the panel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const triggerRef = createRef<HTMLButtonElement>();
    render(
      <>
        <button ref={triggerRef}>打开商店</button>
        <StoreUnavailableDialog open triggerRef={triggerRef} onClose={onClose} />
      </>,
    );
    await user.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes by Escape and restores focus", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "打开商店" });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("keeps Tab and Shift+Tab on the only dialog control", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole("button", { name: "打开商店" }));
    const close = screen.getByRole("button", { name: "知道了" });
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(close).toHaveFocus();
  });
});
