import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { listCatalog } from "@/lib/products.functions";
import { money } from "@/lib/format";
import { USE_PY_API, pyApi } from "@/lib/api";
import { Input } from "@/components/ui/input";

export const catalogQuery = queryOptions({ queryKey: ["catalog"], queryFn: () => (USE_PY_API ? pyApi.catalog() : listCatalog()) });

export const Route = createFileRoute("/")({
  // The Python API is called from the browser, so skip server rendering in that mode.
  ssr: !USE_PY_API,
  validateSearch: z.object({ c: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Hearth & Co. — Shop electronics, food & clothing" },
      { name: "description", content: "Thoughtfully chosen electronics, pantry staples and everyday clothing, delivered." },
      { property: "og:title", content: "Hearth & Co. — Shop electronics, food & clothing" },
      { property: "og:description", content: "Thoughtfully chosen electronics, pantry staples and everyday clothing." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: Shop,
});

function Shop() {
  const { data } = useSuspenseQuery(catalogQuery);
  const { c } = Route.useSearch();
  const [q, setQ] = useState("");

  const products = useMemo(() => data.products.filter((p) =>
    (!c || p.categories?.slug === c) && p.name.toLowerCase().includes(q.toLowerCase())
  ), [data.products, c, q]);

  return (
    <div>
      <section className="mb-10 rounded-2xl bg-surface px-6 py-12 md:px-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">New season</p>
        <h1 className="mt-2 max-w-2xl text-4xl font-semibold text-primary md:text-6xl">Good things for every corner of home.</h1>
        <p className="mt-4 max-w-lg text-muted-foreground">Gadgets, pantry treats and wardrobe staples — chosen carefully, priced fairly.</p>
      </section>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link to="/" search={{}} className={chip(!c)}>All</Link>
        {data.categories.map((cat) => (
          <Link key={cat.id} to="/" search={{ c: cat.slug }} className={chip(c === cat.slug)}>{cat.name}</Link>
        ))}
        <Input placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} className="ml-auto w-full sm:w-64" />
      </div>

      {products.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">No products found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
          {products.map((p) => (
            <Link key={p.id} to="/product/$slug" params={{ slug: p.slug }} className="group">
              <div className="overflow-hidden rounded-xl bg-surface">
                <img src={p.image_url} alt={p.name} loading="lazy" width={816} height={816} className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="mt-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{p.categories?.name}</p>
                  <h3 className="font-sans font-semibold">{p.name}</h3>
                </div>
                <span className="font-semibold text-primary">{money(p.price_cents)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const chip = (active: boolean) =>
  `rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-secondary"}`;
