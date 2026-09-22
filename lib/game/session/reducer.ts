import type { GameContent } from "../content/types";
import { applyAbility } from "./abilities";
import { currentQuestion, currentRound } from "./selectors";
import {
  STARTING_LIVES,
  type SessionAction,
  type SessionState,
} from "./types";

export { currentQuestion, currentRound } from "./selectors";
export { STARTING_LIVES, MAX_LIVES } from "./types";

export function createSession(content: GameContent): SessionState {
  void content;
  return {
    screen: "title",
    characterId: null,
    abilityUsed: false,
    roundIndex: 0,
    questionIndex: 0,
    lives: STARTING_LIVES,
    caughtCorrectIds: [],
    unlockedRewards: [],
    pendingCatch: null,
    lastWrongExplanation: null,
    hintedOptionId: null,
    dataError: null,
    explainMode: null,
  };
}

function scoreCatch(
  state: SessionState,
  optionId: string,
  content: GameContent,
): SessionState {
  if (state.screen !== "fishing") return state;
  if (state.caughtCorrectIds.includes(optionId)) return state;
  const question = currentQuestion(state, content);
  if (!question) return state;

  const correct = question.correctAnswerIds.includes(optionId);
  if (correct) {
    if (question.type === "single") {
      return {
        ...state,
        pendingCatch: null,
        explainMode: "success",
        screen: "explain",
      };
    }
    const caughtCorrectIds = [...state.caughtCorrectIds, optionId];
    const complete = question.correctAnswerIds.every((id) =>
      caughtCorrectIds.includes(id),
    );
    if (complete) {
      return {
        ...state,
        caughtCorrectIds,
        pendingCatch: null,
        explainMode: "success",
        screen: "explain",
      };
    }
    return { ...state, caughtCorrectIds, pendingCatch: null };
  }

  const lives = state.lives - 1;
  if (lives <= 0) {
    return {
      ...state,
      lives: 0,
      pendingCatch: null,
      lastWrongExplanation: question.explanation,
      screen: "round-fail",
    };
  }
  return {
    ...state,
    lives,
    pendingCatch: null,
    lastWrongExplanation: question.explanation,
  };
}

function continueAfterExplain(
  state: SessionState,
  content: GameContent,
): SessionState {
  if (state.explainMode === "peek") {
    return { ...state, screen: "fishing", explainMode: null };
  }
  const round = currentRound(state, content);
  if (!round) return state;
  const nextIndex = state.questionIndex + 1;
  if (nextIndex >= round.questions.length) {
    const unlockedRewards = state.unlockedRewards.includes(round.reward)
      ? state.unlockedRewards
      : [...state.unlockedRewards, round.reward];
    return {
      ...state,
      questionIndex: nextIndex,
      caughtCorrectIds: [],
      hintedOptionId: null,
      explainMode: null,
      unlockedRewards,
      screen: "round-clear",
    };
  }
  return {
    ...state,
    questionIndex: nextIndex,
    caughtCorrectIds: [],
    hintedOptionId: null,
    explainMode: null,
    screen: "fishing",
  };
}

export function sessionReducer(
  state: SessionState,
  action: SessionAction,
  content: GameContent,
): SessionState {
  switch (action.type) {
    case "START":
      return { ...state, screen: "character" };
    case "SELECT_CHARACTER":
      return {
        ...state,
        characterId: action.characterId,
        roundIndex: 0,
        questionIndex: 0,
        screen: "round-intro",
      };
    case "BEGIN_ROUND": {
      const round = currentRound(state, content);
      if (!round || round.questions.length === 0) {
        return {
          ...state,
          screen: "data-error",
          dataError: "Lỗi dữ liệu",
        };
      }
      return {
        ...state,
        screen: "fishing",
        caughtCorrectIds: [],
        hintedOptionId: null,
        pendingCatch: null,
        dataError: null,
      };
    }
    case "SCORE_CATCH":
      return scoreCatch(state, action.optionId, content);
    case "CONTINUE_AFTER_EXPLAIN":
      return continueAfterExplain(state, content);
    case "CONTINUE_AFTER_CLEAR":
      if (state.roundIndex >= content.rounds.length - 1) {
        return { ...state, screen: "win" };
      }
      return {
        ...state,
        roundIndex: state.roundIndex + 1,
        questionIndex: 0,
        screen: "round-intro",
      };
    case "RETRY_ROUND":
      return {
        ...state,
        lives: STARTING_LIVES,
        questionIndex: 0,
        caughtCorrectIds: [],
        hintedOptionId: null,
        pendingCatch: null,
        screen: "round-intro",
      };
    case "USE_ABILITY":
      return applyAbility(state, content);
    default:
      return state;
  }
}
