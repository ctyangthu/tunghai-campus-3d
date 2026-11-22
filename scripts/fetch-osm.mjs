// Downloads OpenStreetMap data around campus into .cache/osm.json.
//   node scripts/fetch-osm.mjs                  Overpass snapshot at osmDate (config.mjs)
//   node scripts/fetch-osm.mjs --latest         Overpass, current data
//   node scripts/fetch-osm.mjs --source=api     OSM editing API, current data only
// Without --source, the OSM API is used when Overpass cannot be reached.
// Both sources produce plain elements: nodes with lat/lon, ways with node ids,
// relations with members, which build-geo.mjs turns into the scene layers.
import {mkdir, writeFile} from 'node:fs/promises';
import {boundaryWay, cacheDir, osmApi, osmDate, overpass, terrain} from './config.mjs';
import {vector} from './lib/projection.mjs';

const args = process.argv.slice(2);
const latest = args.includes('--latest');
const source = args.find(arg => arg.startsWith('--source='))?.slice(9);
const headers = {'user-agent': 'tunghai-campus-3d data script'};

// Fetch a margin beyond the terrain board; build-geo.mjs decides what to keep.
const margin = 250;
const [west, north, east, south] = terrain.bounds;
const [minLon, maxLat] = vector.toLonLat([west - margin, north - margin]);
const [maxLon, minLat] = vector.toLonLat([east + margin, south + margin]);
const round6 = value => value.toFixed(6);

async function fromOverpass() {
  const bbox = [minLat, minLon, maxLat, maxLon].map(round6).join(',');
  const query = `[out:json][timeout:180]${latest ? '' : `[date:"${osmDate}"]`};
(
  way(${boundaryWay});
  nwr["building"](${bbox});
  nwr["building:part"](${bbox});
  way["highway"](${bbox});
  nwr["landuse"](${bbox});
  nwr["leisure"](${bbox});
  nwr["natural"](${bbox});
  nwr["amenity"="parking"](${bbox});
  node(id:3714871469,3721534704,5439892666);
);
(._; >;);
out body qt;`;
  const response = await fetch(overpass, {
    method: 'POST',
    headers: {...headers, 'content-type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({data: query}),
  });
  if (!response.ok) throw new Error(`Overpass: HTTP ${response.status}\n${await response.text()}`);
  const data = await response.json();
  return {source: overpass, snapshot: latest ? data.osm3s?.timestamp_osm_base : osmDate, elements: data.elements};
}

async function getJson(path) {
  const response = await fetch(`${osmApi}${path}`, {headers});
  if (!response.ok) throw new Error(`OSM API ${path}: HTTP ${response.status}\n${await response.text()}`);
  return response.json();
}

async function fromApi() {
  const bbox = [minLon, minLat, maxLon, maxLat].map(round6).join(',');
  const map = await getJson(`/map.json?bbox=${bbox}`);
  const elements = new Map(map.elements.map(element => [`${element.type}/${element.id}`, element]));
  const add = list => list.forEach(element => elements.set(`${element.type}/${element.id}`, element));
  // /map omits relation members that lie wholly outside the box, and the boundary
  // way may cross it; fetch those complete.
  add((await getJson(`/way/${boundaryWay}/full.json`)).elements);
  for (const relation of map.elements.filter(element => element.type === 'relation')) {
    if (relation.members.some(member => member.type === 'way' && !elements.has(`way/${member.ref}`))) {
      add((await getJson(`/relation/${relation.id}/full.json`)).elements);
    }
  }
  return {source: osmApi, snapshot: new Date().toISOString(), elements: [...elements.values()]};
}

let result;
if (source === 'api') {
  result = await fromApi();
} else {
  try {
    result = await fromOverpass();
  } catch (error) {
    if (source === 'overpass') throw error;
    console.warn(`Overpass unavailable (${error.cause?.code ?? error.message.split('\n')[0]}); using the OSM API, current data only.`);
    result = await fromApi();
  }
}
await mkdir(cacheDir, {recursive: true});
await writeFile(new URL('osm.json', cacheDir), JSON.stringify(result));
console.log(`.cache/osm.json: ${result.elements.length} elements from ${result.source} (${result.snapshot})`);
