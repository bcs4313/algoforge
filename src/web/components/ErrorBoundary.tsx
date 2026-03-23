import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-8">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-lg">
            <h2 className="text-red-400 font-bold text-lg mb-2">Something went wrong</h2>
            <pre className="text-red-300 text-xs overflow-auto whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
