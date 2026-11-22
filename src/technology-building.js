import * as T from 'three';
import {createBoxBatch, paint, textPanel} from './kit.js';

export const technologyBuildingId = 'w1302996436';

// 大智慧科技大樓: teaching and research building with offices from B1 (圖資處 service
// desk) to the fifth-floor lecture rooms and above. The model keeps the mapped
// footprint and gives it six storeys of window ribbons between light spandrel bands,
// slender vertical fins, a glazed ground floor with the entrance on the west side
// facing 中正紀念堂 across the plaza, and the roof core and skylight seen in the
// NLSC 2024 orthophoto. Facade details are approximate.
const FLOORS = 6, FLOOR_HEIGHT = 3.8;

function signedArea(points) {
  return points.reduce((sum, [x, z], i) => {
    const [nx, nz] = points[(i + 1) % points.length];
    return sum + x * nz - nx * z;
  }, 0) / 2;
}

export function technologyBuilding(footprint, terrainHeight) {
  const grade = terrainHeight(footprint.x, footprint.z);
  const low = Math.min(grade, ...footprint.points.map(([x, z]) => terrainHeight(x, z)));
  const ring = footprint.points.map(([x, z]) => [x - footprint.x, z - footprint.z]);
  const group = new T.Group();
  group.position.set(footprint.x, grade, footprint.z);
  const eave = FLOORS * FLOOR_HEIGHT + .4;
  const base = low - grade - .4;

  const wall = paint('#e2e2dc'), band = paint('#f1f0ea'), glass = paint('#58737c'), lobby = paint('#6d8a92');
  const fin = paint('#9aa4a5'), roof = paint('#b0b3ad'), dark = paint('#59605f');
  const shape = new T.Shape();
  ring.forEach(([x, z], i) => shape[i ? 'lineTo' : 'moveTo'](x, -z));
  const geometry = new T.ExtrudeGeometry(shape, {depth: eave - base, bevelEnabled: false, curveSegments: 1});
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, base, 0);
  const body = new T.Mesh(geometry, [roof, wall]);
  body.castShadow = body.receiveShadow = true;
  group.add(body);

  const batch = createBoxBatch();
  const [ox, oy, oz] = [footprint.x, grade, footprint.z];
  const winding = Math.sign(signedArea(ring)) || 1;
  const edges = ring.map(([x, z], i) => {
    const [nx, nz] = ring[(i + 1) % ring.length];
    const dx = nx - x, dz = nz - z, length = Math.hypot(dx, dz);
    return {x, z, dx, dz, length, normalX: winding * dz / length, normalZ: -winding * dx / length, yaw: -Math.atan2(dz, dx)};
  });
  // The longest west-facing edge carries the entrance.
  const entrance = edges.filter(edge => edge.normalX < -.5).reduce((best, edge) => !best || edge.length > best.length ? edge : best, null);

  for (const edge of edges) {
    const {x, z, dx, dz, length, normalX, normalZ, yaw} = edge;
    const on = (along, y, offset, w, h, d, material) =>
      batch.add(material, ox + x + dx * along / length + normalX * offset, oy + y, oz + z + dz * along / length + normalZ * offset, w, h, d, yaw);
    // Spandrel band at every floor and a deeper one at the roof.
    for (let floor = 1; floor <= FLOORS; floor++) on(length / 2, floor * FLOOR_HEIGHT - .25, .08, length + .16, .9, .18, band);
    on(length / 2, eave + .5, .02, length + .2, 1.2, .3, band);
    if (length < 4) continue;
    // Window ribbons on the upper floors, glazed ground floor.
    for (let floor = 1; floor < FLOORS; floor++) on(length / 2, floor * FLOOR_HEIGHT + 1.55, .03, length - 1.2, 2.3, .08, glass);
    on(length / 2, 1.75, .03, length - 1.2, 2.9, .08, lobby);
    // Vertical aluminium fins.
    const fins = Math.max(2, Math.round(length / 1.6));
    for (let i = 1; i < fins; i++) on(length * i / fins, FLOOR_HEIGHT + (eave - FLOOR_HEIGHT) / 2, .22, .12, eave - FLOOR_HEIGHT - .2, .42, fin);
    if (edge === entrance) {
      const middle = length / 2;
      on(middle, 3.55, 2.2, 12, .35, 4.6, dark); // canopy
      for (const offset of [-5.5, 5.5]) on(middle + offset, 1.75, 4.1, .35, 3.5, .35, fin);
      for (let step = 0; step < 2; step++) on(middle, -.08 - step * .15, 1 + step * .9, 13 - step * 1.5, .3, 1.2, band);
      const sign = textPanel('大智慧科技大樓', 9, 1.1, {background: '#f1f0ea', color: '#2f4a3d'});
      sign.position.set(ox + x + dx * middle / length + normalX * .3 - footprint.x, 4.6 + .7, oz + z + dz * middle / length + normalZ * .3 - footprint.z);
      sign.rotation.y = Math.atan2(normalX, normalZ); // face outwards
      group.add(sign);
    }
  }

  // Roof: stair and lift core, plant enclosures and the skylight over the atrium.
  const centre = ring.reduce(([sx, sz], [x, z]) => [sx + x / ring.length, sz + z / ring.length], [0, 0]);
  const rooftop = (u, v, w, h, d, material) => batch.add(material, ox + u, oy + eave + h / 2, oz + v, w, h, d, edges[0].yaw);
  rooftop(centre[0] - 8, centre[1] - 6, 6, 3.4, 7, wall);
  rooftop(centre[0] + 4, centre[1] - 16, 5, 1.6, 3, dark);
  rooftop(centre[0] - 2, centre[1] + 16, 7, 1.6, 3.5, dark);
  rooftop(centre[0] + 9, centre[1] + 6, 9, .9, 12, paint('#a9c3c9'));

  batch.flush(group);
  for (const mesh of group.children) {
    if (mesh.isInstancedMesh) {
      // Batched boxes were positioned in world space; undo the group offset.
      mesh.position.set(-footprint.x, -grade, -footprint.z);
    }
  }
  const pickables = [];
  group.traverse(object => {
    if (object.isMesh) {
      object.userData.osm = technologyBuildingId;
      pickables.push(object);
    }
  });
  return {group, top: grade + eave + 3.4, pickables};
}
