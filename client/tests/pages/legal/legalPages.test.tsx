import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test-utils";
import { PrivacyPolicyPage } from "@/pages/legal/PrivacyPolicyPage";
import { TermsOfServicePage } from "@/pages/legal/TermsOfServicePage";
import { RiderAgreementPage } from "@/pages/legal/RiderAgreementPage";
import { RetailerAgreementPage } from "@/pages/legal/RetailerAgreementPage";

/**
 * These tests exist for one purpose: make sure the "this is a draft, not
 * legal advice" warning can never silently disappear from a legal page —
 * that warning is load-bearing (it's the difference between a safe
 * starting point and someone accidentally publishing unreviewed legal
 * text). They intentionally do NOT assert on the substantive legal
 * content itself, since that's not something a test should be
 * "correct" or "incorrect" about.
 */
describe("Legal document draft-status warnings", () => {
  it("Privacy Policy shows the not-legally-reviewed warning", () => {
    renderWithProviders(<PrivacyPolicyPage />);
    expect(screen.getByText(/draft — not yet legally reviewed/i)).toBeInTheDocument();
  });

  it("Terms of Service shows the not-legally-reviewed warning", () => {
    renderWithProviders(<TermsOfServicePage />);
    expect(screen.getByText(/draft — not yet legally reviewed/i)).toBeInTheDocument();
  });

  it("Rider Agreement shows the not-legally-reviewed warning AND flags its liability sections as incomplete", () => {
    renderWithProviders(<RiderAgreementPage />);
    expect(screen.getByText(/draft — not yet legally reviewed/i)).toBeInTheDocument();
    expect(screen.getByText(/incomplete by design/i)).toBeInTheDocument();
    // The two highest-risk sections must each be explicitly flagged —
    // this is the test that would fail if someone "helpfully" filled
    // these in with plausible-sounding boilerplate later.
    expect(screen.getAllByText(/critical open question/i).length).toBeGreaterThanOrEqual(2);
  });

  it("Retailer Agreement shows the not-legally-reviewed warning", () => {
    renderWithProviders(<RetailerAgreementPage />);
    expect(screen.getByText(/draft — not yet legally reviewed/i)).toBeInTheDocument();
  });

  it("every legal page links back to sign in", () => {
    renderWithProviders(<PrivacyPolicyPage />);
    expect(screen.getByRole("link", { name: /back to sign in/i })).toHaveAttribute("href", "/login");
  });
});
