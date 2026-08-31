import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Input, Alert, Card } from "@/components";
import { apiClient } from "@/api/client";
import { ApiError, API_ERROR_MESSAGES } from "@/api/errors";
import type { Delivery } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { riderKeys } from "./useRider";

/**
 * PROVISIONAL — captures an OTP/confirmation code and submits it for
 * backend verification (Section 19 of the frontend spec: the frontend
 * captures input, it does not itself decide a delivery is complete). The
 * exact proof mechanism (OTP vs QR vs signature vs photo) is unconfirmed;
 * OTP-style text entry is used here as the simplest placeholder UI that's
 * easy to swap for a different capture method once decided.
 */
export function ProofOfDeliveryPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!deliveryId || !code) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post<Delivery>(`/deliveries/${deliveryId}/confirm`, {
        method: "OTP",
        value: code,
      });
      queryClient.invalidateQueries({ queryKey: riderKeys.myDeliveries });
      queryClient.invalidateQueries({ queryKey: riderKeys.delivery(deliveryId) });
      navigate(`/rider/deliveries/${deliveryId}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? API_ERROR_MESSAGES[err.category] : "Couldn't confirm delivery.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-section-title text-foreground">Confirm delivery</h1>
      <Card className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <p className="text-body text-muted">
          Ask the customer for their confirmation code and enter it below.
        </p>
        <Input label="Confirmation code" value={code} onChange={(e) => setCode(e.target.value)} required />
        <Button isLoading={isSubmitting} disabled={!code} onClick={handleSubmit}>
          Submit confirmation
        </Button>
      </Card>
    </div>
  );
}
