/**
 * Spec reference: Section 18 (Dispatch Engine - eligibility vs ranking),
 * Section 19 (Vehicle/Cargo Logic).
 *
 * Pulled out as a standalone pure function (rather than a private/instance
 * method on VehiclesService) for the same reason as
 * audit/scrub-audit-context.ts: VehiclesService requires PrismaService,
 * which is affected by the Prisma-client-generation blocker documented in
 * docs/database.md - this function has no such dependency and can be
 * fully unit-tested today.
 *
 * Minimal for MVP - weight only, per the schema.prisma comment on
 * Vehicle.capacityWeightKg - but kept as its own function so adding
 * fragility/perishability/declared-value checks later is additive, not a
 * redesign of the eligibility/ranking split itself.
 */
export function isVehicleEligible(
  vehicle: { capacityWeightKg: number },
  requiredWeightKg: number | null | undefined,
): boolean {
  if (requiredWeightKg == null) {
    return true; // no cargo weight specified - any vehicle is eligible
  }
  return vehicle.capacityWeightKg >= requiredWeightKg;
}
