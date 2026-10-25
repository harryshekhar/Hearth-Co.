import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getProduct } from "@/lib/products.functions";
import { money } from "@/lib/format";
import { USE_PY_API, pyApi } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";

const productQuery = (slug: string) => queryOptions({ queryKey: ["product", slug], queryFn: () => (USE_PY_API ? pyApi.product(slug) : getProduct({ data: { slug } })) });

export const Route = createFileRoute("/product/$slug")({
  ssr: !USE_PY_API,
  loader: async ({ context, params }) => {
    const p = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!p) throw notFound();
    return { name: p.name, description: p.description };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Product"} — Hearth & Co.` },
      { name: "description", content: loaderData?.description ?? "" },
      { property: "og:title", content: `${loaderData?.name ?? "Product"} — Hearth & Co.` },
      { property: "og:description", content: loaderData?.description ?? "" },
    ],
  }),
  notFoundComponent: () => <p className="py-16 text-center">Product not found. <Link to="/" className="underline">Back to shop</Link></p>,
  errorComponent: () => <p className="py-16 text-center">Couldn't load this product.</p>,
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: p } = useSuspenseQuery(productQuery(slug));
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  if (!p) return null;
  const out = p.stock <= 0;

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <img src={p.image_url} alt={p.name} width={816} height={816} className="aspect-square w-full rounded-2xl bg-surface object-cover" />
      <div className="flex flex-col justify-center">
        <Link to="/" search={{ c: p.categories?.slug }} className="text-sm uppercase tracking-wide text-accent">{p.categories?.name}</Link>
        <h1 className="mt-2 text-4xl font-semibold">{p.name}</h1>
        <p className="mt-3 text-2xl font-semibold text-primary">{money(p.price_cents)}</p>
        <p className="mt-6 text-muted-foreground">{p.description}</p>
        <p className="mt-4 text-sm">{out ? "Out of stock" : `${p.stock} in stock`}</p>
        <div className="mt-6 flex items-center gap-3">
          <div className="flex items-center rounded-md border">
            <button className="px-3 py-2" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <span className="w-8 text-center">{qty}</span>
            <button className="px-3 py-2" onClick={() => setQty(Math.min(p.stock, qty + 1))}>+</button>
          </div>
          <Button size="lg" disabled={out} onClick={() => {
            add({ product_id: p.id, slug: p.slug, name: p.name, price_cents: p.price_cents, image_url: p.image_url }, qty);
            toast.success(`${p.name} added to cart`);
          }}>Add to cart</Button>
        </div>
      </div>
    </div>
  );
}
