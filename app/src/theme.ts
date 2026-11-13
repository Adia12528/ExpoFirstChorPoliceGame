export const C = {
  bg: '#080C18',
  card: '#101626',
  card2: '#161F36',
  line: '#202C48',
  text: '#F1F5F9',
  dim: '#94A3B8',
  police: '#38BDF8', // Cyan-Blue Neon
  policeDark: '#0284C7',
  policeBg: '#08172E',
  chor: '#F43F5E', // Rose-Purple Neon
  chorDark: '#E11D48',
  chorBg: '#2A0C16',
  loot: '#FBBF24', // Amber Gold
  ok: '#34D399',
  warn: '#F59E0B',
  danger: '#EF4444',
  neonBorder: '#38BDF844',
} as const;

export type Role = 'chor' | 'police' | null;

export const teamColor = (r: Role) => (r === 'chor' ? C.chor : r === 'police' ? C.police : C.dim);
export const oppositeColor = (r: Role) => (r === 'chor' ? C.police : r === 'police' ? C.chor : C.dim);
export const roleBgColor = (r: Role) => (r === 'chor' ? C.chorBg : r === 'police' ? C.policeBg : C.bg);
export const HEAT_COLORS = ['#334155', '#38BDF8', '#FBBF24', '#FB923C', '#EF4444'] as const;
