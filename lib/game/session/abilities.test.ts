import { describe, expect, it } from "vitest";
import { makeFixtureContent } from "../content/fixtures";
import { createSession, sessionReducer } from "./reducer";
import type { SessionState } from "./types";

const content = makeFixtureContent();

function play(state: SessionState, ...actions: Parameters<typeof sessionReducer>[1][]) {
  return actions.reduce((s, a) => sessionReducer(s, a, content), state);
}

function fishing(id: SessionState["characterId"]) {
  return play(createSession(content), { type: "START" }, {
    type: "SELECT_CHARACTER",
    characterId: id!,
  }, { type: "BEGIN_ROUND" });
}

describe("USE_ABILITY", () => {
  it("does nothing before the fishing screen", () => {
    const s = play(createSession(content), { type: "START" }, {
      type: "SELECT_CHARACTER",
      characterId: "persistent",
    }, { type: "USE_ABILITY" });
    expect(s.lives).toBe(3);
    expect(s.abilityUsed).toBe(false);
  });

  it("persistent adds one life up to 4 and then no-ops", () => {
    let s = fishing("persistent");
    s = play(s, { type: "USE_ABILITY" });
    expect(s.lives).toBe(4);
    expect(s.abilityUsed).toBe(true);
    s = play(s, { type: "USE_ABILITY" });
    expect(s.lives).toBe(4);
  });

  it("observer hints one wrong fish once", () => {
    let s = fishing("observer");
    s = play(s, { type: "USE_ABILITY" });
    expect(s.hintedOptionId).toBe("wrong");
    expect(s.abilityUsed).toBe(true);
    s = play(s, { type: "USE_ABILITY" });
    expect(s.hintedOptionId).toBe("wrong");
  });

  it("careful re-shows last wrong explanation without losing a life", () => {
    let s = fishing("careful");
    s = play(s, { type: "SCORE_CATCH", optionId: "wrong" });
    expect(s.lives).toBe(2);
    s = play(s, { type: "USE_ABILITY" });
    expect(s.screen).toBe("explain");
    expect(s.explainMode).toBe("peek");
    expect(s.lives).toBe(2);
    expect(s.abilityUsed).toBe(true);
    s = play(s, { type: "CONTINUE_AFTER_EXPLAIN" });
    expect(s.screen).toBe("fishing");
    expect(s.questionIndex).toBe(0);
    s = play(s, { type: "USE_ABILITY" });
    expect(s.screen).toBe("fishing");
  });

  it("retry after fail does not restore a used ability", () => {
    let s = fishing("persistent");
    s = play(s, { type: "USE_ABILITY" });
    s = play(
      s,
      { type: "SCORE_CATCH", optionId: "wrong" },
      { type: "SCORE_CATCH", optionId: "wrong" },
      { type: "SCORE_CATCH", optionId: "wrong" },
      { type: "SCORE_CATCH", optionId: "wrong" },
    );
    expect(s.screen).toBe("round-fail");
    s = play(s, { type: "RETRY_ROUND" });
    expect(s.abilityUsed).toBe(true);
    expect(s.lives).toBe(3);
  });
});
