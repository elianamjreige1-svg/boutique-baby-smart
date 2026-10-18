import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { money, useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — cuddlekidslb" },
      { name: "description", content: "Review the items in your cuddlekidslb cart." },
      { property: "og:title", content: "Your Cart — cuddlekidslb" },
      { property: "og:description", content: "Review your cart and check out with cash on delivery." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, update, remove, total } = useCart();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-4xl font-semibold">Your cart</h1>
      {items.length === 0 ? (
        <p className="text-muted-foreground">Your cart is empty. <Link to="/" className="text-primary underline">Start shopping</Link></p>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {items.map((i) => (
              <li key={i.productId + i.size} className="flex items-center gap-4 p-4">
                <div className="h-20 w-16 overflow-hidden rounded-lg bg-muted">
                  {i.image && <img src={i.image} alt={i.name} className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{i.name}</p>
                 {i.size && (
  <div className="mt-1 text-sm text-muted-foreground">
    <p>Size:</p>
    <p className="break-words">{i.size}</p>
  </div>
)}
                  <p className="text-sm text-primary">{money(i.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => update(i.productId, i.size, i.quantity - 1)}>−</Button>
                  <span className="w-6 text-center">{i.quantity}</span>
                  <Button variant="outline" size="icon" onClick={() => update(i.productId, i.size, i.quantity + 1)}>+</Button>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(i.productId, i.size)} aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xl">Total: <span className="font-semibold">{money(total)}</span></p>
            <Button asChild size="lg" className="rounded-full"><Link to="/checkout">Checkout</Link></Button>
          </div>
        </>
      )}
    </div>
  );
}
