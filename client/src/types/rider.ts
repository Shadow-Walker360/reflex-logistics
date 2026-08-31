import type { Id, IsoDateTime } from "./common";

export type RiderAvailability = "AVAILABLE" | "BUSY" | "OFFLINE";

/**
 * PROVISIONAL. `workloadCount` and `location` are what the Dispatch Center
 * needs to display (Section 10 of the frontend spec) but their exact
 * shape/precision (e.g. live GPS coordinates vs. last-known) is a BACKEND
 * DEPENDENCY pending confirmation — see client/README.md.
 */
export interface Rider {
  id: Id;
  name: string;
  phone: string;
  availability: RiderAvailability;
  /** Count of currently assigned/active deliveries — display only. */
  workloadCount: number;
  vehicleId?: Id;
  location?: {
    lat: number;
    lng: number;
    updatedAt: IsoDateTime;
  };
}
