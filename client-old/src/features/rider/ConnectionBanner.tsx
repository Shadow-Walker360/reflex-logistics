import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

/**
 * Tracks browser online/offline state directly (navigator.onLine +
 * online/offline events) — this is distinct from the realtime transport's
 * connection state (src/hooks/useRealtime.ts), which reflects the socket,
 * not general network reachability. The rider app cares about both, but
 * this banner specifically answers "can I reach the network at all,"
 * which matters even before a realtime contract exists.
 *
 * States implemented: OFFLINE (no network) and a brief RECONNECTED
 * confirmation. CONNECTING/RECONNECTING (mid-attempt) states are
 * intentionally not modeled here since there is no live transport to be
 * "connecting" to yet — see src/realtime/RealtimeTransport.ts. A
 * temporary reconnect never renders as an alarming full-danger banner,
 * per docs/ux-guidelines.md "Realtime / connection UI".
 */
export function ConnectionBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      const timeout = setTimeout(() => setJustReconnected(false), 2500);
      return () => clearTimeout(timeout);
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div
        role="status"
        className="flex items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-supporting font-medium text-amber-800"
      >
        <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
        You're offline — actions you take will be saved and sent once you're back online.
      </div>
    );
  }

  if (justReconnected) {
    return (
      <div
        role="status"
        className="flex animate-fade-in items-center justify-center gap-2 border-b border-teal-200 bg-teal-50 px-3 py-2 text-supporting font-medium text-teal-800"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Back online — syncing…
      </div>
    );
  }

  return null;
}
