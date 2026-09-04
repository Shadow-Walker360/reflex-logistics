import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Alert } from "@/components";

export interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  /** Shown as a prominent banner for documents that are explicitly not
   * finished/reviewed — see each document's own draft-status notes. */
  draftNotice?: string;
  children: ReactNode;
}

/**
 * Shared shell for all legal/policy pages. These are public routes (not
 * behind ProtectedRoute) since a prospective user needs to read them
 * before creating an account, and existing users may need to reference
 * them without being logged in.
 *
 * IMPORTANT — see client/README.md "Legal documents" section: the text
 * rendered by these pages is DRAFT content written to give the team a
 * starting point, not reviewed or approved legal advice. It must go
 * through actual legal review (Kenyan Data Protection Act compliance,
 * labor/liability law for the Rider Agreement especially) before this
 * app is used with real users.
 */
export function LegalLayout({ title, lastUpdated, draftNotice, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-page-pad py-10">
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-1.5 text-supporting font-medium text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to sign in
        </Link>

        {draftNotice && (
          <Alert tone="warning" className="mb-6">
            <strong>Draft — not yet legally reviewed.</strong> {draftNotice}
          </Alert>
        )}

        <h1 className="text-page-title text-foreground">{title}</h1>
        <p className="mt-1 text-supporting text-muted">Last updated: {lastUpdated}</p>

        <div className="prose-legal mt-8 flex flex-col gap-5 text-body text-graphite-700">{children}</div>
      </div>
    </div>
  );
}

/** Section heading used throughout the legal documents for consistent hierarchy. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-section-title text-foreground">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
