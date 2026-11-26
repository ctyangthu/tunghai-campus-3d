// Builds data/campus-bus.json: the campus shuttle's weekday routes, stops and
// departure times. Timetables come from 東海大學校園公車時刻表
// (https://bus.service.thu.edu.tw/timetable/<route>/zh_TW); stop positions are
// OpenStreetMap bus_stop nodes where mapped, otherwise the roadside next to the
// building the stop is named after; each route follows the drivable campus roads
// (docs/data/campus-geo.json) from stop to stop.
//
//   node scripts/build-bus.mjs            (set NODE_USE_ENV_PROXY=1 behind a proxy)
import {readFile, writeFile} from 'node:fs/promises';

const base = 'https://bus.service.thu.edu.tw';

// Stops in local metres (x east, z south).
const STOPS = {
  'social-sciences': {zh: '社科院', en: 'College of Social Sciences', at: [-967.3, -168.5]},   // 力行路 beside 社會科學院
  'agriculture-law': {zh: '農法學院（化材系）', en: 'Colleges of Agriculture & Law', at: [-766.1, 78.2]}, // 科技路 beside 化材系館
  'basic-science': {zh: '基礎科學館', en: 'Basic Science Building', at: [-605, 131.2]},        // 科技路 below 基礎科學館
  'girls-dorm': {zh: '女舍陽光草坪', en: 'Women’s Residences, Sunshine Lawn', at: [-298.2, 47.7]}, // OSM n3716494690
  'green-heart': {zh: '綠之心（乳品小棧）', en: 'Green Heart (Dairy Shop)', at: [59.6, -55.8]},   // OSM n13132325690
  'farm-lake': {zh: '農牧場東海湖', en: 'Tunghai Farm & Lake', at: [465.1, -92]},               // OSM n3716507503
  // The next two follow the university's live bus map: the residences stop on the road
  // north of 73棟 (OSM n3716507505 is 40 m east), 管理學院 at the 力行路 junction east of
  // the college (OSM n3716507507 is 40 m west).
  'second-dorms': {zh: '第二教學區學生宿舍', en: 'Second Teaching Area Residences', at: [667, -91.6]},
  'management': {zh: '管理學院', en: 'College of Management', at: [765, -411]},
  'mens-dorm-15': {zh: '男舍15棟', en: 'Men’s Residence 15', at: [-229.9, -99.2]},              // OSM n3716494683
  'languages': {zh: '語文館北側', en: 'Languages Building (north)', at: [-559.9, -165.6]},        // OSM n3716494688
  'technology': {zh: '科技大樓', en: 'Science & Technology Building', at: [-813.5, -273.5]},     // OSM n3716507502
};

// The two weekday routes and how the timetable's stop names map onto STOPS.
// `via` pins a leg to the roads the bus actually takes where the shortest path differs:
// route 1 runs up 約農路 west of the chapel lawn to 德耀路, down 篤信路 past 女舍陽光草坪,
// and stays on 篤信路 before turning north to 銘賢路 (as marked by the university).
// `skip` drops a timetable stop the bus does not pass: on the live bus map route 1 turns
// north at 農牧場東海湖 up 力行路 straight to 管理學院 (its 7th stop there), so it does not
// call at the second-area residences on the southern road, which route 2 serves.
const ROUTES = [
  {id: 1, key: 'down', zh: '社科院 → 管理學院', en: 'Social Sciences → Management', color: '#d9792b', skip: ['second-dorms'], via: {
    'basic-science>girls-dorm': [[-493.7, 9.9], [-451.7, -45.2]],
    'girls-dorm>green-heart': [[-208.6, 72.9], [-96.7, 72.2]],
  }},
  {id: 2, key: 'up', zh: '管理學院 → 社科院', en: 'Management → Social Sciences', color: '#2f7fb8', skip: [], via: {}},
];
const NAMES = [
  [/社科院/, 'social-sciences'], [/農法學院/, 'agriculture-law'], [/基礎科學館/, 'basic-science'],
  [/女舍/, 'girls-dorm'], [/綠之心/, 'green-heart'], [/農牧場/, 'farm-lake'], [/第二教學區/, 'second-dorms'],
  [/管院|管理學院/, 'management'], [/男舍15/, 'mens-dorm-15'], [/語文館/, 'languages'], [/科技大樓/, 'technology'],
];

async function timetable(route) {
  const response = await fetch(`${base}/timetable/${route}/zh_TW`, {headers: {'user-agent': 'tunghai-campus-3d data script'}});
  if (!response.ok) throw new Error(`timetable ${route}: HTTP ${response.status}`);
  const html = await response.text();
  const departures = [...html.matchAll(/<td class="fw-bold">\s*(\d\d:\d\d)\s*<\/td>/g)].map(m => m[1]).sort();
  const table = html.slice(html.indexOf('站名'));
  const stops = [...table.matchAll(/<tr><td>\d+<\/td><td>([^<]+)<\/td><\/tr>/g)].map(m => {
    const name = m[1].trim();
    const known = NAMES.find(([pattern]) => pattern.test(name));
    if (!known) throw new Error(`timetable ${route}: unknown stop ${name}`);
    return known[1];
  });
  if (!departures.length || stops.length < 2) throw new Error(`timetable ${route}: no departures or stops`);
  return {departures, stops};
}

// Road graph over the drivable campus roads (not 臺灣大道, not footpaths).
const geo = JSON.parse(await readFile(new URL('../docs/data/campus-geo.json', import.meta.url), 'utf8'));
// 東海南路 between 綠之心 and 力行路 (OSM w368190050) is missing from campus-geo.json;
// the shuttle uses it between 女舍陽光草坪 and 綠之心.
const missingRoads = [{osm: 'w368190050', points: [[56, -9], [62, -24], [66, -38], [70, -51]]}];
const roads = [...geo.roads.filter(road => ['residential', 'service', 'unclassified', 'track'].includes(road.type)), ...missingRoads];
const vertices = [], edges = new Map(), grid = new Map();
const cell = ([x, z]) => `${Math.floor(x / 2)},${Math.floor(z / 2)}`;
function vertex(point) {
  const [cx, cz] = cell(point).split(',').map(Number);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    for (const id of grid.get(`${cx + i},${cz + j}`) ?? []) {
      if (Math.hypot(vertices[id][0] - point[0], vertices[id][1] - point[1]) < 1) return id;
    }
  }
  vertices.push(point);
  const key = cell(point);
  if (!grid.has(key)) grid.set(key, []);
  grid.get(key).push(vertices.length - 1);
  edges.set(vertices.length - 1, []);
  return vertices.length - 1;
}
function link(a, b) {
  const length = Math.hypot(vertices[a][0] - vertices[b][0], vertices[a][1] - vertices[b][1]);
  edges.get(a).push([b, length]);
  edges.get(b).push([a, length]);
}
const segments = [];
for (const road of roads) {
  const ids = road.points.map(vertex);
  for (let i = 1; i < ids.length; i++) if (ids[i] !== ids[i - 1]) { link(ids[i - 1], ids[i]); segments.push([ids[i - 1], ids[i]]); }
}
// A point joins the graph at its nearest point on a road segment.
function attach([x, z], skip = () => false) {
  let best = null;
  for (const [a, b] of segments) {
    if (skip(a, b)) continue;
    const [ax, az] = vertices[a], [bx, bz] = vertices[b];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    const px = ax + t * dx, pz = az + t * dz, d = Math.hypot(px - x, pz - z);
    if (!best || d < best.d) best = {d, a, b, point: [px, pz]};
  }
  const id = vertex(best.point);
  if (id !== best.a) link(id, best.a);
  if (id !== best.b) link(id, best.b);
  return {id, offset: best.d};
}
// Road ends that stop on another road (T junctions the simplified outlines no longer
// share a vertex for) are joined to it.
const ends = new Set(roads.flatMap(road => [road.points[0], road.points.at(-1)]).map(vertex));
for (const end of ends) {
  const own = new Set(edges.get(end).map(([next]) => next));
  const near = attach(vertices[end], (a, b) => a === end || b === end || own.has(a) && own.has(b));
  if (near.offset > 4) continue;
  if (near.id !== end) link(end, near.id);
}
function shortest(from, to) {
  const distance = new Map([[from, 0]]), previous = new Map(), done = new Set();
  const queue = [[0, from]];
  while (queue.length) {
    queue.sort((p, q) => p[0] - q[0]);
    const [d, node] = queue.shift();
    if (done.has(node)) continue;
    if (node === to) break;
    done.add(node);
    for (const [next, length] of edges.get(node)) {
      const nd = d + length;
      if (nd < (distance.get(next) ?? Infinity)) { distance.set(next, nd); previous.set(next, node); queue.push([nd, next]); }
    }
  }
  if (!distance.has(to)) throw new Error('no road path between stops');
  const path = [to];
  while (path[0] !== from) path.unshift(previous.get(path[0]));
  return {path, length: distance.get(to)};
}

const stopNodes = Object.fromEntries(Object.entries(STOPS).map(([id, stop]) => {
  const {id: node, offset} = attach(stop.at);
  if (offset > 20) throw new Error(`stop ${id} is ${offset.toFixed(1)} m from a road`);
  return [id, node];
}));
const round = v => Math.round(v * 10) / 10;
const routes = [];
for (const route of ROUTES) {
  const timetabled = await timetable(route.id);
  const departures = timetabled.departures, stops = timetabled.stops.filter(stop => !route.skip.includes(stop));
  const path = [];
  let length = 0;
  for (let i = 1; i < stops.length; i++) {
    const via = (route.via[`${stops[i - 1]}>${stops[i]}`] ?? []).map(point => {
      const {id, offset} = attach(point);
      if (offset > 5) throw new Error(`route ${route.id}: waypoint ${point} is ${offset.toFixed(1)} m from a road`);
      return id;
    });
    const nodes = [stopNodes[stops[i - 1]], ...via, stopNodes[stops[i]]];
    for (let k = 1; k < nodes.length; k++) {
      const leg = shortest(nodes[k - 1], nodes[k]);
      length += leg.length;
      path.push(...leg.path.slice(path.length ? 1 : 0).map(id => vertices[id].map(round)));
    }
  }
  const {via, skip, ...details} = route;
  routes.push({...details, days: 'weekdays', stops, departures, length: Math.round(length), path,
    source: `${base}/timetable/${route.id}/zh_TW`});
  console.log(`route ${route.id}: ${stops.length} stops, ${departures.length} departures ${departures[0]}–${departures.at(-1)}, ${Math.round(length)} m`);
}
const used = new Set(routes.flatMap(route => route.stops));
const stops = Object.fromEntries(Object.entries(STOPS).filter(([id]) => used.has(id))
  .map(([id, {zh, en}]) => [id, {zh, en, at: vertices[stopNodes[id]].map(round)}]));
await writeFile(new URL('../data/campus-bus.json', import.meta.url), JSON.stringify({
  source: base, retrieved: new Date().toISOString().slice(0, 10), stops, routes,
}) + '\n');
