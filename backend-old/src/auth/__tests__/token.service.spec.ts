import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../token.service';

describe('TokenService', () => {
  let service: TokenService;
  const config = new ConfigService({
    auth: {
      accessSecret: 'a'.repeat(32),
      accessExpiresIn: '15m',
      refreshSecret: 'b'.repeat(32),
      refreshExpiresIn: '7d',
    },
  });

  beforeEach(() => {
    service = new TokenService(new JwtService(), config);
  });

  it('issues an access token and refresh token that are both valid, non-empty JWTs', async () => {
    const pair = await service.issueTokenPair('user-1', 'tenant-1', 'RIDER');
    expect(pair.accessToken.split('.')).toHaveLength(3);
    expect(pair.refreshToken.split('.')).toHaveLength(3);
    expect(pair.refreshTokenId).toBeDefined();
    expect(pair.refreshTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('embeds sub, tenantId, and role in the access token payload', async () => {
    const pair = await service.issueTokenPair(
      'user-42',
      'tenant-7',
      'DISPATCHER',
    );
    const payload = await service.verifyAccessToken(pair.accessToken);
    expect(payload.sub).toBe('user-42');
    expect(payload.tenantId).toBe('tenant-7');
    expect(payload.role).toBe('DISPATCHER');
    expect(payload.type).toBe('access');
  });

  it('embeds a unique jti in the refresh token matching refreshTokenId', async () => {
    const pair = await service.issueTokenPair('user-1', 'tenant-1', 'RIDER');
    const payload = await service.verifyRefreshToken(pair.refreshToken);
    expect(payload.jti).toBe(pair.refreshTokenId);
    expect(payload.type).toBe('refresh');
  });

  it('rejects an access token when verified with the refresh-token verifier (different secrets)', async () => {
    const pair = await service.issueTokenPair('user-1', 'tenant-1', 'RIDER');
    await expect(
      service.verifyRefreshToken(pair.accessToken),
    ).rejects.toThrow();
  });

  it('rejects a tampered token', async () => {
    const pair = await service.issueTokenPair('user-1', 'tenant-1', 'RIDER');
    const tampered = pair.accessToken.slice(0, -2) + 'xx';
    await expect(service.verifyAccessToken(tampered)).rejects.toThrow();
  });

  it('produces two different tokens for two different refresh issuances (unique jti)', async () => {
    const a = await service.issueTokenPair('user-1', 'tenant-1', 'RIDER');
    const b = await service.issueTokenPair('user-1', 'tenant-1', 'RIDER');
    expect(a.refreshTokenId).not.toBe(b.refreshTokenId);
  });

  describe('hashRefreshToken', () => {
    it('produces a deterministic hash for the same input', () => {
      const h1 = service.hashRefreshToken('some-token-value');
      const h2 = service.hashRefreshToken('some-token-value');
      expect(h1).toBe(h2);
    });

    it('produces a different hash for a different input', () => {
      const h1 = service.hashRefreshToken('token-a');
      const h2 = service.hashRefreshToken('token-b');
      expect(h1).not.toBe(h2);
    });

    it('does not return the plaintext token', () => {
      const hash = service.hashRefreshToken('some-token-value');
      expect(hash).not.toBe('some-token-value');
      expect(hash).toMatch(/^[a-f0-9]{64}$/); // sha256 hex digest
    });
  });
});
