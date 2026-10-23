/** Minimum lengths for checkout fields — must match the server's placeOrder schema. */
const MIN: Array<[key: string, min: number, label: string]> = [
  ["customer_name", 2, "Full name"],
  ["phone", 8, "Phone"],
  ["address", 5, "Address"],
  ["city", 2, "City"],
];

type Fields = { customer_name: string; phone: string; address: string; city: string };

/** Returns one message per required field shorter than its minimum, e.g. "Phone: minimum 8 characters". */
export function checkoutFieldErrors(f: Fields): string[] {
  return MIN.flatMap(([key, min, label]) =>
    f[key as keyof Fields].trim().length < min ? [`${label}: minimum ${min} characters`] : [],
  );
}
