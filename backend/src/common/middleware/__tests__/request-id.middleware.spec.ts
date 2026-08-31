import { RequestIdMiddleware } from '../request-id.middleware';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
  });

  it('generates a request id when the client supplies none', () => {
    const req: any = { header: () => undefined };
    const setHeader = jest.fn();
    const res: any = { setHeader };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.id).toBeDefined();
    expect(typeof req.id).toBe('string');
    expect(req.id.length).toBeGreaterThan(0);
    expect(setHeader).toHaveBeenCalledWith('x-request-id', req.id);
    expect(next).toHaveBeenCalled();
  });

  it('honors a well-formed incoming x-request-id header for cross-system trace correlation', () => {
    const incomingId = 'upstream-gateway-req-abc123';
    const req: any = {
      header: (name: string) =>
        name === 'x-request-id' ? incomingId : undefined,
    };
    const setHeader = jest.fn();
    const res: any = { setHeader };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.id).toBe(incomingId);
    expect(setHeader).toHaveBeenCalledWith('x-request-id', incomingId);
  });

  it('generates a new id if the incoming header is empty/whitespace', () => {
    const req: any = { header: () => '   ' };
    const setHeader = jest.fn();
    const res: any = { setHeader };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.id).not.toBe('   ');
    expect(req.id.length).toBeGreaterThan(0);
  });

  describe('security: malformed/malicious incoming request IDs are rejected (post-Phase-2 audit)', () => {
    const runWith = (incoming: string) => {
      const req: any = { header: () => incoming };
      const setHeader = jest.fn();
      const res: any = { setHeader };
      const next = jest.fn();
      middleware.use(req, res, next);
      return req.id as string;
    };

    it('rejects a header containing CR/LF characters (header/log injection attempt)', () => {
      const id = runWith('legit\r\nX-Injected-Header: evil');
      expect(id).not.toContain('\r');
      expect(id).not.toContain('\n');
      expect(id).not.toBe('legit\r\nX-Injected-Header: evil');
    });

    it('rejects a header containing other whitespace', () => {
      const id = runWith('has spaces in it');
      expect(id).not.toContain(' ');
    });

    it('rejects an excessively long header (bounded to 128 chars)', () => {
      const longId = 'a'.repeat(500);
      const id = runWith(longId);
      expect(id.length).toBeLessThan(500);
    });

    it('accepts a well-formed id containing dots, dashes, and underscores', () => {
      const id = runWith('trace.abc-123_def');
      expect(id).toBe('trace.abc-123_def');
    });
  });
});
