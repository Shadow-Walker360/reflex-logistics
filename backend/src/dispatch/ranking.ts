/**
 * Spec reference: Section 18 (Dispatch Engine - eligibility vs ranking).
 *
 * "Ranking" here is deliberately minimal: workload only (fewest currently
 * active deliveries wins). Distance/ETA-based ranking is explicitly
 * FUTURE per docs/dispatch.md, since it requires a RoutingService (spec
 * Section 22) that does not exist - this codebase has no lat/lng
 * coordinates for pickup/dropoff at all (Delivery.pickupAddress/
 * dropoffAddress are plain strings, an MVP simplification noted in
 * schema.prisma). Workload is the one ranking signal available from data
 * this system already has.
 *
 * Pulled into a standalone pure function (no Prisma/NestJS dependency),
 * same pattern as every other ranking/eligibility rule in this codebase
 * (vehicle-eligibility.ts, delivery-state-machine.ts) - independently
 * unit-testable, and kept structurally separate from eligibility
 * (VehiclesService.isEligible) per the spec's own explicit split: this
 * function assumes its input is ALREADY an eligible-candidates list, it
 * never re-checks eligibility itself.
 */
export interface RankableCandidate {
  riderId: string;
  activeDeliveryCount: number;
}

/**
 * Returns candidates sorted by ascending workload (fewest active
 * deliveries first = ranked best). Ties are broken by riderId for
 * deterministic, stable output - not a meaningful ranking signal on its
 * own, just avoids the ranking silently reordering between calls when
 * workload is tied.
 */
export function rankCandidates(
  candidates: RankableCandidate[],
): RankableCandidate[] {
  return [...candidates].sort((a, b) => {
    if (a.activeDeliveryCount !== b.activeDeliveryCount) {
      return a.activeDeliveryCount - b.activeDeliveryCount;
    }
    return a.riderId.localeCompare(b.riderId);
  });
}
