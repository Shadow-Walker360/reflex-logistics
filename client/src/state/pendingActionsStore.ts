import { create } from "zustand";

/**
 * Tracks rider actions (status updates, proof-of-delivery submissions)
 * that couldn't reach the backend yet. This is UI state describing
 * "what's pending," not a cache of authoritative delivery data — once an
 * action succeeds, the corresponding TanStack Query cache entry is what
 * becomes the source of truth, this store just drops the pending marker.
 *
 * Section 11 / "RIDER" of the build brief: "Do not pretend an offline
 * action has successfully reached the backend." Every consumer of this
 * store must render a distinct "pending sync" state, never silently
 * merge a pending action into confirmed delivery state.
 */

export interface PendingAction {
  id: string;
  deliveryId: string;
  kind: "STATUS_UPDATE" | "PROOF_OF_DELIVERY" | "INCIDENT_REPORT";
  createdAt: string;
}

interface PendingActionsState {
  actions: PendingAction[];
  enqueue: (action: Omit<PendingAction, "id" | "createdAt">) => string;
  resolve: (id: string) => void;
}

export const usePendingActionsStore = create<PendingActionsState>((set) => ({
  actions: [],
  enqueue: (action) => {
    const id = crypto.randomUUID();
    set((s) => ({
      actions: [...s.actions, { ...action, id, createdAt: new Date().toISOString() }],
    }));
    return id;
  },
  resolve: (id) => set((s) => ({ actions: s.actions.filter((a) => a.id !== id) })),
}));

export function usePendingActionsForDelivery(deliveryId: string): PendingAction[] {
  return usePendingActionsStore((s) => s.actions.filter((a) => a.deliveryId === deliveryId));
}
