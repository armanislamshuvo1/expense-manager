/**
 * idbStorage: Lightweight asynchronous storage adapter using native IndexedDB
 * with automatic fallback to localStorage.
 */

const DB_NAME = 'nexuswealth_db';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

let dbPromise = null;

const getDB = () => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('[idbStorage] IndexedDB open error, falling back to localStorage');
        resolve(null);
      };
    });
  }
  return dbPromise;
};

export const idbGet = async (key, fallbackVal = null) => {
  try {
    const db = await getDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result !== undefined ? req.result : fallbackVal);
        req.onerror = () => resolve(fallbackVal);
      });
    }
  } catch (err) {
    console.warn('[idbStorage] idbGet failed, reading from localStorage:', err);
  }
  // LocalStorage fallback
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallbackVal;
  } catch (e) {
    return fallbackVal;
  }
};

export const idbSet = async (key, value) => {
  try {
    const db = await getDB();
    if (db) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => {
          // Keep localStorage copy in sync as backup
          try {
            localStorage.setItem(key, JSON.stringify(value));
          } catch (_) {}
          resolve(true);
        };
        req.onerror = () => reject(req.error);
      });
    }
  } catch (err) {
    console.warn('[idbStorage] idbSet failed, saving to localStorage:', err);
  }
  // LocalStorage fallback
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('[idbStorage] Failed to save value to localStorage:', e);
    return false;
  }
};

export const idbDelete = async (key) => {
  try {
    const db = await getDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => {
          try {
            localStorage.removeItem(key);
          } catch (_) {}
          resolve(true);
        };
        req.onerror = () => resolve(false);
      });
    }
  } catch (err) {}
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
};
