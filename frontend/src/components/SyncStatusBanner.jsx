import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { subscribeToSync, triggerSync, getTotalPendingCount } from '../utils/syncManager';

export default function SyncStatusBanner() {
  const [status, setStatus] = useState('synced');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToSync((newStatus, count) => {
      setStatus(newStatus);
      setPendingCount(count);
    });

    if (navigator.onLine && getTotalPendingCount() > 0) {
      triggerSync();
    }

    return () => unsubscribe();
  }, []);

  if (status === 'synced' && pendingCount === 0) {
    return null; // Clean UI when everything is synced
  }

  return (
    <div className="w-full bg-base-300/95 backdrop-blur border-b border-base-content/10 px-4 py-2 text-xs flex items-center justify-between z-[9990] transition-all">
      <div className="flex items-center gap-2">
        {status === 'offline' && (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-warning"></span>
            </span>
            <WifiOff className="w-3.5 h-3.5 text-warning" />
            <span className="font-medium text-warning">
              Offline Mode — Changes saved locally {pendingCount > 0 ? `(${pendingCount} pending)` : ''}
            </span>
          </>
        )}

        {status === 'syncing' && (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-info animate-spin" />
            <span className="font-medium text-info">
              Syncing {pendingCount > 0 ? `${pendingCount} items ` : ''}with server...
            </span>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-error" />
            <span className="font-medium text-error">
              Sync pending ({pendingCount} items queued)
            </span>
          </>
        )}

        {status === 'synced' && pendingCount > 0 && (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <span className="font-medium text-success">
              {pendingCount} items pending sync
            </span>
          </>
        )}
      </div>

      {navigator.onLine && status !== 'syncing' && pendingCount > 0 && (
        <button
          onClick={() => triggerSync()}
          className="btn btn-xs btn-ghost text-xs text-base-content/80 hover:text-base-content flex items-center gap-1 py-0 px-2 h-6 min-h-6"
        >
          <RefreshCw className="w-3 h-3" /> Sync Now
        </button>
      )}
    </div>
  );
}
