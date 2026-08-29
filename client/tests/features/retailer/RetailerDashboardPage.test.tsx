import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test-utils";
import { RetailerDashboardPage } from "@/features/retailer/RetailerDashboardPage";
import { ApiError } from "@/api/errors";

vi.mock("@/services/deliveryService", () => ({
  deliveryService: { list: vi.fn() },
}));

import { deliveryService } from "@/services/deliveryService";

describe("RetailerDashboardPage", () => {
  it("shows an empty-state message, not a generic error, when there are no active deliveries", async () => {
    vi.mocked(deliveryService.list).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
    });

    renderWithProviders(<RetailerDashboardPage />);

    expect(await screen.findByText("You have no active deliveries.")).toBeInTheDocument();
  });

  it("shows a plain-language error message (not a raw status code) when the request fails", async () => {
    vi.mocked(deliveryService.list).mockRejectedValue(
      new ApiError("Server exploded", "SERVER_ERROR", { status: 500 })
    );

    renderWithProviders(<RetailerDashboardPage />);

    await waitFor(() =>
      expect(
        screen.getAllByText("Something went wrong on our end. Please try again shortly.").length
      ).toBeGreaterThan(0)
    );
    expect(screen.queryByText(/500/)).not.toBeInTheDocument();
  });
});
