import { useState } from "react";
import {
  MapPin,
  Phone,
  User,
  Package,
  Clock,
  Truck,
  CheckCircle,
  X,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/db";

const availableRiders = [
  {
    id: "R-01",
    name: "David Mutua",
    phone: "0700111222",
    zone: "CBD / Upperhill",
  },
  {
    id: "R-02",
    name: "Alice Wambui",
    phone: "0733444555",
    zone: "Westlands / Parklands",
  },
];

export default function DispatcherDashboard() {
  const queryClient = useQueryClient();
  const [assigningRequestId, setAssigningRequestId] = useState<string | null>(
    null,
  );

  // 1. Fetch all deliveries from the database
  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["deliveries"],
    queryFn: api.getDeliveries,
  });

  // Filter to only show unassigned packages
  const openRequests = deliveries.filter((req) => req.status === "REQUESTED");

  // 2. Setup the mutation to assign a rider
  const assignMutation = useMutation({
    mutationFn: ({ id, riderId }: { id: string; riderId: string }) =>
      api.updateDelivery(id, { status: "ASSIGNED", riderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      setAssigningRequestId(null); // Close the modal
    },
  });

  const confirmAssignment = (riderId: string) => {
    if (assigningRequestId) {
      assignMutation.mutate({ id: assigningRequestId, riderId });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative">
      <header className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Open Requests</p>
            <p className="text-2xl font-bold text-gray-900">
              {openRequests.length}
            </p>
          </div>
          <div className="bg-amber-100 p-3 rounded-lg text-amber-600">
            <Package size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Active Riders</p>
            <p className="text-2xl font-bold text-gray-900">
              {availableRiders.length}
            </p>
          </div>
          <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
            <Truck size={24} />
          </div>
        </div>
      </header>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">Dispatch Queue</h2>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        ) : openRequests.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CheckCircle size={48} className="mx-auto text-green-400 mb-3" />
            <p className="text-lg font-medium text-gray-900">Queue is empty</p>
            <p>All requested deliveries have been assigned to riders.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {openRequests.map((req) => (
              <div
                key={req.id}
                className="p-5 hover:bg-blue-50/50 transition-colors grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
              >
                <div className="md:col-span-2">
                  <span className="font-bold text-gray-900 block">
                    {req.id}
                  </span>
                  <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded inline-block mt-1">
                    {req.status}
                  </span>
                </div>
                <div className="md:col-span-4 space-y-1">
                  <p className="text-sm text-gray-900 font-medium flex items-center gap-1.5">
                    <User size={14} className="text-gray-400" />{" "}
                    {req.customerName}
                  </p>
                  <p className="text-sm text-gray-600 flex items-center gap-1.5">
                    <Phone size={14} className="text-gray-400" /> {req.phone}
                  </p>
                </div>
                <div className="md:col-span-4 space-y-1">
                  <p className="text-sm text-gray-900 flex items-center gap-1.5">
                    <MapPin size={14} className="text-blue-500" /> {req.address}
                  </p>
                  <p className="text-sm text-gray-600 flex items-center gap-1.5">
                    <Package size={14} className="text-gray-400" />{" "}
                    {req.itemDescription}
                  </p>
                </div>
                <div className="md:col-span-2 flex flex-col items-end justify-center gap-2">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock size={12} /> {req.time}
                  </span>
                  <button
                    onClick={() => setAssigningRequestId(req.id)}
                    className="w-full md:w-auto px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Assign Rider
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {assigningRequestId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900">
                Select Rider for {assigningRequestId}
              </h3>
              <button
                onClick={() => setAssigningRequestId(null)}
                className="text-gray-500 hover:text-gray-900 p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-2 max-h-96 overflow-y-auto">
              {availableRiders.map((rider) => (
                <button
                  key={rider.id}
                  onClick={() => confirmAssignment(rider.id)}
                  disabled={assignMutation.isPending}
                  className="w-full text-left p-3 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100 flex justify-between items-center group mb-1 disabled:opacity-50"
                >
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-blue-700">
                      {rider.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {rider.zone} • {rider.phone}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {assignMutation.isPending ? "Assigning..." : "Assign"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
