import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { USE_PY_API, pyApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Banknote } from "lucide-react";

const METHODS = [
  { id: "card", label: "Credit / Debit card", note: "Visa, Mastercard, RuPay via Stripe — coming soon", icon: CreditCard, ready: false },
  { id: "cod", label: "Cash on delivery", note: "Pay when your order arrives", icon: Banknote, ready: true },
] as const;

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Hearth & Co." },
      { name: "description", content: "Complete your order." },
      { property: "og:title", content: "Checkout — Hearth & Co." },
      { property: "og:description", content: "Complete your order." },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", address: "", city: "", postal: "" });
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<string>("cod");

  if (items.length === 0) return <p className="py-16 text-center">Your cart is empty. <Link to="/" className="underline">Shop now</Link></p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (USE_PY_API) {
      try {
        const r = await pyApi.checkout(items, f);
        clear();
        if (r.checkout_url) { window.location.href = r.checkout_url; return; }
        toast.success("Order placed!");
        navigate({ to: "/orders" });
      } catch (err) { toast.error(err instanceof Error ? err.message : "Checkout failed"); }
      setBusy(false);
      return;
    }
    const { error } = await supabase.rpc("place_order_v2", {
      _payment_method: method,
      _items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      _name: f.name, _address: f.address, _city: f.city, _postal: f.postal,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    clear();
    toast.success("Order placed!");
    navigate({ to: "/orders" });
  };

  const field = (k: keyof typeof f, label: string) => (
    <div><Label htmlFor={k}>{label}</Label><Input id={k} required maxLength={200} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_320px]">
      <form onSubmit={submit} className="space-y-4">
        <h1 className="text-3xl font-semibold">Shipping details</h1>
        {field("name", "Full name")}
        {field("address", "Address")}
        <div className="grid grid-cols-2 gap-4">{field("city", "City")}{field("postal", "Postal code")}</div>
        <fieldset className="space-y-2 pt-2">
          <legend className="mb-2 text-xl font-semibold">Payment method</legend>
          {METHODS.map((m) => (
            <label key={m.id} className={`flex items-center gap-3 rounded-xl border p-4 ${m.ready ? "cursor-pointer" : "opacity-60"} ${method === m.id ? "border-primary bg-secondary" : "bg-card"}`}>
              <input type="radio" name="pay" value={m.id} disabled={!m.ready} checked={method === m.id} onChange={() => setMethod(m.id)} />
              <m.icon className="size-5 text-primary" />
              <span><span className="block font-medium">{m.label}</span><span className="text-sm text-muted-foreground">{m.note}</span></span>
            </label>
          ))}
        </fieldset>
        <Button type="submit" size="lg" disabled={busy}>{busy ? "Placing order…" : `Place order · ${money(subtotal)}`}</Button>
        
      </form>
      <aside className="h-fit space-y-2 rounded-xl border bg-card p-6">
        {items.map((i) => (
          <div key={i.product_id} className="flex justify-between text-sm"><span>{i.quantity} × {i.name}</span><span>{money(i.price_cents * i.quantity)}</span></div>
        ))}
        <div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{money(subtotal)}</span></div>
      </aside>
    </div>
  );
}
