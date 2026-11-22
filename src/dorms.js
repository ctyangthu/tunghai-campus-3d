import * as T from 'three';
import {paint} from './kit.js';

// Low-rise and dormitory buildings drawn in a few campus styles.
//
// Student dormitories: exteriors follow the NLSC 2024 orthophoto (roof colour, ridge
// lines, rooftop solar arrays) and published photographs: the early men's dorms are
// exposed red brick under grey tiled hipped roofs with deep eaves; the women's dorms
// are white plaster with dark timber balcony corridors under grey tiled roofs; the
// later mid- and high-rise blocks have pale render, ribbon windows and flat roofs.
// Floor counts use OpenStreetMap building:levels where tagged, otherwise FLOORS below.
//
// 行政大樓: the administration complex opposite 校長室, housing 總務處, 學生事務處, 教務處,
// 會計室 and 勞作教育處. OpenStreetMap maps its wings as separate buildings. Like the
// early administration buildings in the heritage photographs, it has white walls in a
// dark timber frame under grey tiled hipped roofs.
export const administrationId = 'administration-building';
export const administrationWings = ['w368283835', 'w368283836', 'w368283837', 'w368283838', 'w368283840'];

// 宿舍32、33棟 have their own detailed model (new-dorms.js).
const SEPARATE = new Set(['w1344753003', 'w1344753007']);

// Floors where OSM has no building:levels: 30棟 has rooms on floors 3–10 (and below)
// (住宿輔導組 allocation notices), 73棟 up to the 8th.
const FLOORS = {30: 10, 73: 8};

const STYLES = {
  brick: {
    wall: '#a65b43', band: '#d8d1c2', roof: '#585e5b', glass: '#36423f', frame: '#ebe6d8',
    floorHeight: 3.2, roofType: 'hip',
  },
  plaster: {
    wall: '#ece8dc', band: '#d3cfc3', roof: '#5b615e', glass: '#3f4c4e', frame: '#5a3e2b',
    floorHeight: 3.2, roofType: 'hip', balcony: '#5d4230',
  },
  // 男生宿舍11棟, known as 白宮 (the White House) for its white walls.
  white: {
    wall: '#efede6', band: '#d6d2c6', roof: '#5a605d', glass: '#3f4b4d', frame: '#8a8f8b',
    floorHeight: 3.2, roofType: 'hip',
  },
  timber: {
    wall: '#efebe0', band: '#4b3a2c', roof: '#5a605d', glass: '#3a4547', frame: '#4b3a2c',
    floorHeight: 3.4, roofType: 'hip', posts: true,
  },
  modern: {
    wall: '#e4e1d7', band: '#c8c4b7', roof: '#9fa49f', glass: '#55666b', frame: '#7c8481',
    floorHeight: 3.1, roofType: 'flat',
  },
};

const NAME = /^(男生|女生)?宿舍(\d+)棟/;

// Returns {style, floors, solar, place} for a styled building footprint, or null.
export function styledBuildingSpec(building) {
  if (administrationWings.includes(building.osm)) return {style: 'timber', floors: 2, place: administrationId};
  if (SEPARATE.has(building.osm)) return null;
  const match = building.name.match(NAME);
  if (!match) return null;
  const number = Number(match[2]);
  const levels = building.levels ?? FLOORS[number];
  if (number === 30 || number === 72 || number === 73) {
    return {style: 'modern', floors: levels ?? 8, solar: number !== 30};
  }
  if (match[1] === '女生') {
    // 23棟 is a later flat-roofed block at the south end of the women's area.
    return number === 23 ? {style: 'modern', floors: levels ?? 4} : {style: 'plaster', floors: levels ?? 2};
  }
  return {style: number === 11 ? 'white' : 'brick', floors: levels ?? 2};
}

function signedArea(points) {
  return points.reduce((sum, [x, z], i) => {
    const [nx, nz] = points[(i + 1) % points.length];
    return sum + x * nz - nx * z;
  }, 0) / 2;
}

// Minimum-area bounding rectangle: {cx, cz, angle, half: [along, across]}.
function orientedBox(points) {
  let best = null;
  points.forEach(([ax, az], i) => {
    const [bx, bz] = points[(i + 1) % points.length];
    const angle = Math.atan2(bz - az, bx - ax);
    const c = Math.cos(angle), s = Math.sin(angle);
    const u = points.map(([x, z]) => x * c + z * s), v = points.map(([x, z]) => -x * s + z * c);
    const [u0, u1, v0, v1] = [Math.min(...u), Math.max(...u), Math.min(...v), Math.max(...v)];
    const area = (u1 - u0) * (v1 - v0);
    if (!best || area < best.area) {
      const mu = (u0 + u1) / 2, mv = (v0 + v1) / 2;
      best = {area, angle, cx: mu * c - mv * s, cz: mu * s + mv * c, half: [(u1 - u0) / 2, (v1 - v0) / 2]};
    }
  });
  if (best.half[1] > best.half[0]) {
    best.angle += Math.PI / 2;
    best.half.reverse();
  }
  return best;
}

function hipRoof(box, eave, overhang, pitch) {
  const along = box.half[0] + overhang, across = box.half[1] + overhang;
  const rise = across * pitch;
  const ridge = Math.max(0, along - across);
  const c = Math.cos(box.angle), s = Math.sin(box.angle);
  const at = (u, v, y) => [box.cx + u * c - v * s, y, box.cz + u * s + v * c];
  const [a, b, cc, d] = [at(-along, -across, eave), at(along, -across, eave), at(along, across, eave), at(-along, across, eave)];
  const [r1, r2] = [at(-ridge, 0, eave + rise), at(ridge, 0, eave + rise)];
  const faces = [a, b, r2, a, r2, r1, cc, d, r1, cc, r1, r2, b, cc, r2, d, a, r1];
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(faces.flat(), 3));
  geometry.computeVertexNormals();
  return {geometry, rise, ridge: [r1, r2]};
}

// Moves each vertex so every edge shifts `distance` metres outward (negative: inward).
function offsetRing(ring, winding, distance) {
  const normals = ring.map(([x, z], i) => {
    const [nx, nz] = ring[(i + 1) % ring.length];
    const length = Math.hypot(nx - x, nz - z) || 1;
    return [winding * (nz - z) / length, -winding * (nx - x) / length];
  });
  return ring.map(([x, z], i) => {
    const [ax, az] = normals[(i + ring.length - 1) % ring.length], [bx, bz] = normals[i];
    const scale = distance / Math.max(.35, 1 + ax * bx + az * bz);
    return [x + (ax + bx) * scale, z + (az + bz) * scale];
  });
}

// For footprints that are not rectangles: every edge slopes up to a flat deck, which
// reads as a hipped tile roof from the usual viewing angles.
function edgeRoof(ring, winding, eave, overhang, inset, rise) {
  const outer = offsetRing(ring, winding, overhang), inner = offsetRing(ring, winding, -inset);
  const top = eave + rise;
  const vertices = [];
  outer.forEach((point, i) => {
    const j = (i + 1) % outer.length;
    const [a, b, c, d] = [[...point], [...outer[j]], [...inner[j]], [...inner[i]]];
    vertices.push([a[0], eave, a[1]], [b[0], eave, b[1]], [c[0], top, c[1]], [a[0], eave, a[1]], [c[0], top, c[1]], [d[0], top, d[1]]);
  });
  for (const face of T.ShapeUtils.triangulateShape(inner.map(([x, z]) => new T.Vector2(x, z)), [])) {
    vertices.push(...face.map(i => [inner[i][0], top, inner[i][1]]));
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(vertices.flat(), 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function styledBuilding(footprint, terrainHeight, spec, batch) {
  const style = STYLES[spec.style];
  const grade = terrainHeight(footprint.x, footprint.z);
  const low = Math.min(grade, ...footprint.points.map(([x, z]) => terrainHeight(x, z)));
  const ring = footprint.points.map(([x, z]) => [x - footprint.x, z - footprint.z]);
  const group = new T.Group();
  group.position.set(footprint.x, grade, footprint.z);
  const eave = spec.floors * style.floorHeight + .45;
  const base = low - grade - .4;

  const shape = new T.Shape();
  ring.forEach(([x, z], i) => shape[i ? 'lineTo' : 'moveTo'](x, -z));
  for (const hole of footprint.holes ?? []) {
    const path = new T.Path();
    hole.forEach(([x, z], i) => path[i ? 'lineTo' : 'moveTo'](x - footprint.x, -(z - footprint.z)));
    shape.holes.push(path);
  }
  const body = new T.ExtrudeGeometry(shape, {depth: eave - base, bevelEnabled: false, curveSegments: 1});
  body.rotateX(-Math.PI / 2);
  body.translate(0, base, 0);
  const walls = new T.Mesh(body, [paint(style.roof), paint(style.wall)]);
  walls.castShadow = walls.receiveShadow = true;
  group.add(walls);

  const [ox, oy, oz] = [footprint.x, grade, footprint.z];
  const box = (material, x, y, z, w, h, d, yaw) => batch.add(material, ox + x, oy + y, oz + z, w, h, d, yaw);
  const winding = Math.sign(signedArea(ring)) || 1;
  const edges = ring.map(([x, z], i) => {
    const [nx, nz] = ring[(i + 1) % ring.length];
    const dx = nx - x, dz = nz - z, length = Math.hypot(dx, dz);
    return {x, z, dx, dz, length, normalX: winding * dz / length, normalZ: -winding * dx / length, yaw: -Math.atan2(dz, dx)};
  });

  // Balcony corridor of the women's dorms faces east or south, on the longest such side.
  const balconyEdge = style.balcony
    ? edges.filter(edge => edge.length > 8).reduce((best, edge) =>
      !best || edge.normalX + edge.normalZ + edge.length / 60 > best.normalX + best.normalZ + best.length / 60 ? edge : best, null)
    : null;

  const glass = paint(style.glass), frame = paint(style.frame), band = paint(style.band);
  for (const edge of edges) {
    const {x, z, dx, dz, length, normalX, normalZ, yaw} = edge;
    const on = (along, y, offset, w, h, d, material) =>
      box(material, x + dx * along / length + normalX * offset, y, z + dz * along / length + normalZ * offset, w, h, d, yaw);
    if (length < 2.5) continue;
    for (let floor = 1; floor < spec.floors; floor++) {
      on(length / 2, floor * style.floorHeight, .06, length, .24, .14, band);
    }
    on(length / 2, eave - .1, .07, length + .1, .3, .16, band);
    if (length < 4) continue;
    const bays = Math.max(1, Math.floor(length / 3.4));
    const span = length / bays;
    const width = Math.min(span - .9, spec.style === 'modern' ? 2.3 : 1.6);
    for (let floor = 0; floor < spec.floors; floor++) {
      const y = floor * style.floorHeight + 1.65;
      for (let bay = 0; bay < bays; bay++) {
        const along = (bay + .5) * span;
        on(along, y, .04, width + .22, 1.62, .1, frame);
        on(along, y, .09, width, 1.42, .08, glass);
      }
    }
    if (style.posts) {
      // Exposed timber frame: a post between every bay, full height.
      for (let bay = 0; bay <= bays; bay++) on(bay * span, eave / 2, .1, .24, eave, .16, band);
    }
    if (edge === balconyEdge) {
      for (let floor = 1; floor < spec.floors; floor++) {
        const y = floor * style.floorHeight;
        on(length / 2, y + .05, .75, length - .6, .18, 1.5, band);
        on(length / 2, y + .62, 1.48, length - .6, .9, .07, paint(style.balcony));
        on(length / 2, y + 1.07, 1.48, length - .5, .08, .14, paint(style.balcony));
        const posts = Math.max(2, Math.round(length / 3.4));
        for (let i = 0; i <= posts; i++) {
          on(.3 + (length - .6) * i / posts, y / 2 + .05, 1.42, .16, y + .1, .16, paint(style.balcony));
        }
      }
    }
  }

  const outline = orientedBox(ring);
  const rectangular = Math.abs(signedArea(ring)) / (4 * outline.half[0] * outline.half[1]) > .85;
  let top = eave;
  if (style.roofType === 'hip' && !rectangular) {
    const roof = new T.Mesh(edgeRoof(ring, winding, eave, .95, 4.2, 2.1), paint(style.roof, T.DoubleSide));
    roof.castShadow = roof.receiveShadow = true;
    group.add(roof);
    top = eave + 2.1;
  } else if (style.roofType === 'hip') {
    const {geometry, rise, ridge} = hipRoof(outline, eave, .95, .46);
    const roof = new T.Mesh(geometry, paint(style.roof, T.DoubleSide));
    roof.castShadow = roof.receiveShadow = true;
    group.add(roof);
    const [r1, r2] = ridge;
    const ridgeLength = Math.hypot(r2[0] - r1[0], r2[2] - r1[2]);
    if (ridgeLength > .5) {
      box(paint('#494e4c'), (r1[0] + r2[0]) / 2, r1[1] + .06, (r1[2] + r2[2]) / 2, ridgeLength + .4, .16, .3, -outline.angle);
    }
    top = eave + rise;
  } else {
    for (const {x, z, dx, dz, length, normalX, normalZ, yaw} of edges) {
      box(band, x + dx / 2 - normalX * .12, eave + .45, z + dz / 2 - normalZ * .12, length + .2, .9, .24, yaw);
    }
    // Stair and lift cores.
    box(paint(style.wall), outline.cx, eave + 1.5, outline.cz, 4.2, 3, 5.4, -outline.angle);
    if (spec.solar) {
      const c = Math.cos(outline.angle), s = Math.sin(outline.angle);
      const panel = paint('#3b4d63');
      for (let u = -outline.half[0] + 2.2; u <= outline.half[0] - 2.2; u += 2.3) {
        for (let v = -outline.half[1] + 2; v <= outline.half[1] - 2; v += 1.9) {
          const px = outline.cx + u * c - v * s, pz = outline.cz + u * s + v * c;
          if (Math.hypot(u, v) < 3.6 || !inside(ring, px, pz)) continue;
          box(panel, px, eave + .75, pz, 2.1, .08, 1.6, -outline.angle);
        }
      }
    }
    top = eave + 3;
  }
  return {group, top: grade + top};
}

function inside(points, x, z) {
  let hit = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i], [xj, zj] = points[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}
