import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/use-session";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { count } = useCart();
  const { user, isAdmin } = useSession();
  const navigate = useNavigate();
  return (
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="font-display text-2xl font-semibold text-foreground">
          cuddlekids.lb
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          {isAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin">Admin</Link>
            </Button>
          )}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/", replace: true });
              }}
            >
              Sign out
            </Button>
          )}
          <Button asChild size="sm" className="rounded-full">
            <Link to="/cart">
              <ShoppingBag className="h-4 w-4" /> {count}
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
