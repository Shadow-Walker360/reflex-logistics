/**
 * Spec reference: BACKEND ENGINEERING SPECIFICATION, Section 10 (Delivery
 * State Machine).
 *
 * Deliberately pure: no NestJS decorators, no Prisma import, no I/O. The
 * backend must be the sole authority over which transitions are valid
 * (Section 9) - this class is where that authority actually lives.
 * DeliveriesService calls it before ever writing to the database; it never
 * trusts a client-supplied "next status" without checking it here first.
 */

export type DeliveryStatus =
  | 'REQUESTED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED'
  | 'REASSIGNMENT_REQUIRED';

/**
 * Who may trigger each transition. Checked by the caller (DeliveriesService)
 * against the authenticated user's role AND, where noted, row-ownership -
 * this map only encodes "which roles are eligible in principle," not the
 * row-scoped "and only for delivery.riderId = the caller" check, which
 * requires a database round-trip this pure class deliberately doesn't do.
 */
export type TransitionActor =
  'RETAILER' | 'DISPATCHER' | 'RIDER' | 'SYSTEM' | 'ADMIN';

interface TransitionRule {
  to: DeliveryStatus;
  allowedActors: TransitionActor[];
}

const TRANSITIONS: Record<DeliveryStatus, TransitionRule[]> = {
  REQUESTED: [
    { to: 'ASSIGNED', allowedActors: ['DISPATCHER', 'SYSTEM', 'ADMIN'] },
    { to: 'CANCELLED', allowedActors: ['RETAILER', 'ADMIN'] },
  ],
  ASSIGNED: [
    { to: 'ACCEPTED', allowedActors: ['RIDER'] },
    { to: 'CANCELLED', allowedActors: ['RETAILER', 'ADMIN'] },
    {
      to: 'REASSIGNMENT_REQUIRED',
      allowedActors: ['SYSTEM', 'DISPATCHER', 'ADMIN'],
    },
  ],
  ACCEPTED: [
    { to: 'PICKED_UP', allowedActors: ['RIDER'] },
    { to: 'CANCELLED', allowedActors: ['RETAILER', 'ADMIN'] },
    {
      to: 'REASSIGNMENT_REQUIRED',
      allowedActors: ['SYSTEM', 'DISPATCHER', 'ADMIN'],
    },
  ],
  PICKED_UP: [
    { to: 'IN_TRANSIT', allowedActors: ['RIDER'] },
    { to: 'FAILED', allowedActors: ['RIDER', 'DISPATCHER', 'ADMIN'] },
  ],
  IN_TRANSIT: [
    { to: 'DELIVERED', allowedActors: ['RIDER', 'SYSTEM'] },
    { to: 'FAILED', allowedActors: ['RIDER', 'DISPATCHER', 'ADMIN'] },
  ],
  REASSIGNMENT_REQUIRED: [
    { to: 'ASSIGNED', allowedActors: ['DISPATCHER', 'SYSTEM', 'ADMIN'] },
    { to: 'CANCELLED', allowedActors: ['RETAILER', 'ADMIN'] },
  ],
  // Terminal states - no outbound transitions.
  DELIVERED: [],
  CANCELLED: [],
  FAILED: [],
};

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: DeliveryStatus,
    public readonly to: DeliveryStatus,
  ) {
    super(`Cannot transition delivery from ${from} to ${to}.`);
    this.name = 'InvalidTransitionError';
  }
}

export class UnauthorizedTransitionError extends Error {
  constructor(
    public readonly from: DeliveryStatus,
    public readonly to: DeliveryStatus,
    public readonly actor: TransitionActor,
  ) {
    super(`Actor ${actor} is not permitted to transition ${from} -> ${to}.`);
    this.name = 'UnauthorizedTransitionError';
  }
}

export class DeliveryStateMachine {
  static isValidTransition(from: DeliveryStatus, to: DeliveryStatus): boolean {
    return TRANSITIONS[from].some((rule) => rule.to === to);
  }

  static isActorAllowed(
    from: DeliveryStatus,
    to: DeliveryStatus,
    actor: TransitionActor,
  ): boolean {
    const rule = TRANSITIONS[from].find((r) => r.to === to);
    return !!rule && rule.allowedActors.includes(actor);
  }

  /**
   * Throws InvalidTransitionError if the transition itself doesn't exist
   * in the state machine, or UnauthorizedTransitionError if the transition
   * exists but this actor role isn't listed as eligible for it. Callers
   * (DeliveriesService) map these to AppException(BUSINESS_RULE_VIOLATION)
   * and AppException(FORBIDDEN) respectively - kept as distinct error
   * types here so the two failure modes (impossible vs. not-yours-to-do)
   * aren't conflated into one generic rejection.
   */
  static assertTransition(
    from: DeliveryStatus,
    to: DeliveryStatus,
    actor: TransitionActor,
  ): void {
    if (!this.isValidTransition(from, to)) {
      throw new InvalidTransitionError(from, to);
    }
    if (!this.isActorAllowed(from, to, actor)) {
      throw new UnauthorizedTransitionError(from, to, actor);
    }
  }

  static isTerminal(status: DeliveryStatus): boolean {
    return TRANSITIONS[status].length === 0;
  }
}
