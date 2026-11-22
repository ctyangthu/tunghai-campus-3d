// Local metres east (x) and south (z) of the origin in config.mjs.
//
// The published layers were made with two slightly different equirectangular scales,
// up to about 1.5 m apart at the board edges. Both are kept so each file rebuilds exactly:
//   vector  - OSM features in docs/data/campus-geo.json (111 320 m per degree of longitude
//             at the equator, 110 770 m per degree of latitude)
//   terrain - the elevation grid in data/terrain.json (sphere of mean radius 6 371 008.8 m)
import {origin, earthRadius} from '../config.mjs';

const radians = Math.PI / 180;
const cosLat = Math.cos(origin[1] * radians);

function projection(metresPerDegreeLon, metresPerDegreeLat) {
  return {
    toLocal: ([lon, lat]) => [(lon - origin[0]) * metresPerDegreeLon, (origin[1] - lat) * metresPerDegreeLat],
    toLonLat: ([x, z]) => [origin[0] + x / metresPerDegreeLon, origin[1] - z / metresPerDegreeLat],
  };
}

export const vector = projection(111320 * cosLat, 110770);
export const terrain = projection(earthRadius * radians * cosLat, earthRadius * radians);

// Rounds to 0.1 m like Python's round(value, 1): exact halves go to the even digit.
export function round1(value) {
  if (Number.isInteger(value * 4) && !Number.isInteger(value * 2)) {
    const lower = Math.floor(value * 10);
    return (lower % 2 === 0 ? lower : lower + 1) / 10 + 0;
  }
  return Number(value.toFixed(1)) + 0; // + 0 turns -0 into 0
}
