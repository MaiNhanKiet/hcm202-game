import { describe, expect, it } from "vitest";
import { chargePower, startCast, stepCast } from "./cast";
import { MAX_CAST_DISTANCE, WATER_Y } from "./constants";

describe("cast", () => {
  it("charges power from 0 to 1 over 900ms", () => {
    expect(chargePower(0)).toBe(0);
    expect(chargePower(450)).toBeCloseTo(0.5);
    expect(chargePower(2000)).toBe(1);
  });

  it("lands on the waterline from a downward cast", () => {
    let hook = startCast(Math.PI / 3, 0.7);
    let landed = false;
    for (let i = 0; i < 200 && !landed; i++) {
      const step = stepCast(hook, 1 / 60);
      hook = step.hook;
      landed = step.landed;
    }
    expect(landed).toBe(true);
    expect(hook.phase).toBe("in-water");
    expect(hook.y).toBeCloseTo(WATER_Y);
  });

  it("stops at max cast distance instead of flying forever", () => {
    let hook = {
      ...startCast(-0.12, 1),
      y: 20,
      flightDistance: MAX_CAST_DISTANCE - 8,
    };
    let broken = false;
    for (let i = 0; i < 40 && !broken; i++) {
      const step = stepCast(hook, 1 / 60);
      hook = step.hook;
      broken = step.broken;
    }
    expect(broken).toBe(true);
    expect(hook.flightDistance).toBeGreaterThanOrEqual(MAX_CAST_DISTANCE);
  });
});
