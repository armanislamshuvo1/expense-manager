import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { subscribeToSync, triggerSync, getTotalPendingCount, clearSyncQueue } from '../utils/syncManager';

export default function SyncStatusBanner() {
  const [status, setStatus] = useState('synced');
  const [pendingCount, setPendingCount] = useState(0);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSync((newStatus, count) => {
      setStatus(newStatus);
      setPendingCount(count);
    });

    if (navigator.onLine && getTotalPendingCount() > 0) {
      triggerSync(true);
    }

    return () => unsubscribe();
  }, []);

  const handleManualSync = async (e) => {
    if (e) e.preventDefault();
    setIsManualSyncing(true);
    try {
      await triggerSync(true);
      const remaining = getTotalPendingCount();
      if (remaining === 0) {
        Swal.fire({
          icon: 'success',
          title: 'Synced!',
          text: 'All offline items have been synchronized with the server.',
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      }
    } catch (err) {
      console.error('Manual sync failed:', err);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleDiscardQueue = async (e) => {
    if (e) e.preventDefault();
    const result = await Swal.fire({
      title: 'Discard stuck offline items?',
      text: 'This will remove pending un-synced items from this device if they are corrupted or already saved on the server.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, discard them'
    });

    if (result.isConfirmed) {
      clearSyncQueue();
      setPendingCount(0);
      setStatus('synced');
      Swal.fire({
        icon: 'success',
        title: 'Cleared',
        text: 'Offline sync queue has been cleared.',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
  };

  if (status === 'synced' && pendingCount === 0) {
    return null; // Clean UI when everything is synced
  }

  return (
    <div className="w-full bg-base-300/95 backdrop-blur border-b border-base-content/10 px-4 py-2 text-xs flex items-center justify-between z-[9999] relative pointer-events-auto transition-all">
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

      {pendingCount > 0 && (
        <div className="flex items-center gap-1">
          {navigator.onLine && (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isManualSyncing || status === 'syncing'}
              className="btn btn-xs btn-primary text-xs flex items-center gap-1 py-0 px-2.5 h-7 min-h-7 cursor-pointer z-50 pointer-events-auto"
            >
              <RefreshCw className={`w-3 h-3 ${isManualSyncing || status === 'syncing' ? 'animate-spin' : ''}`} />
              {isManualSyncing || status === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </button>
          )}

          <button
            type="button"
            onClick={handleDiscardQueue}
            title="Discard stuck offline queue"
            className="btn btn-xs btn-ghost text-error/80 hover:text-error hover:bg-error/10 flex items-center gap-1 py-0 px-2 h-7 min-h-7 cursor-pointer z-50 pointer-events-auto"
          >
            <Trash2 className="w-3 h-3" />
            Discard
          </button>
        </div>
      )}
    </div>
  );
}

