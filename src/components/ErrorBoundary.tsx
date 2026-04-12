import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { captureException } from "../lib/monitoring";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isOffline: boolean;
}

/**
 * Global Error Boundary — catches React rendering errors and shows
 * a recovery UI instead of a blank screen. Also detects offline status.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isOffline: !navigator.onLine };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    captureException(error, {
      component: "ErrorBoundary",
      componentStack: errorInfo.componentStack,
    });
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught:", error, errorInfo);
    }
  }

  componentDidMount() {
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
  }

  handleOnline = () => this.setState({ isOffline: false });
  handleOffline = () => this.setState({ isOffline: true });

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.isOffline) {
      return (
        <div className="h-screen bg-white flex flex-col items-center justify-center p-6">
          <div className="text-center max-w-md">
            <WifiOff className="mx-auto h-16 w-16 text-amber-500 mb-6" />
            <h1 className="text-2xl font-black text-slate-800 mb-3 uppercase tracking-tight">
              You're Offline
            </h1>
            <p className="text-slate-500 mb-8">
              Check your internet connection and try again. The app will
              reconnect automatically.
            </p>
            <div className="inline-block bg-amber-50 px-6 py-3 rounded-2xl">
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                Waiting for connection…
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (this.state.hasError) {
      if (this.props.fallback) return <>{this.props.fallback}</>;

      return (
        <div className="h-screen bg-white flex flex-col items-center justify-center p-6">
          <div className="text-center max-w-md">
            <AlertTriangle className="mx-auto h-16 w-16 text-red-400 mb-6" />
            <h1 className="text-2xl font-black text-slate-800 mb-3 uppercase tracking-tight">
              Something Went Wrong
            </h1>
            <p className="text-slate-500 mb-8">
              An unexpected error occurred. This has been logged and our team
              will look into it.
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 bg-teal-700 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-teal-800 transition-colors"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
