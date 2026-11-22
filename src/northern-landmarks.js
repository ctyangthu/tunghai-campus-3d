import * as T from 'three';

const campusAxis = .285;
const materials = new Map();

function paint(color) {
  if (!materials.has(color)) {
    materials.set(color, new T.MeshLambertMaterial({color, side:T.DoubleSide}));
  }
  return materials.get(color);
}

const pale = paint('#d6d3c3');
const concrete = paint('#a5a59b');
const mortar = paint('#bba990');
const brick = paint('#a76348');
const burgundy = paint('#804a3b');
const dark = paint('#383a36');
const glass = paint('#546064');
const metal = paint('#645c51');

const unitBox = new T.BoxGeometry();
const unitColumn = new T.CylinderGeometry(.5,.5,1,12);

function modelFor(item, terrainHeight) {
  const group = new T.Group();
  const grade = terrainHeight(item.x,item.z);
  group.position.set(item.x,grade,item.z);
  group.rotation.y = -campusAxis;
  const low = Math.min(-1.8,Math.min(...item.points.map(([x,z])=>terrainHeight(x,z)))-grade-.55);
  const batches = new Map();
  const box = (x,y,z,width,height,depth,material,geometry=unitBox) => {
    const key = [material.id,geometry.id].join(':');
    if (!batches.has(key)) batches.set(key,{material,geometry,transforms:[]});
    batches.get(key).transforms.push([x,y,z,width,height,depth]);
  };
  const block = (x0,x1,z0,z1,bottom,top,material) =>
    box((x0+x1)/2,(bottom+top)/2,(z0+z1)/2,x1-x0,top-bottom,z1-z0,material);

  function add(geometry, material) {
    const part = new T.Mesh(geometry, material);
    part.castShadow = part.receiveShadow = true;
    part.userData.osm = item.osm;
    group.add(part);
    return part;
  }

  function surface(vertices, indices, material) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(vertices.flat(),3));
    geometry.setAttribute('uv',new T.Float32BufferAttribute(vertices.flatMap(([x,,z])=>[x/2,z/2]),2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return add(geometry, material);
  }

  function finish(high) {
    const transform = new T.Object3D();
    for (const {material,geometry,transforms} of batches.values()) {
      const parts = new T.InstancedMesh(geometry,material,transforms.length);
      parts.castShadow = parts.receiveShadow = true;
      parts.userData.osm = item.osm;
      transforms.forEach(([x,y,z,sx,sy,sz],index)=>{
        transform.position.set(x,y,z);
        transform.scale.set(sx,sy,sz);
        transform.updateMatrix();
        parts.setMatrixAt(index,transform.matrix);
      });
      group.add(parts);
    }
    return {group,top:grade+high,pickables:group.children};
  }

  return {low,box,block,add,surface,finish};
}

function corners([x0,x1,z0,z1],y) {
  return [[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1]];
}

function roofRing(model, outer, inner, eave, ridge, material) {
  const vertices = [...corners(outer,eave),...corners(inner,ridge)];
  const indices = Array.from({length:4},(_,i)=>{
    const j = (i+1)%4;
    return [i,j,j+4,i,j+4,i+4];
  }).flat();
  return model.surface(vertices,indices,material);
}

function tiledRoof(color) {
  const key = 'tile:'+color;
  if (materials.has(key)) return materials.get(key);
  const material = new T.MeshLambertMaterial({color,side:T.DoubleSide});
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,64,64);
    for(let n=0;n<64;n+=8){
      ctx.fillStyle = '#00000022';
      ctx.fillRect(n,0,1,64);
      ctx.fillRect(0,n,64,1);
      ctx.fillStyle = '#ffffff45';
      ctx.fillRect(n+1,0,1,64);
      ctx.fillRect(0,n+1,64,1);
    }
    const texture = new T.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = 8;
    material.map = texture;
  }
  materials.set(key,material);
  return material;
}

function gabledRoof(model, bounds, eastWest, eave, rise, roof) {
  const [x0,x1,z0,z1] = bounds;
  const end = eastWest ? (x1-x0)/2 : (z1-z0)/2;
  const halfSpan = eastWest ? (z1-z0)/2 : (x1-x0)/2;
  const cx = (x1+x0)/2;
  const cz = (z1+z0)/2;
  const point = (u,y,v)=>eastWest?[cx+u,y,cz+v]:[cx+v,y,cz+u];
  const vertices = [
    point(-end-.64,eave,-halfSpan-.66),point(end+.64,eave,-halfSpan-.66),
    point(end+.64,eave+rise,0),point(-end-.64,eave+rise,0),
    point(-end-.64,eave,halfSpan+.66),point(end+.64,eave,halfSpan+.66),
  ];
  model.surface(vertices,[0,1,2,0,2,3,3,2,5,3,5,4],roof);
  for (const u of [-end,end]) {
    model.surface([point(u,eave-.05,-halfSpan),point(u,eave+rise-.14,0),
      point(u,eave-.05,halfSpan)],[0,1,2],pale);
    const [x,y,z] = point(u,eave+rise*.4,0);
    model.box(x,y,z,.23,rise*.78,.23,concrete);
  }
  model.box(cx,eave+rise,cz,eastWest?2*end+1.4:.22,.23,eastWest?.22:2*end+1.4,metal);
}

function socialScience(item,terrainHeight) {
  const model = modelFor(item,terrainHeight);
  const charcoal = tiledRoof('#5b5d5c');

  function wing(bounds,eastWest,bottom,floors,pitch) {
    const [x0,x1,z0,z1]=bounds;
    const floorHeight=3.1;
    const eave=bottom+floors*floorHeight;
    model.block(x0,x1,z0,z1,model.low,bottom,concrete);
    model.block(x0,x1,z0,z1,bottom,eave,pale);
    const sideAxis = eastWest ? [x0,x1,z0,z1] : [z0,z1,x0,x1];
    const [u0,u1,v0,v1]=sideAxis;
    const facade = (u,y,v,width,height,depth,material)=>eastWest
      ?model.box(u,y,v,width,height,depth,material)
      :model.box(v,y,u,depth,height,width,material);
    const bays = Math.max(2,Math.round((u1-u0)/5.0));
    const span=(u1-u0)/bays;
    for (const [v,direction] of [[v0,-1],[v1,1]]) {
      for (let floor=0;floor<floors;floor++) {
        const y=bottom+(floor+.56)*floorHeight;
        for (let bay=0;bay<bays;bay++) {
          const u=u0+(bay+.5)*span;
          const balcony=floors>=4 && (bay<2 || direction===1);
          facade(u,y,v+direction*.07,span-.48,1.84,.20,balcony?dark:glass);
          facade(u,y-.92,v+direction*.26,span-.56,.21,.50,balcony?concrete:brick);
          facade(u,y,v+direction*.20,.12,1.80,.14,pale);
          if (balcony) {
            facade(u,y-.43,v+direction*.28,span-.27,.085,.08,metal);
            facade(u,y-.70,v+direction*.28,span-.27,.085,.08,metal);
          } else {
            facade(u,y+.33,v+direction*.20,span-.48,.086,.14,pale);
          }
        }
        facade((u0+u1)/2,bottom+(floor+1)*floorHeight-.19,v,u1-u0,.43,.51,concrete);
        for (const [u,direction] of [[u0,-1],[u1,1]]) {
          facade(u+direction*.07,y,(v0+v1)/2,.18,2.35,v1-v0-.78,brick);
        }
      }
    }
    gabledRoof(model,bounds,eastWest,eave,pitch,charcoal);
    return eave+pitch;
  }

  // The long outside wings sit lower than the paired cross wings and central spine.
  wing([1.0,16.4,-72.2,-19.8],false,-.6,3,2.0);
  wing([.8,16.4,27.7,68.6],false,-.9,3,2.0);
  const highest = wing([-31.0,15.2,-21.0,-5.25],true,-.8,5,2.92);
  wing([-30.9,15.0,12.55,28.1],true,-.8,5,2.92);
  wing([-10.1,5.1,-5.6,12.8],false,-.78,5,2.50);
  model.block(5.0,10.8,-5.1,12.6,-.8,-.43,concrete);
  for (let i=0;i<4;i++) {
    model.block(10.72+i*.39,11.11+i*.39,-5.05,12.6,-1.34,-.48-i*.14,concrete);
  }
  return model.finish(highest);
}

function mainLibrary(item,terrainHeight) {
  const model = modelFor(item,terrainHeight);
  const terraRoof = tiledRoof('#be8254');
  const gutter = paint('#78aaa0');
  const cornice = paint('#d3d3c4');
  const outer=[-36.8,33.3,-27.6,27.6];
  const court=[-10.9,13.2,-10.3,10.3];
  const eave=13.3;
  const ridge=16.65;
  const frontPorch=[32.7,42.0,-11.05,11.35];

  function rectangle(bounds) {
    return corners(bounds,0).map(([x,,z])=>new T.Vector2(x,-z));
  }
  const ring = new T.Shape(rectangle(outer));
  ring.holes.push(new T.Path(rectangle(court)));
  const shell = new T.ExtrudeGeometry(ring,{depth:eave-model.low,bevelEnabled:false});
  shell.rotateX(-Math.PI/2);
  shell.translate(0,model.low,0);
  model.add(shell,[concrete,brick]);

  roofRing(model,[-37.85,34.25,-28.7,28.7],[-27.0,23.9,-19.7,19.7],eave,ridge,terraRoof);
  roofRing(model,[-27.0,23.9,-19.7,19.7],[-22.8,19.35,-16.1,16.1],ridge,ridge-.2,gutter);
  roofRing(model,[-22.8,19.35,-16.1,16.1],court,ridge-.2,eave+.42,terraRoof);
  roofRing(model,[-37.88,34.28,-28.73,28.73],[-37.88,34.28,-28.73,28.73],eave-.42,eave,cornice);
  roofRing(model,[-27.06,23.94,-19.74,19.74],[-27.06,23.94,-19.74,19.74],ridge-.25,ridge+.18,cornice);
  roofRing(model,court,court,eave+.02,eave+.42,cornice);

  function libraryFacade(u0,u1,v,alongX,direction,bays,front) {
    const width=(u1-u0)/bays;
    const face = (u,y,w,h,d,out,material)=>alongX
      ?model.box(u,y,v+direction*out,w,h,d,material)
      :model.box(v+direction*out,y,u,d,h,w,material);
    for(let bay=0;bay<bays;bay++){
      const u=u0+(bay+.5)*width;
      face(u,2.1,width-.39,1.84,.20,.1,glass);
      face(u,11.83,width-.4,1.24,.20,.11,glass);
      face(u,7.38,width-.51,6.58,.20,.13,dark);
      for(let col=1;col<8;col++){
        face(u+width*(col/8-.5),7.38,.16,6.60,.37,.25,pale);
      }
      for(let row=0;row<11;row++){
        face(u,4.08+.66*row,width-.49,.17,.37,.25,pale);
      }
      face(u,4.0,width,.32,.55,.24,pale);
      face(u,10.82,width,.37,.57,.24,pale);
      face(u-width/2,6.95,.54,12.4,.61,.29,pale);
    }
    face(u1,6.95,.54,12.4,.64,.29,pale);
    face((u0+u1)/2,1.0,u1-u0,.37,.55,.26,cornice);
    if (front) face((u0+u1)/2,3.43,u1-u0,.28,.5,.24,mortar);
  }

  libraryFacade(outer[0],outer[1],outer[2],true,-1,13,false);
  libraryFacade(outer[0],outer[1],outer[3],true,1,13,false);
  libraryFacade(outer[2],outer[3],outer[0],false,-1,10,false);
  libraryFacade(outer[2],frontPorch[2],outer[1],false,1,4,true);
  libraryFacade(frontPorch[3],outer[3],outer[1],false,1,4,true);

  function courtWindows(u0,u1,v,alongX,direction,bays) {
    const width=(u1-u0)/bays;
    for(let floor=0;floor<4;floor++){
      for(let bay=0;bay<bays;bay++){
        const u=u0+(bay+.5)*width,y=1.97+floor*3.05;
        if (alongX) model.box(u,y,v+direction*.07,width-.56,1.52,.16,glass);
        else model.box(v+direction*.07,y,u,.16,1.52,width-.56,glass);
      }
    }
  }
  courtWindows(court[0],court[1],court[2],true,1,5);
  courtWindows(court[0],court[1],court[3],true,-1,5);
  courtWindows(court[2],court[3],court[0],false,1,5);
  courtWindows(court[2],court[3],court[1],false,-1,5);

  const [px0,px1,pz0,pz1]=frontPorch;
  const porchRoof=[px0,px1+.55,pz0-.57,pz1+.57];
  model.surface([[px0,13.62,porchRoof[2]],[porchRoof[1],10.8,porchRoof[2]],
    [porchRoof[1],10.8,porchRoof[3]],[px0,13.62,porchRoof[3]]],[0,1,2,0,2,3],terraRoof);
  model.box(px1+.52,10.58,(pz0+pz1)/2,.43,.47,pz1-pz0+1.10,cornice);
  model.block(px0,px1+.11,pz0-.7,pz1+.7,model.low,-.02,burgundy);
  model.box(px0+.74,2.0,0,.20,4.05,20.8,dark);
  model.box(px1-.12,5.18,0,.63,.64,22.49,concrete);
  model.box(px1-.12,9.5,0,.73,1.0,22.49,pale);
  for (const z of [-10.75,-3.55,3.58,10.84]) {
    model.box(px1-.11,5.16,z,.65,10.45,.64,pale);
  }
  for(let bay=0;bay<3;bay++){
    const width=(pz1-pz0)/3;
    const z=pz0+(bay+.5)*width;
    model.box(px1-.39,7.36,z,.19,3.1,width-.58,dark);
    for(let col=1;col<8;col++){
      model.box(px1-.25,7.36,z+width*(col/8-.5),.31,3.12,.17,pale);
    }
    for(let row=0;row<6;row++){
      model.box(px1-.25,6.04+.52*row,z,.31,.18,width-.54,pale);
    }
  }
  // The door level of the projecting entry stays open beneath the portico.
  model.box(px0+.90,4.36,0,.31,.51,20.3,pale);
  for(let i=0;i<8;i++){
    model.block(px1+i*.57,px1+(i+1)*.57,pz0-.54,pz1+.54,model.low,-.06-i*.17,concrete);
  }
  return model.finish(ridge+.18);
}

function auditorium(item,terrainHeight) {
  const model = modelFor(item,terrainHeight);
  const wall = paint('#ceba98');
  const ochre = tiledRoof('#c3975c');
  const gray = tiledRoof('#8c8d80');
  const roofStrip = paint('#88a99d');
  const x0=-41.25, x1=41.2, rear=-27.2, front=27.65;
  const entryLevel=-.4, lip=5.65, facade=19.35;

  model.block(x0,x1,rear,front,model.low,entryLevel,concrete);
  model.block(x0,x1,rear,16.82,entryLevel,11.85,wall);
  model.block(x0,x1,16.82,facade,entryLevel,6.05,wall);
  model.block(x0,x1,rear,1.6,11.83,13.18,concrete);
  model.block(x0+.70,x1-.70,rear+.2,-2.3,13.17,13.66,gray);
  model.block(x0+.38,x1-.38,-2.3,2.0,12.40,12.62,roofStrip);
  model.block(x0+.26,x1-.26,2.0,16.8,11.85,12.21,gray);

  // Broad low roof planes above the hall behind the curved entrance canopy.
  model.surface([[x0,13.18,rear],[x1,13.18,rear],[x1,14.6,-2.3],[x0,14.6,-2.3]],
    [0,1,2,0,2,3],gray);
  model.surface([[x0,13.85,1.95],[x1,13.85,1.95],[x1,12.15,16.8],[x0,12.15,16.8]],
    [0,1,2,0,2,3],gray);
  for (const [x,width] of [[-26.5,2.5],[18.6,2.7]]) {
    model.surface([[x,14.63,-2.3],[x+width,14.63,-2.3],[x+width,13.22,rear],[x,13.22,rear]],
      [0,1,2,0,2,3],roofStrip);
    model.surface([[x,13.88,1.95],[x+width,13.88,1.95],[x+width,12.18,16.8],[x,12.18,16.8]],
      [0,1,2,0,2,3],roofStrip);
  }

  const canopy = [];
  for (let i=0;i<=12;i++){
    const t=i/12;
    const y=lip+.62*t+5.86*Math.pow(t,2.9);
    const z=front-(front-16.75)*t;
    canopy.push([x0-.58,y,z],[x1+.56,y,z]);
  }
  const canopyIndices = Array.from({length:12},(_,i)=>{
    const a=2*i;
    return [a,a+1,a+3,a,a+3,a+2];
  }).flat();
  model.surface(canopy,canopyIndices,ochre);
  model.box(0,lip-.20,front-.07,x1-x0+1.18,.58,.55,concrete);
  model.box(0,12.14,16.73,x1-x0+1.15,.40,.62,concrete);
  for (const x of [x0,x1]) {
    const rearTop = [[x,13.18,rear],[x,14.6,-2.3],[x,13.86,1.95],[x,12.15,16.8]];
    const roofEdge = [...rearTop,...canopy.filter((_,i)=>i%2===(x===x0?0:1)).slice(0,-1).reverse()
      .map(([,y,z])=>[x,y,z])];
    const last=roofEdge.length;
    model.surface([...roofEdge,...roofEdge.map(([,y,z],i)=>[x,i<=3?11.8:lip-.51,z])],
      Array.from({length:last-1},(_,i)=>[i,i+1,last+i+1,i,last+i+1,last+i]).flat(),wall);
    for (let bay=0;bay<15;bay++) {
      const z=rear+2.45+2.85*bay;
      model.box(x+Math.sign(x)*.07,7.1,z,.12,2.15,1.46,dark);
      model.box(x+Math.sign(x)*.28,6.85,z,.45,4.55,.28,pale);
    }
  }

  model.box(0,3.13,facade+.14,x1-x0-.82,4.28,.43,dark);
  model.box(0,5.88,facade+.20,x1-x0-.66,1.35,.45,mortar);
  for (let bay=0;bay<26;bay++) {
    const x=-39.0+bay*3.08;
    model.box(x,2.56,facade+.41,2.62,2.96,.12,glass);
    model.box(x+.20,2.62,facade+.49,.11,3.08,.12,metal);
  }
  for (const x of [-35,-24,-12,0,12,24,35]) {
    model.box(x,(entryLevel+lip)/2,front-1.86,.82,lip-entryLevel,.82,pale,unitColumn);
  }
  model.box(0,entryLevel-.07,front+.52,76,.25,1.63,concrete);
  for (let step=0;step<5;step++) {
    model.block(-38,38,front+1.08+step*.47,front+1.55+step*.47,
      model.low,entryLevel-.10-step*.16,concrete);
  }

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width=512;
    canvas.height=64;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#6b5540';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#e6c173';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.font='42px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('堂 念 紀 正 中',256,36);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace=T.SRGBColorSpace;
    const sign = model.add(new T.PlaneGeometry(10.9,1.36),new T.MeshLambertMaterial({map:texture}));
    sign.position.set(0,5.96,facade+.45);
  }
  return model.finish(14.65);
}

export const northernLandmarks = new Map([
  ['w367195923',socialScience],
  ['w367196899',mainLibrary],
  ['w367195941',auditorium],
]);
