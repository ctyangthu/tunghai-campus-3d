// Builds docs/data/campus-geo.json from .cache/osm.json (see fetch-osm.mjs).
//   node scripts/build-geo.mjs [--out=file.json]
// Coordinates are local metres (x east, z south) rounded to 0.1 m. The rules for
// what is kept, heights and road widths live in geo-rules.mjs.
import {readFile, writeFile} from 'node:fs/promises';
import {boundaryWay, cacheDir, origin} from './config.mjs';
import * as rules from './geo-rules.mjs';
import {round1, vector} from './lib/projection.mjs';

const outArg = process.argv.find(arg => arg.startsWith('--out='));
const outFile = outArg ? outArg.slice(6) : new URL('../docs/data/campus-geo.json', import.meta.url);
const osm = JSON.parse(await readFile(new URL('osm.json', cacheDir), 'utf8'));

const nodes = new Map(), ways = new Map(), relations = new Map();
for (const element of osm.elements) {
  ({node: nodes, way: ways, relation: relations})[element.type].set(element.id, element);
}

// ---------- geometry helpers ----------
const lonLat = id => {
  const node = nodes.get(id);
  if (!node) throw new Error(`Node ${id} is missing from .cache/osm.json`);
  return [node.lon, node.lat];
};
const local = point => vector.toLocal(point).map(round1);
const isClosed = ids => ids.length > 3 && ids[0] === ids.at(-1);
const open = ring => ring.slice(0, -1); // drop the repeated closing point

function signedArea(points) {
  let sum = 0;
  points.forEach(([x, z], i) => {
    const [nx, nz] = points[(i + 1) % points.length];
    sum += x * nz - nx * z;
  });
  return sum / 2;
}
const area = points => Math.abs(signedArea(points));
function centroid(points) {
  const a = signedArea(points);
  let cx = 0, cz = 0;
  points.forEach(([x, z], i) => {
    const [nx, nz] = points[(i + 1) % points.length];
    const cross = x * nz - nx * z;
    cx += (x + nx) * cross;
    cz += (z + nz) * cross;
  });
  return [cx / (6 * a), cz / (6 * a)];
}
function contains(points, [x, z]) {
  let hit = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i], [xj, zj] = points[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}
function segmentDistance([px, pz], [ax, az], [bx, bz]) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
}
// Distance outside a polygon; zero inside it.
function outside(polygon, point) {
  if (contains(polygon, point)) return 0;
  return Math.min(...polygon.map((a, i) => segmentDistance(point, a, polygon[(i + 1) % polygon.length])));
}

// Joins a multipolygon's member ways into closed rings of node ids, starting from
// the last member and following each way's direction where possible.
function rings(relation, role) {
  const pending = relation.members
    .filter(member => member.type === 'way' && member.role === role && ways.has(member.ref))
    .map(member => [...ways.get(member.ref).nodes]);
  const result = [];
  while (pending.length) {
    let ring = pending.pop();
    while (!isClosed(ring)) {
      const index = pending.findIndex(way => way[0] === ring.at(-1) || way.at(-1) === ring.at(-1));
      if (index < 0) break;
      const [way] = pending.splice(index, 1);
      ring = ring.concat((way[0] === ring.at(-1) ? way : way.reverse()).slice(1));
    }
    if (isClosed(ring)) result.push(ring);
  }
  return result;
}

// Returns the polygons of a closed way or multipolygon relation as {points, holes}:
// one per outer ring, each with the inner rings that fall inside it.
function polygons(element) {
  if (element.type === 'way') {
    if (!isClosed(element.nodes)) return [];
    return [{points: open(element.nodes).map(lonLat).map(local), holes: []}];
  }
  if (element.tags?.type !== 'multipolygon') return [];
  const inners = rings(element, 'inner').map(ring => open(ring).map(lonLat).map(local));
  return rings(element, 'outer').map(ring => {
    const points = open(ring).map(lonLat).map(local);
    return {points, holes: inners.filter(hole => contains(points, hole[0]))};
  });
}
const largest = shapes => shapes.reduce((best, shape) => !best || area(shape.points) > area(best.points) ? shape : best, null);
const multipolygonWays = new Set([...relations.values()]
  .filter(relation => relation.tags?.type === 'multipolygon')
  .flatMap(relation => relation.members.filter(member => member.type === 'way').map(member => member.ref)));

const key = element => element.type[0] + element.id;
const sortByTypeAndId = (a, b) => (a.type === b.type ? 0 : a.type === 'relation' ? -1 : 1) || a.id - b.id;
const areas = [...ways.values(), ...relations.values()].sort(sortByTypeAndId);

// ---------- campus boundary ----------
const boundaryElement = ways.get(boundaryWay);
if (!boundaryElement) throw new Error(`Boundary way ${boundaryWay} is missing`);
const boundary = open(boundaryElement.nodes).map(lonLat).map(local);
const boundaryLonLat = open(boundaryElement.nodes).map(lonLat);
const nearCampus = (point, margin) => outside(boundary, point) <= margin;

// ---------- buildings ----------
function buildingHeight(element, type, points, x) {
  const levels = Number.parseFloat(element.tags['building:levels']);
  if (Number.isFinite(levels)) {
    return {height: round1(levels * rules.buildings.metresPerLevel), levels, heightSource: 'levels'};
  }
  const osmKey = key(element);
  let height = rules.landmarkHeights[osmKey] ?? rules.typeHeights[type];
  if (height === undefined && type === 'university') {
    height = x < rules.firstTeachingAreaEdge
      ? rules.universityHeights.firstTeachingArea : rules.universityHeights.elsewhere;
  }
  height ??= rules.heightByArea(area(points));
  return {height, levels: null, heightSource: 'estimated'};
}

const buildings = [];
for (const element of areas) {
  const tags = element.tags ?? {};
  const type = tags.building ?? tags['building:part'];
  if (!type) continue;
  const shape = largest(polygons(element));
  if (!shape || area(shape.points) < rules.buildings.minArea) continue;
  const [x, z] = centroid(shape.points).map(round1);
  if (!nearCampus([x, z], rules.buildings.boundaryMargin)) continue;
  buildings.push({
    id: element.id, osm: key(element), name: tags.name ?? '', type,
    ...buildingHeight(element, type, shape.points, x),
    x, z, points: shape.points,
    ...(shape.holes.length ? {holes: shape.holes} : {}),
  });
}

// ---------- land cover ----------
const land = [];
for (const element of areas) {
  const tags = element.tags ?? {};
  const type = rules.landType(tags);
  if (!type || tags.building) continue;
  if (element.type === 'way' && multipolygonWays.has(element.id)) continue;
  for (const shape of polygons(element)) {
    if (area(shape.points) < rules.land.minArea) continue;
    const [x, z] = centroid(shape.points).map(round1);
    if (!nearCampus([x, z], rules.land.boundaryMargin)) continue;
    land.push({
      feature: {
        id: element.id, osm: key(element), name: tags.name ?? '', type, x, z, points: shape.points,
        ...(shape.holes.length ? {holes: shape.holes} : {}),
        ...(type === 'pitch' && tags.sport ? {sport: tags.sport} : {}),
      },
      size: area(shape.points),
    });
  }
}
land.sort((a, b) => b.size - a.size);

// ---------- roads ----------
// Keeps the parts of a line within `margin` degrees of the boundary.
function clip(line, margin) {
  const near = point => outside(boundaryLonLat, point) <= margin;
  const pieces = [];
  let current = near(line[0]) ? [line[0]] : null;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2e-6));
    let previousT = 0, previousNear = near(a);
    for (let s = 1; s <= steps; s++) {
      const t = s / steps, isNear = near(lerp(a, b, t));
      if (isNear !== previousNear) {
        let low = previousT, high = t;
        for (let k = 0; k < 40; k++) {
          const middle = (low + high) / 2;
          if (near(lerp(a, b, middle)) === previousNear) low = middle; else high = middle;
        }
        const edge = lerp(a, b, (low + high) / 2);
        if (isNear) current = [edge];
        else { current.push(edge); pieces.push(current); current = null; }
      }
      previousT = t;
      previousNear = isNear;
    }
    if (current && near(b)) current.push(b);
  }
  if (current) pieces.push(current);
  return pieces.filter(piece => piece.length > 1);
}
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const [first, last] = [points[0], points.at(-1)];
  let index = 0, furthest = -1;
  for (let i = 1; i < points.length - 1; i++) {
    const [dx, dz] = [last[0] - first[0], last[1] - first[1]];
    const length = Math.hypot(dx, dz);
    const distance = length
      ? Math.abs(dx * (first[1] - points[i][1]) - (first[0] - points[i][0]) * dz) / length
      : Math.hypot(points[i][0] - first[0], points[i][1] - first[1]);
    if (distance > furthest) { furthest = distance; index = i; }
  }
  if (furthest <= tolerance) return [first, last];
  return simplify(points.slice(0, index + 1), tolerance).slice(0, -1)
    .concat(simplify(points.slice(index), tolerance));
}

const roads = [];
for (const way of [...ways.values()].sort((a, b) => a.id - b.id)) {
  const tags = way.tags ?? {};
  const type = tags.highway;
  if (!(type in rules.roadWidths) || tags.area === 'yes') continue;
  const line = way.nodes.map(lonLat);
  if (!rules.edgeRoadTypes.has(type) && !line.some(point => contains(boundaryLonLat, point))) continue;
  const width = Number.parseFloat(tags.width) || rules.namedRoadWidths[tags.name] || rules.roadWidths[type];
  const margin = rules.footTypes.has(type) ? rules.roadMargin.foot : rules.roadMargin.vehicle;
  for (const piece of clip(line, margin)) {
    const points = simplify(piece, rules.simplifyTolerance).map(local)
      .filter((point, i, all) => i === 0 || point[0] !== all[i - 1][0] || point[1] !== all[i - 1][1]);
    if (points.length < 2) continue;
    roads.push({
      id: way.id, osm: key(way), name: tags.name ?? '', type, width, points,
      ...(tags.bridge && tags.bridge !== 'no' ? {bridge: true} : {}),
    });
  }
}

// ---------- labels and trees ----------
const pois = rules.pois.map(({osm: osmKey, name}) => {
  const id = Number(osmKey.slice(1));
  const element = osmKey[0] === 'n' ? nodes.get(id) : ways.get(id);
  if (!element) throw new Error(`Label ${osmKey} is missing from .cache/osm.json`);
  let position;
  if (element.type === 'node') position = local([element.lon, element.lat]);
  else if (isClosed(element.nodes)) position = centroid(open(element.nodes).map(lonLat).map(local)).map(round1);
  else position = local(lonLat(element.nodes.at(-1)));
  const height = Number.parseFloat(element.tags?.height);
  return {
    id, osm: osmKey, name: name ?? element.tags?.name ?? '', x: position[0], z: position[1],
    ...(Number.isFinite(height) ? {height} : {}),
  };
});

const trees = [...nodes.values()]
  .filter(node => node.tags?.natural === 'tree')
  .sort((a, b) => a.id - b.id)
  .map(node => local([node.lon, node.lat]))
  .filter(point => contains(boundary, point));

const geo = {
  origin,
  units: 'metres',
  axes: ['east', 'south'],
  boundaryId: boundaryWay,
  source: `https://www.openstreetmap.org/way/${boundaryWay}`,
  attribution: '© OpenStreetMap contributors',
  boundary,
  buildings,
  roads,
  land: land.map(item => item.feature),
  pois,
  trees,
};
await writeFile(outFile, JSON.stringify(geo));
console.log(`${outArg ? outFile : 'docs/data/campus-geo.json'}: ${buildings.length} buildings, ${roads.length} roads, ` +
  `${land.length} land areas, ${pois.length} labels, ${trees.length} trees (OSM ${osm.snapshot})`);
