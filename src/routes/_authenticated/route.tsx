import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { USE_PY_API, pyApi } from "@/lib/api";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (USE_PY_API) {
      try {
        const me = await pyApi.me();
        return { user: { id: String(me.id), email: me.email } };
      } catch { throw redirect({ to: "/auth" }); }
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: { id: data.user.id, email: data.user.email ?? null } };
  },
  component: () => <Outlet />,
});
