import { useParams, Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Card, StatusIndicator, ErrorState, Button, Skeleton } from "@/components";
import { useDelivery } from "./useRetailerDeliveries";
import { ApiError, API_ERROR_MESSAGES } from "@/api/errors";

export function DeliveryConfirmationPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const { data: delivery, isLoading, isError, error, refetch } = useDelivery(deliveryId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="flex flex-col gap-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-10 w-full" />
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-lg">
        <ErrorState
          title="Unable to load this delivery"
          description={error instanceof ApiError ? API_ERROR_MESSAGES[error.category] : "Something went wrong."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!delivery) return null;

  return (
    <div className="mx-auto max-w-lg">
      <Card glass className="text-center">
        <span
          aria-hidden="true"
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-olive-100 text-olive-600"
        >
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h1 className="text-page-title text-foreground">Delivery submitted</h1>
        <p className="mt-1 text-supporting text-muted">Reference: {delivery.id}</p>

        <div className="mt-5 flex flex-col divide-y divide-border rounded-md border border-border bg-surface text-left">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-supporting text-muted">Status</span>
            <StatusIndicator status={delivery.status} />
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-supporting text-muted">Customer</span>
            <span className="text-body text-foreground">{delivery.customer.name}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-supporting text-muted">Item</span>
            <span className="text-body text-foreground">{delivery.itemDescription}</span>
          </div>
        </div>

        <Link to={`/retailer/track/${delivery.id}`}>
          <Button className="mt-6 w-full">Track this delivery</Button>
        </Link>
      </Card>
    </div>
  );
}
