import { rankCandidates } from '../ranking';

describe('rankCandidates', () => {
  it('ranks the rider with fewer active deliveries first', () => {
    const result = rankCandidates([
      { riderId: 'rider-busy', activeDeliveryCount: 3 },
      { riderId: 'rider-free', activeDeliveryCount: 0 },
    ]);
    expect(result[0].riderId).toBe('rider-free');
    expect(result[1].riderId).toBe('rider-busy');
  });

  it('sorts a longer list fully by ascending workload', () => {
    const result = rankCandidates([
      { riderId: 'c', activeDeliveryCount: 5 },
      { riderId: 'a', activeDeliveryCount: 1 },
      { riderId: 'b', activeDeliveryCount: 3 },
    ]);
    expect(result.map((r) => r.riderId)).toEqual(['a', 'b', 'c']);
  });

  it('breaks ties deterministically by riderId', () => {
    const result = rankCandidates([
      { riderId: 'zebra', activeDeliveryCount: 2 },
      { riderId: 'alpha', activeDeliveryCount: 2 },
    ]);
    expect(result.map((r) => r.riderId)).toEqual(['alpha', 'zebra']);
  });

  it('does not mutate the input array', () => {
    const input = [
      { riderId: 'b', activeDeliveryCount: 2 },
      { riderId: 'a', activeDeliveryCount: 1 },
    ];
    const originalOrder = input.map((r) => r.riderId);
    rankCandidates(input);
    expect(input.map((r) => r.riderId)).toEqual(originalOrder);
  });

  it('handles an empty candidate list', () => {
    expect(rankCandidates([])).toEqual([]);
  });

  it('handles a single candidate', () => {
    const result = rankCandidates([
      { riderId: 'only', activeDeliveryCount: 7 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].riderId).toBe('only');
  });

  it('a rider with zero active deliveries always outranks any rider with at least one', () => {
    const result = rankCandidates([
      { riderId: 'has-one', activeDeliveryCount: 1 },
      { riderId: 'has-zero', activeDeliveryCount: 0 },
      { riderId: 'has-many', activeDeliveryCount: 10 },
    ]);
    expect(result[0].riderId).toBe('has-zero');
  });
});
