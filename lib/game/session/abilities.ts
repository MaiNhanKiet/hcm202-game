import type { GameContent } from "../content/types";
import { currentQuestion } from "./selectors";
import { MAX_LIVES, type SessionState } from "./types";

export type AbilityResult = { state: SessionState };

export function applyAbility(
  state: SessionState,
  content: GameContent,
): SessionState {
  if (state.abilityUsed || state.characterId === null) return state;

  if (state.characterId === "persistent") {
    return {
      ...state,
      lives: Math.min(MAX_LIVES, state.lives + 1),
      abilityUsed: true,
    };
  }

  if (state.characterId === "observer") {
    const question = currentQuestion(state, content);
    if (!question) return state;
    const hintedOptionId = question.options.find(
      (option) => !question.correctAnswerIds.includes(option.id),
    )?.id;
    if (!hintedOptionId) return state;
    return { ...state, hintedOptionId, abilityUsed: true };
  }

  if (state.characterId === "careful") {
    if (!state.lastWrongExplanation) return state;
    return {
      ...state,
      explainMode: "peek",
      screen: "explain",
      abilityUsed: true,
    };
  }

  return state;
}
