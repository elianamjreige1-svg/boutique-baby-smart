import { toast } from "sonner";
import { checkStock } from "@/lib/stock";

type Line = { productId: string; name: string; size: string | null; quantity: number };

/** Live stock problems for the cart, one message per item. */
export async function cartStockProblems(items: Line[]): Promise<string[]> {
  const lines = await checkStock(items.map((i) => ({ productId: i.productId, size: i.size })));
  return items.flatMap((i) => {
    const l = lines.find((x) => x.productId === i.productId && x.size === i.size);
    const available = l?.available ?? 0;
    const label = `${i.name}${i.size ? ` (${i.size})` : ""}`;
    if (i.quantity <= available) return [];
    return [available === 0 ? `${label} is sold out` : `${label}: only ${available} ${available === 1 ? "item" : "items"} available`];
  });
}

/** Shows each problem as its own bullet line. */
export function showStockAlert(problems: string[]) {
  toast.error("Please update your cart", {
    duration: 8000,
    description: (
      <ul className="mt-1 list-disc space-y-1 pl-4">
        {problems.map((p) => <li key={p}>{p}</li>)}
      </ul>
    ),
  });
}

/** Shows each form validation error as its own bullet line. */
export function showFormErrors(errors: string[]) {
  toast.error("Please fix the following", {
    duration: 8000,
    description: (
      <ul className="mt-1 list-disc space-y-1 pl-4">
        {errors.map((e) => <li key={e}>{e}</li>)}
      </ul>
    ),
  });
}
