import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-black text-white p-8 text-center">
            <div className="space-y-4">
                <h2 className="text-2xl font-serif italic">Something went wrong.</h2>
                <p className="text-sm text-gray-400">The reader feed encountered an unexpected error.</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-white text-black font-bold rounded-full text-xs uppercase tracking-widest"
                >
                    Reload App
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}
