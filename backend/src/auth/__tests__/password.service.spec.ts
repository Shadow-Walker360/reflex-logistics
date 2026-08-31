import { PasswordService } from '../password.service';

jest.setTimeout(15000); // bcrypt at cost factor 12 is deliberately slow

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('hashes a password to something other than the plaintext', async () => {
    const hash = await service.hash('correct-horse-battery-staple');
    expect(hash).not.toBe('correct-horse-battery-staple');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('verifies a correct password against its hash', async () => {
    const hash = await service.hash('correct-horse-battery-staple');
    const result = await service.verify('correct-horse-battery-staple', hash);
    expect(result).toBe(true);
  });

  it('rejects an incorrect password against a real hash', async () => {
    const hash = await service.hash('correct-horse-battery-staple');
    const result = await service.verify('wrong-password', hash);
    expect(result).toBe(false);
  });

  it('produces a different hash for the same input on repeated calls (random salt)', async () => {
    const hashA = await service.hash('same-password');
    const hashB = await service.hash('same-password');
    expect(hashA).not.toBe(hashB);
    // Both must still verify correctly despite being different strings.
    expect(await service.verify('same-password', hashA)).toBe(true);
    expect(await service.verify('same-password', hashB)).toBe(true);
  });
});
