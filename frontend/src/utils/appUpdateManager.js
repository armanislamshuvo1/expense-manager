import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { publicApi } from './apiConfig';

const AppUpdate = registerPlugin('AppUpdate');

export const CURRENT_APP_VERSION = '3.0.5';

/**
 * Parses semver string (e.g., "3.0.4" -> [3, 0, 4])
 */
function parseSemver(versionStr = '') {
  return versionStr
    .replace(/^v/i, '')
    .split('-')[0]
    .split('.')
    .map(n => parseInt(n, 10) || 0);
}

/**
 * Returns true if remoteVersion is strictly greater than localVersion
 */
function compareSemver(local, remote) {
  const l = parseSemver(local);
  const r = parseSemver(remote);
  for (let i = 0; i < Math.max(l.length, r.length); i++) {
    const lPart = l[i] || 0;
    const rPart = r[i] || 0;
    if (rPart > lPart) return true;
    if (rPart < lPart) return false;
  }
  return false;
}

/**
 * Gets currently installed app info (version & build number)
 */
export async function getInstalledAppInfo() {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await App.getInfo();
      const buildNum = parseInt(info.build, 10) || 0;
      return {
        version: info.version || CURRENT_APP_VERSION,
        build: buildNum,
        isNative: true
      };
    } catch (_err) {
      // Fallback
    }
  }

  return {
    version: CURRENT_APP_VERSION,
    build: 0,
    isNative: false
  };
}

/**
 * Fetches latest release metadata from backend proxy or direct GitHub
 */
export async function fetchLatestRelease(forceRefresh = false) {
  // Try backend proxy first (handles caching and avoids rate limits)
  try {
    const url = forceRefresh ? '/api/app/version?refresh=true' : '/api/app/version';
    const res = await publicApi.get(url, { timeout: 8000 });
    if (res.data?.success && res.data?.data) {
      return res.data.data;
    }
  } catch (_e) {
    // Fall back to direct GitHub API
  }

  try {
    const ghRes = await fetch(
      'https://api.github.com/repos/armanislamshuvo1/expense-manager/releases/latest',
      { headers: { 'Accept': 'application/vnd.github.v3+json' } }
    );
    if (ghRes.ok) {
      const release = await ghRes.json();
      const tag = release.tag_name || 'v3.0.4';
      const buildMatch = tag.match(/build-(\d+)/i);
      const buildNumber = buildMatch ? parseInt(buildMatch[1], 10) : 0;
      const cleanVersion = tag.replace(/^v/, '').split('-')[0] || '3.0.4';

      const apkAsset = Array.isArray(release.assets) 
        ? release.assets.find(a => a.name && a.name.endsWith('.apk')) 
        : null;

      return {
        versionName: cleanVersion,
        buildNumber,
        tag,
        downloadUrl: apkAsset?.browser_download_url || 
          'https://github.com/armanislamshuvo1/expense-manager/releases/latest/download/NexusWealth.apk',
        releaseNotes: release.body || 'New update with performance improvements.',
        publishedAt: release.published_at || new Date().toISOString()
      };
    }
  } catch (err) {
    console.warn('Failed to fetch update info:', err);
  }

  return null;
}

/**
 * Checks if a newer release exists compared to installed app
 */
export async function checkForUpdate(forceRefresh = false) {
  const [installed, latest] = await Promise.all([
    getInstalledAppInfo(),
    fetchLatestRelease(forceRefresh)
  ]);

  if (!latest) {
    return { hasUpdate: false, installed, latest: null };
  }

  let hasUpdate = false;

  // Primary check: if build numbers are available on both, compare them
  if (installed.build > 0 && latest.buildNumber > 0) {
    hasUpdate = latest.buildNumber > installed.build;
  } else {
    // Secondary check: compare semver strings (e.g. 3.0.5 > 3.0.4)
    hasUpdate = compareSemver(installed.version, latest.versionName);
  }

  return {
    hasUpdate,
    installed,
    latest
  };
}

/**
 * Downloads and installs the update within the native app
 */
export async function installUpdate(downloadUrl, onProgress) {
  if (Capacitor.isNativePlatform()) {
    let progressListener = null;
    try {
      if (typeof onProgress === 'function') {
        progressListener = await AppUpdate.addListener('downloadProgress', (data) => {
          onProgress(data.percent || 0, data);
        });
      }

      const result = await AppUpdate.downloadAndInstall({ url: downloadUrl });
      return { success: true, ...result };
    } catch (err) {
      console.error('In-app install failed:', err);
      throw err;
    } finally {
      if (progressListener) {
        progressListener.remove().catch(() => {});
      }
    }
  }

  // Web / PWA fallback: direct download link
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', 'NexusWealth.apk');
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return { success: true, webDownload: true };
}
