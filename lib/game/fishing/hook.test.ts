import { describe, expect, it } from "vitest";
import { POND, WATER_Y } from "./constants";
import { stepHook, stepReelToTip } from "./hook";
import type { HookState } from "./types";

const tip = { x: 180, y: 90 };

function inWater(x: number, y: number): HookState {
  return { phase: "in-water", x, y, vx: 0, vy: 0, flightDistance: 0, bobberShake: 0 };
}

describe("stepHook", () => {
  it("sinks over time and stays below the waterline", () => {
    const next = stepHook(inWater(200, WATER_Y + 1), { reel: false }, tip, 1);
    expect(next.y).toBeGreaterThan(WATER_Y + 1);
    expect(next.y).toBeLessThanOrEqual(POND.yMax);
  });

  it("reels toward the water surface under the tip, not straight to the tip", () => {
    const start = inWater(500, 400);
    const next = stepHook(start, { reel: true }, tip, 1);
    expect(next.x).toBeLessThan(start.x);
    expect(next.y).toBeLessThan(start.y);
    expect(next.y).toBeGreaterThan(WATER_Y);
    expect(next.phase).toBe("in-water");
  });

  it("only enters reeling after the lure reaches the water surface", () => {
    let hook = inWater(tip.x + 20, WATER_Y + 12);
    for (let i = 0; i < 40 && hook.phase === "in-water"; i += 1) {
      hook = stepHook(hook, { reel: true }, tip, 1 / 30);
    }
    expect(hook.phase).toBe("reeling");
    expect(hook.y).toBeCloseTo(WATER_Y, 0);
  });

  it("current shifts x but clamps to the pond when not reeling", () => {
    const inner = stepHook(inWater(200, 300), { reel: false }, tip, 1);
    expect(inner.x).toBeGreaterThan(200);
    const edge = stepHook(inWater(POND.xMax, 300), { reel: false }, tip, 1);
    expect(edge.x).toBeLessThanOrEqual(POND.xMax);
    const left = stepHook(inWater(POND.xMin, 300), { reel: false }, tip, 1);
    expect(left.x).toBeGreaterThanOrEqual(POND.xMin);
  });
});

describe("stepReelToTip", () => {
  it("lifts smoothly from the surface to the tip without teleporting", () => {
    const start: HookState = {
      phase: "reeling",
      x: 400,
      y: WATER_Y,
      vx: 0,
      vy: 0,
      flightDistance: 0,
      bobberShake: 0,
    };
    const mid = stepReelToTip(start, tip, 1 / 60, true).hook;
    expect(mid.x).toBeLessThan(start.x);
    expect(mid.y).toBeLessThan(start.y);
    expect(mid.x).not.toBe(tip.x);
    expect(mid.phase).toBe("reeling");

    let hook = mid;
    let arrived = false;
    for (let i = 0; i < 180; i += 1) {
      const stepped = stepReelToTip(hook, tip, 1 / 60, true);
      hook = stepped.hook;
      if (stepped.arrived) {
        arrived = true;
        break;
      }
    }
    expect(arrived).toBe(true);
    expect(hook.x).toBeCloseTo(tip.x, 0);
    expect(hook.y).toBeCloseTo(tip.y, 0);
  });
});
