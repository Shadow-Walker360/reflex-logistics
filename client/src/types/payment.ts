import type { Id, IsoDateTime } from "./common";

export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "RECONCILIATION_REQUIRED";

/**
 * PROVISIONAL. Payment rail is expected to be M-Pesa given the target
 * market, but this is unconfirmed (Section 18 of the frontend spec /
 * README "Backend Dependencies"). `reference` is deliberately generic
 * (not "mpesaReceiptNumber") until the rail is confirmed, so this type
 * doesn't need to change shape once it is.
 */
export interface Payment {
  id: Id;
  deliveryId: Id;
  status: PaymentStatus;
  amount: number;
  currency: "KES" | string;
  reference?: string;
  updatedAt: IsoDateTime;
}
