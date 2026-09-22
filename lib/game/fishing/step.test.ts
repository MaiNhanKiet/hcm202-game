import { describe, expect, it } from "vitest";
import { WATER_Y } from "./constants";
import { createScene, stepScene } from "./step";
import type { HookState } from "./types";

const idleInput = {
  pointer: null,
  charging: false,
  chargeMs: 0,
  reel: false,
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
    const { scene: next, events } = stepScene(scene, { ...idleInput, reel: true }, 1);
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
      labelIndex: 0,
      x: 300,
      y: 300,
      speed: 10,
      heading: 0,
      homeHeading: 0,
      kind: "answer",
      turnTimer: 1,
      phase: 0,
      jumpVy: 0,
      depth: 300,
      detectRadius: 80,
      state: "swim",
    }];
    const { scene: next, events } = stepScene(scene, idleInput, 1 / 60);
    expect(events.some((e) => e.type === "fish-bite" && e.optionId === "a")).toBe(true);
    expect(next.hook.phase).toBe("in-water");
    expect(next.fish.some((f) => f.state === "hooked")).toBe(true);
  });

  it("removes a wrong fish on bite so it cannot ghost-swim dim", () => {
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
    scene.fish = [
      {
        optionId: "wrong",
        text: "Wrong",
        isCorrect: false,
        labelIndex: 1,
        x: 300,
        y: 300,
        speed: 10,
        heading: 0,
        homeHeading: 0,
        kind: "answer",
        turnTimer: 1,
        phase: 0,
        jumpVy: 0,
        depth: 300,
        detectRadius: 80,
        state: "swim",
      },
      {
        optionId: "ok",
        text: "Ok",
        isCorrect: true,
        labelIndex: 0,
        x: 500,
        y: 320,
        speed: 10,
        heading: 0,
        homeHeading: 0,
        kind: "answer",
        turnTimer: 1,
        phase: 0,
        jumpVy: 0,
        depth: 320,
        detectRadius: 80,
        state: "swim",
      },
    ];
    const { scene: next, events } = stepScene(scene, idleInput, 1 / 60);
    expect(events.some((e) => e.type === "fish-bite" && e.optionId === "wrong")).toBe(
      true,
    );
    expect(next.fish.some((f) => f.optionId === "wrong")).toBe(false);
    expect(next.fish.some((f) => f.optionId === "ok")).toBe(true);
    expect(next.fish.some((f) => f.state === "flee")).toBe(false);
    expect(next.hook.phase).toBe("idle");
  });

  it("reels a correct catch to the surface then the tip and removes the fish", () => {
    const scene = createScene([]);
    scene.hook = {
      phase: "in-water",
      x: 320,
      y: WATER_Y + 120,
      vx: 0,
      vy: 0,
      flightDistance: 0,
      bobberShake: 1,
    };
    scene.fish = [{
      optionId: "a",
      text: "A",
      isCorrect: true,
      labelIndex: 0,
      x: 320,
      y: WATER_Y + 120,
      speed: 10,
      heading: 0,
      homeHeading: 0,
      kind: "answer",
      turnTimer: 1,
      phase: 0,
      jumpVy: 0,
      depth: WATER_Y + 120,
      detectRadius: 80,
      state: "hooked",
    }];
    let current = scene;
    let sawSurface = false;
    let landed = false;
    for (let i = 0; i < 240; i += 1) {
      const stepped = stepScene(current, idleInput, 1 / 60);
      current = stepped.scene;
      if (current.hook.phase === "reeling" || current.hook.y <= WATER_Y + 1) {
        sawSurface = true;
      }
      if (stepped.events.some((e) => e.type === "fish-landed" && e.optionId === "a")) {
        landed = true;
        break;
      }
    }
    expect(sawSurface).toBe(true);
    expect(landed).toBe(true);
    expect(current.fish.some((f) => f.optionId === "a")).toBe(false);
    expect(current.hook.phase).toBe("idle");
  });

  it("hooks only the reported fish when two overlap the hook", () => {
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
    scene.fish = [
      {
        optionId: "a",
        text: "A",
        isCorrect: true,
        labelIndex: 0,
        x: 300,
        y: 300,
        speed: 10,
        heading: 0,
        homeHeading: 0,
        kind: "answer",
        turnTimer: 1,
        phase: 0,
        jumpVy: 0,
        depth: 300,
        detectRadius: 80,
        state: "swim",
      },
      {
        optionId: "b",
        text: "B",
        isCorrect: false,
        labelIndex: 1,
        x: 300,
        y: 300,
        speed: 10,
        heading: 0,
        homeHeading: 0,
        kind: "answer",
        turnTimer: 1,
        phase: 0,
        jumpVy: 0,
        depth: 300,
        detectRadius: 80,
        state: "swim",
      },
    ];
    const { scene: next, events } = stepScene(scene, idleInput, 1 / 60);
    const bites = events.filter((e) => e.type === "fish-bite");
    expect(bites).toHaveLength(1);
    const hooked = next.fish.filter((f) => f.state === "hooked");
    const other = next.fish.filter((f) => f.state !== "hooked");
    expect(hooked).toHaveLength(1);
    expect(other).toHaveLength(1);
  });

  it("pulls the rod back while charging without bending", () => {
    const scene = createScene([]);
    const { scene: next } = stepScene(
      scene,
      { ...idleInput, charging: true, chargeMs: 600 },
      1 / 60,
    );
    expect(next.rod.swing).toBeLessThan(0);
    expect(next.rod.bend).toBe(0);
  });

  it("swings the rod forward before the hook leaves the tip", () => {
    const scene = createScene([]);
    scene.rod.swing = -0.8;
    const { scene: afterCast } = stepScene(
      scene,
      { ...idleInput, castNow: true, chargeMs: 700 },
      1 / 60,
    );
    expect(afterCast.hook.phase).toBe("idle");
    expect(afterCast.rod.swinging).toBe(true);

    let current = afterCast;
    for (let i = 0; i < 45; i += 1) {
      current = stepScene(current, idleInput, 1 / 60).scene;
    }
    expect(current.hook.phase).not.toBe("idle");
    expect(current.rod.swing).toBeGreaterThan(0);
  });

  it("loads the rod after the swing releases the hook, tip still above water", () => {
    const scene = createScene([]);
    scene.rod.swing = -0.8;
    let current = stepScene(
      scene,
      { ...idleInput, castNow: true, chargeMs: 700 },
      1 / 60,
    ).scene;
    expect(current.rod.bend).toBe(0);
    let sawFlyingBend = false;
    for (let i = 0; i < 80; i += 1) {
      current = stepScene(current, idleInput, 1 / 60).scene;
      expect(current.rod.tipY).toBeLessThan(scene.waterY - 8);
      if (current.hook.phase === "flying" && current.rod.bend > 0.2) {
        sawFlyingBend = true;
      }
    }
    expect(current.hook.phase).not.toBe("idle");
    expect(sawFlyingBend).toBe(true);
  });

  it("keeps the aimed angle when releasing so a far aim does not cast short", () => {
    const scene = createScene([]);
    scene.rod.angle = 0.05;
    scene.rod.power = 1;
    scene.rod.swing = -1;
    const afterStart = stepScene(
      scene,
      { ...idleInput, castNow: true, chargeMs: 900 },
      1 / 60,
    ).scene;
    expect(afterStart.rod.swinging).toBe(true);
    expect(afterStart.rod.angle).toBeCloseTo(0.05, 5);

    let current = afterStart;
    for (let i = 0; i < 45; i += 1) {
      current = stepScene(current, idleInput, 1 / 60).scene;
      if (current.hook.phase === "flying") break;
    }
    expect(current.hook.phase).toBe("flying");
    // Flat aim + full power → strong horizontal velocity, not a steep short plop.
    expect(current.hook.vx).toBeGreaterThan(1200);
    expect(Math.abs(current.hook.vy / current.hook.vx)).toBeLessThan(0.25);
  });

  it("keeps the rod tip above water while the hook is in the water", () => {
    const scene = createScene([]);
    scene.hook = {
      phase: "in-water",
      x: 420,
      y: WATER_Y + 80,
      vx: 0,
      vy: 0,
      flightDistance: 200,
      bobberShake: 0,
    };
    scene.rod.swing = 0.9;
    scene.rod.bend = 1;
    const { scene: next } = stepScene(scene, idleInput, 1 / 60);
    expect(next.rod.tipY).toBeLessThan(scene.waterY - 8);
    expect(next.rod.bend).toBeLessThanOrEqual(0.55);
  });

  it("removes bomb/trash on bite and emits hazard-hit", () => {
    const scene = createScene([], 1);
    scene.hook = {
      phase: "in-water",
      x: 300,
      y: 300,
      vx: 0,
      vy: 0,
      flightDistance: 0,
      bobberShake: 0,
    };
    scene.fish = [
      {
        optionId: "__bomb_0",
        text: "Bom",
        isCorrect: false,
        labelIndex: 0,
        x: 300,
        y: 300,
        speed: 10,
        heading: 0,
        homeHeading: 0,
        kind: "bomb",
        turnTimer: 1,
        phase: 0,
        jumpVy: 0,
        depth: 300,
        detectRadius: 80,
        state: "swim",
      },
    ];
    const { scene: next, events } = stepScene(scene, idleInput, 1 / 60);
    expect(events.some((e) => e.type === "hazard-hit" && e.kind === "bomb")).toBe(
      true,
    );
    expect(next.fish).toHaveLength(0);
    expect(next.hook.phase).toBe("idle");
  });
});
