import { isVehicleEligible } from '../vehicle-eligibility';

describe('isVehicleEligible', () => {
  it('returns true when vehicle capacity exceeds the required weight', () => {
    expect(isVehicleEligible({ capacityWeightKg: 500 }, 100)).toBe(true);
  });

  it('returns true when vehicle capacity exactly equals the required weight', () => {
    expect(isVehicleEligible({ capacityWeightKg: 100 }, 100)).toBe(true);
  });

  it('returns false when vehicle capacity is below the required weight', () => {
    expect(isVehicleEligible({ capacityWeightKg: 50 }, 100)).toBe(false);
  });

  it('returns true when no weight requirement is specified (null)', () => {
    expect(isVehicleEligible({ capacityWeightKg: 1 }, null)).toBe(true);
  });

  it('returns true when no weight requirement is specified (undefined)', () => {
    expect(isVehicleEligible({ capacityWeightKg: 1 }, undefined)).toBe(true);
  });

  it('a motorcycle-scale vehicle is ineligible for a truck-scale load', () => {
    expect(isVehicleEligible({ capacityWeightKg: 15 }, 500)).toBe(false);
  });
});
