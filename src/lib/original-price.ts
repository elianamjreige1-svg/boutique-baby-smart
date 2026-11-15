export function originalPriceError(value: string): string | null {
  if (!value.trim()) return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0
    ? null
    : "Original price must be a valid amount of 0 or more";
}
