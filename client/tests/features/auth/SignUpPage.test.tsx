import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders, fakeAccessToken } from "../../test-utils";
import { SignUpPage } from "@/features/auth/SignUpPage";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { useAuthStore } from "@/state/authStore";
import { ApiError } from "@/api/errors";

vi.mock("@/services/authService", () => ({
  authService: {
    login: vi.fn(),
    signup: vi.fn(),
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
        <Route path="/admin" element={<div>Admin placeholder</div>} />
      </Routes>
    </AuthProvider>,
    { route: "/signup" }
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/organization name/i), "Acme Logistics");
  await user.type(screen.getByLabelText(/organization id/i), "acme-logistics");
  await user.type(screen.getByLabelText(/your email/i), "owner@acme-logistics.example");
  await user.type(screen.getByLabelText(/^password\b/i), "correct-password");
  await user.type(screen.getByLabelText(/confirm password/i), "correct-password");
  await user.click(screen.getByRole("checkbox", { name: /agree/i }));
}

describe("SignUpPage", () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
    vi.clearAllMocks();
  });

  it("renders the organization-creation form — no role selector", async () => {
    renderSignUpPage();
    await screen.findByRole("heading", { name: /create your organization/i });

    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/organization id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your email/i)).toBeInTheDocument();
    // No role selection anywhere — signup always creates a MANAGER_ADMIN
    // per the confirmed backend contract, it isn't a client choice.
    expect(screen.queryByRole("button", { name: /retailer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dispatcher/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /rider/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/organization invite code/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/business name/i)).not.toBeInTheDocument();
  });

  it("blocks submission and shows validation errors when required fields are empty", async () => {
    const user = userEvent.setup();
    renderSignUpPage();
    await screen.findByRole("heading", { name: /create your organization/i });

    await user.click(screen.getByRole("button", { name: /^create organization$/i }));

    expect(await screen.findByText("Enter your organization's name.")).toBeInTheDocument();
    expect(screen.getByText("Choose an organization ID.")).toBeInTheDocument();
    expect(authService.signup).not.toHaveBeenCalled();
  });

  it("rejects an organization ID with invalid characters (uppercase/spaces) before calling the API", async () => {
    const user = userEvent.setup();
    renderSignUpPage();
    await screen.findByRole("heading", { name: /create your organization/i });

    await user.type(screen.getByLabelText(/organization name/i), "Acme Logistics");
    await user.type(screen.getByLabelText(/organization id/i), "Acme Logistics");
    await user.type(screen.getByLabelText(/your email/i), "owner@acme.example");
    await user.type(screen.getByLabelText(/^password\b/i), "correct-password");
    await user.type(screen.getByLabelText(/confirm password/i), "correct-password");
    await user.click(screen.getByRole("checkbox", { name: /agree/i }));
    await user.click(screen.getByRole("button", { name: /^create organization$/i }));

    expect(await screen.findByText(/lowercase letters, numbers, and hyphens only/i)).toBeInTheDocument();
    expect(authService.signup).not.toHaveBeenCalled();
  });

  it("rejects a password under 8 characters before calling the API", async () => {
    const user = userEvent.setup();
    renderSignUpPage();
    await screen.findByRole("heading", { name: /create your organization/i });

    await user.type(screen.getByLabelText(/organization name/i), "Acme Logistics");
    await user.type(screen.getByLabelText(/organization id/i), "acme-logistics");
    await user.type(screen.getByLabelText(/your email/i), "owner@acme.example");
    await user.type(screen.getByLabelText(/^password\b/i), "short1");
    await user.type(screen.getByLabelText(/confirm password/i), "short1");
    await user.click(screen.getByRole("checkbox", { name: /agree/i }));
    await user.click(screen.getByRole("button", { name: /^create organization$/i }));

    expect(await screen.findByText("Password must be at least 8 characters.")).toBeInTheDocument();
    expect(authService.signup).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords before calling the API", async () => {
    const user = userEvent.setup();
    renderSignUpPage();
    await screen.findByRole("heading", { name: /create your organization/i });

    await user.type(screen.getByLabelText(/organization name/i), "Acme Logistics");
    await user.type(screen.getByLabelText(/organization id/i), "acme-logistics");
    await user.type(screen.getByLabelText(/your email/i), "owner@acme.example");
    await user.type(screen.getByLabelText(/^password\b/i), "correct-password");
    await user.type(screen.getByLabelText(/confirm password/i), "different-password");
    await user.click(screen.getByRole("checkbox", { name: /agree/i }));
    await user.click(screen.getByRole("button", { name: /^create organization$/i }));

    expect(await screen.findByText("Passwords don't match.")).toBeInTheDocument();
    expect(authService.signup).not.toHaveBeenCalled();
  });

  it("blocks submission when the required Terms/Privacy checkbox is unchecked, even with every other field valid", async () => {
    const user = userEvent.setup();
    renderSignUpPage();
    await screen.findByRole("heading", { name: /create your organization/i });

    await user.type(screen.getByLabelText(/organization name/i), "Acme Logistics");
    await user.type(screen.getByLabelText(/organization id/i), "acme-logistics");
    await user.type(screen.getByLabelText(/your email/i), "owner@acme.example");
    await user.type(screen.getByLabelText(/^password\b/i), "correct-password");
    await user.type(screen.getByLabelText(/confirm password/i), "correct-password");
    // Consent checkbox deliberately left unchecked.
    await user.click(screen.getByRole("button", { name: /^create organization$/i }));

    expect(
      await screen.findByText("You must accept the Terms of Service and Privacy Policy to continue.")
    ).toBeInTheDocument();
    expect(authService.signup).not.toHaveBeenCalled();
  });

  it("submits exactly { organizationName, tenantSlug, email, password, acceptedTerms: true } — no role, businessName, or organizationCode", async () => {
    vi.mocked(authService.signup).mockResolvedValue({
      accessToken: fakeAccessToken({ sub: "u1", tenantId: "t1", role: "MANAGER_ADMIN" }),
      refreshToken: "rtok",
    });

    const user = userEvent.setup();
    renderSignUpPage();
    await screen.findByRole("heading", { name: /create your organization/i });

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /^create organization$/i }));

    await screen.findByText("Admin placeholder");
    expect(authService.signup).toHaveBeenCalledWith({
      organizationName: "Acme Logistics",
      tenantSlug: "acme-logistics",
      email: "owner@acme-logistics.example",
      password: "correct-password",
      acceptedTerms: true,
    });
    const call = vi.mocked(authService.signup).mock.calls[0]?.[0];
    expect(call).not.toHaveProperty("role");
    expect(call).not.toHaveProperty("businessName");
    expect(call).not.toHaveProperty("organizationCode");
    expect(call).not.toHaveProperty("confirmPassword");
  });

  it("routes to /admin after signup, since the backend always assigns MANAGER_ADMIN", async () => {
    vi.mocked(authService.signup).mockResolvedValue({
      accessToken: fakeAccessToken({ sub: "u1", tenantId: "t1", role: "MANAGER_ADMIN" }),
      refreshToken: "rtok",
    });

    const user = userEvent.setup();
    renderSignUpPage();
    await screen.findByRole("heading", { name: /create your organization/i });

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /^create organization$/i }));

    expect(await screen.findByText("Admin placeholder")).toBeInTheDocument();
  });

  it("maps a 409 to 'organization ID already taken' copy, not a raw status code", async () => {
    vi.mocked(authService.signup).mockRejectedValue(new ApiError("Conflict", "CONFLICT", { status: 409 }));

    const user = userEvent.setup();
    renderSignUpPage();
    await screen.findByRole("heading", { name: /create your organization/i });

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /^create organization$/i }));

    expect(await screen.findByText("That organization ID is already taken. Please choose another.")).toBeInTheDocument();
    expect(screen.queryByText(/409/)).not.toBeInTheDocument();
  });

  it("links the consent checkbox to Terms and Privacy routes", async () => {
    renderSignUpPage();
    await screen.findByRole("heading", { name: /create your organization/i });

    expect(screen.getByRole("link", { name: /terms of service/i })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute("href", "/privacy");
  });

  it("links back to Sign In", async () => {
    renderSignUpPage();
    await screen.findByRole("heading", { name: /create your organization/i });

    await userEvent.setup().click(screen.getByRole("link", { name: /sign in/i }));
    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });
});
