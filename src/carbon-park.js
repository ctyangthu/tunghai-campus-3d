import * as T from 'three';
import {createBoxBatch, paint} from './kit.js';

export const carbonParkId = 'carbon-neutrality-park';

// 智慧碳中和園區 (campus map no. 71), south of the farm. The campus map draws it as rows
// of long sheds; the NLSC 2024 orthophoto shows arched greenhouse tunnels running
// north–south, a cross shed at their south end, a single tunnel further north, a
// large white greenhouse and a building with a solar roof. Positions are traced from
// the orthophoto; heights are approximate.
// The orthophoto layer here is rendered sheared by a few metres; tunnels hug the
// farm track on their east side as in the image.
const tunnels = [
  // [centre x, z from, z to, width]
  [692, 414, 441, 7.6], [700, 414, 441, 7.6], [708, 414, 441, 7.6], [715, 414, 441, 5.2],
  [692, 445, 470, 7.6], [700, 445, 470, 7.6], [708, 445, 470, 7.6],
  [694, 362, 396, 6],
];

export const carbonParkPoint = {osm: carbonParkId, x: 700, z: 442};

export function addCarbonPark(scene, terrainHeight) {
  const group = new T.Group();
  const film = paint('#e6ece6', T.DoubleSide), frame = paint('#9aa39d'), dark = paint('#5b625e');
  for (const [x, z0, z1, width] of tunnels) {
    const length = z1 - z0, radius = width / 2;
    const base = Math.min(terrainHeight(x, z0), terrainHeight(x, z1)) + .35;
    const vault = new T.Mesh(new T.CylinderGeometry(radius, radius, length, 14, 1, true, -Math.PI / 2, Math.PI), film);
    vault.rotation.x = -Math.PI / 2; // keep the upper half of the cylinder
    vault.position.set(x, base, (z0 + z1) / 2);
    vault.castShadow = vault.receiveShadow = true;
    group.add(vault);
    for (const z of [z0, z1]) {
      const end = new T.Mesh(new T.CircleGeometry(radius, 14, 0, Math.PI), film);
      end.position.set(x, base, z);
      group.add(end);
    }
    for (let z = z0 + 3; z < z1 - 1; z += 3.5) {
      const hoop = new T.Mesh(new T.TorusGeometry(radius + .02, .05, 4, 14, Math.PI), frame);
      hoop.position.set(x, base, z);
      group.add(hoop);
    }
    const plinth = new T.Mesh(new T.BoxGeometry(width + .2, 1, length + .2), paint('#a3a89f'));
    plinth.position.set(x, base - .5, (z0 + z1) / 2);
    group.add(plinth);
  }

  const batch = createBoxBatch();
  const block = (material, x0, x1, z0, z1, height, lift = 0) => {
    const x = (x0 + x1) / 2, z = (z0 + z1) / 2;
    const ground = Math.min(...[[x0, z0], [x1, z0], [x0, z1], [x1, z1]].map(([px, pz]) => terrainHeight(px, pz)));
    batch.add(material, x, ground + lift + height / 2 - .6, z, x1 - x0, height + .6, z1 - z0);
    return ground + lift + height;
  };
  // Cross shed at the south end of the tunnels.
  const shedTop = block(paint('#c9ccc4'), 683, 721, 471, 480, 4.2);
  batch.add(dark, 702, shedTop + .25, 475.5, 38.6, .5, 9.6);
  // Large white greenhouse and the solar-roofed building to the north.
  const greenhouseTop = block(paint('#eef0ec'), 602, 650, 340, 363, 5.5);
  for (let x = 606; x < 650; x += 4) batch.add(frame, x, greenhouseTop + .05, 351.5, .12, .1, 23);
  batch.add(frame, 626, greenhouseTop + .05, 351.5, 48, .1, .12);
  const solarTop = block(paint('#d9d6cc'), 632, 668, 362, 382, 6);
  for (let x = 634.5; x < 667; x += 2.4) {
    for (let z = 364; z < 381; z += 2) batch.add(paint('#3b4d63'), x, solarTop + .25, z, 2.1, .08, 1.7);
  }
  block(paint('#ecebe5'), 625, 662, 382, 398, 5);
  batch.flush(group, carbonParkId);

  const pickables = [];
  group.traverse(object => {
    if (object.isMesh) {
      object.userData.osm = carbonParkId;
      pickables.push(object);
    }
  });
  scene.add(group);
  const exclusions = [[680, 723, 410, 482], [686, 702, 358, 400], [598, 672, 336, 401]]
    .map(([x0, x1, z0, z1]) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]);
  return {pickables, exclusions, top: solarTop + 1};
}
