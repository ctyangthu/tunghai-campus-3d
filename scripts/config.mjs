// Shared settings for the data scripts. The scene uses local metres:
// +x points east and +z points south from the origin below.
export const origin = [120.605, 24.179]; // [longitude, latitude]
export const earthRadius = 6371008.8; // IUGG mean radius, metres

// The OSM way that outlines the campus.
export const boundaryWay = 347094469;

// Terrain board: [west, north, east, south] in local metres, sampled on an nx × nz grid.
export const terrain = {
  bounds: [-1290, -590, 995, 645],
  nx: 103,
  nz: 57,
  zoom: 14,
  tiles: 'https://elevation-tiles-prod.s3.amazonaws.com/terrarium',
};

export const overpass = 'https://overpass-api.de/api/interpreter';
export const osmApi = 'https://api.openstreetmap.org/api/0.6';
// OSM snapshot used for docs/data/campus-geo.json (shortly before it was first published).
export const osmDate = '2026-11-21T15:00:00Z';
export const cacheDir = new URL('../.cache/', import.meta.url);
