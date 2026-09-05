import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  /** Context line under the title — workspace, date, subtitle. */
  context?: string;
  actions?: ReactNode;
}

/** Standard page-level header — title + context + primary actions, used at
 * the top of every dashboard/list/detail page (docs/ux-guidelines.md
 * "Dashboard hierarchy": Header → context → metrics → activity). */
export function PageHeader({ title, context, actions }: PageHeaderProps) {
  return (
    <div className="mb-section-gap flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-page-title text-foreground">{title}</h1>
        {context && <p className="mt-1 text-supporting text-muted">{context}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
