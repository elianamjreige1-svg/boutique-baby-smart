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
      phone: "71613", // min 8
      address: "Beir", // min 5
      city: "B", // min 2
    });
    expect(errs).toEqual([
      "Full name: minimum 2 characters",
      "Phone: minimum 8 characters",
      "Address: minimum 5 characters",
      "City: minimum 2 characters",
    ]);
  });

  it("requires the phone to have at least 8 digits", () => {
    expect(checkoutFieldErrors({ ...valid, phone: "7161315" })).toEqual(["Phone: minimum 8 characters"]);
    expect(checkoutFieldErrors({ ...valid, phone: "71613153" })).toEqual([]);
  });

  it("counts spaces-only fields by their trimmed length", () => {
    const errs = checkoutFieldErrors({ ...valid, phone: "      " });
    expect(errs).toEqual(["Phone: minimum 8 characters"]);
  });

  it("accepts a field exactly at its minimum", () => {
    expect(checkoutFieldErrors({ ...valid, city: "Ty" })).toEqual([]);
  });
});
