import type { HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Uses the glass-pearl treatment instead of a flat surface — reserve
   * for auth panels, floating overlays, and a small number of emphasized
   * dashboard cards. Never for dense tables (docs/design-system.md §4). */
  glass?: boolean;
}

export function Card({ className = "", glass = false, ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg p-card-pad transition-shadow duration-150 ${
        glass ? "glass-pearl" : "border border-border bg-surface shadow-pearl-sm"
      } ${className}`}
      {...props}
    />
  );
}
