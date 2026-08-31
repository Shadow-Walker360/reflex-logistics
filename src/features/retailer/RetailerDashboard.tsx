import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Package, User, MapPin, Phone, Clock, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/db";

const deliverySchema = z.object({
  customerName: z.string().min(2, "Name required"),
  phone: z
    .string()
    .regex(
      /^(?:254|\+254|0)?(7[0-9]{8}|1[0-9]{8})$/,
      "Valid Kenyan number required",
    ),
  address: z.string().min(5, "Address required"),
  itemDescription: z.string().min(3, "Item description required"),
});

type DeliveryFormData = z.infer<typeof deliverySchema>;

export default function RetailerDashboard() {
  const queryClient = useQueryClient();

  // 1. Fetch data from the mock database
  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["deliveries"],
    queryFn: api.getDeliveries,
  });

  // 2. Setup the mutation to save new deliveries
  const createMutation = useMutation({
    mutationFn: api.createDelivery,
    onSuccess: () => {
      // Tell TanStack Query to refresh the list automatically
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DeliveryFormData>({
    resolver: zodResolver(deliverySchema),
  });

  const onSubmit = (data: DeliveryFormData) => {
    createMutation.mutate(data, {
      onSuccess: () => reset(), // Clear form only on success
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Request New Delivery
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name
              </label>
              <input
                {...register("customerName")}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-600 outline-none"
                disabled={createMutation.isPending}
              />
              {errors.customerName && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.customerName.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                {...register("phone")}
                placeholder="07XX XXX XXX"
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-600 outline-none"
                disabled={createMutation.isPending}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.phone.message}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Address
              </label>
              <input
                {...register("address")}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-600 outline-none"
                disabled={createMutation.isPending}
              />
              {errors.address && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.address.message}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Description
              </label>
              <input
                {...register("itemDescription")}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-600 outline-none"
                disabled={createMutation.isPending}
              />
              {errors.itemDescription && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.itemDescription.message}
                </p>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex justify-center items-center gap-2"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Saving...
              </>
            ) : (
              "Submit Request"
            )}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">Delivery History</h2>
          <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
            {deliveries.length}
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        ) : deliveries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package size={40} className="mx-auto text-gray-300 mb-2" />
            <p>No active deliveries.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {deliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="p-4 hover:bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">
                      {delivery.id}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        delivery.status === "DELIVERED"
                          ? "bg-green-100 text-green-800"
                          : delivery.status === "PICKED_UP"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {delivery.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <User size={14} /> {delivery.customerName} •{" "}
                    <Phone size={14} /> {delivery.phone}
                  </p>
                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <MapPin size={14} /> {delivery.address}
                  </p>
                </div>
                <div className="text-right flex flex-row md:flex-col items-center md:items-end justify-between">
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock size={14} /> {delivery.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
