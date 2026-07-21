import { secureApi } from './apiConfig';

let isSyncing = false;
const listeners = new Set();
let syncStatus = 'synced'; // 'synced' | 'syncing' | 'offline' | 'error'

// Helper to notify listeners of status changes
const notify = () => {
  // Update offline status dynamically if navigator status changes
  const currentStatus = !navigator.onLine ? 'offline' : syncStatus;
  listeners.forEach(cb => cb(currentStatus, getQueue().length));
};

// Generate simple client UUID
export const generateUUID = () => {
  return 'tx_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
};

export const getQueue = () => {
  try {
    return JSON.parse(localStorage.getItem('tx_sync_queue')) || [];
  } catch (e) {
    return [];
  }
};

const saveQueue = (queue) => {
  localStorage.setItem('tx_sync_queue', JSON.stringify(queue));
  notify();
};

export const getCache = () => {
  try {
    return JSON.parse(localStorage.getItem('tx_cache')) || [];
  } catch (e) {
    return [];
  }
};

export const setCache = (transactions) => {
  localStorage.setItem('tx_cache', JSON.stringify(transactions));
};

// Register listener for sync status
export const subscribeToSync = (callback) => {
  listeners.add(callback);
  // Initial notification
  callback(!navigator.onLine ? 'offline' : syncStatus, getQueue().length);
  return () => {
    listeners.delete(callback);
  };
};

// Merge local cache with the pending operations queue for instant UI response
export const getMergedTransactions = () => {
  const cache = getCache();
  const queue = getQueue();
  
  let merged = [...cache];

  // Process queue sequential logic
  queue.forEach(op => {
    if (op.type === 'CREATE') {
      // Avoid duplicate display if it somehow ended up in cache already
      if (!merged.some(t => t.clientTxId === op.clientTxId || t._id === op.clientTxId)) {
        // Prefill accounts and category name if objects aren't populated yet,
        // we can store pre-populated helper labels in op.data for client display
        merged.unshift({
          _id: op.clientTxId,
          clientTxId: op.clientTxId,
          ...op.data,
          accountId: op.data.accountIdObj || { _id: op.data.accountId, name: op.data.accountName },
          toAccountId: op.data.toAccountIdObj || (op.data.toAccountId ? { _id: op.data.toAccountId, name: op.data.toAccountName } : null),
          categoryId: op.data.categoryIdObj || (op.data.categoryId ? { _id: op.data.categoryId, name: op.data.categoryName } : null),
          isPending: true
        });
      }
    } else if (op.type === 'UPDATE') {
      const idx = merged.findIndex(t => t._id === op.id || t.clientTxId === op.clientTxId);
      if (idx !== -1) {
        merged[idx] = {
          ...merged[idx],
          ...op.data,
          accountId: op.data.accountIdObj || { _id: op.data.accountId, name: op.data.accountName },
          toAccountId: op.data.toAccountIdObj || (op.data.toAccountId ? { _id: op.data.toAccountId, name: op.data.toAccountName } : null),
          categoryId: op.data.categoryIdObj || (op.data.categoryId ? { _id: op.data.categoryId, name: op.data.categoryName } : null),
          isPending: true
        };
      }
    } else if (op.type === 'DELETE') {
      merged = merged.filter(t => t._id !== op.id && t.clientTxId !== op.clientTxId);
    }
  });

  return merged;
};

// Queue a new operation
export const queueOperation = (type, clientTxId, id, data) => {
  const queue = getQueue();
  
  // Create unique client reference
  const actualClientTxId = clientTxId || generateUUID();

  // Optimized Queue Compaction:
  // If we delete an item that was created offline and not yet synced, we can just remove the CREATE operation
  if (type === 'DELETE' && actualClientTxId.startsWith('tx_')) {
    const filteredQueue = queue.filter(op => op.clientTxId !== actualClientTxId);
    if (filteredQueue.length < queue.length) {
      saveQueue(filteredQueue);
      return actualClientTxId;
    }
  }

  queue.push({
    type,
    clientTxId: actualClientTxId,
    id,
    data,
    timestamp: Date.now()
  });

  saveQueue(queue);
  triggerSync();
  return actualClientTxId;
};

// Main Sync Routine
export const triggerSync = async () => {
  if (isSyncing) return;
  if (!navigator.onLine) {
    notify();
    return;
  }

  let queue = getQueue();
  if (queue.length === 0) {
    syncStatus = 'synced';
    notify();
    return;
  }

  // Sanitize queue: prune any CREATE TRANSFER operations that are missing toAccountId to prevent queue blocking
  const validQueue = queue.filter(op => {
    if (op.type === 'CREATE' && op.data?.type === 'TRANSFER' && !op.data?.toAccountId) {
      console.warn('Pruning invalid transfer sync operation (missing destination account):', op);
      return false;
    }
    return true;
  });

  if (validQueue.length !== queue.length) {
    queue = validQueue;
    saveQueue(queue);
    if (queue.length === 0) {
      syncStatus = 'synced';
      notify();
      return;
    }
  }

  isSyncing = true;
  syncStatus = 'syncing';
  notify();

  try {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    const response = await secureApi.post('/api/sync/transactions', { ops: queue }, { headers });
    
    if (response.data.success) {
      const { idMap } = response.data;
      
      // Update local cache transactions with the new server IDs
      const cache = getCache();
      const updatedCache = cache.map(tx => {
        if (tx.clientTxId && idMap[tx.clientTxId]) {
          return { ...tx, _id: idMap[tx.clientTxId] };
        }
        return tx;
      });
      setCache(updatedCache);

      // Clear synced items
      saveQueue([]);
      syncStatus = 'synced';
    } else {
      syncStatus = 'error';
    }
  } catch (err) {
    console.error('Batch sync failed:', err);
    syncStatus = 'error';
  } finally {
    isSyncing = false;
    notify();
  }
};

// Set up event listeners for network and lifecycle triggers
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncStatus = 'synced';
    triggerSync();
  });
  window.addEventListener('offline', () => {
    notify();
  });
  window.addEventListener('focus', triggerSync);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      triggerSync();
    }
  });
}
