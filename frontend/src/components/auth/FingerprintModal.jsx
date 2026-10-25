import React, { useState, useEffect, useCallback } from 'react';
import { Fingerprint, CheckCircle2, AlertCircle, X, RefreshCw } from 'lucide-react';
import { verifyBiometrics } from '../../utils/biometricAuth';

export default function FingerprintModal({
  isOpen,
  onClose,
  onSuccess,
  title = 'Fingerprint Verification',
  subtitle = 'Touch the fingerprint sensor to continue',
  email = 'user@nexuswealth.app'
}) {
  const [status, setStatus] = useState('scanning'); // 'scanning' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  const startScan = useCallback(async () => {
    setStatus('scanning');
    setErrorMessage('');

    const result = await verifyBiometrics(subtitle, email);
    if (result.success) {
      setStatus('success');
      setTimeout(() => {
        onSuccess?.();
      }, 300);
    } else {
      setStatus('error');
      setErrorMessage(result.error || 'Fingerprint not recognized. Please try again.');
    }
  }, [subtitle, email, onSuccess]);

  useEffect(() => {
    if (isOpen) {
      startScan();
    } else {
      setStatus('scanning');
      setErrorMessage('');
    }
  }, [isOpen, startScan]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4 font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="bg-base-300 border border-base-content/15 rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl p-6 flex flex-col items-center text-center space-y-5 relative animate-slideUp">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-base-content"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1 pt-1">
          <h3 className="text-base font-extrabold text-base-content tracking-wide">{title}</h3>
          <p className="text-xs text-base-content/60">
            {status === 'scanning' && subtitle}
            {status === 'success' && 'Identity verified!'}
            {status === 'error' && 'Verification paused'}
          </p>
        </div>

        {/* Sensor Icon Graphic */}
        <div className="py-4 flex flex-col items-center justify-center">
          {status === 'scanning' && (
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-20 w-20 rounded-full bg-primary-app/20"></span>
              <div className="w-20 h-20 rounded-full bg-primary-app/15 border-2 border-primary-app/50 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.3)]">
                <Fingerprint className="w-10 h-10 text-primary-app animate-pulse" />
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all scale-105">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
          )}

          {status === 'error' && (
            <div className="w-20 h-20 rounded-full bg-danger-app/15 border-2 border-danger-app/50 flex items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.3)]">
              <AlertCircle className="w-10 h-10 text-danger-app" />
            </div>
          )}
        </div>

        {/* Status / Error Message */}
        {status === 'error' && errorMessage && (
          <div className="bg-danger-app/10 border border-danger-app/25 rounded-xl px-3 py-2 text-xs text-danger-app font-medium w-full">
            {errorMessage}
          </div>
        )}

        {status === 'scanning' && (
          <p className="text-[11px] font-semibold text-primary-app uppercase tracking-widest">
            Waiting for sensor...
          </p>
        )}

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2 pt-2 border-t border-base-content/10">
          {status === 'error' && (
            <button
              type="button"
              onClick={startScan}
              className="w-full py-2.5 rounded-xl bg-primary-app text-slate-950 font-bold text-xs uppercase tracking-wider hover:bg-cyan-400 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Scan Fingerprint Again</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-base-200 hover:bg-base-100 text-base-content/70 hover:text-base-content font-bold text-xs uppercase tracking-wider transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
