import { secureApi } from './apiConfig';

let isSyncing = false;
const listeners = new Set();
let syncStatus = 'synced'; // 'synced' | 'syncing' | 'offline' | 'error'

// Helper to get active User ID for cache scoping
export const getCurrentUserId = () => {
  try {
    const cachedUser = JSON.parse(localStorage.getItem('user_cache'));
    return cachedUser?._id || cachedUser?.id || 'guest';
  } catch (e) {
    return 'guest';
  }
};

// Default System Fallback Categories if no user categories exist in cache or server
export const DEFAULT_CATEGORIES = [
  { _id: 'cat_def_food', name: 'Food & Dining', emoji: '🍔', color: '#ef4444', type: 'EXPENSE' },
  { _id: 'cat_def_transport', name: 'Transportation', emoji: '🚗', color: '#3b82f6', type: 'EXPENSE' },
  { _id: 'cat_def_shopping', name: 'Shopping', emoji: '🛍️', color: '#ec4899', type: 'EXPENSE' },
  { _id: 'cat_def_entertainment', name: 'Entertainment', emoji: '🎬', color: '#8b5cf6', type: 'EXPENSE' },
  { _id: 'cat_def_utilities', name: 'Bills & Utilities', emoji: '💡', color: '#f59e0b', type: 'EXPENSE' },
  { _id: 'cat_def_medical', name: 'Health & Medical', emoji: '🏥', color: '#10b981', type: 'EXPENSE' },
  { _id: 'cat_def_salary', name: 'Salary', emoji: '💰', color: '#10b981', type: 'INCOME' },
  { _id: 'cat_def_freelance', name: 'Freelance', emoji: '💻', color: '#8b5cf6', type: 'INCOME' },
  { _id: 'cat_def_investments', name: 'Investments', emoji: '📈', color: '#06b6d4', type: 'INCOME' },
];

export const DEFAULT_ACCOUNTS = [
  { _id: 'acc_def_cash', name: 'Cash', type: 'CASH', balance: 0.0, currency: 'MYR' }
];

// Helper to notify listeners of status changes
export const getTotalPendingCount = (userId = getCurrentUserId()) => {
  return getQueue(userId).length + getCategoryQueue(userId).length + getAccountQueue(userId).length;
};

const notify = () => {
  const currentStatus = !navigator.onLine ? 'offline' : syncStatus;
  const pendingCount = getTotalPendingCount();
  listeners.forEach(cb => cb(currentStatus, pendingCount));
};

// Generate UUID for offline client items
export const generateUUID = (prefix = 'tx') => {
  return `${prefix}_` + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
};

/* ==================== TRANSACTIONS CACHE & QUEUE ==================== */
export const getQueue = (userId = getCurrentUserId()) => {
  try {
    return JSON.parse(localStorage.getItem(`tx_sync_queue_${userId}`)) || [];
  } catch (e) {
    return [];
  }
};

const saveQueue = (queue, userId = getCurrentUserId()) => {
  localStorage.setItem(`tx_sync_queue_${userId}`, JSON.stringify(queue));
  notify();
};

export const getCache = (userId = getCurrentUserId()) => {
  try {
    return JSON.parse(localStorage.getItem(`tx_cache_${userId}`)) || [];
  } catch (e) {
    return [];
  }
};

export const setCache = (transactions, userId = getCurrentUserId()) => {
  localStorage.setItem(`tx_cache_${userId}`, JSON.stringify(transactions));
};

/* ==================== ACCOUNTS CACHE & QUEUE ==================== */
export const getAccountQueue = (userId = getCurrentUserId()) => {
  try {
    return JSON.parse(localStorage.getItem(`acc_sync_queue_${userId}`)) || [];
  } catch (e) {
    return [];
  }
};

const saveAccountQueue = (queue, userId = getCurrentUserId()) => {
  localStorage.setItem(`acc_sync_queue_${userId}`, JSON.stringify(queue));
  notify();
};

export const getAccountsCache = (userId = getCurrentUserId()) => {
  try {
    const raw = JSON.parse(localStorage.getItem(`accounts_cache_${userId}`));
    if (Array.isArray(raw) && raw.length > 0) return raw;
  } catch (e) {}
  return DEFAULT_ACCOUNTS;
};

export const setAccountsCache = (accounts, userId = getCurrentUserId()) => {
  if (Array.isArray(accounts) && accounts.length > 0) {
    localStorage.setItem(`accounts_cache_${userId}`, JSON.stringify(accounts));
  }
};

/* ==================== CATEGORIES CACHE & QUEUE ==================== */
export const getCategoryQueue = (userId = getCurrentUserId()) => {
  try {
    return JSON.parse(localStorage.getItem(`cat_sync_queue_${userId}`)) || [];
  } catch (e) {
    return [];
  }
};

const saveCategoryQueue = (queue, userId = getCurrentUserId()) => {
  localStorage.setItem(`cat_sync_queue_${userId}`, JSON.stringify(queue));
  notify();
};

export const getCategoriesCache = (userId = getCurrentUserId()) => {
  try {
    const raw = JSON.parse(localStorage.getItem(`categories_cache_${userId}`));
    if (Array.isArray(raw) && raw.length > 0) return raw;
  } catch (e) {}
  return DEFAULT_CATEGORIES;
};

export const setCategoriesCache = (categories, userId = getCurrentUserId()) => {
  if (Array.isArray(categories) && categories.length > 0) {
    localStorage.setItem(`categories_cache_${userId}`, JSON.stringify(categories));
  }
};

// Listener Registration
export const subscribeToSync = (callback) => {
  listeners.add(callback);
  callback(!navigator.onLine ? 'offline' : syncStatus, getTotalPendingCount());
  return () => {
    listeners.delete(callback);
  };
};

/* ==================== MERGED DATA ACCESSORS FOR UI ==================== */
export const getMergedCategories = (userId = getCurrentUserId()) => {
  const cache = getCategoriesCache(userId);
  const queue = getCategoryQueue(userId);
  let merged = [...cache];

  queue.forEach(op => {
    if (op.type === 'CREATE') {
      if (!merged.some(c => c.clientCatId === op.clientCatId || c._id === op.clientCatId)) {
        merged.push({
          _id: op.clientCatId,
          clientCatId: op.clientCatId,
          ...op.data,
          isPending: true
        });
      }
    } else if (op.type === 'UPDATE') {
      const idx = merged.findIndex(c => c._id === op.id || c.clientCatId === op.clientCatId);
      if (idx !== -1) {
        merged[idx] = { ...merged[idx], ...op.data, isPending: true };
      }
    } else if (op.type === 'DELETE') {
      merged = merged.filter(c => c._id !== op.id && c.clientCatId !== op.clientCatId);
    }
  });

  return merged;
};

export const getMergedAccounts = (userId = getCurrentUserId()) => {
  const cache = getAccountsCache(userId);
  const queue = getAccountQueue(userId);
  let merged = [...cache];

  queue.forEach(op => {
    if (op.type === 'CREATE') {
      if (!merged.some(a => a.clientAccId === op.clientAccId || a._id === op.clientAccId)) {
        merged.push({
          _id: op.clientAccId,
          clientAccId: op.clientAccId,
          ...op.data,
          isPending: true
        });
      }
    } else if (op.type === 'UPDATE') {
      const idx = merged.findIndex(a => a._id === op.id || a.clientAccId === op.clientAccId);
      if (idx !== -1) {
        merged[idx] = { ...merged[idx], ...op.data, isPending: true };
      }
    } else if (op.type === 'DELETE') {
      merged = merged.filter(a => a._id !== op.id && a.clientAccId !== op.clientAccId);
    }
  });

  return merged;
};

export const getMergedTransactions = (userId = getCurrentUserId()) => {
  const cache = getCache(userId);
  const queue = getQueue(userId);
  let merged = [...cache];

  queue.forEach(op => {
    if (op.type === 'CREATE') {
      if (!merged.some(t => t.clientTxId === op.clientTxId || t._id === op.clientTxId)) {
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

/* ==================== QUEUE OPERATORS ==================== */
export const queueOperation = (type, clientTxId, id, data, userId = getCurrentUserId()) => {
  const queue = getQueue(userId);
  const actualClientTxId = clientTxId || generateUUID('tx');

  if (type === 'DELETE' && actualClientTxId.startsWith('tx_')) {
    const filteredQueue = queue.filter(op => op.clientTxId !== actualClientTxId);
    if (filteredQueue.length < queue.length) {
      saveQueue(filteredQueue, userId);
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

  saveQueue(queue, userId);
  triggerSync();
  return actualClientTxId;
};

export const queueCategoryOperation = (type, clientCatId, id, data, userId = getCurrentUserId()) => {
  const queue = getCategoryQueue(userId);
  const actualClientCatId = clientCatId || generateUUID('cat');

  if (type === 'DELETE' && actualClientCatId.startsWith('cat_')) {
    const filteredQueue = queue.filter(op => op.clientCatId !== actualClientCatId);
    if (filteredQueue.length < queue.length) {
      saveCategoryQueue(filteredQueue, userId);
      return actualClientCatId;
    }
  }

  queue.push({
    type,
    clientCatId: actualClientCatId,
    id,
    data,
    timestamp: Date.now()
  });

  saveCategoryQueue(queue, userId);

  // Update local cache optimistically
  const currentMerged = getMergedCategories(userId);
  setCategoriesCache(currentMerged, userId);

  triggerSync();
  return actualClientCatId;
};

export const queueAccountOperation = (type, clientAccId, id, data, userId = getCurrentUserId()) => {
  const queue = getAccountQueue(userId);
  const actualClientAccId = clientAccId || generateUUID('acc');

  if (type === 'DELETE' && actualClientAccId.startsWith('acc_')) {
    const filteredQueue = queue.filter(op => op.clientAccId !== actualClientAccId);
    if (filteredQueue.length < queue.length) {
      saveAccountQueue(filteredQueue, userId);
      return actualClientAccId;
    }
  }

  queue.push({
    type,
    clientAccId: actualClientAccId,
    id,
    data,
    timestamp: Date.now()
  });

  saveAccountQueue(queue, userId);

  // Update local cache optimistically
  const currentMerged = getMergedAccounts(userId);
  setAccountsCache(currentMerged, userId);

  triggerSync();
  return actualClientAccId;
};

/* ==================== SEQUENTIAL AUTO-SYNC ENGINE ==================== */
export const triggerSync = async () => {
  if (isSyncing) return;
  if (!navigator.onLine) {
    notify();
    return;
  }

  const userId = getCurrentUserId();
  let catQueue = getCategoryQueue(userId);
  let accQueue = getAccountQueue(userId);
  let txQueue = getQueue(userId);

  if (catQueue.length === 0 && accQueue.length === 0 && txQueue.length === 0) {
    syncStatus = 'synced';
    notify();
    return;
  }

  isSyncing = true;
  syncStatus = 'syncing';
  notify();

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    // 1. SYNC CATEGORIES FIRST
    if (catQueue.length > 0) {
      const catRes = await secureApi.post('/api/sync/categories', { ops: catQueue }, { headers });
      if (catRes.data?.success) {
        const { idMap } = catRes.data;

        // Update local category cache with real Mongo IDs
        const catCache = getCategoriesCache(userId);
        const updatedCatCache = catCache.map(c => {
          if (c.clientCatId && idMap[c.clientCatId]) {
            return { ...c, _id: idMap[c.clientCatId] };
          }
          return c;
        });
        setCategoriesCache(updatedCatCache, userId);

        // TRANSLATE CATEGORY CLIENT IDs IN TRANSACTION QUEUE
        txQueue = txQueue.map(op => {
          if (op.data?.categoryId && idMap[op.data.categoryId]) {
            return {
              ...op,
              data: { ...op.data, categoryId: idMap[op.data.categoryId] }
            };
          }
          return op;
        });
        saveQueue(txQueue, userId);
        saveCategoryQueue([], userId);
      }
    }

    // 2. SYNC ACCOUNTS SECOND
    if (accQueue.length > 0) {
      const accRes = await secureApi.post('/api/sync/accounts', { ops: accQueue }, { headers });
      if (accRes.data?.success) {
        const { idMap } = accRes.data;

        // Update local accounts cache with real Mongo IDs
        const accCache = getAccountsCache(userId);
        const updatedAccCache = accCache.map(a => {
          if (a.clientAccId && idMap[a.clientAccId]) {
            return { ...a, _id: idMap[a.clientAccId] };
          }
          return a;
        });
        setAccountsCache(updatedAccCache, userId);

        // TRANSLATE ACCOUNT CLIENT IDs IN TRANSACTION QUEUE
        txQueue = txQueue.map(op => {
          let updatedData = { ...op.data };
          if (updatedData.accountId && idMap[updatedData.accountId]) {
            updatedData.accountId = idMap[updatedData.accountId];
          }
          if (updatedData.toAccountId && idMap[updatedData.toAccountId]) {
            updatedData.toAccountId = idMap[updatedData.toAccountId];
          }
          return { ...op, data: updatedData };
        });
        saveQueue(txQueue, userId);
        saveAccountQueue([], userId);
      }
    }

    // 3. SYNC TRANSACTIONS THIRD
    if (txQueue.length > 0) {
      const validTxQueue = txQueue.filter(op => {
        if (op.type === 'CREATE' && op.data?.type === 'TRANSFER' && !op.data?.toAccountId) {
          return false;
        }
        return true;
      });

      if (validTxQueue.length > 0) {
        const txRes = await secureApi.post('/api/sync/transactions', { ops: validTxQueue }, { headers });
        if (txRes.data?.success) {
          const { idMap } = txRes.data;
          const txCache = getCache(userId);
          const updatedTxCache = txCache.map(tx => {
            if (tx.clientTxId && idMap[tx.clientTxId]) {
              return { ...tx, _id: idMap[tx.clientTxId] };
            }
            return tx;
          });
          setCache(updatedTxCache, userId);
          saveQueue([], userId);
        }
      } else {
        saveQueue([], userId);
      }
    }

    syncStatus = 'synced';
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nexus_sync_completed'));
    }
  } catch (err) {
    console.error('Batch sync error:', err);
    syncStatus = 'error';
  } finally {
    isSyncing = false;
    notify();
  }
};

/* ==================== LIFECYCLE LISTENERS ==================== */
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
