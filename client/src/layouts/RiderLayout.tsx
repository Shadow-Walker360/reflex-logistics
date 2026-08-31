import { Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button, ToastViewport } from "@/components";
import { useAuth } from "@/features/auth/AuthProvider";
import { ConnectionBanner } from "@/features/rider/ConnectionBanner";

/**
 * Rider workspace — amber/olive identity accent (docs/design-system.md
 * §8), mobile-first single-column shell. No persistent bottom nav is
 * added beyond "My Deliveries" (the index route) since Current
 * Delivery/History/Incidents are always reached contextually from a
 * specific delivery, not as standalone destinations — see
 * docs/ux-guidelines.md "Mobile strategy".
 */
export function RiderLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ConnectionBanner />
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <span className="flex items-center gap-2 font-display text-card-title text-foreground">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-500" />
          Reflex — Rider
        </span>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Log out
        </Button>
      </header>
      <main className="flex-1 px-3 py-4">
        <Outlet />
      </main>
      <ToastViewport />
    </div>
  );
}
