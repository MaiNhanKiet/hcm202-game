export type GameOption = { id: string; text: string };

export type GameQuestion = {
  id: string;
  type: "single" | "multiple";
  question: string;
  instruction: string;
  options: GameOption[];
  correctAnswerIds: string[];
  explanation: string;
};

export type GameRound = {
  id: string;
  title: string;
  subtitle: string;
  reward: string;
  questions: GameQuestion[];
};

export type GameContent = {
  title: string;
  subtitle: string;
  rounds: GameRound[];
};

export type ValidateContentResult =
  | { ok: true; content: GameContent }
  | { ok: false; error: string };
