import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { availableFor } from "./stock";

describe("availableFor", () => {
  it("uses the quantity of the chosen age", () => {
    expect(availableFor({ active: true, stock: 10, size_stock: { "0-3m": 3, "3-6m": 7 } }, "0-3m")).toBe(3);
  });
  it("is 0 for hidden products", () => {
    expect(availableFor({ active: false, stock: 10, size_stock: { "0-3m": 3 } }, "0-3m")).toBe(0);
  });
  it("is 0 for an age set to 0 even when the total stock is bigger", () => {
    expect(availableFor({ active: true, stock: 5, size_stock: { "0-3m": 0, "3-6m": 5 } }, "0-3m")).toBe(0);
  });
  it("is 0 when every age quantity is 0", () => {
    expect(availableFor({ active: true, stock: 0, size_stock: { "0-3m": 0, "3-6m": 0 } }, "3-6m")).toBe(0);
  });
  it("uses the total stock for an age with no quantity of its own", () => {
    expect(availableFor({ active: true, stock: 4, size_stock: { "0-3m": 2 } }, "6-9M")).toBe(4);
  });
});
