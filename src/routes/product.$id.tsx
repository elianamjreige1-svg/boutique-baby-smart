import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { money, useCart } from "@/lib/cart";
import { availableFor, checkStock } from "@/lib/stock";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "Product — cuddlekids.lb" },
      { name: "description", content: "Soft baby clothing from cuddlekidslb. Cash on delivery." },
      { property: "og:title", content: "Product — cuddlekidslb" },
      { property: "og:description", content: "Soft baby clothing from cuddlekids.lb." },
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
  const isAllAges = p.sizes.includes("All ages");
  const leftFor = (s: string) => availableFor(p, s);
  const autoSize = p.sizes.length === 1 ? p.sizes[0] : isAllAges ? "All ages" : null;
  const selectedSize = size ?? (autoSize && leftFor(autoSize) > 0 ? autoSize : null);
  const selectedLeft = selectedSize ? leftFor(selectedSize) : p.stock;

  const needsSize = p.sizes.length > 0;
  const photos = p.images?.length ? p.images : p.image_url ? [p.image_url] : [];
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-2">
      <Gallery photos={photos} name={p.name} />
      <div className="flex flex-col gap-5">
        <h1 className="text-4xl font-semibold">{p.name}</h1>
        <p className="text-sm text-muted-foreground">
          {p.gender === "unisex" ? "Unisex" : p.gender === "boy" ? "For boys" : "For girls"} · Age: {p.sizes.includes("All ages") ? "All ages" : p.sizes.length ? p.sizes.join(", ") : p.age_group}
        </p>
        <p className="text-2xl font-semibold text-primary">{money(Number(p.price))}</p>
        <p className="text-muted-foreground">{p.description}</p>
        {needsSize && (
          <div>
            <p className="mb-2 text-sm font-semibold">Size</p>
            <div className="flex flex-wrap gap-2">
              {p.sizes.map((s) => {
                const out = leftFor(s) < 1;
                return (
                  <button
                    key={s}
                    disabled={out}
                    title={out ? "Sold out" : undefined}
                    onClick={() => setSize(s)}
                    className={`rounded-full border px-4 py-1.5 text-sm ${selectedSize === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"} ${out ? "cursor-not-allowed border-dashed bg-muted text-muted-foreground line-through opacity-70" : ""}`}
                  >
                    {s}
                  </button>
                );
              })}
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
          disabled={selectedLeft < 1 || adding}
          onClick={async () => {
            if (needsSize && !selectedSize) { toast.error("Please choose a size"); return; }
            setAdding(true);
            try {
              const [line] = await checkStock([{ productId: p.id, size: selectedSize }]);
              const available = line?.available ?? 0;
              const inCart = items.find((i) => i.productId === p.id && i.size === selectedSize)?.quantity ?? 0;
              if (qty + inCart > available) {
                const left = Math.max(0, available - inCart);
                toast.error(left === 0 ? (inCart ? `Only ${available} items available, all already in your cart` : "Sold out") : `Only ${left} items available`);
                return;
              }
              add({ productId: p.id, name: p.name, price: Number(p.price), image: p.image_url, size: selectedSize, quantity: qty });
              toast.success("Added to cart");
            } catch {
              toast.error("Could not check stock, please try again");
            } finally {
              setAdding(false);
            }
          }}
        >
          {selectedLeft < 1 ? "Sold out" : "Add to cart"}
        </Button>
      </div>
    </div>
  );
}

function Gallery({ photos, name }: { photos: string[]; name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const go = (i: number) => {
    const el = ref.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={(e) => setIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-3xl bg-muted [scrollbar-width:none]"
      >
        {photos.map((src, i) => (
          <img key={src} src={src} alt={`${name} ${i + 1}`} className="h-full w-full flex-none snap-center object-cover" />
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <button type="button" aria-label="Previous photo" onClick={() => go(Math.max(0, idx - 1))} className="absolute left-2 top-[45%] -translate-y-1/2 rounded-full bg-card/80 p-2 shadow"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" aria-label="Next photo" onClick={() => go(Math.min(photos.length - 1, idx + 1))} className="absolute right-2 top-[45%] -translate-y-1/2 rounded-full bg-card/80 p-2 shadow"><ChevronRight className="h-5 w-5" /></button>
          <div className="mt-3 flex justify-center gap-2">
            {photos.map((_, i) => (
              <button key={i} type="button" aria-label={`Photo ${i + 1}`} onClick={() => go(i)} className={`h-2 w-2 rounded-full ${i === idx ? "bg-primary" : "bg-border"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
