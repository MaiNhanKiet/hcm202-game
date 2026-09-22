import { describe, expect, it } from "vitest";
import { HOOK_RADIUS, POND, WATER_Y } from "./constants";
import { spawnFish, stepFish } from "./fish";
import type { HookState } from "./types";

function hookAt(x: number, y: number): HookState {
  return { phase: "in-water", x, y, vx: 0, vy: 0, flightDistance: 0, bobberShake: 0 };
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
      optionId: "a",
      text: "A",
      isCorrect: false,
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
});
