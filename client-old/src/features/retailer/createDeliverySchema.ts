import { z } from "zod";

/**
 * Client-side validation for UX only — the backend re-validates
 * authoritatively (Section 17 of the frontend spec). Required fields match
 * Section 9: customer name, phone, address, item description, quantity.
 * Everything else is optional.
 */
export const createDeliverySchema = z.object({
  customerName: z.string().min(1, "Customer name is required."),
  customerPhone: z.string().min(1, "Customer phone is required."),
  deliveryAddress: z.string().min(1, "Delivery address is required."),
  itemDescription: z.string().min(1, "Item description is required."),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),

  itemCategory: z.string().optional(),
  approxWeightKg: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  fragile: z.boolean().optional(),
  perishable: z.boolean().optional(),
  declaredValue: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  priority: z.enum(["STANDARD", "URGENT"]).optional(),
  paymentPreference: z.enum(["CASH_ON_DELIVERY", "MOBILE_MONEY", "PREPAID"]).optional(),
  specialInstructions: z.string().optional(),
});

export type CreateDeliveryFormValues = z.infer<typeof createDeliverySchema>;

export function toCreateDeliveryInput(values: CreateDeliveryFormValues) {
  return {
    customer: {
      name: values.customerName,
      phone: values.customerPhone,
      address: values.deliveryAddress,
    },
    itemDescription: values.itemDescription,
    quantity: values.quantity,
    itemCategory: values.itemCategory || undefined,
    approxWeightKg: values.approxWeightKg,
    fragile: values.fragile,
    perishable: values.perishable,
    declaredValue: values.declaredValue,
    priority: values.priority,
    paymentPreference: values.paymentPreference,
    specialInstructions: values.specialInstructions || undefined,
  };
}
