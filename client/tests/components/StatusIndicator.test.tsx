import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusIndicator } from "@/components/StatusIndicator";

describe("StatusIndicator", () => {
  it.each([
    ["REQUESTED", "Requested"],
    ["IN_TRANSIT", "In transit"],
    ["DELIVERED", "Delivered"],
    ["FAILED", "Failed"],
    ["REASSIGNMENT_REQUIRED", "Needs reassignment"],
  ] as const)("renders the human-readable label for %s", (status, label) => {
    render(<StatusIndicator status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("marks exceptional statuses distinctly from normal ones, not just by color", () => {
    render(<StatusIndicator status="FAILED" />);
    const label = screen.getByText("Failed");
    // Exceptional statuses get a bolder font-weight in addition to color,
    // per the accessibility rule that color is never the only signal.
    expect(label.className).toContain("font-semibold");

    render(<StatusIndicator status="REQUESTED" />);
    const normalLabel = screen.getByText("Requested");
    expect(normalLabel.className).toContain("font-medium");
    expect(normalLabel.className).not.toContain("font-semibold");
  });
});
