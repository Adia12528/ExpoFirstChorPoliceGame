import { Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { startActivityAsync } from 'expo-intent-launcher';
import { normalizeServerUrl } from './discovery';

export const CURRENT_VERSION = '1.0.0';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  changelog: string;
  apkSize?: number;
}

/** Check if the connected server has a newer version or fresh build */
export async function checkForUpdate(serverUrl: string): Promise<UpdateInfo | null> {
  const norm = normalizeServerUrl(serverUrl);
  if (!norm) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);

  try {
    const res = await fetch(`${norm}/api/version`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.app !== 'chor-police-server') return null;

    const latest = data.latestAppVersion || data.version || '1.0.0';
    const hasUpdate = isNewerVersion(latest, CURRENT_VERSION);

    return {
      hasUpdate,
      currentVersion: CURRENT_VERSION,
      latestVersion: latest,
      downloadUrl: `${norm}${data.apkDownloadUrl || '/download/app.apk'}`,
      changelog: data.changelog || 'Performance improvements and new gameplay updates.',
      apkSize: data.apkSize,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isNewerVersion(remote: string, local: string): boolean {
  if (remote === local) return false;
  const rParts = remote.split('.').map(Number);
  const lParts = local.split('.').map(Number);
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
