import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, User, LogOut, LayoutDashboard, Package, Truck } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAuth, signOutEverywhere } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { count } = useCart();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await signOutEverywhere();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="font-display text-2xl font-semibold text-primary">Hearth&nbsp;&amp;&nbsp;Co.</Link>
        <nav className="flex items-center gap-1">
          {isAdmin && (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/admin"><LayoutDashboard className="size-4" />Admin</Link></Button>
              <Button asChild variant="ghost" size="sm"><Link to="/delivery"><Truck className="size-4" />Delivery</Link></Button>
            </>
          )}
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/orders"><Package className="size-4" />Orders</Link></Button>
              <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="size-4" />Sign out</Button>
            </>
          ) : (
            <Button asChild variant="ghost" size="sm"><Link to="/auth"><User className="size-4" />Sign in</Link></Button>
          )}
          <Button asChild size="sm" className="ml-1">
            <Link to="/cart"><ShoppingBag className="size-4" />Cart{count > 0 && <span className="rounded-full bg-accent px-1.5 text-xs text-accent-foreground">{count}</span>}</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
