import { useState } from "react";
import {
  MapPin,
  Phone,
  Package,
  CheckCircle,
  Store,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/db";

// Simulate a logged-in user
const CURRENT_RIDER_ID = "R-01";

export default function RiderDashboard() {
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const queryClient = useQueryClient();

  // 1. Fetch all database records
  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["deliveries"],
    queryFn: api.getDeliveries,
  });

  // 2. Filter data specifically for this rider
  const myTasks = deliveries.filter((d) => d.riderId === CURRENT_RIDER_ID);
  const activeTasks = myTasks.filter(
    (t) => t.status === "ASSIGNED" || t.status === "PICKED_UP",
  );
  const completedTasks = myTasks.filter((t) => t.status === "DELIVERED");
  const displayTasks = activeTab === "active" ? activeTasks : completedTasks;

  // 3. Setup the mutation to update package status
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      newStatus,
    }: {
      id: string;
      newStatus: "PICKED_UP" | "DELIVERED";
    }) => api.updateDelivery(id, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });

  const handleUpdateStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ASSIGNED" ? "PICKED_UP" : "DELIVERED";
    updateMutation.mutate({ id, newStatus });
  };

  return (
    <div className="max-w-md mx-auto space-y-4 pb-20">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
        <h1 className="text-xl font-bold text-gray-900 mb-4">My Deliveries</h1>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === "active" ? "bg-white text-gray-900 shadow" : "text-gray-500"}`}
          >
            Active ({activeTasks.length})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === "completed" ? "bg-white text-gray-900 shadow" : "text-gray-500"}`}
          >
            Completed ({completedTasks.length})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 flex justify-center">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : displayTasks.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-xl border border-gray-100">
          <CheckCircle size={40} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500">No {activeTab} tasks.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div
                className={`p-3 text-white flex justify-between items-center ${task.status === "ASSIGNED" ? "bg-amber-500" : task.status === "PICKED_UP" ? "bg-blue-600" : "bg-green-500"}`}
              >
                <span className="font-bold">{task.id}</span>
                <span className="text-xs font-bold uppercase tracking-wider">
                  {task.status.replace("_", " ")}
                </span>
              </div>

              <div className="p-4 space-y-4">
                <div className="relative pl-6 border-l-2 border-gray-200 ml-2 space-y-1">
                  <div className="absolute -left-2.25 top-0 bg-white p-0.5">
                    <Store size={14} className="text-amber-500" />
                  </div>
                  <p className="text-xs font-bold text-gray-500 uppercase">
                    Pickup
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    Retailer Hub
                  </p>
                </div>

                <div className="relative pl-6 border-l-2 border-transparent ml-2 space-y-1">
                  <div className="absolute -left-2.25 top-0 bg-white p-0.5">
                    <MapPin size={14} className="text-blue-500" />
                  </div>
                  <p className="text-xs font-bold text-gray-500 uppercase">
                    Dropoff
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {task.customerName}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">{task.address}</p>

                  <a
                    href={`tel:${task.phone}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100"
                  >
                    <Phone size={14} /> Call: {task.phone}
                  </a>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg flex items-center gap-2 mt-4 border border-gray-100">
                  <Package size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-700 font-medium">
                    {task.itemDescription}
                  </span>
                </div>

                {task.status !== "DELIVERED" && (
                  <button
                    onClick={() => handleUpdateStatus(task.id, task.status)}
                    disabled={updateMutation.isPending}
                    className={`w-full py-3.5 rounded-xl text-white font-bold text-lg flex justify-center items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 ${
                      task.status === "ASSIGNED"
                        ? "bg-blue-600"
                        : "bg-green-500"
                    }`}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : task.status === "ASSIGNED" ? (
                      "Confirm Pick Up"
                    ) : (
                      "Scan to Deliver"
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
