import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log sanitized error message without exposing key material or private payloads
    console.error('PRVTCHAT UI Error:', error.message, errorInfo.componentStack);
  }

  private handleReturnHome = () => {
    try {
      window.location.hash = '';
      window.history.replaceState(null, '', window.location.pathname);
    } catch {
      // Ignore
    }
    this.setState({ hasError: false, error: null });
    window.location.href = window.location.pathname;
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-hero-mesh text-[#0B132B] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-black/5 rounded-2xl p-7 text-center space-y-5 shadow-xl animate-scale-in">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 stroke-[1.8]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#0B132B] tracking-tight">Something went wrong</h2>
              <p className="text-xs text-zinc-600 leading-relaxed max-w-sm mx-auto">
                {this.state.error?.message || 'An unexpected rendering error occurred. Your private keys and sensitive content were not transmitted.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                id="error-return-home"
                onClick={this.handleReturnHome}
                className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl btn-outline text-xs font-semibold cursor-pointer transition-all duration-200"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return Home</span>
              </button>
              <button
                type="button"
                id="error-reload"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="btn-pill-black inline-flex items-center gap-2 py-2.5 px-5 text-xs font-semibold cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
