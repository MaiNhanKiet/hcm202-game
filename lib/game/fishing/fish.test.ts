import { describe, expect, it } from "vitest";
import { HOOK_RADIUS, POND, WATER_Y } from "./constants";
import { followHook, removeFish, spawnFish, stepFish } from "./fish";
import type { Fish, HookState } from "./types";

function hookAt(x: number, y: number, phase: HookState["phase"] = "in-water"): HookState {
  return { phase, x, y, vx: 0, vy: 0, flightDistance: 0, bobberShake: 0 };
}

describe("fish", () => {
  it("spawns answer fish plus round hazards, all below water", () => {
    const fish = spawnFish(
      [
        { optionId: "yes", text: "Yes", isCorrect: true },
        { optionId: "no", text: "No", isCorrect: false },
      ],
      0,
    );
    expect(fish.filter((f) => f.kind === "answer")).toHaveLength(2);
    expect(fish.some((f) => f.kind === "bomb")).toBe(true);
    expect(fish.some((f) => f.kind === "trash")).toBe(true);
    expect(fish.filter((f) => f.kind === "trash").length).toBeGreaterThanOrEqual(2);
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

  it("spawns more hazards on higher rounds", () => {
    const easy = spawnFish([{ optionId: "a", text: "A", isCorrect: true }], 0);
    const hard = spawnFish([{ optionId: "a", text: "A", isCorrect: true }], 3);
    const easyHaz = easy.filter((f) => f.kind !== "answer").length;
    const hardHaz = hard.filter((f) => f.kind !== "answer").length;
    expect(hardHaz).toBeGreaterThan(easyHaz);
    expect(hard.filter((f) => f.kind === "trash").length).toBeGreaterThan(
      easy.filter((f) => f.kind === "trash").length,
    );
    expect(hard.some((f) => f.kind === "weed")).toBe(true);
    expect(hard.some((f) => f.kind === "net")).toBe(true);
    expect(hard.find((f) => f.kind === "answer")!.speed).toBeGreaterThan(
      easy.find((f) => f.kind === "answer")!.speed,
    );
  });

  it("notices bait in range then bites inside the hook radius", () => {
    const [f0] = spawnFish([{ optionId: "a", text: "A", isCorrect: true }], 0).filter(
      (f) => f.kind === "answer",
    );
    const fish = {
      ...f0,
      x: 300,
      y: 300,
      depth: 300,
      detectRadius: 80,
      state: "swim" as const,
      turnTimer: 99,
      jumpVy: 0,
    };
    const noticed = stepFish(fish, hookAt(360, 310), 1 / 60).fish;
    expect(noticed.state).toBe("notice");
    const close = { ...noticed, x: 300, y: 300 };
    const bitten = stepFish(close, hookAt(300 + HOOK_RADIUS / 2, 300), 1 / 60);
    expect(bitten.bite).toBe(true);
    expect(bitten.fish.state).toBe("hooked");
  });

  it("keeps submerged fish below the waterline when not jumping", () => {
    const fish = {
      ...spawnFish([{ optionId: "a", text: "A", isCorrect: false }], 0).find(
        (f) => f.kind === "answer",
      )!,
      x: 100,
      y: WATER_Y - 40,
      speed: 40,
      heading: -Math.PI / 2,
      depth: WATER_Y + 10,
      detectRadius: 10,
      state: "swim" as const,
      turnTimer: 99,
      jumpVy: 0,
      phase: 0,
    };
    const next = stepFish(fish, hookAt(0, 0), 1 / 60, 0).fish;
    expect(next.state === "jump" || next.y > WATER_Y).toBe(true);
    if (next.state !== "jump") {
      expect(next.y).toBeGreaterThan(WATER_Y);
    }
  });

  it("can leap above water then dive back down", () => {
    const base = spawnFish([{ optionId: "a", text: "A", isCorrect: true }], 0).find(
      (f) => f.kind === "answer",
    )!;
    let fish: Fish = {
      ...base,
      x: 300,
      y: WATER_Y + 6,
      depth: WATER_Y + 60,
      state: "jump",
      jumpVy: -220,
      heading: 0,
      turnTimer: 99,
      phase: 0,
    };
    let maxAbove = fish.y;
    for (let i = 0; i < 90; i += 1) {
      fish = stepFish(fish, hookAt(0, 0), 1 / 60, 0).fish;
      maxAbove = Math.min(maxAbove, fish.y);
    }
    expect(maxAbove).toBeLessThan(WATER_Y);
    expect(fish.state).toBe("swim");
    expect(fish.y).toBeGreaterThan(WATER_Y);
  });

  it("hooked fish follows the hook while reeling", () => {
    const fish = {
      ...spawnFish([{ optionId: "a", text: "A", isCorrect: true }], 0).find(
        (f) => f.kind === "answer",
      )!,
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
    const fish = spawnFish(
      [
        { optionId: "a", text: "A", isCorrect: true },
        { optionId: "b", text: "B", isCorrect: false },
      ],
      0,
    ).filter((f) => f.kind === "answer");
    expect(removeFish(fish, "a")).toHaveLength(1);
    expect(removeFish(fish, "a")[0].optionId).toBe("b");
  });

  it("keeps stable labelIndex after another fish is removed", () => {
    const fish = spawnFish(
      [
        { optionId: "a", text: "A", isCorrect: true },
        { optionId: "b", text: "B", isCorrect: false },
        { optionId: "c", text: "C", isCorrect: false },
      ],
      0,
    ).filter((f) => f.kind === "answer");
    expect(fish.map((f) => f.labelIndex)).toEqual([0, 1, 2]);
    const left = removeFish(fish, "a");
    expect(left.map((f) => f.labelIndex)).toEqual([1, 2]);
  });

  it("curves freely instead of locking to a single heading", () => {
    const [f0] = spawnFish([{ optionId: "a", text: "A", isCorrect: true }], 0).filter(
      (f) => f.kind === "answer",
    );
    let fish: Fish = {
      ...f0,
      x: 300,
      y: 280,
      depth: 340,
      detectRadius: 10,
      heading: 0,
      homeHeading: 0,
      state: "swim",
      turnTimer: 0,
      phase: 1.7,
      jumpVy: 0,
    };
    const headings = new Set<number>();
    for (let i = 0; i < 120; i += 1) {
      fish = stepFish(fish, hookAt(0, 0), 1 / 60, 0).fish;
      if (fish.state === "swim") headings.add(Number(fish.heading.toFixed(2)));
    }
    expect(headings.size).toBeGreaterThan(1);
  });
});
