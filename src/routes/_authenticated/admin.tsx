import { Checkbox } from "@/components/ui/checkbox";
import { PHOTO_URL_PREFIX, photoPath, photoToDeleteOnSave } from "@/lib/product-photo";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { optimizeImage, formatBytes, blobToDataUrl, type Optimized } from "@/lib/image-optimize";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useSession } from "@/lib/use-session";
import { money } from "@/lib/cart";
import { useDeliveryFee } from "@/lib/delivery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — cuddlekidslb" },
      { name: "description", content: "Manage products, categories and orders." },
      { property: "og:title", content: "Admin — cuddlekidslb" },
      { property: "og:description", content: "cuddlekidslb admin dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const STATUSES = ["pending", "confirmed", "shipped"];

// Multi-word "contains" search across a row's fields (case-insensitive).
function matches(query: string, fields: Array<string | number | null | undefined>) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = fields.map((v) => (v == null ? "" : String(v))).join(" ").toLowerCase();
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 pl-9 pr-9"
        aria-label={placeholder}
      />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}


function Admin() {
  const { isAdmin, ready } = useSession();
  if (!ready) return <p className="p-12 text-center text-muted-foreground">Loading…</p>;
  if (!isAdmin) return <p className="p-12 text-center">You don't have admin access.</p>;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-4xl font-semibold">Admin</h1>
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
        </TabsList>
        <TabsContent value="orders"><Orders /></TabsContent>
        <TabsContent value="products"><Products /></TabsContent>
        <TabsContent value="categories"><Categories /></TabsContent>
        <TabsContent value="delivery"><Delivery /></TabsContent>
      </Tabs>
    </div>
  );
}

function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });
}

/* ---------------- Products ---------------- */
type Product = Tables<"products">;
const emptyProduct = { name: "", description: "", price: "0", image_url: "", images: [] as string[], category_id: "", active: true, gender: "unisex", ages: [] as string[], qty: {} as Record<string, string> };
const allPhotos = (p: { image_url: string | null; images?: string[] | null }) =>
  p.images?.length ? p.images : p.image_url ? [p.image_url] : [];

const GENDER_OPTIONS = ["unisex", "boy", "girl"];
const AGE_OPTIONS = ["0-3M", "3-6M", "6-9M", "9-12M","12-18M", "18-24M", "2-4Y", "4-6Y", "6-8Y", "8-10Y", "All ages"];

type Pending = { opt: Optimized; preview: string };

function PhotoField({ value, onChange, onBusy }: { value: string; onChange: (url: string) => void; onBusy: (b: boolean) => void }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [state, setState] = useState<"idle" | "working" | "uploading" | "error">("idle");
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    if (pending) URL.revokeObjectURL(pending.preview);
    setPending(null); setState("idle"); setErr(""); onBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const pick = async (file?: File) => {
    if (!file) return;
    if (pending) URL.revokeObjectURL(pending.preview);
    setState("working"); setErr(""); onBusy(true);
    try {
      const opt = await optimizeImage(file);
      setPending({ opt, preview: URL.createObjectURL(opt.blob) });
      setState("idle");
    } catch {
      setPending(null); setState("idle"); onBusy(false);
      toast.error("Could not read this photo");
    }
  };

  const upload = async () => {
    if (!pending) return;
    setState("uploading"); setErr("");
    const ext = pending.opt.type === "image/webp" ? "webp" : pending.opt.type === "image/png" ? "png" : "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, pending.opt.blob, { contentType: pending.opt.type, cacheControl: "31536000" });
    if (!error) {
      onChange(PHOTO_URL_PREFIX + path);
    } else if (/bucket not found/i.test(error.message)) {
      // File storage not available yet: keep the optimized photo inside the product record.
      onChange(await blobToDataUrl(pending.opt.blob));
    } else {
      setState("error"); setErr(error.message); return;
    }
    URL.revokeObjectURL(pending.preview);
    setPending(null); setState("idle"); onBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    toast.success("Photo ready");
  };

  return (
    <div className="space-y-2">
      <Label>Photo</Label>
      {pending ? (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <img src={pending.preview} alt="Optimized preview" className="h-40 w-auto rounded object-contain" />
          <p className="text-xs text-muted-foreground">
            {pending.opt.width}×{pending.opt.height} · {formatBytes(pending.opt.blob.size)} {pending.opt.type === "image/webp" ? "WebP" : pending.opt.type.split("/")[1]?.toUpperCase()} (was {formatBytes(pending.opt.originalBytes)})
          </p>
          {state === "error" && <p className="text-xs text-destructive">Upload failed: {err}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" className="rounded-full" disabled={state === "uploading"} onClick={upload}>
              {state === "uploading" ? "Uploading…" : state === "error" ? "Retry" : "Upload"}
            </Button>
            <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={state === "uploading"} onClick={() => inputRef.current?.click()}>Choose another</Button>
            <Button type="button" size="sm" variant="ghost" disabled={state === "uploading"} onClick={reset}>Cancel</Button>
          </div>
        </div>
      ) : (
        value && <img src={value} alt="" className="h-32 w-28 rounded object-cover" />
      )}
      <Input ref={inputRef} type="file" accept="image/*" className={pending ? "hidden" : ""} onChange={(e) => pick(e.target.files?.[0])} />
      <p className="text-xs text-muted-foreground">{state === "working" ? "Optimizing photo…" : "Tap to choose a photo from your gallery."}</p>
    </div>
  );
}

function Products() {
  const qc = useQueryClient();
  const { data: cats = [] } = useCategories();
  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => (await supabase.from("products").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(emptyProduct);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? "";
  const visible = products.filter((p) =>
    matches(q, [p.name, p.description, p.gender, p.age_group, p.sizes.join(" "), catName(p.category_id)]),
  );


  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };
  const openNew = () => { setEditing(null); setF(emptyProduct); setOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    const ss = (p.size_stock ?? {}) as Record<string, number>;
    const qty: Record<string, string> = {};
    for (const a of AGE_OPTIONS) qty[a] = String(ss[a] ?? 0);
    setF({ name: p.name, description: p.description, price: String(p.price), image_url: p.image_url ?? "", images: allPhotos(p), category_id: p.category_id ?? "", active: p.active, gender: p.gender, ages: p.sizes.length ? p.sizes.filter((s) => AGE_OPTIONS.includes(s)) : [p.age_group], qty });
    setOpen(true);
  };
/*  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.ages.length === 0) { toast.error("Please check at least one age"); return; }*/
    const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.category_id) {
      toast.error("Please select a category");
      return;
    }
    if (f.images.length === 0 && !f.image_url) {
      toast.error("Please upload at least one photo");
      return;
    }
    if (f.ages.length === 0) {
      toast.error("Please check at least one age");
      return;
    }

    const ages = AGE_OPTIONS.filter((a) => f.ages.includes(a));
    const size_stock: Record<string, number> = {};
    for (const a of ages) size_stock[a] = Math.max(0, parseInt(f.qty[a] ?? "0") || 0);
    const main = f.images.includes(f.image_url) ? f.image_url : f.images[0] ?? null;
    const row = {
      name: f.name.trim(),
      description: f.description,
      price: Number(f.price) || 0,
      image_url: main,
      images: main ? [main, ...f.images.filter((u) => u !== main)] : [],
      category_id: f.category_id || null,
      sizes: ages,
      size_stock,
      stock: Object.values(size_stock).reduce((s, n) => s + n, 0),
      active: true,
      gender: f.gender,
      age_group: ages[0] ?? "0-3m",
    };
    const { error } = editing
      ? await supabase.from("products").update(row).eq("id", editing.id)
      : await supabase.from("products").insert(row);
    if (error) { toast.error(error.message); return; }
    if (editing) {
      const before = allPhotos(editing);
      const old = before.filter((u) => !row.images.includes(u)).map(photoPath).filter((x): x is string => !!x);
      if (old.length) await supabase.storage.from("product-images").remove(old);
    }
    toast.success("Product saved");
    setOpen(false);
    refresh();
  };
  const del = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    const photos = allPhotos(p).map(photoPath).filter((x): x is string => !!x);
    if (photos.length) await supabase.storage.from("product-images").remove(photos);
    toast.success("Deleted");
    refresh();
  };

  return (
    <div className="mt-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button onClick={openNew} className="rounded-full sm:w-auto"><Plus className="h-4 w-4" /> New product</Button>
        <div className="flex-1"><SearchBar value={q} onChange={setQ} placeholder="Search products by name, size, age, category…" /></div>
        <p className="text-sm text-muted-foreground">{visible.length} of {products.length}</p>
      </div>
      {visible.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
          {q ? `No products match “${q}”.` : "No products yet."}
        </p>
      ) : (
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
         <thead className="bg-muted text-left">
  <tr>
    <th className="p-3">Product</th>
    <th className="p-3 pr-6">Price</th>
    <th className="p-3 pl-6">Stock</th>
    <th className="p-3" />
  </tr>
</thead>
          <tbody>
            {visible.map((p) => (

              <tr key={p.id} className="border-t border-border">
                <td className="flex items-center gap-3 p-3">
                  <div className="h-12 w-10 overflow-hidden rounded bg-muted">{p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}</div>
                  {p.name}
                </td>
               <td className="p-3 pr-6">{money(Number(p.price))}</td>
                <td className="min-w-[140px] p-3 pl-6 align-top">
                  <div className="font-semibold whitespace-nowrap">Total: {p.stock}</div>
                  {p.sizes.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {p.sizes.map((s) => (
                        <li key={s} className="whitespace-nowrap">
                          <span>{s}: </span>
                          <span className="font-medium text-foreground">{(p.size_stock as Record<string, number>)?.[s] ?? 0}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del(p)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1"><Label>Name</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Description (optional)</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
            <div className="space-y-1"><Label>Price</Label><Input type="number" step="0.01" min="0" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
            {f.images.length > 0 && (
              <div className="space-y-1">
                <Label>Photos (tap "Main" to choose the shop photo)</Label>
                <div className="flex flex-wrap gap-2">
                  {f.images.map((url) => (
                    <div key={url} className={`w-24 rounded-lg border-2 p-1 ${f.image_url === url ? "border-primary" : "border-border"}`}>
                      <img src={url} alt="" className="h-24 w-full rounded object-cover" />
                      <div className="mt-1 flex justify-between text-xs">
                        <button type="button" className={f.image_url === url ? "font-semibold text-primary" : "text-muted-foreground"} onClick={() => setF((cur) => ({ ...cur, image_url: url }))}>
                          {f.image_url === url ? "★ Main" : "Main"}
                        </button>
                        <button type="button" className="text-destructive" onClick={() => setF((cur) => { const images = cur.images.filter((x) => x !== url); return { ...cur, images, image_url: cur.image_url === url ? images[0] ?? "" : cur.image_url }; })}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <PhotoField value="" onChange={(url) => setF((cur) => ({ ...cur, images: [...cur.images, url], image_url: cur.image_url || url }))} onBusy={setBusy} />
            <div className="space-y-1">
              <Label>Category</Label>
              <select required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}>
                <option value="">Select a category</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>For</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}>
                {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Ages and quantity per age</Label>
              <div className="grid grid-cols-2 gap-2">
                {AGE_OPTIONS.map((a) => (
                  <div key={a} className="flex items-center gap-2 text-sm">
                    <label className="flex flex-1 items-center gap-2">
                      <Checkbox
                        checked={f.ages.includes(a)}
                        onCheckedChange={(v) => setF((cur) => ({ ...cur, ages: v ? [...cur.ages, a] : cur.ages.filter((x) => x !== a) }))}
                      />
                      {a}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      className="h-8 w-20"
                      aria-label={`Quantity for ${a}`}
                      disabled={!f.ages.includes(a)}
                      value={f.qty[a] ?? "0"}
                      onChange={(e) => setF((cur) => ({ ...cur, qty: { ...cur.qty, [a]: e.target.value } }))}
                    />
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={busy} className="w-full rounded-full">{busy ? "Finish the photo first…" : "Save"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Categories ---------------- */
function Categories() {
  const qc = useQueryClient();
  const { data: cats = [] } = useCategories();
  const [name, setName] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["categories"] });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const { error } = await supabase.from("categories").insert({ name: name.trim() });
    if (error) { toast.error(error.message); return; }
    setName(""); refresh();
  };
  const rename = async (id: string, current: string) => {
    const n = prompt("New name", current);
    if (!n?.trim()) return;
    const { error } = await supabase.from("categories").update({ name: n.trim() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };
  const del = async (id: string) => {
    if (!confirm("Delete this category? Products will stay but lose the category.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  return (
    <div className="mt-4 max-w-md">
      <form onSubmit={add} className="mb-4 flex gap-2">
        <Input placeholder="New category" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit">Add</Button>
      </form>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {cats.map((c) => (
          <li key={c.id} className="flex items-center justify-between p-3">
            {c.name}
            <span>
              <Button variant="ghost" size="icon" onClick={() => rename(c.id, c.name)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /></Button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Orders ---------------- */
function Orders() {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => (await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false })).data ?? [],
  });
  const [q, setQ] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-orders"] });

  const visible = orders.filter((o) =>
    matches(q, [
      o.id, o.customer_name, o.phone, o.address, o.city, o.notes, o.status,
      o.order_items.map((i) => `${i.product_name} ${i.size ?? ""}`).join(" "),
    ]),
  );


  const setStatus = async (id: string, status: string) => {
    const o = orders.find((x) => x.id === id);
    const now = new Date().toISOString();
    const patch: { status: string; confirmed_at?: string; shipped_at?: string } = { status };
    if (status === "confirmed" && !o?.confirmed_at) patch.confirmed_at = now;
    if (status === "shipped") {
      if (!o?.shipped_at) patch.shipped_at = now;
      if (!o?.confirmed_at) patch.confirmed_at = now;
    }
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status updated"); refresh();
  };
  const del = async (id: string) => {
    if (!confirm("Delete this order?")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1"><SearchBar value={q} onChange={setQ} placeholder="Search orders by name, phone, city, item, status…" /></div>
        <p className="text-sm text-muted-foreground">{visible.length} of {orders.length}</p>
      </div>
      {orders.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">No orders yet.</p>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">No orders match “{q}”.</p>
      ) : null}
      {visible.map((o) => (

        <div key={o.id} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
           <div className="flex w-full items-start justify-between gap-4">
  <p className="min-w-0 flex-1 font-semibold">
    #{o.id.slice(0, 8)} · {o.customer_name}
  </p>

  <Button
  variant="ghost"
  size="icon"
  className="shrink-0"
  aria-label="Delete order"
  onClick={() => del(o.id)}
>
  <Trash2 className="h-4 w-4" />
</Button>
</div>
              <p className="text-sm text-muted-foreground">{o.phone} · {o.address}, {o.city}</p>
              <p className="text-xs text-muted-foreground">Cash on delivery</p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                <li>Pending: {new Date(o.created_at).toLocaleString()}</li>
                {o.confirmed_at && <li>Confirmed: {new Date(o.confirmed_at).toLocaleString()}</li>}
                {o.shipped_at && <li>Shipped: {new Date(o.shipped_at).toLocaleString()}</li>}
              </ul>
              {o.notes && <p className="mt-1 text-sm italic">“{o.notes}”</p>}
            </div>
            <div className="flex items-center gap-2">
              <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
            {o.order_items.map((i) => (
              <li key={i.id} className="flex justify-between">
                <span>{i.quantity} × {i.product_name}{i.size ? ` (${i.size})` : ""}</span>
                <span>{money(Number(i.price) * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-right font-semibold">Total {money(Number(o.total))}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Delivery ---------------- */
function Delivery() {
  const qc = useQueryClient();
  const { data: fee } = useDeliveryFee();
  const [val, setVal] = useState<string | null>(null);
  const shown = val ?? (fee == null ? "" : String(fee));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(shown);
    if (!Number.isFinite(n) || n < 0) { toast.error("Enter a valid amount"); return; }
    const { error } = await supabase.from("store_settings").upsert({ id: 1, delivery_fee: n, updated_at: new Date().toISOString() });
    if (error) { toast.error(error.message); return; }
    toast.success("Delivery fee saved");
    setVal(null);
    qc.invalidateQueries({ queryKey: ["delivery-fee"] });
  };
  return (
    <form onSubmit={save} className="mt-4 max-w-md space-y-3 rounded-2xl border border-border bg-card p-5">
      <Label htmlFor="fee">Delivery fee ($)</Label>
      <Input id="fee" type="number" step="0.01" min="0" value={shown} onChange={(e) => setVal(e.target.value)} />
      <p className="text-xs text-muted-foreground">Added to the customer's total at checkout. Order totals here stay without it.</p>
      <Button type="submit" className="rounded-full">Save</Button>
    </form>
  );
}
