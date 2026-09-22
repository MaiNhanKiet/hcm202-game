/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { makeFixtureContent } from "@/lib/game/content/fixtures";
import { GameApp, StubFishing } from "./GameApp";

describe("GameApp", () => {
  it("plays title → character → round → catch → explain", async () => {
    const user = userEvent.setup();
    render(<GameApp content={makeFixtureContent()} FishingSlot={StubFishing} />);
    expect(screen.getByText("Câu Cá Tri Thức")).toBeTruthy();
    expect(screen.getByText("Giải mã quyền lực")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /bắt đầu/i }));
    await user.click(screen.getByRole("button", { name: /người quan sát/i }));
    await user.click(screen.getByRole("button", { name: /vào vòng/i }));
    expect(screen.getByLabelText("fishing-scene")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "yes" }));
    expect(screen.getByText("explain-r1-q1")).toBeTruthy();
  });

  it("shows Lỗi dữ liệu when the round has no questions", async () => {
    const user = userEvent.setup();
    const content = makeFixtureContent();
    content.rounds[0] = { ...content.rounds[0], questions: [] };
    render(<GameApp content={content} FishingSlot={StubFishing} />);
    await user.click(screen.getByRole("button", { name: /bắt đầu/i }));
    await user.click(screen.getByRole("button", { name: /người quan sát/i }));
    await user.click(screen.getByRole("button", { name: /vào vòng/i }));
    expect(screen.getByText("Lỗi dữ liệu")).toBeTruthy();
  });
});
