import { Capacitor } from '@capacitor/core';

/**
 * Checks if the application is running as a compiled native Android/iOS app.
 * @returns {boolean}
 */
export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

/**
 * Direct download URL for the latest compiled Android APK from GitHub Releases
 */
export const APK_DOWNLOAD_URL = 'https://github.com/armanislamshuvo1/expense-manager/releases/latest/download/NexusWealth.apk';

/**
 * Triggers a direct download of the native Android APK file
 */
export function downloadApkDirect() {
  const link = document.createElement('a');
  link.href = APK_DOWNLOAD_URL;
  link.setAttribute('download', 'NexusWealth.apk');
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Checks if the application is running in standalone mode (installed PWA or native APK)
 * or has query parameters suggesting PWA context.
 * @returns {boolean}
 */
export function isPwaMode() {
  if (Capacitor.isNativePlatform()) {
    return true;
  }
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isNavigatorStandalone = window.navigator.standalone === true; // iOS Safari
  const hasPwaParam = new URLSearchParams(window.location.search).get('source') === 'pwa' ||
                      new URLSearchParams(window.location.search).get('pwa') === 'true';
  
  return isStandalone || isNavigatorStandalone || hasPwaParam;
}

/**
 * Triggers an immediate service worker update check and skips waiting.
 */
export async function updatePwaCache() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    } catch (err) {
      console.warn('PWA update check failed:', err);
    }
  }
}

/**
 * Force-clears all PWA caches and unregisters service workers, then reloads.
 */
export async function clearAllPwaCaches() {
  if ('caches' in window) {
    try {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    } catch (err) {
      console.warn('Failed clearing caches:', err);
    }
  }
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    } catch (err) {
      console.warn('Failed unregistering service workers:', err);
    }
  }
  window.location.reload();
}
