import { useParams, Link } from "react-router-dom";
import { Phone, MapPin, TriangleAlert } from "lucide-react";
import { Card, StatusIndicator, Alert, Button, Badge, ErrorState } from "@/components";
import { useRiderDelivery, useUpdateDeliveryStatus } from "./useRider";
import { usePendingActionsForDelivery } from "@/state/pendingActionsStore";
import { ApiError, API_ERROR_MESSAGES } from "@/api/errors";
import type { DeliveryStatus } from "@/types";

/**
 * Which status-advance button to offer next. This is a UX default, not an
 * authoritative transition table (see src/utils/deliveryStateMachine.ts) —
 * if the backend has supplied `availableTransitions`, that always wins;
 * this map is only the fallback shown when it hasn't (current state, since
 * the contract isn't confirmed yet).
 */
const NEXT_STATUS_LABEL: Partial<Record<DeliveryStatus, { next: DeliveryStatus; label: string }>> = {
  ASSIGNED: { next: "ACCEPTED", label: "Accept delivery" },
  ACCEPTED: { next: "PICKED_UP", label: "Mark picked up" },
  PICKED_UP: { next: "IN_TRANSIT", label: "Start delivery" },
};

export function RiderDeliveryDetailsPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const deliveryQuery = useRiderDelivery(deliveryId);
  const updateStatus = useUpdateDeliveryStatus(deliveryId ?? "");
  const pendingActions = usePendingActionsForDelivery(deliveryId ?? "");

  const delivery = deliveryQuery.data;

  if (deliveryQuery.isLoading && !delivery) {
    return <p className="text-supporting text-muted">Loading delivery…</p>;
  }

  if (deliveryQuery.isError && !delivery) {
    return (
      <ErrorState
        title="Unable to load this delivery"
        description={
          deliveryQuery.error instanceof ApiError
            ? API_ERROR_MESSAGES[deliveryQuery.error.category]
            : "Something went wrong."
        }
        onRetry={() => deliveryQuery.refetch()}
      />
    );
  }

  if (!delivery) return null;

  const nextAction = delivery.availableTransitions
    ? NEXT_STATUS_LABEL[delivery.status] &&
      delivery.availableTransitions.includes(NEXT_STATUS_LABEL[delivery.status]!.next)
      ? NEXT_STATUS_LABEL[delivery.status]
      : undefined
    : NEXT_STATUS_LABEL[delivery.status]; // fallback while the transitions contract is unconfirmed

  const hasPending = pendingActions.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-section-title text-foreground">{delivery.customer.name}</h1>
        <StatusIndicator status={delivery.status} />
      </div>

      {hasPending && (
        <Alert tone="warning">
          Your last update hasn't synced yet — it'll be sent automatically once you're back online.
        </Alert>
      )}

      {updateStatus.isError && (
        <Alert tone="danger">
          {updateStatus.error instanceof ApiError
            ? API_ERROR_MESSAGES[updateStatus.error.category]
            : "Couldn't update the status."}
        </Alert>
      )}

      <Card className="flex flex-col gap-2.5">
        <p className="flex items-center gap-2 text-body text-graphite-700">
          <Phone className="h-3.5 w-3.5 text-graphite-400" aria-hidden="true" /> {delivery.customer.phone}
        </p>
        <p className="flex items-center gap-2 text-body text-graphite-700">
          <MapPin className="h-3.5 w-3.5 text-graphite-400" aria-hidden="true" /> {delivery.customer.address}
        </p>
        <p className="text-body font-medium text-foreground">
          {delivery.itemDescription} · qty {delivery.quantity}
        </p>
        <div className="flex flex-wrap gap-2">
          {delivery.fragile && <Badge tone="warning">Fragile</Badge>}
          {delivery.perishable && <Badge tone="warning">Perishable</Badge>}
        </div>
        {delivery.specialInstructions && (
          <p className="text-body italic text-graphite-600">"{delivery.specialInstructions}"</p>
        )}
      </Card>

      {nextAction && (
        <Button
          isLoading={updateStatus.isPending}
          disabled={hasPending}
          onClick={() => updateStatus.mutate(nextAction.next)}
        >
          {nextAction.label}
        </Button>
      )}

      {delivery.status === "IN_TRANSIT" && (
        <Link to={`/rider/deliveries/${delivery.id}/confirm`}>
          <Button className="w-full">Confirm delivery</Button>
        </Link>
      )}

      <Link to={`/rider/deliveries/${delivery.id}/incident`}>
        <Button variant="secondary" className="w-full">
          <TriangleAlert className="h-4 w-4" aria-hidden="true" />
          Report an issue
        </Button>
      </Link>
    </div>
  );
}
