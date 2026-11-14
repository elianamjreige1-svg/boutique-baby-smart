import { describe, expect, it } from "vitest";
import { originalPriceError } from "./original-price";

describe("admin original price", () => {
  it("requires an entered original price for a new product", () => {
    expect(originalPriceError("", true)).toBe("Please enter an original price");
    expect(originalPriceError("  ", true)).toBe("Please enter an original price");
    expect(originalPriceError("12.50", true)).toBeNull();
    expect(originalPriceError("0", true)).toBeNull();
  });
  it("allows existing products without an original price to be edited", () => {
    expect(originalPriceError("", false)).toBeNull();
  });
  it("rejects invalid or negative amounts", () => {
    expect(originalPriceError("-1", true)).not.toBeNull();
    expect(originalPriceError("Infinity", true)).not.toBeNull();
    expect(originalPriceError("abc", true)).not.toBeNull();
  });
});