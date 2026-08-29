import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Button, Input, Select, Alert, PageHeader, Card } from "@/components";
import { createDeliverySchema, toCreateDeliveryInput, type CreateDeliveryFormValues } from "./createDeliverySchema";
import { useCreateDelivery } from "./useRetailerDeliveries";
import { ApiError, API_ERROR_MESSAGES } from "@/api/errors";
import { useToastStore } from "@/components/Toast";

export function CreateDeliveryPage() {
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.push);
  const createDelivery = useCreateDelivery();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateDeliveryFormValues>({ resolver: zodResolver(createDeliverySchema) });

  const onSubmit = async (values: CreateDeliveryFormValues) => {
    try {
      const delivery = await createDelivery.mutateAsync(toCreateDeliveryInput(values));
      pushToast("success", "Delivery created.");
      navigate(`/retailer/confirm/${delivery.id}`);
    } catch {
      // Error surfaced via createDelivery.isError below; nothing more to do here —
      // duplicate-submission is prevented by isSubmitting disabling the button.
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Create delivery" context="Fill in the details for a new delivery request" />

      {createDelivery.isError && (
        <Alert tone="danger" className="mb-4">
          {createDelivery.error instanceof ApiError
            ? API_ERROR_MESSAGES[createDelivery.error.category]
            : "Couldn't create the delivery. Please try again."}
        </Alert>
      )}

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 text-caption uppercase tracking-wide text-muted">Required</legend>
            <Input label="Customer name" required error={errors.customerName?.message} {...register("customerName")} />
            <Input
              label="Customer phone"
              required
              type="tel"
              error={errors.customerPhone?.message}
              {...register("customerPhone")}
            />
            <Input
              label="Delivery address"
              required
              error={errors.deliveryAddress?.message}
              {...register("deliveryAddress")}
            />
            <Input
              label="Item description"
              required
              error={errors.itemDescription?.message}
              {...register("itemDescription")}
            />
            <Input
              label="Quantity"
              required
              type="number"
              min={1}
              error={errors.quantity?.message}
              {...register("quantity")}
            />
          </fieldset>

          <fieldset className="flex flex-col gap-4 border-t border-border pt-4">
            <legend className="mb-1 text-caption uppercase tracking-wide text-muted">Optional</legend>
            <Input label="Item category" {...register("itemCategory")} />
            <Input
              label="Approximate weight (kg)"
              type="number"
              step="0.1"
              hint="Leave blank if unknown"
              {...register("approxWeightKg")}
            />
            <Input label="Declared value" type="number" step="1" {...register("declaredValue")} />
            <Select
              label="Priority"
              options={[
                { value: "STANDARD", label: "Standard" },
                { value: "URGENT", label: "Urgent" },
              ]}
              {...register("priority")}
            />
            <Select
              label="Payment preference"
              options={[
                { value: "CASH_ON_DELIVERY", label: "Cash on delivery" },
                { value: "MOBILE_MONEY", label: "Mobile money" },
                { value: "PREPAID", label: "Prepaid" },
              ]}
              {...register("paymentPreference")}
            />
            <label className="flex items-center gap-2 text-body text-foreground">
              <input type="checkbox" className="accent-primary" {...register("fragile")} /> Fragile
            </label>
            <label className="flex items-center gap-2 text-body text-foreground">
              <input type="checkbox" className="accent-primary" {...register("perishable")} /> Perishable
            </label>
            <Input label="Special instructions" {...register("specialInstructions")} />
          </fieldset>

          <Button type="submit" isLoading={isSubmitting} className="mt-2">
            Submit delivery
          </Button>
        </form>
      </Card>
    </div>
  );
}
