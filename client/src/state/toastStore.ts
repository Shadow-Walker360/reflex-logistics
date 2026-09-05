import { create } from "zustand";

/**
 * Split out from src/components/Toast.tsx purely to satisfy the
 * react-refresh/only-export-components lint rule (Toast.tsx was exporting
 * both a component AND this store, which breaks Fast Refresh's ability to
 * distinguish them). No behavior change — this is UI state (ephemeral
 * notifications), not server data.
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

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (tone, message) =>
    set((s) => ({
      toasts: [...s.toasts, { id: crypto.randomUUID(), tone, message }],
    })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
