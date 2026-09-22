import type {
  GameContent,
  GameQuestion,
  GameRound,
  ValidateContentResult,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function keepQuestion(raw: unknown): GameQuestion | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  const type = raw.type === "single" || raw.type === "multiple" ? raw.type : null;
  const question = asString(raw.question);
  const instruction = asString(raw.instruction);
  const explanation = asString(raw.explanation);
  if (!id || !type || !question || !instruction || !explanation) return null;
  if (!Array.isArray(raw.options) || !Array.isArray(raw.correctAnswerIds)) {
    return null;
  }
  const options = raw.options.flatMap((option) => {
    if (!isRecord(option)) return [];
    const optionId = asString(option.id);
    const text = asString(option.text);
    return optionId && text ? [{ id: optionId, text }] : [];
  });
  const correctAnswerIds = raw.correctAnswerIds.filter(
    (value): value is string => typeof value === "string",
  );
  const optionIds = new Set(options.map((option) => option.id));
  if (
    options.length === 0 ||
    correctAnswerIds.length === 0 ||
    correctAnswerIds.some((correctId) => !optionIds.has(correctId))
  ) {
    return null;
  }
  return { id, type, question, instruction, options, correctAnswerIds, explanation };
}

export function playableQuestions(round: GameRound): GameQuestion[] {
  return round.questions;
}

export function validateContent(raw: unknown): ValidateContentResult {
  if (!isRecord(raw) || !isRecord(raw.game) || !Array.isArray(raw.rounds)) {
    return { ok: false, error: "Lỗi dữ liệu" };
  }
  const title = asString(raw.game.title);
  const subtitle = asString(raw.game.subtitle);
  if (!title || !subtitle) {
    return { ok: false, error: "Lỗi dữ liệu" };
  }
  if (
    raw.game.totalRounds !== undefined &&
    raw.game.totalRounds !== raw.rounds.length
  ) {
    return { ok: false, error: "Lỗi dữ liệu" };
  }

  const rounds: GameRound[] = [];
  for (const rawRound of raw.rounds) {
    if (!isRecord(rawRound) || !Array.isArray(rawRound.questions)) {
      return { ok: false, error: "Lỗi dữ liệu" };
    }
    const id = asString(rawRound.id);
    const roundTitle = asString(rawRound.title);
    const roundSubtitle = asString(rawRound.subtitle);
    const reward = asString(rawRound.reward);
    if (!id || !roundTitle || !roundSubtitle || !reward) {
      return { ok: false, error: "Lỗi dữ liệu" };
    }
    const questions = rawRound.questions.flatMap((question) => {
      const kept = keepQuestion(question);
      return kept ? [kept] : [];
    });
    if (questions.length === 0) {
      return { ok: false, error: "Lỗi dữ liệu" };
    }
    rounds.push({
      id,
      title: roundTitle,
      subtitle: roundSubtitle,
      reward,
      questions,
    });
  }

  const content: GameContent = { title, subtitle, rounds };
  return { ok: true, content };
}
