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
 * Endpoint paths aligned to FULL_SCALE_DELIVERY_DIRECTIVE.md §8
 * (confirmed 2026-08-29):
 *   POST /deliveries
 *   GET  /deliveries
 *   GET  /deliveries/:id
 *   POST /deliveries/:id/assign
 *   POST /deliveries/:id/status              (was PATCH — directive specifies POST)
 *   POST /deliveries/:id/proof-of-delivery    (was /confirm — renamed to match)
 *   POST /deliveries/:id/incidents            (see riderService.reportIncident)
 *
 * `/deliveries/:id/events` is NOT in the directive's endpoint list —
 * flagged in docs/api-contract.md as needing backend confirmation; kept
 * here since the Timeline UI needs delivery history from somewhere.
 *
 * Payload SHAPES are still frontend proposals, not a confirmed OpenAPI
 * spec — see docs/api-contract.md for the exact request/response shapes
 * this app expects, which is what the backend team should implement
 * against per the directive's §12 instruction.
 *
 * The 409-conflict flow is handled generically by src/api/client.ts +
 * src/api/errors.ts; `assign` here doesn't need special-case conflict
 * logic itself — the caller (see features/dispatcher) reacts to
 * ApiError.category === "CONFLICT".
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

  /** NOT in the directive's endpoint list — see docs/api-contract.md "Open items". */
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
    apiClient.post<Delivery>(`/deliveries/${id}/status`, { status }),

  /** Proof-of-delivery submission — mechanism (OTP/QR/signature/photo) still unconfirmed. */
  confirmDelivery: (id: string, proof: { method: string; value: string }) =>
    apiClient.post<Delivery>(`/deliveries/${id}/proof-of-delivery`, proof),
};
