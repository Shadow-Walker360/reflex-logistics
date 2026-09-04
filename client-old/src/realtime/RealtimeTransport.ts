/**
 * Realtime abstraction boundary (Section 14 of the frontend spec).
 *
 * Nothing in features/ or pages/ should import socket.io-client (or any
 * transport library) directly. Everything talks to the `RealtimeTransport`
 * interface below, obtained via `getRealtimeTransport()`. That means once
 * the backend confirms Socket.IO vs SSE vs polling, only this file's
 * factory changes — call sites don't.
 *
 * IMPLEMENTED: the interface, the no-op fallback, and the event-name
 * contract below.
 * NOT IMPLEMENTED: a real transport. `VITE_REALTIME_URL` is empty in
 * .env.example on purpose — until it's set AND a concrete adapter (e.g.
 * `socketIoTransport.ts`) is added here, `getRealtimeTransport()` returns
 * the no-op transport, which simply never fires events. Screens that use
 * it must still work correctly with zero realtime events, falling back to
 * whatever polling/refetch-on-focus TanStack Query already does.
 */

export type RealtimeEventName =
  | "delivery.assigned"
  | "delivery.status_changed"
  | "rider.location_updated";

export interface RealtimeEventPayloadMap {
  "delivery.assigned": { deliveryId: string; riderId: string };
  "delivery.status_changed": { deliveryId: string; status: string };
  "rider.location_updated": { riderId: string; lat: number; lng: number };
}

export type ConnectionState = "connected" | "connecting" | "disconnected";

export interface RealtimeTransport {
  connect(): void;
  disconnect(): void;
  getConnectionState(): ConnectionState;
  onConnectionStateChange(listener: (state: ConnectionState) => void): () => void;
  subscribe<E extends RealtimeEventName>(
    event: E,
    handler: (payload: RealtimeEventPayloadMap[E]) => void
  ): () => void; // returns an unsubscribe function
}

/**
 * A transport that does nothing but reports itself as disconnected. This
 * lets every screen that "handles realtime" be built and tested today
 * without pretending a working socket connection exists.
 */
class NoopRealtimeTransport implements RealtimeTransport {
  connect(): void {
    // Intentionally a no-op — see module docstring.
  }
  disconnect(): void {
    // Intentionally a no-op.
  }
  getConnectionState(): ConnectionState {
    return "disconnected";
  }
  onConnectionStateChange(): () => void {
    return () => {};
  }
  subscribe(): () => void {
    return () => {};
  }
}

let transport: RealtimeTransport | null = null;

export function getRealtimeTransport(): RealtimeTransport {
  if (!transport) {
    // NOTE: swap this factory for a real adapter (e.g. Socket.IO) once
    // VITE_REALTIME_URL and the event contract above are confirmed with
    // the backend. See client/README.md "Backend Dependencies".
    transport = new NoopRealtimeTransport();
  }
  return transport;
}
