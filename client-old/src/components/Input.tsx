import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  /** Optional control rendered inside the field on the right — e.g. a
   * password show/hide toggle. Kept generic rather than a one-off
   * password-specific prop so any future field can reuse it. */
  endAdornment?: ReactNode;
}

/**
 * Accessible form input. Labels are always visible elements (never
 * placeholder-as-label — docs/design-system.md §9), associated via
 * htmlFor/id; errors wired via aria-describedby + aria-invalid.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className = "", required, disabled, endAdornment, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-supporting font-medium text-foreground">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-danger">
            *
          </span>
        )}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
          className={`w-full rounded-md border bg-surface px-3 py-2 text-body text-foreground placeholder:text-graphite-400 transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:cursor-not-allowed disabled:bg-graphite-50 disabled:text-graphite-400 ${
            endAdornment ? "pr-10" : ""
          } ${error ? "border-danger focus:ring-danger/30 focus:border-danger" : "border-border"} ${className}`}
          {...props}
        />
        {endAdornment && (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{endAdornment}</div>
        )}
      </div>
      {hint && !error && (
        <span id={hintId} className="text-caption text-muted">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} role="alert" className="text-caption font-medium text-danger">
          {error}
        </span>
      )}
    </div>
  );
});
