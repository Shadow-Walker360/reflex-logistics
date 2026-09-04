import type { HTMLAttributes } from "react";

export function Skeleton({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded bg-graphite-100 ${className}`}
      role="presentation"
      aria-hidden="true"
      {...props}
    />
  );
}

/** Shaped skeleton for a delivery list row — matches the real row layout so
 * loading states don't cause layout shift (docs/ux-guidelines.md "Loading"). */
export function DeliveryRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-20 rounded-full" />
    </div>
  );
}

/** Shaped skeleton for a StatCard, so dashboard metrics don't jump on load. */
export function StatCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-card-pad">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}
