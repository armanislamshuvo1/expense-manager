import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Converts a Blob to a base64 string
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Safely saves or shares an exported file across all platforms:
 * - On Native Android (Capacitor): writes to cache directory and opens native Android Share sheet
 * - On Web / PWA: tries Web Share API with files, falls back to standard download link
 */
export async function downloadOrShareFile(blob, filename, mimeType = 'application/octet-stream') {
  // 1. Native Capacitor (Android APK)
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(blob);
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache
      });

      const fileUri = writeResult.uri;
      await Share.share({
        title: 'NexusWealth Export',
        text: `NexusWealth Financial Export: ${filename}`,
        url: fileUri,
        dialogTitle: 'Save or Share Financial Export'
      });
      return { success: true, method: 'capacitor_share' };
    } catch (err) {
      console.warn('Native Capacitor share failed, trying blob fallback:', err);
    }
  }

  // 2. Web Share API with files (supported in modern mobile browsers)
  const file = new File([blob], filename, { type: mimeType });
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'NexusWealth Export',
        text: `NexusWealth Financial Export: ${filename}`
      });
      return { success: true, method: 'web_share' };
    } catch (shareErr) {
      // User cancelled share dialog or permission denied
      if (shareErr.name === 'AbortError') {
        return { success: true, method: 'cancelled' };
      }
      console.warn('Web share failed, falling back to download link:', shareErr);
    }
  }

  // 3. Desktop / Browser download link fallback
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
    window.URL.revokeObjectURL(url);
  }, 1000);

  return { success: true, method: 'browser_download' };
}
