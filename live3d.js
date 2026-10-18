/* ═══ แผนที่ 3 มิติ "ช่างกำลังมา" ═══
   MapLibre = แผนที่เวกเตอร์ เอียงมุมมอง มีตึก 3 มิติ · three.js = รถช่าง ลำแสงจุดหมาย เส้นโค้งเรืองแสง
   (วาดลงภาพเดียวกับแผนที่ ใช้ความลึกร่วมกัน ตึกบังรถได้จริง)
   ไลบรารีทั้งสองอยู่ในเว็บเราเอง (vendor/) · แผ่นแผนที่จาก OpenFreeMap (ฟรี ไม่ใช้คีย์ ไม่ตั้งคุกกี้) — โหลดไม่ได้ใช้แผ่น OSM แทน
   ไม่ส่งข้อมูลเพิ่ม: ตำแหน่งช่างมาจาก API เดิมของเรา · เส้นที่รถวิ่งผ่านจำไว้ในหน้าจอนี้เท่านั้น ปิดแล้วหาย
   เครื่องไม่มี WebGL / โหลดไม่ขึ้น → mount() โยน error ให้ index.html กลับไปใช้แผนที่ 2 มิติเดิม (Leaflet) */
import * as THREE from './vendor/three-0.160.0.module.min.js';

const ML='/vendor/maplibre-gl-4.7.1',STYLE='https://tiles.openfreemap.org/styles/liberty';
const BRAND=0xE8943C;
/* สีแผนที่สองธีม — โทนหมึก + ส้มของแอป (ถนนสายหลักอมส้ม ที่เหลือเงียบ ๆ ให้รถกับลำแสงเด่น) */
const PAL={
  light:{bg:'#efebe4',land:'#e8e3da',green:'#dde6d3',water:'#b9d1de',road:'#ffffff',major:'#ffd8ad',casing:'#d6cec2',rail:'#c9c1b5',bld:'#e2dbd0',text:'#57534d',halo:'#f7f4ef',
    sky:'#cfe1ef',horizon:'#f6e7d5',fog:'#efe9e0',add:false,arc:[0xE8943C,0xd9480f],beam:0xffa94d},
  dark:{bg:'#0d0e11',land:'#121317',green:'#111813',water:'#08161f',road:'#23252c',major:'#4d331d',casing:'#08090b',rail:'#25272d',bld:'#1c1e24',text:'#9496a0',halo:'#0a0b0e',
    sky:'#04050a',horizon:'#21160d',fog:'#0d0e11',add:true,arc:[0xffb25e,0xfff1dc],beam:0xffc078}};
const SKY=P=>({'sky-color':P.sky,'horizon-color':P.horizon,'fog-color':P.fog,'sky-horizon-blend':.55,'horizon-fog-blend':.65,'fog-ground-blend':.3,'atmosphere-blend':0});
const EXT=P=>({'fill-extrusion-color':P.bld,'fill-extrusion-opacity':.92,'fill-extrusion-vertical-gradient':true,
  /* ตึกค่อย ๆ งอกขึ้นตอนซูมเข้า */
  'fill-extrusion-height':['interpolate',['linear'],['zoom'],13,0,14.3,['coalesce',['get','render_height'],8]],
  'fill-extrusion-base':['interpolate',['linear'],['zoom'],13,0,14.3,['coalesce',['get','render_min_height'],0]]});

let lib=null,raw=null;
function loadLib(){
  if(lib)return lib;
  return lib=new Promise((ok,no)=>{
    if(window.maplibregl)return ok(window.maplibregl);
    if(!document.querySelector(`link[href="${ML}.css"]`)){const c=document.createElement('link');c.rel='stylesheet';c.href=ML+'.css';document.head.appendChild(c)}
    const s=document.createElement('script');s.src=ML+'.js';
    s.onload=()=>window.maplibregl?ok(window.maplibregl):no(Error('maplibre'));
    s.onerror=()=>{lib=null;no(Error('maplibre'))};document.head.appendChild(s);
  });
}
export function supported(){
  try{const c=document.createElement('canvas'),gl=c.getContext('webgl2')||c.getContext('webgl');if(!gl)return false;
    const x=gl.getExtension('WEBGL_lose_context');x&&x.loseContext();return true}catch(e){return false}
}
/* ทาสีสไตล์ liberty ใหม่ตามชนิดข้อมูล (source-layer ตามมาตรฐาน OpenMapTiles) · ตัดป้ายร้านค้า/เลขบ้าน ให้แผนที่โล่ง */
function restyle(src,P){
  const s=JSON.parse(JSON.stringify(src)),vec=Object.keys(s.sources||{}).find(k=>s.sources[k].type==='vector');
  const drop=new Set(['poi','housenumber','aerodrome_label','mountain_peak','park']);
  s.layers=(s.layers||[]).filter(l=>!(l.type==='symbol'&&drop.has(l['source-layer'])));
  let ext=false;
  for(const l of s.layers){
    const sl=l['source-layer']||'',id=l.id||'',p=l.paint=l.paint||{};
    if(l.type==='background')p['background-color']=P.bg;
    else if(l.type==='fill'){
      delete p['fill-pattern'];delete p['fill-outline-color'];
      p['fill-color']=sl==='water'?P.water:sl==='building'?P.bld:(sl==='landcover'||sl==='park'||/park|wood|grass|forest/.test(id))?P.green:P.land;
    }else if(l.type==='line'){
      delete p['line-pattern'];
      p['line-color']=sl==='waterway'?P.water:sl==='transportation'?(/rail|transit/.test(id)?P.rail:/casing/.test(id)?P.casing:/motorway|trunk|primary/.test(id)?P.major:P.road):sl==='building'?P.bld:P.rail;
    }else if(l.type==='fill-extrusion'){ext=true;Object.assign(p,EXT(P))}
    else if(l.type==='symbol'){
      const y=l.layout=l.layout||{};
      if(y['text-field']){p['text-color']=P.text;p['text-halo-color']=P.halo;p['text-halo-width']=1.2}
      if(/oneway|shield/.test(id)||(sl==='transportation_name'&&y['icon-image']))y.visibility='none';
    }
  }
  if(!ext&&vec){const at=s.layers.findIndex(l=>l.type==='symbol');s.layers.splice(at<0?s.layers.length:at,0,{id:'cd-bld3d',type:'fill-extrusion',source:vec,'source-layer':'building',minzoom:13,paint:EXT(P)})}
  s.sky=SKY(P);s.light={anchor:'viewport',color:'#ffffff',intensity:.38,position:[1.3,200,35]};
  return s;
}
const rasterStyle=(P,dark)=>({version:8,sky:SKY(P),
  sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:'© OpenStreetMap contributors'}},
  layers:[{id:'bg',type:'background',paint:{'background-color':P.bg}},{id:'osm',type:'raster',source:'osm',paint:dark?{'raster-brightness-max':.4,'raster-saturation':-.75,'raster-contrast':.15}:{'raster-saturation':-.35}}]});
async function styleFor(dark){
  const P=dark?PAL.dark:PAL.light;
  try{
    if(!raw){const ac=new AbortController(),t=setTimeout(()=>ac.abort(),4500);
      try{const r=await fetch(STYLE,{signal:ac.signal});if(!r.ok)throw Error(r.status);raw=await r.json()}finally{clearTimeout(t)}}
    return restyle(raw,P);
  }catch(e){return rasterStyle(P,dark)}
}

/* ── ชิ้นงาน 3 มิติ (หน่วย = เมตร · x ตะวันออก · y เหนือ · z ขึ้นฟ้า) ── */
function radial(stops,size=128){
  const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'),r=g.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
  stops.forEach(([o,col])=>r.addColorStop(o,col));g.fillStyle=r;g.fillRect(0,0,size,size);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
/* แผ่นเรียบบนพื้น (เงา/แสงใต้ท้องรถ/วงคลื่น) */
const decal=(w,h,map,add,op=1)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map,transparent:true,opacity:op,depthWrite:false,blending:add?THREE.AdditiveBlending:THREE.NormalBlending}));m.frustumCulled=false;return m};
/* รถช่างแบบของเล่น โพลีกลม ๆ น่ารัก (ยาว ~4 เมตร) — ตัวถังมนอ้วน ห้องโดยสารฟองแก้ว ล้อโต ไฟหน้ากลมเหมือนตา
   ผิวด้านแบบพลาสติก (flatShading = เห็นเหลี่ยมโพลีจาง ๆ) · ไฟอำพันบนหลังคา = รถช่าง */
function carModel(){
  const g=new THREE.Group(),inner=new THREE.Group();g.add(inner);
  const mat=(color,o={})=>new THREE.MeshStandardMaterial({color,roughness:.55,metalness:0,flatShading:true,...o});
  const paint=mat(BRAND),cream=mat(0xfff4e6),ink=mat(0x1d1e24,{roughness:.8}),glass=mat(0x34557c,{roughness:.18,metalness:.05});
  const add=(geo,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.frustumCulled=false;inner.add(o);return o};
  /* ตัวถัง: สี่เหลี่ยมมุมมน (ด้านข้าง) รีดเป็นความกว้าง ขอบลบมนใหญ่ ๆ */
  const sh=new THREE.Shape(),L=1.55,B=.38,T=1.04,r=.34;
  sh.moveTo(-L+r,B);sh.lineTo(L-r,B);sh.quadraticCurveTo(L,B,L,B+r);sh.lineTo(L,T-r);sh.quadraticCurveTo(L,T,L-r,T);sh.lineTo(-L+r,T);sh.quadraticCurveTo(-L,T,-L,T-r);sh.lineTo(-L,B+r);sh.quadraticCurveTo(-L,B,-L+r,B);
  const bodyG=new THREE.ExtrudeGeometry(sh,{depth:1.42,bevelEnabled:true,bevelSize:.24,bevelThickness:.26,bevelSegments:2,curveSegments:3});
  bodyG.applyMatrix4(new THREE.Matrix4().set(0,0,1,-.71, 1,0,0,0, 0,1,0,0, 0,0,0,1));
  add(bodyG,paint);
  /* ห้องโดยสารฟองแก้ว + หลังคาครีม */
  const dome=new THREE.SphereGeometry(1,10,6,0,Math.PI*2,0,Math.PI/2);dome.rotateX(Math.PI/2);
  add(dome,glass,0,-.24,1.12).scale.set(.84,1.04,.86);
  add(dome,cream,0,-.28,1.78).scale.set(.46,.56,.2);
  /* ล้อโต ๆ + ดุมสีครีม */
  const tyre=new THREE.CylinderGeometry(.5,.5,.42,10);tyre.rotateZ(Math.PI/2);
  const hub=new THREE.CylinderGeometry(.24,.24,.46,6);hub.rotateZ(Math.PI/2);
  for(const [x,y] of [[.96,1.05],[-.96,1.05],[.96,-1.08],[-.96,-1.08]]){add(tyre,ink,x,y,.5);add(hub,cream,x,y,.5)}
  /* ไฟหน้ากลมเหมือนตา · ไฟท้ายแดง · กันชนแคปซูล */
  const eye=new THREE.SphereGeometry(.21,10,8),head=new THREE.MeshBasicMaterial({color:0xfffbea}),tail=new THREE.MeshBasicMaterial({color:0xff3b30});
  for(const s of [-1,1]){add(eye,head,s*.5,1.8,.78).scale.set(1,.45,1);add(eye,tail,s*.56,-1.82,.8).scale.set(.75,.35,.6)}
  const bump=new THREE.CapsuleGeometry(.13,1.5,3,8);bump.rotateZ(Math.PI/2);
  add(bump,ink,0,1.92,.42);add(bump,ink,0,-1.92,.42);
  /* ไฟไซเรนอำพันกลม ๆ บนหลังคา */
  const amb=[new THREE.MeshBasicMaterial({color:0xffb020}),new THREE.MeshBasicMaterial({color:0xffb020})];
  const bulb=new THREE.SphereGeometry(.15,8,6,0,Math.PI*2,0,Math.PI/2);bulb.rotateX(Math.PI/2);
  add(bulb,amb[0],-.15,-.28,1.92);add(bulb,amb[1],.15,-.28,1.92);
  const shadow=decal(3.2,5.2,radial([[0,'rgba(0,0,0,.5)'],[.6,'rgba(0,0,0,.22)'],[1,'rgba(0,0,0,0)']]),false);shadow.position.z=.03;g.add(shadow);
  const glow=decal(6.5,8,radial([[0,'rgba(255,160,70,.75)'],[.45,'rgba(232,148,60,.28)'],[1,'rgba(232,148,60,0)']]),true);glow.position.z=.05;g.add(glow);
  g.userData={paint,amb,glow,inner};return g;
}
/* หมุดจุดหมาย: หัวกลมขาว + แหวนส้มเรืองแสง ลอยขึ้นลงช้า ๆ */
function pinModel(){
  const g=new THREE.Group(),white=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:.35,roughness:.35});
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.62,32,20),white);ball.position.z=2.25;
  const cone=new THREE.Mesh(new THREE.ConeGeometry(.5,1.5,32),white);cone.rotation.x=-Math.PI/2;cone.position.z=1.3;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.92,.07,12,48),new THREE.MeshBasicMaterial({color:0xffa94d}));ring.position.z=2.25;
  [ball,cone,ring].forEach(m=>{m.frustumCulled=false;g.add(m)});g.userData={ring};return g;
}
/* ลำแสงตั้งตรงที่จุดหมาย — มองเห็นได้จากไกล ๆ แม้ซูมออก */
function beamModel(color){
  const geo=new THREE.CylinderGeometry(1,1,1,40,1,true);geo.rotateX(Math.PI/2);geo.translate(0,0,.5);
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    uniforms:{uC:{value:new THREE.Color(color)},uT:{value:0}},
    vertexShader:'varying float vH;varying vec3 vN;varying vec3 vP;void main(){vH=position.z;vN=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);vP=p.xyz;gl_Position=projectionMatrix*p;}',
    fragmentShader:'uniform vec3 uC;uniform float uT;varying float vH;varying vec3 vN;varying vec3 vP;void main(){float f=pow(1.-vH,1.8);float s=.75+.25*sin(vH*40.-uT*6.);gl_FragColor=vec4(uC*s,f*.55);}'});
  const m=new THREE.Mesh(geo,mat);m.frustumCulled=false;return m;
}
const ringGeo=new THREE.RingGeometry(.86,1,72);
function ripple(color,add){const m=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color,transparent:true,depthWrite:false,blending:add?THREE.AdditiveBlending:THREE.NormalBlending}));m.frustumCulled=false;return m}
/* เส้นโค้งจากรถไปจุดหมาย — คำนวณรูปโค้งในการ์ดจอทุกเฟรม (ไม่สร้างรูปทรงใหม่ตอนรถขยับ) · ขีดแสงไหลไปทางจุดหมาย */
function arcGeo(S=140,R=10){
  const n=(S+1)*R,t=new Float32Array(n),a=new Float32Array(n),idx=[];
  for(let i=0;i<=S;i++)for(let j=0;j<R;j++){t[i*R+j]=i/S;a[i*R+j]=j/R*Math.PI*2}
  for(let i=0;i<S;i++)for(let j=0;j<R;j++){const p=i*R+j,q=i*R+(j+1)%R;idx.push(p,p+R,q,q,p+R,q+R)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(n*3),3));
  g.setAttribute('aT',new THREE.BufferAttribute(t,1));g.setAttribute('aA',new THREE.BufferAttribute(a,1));g.setIndex(idx);return g;
}
function arcMat(c1,c2,add,opacity){
  return new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:add?THREE.AdditiveBlending:THREE.NormalBlending,
    uniforms:{uA:{value:new THREE.Vector3()},uB:{value:new THREE.Vector3()},uH:{value:0},uR:{value:1},uT:{value:0},uL:{value:10},uO:{value:opacity},uC1:{value:new THREE.Color(c1)},uC2:{value:new THREE.Color(c2)}},
    vertexShader:`uniform vec3 uA;uniform vec3 uB;uniform float uH;uniform float uR;attribute float aT;attribute float aA;varying float vT;
      void main(){vec3 c=(uA+uB)*.5+vec3(0.,0.,uH);float t=aT,u=1.-t;vec3 p=u*u*uA+2.*u*t*c+t*t*uB;
        vec3 tg=2.*u*(c-uA)+2.*t*(uB-c);tg=length(tg)>1e-4?normalize(tg):vec3(0.,1.,0.);
        vec3 n=cross(tg,vec3(0.,0.,1.));n=length(n)>1e-4?normalize(n):vec3(1.,0.,0.);vec3 b=cross(n,tg);
        p+=(cos(aA)*n+sin(aA)*b)*uR;vT=t;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform float uT;uniform float uL;uniform float uO;uniform vec3 uC1;uniform vec3 uC2;varying float vT;
      void main(){float d=fract(vT*uL-uT*1.3);float a=smoothstep(0.,.18,d)*smoothstep(.7,.42,d);
        float e=smoothstep(0.,.05,vT)*smoothstep(1.,.95,vT);vec3 col=mix(uC1,uC2,vT);
        gl_FragColor=vec4(col*(.55+a*.9),(.3+a*.7)*e*uO);}`});
}
/* แสงสะท้อนบนตัวถัง: ท้องฟ้าสว่างด้านบน ขอบฟ้าอุ่น พื้นมืด (แกนตั้งของฉากนี้คือ z) */
function envMap(renderer){
  const sc=new THREE.Scene(),geo=new THREE.SphereGeometry(10,32,16),p=geo.attributes.position,col=[];
  const top=new THREE.Color(0xffffff),mid=new THREE.Color(0xffd2a1),bot=new THREE.Color(0x1b1c21);
  for(let i=0;i<p.count;i++){const z=p.getZ(i)/10,c=z>0?mid.clone().lerp(top,z):mid.clone().lerp(bot,Math.min(1,-z*1.6));col.push(c.r,c.g,c.b)}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  sc.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
  const pm=new THREE.PMREMGenerator(renderer),rt=pm.fromScene(sc,.03);pm.dispose();return rt.texture;
}

const R2D=180/Math.PI,D2R=Math.PI/180;
const kmBetween=(a,b)=>{const x=(b.lat-a.lat)*D2R,y=(b.lng-a.lng)*D2R,q=Math.sin(x/2)**2+Math.cos(a.lat*D2R)*Math.cos(b.lat*D2R)*Math.sin(y/2)**2;return 12742*Math.atan2(Math.sqrt(q),Math.sqrt(1-q))};
const bearing=(a,b)=>{const y=Math.sin((b.lng-a.lng)*D2R)*Math.cos(b.lat*D2R),x=Math.cos(a.lat*D2R)*Math.sin(b.lat*D2R)-Math.sin(a.lat*D2R)*Math.cos(b.lat*D2R)*Math.cos((b.lng-a.lng)*D2R);return (Math.atan2(y,x)*R2D+360)%360};
const angDiff=(a,b)=>Math.abs(((b-a+540)%360)-180);
const lerpAng=(a,b,k)=>a+((((b-a)%360)+540)%360-180)*k;

const CSS=`.lv.d3 .lv-map{height:clamp(270px,48vh,380px);position:relative}
.lv.d3 .maplibregl-canvas{outline:0}
.lv3-ui{position:absolute;inset:0;pointer-events:none;z-index:2}
.lv3-live{position:absolute;top:12px;left:12px;display:flex;align-items:center;gap:7px;padding:6px 11px 6px 9px;border-radius:999px;background:rgba(12,13,16,.72);color:#fff;font:600 11px/1 var(--kd,inherit);letter-spacing:.12em;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.lv3-live i{width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 0 rgba(34,197,94,.7);animation:lv3p 1.6s infinite}
.lv.stale .lv3-live i,.lv.wait .lv3-live i{background:#f59e0b;animation:none}
@keyframes lv3p{70%{box-shadow:0 0 0 8px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}
.lv3-btns{position:absolute;top:10px;right:10px;display:flex;flex-direction:column;gap:8px;pointer-events:auto}
.lv3-btns button{width:40px;height:40px;border-radius:13px;border:0;display:grid;place-items:center;background:rgba(255,255,255,.9);color:#16171b;font-size:19px;box-shadow:0 6px 18px rgba(0,0,0,.18);cursor:pointer;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
html[data-theme="dark"] .lv3-btns button{background:rgba(26,27,32,.86);color:#f4f4f5}
.lv3-btns [data-k="re"][hidden]{display:none}
.lv3-tag{padding:6px 11px;border-radius:12px;background:#16171b;color:#fff;font:600 13px/1 var(--kd,inherit);white-space:nowrap;box-shadow:0 8px 22px rgba(0,0,0,.3);pointer-events:none}
.lv3-tag::after{content:"";position:absolute;left:50%;bottom:-5px;width:10px;height:10px;background:inherit;transform:translateX(-50%) rotate(45deg);border-radius:2px}
.lv3-tag:empty{display:none}
html[data-theme="dark"] .lv3-tag{background:#E8943C;color:#16171b}
.lv.lv-full{position:fixed;inset:0;z-index:9600;margin:0;border-radius:0;display:flex;flex-direction:column;padding-bottom:env(safe-area-inset-bottom)}
.lv.lv-full .lv-map{flex:1;height:auto}
.lv.lv-full .lv3-btns{top:calc(10px + env(safe-area-inset-top))}.lv.lv-full .lv3-live{top:calc(12px + env(safe-area-inset-top))}
.lv.d3 .maplibregl-ctrl-attrib{font-size:10px}
.lv.d3 .maplibregl-ctrl-bottom-right{z-index:3}`;

/* el = กล่อง .lv-map · opt: {dest, dark, L:{recenter,expand,shrink,gesture}} · คืนตัวควบคุม {update, destroy} */
export async function mount(el,opt={}){
  if(!supported())throw Error('webgl');
  const maplibregl=await loadLib(),dark=!!opt.dark,P=dark?PAL.dark:PAL.light,L=opt.L||{},card=el.closest('.lv')||el;
  if(!document.getElementById('lv3css')){const st=document.createElement('style');st.id='lv3css';st.textContent=CSS;document.head.appendChild(st)}
  const style=await styleFor(dark);
  let dest=opt.dest&&Number.isFinite(opt.dest.lat)?{lat:+opt.dest.lat,lng:+opt.dest.lng}:null;
  const home=dest||{lat:13.7563,lng:100.5018};
  card.classList.add('d3');
  const map=new maplibregl.Map({container:el,style,center:[home.lng,home.lat],zoom:dest?15.4:11,pitch:52,bearing:-18,maxPitch:72,
    attributionControl:false,antialias:(devicePixelRatio||1)<2,pixelRatio:Math.min(devicePixelRatio||1,2),fadeDuration:0,cooperativeGestures:true,
    locale:{'CooperativeGesturesHandler.MobileHelpText':L.gesture||'Use two fingers to move the map','CooperativeGesturesHandler.WindowsHelpText':L.gesture||'Use Ctrl + scroll to zoom the map','CooperativeGesturesHandler.MacHelpText':L.gesture||'Use ⌘ + scroll to zoom the map'}});
  map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
  let dead=false;
  try{
    await new Promise((ok,no)=>{const t=setTimeout(()=>no(Error('timeout')),12000);map.once('load',()=>{clearTimeout(t);ok()});
      map.on('error',e=>{if(!map.isStyleLoaded()&&e&&e.error&&/style|webgl/i.test(String(e.error.message||''))){clearTimeout(t);no(e.error)}})});
  }catch(e){try{map.remove()}catch(_){}card.classList.remove('d3');throw e}

  /* ── สถานะ ── */
  const S={car:null,from:null,to:null,t0:0,dur:1,head:0,headTo:0,stale:false,trail:[],auto:true,camB:null,intro:true,vis:true,last:0};
  const low=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=3;
  const origin=maplibregl.MercatorCoordinate.fromLngLat([home.lng,home.lat],0),unit=origin.meterInMercatorCoordinateUnits();
  const toM=p=>{const m=maplibregl.MercatorCoordinate.fromLngLat([p.lng,p.lat],0);return new THREE.Vector3((m.x-origin.x)/unit,-(m.y-origin.y)/unit,0)};
  const mpp=()=>40075016.686*Math.cos(map.getCenter().lat*D2R)/(512*2**map.getZoom());

  /* ── ฉาก three.js ── */
  const scene=new THREE.Scene(),camera=new THREE.Camera();
  const sky=new THREE.HemisphereLight(0xffffff,0x3a3530,1.4);sky.position.set(0,0,1);scene.add(sky);
  const sun=new THREE.DirectionalLight(0xffffff,2.4);sun.position.set(-40,-60,90);scene.add(sun);
  const car=carModel();car.visible=false;scene.add(car);
  const carRip=[ripple(BRAND,P.add),ripple(BRAND,P.add)];carRip.forEach(r=>scene.add(r));
  const pin=pinModel(),beam=beamModel(P.beam),destRip=[ripple(P.beam,P.add),ripple(P.beam,P.add),ripple(P.beam,P.add)];
  const destG=new THREE.Group();destG.add(pin,beam,...destRip);destG.visible=!!dest;scene.add(destG);
  if(dest)destG.position.copy(toM(dest));
  /* เส้นโค้งลอยฟ้า + แสงฟุ้งรอบเส้น + เงาของเส้นบนพื้น (ช่วยให้กะระยะสูงต่ำได้) */
  const ag=arcGeo(),arcCore=new THREE.Mesh(ag,arcMat(P.arc[0],P.arc[1],P.add,1)),arcGlow=new THREE.Mesh(ag,arcMat(P.arc[0],P.arc[1],true,.28));
  const arcShadow=new THREE.Mesh(ag,dark?arcMat(0xffa94d,0xffa94d,true,.18):arcMat(0x000000,0x000000,false,.16));
  [arcCore,arcGlow,arcShadow].forEach(m=>{m.frustumCulled=false;m.visible=false;scene.add(m)});

  let renderer=null;
  const clock=new THREE.Clock();
  map.addLayer({id:'cd-3d',type:'custom',renderingMode:'3d',
    onAdd(m,gl){renderer=new THREE.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:true});renderer.autoClear=false},
    render(gl,args){
      if(!renderer)return;
      renderer.resetState();
      if(!scene.environment)try{scene.environment=envMap(renderer)}catch(e){scene.environment=new THREE.Texture()}
      frame(clock.getElapsedTime());
      const mm=args&&args.defaultProjectionData?args.defaultProjectionData.mainMatrix:args;
      camera.projectionMatrix=new THREE.Matrix4().fromArray(mm).multiply(new THREE.Matrix4().makeTranslation(origin.x,origin.y,origin.z).scale(new THREE.Vector3(unit,-unit,unit)));
      renderer.resetState();renderer.setViewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);renderer.render(scene,camera);
      if(S.vis&&!dead){if(low)setTimeout(()=>!dead&&map.triggerRepaint(),28);else map.triggerRepaint()}
    }});

  /* เส้นที่รถวิ่งผ่านมา (จำเฉพาะในหน้านี้) วาดบนพื้นใต้ตึก */
  const under=(map.getStyle().layers.find(l=>l.type==='fill-extrusion')||{}).id||'cd-3d';
  map.addSource('cd-trail',{type:'geojson',lineMetrics:true,data:{type:'FeatureCollection',features:[]}});
  map.addLayer({id:'cd-trail',type:'line',source:'cd-trail',layout:{'line-cap':'round','line-join':'round'},
    paint:{'line-width':['interpolate',['linear'],['zoom'],12,3,17,8],'line-blur':.6,'line-gradient':['interpolate',['linear'],['line-progress'],0,'rgba(232,148,60,0)',1,'rgba(232,148,60,.95)']}},under);

  /* ป้ายเวลาถึงลอยเหนือรถ */
  const tag=document.createElement('div');tag.className='lv3-tag';
  const tagM=new maplibregl.Marker({element:tag,anchor:'bottom',offset:[0,-40]});

  /* ปุ่มบนแผนที่: กลับมาที่ช่าง · ขยายเต็มจอ */
  const ui=document.createElement('div');ui.className='lv3-ui';
  ui.innerHTML=`<span class="lv3-live"><i></i>LIVE</span><div class="lv3-btns"><button type="button" data-k="full" aria-label="${L.expand||'Expand'}"><i class="ti ti-arrows-maximize"></i></button><button type="button" data-k="re" hidden aria-label="${L.recenter||'Recenter'}"><i class="ti ti-focus-2"></i></button></div>`;
  el.appendChild(ui);
  const reBtn=ui.querySelector('[data-k="re"]'),fullBtn=ui.querySelector('[data-k="full"]');
  const manual=e=>{if(e&&e.originalEvent&&S.auto){S.auto=false;reBtn.hidden=false}};
  ['dragstart','rotatestart','pitchstart','zoomstart'].forEach(k=>map.on(k,manual));
  reBtn.onclick=()=>{S.auto=true;reBtn.hidden=true;fit(true)};
  let spot=null;
  const full=on=>{
    if(on===card.classList.contains('lv-full'))return;
    if(on){spot=document.createComment('lv');card.before(spot);document.body.appendChild(card);card.classList.add('lv-full');map.cooperativeGestures.disable();document.documentElement.style.overflow='hidden'}
    else{card.classList.remove('lv-full');document.documentElement.style.overflow='';map.cooperativeGestures.enable();if(spot&&spot.isConnected)spot.replaceWith(card);else card.remove();spot=null}
    fullBtn.innerHTML=`<i class="ti ${on?'ti-arrows-minimize':'ti-arrows-maximize'}"></i>`;fullBtn.setAttribute('aria-label',on?(L.shrink||'Close'):(L.expand||'Expand'));
    setTimeout(()=>{map.resize();fit(true)},60);
  };
  fullBtn.onclick=()=>full(!card.classList.contains('lv-full'));
  const esc=e=>{if(e.key==='Escape')full(false)};addEventListener('keydown',esc);

  /* หยุดวาดตอนแผนที่เลื่อนพ้นจอ (ประหยัดแบต) */
  const io=new IntersectionObserver(([e])=>{S.vis=e.isIntersecting;if(S.vis)map.triggerRepaint()});io.observe(el);
  /* ระหว่างรอตำแหน่งแรก: กล้องหมุนรอบจุดหมายช้า ๆ เหมือนเรดาร์กำลังค้นหา */
  const orbit=()=>{if(dead||S.car)return;if(S.auto&&S.vis&&!map.isMoving())map.setBearing(map.getBearing()+.06);requestAnimationFrame(orbit)};requestAnimationFrame(orbit);

  /* ── กล้อง: รถอยู่ใกล้ จุดหมายอยู่ไกลสุดเส้นโค้ง (มองตามทางที่ช่างกำลังมา) ── */
  function fit(anim){
    const c=S.car;if(!c)return;
    const pad={top:Math.min(90,el.clientHeight*.24),bottom:Math.min(70,el.clientHeight*.18),left:46,right:46};
    if(dest&&kmBetween(c,dest)>.06){
      /* มองเฉียง ~30° จากแนวทาง เห็นรถด้านข้างครึ่งหนึ่งและเห็นความโค้งของเส้น (ไม่ใช่มองตรงจากท้ายรถ) */
      const b=(bearing(c,dest)+32)%360;if(S.camB==null||angDiff(S.camB,b)>28)S.camB=b;
      const cam=map.cameraForBounds([[Math.min(c.lng,dest.lng),Math.min(c.lat,dest.lat)],[Math.max(c.lng,dest.lng),Math.max(c.lat,dest.lat)]],{padding:pad,bearing:S.camB});
      if(!cam)return;
      const to={center:cam.center,zoom:Math.min(17.4,cam.zoom-.45),bearing:S.camB,pitch:58};
      if(S.intro){S.intro=false;map.flyTo({...to,duration:2600,curve:1.6,essential:true})}else map.easeTo({...to,duration:anim?1500:0,essential:true});
    }else{
      const to={center:[c.lng,c.lat],zoom:16.8,pitch:60,bearing:map.getBearing()};
      if(S.intro){S.intro=false;map.flyTo({...to,duration:2400,essential:true})}else map.easeTo({...to,duration:anim?1500:0,essential:true});
    }
  }

  /* ── ทุกเฟรม ── */
  function frame(t){
    const k=mpp(),now=performance.now();
    /* รถเคลื่อนเป็นเส้นตรงความเร็วคงที่จากจุดเดิมไปจุดใหม่ ภายในช่วงเวลาระหว่างสองอัปเดต (ไม่กระตุกหยุด-วิ่ง) */
    if(S.to){
      const q=Math.min(1,(now-S.t0)/S.dur),p={lat:S.from.lat+(S.to.lat-S.from.lat)*q,lng:S.from.lng+(S.to.lng-S.from.lng)*q};
      S.car=p;const v=toM(p);car.position.copy(v);car.visible=true;
      S.head=lerpAng(S.head,S.headTo,.12);car.rotation.z=-S.head*D2R;
      const ck=Math.max(1,(opt.carPx||64)*k/4.2);car.scale.setScalar(ck);
      const u=car.userData,blink=Math.floor(t*2.6)%2;
      u.amb[0].color.setHex(S.stale?0x666666:blink?0xffb020:0xb8742a);u.amb[1].color.setHex(S.stale?0x666666:blink?0xb8742a:0xffb020);
      u.paint.color.setHex(S.stale?0x8a8580:BRAND);u.glow.material.opacity=S.stale?.15:.8+.2*Math.sin(t*3);
      /* เด้งดึ๋ง ๆ ตอนวิ่ง · หายใจเบา ๆ ตอนจอด · เอียงตัวนิดหน่อยตอนเลี้ยว */
      const run=!S.stale&&q<1,turn=((S.headTo-S.head+540)%360)-180;
      u.inner.position.z=run?Math.abs(Math.sin(t*10))*.07:0;
      u.inner.scale.set(1,1,S.stale?1:1+Math.sin(t*(run?10:2.6))*(run?.025:.015));
      u.inner.rotation.y=Math.max(-.12,Math.min(.12,turn*.004));
      carRip.forEach((r,i)=>{const f=(t*.55+i*.5)%1;r.visible=!S.stale;r.position.set(v.x,v.y,.08);r.scale.setScalar(ck*(1.2+f*4.2));r.material.opacity=(1-f)*.7});
      tagM.setLngLat([p.lng,p.lat]);
      if(dest){
        const d=toM(dest),dist=v.distanceTo(d),on=dist>30;
        [arcCore,arcGlow,arcShadow].forEach(m=>m.visible=on);
        if(on){
          const H=Math.max(dist*.26,26*k),A=v.clone().setZ(ck*1.6),B=d.clone().setZ(2);
          for(const [m,r,h] of [[arcCore,2.2*k,H],[arcGlow,7*k,H],[arcShadow,1.8*k,0]]){
            const U=m.material.uniforms;U.uA.value.copy(h?A:v.clone().setZ(.2));U.uB.value.copy(h?B:d.clone().setZ(.2));U.uH.value=h;U.uR.value=r;U.uT.value=t;U.uL.value=Math.min(300,Math.max(3,dist/k/34));
          }
        }
      }
    }
    if(dest){
      const pk=Math.max(1,46*k/3);pin.scale.setScalar(pk);pin.position.z=Math.sin(t*1.8)*.18*pk;pin.rotation.z=t*.7;
      beam.scale.set(Math.max(1.6,6*k),Math.max(1.6,6*k),Math.max(40,170*k));beam.material.uniforms.uT.value=t;
      destRip.forEach((r,i)=>{const f=(t*.4+i/3)%1;r.position.z=.06;r.scale.setScalar(pk*(.6+f*3.4));r.material.opacity=(1-f)*.85});
    }
  }

  /* ── จุดใหม่จากเซิร์ฟเวอร์ ── */
  function update(live,o={}){
    if(dead)return;
    S.stale=!!o.stale;card.classList.toggle('stale',S.stale);
    tag.textContent=o.tag||'';
    if(!live||!Number.isFinite(+live.lat)||!Number.isFinite(+live.lng))return;
    const p={lat:+live.lat,lng:+live.lng},now=performance.now();
    if(!S.to){S.from=S.to=p;S.car=p;S.t0=now;S.dur=1;tagM.setLngLat([p.lng,p.lat]).addTo(map)}
    else{
      const moved=kmBetween(S.to,p)*1000;
      S.from=S.car||S.to;S.to=p;S.t0=now;S.dur=Math.min(6500,Math.max(900,now-S.last));
      if(Number.isFinite(live.heading)&&live.heading>=0&&(live.speed==null||live.speed>.8))S.headTo=live.heading;
      else if(moved>4)S.headTo=bearing(S.from,p);
    }
    if(!S.last){if(Number.isFinite(live.heading)&&live.heading>=0)S.headTo=S.head=live.heading;else if(dest)S.headTo=S.head=bearing(p,dest)}
    S.last=now;
    const tr=S.trail,lastPt=tr[tr.length-1];
    if(!lastPt||kmBetween({lng:lastPt[0],lat:lastPt[1]},p)*1000>6){tr.push([p.lng,p.lat]);if(tr.length>500)tr.shift()}
    if(tr.length>1)map.getSource('cd-trail').setData({type:'Feature',geometry:{type:'LineString',coordinates:tr}});
    if(S.auto)fit(true);
    map.triggerRepaint();
  }
  function destroy(){
    if(dead)return;dead=true;io.disconnect();removeEventListener('keydown',esc);
    if(card.classList.contains('lv-full'))full(false);
    try{renderer&&renderer.dispose()}catch(e){}try{map.remove()}catch(e){}
  }
  /* ใบงานวาดใหม่ระหว่างขยายเต็มจอ: จำตำแหน่งใหม่ไว้ ย่อแล้วกลับไปอยู่ตรงนั้น */
  const rehome=node=>{const c=document.createComment('lv');node.replaceWith(c);spot=c};
  return {update,destroy,rehome,map,get alive(){return !dead}};
}
