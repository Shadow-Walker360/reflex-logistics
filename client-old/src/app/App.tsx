import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { createQueryClient } from "./queryClient";
import { ErrorBoundary } from "./ErrorBoundary";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { router } from "@/routes";

const queryClient = createQueryClient();

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
