import { describe, it, expect } from "vitest";
import { fitWithin, qualitySteps } from "./image-optimize";

describe("image optimize rules", () => {
  it("fits a 4000x3000 photo within 1000x1000", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1000, height: 750 });
  });
  it("fits a tall photo within 1000x1000", () => {
    expect(fitWithin(3024, 4032)).toEqual({ width: 750, height: 1000 });
  });
  it("never upscales small images", () => {
    expect(fitWithin(600, 400)).toEqual({ width: 600, height: 400 });
  });
  it("starts at 82% and never goes below 70%", () => {
    const s = qualitySteps();
    expect(s[0]).toBe(0.82);
    expect(Math.min(...s)).toBeGreaterThanOrEqual(0.7);
  });
});
