import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-error/5 border border-error/10 w-full h-full min-h-[150px]">
          <span className="text-xs font-bold text-error uppercase tracking-wider mb-1">Chart Loading Error</span>
          <p className="text-[10px] opacity-60 max-w-xs mb-3">
            Failed to render this component due to a layout calculation error.
          </p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn btn-xs btn-error text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
