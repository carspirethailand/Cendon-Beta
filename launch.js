/* ═══ หน้านับถอยหลังเปิดตัว (launch.html) ═══
   ฉาก three.js: ฟ้ายามรุ่งเหนือทะเลเมฆ · โลโก้ Cendon สามมิติลอยอยู่กลาง · ดาวระยิบ · วงแหวนอนุภาคหมุนรอบโลโก้ · วงคลื่นเต้นทุกวินาที
   ใกล้เวลา: ขอบฟ้าค่อย ๆ สว่าง · หมดเวลา: พระอาทิตย์ขึ้น อนุภาคแตกกระจาย → เลื่อนลง (หรือรอเอง) = กล้องดิ่งเข้าเมฆ ขาวทั้งจอ → เข้าแอป
   แอปรับช่วงต่อด้วยเมฆแหวกออก (launch-gate.js · cendon_cloud_in)
   ?preview=1 = ทีมงานดูตัวอย่าง (ตั้งเวลาสมมติถ้ายังไม่ได้ตั้งจริง + ปุ่มลองตอนหมดเวลา)
   เครื่องไม่มี WebGL / ตั้งให้ลดการเคลื่อนไหว → พื้นไล่สีใน CSS + ตัวเลข + เฟดขาวตอนหมดเวลา */
import {THREE,logoGeometry,warmEnv,logoMaterial,halo as haloPts} from './fx3d.js';

const API=window.TECH_API_URL||'https://spireonebackend.carspirethailand.workers.dev';
const $=id=>document.getElementById(id);
const Q=new URLSearchParams(location.search),PREVIEW=Q.has('preview');
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const signed=(()=>{try{return localStorage.getItem('cendon_signed')==='1'}catch(e){return false}})();
const low=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=3;

/* ── ค่าการเปิดตัวจากหลังบ้าน (เวลาอิงนาฬิกาหลังบ้าน ไม่ใช่นาฬิกาเครื่อง) ── */
let skew=0;
async function load(){
  try{
    const t0=Date.now(),r=await fetch(API+'/api/config',{cache:'no-store'});if(!r.ok)throw Error(r.status);
    const j=await r.json(),t1=Date.now();skew=j.now?j.now-Math.round((t0+t1)/2):0;
    try{localStorage.setItem('cendon_cfg',JSON.stringify({launch:j.launch||null,features:j.features||{},skew,got:t1}))}catch(e){}
    return j.launch||null;
  }catch(e){const c=window.CendonLaunch&&CendonLaunch.cfg();skew=(c&&c.skew)||0;return (c&&c.launch)||null}
}
const now=()=>Date.now()+skew;
const leave=()=>location.replace('/');

let L=await load();
const demo=()=>({...(L||{}),enabled:true,at:now()+((3*24+4)*3600+17*60+9)*1000,demo:true});
if(PREVIEW){if(!(L&&L.enabled&&L.at>now()))L=demo();$('pv').classList.add('on')}
else if(!L||!L.enabled||!(L.at>now())){leave();await new Promise(()=>{})}

/* ── ข้อความ ── */
function paintText(){
  const d=new Date(L.at);
  $('when').textContent='เปิดตัว '+d.toLocaleString('th-TH',{weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})+' น.';
  if(L.title)$('title').textContent=L.title;
  if(L.message)$('msg').textContent=L.message;
  const j=$('join');j.hidden=L.join===false;j.style.display=L.join===false?'none':'';
  j.href=signed?'/join':'/login?next=%2Fjoin';
}
paintText();

/* ── ฉากสามมิติ ── */
let G=null;
try{if(!RM)G=scene($('gl'))}catch(e){console.warn('launch3d',e&&e.message);G=null}

function cloudTex(seed){
  const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');let s=seed;const r=()=>(s=(s*16807)%2147483647)/2147483647;
  for(let i=0;i<30;i++){const x=128+(r()-.5)*160,y=146+(r()-.5)*64-(Math.abs(x-128)/128)*18,rad=26+r()*58,gr=g.createRadialGradient(x,y,0,x,y,rad);
    gr.addColorStop(0,'rgba(255,255,255,.5)');gr.addColorStop(.55,'rgba(255,255,255,.2)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.beginPath();g.arc(x,y,rad,0,7);g.fill()}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function scene(cv){
  const R=new THREE.WebGLRenderer({canvas:cv,antialias:(devicePixelRatio||1)<2,powerPreference:'high-performance'});
  R.setPixelRatio(Math.min(devicePixelRatio||1,low?1.25:1.75));R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.05;
  const S=new THREE.Scene(),C=new THREE.PerspectiveCamera(40,1,.1,800);
  /* ฟ้า: หมึกด้านบน → ขอบฟ้าส้มตอนรุ่ง (uGlow) · uWhite = ขาวทั้งฟ้าตอนอยู่ในเมฆ */
  const U={uGlow:{value:.35},uWhite:{value:0},uT:{value:0}};
  const sky=new THREE.Mesh(new THREE.SphereGeometry(500,48,24),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:U,
    vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform float uGlow;uniform float uWhite;varying vec3 vP;
      void main(){float h=vP.y;vec3 top=vec3(.012,.016,.035),mid=vec3(.045,.05,.08),hor=vec3(1.,.48,.16);
        vec3 c=mix(mid,top,smoothstep(0.,.6,h));float band=exp(-pow((h+.015)*6.5,2.));
        float sun=pow(max(0.,dot(vP,normalize(vec3(0.,.03,-1.)))),24.);
        c+=hor*(band*.42+sun*1.3)*uGlow*uGlow*1.6+vec3(1.,.8,.6)*sun*uGlow*uGlow*.8;
        gl_FragColor=vec4(mix(c,vec3(1.),uWhite),1.);}`}));
  S.add(sky);
  /* ดาว: ครึ่งบนของฟ้า ระยิบระยับ จางลงตอนรุ่ง */
  const N=low?800:1600,sp=new Float32Array(N*3),sz=new Float32Array(N);
  for(let i=0;i<N;i++){const th=Math.random()*Math.PI*2,y=.08+Math.random()*.92,r=Math.sqrt(1-y*y)*420;sp.set([Math.cos(th)*r,y*420,Math.sin(th)*r],i*3);sz[i]=Math.random()}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp,3));sg.setAttribute('aS',new THREE.BufferAttribute(sz,1));
  const SU={uT:{value:0},uA:{value:1},uPx:{value:R.getPixelRatio()}};
  const stars=new THREE.Points(sg,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,uniforms:SU,
    vertexShader:'attribute float aS;uniform float uT;uniform float uPx;varying float vA;void main(){vA=.4+.6*abs(sin(uT*(.6+aS*1.8)+aS*50.));gl_PointSize=(1.+aS*2.2)*uPx;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float uA;varying float vA;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(vec3(1.,.95,.88),smoothstep(.5,0.,d)*vA*uA);}'}));
  S.add(stars);
  /* แสงรุ่งหลังทะเลเมฆ */
  const sunTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),r=g.createRadialGradient(64,64,0,64,64,64);
    r.addColorStop(0,'rgba(255,214,160,1)');r.addColorStop(.25,'rgba(255,150,70,.55)');r.addColorStop(1,'rgba(255,120,40,0)');g.fillStyle=r;g.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})();
  const sun=new THREE.Sprite(new THREE.SpriteMaterial({map:sunTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,opacity:.5}));
  sun.position.set(0,-8,-300);sun.scale.set(300,130,1);S.add(sun);
  /* ทะเลเมฆ (สไปรต์) + เมฆบนเส้นทางที่กล้องจะดิ่งผ่าน */
  S.fog=new THREE.Fog(0x14100e,40,260);
  const tex=[cloudTex(11),cloudTex(23),cloudTex(57)],clouds=[];
  const addCloud=(x,y,z,w,warm)=>{const m=new THREE.SpriteMaterial({map:tex[clouds.length%3],transparent:true,depthWrite:false,opacity:.62,color:0xffffff});
    const sp=new THREE.Sprite(m);sp.position.set(x,y,z);sp.scale.set(w,w*.5,1);sp.userData={warm,sp:.2+Math.random()*.5,x0:x};S.add(sp);clouds.push(sp)};
  for(let i=0;i<(low?70:130);i++){const z=-260+Math.random()*290;addCloud((Math.random()-.5)*(140+(-z)*.9),-10+Math.random()*5.5,z,22+Math.random()*30,Math.min(1,-z/240))}
  for(let i=0;i<(low?26:44);i++){const z=-6-Math.random()*150;addCloud((Math.random()-.5)*16,-7.5+Math.random()*5,z,10+Math.random()*16,.3)}
  /* โลโก้สามมิติ จากรูปเส้นเดียวกับโลโก้จริง (fx3d.js) */
  const logo=new THREE.Mesh(logoGeometry(3.3,low?.5:1),logoMaterial(warmEnv(R))),rig=new THREE.Group();rig.add(logo);S.add(rig);
  const key=new THREE.DirectionalLight(0xfff1e0,2.6);key.position.set(4,6,9);S.add(key);
  const rim=new THREE.PointLight(0xff8a3d,90,30,1.6);rim.position.set(0,1,-5);S.add(rim);
  const cool=new THREE.PointLight(0x7aa2ff,30,30,1.6);cool.position.set(-7,3,-1);S.add(cool);
  S.add(new THREE.AmbientLight(0x404058,.6));
  /* วงแหวนอนุภาครอบโลโก้ */
  const halo=haloPts(R,low?700:1400),HU=halo.userData.U;
  halo.rotation.x=.32;rig.add(halo);
  /* วงคลื่นทุกวินาที (จังหวะเดียวกับตัวเลข) */
  const beat=new THREE.Mesh(new THREE.TorusGeometry(2.1,.018,8,160),new THREE.MeshBasicMaterial({color:0xffb26b,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0}));
  beat.rotation.x=Math.PI/2+.32;rig.add(beat);

  const st={glow:.35,glowTo:.35,burst:0,spin:0,dive:0,beatT:-9,px:0,py:0,tx:0,ty:0,w:0,h:0};
  function size(){
    const w=innerWidth,h=innerHeight;if(w===st.w&&h===st.h)return;st.w=w;st.h=h;R.setSize(w,h,false);
    const a=w/h;C.aspect=a;C.fov=a<1?54:40;
    /* โลโก้อยู่ค่อนบนของจอ เหลือที่ให้ตัวหนังสือด้านล่าง */
    C.setViewOffset(w,h,0,h*(a<1?.27:.2),w,h);C.updateProjectionMatrix();
    st.base=a<1?16+(1/a-1)*5:15;
  }
  addEventListener('pointermove',e=>{st.tx=(e.clientX/innerWidth-.5)*2;st.ty=(e.clientY/innerHeight-.5)*2},{passive:true});
  let last=performance.now(),vis=true;
  document.addEventListener('visibilitychange',()=>{vis=!document.hidden;if(vis){last=performance.now();requestAnimationFrame(loop)}});
  function loop(t){
    if(!vis)return;requestAnimationFrame(loop);size();
    const dt=Math.min(.05,(t-last)/1000),T=t/1000;last=t;
    st.glow+=(st.glowTo-st.glow)*Math.min(1,dt*1.5);st.px+=(st.tx-st.px)*dt*2;st.py+=(st.ty-st.py)*dt*2;
    U.uGlow.value=st.glow;U.uT.value=T;SU.uT.value=T;SU.uA.value=Math.max(0,1-st.glow*.75);HU.uT.value=T;HU.uB.value=st.burst;
    sun.material.opacity=.12+Math.max(0,st.glow-.35)*1.35;sun.position.y=-8+Math.max(0,st.glow-.35)*14;
    /* โลโก้ลอยขึ้นลง ส่ายตามนิ้ว/เมาส์ · ตอนหมดเวลาหมุนหนึ่งรอบ */
    rig.position.y=1.4+Math.sin(T*.9)*.12;
    logo.rotation.y=Math.sin(T*.35)*.32+st.px*.25+st.spin*Math.PI*2;logo.rotation.x=st.py*.12;
    const bt=T-st.beatT;beat.material.opacity=bt<1.2?(1-bt/1.2)*.55:0;beat.scale.setScalar(1+bt*1.1);
    /* เมฆลอยช้า ๆ · สีเมฆอุ่นขึ้นตอนรุ่ง */
    const fogC=new THREE.Color(0x14100e).lerp(new THREE.Color(0x6a3a1c),st.glow*.6);
    /* กลางคืน: เมฆหมึกเทาขอบอุ่นจาง ๆ ใกล้ขอบฟ้า · รุ่งอรุณ: เมฆขาวอมส้ม */
    const dawn=Math.min(1,Math.max(0,(st.glow-.35)/.65));
    for(const c of clouds){c.position.x=c.userData.x0+Math.sin(T*c.userData.sp*.12+c.userData.x0)*3;const w=c.userData.warm;
      c.material.color.setRGB(.075+.22*w*st.glow+dawn*(.72+.2*w),.08+.1*w*st.glow+dawn*(.6+.08*w),.105+.03*w*st.glow+dawn*(.56-.06*w))}
    /* ดิ่งเข้าเมฆ: กล้องพุ่งไปข้างหน้าแล้วลดระดับลงในทะเลเมฆ ฟ้าและหมอกกลายเป็นขาว */
    const p=st.dive,e=p*p*(3-2*p);
    C.position.set(st.px*.6*(1-p),1.2-st.py*.3*(1-p)-Math.max(0,(e-.12)/.88)*9,st.base-e*150);
    C.lookAt(0,.9-e*13,C.position.z-30);
    const white=Math.min(1,Math.max(0,(p-.55)/.35));U.uWhite.value=white;
    S.fog.color.copy(fogC).lerp(new THREE.Color(0xffffff),white);S.fog.near=40*(1-white*.95);S.fog.far=260*(1-white*.8)+8;
    for(const c of clouds)c.material.color.lerp(new THREE.Color(0xffffff),white);
    R.render(S,C);
  }
  requestAnimationFrame(loop);
  return {
    pulse(){st.beatT=performance.now()/1000},
    near(left){st.glowTo=left<60000?.35+(1-left/60000)*.3:.35},
    launch(){st.glowTo=1;const t0=performance.now();const go=n=>{const k=Math.min(1,(n-t0)/1800);st.burst=k*k*(3-2*k);st.spin=1-Math.pow(1-k,3);if(k<1)requestAnimationFrame(go)};requestAnimationFrame(go)},
    dive(p){st.dive=p}
  };
}

/* ── นับถอยหลัง ── */
const els={};document.querySelectorAll('[data-u]').forEach(b=>els[b.dataset.u]=b);
let lastS=-1,done=false;
function tick(){
  const left=L.at-now();
  if(left<=0){if(!done){done=true;launch()}return}
  const s=Math.floor(left/1000),v={d:Math.floor(s/86400),h:Math.floor(s%86400/3600),m:Math.floor(s%3600/60),s:s%60};
  for(const k in v){const t=String(v[k]).padStart(2,'0');if(els[k].textContent!==t){els[k].textContent=t;els[k].classList.remove('tick');void els[k].offsetWidth;els[k].classList.add('tick')}}
  if(s!==lastS){lastS=s;if(G){G.pulse();G.near(left)}}
}
tick();const timer=setInterval(()=>{if(!done)tick()},250);
/* เจ้าของเลื่อนเวลา/ยกเลิกระหว่างนี้ → หน้านี้ตามทันภายในหนึ่งนาที */
if(!PREVIEW)setInterval(async()=>{if(done)return;const n=await load();if(!n||!n.enabled)return leave();if(n.at!==L.at||n.title!==L.title||n.message!==L.message||n.join!==L.join){L=n;paintText();tick()}},60000);
$('pvEnd').onclick=()=>{L={...L,at:now()+5200};lastS=-1;tick()};

/* ── หมดเวลา: พระอาทิตย์ขึ้น → เลื่อนลง (หรือรอเอง) = บินเข้าเมฆ → เข้าแอป ── */
function launch(){
  clearInterval(timer);$('ui').classList.add('gone');
  if(!G){/* ไม่มีฉาก 3 มิติ: บอกว่าเปิดแล้ว แล้วเฟดขาวเข้าแอป */
    $('go').classList.add('on');document.querySelector('#go .hint').hidden=true;
    const end=()=>{const v=$('veil');v.style.transition='opacity .9s';v.style.opacity=1;setTimeout(enter,900)};
    $('goBtn').onclick=end;setTimeout(end,RM?2500:1800);return;
  }
  G.launch();
  setTimeout(()=>{$('go').classList.add('on');document.body.classList.remove('locked');document.body.classList.add('launched');scrollTo(0,0)},1600);
  let auto=0,userAt=0,p=0,goT=performance.now()+1600,lt=performance.now();
  addEventListener('scroll',()=>{userAt=performance.now()},{passive:true});
  $('goBtn').onclick=()=>{auto=Math.max(auto,.001);goT=-1e9};
  const run=n=>{
    const H=document.documentElement.scrollHeight-innerHeight,ps=H>0?Math.min(1,scrollY/H):0;
    /* ไม่เลื่อนเองภายใน ~2.5 วิ → บินเข้าให้อัตโนมัติ (ไม่ค้างหน้านี้) */
    const dt=Math.min(.1,(n-lt)/1000);lt=n;
    if(n-Math.max(goT,userAt)>2500||auto>0)auto=Math.min(1,auto+dt/4.2);
    const want=Math.max(ps,auto);p+=(want-p)*(1-Math.exp(-dt*5));G.dive(p);
    if(p>.08)$('go').classList.add('gone');
    $('veil').style.opacity=Math.min(1,Math.max(0,(p-.86)/.1));
    if(p>.965)return enter();
    requestAnimationFrame(run);
  };
  requestAnimationFrame(run);
}
let entered=false;
function enter(){
  if(entered)return;entered=true;
  try{sessionStorage.setItem('cendon_cloud_in','1')}catch(e){}
  if(PREVIEW)return location.replace('/?staff=1');
  /* ยังไม่ล็อกอิน = ไปหน้าเข้าสู่ระบบตรง ๆ (เมฆแหวกที่หน้านั้น ไม่เสียไปกับหน้าที่เด้งต่อ) */
  location.replace(signed?'/':'/login');
}
