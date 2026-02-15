"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class OfflineErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-brand-cream px-6 text-center">
        <h1 className="text-2xl font-semibold text-brand-dark">
          Something went wrong
        </h1>
        {isOffline && (
          <p className="mt-2 text-brand-khaki">
            You appear to be offline. Some features require a connection.
          </p>
        )}
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-md bg-brand-brown px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-brown/90"
        >
          Try Again
        </button>
      </div>
    );
  }
}
