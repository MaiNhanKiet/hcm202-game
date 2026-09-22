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
