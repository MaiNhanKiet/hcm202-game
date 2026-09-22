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

export type FishState = "swim" | "notice" | "bite" | "hooked" | "flee" | "jump";

export type FishKind = "answer" | "bomb" | "trash" | "weed" | "net";

export type Fish = {
  optionId: string;
  text: string;
  isCorrect: boolean;
  kind: FishKind;
  /** Stable A/B/C index from spawn — survives other fish being removed. */
  labelIndex: number;
  x: number;
  y: number;
  speed: number;
  heading: number;
  /** Preferred left/right swim direction when not chasing bait. */
  homeHeading: number;
  depth: number;
  detectRadius: number;
  state: FishState;
  /** Time until next free-swim turn. */
  turnTimer: number;
  /** Phase for wobble / jump timing. */
  phase: number;
  jumpVy: number;
};

export type SceneEvent =
  | { type: "cast-landed" }
  | { type: "fish-bite"; optionId: string }
  | { type: "fish-landed"; optionId: string }
  | { type: "hazard-hit"; kind: "bomb" | "trash" | "weed" | "net" }
  | { type: "reeled-in" };

export type HookInput = { reel: boolean };

export type SceneInput = {
  pointer: { x: number; y: number } | null;
  charging: boolean;
  chargeMs: number;
  reel: boolean;
  castNow: boolean;
  reelFull: boolean;
};

export type SceneState = {
  paused: boolean;
  waterY: number;
  pond: { xMin: number; xMax: number; yMax: number };
  rod: {
    tipX: number;
    tipY: number;
    angle: number;
    power: number;
    bend: number;
    swing: number;
    swinging: boolean;
  };
  hook: HookState;
  fish: Fish[];
  ripples: { x: number; y: number; age: number }[];
  castTrail: { x: number; y: number; age: number }[];
  roundIndex: number;
};
