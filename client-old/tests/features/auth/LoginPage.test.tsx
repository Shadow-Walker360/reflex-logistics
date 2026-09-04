import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders } from "../../test-utils";
import { LoginPage } from "@/features/auth/LoginPage";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { useAuthStore } from "@/state/authStore";
import { ApiError } from "@/api/errors";

vi.mock("@/services/authService", () => ({
  authService: {
    getCurrentUser: vi.fn(() => Promise.reject(new ApiError("no session", "UNAUTHENTICATED"))),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
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
    vi.mocked(authService.getCurrentUser).mockRejectedValue(new ApiError("no session", "UNAUTHENTICATED"));
  });

  it("renders the sign-in form", async () => {
    renderLoginPage();
    expect(await screen.findByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email or phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password\b/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("blocks submission and shows validation errors when fields are empty", async () => {
    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByRole("heading", { name: /welcome back/i });

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Enter your phone number or email.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(authService.login).not.toHaveBeenCalled();
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

    await user.type(screen.getByLabelText(/email or phone/i), "amina@example.com");
    await user.type(screen.getByLabelText(/^password\b/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    const submitButton = await screen.findByRole("button", { name: /signing in/i });
    expect(submitButton).toBeDisabled();

    resolveLogin({
      user: { id: "u1", name: "Amina", role: "RETAILER", tenantId: "t1", createdAt: new Date().toISOString() },
      accessToken: "tok",
      refreshToken: "rtok",
    });
    await screen.findByText("Retailer dashboard");
  });

  it("maps a 401 to plain-language 'incorrect' copy, never a raw status code", async () => {
    vi.mocked(authService.login).mockRejectedValue(new ApiError("Unauthorized", "UNAUTHENTICATED", { status: 401 }));

    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByRole("heading", { name: /welcome back/i });

    await user.type(screen.getByLabelText(/email or phone/i), "amina@example.com");
    await user.type(screen.getByLabelText(/^password\b/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Your email or password is incorrect.")).toBeInTheDocument();
    expect(screen.queryByText(/401/)).not.toBeInTheDocument();
  });

  it("maps a network failure to connection-specific copy", async () => {
    vi.mocked(authService.login).mockRejectedValue(new ApiError("failed to fetch", "NETWORK_ERROR"));

    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByRole("heading", { name: /welcome back/i });

    await user.type(screen.getByLabelText(/email or phone/i), "amina@example.com");
    await user.type(screen.getByLabelText(/^password\b/i), "whatever");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText("We couldn't connect to Reflex. Check your connection and try again.")
    ).toBeInTheDocument();
  });

  it("routes a successfully authenticated Retailer to /retailer", async () => {
    vi.mocked(authService.login).mockResolvedValue({
      user: { id: "u1", name: "Amina", role: "RETAILER", tenantId: "t1", createdAt: new Date().toISOString() },
      accessToken: "tok",
      refreshToken: "rtok",
    });

    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByRole("heading", { name: /welcome back/i });

    await user.type(screen.getByLabelText(/email or phone/i), "amina@example.com");
    await user.type(screen.getByLabelText(/^password\b/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Retailer dashboard")).toBeInTheDocument();
  });

  it("routes a successfully authenticated Dispatcher to /dispatcher, not the retailer route", async () => {
    vi.mocked(authService.login).mockResolvedValue({
      user: { id: "u2", name: "Kevin", role: "DISPATCHER", tenantId: "t1", createdAt: new Date().toISOString() },
      accessToken: "tok",
      refreshToken: "rtok",
    });

    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByRole("heading", { name: /welcome back/i });

    await user.type(screen.getByLabelText(/email or phone/i), "kevin@example.com");
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

  it("keeps the sign-in button keyboard-reachable and correctly labeled for assistive tech", async () => {
    renderLoginPage();
    await screen.findByRole("heading", { name: /welcome back/i });

    const identifierInput = screen.getByLabelText(/email or phone/i);
    const passwordInput = screen.getByLabelText(/^password\b/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    // All three key controls must be real, focusable, non-decorative elements.
    for (const el of [identifierInput, passwordInput, submitButton]) {
      expect(el).not.toHaveAttribute("aria-hidden");
      expect(el.tabIndex).not.toBe(-1);
    }
  });
});
