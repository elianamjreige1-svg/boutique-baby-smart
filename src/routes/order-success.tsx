import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { trackPixel } from "@/lib/meta-pixel";

export const Route = createFileRoute("/order-success")({
  validateSearch: z.object({ id: z.string().optional() }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Order Placed — cuddlekids.lb" },
      { name: "description", content: "Thank you for your order." },
      { property: "og:title", content: "Order Placed — cuddlekids.lb" },
      { property: "og:description", content: "Thank you for your order." },
    ],
  }),
  component: Success,
});

function Success() {
  const { id } = Route.useSearch();
  useEffect(() => {
    const raw = sessionStorage.getItem("ck_purchase");
    if (!raw) return;
    sessionStorage.removeItem("ck_purchase");
    const { value } = JSON.parse(raw) as { value: number };
    trackPixel("Purchase", { value: Number(value) || 0, currency: "USD" });
  }, []);
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-4xl font-semibold">Thank you! </h1>
      <p className="mt-4 text-muted-foreground">
        Your order is placed, and you'll pay in cash on delivery.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
       You will receive your order within 1 to 4 working days.
      </p>

      
      {id && <p className="mt-2 text-sm text-muted-foreground">Order #{id.slice(0, 8)}</p>}
      <Button asChild className="mt-8 rounded-full"><Link to="/">Keep shopping</Link></Button>
    </div>
  );
}
