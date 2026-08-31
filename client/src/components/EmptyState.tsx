import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

/**
 * Professional empty state — specific, encouraging copy rather than a bare
 * "No data." (docs/ux-guidelines.md "Empty states"). Used wherever a list
 * or collection is genuinely empty (not an error — see ErrorState for that).
 */
export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      {icon && (
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-graphite-100 text-graphite-400">
          {icon}
        </div>
      )}
      <p className="text-card-title text-foreground">{title}</p>
      {description && <p className="max-w-sm text-supporting text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
