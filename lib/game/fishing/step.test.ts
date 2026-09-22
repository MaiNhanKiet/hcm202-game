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

  it("emits fish-bite once when a fish reaches the hook", () => {
    const scene = createScene([]);
    scene.hook = {
      phase: "in-water",
      x: 300,
      y: 300,
      vx: 0,
      vy: 0,
      flightDistance: 0,
      bobberShake: 0,
    };
    scene.fish = [{
      optionId: "a",
      text: "A",
      isCorrect: true,
      x: 300,
      y: 300,
      speed: 10,
      heading: 0,
      depth: 300,
      detectRadius: 80,
      state: "swim",
    }];
    const { events } = stepScene(scene, idleInput, 1 / 60);
    expect(events.some((e) => e.type === "fish-bite" && e.optionId === "a")).toBe(true);
  });
});
