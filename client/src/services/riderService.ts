import { apiClient } from "@/api/client";
import type { Delivery, Rider } from "@/types";
import type { CreateIncidentInput, Incident } from "@/types";

/**
 * PROVISIONAL. `list` is what the Dispatch Center needs (available riders +
 * workload). `myDeliveries` is what the Rider app's "Assigned Deliveries"
 * screen needs — assumed to be scoped server-side to the authenticated
 * rider (not filtered client-side), consistent with "frontend authorization
 * is UX only" — the backend must actually enforce that this only returns
 * the calling rider's own assignments.
 */
export const riderService = {
  list: () => apiClient.get<Rider[]>("/riders"),

  getById: (id: string) => apiClient.get<Rider>(`/riders/${id}`),

  /** Deliveries assigned to the currently authenticated rider. */
  myDeliveries: () => apiClient.get<Delivery[]>("/riders/me/deliveries"),

  reportIncident: (deliveryId: string, input: CreateIncidentInput) =>
    apiClient.post<Incident>(`/deliveries/${deliveryId}/incidents`, input),
};
