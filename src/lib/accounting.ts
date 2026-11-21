export const ORDER_STATUSES = ["pending", "confirmed", "shipped", "picked-up"];

export function countsAsIncome(status: string) {
  return status === "confirmed" || status === "shipped" || status === "picked-up";
}

export function incomeAmount(order: { status: string; total: number }) {
  return countsAsIncome(order.status) ? Number(order.total) : 0;
}

export function amountInCents(amount: number) {
  return Math.round(amount * 100);
}

export function sumAmounts(amounts: number[]) {
  return amounts.reduce((sum, amount) => sum + amountInCents(amount), 0) / 100;
}

export function totalIncome(orders: { status: string; total: number }[], adjustment = 0) {
  return sumAmounts([...orders.map(incomeAmount), adjustment]);
}