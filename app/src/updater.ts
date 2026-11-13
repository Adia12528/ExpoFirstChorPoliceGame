import { Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { startActivityAsync } from 'expo-intent-launcher';
import { normalizeServerUrl } from './discovery';

export const CURRENT_VERSION = '1.0.0';
export const GITHUB_REPO = 'Adia12528/ExpoFirstChorPoliceGame';
export const DIRECT_APK_URL = 'https://github.com/Adia12528/ExpoFirstChorPoliceGame/releases/download/v1.0.0/chor-police.apk';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  changelog: string;
  apkSize?: number;
}

/** Check if there is an update available via Server OR GitHub Releases */
export async function checkForUpdate(serverUrl?: string): Promise<UpdateInfo | null> {
  // 1. Try checking connected game server first (if available)
  if (serverUrl) {
    const norm = normalizeServerUrl(serverUrl);
    if (norm) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      try {
        const res = await fetch(`${norm}/api/version`, { signal: ctrl.signal });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          if (data.app === 'chor-police-server') {
            const latest = data.latestAppVersion || data.version || '1.0.0';
            const hasUpdate = isNewerVersion(latest, CURRENT_VERSION);
            if (hasUpdate) {
              const dl = data.apkDownloadUrl?.startsWith('http')
                ? data.apkDownloadUrl
                : `${norm}${data.apkDownloadUrl || '/download/app.apk'}`;
              return {
                hasUpdate: true,
                currentVersion: CURRENT_VERSION,
                latestVersion: latest,
                downloadUrl: data.apkAvailable ? dl : DIRECT_APK_URL,
                changelog: data.changelog || 'Performance improvements and new gameplay updates.',
                apkSize: data.apkSize,
              };
            }
          }
        }
      } catch {
        // Fallback to GitHub check
      } finally {
        clearTimeout(timer);
      }
    }
  }

  // 2. Direct GitHub Releases API Check (Super reliable fallback)
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const ghRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'ChorPoliceApp' },
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (ghRes.ok) {
      const release = await ghRes.json();
      const tagName = String(release.tag_name || '').replace(/^v/i, '');
      const hasUpdate = isNewerVersion(tagName, CURRENT_VERSION);

      const apkAsset = release.assets?.find((a: any) => a.name?.endsWith('.apk'));
      const downloadUrl = apkAsset?.browser_download_url || DIRECT_APK_URL;

      if (hasUpdate) {
        return {
          hasUpdate: true,
          currentVersion: CURRENT_VERSION,
          latestVersion: tagName,
          downloadUrl,
          changelog: release.body || 'Naya update available hai!',
          apkSize: apkAsset?.size,
        };
      }
    }
  } catch {
    // Both failed
  }

  return null;
}

function isNewerVersion(remote: string, local: string): boolean {
  if (!remote || remote === local) return false;
  const rParts = remote.split('.').map((n) => parseInt(n, 10) || 0);
  const lParts = local.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(rParts.length, lParts.length); i++) {
    const r = rParts[i] || 0;
    const l = lParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

/** Download APK with progress tracking and trigger Android package installer */
export async function downloadAndInstallApk(
  downloadUrl: string,
  onProgress: (percent: number) => void,
): Promise<{ ok: boolean; msg?: string }> {
  try {
    if (Platform.OS !== 'android') {
      await Linking.openURL(downloadUrl);
      return { ok: true };
    }

    const filename = 'chor-police-update.apk';
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    // Clean any previous partial download
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }

    const downloadResumable = FileSystem.createDownloadResumable(
      downloadUrl,
      fileUri,
      {},
      (downloadProgress: any) => {
        const total = downloadProgress.totalBytesExpectedToWrite;
        if (total > 0) {
          const written = downloadProgress.totalBytesWritten;
          const progress = Math.min(100, Math.round((written / total) * 100));
          onProgress(progress);
        }
      },
    );

    const downloadResult = await downloadResumable.downloadAsync();
    if (!downloadResult || !downloadResult.uri) {
      // Fallback to browser download
      await Linking.openURL(downloadUrl);
      return { ok: true, msg: 'Browser download started' };
    }

    // Trigger Android package installer
    try {
      const contentUri = await FileSystem.getContentUriAsync(downloadResult.uri);
      await startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/vnd.android.package-archive',
      });
      return { ok: true, msg: 'Installer launched' };
    } catch {
      // If intent fails, open browser URL directly
      await Linking.openURL(downloadUrl);
      return { ok: true, msg: 'Browser download started' };
    }
  } catch (err: any) {
    // If all else fails, open in browser
    try {
      await Linking.openURL(downloadUrl);
      return { ok: true };
    } catch {
      return { ok: false, msg: err?.message || 'Download failed' };
    }
  }
}
