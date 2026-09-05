import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders } from "../../test-utils";
import { SignUpPage } from "@/features/auth/SignUpPage";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { useAuthStore } from "@/state/authStore";
import { ApiError } from "@/api/errors";

vi.mock("@/services/authService", () => ({
  authService: {
    getCurrentUser: vi.fn(() => Promise.reject(new ApiError("no session", "UNAUTHENTICATED"))),
    login: vi.fn(),
    register: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
  },
}));

import { authService } from "@/services/authService";

function renderSignUpPage() {
  return renderWithProviders(
    <AuthProvider>
      <Routes>
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/retailer" element={<div>Retailer dashboard</div>} />
        <Route path="/dispatcher" element={<div>Dispatch center</div>} />
        <Route path="/rider" element={<div>Rider home</div>} />
      </Routes>
    </AuthProvider>,
    { route: "/signup" }
  );
}

const okUser = (role: "RETAILER" | "DISPATCHER" | "RIDER") => ({
  id: "u1",
  name: "Amina",
  role,
  tenantId: "t1",
  createdAt: new Date().toISOString(),
});

describe("SignUpPage", () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
    vi.clearAllMocks();
    vi.mocked(authService.getCurrentUser).mockRejectedValue(new ApiError("no session", "UNAUTHENTICATED"));
  });

  it("defaults to the Retailer role and shows the business-name field", async () => {
    renderSignUpPage();
    await screen.findByRole("heading", { name: /create your account/i });

    expect(screen.getByRole("button", { name: /retailer/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/organization invite code/i)).not.toBeInTheDocument();
  });

  it("switches to the invite-code field when Dispatcher or Rider is selected", async () => {
    const user = userEvent.setup();
    renderSignUpPage();
    await screen.findByRole("heading", { name: /create your account/i });

    await user.click(screen.getByRole("button", { name: /dispatcher/i }));

    expect(screen.getByLabelText(/organization invite code/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/business name/i)).not.toBeInTheDocument();
  });

  it("never offers an admin role as a sign-up option", async () => {
    renderSignUpPage();
    await screen.findByRole("heading", { name: /create your account/i });

    expect(screen.queryByRole("button", { name: /admin/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/support_admin|manager_admin|system_admin/i)).not.toBeInTheDocument();
  });

  it("blocks submission and shows validation errors when required fields are empty", async () => {
    const user = userEvent.setup();
    renderSignUpPage();
    await screen.findByRole("heading", { name: /create your account/i });

    await user.click(screen.getByRole("button", { name: /^create account$/i }));

    expect(await screen.findByText("Enter your full name.")).toBeInTheDocument();
    expect(screen.getByText("Enter your business name.")).toBeInTheDocument();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords before calling the API", async () => {
    const user = userEvent.setup();
    renderSignUpPage();
    await screen.findByRole("heading", { name: /create your account/i });

    await user.type(screen.getByLabelText(/full name/i), "Amina Wanjiru");
    await user.type(screen.getByLabelText(/email or phone/i), "amina@example.com");
    await user.type(screen.getByLabelText(/business name/i), "Amina's Shop");
    await user.type(screen.getByLabelText(/^password\b/i), "correct-password");
    await user.type(screen.getByLabelText(/confirm password/i), "different-password");
    await user.click(screen.getByRole("button", { name: /^create account$/i }));

    expect(await screen.findByText("Passwords don't match.")).toBeInTheDocument();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it("submits a RETAILER signup with businessName and routes to /retailer", async () => {
    vi.mocked(authService.register).mockResolvedValue({
      user: okUser("RETAILER"),
      accessToken: "tok",
      refreshToken: "rtok",
    });

    const user = userEvent.setup();
    renderSignUpPage();
    await screen.findByRole("heading", { name: /create your account/i });

    await user.type(screen.getByLabelText(/full name/i), "Amina Wanjiru");
    await user.type(screen.getByLabelText(/email or phone/i), "amina@example.com");
    await user.type(screen.getByLabelText(/business name/i), "Amina's Shop");
    await user.type(screen.getByLabelText(/^password\b/i), "correct-password");
    await user.type(screen.getByLabelText(/confirm password/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /^create account$/i }));

    expect(await screen.findByText("Retailer dashboard")).toBeInTheDocument();
    expect(authService.register).toHaveBeenCalledWith(
      expect.objectContaining({ role: "RETAILER", businessName: "Amina's Shop" })
    );
  });

  it("submits a RIDER signup with organizationCode (not a tenant id) and routes to /rider", async () => {
    vi.mocked(authService.register).mockResolvedValue({
      user: okUser("RIDER"),
      accessToken: "tok",
      refreshToken: "rtok",
    });

    const user = userEvent.setup();
    renderSignUpPage();
    await screen.findByRole("heading", { name: /create your account/i });

    await user.click(screen.getByRole("button", { name: /rider/i }));
    await user.type(screen.getByLabelText(/full name/i), "Kevin Otieno");
    await user.type(screen.getByLabelText(/email or phone/i), "0700111222");
    await user.type(screen.getByLabelText(/organization invite code/i), "INVITE-123");
    await user.type(screen.getByLabelText(/^password\b/i), "correct-password");
    await user.type(screen.getByLabelText(/confirm password/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /^create account$/i }));

    expect(await screen.findByText("Rider home")).toBeInTheDocument();
    const call = vi.mocked(authService.register).mock.calls[0]?.[0];
    expect(call).toMatchObject({ role: "RIDER", organizationCode: "INVITE-123" });
    expect(call).not.toHaveProperty("tenantId");
  });

  it("maps a 409 to 'account already exists' copy, not a raw status code", async () => {
    vi.mocked(authService.register).mockRejectedValue(new ApiError("Conflict", "CONFLICT", { status: 409 }));

    const user = userEvent.setup();
    renderSignUpPage();
    await screen.findByRole("heading", { name: /create your account/i });

    await user.type(screen.getByLabelText(/full name/i), "Amina Wanjiru");
    await user.type(screen.getByLabelText(/email or phone/i), "amina@example.com");
    await user.type(screen.getByLabelText(/business name/i), "Amina's Shop");
    await user.type(screen.getByLabelText(/^password\b/i), "correct-password");
    await user.type(screen.getByLabelText(/confirm password/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /^create account$/i }));

    expect(await screen.findByText("An account with that email or phone already exists.")).toBeInTheDocument();
    expect(screen.queryByText(/409/)).not.toBeInTheDocument();
  });

  it("links back to Sign In", async () => {
    renderSignUpPage();
    await screen.findByRole("heading", { name: /create your account/i });

    await userEvent.setup().click(screen.getByRole("link", { name: /sign in/i }));
    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });
});
