import { describe, expect, it } from "vitest";
import { checkoutFieldErrors } from "./checkout-validation";

const valid = { customer_name: "Layal Khoury", phone: "71613153", address: "Beirut, Hamra street 12", city: "Beirut" };

describe("checkoutFieldErrors", () => {
  it("returns no errors when every required field meets its minimum", () => {
    expect(checkoutFieldErrors(valid)).toEqual([]);
  });

  it("flags each field shorter than its minimum with the exact message", () => {
    const errs = checkoutFieldErrors({
      customer_name: "L", // min 2
      phone: "71613", // min 6
      address: "Beir", // min 5
      city: "B", // min 2
    });
    expect(errs).toEqual([
      "Full name: minimum 2 characters",
      "Phone: minimum 6 characters",
      "Address: minimum 5 characters",
      "City: minimum 2 characters",
    ]);
  });

  it("counts spaces-only fields by their trimmed length", () => {
    const errs = checkoutFieldErrors({ ...valid, phone: "      " });
    expect(errs).toEqual(["Phone: minimum 6 characters"]);
  });

  it("accepts a field exactly at its minimum", () => {
    expect(checkoutFieldErrors({ ...valid, city: "Ty" })).toEqual([]);
  });
});
