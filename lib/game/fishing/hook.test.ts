import { describe, expect, it } from "vitest";
import { POND, WATER_Y } from "./constants";
import { stepHook } from "./hook";
import type { HookState } from "./types";

function inWater(x: number, y: number): HookState {
  return { phase: "in-water", x, y, vx: 0, vy: 0, flightDistance: 0, bobberShake: 0 };
}

describe("stepHook", () => {
  it("sinks over time and stays below the waterline", () => {
    const next = stepHook(inWater(200, WATER_Y + 1), { reel: false, drop: false }, 1);
    expect(next.y).toBeGreaterThan(WATER_Y + 1);
    expect(next.y).toBeLessThanOrEqual(POND.yMax);
  });

  it("reels up and drops down", () => {
    const up = stepHook(inWater(200, 400), { reel: true, drop: false }, 1);
    const down = stepHook(inWater(200, 400), { reel: false, drop: true }, 1);
    expect(up.y).toBeLessThan(400);
    expect(down.y).toBeGreaterThan(400);
  });

  it("current shifts x but clamps to the pond", () => {
    const inner = stepHook(inWater(200, 300), { reel: false, drop: false }, 1);
    expect(inner.x).toBeGreaterThan(200);
    const edge = stepHook(inWater(POND.xMax, 300), { reel: false, drop: false }, 1);
    expect(edge.x).toBeLessThanOrEqual(POND.xMax);
    const left = stepHook(inWater(POND.xMin, 300), { reel: false, drop: false }, 1);
    expect(left.x).toBeGreaterThanOrEqual(POND.xMin);
  });
});
