import { apiClient } from "@/api/client";
import type { Vehicle } from "@/types";

/** PROVISIONAL — needed by the Dispatch Center's vehicle panel (Section 10). */
export const vehicleService = {
  list: () => apiClient.get<Vehicle[]>("/vehicles"),
  getById: (id: string) => apiClient.get<Vehicle>(`/vehicles/${id}`),
};
