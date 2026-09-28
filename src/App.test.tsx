import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("starts on the hero selection page", () => {
    render(<App />);
    expect(
      screen.getByRole("main", { name: "角色选择" }),
    ).toBeInTheDocument();
  });
});
