import { useEffect, useState } from "react";
import { getRealtimeTransport, type ConnectionState, type RealtimeEventName, type RealtimeEventPayloadMap } from "@/realtime/RealtimeTransport";

/** Exposes live connection state for UI indicators (e.g. rider's offline banner). */
export function useRealtimeConnectionState(): ConnectionState {
  const [state, setState] = useState<ConnectionState>(() => getRealtimeTransport().getConnectionState());

  useEffect(() => {
    const t = getRealtimeTransport();
    t.connect();
    const unsubscribe = t.onConnectionStateChange(setState);
    return () => {
      unsubscribe();
    };
  }, []);

  return state;
}

/**
 * Subscribes to a single realtime event for the lifetime of the component.
 * Callers are expected to treat the payload as a hint to refetch
 * authoritative state via TanStack Query, not as data to render directly
 * (Section 14 of the frontend spec) — this hook deliberately does not
 * cache or expose "the last event," only fires the callback.
 */
export function useRealtimeEvent<E extends RealtimeEventName>(
  event: E,
  handler: (payload: RealtimeEventPayloadMap[E]) => void
): void {
  useEffect(() => {
    const t = getRealtimeTransport();
    return t.subscribe(event, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
}
