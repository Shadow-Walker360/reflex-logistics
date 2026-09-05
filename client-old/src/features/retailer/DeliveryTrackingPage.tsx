import { useParams } from "react-router-dom";
import { Card, StatusIndicator, Timeline, ErrorState, Skeleton } from "@/components";
import { MapView } from "@/maps/MapView";
import { useDelivery, useDeliveryEvents, retailerDeliveryKeys } from "./useRetailerDeliveries";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeEvent } from "@/hooks/useRealtime";
import { ApiError, API_ERROR_MESSAGES } from "@/api/errors";

export function DeliveryTrackingPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const queryClient = useQueryClient();
  const deliveryQuery = useDelivery(deliveryId);
  const eventsQuery = useDeliveryEvents(deliveryId);

  // Realtime events are a refetch trigger, never rendered directly
  // (Section 14 of the frontend spec) — this currently no-ops until a
  // transport is wired in (src/realtime/RealtimeTransport.ts), but the
  // integration point is already correct for when it is.
  useRealtimeEvent("delivery.status_changed", (payload) => {
    if (payload.deliveryId === deliveryId) {
      queryClient.invalidateQueries({ queryKey: retailerDeliveryKeys.detail(deliveryId) });
      queryClient.invalidateQueries({ queryKey: retailerDeliveryKeys.events(deliveryId ?? "") });
    }
  });

  if (deliveryQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (deliveryQuery.isError) {
    return (
      <ErrorState
        title="Unable to load this delivery"
        description={
          deliveryQuery.error instanceof ApiError
            ? API_ERROR_MESSAGES[deliveryQuery.error.category]
            : "Something went wrong while loading this delivery."
        }
        onRetry={() => deliveryQuery.refetch()}
      />
    );
  }

  const delivery = deliveryQuery.data;
  if (!delivery) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-section-title text-foreground">Tracking — {delivery.customer.name}</h1>
        <StatusIndicator status={delivery.status} />
      </div>

      <Card className="h-64 overflow-hidden p-0">
        <MapView
          markers={
            delivery.assignedRiderId
              ? [{ id: delivery.assignedRiderId, lat: 0, lng: 0, kind: "rider", label: "Rider" }]
              : []
          }
        />
      </Card>

      <Card>
        <h2 className="mb-3 text-caption uppercase tracking-wide text-muted">Timeline</h2>
        {eventsQuery.isLoading && (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        )}
        {eventsQuery.data && <Timeline events={eventsQuery.data} />}
      </Card>
    </div>
  );
}
