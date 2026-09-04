import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SignupDto } from '../signup.dto';

const validPayload = {
  organizationName: 'Acme Logistics',
  tenantSlug: 'acme-logistics',
  email: 'owner@acme-logistics.example',
  password: 'correct-horse-battery-staple',
  acceptedTerms: true,
};

function toDto(overrides: Record<string, unknown> = {}) {
  return plainToInstance(SignupDto, { ...validPayload, ...overrides });
}

describe('SignupDto', () => {
  it('accepts a fully valid payload', async () => {
    const errors = await validate(toDto());
    expect(errors).toHaveLength(0);
  });

  it('rejects acceptedTerms: false', async () => {
    const errors = await validate(toDto({ acceptedTerms: false }));
    expect(errors.some((e) => e.property === 'acceptedTerms')).toBe(true);
  });

  it('rejects a missing acceptedTerms field', async () => {
    // Deliberately does NOT use the toDto() helper here: toDto() spreads
    // validPayload as a base, so omitting a key from `overrides` does not
    // remove it from the merged object - it would still inherit
    // validPayload.acceptedTerms underneath. Constructing the payload
    // directly, without the key at all, is what actually exercises "field
    // omitted entirely."
    const { acceptedTerms, ...payloadWithoutTerms } = validPayload;
    const errors = await validate(
      plainToInstance(SignupDto, payloadWithoutTerms),
    );
    expect(errors.some((e) => e.property === 'acceptedTerms')).toBe(true);
  });

  it('rejects a tenantSlug with uppercase letters', async () => {
    const errors = await validate(toDto({ tenantSlug: 'Acme-Logistics' }));
    expect(errors.some((e) => e.property === 'tenantSlug')).toBe(true);
  });

  it('rejects a tenantSlug with spaces', async () => {
    const errors = await validate(toDto({ tenantSlug: 'acme logistics' }));
    expect(errors.some((e) => e.property === 'tenantSlug')).toBe(true);
  });

  it('rejects a tenantSlug with consecutive/leading/trailing hyphens', async () => {
    const errors1 = await validate(toDto({ tenantSlug: '-acme' }));
    const errors2 = await validate(toDto({ tenantSlug: 'acme--logistics' }));
    const errors3 = await validate(toDto({ tenantSlug: 'acme-' }));
    expect(errors1.some((e) => e.property === 'tenantSlug')).toBe(true);
    expect(errors2.some((e) => e.property === 'tenantSlug')).toBe(true);
    expect(errors3.some((e) => e.property === 'tenantSlug')).toBe(true);
  });

  it('accepts a valid multi-segment tenantSlug', async () => {
    const errors = await validate(
      toDto({ tenantSlug: 'acme-east-africa-logistics' }),
    );
    expect(errors.some((e) => e.property === 'tenantSlug')).toBe(false);
  });

  it('rejects a password shorter than 8 characters', async () => {
    const errors = await validate(toDto({ password: 'short1' }));
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('rejects an invalid email', async () => {
    const errors = await validate(toDto({ email: 'not-an-email' }));
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('rejects an organizationName that is empty', async () => {
    const errors = await validate(toDto({ organizationName: '' }));
    expect(errors.some((e) => e.property === 'organizationName')).toBe(true);
  });
});
