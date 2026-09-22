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
