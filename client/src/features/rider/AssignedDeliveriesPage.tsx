import { Link } from "react-router-dom";
import { PackageCheck, ChevronRight } from "lucide-react";
import { Card, StatusIndicator, Alert, ErrorState, EmptyState } from "@/components";
import { DeliveryRowSkeleton } from "@/components/Skeleton";
import { useMyDeliveries } from "./useRider";
import { ApiError, API_ERROR_MESSAGES } from "@/api/errors";

export function AssignedDeliveriesPage() {
  const { data, isLoading, isError, error, isPlaceholderData, refetch } = useMyDeliveries();

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-section-title text-foreground">Today's deliveries</h1>

      {isPlaceholderData && (
        <Alert tone="warning">Showing last known deliveries — reconnecting…</Alert>
      )}

      {isLoading && !data && (
        <Card className="p-0">
          <DeliveryRowSkeleton />
          <DeliveryRowSkeleton />
        </Card>
      )}

      {isError && !data && (
        <ErrorState
          title="Unable to load your deliveries"
          description={
            error instanceof ApiError
              ? API_ERROR_MESSAGES[error.category]
              : "Something went wrong while retrieving your deliveries."
          }
          onRetry={() => refetch()}
        />
      )}

      {data && data.length === 0 && (
        <EmptyState
          icon={<PackageCheck className="h-5 w-5" />}
          title="You're all clear"
          description="No deliveries are currently assigned to you."
        />
      )}

      <div className="flex flex-col gap-2">
        {data?.map((delivery) => (
          <Link key={delivery.id} to={`/rider/deliveries/${delivery.id}`}>
            <Card className="flex items-center justify-between gap-3 p-3 transition-shadow duration-150 hover:shadow-pearl">
              <div>
                <p className="text-body font-medium text-foreground">{delivery.customer.name}</p>
                <p className="text-supporting text-muted">{delivery.customer.address}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusIndicator status={delivery.status} />
                <ChevronRight className="h-4 w-4 text-graphite-400" aria-hidden="true" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
