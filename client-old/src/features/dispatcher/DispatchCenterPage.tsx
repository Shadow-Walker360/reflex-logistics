import { useState } from "react";
import { Users, Truck } from "lucide-react";
import { Card, StatusIndicator, ErrorState, EmptyState, Badge } from "@/components";
import { DeliveryRowSkeleton } from "@/components/Skeleton";
import { MapView } from "@/maps/MapView";
import { useDispatcherDeliveries, useAvailableRiders, useAvailableVehicles } from "./useDispatcher";
import { ApiError, API_ERROR_MESSAGES } from "@/api/errors";
import { DeliveryDetailDrawer } from "./DeliveryDetailDrawer";
import type { DeliveryStatus } from "@/types";

const TABS: { key: DeliveryStatus | "EXCEPTIONS"; label: string }[] = [
  { key: "REQUESTED", label: "Unassigned" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "IN_TRANSIT", label: "In Transit" },
  { key: "EXCEPTIONS", label: "Exceptions" },
];

const EXCEPTION_STATUSES: DeliveryStatus[] = ["FAILED", "REASSIGNMENT_REQUIRED", "CANCELLED"];

export function DispatchCenterPage() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>("REQUESTED");
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);

  const statusFilter = activeTab === "EXCEPTIONS" ? EXCEPTION_STATUSES : activeTab;
  const deliveriesQuery = useDispatcherDeliveries({ status: statusFilter, pageSize: 25 });
  const ridersQuery = useAvailableRiders();
  const vehiclesQuery = useAvailableVehicles();

  return (
    <div className="grid h-full grid-cols-[320px_1fr_280px] gap-4">
      {/* Deliveries column */}
      <Card className="flex flex-col overflow-hidden p-0">
        <div className="flex border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 border-b-2 px-2 py-2.5 text-caption font-semibold transition-colors duration-150 ${
                activeTab === tab.key
                  ? "border-info text-teal-700"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {deliveriesQuery.isLoading && (
            <>
              <DeliveryRowSkeleton />
              <DeliveryRowSkeleton />
              <DeliveryRowSkeleton />
            </>
          )}
          {deliveriesQuery.isError && (
            <div className="p-4">
              <ErrorState
                title="Unable to load deliveries"
                description={
                  deliveriesQuery.error instanceof ApiError
                    ? API_ERROR_MESSAGES[deliveriesQuery.error.category]
                    : "Something went wrong while retrieving the queue."
                }
                onRetry={() => deliveriesQuery.refetch()}
              />
            </div>
          )}
          {deliveriesQuery.data && deliveriesQuery.data.items.length === 0 && (
            <EmptyState title="No deliveries in this queue" />
          )}
          {deliveriesQuery.data?.items.map((delivery) => (
            <button
              key={delivery.id}
              onClick={() => setSelectedDeliveryId(delivery.id)}
              className={`flex w-full flex-col gap-1 border-b border-border/70 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-graphite-50 ${
                selectedDeliveryId === delivery.id ? "bg-teal-50" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-body font-medium text-foreground">{delivery.customer.name}</span>
                {delivery.priority === "URGENT" && <Badge tone="danger">Urgent</Badge>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-supporting text-muted">{delivery.itemDescription}</span>
                <StatusIndicator status={delivery.status} />
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Map column */}
      <Card className="overflow-hidden p-0">
        <MapView
          markers={(ridersQuery.data ?? []).map((r) => ({
            id: r.id,
            lat: r.location?.lat ?? 0,
            lng: r.location?.lng ?? 0,
            kind: "rider",
            label: r.name,
          }))}
        />
      </Card>

      {/* Riders + vehicles column */}
      <div className="flex flex-col gap-4 overflow-y-auto">
        <Card>
          <h2 className="mb-2 flex items-center gap-1.5 text-caption uppercase tracking-wide text-muted">
            <Users className="h-3.5 w-3.5" aria-hidden="true" /> Riders
          </h2>
          {ridersQuery.isLoading && <p className="text-supporting text-graphite-400">Loading…</p>}
          {ridersQuery.data && ridersQuery.data.length === 0 && (
            <p className="text-supporting text-muted">No riders available.</p>
          )}
          <ul className="flex flex-col gap-2">
            {ridersQuery.data?.map((rider) => (
              <li key={rider.id} className="flex items-center justify-between text-body">
                <span className="text-foreground">{rider.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-caption text-graphite-400">{rider.workloadCount} active</span>
                  <Badge tone={rider.availability === "AVAILABLE" ? "success" : "neutral"}>
                    {rider.availability}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-2 flex items-center gap-1.5 text-caption uppercase tracking-wide text-muted">
            <Truck className="h-3.5 w-3.5" aria-hidden="true" /> Vehicles
          </h2>
          {vehiclesQuery.isLoading && <p className="text-supporting text-graphite-400">Loading…</p>}
          <ul className="flex flex-col gap-2">
            {vehiclesQuery.data?.map((vehicle) => (
              <li key={vehicle.id} className="flex items-center justify-between text-body">
                <span className="text-foreground">{vehicle.type}</span>
                <Badge tone={vehicle.available ? "success" : "neutral"}>
                  {vehicle.available ? "Available" : "In use"}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {selectedDeliveryId && (
        <DeliveryDetailDrawer
          deliveryId={selectedDeliveryId}
          onClose={() => setSelectedDeliveryId(null)}
        />
      )}
    </div>
  );
}
