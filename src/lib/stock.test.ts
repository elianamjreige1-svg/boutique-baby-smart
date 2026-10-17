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
});
