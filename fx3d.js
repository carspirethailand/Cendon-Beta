/* ═══ ชิ้นงาน three.js ที่ใช้ร่วมกัน ═══
   โลโก้ Cendon สามมิติ (รีดจากรูปเส้นเดียวกับโลโก้จริง) · แสงสะท้อนโทนรุ่งอรุณ · วงแหวนอนุภาค
   ใช้ที่: หน้านับถอยหลัง (launch.js) · การ์ดชวนเป็นช่างบนหน้าแรก · หน้าแรกของใบสมัครช่าง (emblem)
   emblem() วาดเฉพาะตอนมองเห็น หยุดตอนเลื่อนพ้นจอ/สลับแอป · ตั้งให้ลดการเคลื่อนไหว = วาดภาพนิ่งภาพเดียว */
import * as THREE from './vendor/three-0.160.0.module.min.js';
import {SVGLoader} from './vendor/three-svgloader-0.160.0.js';

/* รูปโลโก้ = site/brand/logo-path.txt (เทสต์ตรวจว่าตรงกัน) */
export const LOGO='M 79.33 0.29 Q 79.62 0.00 79.97 0.21 L 81.37 1.05 Q 82.80 1.91 82.80 3.58 L 82.80 4.36 Q 82.80 6.37 82.17 8.27 L 75.34 28.74 Q 74.52 31.21 71.93 30.97 L 49.09 28.90 Q 46.50 28.66 44.60 30.44 L 37.56 37.07 Q 35.67 38.85 34.46 41.16 L 29.87 49.93 Q 28.66 52.23 28.92 54.82 L 29.04 56.01 Q 29.30 58.60 31.49 60.00 L 45.43 68.97 Q 47.13 70.06 49.14 69.78 L 49.59 69.71 Q 51.59 69.43 52.63 67.68 L 60.46 54.47 Q 61.78 52.23 64.32 52.79 L 64.98 52.94 Q 67.52 53.50 68.61 55.86 L 70.25 59.42 Q 71.34 61.78 70.55 64.26 L 63.84 85.42 Q 63.06 87.90 60.77 89.13 L 48.79 95.58 Q 46.50 96.82 43.96 96.25 L 43.14 96.07 Q 40.76 95.54 39.04 97.26 L 38.66 97.64 Q 36.94 99.36 34.52 99.61 L 33.16 99.74 Q 30.57 100.00 30.70 97.40 L 31.08 89.86 Q 31.21 87.26 29.02 85.87 L 5.38 70.82 Q 3.18 69.43 2.55 66.90 L 0.63 59.21 Q 0.00 56.69 1.41 54.50 L 27.26 14.29 Q 28.66 12.10 29.48 9.64 L 31.02 5.01 Q 31.85 2.55 34.36 3.22 L 45.90 6.33 Q 48.41 7.01 51.01 7.01 L 61.73 7.01 Q 64.33 7.01 66.72 5.97 L 78.61 0.80 Q 78.98 0.64 79.27 0.35 Z';
export {THREE};
export const lowEnd=()=>(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=3;

/* โลโก้รีดหนา ขอบลบมน · h = ความสูง (หน่วยฉาก) */
export function logoGeometry(h=3.3,q=1){
  const svg=`<svg xmlns="http://www.w3.org/2000/svg"><path transform="scale(1,-1)" d="${LOGO}"/></svg>`;
  const shapes=new SVGLoader().parse(svg).paths.flatMap(p=>SVGLoader.createShapes(p));
  const g=new THREE.ExtrudeGeometry(shapes,{depth:15,bevelEnabled:true,bevelThickness:2.6,bevelSize:1.7,bevelSegments:q<1?3:6,curveSegments:q<1?12:22});
  g.center();g.computeBoundingBox();const b=g.boundingBox,k=h/(b.max.y-b.min.y);g.scale(k,k,k);return g;
}
/* แสงสะท้อน: ฟ้าหมึก ขอบฟ้าส้ม ด้านบนขาว — ทำให้โลหะส้มดูมีราคา */
export function warmEnv(R){
  const sc=new THREE.Scene(),geo=new THREE.SphereGeometry(10,32,16),p=geo.attributes.position,col=[];
  for(let i=0;i<p.count;i++){const y=p.getY(i)/10,z=p.getZ(i)/10,c=new THREE.Color(0x0a0b10);
    c.lerp(new THREE.Color(0xff9a50),Math.exp(-Math.pow((y+.05)*5,2))*(.6+.4*Math.max(0,-z)));if(y>.55)c.lerp(new THREE.Color(0xffffff),(y-.55)*1.6);col.push(c.r,c.g,c.b)}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));sc.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
  const pm=new THREE.PMREMGenerator(R),t=pm.fromScene(sc,.02).texture;pm.dispose();return t;
}
export const logoMaterial=env=>new THREE.MeshPhysicalMaterial({color:0xE8943C,metalness:.6,roughness:.24,clearcoat:1,clearcoatRoughness:.08,envMap:env,envMapIntensity:1.2,emissive:0x3a1602,emissiveIntensity:.5});
/* วงแหวนอนุภาคหมุนรอบโลโก้ · uB = แตกกระจาย (0..1) */
export function halo(R,n=1400,r0=3.1){
  const hp=new Float32Array(n*3),hs=new Float32Array(n);
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,r=r0+Math.pow(Math.random(),2)*.96*(Math.random()<.5?-1:1);hp.set([Math.cos(a)*r,(Math.random()-.5)*.25,Math.sin(a)*r],i*3);hs[i]=Math.random()}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(hp,3));g.setAttribute('aS',new THREE.BufferAttribute(hs,1));
  const U={uT:{value:0},uB:{value:0},uPx:{value:R.getPixelRatio()}};
  const pts=new THREE.Points(g,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:U,
    vertexShader:`attribute float aS;uniform float uT;uniform float uB;uniform float uPx;varying float vS;
      void main(){vS=aS;vec3 p=position*(1.+uB*(2.+aS*6.));float a=uT*(.12+aS*.1);p.xz=mat2(cos(a),-sin(a),sin(a),cos(a))*p.xz;
        vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=(1.2+aS*2.6)*uPx*(12./-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:'uniform float uB;varying float vS;void main(){float d=length(gl_PointCoord-.5);vec3 c=mix(vec3(1.,.58,.22),vec3(1.,.93,.82),vS);gl_FragColor=vec4(c,smoothstep(.5,0.,d)*(.85-uB*.6));}'}));
  pts.userData.U=U;return pts;
}
export function supported(){try{const c=document.createElement('canvas'),gl=c.getContext('webgl2')||c.getContext('webgl');if(!gl)return false;const x=gl.getExtension('WEBGL_lose_context');x&&x.loseContext();return true}catch(e){return false}}

/* ตราสัญลักษณ์ลอยหมุนในกรอบเล็ก ๆ (พื้นโปร่ง) — คืน {stop} */
export function emblem(cv,o={}){
  if(cv.__fx)return cv.__fx;
  if(!supported())throw Error('webgl');
  const calm=matchMedia('(prefers-reduced-motion: reduce)').matches,low=lowEnd();
  const R=new THREE.WebGLRenderer({canvas:cv,alpha:true,antialias:(devicePixelRatio||1)<2});
  R.setPixelRatio(Math.min(devicePixelRatio||1,low?1.25:2));R.toneMapping=THREE.ACESFilmicToneMapping;R.setClearColor(0,0);
  const S=new THREE.Scene(),C=new THREE.PerspectiveCamera(o.fov||34,1,.1,100);C.position.set(0,.4,o.dist||11.5);C.lookAt(0,0,0);
  const env=warmEnv(R),logo=new THREE.Mesh(logoGeometry(3.3,low?.5:1),logoMaterial(env)),rig=new THREE.Group();rig.add(logo);S.add(rig);
  const key=new THREE.DirectionalLight(0xfff1e0,2.4);key.position.set(4,6,9);S.add(key);
  const rim=new THREE.PointLight(0xff8a3d,70,30,1.6);rim.position.set(0,1,-5);S.add(rim);
  S.add(new THREE.AmbientLight(0x404058,.7));
  const h=o.particles===false?null:halo(R,low?500:(o.particles||900),3);if(h){h.rotation.x=.32;rig.add(h)}
  let vis=true,raf=0,dead=false,w=0,ht=0,t0=performance.now(),tx=0,px=0;
  const size=()=>{const r=cv.getBoundingClientRect();if(r.width===w&&r.height===ht)return;w=r.width;ht=r.height;if(!w||!ht)return;R.setSize(w,ht,false);C.aspect=w/ht;C.updateProjectionMatrix()};
  const frame=n=>{
    if(dead)return;if(!cv.isConnected)return fx.stop();size();const T=(n-t0)/1000;px+=(tx-px)*.05;
    rig.position.y=Math.sin(T*.9)*.12;logo.rotation.y=Math.sin(T*.5)*.45+px*.35+(o.spin?T*.4:0);logo.rotation.x=Math.sin(T*.35)*.06;
    if(h)h.userData.U.uT.value=T;
    R.render(S,C);
    if(!calm&&vis&&!document.hidden)raf=requestAnimationFrame(frame);
  };
  const io=new IntersectionObserver(([e])=>{vis=e.isIntersecting;cancelAnimationFrame(raf);if(vis)raf=requestAnimationFrame(frame)});io.observe(cv);
  const onVis=()=>{cancelAnimationFrame(raf);if(!document.hidden&&vis)raf=requestAnimationFrame(frame)};document.addEventListener('visibilitychange',onVis);
  const onMove=e=>{const r=cv.getBoundingClientRect();tx=Math.max(-1,Math.min(1,(e.clientX-(r.left+r.width/2))/Math.max(200,r.width)))};
  addEventListener('pointermove',onMove,{passive:true});
  raf=requestAnimationFrame(frame);
  const fx={stop(){if(dead)return;dead=true;cancelAnimationFrame(raf);io.disconnect();document.removeEventListener('visibilitychange',onVis);removeEventListener('pointermove',onMove);
    try{R.dispose();R.forceContextLoss()}catch(e){}delete cv.__fx}};
  cv.__fx=fx;return fx;
}
