import { describe, expect, it } from "vitest";
import { makeFixtureContent } from "../content/fixtures";
import type { GameContent } from "../content/types";
import { createSession, sessionReducer } from "./reducer";
import type { SessionState } from "./types";

const content = makeFixtureContent();

function play(state: SessionState, ...actions: Parameters<typeof sessionReducer>[1][]) {
  return actions.reduce((s, a) => sessionReducer(s, a, content), state);
}

function toFishing(character: SessionState["characterId"] = "observer") {
  return play(createSession(content), { type: "START" }, {
    type: "SELECT_CHARACTER",
    characterId: character!,
  }, { type: "BEGIN_ROUND" });
}

describe("sessionReducer", () => {
  it("starts on title with 3 lives and no rewards", () => {
    const s = createSession(content);
    expect(s.screen).toBe("title");
    expect(s.lives).toBe(3);
    expect(s.unlockedRewards).toEqual([]);
    expect(s.abilityUsed).toBe(false);
  });

  it("START then SELECT_CHARACTER then BEGIN_ROUND reaches fishing", () => {
    const s = toFishing();
    expect(s.screen).toBe("fishing");
    expect(s.characterId).toBe("observer");
    expect(s.roundIndex).toBe(0);
    expect(s.questionIndex).toBe(0);
  });

  it("BEGIN_ROUND on an empty-question content is data-error", () => {
    const broken: GameContent = {
      ...content,
      rounds: [{ ...content.rounds[0], questions: [] }],
    };
    let s = createSession(broken);
    s = sessionReducer(s, { type: "START" }, broken);
    s = sessionReducer(
      s,
      { type: "SELECT_CHARACTER", characterId: "observer" },
      broken,
    );
    s = sessionReducer(s, { type: "BEGIN_ROUND" }, broken);
    expect(s.screen).toBe("data-error");
    expect(s.dataError).toBe("Lỗi dữ liệu");
  });

  it("single correct goes to explain; CONTINUE advances; last question clears the round", () => {
    let s = toFishing();
    s = play(s, { type: "SCORE_CATCH", optionId: "yes" });
    expect(s.screen).toBe("explain");
    expect(s.explainMode).toBe("success");
    s = play(s, { type: "CONTINUE_AFTER_EXPLAIN" });
    expect(s.questionIndex).toBe(1);
    expect(s.screen).toBe("fishing");
    s = play(s, { type: "SCORE_CATCH", optionId: "a" }, {
      type: "SCORE_CATCH",
      optionId: "b",
    });
    expect(s.screen).toBe("explain");
    s = play(s, { type: "CONTINUE_AFTER_EXPLAIN" });
    expect(s.screen).toBe("round-clear");
    expect(s.unlockedRewards).toEqual(["Mảnh mã #1"]);
  });

  it("single wrong decrements life and stays on fishing", () => {
    let s = toFishing();
    s = play(s, { type: "SCORE_CATCH", optionId: "wrong" });
    expect(s.lives).toBe(2);
    expect(s.screen).toBe("fishing");
    expect(s.lastWrongExplanation).toBe("explain-r1-q1");
    expect(s.pendingCatch).toBe(null);
  });

  it("multiple keeps correct ids after a wrong catch", () => {
    let s = toFishing();
    s = play(
      s,
      { type: "SCORE_CATCH", optionId: "yes" },
      { type: "CONTINUE_AFTER_EXPLAIN" },
      { type: "SCORE_CATCH", optionId: "a" },
      { type: "SCORE_CATCH", optionId: "c" },
    );
    expect(s.caughtCorrectIds).toEqual(["a"]);
    expect(s.lives).toBe(2);
    expect(s.screen).toBe("fishing");
  });

  it("three wrongs fail the round; retry restores lives and question 0 but keeps fragments", () => {
    let s = toFishing();
    s = play(
      s,
      { type: "SCORE_CATCH", optionId: "yes" },
      { type: "CONTINUE_AFTER_EXPLAIN" },
      { type: "SCORE_CATCH", optionId: "a" },
      { type: "SCORE_CATCH", optionId: "b" },
      { type: "CONTINUE_AFTER_EXPLAIN" },
    );
    expect(s.unlockedRewards).toEqual(["Mảnh mã #1"]);
    s = play(s, { type: "CONTINUE_AFTER_CLEAR" }, { type: "BEGIN_ROUND" });
    expect(s.roundIndex).toBe(1);
    s = play(
      s,
      { type: "SCORE_CATCH", optionId: "wrong" },
      { type: "SCORE_CATCH", optionId: "wrong" },
      { type: "SCORE_CATCH", optionId: "wrong" },
    );
    expect(s.screen).toBe("round-fail");
    expect(s.lives).toBe(0);
    s = play(s, { type: "RETRY_ROUND" });
    expect(s.screen).toBe("round-intro");
    expect(s.lives).toBe(3);
    expect(s.roundIndex).toBe(1);
    expect(s.questionIndex).toBe(0);
    expect(s.unlockedRewards).toEqual(["Mảnh mã #1"]);
    expect(s.caughtCorrectIds).toEqual([]);
  });

  it("clearing four rounds reaches win", () => {
    let s = toFishing();
    const clearOne = (state: SessionState, optionId: string) =>
      play(state, { type: "SCORE_CATCH", optionId }, {
        type: "CONTINUE_AFTER_EXPLAIN",
      });
    s = clearOne(s, "yes");
    s = play(s, { type: "SCORE_CATCH", optionId: "a" }, {
      type: "SCORE_CATCH",
      optionId: "b",
    }, { type: "CONTINUE_AFTER_EXPLAIN" });
    expect(s.screen).toBe("round-clear");
    s = play(s, { type: "CONTINUE_AFTER_CLEAR" }, { type: "BEGIN_ROUND" });
    s = clearOne(s, "yes");
    s = play(s, { type: "CONTINUE_AFTER_CLEAR" }, { type: "BEGIN_ROUND" });
    s = clearOne(s, "yes");
    s = play(s, { type: "CONTINUE_AFTER_CLEAR" }, { type: "BEGIN_ROUND" });
    s = clearOne(s, "yes");
    expect(s.screen).toBe("round-clear");
    s = play(s, { type: "CONTINUE_AFTER_CLEAR" });
    expect(s.screen).toBe("win");
    expect(s.unlockedRewards).toEqual([
      "Mảnh mã #1",
      "Mảnh mã #2",
      "Mảnh mã #3",
      "Mảnh mã #4",
    ]);
  });
});
