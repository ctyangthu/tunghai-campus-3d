import * as T from 'three';

export const provincialBuildingId = 'w226831045';

function clipAt(ring, axis, boundary, keepLower) {
  const included = p => keepLower ? p[axis] <= boundary : p[axis] >= boundary;
  const result = [];
  ring.forEach((point, i) => {
    const next = ring[(i + 1) % ring.length];
    if (included(point)) result.push(point);
    if (included(point) !== included(next)) {
      const t = (boundary - point[axis]) / (next[axis] - point[axis]);
      result.push(point.map((value, j) => T.MathUtils.lerp(value, next[j], t)));
    }
  });
  return result;
}

export function provincialBuilding(footprint, terrainHeight) {
  // Align the architectural details with the north façade on the mapped footprint.
  const [originX, originZ] = footprint.points[0];
  const [cornerX, cornerZ] = footprint.points.at(-1);
  const angle = Math.atan2(cornerZ - originZ, cornerX - originX);
  const c = Math.cos(angle), s = Math.sin(angle);
  const ring = footprint.points.map(([x, z]) => [c * (x - originX) + s * (z - originZ), -s * (x - originX) + c * (z - originZ)]);
  const gradeAt = (x, z) => terrainHeight(originX + c * x - s * z, originZ + s * x + c * z);
  const entranceGrade = gradeAt(10, -2);
  const footing = Math.min(...footprint.points.map(([x,z]) => terrainHeight(x,z))) - entranceGrade - .45;
  const group = new T.Group();
  group.position.set(originX, entranceGrade, originZ);
  group.rotation.y = -angle;
  const paint = (color, side = T.FrontSide) => new T.MeshLambertMaterial({color, side});
  const brick = paint('#a06654');
  const brickGable = paint('#9c614f', T.DoubleSide);
  const roof = paint('#4e5653', T.DoubleSide);
  const lighterRoof = paint('#56605b', T.DoubleSide);
  const trim = paint('#d7bc9f');
  const stone = paint('#a7908a');
  const seam = paint('#8d7d75');
  const slate = paint('#b4b0a5');
  const frame = paint('#4d595d');
  const canopyFrame = paint('#dbddd3');
  const canopySkin = paint('#b9c6c1', T.DoubleSide);
  const glasses = ['#5a767f', '#6f8b93', '#83a1a6', '#577078'].map(color => paint(color));
  const blocks = new Map();

  function add(geometry, material) {
    const mesh = new T.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  function box(x, y, z, width, height, depth, material, yaw = 0) {
    if (!blocks.has(material)) blocks.set(material, []);
    blocks.get(material).push({x, y, z, width, height, depth, yaw});
  }

  function walls(points, top) {
    const shape = new T.Shape();
    points.forEach(([x,z],i) => shape[i ? 'lineTo' : 'moveTo'](x,-z));
    const geometry = new T.ExtrudeGeometry(shape, {depth: top - footing, bevelEnabled: false});
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, footing, 0);
    add(geometry, [roof, brick]);
  }
  function triangles(vertices, material) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(vertices.flat(),3));
    geometry.computeVertexNormals();
    add(geometry, material);
  }
  function pitchedRoof(points, axis, peakAt, eave, rise, span) {
    const height = p => eave + rise * Math.max(0, 1 - Math.abs(p[axis] - peakAt) / span);
    const lift = p => [p[0], height(p), p[1]];
    for (const [index, lower] of [true, false].entries()) {
      const half = clipAt(points, axis, peakAt, lower);
      const faces = T.ShapeUtils.triangulateShape(half.map(([x,z]) => new T.Vector2(x,z)), []);
      triangles(faces.flatMap(face => face.map(i => lift(half[i]))), index ? roof : lighterRoof);
    }
    const skirt = [];
    points.forEach((a, i) => {
      const b = points[(i + 1) % points.length];
      const line = [a];
      if ((a[axis] < peakAt) !== (b[axis] < peakAt)) {
        const t = (peakAt - a[axis]) / (b[axis] - a[axis]);
        line.push(a.map((value,j) => T.MathUtils.lerp(value,b[j],t)));
      }
      line.push(b);
      for (let n = 1; n < line.length; n++) {
        const p = line[n - 1], q = line[n];
        skirt.push([p[0],eave,p[1]],[q[0],eave,q[1]],lift(p),lift(p),[q[0],eave,q[1]],lift(q));
      }
    });
    triangles(skirt, brickGable);
  }

  const wingBreak = 19.68;
  const north = clipAt(ring,1,wingBreak,true);
  const south = clipAt(ring,1,wingBreak,false);
  const northEave = 15.3, southEave = 12.4;
  walls(north,northEave);
  walls(south,southEave);
  pitchedRoof(north,1,wingBreak/2,northEave,3.15,wingBreak/2);
  pitchedRoof(south,0,7.2,southEave,2.0,23.0);

  const winding = Math.sign(ring.reduce((sum, [x,z], i) => {
    const [u,v] = ring[(i+1)%ring.length];
    return sum+x*v-u*z;
  },0));
  function details([ax,az], [bx,bz], stories, mode) {
    const dx=bx-ax, dz=bz-az, length=Math.hypot(dx,dz);
    const nx=winding*dz/length, nz=-winding*dx/length;
    const yaw=-Math.atan2(dz,dx);
    const at=(t,y,w,h,d,material, offset=.045) =>
      box(ax+dx*t+nx*offset,y,az+dz*t+nz*offset,w,h,d,material,yaw);
    const count=Math.max(2,Math.round(length/3.5));
    for(let floor=0;floor<stories;floor++){
      const y=1.87+3.34*floor;
      if(mode!=='north'||floor>=2){
        at(.5,y-1.0,length,.13,.10,trim);
        at(.5,y+.93,length,.11,.10,trim);
      }
      for(let bay=0;bay<count;bay++){
        const t=(bay+.5)/count;
        const x=ax+dx*t;
        if(mode==='north'&&floor<=1&&x>3&&x<25) continue;
        if(mode==='east-south'&&t>.48&&t<.71) continue;
        const w=Math.min(2.05,length/count-.5);
        at(t,y,w,1.77,.17,frame);
        at(t,y,w-.19,1.54,.12,glasses[(bay+floor)%glasses.length],.14);
        at(t,y,w-.07,.07,.14,trim,.145);
        at(t,y,.075,1.61,.16,frame,.145);
      }
    }
  }

  const [nw,...rest]=ring, ne=rest.at(-1), se=rest.at(-2);
  const eastSplit=ne.map((value,i)=>T.MathUtils.lerp(value,se[i],wingBreak/se[1]));
  details(ne,eastSplit,4,'east');
  details(eastSplit,se,3,'east-south');
  details(ne.map((v,i)=>i===1?v-.31:v),[nw[0],nw[1]-.31],4,'north');
  ring.slice(0,-2).forEach((p,i)=>details(p,ring[i+1],p[1]<wingBreak-1?4:3,'side'));

  // Pink stone entrance facing the north walk, with a blue-gray lobby wall.
  box(18.55,4.65,-.21,36.97,9.2,.44,stone);
  for(let i=1;i<30;i++) box(1.23*i,7.49,-.443,.024,3.32,.025,seam);
  for(let i=0;i<4;i++) box(18.55,5.91+i*1.07,-.443,36.97,.022,.025,seam);
  function glazedWall(x,y,z,width,height,columns,rows,yaw=0){
    const xx=Math.cos(yaw), zz=-Math.sin(yaw);
    box(x,y,z,width,height,.18,frame,yaw);
    for(let col=0;col<columns;col++) for(let row=0;row<rows;row++){
      const delta=width*((col+.5)/columns-.5);
      box(x+xx*delta+zz*.11,y+height*((row+.5)/rows-.5),z+zz*delta-xx*.11,
        width/columns-.07,height/rows-.09,.10,glasses[(2*col+row)%glasses.length],yaw);
    }
  }
  glazedWall(19.55,3.26,-.49,13.0,4.78,10,4);
  glazedWall(8.5,2.61,-.55,7.6,4.95,6,3);
  glazedWall(se[0]+.17,4.53,31.85,4.5,8.83,4,7,-Math.PI/2);
  box(8.64,4.34,-1.02,6.9,.44,.60,slate);
  const signCanvas=document.createElement('canvas');
  signCanvas.width=400;
  signCanvas.height=45;
  const sign=signCanvas.getContext('2d');
  sign.fillStyle='#beb5a7';
  sign.fillRect(0,0,400,45);
  sign.fillStyle='#2e302f';
  sign.font='bold 30px system-ui, sans-serif';
  sign.textAlign='center';
  sign.textBaseline='middle';
  sign.fillText('東海大學省政研究大樓',200,23);
  const signMap=new T.CanvasTexture(signCanvas);
  signMap.colorSpace=T.SRGBColorSpace;
  const plaque = new T.Mesh(new T.PlaneGeometry(6.87,.43), new T.MeshBasicMaterial({map:signMap}));
  plaque.position.set(8.64,4.34,-1.33);
  plaque.rotation.y=Math.PI;
  group.add(plaque);

  const plazaVertices=[];
  const plazaColors=[];
  const plazaTones=['#c2bbaa','#beb8a9','#c5bfb0','#c1bbad'].map(color=>new T.Color(color));
  const plazaPoint=(x,z)=>[x,gradeAt(x,z)-entranceGrade+.09,z];
  for(let row=0;row<7;row++) for(let col=0;col<13;col++){
    const x=2.7+col*1.92, z=-12.1+row*1.74;
    plazaVertices.push(plazaPoint(x,z),plazaPoint(x,z+1.72),plazaPoint(x+1.89,z),
      plazaPoint(x+1.89,z),plazaPoint(x,z+1.72),plazaPoint(x+1.89,z+1.72));
    const tone=plazaTones[(row*3+col*7)%plazaTones.length];
    for(let i=0;i<6;i++) plazaColors.push(tone.r,tone.g,tone.b);
  }
  const plazaGeometry=new T.BufferGeometry();
  plazaGeometry.setAttribute('position',new T.Float32BufferAttribute(plazaVertices.flat(),3));
  plazaGeometry.setAttribute('color',new T.Float32BufferAttribute(plazaColors,3));
  plazaGeometry.computeVertexNormals();
  const plaza=new T.Mesh(plazaGeometry,new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}));
  plaza.receiveShadow=true;
  group.add(plaza);

  // Shallow double pitch canopy projects over the entrance steps.
  const canopyLeft=3.81, canopyRight=13.43, canopyRidge=8.5;
  const canopyHeight=x=>4.89+.71*(1-Math.abs(x-canopyRidge)/4.94);
  for (const [x1,x2] of [[canopyLeft,canopyRidge],[canopyRidge,canopyRight]]) {
    const a=[x1,canopyHeight(x1),-.40], b=[x2,canopyHeight(x2),-.40];
    const d=[x1,canopyHeight(x1)-.32,-4.2], e=[x2,canopyHeight(x2)-.32,-4.2];
    triangles([a,b,d,b,e,d],canopySkin);
    const edge = new T.Mesh(new T.BoxGeometry(Math.hypot(x2-x1,e[1]-d[1]),.15,.15),canopyFrame);
    edge.position.set((x1+x2)/2,(d[1]+e[1])/2,-4.2);
    edge.rotation.z=Math.atan2(e[1]-d[1],x2-x1);
    group.add(edge);
  }
  for(let i=0;i<=8;i++){
    const x=T.MathUtils.lerp(canopyLeft,canopyRight,i/8);
    box(x,canopyHeight(x)-.24,-2.3,.088,.11,3.88,canopyFrame);
  }
  for(let step=0;step<6;step++) box(8.55,.055+.088*step,-4.6+step*.46,7.7,.20,.61,slate);
  for(const x of [3.89,13.31]){
    box(x,.31,-2.72,1.2,.64,2.3,brick);
    box(x,.72,-2.72,1.1,.28,2.2,paint('#678454'));
  }
  box(8.53,.56,-.86,7.7,.28,2.35,slate);
  for(let step=0;step<6;step++) box(se[0]+2.6-step*.36,.027+.085*step,31.85,.47,.21,5.6,slate);

  const unitBox=new T.BoxGeometry(1,1,1);
  const dummy=new T.Object3D();
  for(const [surface,items] of blocks){
    const mesh=new T.InstancedMesh(unitBox,surface,items.length);
    mesh.castShadow=surface===canopyFrame || surface===stone;
    mesh.receiveShadow=true;
    items.forEach(({x,y,z,width,height,depth,yaw},i)=>{
      dummy.position.set(x,y,z);
      dummy.rotation.y=yaw;
      dummy.scale.set(width,height,depth);
      dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
    });
    group.add(mesh);
  }
  const pickables=group.children.filter(part=>part.isMesh&&part!==plaza);
  pickables.forEach(part=>{part.userData.osm=provincialBuildingId;});
  const plantingExclusion = [[.4,-14],[30,-14],[30,.35],[.4,.35]].map(([x,z])=>[
    originX+c*x-s*z,originZ+s*x+c*z,
  ]);
  return {group, top:entranceGrade+northEave+3.15, pickables, plantingExclusion};
}
