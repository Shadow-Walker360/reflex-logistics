import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * App-wide error boundary. Currently just prevents a blank white screen on
 * an uncaught render error; reporting the error to a telemetry backend is
 * future work (Section 24 of the frontend spec — not implemented yet).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("Uncaught render error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-2 px-4 text-center">
          <h1 className="font-display text-lg font-semibold text-graphite-900">Something went wrong</h1>
          <p className="text-sm text-graphite-500">Please refresh the page. If this keeps happening, contact support.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
