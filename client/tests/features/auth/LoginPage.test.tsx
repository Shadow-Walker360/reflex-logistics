import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders, fakeAccessToken } from "../../test-utils";
import { LoginPage } from "@/features/auth/LoginPage";
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

function renderLoginPage() {
  return renderWithProviders(
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/retailer" element={<div>Retailer dashboard</div>} />
        <Route path="/dispatcher" element={<div>Dispatch center</div>} />
      </Routes>
    </AuthProvider>,
    { route: "/login" }
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
    vi.clearAllMocks();
  });

  it("renders the sign-in form with organization ID, email, and password — no 'identifier' field", async () => {
    renderLoginPage();
    expect(await screen.findByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/organization id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password\b/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("blocks submission and shows validation errors when fields are empty", async () => {
    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByRole("heading", { name: /welcome back/i });

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Enter your organization ID.")).toBeInTheDocument();
    expect(screen.getByText("Enter your email.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it("rejects an organization ID with invalid characters before calling the API", async () => {
    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByRole("heading", { name: /welcome back/i });

    await user.type(screen.getByLabelText(/organization id/i), "Acme Logistics");
    await user.type(screen.getByLabelText(/^email/i), "owner@acme.example");
    await user.type(screen.getByLabelText(/^password\b/i), "whatever");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/lowercase letters, numbers, and hyphens only/i)
    ).toBeInTheDocument();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it("submits exactly { tenantSlug, email, password } — no identifier field", async () => {
    vi.mocked(authService.login).mockResolvedValue({
      accessToken: fakeAccessToken({ sub: "u1", tenantId: "t1", role: "RETAILER" }),
      refreshToken: "rtok",
    });

    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByRole("heading", { name: /welcome back/i });

    await user.type(screen.getByLabelText(/organization id/i), "acme-logistics");
    await user.type(screen.getByLabelText(/^email/i), "owner@acme-logistics.example");
    await user.type(screen.getByLabelText(/^password\b/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await screen.findByText("Retailer dashboard");
    expect(authService.login).toHaveBeenCalledWith({
      tenantSlug: "acme-logistics",
      email: "owner@acme-logistics.example",
      password: "correct-password",
    });
  });

  it("shows a loading state while signing in", async () => {
    let resolveLogin: (value: Awaited<ReturnType<typeof authService.login>>) => void = () => {};
    vi.mocked(authService.login).mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      })
    );

    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByRole("heading", { name: /welcome back/i });

    await user.type(screen.getByLabelText(/organization id/i), "acme-logistics");
    await user.type(screen.getByLabelText(/^email/i), "owner@acme-logistics.example");
    await user.type(screen.getByLabelText(/^password\b/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    const submitButton = await screen.findByRole("button", { name: /signing in/i });
    expect(submitButton).toBeDisabled();

    resolveLogin({
      accessToken: fakeAccessToken({ sub: "u1", tenantId: "t1", role: "RETAILER" }),
      refreshToken: "rtok",
    });
    await screen.findByText("Retailer dashboard");
  });

  it("maps a 401 to generic 'incorrect' copy that never implies which field was wrong", async () => {
    vi.mocked(authService.login).mockRejectedValue(
      new ApiError("Invalid credentials", "UNAUTHENTICATED", { status: 401 })
    );

    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByRole("heading", { name: /welcome back/i });

    await user.type(screen.getByLabelText(/organization id/i), "acme-logistics");
    await user.type(screen.getByLabelText(/^email/i), "owner@acme-logistics.example");
    await user.type(screen.getByLabelText(/^password\b/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Incorrect organization ID, email, or password.")).toBeInTheDocument();
    expect(screen.queryByText(/401/)).not.toBeInTheDocument();
  });

  it("maps a 403 to an account-lockout message, distinct from generic 'incorrect' copy", async () => {
    vi.mocked(authService.login).mockRejectedValue(
      new ApiError("Account locked", "FORBIDDEN", { status: 403 })
    );

    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByRole("heading", { name: /welcome back/i });

    await user.type(screen.getByLabelText(/organization id/i), "acme-logistics");
    await user.type(screen.getByLabelText(/^email/i), "owner@acme-logistics.example");
    await user.type(screen.getByLabelText(/^password\b/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/temporarily locked after several failed attempts/i)
    ).toBeInTheDocument();
  });

  it("maps a network failure to connection-specific copy", async () => {
    vi.mocked(authService.login).mockRejectedValue(new ApiError("failed to fetch", "NETWORK_ERROR"));

    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByRole("heading", { name: /welcome back/i });

    await user.type(screen.getByLabelText(/organization id/i), "acme-logistics");
    await user.type(screen.getByLabelText(/^email/i), "owner@acme-logistics.example");
    await user.type(screen.getByLabelText(/^password\b/i), "whatever");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText("We couldn't connect to Reflex. Check your connection and try again.")
    ).toBeInTheDocument();
  });

  it("routes a successfully authenticated Retailer (decoded from the access token) to /retailer", async () => {
    vi.mocked(authService.login).mockResolvedValue({
      accessToken: fakeAccessToken({ sub: "u1", tenantId: "t1", role: "RETAILER" }),
      refreshToken: "rtok",
    });

    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByRole("heading", { name: /welcome back/i });

    await user.type(screen.getByLabelText(/organization id/i), "acme-logistics");
    await user.type(screen.getByLabelText(/^email/i), "owner@acme-logistics.example");
    await user.type(screen.getByLabelText(/^password\b/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Retailer dashboard")).toBeInTheDocument();
  });

  it("routes a successfully authenticated Dispatcher to /dispatcher, not the retailer route", async () => {
    vi.mocked(authService.login).mockResolvedValue({
      accessToken: fakeAccessToken({ sub: "u2", tenantId: "t1", role: "DISPATCHER" }),
      refreshToken: "rtok",
    });

    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByRole("heading", { name: /welcome back/i });

    await user.type(screen.getByLabelText(/organization id/i), "acme-logistics");
    await user.type(screen.getByLabelText(/^email/i), "kevin@acme-logistics.example");
    await user.type(screen.getByLabelText(/^password\b/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Dispatch center")).toBeInTheDocument();
    expect(screen.queryByText("Retailer dashboard")).not.toBeInTheDocument();
  });

  it("toggles password visibility via the show/hide control", async () => {
    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByRole("heading", { name: /welcome back/i });

    const passwordInput = screen.getByLabelText(/^password\b/i) as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    const toggle = screen.getByRole("button", { name: /show password/i });
    await user.click(toggle);

    expect(passwordInput.type).toBe("text");
    expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();
  });

  it("keeps the sign-in controls keyboard-reachable and correctly labeled for assistive tech", async () => {
    renderLoginPage();
    await screen.findByRole("heading", { name: /welcome back/i });

    const tenantInput = screen.getByLabelText(/organization id/i);
    const emailInput = screen.getByLabelText(/^email/i);
    const passwordInput = screen.getByLabelText(/^password\b/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    for (const el of [tenantInput, emailInput, passwordInput, submitButton]) {
      expect(el).not.toHaveAttribute("aria-hidden");
      expect(el.tabIndex).not.toBe(-1);
    }
  });
});
