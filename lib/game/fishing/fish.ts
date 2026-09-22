import {
  BASE_DETECT,
  BASE_SPEED,
  CORRECT_DETECT_BONUS,
  CORRECT_SPEED_BONUS,
  HOOK_RADIUS,
  POND,
  WATER_Y,
} from "./constants";
import {
  roundDifficulty,
  type RoundDifficulty,
} from "./difficulty";
import type { Fish, FishKind, HookState } from "./types";

export type SpawnOption = { optionId: string; text: string; isCorrect: boolean };

const JUMP_GRAVITY = 520;

export function isHazardKind(kind: FishKind): kind is Exclude<FishKind, "answer"> {
  return kind === "bomb" || kind === "trash" || kind === "weed" || kind === "net";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hashUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function bounceEdges(fish: Fish): Fish {
  const next = { ...fish };
  if (next.x < POND.xMin) {
    next.x = POND.xMin;
    next.heading = Math.abs(next.heading) < Math.PI / 2 ? next.heading : 0.2;
    next.homeHeading = 0;
  } else if (next.x > POND.xMax) {
    next.x = POND.xMax;
    next.heading = Math.PI - 0.2;
    next.homeHeading = Math.PI;
  }
  const minY = WATER_Y + 8;
  const maxY = POND.yMax - 20;
  if (next.state !== "jump") {
    if (next.y < minY) {
      next.y = minY;
      next.depth = Math.max(next.depth, minY + 10);
    }
    if (next.y > maxY) {
      next.y = maxY;
      next.depth = Math.min(next.depth, maxY - 10);
    }
  }
  return next;
}

/** Free swim: curved paths, depth wobble, occasional surface jumps. */
function freeSwim(fish: Fish, dt: number, diff: RoundDifficulty): Fish {
  let next: Fish = {
    ...fish,
    state: fish.state === "jump" ? "jump" : "swim",
    phase: fish.phase + dt,
    turnTimer: fish.turnTimer - dt,
  };

  if (next.state === "jump") {
    next.jumpVy += JUMP_GRAVITY * dt;
    next.y += next.jumpVy * dt;
    next.x += Math.cos(next.heading) * next.speed * 0.55 * dt;
    if (next.y >= WATER_Y + 2 && next.jumpVy > 0) {
      next.y = WATER_Y + 4;
      next.jumpVy = 0;
      next.state = "swim";
      next.depth = WATER_Y + 40 + hashUnit(next.phase * 10) * 80;
    }
    return bounceEdges(next);
  }

  if (next.turnTimer <= 0) {
    const turn =
      (hashUnit(next.phase * 17 + next.labelIndex) - 0.5) * 1.4 * diff.turnRate;
    next.heading += turn;
    next.homeHeading = Math.cos(next.heading) >= 0 ? 0 : Math.PI;
    next.turnTimer = 0.6 + hashUnit(next.phase * 3 + next.x) * (1.8 / diff.turnRate);
    // Drift preferred depth a bit so paths aren't flat.
    next.depth = clamp(
      next.depth + (hashUnit(next.phase * 9) - 0.5) * diff.wobble,
      WATER_Y + 24,
      POND.yMax - 30,
    );
  }

  // Curving swim + vertical bob toward preferred depth.
  const wobbleY = Math.sin(next.phase * 2.1 + next.labelIndex) * (diff.wobble * 0.35);
  const targetY = next.depth + wobbleY;
  next.heading += Math.sin(next.phase * 1.3 + next.labelIndex) * 0.55 * dt;
  next.x += Math.cos(next.heading) * next.speed * dt;
  next.y += (targetY - next.y) * Math.min(1, dt * 1.8);
  next.y += Math.sin(next.heading) * next.speed * 0.22 * dt;

  if (
    next.kind === "answer" &&
    next.y < WATER_Y + 55 &&
    hashUnit(next.phase * 5 + next.x * 0.01) < diff.jumpChance * (dt * 60)
  ) {
    next.state = "jump";
    next.jumpVy = -(210 + hashUnit(next.phase) * 90);
  }

  return bounceEdges(next);
}

function makeFish(params: {
  optionId: string;
  text: string;
  isCorrect: boolean;
  kind: FishKind;
  labelIndex: number;
  x: number;
  y: number;
  speed: number;
  detectRadius: number;
  homeHeading: number;
}): Fish {
  return {
    optionId: params.optionId,
    text: params.text,
    isCorrect: params.isCorrect,
    kind: params.kind,
    labelIndex: params.labelIndex,
    x: params.x,
    y: params.y,
    speed: params.speed,
    heading: params.homeHeading,
    homeHeading: params.homeHeading,
    depth: params.y,
    detectRadius: params.detectRadius,
    state: "swim",
    turnTimer: 0.4 + hashUnit(params.labelIndex + 1) * 1.2,
    phase: hashUnit(params.labelIndex * 13) * Math.PI * 2,
    jumpVy: 0,
  };
}

export function spawnFish(
  options: SpawnOption[],
  roundIndex = 0,
): Fish[] {
  const diff = roundDifficulty(roundIndex);
  const spawnMin = 160;
  const spawnMax = 720;
  const span = spawnMax - spawnMin;
  const answers = options.map((option, index) => {
    const x =
      spawnMin + ((index + 1) / (options.length + 1)) * span;
    const y = WATER_Y + 30 + ((index * 47) % (POND.yMax - WATER_Y - 50));
    const speed =
      (option.isCorrect
        ? BASE_SPEED * CORRECT_SPEED_BONUS
        : BASE_SPEED) * diff.speedMult;
    const detectRadius = option.isCorrect
      ? BASE_DETECT * CORRECT_DETECT_BONUS * diff.correctDetectMult
      : BASE_DETECT * Math.min(1.15, 1 + roundIndex * 0.05);
    const homeHeading = index % 2 === 0 ? 0 : Math.PI;
    return makeFish({
      optionId: option.optionId,
      text: option.text,
      isCorrect: option.isCorrect,
      kind: "answer",
      labelIndex: index,
      x,
      y,
      speed,
      detectRadius,
      homeHeading,
    });
  });

  const hazards: Fish[] = [];
  let label = options.length;

  const pushHazard = (
    kind: Exclude<FishKind, "answer">,
    i: number,
    text: string,
    seed: number,
    speedFactor: number,
    detectFactor: number,
  ) => {
    const x = spawnMin + hashUnit(seed + i + roundIndex) * span;
    const y =
      WATER_Y + 40 + hashUnit(seed * 2 + i + 3) * (POND.yMax - WATER_Y - 80);
    hazards.push(
      makeFish({
        optionId: `__${kind}_${i}`,
        text,
        isCorrect: false,
        kind,
        labelIndex: label,
        x,
        y,
        speed: BASE_SPEED * speedFactor * diff.speedMult,
        detectRadius: BASE_DETECT * detectFactor * Math.min(1.35, 1 + roundIndex * 0.06),
        homeHeading: i % 2 === 0 ? Math.PI : 0,
      }),
    );
    label += 1;
  };

  for (let i = 0; i < diff.bombCount; i += 1) {
    pushHazard("bomb", i, "Bom", 20, 0.85, 0.75);
  }
  for (let i = 0; i < diff.trashCount; i += 1) {
    pushHazard("trash", i, "Rác", 60, 0.65, 0.7);
  }
  for (let i = 0; i < diff.weedCount; i += 1) {
    pushHazard("weed", i, "Rong", 100, 0.45, 0.95);
  }
  for (let i = 0; i < diff.netCount; i += 1) {
    pushHazard("net", i, "Lưới", 140, 0.55, 1.1);
  }

  return [...answers, ...hazards];
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function stepFish(
  fish: Fish,
  hook: HookState,
  dt: number,
  roundIndex = 0,
): { fish: Fish; bite: boolean } {
  const diff = roundDifficulty(roundIndex);

  if (fish.state === "hooked") {
    return { fish, bite: false };
  }

  if (fish.state === "flee") {
    const fled = {
      ...fish,
      x: fish.x + Math.cos(fish.heading) * fish.speed * 1.4 * dt,
      y: Math.max(WATER_Y + 0.5, fish.y),
    };
    return { fish: bounceEdges(fled), bite: false };
  }

  // Jumping fish ignore bait until they land.
  if (fish.state === "jump" || hook.phase !== "in-water") {
    return { fish: freeSwim(fish, dt, diff), bite: false };
  }

  const dist = distance(fish, hook);
  // Hazards snag more easily; blockers get even stickier on hard rounds.
  const biteRadius = isHazardKind(fish.kind)
    ? HOOK_RADIUS *
      (fish.kind === "weed" || fish.kind === "net"
        ? diff.blockerBiteMult
        : 1.15)
    : HOOK_RADIUS;
  if (dist <= biteRadius && fish.y >= WATER_Y) {
    return { fish: { ...fish, state: "hooked", jumpVy: 0 }, bite: true };
  }

  const depthSlack = fish.kind === "answer" ? 80 : fish.kind === "net" ? 90 : 55;
  if (dist <= fish.detectRadius && Math.abs(hook.y - fish.depth) < depthSlack) {
    const next: Fish = { ...fish, state: "notice", phase: fish.phase + dt };
    const dx = hook.x - next.x;
    const dy = hook.y - next.y;
    next.heading = Math.atan2(dy, dx);
    next.x += Math.cos(next.heading) * next.speed * dt;
    next.y += Math.sin(next.heading) * next.speed * dt;
    next.y = Math.max(WATER_Y + 0.5, next.y);
    return { fish: bounceEdges(next), bite: false };
  }

  return { fish: freeSwim(fish, dt, diff), bite: false };
}

export function fleeWrong(fish: Fish[], optionId: string): Fish[] {
  return fish.map((item) =>
    item.optionId === optionId ? { ...item, state: "flee" } : item,
  );
}

export function fleeAll(fish: Fish[]): Fish[] {
  return fish.map((item) => ({ ...item, state: "flee" }));
}

export function followHook(fish: Fish, hook: HookState): Fish {
  if (fish.state !== "hooked") return fish;
  return { ...fish, x: hook.x, y: hook.y, jumpVy: 0 };
}

export function removeFish(fish: Fish[], optionId: string): Fish[] {
  return fish.filter((item) => item.optionId !== optionId);
}

/** Drop fleeing fish immediately so they cannot ghost-swim. */
export function cullOffscreen(fish: Fish[]): Fish[] {
  return fish.filter((item) => {
    if (item.state !== "flee") return true;
    return item.x > POND.xMin - 40 && item.x < POND.xMax + 40;
  });
}
