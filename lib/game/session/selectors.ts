import type { GameContent, GameQuestion, GameRound } from "../content/types";
import type { SessionState } from "./types";

export function currentRound(
  state: SessionState,
  content: GameContent,
): GameRound | null {
  return content.rounds[state.roundIndex] ?? null;
}

export function currentQuestion(
  state: SessionState,
  content: GameContent,
): GameQuestion | null {
  const round = currentRound(state, content);
  return round?.questions[state.questionIndex] ?? null;
}
