import * as T from 'three';

export const fineArtsId = 'w367198636';

export function fineArtsBuilding(footprint, terrainHeight) {
  const group = new T.Group();
  const {x: originX, z: originZ, points} = footprint;
  const base = Math.max(...points.map(([x, z]) => terrainHeight(x, z))) - 1.25;
  group.position.set(originX, base, originZ);
  const perimeter = points.map(([x, z]) => [x - originX, z - originZ]);
  const core = perimeter.map(([x, z]) => [x * .94, z * .76 - 1.1]);
  const roofY = 10.65;
  const material = (color, side = T.FrontSide) => new T.MeshLambertMaterial({color, side});
  const concrete = material('#b3b6ae');
  const fascia = material('#c5c5b9');
  const shade = material('#88938a');
  const glass = material('#536e74');
  const glassLight = material('#789398');
  const metal = material('#555e59');
  const brick = material('#a76046');
  const brickLight = material('#be7a5e');
  const roof = material('#9fa59a');
  const planting = new T.MeshLambertMaterial({side: T.DoubleSide, vertexColors: true});
  const batches = new Map();

  function add(geometry, material) {
    const part = new T.Mesh(geometry, material);
    part.receiveShadow = true;
    part.castShadow = true;
    group.add(part);
    return part;
  }

  function box(x, y, z, w, h, d, surface, yaw = 0) {
    if (!batches.has(surface)) batches.set(surface, []);
    batches.get(surface).push({x, y, z, w, h, d, yaw});
  }

  function extrude(ring, bottom, top, topMat, sideMat) {
    const shape = new T.Shape();
    for (const [index, [x, z]] of ring.entries()) {
      shape[index ? 'lineTo' : 'moveTo'](x, -z);
    }
    const geometry = new T.ExtrudeGeometry(shape, {depth: top - bottom, bevelEnabled: false});
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, bottom, 0);
    add(geometry, [topMat, sideMat]);
  }

  const foot = Math.min(...points.map(([x, z]) => terrainHeight(x, z) - base)) - .2;
  extrude(core, foot, 3.14, shade, concrete);
  extrude(core, 3.14, 10.3, roof, concrete);
  extrude(perimeter.map(([x,z]) => [x * 1.018,z * 1.04]), 10.30, roofY, roof, fascia);
  extrude(perimeter.map(([x,z]) => [x * .998,z * .984]), 3.12, 3.54, fascia, fascia);
  extrude(core.map(([x,z]) => [x * 1.024,z * 1.042]), 6.65, 6.93, fascia, fascia);

  const signedArea = core.reduce((sum, [x, z], i) => {
    const [nextX, nextZ] = core[(i + 1) % core.length];
    return sum + x * nextZ - z * nextX;
  }, 0);
  for (const [index, [ax, az]] of core.entries()) {
    const [bx, bz] = core[(index + 1) % core.length];
    const dx = bx - ax, dz = bz - az;
    const length = Math.hypot(dx, dz);
    const yaw = -Math.atan2(dz, dx);
    const side = Math.sign(signedArea);
    const nx = side * dz / length, nz = -side * dx / length;
    const bays = Math.max(1, Math.round(length / 3.2));
    const broad = nz > .35 || nz < -.6;
    for(let i = 0; i < bays; i++){
      const x = ax + dx * (i + .5) / bays;
      const z = az + dz * (i + .5) / bays;
      const width = length / bays * (broad ? .71 : .32);
      for(const y of [1.93, 5.12, 8.38]){
        if(y < 3 && (index === 3 || index === 4)) continue;
        box(x + nx * .06, y, z + nz * .06, width, y < 3 ? 1.5 : 2.43, .18, glass, yaw);
        box(x + nx * .16, y + .04, z + nz * .16, width, .10, .12, metal, yaw);
        box(x + nx * .15, y + .51, z + nz * .15, width * .86, .78, .055, glassLight, yaw);
        box(x + nx * .16, y, z + nz * .16, .088, y < 3 ? 1.53 : 2.45, .10, metal, yaw);
      }
      if (broad && index !== 0 && i < bays - 1) {
        box(ax + dx * (i + 1) / bays + nx * .21, 7, az + dz * (i + 1) / bays + nz * .21, .33, 6.5, .45, fascia, yaw);
      }
    }

    // Slender concrete parapet traces the roof and breaks at the east gallery.
    if(index !== 3) {
      box((ax + bx) / 2 + nx * .29, roofY + .20, (az + bz) / 2 + nz * .29, length, .35, .29, fascia, yaw);
    }
  }

  // Raised landing, red brick screen, and exposed stairs at the east opening.
  const east = new T.Group();
  east.position.set(35.3, 0, 7.1);
  east.rotation.y = 1.46;
  group.add(east);
  function eastBox(x, y, z, w, h, d, surface) {
    const offset = new T.Vector3(x, y, z).applyEuler(east.rotation).add(east.position);
    box(offset.x, offset.y, offset.z, w, h, d, surface, east.rotation.y);
  }
  eastBox(0, 6.52, -1.1, 16, .43, 5.2, fascia);
  eastBox(0, 3.34, -1.1, 16, .40, 5.2, fascia);
  eastBox(0, 9.98, -1.1, 16.3, .54, 5.55, fascia);
  eastBox(0, 1.54, -2.28, 14.9, 2.88, .34, brick);
  for(let row = 0; row < 10; row++) {
    for(let column = 0; column < 23; column++){
      const x = -7.1 + column * .62 + (row % 2) * .30;
      eastBox(x, .36 + row * .25, -2.05, .43, .146, .14, (row + column) % 5 ? brickLight : brick);
    }
  }
  const stairs = (x, z, length, start, rise, direction) => {
    const steps = Math.round(rise / .19);
    for(let i = 0; i < steps; i++){
      const y = start + rise * (i + .5) / steps;
      eastBox(x + direction * length * (i + .5) / steps, y, z, length / steps + .042, .43, 2.35, fascia);
      if (i % 3 === 0) {
        for(const d of [-1.16, 1.16]) eastBox(x + direction * length * (i + .5) / steps, y + .53, z + d, .055, 1.17, .055, metal);
      }
    }
    for(const d of [-1.16, 1.16]){
      const track = new T.CylinderGeometry(.052, .052, Math.hypot(length, rise), 6);
      const rail = new T.Mesh(track, metal);
      rail.position.set(x + direction * length / 2, start + rise / 2 + 1.05, z + d);
      rail.rotation.z = -direction * Math.atan2(length, rise);
      east.add(rail);
    }
  };
  stairs(-7.5, 1.55, 9, .21, 3.06, 1);
  stairs(5.0, -1.35, 9, 3.52, 2.98, -1);
  for(const x of [-7.3, 0, 7.3]){
    const column = new T.Mesh(new T.CylinderGeometry(.43, .49, 10.2, 14), concrete);
    column.position.set(x, 4.9, .83);
    column.castShadow = true;
    column.receiveShadow = true;
    east.add(column);
  }
  for(const y of [4.31, 7.5]){
    eastBox(0, y, 1.2, 15.9, .085, .10, metal);
    for(let i=0;i<17;i++) eastBox(-7.6 + i * .95, y - .41, 1.2, .047, .84, .052, metal);
  }

  // Interpolated planted folds trace the two southern façade sections.
  // The opening between them leaves the campus footpath visible.
  const foldColors = ['#668458', '#6d8c5c', '#779061', '#879a62', '#728655'].map(c => new T.Color(c));
  const joints = [];
  const surfaceVertices = [];
  const surfaceColors = [];
  function fold(from, to, span, reach, crownHeight) {
    const columns = 27, rows = 12;
    const samples = Array.from({length: columns+1}, (_, i) => {
      const u = i / columns;
      const variation = Math.sin(Math.PI * u);
      return Array.from({length: rows+1}, (_, j) => {
        const v = j / rows;
        const x = T.MathUtils.lerp(from[0], to[0], u);
        const z = T.MathUtils.lerp(from[1], to[1], u) + reach * v * (.67 + .34 * variation);
        const start = crownHeight * (.27 + .73 * variation) + span;
        const ground = terrainHeight(originX + x, originZ + z) - base + .09;
        const y = T.MathUtils.lerp(ground, start, (1-v) ** 1.92);
        return [x, y, z];
      });
    });
    for(let i=0; i<columns; i++) for(let j=0; j<rows; j++){
      const a = samples[i][j], b = samples[i+1][j], c = samples[i+1][j+1], d = samples[i][j+1];
      const reverse = (i+j)%2;
      surfaceVertices.push(...(reverse ? [a,b,d,b,c,d] : [a,b,c,a,c,d]).flat());
      const first = foldColors[(i*13+j*7)%foldColors.length];
      const second = foldColors[(i*7+j*11+1)%foldColors.length];
      for(const color of [first, second]) for(let n=0; n<3; n++) surfaceColors.push(color.r,color.g,color.b);
      if ((i+j)%2===0) {
        const diagonal = [(a[0]+c[0])/2, (a[1]+c[1])/2, (a[2]+c[2])/2];
        joints.push(a[0], a[1]+.025, a[2], diagonal[0], diagonal[1]+.025, diagonal[2]);
      }
    }
  }
  fold([-42.5,-7.8], [-6.2,6.9], .2, 7.8, 9.7);
  fold([4.6,10.8], [30.6,17.7], .5, 6.1, 8.3);
  const plantedGeometry = new T.BufferGeometry();
  plantedGeometry.setAttribute('position', new T.Float32BufferAttribute(surfaceVertices,3));
  plantedGeometry.setAttribute('color', new T.Float32BufferAttribute(surfaceColors,3));
  plantedGeometry.computeVertexNormals();
  add(plantedGeometry, planting);
  const seamGeometry = new T.BufferGeometry();
  seamGeometry.setAttribute('position',new T.Float32BufferAttribute(joints,3));
  group.add(new T.LineSegments(seamGeometry,new T.LineBasicMaterial({color:'#425a3f',transparent:true,opacity:.34})));

  const unitBox = new T.BoxGeometry(1, 1, 1);
  const dummy = new T.Object3D();
  for(const [surface, list] of batches){
    const instanced = new T.InstancedMesh(unitBox, surface, list.length);
    instanced.castShadow = surface === fascia || surface === concrete;
    instanced.receiveShadow = true;
    list.forEach(({x,y,z,w,h,d,yaw}, index)=>{
      dummy.position.set(x,y,z);
      dummy.rotation.y = yaw;
      dummy.scale.set(w,h,d);
      dummy.updateMatrix();
      instanced.setMatrixAt(index, dummy.matrix);
    });
    group.add(instanced);
  }
  const pickables = [];
  group.traverse(part=>{
    if (part.isMesh) {
      part.userData.osm = fineArtsId;
      pickables.push(part);
    }
  });
  return {group, top: base + roofY, pickables};
}
