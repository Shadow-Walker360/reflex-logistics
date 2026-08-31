import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

/**
 * Only accepted as a client-supplied correlation id if it looks like a
 * reasonable trace identifier: visible ASCII, no whitespace/control
 * characters, bounded length. Security fix (post-Phase-2 audit): the
 * previous version echoed ANY client-supplied X-Request-Id string
 * verbatim into a response header and into every log line for the
 * request, unvalidated. Node's HTTP layer already rejects raw CRLF in
 * header values, but an unbounded/arbitrary string could still bloat
 * logs, or contain misleading content that undermines log correlation
 * during an incident. Anything not matching this pattern is treated the
 * same as "no id supplied" - a fresh UUID is generated instead of trusting
 * the client's value.
 */
const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * Attaches a correlation/request ID to every incoming request.
 *
 * Spec reference: Section 42 (Observability) — "one delivery operation
 * should be traceable across API -> database -> queue -> worker -> external
 * service" via a shared correlation ID present in every log line.
 *
 * If the caller (e.g. an upstream gateway, or a retried client request)
 * already supplies a well-formed X-Request-Id, it is honored so traces can
 * be stitched across systems; otherwise a new UUID is generated.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header('x-request-id');
    const requestId =
      incoming && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();

    (req as any).id = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
