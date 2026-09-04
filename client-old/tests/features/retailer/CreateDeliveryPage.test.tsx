import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test-utils";
import { CreateDeliveryPage } from "@/features/retailer/CreateDeliveryPage";

vi.mock("@/services/deliveryService", () => ({
  deliveryService: {
    create: vi.fn(),
  },
}));

import { deliveryService } from "@/services/deliveryService";

describe("CreateDeliveryPage validation", () => {
  it("shows required-field errors and does not call the API when required fields are empty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateDeliveryPage />);

    await user.click(screen.getByRole("button", { name: /submit delivery/i }));

    expect(await screen.findByText("Customer name is required.")).toBeInTheDocument();
    expect(screen.getByText("Customer phone is required.")).toBeInTheDocument();
    expect(screen.getByText("Delivery address is required.")).toBeInTheDocument();
    expect(screen.getByText("Item description is required.")).toBeInTheDocument();
    expect(deliveryService.create).not.toHaveBeenCalled();
  });

  it("submits successfully once required fields are filled in", async () => {
    vi.mocked(deliveryService.create).mockResolvedValue({
      id: "d1",
      tenantId: "t1",
      status: "REQUESTED",
      customer: { name: "Jane", phone: "0700000000", address: "Nairobi" },
      itemDescription: "Box of shoes",
      quantity: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const user = userEvent.setup();
    renderWithProviders(<CreateDeliveryPage />);

    await user.type(screen.getByLabelText(/customer name/i), "Jane");
    await user.type(screen.getByLabelText(/customer phone/i), "0700000000");
    await user.type(screen.getByLabelText(/delivery address/i), "Nairobi");
    await user.type(screen.getByLabelText(/item description/i), "Box of shoes");
    await user.clear(screen.getByLabelText(/quantity/i));
    await user.type(screen.getByLabelText(/quantity/i), "2");

    await user.click(screen.getByRole("button", { name: /submit delivery/i }));

    await waitFor(() => expect(deliveryService.create).toHaveBeenCalledTimes(1));
    expect(deliveryService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: { name: "Jane", phone: "0700000000", address: "Nairobi" },
        itemDescription: "Box of shoes",
        quantity: 2,
      })
    );
  });
});
