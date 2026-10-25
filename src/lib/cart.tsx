import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = { product_id: string; slug: string; name: string; price_cents: number; image_url: string; quantity: number };

type Cart = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const CartCtx = createContext<Cart | null>(null);
const KEY = "shop-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(KEY, JSON.stringify(items)); }, [items, loaded]);

  const value: Cart = {
    items,
    add: (item, qty = 1) => setItems((cur) => {
      const ex = cur.find((i) => i.product_id === item.product_id);
      if (ex) return cur.map((i) => i.product_id === item.product_id ? { ...i, quantity: Math.min(99, i.quantity + qty) } : i);
      return [...cur, { ...item, quantity: qty }];
    }),
    setQty: (id, qty) => setItems((cur) => cur.map((i) => i.product_id === id ? { ...i, quantity: Math.max(1, Math.min(99, qty)) } : i)),
    remove: (id) => setItems((cur) => cur.filter((i) => i.product_id !== id)),
    clear: () => setItems([]),
    count: items.reduce((s, i) => s + i.quantity, 0),
    subtotal: items.reduce((s, i) => s + i.quantity * i.price_cents, 0),
  };
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
