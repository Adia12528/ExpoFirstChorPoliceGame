'use strict';
// Small-area geo helpers (equirectangular approximation — accurate to cm at game scale).
const R = 6371000;
const RAD = Math.PI / 180;

/** Metres from `from` to `to`: dx = east, dy = north. */
function offset(from, to) {
  const dy = (to.lat - from.lat) * RAD * R;
  const dx = (to.lon - from.lon) * RAD * R * Math.cos(((to.lat + from.lat) / 2) * RAD);
  return { dx, dy };
}

function dist(a, b) {
  const o = offset(a, b);
  return Math.hypot(o.dx, o.dy);
}

/** Point `dx` metres east and `dy` metres north of `origin`. */
function destination(origin, dx, dy) {
  return {
    lat: origin.lat + dy / R / RAD,
    lon: origin.lon + dx / (R * Math.cos(origin.lat * RAD)) / RAD,
  };
}

module.exports = { offset, dist, destination };
