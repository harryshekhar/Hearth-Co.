import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { USE_PY_API, pyApi, tokenStore } from "@/lib/api";

export type AuthUser = { id: string; email: string | null };

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (USE_PY_API) {
      const load = async () => {
        if (!tokenStore.get()) { setUser(null); setIsAdmin(false); setLoading(false); return; }
        try { const me = await pyApi.me(); setUser({ id: String(me.id), email: me.email }); setIsAdmin(me.is_admin); }
        catch { setUser(null); setIsAdmin(false); }
        setLoading(false);
      };
      void load();
      return tokenStore.subscribe(() => void load());
    }
    const load = async (u: { id: string; email?: string } | null) => {
      setUser(u ? { id: u.id, email: u.email ?? null } : null);
      if (u) {
        const { data } = await supabase.rpc("has_role", { _user_id: u.id, _role: "admin" });
        setIsAdmin(!!data);
      } else setIsAdmin(false);
      setLoading(false);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { void load(s?.user ?? null); });
    supabase.auth.getSession().then(({ data }) => load(data.session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, isAdmin, loading };
}

export async function signOutEverywhere() {
  if (USE_PY_API) tokenStore.set(null);
  else await supabase.auth.signOut();
}
