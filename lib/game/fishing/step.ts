import { aimAngle, chargePower, startCast, stepCast } from "./cast";
import { POND, ROD_TIP, WATER_Y } from "./constants";
import { stepFish } from "./fish";
import { finishReel, stepHook } from "./hook";
import type { Fish, SceneEvent, SceneInput, SceneState } from "./types";

export function createScene(fish: Fish[]): SceneState {
  return {
    paused: false,
    waterY: WATER_Y,
    pond: POND,
    rod: {
      tipX: ROD_TIP.x,
      tipY: ROD_TIP.y,
      angle: Math.PI / 4,
      power: 0,
      bend: 0,
    },
    hook: {
      phase: "idle",
      x: ROD_TIP.x,
      y: ROD_TIP.y,
      vx: 0,
      vy: 0,
      flightDistance: 0,
      bobberShake: 0,
    },
    fish,
    ripples: [],
  };
}

export function stepScene(
  scene: SceneState,
  input: SceneInput,
  dt: number,
): { scene: SceneState; events: SceneEvent[] } {
  if (scene.paused) {
    return { scene, events: [] };
  }

  const events: SceneEvent[] = [];
  let hook = scene.hook;
  const rod = { ...scene.rod };
  let ripples = scene.ripples
    .map((ripple) => ({ ...ripple, age: ripple.age + dt }))
    .filter((ripple) => ripple.age <= 0.6);

  if (input.pointer) {
    rod.angle = aimAngle(
      { x: rod.tipX, y: rod.tipY },
      input.pointer,
    );
  }
  if (input.charging && hook.phase === "idle") {
    rod.power = chargePower(input.chargeMs);
    rod.bend = rod.power;
  } else {
    rod.power = hook.phase === "idle" ? 0 : rod.power;
    rod.bend = hook.phase === "in-water" || hook.phase === "reeling" ? 0.35 : 0;
  }

  if (input.castNow && hook.phase === "idle") {
    hook = startCast(rod.angle, chargePower(input.chargeMs) || rod.power);
  }

  if (hook.phase === "flying") {
    const stepped = stepCast(hook, dt);
    hook = stepped.hook;
    if (stepped.landed) {
      events.push({ type: "cast-landed" });
      ripples = [...ripples, { x: hook.x, y: scene.waterY, age: 0 }];
    }
    if (stepped.broken) {
      hook = finishReel(hook);
    }
  } else if (hook.phase === "in-water") {
    hook = stepHook(hook, { reel: input.reel, drop: input.drop }, dt);
    if (hook.bobberShake > 0) {
      hook = { ...hook, bobberShake: Math.max(0, hook.bobberShake - dt * 3) };
    }
  }

  if (input.reelFull || hook.phase === "reeling") {
    hook = finishReel(hook);
    events.push({ type: "reeled-in" });
  }

  let fish = scene.fish;
  if (hook.phase !== "idle" || scene.fish.length > 0) {
    const stepped = scene.fish.map((item) => stepFish(item, hook, dt));
    const biteIndex = stepped.findIndex((item) => item.bite);
    fish = stepped.map((item, index) => {
      if (biteIndex === -1) return item.fish;
      if (index === biteIndex) return item.fish;
      if (item.bite) return scene.fish[index];
      return item.fish;
    });
    if (biteIndex >= 0) {
      events.push({ type: "fish-bite", optionId: stepped[biteIndex].fish.optionId });
      hook = finishReel({ ...hook, bobberShake: 1 });
    }
  }

  return {
    scene: { ...scene, rod, hook, ripples, fish },
    events,
  };
}
