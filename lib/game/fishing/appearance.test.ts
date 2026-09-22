import { describe, expect, it } from "vitest";
import { fishFill, optionTag } from "./appearance";

describe("fish appearance", () => {
  it("tags options as A, B, C without using the answer key", () => {
    expect(optionTag(0)).toBe("A");
    expect(optionTag(1)).toBe("B");
    expect(optionTag(4)).toBe("E");
  });

  it("paints by spawn index, not isCorrect", () => {
    expect(fishFill(0)).toBe(fishFill(0));
    expect(fishFill(0)).not.toBe(fishFill(1));
  });
});
