import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/format";
import { USE_PY_API, pyApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { OrderTracker } from "@/components/OrderTracker";
import { TrackingLog } from "@/components/TrackingLog";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "My orders — Hearth & Co." },
      { name: "description", content: "Your order history." },
      { property: "og:title", content: "My orders — Hearth & Co." },
      { property: "og:description", content: "Your order history." },
    ],
  }),
  component: Orders,
});

function Orders() {
  const { user } = Route.useRouteContext();
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders", user.id],
    queryFn: async () => {
      if (USE_PY_API) return pyApi.orders();
      const { data, error } = await supabase.from("orders")
        .select("id, status, total_cents, created_at, order_items(product_name, quantity, unit_price_cents)")
        .eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold">My orders</h1>
      {isLoading ? <p>Loading…</p> : !data?.length ? <p className="text-muted-foreground">No orders yet.</p> : (
        <div className="space-y-4">
          {data.map((o) => (
            <div key={o.id} className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString()}</span>
                <Badge variant="secondary" className="capitalize">{o.status}</Badge>
              </div>
              <OrderTracker status={o.status} createdAt={o.created_at} />
              {!USE_PY_API && <TrackingLog orderId={o.id} />}
              <ul className="mt-3 space-y-1 text-sm">
                {o.order_items.map((it, idx) => <li key={idx}>{it.quantity} × {it.product_name} — {money(it.unit_price_cents * it.quantity)}</li>)}
              </ul>
              <p className="mt-3 font-semibold">Total {money(o.total_cents)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
