import * as T from 'three';
import {places,zones} from './places.js';
import {makeWorld} from './scene.js';
import {fineArtsId} from './fine-arts.js';
import {provincialBuildingId} from './provincial-building.js';
import {activityCenterId} from './activity-center.js';
import {newDormIds} from './new-dorms.js';
import {applyCampusRevisions} from './campus-revisions.js';
import {facultyResidenceId} from './faculty-residence.js';
import {alumniBellId, wenliBoulevardId, wenliCourtyards} from './wenli-heritage.js';

const root=document.getElementById('tunghai-campus');
const el=selector=>root.querySelector(selector);
const {clamp}=T.MathUtils;
const select=el('#thu-destination');
const map=el('.thu-map');
const mapButtons=[...root.querySelectorAll('[data-action],[data-view]')];
const requestedPlace=places.find(p=>p.id===new URLSearchParams(window.location.search).get('place'));
let selected=places[0];
let navigate=()=>{};
const aerialLinks=new Map();

for (const [index,zone] of zones.entries()) {
  const group=document.createElement('optgroup');
  group.label=zone;
  for(const p of places.filter(p=>p.zone===index)){
    const item=document.createElement('option');
    item.value=p.id;
    item.textContent=p.name;
    group.append(item);
  }
  select.append(group);
}

function writeDetails(place) {
  selected=place;
  select.value=place.id;
  el('.thu-area').textContent=zones[place.zone];
  el('.thu-place').textContent=place.name;
  el('.thu-english').textContent=place.english;
  el('.thu-description').textContent=place.description;
  el('.thu-place-source').href=place.source;
  writeAerialLink(place);
}
function writeAerialLink(place) {
  const link=el('.thu-place-aerial');
  const href=aerialLinks.get(place.id);
  link.hidden=!href;
  if (href) link.href=href;
  else link.removeAttribute('href');
}
function choose(place,move=true){
  writeDetails(place);
  if(move) navigate(place);
  if(move && window.openai?.setWidgetState){
    window.openai.setWidgetState({modelContent:{地標:place.name},privateContent:{selected:place.id}}).catch(()=>{});
  }
}
select.addEventListener('change',()=>choose(places.find(p=>p.id===select.value)));
writeDetails(requestedPlace||places.find(p=>p.id===window.openai?.widgetState?.privateContent?.selected)||places[0]);
window.addEventListener('openai:set_globals',event=>{
  const saved=event.detail?.globals?.widgetState?.privateContent?.selected;
  const previous=places.find(p=>p.id===saved);
  if(previous) choose(previous,false);
});

async function openData() {
  const encoded=document.getElementById('thu-campus-data').textContent.trim();
  const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).json();
}

function init({geo:sourceGeo,terrain,chapel}) {
  const geo=applyCampusRevisions(sourceGeo);
  const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, 1.8));
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFShadowMap;
  const canvas=renderer.domElement;
  canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label','東海大學兩個教學區的立體地形、道路與建築');
  el('.thu-canvas').append(canvas);

  const scene=new T.Scene();
  scene.add(new T.HemisphereLight('#fff4df','#acb4a1',2.06));
  const sun=new T.DirectionalLight('#fff2d4',2.14);
  sun.position.set(-1500,2500,-1040);
  sun.castShadow=true;
  const shadow=sun.shadow;
  Object.assign(shadow.camera,{left:-1550,right:1550,top:1330,bottom:-1330,near:400,far:6300});
  shadow.mapSize.set(2048,2048);
  shadow.normalBias=2.5;
  shadow.bias=-.00028;
  scene.add(sun);
  const {height,board,byId,hits}=makeWorld(scene,geo,terrain,chapel);

  const coordinates=new Map([...geo.buildings,...geo.land,...geo.pois].map(f=>[f.osm,f]));
  const [originLon,originLat]=geo.origin;
  const metresPerDegreeLon=111320*Math.cos(originLat*Math.PI/180);
  for (const place of places) {
    const point=coordinates.get(place.id);
    if (!place.aerialHeight || !point) continue;
    const {aerialHeight}=place;
    const latitude=originLat-(point.z+aerialHeight*Math.tan(39.6*Math.PI/180))/110770;
    const longitude=originLon+point.x/metresPerDegreeLon;
    aerialLinks.set(place.id,`https://www.google.com/maps/@${latitude.toFixed(7)},${longitude.toFixed(7)},${aerialHeight}a,35y,39.6t/data=!3m1!1e3`);
  }
  writeAerialLink(selected);
  const markers=places.flatMap(place=>{
    const point=coordinates.get(place.id);
    if(!point) return [];
    const y=byId.get(place.id) ?? height(point.x,point.z)+8;
    const button=document.createElement('button');
    button.type='button';
    button.className='thu-marker btn';
    button.textContent=place.name;
    button.hidden=true;
    button.addEventListener('click',()=>choose(place));
    el('.thu-labels').append(button);
    return [{place,point,y,button}];
  });
  const ring=new T.Mesh(new T.RingGeometry(1,1.13,48),new T.MeshBasicMaterial({color:'#eabb50',side:T.DoubleSide,depthTest:true,transparent:true,opacity:.9}));
  ring.rotation.x=-Math.PI/2;
  ring.renderOrder=20;
  ring.visible=false;
  scene.add(ring);

  const camera=new T.OrthographicCamera(-1,1,1,-1,.1,12500);
  const ray=new T.Raycaster();
  const target=new T.Vector3();
  const tmp=new T.Vector3();
  const compass=el('.thu-compass i');
  const scaleBar=el('.thu-scale span');
  const scaleText=el('.thu-scale b');
  const help=el('.thu-help');
  const preferReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const orbit={az:.42,el:.91};
  const bird={az:0,el:Math.PI/2-.0008};
  let view='orbit';
  let widthPx=map.clientWidth,heightPx=map.clientHeight;
  let state={x:board.x,y:76,z:board.z,az:orbit.az,el:orbit.el,size:1};
  let tween=null, frame=0, overview=true, focusActive=false;
  const active=new Map();
  const detailedLandmarks = new Set([fineArtsId, provincialBuildingId, activityCenterId, facultyResidenceId,
    alumniBellId, wenliBoulevardId, ...newDormIds, ...wenliCourtyards.map(court=>court.id), ...aerialLinks.keys()]);
  const closeAngles = {
    w227101621:{az:.72,el:.49},
    [fineArtsId]:{az:1.03,el:.43},
    [provincialBuildingId]:{az:2.49,el:.48},
    [activityCenterId]:{az:2.76,el:.48},
    [facultyResidenceId]:{az:.14,el:.47},
    [alumniBellId]:{az:1.13,el:.34},
    [wenliBoulevardId]:{az:.03,el:.94},
    w368071581:{az:.34,el:.60},
    w368249647:{az:-.84,el:.74},
    w368071586:{az:2.62,el:.71},
    w368071570:{az:.34,el:.65},
    w368071571:{az:.34,el:.65},
    w368071585:{az:2.74,el:.65},
    w368304680:{az:2.74,el:.65},
    w367195923:{az:.95,el:.43},
    w367196899:{az:1.14,el:.62},
    w367195941:{az:.20,el:.49},
    w368066316:{az:1.50,el:.62},
    w368304652:{az:.40,el:.40},
    w368304658:{az:.55,el:.59},
    w227103239:{az:-2.75,el:.38},
    w227106503:{az:-1.22,el:.54},
    w227104642:{az:-1.25,el:.47},
    w1309048743:{az:-1.2,el:.46},
    w227111396:{az:.36,el:.49},
    w367193104:{az:1.1,el:.68},
    w227124380:{az:.14,el:.40},
    w367762370:{az:.24,el:.55},
    r5467507:{az:.04,el:.94},
    [newDormIds[0]]:{az:2.86,el:.50},
    [newDormIds[1]]:{az:2.86,el:.50},
  };

  function pageFit(angle) {
    const aspect=widthPx/Math.max(1,heightPx);
    const c=Math.abs(Math.cos(angle.az)), s=Math.abs(Math.sin(angle.az));
    const w=board.width*c+board.depth*s;
    const d=(board.width*s+board.depth*c)*Math.sin(angle.el)+175*Math.cos(angle.el);
    return Math.max(w/(aspect*.91),d/.84);
  }
  state.size=pageFit(orbit);
  function cameraConfig() {
    const aspect=widthPx/Math.max(1,heightPx);
    camera.left=-state.size*aspect/2;
    camera.right=-camera.left;
    camera.top=state.size/2;
    camera.bottom=-camera.top;
    target.set(state.x,state.y,state.z);
    const reach=4200;
    camera.position.set(state.x+Math.cos(state.el)*Math.sin(state.az)*reach,
      state.y+Math.sin(state.el)*reach,state.z+Math.cos(state.el)*Math.cos(state.az)*reach);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
  }
  function updateUI() {
    const northAngle=Math.atan2(Math.sin(state.az),Math.cos(state.az)*Math.sin(state.el));
    compass.style.transform='rotate('+(northAngle*180/Math.PI)+'deg)';
    const pxPerMetre=heightPx/state.size;
    const tick=[1,2,5,10,20,50,100,200,500,1000].findLast(i=>i*pxPerMetre<71)||1;
    scaleBar.style.width=(tick*pxPerMetre)+'px';
    scaleText.textContent=tick>=1000?(tick/1000)+' km':tick+' m';

    const markOrder=[...markers].sort((a,b)=>Number(b.place===selected)-Number(a.place===selected)||b.place.featured-a.place.featured);
    const shown=[];
    for(const marker of markOrder){
      const {place,point,button,y}=marker;
      const current=place===selected;
      tmp.set(point.x,y,point.z).project(camera);
      const x=(tmp.x*.5+.5)*widthPx, yPx=(.5-tmp.y*.5)*heightPx;
      const bw=place.name.length*12+21;
      const rect=[x-bw/2,yPx-29,x+bw/2,yPx+4];
      const inMap=rect[0]>6&&rect[1]>11&&rect[2]<widthPx-7&&rect[3]<heightPx-27;
      const behindControl=(rect[0]<56&&rect[1]<60)||(rect[2]>widthPx-55&&rect[3]>heightPx-150);
      const occupied=shown.some(o=>rect[0]<o[2]+4&&rect[1]<o[3]+3&&rect[2]+4>o[0]&&rect[3]+3>o[1]);
      const visible=inMap&&!behindControl&&!occupied&&(current||Boolean(place.featured)||state.size<520);
      button.hidden=!visible;
      button.classList.toggle('is-selected',current);
      button.setAttribute('aria-pressed',String(current));
      if(visible){
        button.style.left=x+'px';
        button.style.top=(yPx-4)+'px';
        shown.push(rect);
      }
    }
    const point=coordinates.get(selected.id);
    ring.visible=focusActive&&Boolean(point)&&!detailedLandmarks.has(selected.id)&&selected.id!=='r5467507';
    if(ring.visible){
      const radius=selected.id==='w227101621'?17:Math.min(44,Math.max(6,selected.width*.088));
      ring.position.set(point.x,height(point.x,point.z)+1.2,point.z);
      ring.scale.set(radius,radius,1);
    }
  }
  function render(time) {
    frame=0;
    if(tween){
      const t=Math.min(1,(time-tween.start)/tween.duration);
      const a=t*t*(3-2*t);
      for(const k of Object.keys(state)) state[k]=tween.from[k]+(tween.to[k]-tween.from[k])*a;
      if(t>=1) tween=null;
    }
    cameraConfig();
    updateUI();
    renderer.render(scene,camera);
    if(tween) requestDraw();
  }
  function requestDraw(){if(!frame) frame=requestAnimationFrame(render);}
  function go(values,duration=650){
    if(preferReduced||duration===0){
      tween=null;
      Object.assign(state,values);
    } else {
      tween={from:{...state},to:{...state,...values},start:performance.now(),duration};
    }
    requestDraw();
  }
  function updateViewButtons() {
    for(const button of root.querySelectorAll('[data-view]')){
      const pressed=button.dataset.view===view;
      button.setAttribute('aria-pressed',String(pressed));
      button.classList.toggle('btn-primary',pressed);
    }
    help.textContent=view==='top'?'拖曳平移 · 滾輪縮放':matchMedia('(pointer: coarse)').matches?'拖曳旋轉 · 雙指縮放和平移':'拖曳旋轉 · 滾輪縮放 · Shift＋拖曳平移';
  }
  function showOverview(){
    overview=true;
    focusActive=false;
    const angle=view==='top'?bird:orbit;
    go({x:board.x,y:76,z:board.z,size:pageFit(angle),...angle});
  }
  navigate=place=>{
    const point=coordinates.get(place.id);
    if(!point) return;
    overview=false;
    focusActive=true;
    const grade=height(point.x,point.z);
    const angle=view==='top'?bird:(closeAngles[place.id]??{az:.54,el:.72});
    go({x:point.x,y:grade+(byId.has(place.id)?6:0),z:point.z,size:place.width*Math.max(1,.92*heightPx/widthPx),...angle},920);
  };

  let focusedOnLoad=false;
  const resize=new ResizeObserver(()=>{
    widthPx=map.clientWidth;
    heightPx=map.clientHeight;
    renderer.setSize(Math.max(1,widthPx),Math.max(1,heightPx),false);
    if(requestedPlace&&!focusedOnLoad){
      focusedOnLoad=true;
      const point=coordinates.get(requestedPlace.id);
      if(point) navigate(requestedPlace);
    }
    if(overview) {
      if(tween){tween.to.size=pageFit(view==='top'?bird:orbit);}
      else {state.size=pageFit(view==='top'?bird:orbit);}
    }
    canvas.style.width='100%';
    canvas.style.height='100%';
    requestDraw();
  });
  resize.observe(map);

  function zoom(multiplier){
    overview=false;
    const size=clamp((tween?.to.size??state.size)*multiplier,52,Math.max(3300,pageFit(view==='top'?bird:orbit)*1.25));
    go({size},150);
  }
  function pan(dx,dy,parameters=state){
    const unit=parameters.size/heightPx;
    const c=Math.cos(state.az),s=Math.sin(state.az);
    const longitudinal=dy*unit/Math.max(.27,Math.sin(state.el));
    parameters.x=clamp(parameters.x-dx*unit*c-longitudinal*s,-1450,1120);
    parameters.z=clamp(parameters.z+dx*unit*s-longitudinal*c,-780,790);
  }
  function resetView(next){
    view=next;
    updateViewButtons();
    if(overview) showOverview();
    else{
      const angle=next==='top'?bird:orbit;
      go(angle,520);
    }
  }
  for(const button of mapButtons) button.addEventListener('click',()=>{
    switch(button.dataset.action){
      case 'in': zoom(.71); break;
      case 'out': zoom(1.41); break;
      case 'home': showOverview(); break;
      case 'focus': navigate(selected); break;
      default: resetView(button.dataset.view);
    }
  });
  canvas.addEventListener('wheel',event=>{
    event.preventDefault();
    zoom(Math.exp(clamp(event.deltaY*(event.deltaMode===1?15:1),-180,180)*.0023));
  },{passive:false});

  let moved=false;
  canvas.addEventListener('pointerdown',event=>{
    if(active.size===0) moved=false;
    if(event.button!==0&&event.button!==1&&event.button!==2) return;
    active.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,button:event.button});
    canvas.setPointerCapture(event.pointerId);
    if(active.size>1)moved=true;
  });
  canvas.addEventListener('pointermove',event=>{
    const previous=active.get(event.pointerId);
    if(!previous) return;
    const x=event.clientX,y=event.clientY;
    const dx=x-previous.x,dy=y-previous.y;
    if(Math.hypot(x-previous.startX,y-previous.startY)>4) moved=true;
    if(moved){
      tween=null;
      overview=false;
      if(active.size===2){
        const other=[...active.entries()].find(([id])=>id!==event.pointerId)[1];
        const oldDistance=Math.hypot(previous.x-other.x,previous.y-other.y);
        const distance=Math.hypot(x-other.x,y-other.y);
        if(distance>7&&oldDistance>7) state.size=clamp(state.size*oldDistance/distance,52,Math.max(3300,pageFit(view==='top'?bird:orbit)*1.25));
        pan(dx/2,dy/2);
      }else if(view==='top'||previous.button!==0||event.shiftKey){
        pan(dx,dy);
      }else{
        state.az-=dx*.008;
        state.az=Math.atan2(Math.sin(state.az),Math.cos(state.az));
        state.el=clamp(state.el+dy*.006,.22,Math.PI/2-.016);
      }
      requestDraw();
    }
    previous.x=x;previous.y=y;
  });
  function endPointer(event) {
    const wasActive=active.delete(event.pointerId);
    if(!wasActive||event.type!=='pointerup'||moved||event.button!==0) return;
    const bounds=canvas.getBoundingClientRect();
    ray.setFromCamera(new T.Vector2(2*(event.clientX-bounds.left)/bounds.width-1,1-2*(event.clientY-bounds.top)/bounds.height),camera);
    const hit=ray.intersectObjects(hits,false)[0];
    const place=hit&&places.find(p=>p.id===hit.object.userData.osm);
    if(place) choose(place);
  }
  canvas.addEventListener('pointerup',endPointer);
  canvas.addEventListener('lostpointercapture',endPointer);
  canvas.addEventListener('pointercancel',endPointer);
  canvas.addEventListener('contextmenu',event=>event.preventDefault());
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();
    el('.thu-error').hidden=false;
    mapButtons.forEach(button=>button.disabled=true);
  });
  canvas.addEventListener('webglcontextrestored',()=>{
    mapButtons.forEach(button=>button.disabled=false);
    el('.thu-error').hidden=true;
    renderer.shadowMap.needsUpdate=true;
    requestDraw();
  });

  updateViewButtons();
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.needsUpdate=true;
  root.dataset.ready='true';
  requestDraw();
}
openData().then(init).catch(error=>{
  console.error(error);
  el('.thu-error').hidden=false;
  mapButtons.forEach(button=>button.disabled=true);
  root.dataset.ready='error';
});
