import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { RoleRoute } from "@/features/auth/RoleRoute";
import { LoginPage } from "@/features/auth/LoginPage";
import { SignUpPage } from "@/features/auth/SignUpPage";
import { UnauthorizedPage } from "@/pages/UnauthorizedPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

import { RetailerLayout } from "@/layouts/RetailerLayout";
import { RetailerDashboardPage } from "@/features/retailer/RetailerDashboardPage";
import { CreateDeliveryPage } from "@/features/retailer/CreateDeliveryPage";
import { DeliveryConfirmationPage } from "@/features/retailer/DeliveryConfirmationPage";
import { DeliveryTrackingPage } from "@/features/retailer/DeliveryTrackingPage";
import { DeliveryHistoryPage } from "@/features/retailer/DeliveryHistoryPage";

import { DispatcherLayout } from "@/layouts/DispatcherLayout";
import { DispatchCenterPage } from "@/features/dispatcher/DispatchCenterPage";
import { IncidentsPage } from "@/features/dispatcher/IncidentsPage";

import { RiderLayout } from "@/layouts/RiderLayout";
import { AssignedDeliveriesPage } from "@/features/rider/AssignedDeliveriesPage";
import { RiderDeliveryDetailsPage } from "@/features/rider/RiderDeliveryDetailsPage";
import { ProofOfDeliveryPage } from "@/features/rider/ProofOfDeliveryPage";
import { IncidentReportingPage } from "@/features/rider/IncidentReportingPage";

import { AdminLayout } from "@/layouts/AdminLayout";

/**
 * Route tree. Every role subtree is nested under ProtectedRoute (must be
 * authenticated) and RoleRoute (must have the right role) — both are UX
 * gates, not the security boundary (see their docstrings). The backend
 * independently authorizes every request these screens make.
 */
export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignUpPage /> },
  { path: "/unauthorized", element: <UnauthorizedPage /> },

  {
    element: <ProtectedRoute />,
    children: [
      { path: "/", element: <Navigate to="/login" replace /> },

      {
        element: <RoleRoute allow={["RETAILER"]} />,
        children: [
          {
            path: "/retailer",
            element: <RetailerLayout />,
            children: [
              { index: true, element: <RetailerDashboardPage /> },
              { path: "create", element: <CreateDeliveryPage /> },
              { path: "confirm/:deliveryId", element: <DeliveryConfirmationPage /> },
              { path: "track/:deliveryId", element: <DeliveryTrackingPage /> },
              { path: "history", element: <DeliveryHistoryPage /> },
            ],
          },
        ],
      },

      {
        element: <RoleRoute allow={["DISPATCHER"]} />,
        children: [
          {
            path: "/dispatcher",
            element: <DispatcherLayout />,
            children: [
              { index: true, element: <DispatchCenterPage /> },
              { path: "incidents", element: <IncidentsPage /> },
            ],
          },
        ],
      },

      {
        element: <RoleRoute allow={["RIDER"]} />,
        children: [
          {
            path: "/rider",
            element: <RiderLayout />,
            children: [
              { index: true, element: <AssignedDeliveriesPage /> },
              { path: "deliveries/:deliveryId", element: <RiderDeliveryDetailsPage /> },
              { path: "deliveries/:deliveryId/confirm", element: <ProofOfDeliveryPage /> },
              { path: "deliveries/:deliveryId/incident", element: <IncidentReportingPage /> },
            ],
          },
        ],
      },

      {
        // Placeholder only — see AdminLayout docstring.
        element: <RoleRoute allow={["SUPPORT_ADMIN", "MANAGER_ADMIN", "SYSTEM_ADMIN"]} />,
        children: [{ path: "/admin", element: <AdminLayout /> }],
      },
    ],
  },

  { path: "*", element: <NotFoundPage /> },
]);
