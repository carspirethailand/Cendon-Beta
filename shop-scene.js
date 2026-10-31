/* ═══ ฉากหน้าร้าน 3 มิติแบบการ์ตูน (shop-scene.js) ═══
   ใช้ที่: การ์ด "ฉากหน้าร้าน" บนหน้าร้านแบบจัดเอง · ตัวแต่งหน้าร้านใน Studio · แถบไล่สีขอบบนของ Studio
   index.html โหลดไฟล์นี้เมื่อมีที่ให้แสดง เครื่องว่าง และเครื่องไม่สเปกต่ำ (เหมือน fx3d.js) — ไม่มีก็ใช้ภาพไล่สีตามเวลาแทน
   ถนนหน้าอู่แบบไทย: อู่ของช่าง (ป้ายเขียนชื่อเอง · เลือกสีป้าย/สีร้านได้) · รถบนลิฟต์ในอู่ · ตึกแถว · บ้าน + ศาลพระภูมิ
   ตึกหลังมีรายละเอียด (แท็งก์น้ำ เสาอากาศ แอร์ ป้าย) · ต้นจามจุรี มะพร้าว พุ่มไม้ ดอกไม้ · เสาไฟ โคมถนน · รถลาก · แมวส้ม
   ฟ้า แดด เงา ไฟหน้าต่าง เปลี่ยนตามเวลาจริงแบบต่อเนื่อง · เปิดหน้าใหม่ ทุกชิ้นเด้งขึ้นมาแบบดึ๋ง ๆ
   ไม่หน่วงเครื่อง: วาดเฉพาะตอนมองเห็น · หลังเด้งเสร็จ 30 ภาพ/วิ · ใบไม้/หน้าต่าง/ของซ้ำ ใช้ InstancedMesh · เงาแผ่นเดียว
   เครื่องสเปกต่ำ: ปิดเงา ลดความคมชัด · ตั้ง "ลดการเคลื่อนไหว": ไม่เด้ง ไม่วิ่ง */
import * as THREE from './vendor/three-0.160.0.module.min.js';

const KEYS = [
  /* ชม.  ฟ้าบน      ขอบฟ้า     พื้นฟ้าล่าง  แสงหลัก     แรง  ฟ้าสะท้อน  พื้นสะท้อน  แรง  กลางคืน เมฆ */
  [0,    '#050a1f', '#1c2250', '#0a0c18', '#9fb5ff', 0.9, '#2a3870', '#0e0f18', 1.0, 1,    '#4b5680'],
  [5.0,  '#0a1238', '#33295a', '#120f20', '#b4a6ff', 0.8, '#2f3266', '#17131e', 1.0, 0.9,  '#5b5880'],
  [6.1,  '#31508f', '#f39c66', '#3b2a2a', '#ffad78', 1.6, '#8ea2d2', '#5c3c2c', 1.3, 0.25, '#f7c4b0'],
  [7.4,  '#4688cf', '#f8d8ad', '#6a5a48', '#ffe8c6', 3.0, '#a9c9ef', '#7c6c54', 1.6, 0,    '#fff3e6'],
  [12,   '#2a76d2', '#bfe2f9', '#7a8a70', '#ffffff', 3.6, '#bfdcff', '#8a8670', 1.8, 0,    '#ffffff'],
  [15.6, '#3a7fcd', '#d9e9f3', '#7a806a', '#fff2dc', 3.3, '#b8d6f5', '#8a7e66', 1.7, 0,    '#fffaf2'],
  [17.4, '#3a5ca8', '#ffbf78', '#6a4a38', '#ffae60', 2.8, '#9cb2de', '#7c5838', 1.5, 0,    '#ffd7a8'],
  [18.35,'#2a2354', '#ff7843', '#3a2230', '#ff6a3a', 1.7, '#6c5c9c', '#4c2c2c', 1.2, 0.45, '#ff9e7c'],
  [19.3, '#10133c', '#4c3a72', '#140f22', '#9db4ff', 1.0, '#2e3468', '#130f1b', 1.0, 0.9,  '#5e5b88'],
  [24,   '#050a1f', '#1c2250', '#0a0c18', '#9fb5ff', 0.9, '#2a3870', '#0e0f18', 1.0, 1,    '#4b5680']
];
const C = h => new THREE.Color(h);
const KC = KEYS.map(k => ({ h: k[0], top: C(k[1]), hor: C(k[2]), bot: C(k[3]), sun: C(k[4]), si: k[5], hs: C(k[6]), hg: C(k[7]), hi: k[8], night: k[9], cloud: C(k[10]) }));
const tmp = { top: new THREE.Color(), hor: new THREE.Color(), bot: new THREE.Color(), sun: new THREE.Color(), hs: new THREE.Color(), hg: new THREE.Color(), cloud: new THREE.Color() };
function atHour(h) {
  h = ((h % 24) + 24) % 24;
  let i = 0; while (i < KC.length - 2 && KC[i + 1].h <= h) i++;
  const a = KC[i], b = KC[i + 1], t = (h - a.h) / (b.h - a.h || 1), s = t * t * (3 - 2 * t);
  for (const k of ['top', 'hor', 'bot', 'sun', 'hs', 'hg', 'cloud']) tmp[k].copy(a[k]).lerp(b[k], s);
  return { ...tmp, si: a.si + (b.si - a.si) * s, hi: a.hi + (b.hi - a.hi) * s, night: a.night + (b.night - a.night) * s };
}
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/* แดด: เช้าต่ำจากซ้าย-หน้า (เงายาวไปขวา) · เที่ยงบนซ้าย · เย็นตกหลังฉากค่อนขวา (เห็นดวงอาทิตย์ ตัวหนังสือฝั่งซ้ายอ่านง่าย) */
function sunAt(h) {
  const t = (h - 6) / 12, e = Math.sin(Math.PI * t);
  const v = new THREE.Vector3(-0.9 + 0.72 * ss(0, 1, t), e * 1.05, 0.32 - 1.32 * ss(0.42, 1, t));
  return { dir: v.normalize(), e };
}
const MOON = new THREE.Vector3(-0.17, 0.29, -0.94).normalize();

/* กล่องขอบมน: ดันจุดที่เกินกล่องในออกไปบนผิวโค้งรัศมี r · normal จากผิวโค้งจริง */
const rgeo = new Map();
function rbox(w, h, d, r, s = 2) {
  const key = [w, h, d, r, s].join(); if (rgeo.has(key)) return rgeo.get(key);
  r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  const N = 2 * s + 1, g = new THREE.BoxGeometry(1, 1, 1, N, N, N), p = g.attributes.position, nr = g.attributes.normal;
  const map = (u, L) => { const k = Math.round((u + 0.5) * N); return k <= s ? -L / 2 + r * k / s : L / 2 - r * (N - k) / s; };
  const v = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), lo = new THREE.Vector3(-w / 2 + r, -h / 2 + r, -d / 2 + r), hi = lo.clone().negate();
  for (let i = 0; i < p.count; i++) {
    v.set(map(p.getX(i), w), map(p.getY(i), h), map(p.getZ(i), d)); c.copy(v).clamp(lo, hi); n.copy(v).sub(c);
    if (n.lengthSq() > 1e-9) { n.normalize(); v.copy(c).addScaledVector(n, r); nr.setXYZ(i, n.x, n.y, n.z); }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  rgeo.set(key, g); return g;
}
function gradientMap() {
  const d = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 215, 215, 215, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.canvas = c; return t;
}
const LOGO = 'M 79.33 0.29 Q 79.62 0.00 79.97 0.21 L 81.37 1.05 Q 82.80 1.91 82.80 3.58 L 82.80 4.36 Q 82.80 6.37 82.17 8.27 L 75.34 28.74 Q 74.52 31.21 71.93 30.97 L 49.09 28.90 Q 46.50 28.66 44.60 30.44 L 37.56 37.07 Q 35.67 38.85 34.46 41.16 L 29.87 49.93 Q 28.66 52.23 28.92 54.82 L 29.04 56.01 Q 29.30 58.60 31.49 60.00 L 45.43 68.97 Q 47.13 70.06 49.14 69.78 L 49.59 69.71 Q 51.59 69.43 52.63 67.68 L 60.46 54.47 Q 61.78 52.23 64.32 52.79 L 64.98 52.94 Q 67.52 53.50 68.61 55.86 L 70.25 59.42 Q 71.34 61.78 70.55 64.26 L 63.84 85.42 Q 63.06 87.90 60.77 89.13 L 48.79 95.58 Q 46.50 96.82 43.96 96.25 L 43.14 96.07 Q 40.76 95.54 39.04 97.26 L 38.66 97.64 Q 36.94 99.36 34.52 99.61 L 33.16 99.74 Q 30.57 100.00 30.70 97.40 L 31.08 89.86 Q 31.21 87.26 29.02 85.87 L 5.38 70.82 Q 3.18 69.43 2.55 66.90 L 0.63 59.21 Q 0.00 56.69 1.41 54.50 L 27.26 14.29 Q 28.66 12.10 29.48 9.64 L 31.02 5.01 Q 31.85 2.55 34.36 3.22 L 45.90 6.33 Q 48.41 7.01 51.01 7.01 L 61.73 7.01 Q 64.33 7.01 66.72 5.97 L 78.61 0.80 Q 78.98 0.64 79.27 0.35 Z';
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const shade = (hex, k) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, k); return '#' + c.getHexString(); };
/* ค่าเริ่มต้นของร้าน (ช่างแก้เองได้ใน Studio) */
export const SHOP = { name: 'CENDON', signColor: '#e8843c', wallColor: '#f4e7d4', accentColor: '#e07a38' };
/* มุมกล้อง: store = หน้าร้านเต็ม · strip = แถบบนของ Studio (เห็นฟ้า เมฆ หลังคา ป้าย — ล่างจางหายเข้าหน้า) */
export const VIEWS = {
  store: { pos: [7.6, 2.75, 16.6], look: [-0.2, 3.05, 0], fov: 36 },
  tall: { pos: [7.6, 2.75, 16.6], look: [-0.2, 3.55, 0], fov: 38 },
  strip: { pos: [6.2, 5.4, 21], look: [-0.4, 6.4, 0], fov: 30 }
};

export function mount(canvas, opts = {}) {
  let R;
  try { R = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' }); } catch (e) { return null; }
  const low = opts.low ?? ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3);
  const still = opts.still ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const shadows = opts.shadows ?? !low, noIntro = still || opts.intro === false, FPS = opts.fps || 30;
  R.setPixelRatio(Math.min(devicePixelRatio || 1, low ? 1 : (opts.dprMax || 1.75)));
  R.outputColorSpace = THREE.SRGBColorSpace;
  R.shadowMap.enabled = shadows; R.shadowMap.type = THREE.PCFSoftShadowMap;
  let rand = 7; const rnd = () => (rand = (rand * 16807) % 2147483647) / 2147483647;   /* สุ่มแบบคงที่: เปิดกี่ครั้งก็หน้าตาเดิม */

  const scene = new THREE.Scene();
  const view = typeof opts.view === 'string' ? VIEWS[opts.view] || VIEWS.store : opts.view || VIEWS.store, FOV = opts.fov || view.fov || 36;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.3, 230);
  const GM = gradientMap(), mats = new Map();
  const toon = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshToonMaterial({ color: c, gradientMap: GM, ...o })); return mats.get(k); };
  const basic = c => { const k = 'b' + c; if (!mats.has(k)) mats.set(k, new THREE.MeshBasicMaterial({ color: c })); return mats.get(k); };
  const LINE = new THREE.MeshBasicMaterial({ color: 0x2a1c16, side: THREE.BackSide });
  const pops = [];
  const shadow = (m, cast = true) => { m.castShadow = cast; m.receiveShadow = true; return m; };
  function box(w, h, d, c, x, y, z, parent, o = {}) {
    const geo = o.r ? rbox(w, h, d, o.r) : new THREE.BoxGeometry(w, h, d);
    const m = shadow(new THREE.Mesh(geo, o.mat || (typeof c === 'string' ? toon(c) : c)), o.cast !== false);
    m.position.set(x, y + h / 2, z); if (o.ry) m.rotation.y = o.ry; parent.add(m);
    if (o.line) { const s = new THREE.Mesh(m.geometry, LINE); s.scale.set(1 + o.line / w, 1 + o.line / h, 1 + o.line / d); m.add(s); }
    return m;
  }
  const mesh = (geo, mat, x, y, z, parent) => { const m = shadow(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); parent.add(m); return m; };
  const group = (x, z, parent = scene) => { const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g); return g; };
  const pop = (obj, delay, kind = 'b') => { pops.push({ obj, delay, kind }); obj.scale.setScalar(noIntro ? 1 : 0.0001); };

  /* ── ฟ้า (shader เดียว): ไล่สี · ดวงอาทิตย์ · จันทร์เสี้ยว · ดาวระยิบ ── */
  const skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() },
    sunCol: { value: new THREE.Color() }, sunVis: { value: 1 }, moonDir: { value: MOON.clone() }, night: { value: 0 }, time: { value: 0 } };
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(190, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec3 vD; uniform vec3 top,hor,bot,sunCol; uniform vec3 sunDir,moonDir; uniform float sunVis,night,time;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      void main(){ vec3 d = normalize(vD); float y = d.y;
        vec3 c = y > 0. ? mix(hor, top, pow(clamp(y * 1.6, 0., 1.), .55)) : mix(hor, bot, clamp(-y * 6., 0., 1.));
        float s = max(dot(d, sunDir), 0.);
        c += sunCol * (pow(s, 6.) * .22 + pow(s, 48.) * .45) * sunVis;
        c = mix(c, sunCol * 1.25 + vec3(.12), smoothstep(.99935, .99965, s) * sunVis);
        float m = max(dot(d, moonDir), 0.);
        c += vec3(.55, .62, .95) * pow(m, 60.) * .35 * night;
        float disc = smoothstep(.99955, .99975, m), bite = smoothstep(.99955, .99975, max(dot(d, normalize(moonDir + vec3(.012, .006, 0.))), 0.));
        c = mix(c, vec3(1., .97, .86), disc * (1. - bite * .85) * night);
        if (y > .02 && night > .01) { vec2 g = vec2(atan(d.z, d.x) * 60., y * 90.); vec2 id = floor(g); float r = h21(id);
          if (r > .965) { vec2 f = fract(g) - .5; float tw = .55 + .45 * sin(time * (1.5 + r * 3.) + r * 40.);
            c += vec3(1., .96, .9) * smoothstep(.16, 0., length(f)) * tw * night * smoothstep(.02, .25, y); } }
        gl_FragColor = vec4(c, 1.);
        #include <colorspace_fragment>
      }`
  })));
  scene.fog = new THREE.Fog(0xffffff, 20, 82);

  /* ── แสง ── */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = shadows;
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 11, bottom: -6, near: 1, far: 80 });
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const lampL = new THREE.PointLight(0xffc27a, 0, 7, 2); lampL.position.set(3.45, 4.0, 2.0); scene.add(lampL);
  const shopL = new THREE.PointLight(0xffd8a0, 1.4, 7, 1.1); shopL.position.set(0, 2.05, 1.25); scene.add(shopL);

  const glowTex = canvasTex(128, 128, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,230,180,1)'); r.addColorStop(.25, 'rgba(255,190,110,.55)'); r.addColorStop(1, 'rgba(255,160,80,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
  const glows = [];
  const glow = (x, y, z, s, parent = scene, color = 0xffffff) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); sp.position.set(x, y, z); sp.scale.setScalar(s); parent.add(sp); glows.push(sp); return sp; };
  const poolMat = () => new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });

  /* ── ของซ้ำทั้งฉาก (InstancedMesh): ใบไม้ ลำต้น ใบมะพร้าว ดอกไม้ แท็งก์น้ำ เสาอากาศ แอร์ หน้าต่าง ── */
  const FOL = [], TRK = [], FROND = [], FLW = [], TANK = [], ANT = [], ACU = [], winList = [];
  const win = (g, x, y, z, w, h, lit = rnd() < 0.62, ry = 0) => winList.push({ g, x, y, z, w, h, lit, ry, seed: rnd() });
  const LEAF = ['#5aa954', '#4b9a49', '#6cba5e', '#3f8c45'];
  function rainTree(x, z, s, delay) {
    TRK.push({ x, y: 0, z, r: 0.2 * s, h: 2.0 * s, delay, tilt: 0 });
    [[0, 2.45, 0, 1.15], [-0.85, 2.1, 0.15, 0.85], [0.9, 2.15, -0.1, 0.9], [0.15, 3.0, -0.15, 0.85], [-0.35, 2.65, 0.6, 0.7], [0.55, 2.7, 0.55, 0.6], [-0.6, 2.9, -0.5, 0.65]]
      .forEach(([a, b, c, r], i) => FOL.push({ x: x + a * s, y: b * s, z: z + c * s, r: r * s, c: LEAF[i % 4], delay: delay + 0.04 * i }));
  }
  function bush(x, z, s, delay, c) { FOL.push({ x, y: 0.28 * s, z, r: 0.34 * s, c: c || LEAF[(rnd() * 4) | 0], delay, sy: 0.75 }); }
  function palm(x, z, s, delay, lean = 0.12) {
    const segs = 6; let px = x, py = 0;
    for (let i = 0; i < segs; i++) { const h = 0.62 * s; TRK.push({ x: px, y: py, z, r: (0.13 - i * 0.008) * s, h, delay: delay + i * 0.03, tilt: lean * (i / segs) }); px += Math.sin(lean * (i / segs)) * h; py += Math.cos(lean * (i / segs)) * h; }
    for (let i = 0; i < 9; i++) FROND.push({ x: px, y: py, z, s, ry: (i / 9) * Math.PI * 2 + rnd() * 0.3, droop: 0.35 + rnd() * 0.35, delay: delay + 0.25 });
    FOL.push({ x: px, y: py - 0.05, z, r: 0.16 * s, c: '#7a5a34', delay: delay + 0.22 });
  }

  /* ── พื้น ถนน ทางเท้า ── */
  const ground = shadow(new THREE.Mesh(new THREE.PlaneGeometry(110, 70), toon('#9cc27b')), false); ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.01, -18); scene.add(ground);
  const front = shadow(new THREE.Mesh(new THREE.PlaneGeometry(110, 14), toon('#8fb870')), false); front.rotation.x = -Math.PI / 2; front.position.set(0, -0.01, 11); scene.add(front);
  const road = shadow(new THREE.Mesh(new THREE.PlaneGeometry(70, 2.9), toon('#4b4f58')), false); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.005, 2.95); scene.add(road);
  box(70, 0.14, 0.95, '#dcd2c4', 0, 0, 1.05, scene, { cast: false });
  box(70, 0.15, 0.1, '#a99d8f', 0, 0, 1.52, scene, { cast: false });
  box(70, 0.1, 0.5, '#cfc5b7', 0, 0, 4.65, scene, { cast: false });
  { const n = 20, m = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.9, 0.09), basic('#f2efe6'), n), o = new THREE.Object3D();
    for (let i = 0; i < n; i++) { o.position.set(-30 + i * 3.2, 0.012, 2.95); o.rotation.x = -Math.PI / 2; o.updateMatrix(); m.setMatrixAt(i, o.matrix); } scene.add(m); }
  { const n = 6, m = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.32, 2.5), basic('#f2efe6'), n), o = new THREE.Object3D();
    for (let i = 0; i < n; i++) { o.position.set(-1.6 + i * 0.6, 0.013, 2.95); o.rotation.x = -Math.PI / 2; o.updateMatrix(); m.setMatrixAt(i, o.matrix); } scene.add(m); }

  /* ── อู่ของช่าง: ผนังเปิดหน้า เห็นข้างในจริง ── */
  const shop = { ...SHOP, ...(opts.shop || {}) };
  const wallMat = new THREE.MeshToonMaterial({ color: shop.wallColor, gradientMap: GM }), accentMat = new THREE.MeshToonMaterial({ color: shop.accentColor, gradientMap: GM }), trimMat = toon('#5a4a40');
  const garage = group(0, -0.55); pop(garage, 0.05);
  box(4.5, 3.0, 0.8, wallMat, 0, 0, -1.1, garage, { line: 0.05, r: 0.08 });
  box(0.66, 3.0, 3.0, wallMat, -1.92, 0, 0, garage, { line: 0.05, r: 0.08 });
  box(0.66, 3.0, 3.0, wallMat, 1.92, 0, 0, garage, { line: 0.05, r: 0.08 });
  box(3.25, 0.78, 2.3, wallMat, 0, 2.22, 0.35, garage, { line: 0.04 });
  box(4.7, 0.32, 3.2, accentMat, 0, 3.0, 0, garage, { line: 0.05, r: 0.1 });
  box(3.4, 0.16, 0.2, accentMat, 0, 2.14, 1.52, garage);
  box(0.14, 2.2, 0.14, trimMat, -1.62, 0, 1.52, garage); box(0.14, 2.2, 0.14, trimMat, 1.62, 0, 1.52, garage);
  /* ข้างใน: พื้นปูน ผนังแขวนเครื่องมือ โต๊ะช่าง ตู้เครื่องมือแดง โคมเพดาน */
  const inFloor = shadow(new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.3), toon('#c9c4bc')), false); inFloor.rotation.x = -Math.PI / 2; inFloor.position.set(0, 0.02, 0.35); garage.add(inFloor);
  const pegTex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#d8b48a'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(90,60,40,.25)'; for (let y = 12; y < h; y += 22) for (let x = 12; x < w; x += 22) g.fillRect(x, y, 4, 4);
    g.strokeStyle = '#59606b'; g.lineCap = 'round'; for (let i = 0; i < 6; i++) { g.lineWidth = 10; g.beginPath(); g.moveTo(40 + i * 34, 50); g.lineTo(40 + i * 34, 120 + (i % 3) * 18); g.stroke(); g.beginPath(); g.arc(40 + i * 34, 44, 11, 0, 7); g.lineWidth = 7; g.stroke(); }
    g.fillStyle = '#c8402f'; g.fillRect(300, 50, 22, 70); g.fillStyle = '#59606b'; g.fillRect(292, 40, 38, 16); g.fillStyle = '#e8b04a'; g.fillRect(360, 60, 90, 18); g.fillRect(372, 90, 70, 14);
    g.fillStyle = '#2f6fb5'; rr(g, 380, 150, 90, 70, 8); g.fill(); g.fillStyle = '#fff'; g.font = '700 22px sans-serif'; g.fillText('OIL', 402, 192);
  });
  const peg = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.15), toon('#ffffff', { map: pegTex, emissive: 0x221508 })); peg.position.set(0, 1.08, -0.69); peg.receiveShadow = true; garage.add(peg);
  box(1.2, 0.08, 0.5, '#8a6a4c', -0.95, 0.85, -0.42, garage); box(0.08, 0.85, 0.45, '#5f646d', -1.5, 0, -0.42, garage); box(0.08, 0.85, 0.45, '#5f646d', -0.4, 0, -0.42, garage);
  const tc = box(0.6, 0.95, 0.45, '#cf3b2c', 1.15, 0, -0.42, garage, { r: 0.05 });
  for (let i = 0; i < 4; i++) box(0.5, 0.025, 0.02, '#f2e4d0', 0, -0.32 + i * 0.2, 0.23, tc, { cast: false });
  box(1.9, 0.06, 0.12, basic('#fff6dc'), 0, 2.12, 0.35, garage, { cast: false });
  /* รถบนลิฟต์ ฝากระโปรงเปิด */
  const lift = group(0, 0.45, garage);
  [-0.86, 0.86].forEach(x => { box(0.16, 2.0, 0.22, '#f2c230', x, 0, -0.55, lift, { r: 0.03 }); box(0.42, 0.06, 0.14, '#d9a820', x * 0.78, 0.5, -0.1, lift); box(0.42, 0.06, 0.14, '#d9a820', x * 0.78, 0.5, 0.6, lift); });
  const car = group(0, 0.15, lift); car.position.y = 0.56;
  const carMat = new THREE.MeshToonMaterial({ color: '#3a7bd5', gradientMap: GM }), glass = basic('#b9def5'), dark = toon('#24262c'), chrome = toon('#d7dbe0');
  box(1.25, 0.4, 2.2, carMat, 0, 0.12, 0, car, { r: 0.15, line: 0.03 });
  box(1.08, 0.24, 1.18, glass, 0, 0.5, -0.18, car, { r: 0.1 });
  box(1.04, 0.14, 1.12, carMat, 0, 0.72, -0.18, car, { r: 0.07 });
  [-0.5, 0.5].forEach(x => box(0.07, 0.24, 0.07, carMat, x, 0.5, 0.39, car));
  const hood = group(0, 0.4, car); hood.position.y = 0.52; hood.rotation.x = -1.05;
  box(1.15, 0.05, 0.7, carMat, 0, 0, 0.35, hood, { r: 0.02 });
  box(0.7, 0.2, 0.42, '#4a4f58', 0, 0.42, 0.68, car); box(0.22, 0.16, 0.18, '#1d1f24', -0.33, 0.48, 0.64, car); box(0.06, 0.05, 0.06, '#d63c2e', -0.4, 0.64, 0.64, car); box(0.12, 0.1, 0.12, '#e8b04a', 0.3, 0.6, 0.75, car);
  box(1.28, 0.12, 0.08, chrome, 0, 0.1, 1.1, car); box(0.7, 0.16, 0.04, dark, 0, 0.26, 1.11, car);
  [-0.45, 0.45].forEach(x => box(0.24, 0.1, 0.04, basic('#fff4cf'), x, 0.3, 1.11, car, { cast: false }));
  [-0.45, 0.45].forEach(x => box(0.22, 0.1, 0.04, basic('#ff5a5f'), x, 0.3, -1.11, car, { cast: false }));
  [[0.6, 0.7], [-0.6, 0.7], [0.6, -0.7], [-0.6, -0.7]].forEach(([x, z]) => { const w = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 14), dark, x, 0.12, z, car); w.rotation.z = Math.PI / 2;
    const rim = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.17, 10), chrome, x, 0.12, z, car); rim.rotation.z = Math.PI / 2; });
  /* ป้ายร้าน: เป็นแผ่นหนา ขาอยู่ข้างหลัง ไม่มีอะไรบัง · ช่างเขียนชื่อ/เลือกสีเองได้ */
  const signTex = canvasTex(1024, 256, () => {});
  function drawSign() {
    const c = signTex.userData.canvas, g = c.getContext('2d'), w = c.width, h = c.height, col = shop.signColor;
    g.clearRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, shade(col, 0.08)); gr.addColorStop(1, shade(col, -0.08)); rr(g, 6, 6, w - 12, h - 12, 46); g.fillStyle = gr; g.fill();
    g.lineWidth = 10; g.strokeStyle = 'rgba(255,248,236,.95)'; rr(g, 22, 22, w - 44, h - 44, 34); g.stroke();
    const light = new THREE.Color(col).getHSL({}).l > 0.72, ink = light ? '#2a1c16' : '#ffffff';
    g.save(); g.translate(64, 46); g.scale(1.62, 1.62); g.fillStyle = ink; g.fill(new Path2D(LOGO)); g.restore();
    const text = String(shop.name || '').trim().slice(0, 28) || ' ';
    let size = 124; g.font = `700 ${size}px Kanit, "Noto Sans Thai", "Arial Black", sans-serif`;
    while (g.measureText(text).width > w - 300 && size > 40) { size -= 4; g.font = `700 ${size}px Kanit, "Noto Sans Thai", "Arial Black", sans-serif`; }
    g.fillStyle = ink; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(text, 230 + (w - 270) / 2, h / 2 + 6);
    signTex.needsUpdate = true;
  }
  drawSign(); if (document.fonts && document.fonts.load) document.fonts.load('700 40px Kanit').then(drawSign, () => {});
  const signG = group(0, 1.05, garage); signG.position.y = 3.32;
  const signBack = shadow(new THREE.Mesh(rbox(3.5, 0.92, 0.12, 0.05), toon('#5a4a40'))); signBack.position.set(0, 0.62, 0); signG.add(signBack);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false })); sign.position.set(0, 0.62, 0.065); signG.add(sign);
  box(0.1, 0.5, 0.1, trimMat, -1.25, 0, -0.16, signG); box(0.1, 0.5, 0.1, trimMat, 1.25, 0, -0.16, signG);
  const signGlow = glow(0, 0.62, 0.3, 3.2, signG, 0xffa860);
  const shutTex = canvasTex(64, 256, (g, w, h) => { for (let y = 0; y < h; y += 16) { g.fillStyle = '#b8c6d2'; g.fillRect(0, y, w, 10); g.fillStyle = '#8796a6'; g.fillRect(0, y + 10, w, 6); } });
  shutTex.wrapS = shutTex.wrapT = THREE.RepeatWrapping;
  const shutter = new THREE.Mesh(new THREE.PlaneGeometry(3.12, 0.42), toon('#ffffff', { map: shutTex })); shutter.position.set(0, 1.98, 1.5); shutter.receiveShadow = true; garage.add(shutter);
  box(0.5, 0.16, 0.26, '#3a3a40', 1.0, 2.32, 1.66, garage); glow(1.0, 2.26, 1.82, 0.8, garage);
  win(garage, 1.92, 1.45, 1.51, 0.42, 0.7, true); win(garage, -1.92, 1.45, 1.51, 0.42, 0.7, true);
  win(garage, 2.26, 1.55, 0.5, 0.8, 0.7, true, Math.PI / 2);
  const tires = group(2.78, 0.62); pop(tires, 0.5);
  for (let i = 0; i < 4; i++) { const t = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.12, 8, 18), toon('#2b2c31'))); t.rotation.x = Math.PI / 2; t.position.y = 0.26 + i * 0.235; tires.add(t); }
  const drums = group(-2.6, 0.55); pop(drums, 0.45);
  [['#2f6fb5', 0], ['#c8402f', 0.62]].forEach(([c, x]) => { mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.82, 14), toon(c), x, 0.55, 0, drums);
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 6, 16), toon('#e9e2d6')); r.rotation.x = Math.PI / 2; r.position.set(x, 0.75, 0); drums.add(r); });
  const aboard = group(1.55, 1.08); pop(aboard, 0.6);
  { const tex = canvasTex(128, 160, (g, w, h) => { g.fillStyle = '#fff8ec'; g.fillRect(0, 0, w, h); g.fillStyle = '#e07a38'; g.fillRect(0, 0, w, 34); g.fillStyle = '#2a2a2a'; g.font = '700 26px Kanit, sans-serif'; g.fillText('เปิด', 36, 80); g.fillStyle = '#d9603e'; g.font = '700 24px Kanit, sans-serif'; g.fillText('24 ชม.', 22, 120); });
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.05), [trimMat, trimMat, trimMat, trimMat, toon('#ffffff', { map: tex }), trimMat]);
    b.position.y = 0.48; b.rotation.x = -0.12; shadow(b); aboard.add(b); }

  /* ── ตึกแถวข้างอู่ ── */
  const shops = [[-3.4, 1.78, 3.7, '#f3b39f', '#d9826a', ['#e86a4a', '#fff3e8']], [-5.2, 1.82, 4.45, '#a7d6c8', '#6fae9c', ['#2f8f83', '#f2fbf8']], [-7.02, 1.82, 3.35, '#f5d58b', '#d2ab55', ['#3f6fb0', '#f4f8ff']]];
  shops.forEach(([x, w, h, c, dk, aw], i) => {
    const g = group(x, -0.6); pop(g, 0.12 + i * 0.09);
    box(w, h, 2.6, c, 0, 0, 0, g, { line: 0.05, r: 0.1 });
    box(w + 0.08, 0.24, 2.7, dk, 0, h, 0, g, { r: 0.08 });
    box(w - 0.3, 1.55, 0.06, '#ffffff', 0, 0.05, 1.31, g, { mat: toon('#ffffff', { map: shutTex }) });
    const awTex = canvasTex(128, 64, (gg, ww, hh) => { for (let s = 0; s < 8; s++) { gg.fillStyle = s % 2 ? aw[1] : aw[0]; gg.fillRect(s * 16, 0, 16, hh); } gg.fillStyle = aw[0]; for (let s = 0; s < 8; s++) { gg.beginPath(); gg.arc(s * 16 + 8, hh - 6, 8, 0, Math.PI); gg.fill(); } });
    const awn = shadow(new THREE.Mesh(new THREE.PlaneGeometry(w - 0.05, 0.7), toon('#ffffff', { map: awTex, side: THREE.DoubleSide }))); awn.position.set(0, 1.88, 1.55); awn.rotation.x = -0.95; g.add(awn);
    box(w * 0.55, 0.28, 0.06, i === 1 ? '#ffffff' : '#2f2f38', 0, 2.25, 1.33, g);
    (h > 4 ? [2.75, 3.6] : [2.8]).forEach(fy => { win(g, -w * 0.22, fy, 1.31, 0.42, 0.55); win(g, w * 0.22, fy, 1.31, 0.42, 0.55);
      box(w - 0.2, 0.07, 0.35, dk, 0, fy - 0.42, 1.45, g); box(w - 0.2, 0.26, 0.03, '#f2efe8', 0, fy - 0.36, 1.61, g, { cast: false });
      FLW.push({ x: x - w * 0.3, y: fy - 0.28, z: 1.0, c: i === 0 ? '#e9488d' : '#f06aa8', r: 0.09 }); FLW.push({ x: x - w * 0.18, y: fy - 0.25, z: 1.0, c: '#e9488d', r: 0.08 }); });
    ACU.push({ x: x + w / 2 - 0.3, y: h - 1.05, z: 0.8 });
    bush(x + w / 2 - 0.35, 0.7, 0.75, 0.6 + i * 0.05);
  });

  /* ── บ้าน + ศาลพระภูมิ + รั้ว ── */
  const house = group(4.75, -0.55); pop(house, 0.32);
  box(2.9, 2.0, 2.4, '#fff3e3', 0, 0, 0, house, { line: 0.05, r: 0.1 });
  { const s = new THREE.Shape(); s.moveTo(-1.85, 0); s.lineTo(0, 1.35); s.lineTo(1.85, 0); s.closePath();
    const roof = shadow(new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 2.9, bevelEnabled: false }), toon('#c9563a'))); roof.position.set(0, 2.0, -1.45); house.add(roof);
    const rl = new THREE.Mesh(roof.geometry, LINE); rl.scale.set(1.025, 1.04, 1.01); rl.position.set(0, -0.015, -0.015); roof.add(rl);
    const gs = new THREE.Shape(); gs.moveTo(-1.45, 0); gs.lineTo(0, 1.05); gs.lineTo(1.45, 0); gs.closePath();
    const gab = shadow(new THREE.Mesh(new THREE.ShapeGeometry(gs), toon('#f6e2c8'))); gab.position.set(0, 2.0, 1.21); house.add(gab); }
  box(0.62, 1.25, 0.08, '#8a5a3c', -0.6, 0, 1.22, house); win(house, 0.65, 1.15, 1.21, 0.7, 0.6); win(house, 0, 2.55, 1.22, 0.36, 0.36, true);
  box(3.4, 0.1, 0.1, '#f2ede3', 0, 0.55, 1.75, house, { cast: false }); box(3.4, 0.1, 0.1, '#f2ede3', 0, 0.3, 1.75, house, { cast: false });
  { const n = 9, m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.75, 0.09), toon('#f2ede3'), n), o = new THREE.Object3D(); for (let i = 0; i < n; i++) { o.position.set(-1.6 + i * 0.4, 0.37, 1.75); o.updateMatrix(); m.setMatrixAt(i, o.matrix); } m.castShadow = true; house.add(m); }
  const shrine = group(6.5, 0.85); pop(shrine, 0.7);
  box(0.12, 1.2, 0.12, '#f4efe6', 0, 0, 0, shrine); box(0.62, 0.08, 0.62, '#d9b14a', 0, 1.2, 0, shrine); box(0.42, 0.42, 0.42, '#c9302c', 0, 1.28, 0, shrine);
  { const r = mesh(new THREE.ConeGeometry(0.42, 0.55, 4), toon('#e8b84a'), 0, 1.98, 0, shrine); r.rotation.y = Math.PI / 4; mesh(new THREE.ConeGeometry(0.05, 0.4, 6), toon('#f2cc5a'), 0, 2.42, 0, shrine); }
  glow(0, 1.5, 0.3, 0.9, shrine, 0xffb060);
  FLW.push({ x: 6.2, y: 0.12, z: 1.0, c: '#ffd23f', r: 0.1 }, { x: 6.8, y: 0.12, z: 1.05, c: '#ff8a3d', r: 0.1 });

  /* ── ตึกหลัง (ระยะกลาง) มีรายละเอียด: หน้าต่าง แท็งก์น้ำ เสาอากาศ แอร์ ป้าย ── */
  const boards = [];
  const midBillboards = [['ยางดี', '#2f6fb5'], ['กาแฟสด', '#6b3f2a'], ['คลินิก', '#2f9e6e'], ['โรงแรม', '#8a3fb5']];
  const mids = [[-13, -15, 3.4, 6.2, '#e9d3b5'], [-8.6, -17, 3.8, 7.6, '#c9d7e8'], [-4.2, -15.5, 3.2, 5.6, '#f0c7b6'], [0.4, -18, 4.2, 8.6, '#d7e2cf'], [4.8, -16, 3.4, 6.4, '#efe0c0'], [9.2, -17.5, 3.8, 7.8, '#d0cbe6'], [13.6, -15.5, 3.2, 5.8, '#f3d2c2'], [18, -17, 3.6, 7.0, '#dfe8d8']];
  mids.forEach(([x, z, w, h, c], i) => {
    const g = group(x, z); pop(g, 0.0 + i * 0.06, 'f');
    box(w, h, 3, c, 0, 0, 0, g, { line: 0.05, r: 0.08 });
    box(w + 0.1, 0.22, 3.1, shade(c, -0.14), 0, h, 0, g, { r: 0.06 });
    for (let fy = 1.2; fy < h - 0.7; fy += 1.15) for (let k = 0; k < 3; k++) { win(g, -w / 2 + 0.55 + k * ((w - 1.1) / 2), fy, 1.51, 0.5, 0.62); if (rnd() < 0.3) ACU.push({ x: x - w / 2 + 0.55 + k * ((w - 1.1) / 2) + 0.42, y: fy - 0.35, z: z + 1.62 }); }
    TANK.push({ x: x - w * 0.22, y: h + 0.22, z: z - 0.3 }); if (i % 2) TANK.push({ x: x + w * 0.2, y: h + 0.22, z: z + 0.2 });
    ANT.push({ x: x + w * 0.3, y: h + 0.22, z: z - 0.6, h: 0.9 + rnd() * 0.8 });
    if (i % 2 === 0) { const [label, col] = midBillboards[(i / 2) % 4];
      const t = canvasTex(256, 96, (gg, ww, hh) => { rr(gg, 4, 4, ww - 8, hh - 8, 16); gg.fillStyle = col; gg.fill(); gg.fillStyle = '#fff'; gg.font = '700 52px Kanit, sans-serif'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText(label, ww / 2, hh / 2 + 3); });
      const bb = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.72), new THREE.MeshBasicMaterial({ map: t })); boards.push(bb); bb.position.set(0, h + 0.75, 0.9); g.add(bb);
      box(0.08, 0.5, 0.08, '#6b6f78', -0.6, h + 0.2, 0.85, g); box(0.08, 0.5, 0.08, '#6b6f78', 0.6, h + 0.2, 0.85, g); }
  });
  [[-12.2, -5.5, 1.25], [-8.6, -6.2, 1.1], [-4.4, -5.0, 1.0], [0.4, -6.5, 1.3], [3.6, -5.6, 1.05], [7.6, -6.0, 1.2], [11.6, -5.2, 1.15], [15.5, -6.5, 1.3], [-6.5, -11, 1.4], [2.6, -12, 1.5], [11, -11.5, 1.4]].forEach(([x, z, s], i) => rainTree(x, z, s, 0.5 + i * 0.05));
  /* แนวพุ่มไม้ริมทางเท้าฝั่งหน้า + ดอกไม้แทรก */
  for (let x = -17; x <= 17; x += 1.05) { FOL.push({ x, y: 0.22, z: 5.7, r: 0.34 + rnd() * 0.07, c: LEAF[(rnd() * 4) | 0], sy: 0.66, delay: 0.75 + (x + 17) / 34 * 0.5 });
    if (rnd() < 0.55) FLW.push({ x: x + 0.3, y: 0.42, z: 5.95, c: ['#ffd23f', '#ff6f91', '#ff9f43', '#ffffff', '#e9488d'][(rnd() * 5) | 0], r: 0.09 }); }
  rainTree(8.4, -1.1, 1.15, 0.42); rainTree(-9.6, -1.8, 1.0, 0.25); rainTree(13.2, -2.4, 1.35, 0.55); rainTree(-14.5, -2.2, 1.3, 0.3);
  palm(10.6, 0.4, 1.0, 0.6, 0.18); palm(-12.0, 0.6, 1.05, 0.35, -0.14); palm(16.5, 0.8, 1.1, 0.7, 0.1);
  [[-1.1, 1.15], [2.25, 1.18], [3.55, 1.2], [-8.4, 1.2], [9.4, 1.15], [-11, 1.2]].forEach(([x, z], i) => bush(x, z, 0.8, 0.55 + i * 0.05));
  /* แปลงหน้าถนน: พุ่มไม้ ดอกไม้ ต้นไม้ขอบภาพ */
  rainTree(-13.6, 6.8, 1.2, 0.9); palm(14.2, 6.6, 1.1, 0.95, -0.1);

  /* ── เสาไฟ สายไฟระโยง (สูงกว่าป้ายร้าน) · โคมถนน (แขนยื่นออกถนน ไม่บังป้าย) ── */
  const poles = [[-3.05, 1.32], [6.3, 1.32], [-11.6, 1.32], [15.2, 1.32]], tops = [];
  poles.forEach(([x, z], i) => { const g = group(x, z); pop(g, 0.38 + i * 0.06, 't');
    mesh(new THREE.CylinderGeometry(0.075, 0.1, 6.2, 8), toon('#9aa0a8'), 0, 3.1, 0, g);
    box(1.1, 0.08, 0.08, '#7b828c', 0, 5.85, 0, g); box(0.8, 0.07, 0.07, '#7b828c', 0, 5.45, 0, g);
    if (i === 0) mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 10), toon('#8d949c'), 0.25, 4.9, 0.05, g);
    tops.push(new THREE.Vector3(x, 5.9, z)); });
  const wireMat = basic('#22232a'), wires = [];
  const wire = (a, b, sag) => { const mid = a.clone().lerp(b, 0.5); mid.y -= sag; const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 24, 0.014, 3, false), wireMat); scene.add(m); wires.push(m); };
  [[2, 0], [0, 1], [1, 3]].forEach(([a, b]) => { for (let k = 0; k < 3; k++) { const off = new THREE.Vector3(-0.45 + k * 0.45, -(k % 2) * 0.4, 0); wire(tops[a].clone().add(off), tops[b].clone().add(off), 0.42 + k * 0.1); } });
  wires.forEach(w => { w.visible = noIntro; });
  const lamp = group(3.45, 1.3); pop(lamp, 0.48, 't');
  mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.1, 8), toon('#5d636c'), 0, 2.05, 0, lamp);
  box(0.06, 0.06, 0.75, '#5d636c', 0, 4.05, 0.32, lamp); box(0.22, 0.12, 0.34, '#3b4047', 0, 3.95, 0.68, lamp);
  box(0.16, 0.04, 0.26, basic('#fff1cf'), 0, 3.88, 0.68, lamp, { cast: false });
  glow(3.45, 3.85, 2.0, 2.4);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), poolMat()); pool.rotation.x = -Math.PI / 2; pool.position.set(3.45, 0.03, 2.2); scene.add(pool);
  const doorPool = new THREE.Mesh(new THREE.CircleGeometry(1.8, 24), poolMat()); doorPool.rotation.x = -Math.PI / 2; doorPool.scale.set(1.3, 0.7, 1); doorPool.position.set(0, 0.16, 1.5); scene.add(doorPool);

  /* ── เมืองไกล + เจดีย์ (หมอกกลืน) ── */
  const city = new THREE.Group(); scene.add(city); pop(city, 0.0, 'f');
  const cityWin = [];
  [[-44, 7], [-38, 10], [-33, 6], [-27, 11], [-21, 7.5], [-16, 12], [-10, 8], [-5, 10.5], [0, 7], [5, 11.5], [10, 8], [15, 10], [20, 7], [26, 9.5]].forEach(([x, h], i) => {
    const w = 3 + (i % 3) * 1.2, z = -42 - (i % 4) * 3; box(w, h, 3, i % 2 ? '#8ea2c4' : '#9aaccc', x, 0, z, city, { cast: false });
    for (let r = 1.2; r < h - 0.8; r += 1.5) for (let c = -w / 2 + 0.6; c < w / 2 - 0.3; c += 0.9) cityWin.push([x + c, r, z + 1.52, rnd()]); });
  const chedi = group(-22, -30, city); chedi.scale.setScalar(1.6);
  [[1.5, 0.6, '#d9c08a'], [1.15, 0.6, '#e2c995'], [0.8, 0.9, '#e8cf9a']].reduce((y, [r, h, c]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r, h, 10), toon(c)); m.position.y = y + h / 2; chedi.add(m); return y + h; }, 0);
  { const bell = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon('#efd8a6')); bell.position.y = 2.1; chedi.add(bell);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.32, 3.2, 10), toon('#f2cf6a')); sp.position.y = 4.3; chedi.add(sp); }
  const cityWinMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.4, 0.6), new THREE.MeshBasicMaterial({ color: 0xffffff }), cityWin.length);
  { const o = new THREE.Object3D(); cityWin.forEach(([x, y, z], i) => { o.position.set(x, y, z); o.updateMatrix(); cityWinMesh.setMatrixAt(i, o.matrix); }); city.add(cityWinMesh); }

  /* ── สร้าง InstancedMesh ของซ้ำ ── */
  const O = new THREE.Object3D(), V = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
  const inst = (geo, mat, list, place, cast = true) => { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); m.count = list.length; m.castShadow = cast; m.receiveShadow = true;
    list.forEach((it, i) => { place(it, O); O.updateMatrix(); m.setMatrixAt(i, O.matrix); it.m = O.matrix.clone(); if (it.c) m.setColorAt(i, new THREE.Color(it.c)); }); scene.add(m); return m; };
  const folMesh = inst(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: GM, flatShading: true }), FOL, (f, o) => { o.position.set(f.x, f.y, f.z); o.rotation.set(0, f.x * 3.1, 0); o.scale.set(f.r, f.r * (f.sy || 0.9), f.r); });
  const trkGeo = new THREE.CylinderGeometry(0.7, 1, 1, 7); trkGeo.translate(0, 0.5, 0);
  const trkMesh = inst(trkGeo, toon('#8a5a3c'), TRK, (t, o) => { o.position.set(t.x, t.y, t.z); o.rotation.set(0, 0, -t.tilt); o.scale.set(t.r, t.h, t.r); });
  const frondGeo = (() => { const g = new THREE.PlaneGeometry(0.34, 1.7, 1, 6); g.translate(0, 0.85, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, -Math.pow(y / 1.7, 2) * 0.9); p.setX(i, p.getX(i) * (1 - Math.pow(y / 1.7 - 0.45, 2) * 1.6)); } g.computeVertexNormals(); return g; })();
  const frondMesh = inst(frondGeo, toon('#4fa64a', { side: THREE.DoubleSide }), FROND, (f, o) => { o.position.set(f.x, f.y, f.z); o.rotation.set(0, f.ry, 0, 'YXZ'); o.rotateX(-Math.PI / 2 + f.droop); o.scale.setScalar(f.s); });
  const flwMesh = inst(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: GM, flatShading: true }), FLW, (f, o) => { o.position.set(f.x, f.y, f.z); o.rotation.set(0, 0, 0); o.scale.setScalar(f.r); }, false);
  const tankMesh = inst(new THREE.CylinderGeometry(0.32, 0.32, 0.6, 12), toon('#4f8fd0'), TANK, (t, o) => { o.position.set(t.x, t.y + 0.3, t.z); o.rotation.set(0, 0, 0); o.scale.setScalar(1); });
  const antGeo = new THREE.BoxGeometry(0.05, 1, 0.05); antGeo.translate(0, 0.5, 0);
  const antMesh = inst(antGeo, toon('#7b828c'), ANT, (a, o) => { o.position.set(a.x, a.y, a.z); o.rotation.set(0, 0, 0); o.scale.set(1, a.h, 1); });
  const acMesh = inst(rbox(0.42, 0.3, 0.22, 0.04), toon('#f0efea'), ACU, (a, o) => { o.position.set(a.x, a.y, a.z); o.rotation.set(0, 0, 0); o.scale.setScalar(1); });
  const instPop = [[folMesh, FOL], [trkMesh, TRK], [frondMesh, FROND], [flwMesh, FLW], [tankMesh, TANK], [antMesh, ANT], [acMesh, ACU]];
  instPop.forEach(([m, list]) => list.forEach((it, i) => { if (it.delay == null) it.delay = 0.45 + rnd() * 0.5; if (!noIntro) { it.m.decompose(V, Q, S); O.matrix.compose(V, Q, S.multiplyScalar(0.0001)); m.setMatrixAt(i, O.matrix); } }));

  /* หน้าต่างทั้งฉาก (ซ่อนไว้จนเด้งเสร็จ) */
  const winMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), winList.length);
  const frameMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), toon('#fbf6ee'), winList.length);
  winList.forEach((w, i) => { V.set(w.x, w.y, w.z).add(w.g.position); if (w.g.parent && w.g.parent !== scene) V.add(w.g.parent.position);
    O.position.copy(V); O.rotation.set(0, w.ry, 0); O.scale.set(w.w + 0.12, w.h + 0.12, 1); O.translateZ(0.004); O.updateMatrix(); frameMesh.setMatrixAt(i, O.matrix);
    O.scale.set(w.w, w.h, 1); O.translateZ(0.006); O.updateMatrix(); winMesh.setMatrixAt(i, O.matrix); });
  frameMesh.receiveShadow = true; scene.add(frameMesh, winMesh);
  winMesh.visible = frameMesh.visible = noIntro;

  /* ── เมฆปุยการ์ตูน ── */
  const cloudMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: GM, emissive: 0x222222, flatShading: true });
  const clouds = [];
  [[-16, 11.5, -30, 2.0, 0.22], [-5, 13.5, -36, 1.6, 0.16], [6, 11.8, -28, 1.8, 0.26], [17, 14.5, -40, 2.4, 0.12], [-26, 14, -42, 2.2, 0.1], [26, 10.5, -26, 1.4, 0.3]].forEach(([x, y, z, s, sp], i) => {
    const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g); const inner = new THREE.Group(); g.add(inner);
    [[0, 0, 0, 1.2], [-1.2, -0.25, 0.2, 0.85], [1.25, -0.2, 0.1, 0.95], [0.4, 0.55, 0, 0.8], [-0.5, 0.4, -0.3, 0.7], [2.1, -0.4, -0.2, 0.6]].forEach(([a, b, c, r]) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), cloudMat); m.position.set(a * s, b * s, c * s); m.scale.y = 0.82; inner.add(m); });
    clouds.push({ g, sp }); pop(inner, 0.9 + i * 0.07, 'c'); });

  /* ── นก ── */
  const birds = new THREE.Group(); scene.add(birds); const birdList = [];
  for (let i = 0; i < 5; i++) { const b = new THREE.Group(); const wm = new THREE.MeshBasicMaterial({ color: 0x2a2a35, side: THREE.DoubleSide });
    const g1 = new THREE.PlaneGeometry(0.42, 0.1); g1.translate(-0.21, 0, 0); const g2 = new THREE.PlaneGeometry(0.42, 0.1); g2.translate(0.21, 0, 0);
    const wl = new THREE.Mesh(g1, wm), wr = new THREE.Mesh(g2, wm); b.add(wl, wr); b.position.set(-16 - (i % 3) * 0.9 - i * 0.4, 8.4 + (i % 2) * 0.5 - i * 0.12, -8 - i * 0.3); birds.add(b); birdList.push({ b, wl, wr, ph: i * 0.9 }); }

  /* ── รถลาก Cendon ── */
  const truck = new THREE.Group(); truck.position.set(-18, 0, 2.45); scene.add(truck);
  box(1.0, 0.85, 1.0, '#e8843c', 0.95, 0.32, 0, truck, { line: 0.04, r: 0.14 }); box(0.62, 0.42, 1.02, glass, 1.08, 0.86, 0, truck, { mat: glass });
  box(0.75, 0.34, 1.0, '#e8843c', 1.02, 1.15, 0, truck, { r: 0.12 }); box(2.1, 0.22, 1.1, '#7d8592', -0.6, 0.42, 0, truck); box(1.9, 0.08, 1.05, '#c5ccd6', -0.6, 0.66, 0, truck);
  box(0.12, 0.6, 0.12, '#5c636e', -1.5, 0.66, 0, truck); box(0.1, 0.12, 0.4, basic('#f7b733'), 1.0, 1.49, 0, truck, { mat: basic('#f7b733') });
  const wheels = [];
  [[1.05, 0.48], [1.05, -0.48], [-1.05, 0.48], [-1.05, -0.48]].forEach(([x, z]) => { const w = mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 12), toon('#26262b'), x, 0.24, z, truck); w.rotation.x = Math.PI / 2; wheels.push(w); });
  const head = [glow(1.52, 0.55, 0.32, 0.9, truck), glow(1.52, 0.55, -0.32, 0.9, truck)], beacon = glow(1.0, 1.55, 0, 1.2, truck, 0xffb020);
  const headPool = new THREE.Mesh(new THREE.CircleGeometry(1.2, 20), poolMat()); headPool.rotation.x = -Math.PI / 2; headPool.position.set(2.6, 0.02, 0); headPool.scale.set(1.6, 0.8, 1); truck.add(headPool);

  /* ── แมวส้มนั่งหน้าอู่ ── */
  const cat = group(-1.35, 1.0); pop(cat, 0.85); cat.rotation.y = 0.5;
  const catM = toon('#f2a14e'), catW = toon('#fff4e6');
  const body = mesh(new THREE.SphereGeometry(0.2, 14, 10), catM, 0, 0.36, 0, cat); body.scale.set(1, 1.15, 0.9);
  mesh(new THREE.SphereGeometry(0.12, 10, 8), catW, 0, 0.36, 0.12, cat);
  const headM = mesh(new THREE.SphereGeometry(0.15, 14, 10), catM, 0, 0.66, 0.04, cat);
  [-0.08, 0.08].forEach(x => { const e = mesh(new THREE.ConeGeometry(0.055, 0.12, 4), catM, x, 0.8, 0.02, cat); e.rotation.z = -x * 2;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), basic('#1d1d22')); eye.position.set(x * 0.75, 0.68, 0.17); cat.add(eye); });
  const tailGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.42, 8); tailGeo.translate(0, 0.21, 0);
  const tail = mesh(tailGeo, catM, 0, 0.2, -0.16, cat); tail.rotation.x = -0.9;

  /* ── เวลา + สี ── */
  let hour = opts.hour ?? nowHour(), target = hour, follow = opts.hour == null, tweenFrom = hour, tweenAt = 0, tweenDur = 0;
  function nowHour() { const d = new Date(); return d.getHours() + d.getMinutes() / 60; }
  const winDay = new THREE.Color('#8fb3d6'), winUnlit = new THREE.Color('#25304a'), winLit = new THREE.Color('#ffd27a'), winWarm = new THREE.Color('#ffb85c'), cTmp = new THREE.Color();
  const cityDay = new THREE.Color('#a9bbd8'), cityNight = new THREE.Color('#ffd38a'), cityOff = new THREE.Color('#2a3150');
  let lastNight = -1;
  function applyTime(h) {
    const k = atHour(h), s = sunAt(h), n = k.night;
    skyU.top.value.copy(k.top); skyU.hor.value.copy(k.hor); skyU.bot.value.copy(k.bot); skyU.sunCol.value.copy(k.sun); skyU.night.value = n;
    skyU.sunDir.value.copy(s.dir); skyU.sunVis.value = ss(-0.06, 0.05, s.e);
    scene.fog.color.copy(k.hor).lerp(k.top, 0.25);
    hemi.color.copy(k.hs); hemi.groundColor.copy(k.hg); hemi.intensity = k.hi;
    const useSun = ss(-0.1, 0.06, s.e), dir = MOON.clone().lerp(s.dir.clone().setY(Math.max(s.dir.y, 0.12)).normalize(), useSun).normalize();
    sun.position.copy(dir).multiplyScalar(36); sun.color.copy(k.sun); sun.intensity = k.si;
    cloudMat.color.copy(k.cloud); cloudMat.emissive.copy(k.cloud).multiplyScalar(0.22 + n * 0.1);
    const lit = ss(0.15, 0.7, n);
    lampL.intensity = lit * 10; shopL.intensity = 1.4 + lit * 5;
    glows.forEach(g => { g.material.opacity = lit * 0.9; }); signGlow.material.opacity = lit * 0.55;
    pool.material.opacity = lit * 0.55; headPool.material.opacity = lit * 0.5; doorPool.material.opacity = lit * 0.45;
    sign.material.color.setScalar(0.94 + lit * 0.2); boards.forEach(b => b.material.color.setScalar(0.88 - n * 0.2 + lit * 0.3));
    birds.visible = n < 0.35;
    if (Math.abs(n - lastNight) > 0.004 || lastNight < 0) {
      lastNight = n;
      winList.forEach((w, i) => { const on = w.lit && lit > w.seed * 0.85; cTmp.copy(winDay).lerp(on ? (w.seed > 0.5 ? winLit : winWarm) : winUnlit, on ? lit : Math.min(1, n * 1.2)); winMesh.setColorAt(i, cTmp); });
      winMesh.instanceColor.needsUpdate = true;
      cityWin.forEach(([, , , r], i) => { cTmp.copy(cityDay).lerp(r < 0.45 ? cityNight : cityOff, n); cityWinMesh.setColorAt(i, cTmp); }); cityWinMesh.instanceColor.needsUpdate = true;
    }
  }
  winList.forEach((w, i) => winMesh.setColorAt(i, winDay)); cityWin.forEach((c, i) => cityWinMesh.setColorAt(i, cityDay));
  applyTime(hour);

  function resize() { const w = canvas.clientWidth || 390, h = canvas.clientHeight || 360; R.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = FOV * Math.max(1, 1.05 / camera.aspect) ** (view === VIEWS.strip ? 0 : 0.6); camera.updateProjectionMatrix(); wake(); }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null; ro && ro.observe(canvas);

  /* ── เด้ง: ยืดขึ้นแบบสปริง (สูงเกินนิด แล้วยุบ) + กว้างแบบเด้งกลับ ── */
  const back = (t, s = 2.2) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
  const elastic = t => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 8 - 0.75) * (2 * Math.PI / 3)) + 1;
  const squash = (t, sx, sy, sz) => { const y = Math.max(0.0001, elastic(t)), xz = Math.max(0.0001, back(t, 2.4) * (1 + (1 - y) * 0.35)); return [sx * xz, sy * y, sz * xz]; };
  let introAt = performance.now(), introDone = noIntro;
  function intro(now) {
    const t0 = (now - introAt) / 1000; let busy = false;
    for (const p of pops) {
      const t = Math.min(1, Math.max(0, (t0 - p.delay) / (p.kind === 'c' ? 1.0 : 0.9)));
      if (t < 1) busy = true;
      if (p.kind === 'f') { p.obj.scale.set(1, Math.max(0.0001, back(t, 1.4)), 1); continue; }
      if (p.kind === 'c') { p.obj.scale.setScalar(Math.max(0.0001, back(t, 1.6))); continue; }
      p.obj.scale.set(...squash(t, 1, 1, 1));
    }
    for (const [m, list] of instPop) { let dirty = false;
      list.forEach((it, i) => { if (it.done) return; const t = Math.min(1, Math.max(0, (t0 - it.delay) / 0.8)); if (t < 1) busy = true; else it.done = true;
        it.m.decompose(V, Q, S); const [a, b, c] = squash(t, S.x, S.y, S.z); O.matrix.compose(V, Q, S.set(a, b, c)); m.setMatrixAt(i, O.matrix); dirty = true; });
      if (dirty) m.instanceMatrix.needsUpdate = true; }
    const cam = Math.min(1, t0 / 1.8), ce = 1 - Math.pow(1 - cam, 3);
    camera.position.set(view.pos[0] + 1.5 * (1 - ce), view.pos[1] - 0.6 * (1 - ce), view.pos[2] + 5 * (1 - ce)); camera.lookAt(view.look[0], view.look[1], view.look[2]);
    if (t0 > 0.8 && !winMesh.visible) { winMesh.visible = frameMesh.visible = true; wires.forEach(w => { w.visible = true; }); }
    if (!busy && cam >= 1) { introDone = true; winMesh.visible = frameMesh.visible = true; wires.forEach(w => { w.visible = true; }); }
  }
  camera.position.set(...view.pos); camera.lookAt(...view.look);

  /* ── วาด: เฉพาะตอนมองเห็น · หลังเด้งเสร็จ 30 ภาพ/วิ ── */
  let raf = 0, visible = true, paused = false, first = true, last = 0, t = 0, frames = 0, fpsAt = performance.now(), fps = 0, alive = true, follower = 0, signBounceAt = -1;
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(e => { visible = e[0].isIntersecting; wake(); }) : null; io && io.observe(canvas);
  const onVis = () => wake(); document.addEventListener('visibilitychange', onVis);
  function wake() { if (!raf && alive) raf = requestAnimationFrame(loop); }
  function loop(now) {
    raf = 0; if (!alive || !visible || paused || document.hidden) return;
    const busyAnim = !introDone || tweenDur || signBounceAt >= 0;
    const minGap = busyAnim ? 0 : 1000 / (FPS + 1);
    if (now - last < minGap) { raf = requestAnimationFrame(loop); return; }
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; t += dt;
    if (!introDone) intro(now);
    if (tweenDur) { const p = Math.min(1, (now - tweenAt) / tweenDur), e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; hour = tweenFrom + (target - tweenFrom) * e; if (p >= 1) { hour = target; tweenDur = 0; } applyTime(hour); }
    if (signBounceAt >= 0) { const p = (now - signBounceAt) / 650; if (p >= 1) { signG.scale.setScalar(1); signBounceAt = -1; } else { const [a, b, c] = squash(p, 1, 1, 1); signG.scale.set(a, 0.6 + 0.4 * b, c); } }
    skyU.time.value = t;
    if (!still) {
      clouds.forEach(c => { c.g.position.x += c.sp * dt; if (c.g.position.x > 40) c.g.position.x = -40; });
      birdList.forEach((b, i) => { b.b.position.x += dt * 1.25; if (b.b.position.x > 20) b.b.position.x = -20 - i; const f = Math.sin(t * 9 + b.ph) * 0.7; b.wl.rotation.z = f; b.wr.rotation.z = -f; });
      truck.position.x += dt * 2.3; if (truck.position.x > 19) truck.position.x = -19; wheels.forEach(w => { w.rotation.y += dt * 9; });
      beacon.material.opacity = (Math.sin(t * 9) > 0 ? 1 : 0.2) * Math.max(0.35, skyU.night.value);
      head.forEach(h => { h.material.opacity = ss(0.15, 0.7, skyU.night.value); });
      tail.rotation.z = Math.sin(t * 2.2) * 0.45; headM.rotation.y = Math.sin(t * 0.7) * 0.35;
    }
    R.render(scene, camera);
    if (first) { first = false; try { opts.onFrame && opts.onFrame(); } catch (e) {} }
    frames++; if (now - fpsAt > 1000) { fps = Math.round(frames * 1000 / (now - fpsAt)); frames = 0; fpsAt = now; }
    if (!still || !introDone || tweenDur || signBounceAt >= 0) raf = requestAnimationFrame(loop);
  }
  if (follow) follower = setInterval(() => { if (follow) setHour(nowHour(), { ms: 1500, keepFollow: true }); }, 30000);
  function setHour(h, o = {}) {
    if (h == null) { follow = true; h = nowHour(); } else if (!o.keepFollow) follow = false;
    const d = ((h - hour) % 24 + 36) % 24 - 12;
    tweenFrom = hour; target = hour + d; tweenAt = performance.now(); tweenDur = o.ms || 1300;
    if (o.animate === false) { hour = target; tweenDur = 0; applyTime(hour); R.render(scene, camera); } wake();
  }
  /* แต่งร้าน: ชื่อบนป้าย · สีป้าย · สีผนังร้าน · สีคาดหลังคา — ป้ายเด้งนิดหนึ่งให้รู้ว่าเปลี่ยนแล้ว */
  function setShop(o = {}) {
    Object.assign(shop, o);
    if ('wallColor' in o) wallMat.color.set(shop.wallColor);
    if ('accentColor' in o) accentMat.color.set(shop.accentColor);
    if ('name' in o || 'signColor' in o) drawSign();
    if (!still && o.bounce !== false) signBounceAt = performance.now();
    R.render(scene, camera); wake();
  }
  resize(); wake();
  return {
    setHour, setShop, getShop: () => ({ ...shop }), getHour: () => ((hour % 24) + 24) % 24, following: () => follow,
    /* หยุด/เดินวาดจากภายนอก (เช่น แผ่นอื่นเปิดทับ หรือหน้าในกรอบแอปถูกซ่อน) */
    pause(on) { paused = !!on; if (!paused) wake(); },
    replay() { if (noIntro) return; introAt = performance.now(); introDone = false; winMesh.visible = frameMesh.visible = false; wires.forEach(w => { w.visible = false; }); pops.forEach(p => p.obj.scale.setScalar(0.0001));
      instPop.forEach(([m, list]) => { list.forEach((it, i) => { it.done = false; it.m.decompose(V, Q, S); O.matrix.compose(V, Q, S.multiplyScalar(0.0001)); m.setMatrixAt(i, O.matrix); }); m.instanceMatrix.needsUpdate = true; }); wake(); },
    info: () => ({ fps, calls: R.info.render.calls, triangles: R.info.render.triangles, low, still }),
    bench(n = 60) { const a = performance.now(); for (let i = 0; i < n; i++) R.render(scene, camera); R.getContext().finish(); return (performance.now() - a) / n; },
    /* คืนทุกอย่างทันที (รวม WebGL context) — หน้าเปิด/ปิดฉากบ่อยไม่สะสมจนเบราว์เซอร์ตัดฉากเก่าทิ้ง */
    dispose() { if (!alive) return; alive = false; cancelAnimationFrame(raf); clearInterval(follower); ro && ro.disconnect(); io && io.disconnect(); document.removeEventListener('visibilitychange', onVis);
      const tex = new Set([GM]), done = new Set(mats.values());
      scene.traverse(o => { o.geometry && o.geometry.dispose(); [].concat(o.material || []).forEach(m => done.add(m)); });
      done.forEach(m => { for (const k of ['map', 'alphaMap', 'emissiveMap', 'gradientMap']) m[k] && tex.add(m[k]); m.dispose(); });
      tex.forEach(x => x.dispose()); R.dispose(); try { R.forceContextLoss(); } catch (e) {} }
  };
}
export const period = h => { h = ((h % 24) + 24) % 24; return h >= 5 && h < 11 ? 'morning' : h < 16 ? 'day' : h < 19 ? 'dusk' : 'night'; };
