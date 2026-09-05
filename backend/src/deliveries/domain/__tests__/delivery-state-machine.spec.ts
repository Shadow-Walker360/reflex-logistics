import {
  DeliveryStateMachine,
  InvalidTransitionError,
  UnauthorizedTransitionError,
} from '../delivery-state-machine';

describe('DeliveryStateMachine', () => {
  describe('the happy path (spec Section 10)', () => {
    it('allows REQUESTED -> ASSIGNED by a dispatcher', () => {
      expect(
        DeliveryStateMachine.isValidTransition('REQUESTED', 'ASSIGNED'),
      ).toBe(true);
      expect(
        DeliveryStateMachine.isActorAllowed(
          'REQUESTED',
          'ASSIGNED',
          'DISPATCHER',
        ),
      ).toBe(true);
    });

    it('allows ASSIGNED -> ACCEPTED by the rider only', () => {
      expect(
        DeliveryStateMachine.isActorAllowed('ASSIGNED', 'ACCEPTED', 'RIDER'),
      ).toBe(true);
      expect(
        DeliveryStateMachine.isActorAllowed(
          'ASSIGNED',
          'ACCEPTED',
          'DISPATCHER',
        ),
      ).toBe(false);
      expect(
        DeliveryStateMachine.isActorAllowed('ASSIGNED', 'ACCEPTED', 'RETAILER'),
      ).toBe(false);
    });

    it('allows ACCEPTED -> PICKED_UP -> IN_TRANSIT -> DELIVERED, all by the rider', () => {
      expect(
        DeliveryStateMachine.isActorAllowed('ACCEPTED', 'PICKED_UP', 'RIDER'),
      ).toBe(true);
      expect(
        DeliveryStateMachine.isActorAllowed('PICKED_UP', 'IN_TRANSIT', 'RIDER'),
      ).toBe(true);
      expect(
        DeliveryStateMachine.isActorAllowed('IN_TRANSIT', 'DELIVERED', 'RIDER'),
      ).toBe(true);
    });

    it('walks the entire documented happy path without throwing', () => {
      const path: Array<
        [
          'REQUESTED' | 'ASSIGNED' | 'ACCEPTED' | 'PICKED_UP' | 'IN_TRANSIT',
          'ASSIGNED' | 'ACCEPTED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED',
          'DISPATCHER' | 'RIDER',
        ]
      > = [
        ['REQUESTED', 'ASSIGNED', 'DISPATCHER'],
        ['ASSIGNED', 'ACCEPTED', 'RIDER'],
        ['ACCEPTED', 'PICKED_UP', 'RIDER'],
        ['PICKED_UP', 'IN_TRANSIT', 'RIDER'],
        ['IN_TRANSIT', 'DELIVERED', 'RIDER'],
      ];
      for (const [from, to, actor] of path) {
        expect(() =>
          DeliveryStateMachine.assertTransition(from, to, actor),
        ).not.toThrow();
      }
    });
  });

  describe('invalid transitions are rejected (spec Section 44, scenario 6)', () => {
    it('rejects REQUESTED -> DELIVERED (skipping every intermediate state)', () => {
      expect(
        DeliveryStateMachine.isValidTransition('REQUESTED', 'DELIVERED'),
      ).toBe(false);
      expect(() =>
        DeliveryStateMachine.assertTransition(
          'REQUESTED',
          'DELIVERED',
          'RIDER',
        ),
      ).toThrow(InvalidTransitionError);
    });

    it('rejects any transition out of a terminal state (DELIVERED, CANCELLED, FAILED)', () => {
      for (const terminal of ['DELIVERED', 'CANCELLED', 'FAILED'] as const) {
        expect(DeliveryStateMachine.isTerminal(terminal)).toBe(true);
        expect(
          DeliveryStateMachine.isValidTransition(terminal, 'ASSIGNED'),
        ).toBe(false);
      }
    });

    it('rejects DELIVERED -> anything, including CANCELLED', () => {
      expect(
        DeliveryStateMachine.isValidTransition('DELIVERED', 'CANCELLED'),
      ).toBe(false);
    });
  });

  describe('unauthorized actor for an otherwise-valid transition', () => {
    it('rejects a RETAILER attempting to mark a delivery PICKED_UP', () => {
      expect(
        DeliveryStateMachine.isActorAllowed(
          'ACCEPTED',
          'PICKED_UP',
          'RETAILER',
        ),
      ).toBe(false);
      expect(() =>
        DeliveryStateMachine.assertTransition(
          'ACCEPTED',
          'PICKED_UP',
          'RETAILER',
        ),
      ).toThrow(UnauthorizedTransitionError);
    });

    it('rejects a RIDER attempting to assign a delivery (dispatcher-only action)', () => {
      expect(
        DeliveryStateMachine.isActorAllowed('REQUESTED', 'ASSIGNED', 'RIDER'),
      ).toBe(false);
    });

    it('distinguishes InvalidTransitionError from UnauthorizedTransitionError', () => {
      // Impossible transition -> InvalidTransitionError, regardless of actor.
      expect(() =>
        DeliveryStateMachine.assertTransition(
          'REQUESTED',
          'DELIVERED',
          'ADMIN',
        ),
      ).toThrow(InvalidTransitionError);

      // Valid transition, wrong actor -> UnauthorizedTransitionError, a
      // distinct type so callers can map it to 403 rather than 422.
      expect(() =>
        DeliveryStateMachine.assertTransition(
          'ASSIGNED',
          'ACCEPTED',
          'DISPATCHER',
        ),
      ).toThrow(UnauthorizedTransitionError);
    });
  });

  describe('cancellation (spec Section 10 table)', () => {
    it('allows RETAILER to cancel from REQUESTED, ASSIGNED, or ACCEPTED', () => {
      expect(
        DeliveryStateMachine.isActorAllowed(
          'REQUESTED',
          'CANCELLED',
          'RETAILER',
        ),
      ).toBe(true);
      expect(
        DeliveryStateMachine.isActorAllowed(
          'ASSIGNED',
          'CANCELLED',
          'RETAILER',
        ),
      ).toBe(true);
      expect(
        DeliveryStateMachine.isActorAllowed(
          'ACCEPTED',
          'CANCELLED',
          'RETAILER',
        ),
      ).toBe(true);
    });

    it('does NOT allow cancellation once PICKED_UP or later', () => {
      expect(
        DeliveryStateMachine.isValidTransition('PICKED_UP', 'CANCELLED'),
      ).toBe(false);
      expect(
        DeliveryStateMachine.isValidTransition('IN_TRANSIT', 'CANCELLED'),
      ).toBe(false);
    });

    it('does NOT allow a rider to cancel a delivery', () => {
      expect(
        DeliveryStateMachine.isActorAllowed('REQUESTED', 'CANCELLED', 'RIDER'),
      ).toBe(false);
    });
  });

  describe('fallback dispatch / reassignment (spec Section 20)', () => {
    it('allows ASSIGNED or ACCEPTED -> REASSIGNMENT_REQUIRED, system or dispatcher triggered', () => {
      expect(
        DeliveryStateMachine.isActorAllowed(
          'ASSIGNED',
          'REASSIGNMENT_REQUIRED',
          'SYSTEM',
        ),
      ).toBe(true);
      expect(
        DeliveryStateMachine.isActorAllowed(
          'ACCEPTED',
          'REASSIGNMENT_REQUIRED',
          'DISPATCHER',
        ),
      ).toBe(true);
    });

    it('allows REASSIGNMENT_REQUIRED -> ASSIGNED (fallback rider found)', () => {
      expect(
        DeliveryStateMachine.isActorAllowed(
          'REASSIGNMENT_REQUIRED',
          'ASSIGNED',
          'DISPATCHER',
        ),
      ).toBe(true);
    });

    it('a rider cannot trigger their own reassignment', () => {
      expect(
        DeliveryStateMachine.isActorAllowed(
          'ASSIGNED',
          'REASSIGNMENT_REQUIRED',
          'RIDER',
        ),
      ).toBe(false);
    });
  });

  describe('failure states', () => {
    it('allows PICKED_UP or IN_TRANSIT -> FAILED', () => {
      expect(
        DeliveryStateMachine.isValidTransition('PICKED_UP', 'FAILED'),
      ).toBe(true);
      expect(
        DeliveryStateMachine.isValidTransition('IN_TRANSIT', 'FAILED'),
      ).toBe(true);
    });

    it('FAILED is terminal', () => {
      expect(DeliveryStateMachine.isTerminal('FAILED')).toBe(true);
    });
  });

  describe('error object shape', () => {
    it('InvalidTransitionError carries the from/to states', () => {
      try {
        DeliveryStateMachine.assertTransition(
          'DELIVERED',
          'REQUESTED',
          'ADMIN',
        );
        fail('expected a throw');
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidTransitionError);
        expect((e as InvalidTransitionError).from).toBe('DELIVERED');
        expect((e as InvalidTransitionError).to).toBe('REQUESTED');
      }
    });

    it('UnauthorizedTransitionError carries the actor', () => {
      try {
        DeliveryStateMachine.assertTransition('REQUESTED', 'ASSIGNED', 'RIDER');
        fail('expected a throw');
      } catch (e) {
        expect(e).toBeInstanceOf(UnauthorizedTransitionError);
        expect((e as UnauthorizedTransitionError).actor).toBe('RIDER');
      }
    });
  });
});
