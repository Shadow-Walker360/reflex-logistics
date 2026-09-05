import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // 1. Added imports
import RootLayout from "./layouts/RootLayout";
import RetailerDashboard from "./features/retailer/RetailerDashboard";
import DispatcherDashboard from "./features/dispatcher/DispatcherDashboard";
import RiderDashboard from "./features/rider/RiderDashboard";

// 2. Initialize the query client
const queryClient = new QueryClient();

export default function App() {
  return (
    // 3. Wrap the entire application in the provider
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/" element={<RetailerDashboard />} />
            <Route path="/dispatcher" element={<DispatcherDashboard />} />
            <Route path="/rider" element={<RiderDashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
