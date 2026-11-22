import * as T from 'three';

// The two vehicle gates on 臺灣大道.
//
// 第一教學區校門 (約農路): widened in 2024 (總務處 notice: 7/2–8/31) to two car lanes and
// a motorcycle lane in each direction around a central island with the guard booth,
// licence-plate barrier arms and a pay machine. The layout follows the NLSC 2024
// orthophoto. At the front-left of the gate, seen from the boulevard, stands the
// 15 m white tower with the university name set into the top of its east and west
// faces (東海大學校史). Tower proportions are approximate.
//
// 第二教學區校門 (力行路): two lanes each way without an island, with barrier arms and
// pay machines under a canopy.

export const mainGateId = 'n5439892666';
export const secondGateId = 'second-teaching-area-gate';

// Gate frame: origin at the middle of the gate mouth on the boulevard edge, v pointing
// south into campus (the lanes run due south in the orthophoto), u pointing east.
const MAIN = {
  origin: [-238, -392.5],
  forward: [0, 1],
  boulevardSlope: -.24, // the boulevard edge rises 0.24 m northward per metre east
};
const SECOND = {
  origin: [790.9, -554.7], // where 力行路 leaves the boulevard
  forward: normalise([-6.8, 34]),
};
export const secondGatePoint = {osm: secondGateId, ...pointAt(SECOND.origin, SECOND.forward, 0, 32)};

function normalise([x, z]) {
  const length = Math.hypot(x, z);
  return [x / length, z / length];
}
// u runs to the left of a driver entering campus (roughly east), v into campus.
function frame(origin, forward) {
  const east = [forward[1], -forward[0]];
  return (u, v) => [origin[0] + east[0] * u + forward[0] * v, origin[1] + east[1] * u + forward[1] * v];
}
function pointAt(origin, forward, u, v) {
  const [x, z] = frame(origin, forward)(u, v);
  return {x, z};
}

const materials = new Map();
const paint = (color, options = {}) => {
  const key = color + JSON.stringify(options);
  if (!materials.has(key)) materials.set(key, new T.MeshLambertMaterial({color, ...options}));
  return materials.get(key);
};

// A paved surface draped over the terrain with its own high-resolution texture.
function decal(at, terrainHeight, [u0, u1], [v0, v1], draw, pxPerMetre = 14) {
  const width = u1 - u0, depth = v1 - v0;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * pxPerMetre);
  canvas.height = Math.round(depth * pxPerMetre);
  const ctx = canvas.getContext('2d');
  ctx.scale(pxPerMetre, pxPerMetre);
  ctx.translate(-u0, -v0);
  draw(ctx);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 8;
  const columns = Math.ceil(width / 2), rows = Math.ceil(depth / 2);
  const geometry = new T.PlaneGeometry(1, 1, columns, rows);
  const position = geometry.attributes.position, uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) {
    const u = u0 + uv.getX(i) * width, v = v0 + (1 - uv.getY(i)) * depth;
    const [x, z] = at(u, v);
    position.setXYZ(i, x, terrainHeight(x, z) + .08, z);
  }
  geometry.computeVertexNormals();
  const material = new T.MeshLambertMaterial({
    map: texture, transparent: true, alphaTest: .02,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const mesh = new T.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.renderOrder = 2;
  return mesh;
}

function polygon(ctx, points, fill) {
  ctx.beginPath();
  points.forEach(([u, v], i) => ctx[i ? 'lineTo' : 'moveTo'](u, v));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
function line(ctx, from, to, color, width, dash = []) {
  ctx.beginPath();
  ctx.moveTo(...from);
  ctx.lineTo(...to);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.stroke();
  ctx.setLineDash([]);
}
// Straight-ahead lane arrow pointing towards +v (direction 1) or -v (-1).
function arrow(ctx, u, v, direction) {
  const s = direction;
  polygon(ctx, [[u - .15, v - 2.4 * s], [u + .15, v - 2.4 * s], [u + .15, v + .6 * s], [u + .5, v + .6 * s],
    [u, v + 1.8 * s], [u - .5, v + .6 * s], [u - .15, v + .6 * s]], '#f1eee4');
}
function laneText(ctx, text, u, v, upright) {
  ctx.save();
  ctx.translate(u, v);
  if (!upright) ctx.rotate(Math.PI);
  ctx.fillStyle = '#f1eee4';
  ctx.font = 'bold 1.25px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// Collects boxes in gate coordinates and turns them into one instanced mesh per material.
function boxes(at, terrainHeight, yaw, base) {
  const list = new Map();
  return {
    add(material, u, v, y, w, h, d, extraYaw = 0) {
      if (!list.has(material)) list.set(material, []);
      const [x, z] = at(u, v);
      list.get(material).push([x, (base ?? terrainHeight(x, z)) + y, z, w, h, d, yaw + extraYaw]);
    },
    build(group, osm) {
      const unit = new T.BoxGeometry(1, 1, 1), dummy = new T.Object3D();
      for (const [material, items] of list) {
        const mesh = new T.InstancedMesh(unit, material, items.length);
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.userData.osm = osm;
        items.forEach(([x, y, z, w, h, d, r], i) => {
          dummy.position.set(x, y, z);
          dummy.rotation.set(0, r, 0);
          dummy.scale.set(w, h, d);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        });
        group.add(mesh);
      }
    },
  };
}

function textPanel(text, width, height, {background = '#f5f4ef', color = '#233b31', vertical = false} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * 64);
  canvas.height = Math.round(height * 64);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (vertical) {
    const step = canvas.height / text.length;
    ctx.font = `600 ${Math.min(step * .78, canvas.width * .74)}px "Noto Serif TC", "Songti TC", serif`;
    [...text].forEach((char, i) => ctx.fillText(char, canvas.width / 2, step * (i + .5)));
  } else {
    ctx.font = `600 ${canvas.height * .56}px system-ui, sans-serif`;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  return new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshBasicMaterial({map: texture}));
}

function mainGate(ground) {
  const at = frame(MAIN.origin, MAIN.forward);
  const yaw = Math.atan2(MAIN.forward[0], MAIN.forward[1]);
  const group = new T.Group();
  const edge = u => MAIN.boulevardSlope * u; // v of the boulevard kerb

  // Carriageway: a wide mouth, then two lanes each way past 交通安全組 (west) and
  // two lanes plus a motorcycle lane outbound (east), narrowing into 約農路.
  const apron = [[-14, edge(-14) - 1], [16, edge(16) - 1], [16, 12], [10.6, 17], [10.6, 30], [4.2, 40], [4.2, 46],
    [-4.2, 46], [-4.4, 38], [-7.2, 27], [-7.2, 19], [-10.4, 17], [-14, 14]];
  const tower = {u: 19, v: 1.2};
  const zebra = (u, w) => [[u, edge(u) + .2], [u + w, edge(u + w) + .2], [u + w, edge(u + w) + 3.6], [u, edge(u) + 3.6]];
  group.add(decal(at, ground, [-16, 24], [-9, 47], ctx => {
    polygon(ctx, [[16, 12], [18.6, 12], [18.6, 31], [10.6, 31], [10.6, 17]], '#cfc8b6'); // east sidewalk
    polygon(ctx, [[tower.u - 3.4, -2.4], [tower.u + 3.4, -2.4], [tower.u + 3.4, 4.6], [tower.u - 3.4, 4.6]], '#b9825f');
    for (let i = -3.4; i <= 3.4; i += .6) line(ctx, [tower.u + i, -2.4], [tower.u + i, 4.6], '#a06a4c', .05);
    for (let j = -2.4; j <= 4.6; j += .6) line(ctx, [tower.u - 3.4, j], [tower.u + 3.4, j], '#a06a4c', .05);
    polygon(ctx, apron, '#5f6463');
    for (let u = -13.6; u < 15.6; u += .9) polygon(ctx, zebra(u, .45), '#ecebe3');
    // Inbound (west, southbound) and outbound (east, northbound) lane lines.
    line(ctx, [-4.35, 8], [-4.35, 26], '#f1eee4', .15, [3, 3]);
    line(ctx, [-7.2, 7], [-7.2, 19], '#f1eee4', .15);
    line(ctx, [-10.2, 7], [-10.2, 16.5], '#f1eee4', .15);
    line(ctx, [4.5, 8], [4.5, 29], '#f1eee4', .15, [3, 3]);
    line(ctx, [7.5, 7], [7.5, 30], '#f1eee4', .15);
    line(ctx, [10.4, 8], [10.4, 30], '#f1eee4', .15);
    line(ctx, [-7.2, 22.9], [-1.5, 22.9], '#f1eee4', .4);
    line(ctx, [-10.2, 15.9], [-7.2, 15.9], '#f1eee4', .4);
    line(ctx, [1.5, 17.2], [10.4, 17.2], '#f1eee4', .4);
    for (const u of [-2.9, -5.8]) arrow(ctx, u, 13, 1);
    for (const u of [3, 6]) arrow(ctx, u, 24, -1);
    laneText(ctx, '機車', -8.7, 11, false);
    laneText(ctx, '機車', 8.95, 17, true);
    line(ctx, [-3.6, 41], [3.6, 41], '#d9b54a', .15);
  }));

  const parts = boxes(at, ground, yaw);
  const curb = paint('#c9c6bc'), planted = paint('#6f8f58'), white = paint('#f2f1ea'), glass = paint('#4d6066');
  const darkTrim = paint('#4b5250'), cabinet = paint('#d7d9d4'), signal = paint('#d9a62c'), red = paint('#c8392f');
  // Central island with planting, plus narrow separators for the motorcycle lanes.
  // The two OSM-mapped trees at the mouth stand on its planted northern end.
  parts.add(curb, 0, 16, .1, 3, .2, 24);
  parts.add(planted, 0, 11, .25, 2.6, .12, 9.6);
  parts.add(planted, 0, 26, .25, 2.6, .12, 3.6);
  parts.add(curb, -7.2, 13, .1, .45, .2, 7);
  parts.add(curb, 7.5, 18, .1, .45, .2, 8);
  // Guard booth with glazing all round and an overhanging roof.
  parts.add(white, 0, 20, 1.45, 2.3, 2.7, 3.6);
  for (const v of [18.8, 20, 21.2]) for (const u of [-1.17, 1.17]) parts.add(glass, u, v, 1.75, .04, 1.1, 1.0);
  for (const v of [18.18, 21.82]) parts.add(glass, 0, v, 1.75, 1.7, 1.1, .04);
  parts.add(darkTrim, 0, 20, 2.95, 3.1, .3, 4.4);
  // Licence-plate barriers: cabinet, camera pole and a red-and-white arm.
  const barrier = (approach, v, from, to) => {
    const length = Math.abs(to - from), step = Math.sign(to - from) * length / 6;
    parts.add(cabinet, from, v, .55, .42, 1.1, .42);
    parts.add(signal, from, v, 1.12, .44, .06, .44);
    for (let k = 0; k < 6; k++) parts.add(k % 2 ? red : white, from + step * (k + .5), v, 1.02, length / 6, .1, .08);
    parts.add(darkTrim, from, v - approach * 1.6, 1.25, .1, 2.5, .1);
    parts.add(darkTrim, from, v - approach * 1.6, 2.5, .3, .22, .35);
  };
  barrier(1, 23.5, -1.75, -7.0);
  barrier(1, 16.5, -7.45, -10.1);
  barrier(-1, 16.6, 1.75, 7.3);
  barrier(-1, 16.6, 7.75, 10.3);
  parts.add(paint('#3f4547'), 1.95, 18.6, .8, .55, 1.6, .5); // pay machine for outbound traffic
  parts.add(paint('#7fb0c8'), 1.95, 18.86, 1.05, .38, .3, .04);
  for (let v = 18; v < 30; v += 4.2) parts.add(paint('#8a8f86'), 11.1, v, .25, .5, .5, 3.6);

  // The white name tower at the front-left of the gate, on its brick plaza.
  const [tx, tz] = at(tower.u, tower.v);
  const grade = ground(tx, tz);
  const towerParts = boxes((u, v) => at(tower.u + u, tower.v + v), ground, yaw, grade);
  const towerWhite = paint('#f4f3ee'), groove = paint('#c7c8c2');
  towerParts.add(paint('#b8b4a8'), 0, 0, .3, 3.6, .6, 3.6);
  towerParts.add(towerWhite, 0, 0, 7.7, 2.3, 14.2, 2.3);
  towerParts.add(towerWhite, 0, 0, 14.95, 2.7, .3, 2.7);
  for (const u of [-.55, .55]) for (const v of [-1.16, 1.16]) towerParts.add(groove, u, v, 4.4, .12, 7.6, .04);
  parts.build(group, mainGateId);
  towerParts.build(group, mainGateId);
  // 東海大學 on the east and west faces near the top.
  for (const side of [-1, 1]) {
    const panel = textPanel('東海大學', 1.5, 5.6, {vertical: true});
    const [px, pz] = at(tower.u + side * 1.16, tower.v);
    panel.position.set(px, grade + 11.2, pz);
    panel.rotation.y = yaw + side * Math.PI / 2;
    group.add(panel);
  }
  const pickables = [];
  group.traverse(object => {
    if (object.isMesh) {
      object.userData.osm = mainGateId;
      pickables.push(object);
    }
  });
  const plaza = [[tower.u - 4, -3], [tower.u + 4, -3], [tower.u + 4, 5], [tower.u - 4, 5]];
  return {group, pickables, top: grade + 15.1, exclusions: [apron, plaza].map(ring => ring.map(([u, v]) => at(u, v)))};
}

function secondGate(ground) {
  const at = frame(SECOND.origin, SECOND.forward);
  const yaw = Math.atan2(SECOND.forward[0], SECOND.forward[1]);
  const group = new T.Group();
  const gateV = 32;
  const carriageway = [[-9, -2], [9, -2], [7, 6], [6.6, 44], [-6.6, 44], [-7, 6]];
  group.add(decal(at, ground, [-10, 10], [-3, 46], ctx => {
    polygon(ctx, carriageway, '#5f6463');
    for (let u = -8; u < 8; u += .9) polygon(ctx, [[u, 0], [u + .45, 0], [u + .45, 3.2], [u, 3.2]], '#ecebe3');
    line(ctx, [0, 6], [0, 44], '#e4c34f', .15);
    line(ctx, [.3, 6], [.3, 44], '#e4c34f', .15);
    for (const side of [-1, 1]) line(ctx, [side * 3.3, 8], [side * 3.3, 44], '#f1eee4', .15, [3, 3]);
    line(ctx, [-6.4, gateV + 1.4], [-.2, gateV + 1.4], '#f1eee4', .4);
    line(ctx, [.5, gateV - 1.4], [6.4, gateV - 1.4], '#f1eee4', .4);
    for (const u of [-1.65, -4.95]) arrow(ctx, u, gateV + 8, 1);
    for (const u of [1.65, 4.95]) arrow(ctx, u, gateV - 8, -1);
  }));
  const parts = boxes(at, ground, yaw);
  const white = paint('#f2f1ea'), cabinet = paint('#d7d9d4'), signal = paint('#d9a62c'), steel = paint('#59605e');
  const barrier = (v, from, to) => {
    const length = Math.abs(to - from);
    parts.add(cabinet, from, v, .55, .42, 1.1, .42);
    parts.add(signal, from, v, 1.12, .44, .06, .44);
    for (let k = 0; k < 6; k++) {
      parts.add(k % 2 ? paint('#c8392f') : white, from + Math.sign(to - from) * length / 6 * (k + .5), v, 1.02, length / 6, .1, .08);
    }
  };
  barrier(gateV + 1.1, -6.9, -.4);
  barrier(gateV - 1.1, 6.9, .4);
  parts.add(paint('#3f4547'), 7.6, gateV - 3.2, .8, .6, 1.6, .5);
  parts.add(paint('#3f4547'), -7.6, gateV + 3.2, .8, .6, 1.6, .5);
  // Canopy over the barriers, green-roofed as in the orthophoto.
  for (const u of [-7.4, 7.4]) for (const v of [gateV - 3, gateV + 3]) parts.add(steel, u, v, 2.7, .3, 5.4, .3);
  parts.add(paint('#5f8a63'), 0, gateV, 5.55, 16, .3, 7.4);
  parts.add(steel, 0, gateV, 5.25, 15.6, .35, 6.8);
  parts.build(group, secondGateId);
  const [sx, sz] = at(0, gateV);
  const base = ground(sx, sz);
  for (const side of [-1, 1]) {
    const sign = textPanel('東海大學 第二教學區', 6.4, .8, {background: '#2f4a3d', color: '#f3f1e7'});
    const [px, pz] = at(0, gateV + side * 3.72);
    sign.position.set(px, base + 5.0, pz);
    sign.rotation.y = yaw + (side < 0 ? Math.PI : 0);
    sign.userData.osm = secondGateId;
    group.add(sign);
  }
  const pickables = [];
  group.traverse(object => {
    if (object.isMesh) {
      object.userData.osm = secondGateId;
      pickables.push(object);
    }
  });
  return {group, pickables, top: base + 5.7, exclusions: [carriageway.map(([u, v]) => at(u, v))]};
}

// `ground` is the height of the rendered terrain mesh, so paving sits exactly on it.
export function addGates(scene, terrainHeight, ground = terrainHeight) {
  const gates = [[mainGateId, mainGate(ground)], [secondGateId, secondGate(ground)]];
  const result = {pickables: [], exclusions: [], tops: new Map()};
  for (const [id, gate] of gates) {
    scene.add(gate.group);
    result.pickables.push(...gate.pickables);
    result.exclusions.push(...gate.exclusions);
    result.tops.set(id, gate.top);
  }
  return result;
}
