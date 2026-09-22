import { GRAVITY, MAX_CAST_DISTANCE, ROD_TIP, WATER_Y } from "./constants";
import type { HookState } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function chargePower(heldMs: number): number {
  return clamp(heldMs / 900, 0, 1);
}

export function aimAngle(
  rod: { x: number; y: number },
  pointer: { x: number; y: number },
): number {
  const angle = Math.atan2(pointer.y - rod.y, pointer.x - rod.x);
  return clamp(angle, -Math.PI * 0.15, Math.PI * 0.55);
}

export function startCast(angle: number, power: number): HookState {
  const speed = 220 + power * 520;
  return {
    phase: "flying",
    x: ROD_TIP.x,
    y: ROD_TIP.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    flightDistance: 0,
    bobberShake: 0,
  };
}

export function stepCast(
  hook: HookState,
  dt: number,
): { hook: HookState; landed: boolean; broken: boolean } {
  if (hook.phase !== "flying") {
    return { hook, landed: false, broken: false };
  }
  const vy = hook.vy + GRAVITY * dt;
  const x = hook.x + hook.vx * dt;
  const y = hook.y + vy * dt;
  const flightDistance =
    hook.flightDistance + Math.hypot(hook.vx * dt, vy * dt);

  if (flightDistance >= MAX_CAST_DISTANCE && y < WATER_Y) {
    return {
      hook: {
        ...hook,
        x,
        y,
        vy,
        flightDistance,
        phase: "idle",
      },
      landed: false,
      broken: true,
    };
  }

  if (y >= WATER_Y) {
    return {
      hook: {
        ...hook,
        x,
        y: WATER_Y,
        vx: 0,
        vy: 0,
        flightDistance,
        phase: "in-water",
      },
      landed: true,
      broken: false,
    };
  }

  return {
    hook: { ...hook, x, y, vy, flightDistance },
    landed: false,
    broken: false,
  };
}
