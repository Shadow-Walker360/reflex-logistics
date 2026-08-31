import { Link } from "react-router-dom";
import { PackagePlus, PackageSearch } from "lucide-react";
import { Card, Button, StatusIndicator, Alert, PageHeader, StatCard, EmptyState, ErrorState } from "@/components";
import { DeliveryRowSkeleton, StatCardSkeleton } from "@/components/Skeleton";
import { useRetailerDeliveries, useDeliveryCount } from "./useRetailerDeliveries";
import { isExceptionalStatus } from "@/utils/deliveryStateMachine";
import { ApiError, API_ERROR_MESSAGES } from "@/api/errors";

const ACTIVE_STATUSES = ["REQUESTED", "ASSIGNED", "ACCEPTED", "PICKED_UP", "IN_TRANSIT"] as const;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? API_ERROR_MESSAGES[error.category] : fallback;
}

export function RetailerDashboardPage() {
  const activeQuery = useRetailerDeliveries({ status: [...ACTIVE_STATUSES], pageSize: 10 });
  const recentQuery = useRetailerDeliveries({ pageSize: 5 });

  // Real counts from the backend's pagination envelope for each status
  // filter — not a fabricated aggregate (see useDeliveryCount's docstring).
  const assignedCount = useDeliveryCount(["ASSIGNED", "ACCEPTED"]);
  const inTransitCount = useDeliveryCount(["PICKED_UP", "IN_TRANSIT"]);
  const deliveredCount = useDeliveryCount("DELIVERED");

  return (
    <div className="flex flex-col gap-section-gap">
      <PageHeader
        title="Dashboard"
        context="Your retailer workspace"
        actions={
          <Link to="/retailer/create">
            <Button>
              <PackagePlus className="h-4 w-4" aria-hidden="true" />
              New delivery
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {activeQuery.isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard label="Active deliveries" value={activeQuery.data?.totalItems ?? "—"} tone="primary" />
            <StatCard
              label="Assigned"
              value={assignedCount.data ?? "—"}
              tone="neutral"
            />
            <StatCard label="In transit" value={inTransitCount.data ?? "—"} tone="info" />
            <StatCard label="Delivered" value={deliveredCount.data ?? "—"} tone="primary" />
          </>
        )}
      </div>

      <Card>
        <h2 className="mb-3 text-caption uppercase tracking-wide text-muted">Active deliveries</h2>
        {activeQuery.isLoading && (
          <div className="-mx-card-pad flex flex-col">
            <DeliveryRowSkeleton />
            <DeliveryRowSkeleton />
          </div>
        )}
        {activeQuery.isError && (
          <ErrorState
            title="Unable to load deliveries"
            description={errorMessage(activeQuery.error, "Something went wrong while retrieving your deliveries.")}
            onRetry={() => activeQuery.refetch()}
          />
        )}
        {activeQuery.data && activeQuery.data.items.length === 0 && (
          <EmptyState
            icon={<PackageSearch className="h-5 w-5" />}
            title="You have no active deliveries."
            description="Create your first delivery request to start coordinating your logistics."
            action={
              <Link to="/retailer/create">
                <Button size="sm">Create a delivery</Button>
              </Link>
            }
          />
        )}
        {activeQuery.data && activeQuery.data.items.length > 0 && (
          <ul className="flex flex-col divide-y divide-border">
            {activeQuery.data.items.map((delivery) => (
              <li key={delivery.id}>
                <Link
                  to={`/retailer/track/${delivery.id}`}
                  className="flex items-center justify-between rounded-md py-2.5 transition-colors duration-150 hover:bg-graphite-50"
                >
                  <div>
                    <p className="text-body font-medium text-foreground">{delivery.customer.name}</p>
                    <p className="text-supporting text-muted">{delivery.itemDescription}</p>
                  </div>
                  <StatusIndicator status={delivery.status} />
                </Link>
                {isExceptionalStatus(delivery.status) && (
                  <Alert tone="warning" className="mb-2">
                    This delivery needs attention.
                  </Alert>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-caption uppercase tracking-wide text-muted">Recent deliveries</h2>
        {recentQuery.isLoading && (
          <div className="-mx-card-pad flex flex-col">
            <DeliveryRowSkeleton />
          </div>
        )}
        {recentQuery.isError && (
          <ErrorState
            title="Unable to load deliveries"
            description={errorMessage(recentQuery.error, "Something went wrong while retrieving your deliveries.")}
            onRetry={() => recentQuery.refetch()}
          />
        )}
        {recentQuery.data && recentQuery.data.items.length === 0 && (
          <EmptyState title="No recent deliveries yet" description="Deliveries you create will show up here." />
        )}
        {recentQuery.data && recentQuery.data.items.length > 0 && (
          <ul className="flex flex-col divide-y divide-border">
            {recentQuery.data.items.map((delivery) => (
              <li key={delivery.id} className="flex items-center justify-between py-2.5">
                <span className="text-body text-foreground">{delivery.customer.name}</span>
                <StatusIndicator status={delivery.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-caption text-graphite-400">
        Payment status appears per-delivery on the tracking page once the payments contract is
        confirmed (see project README — Backend Dependencies).
      </p>
    </div>
  );
}
