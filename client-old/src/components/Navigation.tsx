import type { ReactNode } from "react";

export interface NavigationProps {
  title: string;
  right?: ReactNode;
  /** Small colored dot next to the title identifying the current
   * workspace/role (docs/design-system.md §8 — "four workspaces inside
   * the same product", not four separate themes). */
  accentClassName?: string;
}

/** Thin top bar shell — role layouts fill `right` with role-specific actions/nav. */
export function Navigation({ title, right, accentClassName }: NavigationProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <span className="flex items-center gap-2 font-display text-card-title tracking-wide text-foreground">
        {accentClassName && (
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${accentClassName}`} />
        )}
        {title}
      </span>
      <div className="flex items-center gap-3">{right}</div>
    </header>
  );
}
