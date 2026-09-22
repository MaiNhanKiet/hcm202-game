# Câu Cá Tri Thức Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a single-player classroom fishing quiz that loads `question.json`, plays all four rounds, and wins after four fragments.

**Architecture:** Pure session reducer owns screens, lives, scoring, and abilities. A `requestAnimationFrame` canvas scene owns rod/hook/fish and only emits `cast-landed`, `fish-bite`, and `reeled-in`. React re-renders on session changes, not every frame.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Vitest (node + jsdom), `@testing-library/react` for screens. No backend. No physics engine.

**Spec:** `docs/superpowers/specs/2026-09-22-cau-ca-tri-thuc-design.md`

## Global Constraints

- Play every valid question in each round, in file order. Ignore `questionsPerPlay` (JSON value is 3; agreed play is all 5 in production data).
- Start with 3 lives, cap 4. Wrong catch −1 life. 0 lives → `round-fail`. Retry restores 3 lives and question index 0 of that round. Earlier `unlockedRewards` stay. Ability stays consumed if already used.
- Characters: `observer` | `persistent` | `careful`. One ability, once per run. Ids stay; display names may change in UI.
- Bite = catch. No strike QTE. No Box2D, fluid sim, 3D, login, leaderboard, or save. Refresh returns to `title`.
- Fishing loop must not set React state every frame. Scene never reads `correctAnswerIds`; session passes `isCorrect` at spawn.
- Copy: title *Câu Cá Tri Thức*, subtitle *Giải mã quyền lực*. Round-fail button: *Thử lại vòng này*. Data error: *Lỗi dữ liệu*.
- Client-only game. `GameApp` and the canvas are `"use client"`. Import `question.json` (resolveJsonModule is already on).
- Axis: `x` left→right, `y` down. Fish only at `y > waterY`.

## File structure

| File | Responsibility |
|---|---|
| `vitest.config.ts` | Vitest + `@/` alias |
| `lib/game/content/types.ts` | Raw + validated content types |
| `lib/game/content/validate.ts` | Load-time validation; drop invalid questions |
| `lib/game/content/fixtures.ts` | Small `GameContent` for tests |
| `lib/game/session/types.ts` | `Screen`, `SessionState`, `SessionAction` |
| `lib/game/session/reducer.ts` | Session transitions |
| `lib/game/session/abilities.ts` | One-shot ability effects |
| `lib/game/session/selectors.ts` | Current round/question helpers |
| `lib/game/fishing/constants.ts` | Pond, gravity, radii |
| `lib/game/fishing/types.ts` | `SceneState`, `Fish`, `SceneEvent` |
| `lib/game/fishing/cast.ts` | Aim, charge, ballistic flight |
| `lib/game/fishing/hook.ts` | Sink, reel, drop, current, clamp |
| `lib/game/fishing/fish.ts` | Spawn + state machine |
| `lib/game/fishing/step.ts` | `stepScene` + pause |
| `components/game/GameApp.tsx` | `useReducer` + screen switch |
| `components/game/screens/*.tsx` | Title, character, intro, explain, fail, clear, win, data-error |
| `components/game/FishingHud.tsx` | Question, lives, fragments, caught list |
| `components/game/FishingScene.tsx` | Canvas + pointer/keys + rAF |
| `app/page.tsx` | Mount `GameApp` with validated JSON |
| `app/layout.tsx` | Metadata |
| `question.json` | Existing content (commit it with the loader task) |

## Review Focus

These are the five ways a live demo most likely breaks. Each has a test on the owning task.

1. Raw JSON sets `questionsPerPlay: 3` but a round has 5 valid questions — play all 5, never slice to 3. (Task 1)
2. A question whose `correctAnswerIds` are not in `options` is skipped; a round with zero valid questions blocks play with *Lỗi dữ liệu*. (Task 1 + Task 2)
3. After earning a fragment, failing the next round and retrying must keep the earlier fragment and must not restore a used ability. (Task 2 + Task 3)
4. `stepScene` with `paused: true` (hidden tab) must not move the hook, change fish, or emit bites. (Task 5)
5. Hook `x` stays inside pond bounds under current; every fish `y` stays `> waterY`. (Task 5 + Task 6)

---

### Task 1: Vitest and content validation

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/game/content/types.ts`
- Create: `lib/game/content/validate.ts`
- Create: `lib/game/content/fixtures.ts`
- Create: `lib/game/content/validate.test.ts`
- Modify: `package.json` (devDependency `vitest`, script `"test": "vitest run"`)
- Commit: `question.json` (already on disk, untracked)

**Interfaces:**
- Consumes: raw `question.json` shape from the spec
- Produces:
  - `type GameOption = { id: string; text: string }`
  - `type GameQuestion = { id: string; type: 'single' | 'multiple'; question: string; instruction: string; options: GameOption[]; correctAnswerIds: string[]; explanation: string }`
  - `type GameRound = { id: string; title: string; subtitle: string; reward: string; questions: GameQuestion[] }`
  - `type GameContent = { title: string; subtitle: string; rounds: GameRound[] }`
  - `type ValidateContentResult = { ok: true; content: GameContent } | { ok: false; error: string }`
  - `function validateContent(raw: unknown): ValidateContentResult`
  - `function playableQuestions(round: GameRound): GameQuestion[]` — identity after validate (invalid already dropped)
  - `function makeFixtureContent(): GameContent`

- [ ] **Step 1: Install Vitest and write the failing tests**

```bash
npm install -D vitest
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

Create `vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

Create `lib/game/content/validate.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateContent } from "./validate";

const production = JSON.parse(
  readFileSync(new URL("../../../question.json", import.meta.url), "utf8"),
);

describe("validateContent", () => {
  it("keeps all five valid questions even when questionsPerPlay is 3", () => {
    const raw = {
      game: {
        title: "T",
        subtitle: "S",
        questionsPerPlay: 3,
        totalRounds: 1,
      },
      rounds: [
        {
          id: "r",
          order: 1,
          title: "R",
          subtitle: "sub",
          reward: "Mảnh mã #1",
          questions: Array.from({ length: 5 }, (_, i) => ({
            id: `q${i}`,
            type: "single",
            difficulty: "easy",
            question: `Q${i}`,
            instruction: "Bắt 1",
            options: [
              { id: "a", text: "A" },
              { id: "b", text: "B" },
            ],
            correctAnswerIds: ["a"],
            explanation: "E",
          })),
        },
      ],
    };
    const result = validateContent(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.content.rounds[0].questions).toHaveLength(5);
    }
  });

  it("drops a question whose correctAnswerIds are not in options", () => {
    const raw = {
      game: { title: "T", subtitle: "S", totalRounds: 1 },
      rounds: [
        {
          id: "r",
          title: "R",
          subtitle: "sub",
          reward: "M1",
          questions: [
            {
              id: "good",
              type: "single",
              question: "G",
              instruction: "x",
              options: [{ id: "a", text: "A" }],
              correctAnswerIds: ["a"],
              explanation: "e",
            },
            {
              id: "bad",
              type: "single",
              question: "B",
              instruction: "x",
              options: [{ id: "a", text: "A" }],
              correctAnswerIds: ["missing"],
              explanation: "e",
            },
          ],
        },
      ],
    };
    const result = validateContent(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.content.rounds[0].questions.map((q) => q.id)).toEqual([
        "good",
      ]);
    }
  });

  it("fails when every question in a round is invalid", () => {
    const raw = {
      game: { title: "T", subtitle: "S", totalRounds: 1 },
      rounds: [
        {
          id: "r",
          title: "R",
          subtitle: "sub",
          reward: "M1",
          questions: [
            {
              id: "bad",
              type: "single",
              question: "B",
              instruction: "x",
              options: [{ id: "a", text: "A" }],
              correctAnswerIds: ["nope"],
              explanation: "e",
            },
          ],
        },
      ],
    };
    const result = validateContent(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Lỗi dữ liệu");
    }
  });

  it("loads production question.json with 4 rounds and 5 questions each", () => {
    const result = validateContent(production);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.content.title).toBe("Câu Cá Tri Thức");
      expect(result.content.subtitle).toBe("Giải mã quyền lực");
      expect(result.content.rounds).toHaveLength(4);
      for (const round of result.content.rounds) {
        expect(round.questions.length).toBe(5);
      }
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/game/content/validate.test.ts`

Expected: FAIL — `Cannot find module './validate'` (or file not found).

- [ ] **Step 3: Write types, fixtures, and validator**

`lib/game/content/types.ts` — exact types from Interfaces.

`lib/game/content/fixtures.ts`:

```ts
import type { GameContent, GameQuestion, GameRound } from "./types";

export function makeQuestion(
  id: string,
  type: GameQuestion["type"],
  correctAnswerIds: string[],
  extraOptions: string[] = ["wrong"],
): GameQuestion {
  const options = [...correctAnswerIds, ...extraOptions].map((oid) => ({
    id: oid,
    text: oid,
  }));
  return {
    id,
    type,
    question: id,
    instruction: type === "multiple" ? "Bắt đủ" : "Bắt 1",
    options,
    correctAnswerIds,
    explanation: `explain-${id}`,
  };
}

export function makeRound(
  id: string,
  reward: string,
  questions: GameQuestion[],
): GameRound {
  return { id, title: id, subtitle: id, reward, questions };
}

export function makeFixtureContent(): GameContent {
  return {
    title: "Câu Cá Tri Thức",
    subtitle: "Giải mã quyền lực",
    rounds: [
      makeRound("round-1", "Mảnh mã #1", [
        makeQuestion("r1-q1", "single", ["yes"]),
        makeQuestion("r1-q2", "multiple", ["a", "b"], ["c"]),
      ]),
      makeRound("round-2", "Mảnh mã #2", [
        makeQuestion("r2-q1", "single", ["yes"]),
      ]),
      makeRound("round-3", "Mảnh mã #3", [
        makeQuestion("r3-q1", "single", ["yes"]),
      ]),
      makeRound("round-4", "Mảnh mã #4", [
        makeQuestion("r4-q1", "single", ["yes"]),
      ]),
    ],
  };
}
```

`lib/game/content/validate.ts`: treat `raw` as a record. Require `game.title`, `game.subtitle`, `rounds` array. If `game.totalRounds` is present and not equal to `rounds.length`, return `{ ok: false, error: "Lỗi dữ liệu" }`. For each question, keep it only when `options.length > 0`, `correctAnswerIds.length > 0`, and every correct id exists on an option. If a round has 0 kept questions, return `{ ok: false, error: "Lỗi dữ liệu" }`. Do **not** read `questionsPerPlay`. Map kept fields into `GameContent`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/game/content/validate.test.ts`

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json question.json \
  lib/game/content/types.ts lib/game/content/validate.ts \
  lib/game/content/fixtures.ts lib/game/content/validate.test.ts
git commit -m "feat: validate question.json and play every valid question"
```

---

### Task 2: Session reducer — screens, scoring, lives, win

**Files:**
- Create: `lib/game/session/types.ts`
- Create: `lib/game/session/selectors.ts`
- Create: `lib/game/session/reducer.ts`
- Create: `lib/game/session/reducer.test.ts`

**Interfaces:**
- Consumes: `GameContent`, `GameQuestion`, `GameRound` from Task 1; `makeFixtureContent()`
- Produces:
  - `export const STARTING_LIVES = 3`
  - `export const MAX_LIVES = 4`
  - `type Screen = 'title' | 'character' | 'round-intro' | 'fishing' | 'explain' | 'round-fail' | 'round-clear' | 'win' | 'data-error'`
  - `type CharacterId = 'observer' | 'persistent' | 'careful'`
  - `type ExplainMode = 'success' | 'peek' | null`
  - `type SessionState` with fields: `screen`, `characterId: CharacterId | null`, `abilityUsed: boolean`, `roundIndex: number`, `questionIndex: number`, `lives: number`, `caughtCorrectIds: string[]`, `unlockedRewards: string[]`, `pendingCatch: string | null`, `lastWrongExplanation: string | null`, `hintedOptionId: string | null`, `dataError: string | null`, `explainMode: ExplainMode`
  - `type SessionAction =`
    - `{ type: 'START' }`
    - `{ type: 'SELECT_CHARACTER'; characterId: CharacterId }`
    - `{ type: 'BEGIN_ROUND' }`
    - `{ type: 'SCORE_CATCH'; optionId: string }`
    - `{ type: 'CONTINUE_AFTER_EXPLAIN' }`
    - `{ type: 'CONTINUE_AFTER_CLEAR' }`
    - `{ type: 'RETRY_ROUND' }`
    - `{ type: 'USE_ABILITY' }`
  - `function createSession(content: GameContent): SessionState`
  - `function sessionReducer(state: SessionState, action: SessionAction, content: GameContent): SessionState`
  - `function currentRound(state: SessionState, content: GameContent): GameRound | null`
  - `function currentQuestion(state: SessionState, content: GameContent): GameQuestion | null`

Reducer is a pure function. Wrap later as `(state, action) => sessionReducer(state, action, content)`.

- [ ] **Step 1: Write the failing tests**

`lib/game/session/reducer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeFixtureContent, makeQuestion, makeRound } from "../content/fixtures";
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/game/session/reducer.test.ts`

Expected: FAIL — module `./reducer` missing.

- [ ] **Step 3: Implement types, selectors, reducer**

`createSession` returns title screen, `lives: 3`, empty arrays, nullables null, `abilityUsed: false`.

`START` → `character`. `SELECT_CHARACTER` sets `characterId`, `roundIndex: 0`, `questionIndex: 0`, `screen: 'round-intro'`. `BEGIN_ROUND`: if `currentRound.questions.length === 0` then `data-error` + `dataError: 'Lỗi dữ liệu'`; else `fishing` and clear `caughtCorrectIds`, `hintedOptionId`, `pendingCatch`.

`SCORE_CATCH`: ignore if `screen !== 'fishing'`. Set `pendingCatch` to `optionId` then score immediately (bite = catch). If `optionId` is already in `caughtCorrectIds`, no-op. If correct: for `single`, `explainMode: 'success'`, `screen: 'explain'`, `pendingCatch: null`. For `multiple`, append id; if every `correctAnswerIds` is in `caughtCorrectIds`, same explain transition; else stay `fishing`. If wrong: `lives -= 1`, `lastWrongExplanation = question.explanation`, `pendingCatch: null`; if `lives <= 0` then `lives: 0`, `screen: 'round-fail'`.

`CONTINUE_AFTER_EXPLAIN`: if `explainMode === 'peek'`, return to `fishing` with `explainMode: null` (Task 3 uses this). If `success`, increment `questionIndex`, clear `caughtCorrectIds` / `hintedOptionId`. If no more questions, push `round.reward` onto `unlockedRewards` if not already present, `screen: 'round-clear'`. Else `screen: 'fishing'`.

`CONTINUE_AFTER_CLEAR`: if `roundIndex >= content.rounds.length - 1`, `screen: 'win'`. Else `roundIndex += 1`, `questionIndex: 0`, `screen: 'round-intro'`.

`RETRY_ROUND`: `lives: 3`, `questionIndex: 0`, `caughtCorrectIds: []`, `hintedOptionId: null`, `pendingCatch: null`, `screen: 'round-intro'`. Do not change `unlockedRewards`, `characterId`, or `abilityUsed`.

`USE_ABILITY`: return state unchanged in this task (Task 3 implements it).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/game/session/reducer.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/game/session/types.ts lib/game/session/selectors.ts \
  lib/game/session/reducer.ts lib/game/session/reducer.test.ts
git commit -m "feat: add session reducer for scoring, lives, and win"
```

---

### Task 3: One-shot character abilities

**Files:**
- Create: `lib/game/session/abilities.ts`
- Create: `lib/game/session/abilities.test.ts`
- Modify: `lib/game/session/reducer.ts` (`USE_ABILITY` branch)

**Interfaces:**
- Consumes: `SessionState`, `SessionAction`, `GameContent`, `currentQuestion` from Task 2
- Produces:
  - `type AbilityResult = { state: SessionState }`
  - `function applyAbility(state: SessionState, content: GameContent): SessionState`
  - Behavior:
    - If `abilityUsed` or `characterId` is null → return state
    - `persistent`: `lives = min(4, lives + 1)`, `abilityUsed: true`
    - `observer`: set `hintedOptionId` to the first option id that is not in `currentQuestion.correctAnswerIds` and not already hinted; `abilityUsed: true`. If none, still consume? **No** — if there is no wrong option, leave `abilityUsed` false. Production questions always have a distractor.
    - `careful`: if `lastWrongExplanation` is null, no-op. Else `explainMode: 'peek'`, `screen: 'explain'`, `abilityUsed: true`. Lives unchanged. `CONTINUE_AFTER_EXPLAIN` with peek returns to the same fishing question.

- [ ] **Step 1: Write the failing tests**

`lib/game/session/abilities.test.ts`:

```ts
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
```

Note: persistent starts at 3, +1 → 4, then four wrongs from 4 lives to 0. If the reducer fails the round at 0 after the fourth wrong, that is correct. If `USE_ABILITY` after three wrongs is needed to hit fail in fewer strokes, keep the four-wrong sequence.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/game/session/abilities.test.ts`

Expected: FAIL — `USE_ABILITY` does not change lives / hint / peek.

- [ ] **Step 3: Implement `applyAbility` and wire `USE_ABILITY`**

`lib/game/session/abilities.ts` implements the table above. `sessionReducer` on `USE_ABILITY` returns `applyAbility(state, content)`. Confirm `CONTINUE_AFTER_EXPLAIN` peek path from Task 2 works; if it was a no-op stub, implement it now.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/game/session/abilities.test.ts lib/game/session/reducer.test.ts`

Expected: PASS (both files).

- [ ] **Step 5: Commit**

```bash
git add lib/game/session/abilities.ts lib/game/session/abilities.test.ts \
  lib/game/session/reducer.ts
git commit -m "feat: add one-shot observer, persistent, and careful abilities"
```

---

### Task 4: Cast aim, power, and ballistic flight

**Files:**
- Create: `lib/game/fishing/constants.ts`
- Create: `lib/game/fishing/types.ts`
- Create: `lib/game/fishing/cast.ts`
- Create: `lib/game/fishing/cast.test.ts`

**Interfaces:**
- Consumes: none from session
- Produces:
  - Constants: `WATER_Y = 220`, `POND = { xMin: 40, xMax: 960, yMax: 540 }`, `MAX_CAST_DISTANCE = 520`, `GRAVITY = 1800`, `ROD_TIP = { x: 80, y: 180 }`
  - `type HookPhase = 'idle' | 'flying' | 'in-water' | 'reeling'`
  - `type HookState = { phase: HookPhase; x: number; y: number; vx: number; vy: number; flightDistance: number; bobberShake: number }`
  - `function chargePower(heldMs: number): number` — `clamp(heldMs / 900, 0, 1)`
  - `function aimAngle(rod: { x: number; y: number }, pointer: { x: number; y: number }): number` — `atan2(pointer.y - rod.y, pointer.x - rod.x)`, clamped to `[-Math.PI * 0.15, Math.PI * 0.55]` (mostly down-right)
  - `function startCast(angle: number, power: number): HookState` — speed `220 + power * 520`, `phase: 'flying'`, start at `ROD_TIP`
  - `function stepCast(hook: HookState, dt: number): { hook: HookState; landed: boolean; broken: boolean }` — apply gravity to `vy`, integrate, add traveled distance. If traveled `>= MAX_CAST_DISTANCE` before water: `broken: true`, reset toward idle (phase `reeling` or `idle` at rod). If `y >= WATER_Y`: snap `y` to `WATER_Y`, `phase: 'in-water'`, `landed: true`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { chargePower, startCast, stepCast } from "./cast";
import { MAX_CAST_DISTANCE, WATER_Y } from "./constants";

describe("cast", () => {
  it("charges power from 0 to 1 over 900ms", () => {
    expect(chargePower(0)).toBe(0);
    expect(chargePower(450)).toBeCloseTo(0.5);
    expect(chargePower(2000)).toBe(1);
  });

  it("lands on the waterline from a downward cast", () => {
    let hook = startCast(Math.PI / 3, 0.7);
    let landed = false;
    for (let i = 0; i < 200 && !landed; i++) {
      const step = stepCast(hook, 1 / 60);
      hook = step.hook;
      landed = step.landed;
    }
    expect(landed).toBe(true);
    expect(hook.phase).toBe("in-water");
    expect(hook.y).toBeCloseTo(WATER_Y);
  });

  it("stops at max cast distance instead of flying forever", () => {
    let hook = startCast(0, 1);
    let broken = false;
    for (let i = 0; i < 400 && !broken; i++) {
      const step = stepCast(hook, 1 / 60);
      hook = step.hook;
      broken = step.broken;
    }
    expect(broken).toBe(true);
    expect(hook.flightDistance).toBeGreaterThanOrEqual(MAX_CAST_DISTANCE);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/game/fishing/cast.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement constants, types, and cast**

Put `HookState` and later `Fish` / `SceneState` in `types.ts` now so later tasks extend the same file:

```ts
export type FishState = "swim" | "notice" | "bite" | "hooked" | "flee";

export type Fish = {
  optionId: string;
  text: string;
  isCorrect: boolean;
  x: number;
  y: number;
  speed: number;
  heading: number;
  depth: number;
  detectRadius: number;
  state: FishState;
};

export type SceneEvent =
  | { type: "cast-landed" }
  | { type: "fish-bite"; optionId: string }
  | { type: "reeled-in" };
```

Implement `cast.ts` as specified. Distance increment: `Math.hypot(vx * dt, vy * dt)` added to `flightDistance`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/game/fishing/cast.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/game/fishing/constants.ts lib/game/fishing/types.ts \
  lib/game/fishing/cast.ts lib/game/fishing/cast.test.ts
git commit -m "feat: add cast power, aim, and ballistic landing"
```

---

### Task 5: Hook sink, reel, current, clamp, pause

**Files:**
- Create: `lib/game/fishing/hook.ts`
- Create: `lib/game/fishing/hook.test.ts`
- Create: `lib/game/fishing/step.ts`
- Create: `lib/game/fishing/step.test.ts`

**Interfaces:**
- Consumes: `HookState` from Task 4; constants `WATER_Y`, `POND`, plus new `SINK_SPEED = 40`, `REEL_SPEED = 90`, `CURRENT = 12`, `HOOK_RADIUS = 28`
- Produces:
  - `type HookInput = { reel: boolean; drop: boolean }`
  - `function stepHook(hook: HookState, input: HookInput, dt: number): HookState` — only when `phase === 'in-water'`. Each frame: `y += SINK_SPEED * dt`; if `input.reel` then `y -= REEL_SPEED * dt`; if `input.drop` then `y += REEL_SPEED * dt`. `x += CURRENT * dt`. Clamp `x` to `[POND.xMin, POND.xMax]`. Clamp `y` to `(WATER_Y, POND.yMax]`. If `input.reel` and `y <= WATER_Y + 2`, set `phase: 'reeling'`, `y = WATER_Y`.
  - `function finishReel(hook: HookState): HookState` — `phase: 'idle'`, position `ROD_TIP`
  - `type SceneState = { paused: boolean; waterY: number; pond: typeof POND; rod: { tipX: number; tipY: number; angle: number; power: number; bend: number }; hook: HookState; fish: Fish[]; ripples: { x: number; y: number; age: number }[] }`
  - `type SceneInput = { pointer: { x: number; y: number } | null; charging: boolean; chargeMs: number; reel: boolean; drop: boolean; castNow: boolean; reelFull: boolean }`
  - `function createScene(fish: Fish[]): SceneState`
  - `function stepScene(scene: SceneState, input: SceneInput, dt: number): { scene: SceneState; events: SceneEvent[] }` — if `scene.paused`, return same scene and `events: []`. Otherwise step cast or hook. On land: push `{ type: 'cast-landed' }` and a ripple. On `reelFull` or finishing reel: `{ type: 'reeled-in' }`. Fish stepping is identity until Task 6 (leave `scene.fish` unchanged).

- [ ] **Step 1: Write the failing tests**

`lib/game/fishing/hook.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { POND, WATER_Y } from "./constants";
import { stepHook } from "./hook";
import type { HookState } from "./types";

function inWater(x: number, y: number): HookState {
  return { phase: "in-water", x, y, vx: 0, vy: 0, flightDistance: 0, bobberShake: 0 };
}

describe("stepHook", () => {
  it("sinks over time and stays below the waterline", () => {
    const next = stepHook(inWater(200, WATER_Y + 1), { reel: false, drop: false }, 1);
    expect(next.y).toBeGreaterThan(WATER_Y + 1);
    expect(next.y).toBeLessThanOrEqual(POND.yMax);
  });

  it("reels up and drops down", () => {
    const up = stepHook(inWater(200, 400), { reel: true, drop: false }, 1);
    const down = stepHook(inWater(200, 400), { reel: false, drop: true }, 1);
    expect(up.y).toBeLessThan(400);
    expect(down.y).toBeGreaterThan(400);
  });

  it("current shifts x but clamps to the pond", () => {
    const inner = stepHook(inWater(200, 300), { reel: false, drop: false }, 1);
    expect(inner.x).toBeGreaterThan(200);
    const edge = stepHook(inWater(POND.xMax, 300), { reel: false, drop: false }, 1);
    expect(edge.x).toBeLessThanOrEqual(POND.xMax);
    const left = stepHook(inWater(POND.xMin, 300), { reel: false, drop: false }, 1);
    expect(left.x).toBeGreaterThanOrEqual(POND.xMin);
  });
});
```

`lib/game/fishing/step.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createScene, stepScene } from "./step";
import { WATER_Y } from "./constants";
import type { HookState } from "./types";

const idleInput = {
  pointer: null,
  charging: false,
  chargeMs: 0,
  reel: false,
  drop: false,
  castNow: false,
  reelFull: false,
};

describe("stepScene pause", () => {
  it("does not move the hook or emit events when paused", () => {
    const scene = createScene([]);
    const hook: HookState = {
      phase: "in-water",
      x: 200,
      y: WATER_Y + 40,
      vx: 0,
      vy: 0,
      flightDistance: 100,
      bobberShake: 0,
    };
    scene.hook = hook;
    scene.paused = true;
    const { scene: next, events } = stepScene(scene, { ...idleInput, drop: true }, 1);
    expect(next.hook.x).toBe(200);
    expect(next.hook.y).toBe(WATER_Y + 40);
    expect(events).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/game/fishing/hook.test.ts lib/game/fishing/step.test.ts`

Expected: FAIL — modules missing.

- [ ] **Step 3: Implement hook + stepScene**

`createScene` sets `paused: false`, `waterY: WATER_Y`, `pond: POND`, rod at `ROD_TIP` with `angle: Math.PI / 4`, `power: 0`, `bend: 0`, idle hook at rod tip, `ripples: []`.

When not paused and `hook.phase === 'flying'`, call `stepCast`. When `in-water`, call `stepHook`. `rod.bend` = `power` while charging, else a small value while `in-water` / `reeling` (e.g. `0.35`). Age ripples (`age += dt`, drop when `age > 0.6`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/game/fishing/hook.test.ts lib/game/fishing/step.test.ts lib/game/fishing/cast.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/game/fishing/hook.ts lib/game/fishing/hook.test.ts \
  lib/game/fishing/step.ts lib/game/fishing/step.test.ts \
  lib/game/fishing/constants.ts lib/game/fishing/types.ts
git commit -m "feat: sink, reel, current-clamp hook and pause the scene"
```

---

### Task 6: Fish spawn and AI

**Files:**
- Create: `lib/game/fishing/fish.ts`
- Create: `lib/game/fishing/fish.test.ts`
- Modify: `lib/game/fishing/step.ts` (call `stepFish` / bites)
- Modify: `lib/game/fishing/constants.ts` — `BASE_SPEED = 55`, `BASE_DETECT = 70`, `CORRECT_DETECT_BONUS = 1.35`, `CORRECT_SPEED_BONUS = 1.2`

**Interfaces:**
- Consumes: `Fish`, `HookState`, `SceneState`, `HOOK_RADIUS`, `WATER_Y`, `POND`
- Produces:
  - `type SpawnOption = { optionId: string; text: string; isCorrect: boolean }`
  - `function spawnFish(options: SpawnOption[]): Fish[]` — one fish per option, `y` in `(WATER_Y + 30, POND.yMax - 20]`, spread `x` across the pond, `state: 'swim'`. If `isCorrect`, `detectRadius = BASE_DETECT * CORRECT_DETECT_BONUS` and `speed = BASE_SPEED * CORRECT_SPEED_BONUS`; else base values. `depth` = that fish’s initial `y`.
  - `function stepFish(fish: Fish, hook: HookState, dt: number): { fish: Fish; bite: boolean }`
    - Always clamp `y` to `> WATER_Y`.
    - If `state` is `hooked` or `flee`: `flee` swims away (increase `x` by heading * speed); return `bite: false`.
    - If hook is not `in-water`: stay `swim`, patrol (`x += cos(heading) * speed * dt`, bounce heading at pond `x` edges).
    - If hook `in-water` and distance to hook `<= detectRadius` and `|hook.y - depth| < 80`: `notice`, steer toward hook.
    - If distance `<= HOOK_RADIUS`: `state: 'bite'` then immediately `hooked`, `bite: true`.
  - `function fleeWrong(fish: Fish[], optionId: string): Fish[]` — matching fish → `flee`; others unchanged.
  - `function fleeAll(fish: Fish[]): Fish[]`
  - `stepScene` runs `stepFish` for each fish when not paused; on first `bite: true` emit `{ type: 'fish-bite', optionId }` and set `hook.bobberShake = 1`. Ignore later bites in the same tick.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { HOOK_RADIUS, POND, WATER_Y } from "./constants";
import { spawnFish, stepFish } from "./fish";
import type { HookState } from "./types";

function hookAt(x: number, y: number): HookState {
  return { phase: "in-water", x, y, vx: 0, vy: 0, flightDistance: 0, bobberShake: 0 };
}

describe("fish", () => {
  it("spawns one fish per option, all below water, correct hungrier", () => {
    const fish = spawnFish([
      { optionId: "yes", text: "Yes", isCorrect: true },
      { optionId: "no", text: "No", isCorrect: false },
    ]);
    expect(fish).toHaveLength(2);
    for (const f of fish) {
      expect(f.y).toBeGreaterThan(WATER_Y);
      expect(f.x).toBeGreaterThanOrEqual(POND.xMin);
      expect(f.x).toBeLessThanOrEqual(POND.xMax);
    }
    const yes = fish.find((f) => f.optionId === "yes")!;
    const no = fish.find((f) => f.optionId === "no")!;
    expect(yes.detectRadius).toBeGreaterThan(no.detectRadius);
    expect(yes.speed).toBeGreaterThan(no.speed);
  });

  it("notices bait in range then bites inside the hook radius", () => {
    const [f0] = spawnFish([{ optionId: "a", text: "A", isCorrect: true }]);
    const fish = { ...f0, x: 300, y: 300, depth: 300, detectRadius: 80, state: "swim" as const };
    const noticed = stepFish(fish, hookAt(320, 310), 1 / 60).fish;
    expect(noticed.state).toBe("notice");
    const close = { ...noticed, x: 300, y: 300 };
    const bitten = stepFish(close, hookAt(300 + HOOK_RADIUS / 2, 300), 1 / 60);
    expect(bitten.bite).toBe(true);
    expect(bitten.fish.state).toBe("hooked");
  });

  it("never swims above the waterline", () => {
    const fish = {
      optionId: "a",
      text: "A",
      isCorrect: false,
      x: 100,
      y: WATER_Y - 40,
      speed: 40,
      heading: -Math.PI / 2,
      depth: WATER_Y + 10,
      detectRadius: 10,
      state: "swim" as const,
    };
    const next = stepFish(fish, hookAt(0, 0), 1).fish;
    expect(next.y).toBeGreaterThan(WATER_Y);
  });
});
```

Add to `step.test.ts`:

```ts
it("emits fish-bite once when a fish reaches the hook", () => {
  const scene = createScene([]);
  scene.hook = {
    phase: "in-water",
    x: 300,
    y: 300,
    vx: 0,
    vy: 0,
    flightDistance: 0,
    bobberShake: 0,
  };
  scene.fish = [{
    optionId: "a",
    text: "A",
    isCorrect: true,
    x: 300,
    y: 300,
    speed: 10,
    heading: 0,
    depth: 300,
    detectRadius: 80,
    state: "swim",
  }];
  const { events } = stepScene(scene, idleInput, 1 / 60);
  expect(events.some((e) => e.type === "fish-bite" && e.optionId === "a")).toBe(true);
});
```

(`idleInput` is the object already in `step.test.ts`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/game/fishing/fish.test.ts lib/game/fishing/step.test.ts`

Expected: FAIL — `spawnFish` missing; no `fish-bite` event.

- [ ] **Step 3: Implement fish.ts and wire stepScene**

Patrol bounce: if `x < POND.xMin` set `x = POND.xMin`, `heading = 0`; if `x > POND.xMax` flip to `Math.PI`. Notice steering: `heading = atan2(hook.y - fish.y, hook.x - fish.x)`. After bite, do not emit a second bite for that fish (`state === 'hooked'`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/game/fishing`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/game/fishing/fish.ts lib/game/fishing/fish.test.ts \
  lib/game/fishing/step.ts lib/game/fishing/step.test.ts \
  lib/game/fishing/constants.ts
git commit -m "feat: spawn option fish and resolve bites in hook range"
```

---

### Task 7: Screen shell wired to the session

**Files:**
- Create: `components/game/GameApp.tsx`
- Create: `components/game/screens/TitleScreen.tsx`
- Create: `components/game/screens/CharacterSelect.tsx`
- Create: `components/game/screens/RoundIntro.tsx`
- Create: `components/game/screens/ExplainScreen.tsx`
- Create: `components/game/screens/RoundFail.tsx`
- Create: `components/game/screens/RoundClear.tsx`
- Create: `components/game/screens/WinScreen.tsx`
- Create: `components/game/screens/DataError.tsx`
- Create: `components/game/GameApp.test.tsx`
- Modify: `package.json` — add `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`

**Interfaces:**
- Consumes: `createSession`, `sessionReducer`, `GameContent`, `CharacterId`
- Produces:
  - `function GameApp(props: { content: GameContent; FishingSlot?: React.ComponentType<{ state: SessionState; dispatch: Dispatch<SessionAction>; content: GameContent }> })`
  - Default `FishingSlot` is a `<div role="region" aria-label="fishing-scene">` plus question text and a button per option `role="button" name={option.text}` that `dispatch({ type: 'SCORE_CATCH', optionId })` so screens can be tested without canvas. Task 8 replaces the default with `FishingScene`.
  - Character cards labeled `Người quan sát`, `Người kiên trì`, `Người sâu sát`.
  - Ability button `aria-label="dùng năng lực"` disabled when `abilityUsed`.
  - Fail button text `Thử lại vòng này`.

- [ ] **Step 1: Install Testing Library and write the failing test**

```bash
npm install -D jsdom @testing-library/react @testing-library/dom @testing-library/user-event
```

Add `// @vitest-environment jsdom` at the top of `GameApp.test.tsx`.

```tsx
/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { makeFixtureContent } from "@/lib/game/content/fixtures";
import { GameApp } from "./GameApp";

describe("GameApp", () => {
  it("plays title → character → round → catch → explain", async () => {
    const user = userEvent.setup();
    render(<GameApp content={makeFixtureContent()} />);
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
    render(<GameApp content={content} />);
    await user.click(screen.getByRole("button", { name: /bắt đầu/i }));
    await user.click(screen.getByRole("button", { name: /người quan sát/i }));
    await user.click(screen.getByRole("button", { name: /vào vòng/i }));
    expect(screen.getByText("Lỗi dữ liệu")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/game/GameApp.test.tsx`

Expected: FAIL — `GameApp` not found.

- [ ] **Step 3: Implement screens and GameApp**

`"use client"` on `GameApp`. `const reduce = (s, a) => sessionReducer(s, a, content)`. `useReducer(reduce, content, createSession)`.

Switch on `state.screen`. Vietnamese button labels must match the test regexes: `Bắt đầu`, `Vào vòng`, `Tiếp tục` on explain/clear, `Thử lại vòng này` on fail. Win lists all `unlockedRewards`. HUD on fishing: lives, round title, `caughtCorrectIds.length` / `correctAnswerIds.length` for multiple, fragments, ability button.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- components/game/GameApp.test.tsx lib/game/session`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/game package.json package-lock.json
git commit -m "feat: wire classroom screens to the session reducer"
```

---

### Task 8: Fishing canvas, HUD, and app mount

**Files:**
- Create: `components/game/FishingScene.tsx`
- Create: `components/game/FishingHud.tsx`
- Modify: `components/game/GameApp.tsx` — default slot = `FishingScene`; keep option buttons **out** of the live scene (canvas only). Tests that click option buttons must pass `FishingSlot` stub: change `GameApp.test.tsx` to pass an explicit stub identical to Task 7’s default, and add one test that `FishingScene` renders a canvas.
- Create: `components/game/FishingScene.test.tsx`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx` — `title: "Câu Cá Tri Thức"`, `description: "Giải mã quyền lực"`, `lang="vi"`
- Modify: `app/globals.css` — full-viewport dark water background (`#0b3a4a` / `#071c24`), no white create-next-app chrome

**Interfaces:**
- Consumes: `createScene`, `stepScene`, `spawnFish`, `fleeWrong`, `aimAngle`, `chargePower`, `startCast`, session selectors
- Produces: `FishingScene` that:
  - Creates scene in a `useRef` when `question.id` changes: `spawnFish(options.map(o => ({ optionId: o.id, text: o.text, isCorrect: question.correctAnswerIds.includes(o.id) })))`.
  - rAF loop calls `stepScene` with pointer / charge / reel / drop / `castNow` / `reelFull`.
  - On `fish-bite`, `dispatch({ type: 'SCORE_CATCH', optionId })` once per event. After wrong score (parent will drop a life), call `fleeWrong` on the ref for that id. After success explain, the component unmounts or respawns on next question.
  - `document.visibilityState !== 'visible'` sets `scene.paused = true`.
  - Pointer down starts charge; move updates aim; up casts if `hook.phase === 'idle'`. ArrowUp/`W` reel, ArrowDown/`S` drop, `R` `reelFull`.
  - Draw: sky/shore, sine waterline, fish as ellipses (no full answer text on the body), rod line from tip to hook, bent rod, bobber at `(hook.x, waterY)` while in water, ripples, shake offset when `bobberShake > 0`.
  - HUD overlay (DOM, not canvas): question, instruction, lives, fragments, last caught option text, ability button, *Kéo hết dây* button.

- [ ] **Step 1: Write the failing canvas test**

```tsx
/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeFixtureContent } from "@/lib/game/content/fixtures";
import { createSession, sessionReducer } from "@/lib/game/session/reducer";
import { FishingScene } from "./FishingScene";

describe("FishingScene", () => {
  it("renders a canvas for the current question", () => {
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 0) as unknown as number,
    );
    vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
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
```

Update `GameApp.test.tsx` to pass a `FishingSlot` stub that still exposes option buttons (copy the Task 7 default into the test file as `function StubFishing`). Production `GameApp` uses `FishingScene`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- components/game/FishingScene.test.tsx`

Expected: FAIL — `FishingScene` missing.

- [ ] **Step 3: Implement canvas scene, HUD, page**

`app/page.tsx`:

```tsx
import { GameApp } from "@/components/game/GameApp";
import raw from "../../question.json";
import { validateContent } from "@/lib/game/content/validate";

export default function Home() {
  const result = validateContent(raw);
  if (!result.ok) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p>{result.error}</p>
      </main>
    );
  }
  return <GameApp content={result.content} />;
}
```

If TypeScript complains about the JSON import, add `resolveJsonModule` (already on) or `as unknown`.

Draw loop must read/write only the ref. React state allowed for HUD mirrors (`lastCaughtText`) on events, not per frame.

- [ ] **Step 4: Run unit tests, then a production typecheck**

Run: `npm test`

Expected: PASS (all tasks).

Run: `npx tsc --noEmit`

Expected: exit 0.

Manual (do not skip when executing this task): `npm run dev`, open `/`, play one fixture-length path and one production cast (angle, charge, line, sink, reel, bite). Hidden-tab the window and confirm the pond freezes.

- [ ] **Step 5: Commit**

```bash
git add components/game app/page.tsx app/layout.tsx app/globals.css
git commit -m "feat: render fishing canvas and mount the classroom game"
```

---

## Execution notes

- TDD: red → implement → green → commit, per task. Do not start Task N+1 with a red suite.
- Do not add sound, save, multiplayer, or a physics library.
- When in doubt about copy or flow, follow the spec, not `questionsPerPlay`.
