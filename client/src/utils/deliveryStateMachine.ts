import type { Delivery, DeliveryStatus } from "@/types";

/**
 * This module intentionally does NOT contain a hardcoded transition table
 * (e.g. "IN_TRANSIT can go to DELIVERED"). Section 12 of the frontend spec
 * and the build brief are explicit: legal transitions are a backend
 * decision. Until `Delivery.availableTransitions` is a confirmed contract,
 * the UI can only ever ask "does the backend currently say this transition
 * is available for this delivery" — never compute it independently.
 */

/**
 * Returns the transitions the UI is allowed to *offer as actions* for a
 * delivery. If the backend hasn't supplied `availableTransitions` yet
 * (contract not finalized), this returns an empty list rather than
 * guessing — callers should treat that as "read-only until the contract
 * lands," not silently allow every action.
 */
export function getOfferableTransitions(delivery: Delivery): DeliveryStatus[] {
  return delivery.availableTransitions ?? [];
}

export function canTransitionTo(delivery: Delivery, target: DeliveryStatus): boolean {
  return getOfferableTransitions(delivery).includes(target);
}

const EXCEPTIONAL_STATUSES: readonly DeliveryStatus[] = [
  "CANCELLED",
  "FAILED",
  "REASSIGNMENT_REQUIRED",
];

export function isExceptionalStatus(status: DeliveryStatus): boolean {
  return EXCEPTIONAL_STATUSES.includes(status);
}

/** Display label for a status — the one place status copy is defined. */
export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  REQUESTED: "Requested",
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
  REASSIGNMENT_REQUIRED: "Needs reassignment",
};
