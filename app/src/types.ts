import type { Role } from './theme';

export interface Settings {
  radius: number;
  duration: number;
  chors: number | null;
  loot: number;
  headStart: number;
}
export interface LobbyPlayer {
  id: string;
  name: string;
  connected: boolean;
  isHost: boolean;
  gps: { ok: boolean; acc: number | null };
}
export interface PlayerStat {
  id: string;
  name: string;
  role: Role;
  status: 'free' | 'jailed';
  arrests: number;
  frees: number;
  loot: number;
}
export interface GameResult {
  winner: 'chor' | 'police';
  reason: string;
  loot: number;
  lootTotal: number;
  players: PlayerStat[];
  mvp: { id: string; name: string } | null;
}
export type Phase = 'lobby' | 'headstart' | 'playing' | 'over';
export interface Lobby {
  code: string;
  hostId: string | null;
  phase: Phase;
  settings: Settings;
  suggestedChors: number;
  players: LobbyPlayer[];
  result: GameResult | null;
}
export interface Blip {
  id: string;
  name: string;
  dx: number;
  dy: number;
  kind?: 'sense' | 'cctv' | 'zone';
}
export interface GameView {
  phase: Phase;
  role: Role;
  status: 'free' | 'jailed';
  immuneLeft: number;
  timeLeft: number;
  blind: boolean;
  me: { signal: boolean; acc: number | null; outside: boolean };
  zone: { dx: number; dy: number; r: number } | null;
  allies: Blip[];
  foes: Blip[];
  jails: Blip[];
  loot: { id: number; dx: number; dy: number }[];
  heat: { kind: 'police' | 'chor'; level: 0 | 1 | 2 | 3 | 4 } | null;
  cctv: { state: 'idle' | 'warning' | 'live'; inSec: number };
  ability?: {
    name: 'dhuaan' | 'boost';
    ready: boolean;
    active: boolean;
    cooldownLeft: number;
    activeLeft: number;
  };
  score: { loot: number; lootTotal: number; chorsFree: number; chorsTotal: number };
}
export interface GameEvent {
  type: 'start' | 'good' | 'bad' | 'warn' | 'info' | 'cctv';
  msg: string;
  haptic?: 'heavy' | 'success' | 'error' | 'warning';
}
export interface FeedItem {
  id: number;
  type: GameEvent['type'];
  text: string;
}
export interface Ack {
  ok: boolean;
  msg?: string;
  code?: string;
}
