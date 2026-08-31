import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components";

export function UnauthorizedPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
      <span
        aria-hidden="true"
        className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-crimson-100 text-danger"
      >
        <ShieldAlert className="h-6 w-6" />
      </span>
      <h1 className="text-page-title text-foreground">You don't have access to this page</h1>
      <p className="max-w-sm text-supporting text-muted">
        Your account doesn't have permission to view this section. If you think this is a mistake,
        contact your administrator.
      </p>
      <Link to="/">
        <Button variant="secondary" className="mt-2">
          Go back home
        </Button>
      </Link>
    </div>
  );
}
