import { Navigation, ToastViewport } from "@/components";

/**
 * PLACEHOLDER. Admin roles (SUPPORT_ADMIN, OPERATIONS_ADMIN, SYSTEM_ADMIN)
 * are architectural scaffolding only — no real admin screens are built in
 * this pass. Styled with the wine/graphite identity accent so it reads as
 * an intentional part of the design system rather than an unstyled
 * afterthought, but no nav items are added here (Overview/Users/Tenants/
 * Audit Logs/System) because none of those routes/screens exist yet —
 * see docs/ux-guidelines.md and client/README.md §13 "PLANNED".
 */
export function AdminLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation title="Reflex — Admin (placeholder)" accentClassName="bg-wine-600" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-2 px-page-pad py-10 text-center">
        <span
          aria-hidden="true"
          className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-wine-100 text-premium"
        >
          ⚙
        </span>
        <h1 className="text-card-title text-foreground">Admin console — not yet built</h1>
        <p className="max-w-sm text-supporting text-muted">
          This role currently has routing and access-control scaffolding only. Support, Operations,
          and System admin screens are future work and are not implemented yet.
        </p>
      </main>
      <ToastViewport />
    </div>
  );
}
