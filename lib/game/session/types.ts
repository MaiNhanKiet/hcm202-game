export const STARTING_LIVES = 3;
export const MAX_LIVES = 4;

export type Screen =
  | "title"
  | "character"
  | "round-intro"
  | "fishing"
  | "explain"
  | "round-fail"
  | "round-clear"
  | "win"
  | "data-error";

export type CharacterId = "observer" | "persistent" | "careful";

export type ExplainMode = "success" | "peek" | null;

export type SessionState = {
  screen: Screen;
  characterId: CharacterId | null;
  abilityUsed: boolean;
  roundIndex: number;
  questionIndex: number;
  lives: number;
  caughtCorrectIds: string[];
  unlockedRewards: string[];
  pendingCatch: string | null;
  lastWrongExplanation: string | null;
  hintedOptionId: string | null;
  dataError: string | null;
  explainMode: ExplainMode;
};

export type SessionAction =
  | { type: "START" }
  | { type: "SELECT_CHARACTER"; characterId: CharacterId }
  | { type: "BEGIN_ROUND" }
  | { type: "SCORE_CATCH"; optionId: string }
  | { type: "CONTINUE_AFTER_EXPLAIN" }
  | { type: "CONTINUE_AFTER_CLEAR" }
  | { type: "RETRY_ROUND" }
  | { type: "USE_ABILITY" };
