type Tone = "neutral" | "primary" | "info" | "warning" | "danger" | "premium";

const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-foreground",
  primary: "text-olive-700",
  info: "text-teal-700",
  warning: "text-amber-700",
  danger: "text-crimson-700",
  premium: "text-wine-700",
};

export interface StatCardProps {
  label: string;
  value: string | number;
  tone?: Tone;
  /** Small supporting line under the number — e.g. "+4 since yesterday". */
  caption?: string;
}

/**
 * A single operational metric with deliberate numeric hierarchy
 * (docs/design-system.md §3, §5 — numbers like active-delivery counts get
 * the strongest visual weight on the page). Used in a row/grid on
 * dashboards rather than as one giant card per metric
 * (docs/ux-guidelines.md "Dashboard hierarchy").
 */
export function StatCard({ label, value, tone = "neutral", caption }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-card-pad">
      <span className="text-caption uppercase tracking-wide text-muted">{label}</span>
      <span className={`text-metric-sm sm:text-metric ${TONE_TEXT[tone]}`}>{value}</span>
      {caption && <span className="text-caption text-muted">{caption}</span>}
    </div>
  );
}
