import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const cols = "id, slug, name, description, price_cents, stock, image_url, category_id, categories(slug, name)";

export const listCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [p, c] = await Promise.all([
    sb.from("products").select(cols).eq("active", true).order("created_at"),
    sb.from("categories").select("id, slug, name").order("name"),
  ]);
  if (p.error) throw new Error(p.error.message);
  if (c.error) throw new Error(c.error.message);
  return { products: p.data, categories: c.data };
});

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await publicClient()
      .from("products").select(cols).eq("slug", data.slug).eq("active", true).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
