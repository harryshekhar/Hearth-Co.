import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrackingLog } from "@/components/TrackingLog";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Hearth & Co." },
      { name: "description", content: "Manage products and orders." },
      { property: "og:title", content: "Admin — Hearth & Co." },
      { property: "og:description", content: "Manage products and orders." },
    ],
  }),
  component: Admin,
});

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"];

function Admin() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <p>Loading…</p>;
  if (!isAdmin) return <p className="py-16 text-center">You don't have access to this page.</p>;
  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold">Admin</h1>
      <Tabs defaultValue="products">
        <TabsList><TabsTrigger value="products">Products</TabsTrigger><TabsTrigger value="orders">Orders</TabsTrigger></TabsList>
        <TabsContent value="products"><ProductsAdmin /></TabsContent>
        <TabsContent value="orders"><OrdersAdmin /></TabsContent>
      </Tabs>
    </div>
  );
}

const empty = { name: "", slug: "", description: "", price: "", stock: "", image_url: "", category_id: "" };

function ProductsAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const { data } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const [p, c] = await Promise.all([
        supabase.from("products").select("*").order("created_at"),
        supabase.from("categories").select("id, name").order("name"),
      ]);
      if (p.error) throw p.error;
      return { products: p.data, categories: c.data ?? [] };
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-products"] }); qc.invalidateQueries({ queryKey: ["catalog"] }); };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("products").insert({
      name: form.name, slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: form.description, price_cents: Math.round(Number(form.price) * 100), stock: Number(form.stock) || 0,
      image_url: form.image_url, category_id: form.category_id || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Product added"); setForm(empty); refresh();
  };

  const update = async (id: string, patch: { price_cents?: number; stock?: number; active?: boolean }) => {
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };

  return (
    <div className="space-y-8 pt-4">
      <form onSubmit={create} className="grid gap-3 rounded-xl border bg-card p-5 md:grid-cols-3">
        <h2 className="text-xl font-semibold md:col-span-3">Add product</h2>
        <Input placeholder="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Price (e.g. 19.99)" required type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <Input placeholder="Stock" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        <Input placeholder="Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        <select className="rounded-md border bg-background px-3 text-sm" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
          <option value="">Category…</option>
          {data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Button type="submit" className="md:col-span-3 md:w-fit">Add product</Button>
      </form>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="p-3">Product</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Visible</th></tr></thead>
          <tbody>
            {data?.products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="flex items-center gap-3 p-3">{p.image_url && <img src={p.image_url} alt="" className="size-10 rounded object-cover" />}{p.name}</td>
                <td className="p-3"><Input className="w-24" type="number" step="0.01" defaultValue={(p.price_cents / 100).toFixed(2)} onBlur={(e) => update(p.id, { price_cents: Math.round(Number(e.target.value) * 100) })} /></td>
                <td className="p-3"><Input className="w-20" type="number" min="0" defaultValue={p.stock} onBlur={(e) => update(p.id, { stock: Number(e.target.value) })} /></td>
                <td className="p-3"><input type="checkbox" checked={p.active} onChange={(e) => update(p.id, { active: e.target.checked })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrdersAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(product_name, quantity)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };
  const revenue = data?.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total_cents, 0) ?? 0;

  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4 md:w-1/2">
        <div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Orders</p><p className="text-2xl font-semibold">{data?.length ?? 0}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Revenue</p><p className="text-2xl font-semibold">{money(revenue)}</p></div>
      </div>
      {data?.map((o) => (
        <div key={o.id} className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">#{o.id.slice(0, 8)} · {o.shipping_name} · {money(o.total_cents)}</p>
            <p className="text-sm text-muted-foreground">{o.order_items.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}</p>
            <p className="text-xs text-muted-foreground">{o.shipping_address}, {o.shipping_city} {o.shipping_postal} · {new Date(o.created_at).toLocaleString()}</p>
          </div>
          <select className="rounded-md border bg-background px-3 py-2 text-sm capitalize" value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-sm font-medium text-primary">Tracking updates</summary>
            <TrackingLog orderId={o.id} admin />
          </details>
        </div>
      ))}
    </div>
  );
}
