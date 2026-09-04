import type { Id } from "./common";

export type VehicleType = "MOTORCYCLE" | "BICYCLE" | "VAN" | "TRUCK";

/** PROVISIONAL — capacity unit/precision not yet confirmed with backend. */
export interface Vehicle {
  id: Id;
  type: VehicleType;
  capacityKg?: number;
  available: boolean;
  assignedRiderId?: Id;
}
