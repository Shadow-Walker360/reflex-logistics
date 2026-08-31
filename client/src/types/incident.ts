import type { Id, IsoDateTime } from "./common";

export type IncidentType =
  | "CUSTOMER_UNREACHABLE"
  | "ADDRESS_NOT_FOUND"
  | "ITEM_DAMAGED"
  | "VEHICLE_ISSUE"
  | "SAFETY_CONCERN"
  | "OTHER";

/** PROVISIONAL — reported by a rider against a delivery (Section 11 / 19). */
export interface Incident {
  id: Id;
  deliveryId: Id;
  reportedByRiderId: Id;
  type: IncidentType;
  notes?: string;
  createdAt: IsoDateTime;
}

export interface CreateIncidentInput {
  type: IncidentType;
  notes?: string;
}
