import { DataTable, StatusIndicator, ErrorState, PageHeader } from "@/components";
import { DeliveryRowSkeleton } from "@/components/Skeleton";
import { useDispatcherDeliveries } from "./useDispatcher";
import { ApiError, API_ERROR_MESSAGES } from "@/api/errors";
import type { Delivery } from "@/types";

const EXCEPTION_STATUSES: Delivery["status"][] = ["FAILED", "REASSIGNMENT_REQUIRED", "CANCELLED"];

export function IncidentsPage() {
  const { data, isLoading, isError, error, refetch } = useDispatcherDeliveries({
    status: EXCEPTION_STATUSES,
    pageSize: 25,
  });

  return (
    <div>
      <PageHeader title="Incidents & exceptions" context="Deliveries that need dispatcher attention" />

      {isLoading && (
        <div className="rounded-lg border border-border bg-surface">
          <DeliveryRowSkeleton />
          <DeliveryRowSkeleton />
        </div>
      )}

      {isError && (
        <ErrorState
          title="Unable to load incidents"
          description={
            error instanceof ApiError
              ? API_ERROR_MESSAGES[error.category]
              : "Something went wrong while retrieving incidents."
          }
          onRetry={() => refetch()}
        />
      )}

      {data && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <DataTable<Delivery>
            rows={data.items}
            getRowKey={(d) => d.id}
            emptyMessage="No active incidents"
            columns={[
              { key: "customer", header: "Customer", render: (d) => d.customer.name },
              { key: "item", header: "Item", render: (d) => d.itemDescription },
              { key: "status", header: "Status", render: (d) => <StatusIndicator status={d.status} /> },
              {
                key: "updated",
                header: "Last updated",
                render: (d) => new Date(d.updatedAt).toLocaleString(),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
