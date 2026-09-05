import { describe, it, expect } from "vitest";
import { decodeAccessToken } from "@/utils/jwt";
import { fakeAccessToken } from "../test-utils";

describe("decodeAccessToken", () => {
  it("decodes id/tenantId/role out of a well-formed access token", () => {
    const token = fakeAccessToken({ sub: "user-1", tenantId: "tenant-1", role: "DISPATCHER" });
    const payload = decodeAccessToken(token);

    expect(payload.sub).toBe("user-1");
    expect(payload.tenantId).toBe("tenant-1");
    expect(payload.role).toBe("DISPATCHER");
    expect(payload.type).toBe("access");
  });

  it("throws on a token that isn't three dot-separated segments", () => {
    expect(() => decodeAccessToken("not-a-jwt")).toThrow(/three-segment JWT/);
  });

  it("throws on a token whose payload segment isn't valid JSON", () => {
    expect(() => decodeAccessToken("header.bm90LWpzb24.signature")).toThrow();
  });
});
