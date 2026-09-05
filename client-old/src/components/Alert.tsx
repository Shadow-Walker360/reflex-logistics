import type { HTMLAttributes } from "react";

type Tone = "info" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<Tone, string> = {
  info: "bg-teal-50 border-teal-200 text-teal-900",
  success: "bg-olive-50 border-olive-200 text-olive-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  danger: "bg-crimson-50 border-crimson-200 text-crimson-900",
};

// Small glyphs pair with color so tone is never communicated by color
// alone (docs/design-system.md §13 / §11 accessibility principle).
const TONE_ICON: Record<Tone, string> = {
  info: "ⓘ",
  success: "✓",
  warning: "!",
  danger: "✕",
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  title?: string;
}

/** Used for inline error/conflict/offline-stale banners across all roles. */
export function Alert({ tone = "info", title, className = "", children, ...props }: AlertProps) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-body ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    >
      <span aria-hidden="true" className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-caption font-bold">
        {TONE_ICON[tone]}
      </span>
      <div>
        {title && <p className="font-medium">{title}</p>}
        {children}
      </div>
    </div>
  );
}
