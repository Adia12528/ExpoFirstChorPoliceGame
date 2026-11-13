import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Prefs {
  name: string;
  serverUrl: string;
  fake: boolean;
  sound: boolean;
  compass: boolean;
  playerId: string;
}

const KEY = 'chorpolice.prefs.v1';
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export async function loadPrefs(defaults: Omit<Prefs, 'playerId'>): Promise<Prefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>;
      return { ...defaults, ...p, playerId: p.playerId || rid() };
    }
  } catch {
    // storage can be unavailable — fall through to defaults
  }
  return { ...defaults, playerId: rid() };
}

export async function savePrefs(p: Prefs) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}
