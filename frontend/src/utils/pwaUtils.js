/**
 * Checks if the application is running in standalone mode (installed PWA)
 * or has query parameters suggesting PWA context.
 * @returns {boolean}
 */
export function isPwaMode() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isNavigatorStandalone = window.navigator.standalone === true; // iOS Safari
  const hasPwaParam = new URLSearchParams(window.location.search).get('source') === 'pwa' ||
                      new URLSearchParams(window.location.search).get('pwa') === 'true';
  
  return isStandalone || isNavigatorStandalone || hasPwaParam;
}
