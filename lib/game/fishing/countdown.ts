export const QUESTION_HOLD_MS = 1500;
export const CAST_COUNTDOWN_MS = 5000;

export type PrepPhase = "question" | "countdown" | "ready";

export function prepPhase(elapsedMs: number): PrepPhase {
  if (elapsedMs < QUESTION_HOLD_MS) return "question";
  if (elapsedMs < QUESTION_HOLD_MS + CAST_COUNTDOWN_MS) return "countdown";
  return "ready";
}

export function remainingCountdown(elapsedMs: number): number {
  const intoCountdown = elapsedMs - QUESTION_HOLD_MS;
  if (intoCountdown < 0) return 5;
  return Math.max(0, Math.ceil((CAST_COUNTDOWN_MS - intoCountdown) / 1000));
}

export function canCast(elapsedMs: number): boolean {
  return elapsedMs >= QUESTION_HOLD_MS + CAST_COUNTDOWN_MS;
}
