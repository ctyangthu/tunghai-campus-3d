import * as T from 'three';
import {fineArtsId, fineArtsBuilding} from './fine-arts.js';
import {provincialBuildingId, provincialBuilding} from './provincial-building.js';
import {activityCenterBuilding, activityCenterId} from './activity-center.js';
import {newDormBuilding, newDormIds} from './new-dorms.js';
import {facultyResidenceId, facultyResidenceBuilding, facultyResidenceBuildingIds} from './faculty-residence.js';
import {alumniBellId, alumniBellTower, courtyardWing, wenliBoulevardId, wenliCourtyards} from './wenli-heritage.js';

const detailedBuildings = new Map([
  [fineArtsId, fineArtsBuilding],
  [provincialBuildingId, provincialBuilding],
  [activityCenterId, activityCenterBuilding],
  ...newDormIds.map(id=>[id,newDormBuilding]),
  ...facultyResidenceBuildingIds.map(id=>[id,facultyResidenceBuilding]),
  ...wenliCourtyards.flatMap(court=>[...court.wings,court.passage]
    .filter(Boolean).map(id=>[id,(building,height)=>courtyardWing(building,height,court)])),
]);

const decode = (value, ArrayType) => new ArrayType(Uint8Array.from(atob(value), c => c.charCodeAt(0)).buffer);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const hash = i => {
  const x = Math.sin(i * 127.1 + 713.221) * 43758.5453;
  return x - Math.floor(x);
};

function inside(x, z, points) {
  let hit = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi,zi] = points[i], [xj,zj] = points[j];
    if ((zi > z) !== (zj > z) && x < (xj-xi)*(z-zi)/(zj-zi)+xi) hit = !hit;
  }
  return hit;
}

export function makeWorld(scene, geo, terrain, chapel) {
  const [bounds, nx, nz, raw] = terrain;
  const [west,north,east,south] = bounds;
  const width = east-west, depth = south-north;
  const elevation = decode(raw, Uint16Array);
  const board = {width, depth, x:(east+west)/2, z:(north+south)/2};
  function height(x,z) {
    const xi = clamp((x-west)/width*(nx-1), 0, nx-1.0001);
    const zi = clamp((z-north)/depth*(nz-1), 0, nz-1.0001);
    const i = Math.floor(xi), j = Math.floor(zi), a=xi-i, b=zi-j, pos=j*nx+i;
    const first = elevation[pos]*(1-a) + elevation[pos+1]*a;
    const second = elevation[pos+nx]*(1-a) + elevation[pos+nx+1]*a;
    return ((first*(1-b)+second*b)/10 - 100) * 1.24;
  }

  const geometry = new T.PlaneGeometry(width,depth,nx-1,nz-1);
  geometry.rotateX(-Math.PI/2);
  geometry.translate(board.x,0,board.z);
  const attr = geometry.attributes.position;
  for (let i=0; i<attr.count; i++) attr.setY(i,height(attr.getX(i),attr.getZ(i)));
  geometry.computeVertexNormals();
  const ground = new T.Mesh(geometry,new T.MeshLambertMaterial({map: groundTexture(geo,bounds,height)}));
  ground.receiveShadow = true;
  scene.add(ground);

  const edge = [];
  for (let i=0;i<nx;i++) edge.push([west+i*width/(nx-1),north]);
  for (let j=1;j<nz;j++) edge.push([east,north+j*depth/(nz-1)]);
  for (let i=nx-2;i>=0;i--) edge.push([west+i*width/(nx-1),south]);
  for (let j=nz-2;j>0;j--) edge.push([west,north+j*depth/(nz-1)]);
  const vertices=[], faceColors=[];
  const sideColors = ['#879676','#a2aa89','#b5b99b'].map(c => new T.Color(c));
  const foundation = -24;
  for(let i=0;i<edge.length;i++){
    const [x1,z1]=edge[i], [x2,z2]=edge[(i+1)%edge.length];
    const h1=height(x1,z1), h2=height(x2,z2);
    let low1=foundation, low2=foundation;
    for(let layer=0;layer<3;layer++){
      const t=[.23,.35,1][layer], high1=foundation+(h1-foundation)*t, high2=foundation+(h2-foundation)*t;
      vertices.push(x1,low1,z1,x2,low2,z2,x1,high1,z1,x2,low2,z2,x2,high2,z2,x1,high1,z1);
      const c=sideColors[layer];
      for(let n=0;n<6;n++) faceColors.push(c.r,c.g,c.b);
      low1=high1;low2=high2;
    }
  }
  const walls = new T.BufferGeometry();
  walls.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  walls.setAttribute('color',new T.Float32BufferAttribute(faceColors,3));
  walls.computeVertexNormals();
  scene.add(new T.Mesh(walls,new T.MeshLambertMaterial({side:T.DoubleSide,vertexColors:true})));
  const base = new T.Mesh(new T.BoxGeometry(width+4,13,depth+4),new T.MeshLambertMaterial({color:'#aab79a'}));
  base.position.set(board.x,foundation-6,board.z);
  base.castShadow = true;
  scene.add(base);

  const floor = new T.Mesh(new T.PlaneGeometry(12000,12000),new T.ShadowMaterial({opacity:.22}));
  floor.rotation.x=-Math.PI/2;
  floor.position.y=foundation-14;
  floor.receiveShadow=true;
  scene.add(floor);

  const materialCache = new Map();
  function mat(color) {
    if (!materialCache.has(color)) materialCache.set(color,new T.MeshLambertMaterial({color}));
    return materialCache.get(color);
  }
  const buildings = new T.Group();
  const byId = new Map();
  const hits = [];
  const outdoorTrack = geo.land.find(area=>area.osm==='r5467507');
  const plantingExclusions = outdoorTrack ? [outdoorTrack.points] : [];
  const representatives = new Set(geo.pois.map(p => p.osm));
  const traditional = ['#738078','#66766e','#82867b','#707871'];
  const modern = ['#d1c4ac','#c5beb0','#e6d9ba','#ded6be','#bcb8a8'];
  const buildingFacade = ['#eee4c9','#e9dcc2','#e0d5b8','#f1e7ce','#d6c3ac'];
  function shapeFor(item) {
    const shape = new T.Shape();
    item.points.forEach(([x,z],i) => shape[i ? 'lineTo' : 'moveTo'](x-item.x,-z+item.z));
    for(const ring of item.holes || []){
      const path = new T.Path();
      ring.forEach(([x,z],i) => path[i ? 'lineTo' : 'moveTo'](x-item.x,-z+item.z));
      shape.holes.push(path);
    }
    return shape;
  }
  function addBuildingPart(group, geometry, material) {
    const mesh=new T.Mesh(geometry,material);
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    group.add(mesh);
    return mesh;
  }
  for (const f of geo.buildings) {
    if (f.osm === 'w227101621') continue;
    const makeDetailedBuilding = detailedBuildings.get(f.osm);
    if (makeDetailedBuilding) {
      const refined = makeDetailedBuilding(f, height);
      buildings.add(refined.group);
      hits.push(...refined.pickables);
      if (refined.plantingExclusion) plantingExclusions.push(refined.plantingExclusion);
      byId.set(f.osm, refined.top + 2.5);
      if (facultyResidenceBuildingIds.includes(f.osm)) {
        byId.set(facultyResidenceId, Math.max(byId.get(facultyResidenceId) ?? -Infinity, refined.top+2.0));
      }
      continue;
    }
    const isHist=f.x < -459 && f.x > -902 && f.z > -77 && f.z < 134 && f.height < 14;
    const isFeatured=representatives.has(f.osm);
    const isLibrary=f.osm==='w367196899';
    const isCourt=f.osm==='w226829984';
    const isFormerArt=f.osm==='w227117506';
    const h=(isLibrary?15:isCourt?Math.max(17,f.height):isFormerArt?4:f.height || 7)*1.12;
    const grade = height(f.x,f.z);
    const low = Math.min(grade,...f.points.map(([x,z])=>height(x,z)));
    const top = Math.max(grade+h,...f.points.map(([x,z])=>height(x,z)+2));
    const colorPick = Math.floor(hash(f.id)*5);
    const roof = mat(isHist ? traditional[colorPick%4] : modern[colorPick]);
    const facade = mat(isHist ? ['#eee0bd','#d1ac86','#e4cda9','#cebb98','#dfcbaa'][colorPick] : buildingFacade[colorPick]);
    const b = new T.Group();
    b.position.set(f.x,low-.45,f.z);
    b.userData.osm=f.osm;
    const footprint=shapeFor(f);
    if(isLibrary && !f.holes?.length){
      const court=new T.Path();
      const angle=.286,c=Math.cos(angle),s=Math.sin(angle);
      [[-14,-11],[14,-11],[14,11],[-14,11]].forEach(([x,z],index)=>{
        court[index?'lineTo':'moveTo'](x*c-z*s,-x*s-z*c);
      });
      footprint.holes.push(court);
    }
    const solid=new T.ExtrudeGeometry(footprint,{depth:top-low+.45,bevelEnabled:false,curveSegments:1});
    solid.rotateX(-Math.PI/2);
    addBuildingPart(b, solid, [roof,facade]);
    if (isHist && f.points.length === 4) {
      const [a,c,d,e] = f.points;
      const roofHeight = 2.1;
      const first = Math.hypot(c[0]-a[0],c[1]-a[1]) > Math.hypot(d[0]-c[0],d[1]-c[1]);
      const corners = first ? [a,c,d,e] : [c,d,e,a];
      const p = corners.map(([x,z]) => [x-f.x,top-low+.5,z-f.z]);
      const edge1 = new T.Vector3(...p[0]).lerp(new T.Vector3(...p[3]),.5);
      const edge2 = new T.Vector3(...p[1]).lerp(new T.Vector3(...p[2]),.5);
      const ridge1=edge1.clone().lerp(edge2,.16); ridge1.y+=roofHeight;
      const ridge2=edge1.clone().lerp(edge2,.84); ridge2.y+=roofHeight;
      const w=[...p,ridge1.toArray(),ridge2.toArray()];
      const hip=new T.BufferGeometry();
      hip.setAttribute('position',new T.Float32BufferAttribute([0,4,1,1,4,5,1,5,2,2,5,3,3,5,4,3,4,0].flatMap(i=>w[i]),3));
      hip.computeVertexNormals();
      addBuildingPart(b,hip,new T.MeshLambertMaterial({color:roof.color,side:T.DoubleSide}));
    } else if (isFormerArt) {
      const axis=.267;
      const roofColor=mat('#ded5bb');
      const half=4.55;
      for (const [cx,cz] of [[-10,-7],[1,-4],[12,-1],[10,9],[7,19],[-14,2]]) {
        const points=[
          [-half,1.38,-half],[half,1.38,-half],[half,1.38,half],[-half,1.38,half],[0,-.21,0],
        ];
        const canopy=new T.BufferGeometry();
        canopy.setAttribute('position',new T.Float32BufferAttribute([0,4,1,1,4,2,2,4,3,3,4,0].flatMap(i=>points[i]),3));
        canopy.computeVertexNormals();
        const part=addBuildingPart(b,canopy,new T.MeshLambertMaterial({color:roofColor.color,side:T.DoubleSide}));
        part.position.set(cx,top-low+.4,cz);
        part.rotation.y=-axis;
      }
    } else if (isFeatured && f.points.length<75) {
      const cap=new T.ExtrudeGeometry(footprint,{depth:.9,bevelEnabled:false});
      cap.rotateX(-Math.PI/2);
      const rim=addBuildingPart(b,cap,[roof,mat('#ede7d3')]);
      rim.position.y=top-low+.48;
    }
    if (isFeatured || isFormerArt) {
      if (!isFormerArt && h >= 10 && f.points.length<60) {
        const windows=mat('#788679');
        const floors=Math.min(7,Math.floor((h-1.8)/3.2));
        for(let i=0;i<f.points.length;i++){
          const [ax,az]=f.points[i], [bx,bz]=f.points[(i+1)%f.points.length];
          const dx=bx-ax,dz=bz-az, len=Math.hypot(dx,dz);
          if(len<10) continue;
          const faceAngle=-Math.atan2(dz,dx);
          const inset=Math.min(2.1,len*.12);
          const g=new T.BoxGeometry(len-2*inset,.63,.24);
          for(let floor=0;floor<floors;floor++){
            const ribbon=new T.Mesh(g,windows);
            ribbon.position.set((ax+bx)/2-f.x,top-low-1.5-floor*3.12,(az+bz)/2-f.z);
            ribbon.rotation.y=faceAngle;
            b.add(ribbon);
          }
        }
      }
      hits.push(...b.children);
      byId.set(f.osm,top+2.5);
      for(const child of b.children) child.userData.osm=f.osm;
    }
    buildings.add(b);
  }
  scene.add(buildings);

  const churchPoint=geo.pois.find(p=>p.osm==='w227101621');
  if(churchPoint){
    const church = new T.Group();
    church.rotation.y=76*Math.PI/180;
    church.scale.x=1.43;
    church.position.set(churchPoint.x,height(churchPoint.x,churchPoint.z),churchPoint.z);
    for(const part of chapel.groups){
      const geom=new T.BufferGeometry();
      geom.setAttribute('position',new T.BufferAttribute(decode(part.positionsFloat32,Float32Array),3));
      geom.setAttribute('normal',new T.BufferAttribute(decode(part.normalsFloat32,Float32Array),3));
      geom.setIndex(new T.BufferAttribute(decode(part.indicesUint16,Uint16Array),1));
      const material=new T.MeshLambertMaterial({color:part.color,
        side:part.doubleSided?T.DoubleSide:T.FrontSide});
      const mesh=addBuildingPart(church,geom,material);
      mesh.userData.osm=churchPoint.osm;
      hits.push(mesh);
    }
    scene.add(church);
    byId.set(churchPoint.osm,church.position.y+24);
  }

  const tower=geo.pois.find(p=>p.osm==='n3714871469');
  if(tower){
    const b=new T.Group();
    b.position.set(tower.x,height(tower.x,tower.z),tower.z);
    b.rotation.y=Math.PI/4;
    const wall=mat('#c89d52'), trim=mat('#d7bd81');
    for(const x of [-1.42,1.42]){
      for(const z of [-.72,.72]){
        const panel=addBuildingPart(b,new T.BoxGeometry(.38,4.1,1.12),wall);
        panel.position.set(x,2.05,z);
      }
    }
    addBuildingPart(b,new T.BoxGeometry(3.6,.26,2.9),trim).position.y=4.12;
    addBuildingPart(b,new T.CylinderGeometry(.26,.63,.77,16),mat('#6e6546')).position.y=3.42;
    for(const child of b.children){child.userData.osm=tower.osm;hits.push(child);}
    scene.add(b);
    byId.set(tower.osm,b.position.y+6);
  }

  const alumniBell=geo.pois.find(p=>p.osm===alumniBellId);
  if(alumniBell){
    const model=alumniBellTower(alumniBell,height);
    scene.add(model.group);
    hits.push(...model.pickables);
    byId.set(alumniBellId,model.top+1.5);
  }

  plantTrees(scene,geo,height,bounds,plantingExclusions);
  return {height,board,byId,hits};
}

function groundTexture(geo,bounds,height) {
  const [west,north,east,south]=bounds;
  const canvas=document.createElement('canvas');
  canvas.width=4096;
  canvas.height=Math.round(4096*(south-north)/(east-west));
  const ctx=canvas.getContext('2d');
  const s=canvas.width/(east-west);
  ctx.scale(s,s);
  ctx.translate(-west,-north);
  ctx.fillStyle='#cdd5bd';
  ctx.fillRect(west,north,east-west,south-north);
  function path(points,close=false) {
    if(points.length===0) return;
    ctx.moveTo(...points[0]);
    for (const p of points.slice(1)) ctx.lineTo(...p);
    if(close) ctx.closePath();
  }
  function area(points,color,holes=[]){
    ctx.beginPath();
    path(points,true);
    for(const hole of holes) path(hole,true);
    ctx.fillStyle=color;
    ctx.fill('evenodd');
  }
  area(geo.boundary,'#c8d7a2');
  const landColor={wood:'#94ad7b',forest:'#94ad7b',scrub:'#a1b885',paved:'#d3ccb3',parking:'#c6c7b4',pitch:'#b0c88d',recreation_ground:'#b7ca91',
    grass:'#bed493',park:'#b8ce9b',garden:'#aac696',meadow:'#b6cc8e',track:'#b07962',water:'#6f9d99',
    swimming_pool:'#7db3b3',farmland:'#b9cc91',orchard:'#aac18c',residential:'#cfccb3',sand:'#ddc49c',
    university:'#c8d7a2',education:'#c8d7a2'};
  for(const f of geo.land) {
    const color=f.osm==='r5467507'?'#61859e':landColor[f.type];
    if (color) area(f.points,color,f.holes);
  }
  for(let i=0;i<4300;i++){
    const x=west+hash(i+444)*(east-west), z=north+hash(i+5580)*(south-north);
    ctx.fillStyle=i%2?'#727e5a19':'#fff7d229';
    ctx.fillRect(x,z,1.4+hash(i)*2,1+hash(i+33)*1.8);
  }
  // Drape contours from the same DEM used by the terrain mesh.
  ctx.lineWidth=.56;
  ctx.strokeStyle='#647b5c42';
  const step=20, cols=Math.ceil((east-west)/step), rows=Math.ceil((south-north)/step);
  const samples=Array.from({length:rows+1},(_,j)=>Array.from({length:cols+1},(_,i)=>height(west+i*step,north+j*step)));
  ctx.beginPath();
  for(let j=0;j<rows;j++) for(let i=0;i<cols;i++){
    const x=west+i*step,z=north+j*step;
    const corners=[[x,z,samples[j][i]],[x+step,z,samples[j][i+1]],[x+step,z+step,samples[j+1][i+1]],[x,z+step,samples[j+1][i]]];
    const low=Math.min(...corners.map(p=>p[2])), high=Math.max(...corners.map(p=>p[2]));
    for(let h=Math.floor(low/12.4)*12.4+12.4;h<high;h+=12.4){
      const contour=[];
      for(let k=0;k<4;k++){
        const a=corners[k],b=corners[(k+1)%4];
        if((a[2]>=h)===(b[2]>=h)) continue;
        const t=(h-a[2])/(b[2]-a[2]);
        contour.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);
      }
      for(let n=1;n<contour.length;n+=2){ctx.moveTo(...contour[n-1]);ctx.lineTo(...contour[n]);}
    }
  }
  ctx.stroke();
  ctx.lineCap='round';
  ctx.lineJoin='round';
  ctx.beginPath();
  path(geo.boundary,true);
  ctx.strokeStyle='#496c5370';ctx.lineWidth=2.5;ctx.setLineDash([6,5]);ctx.stroke();ctx.setLineDash([]);
  const main = new Set(['trunk','trunk_link','primary','secondary','tertiary','primary_link','secondary_link']);
  const foot = new Set(['footway','path','steps','pedestrian','cycleway','corridor']);
  const isMain = road => main.has(road.type) || /臺灣大道|台灣大道/.test(road.name);
  for (const f of [...geo.roads].sort((a,b)=>Number(b.osm===wenliBoulevardId)-Number(a.osm===wenliBoulevardId)
    || Number(isMain(a))-Number(isMain(b)))) {
    const broad=isMain(f), walk=foot.has(f.type), special=f.name==='文理大道';
    const w = Math.max(walk ? 1.8 : 3.3, f.width)*(broad?1.15:1);
    if (f.osm===wenliBoulevardId && f.points.length===2) {
      const [[ax,az],[bx,bz]]=f.points;
      const length=Math.hypot(bx-ax,bz-az);
      const nx=(az-bz)/length,nz=(bx-ax)/length;
      ctx.beginPath();
      path(f.points);
      ctx.lineWidth=12;
      ctx.strokeStyle='#a9be81';
      ctx.stroke();
      ctx.strokeStyle='#c8bd9e';
      ctx.lineWidth=2.9;
      for (const offset of [-4.15,4.15]) {
        ctx.beginPath();
        path(f.points.map(([x,z])=>[x+nx*offset,z+nz*offset]));
        ctx.stroke();
      }
      ctx.save();
      ctx.lineCap='butt';
      ctx.lineWidth=.31;
      ctx.strokeStyle='#a9a17f';
      ctx.beginPath();
      for (let d=3.9; d<length; d+=3.9) {
        const x=ax+(bx-ax)*d/length,z=az+(bz-az)*d/length;
        ctx.moveTo(x-nx*2.72,z-nz*2.72);
        ctx.lineTo(x+nx*2.72,z+nz*2.72);
      }
      ctx.stroke();
      ctx.restore();
      continue;
    }
    ctx.beginPath();path(f.points);
    if (!walk || special) {
      ctx.strokeStyle=broad?'#9a9f8c':'#aeac8d';
      ctx.lineWidth=w+1.9;
      ctx.stroke();
    }
    ctx.strokeStyle=broad?'#c6c2ac':special?'#f3e3bc':walk?'#e1d6af':'#e8e0c5';
    ctx.lineWidth=w;
    ctx.stroke();
    if (broad && w>7) {
      ctx.strokeStyle='#f3ebce';
      ctx.lineWidth=.7;ctx.setLineDash([5,6]);ctx.stroke();ctx.setLineDash([]);
    }
  }
  const rose=geo.land.find(f=>f.osm==='w1507803521');
  if(rose){
    for(const [cx,cz] of [[rose.x-13,rose.z+3],[rose.x+10,rose.z-5]]){
      const petals = [];
      for(let i=0;i<=96;i++){
        const a=i*Math.PI/48,r=7.4+Math.sin(a*5)*1.8;
        petals.push([cx+r*Math.cos(a),cz+r*Math.sin(a)]);
      }
      area(petals,'#cb8b84');
      ctx.beginPath();path(petals,true);ctx.strokeStyle='#e1c69d';ctx.lineWidth=1.6;ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cz,3.2,0,Math.PI*2);ctx.fillStyle='#9e6260';ctx.fill();
    }
  }
  const texture=new T.CanvasTexture(canvas);
  texture.anisotropy=8;
  texture.colorSpace=T.SRGBColorSpace;
  return texture;
}

function plantTrees(scene,geo,height,bounds,plantingExclusions) {
  const forest=geo.land.filter(f=>['wood','forest','scrub','orchard'].includes(f.type));
  const exclusion=geo.land.filter(f=>['water','swimming_pool','pitch','track'].includes(f.type));
  const boxes = records => records.map(f=>{
    const xs=f.points.map(p=>p[0]), zs=f.points.map(p=>p[1]);
    return {f,x0:Math.min(...xs),x1:Math.max(...xs),z0:Math.min(...zs),z1:Math.max(...zs)};
  });
  const check=(x,z,array,pad=0)=>array.some(({f,x0,x1,z0,z1})=>x>x0-pad && x<x1+pad && z>z0-pad && z<z1+pad &&
    inside(x,z,f.points)&&!(f.holes||[]).some(p=>inside(x,z,p)));
  const trunks=[], crowns=[];
  const built=boxes(geo.buildings), forests=boxes(forest), water=boxes(exclusion);
  const roads=geo.roads.filter(f=>!['steps','path','cycleway','footway'].includes(f.type));
  const roadPoints=[];
  for (const road of roads) for(let i=1;i<road.points.length;i++){
    const [x,z]=road.points[i-1], [x2,z2]=road.points[i], sx=x2-x,sz=z2-z;
    const count=Math.ceil(Math.hypot(sx,sz)/5);
    const clearance=road.osm===wenliBoulevardId?6.3:road.width/2+2.2;
    for(let j=0;j<=count;j++){const t=j/Math.max(count,1);roadPoints.push([x+sx*t,z+sz*t,clearance]);}
  }
  const cells=new Map();
  for (const p of roadPoints){
    const key=[Math.floor(p[0]/16),Math.floor(p[1]/16)].join();
    if(!cells.has(key)) cells.set(key,[]);
    cells.get(key).push(p);
  }
  function nearRoad(x,z) {
    const cx=Math.floor(x/16),cz=Math.floor(z/16);
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){
      for(const [rx,rz,r] of cells.get([cx+a,cz+b].join())||[]) if((rx-x)**2+(rz-z)**2<r*r) return true;
    }
    return false;
  }
  const [west,north,east,south]=bounds;
  const candidates=[...geo.trees.map(p=>[...p,1])];
  const openLand=boxes(geo.land.filter(f=>['meadow','farmland','grass'].includes(f.type)));
  for(let row=0,z=north+8;z<south;z+=13,row++){
    for(let col=0,x=west+8;x<east;x+=13,col++){
      const n=row*212+col;
      const px=x+hash(n+380)*10-5, pz=z+hash(n+2180)*10-5;
      const a=hash(n+881);
      const woodland=check(px,pz,forests);
      if (!woodland && (a>.22 || !inside(px,pz,geo.boundary) || check(px,pz,openLand))) continue;
      if (woodland && a>.78) continue;
      if (Math.hypot(px+421,pz-16)<59 || check(px,pz,built) || check(px,pz,water) || nearRoad(px,pz)) continue;
      if (plantingExclusions.some(polygon=>inside(px,pz,polygon))) continue;
      candidates.push([px,pz,woodland?1:.84]);
    }
  }
  const colors=['#3e6a4c','#517a55','#638658','#6d925f','#849c5e','#477559'].map(c=>new T.Color(c));
  for(let i=0;i<candidates.length;i++){
    const [x,z,k]=candidates[i], y=height(x,z), s=(.71+hash(i+222)*.85)*k;
    const c=colors[Math.floor(hash(i+3099)*colors.length)];
    trunks.push([x,y+2*s,z,.48*s,4.5*s,.48*s,0,null]);
    crowns.push([x,y+5.9*s,z,3.2*s,4.35*s,3.0*s,hash(i+116)*6,c]);
    if(i%5===0) crowns.push([x+1.2*s,y+5.1*s,z-1.4*s,2.75*s,3.2*s,2.45*s,2,c]);
  }
  const marker=new T.Object3D();
  for(const [items,geometry,color] of [[trunks,new T.CylinderGeometry(.65,1,1,5),'#887557'],[crowns,new T.IcosahedronGeometry(1,1),'#ffffff']]){
    const batch=new T.InstancedMesh(geometry,new T.MeshLambertMaterial({color,flatShading:true}),items.length);
    batch.castShadow=items===crowns;
    batch.receiveShadow=true;
    items.forEach(([x,y,z,sx,sy,sz,angle,color],index)=>{
      marker.position.set(x,y,z);
      marker.rotation.y=angle;
      marker.scale.set(sx,sy,sz);
      marker.updateMatrix();
      batch.setMatrixAt(index,marker.matrix);
      if(color) batch.setColorAt(index,color);
    });
    scene.add(batch);
  }
}
