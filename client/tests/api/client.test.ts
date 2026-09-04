import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/errors";
import { useAuthStore } from "@/state/authStore";

/**
 * Verifies api/client.ts against the CONFIRMED backend error envelope
 * (FRONTEND_API_CONTRACT.md §8): { error: { code, message, requestId } }
 * — not the previously-assumed flat { message, code, fields } shape.
 * This is the piece every ApiError-driven error message in the app
 * ultimately depends on, so it's tested directly rather than only
 * indirectly through page-level tests.
 */
describe("apiClient error parsing against the confirmed envelope", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("reads error.code, error.message, and error.requestId from the nested envelope", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid credentials.",
            requestId: "req-123",
          },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    );

    await expect(apiClient.get("/whatever", { skipAuth: true, skipAuthRetry: true })).rejects.toMatchObject({
      category: "UNAUTHENTICATED",
      message: "Invalid credentials.",
      details: { code: "INVALID_CREDENTIALS", requestId: "req-123" },
    });
  });

  it("does not read a top-level message/code (the old, wrong assumed shape)", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "top-level, should be ignored", code: "IGNORED" }), {
        status: 400,
      })
    );

    try {
      await apiClient.get("/whatever", { skipAuth: true, skipAuthRetry: true });
      throw new Error("expected apiClient.get to reject");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      // No error.error nesting present -> nothing parsed -> falls back to
      // the generic status-derived message, NOT the top-level fields.
      expect(apiErr.message).toBe("Request failed with status 400.");
      expect(apiErr.details?.code).toBeUndefined();
    }
  });

  it("falls back to a status-derived message when the body isn't JSON at all", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("<html>502 Bad Gateway</html>", { status: 502 }));

    await expect(apiClient.get("/whatever", { skipAuth: true, skipAuthRetry: true })).rejects.toMatchObject({
      category: "SERVER_ERROR",
      message: "Request failed with status 502.",
    });
  });

  it("sends the Authorization header as a Bearer token, matching the confirmed contract", async () => {
    useAuthStore.getState().setSession(
      { id: "u1", tenantId: "t1", role: "RETAILER" },
      { accessToken: "abc123", refreshToken: "rtok" }
    );
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    global.fetch = fetchMock;

    await apiClient.get("/deliveries");

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = requestInit.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer abc123");
  });

  it("builds the request URL against the confirmed /api/v1 base", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    global.fetch = fetchMock;

    await apiClient.get("/deliveries", { skipAuth: true });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("http://localhost:3000/api/v1/deliveries");
  });

  it("preserves the /api/v1 base for nested-path endpoints too (e.g. /deliveries/:id/assign)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    global.fetch = fetchMock;

    await apiClient.post("/deliveries/abc-123/assign", { riderId: "r1" }, { skipAuth: true });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("http://localhost:3000/api/v1/deliveries/abc-123/assign");
  });
});
