import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deliveryService } from "@/services/deliveryService";
import { riderService } from "@/services/riderService";
import { vehicleService } from "@/services/vehicleService";
import type { DeliveryListParams } from "@/services/deliveryService";
import { ApiError } from "@/api/errors";

export const dispatcherKeys = {
  deliveries: (params: DeliveryListParams) => ["dispatcher", "deliveries", params] as const,
  delivery: (id: string) => ["dispatcher", "delivery", id] as const,
  riders: ["dispatcher", "riders"] as const,
  vehicles: ["dispatcher", "vehicles"] as const,
};

export function useDispatcherDeliveries(params: DeliveryListParams) {
  return useQuery({
    queryKey: dispatcherKeys.deliveries(params),
    queryFn: () => deliveryService.list(params),
    // Dispatcher queue is time-sensitive; poll as an MVP fallback until a
    // confirmed realtime contract replaces this (Section 14 / README).
    refetchInterval: 15_000,
  });
}

export function useDispatcherDelivery(id: string | undefined) {
  return useQuery({
    queryKey: dispatcherKeys.delivery(id ?? ""),
    queryFn: () => deliveryService.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useAvailableRiders() {
  return useQuery({ queryKey: dispatcherKeys.riders, queryFn: riderService.list, refetchInterval: 15_000 });
}

export function useAvailableVehicles() {
  return useQuery({ queryKey: dispatcherKeys.vehicles, queryFn: vehicleService.list });
}

export interface AssignmentConflict {
  deliveryId: string;
}

/**
 * Wraps the assign mutation with the documented 409-conflict flow (Section
 * 15 of the frontend spec / build brief "ERROR HANDLING"):
 *  1. tell the dispatcher the delivery changed
 *  2. refetch authoritative delivery state
 *  3. the caller re-renders with the fresh assignment
 *  4. never treat the mutation as having succeeded
 *
 * The conflict is surfaced via the returned `conflict` state rather than
 * thrown, so the calling component can render the "this changed" banner
 * without needing its own try/catch branching for this specific case.
 */
export function useAssignDelivery(deliveryId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ riderId, vehicleId }: { riderId: string; vehicleId?: string }) =>
      deliveryService.assign(deliveryId, riderId, vehicleId),
    onSuccess: (updated) => {
      queryClient.setQueryData(dispatcherKeys.delivery(deliveryId), updated);
      queryClient.invalidateQueries({ queryKey: dispatcherKeys.riders });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.category === "CONFLICT") {
        // Re-fetch authoritative state — the delivery was assigned
        // elsewhere between this dispatcher loading it and acting on it.
        queryClient.invalidateQueries({ queryKey: dispatcherKeys.delivery(deliveryId) });
      }
    },
  });

  const isConflict = mutation.error instanceof ApiError && mutation.error.category === "CONFLICT";

  return { ...mutation, isConflict };
}
