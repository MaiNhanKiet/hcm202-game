import { describe, expect, it } from "vitest";
import { visualRodTip } from "./rod";

describe("visualRodTip", () => {
  it("matches the drawn tip eyelet at rest", () => {
    const tip = visualRodTip({ swing: 0, bend: 0 }, 220);
    expect(tip.x).toBeCloseTo(184.35, 1);
    expect(tip.y).toBeCloseTo(78.19, 1);
  });

  it("moves with bend like the tip wire", () => {
    const flat = visualRodTip({ swing: 1, bend: 0 }, 220);
    const bent = visualRodTip({ swing: 1, bend: 1 }, 220);
    expect(bent.x).not.toBeCloseTo(flat.x, 0);
    expect(bent.y).not.toBeCloseTo(flat.y, 0);
  });

  it("keeps the tip above the water for every cast pose", () => {
    const waterY = 220;
    for (let swing = -1; swing <= 1.1; swing += 0.2) {
      for (let bend = 0; bend <= 1; bend += 0.2) {
        const tip = visualRodTip({ swing, bend }, waterY);
        expect(tip.y).toBeLessThan(waterY - 8);
      }
    }
  });
});
