import { Checkbox } from "@/components/ui/checkbox";
import { PHOTO_URL_PREFIX, photoPath } from "@/lib/product-photo";
import { deleteProductPhotos } from "@/lib/product-photo.functions";
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
import { cn } from "@/lib/utils";

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
const ORDER_TINT: Record<string, string> = {
  pending: "bg-order-pending border-order-pending-border",
  confirmed: "bg-order-confirmed border-order-confirmed-border",
  shipped: "bg-order-shipped border-order-shipped-border",
};

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
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
        >
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
      <h1 className="mb-6 text-4xl font-semibold">Admin Panel</h1>
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

const emptyProduct = {
  name: "",
  description: "",
  price: "",
  image_url: "",
  images: [] as string[],
  category_id: "",
  active: true,
  gender: "unisex",
  ages: [] as string[],
  qty: {} as Record<string, string>,
};

const allPhotos = (p: { image_url: string | null; images?: string[] | null }) =>
  p.images?.length ? p.images : p.image_url ? [p.image_url] : [];

const GENDER_OPTIONS = ["unisex", "boy", "girl"];

type Pending = { opt: Optimized; preview: string; name: string };

function PhotoField({ value, onChange, onBusy }: { value: string; onChange: (url: string) => void; onBusy: (b: boolean) => void }) {
  const [pending, setPending] = useState<Pending[]>([]);
  const [state, setState] = useState<"idle" | "working" | "uploading" | "error">("idle");
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    pending.forEach((p) => URL.revokeObjectURL(p.preview));
    setPending([]);
    setState("idle");
    setErr("");
    onBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const drop = (target: Pending) => {
    URL.revokeObjectURL(target.preview);
    const left = pending.filter((p) => p !== target);
    setPending(left);
    if (!left.length) {
      setState("idle");
      onBusy(false);
    }
  };

  const pick = async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    setState("working");
    setErr("");
    onBusy(true);
    const next: Pending[] = [];
    let failed = 0;
    for (const file of imgs) {
      try {
        const opt = await optimizeImage(file);
        next.push({ opt, preview: URL.createObjectURL(opt.blob), name: file.name });
      } catch {
        failed += 1;
      }
    }
    if (failed) toast.error(`Could not read ${failed} photo${failed > 1 ? "s" : ""}`);
    if (next.length) setPending((cur) => [...cur, ...next]);
    setState("idle");
    if (!next.length) onBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const upload = async () => {
    if (!pending.length) return;
    setState("uploading");
    setErr("");
    const done: Pending[] = [];
    const left: Pending[] = [];
    let lastErr = "";
    for (const p of pending) {
      const ext = p.opt.type === "image/webp" ? "webp" : p.opt.type === "image/png" ? "png" : "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, p.opt.blob, { contentType: p.opt.type, cacheControl: "31536000" });
      if (!error) {
        onChange(PHOTO_URL_PREFIX + path);
        done.push(p);
      } else if (/bucket not found/i.test(error.message)) {
        onChange(await blobToDataUrl(p.opt.blob));
        done.push(p);
      } else {
        lastErr = error.message;
        left.push(p);
      }
    }
    done.forEach((p) => URL.revokeObjectURL(p.preview));
    if (left.length) {
      setPending(left);
      setState("error");
      setErr(lastErr);
      return;
    }
    setPending([]);
    setState("idle");
    onBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    toast.success(done.length > 1 ? `${done.length} photos ready` : "Photo ready");
  };

  return (
    <div className="space-y-2">
      <Label>Add photos</Label>
      {pending.length ? (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <div className="flex flex-wrap gap-3">
            {pending.map((p) => (
              <div key={p.preview} className="space-y-1">
                <div className="relative">
                  <img src={p.preview} alt="Optimized preview" className="h-24 w-20 rounded object-cover" />
                  {state !== "uploading" && (
                    <button
                      type="button"
                      aria-label={`Remove ${p.name}`}
                      onClick={() => drop(p)}
                      className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-background text-xs text-destructive shadow"
                    >
                      ×
                    </button>
                  )}
                </div>
                <p className="w-20 truncate text-[10px] text-muted-foreground">{formatBytes(p.opt.blob.size)}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {pending.length} photo{pending.length > 1 ? "s" : ""} ready · {formatBytes(pending.reduce((s, p) => s + p.opt.blob.size, 0))} total
          </p>
          {state === "error" && <p className="text-xs text-destructive">Upload failed: {err}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="rounded-full" disabled={state === "uploading"} onClick={upload}>
              {state === "uploading" ? "Uploading…" : state === "error" ? "Retry" : `Upload ${pending.length > 1 ? `${pending.length} photos` : "photo"}`}
            </Button>
            <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={state === "uploading"} onClick={() => inputRef.current?.click()}>
              Add more
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={state === "uploading"} onClick={reset}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        value && <img src={value} alt="" className="h-32 w-28 rounded object-cover" />
      )}
      <Input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className={pending.length ? "hidden" : ""}
        onChange={(e) => {
          pick(Array.from(e.target.files ?? []));
        }}
      />
      <p className="text-xs text-muted-foreground">
        {state === "working" ? "Optimizing photos…" : "Tap to choose one or more photos from your gallery."}
      </p>
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

  // New age range input state
  const [newAge, setNewAge] = useState("");
  const [newQty, setNewQty] = useState("1");

  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? "";
  const visible = products.filter((p) =>
    matches(q, [p.name, p.description, p.gender, p.age_group, p.sizes.join(" "), catName(p.category_id)]),
  );

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const openNew = () => {
    setEditing(null);
    setF(emptyProduct);
    setNewAge("");
    setNewQty("1");
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    const ss = (p.size_stock ?? {}) as Record<string, number>;
    const selected = p.sizes.length ? p.sizes : (p.age_group ? [p.age_group] : []);
    const qty: Record<string, string> = {};
    for (const a of selected) qty[a] = String(ss[a] ?? 0);
    setF({
      name: p.name,
      description: p.description,
      price: String(p.price),
      image_url: p.image_url ?? "",
      images: allPhotos(p),
      category_id: p.category_id ?? "",
      active: p.active,
      gender: p.gender,
      ages: selected,
      qty,
    });
    setNewAge("");
    setNewQty("1");
    setOpen(true);
  };

  const handleAddAge = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    const trimmed = newAge.trim();
    if (!trimmed) {
      toast.error("Please enter an age range");
      return;
    }
    if (f.ages.includes(trimmed)) {
      toast.error("This age range is already added");
      return;
    }
    const qtyVal = String(Math.max(0, parseInt(newQty) || 1));
    setF((cur) => ({
      ...cur,
      ages: [...cur.ages, trimmed],
      qty: { ...cur.qty, [trimmed]: qtyVal },
    }));
    setNewAge("");
    setNewQty("1");
  };

  const handleRemoveAge = (age: string) => {
    setF((cur) => {
      const nextQty = { ...cur.qty };
      delete nextQty[age];
      return {
        ...cur,
        ages: cur.ages.filter((a) => a !== age),
        qty: nextQty,
      };
    });
  };

  const toggleAllAges = (checked: boolean) => {
    setF((cur) => {
      if (checked) {
        return {
          ...cur,
          ages: cur.ages.includes("All ages") ? cur.ages : [...cur.ages, "All ages"],
          qty: { ...cur.qty, "All ages": cur.qty["All ages"] || "1" },
        };
      } else {
        const nextQty = { ...cur.qty };
        delete nextQty["All ages"];
        return {
          ...cur,
          ages: cur.ages.filter((a) => a !== "All ages"),
          qty: nextQty,
        };
      }
    });
  };

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
      toast.error("Please add at least one age range or check 'All ages'");
      return;
    }

    const ages = f.ages;
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
      age_group: ages[0] ?? "All ages",
    };

    const { error } = editing
      ? await supabase.from("products").update(row).eq("id", editing.id)
      : await supabase.from("products").insert(row);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (editing) {
      const before = allPhotos(editing);
      const old = before.filter((u) => !row.images.includes(u)).map(photoPath).filter((x): x is string => !!x);
      if (old.length) await deleteProductPhotos({ data: old });
    }

    toast.success("Product saved");
    setOpen(false);
    refresh();
  };

  const del = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    const photos = allPhotos(p).map(photoPath).filter((x): x is string => !!x);
    if (photos.length) await deleteProductPhotos({ data: photos });
    toast.success("Deleted");
    refresh();
  };

  return (
    <div className="mt-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button onClick={openNew} className="rounded-full sm:w-auto">
          <Plus className="h-4 w-4" /> New product
        </Button>
        <div className="flex-1">
          <SearchBar value={q} onChange={setQ} placeholder="Search products by name, size, age, category…" />
        </div>
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
                    <div className="h-12 w-10 overflow-hidden rounded bg-muted">
                      {p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}
                    </div>
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
                            <span className="font-medium text-foreground">
                              {(p.size_stock as Record<string, number>)?.[s] ?? 0}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => del(p)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Price</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={f.price}
                onChange={(e) => setF({ ...f, price: e.target.value })}
              />
            </div>
            {f.images.length > 0 && (
              <div className="space-y-1">
                <Label>Photos (tap "Main" to choose the shop photo)</Label>
                <div className="flex flex-wrap gap-2">
                  {f.images.map((url) => (
                    <div
                      key={url}
                      className={`w-24 rounded-lg border-2 p-1 ${f.image_url === url ? "border-primary" : "border-border"}`}
                    >
                      <img src={url} alt="" className="h-24 w-full rounded object-cover" />
                      <div className="mt-1 flex justify-between text-xs">
                        <button
                          type="button"
                          className={f.image_url === url ? "font-semibold text-primary" : "text-muted-foreground"}
                          onClick={() => setF((cur) => ({ ...cur, image_url: url }))}
                        >
                          {f.image_url === url ? "★ Main" : "Main"}
                        </button>
                        <button
                          type="button"
                          className="text-destructive"
                          onClick={() =>
                            setF((cur) => {
                              const images = cur.images.filter((x) => x !== url);
                              return {
                                ...cur,
                                images,
                                image_url: cur.image_url === url ? images[0] ?? "" : cur.image_url,
                              };
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <PhotoField
              value=""
              onChange={(url) => setF((cur) => ({ ...cur, images: [...cur.images, url], image_url: cur.image_url || url }))}
              onBusy={setBusy}
            />
            <div className="space-y-1">
              <Label>Category</Label>
              <select
                required
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={f.category_id}
                onChange={(e) => setF({ ...f, category_id: e.target.value })}
              >
                <option value="">Select a category</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>For</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={f.gender}
                onChange={(e) => setF({ ...f, gender: e.target.value })}
              >
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Ages & Quantities */}
            <div className="space-y-3">
              <Label>Ages and quantity</Label>

              {/* "All ages" checkbox */}
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                  <Checkbox
                    checked={f.ages.includes("All ages")}
                    onCheckedChange={(v) => toggleAllAges(Boolean(v))}
                  />
                  All ages
                </label>
                {f.ages.includes("All ages") && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Qty:</span>
                    <Input
                      type="number"
                      min="0"
                      className="h-8 w-20 text-center"
                      value={f.qty["All ages"] ?? "1"}
                      onChange={(e) =>
                        setF((cur) => ({
                          ...cur,
                          qty: { ...cur.qty, "All ages": e.target.value },
                        }))
                      }
                    />
                  </div>
                )}
              </div>

              {/* Add custom age range and quantity */}
              <div className="flex items-end gap-2 pt-1">
                <div className="flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground">Age range</span>
                  <Input
                    placeholder=""
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddAge(e);
                    }}
                  />
                </div>
                <div className="w-24 space-y-1">
                  <span className="text-xs text-muted-foreground">Quantity</span>
                  <Input
                    type="number"
                    min="0"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                  />
                </div>
                <Button type="button" variant="secondary" onClick={handleAddAge}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>

              {/* List of specific added ages */}
              {f.ages.filter((a) => a !== "All ages").length > 0 && (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  {f.ages
                    .filter((a) => a !== "All ages")
                    .map((a) => (
                      <div key={a} className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium">{a}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Qty:</span>
                          <Input
                            type="number"
                            min="0"
                            className="h-8 w-20 text-center"
                            value={f.qty[a] ?? ""}
                            onChange={(e) =>
                              setF((cur) => ({
                                ...cur,
                                qty: { ...cur.qty, [a]: e.target.value },
                              }))
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveAge(a)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <Button type="submit" disabled={busy} className="w-full rounded-full">
              {busy ? "Finish the photo first…" : "Save"}
            </Button>
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
    if (error) {
      toast.error(error.message);
      return;
    }
    setName("");
    refresh();
  };

  const rename = async (id: string, current: string) => {
    const n = prompt("New name", current);
    if (!n?.trim()) return;
    const { error } = await supabase.from("categories").update({ name: n.trim() }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refresh();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this category? Products will stay but lose the category.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
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
              <Button variant="ghost" size="icon" onClick={() => rename(c.id, c.name)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => del(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
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
    queryFn: async () =>
      (
        await supabase
          .from("orders")
          .select("*, order_items(*)")
          .order("created_at", { ascending: false })
      ).data ?? [],
    refetchOnWindowFocus: "always",
    refetchInterval: 15000,
  });

  const [q, setQ] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-orders"] });

  const visible = orders.filter((o) =>
    matches(q, [
      o.id,
      o.customer_name,
      o.phone,
      o.address,
      o.city,
      o.notes,
      o.status,
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
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Status updated");
    refresh();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this order?")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refresh();
  };

//cancel orders
    const cancelOrder = async (o: (typeof orders)[number]) => {
    // 1. Guard against shipped orders
    if (o.status === "shipped") {
      toast.error("Shipped orders cannot be cancelled.");
      return;
    }

    // 2. Confirmation prompt
    if (!confirm("Are you sure you want to cancel this order? This will restore product stock and delete the order.")) {
      return;
    }

    try {
      // 3. Fetch products to restore stock
      const productIds = [...new Set(o.order_items.map((i) => i.product_id))];
      if (productIds.length > 0) {
        const { data: products, error: pErr } = await supabase
          .from("products")
          .select("id, stock, size_stock")
          .in("id", productIds);

        if (pErr) throw new Error("Failed to load products for stock restoration");

        // 4. Restore base stock and size_stock
        for (const item of o.order_items) {
          const product = products?.find((p) => p.id === item.product_id);
          if (!product) continue;

          const updatedStock = product.stock + item.quantity;
          const ss = { ...((product.size_stock ?? {}) as Record<string, number>) };

          if (item.size && item.size in ss) {
            ss[item.size] = (Number(ss[item.size]) || 0) + item.quantity;
          }

          product.stock = updatedStock;
          product.size_stock = ss;

          const { error: upErr } = await supabase
            .from("products")
            .update({ stock: updatedStock, size_stock: ss })
            .eq("id", product.id);

          if (upErr) throw new Error("Failed to restore stock");
        }
      }

      // 5. Delete order (order_items delete automatically via cascade)
      const { error: dErr } = await supabase.from("orders").delete().eq("id", o.id);
      if (dErr) throw dErr;

      toast.success("Order cancelled and stock restored");
      refresh();
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel order");
    }
  };

  
  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchBar value={q} onChange={setQ} placeholder="Search orders by name, phone, city, item, status…" />
        </div>
        <p className="text-sm text-muted-foreground">{visible.length} of {orders.length}</p>
      </div>
      {orders.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">No orders yet.</p>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
          No orders match “{q}”.
        </p>
      ) : null}
      {visible.map((o) => (
        <div key={o.id} className={cn("rounded-2xl border p-5", ORDER_TINT[o.status] ?? "bg-card border-border")}>
          
<div className="flex items-center justify-between -mt-2">

  {/* Left: Order ID */}
  <p className="font-semibold truncate">
    #{o.id.slice(0, 8)}
  </p>

  {/* Right: Cancel Button */}
  {o.status !== "shipped" && (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-destructive"
      onClick={() => cancelOrder(o)}
    >
      Cancel
      <X className="h-4 w-4 ml-1" />
    </Button>
  )}

  {/* Right: Delete Button (shipped orders only) */}
  {o.status === "shipped" && (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-destructive"
      aria-label="Delete order"
      onClick={() => del(o.id)}
    >Delete
      <Trash2 className="h-4 w-4 ml-1" />
    </Button>
  )}

</div>



          
          <p className="mt-2 font-semibold break-words">{o.customer_name}</p>
          <p className="text-sm text-muted-foreground break-words">{o.phone} · {o.address}, {o.city}</p>
          <p className="text-xs text-muted-foreground">Cash on delivery</p>
          {o.notes && <p className="text-sm italic break-words">“{o.notes}”</p>}
          <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            <li>Pending: {new Date(o.created_at).toLocaleString()}</li>
            {o.confirmed_at && <li>Confirmed: {new Date(o.confirmed_at).toLocaleString()}</li>}
            {o.shipped_at && <li>Shipped: {new Date(o.shipped_at).toLocaleString()}</li>}
          </ul>
          <div className="mt-3">
            <select
              className="h-9 w-full max-w-xs rounded-md border border-input bg-background px-2 text-sm"
              value={o.status}
              onChange={(e) => setStatus(o.id, e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
    {s.charAt(0).toUpperCase() + s.slice(1)}
  </option>
              ))}
            </select>
          </div>
          <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
            {o.order_items.map((i) => (
              <li key={i.id} className="flex justify-between">
                <span>
                  {i.quantity} × {i.product_name}
                  {i.size ? ` (${i.size})` : ""}
                </span>
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
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const { error } = await supabase
      .from("store_settings")
      .upsert({ id: 1, delivery_fee: n, updated_at: new Date().toISOString() });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Delivery fee saved");
    setVal(null);
    qc.invalidateQueries({ queryKey: ["delivery-fee"] });
  };

  return (
    <form onSubmit={save} className="mt-4 max-w-md space-y-3 rounded-2xl border border-border bg-card p-5">
      <Label htmlFor="fee">Delivery fee ($)</Label>
      <Input id="fee" type="number" step="0.01" min="0" value={shown} onChange={(e) => setVal(e.target.value)} />
      <p className="text-xs text-muted-foreground">
        Added to the customer's total at checkout. Order totals here stay without it.
      </p>
      <Button type="submit" className="rounded-full">Save</Button>
    </form>
  );
}
