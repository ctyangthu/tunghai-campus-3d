import * as T from 'three';

export const wenliBoulevardId = 'w367700897';
export const alumniBellId = 'n2358488959';
export const wenliCourtyards = [
  {id:'w368071581', wings:['w129849181','w129849201','w129849205'], passage:'w227116691', levels:2, gate:true},
  {id:'w368249647', wings:['w367197700','w368304663','w368304664'], passage:'w368304661'},
  {id:'w368071586', wings:['w129849213','w129849223','w129849227'], passage:'w368066318'},
  {id:'w368071570', wings:['w129849197','w129849203','w129849208','w129849221'], levels:2},
  {id:'w368071571', wings:['w367196007','w368283830','w368283831','w368283832'], levels:2},
  {id:'w368071585', wings:['w129849193','w129849214','w129849228'], passage:'w129849219', levels:2},
  {id:'w368304680', wings:['w367196163','w368304669','w368304672'], levels:2},
];

const concrete = new T.MeshLambertMaterial({color:'#ddd4bf'});
const brick = new T.MeshLambertMaterial({color:'#a4634c',side:T.DoubleSide});
const stone = new T.MeshLambertMaterial({color:'#8d8b79'});
const timber = new T.MeshLambertMaterial({color:'#53493d'});
const glass = new T.MeshLambertMaterial({color:'#494e47'});
const edge = new T.MeshLambertMaterial({color:'#50514c',side:T.DoubleSide});
const tile = new T.MeshLambertMaterial({color:'#fff',side:T.DoubleSide});

function roofTiles() {
  if (tile.map) return tile;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  for (let x=0; x<128; x++) {
    const shade = Math.round(89+17*Math.sin(x*Math.PI/32));
    ctx.fillStyle = 'rgb('+shade+','+(shade+1)+','+shade+')';
    ctx.fillRect(x,0,1,128);
  }
  ctx.fillStyle = '#383b336b';
  for (let x=0; x<128; x+=16) {
    const offset = x%32===0 ? 5 : 0;
    for (let y=offset; y<128; y+=16) ctx.fillRect(x,y,16,1);
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.anisotropy = 8;
  tile.map = texture;
  tile.needsUpdate = true;
  return tile;
}

function part(group, geometry, material) {
  const mesh = new T.Mesh(geometry,material);
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function box(group, x,y,z, width,height,depth, material) {
  const mesh = part(group,new T.BoxGeometry(width,height,depth),material);
  mesh.position.set(x,y,z);
  return mesh;
}

function slab(group, points, bottom, top, material) {
  const outline = new T.Shape(points.map(p=>new T.Vector2(p.x,-p.y)));
  const geometry = new T.ExtrudeGeometry(outline,{depth:top-bottom,bevelEnabled:false});
  geometry.rotateX(-Math.PI/2);
  const mesh = part(group,geometry,material);
  mesh.position.y = bottom;
  return mesh;
}

// Split each footprint at the ridge so the two planes meet without bridging courtyards.
function halfPolygon(points, ridge, side) {
  const half = [];
  for (let i=0; i<points.length; i++) {
    const a=points[i], b=points[(i+1)%points.length];
    const first=(a.y-ridge)*side, second=(b.y-ridge)*side;
    if (first>=0) half.push(a);
    if (first*second<0) half.push(a.clone().lerp(b,first/(first-second)));
  }
  return half;
}

function addRoof(group, points, eaves, rise, overhang, infill) {
  const x0=Math.min(...points.map(p=>p.x)), x1=Math.max(...points.map(p=>p.x));
  const z0=Math.min(...points.map(p=>p.y)), z1=Math.max(...points.map(p=>p.y));
  const center = new T.Vector2((x0+x1)/2,(z0+z1)/2);
  const width = z1-z0, length = x1-x0;
  const roofOutline=points.map(p=>new T.Vector2(
    center.x+(p.x-center.x)*(1+overhang*1.25/length),
    center.y+(p.y-center.y)*(1+2*overhang/width),
  ));
  const surface = z=>eaves+rise*(1-Math.abs(z-center.y)/(width/2+overhang));
  const positions=[], uvs=[], edges=[], wall=[];
  for (const side of [-1,1]) {
    const face=halfPolygon(roofOutline,center.y,side);
    for (const triangle of T.ShapeUtils.triangulateShape(face,[])) {
      for (const index of triangle) {
        const {x,y:z}=face[index];
        positions.push(x,surface(z),z);
        uvs.push(x/2.4,z/3.2);
      }
    }
    for (let i=0; i<face.length; i++) {
      const a=face[i], b=face[(i+1)%face.length];
      if (Math.max(Math.abs(a.y-center.y),Math.abs(b.y-center.y))<.001) continue;
      const ay=surface(a.y), by=surface(b.y);
      edges.push(a.x,ay,a.y, b.x,by,b.y, b.x,by-.18,b.y,
                 a.x,ay,a.y, b.x,by-.18,b.y, a.x,ay-.18,a.y);
    }
    if (!infill) continue;
    const footprint = halfPolygon(points,center.y,side);
    for (let i=0; i<footprint.length; i++) {
      const a=footprint[i], b=footprint[(i+1)%footprint.length];
      if (Math.max(Math.abs(a.y-center.y),Math.abs(b.y-center.y))<.001) continue;
      wall.push(a.x,eaves-.02,a.y, b.x,eaves-.02,b.y, b.x,surface(b.y)-.08,b.y,
                a.x,eaves-.02,a.y, b.x,surface(b.y)-.08,b.y, a.x,surface(a.y)-.08,a.y);
    }
  }
  const roof = new T.BufferGeometry();
  roof.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  roof.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  roof.computeVertexNormals();
  const mesh=part(group,roof,roofTiles());

  const fascia = new T.BufferGeometry();
  fascia.setAttribute('position',new T.Float32BufferAttribute(edges,3));
  fascia.computeVertexNormals();
  part(group,fascia,edge);
  if (wall.length) {
    const gable = new T.BufferGeometry();
    gable.setAttribute('position',new T.Float32BufferAttribute(wall,3));
    gable.computeVertexNormals();
    part(group,gable,brick);
  }

  const ridgeXs=halfPolygon(roofOutline,center.y,1).filter(p=>Math.abs(p.y-center.y)<.001).map(p=>p.x);
  if (ridgeXs.length===2) {
    box(group,(ridgeXs[0]+ridgeXs[1])/2,eaves+rise,center.y,Math.abs(ridgeXs[1]-ridgeXs[0]),.23,.29,edge);
  }
  return mesh;
}

const unitBox = new T.BoxGeometry(1,1,1);
const unitColumn = new T.CylinderGeometry(.5,.5,1,9);

function addFacades(group, points, floor, eave, levels, passage) {
  const details = new Map();
  function queue(x,y,z,sx,sy,sz,angle,material,geometry=unitBox) {
    const key=material.id+':'+geometry.id;
    if (!details.has(key)) details.set(key,{material,geometry,parts:[]});
    details.get(key).parts.push([x,y,z,sx,sy,sz,angle]);
  }
  const winding=Math.sign(T.ShapeUtils.area(points));
  const spanHeight=(eave-floor)/levels;
  for (let i=0;i<points.length;i++) {
    const a=points[i], b=points[(i+1)%points.length];
    const dx=b.x-a.x, dz=b.y-a.y;
    const length=Math.hypot(dx,dz);
    if (length<1.6 || (!passage && Math.abs(dx)<length*.84)) continue;
    const angle=-Math.atan2(dz,dx);
    const nx=winding*dz/length, nz=-winding*dx/length;
    const bays=Math.max(1,Math.round(length/(passage?3.3:3.85)));
    for (let bay=0; bay<bays; bay++) {
      const t=(bay+.5)/bays;
      const x=a.x+t*dx, z=a.y+t*dz;
      const bayWidth=length/bays;
      if (!passage) {
        for (let level=0; level<levels; level++) {
          const y=floor+spanHeight*(level+.58);
          const windowWidth=bayWidth*.63;
          queue(x+nx*.055,y,z+nz*.055,windowWidth,spanHeight*.53,.20,angle,timber);
          queue(x+nx*.16,y,z+nz*.16,windowWidth-.25,spanHeight*.53-.23,.04,angle,glass);
          queue(x+nx*.2,y,z+nz*.2,.095,spanHeight*.53,.06,angle,timber);
          if (levels>1) {
            queue(x+nx*.06,floor+spanHeight*level+.27,z+nz*.06,bayWidth+.04,.48,.25,angle,concrete);
          }
        }
        queue(x+nx*.045,eave-.17,z+nz*.045,bayWidth+.04,.32,.23,angle,concrete);
      }
      const tPost=(bay+.075)/bays;
      const inset=passage?-.2:.06;
      const h=eave-floor-.16;
      queue(a.x+tPost*dx+nx*inset,floor+h/2,a.y+tPost*dz+nz*inset,.37,h,.37,angle,concrete,
        passage?unitColumn:unitBox);
    }
    if (passage) queue((a.x+b.x)/2,eave-.22,(a.y+b.y)/2,length,.38,.34,angle,timber);
  }
  const marker=new T.Object3D();
  for (const {material,geometry,parts} of details.values()) {
    const mesh=new T.InstancedMesh(geometry,material,parts.length);
    mesh.castShadow = mesh.receiveShadow = true;
    for (const [index,[x,y,z,sx,sy,sz,angle]] of parts.entries()) {
      marker.position.set(x,y,z);
      marker.scale.set(sx,sy,sz);
      marker.rotation.y=angle;
      marker.updateMatrix();
      mesh.setMatrixAt(index,marker.matrix);
    }
    group.add(mesh);
  }
}

export function courtyardWing(item,height,courtyard) {
  const passage=item.osm===courtyard.passage;
  const group=new T.Group();
  group.position.set(item.x,height(item.x,item.z),item.z);
  const footprint=item.points.map(([x,z])=>new T.Vector2(x-item.x,z-item.z));
  const longest=footprint.reduce((best,p,i)=>{
    const direction=footprint[(i+1)%footprint.length].clone().sub(p);
    return direction.lengthSq()>best.lengthSq()?direction:best;
  },new T.Vector2());
  if (longest.x<0) longest.multiplyScalar(-1);
  const axis=Math.atan2(longest.y,longest.x);
  group.rotation.y=-axis;
  const points=footprint.map(p=>p.rotateAround(new T.Vector2(),-axis));
  const floor=.26;
  const lower=Math.min(-.35,...item.points.map(([x,z])=>height(x,z)-group.position.y-.22));
  const levels=passage?1:(item.levels || courtyard.levels || 1);
  const eave=floor+(passage?2.75:levels===1?3.8:2.85*levels);
  const depth=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y));
  const rise=Math.min(2.6,depth*.195);
  const foundation=slab(group,points,lower,floor,stone);
  const walls=passage?null:slab(group,points,floor,eave-.02,brick);
  const roof=addRoof(group,points,eave,rise,passage?.56:.74,!passage);
  addFacades(group,points,floor,eave,levels,passage);
  let top=eave+rise;
  if (passage && courtyard.gate) {
    // The main Arts entrance rises above the connecting covered walks.
    const gate=[[-3.85,-.95],[3.85,-.95],[3.85,4.1],[-3.85,4.1]].map(p=>new T.Vector2(...p));
    const gateEave=eave+.98;
    for (const x of [-3.55,-1.2,1.2,3.55]) {
      box(group,x,gateEave/2,3.84,.42,gateEave,.45,concrete);
    }
    for (const x of [-3.55,3.55]) box(group,x,gateEave/2,1.55,.36,gateEave,4.3,concrete);
    box(group,0,gateEave-.25,3.84,7.55,.55,.46,concrete);
    box(group,0,gateEave-.24,4.082,1.25,.19,.025,timber);
    addRoof(group,gate,gateEave,1.05,.59,false);
    top=Math.max(top,gateEave+1.05);
  }
  const pickables = [roof,walls,foundation].filter(Boolean);
  for (const mesh of pickables) mesh.userData.osm=courtyard.id;
  return {group,top:group.position.y+top,pickables};
}

export function alumniBellTower(point,height) {
  const group = new T.Group();
  group.position.set(point.x,height(point.x,point.z),point.z);
  group.rotation.y=Math.PI/2-.284;
  const paleConcrete=new T.MeshLambertMaterial({color:'#c8c5b3'});
  const bronze = new T.MeshLambertMaterial({color:'#b18a48',side:T.DoubleSide});
  const iron = new T.MeshLambertMaterial({color:'#554d3e'});
  const platform=box(group,0,-.24,0,8.1,.48,3.6,stone);
  box(group,0,.05,0,8.01,.13,3.54,concrete);
  for (const x of [-1.02,1.02]) {
    box(group,x,5.14,0,.41,10.12,.6,paleConcrete);
  }
  const beams=[2.74,3.13,3.61,4.13,4.69,5.33,6.06,6.89,7.83,9.13];
  for (const y of beams) box(group,0,y,0,1.68,.172,.57,paleConcrete);
  const profile=[[.09,.96],[.24,.88],[.36,.7],[.42,.43],[.58,.14],[.62,.08],[.52,.08]].map(p=>new T.Vector2(...p));
  for (const [y,x,size] of [[8.18,0,.62],[5.46,.12,.34],[4.82,.05,.27]]) {
    const bell=part(group,new T.LatheGeometry(profile,24),bronze);
    bell.position.set(x,y,0);
    bell.scale.setScalar(size);
    const hanger=box(group,x,y+size*1.1,0,.041,size*.4,.042,iron);
    hanger.castShadow=false;
    const clapper=part(group,new T.SphereGeometry(size*.09,8,5),iron);
    clapper.position.set(x,y-size*.015,0);
  }
  const loudspeaker=part(group,new T.CylinderGeometry(.095,.038,.16,12),iron);
  loudspeaker.rotation.x=Math.PI/2;
  loudspeaker.position.set(1.02,10.25,.18);
  const pickables=group.children.filter(mesh=>mesh!==platform);
  for (const mesh of pickables) mesh.userData.osm=alumniBellId;
  return {group,pickables,top:group.position.y+10.35};
}
