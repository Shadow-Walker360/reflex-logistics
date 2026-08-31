import type { DeliveryEvent } from "@/types";
import { DELIVERY_STATUS_LABELS, isExceptionalStatus } from "@/utils/deliveryStateMachine";
import { EmptyState } from "./EmptyState";

export interface TimelineProps {
  events: DeliveryEvent[];
}

/**
 * Renders backend-supplied delivery history only. If `events` is empty,
 * that's rendered as an empty state — this component never invents
 * intermediate steps to make the timeline "look complete" (Section 12 of
 * the frontend spec: "do not fabricate historical events on the frontend").
 */
export function Timeline({ events }: TimelineProps) {
  if (events.length === 0) {
    return <EmptyState title="No delivery history yet" description="Updates will appear here as this delivery progresses." />;
  }

  return (
    <ol className="relative border-l-2 border-border pl-4">
      {events.map((event) => {
        const exceptional = isExceptionalStatus(event.status);
        return (
          <li key={event.id} className="mb-4 last:mb-0">
            <span
              className={`absolute -left-[7px] mt-1 h-3 w-3 rounded-full border-2 border-surface ${
                exceptional ? "bg-danger" : "bg-info"
              }`}
              aria-hidden="true"
            />
            <p className={`text-body font-medium ${exceptional ? "text-crimson-700" : "text-foreground"}`}>
              {DELIVERY_STATUS_LABELS[event.status]}
            </p>
            <time className="text-caption text-muted" dateTime={event.occurredAt}>
              {new Date(event.occurredAt).toLocaleString()}
            </time>
            {event.note && <p className="mt-0.5 text-supporting text-graphite-600">{event.note}</p>}
          </li>
        );
      })}
    </ol>
  );
}
