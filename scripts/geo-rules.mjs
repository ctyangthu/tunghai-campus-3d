// Selection and modelling rules for docs/data/campus-geo.json. Every value here was
// recovered from the published data, so a rebuild from the same OSM snapshot matches it.

// A feature is kept when its centroid lies inside the campus boundary or within this
// many metres of it, and its footprint is at least the minimum area.
export const buildings = {
  boundaryMargin: 8,
  minArea: 20,
  metresPerLevel: 3.25,
};
// Land cover: a multipolygon with several outer rings gives one area per ring.
// Ways that are members of a multipolygon are only used through that relation
// (this leaves out, for example, the archery range cut out of the Acacia Woods).
export const land = {
  boundaryMargin: 5,
  minArea: 25,
};

// Height when OSM has no building:levels. Landmarks use surveyed or estimated
// heights; other buildings fall back to their type, then to footprint area.
export const landmarkHeights = {
  w226829984: 15, // 管理學院
  w227075021: 4, // 乳品小棧
  w227101621: 19.2, // 路思義教堂
  w367195923: 21, // 社會科學院
  w367195941: 12, // 中正紀念堂
  w367196899: 18, // 圖書館
  w1302996436: 25, // 大智慧科技大樓
};
export const typeHeights = {
  dormitory: 6.5,
  residential: 6.5,
  school: 10,
  church: 12,
  house: 3.6,
};
// University buildings west of this line belong to the low-rise first teaching area.
export const firstTeachingAreaEdge = -365;
export const universityHeights = {firstTeachingArea: 7, elsewhere: 7.8};
export function heightByArea(area) {
  if (area < 210) return 5;
  if (area < 900) return 8.5;
  return 11;
}

// Roads: widths in metres by highway type, unless OSM has a width tag.
export const roadWidths = {
  primary: 8.5,
  unclassified: 5,
  residential: 5.2,
  service: 3.5,
  track: 3,
  pedestrian: 4.2,
  steps: 2.3,
  footway: 1.7,
  path: 1.6,
};
export const namedRoadWidths = {'文理大道': 4.4};
// A road is kept when part of it lies inside the campus, or it is a primary road
// (臺灣大道 runs along the boundary). It is then clipped to a band around the boundary,
// measured in degrees of longitude and latitude (about 40 m, or 4 m for footpaths),
// and simplified. Pedestrian areas (area=yes) are left to the land layer.
// These rules approximate the published roads; see README for the remaining differences.
export const edgeRoadTypes = new Set(['primary']);
export const footTypes = new Set(['footway', 'steps', 'path']);
export const roadMargin = {vehicle: .0004, foot: .00004};
export const simplifyTolerance = .00001; // degrees, about 1 m

// Land cover classes in the order they are tested.
export function landType(tags) {
  if (tags.natural === 'wood' || tags.landuse === 'forest') return 'wood';
  if (tags.amenity === 'parking') return 'paved';
  if (['grass', 'meadow', 'recreation_ground'].includes(tags.landuse)) return tags.landuse;
  if (['garden', 'park', 'pitch', 'swimming_pool', 'track'].includes(tags.leisure)) return tags.leisure;
  if (tags.natural === 'water') return 'water';
  return null;
}

// Map labels, in display order, with names where the OSM name is too generic.
// Closed ways use their footprint centroid, open ways their last node (文理大道 ends at
// the library), nodes their position. An OSM height tag is passed on.
export const pois = [
  'w226829984', 'w227075021', 'w227101621', 'w227101851', 'w227104642', 'w367195923',
  'w367195941', ['w367196899', '圖書館總館'], 'w367198554', 'w367198636', 'w1302996436',
  'w109505205', 'w227124385', 'w341450780', 'w367700949', 'w368071581', 'w1507803521',
  'w367700897', ['n2358488959', '校友鐘樓'], 'n3714871469',
  ['n3721534704', '東大附中側校門'], ['n5439892666', '第一教學區校門'],
].map(entry => Array.isArray(entry) ? {osm: entry[0], name: entry[1]} : {osm: entry});
