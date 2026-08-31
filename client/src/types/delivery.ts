import type { Id, IsoDateTime } from "./common";
import type { Customer } from "./customer";

/**
 * Primary delivery state machine (Section 12 of the frontend spec).
 * This UNION exists so the UI can render known states meaningfully; it is
 * NOT used to independently validate whether a transition is legal. Legal
 * next-states come from `Delivery.availableTransitions`, which the backend
 * is expected to supply — see AVAILABLE-TRANSITIONS DEPENDENCY below.
 */
export type DeliveryStatus =
  | "REQUESTED"
  | "ASSIGNED"
  | "ACCEPTED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED"
  | "REASSIGNMENT_REQUIRED";

export const DELIVERY_STATUSES: readonly DeliveryStatus[] = [
  "REQUESTED",
  "ASSIGNED",
  "ACCEPTED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
  "FAILED",
  "REASSIGNMENT_REQUIRED",
];

export type DeliveryPriority = "STANDARD" | "URGENT";

export type PaymentPreference = "CASH_ON_DELIVERY" | "MOBILE_MONEY" | "PREPAID";

/** A single entry in a delivery's history, rendered by the Timeline component. */
export interface DeliveryEvent {
  id: Id;
  deliveryId: Id;
  status: DeliveryStatus;
  occurredAt: IsoDateTime;
  note?: string;
}

/**
 * PROVISIONAL. Required fields (customer, address, item description,
 * quantity) match the documented Create Delivery form (Section 9 of the
 * frontend spec). Everything else is optional per that same section.
 *
 * `availableTransitions` is a BACKEND DEPENDENCY: the contract for "what
 * transitions are legal from here" has not been confirmed. Until the
 * backend supplies it, the UI treats it as possibly absent and does not
 * fabricate a client-side transition table (see
 * src/utils/deliveryStateMachine.ts for how this is guarded).
 */
export interface Delivery {
  id: Id;
  tenantId: Id;
  status: DeliveryStatus;
  /** Present once the backend contract for legal transitions is confirmed. */
  availableTransitions?: DeliveryStatus[];

  customer: Customer;
  itemDescription: string;
  quantity: number;

  itemCategory?: string;
  approxWeightKg?: number;
  fragile?: boolean;
  perishable?: boolean;
  declaredValue?: number;
  priority?: DeliveryPriority;
  paymentPreference?: PaymentPreference;
  specialInstructions?: string;

  assignedRiderId?: Id;
  assignedVehicleId?: Id;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CreateDeliveryInput {
  customer: Customer;
  itemDescription: string;
  quantity: number;
  itemCategory?: string;
  approxWeightKg?: number;
  fragile?: boolean;
  perishable?: boolean;
  declaredValue?: number;
  priority?: DeliveryPriority;
  paymentPreference?: PaymentPreference;
  specialInstructions?: string;
}
