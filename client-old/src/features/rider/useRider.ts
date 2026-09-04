import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { riderService } from "@/services/riderService";
import { deliveryService } from "@/services/deliveryService";
import type { DeliveryStatus } from "@/types";
import { usePendingActionsStore } from "@/state/pendingActionsStore";
import { ApiError } from "@/api/errors";

export const riderKeys = {
  myDeliveries: ["rider", "myDeliveries"] as const,
  delivery: (id: string) => ["rider", "delivery", id] as const,
};

export function useRiderDelivery(id: string | undefined) {
  return useQuery({
    queryKey: riderKeys.delivery(id ?? ""),
    queryFn: () => deliveryService.getById(id as string),
    enabled: Boolean(id),
    placeholderData: (prev) => prev,
  });
}

export function useMyDeliveries() {
  return useQuery({
    queryKey: riderKeys.myDeliveries,
    queryFn: riderService.myDeliveries,
    // Rider app expects unstable connectivity — keep last-known data
    // visible rather than clearing it out on a failed refetch.
    placeholderData: (prev) => prev,
  });
}

/**
 * Status-advance mutation with an offline-aware path (Section 11 / build
 * brief "RIDER"). If the request fails due to a network error (as opposed
 * to a rejection from the backend), the action is recorded as pending
 * rather than silently dropped or falsely marked successful — see
 * usePendingActionsStore and its docstring for the rule this follows.
 *
 * NOTE: this does not yet retry automatically on reconnect — that queue-
 * draining behavior is flagged as a near-term follow-up in the README,
 * since it needs a decision on retry/backoff policy that hasn't been made.
 */
export function useUpdateDeliveryStatus(deliveryId: string) {
  const queryClient = useQueryClient();
  const enqueuePending = usePendingActionsStore((s) => s.enqueue);
  const resolvePending = usePendingActionsStore((s) => s.resolve);

  return useMutation({
    mutationFn: async (status: DeliveryStatus) => {
      try {
        return await deliveryService.updateStatus(deliveryId, status);
      } catch (err) {
        if (err instanceof ApiError && err.category === "NETWORK_ERROR") {
          enqueuePending({ deliveryId, kind: "STATUS_UPDATE" });
        }
        throw err;
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(riderKeys.delivery(deliveryId), updated);
      queryClient.invalidateQueries({ queryKey: riderKeys.myDeliveries });
    },
    onSettled: (_data, error) => {
      if (!error) {
        // Successful sync — nothing pending for this action anymore. In a
        // fuller implementation the enqueue call above would return an id
        // to resolve precisely; for now this clears by delivery on success.
        usePendingActionsStore.getState().actions
          .filter((a) => a.deliveryId === deliveryId)
          .forEach((a) => resolvePending(a.id));
      }
    },
  });
}
