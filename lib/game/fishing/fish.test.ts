import { describe, expect, it } from "vitest";
import { HOOK_RADIUS, POND, WATER_Y } from "./constants";
import { followHook, removeFish, spawnFish, stepFish } from "./fish";
import type { Fish, HookState } from "./types";

function hookAt(x: number, y: number, phase: HookState["phase"] = "in-water"): HookState {
  return { phase, x, y, vx: 0, vy: 0, flightDistance: 0, bobberShake: 0 };
}

describe("fish", () => {
  it("spawns one fish per option, all below water, correct hungrier", () => {
    const fish = spawnFish([
      { optionId: "yes", text: "Yes", isCorrect: true },
      { optionId: "no", text: "No", isCorrect: false },
    ]);
    expect(fish).toHaveLength(2);
    for (const f of fish) {
      expect(f.y).toBeGreaterThan(WATER_Y);
      expect(f.x).toBeGreaterThanOrEqual(POND.xMin);
      expect(f.x).toBeLessThanOrEqual(POND.xMax);
    }
    const yes = fish.find((f) => f.optionId === "yes")!;
    const no = fish.find((f) => f.optionId === "no")!;
    expect(yes.detectRadius).toBeGreaterThan(no.detectRadius);
    expect(yes.speed).toBeGreaterThan(no.speed);
  });

  it("notices bait in range then bites inside the hook radius", () => {
    const [f0] = spawnFish([{ optionId: "a", text: "A", isCorrect: true }]);
    const fish = { ...f0, x: 300, y: 300, depth: 300, detectRadius: 80, state: "swim" as const };
    const noticed = stepFish(fish, hookAt(360, 310), 1 / 60).fish;
    expect(noticed.state).toBe("notice");
    const close = { ...noticed, x: 300, y: 300 };
    const bitten = stepFish(close, hookAt(300 + HOOK_RADIUS / 2, 300), 1 / 60);
    expect(bitten.bite).toBe(true);
    expect(bitten.fish.state).toBe("hooked");
  });

  it("never swims above the waterline", () => {
    const fish = {
      ...spawnFish([{ optionId: "a", text: "A", isCorrect: false }])[0],
      x: 100,
      y: WATER_Y - 40,
      speed: 40,
      heading: -Math.PI / 2,
      depth: WATER_Y + 10,
      detectRadius: 10,
      state: "swim" as const,
    };
    const next = stepFish(fish, hookAt(0, 0), 1).fish;
    expect(next.y).toBeGreaterThan(WATER_Y);
  });

  it("hooked fish follows the hook while reeling", () => {
    const fish = {
      ...spawnFish([{ optionId: "a", text: "A", isCorrect: true }])[0],
      x: 400,
      y: 400,
      state: "hooked" as const,
    };
    const next = followHook(fish, hookAt(250, 260, "reeling"));
    expect(next.x).toBe(250);
    expect(next.y).toBe(260);
    expect(next.state).toBe("hooked");
  });

  it("removeFish drops the caught fish so no ghost remains", () => {
    const fish = spawnFish([
      { optionId: "a", text: "A", isCorrect: true },
      { optionId: "b", text: "B", isCorrect: false },
    ]);
    expect(removeFish(fish, "a")).toHaveLength(1);
    expect(removeFish(fish, "a")[0].optionId).toBe("b");
  });

  it("keeps stable labelIndex after another fish is removed", () => {
    const fish = spawnFish([
      { optionId: "a", text: "A", isCorrect: true },
      { optionId: "b", text: "B", isCorrect: false },
      { optionId: "c", text: "C", isCorrect: false },
    ]);
    expect(fish.map((f) => f.labelIndex)).toEqual([0, 1, 2]);
    const left = removeFish(fish, "a");
    expect(left.map((f) => f.labelIndex)).toEqual([1, 2]);
  });

  it("returns to horizontal swim and home depth when bait is far away", () => {
    const [f0] = spawnFish([{ optionId: "a", text: "A", isCorrect: true }]);
    const curious = {
      ...f0,
      x: 300,
      y: 280,
      depth: 340,
      detectRadius: 60,
      heading: Math.PI / 2,
      state: "notice" as const,
      homeHeading: 0,
    };
    const farHook = hookAt(500, 400);
    let fish: Fish = curious;
    for (let i = 0; i < 90; i += 1) {
      fish = stepFish(fish, farHook, 1 / 60).fish;
    }
    expect(fish.state).toBe("swim");
    expect(fish.heading === 0 || fish.heading === Math.PI).toBe(true);
    expect(fish.y).toBeGreaterThan(curious.y);
    expect(fish.y).toBeCloseTo(curious.depth, -1);
  });
});
