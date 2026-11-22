import * as T from 'three';
import {addGableRoof,courtyardWing} from './wenli-heritage.js';

const languageId = 'w368066316';
const administrationId = 'w368304658';
const presidentId = 'w368304652';
const religionId = 'w227103239';
const oldLibraryEntranceId = 'w368283837';

const material = (color, options={}) => new T.MeshLambertMaterial({color,...options});
const concrete = material('#9e9c8e');
const paleConcrete = material('#d2d0bd');
const white = material('#e7e2d1');
const grayRoof = material('#686a62');
const grayParapet = material('#888980');
const greenRoof = material('#709386');
const redRoof = material('#a34e43');
const brick = material('#9a5e4a');
const darkWood = material('#574331');
const steel = material('#494d46');
const glazing = material('#546363');
const recess = material('#282d2a');
const shadowedGlazing = material('#33443e');
const boxGeometry = new T.BoxGeometry(1,1,1);

function measure(item,height) {
  const group = new T.Group();
  const grade = height(item.x,item.z);
  group.position.set(item.x,grade,item.z);
  const boundary = item.points.map(([x,z])=>new T.Vector2(x-item.x,z-item.z));
  const axis = boundary.reduce((longest,p,i)=>{
    const edge = boundary[(i+1)%boundary.length].clone().sub(p);
    return edge.lengthSq()>longest.lengthSq()?edge:longest;
  },new T.Vector2());
  if (axis.x<0) axis.negate();
  const rotation = Math.atan2(axis.y,axis.x);
  group.rotation.y = -rotation;
  const center = new T.Vector2();
  const points = boundary.map(p=>p.rotateAround(center,-rotation));
  const west = Math.min(...points.map(p=>p.x));
  const east = Math.max(...points.map(p=>p.x));
  const front = Math.min(...points.map(p=>p.y));
  const back = Math.max(...points.map(p=>p.y));
  const ground = Math.min(-.5,...item.points.map(([x,z])=>height(x,z)-grade-.38));
  return {group,points,west,east,front,back,ground};
}

function mesh(group,geometry,finish) {
  const object = new T.Mesh(geometry,finish);
  object.castShadow = object.receiveShadow = true;
  group.add(object);
  return object;
}

function box(group,finish,x,y,z,width,height,depth) {
  const object = mesh(group,boxGeometry,finish);
  object.position.set(x,y,z);
  object.scale.set(width,height,depth);
  return object;
}

function volume(group,points,bottom,top,finish) {
  const outline = new T.Shape(points.map(p=>new T.Vector2(p.x,-p.y)));
  const geometry = new T.ExtrudeGeometry(outline,{depth:top-bottom,bevelEnabled:false});
  geometry.rotateX(-Math.PI/2);
  const object = mesh(group,geometry,finish);
  object.position.y = bottom;
  return object;
}

function panel(group,corners,finish,uvs=[0,0,1,0,1,1,0,1]) {
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(corners.flat(),3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  geometry.setIndex([0,1,2,0,2,3]);
  geometry.computeVertexNormals();
  return mesh(group,geometry,finish);
}

function finish(group,id,top,pickables) {
  for (const object of pickables) object.userData.osm = id;
  return {group,top:group.position.y+top,pickables};
}

function facadeDetails(group) {
  const details = new Map();
  const marker = new T.Object3D();
  return {
    add(finish,x,y,z,width,height,depth,angle=0) {
      if (!details.has(finish)) details.set(finish,[]);
      marker.position.set(x,y,z);
      marker.scale.set(width,height,depth);
      marker.rotation.y = angle;
      marker.updateMatrix();
      details.get(finish).push(marker.matrix.clone());
    },
    render() {
      for (const [finish,transforms] of details) {
        const batch = new T.InstancedMesh(boxGeometry,finish,transforms.length);
        batch.castShadow = batch.receiveShadow = true;
        transforms.forEach((transform,index)=>batch.setMatrixAt(index,transform));
        group.add(batch);
      }
    },
  };
}

function arch(group,x,y,z,width,height,radius,depth,face=1) {
  const middle = y+radius+.045;
  const outline = new T.Shape([
    new T.Vector2(x-width/2,y),new T.Vector2(x+width/2,y),
    new T.Vector2(x+width/2,y+height),new T.Vector2(x-width/2,y+height),
  ]);
  const opening = new T.Path();
  opening.absarc(x,middle,radius,0,Math.PI*2,true);
  outline.holes.push(opening);
  const wall = mesh(group,new T.ExtrudeGeometry(outline,{depth,bevelEnabled:false,curveSegments:24}),brick);
  wall.position.z = z-depth/2;
  const trim = mesh(group,new T.RingGeometry(radius-.06,radius+.15,48),material('#e5e1ce',{side:T.DoubleSide}));
  trim.position.set(x,middle,z+face*(depth/2+.015));
  return wall;
}

const signMaterials = new Map();
function sign(group,x,y,z,width,height,caption,palette,face=1) {
  if (!signMaterials.has(caption)) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = palette[0];
    ctx.fillRect(0,0,256,64);
    ctx.fillStyle = palette[1];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 35px serif';
    ctx.fillText(caption,128,32,232);
    const map = new T.CanvasTexture(canvas);
    map.colorSpace = T.SRGBColorSpace;
    signMaterials.set(caption,new T.MeshBasicMaterial({map}));
  }
  const plaque = mesh(group,new T.PlaneGeometry(width,height),signMaterials.get(caption));
  plaque.castShadow = false;
  plaque.position.set(x,y,z);
  plaque.rotation.y = face===1?0:Math.PI;
}

function languageGate(group,x,z) {
  const postX = 2.37;
  const postHeight = 6.9;
  const darkOpening = box(group,recess,x,2.24,z-1.7,4.6,4.25,.16);
  for (const side of [-1,1]) box(group,concrete,x+postX*side,postHeight/2,z-.5,.43,postHeight,2.2);
  arch(group,x,.24,z,4.46,3.65,1.37,.29);
  box(group,white,x,3.72,z,4.87,.42,1.92);
  const canopy = box(group,redRoof,x,4.1,z+.19,5.08,.24,1.53);
  canopy.rotation.x = .39;
  box(group,concrete,x,5.77,z-.56,5.1,.36,2.23);
  box(group,white,x,4.79,z+.11,4.34,.68,.21);
  sign(group,x,4.84,z+.223,2.35,.48,'館 文 語',['#e6e6dd','#31516b']);
  box(group,paleConcrete,x,.15,z+.63,5.2,.29,2.14);
  return [darkOpening,canopy];
}

function languageBuilding(item,height) {
  const {group,points,west,east,back,ground} = measure(item,height);
  const courtGrade = height(-605.4,-143.2);
  const roofHeight = Math.max(courtGrade-group.position.y+9.15,7.25);
  const floor = roofHeight-9.15;
  const structure = volume(group,points,ground,roofHeight,white);
  const cap = volume(group,points,roofHeight-.26,roofHeight+.16,grayRoof);
  const details = facadeDetails(group);
  const winding = Math.sign(T.ShapeUtils.area(points));
  for (let i=0;i<points.length;i++) {
    const a = points[i], b = points[(i+1)%points.length];
    const dx = b.x-a.x, dz = b.y-a.y;
    const length = Math.hypot(dx,dz);
    if (length<2) continue;
    const nx = winding*dz/length, nz = -winding*dx/length;
    const middleX = (a.x+b.x)/2, middleZ = (a.y+b.y)/2;
    const angle = -Math.atan2(dz,dx);
    details.add(grayParapet,middleX+nx*.04,roofHeight+.27,middleZ+nz*.04,length+.12,.57,.28,angle);
    if (length<6) continue;
    const bays = Math.ceil(length/3.25);
    const bayWidth = length/bays;
    for (let level=0;level<3;level++) {
      const sill = floor+.18+level*3;
      details.add(concrete,middleX+nx*.05,sill,middleZ+nz*.05,length,.32,.27,angle);
      details.add(steel,middleX+nx*.12,sill+1.89,middleZ+nz*.12,length-.24,1.08,.14,angle);
      for (let bay=0;bay<bays;bay++) {
        const t = (bay+.5)/bays;
        const x = a.x+t*dx, z = a.y+t*dz;
        details.add(glazing,x+nx*.2,sill+1.89,z+nz*.2,bayWidth-.28,.86,.06,angle);
        details.add(steel,x+nx*.23,sill+1.89,z+nz*.23,.1,1.04,.07,angle);
      }
    }
  }
  if (item.osm==='w368304687') {
    box(group,paleConcrete,west+2.2,roofHeight+.38,back-2.1,3.3,.76,2.8);
    box(group,greenRoof,west+2.2,roofHeight+.83,back-2.1,3.6,.18,3.1);
  }
  const gate = item.osm==='w368304687'?languageGate(group,east-4.3,back+.48):[];
  details.render();
  return finish(group,languageId,roofHeight+.94,[structure,cap,...gate]);
}

function presidentOffice(item,height) {
  const {group,points,west,east,front,back,ground} = measure(item,height);
  const width = east-west, depth = back-front;
  const center = (west+east)/2;
  const galleryZ = back-.22;
  const foundation = volume(group,points,ground,.21,concrete);
  const lower = box(group,darkWood,center,1.67,(front+back)/2,width*.57,2.87,depth-1.4);
  const upper = box(group,brick,center,4.62,(front+back)/2-.45,width-.62,2.84,depth-2.25);
  const balcony = volume(group,points,3.08,3.43,paleConcrete);
  const roof = addGableRoof(group,points,6.19,2.26,1.08,paleConcrete);
  const details = facadeDetails(group);
  const columnX = Array.from({length:6},(_,i)=>west+width*(.05+.18*i));
  for (const x of columnX) {
    for (const z of [front+.2,galleryZ]) {
      details.add(paleConcrete,x,1.62,z,.32,2.82,.38);
      details.add(paleConcrete,x,4.83,z,.29,2.79,.34);
    }
  }
  for (let bay=0;bay<5;bay++) {
    const x = (columnX[bay]+columnX[bay+1])/2;
    const span = (columnX[bay+1]-columnX[bay])*.90;
    details.add(darkWood,x,4.78,back-1.38,span,2.16,.17);
    for (let pane=0;pane<5;pane++) {
      const px = x+span*(pane-2)/5;
      details.add(glazing,px,4.47,back-1.28,span/5-.075,1.15,.07);
      details.add(steel,px,5.57,back-1.27,span/5-.068,.31,.07);
    }
    details.add(darkWood,x,4.54,back-1.2,span,.061,.09);
    if (bay>0 && bay<4) {
      details.add(glazing,x,1.74,back-.62,span-.18,1.38,.08);
      for (const bar of [-.7,0,.7]) details.add(darkWood,x+span*bar/2,1.74,back-.56,.075,1.41,.09);
      details.add(darkWood,x,1.76,back-.56,span,.08,.11);
    }
  }
  details.add(darkWood,center,3.97,back+.025,width-.55,.095,.08);
  details.add(darkWood,center,3.64,back+.025,width-.55,.095,.08);
  for (let i=0;i<=10;i++) details.add(paleConcrete,west+.26+(width-.52)*i/10,3.8,back-.04,.16,.79,.17);
  details.add(steel,center,3.63,front+.06,width-.46,.08,.10);
  details.add(darkWood,center,5.69,back-1.17,3.65,.62,.19);
  details.render();
  sign(group,center,5.69,back-1.068,3.45,.56,'學 大 海 東',['#906b43','#2d2318']);
  return finish(group,presidentId,8.55,[foundation,lower,upper,balcony,roof]);
}

let religiousTile;
function diamondGlaze() {
  if (religiousTile) return religiousTile;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d3a052';
  ctx.fillRect(0,0,128,128);
  ctx.lineWidth = 2;
  for (let i=-128;i<=128;i+=16) {
    ctx.strokeStyle = '#896a43';
    ctx.beginPath();
    ctx.moveTo(i,0);
    ctx.lineTo(i+128,128);
    ctx.stroke();
    ctx.strokeStyle = '#ad7f4e';
    ctx.beginPath();
    ctx.moveTo(i+128,0);
    ctx.lineTo(i,128);
    ctx.stroke();
  }
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping;
  religiousTile = material('#ffffff',{map,side:T.DoubleSide});
  return religiousTile;
}

const cementPanel = material('#b0afa3',{side:T.DoubleSide});
function christianCenter(item,height) {
  const {group,points,west,east,front,back,ground} = measure(item,height);
  const center = (west+east)/2;
  const slope = .54;
  const frontZ = y=>front+.76+y*slope;
  const floor = .28;
  const high = 8.25;
  const centerHalf = 2.35;
  const base = volume(group,points,ground,floor,concrete);
  const core = box(group,paleConcrete,center,high/2,(frontZ(high)+back)/2,
    east-west-.8,high-.1,back-frontZ(high));
  const entranceZ = frontZ(3);
  // The pair of concrete inclines uses the same diamond-pattern yellow glaze as the chapel.
  for (const [a,b] of [[west+.38,center-centerHalf],[center+centerHalf,east-.35]]) {
    const width = b-a, middle = (a+b)/2;
    const face = (x1,x2,y1,y2,finish,offset=0)=>panel(group,[
      [x1,y1,frontZ(y1)+offset],[x2,y1,frontZ(y1)+offset],
      [x2,y2,frontZ(y2)+offset],[x1,y2,frontZ(y2)+offset],
    ],finish,[x1/2,y1/2,x2/2,y1/2,x2/2,y2/2,x1/2,y2/2]);
    for (const [lo,hi] of [[floor,.78],[2.36,3.82],[5.13,6.22],[6.46,6.94],[7.18,7.64],[7.87,8.06]]) {
      face(a,b,lo,hi,diamondGlaze());
    }
    for (const [lo,hi] of [[.78,.99],[2.11,2.36],[3.82,4.04],[4.9,5.13],[6.22,6.46],[6.94,7.18],[7.64,7.87],[8.06,high]]) {
      face(a,b,lo,hi,cementPanel,-.031);
    }
    for (const [lo,hi] of [[.99,2.11],[4.04,4.9]]) {
      const y = (lo+hi)/2;
      box(group,shadowedGlazing,middle,y,frontZ(hi)+.56,width-.19,hi-lo,.1);
      for (const x of [a+width*.26,a+width*.72]) box(group,steel,x,y,frontZ(hi)+.488,.105,hi-lo,.12);
      box(group,steel,middle,lo+.25,frontZ(lo)-.28,width-.32,.088,.082);
      for (const x of [a+.35,middle,b-.35]) box(group,steel,x,lo-.08,frontZ(lo)-.28,.084,.66,.08);
    }
    for (const x of [a,b]) face(x-.17,x+.17,floor,high,cementPanel,-.085);
    for (const x of [a,b]) panel(group,[
      [x,floor,frontZ(floor)],[x,floor,frontZ(high)+.1],
      [x,high,frontZ(high)+.1],[x,high,frontZ(high)],
    ],cementPanel);
    box(group,concrete,middle,high+.13,frontZ(high)+.06,width+.39,.46,.42);
  }
  const moonGate = arch(group,center,floor,entranceZ,centerHalf*2,3.39,1.27,.26,-1);
  const innerGlazing = box(group,glazing,center,4.7,entranceZ+.24,centerHalf*2,1.9,.3);
  for (const x of [center-1.16,center,center+1.16]) box(group,steel,x,4.7,entranceZ+.053,.082,1.88,.13);
  box(group,paleConcrete,center,6.05,entranceZ+.3,centerHalf*2,1.01,.5);
  box(group,concrete,center,3.63,entranceZ,centerHalf*2,.51,.43);
  sign(group,center,3.66,entranceZ-.22,3.33,.39,'基督教活動中心',['#77796e','#e0b86b'],-1);
  box(group,recess,center,1.54,entranceZ+.47,2.43,2.5,.08);
  const siding = group.children.filter(object=>object.material===religiousTile||object.material===cementPanel);
  return finish(group,religionId,high+.45,[base,core,moonGate,innerGlazing,...siding]);
}

const adminWing = (item,height)=>courtyardWing(item,height,{id:administrationId,levels:1});
const oldLibraryEntrance = (item,height)=>courtyardWing(item,height,{id:oldLibraryEntranceId,levels:1});

export const westAdminLandmarks = new Map([
  ...['w129849166','w129849225','w368304687','w368304689'].map(id=>[id,languageBuilding]),
  [presidentId,presidentOffice],
  ...['w367194690','w368304655','w368304666'].map(id=>[id,adminWing]),
  [religionId,christianCenter],
  ...['w368283836','w368283837'].map(id=>[id,oldLibraryEntrance]),
]);
