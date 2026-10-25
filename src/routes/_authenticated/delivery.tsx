import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderTracker } from "@/components/OrderTracker";
import { TrackingLog } from "@/components/TrackingLog";

export const Route = createFileRoute("/_authenticated/delivery")({
  head: () => ({
    meta: [
      { title: "Delivery dashboard — Hearth & Co." },
      { name: "description", content: "Update delivery status and tracking for orders." },
      { property: "og:title", content: "Delivery dashboard — Hearth & Co." },
      { property: "og:description", content: "Update delivery status and tracking for orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Delivery,
});

const STATUSES = [
  { id: "pending", label: "Placed" },
  { id: "paid", label: "Confirmed" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

function Delivery() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("active");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["delivery-orders"],
    enabled: isAdmin,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders")
        .select("id, status, total_cents, created_at, shipping_name, shipping_address, shipping_city, shipping_postal, payment_method")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (loading) return <p>Loading…</p>;
  if (!isAdmin) return <p className="py-16 text-center">You don't have access to this page.</p>;

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked ${STATUSES.find((s) => s.id === status)?.label}`);
    qc.invalidateQueries({ queryKey: ["delivery-orders"] });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const counts = Object.fromEntries(STATUSES.map((s) => [s.id, data?.filter((o) => o.status === s.id).length ?? 0]));
  const term = q.trim().toLowerCase();
  const rows = (data ?? []).filter((o) =>
    (filter === "all" || (filter === "active" ? !["delivered", "cancelled"].includes(o.status) : o.status === filter)) &&
    (!term || o.id.startsWith(term) || o.shipping_name.toLowerCase().includes(term) || o.shipping_city.toLowerCase().includes(term)));

  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold">Delivery dashboard</h1>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {STATUSES.map((s) => (
          <button key={s.id} onClick={() => setFilter(s.id)} className={`rounded-xl border p-4 text-left ${filter === s.id ? "border-primary bg-secondary" : "bg-card"}`}>
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-semibold">{counts[s.id]}</p>
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button size="sm" variant={filter === "active" ? "default" : "outline"} onClick={() => setFilter("active")}>In progress</Button>
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
        <Input placeholder="Search order #, name or city" value={q} onChange={(e) => setQ(e.target.value)} className="ml-auto max-w-xs" />
      </div>
      {rows.length === 0 ? <p className="text-muted-foreground">No orders here.</p> : (
        <div className="space-y-4">
          {rows.map((o) => (
            <div key={o.id} className="rounded-xl border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">#{o.id.slice(0, 8)} · {o.shipping_name} · {money(o.total_cents)}</p>
                  <p className="text-sm text-muted-foreground">{o.shipping_address}, {o.shipping_city} {o.shipping_postal}</p>
                  <p className="text-xs text-muted-foreground uppercase">{o.payment_method} · {new Date(o.created_at).toLocaleString()}</p>
                </div>
              </div>
              <OrderTracker status={o.status} createdAt={o.created_at} />
              <div className="mt-4 flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <Button key={s.id} size="sm" variant={o.status === s.id ? (s.id === "cancelled" ? "destructive" : "default") : "outline"} onClick={() => o.status !== s.id && setStatus(o.id, s.id)}>
                    {s.label}
                  </Button>
                ))}
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setOpen(open === o.id ? null : o.id)}>
                  {open === o.id ? "Hide location updates" : "Location updates"}
                </Button>
              </div>
              {open === o.id && <TrackingLog orderId={o.id} admin />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
