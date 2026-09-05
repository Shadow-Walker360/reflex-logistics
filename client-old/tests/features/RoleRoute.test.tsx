import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders } from "../test-utils";
import { RoleRoute } from "@/features/auth/RoleRoute";
import { useAuthStore } from "@/state/authStore";
import type { User } from "@/types";

const retailerUser: User = {
  id: "u1",
  name: "Amina",
  role: "RETAILER",
  tenantId: "t1",
  createdAt: new Date().toISOString(),
};

describe("RoleRoute", () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  it("redirects a Retailer user away from a Dispatcher-only route to their own home", () => {
    useAuthStore.getState().setSession(retailerUser, { accessToken: "tok", refreshToken: "rtok" });

    renderWithProviders(
      <Routes>
        <Route path="/retailer" element={<div>Retailer dashboard</div>} />
        <Route element={<RoleRoute allow={["DISPATCHER"]} />}>
          <Route path="/dispatcher" element={<div>Dispatch center</div>} />
        </Route>
      </Routes>,
      { route: "/dispatcher" }
    );

    expect(screen.getByText("Retailer dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Dispatch center")).not.toBeInTheDocument();
  });

  it("renders the guarded route when the user's role is allowed", () => {
    useAuthStore.getState().setSession(retailerUser, { accessToken: "tok", refreshToken: "rtok" });

    renderWithProviders(
      <Routes>
        <Route element={<RoleRoute allow={["RETAILER"]} />}>
          <Route path="/retailer" element={<div>Retailer dashboard</div>} />
        </Route>
      </Routes>,
      { route: "/retailer" }
    );

    expect(screen.getByText("Retailer dashboard")).toBeInTheDocument();
  });
});
