import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/cart";
import { useSession } from "@/lib/use-session";

import { matchesAge } from "@/lib/age-filter";

function SortableItem({ id, enabled, children }: { id: string; enabled: boolean; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !enabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined, opacity: isDragging ? 0.8 : 1 }}
      className={enabled ? "cursor-grab touch-manipulation" : undefined}
      {...(enabled ? attributes : {})}
      {...(enabled ? listeners : {})}
    >
      {children}
    </div>
  );
}
type ShopSearchParams = {
  cat?: string | undefined;
  gender?: string | undefined;
  age?: string | undefined;
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): ShopSearchParams => {
    return {
      cat: typeof search["cat"] === "string" ? search["cat"] : undefined,
      gender: typeof search["gender"] === "string" ? search["gender"] : undefined,
      age: typeof search["age"] === "string" ? search["age"] : undefined,
    };
  },
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

/*
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
*/
const GENDERS = [
  { value: null, label: "Everyone" },
  { value: "boy", label: "Boy" },
  { value: "girl", label: "Girl" },
];
const AGE_GROUPS = ["6-9M", "9-12M", "12-18M", "18-24M", "2-4Y", "4-6Y", "6-8Y", "8-10Y"];

function Shop() {
  const search = Route.useSearch();
const navigate = Route.useNavigate();

  
const cat = search.cat ?? null;
const gender = search.gender ?? null;
const age = search.age ?? null;

const setCat = (newCat: string | null) => {
  navigate({
    search: (prev) => ({ ...prev, cat: newCat || undefined }),
    replace: true,
     resetScroll: false,
  });
};

const setGender = (newGender: string | null) => {
  navigate({
    search: (prev) => ({ ...prev, gender: newGender || undefined }),
    replace: true,
     resetScroll: false,
  });
};

const setAge = (newAge: string | null) => {
  navigate({
    search: (prev) => ({ ...prev, age: newAge || undefined }),
    replace: true,
     resetScroll: false,
  });
};

  /*
  const [cat, setCat] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [age, setAge] = useState<string | null>(null);
  */
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
      (await supabase.from("products").select("*").eq("active", true).order("position").order("created_at", { ascending: false })).data ?? [],
  });
  const { isAdmin } = useSession();
  const qc = useQueryClient();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );
  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = shown.map((p) => p.id);
    const moved = arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
    // put the reordered visible products back into the same slots of the full list
    const slots = new Set(ids);
    let k = 0;
    const full = products.map((p) => (slots.has(p.id) ? (moved[k++] ?? p.id) : p.id));
    const byId = new Map(products.map((p) => [p.id, p]));
    qc.setQueryData(["products"], full.map((id) => byId.get(id)!));
    const changes = full
      .map((id, i) => ({ id, position: i + 1 }))
      .filter((c) => byId.get(c.id)!.position !== c.position);
    const results = await Promise.all(
      changes.map((c) => supabase.from("products").update({ position: c.position }).eq("id", c.id)),
    );
    if (results.some((r) => r.error)) toast.error("Couldn't save the new order");
    else toast.success("Order saved");
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const accessoryCategoryIds = new Set(
    categories
      .filter((c) => c.name.toLowerCase().startsWith("accessor"))
      .map((c) => c.id),
  );
  const isAccessory = (categoryId: string | null) => accessoryCategoryIds.has(categoryId ?? "");

  // "All" shows everything: clothes first, accessories always at the end.
  // Within each group the saved order (drag position, newest first) is kept,
  // so a freshly added accessory lands at the top of the accessories block.
  const shown = products
    .filter(
      (p) =>
        (!cat || p.category_id === cat) &&
        (!gender || p.gender === gender || p.gender === "unisex") &&
        matchesAge(age, p.sizes, p.age_group),
    )
    .sort((a, b) => Number(isAccessory(a.category_id)) - Number(isAccessory(b.category_id)));

  
 /* 
  const shown = products.filter(
    (p) =>
      (cat
  ? p.category_id === cat : !accessoryCategoryIds.has(p.category_id ?? "")) &&
     // (!cat || p.category_id === cat) &&
      (!gender || p.gender === gender || p.gender === "unisex") &&
      (!age || p.age_group === age || p.sizes.includes(age) || p.sizes.includes("All ages")),
  );
*/
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
     <section className="mb-12 min-w-0 rounded-3xl bg-accent px-4 py-10 text-center sm:px-8 sm:py-14">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary"></p>
      <h1 className="mx-auto w-full max-w-2xl min-w-0 font-hero text-accent-foreground">
  <span className="relative -top-2 mb-1 block text-lg font-medium tracking-widest text-muted-foreground md:text-2xl">
    WELCOME TO
  </span>
  <span className="block whitespace-nowrap text-[clamp(1.65rem,7.5vw,3.75rem)] font-bold leading-tight">
    CUDDLEKIDS.LB
  </span>
</h1>



        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          Premium Quality at Prices You'll Love !
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={shown.map((p) => p.id)} strategy={rectSortingStrategy}>
        {isAdmin && <p className="mb-3 text-xs text-muted-foreground">Admin: drag products to change their order.</p>}
               <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {shown.map((p) => {
            const isSoldOut = p.stock < 1;
            return (
              <SortableItem key={p.id} id={p.id} enabled={isAdmin}>
              <Link to="/product/$id" params={{ id: p.id }} className="group block text-center" draggable={false}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
                  {p.image_url && (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      loading="lazy"
                      draggable={false}
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
              </SortableItem>
            );
          })}
        </div>
        </SortableContext>
        </DndContext>

      )}
    </div>
  );
}
