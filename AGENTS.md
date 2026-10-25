# AGENTS
- Catalog reads go through public server fns in src/lib/products.functions.ts (publishable client); writes use browser client under RLS.
- Orders are created only via the place_order SQL function so prices/stock are validated server-side.
- Roles live in user_roles; first signup becomes admin via trigger.
- Storefront talks to the Python FastAPI backend via src/lib/api.ts when VITE_API_BASE_URL is set (browser-only, ssr off); otherwise the built-in cloud database. Keeps the preview working without the Python server.
