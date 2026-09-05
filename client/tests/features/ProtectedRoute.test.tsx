import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders } from "../test-utils";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { useAuthStore } from "@/state/authStore";
import { vi } from "vitest";

// AuthProvider no longer makes a network call on mount (there is no
// session-bootstrap endpoint — FRONTEND_API_CONTRACT.md §3), but the
// service module is still mocked here for isolation from the real
// authService, matching the confirmed contract's shape.
vi.mock("@/services/authService", () => ({
  authService: {
    login: vi.fn(),
    signup: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
  },
}));

import { AuthProvider } from "@/features/auth/AuthProvider";

describe("ProtectedRoute", () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  it("redirects an unauthenticated user to /login instead of rendering the protected screen", async () => {
    renderWithProviders(
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Login screen</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/retailer" element={<div>Retailer dashboard</div>} />
          </Route>
        </Routes>
      </AuthProvider>,
      { route: "/retailer" }
    );

    expect(await screen.findByText("Login screen")).toBeInTheDocument();
    expect(screen.queryByText("Retailer dashboard")).not.toBeInTheDocument();
  });
});
