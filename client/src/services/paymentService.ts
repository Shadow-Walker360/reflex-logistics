import { apiClient } from "@/api/client";
import type { Payment } from "@/types";

/**
 * PROVISIONAL — payment rail (expected M-Pesa) and reconciliation flow are
 * unconfirmed (Section 18 of the frontend spec). This only reads payment
 * state; the frontend never marks a delivery as paid locally.
 */
export const paymentService = {
  getForDelivery: (deliveryId: string) =>
    apiClient.get<Payment>(`/deliveries/${deliveryId}/payment`),
};
