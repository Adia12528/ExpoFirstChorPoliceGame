/**
 * Auto-detect running Chor-Police servers on LAN / Wi-Fi or Render Cloud.
 * Pings candidates with a fast timeout.
 */

export function normalizeServerUrl(input: string): string {
  let val = input.trim();
  if (!val) return '';
  // If user just typed the service name: "chor-police-live"
  if (!val.includes('.') && !val.includes(':') && !val.includes('/')) {
    return `https://${val}.onrender.com`;
  }
  // If user typed without protocol: "chor-police-live.onrender.com"
  if (!val.startsWith('http://') && !val.startsWith('https://')) {
    val = `https://${val}`;
  }
  // Remove trailing slashes
  return val.replace(/\/+$/, '');
}

/** Check if a server is online and responding to /api/info */
export async function testServerConnection(
  url: string,
  timeoutMs = 12000,
): Promise<{ ok: boolean; msg: string; rooms?: number; players?: number }> {
  const norm = normalizeServerUrl(url);
  if (!norm) return { ok: false, msg: 'Pehle URL daalo' };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${norm}/api/info`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data.app === 'chor-police-server') {
        return {
          ok: true,
          msg: `Connected! ✓ (Rooms: ${data.rooms ?? 0}, Players: ${data.players ?? 0})`,
          rooms: data.rooms,
          players: data.players,
        };
      }
    }
    return { ok: false, msg: `Server respond kiya par Chor-Police server nahi hai.` };
  } catch (e: any) {
    if (ctrl.signal.aborted) {
      return {
        ok: false,
        msg: `Timeout! Agar Render server so raha hai, toh pehli baar jagane mein 30-40s lagte hain. Phir try karein.`,
      };
    }
    return { ok: false, msg: `Server se connect nahi hua (${e?.message ?? 'Network error'}).` };
  } finally {
    clearTimeout(timer);
  }
}

export async function detectLanServer(hintUrl?: string): Promise<string | null> {
  const candidates: string[] = [];

  // If user provided or stored a hint URL, check it first
  if (hintUrl) {
    try {
      const u = new URL(hintUrl);
      candidates.push(`http://${u.hostname}:3000`);
    } catch {
      // ignore
    }
  }

  // Common Android / local host addresses
  candidates.push('http://10.151.72.165:3000'); // current detected LAN host
  candidates.push('http://10.0.2.2:3000'); // Android emulator host
  candidates.push('http://localhost:3000');
  candidates.push('http://192.168.43.1:3000'); // Android hotspot default gateway
  candidates.push('http://192.168.1.1:3000');
  candidates.push('http://192.168.0.1:3000');

  // Extract subnet from hint if available, probe common host IPs
  if (hintUrl) {
    const match = hintUrl.match(/http:\/\/(\d+\.\d+\.\d+)\.\d+/);
    if (match) {
      const prefix = match[1];
      for (const last of [1, 2, 5, 10, 15, 20, 50, 100, 101, 102, 105, 165]) {
        candidates.push(`http://${prefix}.${last}:3000`);
      }
    }
  }

  // Deduplicate
  const unique = Array.from(new Set(candidates));

  // Ping in parallel with 1500ms timeout
  const check = async (url: string): Promise<string | null> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1600);
    try {
      const res = await fetch(`${url}/api/info`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json();
        if (json.app === 'chor-police-server') {
          return url;
        }
      }
    } catch {
      // ignore timeout or network error
    } finally {
      clearTimeout(timer);
    }
    return null;
  };

  const results = await Promise.all(unique.map(check));
  const found = results.find((r) => r !== null);
  return found ?? null;
}
