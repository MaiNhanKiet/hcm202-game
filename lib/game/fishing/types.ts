export type HookPhase = "idle" | "flying" | "in-water" | "reeling";

export type HookState = {
  phase: HookPhase;
  x: number;
  y: number;
  vx: number;
  vy: number;
  flightDistance: number;
  bobberShake: number;
};

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
