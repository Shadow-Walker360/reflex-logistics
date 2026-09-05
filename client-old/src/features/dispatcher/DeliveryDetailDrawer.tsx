import { useState } from "react";
import { Drawer, Alert, Button, Select, StatusIndicator, Badge } from "@/components";
import { useDispatcherDelivery, useAvailableRiders, useAssignDelivery } from "./useDispatcher";
import { ApiError, API_ERROR_MESSAGES } from "@/api/errors";
import { isExceptionalStatus } from "@/utils/deliveryStateMachine";

export interface DeliveryDetailDrawerProps {
  deliveryId: string;
  onClose: () => void;
}

/**
 * Assignment UI note (Section 10 / build brief "DISPATCHER"): if/when the
 * backend supplies a recommended rider (e.g. `delivery.recommendedRiderId`,
 * a BACKEND DEPENDENCY not yet in the Delivery type — see README), this
 * component would highlight that option in the Select below. It would
 * never compute or rank that recommendation itself — only display what the
 * backend sends. No scoring logic exists here today because no such field
 * exists in the confirmed contract yet.
 */
export function DeliveryDetailDrawer({ deliveryId, onClose }: DeliveryDetailDrawerProps) {
  const deliveryQuery = useDispatcherDelivery(deliveryId);
  const ridersQuery = useAvailableRiders();
  const assignMutation = useAssignDelivery(deliveryId);
  const [selectedRiderId, setSelectedRiderId] = useState("");

  const delivery = deliveryQuery.data;
  // Assignment is offered for anything not already delivered/cancelled/failed.
  // This is a UX convenience, not a legality check — the backend rejects
  // an illegal assign attempt independently (see useAssignDelivery's 409 handling).
  const canAssign = delivery
    ? !isExceptionalStatus(delivery.status) && delivery.status !== "DELIVERED"
    : false;

  const handleAssign = () => {
    if (!selectedRiderId) return;
    assignMutation.mutate({ riderId: selectedRiderId });
  };

  return (
    <Drawer isOpen title="Delivery detail" onClose={onClose}>
      {deliveryQuery.isLoading && <p className="text-supporting text-muted">Loading delivery…</p>}

      {deliveryQuery.isError && (
        <Alert tone="danger">
          {deliveryQuery.error instanceof ApiError
            ? API_ERROR_MESSAGES[deliveryQuery.error.category]
            : "Couldn't load this delivery."}
        </Alert>
      )}

      {delivery && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-card-title text-foreground">{delivery.customer.name}</h3>
            <StatusIndicator status={delivery.status} />
          </div>
          <p className="text-body text-graphite-600">{delivery.itemDescription}</p>
          <div className="flex flex-wrap gap-2">
            {delivery.priority === "URGENT" && <Badge tone="danger">Urgent</Badge>}
            {delivery.fragile && <Badge tone="warning">Fragile</Badge>}
            {delivery.perishable && <Badge tone="warning">Perishable</Badge>}
            {delivery.declaredValue !== undefined && (
              <Badge tone="info">Value: {delivery.declaredValue}</Badge>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="mb-2 text-caption uppercase tracking-wide text-muted">
              Assign rider
            </h4>

            {assignMutation.isConflict && (
              <Alert tone="warning" className="mb-3">
                This delivery was just updated elsewhere — showing the latest assignment above.
                Please review before trying again.
              </Alert>
            )}
            {assignMutation.isError && !assignMutation.isConflict && (
              <Alert tone="danger" className="mb-3">
                {assignMutation.error instanceof ApiError
                  ? API_ERROR_MESSAGES[assignMutation.error.category]
                  : "Couldn't assign this delivery."}
              </Alert>
            )}

            <Select
              label="Rider"
              value={selectedRiderId}
              onChange={(e) => setSelectedRiderId(e.target.value)}
              options={[
                { value: "", label: "Select a rider…" },
                ...(ridersQuery.data ?? []).map((r) => ({
                  value: r.id,
                  label: `${r.name} — ${r.workloadCount} active · ${r.availability}`,
                })),
              ]}
            />

            <Button
              className="mt-3 w-full"
              disabled={!selectedRiderId || !canAssign}
              isLoading={assignMutation.isPending}
              onClick={handleAssign}
            >
              Assign
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
