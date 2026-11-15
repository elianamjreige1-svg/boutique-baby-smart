import { describe, expect, it } from "vitest";
import { originalPriceError } from "./original-price";

describe("admin original price", () => {
  it("is optional, so an empty value is accepted for a new product", () => {
    expect(originalPriceError("")).toBeNull();
    expect(originalPriceError("  ")).toBeNull();
  });
  it("accepts valid amounts", () => {
    expect(originalPriceError("12.50")).toBeNull();
    expect(originalPriceError("0")).toBeNull();
  });
  it("rejects invalid or negative amounts", () => {
    expect(originalPriceError("-1")).not.toBeNull();
    expect(originalPriceError("Infinity")).not.toBeNull();
    expect(originalPriceError("abc")).not.toBeNull();
  });
});
