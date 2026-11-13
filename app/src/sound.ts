import { createAudioPlayer } from 'expo-audio';

let soundEnabled = true;

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function isSoundEnabled() {
  return soundEnabled;
}

// Pure JS base64 encoder that works in Hermes / React Native without global btoa
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function uint8ToBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    result += B64[b0 >> 2];
    result += B64[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < len ? B64[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    result += i + 2 < len ? B64[b2 & 63] : '=';
  }
  return result;
}

// Generate procedurally synthesized 8-bit PCM WAV audio data URIs
function createToneWav(freq: number, durationSec = 0.2, type: 'sine' | 'chirp' | 'siren' | 'noise' = 'sine'): string {
  try {
    const sampleRate = 8000;
    const numSamples = Math.floor(sampleRate * durationSec);
    const dataSize = numSamples;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;
    const bytes = new Uint8Array(totalSize);

    // RIFF chunk descriptor
    bytes.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
    const fileLen = 36 + dataSize;
    bytes[4] = fileLen & 0xff;
    bytes[5] = (fileLen >> 8) & 0xff;
    bytes[6] = (fileLen >> 16) & 0xff;
    bytes[7] = (fileLen >> 24) & 0xff;
    bytes.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"

    // fmt sub-chunk
    bytes.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
    bytes.set([16, 0, 0, 0], 16); // Subchunk1Size (16 for PCM)
    bytes.set([1, 0], 20); // AudioFormat (1 = PCM)
    bytes.set([1, 0], 22); // NumChannels (1 = Mono)
    bytes[24] = sampleRate & 0xff;
    bytes[25] = (sampleRate >> 8) & 0xff;
    bytes[26] = (sampleRate >> 16) & 0xff;
    bytes[27] = (sampleRate >> 24) & 0xff;
    bytes[28] = sampleRate & 0xff; // ByteRate
    bytes[29] = (sampleRate >> 8) & 0xff;
    bytes[30] = (sampleRate >> 16) & 0xff;
    bytes[31] = (sampleRate >> 24) & 0xff;
    bytes.set([1, 0], 32); // BlockAlign
    bytes.set([8, 0], 34); // BitsPerSample (8-bit)

    // data sub-chunk
    bytes.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
    bytes[40] = dataSize & 0xff;
    bytes[41] = (dataSize >> 8) & 0xff;
    bytes[42] = (dataSize >> 16) & 0xff;
    bytes[43] = (dataSize >> 24) & 0xff;

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let s = 0;
      if (type === 'sine') {
        s = Math.sin(2 * Math.PI * freq * t);
      } else if (type === 'chirp') {
        const f = freq + (t / durationSec) * freq * 1.4;
        s = Math.sin(2 * Math.PI * f * t);
      } else if (type === 'siren') {
        const f = freq + Math.sin(2 * Math.PI * 7 * t) * 260;
        s = Math.sin(2 * Math.PI * f * t);
      } else if (type === 'noise') {
        s = Math.random() * 2 - 1;
      }
      const val = Math.floor((s * 0.7 + 1) * 127.5);
      bytes[44 + i] = Math.max(0, Math.min(255, val));
    }

    return `data:audio/wav;base64,${uint8ToBase64(bytes)}`;
  } catch {
    return '';
  }
}

export type SfxName = 'loot' | 'siren' | 'cctv' | 'arrest' | 'freed' | 'radar' | 'smoke' | 'boost';

// Lazy sound generator — only synthesized on first play, NEVER on app startup!
const sfxCache = new Map<SfxName, string>();
function getSfxData(name: SfxName): string {
  if (sfxCache.has(name)) return sfxCache.get(name)!;

  let uri = '';
  switch (name) {
    case 'loot':
      uri = createToneWav(880, 0.16, 'chirp');
      break;
    case 'siren':
      uri = createToneWav(650, 0.45, 'siren');
      break;
    case 'cctv':
      uri = createToneWav(1100, 0.35, 'siren');
      break;
    case 'arrest':
      uri = createToneWav(320, 0.35, 'noise');
      break;
    case 'freed':
      uri = createToneWav(520, 0.28, 'chirp');
      break;
    case 'radar':
      uri = createToneWav(750, 0.08, 'sine');
      break;
    case 'smoke':
      uri = createToneWav(220, 0.4, 'noise');
      break;
    case 'boost':
      uri = createToneWav(440, 0.3, 'chirp');
      break;
  }
  sfxCache.set(name, uri);
  return uri;
}

const playersCache = new Map<string, any>();

export function playSfx(name: SfxName) {
  if (!soundEnabled) return;
  try {
    const dataUri = getSfxData(name);
    if (!dataUri) return;

    let player = playersCache.get(name);
    if (!player) {
      player = createAudioPlayer(dataUri);
      playersCache.set(name, player);
    }
    player?.seekTo?.(0);
    player?.play?.();
  } catch {
    // Graceful fallback if audio is not supported on this device
  }
}
