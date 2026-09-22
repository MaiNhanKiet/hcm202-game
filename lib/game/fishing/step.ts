import { aimAngle, chargeFromInput, startCast, stepCast, wedgeAimPower } from "./cast";
import { POND, WATER_Y } from "./constants";
import { cullOffscreen, followHook, removeFish, stepFish, isHazardKind } from "./fish";
import { finishReel, stepHook, stepReelToTip } from "./hook";
import { visualRodTip } from "./rod";
import type { Fish, SceneEvent, SceneInput, SceneState } from "./types";

export function createScene(fish: Fish[], roundIndex = 0): SceneState {
  const tip = visualRodTip(
    { swing: 0, bend: 0 },
    WATER_Y,
  );
  return {
    paused: false,
    waterY: WATER_Y,
    pond: POND,
    rod: {
      tipX: tip.x,
      tipY: tip.y,
      angle: -0.28,
      power: 0,
      bend: 0,
      swing: 0,
      swinging: false,
    },
    hook: {
      phase: "idle",
      x: tip.x,
      y: tip.y,
      vx: 0,
      vy: 0,
      flightDistance: 0,
      bobberShake: 0,
    },
    fish,
    ripples: [],
    castTrail: [],
    roundIndex,
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
  let castTrail = scene.castTrail
    .map((spark) => ({ ...spark, age: spark.age + dt }))
    .filter((spark) => spark.age <= 0.55);

  const tip = visualRodTip(rod, scene.waterY);
  rod.tipX = tip.x;
  rod.tipY = tip.y;

  if (input.pointer && hook.phase === "idle" && !rod.swinging) {
    rod.angle = aimAngle({ x: tip.x, y: tip.y }, input.pointer);
  }
  if (input.charging && hook.phase === "idle" && !rod.swinging) {
    if (input.pointer) {
      const aimed = wedgeAimPower({ x: tip.x, y: tip.y }, input.pointer);
      rod.power = aimed.power;
      rod.angle = aimed.angle;
    } else {
      rod.power = chargeFromInput(
        { x: tip.x, y: tip.y },
        null,
        input.chargeMs,
      );
    }
    rod.swing = -rod.power;
    rod.bend = 0;
  } else if (rod.swinging) {
    // Keep rod.angle as the aimed cast direction — do not overwrite with swing pose.
    rod.swing = Math.min(1, rod.swing + dt * 4.2);
    rod.bend = 0;
    const swingTip = visualRodTip(rod, scene.waterY);
    rod.tipX = swingTip.x;
    rod.tipY = swingTip.y;
    if (rod.swing >= 0.72 && hook.phase === "idle") {
      hook = startCast(rod.angle, rod.power, swingTip);
      rod.swinging = false;
    }
  } else if (input.castNow && hook.phase === "idle") {
    rod.power =
      chargeFromInput({ x: tip.x, y: tip.y }, input.pointer, input.chargeMs) ||
      rod.power ||
      0.45;
    rod.swinging = true;
    if (rod.swing > -0.2) rod.swing = -0.55;
  } else {
    rod.power = hook.phase === "idle" ? 0 : rod.power;
    if (hook.phase === "idle") {
      rod.swing += (0 - rod.swing) * Math.min(1, dt * 6);
      rod.bend = 0;
      if (!input.pointer) rod.angle = -0.28;
    } else if (hook.phase === "flying") {
      rod.swing = Math.min(0.9, rod.swing + dt * 2.4);
      rod.bend = Math.min(0.65, Math.max(0, rod.swing - 0.45) * 1.1);
    } else {
      // in-water / reeling: tip forward but still above the surface
      rod.swing = Math.min(0.85, Math.max(rod.swing, 0.7));
      rod.bend = hook.phase === "reeling" ? 0.55 : 0.32;
    }
    const settledTip = visualRodTip(rod, scene.waterY);
    rod.tipX = settledTip.x;
    rod.tipY = settledTip.y;
  }

  if (hook.phase === "idle") {
    hook = { ...hook, x: rod.tipX, y: rod.tipY };
  }

  let fish = scene.fish;
  let landedThisFrame = false;

  if (hook.phase === "flying") {
    const stepped = stepCast(hook, dt);
    hook = stepped.hook;
    castTrail = [
      ...castTrail,
      { x: hook.x, y: hook.y, age: 0 },
      {
        x: hook.x - hook.vx * 0.012,
        y: hook.y - hook.vy * 0.012 + 4,
        age: 0.05,
      },
    ].slice(-48);
    if (stepped.landed) {
      events.push({ type: "cast-landed" });
      ripples = [...ripples, { x: hook.x, y: scene.waterY, age: 0 }];
    }
    if (stepped.broken) {
      hook = finishReel(hook, { x: rod.tipX, y: rod.tipY });
      castTrail = [];
    }
  } else if (hook.phase === "in-water") {
    castTrail = castTrail.filter((spark) => spark.age < 0.35);
    const hookedNow = fish.some((item) => item.state === "hooked");
    // Correct catch auto-reels to the surface; empty hook needs player hold.
    const pulling = input.reel || hookedNow;
    hook = stepHook(
      hook,
      { reel: pulling },
      { x: rod.tipX, y: rod.tipY },
      dt,
    );
    if (hook.bobberShake > 0) {
      hook = { ...hook, bobberShake: Math.max(0, hook.bobberShake - dt * 3) };
    }
  } else if (hook.phase === "reeling") {
    castTrail = [];
    const hookedNow = fish.some((item) => item.state === "hooked");
    const pulling = input.reel || hookedNow || input.reelFull;
    const lifted = stepReelToTip(
      hook,
      { x: rod.tipX, y: rod.tipY },
      dt,
      pulling,
    );
    hook = lifted.hook;
    if (lifted.arrived) {
      const caught = fish.find((item) => item.state === "hooked");
      if (caught) {
        events.push({ type: "fish-landed", optionId: caught.optionId });
        fish = removeFish(fish, caught.optionId);
        landedThisFrame = true;
      }
      hook = finishReel(hook, { x: rod.tipX, y: rod.tipY });
      events.push({ type: "reeled-in" });
    }
  } else {
    castTrail = [];
  }

  if (!landedThisFrame && (hook.phase !== "idle" || fish.length > 0)) {
    const stepped = fish.map((item) =>
      stepFish(item, hook, dt, scene.roundIndex),
    );
    const biteIndex = stepped.findIndex((item) => item.bite);
    fish = stepped.map((item, index) => {
      if (biteIndex === -1) return item.fish;
      if (index === biteIndex) return item.fish;
      if (item.bite) return fish[index];
      return item.fish;
    });
    if (biteIndex >= 0) {
      const bitten = fish[biteIndex];
      if (isHazardKind(bitten.kind)) {
        events.push({ type: "hazard-hit", kind: bitten.kind });
        fish = removeFish(fish, bitten.optionId);
        hook = finishReel(hook, { x: rod.tipX, y: rod.tipY });
        events.push({ type: "reeled-in" });
        ripples = [...ripples, { x: bitten.x, y: Math.max(bitten.y, scene.waterY), age: 0 }];
      } else {
        events.push({ type: "fish-bite", optionId: bitten.optionId });
        if (bitten.isCorrect) {
          hook = { ...hook, phase: "in-water", bobberShake: 1 };
        } else {
          fish = removeFish(fish, bitten.optionId);
          hook = finishReel(hook, { x: rod.tipX, y: rod.tipY });
          events.push({ type: "reeled-in" });
        }
      }
    }
  }

  fish = fish.map((item) =>
    item.state === "hooked" ? followHook(item, hook) : item,
  );

  fish = cullOffscreen(fish);

  return {
    scene: { ...scene, rod, hook, ripples, castTrail, fish },
    events,
  };
}
