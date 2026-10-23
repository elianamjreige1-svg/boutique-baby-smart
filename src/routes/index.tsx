import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/cart";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "cuddlekids.lb — Soft Baby Clothes, Cash on Delivery" },
      { name: "description", content: "Shop organic bodysuits, pajamas and knits for babies. Pay cash when it arrives." },
      { property: "og:title", content: "cuddlekids.lb — Soft Baby Clothes" },
      { property: "og:description", content: "Organic baby clothes delivered to your door. Cash on delivery." },
    ],
  }),
  component: Shop,
});

const GENDERS = [
  { value: null, label: "Everyone" },
  { value: "boy", label: "Boy" },
  { value: "girl", label: "Girl" },
];
const AGE_GROUPS = ["6-9M", "9-12M", "12-18M", "18-24M", "2-4Y", "4-6Y", "6-8Y", "8-10Y"];

function Shop() {
  const [cat, setCat] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [age, setAge] = useState<string | null>(null);
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const rows = (await supabase.from("categories").select("*").order("name")).data ?? [];
      const ORDER = ["set", "top", "bottom", "accessor"];
      const rank = (n: string) => { const i = ORDER.findIndex((k) => n.toLowerCase().startsWith(k)); return i < 0 ? 3.5 : i; };
      return [...rows].sort((a, b) => rank(a.name) - rank(b.name));
    },
  });
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () =>
      (await supabase.from("products").select("*").eq("active", true).order("created_at", { ascending: false })).data ?? [],
  });
  const shown = products.filter(
    (p) =>
      (!cat || p.category_id === cat) &&
      (!gender || p.gender === gender || p.gender === "unisex") &&
      (!age || p.age_group === age || p.sizes.includes(age) || p.sizes.includes("All ages")),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section className="mb-12 rounded-3xl bg-accent px-8 py-14 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary"></p>
        <h1 className="mx-auto max-w-2xl text-4xl font-semibold text-accent-foreground md:text-6xl">
         WELCOME TO CUDDLEKIDS.LB
        </h1>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          Organic cotton, soft knits, honest prices.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <a href="tel:+96171613153" className="inline-block rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground">
            📞 Call Us
          </a>
          <a
            href="https://wa.me/96171613153"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-primary bg-card px-6 py-2 font-semibold text-primary transition hover:bg-muted"
          >
            <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
          </a>
        </div>
      </section>

      <div className="mb-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</span>
          <div className="contents">
          {[{ id: null, name: "All" }, ...categories].map((c) => (
            <button
              key={c.id ?? "all"}
              onClick={() => setCat(c.id)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                cat === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
              }`}
            >
              {c.name}
            </button>
          ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">For</span>
          <div className="contents">
          {GENDERS.map((g) => (
            <button
              key={g.label}
              onClick={() => setGender(g.value)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                gender === g.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
              }`}
            >
              {g.label}
            </button>
          ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Age</span>
          <div className="contents">
          <button
            onClick={() => setAge(null)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              age === null ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
            }`}
          >
            All ages
          </button>
          {AGE_GROUPS.map((a) => (
            <button
              key={a}
              onClick={() => setAge(a)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                age === a ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
              }`}
            >
              {a}
            </button>
          ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="text-muted-foreground">No products yet.</p>
      ) : (
               <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {shown.map((p) => {
            const isSoldOut = p.stock < 1;
            return (
              <Link key={p.id} to="/product/$id" params={{ id: p.id }} className="group text-center">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
                  {p.image_url && (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      loading="lazy"
                      className={`h-full w-full object-cover transition duration-500 ${isSoldOut ? "opacity-60" : "group-hover:scale-105"}`}
                    />
                  )}
                  {isSoldOut && (
                    <span className="absolute top-2 right-2 rounded-full bg-destructive/90 px-2.5 py-1 text-xs font-semibold text-destructive-foreground">
                      Sold out
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-lg">{p.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {p.gender === "unisex" ? "Unisex" : p.gender === "boy" ? "Boy" : "Girl"}
                </p>
                <p className="text-sm font-semibold text-primary">{money(Number(p.price))}</p>
              </Link>
            );
          })}
        </div>

      )}
    </div>
  );
}
