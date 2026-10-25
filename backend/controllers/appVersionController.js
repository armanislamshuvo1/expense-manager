let cachedVersionData = null;
let lastFetchTime = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export const getLatestAppVersion = async (req, res) => {
  const now = Date.now();
  if (cachedVersionData && now - lastFetchTime < CACHE_TTL) {
    return res.status(200).json({
      success: true,
      data: cachedVersionData,
      source: 'cache'
    });
  }

  try {
    const response = await fetch(
      'https://api.github.com/repos/armanislamshuvo1/expense-manager/releases/latest',
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'NexusWealth-Updater'
        }
      }
    );

    if (!response.ok) {
      if (cachedVersionData) {
        return res.status(200).json({
          success: true,
          data: cachedVersionData,
          source: 'stale-cache'
        });
      }
      return res.status(200).json({
        success: true,
        data: {
          versionName: '3.0.4',
          buildNumber: 1,
          tag: 'v3.0.4',
          downloadUrl: 'https://github.com/armanislamshuvo1/expense-manager/releases/latest/download/NexusWealth.apk',
          releaseNotes: 'Performance improvements and bug fixes.',
          publishedAt: new Date().toISOString()
        },
        source: 'fallback'
      });
    }

    const release = await response.json();
    const tag = release.tag_name || 'v3.0.4';
    
    // Extract build number from tag if available (e.g., v3.0.4-build-16 -> 16)
    const buildMatch = tag.match(/build-(\d+)/i);
    const buildNumber = buildMatch ? parseInt(buildMatch[1], 10) : 0;
    
    // Extract clean version name without build suffix (e.g., v3.0.4-build-16 -> 3.0.4)
    const cleanVersion = tag.replace(/^v/, '').split('-')[0] || '3.0.4';

    // Find direct APK asset if present
    const apkAsset = Array.isArray(release.assets) 
      ? release.assets.find(a => a.name && a.name.endsWith('.apk')) 
      : null;

    const downloadUrl = apkAsset?.browser_download_url || 
      'https://github.com/armanislamshuvo1/expense-manager/releases/latest/download/NexusWealth.apk';

    cachedVersionData = {
      versionName: cleanVersion,
      buildNumber,
      tag,
      downloadUrl,
      sizeBytes: apkAsset?.size || 0,
      releaseNotes: release.body || 'New update with performance improvements and bug fixes.',
      publishedAt: release.published_at || new Date().toISOString()
    };
    lastFetchTime = now;

    return res.status(200).json({
      success: true,
      data: cachedVersionData,
      source: 'live'
    });
  } catch (error) {
    if (cachedVersionData) {
      return res.status(200).json({
        success: true,
        data: cachedVersionData,
        source: 'stale-cache'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        versionName: '3.0.4',
        buildNumber: 1,
        tag: 'v3.0.4',
        downloadUrl: 'https://github.com/armanislamshuvo1/expense-manager/releases/latest/download/NexusWealth.apk',
        releaseNotes: 'Bug fixes and performance improvements.',
        publishedAt: new Date().toISOString()
      },
      source: 'fallback'
    });
  }
};
