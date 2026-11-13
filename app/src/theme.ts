export const C = {
  bg: '#0A0E1A',
  card: '#121829',
  card2: '#182037',
  line: '#232E4A',
  text: '#E8ECF8',
  dim: '#8592B3',
  police: '#4C8DFF',
  chor: '#FF5A5F',
  loot: '#FFC83D',
  ok: '#3DDC97',
  warn: '#FFB020',
  danger: '#FF3B4A',
} as const;

export type Role = 'chor' | 'police' | null;

export const teamColor = (r: Role) => (r === 'chor' ? C.chor : r === 'police' ? C.police : C.dim);
export const oppositeColor = (r: Role) => (r === 'chor' ? C.police : r === 'police' ? C.chor : C.dim);
export const HEAT_COLORS = ['#3B4A6B', '#4C8DFF', '#FFC83D', '#FF8A3D', '#FF3B4A'] as const;
