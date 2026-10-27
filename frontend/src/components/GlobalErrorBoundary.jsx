import React from 'react';
import { AlertTriangle, RefreshCw, Trash2, DownloadCloud, Home, ChevronDown, Copy, Check } from 'lucide-react';
import { checkForUpdate, CURRENT_APP_VERSION } from '../utils/appUpdateManager';

export default class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      checkingUpdate: false,
      updateStatus: '',
      updateInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("GlobalErrorBoundary captured error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCacheAndReload = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
      sessionStorage.clear();
      localStorage.removeItem('pwa_chunk_refreshed');
    } catch (_e) {}
    window.location.reload();
  };

  handleCheckUpdate = async () => {
    this.setState({ checkingUpdate: true, updateStatus: '' });
    try {
      const check = await checkForUpdate(true);
      if (check.hasUpdate) {
        this.setState({
          checkingUpdate: false,
          updateInfo: check,
          updateStatus: `New update available: ${check.latest?.tag || 'Latest build'}`
        });
      } else {
        this.setState({
          checkingUpdate: false,
          updateStatus: 'You are already on the latest version.'
        });
      }
    } catch (err) {
      this.setState({
        checkingUpdate: false,
        updateStatus: 'Could not reach update server. Check your connection.'
      });
    }
  };

  handleCopyError = () => {
    const errorText = `${this.state.error?.name || 'Error'}: ${this.state.error?.message || ''}\n\nStack:\n${this.state.error?.stack || ''}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || ''}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(errorText).then(() => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
      });
    }
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'An unexpected rendering error occurred.';
      const errorStack = this.state.error?.stack || '';
      const componentStack = this.state.errorInfo?.componentStack || '';

      return (
        <div className="min-h-screen bg-[#070b13] text-[#e0e6f2] flex items-center justify-center p-4 font-sans select-none">
          <div className="w-full max-w-lg bg-[#0e1626]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Header Icon & Title */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-error/15 border-2 border-error/40 flex items-center justify-center text-error shadow-[0_0_25px_rgba(239,68,68,0.25)]">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">Something Went Wrong</h1>
                <p className="text-xs text-[#94a3b8] mt-1 max-w-xs mx-auto">
                  NexusWealth encountered an unexpected problem rendering this screen.
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="p-3.5 bg-black/40 border border-error/20 rounded-2xl flex items-start gap-3">
              <div className="flex-1 overflow-hidden">
                <span className="text-[10px] font-bold text-error uppercase tracking-wider block">Error Details</span>
                <p className="text-xs font-mono text-error/90 mt-0.5 break-words line-clamp-3">
                  {errorMessage}
                </p>
              </div>
              <button
                type="button"
                onClick={this.handleCopyError}
                className="btn btn-ghost btn-xs text-base-content/60 hover:text-white shrink-0 mt-1"
                title="Copy error details"
              >
                {this.state.copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Update Banner if checked */}
            {this.state.updateStatus && (
              <div className={`p-3 rounded-2xl text-xs font-semibold text-center border ${
                this.state.updateInfo ? 'bg-primary-app/15 border-primary-app/30 text-primary-app' : 'bg-base-200 border-white/5 text-base-content/70'
              }`}>
                {this.state.updateStatus}
                {this.state.updateInfo?.latest?.downloadUrl && (
                  <a
                    href={this.state.updateInfo.latest.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block mt-2 py-2 px-3 bg-primary-app text-slate-950 font-bold rounded-xl text-center hover:opacity-90 transition-all"
                  >
                    Download Latest APK
                  </a>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="btn btn-primary btn-sm rounded-xl font-bold flex items-center justify-center gap-2 h-11 text-xs"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Screen
              </button>

              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="btn btn-outline btn-sm rounded-xl font-bold flex items-center justify-center gap-2 h-11 text-xs border-white/15 hover:bg-white/10"
              >
                <Trash2 className="w-4 h-4" />
                Clear Cache & Reload
              </button>

              <button
                type="button"
                disabled={this.state.checkingUpdate}
                onClick={this.handleCheckUpdate}
                className="btn btn-outline btn-sm rounded-xl font-bold flex items-center justify-center gap-2 h-11 text-xs border-white/15 hover:bg-white/10 text-cyan-400"
              >
                <DownloadCloud className={`w-4 h-4 ${this.state.checkingUpdate ? 'animate-bounce' : ''}`} />
                {this.state.checkingUpdate ? 'Checking...' : 'Check for Updates'}
              </button>

              <button
                type="button"
                onClick={() => { window.location.href = '/login'; }}
                className="btn btn-ghost btn-sm rounded-xl font-bold flex items-center justify-center gap-2 h-11 text-xs text-base-content/70 hover:text-white"
              >
                <Home className="w-4 h-4" />
                Return to Login
              </button>
            </div>

            {/* Technical Stack Disclosure */}
            {(errorStack || componentStack) && (
              <details className="text-[11px] text-base-content/50 border border-white/5 rounded-2xl p-3 bg-black/20">
                <summary className="cursor-pointer font-semibold text-base-content/70 flex items-center justify-between select-none">
                  <span>Stack Trace</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </summary>
                <pre className="mt-2 p-2 bg-black/60 rounded-xl overflow-x-auto text-[10px] text-base-content/60 font-mono whitespace-pre-wrap max-h-40">
                  {errorStack || componentStack}
                </pre>
              </details>
            )}

            <div className="text-center text-[10px] text-base-content/40">
              NexusWealth v{CURRENT_APP_VERSION}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
