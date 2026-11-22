import * as T from 'three';
import {axisFrame, createBoxBatch, paint, textPanel} from './kit.js';

export const memorialHallId = 'w367195941';

// 中正紀念堂: an 82 × 55 m assembly hall on the axis of 文理大道. Its entrance faces east
// down the boulevard, like the entrance of 圖書館總館 next to it, across a plaza from
// 大智慧科技大樓. The NLSC 2024 orthophoto shows a lower foyer along the east side and
// solar arrays over most of the flat roof. Heights are approximate.
const LENGTH = 82, WIDTH = 55, FOYER = 8;
const HALL_HEIGHT = 13, FOYER_HEIGHT = 6.6;

export function memorialHallBuilding(footprint, terrainHeight) {
  const [a, b, c] = footprint.points; // north-west, south-west, south-east corners
  const along = [c[0] - b[0], c[1] - b[1]];
  const length = Math.hypot(...along);
  const axis = [along[0] / length, along[1] / length];
  const centre = [footprint.x, footprint.z];
  const {at, yaw} = axisFrame(centre, axis);
  const grade = terrainHeight(...centre);
  const low = Math.min(...footprint.points.map(([x, z]) => terrainHeight(x, z)));
  const base = low - .5;
  const group = new T.Group();
  const batch = createBoxBatch();
  const box = (material, u, w, y, sizeU, sizeY, sizeW) => {
    const [x, z] = at(u, w);
    batch.add(material, x, y, z, sizeU, sizeY, sizeW, yaw);
  };
  const solid = (material, u, w, y0, y1, sizeU, sizeW) => {
    const mesh = new T.Mesh(new T.BoxGeometry(sizeU, y1 - y0, sizeW), material);
    const [x, z] = at(u, w);
    mesh.position.set(x, (y0 + y1) / 2, z);
    mesh.rotation.y = yaw;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  const wall = paint('#d9d4c7'), pier = paint('#c4beb0'), band = paint('#e8e4da');
  const glass = paint('#56696f'), mullion = paint('#4c5553'), roof = paint('#a9ada7');
  const hallEast = LENGTH / 2 - FOYER, hallCentre = (-LENGTH / 2 + hallEast) / 2, hallLength = LENGTH / 2 + hallEast;
  const roofY = grade + HALL_HEIGHT;

  // Main hall.
  solid([wall, wall, roof, wall, wall, wall], hallCentre, 0, base, roofY, hallLength, WIDTH);
  // Piers and clerestory glazing along the long north and south walls.
  for (const side of [-1, 1]) {
    const w = side * (WIDTH / 2 + .25);
    for (let u = -LENGTH / 2 + 1.5; u <= hallEast - 1; u += 6.2) box(pier, u, w, (base + roofY) / 2, .8, roofY - base, .55);
    for (let u = -LENGTH / 2 + 4.6; u < hallEast - 2; u += 6.2) {
      box(glass, u, side * (WIDTH / 2 + .03), grade + 9.4, 5.2, 2.6, .1);
      box(glass, u, side * (WIDTH / 2 + .03), grade + 2.6, 2.4, 2.6, .1); // side doors
    }
    box(band, hallCentre, side * (WIDTH / 2 + .1), grade + 7.4, hallLength, .5, .25);
  }
  for (let w = -WIDTH / 2 + 2; w <= WIDTH / 2 - 2; w += 6.2) box(pier, -LENGTH / 2 - .25, w, (base + roofY) / 2, .55, roofY - base, .8);
  // Parapet and roof.
  for (const side of [-1, 1]) {
    box(band, hallCentre, side * (WIDTH / 2 - .15), roofY + .45, hallLength, .9, .3);
    box(band, side < 0 ? -LENGTH / 2 + .15 : hallEast - .15, 0, roofY + .45, .3, .9, WIDTH);
  }
  const panel = paint('#3b4d63');
  for (let u = -LENGTH / 2 + 3; u <= hallEast - 3; u += 2.3) {
    for (let w = -WIDTH / 2 + 3; w <= WIDTH / 2 - 3; w += 1.9) {
      if (Math.abs(w) < 1.6) continue; // service walkway along the ridge line
      box(panel, u, w, roofY + .45, 2.1, .08, 1.6);
    }
  }

  // East foyer: full-height glazing facing the boulevard, under a deep canopy.
  const foyerTop = grade + FOYER_HEIGHT;
  const foyerWidth = WIDTH - 12;
  solid(wall, hallEast + FOYER / 2, 0, base, grade + .4, FOYER, foyerWidth);
  solid(roof, hallEast + FOYER / 2 + 1.8, 0, foyerTop - .5, foyerTop, FOYER + 3.6, foyerWidth + 1.2);
  box(glass, LENGTH / 2 - .05, 0, grade + .4 + (FOYER_HEIGHT - .9) / 2, .1, FOYER_HEIGHT - .9, foyerWidth - .4);
  for (let w = -foyerWidth / 2 + .2; w <= foyerWidth / 2; w += 2.1) {
    box(mullion, LENGTH / 2 + .02, w, grade + .4 + (FOYER_HEIGHT - .9) / 2, .14, FOYER_HEIGHT - .9, .16);
  }
  box(mullion, LENGTH / 2 + .02, 0, grade + 2.9, .14, .14, foyerWidth - .4);
  for (const side of [-1, 1]) {
    box(glass, hallEast + FOYER / 2, side * (foyerWidth / 2 - .05), grade + .4 + (FOYER_HEIGHT - .9) / 2, FOYER, FOYER_HEIGHT - .9, .1);
  }
  // Columns under the canopy and three entrance steps.
  for (const w of [-9, -3, 3, 9]) box(pier, LENGTH / 2 + 3, w, (grade + foyerTop) / 2, .5, foyerTop - grade, .5);
  for (let step = 0; step < 3; step++) {
    box(band, LENGTH / 2 + 1.2 + step * .8, 0, grade + .4 - (step + 1) * .15, 2.4 + (2 - step) * .8, .3, 24 - step * 2);
  }
  // Name on the hall wall above the foyer.
  const sign = textPanel('中正紀念堂', 13, 2, {background: '#d9d4c7', color: '#3a3f3c', serif: true});
  const [sx, sz] = at(hallEast + .06, 0);
  sign.position.set(sx, grade + 9.6, sz);
  sign.rotation.y = yaw + Math.PI / 2;
  group.add(sign);

  batch.flush(group, memorialHallId);
  const pickables = [];
  group.traverse(object => {
    if (object.isMesh) {
      object.userData.osm = memorialHallId;
      pickables.push(object);
    }
  });
  const exclusion = [[-LENGTH / 2 - 2, -WIDTH / 2 - 2], [LENGTH / 2 + 6, -WIDTH / 2 - 2], [LENGTH / 2 + 6, WIDTH / 2 + 2],
    [-LENGTH / 2 - 2, WIDTH / 2 + 2]].map(([u, w]) => at(u, w));
  return {group, top: roofY + 1, pickables, plantingExclusion: exclusion};
}
