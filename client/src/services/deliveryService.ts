import { apiClient } from "@/api/client";
import type {
  CreateDeliveryInput,
  Delivery,
  DeliveryEvent,
  DeliveryStatus,
  PaginatedResponse,
  PaginationParams,
} from "@/types";

/**
 * PROVISIONAL. Paths follow REST conventions for a `deliveries` resource;
 * none of this is confirmed against the actual NestJS backend. In
 * particular:
 *  - `assign` and `confirm` endpoint shapes are guesses pending the
 *    Dispatch assignment and Proof-of-Delivery contracts.
 *  - The 409-conflict flow (Section "ERROR HANDLING" in the build brief)
 *    is handled generically by src/api/client.ts + src/api/errors.ts;
 *    `assign` here doesn't need special-case conflict logic itself, the
 *    caller (see features/dispatcher) reacts to ApiError.category === "CONFLICT".
 */

export interface DeliveryListParams extends PaginationParams {
  status?: DeliveryStatus | DeliveryStatus[];
  search?: string;
}

export const deliveryService = {
  list: (params: DeliveryListParams = {}) =>
    apiClient.get<PaginatedResponse<Delivery>>("/deliveries", {
      query: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        status: Array.isArray(params.status) ? params.status.join(",") : params.status,
      },
    }),

  getById: (id: string) => apiClient.get<Delivery>(`/deliveries/${id}`),

  getEvents: (id: string) => apiClient.get<DeliveryEvent[]>(`/deliveries/${id}/events`),

  create: (input: CreateDeliveryInput) => apiClient.post<Delivery>("/deliveries", input),

  /**
   * Dispatcher assignment action. The backend is expected to return either
   * the updated Delivery (success) or a 409 CONFLICT if it was already
   * assigned elsewhere — see src/features/dispatcher for how the UI
   * reacts to that.
   */
  assign: (id: string, riderId: string, vehicleId?: string) =>
    apiClient.post<Delivery>(`/deliveries/${id}/assign`, { riderId, vehicleId }),

  /** Rider-initiated status advance (e.g. "Picked Up", "In Transit"). */
  updateStatus: (id: string, status: DeliveryStatus) =>
    apiClient.patch<Delivery>(`/deliveries/${id}/status`, { status }),

  /** Proof-of-delivery submission — shape is provisional (Section 19). */
  confirmDelivery: (id: string, proof: { method: string; value: string }) =>
    apiClient.post<Delivery>(`/deliveries/${id}/confirm`, proof),
};
