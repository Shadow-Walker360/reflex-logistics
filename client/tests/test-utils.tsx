import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { UserRole } from "@/types";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  { route = "/", queryClient = createTestQueryClient() }: { route?: string; queryClient?: QueryClient } = {}
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

/**
 * Builds a structurally-valid (unsigned) JWT for tests — three
 * dot-separated base64url segments — matching what
 * src/utils/jwt.ts#decodeAccessToken expects. Real signature
 * verification never happens client-side (see that file's docstring),
 * so tests don't need a real signing secret either; only the payload
 * segment's shape matters.
 */
export function fakeAccessToken(payload: {
  sub: string;
  tenantId: string;
  role: UserRole;
  exp?: number;
}): string {
  const base64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const header = base64url({ alg: "HS256", typ: "JWT" });
  const body = base64url({
    sub: payload.sub,
    tenantId: payload.tenantId,
    role: payload.role,
    type: "access",
    iat: Math.floor(Date.now() / 1000),
    exp: payload.exp ?? Math.floor(Date.now() / 1000) + 900,
  });
  return `${header}.${body}.fake-signature-not-verified-client-side`;
}
