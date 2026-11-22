import * as T from 'three';
import {addGableRoof} from './wenli-heritage.js';

const material = color=>new T.MeshLambertMaterial({color});
const white=material('#e8e7db');
const trim=material('#bfbeb3');
const concrete=material('#a8a090');
const redBrick=material('#985d4d');
const wood=material('#695143');
const dark=material('#403e36');
const glass=material('#61706b');
const lightGlass=material('#8b9890');
const clay=material('#9b6b51');
const paving=material('#b2a18b');
const shopAccent=material('#6c8b96');

function mesh(group,geometry,finish,x=0,y=0,z=0) {
  const part=new T.Mesh(geometry,finish);
  part.position.set(x,y,z);
  part.castShadow=part.receiveShadow=true;
  group.add(part);
  return part;
}

function box(group,x,y,z,width,height,depth,finish) {
  return mesh(group,new T.BoxGeometry(width,height,depth),finish,x,y,z);
}

function setup(item,height,angle=.3) {
  const group=new T.Group();
  group.position.set(item.x,height(item.x,item.z),item.z);
  group.rotation.y=-angle;
  const origin=new T.Vector2();
  const points=item.points.map(([x,z])=>new T.Vector2(x-item.x,z-item.z).rotateAround(origin,-angle));
  const base=Math.min(-.28,...item.points.map(([x,z])=>height(x,z)-group.position.y-.32));
  return {group,base,points};
}

function prism(group,points,bottom,top,finish) {
  const shape=new T.Shape(points.map(p=>new T.Vector2(p.x,-p.y)));
  const geometry=new T.ExtrudeGeometry(shape,{depth:top-bottom,bevelEnabled:false});
  geometry.rotateX(-Math.PI/2);
  return mesh(group,geometry,finish,0,bottom);
}

function rectangle(left,right,back,front) {
  return [[left,back],[right,back],[right,front],[left,front]].map(p=>new T.Vector2(...p));
}

function finishModel(item,group,top,pickables) {
  for (const part of pickables) part.userData.osm=item.osm;
  return {group,top:group.position.y+top,pickables};
}

function windowPanel(group,x,y,z,width,height,frame,glazing,mullions=0,transom=false) {
  box(group,x,y,z,width,height,.11,frame);
  const paneWidth=(width-.19)/(mullions+1);
  for (let pane=0;pane<=mullions;pane++) {
    const center=x-width/2+.095+(pane+.5)*paneWidth;
    box(group,center,y,z+.059,paneWidth-.068,height-.15,.022,glazing);
    if(transom) box(group,center,y+height*.26,z+.079,paneWidth,.043,.031,frame);
  }
}

// The dining hall outline also contains the convenience store bay.
function diningHall(item,height) {
  const {group,base,points}=setup(item,height,.279);
  const walls=prism(group,points,base,3.59,redBrick);
  const mainRoof=addGableRoof(group,rectangle(-14.0,15.55,-1.8,16.55),3.65,3.1,1.21,true);
  const rearRoof=addGableRoof(group,rectangle(-12.15,9.0,-21.05,-9.0),3.36,2.18,.83,true);
  box(group,-1.7,3.35,-5.45,4.1,.30,7.6,trim);
  // Deep eaves shade the tall dark framed glazing, with a recessed entrance in the middle.
  const y=.95;
  box(group,.8,.12,17.46,31,.28,2.5,concrete);
  box(group,.8,3.29,16.6,31,.34,.44,dark);
  for (const x of [-12.1,-7.95,-3.8,4.4,8.55,12.7]) {
    windowPanel(group,x,1.75,16.76,3.93,2.98,dark,glass,4,true);
  }
  windowPanel(group,.30,1.70,16.74,3.76,3.05,dark,dark,2,true);
  for (const x of [-14.4,-10,-5.45,-1.62,2.3,6.2,10.45,15.55]) {
    box(group,x,1.67,17.07,.27,3.28,.32,concrete);
  }
  const store=box(group,15.8,1.59,7.02,17.27,2.75,.13,dark);
  store.rotation.y=Math.PI/2;
  for(let i=0;i<8;i++){
    box(group,15.89,1.58,-.41+i*2.12,.07,2.53,1.96,lightGlass);
  }
  box(group,15.93,2.95,7, .10,.35,16.9,white);
  box(group,15.99,2.97,7, .045,.09,16.82,shopAccent);
  box(group,16.66,1.17,18,1.6,2.35,.21,white);
  box(group,16.66,2.01,18.12,1.27,.25,.04,shopAccent);
  // The brick plaza broadens toward the approach path.
  box(group,.65,-.04,20.0,28.2,.16,3.55,paving);
  const postY=y/2;
  for (const x of [-10,-5,0,5,10]) box(group,x,postY,21.2,.13,y,.13,trim);
  return finishModel(item,group,6.75,[walls,mainRoof,rearRoof,store]);
}

function terracottaScreen(group,left,right,bottom,top,z) {
  const rings=new T.InstancedMesh(new T.TorusGeometry(.116,.037,6,10),clay,Math.ceil((right-left)/.245)*Math.ceil((top-bottom)/.223));
  const transform=new T.Object3D();
  let index=0;
  for(let row=0,y=bottom+.123;y<top-.103;y+=.223,row++){
    for(let x=left+.135+(row%2)*.123;x<right-.106;x+=.245){
      transform.position.set(x,y,z);
      transform.updateMatrix();
      rings.setMatrixAt(index++,transform.matrix);
    }
  }
  rings.count=index;
  rings.castShadow=true;
  group.add(rings);
  for (let x=left;x<right+.02;x+=(right-left)/5) box(group,x,(bottom+top)/2,z-.06,.10,top-bottom,.24,trim);
}

function congdonHouse(item,height) {
  const {group,base}=setup(item,height,.31);
  const house=rectangle(-3.28,11.90,-7.66,7.92);
  const sideWing=rectangle(-12.42,-7.32,-9.1,8.48);
  const walls=prism(group,house,base,6.30,white);
  const roof=addGableRoof(group,house,6.32,1.82,.66,white);
  prism(group,sideWing,base,2.70,white);
  const wingRoof=new T.Group();
  wingRoof.rotation.y=Math.PI/2;
  wingRoof.position.x=-9.87;
  group.add(wingRoof);
  addGableRoof(wingRoof,rectangle(-8.5,9.11,-2.55,2.55),2.72,.88,.30,white);
  box(group,-5.3,1.21,.60,4.72,2.42,6.6,white);
  box(group,-5.2,2.50,.60,4.85,.24,6.78,trim);

  const front=7.99;
  box(group,4.3,3.25,front+.14,15.72,.33,.48,white);
  box(group,4.2,5.15,front-.015,15.05,1.94,.10,dark);
  terracottaScreen(group,-3.04,11.58,3.47,6.07,front+.37);
  box(group,4.25,6.13,front+.23,15.53,.26,.58,white);
  for(const x of [-1.2,2.4,6.2,9.85]) windowPanel(group,x,2.08,front+.045,2.86,1.71,wood,glass,2,true);
  windowPanel(group,4.43,1.13,front+.06,1.45,2.20,wood,dark,1);

  const back=new T.Group();
  back.rotation.y=Math.PI;
  group.add(back);
  for(const x of [-9.0,-2.1,1.5]) {
    windowPanel(back,x,1.8,7.84,2.65,1.68,wood,glass,2,true);
    windowPanel(back,x,4.87,7.90,1.16,1.64,wood,glass,1);
    box(back,x,4.05,8.08,1.43,.17,.65,white);
    terracottaScreen(back,x-.5,x+.5,4.14,5.40,8.43);
  }
  // The 2026 campus photos show the later garage removed and a low white enclosure.
  box(group,-12.7,1.12,-.03,.22,2.24,17.62,white);
  return finishModel(item,group,8.14,[walls,roof]);
}

function wesleyHouse(item,height) {
  const {group,base}=setup(item,height,.307);
  const wings=[
    {back:5.8,front:20.24,eave:3.36,rise:1.78,bottom:base},
    {back:-18.2,front:-5.15,eave:3.7,rise:1.63,bottom:base},
  ];
  const pickables=[];
  for (const {back,front,eave,rise,bottom} of wings) {
    const outline=rectangle(-14.67,14.50,back,front);
    pickables.push(prism(group,outline,bottom,eave-.02,white));
    pickables.push(addGableRoof(group,outline,eave,rise,.52,white));
    box(group,-.09,eave-.17,front+.105,29.2,.23,.32,trim);
    for(let bay=0;bay<10;bay++){
      const x=-13.19+2.86*bay;
      windowPanel(group,x,bay===4?1.51:eave-.95,front+.092,bay===4?1.86:2.28,
        bay===4?2.82:1.33,trim,bay===4?dark:glass,2,true);
      box(group,x+1.34,1.70,front+.14,.18,3.30,.29,white);
    }
    const backWindows=new T.Group();
    backWindows.rotation.y=Math.PI;
    group.add(backWindows);
    for(let bay=0;bay<10;bay++){
      const x=-13.2+2.86*bay;
      windowPanel(backWindows,x,eave-1.03,-back+.079,2.29,1.29,trim,glass,2,true);
      windowPanel(backWindows,x,eave-2.66,-back+.081,1.85,.72,trim,glass,2);
    }
  }
  // The narrow open court is visible between the white wings and their stepped connector.
  box(group,10.40,.98,.34,7.09,2.95,11.63,white);
  box(group,10.4,2.55,.43,7.38,.31,11.9,trim);
  box(group,-4.27,.07,.2,1.35,.18,12.6,concrete);
  box(group,8.0,.94,22.89,14.0,1.88,.22,white);
  box(group,1.0,.94,21.6,.22,1.88,2.8,white);
  for(let i=0;i<10;i++){
    box(group,3.60+i*.148,.91,23.09,.090,1.81+(i%3)*.15,.17,wood);
  }
  return finishModel(item,group,5.34,pickables);
}

export const livingLandmarks=new Map([
  ['w227111396',diningHall],
  ['w227124380',congdonHouse],
  ['w367762370',wesleyHouse],
]);
