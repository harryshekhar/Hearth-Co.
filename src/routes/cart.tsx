import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — Hearth & Co." },
      { name: "description", content: "Review the items in your shopping cart." },
      { property: "og:title", content: "Your cart — Hearth & Co." },
      { property: "og:description", content: "Review the items in your shopping cart." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, subtotal } = useCart();
  if (items.length === 0)
    return (
      <div className="py-20 text-center">
        <h1 className="text-3xl font-semibold">Your cart is empty</h1>
        <Button asChild className="mt-6"><Link to="/">Start shopping</Link></Button>
      </div>
    );

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_320px]">
      <div>
        <h1 className="mb-6 text-3xl font-semibold">Cart</h1>
        <ul className="divide-y rounded-xl border bg-card">
          {items.map((i) => (
            <li key={i.product_id} className="flex items-center gap-4 p-4">
              <img src={i.image_url} alt={i.name} className="size-20 rounded-lg bg-surface object-cover" />
              <div className="flex-1">
                <Link to="/product/$slug" params={{ slug: i.slug }} className="font-semibold">{i.name}</Link>
                <p className="text-sm text-muted-foreground">{money(i.price_cents)}</p>
              </div>
              <input type="number" min={1} max={99} value={i.quantity} onChange={(e) => setQty(i.product_id, Number(e.target.value))} className="w-16 rounded-md border bg-background px-2 py-1" />
              <span className="w-20 text-right font-semibold">{money(i.price_cents * i.quantity)}</span>
              <Button variant="ghost" size="icon" onClick={() => remove(i.product_id)} aria-label="Remove"><Trash2 className="size-4" /></Button>
            </li>
          ))}
        </ul>
      </div>
      <aside className="h-fit rounded-xl border bg-card p-6">
        <div className="flex justify-between"><span>Subtotal</span><span className="font-semibold">{money(subtotal)}</span></div>
        <p className="mt-1 text-sm text-muted-foreground">Shipping is free.</p>
        <Button asChild size="lg" className="mt-6 w-full"><Link to="/checkout">Checkout</Link></Button>
      </aside>
    </div>
  );
}
