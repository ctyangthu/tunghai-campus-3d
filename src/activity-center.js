import * as T from 'three';

export const activityCenterId = 'yang-activity-center';

// The site plan follows the foundation in the 2024 NLSC orthophoto.
// The shell and north elevation follow Tunghai's 2026 exterior photographs.
const anchor = [-137.1, -219.1];
const angle = .267;
const cos = Math.cos(angle);
const sin = Math.sin(angle);
const world = (x,z) => [anchor[0]+cos*x-sin*z,anchor[1]+sin*x+cos*z];

export const activityCenterFootprint = {
  osm: activityCenterId,
  name: '楊瑞祥綜合活動大樓',
  type: 'university',
  x: world(24,29)[0],
  z: world(24,29)[1],
  points: [[0,0],[56,0],[56,63],[49,68],[0,68],[0,38],[-20,38],[-20,22],[0,22]].map(([x,z])=>world(x,z)),
};

export function activityCenterBuilding(footprint, terrainHeight) {
  const grade = Math.min(...footprint.points.map(([x,z])=>terrainHeight(x,z)));
  const frontGrade = terrainHeight(...world(26,0));
  const group = new T.Group();
  group.position.set(anchor[0],frontGrade,anchor[1]);
  group.rotation.y = -angle;

  const paint = color => new T.MeshLambertMaterial({color});
  const concrete = paint('#a5adac');
  const stone = paint('#bfc4bd');
  const shadowStone = paint('#818c8a');
  const slate = paint('#535e62');
  const roof = paint('#a5aca8');
  const dark = paint('#52666d');
  const panel = paint('#647c84');
  const fin = paint('#d3d8d2');
  const panes = ['#69828a','#758f95','#5e7680','#879b9d'].map(paint);
  const pieces = new Map();
  function box(x,y,z,width,height,depth,material) {
    if (!pieces.has(material)) pieces.set(material,[]);
    pieces.get(material).push({x,y,z,width,height,depth});
  }

  const foundation=grade-frontGrade-.7;
  const podiumTop=6.4;
  box(28,(foundation+podiumTop)/2,34,56,podiumTop-foundation,68,concrete);
  box(34.25,11.72,32.5,42.9,11.35,65,slate);
  box(33.98,17.55,31.95,43.46,.42,65.0,roof);
  box(34.0,17.91,-.48,43.45,.64,.31,fin);
  box(55.52,17.91,31.8,.31,.64,64.1,fin);
  box(34.0,17.91,64.16,43.45,.64,.31,stone);
  box(1.28,12.02,30.2,3.1,11.78,61.7,stone);
  box(11.35,12.02,30.2,3.13,11.78,61.7,stone);
  box(6.51,17.62,29.9,12.57,.68,62,stone);
  box(6.45,12.16,30.1,9.71,10.7,59.0,shadowStone);
  box(6.45,12.48,-.6,9.82,10.75,.32,dark);

  // Track-facing upper hall and its close-spaced metal sunshades.
  box(34.26,11.85,-.64,42.0,10.95,.42,dark);
  for(let i=0;i<28;i++){
    const x=13.63+i*1.53;
    for(const [level,y,height] of [[0,8.07,2.72],[1,10.95,2.72],[2,14.61,4.14]]){
      box(x,y,-.90,1.40,height,.095,panes[(i+level)%panes.length]);
    }
  }
  box(34.42,11.99,-.97,42.82,.33,.25,slate);
  box(34.42,6.60,-.93,42.95,.44,.52,slate);
  for(let i=0;i<=40;i++){
    box(13.18+i*1.043,11.96,-1.15,.135,10.92,.42,fin);
  }
  box(46,10.8,-1.37,19.37,.29,.99,slate);
  box(50.15,7.45,-.95,10.97,.33,1.32,stone);
  for(let i=0;i<16;i++){
    box(55.75,14.7,3.2+3.87*i,.15,1.47,3.35,panel);
    box(55.7,10.81,3.2+3.87*i,.11,1.12,3.27,dark);
  }

  // Concrete-framed glazed west lobby, and the lower link to the old gym.
  for(let i=0;i<6;i++) for(let j=0;j<7;j++){
    box(2.3+i*1.62,1.85+j*2.13,-.85,1.48,1.99,.12,panes[(i+2*j)%panes.length]);
  }
  for(const y of [4.59,9.15,13.48]) box(6.48,y,-.93,9.82,.15,.19,slate);
  box(6.47,8.58,-1.02,12.71,.46,.68,stone);
  box(-4.40,3.15,23.55,9.1,6.31,47.68,shadowStone);
  box(-4.62,6.42,23.28,9.80,.53,48.02,stone);
  for(let i=0;i<6;i++){
    box(-8.83+i*1.6,4.09,-.72,1.42,2.77,.15,panes[i%panes.length]);
  }
  box(-15,4.1,29.8,26.7,2.86,9,shadowStone);
  box(-15,5.56,29.8,26.9,.35,9.3,roof);

  // Stepped terrace on the east side of the forecourt seen in the as-built view.
  box(42.3,1.22,-3.7,26.74,2.36,8.05,stone);
  for(let i=0;i<13;i++){
    box(46.8,.085+.17*i,-12.22+.55*i,16.6,.24,.65,stone);
  }
  for(let i=0;i<12;i++){
    box(53.48,2.36+.329*i,0.78+.50*i,3.7,.38,.63,slate);
  }
  for(const x of [38.61,54.98]){
    for(let i=0;i<7;i++) box(x,.65+.34*i,-12+.99*i,.078,1.06,.078,fin);
  }
  for(let i=0;i<12;i++) box(17.5+2.37*i,2.0,-.1,2.1,2.91,.18,panes[i%panes.length]);

  const template = new T.BoxGeometry(1,1,1);
  const transform = new T.Object3D();
  for(const [material,entries] of pieces) {
    const mesh=new T.InstancedMesh(template,material,entries.length);
    mesh.castShadow=material===slate||material===concrete||material===roof||material===stone;
    mesh.receiveShadow=true;
    mesh.userData.osm=activityCenterId;
    entries.forEach(({x,y,z,width,height,depth},i)=>{
      if(height<=0) throw new Error('Invalid activity center height');
      transform.position.set(x,y,z);
      transform.scale.set(width,height,depth);
      transform.updateMatrix();
      mesh.setMatrixAt(i,transform.matrix);
    });
    group.add(mesh);
  }
  const plantingExclusion=[[-10,-12.6],[58,-12.6],[58,68],[-10,68]].map(([x,z])=>world(x,z));
  return {group,top:frontGrade+18.23,pickables:group.children.slice(),plantingExclusion};
}
