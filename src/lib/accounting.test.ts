import { describe, expect, it } from "vitest";
import { countsAsIncome, incomeAmount, sumAmounts, totalIncome, ORDER_STATUSES } from "./accounting";

describe("admin income", () => {
  it("adds the selling total when confirmed, not original product costs", () => {
    expect(incomeAmount({ status: "confirmed", total: 35 })).toBe(35);
  });
  it("includes picked-up orders", () => {
    expect(ORDER_STATUSES).toContain("picked-up");
    expect(incomeAmount({ status: "picked-up", total: 42 })).toBe(42);
  });
  it("does not count pending orders", () => {
    expect(incomeAmount({ status: "pending", total: 35 })).toBe(0);
  });
  it("keeps shipped income without counting the order twice", () => {
    const order = { status: "confirmed", total: 35 };
    order.status = "picked-up";
    expect(sumAmounts([incomeAmount(order)])).toBe(35);
    order.status = "shipped";
    expect(sumAmounts([incomeAmount(order)])).toBe(35);
  });
  it("removes a cancelled order from income", () => {
    expect(incomeAmount({ status: "cancelled", total: 35 })).toBe(0);
    expect(sumAmounts([])).toBe(0);
  });
  it("edits the combined total and still adds confirmations and subtracts cancellations", () => {
    const orders = [{ status: "confirmed", total: 35 }, { status: "confirmed", total: 65 }];
    const adjustment = 120 - totalIncome(orders);
    expect(totalIncome(orders, adjustment)).toBe(120);
    orders.push({ status: "picked-up", total: 30 });
    expect(totalIncome(orders, adjustment)).toBe(150);
    orders.splice(0, 1);
    expect(totalIncome(orders, adjustment)).toBe(115);
    expect(orders[0]?.total).toBe(65);
  });
  it("removes income when an order returns to pending", () => {
    expect(totalIncome([{ status: "pending", total: 35 }], 20)).toBe(20);
  });
  it("sums expenses to cents", () => {
    expect(sumAmounts([0.1, 0.2, 20])).toBe(20.3);
  });
  it("only eligible statuses qualify", () => {
    expect(countsAsIncome("delivered")).toBe(false);
  });
});