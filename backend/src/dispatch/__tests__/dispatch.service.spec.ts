import { DispatchService } from '../dispatch.service';
import { AppException } from '../../common/errors/app.exception';
import { AppErrorCode } from '../../common/errors/app-error-codes';

/**
 * This suite verifies DISPATCHSERVICE'S OWN logic for interpreting and
 * reacting to the conditional-update's affected-row-count (spec Section
 * 14) - it does NOT exercise real PostgreSQL row-level locking, which
 * remains an e2e-level concern blocked by the Prisma-generation issue
 * documented in docs/database.md.
 *
 * The fake delivery "table" below is deliberately built so its
 * `updateMany` has the SAME atomicity property a real
 * `UPDATE ... WHERE status = ?` statement has: the status check and the
 * mutation happen in a single synchronous block with no `await` in
 * between, so it cannot be interleaved by the JS event loop even when two
 * calls to DispatchService.assign() are kicked off concurrently via
 * Promise.all. This is what makes the race-condition assertion below
 * meaningful rather than trivially true - if updateMany's check-then-write
 * were split across an await boundary (as it would need to be if it made
 * two separate calls to a real, network-backed database without a single
 * atomic statement), both concurrent calls could observe "still
 * assignable" before either writes, defeating the guarantee entirely.
 * That failure mode is exactly what spec Section 14 exists to prevent,
 * and exactly what this test would catch if DispatchService ever stopped
 * relying on a single atomic conditional update.
 */
function createFakeDeliveryStore(
  initialStatus: 'REQUESTED' | 'REASSIGNMENT_REQUIRED',
) {
  const delivery: any = {
    id: 'delivery-1',
    tenantId: 'tenant-1',
    status: initialStatus,
    weightKg: null,
    riderId: null,
    vehicleId: null,
    assignedAt: null,
  };
  const events: any[] = [];

  const prisma = {
    delivery: {
      findFirst: async ({ where }: any) => {
        if (where.id !== delivery.id || where.tenantId !== delivery.tenantId)
          return null;
        return { ...delivery };
      },
      updateMany: ({ where, data }: any) => {
        // Synchronous critical section - see file-level comment above for
        // why this matters.
        if (where.id !== delivery.id || where.tenantId !== delivery.tenantId) {
          return Promise.resolve({ count: 0 });
        }
        if (!where.status.in.includes(delivery.status)) {
          return Promise.resolve({ count: 0 });
        }
        Object.assign(delivery, data);
        return Promise.resolve({ count: 1 });
      },
      findUniqueOrThrow: async ({ where }: any) => {
        if (where.id !== delivery.id) throw new Error('not found');
        return { ...delivery };
      },
    },
    rider: {
      findFirst: async ({ where }: any) => {
        if (where.id === 'rider-a')
          return { id: 'rider-a', tenantId: 'tenant-1', isAvailable: true };
        if (where.id === 'rider-b')
          return { id: 'rider-b', tenantId: 'tenant-1', isAvailable: true };
        return null;
      },
    },
    vehicle: {
      findFirst: async ({ where }: any) => {
        if (where.id === 'vehicle-a')
          return {
            id: 'vehicle-a',
            tenantId: 'tenant-1',
            capacityWeightKg: 100,
          };
        if (where.id === 'vehicle-b')
          return {
            id: 'vehicle-b',
            tenantId: 'tenant-1',
            capacityWeightKg: 100,
          };
        return null;
      },
    },
    deliveryStatusEvent: {
      create: async ({ data }: any) => {
        events.push(data);
        return data;
      },
    },
    $transaction: async (callback: any) => callback(prisma),
  };

  return { prisma, delivery, events };
}

const audit = { record: jest.fn().mockResolvedValue(undefined) };
const vehicles = { isEligible: () => true } as any;

describe('DispatchService.assign - concurrency (spec Section 14 / 44 scenario 3)', () => {
  it('when two dispatchers race to assign the same REQUESTED delivery, exactly one succeeds', async () => {
    const { prisma, delivery } = createFakeDeliveryStore('REQUESTED');
    const service = new DispatchService(prisma as any, audit as any, vehicles);

    const attemptA = service.assign(
      'tenant-1',
      'dispatcher-a',
      'delivery-1',
      'rider-a',
      'vehicle-a',
    );
    const attemptB = service.assign(
      'tenant-1',
      'dispatcher-b',
      'delivery-1',
      'rider-b',
      'vehicle-b',
    );

    const results = await Promise.allSettled([attemptA, attemptB]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly one wins, exactly one loses - never both, never neither.
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // The loser gets a 409 CONFLICT, per spec Section 14.
    const rejection = rejected[0] as PromiseRejectedResult;
    expect(rejection.reason).toBeInstanceOf(AppException);
    expect((rejection.reason as AppException).code).toBe(AppErrorCode.CONFLICT);

    // The delivery ends up assigned to whichever rider actually won - not
    // both, not neither, not corrupted into a mixed state.
    expect(delivery.status).toBe('ASSIGNED');
    expect(['rider-a', 'rider-b']).toContain(delivery.riderId);
  });

  it('a delivery already ASSIGNED cannot be assigned again (not just a same-instant race)', async () => {
    const { prisma } = createFakeDeliveryStore('REQUESTED');
    const service = new DispatchService(prisma as any, audit as any, vehicles);

    await service.assign(
      'tenant-1',
      'dispatcher-a',
      'delivery-1',
      'rider-a',
      'vehicle-a',
    );

    await expect(
      service.assign(
        'tenant-1',
        'dispatcher-b',
        'delivery-1',
        'rider-b',
        'vehicle-b',
      ),
    ).rejects.toMatchObject({ code: AppErrorCode.CONFLICT });
  });

  it('allows assignment from REASSIGNMENT_REQUIRED (fallback dispatch, spec Section 20)', async () => {
    const { prisma, delivery } = createFakeDeliveryStore(
      'REASSIGNMENT_REQUIRED',
    );
    const service = new DispatchService(prisma as any, audit as any, vehicles);

    await service.assign(
      'tenant-1',
      'dispatcher-a',
      'delivery-1',
      'rider-a',
      'vehicle-a',
    );

    expect(delivery.status).toBe('ASSIGNED');
    expect(delivery.riderId).toBe('rider-a');
  });

  it('rejects assignment of a nonexistent delivery with 404, not a raw DB error', async () => {
    const { prisma } = createFakeDeliveryStore('REQUESTED');
    const service = new DispatchService(prisma as any, audit as any, vehicles);

    await expect(
      service.assign(
        'tenant-1',
        'dispatcher-a',
        'does-not-exist',
        'rider-a',
        'vehicle-a',
      ),
    ).rejects.toMatchObject({ code: AppErrorCode.NOT_FOUND });
  });

  it('rejects assignment to an unavailable rider', async () => {
    const { prisma } = createFakeDeliveryStore('REQUESTED');
    prisma.rider.findFirst = async ({ where }: any) =>
      where.id === 'rider-a'
        ? { id: 'rider-a', tenantId: 'tenant-1', isAvailable: false }
        : null;
    const service = new DispatchService(prisma as any, audit as any, vehicles);

    await expect(
      service.assign(
        'tenant-1',
        'dispatcher-a',
        'delivery-1',
        'rider-a',
        'vehicle-a',
      ),
    ).rejects.toMatchObject({ code: AppErrorCode.BUSINESS_RULE_VIOLATION });
  });

  it('rejects assignment when the vehicle is not eligible for the cargo', async () => {
    const { prisma } = createFakeDeliveryStore('REQUESTED');
    const ineligibleVehicles = { isEligible: () => false } as any;
    const service = new DispatchService(
      prisma as any,
      audit as any,
      ineligibleVehicles,
    );

    await expect(
      service.assign(
        'tenant-1',
        'dispatcher-a',
        'delivery-1',
        'rider-a',
        'vehicle-a',
      ),
    ).rejects.toMatchObject({ code: AppErrorCode.BUSINESS_RULE_VIOLATION });
  });
});

describe('DispatchService.requestReassignment', () => {
  it('moves an ASSIGNED delivery to REASSIGNMENT_REQUIRED', async () => {
    const { prisma, delivery } = createFakeDeliveryStore('REQUESTED');
    const service = new DispatchService(prisma as any, audit as any, vehicles);
    await service.assign(
      'tenant-1',
      'dispatcher-a',
      'delivery-1',
      'rider-a',
      'vehicle-a',
    );
    expect(delivery.status).toBe('ASSIGNED');

    await service.requestReassignment(
      'tenant-1',
      'dispatcher-a',
      'delivery-1',
      'rider went offline',
    );

    expect(delivery.status).toBe('REASSIGNMENT_REQUIRED');
  });

  it('rejects reassignment of a delivery still in REQUESTED (nothing to reassign yet)', async () => {
    const { prisma } = createFakeDeliveryStore('REQUESTED');
    const service = new DispatchService(prisma as any, audit as any, vehicles);

    await expect(
      service.requestReassignment(
        'tenant-1',
        'dispatcher-a',
        'delivery-1',
        'test',
      ),
    ).rejects.toMatchObject({ code: AppErrorCode.CONFLICT });
  });
});

describe('DispatchService.getCandidates (spec Section 18 - eligibility + ranking)', () => {
  function createRankingFakeStore(options: {
    deliveryWeightKg: number | null;
    riders: Array<{
      id: string;
      isAvailable: boolean;
      vehicles: Array<{
        id: string;
        capacityWeightKg: number;
        isActive: boolean;
      }>;
      activeDeliveryCount: number;
    }>;
  }) {
    const prisma = {
      delivery: {
        findFirst: async ({ where }: any) =>
          where.id === 'delivery-1' && where.tenantId === 'tenant-1'
            ? {
                id: 'delivery-1',
                tenantId: 'tenant-1',
                weightKg: options.deliveryWeightKg,
              }
            : null,
        count: async ({ where }: any) => {
          const rider = options.riders.find((r) => r.id === where.riderId);
          return rider ? rider.activeDeliveryCount : 0;
        },
      },
      rider: {
        findFirst: async () => null,
        findMany: async ({ where }: any) =>
          options.riders
            .filter(
              (r) =>
                where.isAvailable === undefined ||
                r.isAvailable === where.isAvailable,
            )
            .map((r) => ({
              id: r.id,
              vehicles: r.vehicles.filter((v) => v.isActive),
            })),
      },
      vehicle: { findFirst: async () => null },
      deliveryStatusEvent: { create: async () => ({}) },
      $transaction: async (cb: any) => cb(prisma),
    };
    return prisma;
  }

  // Real eligibility logic (not a stub) so this test genuinely exercises
  // the eligibility-then-ranking pipeline end to end at the service level.
  const realVehicles = {
    isEligible: (
      vehicle: { capacityWeightKg: number },
      requiredWeightKg: number | null | undefined,
    ) =>
      requiredWeightKg == null || vehicle.capacityWeightKg >= requiredWeightKg,
  };

  it('excludes riders with no eligible vehicle for the cargo weight', async () => {
    const prisma = createRankingFakeStore({
      deliveryWeightKg: 200,
      riders: [
        {
          id: 'rider-small-bike',
          isAvailable: true,
          vehicles: [{ id: 'v1', capacityWeightKg: 20, isActive: true }],
          activeDeliveryCount: 0,
        },
        {
          id: 'rider-big-van',
          isAvailable: true,
          vehicles: [{ id: 'v2', capacityWeightKg: 500, isActive: true }],
          activeDeliveryCount: 0,
        },
      ],
    });
    const service = new DispatchService(
      prisma as any,
      audit as any,
      realVehicles,
    );

    const candidates = await service.getCandidates('tenant-1', 'delivery-1');

    expect(candidates).toHaveLength(1);
    expect(candidates[0].riderId).toBe('rider-big-van');
  });

  it('excludes unavailable riders entirely', async () => {
    const prisma = createRankingFakeStore({
      deliveryWeightKg: null,
      riders: [
        {
          id: 'rider-offline',
          isAvailable: false,
          vehicles: [{ id: 'v1', capacityWeightKg: 500, isActive: true }],
          activeDeliveryCount: 0,
        },
      ],
    });
    const service = new DispatchService(
      prisma as any,
      audit as any,
      realVehicles,
    );

    const candidates = await service.getCandidates('tenant-1', 'delivery-1');

    expect(candidates).toHaveLength(0);
  });

  it('ranks eligible riders by ascending workload', async () => {
    const prisma = createRankingFakeStore({
      deliveryWeightKg: null,
      riders: [
        {
          id: 'rider-busy',
          isAvailable: true,
          vehicles: [{ id: 'v1', capacityWeightKg: 100, isActive: true }],
          activeDeliveryCount: 4,
        },
        {
          id: 'rider-idle',
          isAvailable: true,
          vehicles: [{ id: 'v2', capacityWeightKg: 100, isActive: true }],
          activeDeliveryCount: 0,
        },
      ],
    });
    const service = new DispatchService(
      prisma as any,
      audit as any,
      realVehicles,
    );

    const candidates = await service.getCandidates('tenant-1', 'delivery-1');

    expect(candidates.map((c) => c.riderId)).toEqual([
      'rider-idle',
      'rider-busy',
    ]);
  });

  it('suggests an eligible vehicle id for each ranked candidate', async () => {
    const prisma = createRankingFakeStore({
      deliveryWeightKg: 50,
      riders: [
        {
          id: 'rider-a',
          isAvailable: true,
          vehicles: [
            { id: 'too-small', capacityWeightKg: 10, isActive: true },
            { id: 'big-enough', capacityWeightKg: 100, isActive: true },
          ],
          activeDeliveryCount: 0,
        },
      ],
    });
    const service = new DispatchService(
      prisma as any,
      audit as any,
      realVehicles,
    );

    const candidates = await service.getCandidates('tenant-1', 'delivery-1');

    expect(candidates[0].suggestedVehicleId).toBe('big-enough');
  });

  it('rejects a nonexistent delivery with 404', async () => {
    const prisma = createRankingFakeStore({
      deliveryWeightKg: null,
      riders: [],
    });
    const service = new DispatchService(
      prisma as any,
      audit as any,
      realVehicles,
    );

    await expect(
      service.getCandidates('tenant-1', 'does-not-exist'),
    ).rejects.toMatchObject({ code: AppErrorCode.NOT_FOUND });
  });

  it('returns an empty list (not an error) when no riders are available', async () => {
    const prisma = createRankingFakeStore({
      deliveryWeightKg: null,
      riders: [],
    });
    const service = new DispatchService(
      prisma as any,
      audit as any,
      realVehicles,
    );

    const candidates = await service.getCandidates('tenant-1', 'delivery-1');

    expect(candidates).toEqual([]);
  });
});
