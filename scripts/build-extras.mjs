// Builds data/campus-extras.json: features the school's campus map shows that the OSM
// tagging used by build-geo.mjs leaves out, because they are not tagged `building`.
//   node scripts/build-extras.mjs      (reads .cache/osm.json from fetch-osm.mjs)
// The output uses the same schema, projection and rounding as campus-geo.json.
import {readFile, writeFile} from 'node:fs/promises';
import {cacheDir} from './config.mjs';
import {round1, vector} from './lib/projection.mjs';

// OSM ways drawn as buildings, with the style and height they are modelled with.
// Each one was checked against the NLSC 2024 orthophoto.
const buildings = [
  // 學生福音中心 (campus map no. 40) is mapped as amenity=place_of_worship only.
  {osm: 'w227105790', type: 'church', style: 'hall', floors: 1},
  // 實習農牧場（養雞場） (no. 67): the sheds are mapped as landuse=farmyard.
  ...['w227093826', 'w227093829', 'w227095369', 'w227095373', 'w227095374', 'w227095375',
    'w227095378', 'w227095382', 'w227095384'].map(osm => ({osm, type: 'farm', style: 'shed', floors: 1})),
];
// OSM areas drawn on the ground.
const land = [
  {osm: 'w227078944', type: 'sand'}, // 馬場 (no. 72), leisure=horse_riding
];

const osm = JSON.parse(await readFile(new URL('osm.json', cacheDir), 'utf8'));
const nodes = new Map(), ways = new Map();
for (const element of osm.elements) {
  if (element.type === 'node') nodes.set(element.id, element);
  if (element.type === 'way') ways.set(element.id, element);
}

function outline(osmKey) {
  const way = ways.get(Number(osmKey.slice(1)));
  if (!way) throw new Error(`${osmKey} is missing from .cache/osm.json`);
  const ids = way.nodes[0] === way.nodes.at(-1) ? way.nodes.slice(0, -1) : way.nodes;
  const points = ids.map(id => {
    const node = nodes.get(id);
    if (!node) throw new Error(`Node ${id} of ${osmKey} is missing`);
    return vector.toLocal([node.lon, node.lat]).map(round1);
  });
  // Area centroid of the rounded points, as build-geo.mjs computes it.
  let area = 0, cx = 0, cz = 0;
  points.forEach(([x, z], i) => {
    const [nx, nz] = points[(i + 1) % points.length];
    const cross = x * nz - nx * z;
    area += cross / 2;
    cx += (x + nx) * cross;
    cz += (z + nz) * cross;
  });
  return {way, points, x: round1(cx / (6 * area)), z: round1(cz / (6 * area))};
}

const extras = {
  source: 'OpenStreetMap; see scripts/build-extras.mjs',
  buildings: buildings.map(({osm: osmKey, type, style, floors}) => {
    const {way, points, x, z} = outline(osmKey);
    return {id: way.id, osm: osmKey, name: way.tags?.name ?? '', type, style, floors, x, z, points};
  }),
  land: land.map(({osm: osmKey, type}) => {
    const {way, points, x, z} = outline(osmKey);
    return {id: way.id, osm: osmKey, name: way.tags?.name ?? '', type, x, z, points};
  }),
};
await writeFile(new URL('../data/campus-extras.json', import.meta.url), JSON.stringify(extras));
console.log(`data/campus-extras.json: ${extras.buildings.length} buildings, ${extras.land.length} land areas`);
