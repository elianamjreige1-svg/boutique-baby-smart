import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  customer_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(30),
  address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(100),
  notes: z.string().trim().max(500).default(""),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        size: z.string().max(30).nullable(),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(50),
});

// Public: guests place cash-on-delivery orders. Prices are re-read from the database.
export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = [...new Set(data.items.map((i) => i.productId))];
    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("id, name, price, stock, active")
      .in("id", ids);
    if (error) throw new Error("Could not load products");

    const lines = data.items.map((i) => {
      const p = products?.find((x) => x.id === i.productId);
      if (!p || !p.active) throw new Error("A product in your cart is no longer available");
      if (p.stock < i.quantity) throw new Error(`Not enough stock for ${p.name}`);
      return { product_id: p.id, product_name: p.name, size: i.size, price: Number(p.price), quantity: i.quantity };
    });
    const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customer_name,
        phone: data.phone,
        address: data.address,
        city: data.city,
        notes: data.notes,
        total,
        payment_method: "cash_on_delivery",
      })
      .select("id")
      .single();
    if (oErr || !order) throw new Error("Could not place order");

    const { error: iErr } = await supabaseAdmin
      .from("order_items")
      .insert(lines.map((l) => ({ ...l, order_id: order.id })));
    if (iErr) throw new Error("Could not save order items");

    for (const l of lines) {
      const p = products!.find((x) => x.id === l.product_id)!;
      await supabaseAdmin.from("products").update({ stock: p.stock - l.quantity }).eq("id", p.id);
      p.stock -= l.quantity;
    }
    return { id: order.id, total };
  });
