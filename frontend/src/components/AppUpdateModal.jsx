import React, { useState } from 'react';
import { Sparkles, DownloadCloud, AlertCircle, X } from 'lucide-react';
import { installUpdate } from '../utils/appUpdateManager';
import { isNativeApp } from '../utils/pwaUtils';

export default function AppUpdateModal({
  isOpen,
  updateInfo,
  onClose
}) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  if (!isOpen || !updateInfo) return null;

  const { latest, installed } = updateInfo;

  const handleStartUpdate = async () => {
    setDownloading(true);
    setProgress(0);
    setError('');

    try {
      await installUpdate(latest.downloadUrl, (percent) => {
        setProgress(percent);
      });

      // On native Android, package installer intent takes over
      if (isNativeApp()) {
        setTimeout(() => {
          setDownloading(false);
          onClose();
        }, 1500);
      } else {
        setDownloading(false);
        onClose();
      }
    } catch (err) {
      setDownloading(false);
      setError(err?.message || 'Update download failed. Please check your internet connection.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[10001] flex items-center justify-center p-4 font-sans animate-fade-in">
      <div className="bg-base-300 border border-base-content/15 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 flex flex-col items-center text-center space-y-4 relative animate-slideUp">
        {/* Close Button (disabled while downloading) */}
        {!downloading && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-base-content"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header Icon */}
        <div className="w-16 h-16 rounded-3xl bg-primary-app/15 border-2 border-primary-app/40 flex items-center justify-center text-primary-app shadow-[0_0_20px_rgba(6,182,212,0.25)]">
          <DownloadCloud className="w-8 h-8 animate-bounce" />
        </div>

        {/* Title & Tag */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-app/15 border border-secondary-app/30 text-secondary-app text-[10px] font-black uppercase tracking-wider mb-1">
            <Sparkles className="w-3 h-3" />
            New Version Available
          </div>
          <h3 className="text-lg font-black text-base-content tracking-wide">
            NexusWealth {latest.versionName}
          </h3>
          <p className="text-xs text-base-content/50">
            Current: v{installed.version} {installed.build > 0 ? `(Build ${installed.build})` : ''} → New: v{latest.versionName} {latest.buildNumber > 0 ? `(Build ${latest.buildNumber})` : ''}
          </p>
        </div>

        {/* Release Notes Box */}
        <div className="w-full bg-base-200/80 rounded-2xl p-3 border border-base-content/10 text-left max-h-36 overflow-y-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/40 block mb-1">
            What's New:
          </span>
          <p className="text-xs text-base-content/80 whitespace-pre-line leading-relaxed">
            {latest.releaseNotes || 'Bug fixes, performance improvements, and security enhancements.'}
          </p>
        </div>

        {/* Error notice */}
        {error && (
          <div className="w-full bg-danger-app/10 border border-danger-app/20 rounded-xl p-2.5 flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 text-danger-app shrink-0" />
            <span className="text-xs text-danger-app font-medium leading-tight">{error}</span>
          </div>
        )}

        {/* Progress Bar (while downloading) */}
        {downloading ? (
          <div className="w-full space-y-2 py-2">
            <div className="flex justify-between items-center text-xs font-bold text-base-content">
              <span className="flex items-center gap-1.5 text-primary-app">
                <span className="loading loading-spinner loading-xs"></span>
                Downloading update...
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-base-200 rounded-full h-2.5 overflow-hidden border border-base-content/10">
              <div
                className="bg-primary-app h-full transition-all duration-300 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.7)]"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-base-content/50">
              {progress >= 100 ? 'Launching package installer...' : 'The installer will launch automatically once downloaded.'}
            </p>
          </div>
        ) : (
          <div className="w-full space-y-2 pt-2">
            <button
              type="button"
              onClick={handleStartUpdate}
              className="w-full py-3.5 rounded-2xl bg-primary-app text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-primary-app/25 hover:bg-cyan-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Update Now</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl bg-base-200 hover:bg-base-100 text-base-content/60 hover:text-base-content font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Remind Me Later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
