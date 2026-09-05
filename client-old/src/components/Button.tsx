import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "icon";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover focus-visible:outline-primary shadow-pearl-sm",
  secondary:
    "bg-surface text-foreground border border-border hover:bg-graphite-50 focus-visible:outline-graphite-500",
  danger: "bg-danger text-white hover:bg-crimson-700 focus-visible:outline-danger shadow-pearl-sm",
  ghost: "bg-transparent text-graphite-700 hover:bg-graphite-100 focus-visible:outline-graphite-500",
  icon: "bg-transparent text-graphite-500 hover:bg-graphite-100 hover:text-foreground focus-visible:outline-graphite-500 !p-2 rounded-full",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
  lg: "px-4 py-2.5 text-base",
};

/**
 * Base button primitive — Primary / Secondary / Danger / Ghost / Icon
 * (docs/design-system.md §7). Genuinely reused across all four role
 * experiences, so it belongs in shared components rather than being
 * duplicated per feature.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", isLoading = false, disabled, className = "", children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${
        variant === "icon" ? "" : SIZE_CLASSES[size]
      } ${className}`}
      {...props}
    >
      {isLoading && (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
});
