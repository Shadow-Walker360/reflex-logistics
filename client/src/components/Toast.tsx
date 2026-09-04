import { create } from "zustand";

/**
 * NOTE ON FILE STRUCTURE: an earlier revision split `useToastStore` into
 * its own file purely to satisfy the react-refresh/only-export-components
 * lint rule. That split was reverted alongside the same change in
 * AuthProvider.tsx — see that file's docstring for why (it caused
 * "is not a function" failures specifically under Vitest's SSR transform
 * on Windows). The resulting lint warning here is suppressed with a
 * targeted, legitimate disable comment instead.
 */

type ToastTone = "info" | "success" | "danger";

interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (tone: ToastTone, message: string) => void;
  dismiss: (id: string) => void;
}

/** UI state — ephemeral notifications, not server data. */
// eslint-disable-next-line react-refresh/only-export-components -- see file docstring: intentionally kept alongside ToastViewport rather than split, for stability.
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (tone, message) =>
    set((s) => ({
      toasts: [...s.toasts, { id: crypto.randomUUID(), tone, message }],
    })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

const TONE_CLASSES: Record<ToastTone, string> = {
  info: "bg-graphite-900 text-white",
  success: "bg-olive-700 text-white",
  danger: "bg-crimson-700 text-white",
};

/** Rendered once near the app root; see src/app/App.tsx. */
export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex animate-rise-in items-center gap-3 rounded-md px-3.5 py-2.5 text-body shadow-pearl-lg ${TONE_CLASSES[toast.tone]}`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
            className="text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
