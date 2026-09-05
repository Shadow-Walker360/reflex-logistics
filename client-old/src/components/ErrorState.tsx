import { Button } from "./Button";

export interface ErrorStateProps {
  title: string;
  description?: string;
  onRetry?: () => void;
}

/**
 * Consistent "what happened / what you can do" error component
 * (docs/ux-guidelines.md "Error handling"). Distinct from EmptyState —
 * this is for a request that actually failed, not a collection that's
 * legitimately empty. Never shows a raw status code or backend stack
 * trace — the caller is expected to pass copy from API_ERROR_MESSAGES
 * (src/api/errors.ts), not err.message directly.
 */
export function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-crimson-200 bg-crimson-50 px-4 py-8 text-center"
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-crimson-100 text-danger"
      >
        ✕
      </span>
      <p className="text-card-title text-crimson-900">{title}</p>
      {description && <p className="max-w-sm text-supporting text-crimson-700">{description}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      )}
    </div>
  );
}
