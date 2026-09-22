/** @vitest-environment jsdom */
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeFixtureContent } from "@/lib/game/content/fixtures";
import { createSession, sessionReducer } from "@/lib/game/session/reducer";
import { FishingScene } from "./FishingScene";

function stubCanvas() {
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => {});
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    lineCap: "butt",
    lineWidth: 1,
    scale: vi.fn(),
    ellipse: vi.fn(),
    arc: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    setLineDash: vi.fn(),
  });
}

function fishingState() {
  const content = makeFixtureContent();
  let state = createSession(content);
  state = sessionReducer(state, { type: "START" }, content);
  state = sessionReducer(state, { type: "BEGIN_ROUND" }, content);
  return { content, state };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("FishingScene", () => {
  it("renders a canvas for the current question", () => {
    stubCanvas();
    const { content, state } = fishingState();
    render(
      <FishingScene
        state={state}
        content={content}
        dispatch={() => {}}
      />,
    );
    expect(screen.getByLabelText("fishing-scene").querySelector("canvas")).toBeTruthy();
    expect(screen.getByLabelText(/vòng/i)).toBeTruthy();
    expect(screen.getByText(content.rounds[0].questions[0].question)).toBeTruthy();
    expect(screen.getByLabelText("question-brief")).toBeTruthy();
    expect(screen.queryByLabelText("cast-countdown")).toBeNull();
    expect(screen.queryByRole("button", { name: /thu cần/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /thả câu/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /năng lực/i })).toBeNull();
    expect(screen.getByLabelText(/thời gian/i)).toBeTruthy();
  });

  it("counts down after the question, then shrinks and unlocks fishing", () => {
    vi.useFakeTimers();
    stubCanvas();
    const { content, state } = fishingState();
    render(
      <FishingScene
        state={state}
        content={content}
        dispatch={() => {}}
      />,
    );
    expect(screen.getByLabelText("question-brief")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(screen.getByLabelText("cast-countdown")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByLabelText("cast-countdown")).toBeNull();
    expect(screen.queryByLabelText("question-brief")).toBeNull();
    expect(screen.getByText(/kéo/i)).toBeTruthy();
    expect(screen.queryByText(/thả sâu/i)).toBeNull();
  });
});
