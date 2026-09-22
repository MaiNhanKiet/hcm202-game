import { describe, expect, it } from "vitest";
import { roundDifficulty } from "./difficulty";

describe("roundDifficulty", () => {
  it("gets harder on higher rounds with more trash and blockers", () => {
    const easy = roundDifficulty(0);
    const mid = roundDifficulty(2);
    const hard = roundDifficulty(4);
    expect(hard.speedMult).toBeGreaterThan(easy.speedMult);
    expect(hard.hazardCount).toBeGreaterThan(easy.hazardCount);
    expect(hard.trashCount).toBeGreaterThan(easy.trashCount);
    expect(mid.weedCount).toBeGreaterThan(easy.weedCount);
    expect(hard.netCount).toBeGreaterThan(easy.netCount);
    expect(hard.correctDetectMult).toBeLessThan(easy.correctDetectMult);
    expect(hard.jumpChance).toBeGreaterThan(easy.jumpChance);
    expect(hard.blockerBiteMult).toBeGreaterThan(easy.blockerBiteMult);
    expect(easy.trashCount).toBeGreaterThanOrEqual(2);
  });
});
