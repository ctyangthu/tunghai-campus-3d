import * as T from 'three';

export const facultyResidenceId = 'faculty-residence-136';
export const facultyResidenceBuildingIds = ['w226829329', 'w226829994', 'w227075011'];

const floorCount = 7;
// The school confirms seven floors; the height per floor is a visual estimate.
const floorHeight = 3.06;
const roofLevel = floorCount * floorHeight;
const serviceHeight = 2.58;

export function facultyResidenceBuilding(footprint, terrainHeight) {
  const grade = terrainHeight(footprint.x, footprint.z);
  const foundation = Math.min(grade, ...footprint.points.map(([x, z]) => terrainHeight(x, z))) - grade - .42;
  const ring = footprint.points.map(([x, z]) => [x - footprint.x, z - footprint.z]);
  const group = new T.Group();
  group.position.set(footprint.x, grade, footprint.z);

  const paint = color => new T.MeshLambertMaterial({color});
  const wall = paint('#eeefeb');
  const eave = paint('#788985');
  const roof = paint('#a0a8a5');
  const concrete = paint('#d0d7cf');
  const sash = paint('#4e6066');
  const glass = paint('#829ca8');
  const rail = paint('#879792');

  const shape = new T.Shape();
  ring.forEach(([x, z], i) => shape[i === 0 ? 'moveTo' : 'lineTo'](x, -z));
  const solid = new T.ExtrudeGeometry(shape, {depth: roofLevel - foundation, bevelEnabled: false});
  solid.rotateX(-Math.PI / 2);
  solid.translate(0, foundation, 0);
  const body = new T.Mesh(solid, [roof, wall]);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const details = new Map();
  function addBox(material, x, y, z, width, height, depth, yaw = 0) {
    if (!details.has(material)) details.set(material, []);
    details.get(material).push({x, y, z, width, height, depth, yaw});
  }

  const winding = Math.sign(ring.reduce((sum, [x, z], index) => {
    const [nextX, nextZ] = ring[(index + 1) % ring.length];
    return sum + x * nextZ - z * nextX;
  }, 0));

  ring.forEach(([x, z], index) => {
    const [nextX, nextZ] = ring[(index + 1) % ring.length];
    const dx = nextX - x, dz = nextZ - z;
    const length = Math.hypot(dx, dz);
    const normalX = winding * dz / length, normalZ = -winding * dx / length;
    const yaw = -Math.atan2(dz, dx);

    function onFacade(material, along, y, offset, width, height, depth) {
      addBox(material, x + dx * along / length + normalX * offset, y,
        z + dz * along / length + normalZ * offset, width, height, depth, yaw);
    }

    onFacade(eave, length / 2, roofLevel - .13, .11, length, .29, .64);
    if (length < 3.7) return;

    const bays = Math.max(1, Math.round(length / 3.8));
    const span = length / bays;
    for (let floor = 0; floor < floorCount; floor++) {
      const glassHeight = floor === 0 ? 1.73 : 1.61;
      const windowY = floor * floorHeight + 1.52;
      for (let bay = 0; bay < bays; bay++) {
        const along = (bay + .5) * span;
        const balcony = floor > 0 && length > 7.2 && (bay + index) % 2 === 0;
        const width = Math.min(span - .63, balcony ? 2.49 : 2.24);
        onFacade(sash, along, windowY, .041, width, glassHeight, .125);
        onFacade(glass, along, windowY, .111, width - .17, glassHeight - .16, .051);
        onFacade(sash, along + width * .11, windowY, .141, .062, glassHeight - .11, .046);
        if (!balcony) continue;
        const floorY = floor * floorHeight + .22;
        onFacade(concrete, along, floorY, .52, width + .4, .22, 1.14);
        onFacade(wall, along, floorY + .38, 1.04, width + .39, .54, .13);
        onFacade(rail, along, floorY + .84, 1.04, width + .38, .083, .091);
        for (const side of [-1, 1]) {
          const edge = along + side * (width / 2 + .13);
          onFacade(concrete, edge, floorY + .39, .54, .15, .57, 1.05);
          onFacade(rail, edge, floorY + .76, 1.04, .075, .51, .08);
        }
      }
    }
  });

  // A small service shaft rises behind the eaves above the central joint.
  addBox(wall, .03, roofLevel + serviceHeight / 2, .05, 3.48, serviceHeight, 3.15);
  addBox(concrete, .03, roofLevel + serviceHeight + .045, .05, 3.74, .09, 3.42);
  addBox(roof, .03, roofLevel + serviceHeight - .48, 1.64, 1.58, .43, .05);

  const boxGeometry = new T.BoxGeometry(1, 1, 1);
  const transform = new T.Object3D();
  for (const [material, instances] of details) {
    const mesh = new T.InstancedMesh(boxGeometry, material, instances.length);
    mesh.receiveShadow = true;
    instances.forEach(({x, y, z, width, height, depth, yaw}, index) => {
      transform.position.set(x, y, z);
      transform.scale.set(width, height, depth);
      transform.rotation.y = yaw;
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    group.add(mesh);
  }

  const pickables = group.children;
  for (const mesh of pickables) mesh.userData.osm = facultyResidenceId;
  return {group, top: grade + roofLevel + serviceHeight + .09, pickables};
}
