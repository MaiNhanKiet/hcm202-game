import { describe, expect, it } from "vitest";
import {
  chargeFromInput,
  chargePower,
  previewCastPath,
  startCast,
  stepCast,
  wedgeAimPower,
  POWER_WEDGE_MAX,
  POWER_WEDGE_MIN,
} from "./cast";
import { MAX_CAST_DISTANCE, ROD_TIP, WATER_Y } from "./constants";

describe("cast", () => {
  it("charges power from 0 to 1 over 900ms", () => {
    expect(chargePower(0)).toBe(0);
    expect(chargePower(450)).toBeCloseTo(0.5);
    expect(chargePower(2000)).toBe(1);
  });

  it("a full-power downward cast lands farther than a weak cast", () => {
    function landX(power: number) {
      let hook = startCast(0.18, power);
      let landed = false;
      for (let i = 0; i < 240 && !landed; i++) {
        const step = stepCast(hook, 1 / 60);
        hook = step.hook;
        landed = step.landed;
      }
      expect(landed).toBe(true);
      return hook.x;
    }
    expect(landX(1)).toBeGreaterThan(landX(0.25) + 80);
    expect(landX(1)).toBeGreaterThan(550);
  });

  it("drag distance inside the white wedge sets power and aim", () => {
    const tip = { x: 180, y: 80 };
    const near = wedgeAimPower(tip, { x: tip.x + 80, y: tip.y + 20 });
    const far = wedgeAimPower(tip, {
      x: tip.x + POWER_WEDGE_MAX,
      y: tip.y + 40,
    });
    expect(near.power).toBeLessThan(0.2);
    expect(far.power).toBeGreaterThan(0.85);
    expect(chargeFromInput(tip, { x: tip.x + POWER_WEDGE_MAX, y: tip.y }, 0)).toBe(
      1,
    );
    expect(chargeFromInput(tip, null, 900)).toBe(1);

    const weak = startCast(0.12, near.power);
    const strong = startCast(0.12, far.power);
    expect(Math.hypot(strong.vx, strong.vy)).toBeGreaterThan(
      Math.hypot(weak.vx, weak.vy) + 400,
    );
    expect(POWER_WEDGE_MIN).toBeLessThan(POWER_WEDGE_MAX);
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

  it("previewCastPath lands near the same point as a simulated cast", () => {
    const path = previewCastPath(0.22, 0.8);
    expect(path.length).toBeGreaterThan(4);
    expect(path[0]).toEqual({ x: ROD_TIP.x, y: ROD_TIP.y });
    const last = path[path.length - 1];
    expect(last.y).toBeGreaterThanOrEqual(WATER_Y - 1);

    let hook = startCast(0.22, 0.8);
    let landed = false;
    for (let i = 0; i < 200 && !landed; i++) {
      const step = stepCast(hook, 1 / 60);
      hook = step.hook;
      landed = step.landed;
    }
    expect(last.x).toBeCloseTo(hook.x, -1);
    const weak = previewCastPath(0.22, 0.2);
    expect(weak[weak.length - 1].x).toBeLessThan(last.x);
  });
});
