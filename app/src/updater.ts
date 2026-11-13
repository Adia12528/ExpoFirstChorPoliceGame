import { Linking, Platform } from 'react-native';
import { normalizeServerUrl } from './discovery';

export const CURRENT_VERSION = '1.0.0';
export const GITHUB_REPO = 'Adia12528/ExpoFirstChorPoliceGame';
export const LATEST_RELEASE_URL = 'https://github.com/Adia12528/ExpoFirstChorPoliceGame/releases/latest';
export const DIRECT_APK_URL = 'https://github.com/Adia12528/ExpoFirstChorPoliceGame/releases/latest/download/chor-police.apk';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  changelog: string;
  apkSize?: number;
}

/** Check if there is an update available via GitHub Releases API or Server */
export async function checkForUpdate(serverUrl?: string): Promise<UpdateInfo | null> {
  // 1. Direct GitHub Releases API Check (Always latest & 100% reliable)
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
    // Try server check fallback
  }

  // 2. Fallback to connected server check
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
              return {
                hasUpdate: true,
                currentVersion: CURRENT_VERSION,
                latestVersion: latest,
                downloadUrl: DIRECT_APK_URL,
                changelog: data.changelog || 'Naye features aur gameplay updates!',
                apkSize: data.apkSize,
              };
            }
          }
        }
      } catch {
        // Failed
      } finally {
        clearTimeout(timer);
      }
    }
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

/** Open direct download APK URL in browser */
export async function downloadAndInstallApk(
  downloadUrl: string,
  _onProgress?: (percent: number) => void,
): Promise<{ ok: boolean; msg?: string }> {
  try {
    const targetUrl = downloadUrl || DIRECT_APK_URL;
    const supported = await Linking.canOpenURL(targetUrl);
    if (supported) {
      await Linking.openURL(targetUrl);
      return { ok: true, msg: 'Browser download start ho gaya!' };
    } else {
      await Linking.openURL(LATEST_RELEASE_URL);
      return { ok: true, msg: 'Release page open ho gaya!' };
    }
  } catch (err: any) {
    try {
      await Linking.openURL(LATEST_RELEASE_URL);
      return { ok: true };
    } catch {
      return { ok: false, msg: err?.message || 'Link open nahi ho paya' };
    }
  }
}
