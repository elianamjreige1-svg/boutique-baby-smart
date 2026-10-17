import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  image: string | null;
  size: string | null;
  quantity: number;
};

type CartCtx = {
  items: CartItem[];
  add: (item: CartItem) => void;
  update: (productId: string, size: string | null, quantity: number) => void;
  remove: (productId: string, size: string | null) => void;
  clear: () => void;
  total: number;
  count: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "little-nest-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, loaded]);

  const same = (a: CartItem, id: string, size: string | null) => a.productId === id && a.size === size;

  const value: CartCtx = {
    items,
    add: (item) =>
      setItems((prev) => {
        const found = prev.find((p) => same(p, item.productId, item.size));
        if (found) return prev.map((p) => (p === found ? { ...p, quantity: p.quantity + item.quantity } : p));
        return [...prev, item];
      }),
    update: (id, size, quantity) =>
      setItems((prev) => prev.map((p) => (same(p, id, size) ? { ...p, quantity: Math.max(1, quantity) } : p))),
    remove: (id, size) => setItems((prev) => prev.filter((p) => !same(p, id, size))),
    clear: () => setItems([]),
    total: items.reduce((s, i) => s + i.price * i.quantity, 0),
    count: items.reduce((s, i) => s + i.quantity, 0),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}

export const money = (n: number) => `$${Number(n).toFixed(2)}`;
