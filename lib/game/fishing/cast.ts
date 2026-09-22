import { GRAVITY, MAX_CAST_DISTANCE, ROD_TIP, WATER_Y } from "./constants";
import type { HookState } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Half-angle of the white power wedge (radians). */
export const POWER_WEDGE_HALF = 0.22;
/** Inner dead-zone near the tip before power starts rising. */
export const POWER_WEDGE_MIN = 56;
/** Outer radius of the white triangle — full power. */
export const POWER_WEDGE_MAX = 420;

export function chargePower(heldMs: number): number {
  return clamp(heldMs / 900, 0, 1);
}

/**
 * Drag inside the white cast wedge:
 * - distance from tip → power (near = weak, far = strong)
 * - direction inside the fan → aim angle
 */
export function wedgeAimPower(
  tip: { x: number; y: number },
  pointer: { x: number; y: number },
): { power: number; angle: number } {
  const dx = pointer.x - tip.x;
  const dy = pointer.y - tip.y;
  const dist = Math.hypot(dx, dy);
  const rawAngle = Math.atan2(dy, dx);
  const angle = clamp(rawAngle, -Math.PI * 0.22, Math.PI * 0.42);
  const power = clamp(
    (dist - POWER_WEDGE_MIN) / (POWER_WEDGE_MAX - POWER_WEDGE_MIN),
    0,
    1,
  );
  return { power, angle };
}

/** @deprecated — use wedgeAimPower */
export function horizontalPower(tipX: number, pointerX: number): number {
  return clamp((pointerX - tipX - 24) / 520, 0, 1);
}

/** @deprecated */
export function pullPower(
  tip: { x: number; y: number },
  pointer: { x: number; y: number },
): number {
  return wedgeAimPower(tip, pointer).power;
}

export function chargeFromInput(
  tip: { x: number; y: number },
  pointer: { x: number; y: number } | null,
  heldMs: number,
): number {
  if (pointer) return wedgeAimPower(tip, pointer).power;
  return chargePower(heldMs);
}

export function aimAngle(
  rod: { x: number; y: number },
  pointer: { x: number; y: number },
): number {
  return wedgeAimPower(rod, pointer).angle;
}

export function previewCastPath(
  angle: number,
  power: number,
  tip: { x: number; y: number } = ROD_TIP,
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [{ x: tip.x, y: tip.y }];
  let hook = startCast(angle, power, tip);
  for (let i = 0; i < 200; i += 1) {
    const stepped = stepCast(hook, 1 / 60);
    hook = stepped.hook;
    points.push({ x: hook.x, y: hook.y });
    if (stepped.landed || stepped.broken) break;
  }
  return points;
}

export function startCast(
  angle: number,
  power: number,
  tip: { x: number; y: number } = ROD_TIP,
): HookState {
  const speed = 320 + power * 1380;
  return {
    phase: "flying",
    x: tip.x,
    y: tip.y,
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
