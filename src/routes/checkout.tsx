import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Banknote } from "lucide-react";
import { money, useCart } from "@/lib/cart";
import { placeOrder } from "@/lib/orders.functions";
import { checkStock } from "@/lib/stock";
import { useDeliveryFee } from "@/lib/delivery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — cuddlekidslb" },
      { name: "description", content: "Enter your delivery details and pay cash on delivery." },
      { property: "og:title", content: "Checkout — cuddlekidslb" },
      { property: "og:description", content: "Cash on delivery checkout." },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { items, total, clear } = useCart();
  const place = useServerFn(placeOrder);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const { data: fee = 0 } = useDeliveryFee();
  const grand = total + fee;
  const [f, setF] = useState({ customer_name: "", phone: "", address: "", city: "", notes: "" });

  if (items.length === 0)
    return <p className="p-12 text-center">Your cart is empty. <Link to="/" className="text-primary underline">Shop now</Link></p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const lines = await checkStock(items.map((i) => ({ productId: i.productId, size: i.size })));
      const problems = items.flatMap((i) => {
        const l = lines.find((x) => x.productId === i.productId && x.size === i.size);
        const available = l?.available ?? 0;
        return i.quantity > available
          ? [available === 0 ? `${i.name}${i.size ? ` (${i.size})` : ""} is sold out` : `${i.name}${i.size ? ` (${i.size})` : ""}: only ${available} items available`]
          : [];
      });
      if (problems.length) {
        toast.error("Please update your cart", { description: problems.join("\n"), duration: 8000 });
        return;
      }
      const res = await place({
        data: { ...f, items: items.map((i) => ({ productId: i.productId, size: i.size, quantity: i.quantity })) },
      });
      clear();
      navigate({ to: "/order-success", search: { id: res.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place order. Please check your details.");
    } finally {
      setBusy(false);
    }
  };

  const field = (k: keyof typeof f, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} required value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </div>
  );

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-[1fr_320px]">
      <form onSubmit={submit} className="space-y-4">
        <h1 className="text-4xl font-semibold">Delivery details</h1>
        {field("customer_name", "Full name")}
        {field("phone", "Phone", "tel")}
        {field("address", "Address")}
        {field("city", "City")}
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea id="notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-primary bg-accent p-4">
          <Banknote className="h-6 w-6 text-primary" />
          <div>
            <p className="font-semibold">Cash on delivery</p>
            <p className="text-sm text-muted-foreground">Pay in cash when your order arrives.</p>
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full rounded-full" disabled={busy}>
          {busy ? "Placing order…" : `Place order · ${money(grand)}`}
        </Button>
      </form>
      <aside className="h-fit rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-xl">Summary</h2>
        <ul className="space-y-2 text-sm">
          {items.map((i) => (
            <li key={i.productId + i.size} className="flex justify-between">
              <span>{i.quantity} × {i.name}{i.size ? ` (${i.size})` : ""}</span>
              <span>{money(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{money(total)}</span></div>
          <div className="flex justify-between"><span>Delivery</span><span>{money(fee)}</span></div>
        </div>
        <div className="mt-2 flex justify-between font-semibold">
          <span>Total to pay</span><span>{money(grand)}</span>
        </div>
      </aside>
    </div>
  );
}
