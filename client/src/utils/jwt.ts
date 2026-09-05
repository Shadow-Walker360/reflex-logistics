import type { UserRole } from "@/types";

/**
 * Access token payload shape, confirmed per FRONTEND_API_CONTRACT.md §3.
 * There is no `GET /auth/me` endpoint — the backend confirms this
 * directly ("no such route is registered anywhere in the codebase") — so
 * decoding the access token client-side is the only way to know who's
 * logged in. This deliberately does NOT verify the JWT signature (that
 * would be meaningless without the signing secret, which never belongs in
 * the browser); it only reads the payload, exactly as the contract doc
 * recommends. The backend is the authority on whether the token is
 * actually valid — every authenticated request still gets checked
 * server-side regardless of what this decodes to.
 */
export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  role: UserRole;
  type: "access";
  iat: number;
  exp: number;
}

/**
 * Decodes (never verifies) a JWT's payload segment. Throws if the token
 * is structurally malformed (not three dot-separated segments, or the
 * middle segment isn't valid base64url JSON) — callers should treat that
 * as "this isn't a usable session," not attempt to recover a partial user.
 */
export function decodeAccessToken(token: string): AccessTokenPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed access token: expected a three-segment JWT.");
  }

  const payloadSegment = parts[1];
  if (!payloadSegment) {
    throw new Error("Malformed access token: missing payload segment.");
  }
  const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

  let json: string;
  try {
    json = atob(padded);
  } catch (cause) {
    throw new Error("Malformed access token: payload segment is not valid base64url.", { cause });
  }

  try {
    return JSON.parse(json) as AccessTokenPayload;
  } catch (cause) {
    throw new Error("Malformed access token: payload segment is not valid JSON.", { cause });
  }
}
