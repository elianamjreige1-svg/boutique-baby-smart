export function originalPriceError(value: string, isNew: boolean): string | null {
  if (!value.trim()) return isNew ? "Please enter an original price" : null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0
    ? null
    : "Original price must be a valid amount of 0 or more";
}