import { isAssignableRole } from '../role-assignment';

describe('isAssignableRole', () => {
  it('allows RETAILER, DISPATCHER, RIDER, SUPPORT_ADMIN, MANAGER_ADMIN', () => {
    expect(isAssignableRole('RETAILER')).toBe(true);
    expect(isAssignableRole('DISPATCHER')).toBe(true);
    expect(isAssignableRole('RIDER')).toBe(true);
    expect(isAssignableRole('SUPPORT_ADMIN')).toBe(true);
    expect(isAssignableRole('MANAGER_ADMIN')).toBe(true);
  });

  it('rejects SYSTEM_ADMIN - a tenant admin must never be able to grant platform-wide access', () => {
    expect(isAssignableRole('SYSTEM_ADMIN')).toBe(false);
  });

  it('rejects an unrecognized/garbage role string', () => {
    expect(isAssignableRole('SUPER_ROOT')).toBe(false);
    expect(isAssignableRole('')).toBe(false);
    expect(isAssignableRole('retailer')).toBe(false); // case-sensitive, matches Prisma enum exactly
  });
});
