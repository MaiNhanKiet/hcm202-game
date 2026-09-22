import { describe, expect, it } from "vitest";
import { formatPlayTime } from "./playTime";

describe("formatPlayTime", () => {
  it("formats elapsed ms as m:ss", () => {
    expect(formatPlayTime(0)).toBe("0:00");
    expect(formatPlayTime(1500)).toBe("0:01");
    expect(formatPlayTime(65_000)).toBe("1:05");
    expect(formatPlayTime(600_000)).toBe("10:00");
  });
});
