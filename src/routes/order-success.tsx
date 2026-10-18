import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/order-success")({
  validateSearch: z.object({ id: z.string().optional() }),
  head: () => ({
    meta: [
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
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-4xl font-semibold">Thank you! </h1>
      <p className="mt-4 text-muted-foreground">
        Your order is placed, and you'll pay in cash on delivery.
      </p>
      {id && <p className="mt-2 text-sm text-muted-foreground">Order #{id.slice(0, 8)}</p>}
      <Button asChild className="mt-8 rounded-full"><Link to="/">Keep shopping</Link></Button>
    </div>
  );
}
