import { create } from "zustand";

/**
 * Pure UI state ONLY — sidebar visibility, active filters, realtime
 * connection status for display purposes. Nothing here is authoritative
 * delivery/rider/payment data; that always lives in TanStack Query's cache
 * so it stays subject to refetch/invalidation and is never accidentally
 * treated as a second source of truth (see "STATE MANAGEMENT" rule in the
 * build brief and Section 4.5 of the frontend spec).
 */

export type ConnectionStatus = "connected" | "connecting" | "disconnected" | "offline";

interface UiState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;

  dispatcherQueueFilter: "UNASSIGNED" | "ASSIGNED" | "IN_TRANSIT" | "EXCEPTIONS";
  setDispatcherQueueFilter: (filter: UiState["dispatcherQueueFilter"]) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  connectionStatus: "connected",
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  dispatcherQueueFilter: "UNASSIGNED",
  setDispatcherQueueFilter: (filter) => set({ dispatcherQueueFilter: filter }),
}));
