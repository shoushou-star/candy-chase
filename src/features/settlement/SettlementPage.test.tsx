import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettlementPage } from "./SettlementPage";

const result = {
  score: 39560,
  stars: 4 as const,
  perfect: 86,
  good: 12,
  miss: 2,
  maxCombo: 74,
};

describe("SettlementPage", () => {
  it("presents the supplied result without inventing a GREAT judgement", () => {
    render(<SettlementPage {...result} onRetry={() => undefined} onNext={() => undefined} />);

    const page = screen.getByRole("main", { name: "关卡结算" });
    expect(within(page).getByText("39,560")).toBeInTheDocument();
    expect(within(page).getByText("86")).toBeInTheDocument();
    expect(within(page).getByText("12")).toBeInTheDocument();
    expect(within(page).getByText("2")).toBeInTheDocument();
    expect(within(page).getByText("74")).toBeInTheDocument();
    expect(within(page).queryByText("GREAT")).not.toBeInTheDocument();
  });

  it("announces the earned star count and marks exactly that many stars as earned", () => {
    render(<SettlementPage {...result} onRetry={() => undefined} onNext={() => undefined} />);

    const rating = screen.getByRole("img", { name: "获得 4 颗星，共 5 颗" });
    expect(within(rating).getAllByTestId("earned-star")).toHaveLength(4);
    expect(within(rating).getAllByTestId("empty-star")).toHaveLength(1);
  });

  it.each([
    [0, 0],
    [1, 1],
    [4, 4],
    [5, 5],
    [-3, 0],
    [8, 5],
    [Number.NaN, 0],
  ])("clamps a %i-star value to %i visible earned stars", (stars, earned) => {
    render(
      <SettlementPage
        {...result}
        stars={stars}
        onRetry={() => undefined}
        onNext={() => undefined}
      />,
    );

    const rating = screen.getByRole("img", { name: `获得 ${earned} 颗星，共 5 颗` });
    expect(within(rating).queryAllByTestId("earned-star")).toHaveLength(earned);
    expect(within(rating).queryAllByTestId("empty-star")).toHaveLength(5 - earned);
  });

  it("formats a large score without truncating its digits", () => {
    render(
      <SettlementPage
        {...result}
        score={1234567890}
        onRetry={() => undefined}
        onNext={() => undefined}
      />,
    );
    expect(screen.getByText("1,234,567,890")).toBeInTheDocument();
  });

  it("keeps the key 2048 by 1152 Figma geometry intact", () => {
    render(<SettlementPage {...result} onRetry={() => undefined} onNext={() => undefined} />);

    expect(screen.getByTestId("stage-clear-art")).toHaveStyle({
      left: "73px",
      top: "38px",
      width: "631px",
      height: "355px",
    });
    expect(screen.getByTestId("results-panel")).toHaveStyle({
      left: "1000px",
      top: "232px",
      width: "934px",
      height: "620px",
    });

    const starPositions = [
      [1015, 151, 204],
      [1183, 133, 216],
      [1358, 121, 224],
      [1539, 133, 216],
      [1715, 151, 204],
    ];
    screen.getAllByTestId(/(?:earned|empty)-star/).forEach((star, index) => {
      expect(star).toHaveStyle({
        left: `${starPositions[index][0]}px`,
        top: `${starPositions[index][1]}px`,
        width: `${starPositions[index][2]}px`,
        height: `${starPositions[index][2]}px`,
      });
    });

    const cards = screen.getAllByRole("article");
    [30, 331, 632].forEach((left, index) => {
      expect(cards[index]).toHaveStyle({ left: `${left}px`, top: "320px", width: "272px", height: "142px" });
    });
    expect(screen.getByRole("region", { name: "最大连击 74" })).toHaveStyle({
      left: "30px",
      top: "490px",
      width: "874px",
      height: "100px",
    });

    expect(screen.getByRole("button", { name: "重新挑战" })).toHaveStyle({
      left: "996px",
      top: "882px",
      width: "460px",
      height: "140px",
    });
    expect(screen.getByRole("button", { name: "继续" })).toHaveStyle({
      left: "1468px",
      top: "882px",
      width: "470px",
      height: "140px",
    });
  });

  it("keeps NEW RECORD hidden unless the caller explicitly confirms a new record", () => {
    const { rerender } = render(
      <SettlementPage {...result} onRetry={() => undefined} onNext={() => undefined} />,
    );
    expect(screen.queryByText("NEW RECORD!")).not.toBeInTheDocument();

    rerender(
      <SettlementPage
        {...result}
        isNewRecord
        onRetry={() => undefined}
        onNext={() => undefined}
      />,
    );
    expect(screen.getByRole("status")).toHaveStyle({
      left: "692px",
      top: "168px",
      width: "290px",
      height: "116px",
    });
    expect(screen.getByText("NEW RECORD!")).toBeInTheDocument();
  });

  it("activates Retry and Next with pointer and keyboard input", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onNext = vi.fn();
    render(<SettlementPage {...result} onRetry={onRetry} onNext={onNext} />);

    const retry = screen.getByRole("button", { name: "重新挑战" });
    const next = screen.getByRole("button", { name: "继续" });
    expect(retry).toHaveAttribute("type", "button");
    expect(next).toHaveAttribute("type", "button");

    await user.click(retry);
    next.focus();
    await user.keyboard("{Enter}");
    retry.focus();
    await user.keyboard(" ");

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
