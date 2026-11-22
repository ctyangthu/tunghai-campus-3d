import * as T from 'three';

const material = (color, extra = {}) => new T.MeshLambertMaterial({color, ...extra});
const concrete = material('#c9c1af');
const plaster = material('#e6e1d5');
const mortar = material('#8e8574');
const brick = material('#9c644e', {side:T.DoubleSide});
const walkBrick = material('#ae725b');
const wood = material('#51483f');
const redWood = material('#994f41');
const glass = material('#566263');
const grayRoof = material('#666861');
const metal = material('#a7abad');
const green = material('#516355');
const tile = material('#fff', {side:T.DoubleSide});

const tileSize = 64;
const tilePixels = new Uint8Array(tileSize * tileSize * 4);
for (let y = 0; y < tileSize; y++) {
  for (let x = 0; x < tileSize; x++) {
    const course = (y + (x % 16 < 8 ? 2 : 0)) % 16;
    const ridge = Math.sin(Math.PI * (x % 16) / 16) * 27;
    const shade = Math.round(73 + ridge - (course < 2 ? 11 : 0));
    const index = (y * tileSize + x) * 4;
    tilePixels.set([shade + 5, shade + 3, shade, 255], index);
  }
}
const tileTexture = new T.DataTexture(tilePixels,tileSize,tileSize);
tileTexture.colorSpace = T.SRGBColorSpace;
tileTexture.wrapS = tileTexture.wrapT = T.RepeatWrapping;
tileTexture.generateMipmaps = true;
tileTexture.minFilter = T.LinearMipmapLinearFilter;
tileTexture.magFilter = T.LinearFilter;
tileTexture.anisotropy = 8;
tileTexture.needsUpdate = true;
tile.map = tileTexture;

const unitBox = new T.BoxGeometry(1,1,1);
const unitPebble = new T.CylinderGeometry(.5,.52,1,11);

function building(footprint, height) {
  const {points,x,z,osm} = footprint;
  const grade = height(x,z);
  const outline = points.map(([east,south]) => new T.Vector2(east-x,south-z));
  const longest = outline.reduce((axis, point, index) => {
    const edge = outline[(index+1)%outline.length].clone().sub(point);
    return edge.lengthSq()>axis.lengthSq() ? edge : axis;
  }, new T.Vector2());
  if (longest.x<0) longest.negate();
  const angle = Math.atan2(longest.y,longest.x);
  const center = new T.Vector2();
  const ring = outline.map(point=>point.rotateAround(center,-angle));
  const bounds = new T.Box2().setFromPoints(ring);
  const group = new T.Group();
  group.position.set(x,grade,z);
  group.rotation.y = -angle;
  const batches = new Map();
  const c = Math.cos(angle), s = Math.sin(angle);
  const toWorld = (u,v) => [x+u*c-v*s,z+u*s+v*c];
  const ground = (u,v) => height(...toWorld(u,v))-grade;
  const low = Math.min(-.35,...ring.map(p=>ground(p.x,p.y)-.35));

  function mesh(geometry, surface) {
    const part = new T.Mesh(geometry,surface);
    part.castShadow = part.receiveShadow = true;
    part.userData.osm = osm;
    group.add(part);
    return part;
  }

  function box(surface,u,y,v,w,h,d,yaw=0,tilt=0,geometry=unitBox) {
    const key = surface.id + ':' + geometry.id;
    if (!batches.has(key)) batches.set(key,{surface,geometry,parts:[]});
    batches.get(key).parts.push([u,y,v,w,h,d,yaw,tilt]);
  }

  function radial(surface,u,y,v,diameter,h) {
    box(surface,u,y,v,diameter,h,diameter,0,0,unitPebble);
  }

  function face(surface,position,uv) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(position,3));
    if (uv) geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    geometry.computeVertexNormals();
    return mesh(geometry,surface);
  }

  function slab(outline,bottom,top,wall,cap=wall) {
    const shape = new T.Shape(outline.map(([u,v])=>new T.Vector2(u,-v)));
    const geometry = new T.ExtrudeGeometry(shape,{depth:top-bottom,bevelEnabled:false});
    geometry.rotateX(-Math.PI/2);
    geometry.translate(0,bottom,0);
    mesh(geometry,[cap,wall]);
  }

  function beam(surface,a,b,centerY,size,depth) {
    const dx=b[0]-a[0], dz=b[1]-a[1];
    box(surface,(a[0]+b[0])/2,centerY,(a[1]+b[1])/2,Math.hypot(dx,dz)+.04,size,depth,-Math.atan2(dz,dx));
  }

  function finish(top, clearing) {
    const transform = new T.Object3D();
    for (const {surface,geometry,parts} of batches.values()) {
      const part = new T.InstancedMesh(geometry,surface,parts.length);
      parts.forEach(([u,y,v,w,h,d,yaw,tilt],index)=>{
        transform.position.set(u,y,v);
        transform.rotation.set(tilt,yaw,0,'YXZ');
        transform.scale.set(w,h,d);
        transform.updateMatrix();
        part.setMatrixAt(index,transform.matrix);
      });
      part.instanceMatrix.needsUpdate = true;
      part.castShadow = part.receiveShadow = true;
      part.userData.osm = osm;
      group.add(part);
    }
    return {
      group,top:grade+top,pickables:group.children,
      plantingExclusion:clearing?.map(([u,v])=>toWorld(u,v)),
    };
  }

  return {bounds,ring:ring.map(p=>p.toArray()),low,ground,box,radial,face,slab,beam,finish};
}

function gable(model,eave,rise,overhang) {
  const {min,max} = model.bounds;
  const zMid = (min.y+max.y)/2;
  const ridge = eave+rise;
  const x0 = min.x-overhang*.75, x1 = max.x+overhang*.75;
  const z0 = min.y-overhang, z1 = max.y+overhang;
  for (const z of [z0,z1]) {
    const a=[x0,eave,z], b=[x1,eave,z], c=[x1,ridge,zMid], d=[x0,ridge,zMid];
    const verts = z<zMid ? [a,d,b,b,d,c] : [a,b,d,b,c,d];
    model.face(tile,verts.flat(),verts.flatMap(([u,y,v])=>[u/1.04,v/.96]));
    model.box(grayRoof,(x0+x1)/2,eave-.09,z,x1-x0,.18,.14);
  }
  for (const x of [min.x,max.x]) {
    model.face(brick,[x,eave-.12,min.y,x,ridge,zMid,x,eave-.12,max.y]);
  }
  model.box(grayRoof,(x0+x1)/2,ridge,zMid,x1-x0,.19,.28);
}

function steps(model, x, z, grade, landing, width, run, side, surface) {
  const n = Math.max(3,Math.round((landing-grade)/.19));
  const tread = run/n;
  for (let i=0;i<n;i++) {
    const dy = (landing-grade) * (i+1)/n;
    model.box(surface,x,grade+dy/2,z+side*(run-(i+.5)*tread),width,dy,tread+.012);
  }
}

function windowRow(model,center,z,width,height,y,verticals,frame=wood,side=-1) {
  model.box(frame,center,y,z,width,height,.12);
  model.box(glass,center,y,z+side*.065,width-.16,height-.16,.045);
  const spacing = width/verticals;
  for (let i=1;i<verticals;i++) {
    model.box(frame,center-width/2+i*spacing,y,z+side*.097,.045,height,.04);
  }
}

function gymnasium(footprint,height) {
  const model = building(footprint,height);
  const {min,max} = model.bounds;
  const front = min.y;
  const center = (min.x+max.x)/2;
  const grade = model.ground(center,front-5.3);
  const buriedFloor = Math.min(model.low,grade-1.1);
  const eave=grade+8.5, rise=6.05;
  model.slab(model.ring,buriedFloor,eave,brick);
  gable(model,eave,rise,1.05);
  const bay = (max.x-min.x)/7;
  for (const side of [-1,1]) {
    const z=side===-1 ? min.y : max.y;
    for (let i=0;i<=7;i++) {
      model.box(concrete,min.x+i*bay,(eave+buriedFloor)/2,z+side*.09,.64,eave-buriedFloor,.53);
    }
    for (const [dy,h] of [[.34,.52],[2.7,.30],[5.56,.44],[8.2,.31]]) {
      model.box(concrete,center,grade+dy,z+side*.11,max.x-min.x,.98*h,.47);
    }
    for (let i=0;i<7;i++) {
      const x=min.x+(i+.5)*bay;
      const offset=side<0 ? -.09 : .16;
      windowRow(model,x,z+offset,bay-.74,1.67,eave-1.52,5,wood,side);
      windowRow(model,x,z+offset,bay-.74,1.84,grade+1.42,6,wood,side);
      model.box(side<0&&i===3?metal:plaster,x,grade+4.18,z+side*.29,bay-.7,2.36,.15);
      if (side<0&&i===3) model.box(wood,x,grade+4.18,z-.38,.06,2.36,.07);
      else model.box(wood,x,grade+4.18,z+side*.38,.065,2.36,.07);
    }
  }

  const entrance = grade+2.96;
  model.box(concrete,center,entrance-.16,front-.63,4.15,.32,1.48);
  steps(model,center,front-1.22,grade,entrance,3.7,4.95,-1,mortar);
  const slope=Math.atan2(entrance-grade,4.95);
  for (const offset of [-1.96,1.96]) {
    model.box(concrete,center+offset,(entrance+grade)/2+.42,front-3.7,
      .2,.65,Math.hypot(4.95,entrance-grade),0,-slope);
  }
  model.box(walkBrick,center,grade-.17,front-8.5,10.8,.3,5.55);

  const top=eave+rise+.15;
  return model.finish(top,[[-5.8,front-12],[5.8,front-12],[5.8,front],[-5.8,front]]);
}

function sportsOffice(footprint,height) {
  const model=building(footprint,height);
  model.slab(model.ring,model.low,3.05,concrete,grayRoof);
  model.slab(model.ring,3.05,3.25,plaster,grayRoof);
  const {min,max}=model.bounds;
  for (const x of [-3.9,0,3.9]) windowRow(model,x,min.y-.06,2.55,1.21,1.83,3);
  model.box(grayRoof,(min.x+max.x)/2,3.48,(min.y+max.y)/2,3.9,.43,1.25);
  return model.finish(3.72);
}

function auditorium(footprint,height) {
  const model=building(footprint,height);
  const {min,max}=model.bounds;
  const center=(min.x+max.x)/2, front=min.y;
  const floor=.31, eave=4.85, rise=3.08;
  model.slab(model.ring,model.low,floor,mortar);
  model.slab(model.ring,floor,eave,brick);
  gable(model,eave,rise,1.13);
  const span=(max.x-min.x)/6;
  for (let i=0;i<=6;i++) {
    const x=min.x+i*span;
    model.box(concrete,x,(floor+eave)/2,front-.115,.31,eave-floor,.36);
    model.box(concrete,x,(floor+eave)/2,max.y+.11,.31,eave-floor,.36);
  }
  for (const z of [front-.13,max.y+.13]) {
    const faceSign=z<0 ? -1 : 1;
    model.box(wood,center,eave-.92,z,max.x-min.x-.54,.82,.1);
    for (let bay=0;bay<42;bay++) {
      const x=min.x+(bay+.5)*(max.x-min.x)/42;
      model.box(concrete,x,eave-.92,z+faceSign*.07,.038,.66,.035);
    }
    for (const dy of [-.19,0,.19]){
      model.box(concrete,center,eave-.92+dy,z+faceSign*.07,max.x-min.x-.54,.043,.045);
    }
  }
  windowRow(model,center,front-.19,5.35,3.13,floor+1.63,9);
  for (let row=1;row<=6;row++) model.box(wood,center,floor+row*.46,front-.281,5.35,.065,.065);
  model.box(mortar,center,floor*.42,front-.63,max.x-min.x+1.1,.28,1.55);
  steps(model,center,front-1.38,Math.min(0,model.ground(center,front-2.38)),floor,8.75,1.12,-1,mortar);
  // The circular clay-tube ventilator sits inside the exposed brick gable.
  const x=max.x+.032,z=(min.y+max.y)/2,y=eave+.86;
  const circle=new T.CircleGeometry(.93,24);
  circle.rotateY(Math.PI/2);
  const opening=model.face(wood,Array.from(circle.toNonIndexed().attributes.position.array));
  opening.position.set(x,y,z);
  for (const [dy,dz] of [[0,0],[.41,0],[.21,.36],[-.21,.36],[-.41,0],[-.21,-.36],[.21,-.36]]) {
    const disk=new T.CircleGeometry(.145,11);
    disk.rotateY(Math.PI/2);
    const sleeve=model.face(walkBrick,Array.from(disk.toNonIndexed().attributes.position.array));
    sleeve.position.set(x+.024,y+dy,z+dz);
  }
  return model.finish(eave+rise+.13,[[-5.6,front-2.7],[5.6,front-2.7],[5.6,front],[-5.6,front]]);
}

function oldPostOffice(footprint,height) {
  const model=building(footprint,height);
  const {min,max}=model.bounds;
  const center=(min.x+max.x)/2,front=min.y;
  const grade=model.ground(center,front-2.1);
  const floor=Math.max(.38,grade+.42),eave=floor+3.03,rise=1.76;
  const entryFront=front+.76;
  const wallRing=model.ring.map(([x,z])=>[x,Math.max(z,entryFront)]);
  model.slab(model.ring,model.low,floor,mortar);
  model.slab(wallRing,floor,eave,brick);
  gable(model,eave,rise,.65);
  const bay=(max.x-min.x)/4;
  for (let i=0;i<=4;i++){
    const x=min.x+i*bay;
    model.box(concrete,x,(floor+eave)/2,front+.04,.29,eave-floor,.36);
  }
  model.box(concrete,center,eave-.085,front,max.x-min.x+.23,.22,.35);
  for (let i=0;i<4;i++) {
    const x=min.x+(i+.5)*bay;
    windowRow(model,x,entryFront-.08,bay-.36,2.25,floor+1.16,3,redWood);
    model.box(redWood,x,floor+1.64,entryFront-.184,bay-.36,.064,.05);
  }
  model.box(green,center,eave-.59,entryFront-.20,4.1,.39,.11);
  model.box(walkBrick,center,floor-.12,front-.57,10.95,.24,1.8);
  steps(model,center,front-1.43,floor-.54,floor,9.6,1.2,-1,mortar);
  for (const dx of [-3.4,0,3.4]) {
    const z=front-3.64,y=model.ground(center+dx,z);
    model.radial(concrete,center+dx,y+.22,z,.53,.44);
  }
  return model.finish(eave+rise+.13,[[-5.6,front-4.2],[5.6,front-4.2],[5.6,front],[-5.6,front]]);
}

function gardenRestaurant(footprint,height) {
  const model=building(footprint,height);
  const lower=3.65;
  model.slab(model.ring,model.low,lower,plaster,grayRoof);

  // Follow the angular roof terraces seen above the dining level.
  const terrace=[[-23.3,7.1],[-8.3,-16.6],[-1.1,-13.4],[-12.3,3.4],[-9.1,7.1],[8,7.1],[8,12.3],[-23.3,12.3]];
  model.slab(terrace,lower,6.3,plaster,walkBrick);
  for (let i=0;i<terrace.length-1;i++) model.beam(i%2===0?plaster:concrete,terrace[i],terrace[i+1],6.45,.46,.33);
  const outer=[[-24.8,11.9],[-25,6.5],[-7.1,-22.7],[5.12,-16.4]];
  for (let i=0;i<outer.length-1;i++) model.beam(plaster,outer[i],outer[i+1],7.04,.57,.72);
  model.slab([[-24.55,7.05],[-7.5,-21.4],[-5.6,-20.5],[-22.5,8.6]],lower,6.75,plaster,concrete);

  // The dark, ribbed roof sits below the white terrace rims.
  const slope=[[-10.75,4.28,-1.1],[4.15,4.28,-2.4],[23.1,5.48,-2.1],[23.1,5.48,10.85],[-9.0,4.32,10.85]];
  model.face(material('#60666a',{side:T.DoubleSide}),[slope[0],slope[1],slope[4],slope[1],slope[3],slope[4],slope[1],slope[2],slope[3]].flat());
  for (let i=0;i<18;i++){
    const x=-8.6+i*1.73;
    const y=x<4.15?4.38:4.38+(x-4.15)*1.2/19;
    model.box(metal,x,y,4.32,.073,.087,11.89);
  }

  const sides = model.ring;
  for (let i=0;i<sides.length;i++){
    const [x,z]=sides[i], [x1,z1]=sides[(i+1)%sides.length];
    const dx=x1-x,dz=z1-z,l=Math.hypot(dx,dz);
    if (l<6) continue;
    const yaw=-Math.atan2(dz,dx), bays=Math.max(2,Math.floor(l/2.8)), w=l/bays;
    for (let j=0;j<bays;j++){
      const t=(j+.5)/bays;
      model.box(j%4===0?metal:glass,x+dx*t-dz/l*.09,2.07,z+dz*t+dx/l*.09,w*.8,1.52,.24,yaw);
      if (i===12 || i===14){
        model.box(glass,x+dx*t-dz/l*.1,4.84,z+dz*t+dx/l*.1,w*.70,1.10,.24,yaw);
      }
    }
  }
  model.box(plaster,-3.3,4.36,-8.0,6.15,1.39,3.38);
  model.box(grayRoof,-3.3,5.13,-8.0,6.18,.17,3.44);
  model.box(metal,-5.2,4.18,-13.3,1.6,1.06,2.3);
  model.box(metal,-2.85,4.18,-13.2,1.65,1.06,2.22);
  return model.finish(7.4);
}

function gardenBankWing(footprint,height){
  const model=building(footprint,height);
  model.slab(model.ring,model.low,3.3,plaster,grayRoof);
  const {min,max}=model.bounds;
  model.box(grayRoof,(min.x+max.x)/2,3.43,(min.y+max.y)/2,4.45,.22,3.05);
  return model.finish(3.56);
}

export const campusSocialLandmarks = new Map([
  ['w227106503',gymnasium],
  ['w227128391',sportsOffice],
  ['w227104642',auditorium],
  ['w1309048743',oldPostOffice],
  ['w367193104',gardenRestaurant],
  ['w368306829',gardenBankWing],
]);
