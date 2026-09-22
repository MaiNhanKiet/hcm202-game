import { describe, expect, it } from "vitest";
import { WATER_Y } from "./constants";
import { createScene, stepScene } from "./step";
import type { HookState } from "./types";

const idleInput = {
  pointer: null,
  charging: false,
  chargeMs: 0,
  reel: false,
  drop: false,
  castNow: false,
  reelFull: false,
};

describe("stepScene pause", () => {
  it("does not move the hook or emit events when paused", () => {
    const scene = createScene([]);
    const hook: HookState = {
      phase: "in-water",
      x: 200,
      y: WATER_Y + 40,
      vx: 0,
      vy: 0,
      flightDistance: 100,
      bobberShake: 0,
    };
    scene.hook = hook;
    scene.paused = true;
    const { scene: next, events } = stepScene(scene, { ...idleInput, drop: true }, 1);
    expect(next.hook.x).toBe(200);
    expect(next.hook.y).toBe(WATER_Y + 40);
    expect(events).toEqual([]);
  });
});
