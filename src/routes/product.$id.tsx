import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { money, useCart } from "@/lib/cart";
import { checkStock } from "@/lib/stock";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "Product — cuddlekidslb" },
      { name: "description", content: "Soft baby clothing from cuddlekidslb. Cash on delivery." },
      { property: "og:title", content: "Product — cuddlekidslb" },
      { property: "og:description", content: "Soft baby clothing from cuddlekidslb." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { add, items } = useCart();
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const { data: p, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => (await supabase.from("products").select("*").eq("id", id).maybeSingle()).data,
  });

  if (isLoading) return <p className="p-12 text-center text-muted-foreground">Loading…</p>;
  if (!p) return <p className="p-12 text-center">Product not found. <Link to="/" className="text-primary underline">Back to shop</Link></p>;

  const needsSize = p.sizes.length > 0;
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-2">
      <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-muted">
        {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}
      </div>
      <div className="flex flex-col gap-5">
        <h1 className="text-4xl font-semibold">{p.name}</h1>
        <p className="text-sm text-muted-foreground">
          {p.gender === "unisex" ? "Unisex" : p.gender === "boy" ? "For boys" : "For girls"} · Age {p.sizes.length ? p.sizes.join(", ") : p.age_group}
        </p>
        <p className="text-2xl font-semibold text-primary">{money(Number(p.price))}</p>
        <p className="text-muted-foreground">{p.description}</p>
        {needsSize && (
          <div>
            <p className="mb-2 text-sm font-semibold">Size</p>
            <div className="flex flex-wrap gap-2">
              {p.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`rounded-full border px-4 py-1.5 text-sm ${size === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setQty(Math.max(1, qty - 1))}>−</Button>
          <span className="w-8 text-center">{qty}</span>
          <Button variant="outline" size="icon" onClick={() => setQty(qty + 1)}>+</Button>
        </div>
        <Button
          size="lg"
          className="rounded-full"
          disabled={p.stock < 1 || adding}
          onClick={async () => {
            if (needsSize && !size) { toast.error("Please choose a size"); return; }
            setAdding(true);
            try {
              const [line] = await checkStock([{ productId: p.id, size }]);
              const available = line?.available ?? 0;
              const inCart = items.find((i) => i.productId === p.id && i.size === size)?.quantity ?? 0;
              if (qty + inCart > available) {
                const left = Math.max(0, available - inCart);
                toast.error(left === 0 ? (inCart ? `Only ${available} items available, all already in your cart` : "Sold out") : `Only ${left} items available`);
                return;
              }
              add({ productId: p.id, name: p.name, price: Number(p.price), image: p.image_url, size, quantity: qty });
              toast.success("Added to cart");
            } catch {
              toast.error("Could not check stock, please try again");
            } finally {
              setAdding(false);
            }
          }}
        >
          {p.stock < 1 ? "Sold out" : "Add to cart"}
        </Button>
      </div>
    </div>
  );
}
