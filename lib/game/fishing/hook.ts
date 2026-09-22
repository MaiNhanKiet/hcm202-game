import { CURRENT, POND, REEL_SPEED, ROD_TIP, SINK_SPEED, WATER_Y } from "./constants";
import type { HookState } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * While underwater, reeling only pulls toward the water surface (toward the angler).
 * The lure must reach the surface before it can be lifted to the tip.
 */
export function stepHook(
  hook: HookState,
  input: { reel: boolean },
  tip: { x: number; y: number },
  dt: number,
): HookState {
  if (hook.phase !== "in-water") return hook;

  if (input.reel) {
    // Surface rendezvous under the tip — never cut through air to the rod tip.
    const targetX = tip.x;
    const targetY = WATER_Y;
    const dx = targetX - hook.x;
    const dy = targetY - hook.y;
    const dist = Math.hypot(dx, dy);
    const speed = REEL_SPEED * 1.55;

    if (dist <= 5 || hook.y <= WATER_Y + 2.5) {
      return {
        ...hook,
        x: dist > 1e-6 ? hook.x + (dx / dist) * Math.min(dist, speed * dt) : tip.x,
        y: WATER_Y,
        vx: 0,
        vy: 0,
        phase: "reeling",
      };
    }

    const step = speed * dt;
    return {
      ...hook,
      x: hook.x + (dx / dist) * step,
      y: hook.y + (dy / dist) * step,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
    };
  }

  let y = hook.y + SINK_SPEED * dt;
  const x = clamp(hook.x + CURRENT * dt, POND.xMin, POND.xMax);
  y = clamp(y, WATER_Y + 0.01, POND.yMax);
  return { ...hook, x, y, vx: 0, vy: 0 };
}

/** After the lure has reached the water surface, lift smoothly to the tip. */
export function stepReelToTip(
  hook: HookState,
  tip: { x: number; y: number },
  dt: number,
  pulling: boolean,
): { hook: HookState; arrived: boolean } {
  if (hook.phase !== "reeling") {
    return { hook, arrived: false };
  }
  if (!pulling) {
    return { hook, arrived: false };
  }

  const dx = tip.x - hook.x;
  const dy = tip.y - hook.y;
  const dist = Math.hypot(dx, dy);
  const speed = REEL_SPEED * 1.7;
  if (dist <= 7) {
    return {
      hook: { ...hook, x: tip.x, y: tip.y, vx: 0, vy: 0 },
      arrived: true,
    };
  }
  const step = speed * dt;
  return {
    hook: {
      ...hook,
      x: hook.x + (dx / dist) * step,
      y: hook.y + (dy / dist) * step,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
    },
    arrived: false,
  };
}

export function finishReel(
  hook: HookState,
  tip: { x: number; y: number } = ROD_TIP,
): HookState {
  return {
    ...hook,
    phase: "idle",
    x: tip.x,
    y: tip.y,
    vx: 0,
    vy: 0,
    flightDistance: 0,
    bobberShake: 0,
  };
}
