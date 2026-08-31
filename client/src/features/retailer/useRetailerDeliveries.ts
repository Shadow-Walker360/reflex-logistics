import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deliveryService } from "@/services/deliveryService";
import type { DeliveryListParams } from "@/services/deliveryService";
import type { CreateDeliveryInput } from "@/types";

/**
 * Query keys are centralized here (not scattered as string literals across
 * components) so invalidation after a mutation is reliable and greppable.
 */
export const retailerDeliveryKeys = {
  all: ["retailer", "deliveries"] as const,
  list: (params: DeliveryListParams) => [...retailerDeliveryKeys.all, "list", params] as const,
  detail: (id: string) => [...retailerDeliveryKeys.all, "detail", id] as const,
  events: (id: string) => [...retailerDeliveryKeys.all, "events", id] as const,
};

export function useRetailerDeliveries(params: DeliveryListParams) {
  return useQuery({
    queryKey: retailerDeliveryKeys.list(params),
    queryFn: () => deliveryService.list(params),
  });
}

/**
 * Dashboard metric counts. There is no dedicated stats/aggregate endpoint
 * confirmed with the backend (see client/README.md §12), so this reads
 * `totalItems` off the real paginated envelope for a given status filter
 * (pageSize: 1 to keep the payload minimal) rather than fabricating a
 * number. If a stats endpoint is added later, swap the queryFn here —
 * StatCard callers don't need to change.
 */
export function useDeliveryCount(status: DeliveryListParams["status"]) {
  return useQuery({
    queryKey: retailerDeliveryKeys.list({ status, pageSize: 1 }),
    queryFn: () => deliveryService.list({ status, pageSize: 1 }),
    select: (data) => data.totalItems,
  });
}

export function useDelivery(id: string | undefined) {
  return useQuery({
    queryKey: retailerDeliveryKeys.detail(id ?? ""),
    queryFn: () => deliveryService.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useDeliveryEvents(id: string | undefined) {
  return useQuery({
    queryKey: retailerDeliveryKeys.events(id ?? ""),
    queryFn: () => deliveryService.getEvents(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDeliveryInput) => deliveryService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: retailerDeliveryKeys.all });
    },
  });
}
