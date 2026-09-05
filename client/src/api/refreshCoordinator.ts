/**
 * Breaks the circular dependency between api/client.ts (which needs to
 * trigger a token refresh on 401) and services/authService.ts (which
 * needs api/client.ts to make the refresh call). Neither imports the
 * other directly — authService registers its refresh function here at
 * module load, and client.ts calls it through this indirection.
 *
 * Also ensures only one refresh is ever in flight at a time: if five
 * requests all get a 401 within the same tick, they share one refresh
 * attempt instead of firing five competing (and rotation-breaking)
 * refresh calls.
 */

type RefreshFn = () => Promise<{ accessToken: string; refreshToken: string }>;

let refreshFn: RefreshFn | null = null;
let inFlight: ReturnType<RefreshFn> | null = null;

export function setRefreshHandler(fn: RefreshFn): void {
  refreshFn = fn;
}

export async function performRefresh(): ReturnType<RefreshFn> {
  if (!refreshFn) {
    throw new Error("No refresh handler registered — authService failed to initialize.");
  }
  if (!inFlight) {
    inFlight = refreshFn().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
