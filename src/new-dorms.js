import * as T from 'three';

export const newDormIds = ['w1344753003', 'w1344753007'];

const FLOOR_COUNT = 9;
const ROOF_HEIGHT = 29.85;
const PARAPET_HEIGHT = .58;
const FLOOR_HEIGHT = (ROOF_HEIGHT - PARAPET_HEIGHT) / FLOOR_COUNT;

export function newDormBuilding(footprint, terrainHeight) {
  const {x: originX, z: originZ, points} = footprint;
  const grade = terrainHeight(originX, originZ);
  const foundation = Math.min(grade, ...points.map(([x, z]) => terrainHeight(x, z))) - .45;
  const perimeter = points.map(([x, z]) => [x - originX, z - originZ]);
  const group = new T.Group();
  group.position.set(originX, grade, originZ);

  const paint = color => new T.MeshLambertMaterial({color});
  const plaster = paint('#eeede5');
  const concrete = paint('#d0cec2');
  const roof = paint('#aaa99c');
  const glass = paint('#63757a');
  const frame = paint('#424b4a');
  const brick = paint('#a3513e');
  const brickLight = paint('#bd6b50');

  const profile = new T.Shape();
  perimeter.forEach(([x, z], i) => profile[i === 0 ? 'moveTo' : 'lineTo'](x, -z));
  const mainGeometry = new T.ExtrudeGeometry(profile, {
    depth: grade + ROOF_HEIGHT - PARAPET_HEIGHT - foundation,
    bevelEnabled: false,
  });
  mainGeometry.rotateX(-Math.PI / 2);
  mainGeometry.translate(0, foundation - grade, 0);
  const main = new T.Mesh(mainGeometry, [roof, plaster]);
  main.castShadow = true;
  main.receiveShadow = true;
  group.add(main);

  const elements = new Map();
  function box(material, x, y, z, width, height, depth, yaw, tilt = 0) {
    if (!elements.has(material)) elements.set(material, []);
    elements.get(material).push({x, y, z, width, height, depth, yaw, tilt});
  }

  const area = perimeter.reduce((sum, [x, z], i) => {
    const [nextX, nextZ] = perimeter[(i + 1) % perimeter.length];
    return sum + x * nextZ - z * nextX;
  }, 0);
  const winding = Math.sign(area);
  const faces = perimeter.map(([x, z], i) => {
    const [nextX, nextZ] = perimeter[(i + 1) % perimeter.length];
    const dx = nextX - x;
    const dz = nextZ - z;
    const length = Math.hypot(dx, dz);
    return {x, z, dx, dz, length, nx: winding * dz / length, nz: -winding * dx / length};
  });
  const courtyard = faces.filter(face => face.nz > .65).reduce(
    (longest, face) => !longest || face.length > longest.length ? face : longest,
    null,
  );

  for (const face of faces) {
    const {x, z, dx, dz, length, nx, nz} = face;
    const yaw = -Math.atan2(dz, dx);
    function onFace(material, along, level, offset, width, height, depth, tilt) {
      box(material, x + dx * along / length + nx * offset, level,
        z + dz * along / length + nz * offset, width, height, depth, yaw, tilt);
    }

    onFace(plaster, length / 2, ROOF_HEIGHT - PARAPET_HEIGHT / 2, -.10, length, PARAPET_HEIGHT, .24);
    if (length < 4) continue;

    const bays = Math.floor(length / 3.1);
    const bayWidth = length / bays;
    const onBoulevard = nz < -.55;
    const screenBay = Math.floor(bays * .62);
    for (let floor = 0; floor < FLOOR_COUNT; floor++) {
      const height = (floor + .54) * FLOOR_HEIGHT;
      for (let bay = 0; bay < bays; bay++) {
        const along = (bay + .5) * bayWidth;
        const useScreen = floor > 0 && floor < FLOOR_COUNT - 1 && bay === screenBay &&
          (onBoulevard || face === courtyard);
        const width = Math.min(bayWidth - .5, useScreen ? 2.65 : 1.9);
        const windowHeight = floor === 0 ? 2.45 : 1.72;
        onFace(frame, along, height, .035, width, windowHeight, .13);
        onFace(glass, along, height, .108, width - .15, windowHeight - .15, .065);
        onFace(frame, along + width * .15, height, .151, .065, windowHeight, .055);
        if (useScreen) {
          // Raised courses and vertical joints leave real openings in the brick screen.
          const screenHeight = FLOOR_HEIGHT - .2;
          const bottom = height - screenHeight / 2;
          for (let row = 0; row <= 10; row++) {
            const y = bottom + row * screenHeight / 10;
            onFace(row % 3 === 0 ? brickLight : brick, along, y, .23, width, .115, .21);
          }
          for (let column = 0; column <= 6; column++) {
            const offset = (column / 6 - .5) * width;
            onFace(brick, along + offset, height, .23, .12, screenHeight, .21);
          }
        }
      }
    }

    if (face !== courtyard || length < 14) continue;
    // Alternating exterior flights and landings evoke the courtyard circulation.
    const center = length * .45;
    const run = Math.min(6.4, length * .32);
    for (let floor = 1; floor < FLOOR_COUNT - 1; floor++) {
      const lower = floor * FLOOR_HEIGHT;
      const direction = floor % 2 === 0 ? 1 : -1;
      for (let step = 0; step < 15; step++) {
        const t = (step + .5) / 15;
        onFace(concrete, center + direction * (t - .5) * run, lower + t * FLOOR_HEIGHT,
          1.15, run / 15 + .015, .22, 1.94);
      }
      onFace(concrete, center - direction * (run / 2 + .68), lower, 1.15, 1.36, .28, 2.12);
      const railLength = Math.hypot(run, FLOOR_HEIGHT);
      const railTilt = direction * Math.atan2(FLOOR_HEIGHT, run);
      onFace(frame, center, lower + FLOOR_HEIGHT / 2 + .9, 2.12, railLength, .085, .085, railTilt);
      for (const t of [.1, .5, .9]) {
        onFace(frame, center + direction * (t - .5) * run, lower + t * FLOOR_HEIGHT + .44,
          2.12, .07, .89, .07);
      }
    }
    onFace(concrete, center, (FLOOR_COUNT - 1) * FLOOR_HEIGHT, 1.15, run + 2.7, .24, 2.12);
  }

  const boxGeometry = new T.BoxGeometry(1, 1, 1);
  const transform = new T.Object3D();
  for (const [material, items] of elements) {
    const mesh = new T.InstancedMesh(boxGeometry, material, items.length);
    mesh.receiveShadow = true;
    items.forEach(({x, y, z, width, height, depth, yaw, tilt}, i) => {
      transform.position.set(x, y, z);
      transform.rotation.set(0, yaw, tilt, 'YXZ');
      transform.scale.set(width, height, depth);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
    });
    group.add(mesh);
  }

  const pickables = group.children;
  pickables.forEach(mesh => { mesh.userData.osm = footprint.osm; });
  return {group, top: grade + ROOF_HEIGHT, pickables};
}
