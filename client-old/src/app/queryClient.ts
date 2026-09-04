import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/errors";

/**
 * Shared defaults. Retries are deliberately conservative: never retry a
 * client error (4xx) since retrying "you sent bad data" or "you're not
 * authorized" wastes a round trip and delays the correct error state from
 * reaching the user — only network/server errors are worth a couple of
 * silent retries.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error instanceof ApiError) {
            const retryable = error.category === "NETWORK_ERROR" || error.category === "SERVER_ERROR";
            return retryable && failureCount < 2;
          }
          return failureCount < 1;
        },
        staleTime: 10_000,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: false, // mutations are never silently retried — a duplicate assign/status-update is worse than a visible failure
      },
    },
  });
}
