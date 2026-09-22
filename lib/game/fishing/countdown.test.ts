import { describe, expect, it } from "vitest";
import {
  CAST_COUNTDOWN_MS,
  QUESTION_HOLD_MS,
  canCast,
  prepPhase,
  remainingCountdown,
} from "./countdown";

describe("cast countdown", () => {
  it("shows the question first, then counts 5s, then unlocks fishing", () => {
    expect(prepPhase(0)).toBe("question");
    expect(prepPhase(QUESTION_HOLD_MS - 1)).toBe("question");
    expect(prepPhase(QUESTION_HOLD_MS)).toBe("countdown");
    expect(remainingCountdown(QUESTION_HOLD_MS)).toBe(5);
    expect(remainingCountdown(QUESTION_HOLD_MS + 1000)).toBe(4);
    expect(canCast(QUESTION_HOLD_MS + CAST_COUNTDOWN_MS - 1)).toBe(false);
    expect(prepPhase(QUESTION_HOLD_MS + CAST_COUNTDOWN_MS)).toBe("ready");
    expect(canCast(QUESTION_HOLD_MS + CAST_COUNTDOWN_MS)).toBe(true);
  });
});
