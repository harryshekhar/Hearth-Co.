// Python FastAPI backend client. Enabled when VITE_API_BASE_URL is set
// (e.g. http://localhost:8000 locally, https://api.yourshop.com when deployed).
// When empty, the store keeps using the built-in cloud database.
export const API_BASE = ((import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "").replace(/\/+$/, "");
export const USE_PY_API = API_BASE.length > 0;

const TOKEN_KEY = "shop-api-token";
const listeners = new Set<() => void>();

export const tokenStore = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string | null) => {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
    listeners.forEach((l) => l());
  },
  subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
};

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const t = tokenStore.get();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  if (init.body && typeof init.body === "string" && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401) tokenStore.set(null);
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { const j = await res.json(); if (j?.detail) msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail); } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

type PyCategory = { id: number; slug: string; name: string };
type PyProduct = { id: number; slug: string; name: string; description: string; price_cents: number; stock: number; image_url: string; category: PyCategory | null };

// Map API products to the shape the storefront already uses.
const toProduct = (p: PyProduct) => ({
  id: String(p.id), slug: p.slug, name: p.name, description: p.description, price_cents: p.price_cents,
  stock: p.stock, image_url: p.image_url, category_id: p.category ? String(p.category.id) : null,
  categories: p.category ? { slug: p.category.slug, name: p.category.name } : null,
});

export const pyApi = {
  catalog: async () => {
    const [products, categories] = await Promise.all([api<PyProduct[]>("/products"), api<PyCategory[]>("/categories")]);
    return { products: products.map(toProduct), categories: categories.map((c) => ({ ...c, id: String(c.id) })) };
  },
  product: async (slug: string) => {
    try { return toProduct(await api<PyProduct>(`/products/${encodeURIComponent(slug)}`)); }
    catch (e) { if (e instanceof Error && e.message.includes("not found")) return null; throw e; }
  },
  login: async (email: string, password: string) => {
    const body = new URLSearchParams({ username: email, password });
    const r = await api<{ access_token: string }>("/auth/login", { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    tokenStore.set(r.access_token);
  },
  signup: async (email: string, password: string) => {
    const r = await api<{ access_token: string }>("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) });
    tokenStore.set(r.access_token);
  },
  me: () => api<{ id: number; email: string; is_admin: boolean }>("/auth/me"),
  checkout: async (items: { product_id: string; quantity: number }[], ship: { name: string; address: string; city: string; postal: string }) => {
    // Replace the server cart with the browser cart, then check out.
    const existing = await api<{ id: number }[]>("/cart");
    for (const it of existing) await api(`/cart/${it.id}`, { method: "DELETE" });
    for (const it of items) await api("/cart", { method: "POST", body: JSON.stringify({ product_id: Number(it.product_id), quantity: it.quantity }) });
    return api<{ order_id: number; checkout_url: string | null }>("/checkout", { method: "POST", body: JSON.stringify(ship) });
  },
  orders: async () => {
    const rows = await api<{ id: number; status: string; total_cents: number; created_at: string; items: { product_name: string; quantity: number; unit_price_cents: number }[] }[]>("/orders");
    return rows.map((o) => ({ id: String(o.id), status: o.status, total_cents: o.total_cents, created_at: o.created_at, order_items: o.items }));
  },
};
