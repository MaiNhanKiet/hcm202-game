/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeFixtureContent } from "@/lib/game/content/fixtures";
import { createSession, sessionReducer } from "@/lib/game/session/reducer";
import { FishingScene } from "./FishingScene";

describe("FishingScene", () => {
  it("renders a canvas for the current question", () => {
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const content = makeFixtureContent();
    let state = createSession(content);
    state = sessionReducer(state, { type: "START" }, content);
    state = sessionReducer(
      state,
      { type: "SELECT_CHARACTER", characterId: "observer" },
      content,
    );
    state = sessionReducer(state, { type: "BEGIN_ROUND" }, content);
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      ellipse: vi.fn(),
      arc: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
    });
    render(
      <FishingScene
        state={state}
        content={content}
        dispatch={() => {}}
      />,
    );
    expect(screen.getByLabelText("fishing-scene").querySelector("canvas")).toBeTruthy();
    expect(screen.getByText(content.rounds[0].questions[0].question)).toBeTruthy();
  });
});
