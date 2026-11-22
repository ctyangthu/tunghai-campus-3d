import * as T from 'three';
import {paint} from './kit.js';
import {edgeRoof, orientedBox, signedArea} from './dorms.js';

// Faculty housing along 東海路, in the four kinds the 總務處保管組 housing page lists
// (https://property.thu.edu.tw/web/student/detail.php?id=8):
//   A House  舊式宿舍 A：獨棟平房, 50.40 坪, completed before 民國 46 年, timber-truss roof
//   B House  舊式宿舍 B：獨棟平房, 52.30 坪, same era
//   C House  舊式宿舍 C：雙併平房 with a 中庭, 35.60 坪 per unit, completed before 民國 68 年 9 月
//   學人宿舍  加強磚造二層式, completed 民國 68 年 9 月 – 81 年 7 月:
//            SA 17.52 坪 and SC 26.71 坪 are one flat per floor (house numbers end A/B),
//            SB 43.56 坪 is one house over both floors.
// Which building is which comes from the OpenStreetMap address points on 東海路
// (one house number: detached; two: 雙併; lane numbers with A/B: flats; lane numbers
// alone: SB) and from the plan shape on the NLSC 2024 orthophoto. 東海路 24 號 is
// documented as a B House (臺中市文化資產處「東海大學早期校園」圖說); its plan, a long
// gabled bar with one side wing, is taken as the B type, and the wider T, cross or
// hipped plans as the A type. A and B houses keep the 45° turn of the early layout.

export const facultyPlaces = {A: 'faculty-house-a', B: 'faculty-house-b', C: 'faculty-house-c', S: 'scholars-residence'};

// OSM way → [kind, 東海路 house numbers]. Kinds SA, SB, SC are 學人宿舍; SC132 is the
// larger SC flats of 130 and 132 巷.
const HOUSES = {
  // A House: broad, T, cross or hipped plans.
  w227024175: ['A', '9'], w226997119: ['A', '12'], w226997118: ['A', '14B'], w227075005: ['A', '29'],
  w227074997: ['A', '29之3、29之4'], w227074996: ['A', '29之5、29之6'], w226997117: ['A', ''],
  w226997113: ['A', ''], w227078950: ['A', '60'], w227078946: ['A', '81'], w227009308: ['A', '83之2'],
  // B House: long gabled bar with one wing, like 24 號.
  w227024179: ['B', '24'], w227075001: ['B', '41'], w227024180: ['B', '2'], w227024174: ['B', '8'],
  w227024173: ['B', '20'], w227024178: ['B', '22'], w227024183: ['B', '26'], w227075017: ['B', '34'],
  w227076909: ['B', '82'], w227075019: ['B', '108'], w227074998: ['B', ''], w227074999: ['B', ''],
  w226997116: ['B', ''], w227024172: ['B', ''], w1309048741: ['B', ''],
  // C House: 雙併, two house numbers (or a U plan around a 中庭).
  w227024177: ['C', '1、3'], w227024176: ['C', '5、7'], w227024167: ['C', '10、10A'],
  w227024168: ['C', '13、15'], w226997114: ['C', '21、23'], w226997115: ['C', '27'],
  w227024182: ['C', '28之1、28之2'], w227024181: ['C', '30之1'], w227075018: ['C', '36、38'],
  w227075016: ['C', '40、42'], w227075022: ['C', '44'], w1333620993: ['C', '48、50'],
  w227078956: ['C', '52、54'], w227078949: ['C', '56、58'], w227075023: ['C', '59'],
  w227076902: ['C', '61、63'], w227078945: ['C', '64、66'], w227076904: ['C', '68、70'],
  w861783800: ['C', '69、71'], w227076906: ['C', '72、74'], w227009309: ['C', '73、75'],
  w227076910: ['C', '76、78'], w227076912: ['C', '84、86'], w227078948: ['C', '85、87'],
  w227076911: ['C', '88、90'], w227078958: ['C', '92、94'], w227078957: ['C', '100、102'],
  w227075020: ['C', '112、114'], w227075015: ['C', '118、120'], w227074519: ['C', '122、124'],
  w227074520: ['C', '126、128'],
  // 學人宿舍 rows.
  w227024169: ['SB', '11巷'], w227024171: ['SB', '11巷'], w226997111: ['SB', '15巷'],
  w226997112: ['SA', '13巷'], w227024170: ['SA', '13巷'],
  w226997110: ['SC', '15巷'], w226996029: ['SC', '15巷'], w226996030: ['SC', '15巷'],
  w226996031: ['SC', '17巷'], w226997109: ['SC', '17巷'], w226996027: ['SC', '17巷'], w226996028: ['SC', '17巷'],
  w226996025: ['SC', '19巷'], w226996026: ['SC', '19巷'], w226996023: ['SC', '21巷'], w226996024: ['SC', '21巷'],
  w226996021: ['SC', '23巷'], w226996022: ['SC', '23巷'],
  w227075009: ['SC132', '130巷'], w227075010: ['SC132', '130巷'],
  w227075007: ['SC132', '132巷'], w227075008: ['SC132', '132巷'],
};

// The building whose roof carries each type's label.
const REPRESENTATIVE = {A: 'w227075005', B: 'w227024179', C: 'w227024177', S: 'w226997112'};

const STYLES = {
  // Early houses: warm white walls framed by dark timber posts, brick plinth, hipped tile roof.
  A: {wall: '#ece6d6', trim: '#4a3527', plinth: '#8e5440', glass: '#3b4644', roof: '#6b7170',
    eave: 3.5, roof_: 'hip', pitch: .5, overhang: 1.05, posts: true, window: 1.7},
  // 24 號: white walls, black window frames, dark grey base and a low gabled tile roof.
  B: {wall: '#f0ece2', trim: '#34322f', plinth: '#68645e', glass: '#3a4446', roof: '#70767a',
    eave: 3.3, roof_: 'gable', pitch: .48, overhang: .85, window: 1.6},
  // 雙併: two mirrored units, an entrance each and a party wall between them.
  C: {wall: '#e4ded0', trim: '#706b63', plinth: '#7b766e', glass: '#46504f', roof: '#73787a',
    eave: 3.2, roof_: 'hip', pitch: .48, overhang: .8, window: 1.45, pair: true},
  // 學人宿舍: two storeys of brick-red tile with white floor bands, a gable per stepped unit.
  S: {wall: '#a2614b', trim: '#e8e4da', plinth: '#7d7368', glass: '#45545a', roof: '#676c6c',
    eave: 6.3, floors: 2, floorHeight: 3, roof_: 'gable', pitch: .45, overhang: .6, window: 1.5},
};

export function facultyHouseSpec(building) {
  const entry = HOUSES[building.osm];
  if (!entry) return null;
  const [kind, numbers] = entry;
  const type = kind[0] === 'S' ? 'S' : kind;
  const style = kind === 'SC132' ? {...STYLES.S, roof_: 'hip'} : STYLES[type];
  return {kind, type, numbers, style, place: facultyPlaces[type], representative: REPRESENTATIVE[type] === building.osm};
}

function cluster(values, tolerance) {
  const groups = [];
  for (const value of [...values].sort((a, b) => a - b)) {
    const last = groups.at(-1);
    if (last && value - last.at(-1) < tolerance) last.push(value);
    else groups.push([value]);
  }
  return groups.map(group => group.reduce((sum, v) => sum + v, 0) / group.length);
}

// Splits a footprint into column strips across `a` (runs along `b`), merging neighbouring
// strips whose runs line up. Returns rectangles {a0, a1, b0, b1}.
function strips(as, bs, isIn) {
  const rects = [];
  let open = [];
  for (let i = 0; i < as.length - 1; i++) {
    const runs = [];
    let start = null;
    for (let j = 0; j < bs.length - 1; j++) {
      const hit = isIn((as[i] + as[i + 1]) / 2, (bs[j] + bs[j + 1]) / 2);
      if (hit && start === null) start = j;
      if (!hit && start !== null) runs.push([bs[start], bs[j]]), start = null;
    }
    if (start !== null) runs.push([bs[start], bs.at(-1)]);
    const next = [];
    for (const [b0, b1] of runs) {
      const previous = open.find(r => Math.abs(r.b0 - b0) < 1.2 && Math.abs(r.b1 - b1) < 1.2);
      if (previous) {
        previous.a1 = as[i + 1];
        previous.b0 = Math.min(previous.b0, b0);
        previous.b1 = Math.max(previous.b1, b1);
        next.push(previous);
      } else {
        const rect = {a0: as[i], a1: as[i + 1], b0, b1};
        rects.push(rect);
        next.push(rect);
      }
    }
    open = next;
  }
  return rects.filter(r => r.a1 - r.a0 > 1.5 && r.b1 - r.b0 > 1.5);
}

// Rectangles {u0, u1, v0, v1} covering the footprint in the house's own frame.
function decompose(ring, frame, isIn, alongRows) {
  const local = ring.map(([x, z]) => frame.toLocal(x, z));
  const us = cluster(local.map(p => p[0]), .9), vs = cluster(local.map(p => p[1]), .9);
  const byU = strips(us, vs, isIn).map(r => ({u0: r.a0, u1: r.a1, v0: r.b0, v1: r.b1}));
  if (alongRows) return byU;
  const byV = strips(vs, us, (v, u) => isIn(u, v)).map(r => ({u0: r.b0, u1: r.b1, v0: r.a0, v1: r.a1}));
  const largest = rects => Math.max(...rects.map(r => (r.u1 - r.u0) * (r.v1 - r.v0)));
  if (!byV.length) return byU;
  if (!byU.length || byV.length < byU.length) return byV;
  return byU.length === byV.length && largest(byV) > largest(byU) ? byV : byU;
}

export function facultyHouse(footprint, terrainHeight, spec, batch, roofColor) {
  // Orthophoto samples of these small roofs are darkened by the surrounding trees, so
  // they only tint the tile grey.
  const roof = roofColor ? '#' + new T.Color(roofColor).lerp(new T.Color(spec.style.roof), .6).getHexString() : spec.style.roof;
  const style = {...spec.style, roof};
  const grade = terrainHeight(footprint.x, footprint.z);
  const low = Math.min(grade, ...footprint.points.map(([x, z]) => terrainHeight(x, z)));
  const ring = footprint.points.map(([x, z]) => [x - footprint.x, z - footprint.z]);
  const winding = Math.sign(signedArea(ring)) || 1;
  const group = new T.Group();
  group.position.set(footprint.x, grade, footprint.z);
  const {eave} = style;
  const base = low - grade - .4;
  const wallPaint = paint(style.wall), roofPaint = paint(style.roof, T.DoubleSide);
  const pickables = [];

  const shape = new T.Shape();
  ring.forEach(([x, z], i) => shape[i ? 'lineTo' : 'moveTo'](x, -z));
  const body = new T.ExtrudeGeometry(shape, {depth: eave - base, bevelEnabled: false, curveSegments: 1});
  body.rotateX(-Math.PI / 2);
  body.translate(0, base, 0);
  const walls = new T.Mesh(body, [paint(style.roof), wallPaint]);
  walls.castShadow = walls.receiveShadow = true;
  group.add(walls);
  pickables.push(walls);

  const box = orientedBox(ring);
  const c = Math.cos(box.angle), s = Math.sin(box.angle);
  const frame = {
    toLocal: (x, z) => [(x - box.cx) * c + (z - box.cz) * s, -(x - box.cx) * s + (z - box.cz) * c],
    toXZ: (u, v) => [box.cx + u * c - v * s, box.cz + u * s + v * c],
  };
  const isIn = (u, v) => inside(ring, ...frame.toXZ(u, v));
  const [ox, oy, oz] = [footprint.x, grade, footprint.z];
  const add = (material, x, y, z, w, h, d, yaw) => batch.add(material, ox + x, oy + y, oz + z, w, h, d, yaw);

  // Roofs: one per rectangle, gabled or hipped, ridge along the rectangle's length or,
  // for a wing, away from the block it joins; a lower wing runs into the taller roof.
  const rows = spec.type === 'S';
  let rects = decompose(ring, frame, isIn, rows);
  const covered = rects.reduce((sum, r) => sum + (r.u1 - r.u0) * (r.v1 - r.v0), 0);
  const area = Math.abs(signedArea(ring));
  let top = eave;
  if (!rects.length || rects.length > 9 || covered < area * .8 || covered > area * 1.25) {
    const rise = 2.2;
    const roof = new T.Mesh(edgeRoof(ring, winding, eave, style.overhang, 4.4, rise), roofPaint);
    roof.castShadow = roof.receiveShadow = true;
    group.add(roof);
    pickables.push(roof);
    rects = [];
    top = eave + rise;
  }
  const slopes = [], gables = [];
  const sizeOf = r => (r.u1 - r.u0) * (r.v1 - r.v0);
  const main = rects.reduce((best, r) => !best || sizeOf(r) > sizeOf(best) ? r : best, null);
  const ridgeCap = paint('#3f4443');
  for (const r of rects) {
    const attached = side => {
      const out = .7;
      return [.25, .5, .75].some(t => {
        if (side === 'u0') return isIn(r.u0 - out, r.v0 + (r.v1 - r.v0) * t);
        if (side === 'u1') return isIn(r.u1 + out, r.v0 + (r.v1 - r.v0) * t);
        if (side === 'v0') return isIn(r.u0 + (r.u1 - r.u0) * t, r.v0 - out);
        return isIn(r.u0 + (r.u1 - r.u0) * t, r.v1 + out);
      });
    };
    const alongU = r.u1 - r.u0 >= r.v1 - r.v0;
    let ridgeU = rows || alongU;
    if (!rows && r !== main) {
      const uSides = attached('u0') || attached('u1'), vSides = attached('v0') || attached('v1');
      if (uSides !== vSides) ridgeU = uSides;
    }
    // Work in a frame where the ridge runs along p, the span across q.
    let [p0, p1, q0, q1] = ridgeU ? [r.u0, r.u1, r.v0, r.v1] : [r.v0, r.v1, r.u0, r.u1];
    const half = (q1 - q0) / 2, mainHalf = main ? Math.min(main.u1 - main.u0, main.v1 - main.v0) / 2 : half;
    const toXZ = (p, q) => ridgeU ? frame.toXZ(p, q) : frame.toXZ(q, p);
    const inP = (p, q) => ridgeU ? isIn(p, q) : isIn(q, p);
    if (!rows && r !== main && half < mainHalf - .3) {
      for (const end of [0, 1]) {
        const edge = end ? p1 : p0, dir = end ? 1 : -1;
        if (!inP(edge + dir * .7, (q0 + q1) / 2)) continue;
        let reach = Math.min(half, 5);
        while (reach > .3 && !inP(edge + dir * reach, (q0 + q1) / 2)) reach /= 2;
        if (end) p1 += reach; else p0 -= reach;
      }
    }
    const o = style.overhang, pitch = style.pitch, qc = (q0 + q1) / 2;
    const edgeY = eave - o * pitch, ridgeY = eave + half * pitch;
    const P = (p, q, y) => {
      const [x, z] = toXZ(p, q);
      return [x, y, z];
    };
    let r1, r2;
    if (style.roof_ === 'gable') {
      const g = o * .6;
      const [a, b] = [p0 - g, p1 + g];
      r1 = P(a, qc, ridgeY);
      r2 = P(b, qc, ridgeY);
      slopes.push(P(a, q0 - o, edgeY), P(b, q0 - o, edgeY), r2, P(a, q0 - o, edgeY), r2, r1);
      slopes.push(P(a, q1 + o, edgeY), r1, r2, P(a, q1 + o, edgeY), r2, P(b, q1 + o, edgeY));
      for (const p of [p0, p1]) gables.push(P(p, q0, eave), P(p, q1, eave), P(p, qc, ridgeY));
    } else {
      const along = (p1 - p0) / 2 + o, across = half + o, pc = (p0 + p1) / 2;
      const ridge = Math.max(0, along - across);
      r1 = P(pc - ridge, qc, ridgeY);
      r2 = P(pc + ridge, qc, ridgeY);
      const [a, b, cc, d] = [P(pc - along, q0 - o, edgeY), P(pc + along, q0 - o, edgeY),
        P(pc + along, q1 + o, edgeY), P(pc - along, q1 + o, edgeY)];
      slopes.push(a, b, r2, a, r2, r1, cc, d, r1, cc, r1, r2, b, cc, r2, d, a, r1);
    }
    const ridgeLength = Math.hypot(r2[0] - r1[0], r2[2] - r1[2]);
    if (ridgeLength > .5) {
      const yaw = -Math.atan2(r2[2] - r1[2], r2[0] - r1[0]);
      add(ridgeCap, (r1[0] + r2[0]) / 2, ridgeY + .07, (r1[2] + r2[2]) / 2, ridgeLength + .2, .16, .32, yaw);
    }
    top = Math.max(top, ridgeY);
  }
  for (const [vertices, material] of [[slopes, roofPaint], [gables, paint(style.wall, T.DoubleSide)]]) {
    if (!vertices.length) continue;
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(vertices.flat(), 3));
    geometry.computeVertexNormals();
    const mesh = new T.Mesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    pickables.push(mesh);
  }

  // Walls: plinth, windows, doors, and the details that tell the types apart.
  const edges = ring.map(([x, z], i) => {
    const [nx, nz] = ring[(i + 1) % ring.length];
    const dx = nx - x, dz = nz - z, length = Math.hypot(dx, dz);
    return {x, z, dx, dz, length, normalX: winding * dz / length, normalZ: -winding * dx / length, yaw: -Math.atan2(dz, dx)};
  });
  const front = edges.reduce((best, edge) => !best || edge.length > best.length ? edge : best, null);
  const trim = paint(style.trim), glass = paint(style.glass), plinth = paint(style.plinth);
  const door = paint(spec.type === 'S' ? '#6b4a36' : '#4b3324');
  const floors = style.floors ?? 1, floorHeight = style.floorHeight ?? eave;
  for (const edge of edges) {
    const {x, z, dx, dz, length, normalX, normalZ, yaw} = edge;
    if (length < 1.2) continue;
    const on = (along, y, offset, w, h, d, material) =>
      add(material, x + dx * along / length + normalX * offset, y, z + dz * along / length + normalZ * offset, w, h, d, yaw);
    on(length / 2, (base + .55) / 2, .05, length + .1, .55 - base, .12, plinth);
    on(length / 2, eave - .14, .06, length + .1, .28, .14, trim);
    for (let floor = 1; floor < floors; floor++) on(length / 2, floor * floorHeight + .1, .07, length + .1, .32, .16, trim);
    if (style.posts) {
      const posts = Math.max(1, Math.round(length / 3.6));
      for (let i = 0; i <= posts; i++) on(length * i / posts, (eave + .55) / 2, .07, .2, eave - .55, .16, trim);
    }
    if (length < 3) continue;
    const doors = edge !== front ? [] : spec.type === 'C' ? [.25, .75] : spec.type === 'S' ? [] : [.5];
    for (const t of doors) {
      on(length * t, 1.6, .06, 1.25, 2.3, .1, trim);
      on(length * t, 1.6, .1, 1, 2.15, .08, door);
      on(length * t, .35, .5, 1.8, .7, .9, plinth);
    }
    if (style.pair && edge === front) on(length / 2, (eave + .55) / 2, .1, .36, eave - .55, .2, plinth);
    const bays = Math.max(1, Math.floor(length / 3.4));
    const span = length / bays;
    const width = Math.min(span - .9, style.window);
    for (let floor = 0; floor < floors; floor++) {
      const y = floor * floorHeight + (floors > 1 ? 1.55 : 1.85);
      const height = floors > 1 ? 1.35 : 1.25;
      for (let bay = 0; bay < bays; bay++) {
        const along = (bay + .5) * span;
        if (floor === 0 && doors.some(t => Math.abs(along - length * t) < 1.4)) continue;
        on(along, y, .04, width + .24, height + .2, .1, trim);
        on(along, y, .09, width, height, .08, glass);
        if (spec.type !== 'S') on(along, y, .12, .07, height, .06, trim);
      }
    }
  }
  return {group, top: grade + top, pickables};
}

function inside(points, x, z) {
  let hit = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i], [xj, zj] = points[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}
