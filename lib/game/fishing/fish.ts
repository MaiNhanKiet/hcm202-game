import {
  BASE_DETECT,
  BASE_SPEED,
  CORRECT_DETECT_BONUS,
  CORRECT_SPEED_BONUS,
  HOOK_RADIUS,
  POND,
  WATER_Y,
} from "./constants";
import type { Fish, HookState } from "./types";

export type SpawnOption = { optionId: string; text: string; isCorrect: boolean };

export function spawnFish(options: SpawnOption[]): Fish[] {
  const spawnMin = 160;
  const spawnMax = 720;
  const span = spawnMax - spawnMin;
  return options.map((option, index) => {
    const x =
      spawnMin +
      ((index + 1) / (options.length + 1)) * span;
    const y = WATER_Y + 30 + ((index * 47) % (POND.yMax - WATER_Y - 50));
    const speed = option.isCorrect
      ? BASE_SPEED * CORRECT_SPEED_BONUS
      : BASE_SPEED;
    const detectRadius = option.isCorrect
      ? BASE_DETECT * CORRECT_DETECT_BONUS
      : BASE_DETECT;
    return {
      optionId: option.optionId,
      text: option.text,
      isCorrect: option.isCorrect,
      x,
      y,
      speed,
      heading: index % 2 === 0 ? 0 : Math.PI,
      depth: y,
      detectRadius,
      state: "swim",
    };
  });
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function stepFish(
  fish: Fish,
  hook: HookState,
  dt: number,
): { fish: Fish; bite: boolean } {
  const next: Fish = { ...fish, y: Math.max(WATER_Y + 0.5, fish.y) };

  if (next.state === "hooked") {
    return { fish: next, bite: false };
  }

  if (next.state === "flee") {
    next.x += Math.cos(next.heading) * next.speed * dt;
    next.y = Math.max(WATER_Y + 0.5, next.y);
    return { fish: next, bite: false };
  }

  if (hook.phase !== "in-water") {
    next.x += Math.cos(next.heading) * next.speed * dt;
    if (next.x < POND.xMin) {
      next.x = POND.xMin;
      next.heading = 0;
    } else if (next.x > POND.xMax) {
      next.x = POND.xMax;
      next.heading = Math.PI;
    }
    next.y = Math.max(WATER_Y + 0.5, next.y);
    return { fish: next, bite: false };
  }

  const dist = distance(next, hook);
  if (dist <= HOOK_RADIUS) {
    return { fish: { ...next, state: "hooked" }, bite: true };
  }

  if (dist <= next.detectRadius && Math.abs(hook.y - next.depth) < 80) {
    next.state = "notice";
    next.heading = Math.atan2(hook.y - next.y, hook.x - next.x);
    next.x += Math.cos(next.heading) * next.speed * dt;
    next.y += Math.sin(next.heading) * next.speed * dt;
    next.y = Math.max(WATER_Y + 0.5, next.y);
    return { fish: next, bite: false };
  }

  next.x += Math.cos(next.heading) * next.speed * dt;
  if (next.x < POND.xMin) {
    next.x = POND.xMin;
    next.heading = 0;
  } else if (next.x > POND.xMax) {
    next.x = POND.xMax;
    next.heading = Math.PI;
  }
  next.y = Math.max(WATER_Y + 0.5, next.y);
  return { fish: next, bite: false };
}

export function fleeWrong(fish: Fish[], optionId: string): Fish[] {
  return fish.map((item) =>
    item.optionId === optionId ? { ...item, state: "flee" } : item,
  );
}

export function fleeAll(fish: Fish[]): Fish[] {
  return fish.map((item) => ({ ...item, state: "flee" }));
}
