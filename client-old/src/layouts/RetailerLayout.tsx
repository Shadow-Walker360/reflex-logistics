import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, PackagePlus, History, LogOut } from "lucide-react";
import { Navigation, Button, ToastViewport } from "@/components";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAuthStore } from "@/state/authStore";

/**
 * Retailer workspace — olive identity accent (docs/design-system.md §8).
 * Nav reflects the real, implemented routes only: Dashboard, Create
 * Delivery, History. Delivery Tracking is reached contextually from a
 * delivery, not as a standalone nav item, since it always needs a
 * specific delivery id.
 */
export function RetailerLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const navItem = (to: string, label: string, icon: React.ReactNode) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-supporting font-medium transition-colors duration-150 ${
          isActive ? "bg-olive-50 text-olive-700" : "text-muted hover:bg-graphite-100 hover:text-foreground"
        }`}
      >
        <span aria-hidden="true" className="h-3.5 w-3.5">
          {icon}
        </span>
        {label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation
        title="Reflex — Retailer"
        accentClassName="bg-olive-600"
        right={
          <>
            <nav className="hidden items-center gap-1 sm:flex">
              {navItem("/retailer", "Dashboard", <LayoutDashboard className="h-full w-full" />)}
              {navItem("/retailer/create", "Create Delivery", <PackagePlus className="h-full w-full" />)}
              {navItem("/retailer/history", "History", <History className="h-full w-full" />)}
            </nav>
            <span className="hidden text-supporting text-muted sm:inline">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Log out
            </Button>
          </>
        }
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-page-pad py-section-gap">
        <Outlet />
      </main>
      <ToastViewport />
    </div>
  );
}
