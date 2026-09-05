import { scrubAuditContext } from '../scrub-audit-context';

describe('scrubAuditContext', () => {
  it('redacts a top-level password field', () => {
    const result = scrubAuditContext({ password: 'hunter2', email: 'a@b.com' });
    expect(result.password).toBe('[REDACTED]');
    expect(result.email).toBe('a@b.com');
  });

  it('redacts passwordHash, token, accessToken, refreshToken, and secret', () => {
    const result = scrubAuditContext({
      passwordHash: 'x',
      token: 'x',
      accessToken: 'x',
      refreshToken: 'x',
      secret: 'x',
      safeField: 'kept',
    });
    expect(result.passwordHash).toBe('[REDACTED]');
    expect(result.token).toBe('[REDACTED]');
    expect(result.accessToken).toBe('[REDACTED]');
    expect(result.refreshToken).toBe('[REDACTED]');
    expect(result.secret).toBe('[REDACTED]');
    expect(result.safeField).toBe('kept');
  });

  it('leaves a context object with no sensitive keys unchanged', () => {
    const context = { ip: '1.2.3.4', reason: 'manual override' };
    expect(scrubAuditContext(context)).toEqual(context);
  });

  it('handles an empty context object', () => {
    expect(scrubAuditContext({})).toEqual({});
  });
});
