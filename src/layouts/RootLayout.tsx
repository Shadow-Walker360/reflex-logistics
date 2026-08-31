import { Outlet, Link } from "react-router-dom";

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-blue-600 text-white p-4 flex gap-6">
        <span className="text-2xl font-black tracking-tight text-gray-900 uppercase">
          Reflex
        </span>
        <Link to="/" className="hover:underline">
          Retailer
        </Link>
        <Link to="/dispatcher" className="hover:underline">
          Dispatcher
        </Link>
        <Link to="/rider" className="hover:underline">
          Rider
        </Link>
      </nav>
      <main className="flex-1 p-4 md:p-6">
        {/* The Outlet is where your page content will appear */}
        <Outlet />
      </main>
    </div>
  );
}
