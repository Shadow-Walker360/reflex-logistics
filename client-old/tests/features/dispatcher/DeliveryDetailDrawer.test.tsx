import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, createTestQueryClient } from "../../test-utils";
import { DeliveryDetailDrawer } from "@/features/dispatcher/DeliveryDetailDrawer";
import { ApiError } from "@/api/errors";
import type { Delivery, Rider } from "@/types";

vi.mock("@/services/deliveryService", () => ({
  deliveryService: { getById: vi.fn(), assign: vi.fn() },
}));
vi.mock("@/services/riderService", () => ({
  riderService: { list: vi.fn() },
}));

import { deliveryService } from "@/services/deliveryService";
import { riderService } from "@/services/riderService";

const baseDelivery: Delivery = {
  id: "d1",
  tenantId: "t1",
  status: "REQUESTED",
  customer: { name: "Wanjiru", phone: "0711000000", address: "Eldoret" },
  itemDescription: "Electronics parcel",
  quantity: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const riders: Rider[] = [
  { id: "r1", name: "Kevin", phone: "0700", availability: "AVAILABLE", workloadCount: 1 },
];

describe("Dispatcher assignment 409 conflict flow", () => {
  it("tells the dispatcher the delivery changed, refetches it, and never shows the assignment as successful", async () => {
    const queryClient = createTestQueryClient();

    vi.mocked(deliveryService.getById)
      // First load: unassigned, assignable.
      .mockResolvedValueOnce(baseDelivery)
      // Refetch after the 409: backend's authoritative state — already assigned to someone else.
      .mockResolvedValueOnce({ ...baseDelivery, status: "ASSIGNED", assignedRiderId: "someone-else" });

    vi.mocked(riderService.list).mockResolvedValue(riders);

    vi.mocked(deliveryService.assign).mockRejectedValue(
      new ApiError("Delivery was already assigned.", "CONFLICT", { status: 409 })
    );

    const user = userEvent.setup();
    renderWithProviders(<DeliveryDetailDrawer deliveryId="d1" onClose={() => {}} />, { queryClient });

    // Wait for the initial delivery + rider list to load.
    await screen.findByText("Wanjiru");
    const select = await screen.findByLabelText(/rider/i);
    await user.selectOptions(select, "r1");

    await user.click(screen.getByRole("button", { name: /assign/i }));

    // The conflict banner must appear — the UI must not pretend success.
    await screen.findByText(/just updated elsewhere/i);

    // The delivery detail must reflect the refetched, authoritative
    // (now-assigned-to-someone-else) state, not a locally-applied optimistic assignment.
    await waitFor(() => expect(deliveryService.getById).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Assigned")).toBeInTheDocument();

    // Never render a success toast/indicator for a failed assignment.
    expect(screen.queryByText(/assigned successfully/i)).not.toBeInTheDocument();
  });
});
