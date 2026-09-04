import type { DeliveryStatus } from "@/types";
import { DELIVERY_STATUS_LABELS, isExceptionalStatus } from "@/utils/deliveryStateMachine";

/**
 * Status → color mapping, per the product design brief (docs/design-system.md
 * §11 "Status system"):
 *   REQUESTED    → neutral/teal (not yet acted on)
 *   ASSIGNED     → olive (operational progress begins)
 *   ACCEPTED     → olive (rider has committed)
 *   PICKED_UP    → amber ("yellow" — in-hand, attention-worthy transition)
 *   IN_TRANSIT   → teal (active tracking/realtime)
 *   DELIVERED    → olive (success)
 *   CANCELLED    → muted, paired with crimson-tinted text (muted/crimson)
 *   FAILED       → crimson (danger)
 *   REASSIGNMENT_REQUIRED → crimson (danger — needs dispatcher attention)
 *
 * Color is never the only signal: every dot is paired with a text label,
 * and exceptional statuses additionally get bold text (docs/design-system.md §13).
 */
const STATUS_DOT_CLASSES: Record<DeliveryStatus, string> = {
  REQUESTED: "bg-teal-300",
  ASSIGNED: "bg-olive-500",
  ACCEPTED: "bg-olive-600",
  PICKED_UP: "bg-amber-500",
  IN_TRANSIT: "bg-teal-600",
  DELIVERED: "bg-olive-600",
  CANCELLED: "bg-graphite-400",
  FAILED: "bg-crimson-600",
  REASSIGNMENT_REQUIRED: "bg-crimson-600",
};

const STATUS_TEXT_CLASSES: Record<DeliveryStatus, string> = {
  REQUESTED: "text-graphite-700",
  ASSIGNED: "text-graphite-800",
  ACCEPTED: "text-graphite-800",
  PICKED_UP: "text-graphite-800",
  IN_TRANSIT: "text-graphite-800",
  DELIVERED: "text-olive-700",
  CANCELLED: "text-crimson-700",
  FAILED: "text-crimson-700",
  REASSIGNMENT_REQUIRED: "text-crimson-700",
};

export interface StatusIndicatorProps {
  status: DeliveryStatus;
  className?: string;
}

export function StatusIndicator({ status, className = "" }: StatusIndicatorProps) {
  const exceptional = isExceptionalStatus(status);
  return (
    <span className={`inline-flex items-center gap-1.5 text-status-label ${className}`}>
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_CLASSES[status]}`}
        aria-hidden="true"
      />
      <span className={`${STATUS_TEXT_CLASSES[status]} ${exceptional ? "font-semibold" : "font-medium"}`}>
        {DELIVERY_STATUS_LABELS[status]}
      </span>
    </span>
  );
}
