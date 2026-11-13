const R = 6371000;
const RAD = Math.PI / 180;

export interface LatLon {
  lat: number;
  lon: number;
}

/** Distance in metres between two GPS coordinates using Equirectangular projection */
export function dist(a: LatLon, b: LatLon): number {
  const x = (b.lon - a.lon) * RAD * Math.cos(((a.lat + b.lat) / 2) * RAD);
  const y = (b.lat - a.lat) * RAD;
  return Math.hypot(x, y) * R;
}

/** Point `dx` metres east and `dy` metres north of `origin` (used only by the fake-GPS test mode). */
export function destination(origin: LatLon, dx: number, dy: number): LatLon {
  return {
    lat: origin.lat + dy / R / RAD,
    lon: origin.lon + dx / (R * Math.cos(origin.lat * RAD)) / RAD,
  };
}

const ARROWS = ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️'];
const NAMES = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** Compass direction of an offset (dx east, dy north). */
export function compass(dx: number, dy: number) {
  const ang = (Math.atan2(dx, dy) * 180) / Math.PI; // 0 = north, clockwise
  const i = Math.round(((ang + 360) % 360) / 45) % 8;
  return { arrow: ARROWS[i], name: NAMES[i] };
}
