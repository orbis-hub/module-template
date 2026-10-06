import { describe, expect, it } from "vitest";
import { crossedMilestone, nextValue } from "./logic";

describe("counter logic", () => {
  it("adds the step", () => {
    expect(nextValue(4, 3)).toBe(7);
  });
  it("reports a milestone only when one is crossed", () => {
    expect(crossedMilestone(98, 101, 100)).toBe(100);
    expect(crossedMilestone(100, 101, 100)).toBeNull();
    expect(crossedMilestone(10, 20, 100)).toBeNull();
    expect(crossedMilestone(190, 210, 100)).toBe(200);
    expect(crossedMilestone(5, 5, 100)).toBeNull();
  });
});
