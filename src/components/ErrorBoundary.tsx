import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Keep this minimal; logs help diagnose blank-screen issues in preview/published builds.
    console.error("[ErrorBoundary] Uncaught render error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo?.componentStack);
  }

  private handleReload = () => {
    // Hard reload to bust stale cached bundles in some hosting situations.
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
          <div className="max-w-lg w-full rounded-2xl border border-border bg-card p-6 shadow-lg">
            <h1 className="font-display text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">
              The app hit a runtime error. Reloading will usually fix it (especially after an update).
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 bg-primary text-primary-foreground"
            >
              Reload
            </button>

            {import.meta.env.DEV && this.state.error?.message ? (
              <pre className="mt-4 text-xs overflow-auto rounded-xl bg-muted p-3 text-foreground">
                {this.state.error.message}
              </pre>
            ) : null}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
