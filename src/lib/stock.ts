import { supabase } from "@/integrations/supabase/client";

export type StockLine = { productId: string; size: string | null; name: string; available: number };

/** Available stock for one product/size: per-age quantity when set, otherwise the overall stock. */
export function availableFor(p: { active: boolean; stock: number; size_stock: unknown }, size: string | null): number {
  if (!p.active) return 0;
  const ss = (p.size_stock ?? {}) as Record<string, number>;
  if (size && size in ss) return Number(ss[size]) || 0;
  return p.stock;
}

export async function checkStock(items: { productId: string; size: string | null }[]): Promise<StockLine[]> {
  const { data, error } = await supabase.rpc("check_stock", { _items: items });
  if (error) throw new Error("Could not check stock");
  return (data ?? []) as StockLine[];
}
