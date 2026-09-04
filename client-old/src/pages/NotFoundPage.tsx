import { Link } from "react-router-dom";
import { MapPinOff } from "lucide-react";
import { Button } from "@/components";

export function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
      <span
        aria-hidden="true"
        className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-graphite-100 text-graphite-500"
      >
        <MapPinOff className="h-6 w-6" />
      </span>
      <h1 className="text-page-title text-foreground">Page not found</h1>
      <p className="max-w-sm text-supporting text-muted">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link to="/">
        <Button variant="secondary" className="mt-2">
          Go back home
        </Button>
      </Link>
    </div>
  );
}
