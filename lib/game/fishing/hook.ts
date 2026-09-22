import { CURRENT, POND, REEL_SPEED, ROD_TIP, SINK_SPEED, WATER_Y } from "./constants";
import type { HookInput, HookState } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function stepHook(
  hook: HookState,
  input: HookInput,
  dt: number,
): HookState {
  if (hook.phase !== "in-water") return hook;
  let y = hook.y + SINK_SPEED * dt;
  if (input.reel) y -= REEL_SPEED * dt;
  if (input.drop) y += REEL_SPEED * dt;
  const x = clamp(hook.x + CURRENT * dt, POND.xMin, POND.xMax);
  if (input.reel && y <= WATER_Y + 2) {
    return { ...hook, x, y: WATER_Y, phase: "reeling" };
  }
  y = clamp(y, WATER_Y + 0.01, POND.yMax);
  return { ...hook, x, y };
}

export function finishReel(hook: HookState): HookState {
  return {
    ...hook,
    phase: "idle",
    x: ROD_TIP.x,
    y: ROD_TIP.y,
    vx: 0,
    vy: 0,
    flightDistance: 0,
    bobberShake: 0,
  };
}
