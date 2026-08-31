import { useState } from "react";
import { Link } from "react-router-dom";
import { DataTable, Pagination, StatusIndicator, ErrorState, PageHeader } from "@/components";
import { DeliveryRowSkeleton } from "@/components/Skeleton";
import { useRetailerDeliveries } from "./useRetailerDeliveries";
import { ApiError, API_ERROR_MESSAGES } from "@/api/errors";
import type { Delivery } from "@/types";

export function DeliveryHistoryPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useRetailerDeliveries({ page, pageSize: 10 });

  return (
    <div>
      <PageHeader title="Delivery history" context="All deliveries you've created" />

      {isLoading && (
        <div className="rounded-lg border border-border bg-surface">
          <DeliveryRowSkeleton />
          <DeliveryRowSkeleton />
          <DeliveryRowSkeleton />
        </div>
      )}

      {isError && (
        <ErrorState
          title="Unable to load delivery history"
          description={
            error instanceof ApiError
              ? API_ERROR_MESSAGES[error.category]
              : "Something went wrong while retrieving your delivery history."
          }
          onRetry={() => refetch()}
        />
      )}

      {data && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <DataTable<Delivery>
            rows={data.items}
            getRowKey={(d) => d.id}
            emptyMessage="No deliveries yet."
            columns={[
              {
                key: "customer",
                header: "Customer",
                render: (d) => (
                  <Link to={`/retailer/track/${d.id}`} className="font-medium text-foreground hover:text-info">
                    {d.customer.name}
                  </Link>
                ),
              },
              { key: "item", header: "Item", render: (d) => d.itemDescription },
              { key: "status", header: "Status", render: (d) => <StatusIndicator status={d.status} /> },
              {
                key: "created",
                header: "Created",
                render: (d) => new Date(d.createdAt).toLocaleDateString(),
              },
            ]}
          />
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
