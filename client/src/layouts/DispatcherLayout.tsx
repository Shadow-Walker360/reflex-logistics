import { Outlet, useNavigate } from "react-router-dom";
import { Radar, TriangleAlert, LogOut } from "lucide-react";
import { Navigation, Sidebar, Button, ToastViewport } from "@/components";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAuthStore } from "@/state/authStore";

/**
 * Dispatcher workspace — teal identity accent (docs/design-system.md §8).
 * "Riders" and "Vehicles" are panels inside the Dispatch Center rather
 * than separate routes today — see docs/ux-guidelines.md "Navigation
 * principles" and the README's Backend Dependencies list for why standalone
 * Riders/Vehicles/Deliveries screens aren't in this nav (no route exists
 * for them yet; adding a nav item without a real destination would be a
 * dead link).
 */
const LINKS = [
  { to: "/dispatcher", label: "Dispatch Center", icon: <Radar className="h-full w-full" />, end: true },
  { to: "/dispatcher/incidents", label: "Incidents", icon: <TriangleAlert className="h-full w-full" /> },
];

export function DispatcherLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <Navigation
        title="Reflex — Dispatch"
        accentClassName="bg-teal-600"
        right={
          <>
            <span className="text-supporting text-muted">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Log out
            </Button>
          </>
        }
      />
      <div className="flex min-h-0 flex-1">
        <Sidebar links={LINKS} accentClassName="bg-teal-500" />
        <main className="min-w-0 flex-1 overflow-y-auto p-page-pad">
          <Outlet />
        </main>
      </div>
      <ToastViewport />
    </div>
  );
}
