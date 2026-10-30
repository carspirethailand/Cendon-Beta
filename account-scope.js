/* ═══════════════════════════════════════════════════════════════════
   ข้อมูลในเครื่องเป็นของ "บัญชีเดียว" เสมอ (window.CendonScope)
   ───────────────────────────────────────────────────────────────────
   แอปเก็บรถ แชต สมุดรถ ชื่อและรูปโปรไฟล์ไว้ในเครื่อง (localStorage) เพื่อให้เปิดเร็ว
   เดิมไม่มีใครจดว่าข้อมูลชุดนี้เป็นของบัญชีไหน — ออกจากระบบแล้วเข้าอีกบัญชี
   หน้าแอปจึงวาดชื่อ/รถของบัญชีเก่าก่อน และตัวซิงก์ยังรวมรถของบัญชีเก่าเข้ากับบัญชีใหม่อยู่พักหนึ่ง
   ตัวนี้ทำหน้าที่:
     • จดเจ้าของข้อมูลในเครื่อง (spire___owner = uid)
     • บัญชีที่เข้ามาไม่ใช่เจ้าของ → ล้างข้อมูลส่วนตัวทั้งหมดก่อน เหลือแค่ภาษา/ธีมของเครื่อง
     • ออกจากระบบ → ส่งของที่ค้างขึ้นคลาวด์ (ถ้าทันใน ~1 วิ) แล้วล้างทันที
     • หน้าเข้าสู่ระบบโหลดรถ แชต สมุดรถ ของบัญชีที่เพิ่งเข้าลงเครื่องก่อนพาเข้าแอป
       หน้าแรกที่เปิดจึงเป็นของบัญชีนี้ตั้งแต่เฟรมแรก ไม่มีของบัญชีอื่นแวบขึ้นมา
     • อีกแท็บเปลี่ยน/ออกจากบัญชี → แท็บนี้หยุดเขียนลงเครื่องแล้วโหลดใหม่ ไม่เขียนของเก่าทับ
   โหลดแบบไม่ defer ต่อจาก auth-gate.js ทุกหน้าแอป และในหน้าเข้าสู่ระบบ
   ═══════════════════════════════════════════════════════════════════ */
(function(W,D){
  'use strict';
  if(W.CendonScope)return;
  const OWNER='spire___owner';
  /* ค่าของเครื่อง ไม่ใช่ของบัญชี — คงไว้ข้ามบัญชี (หน้าเข้าสู่ระบบใช้ภาษา/ธีมเดิมของเครื่อง)
     firebase:* = สถานะล็อกอินของ Firebase เอง ห้ามแตะ */
  // Only per-UID home-card visibility flags survive sign-out; no shop data or role.
  const KEEP=new Set(['spire_theme','spire_chatTheme','spire_lang','cendon_signed','cendon_cfg','cendon_partner_home',OWNER]);
  const KEEP_SESSION=new Set(['cendon_intro','cendon_cloud_in']);
  const kept=k=>KEEP.has(k)||/^firebase[:_]/i.test(k);
  const LOGIN=/^\/login(?:\.html)?\/?$/.test(location.pathname);
  const read=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
  const owner=()=>{try{return localStorage.getItem(OWNER)||null}catch(e){return null}};
  function keys(store){const out=[];try{for(let i=0;i<store.length;i++){const k=store.key(i);if(k)out.push(k)}}catch(e){}return out}
  /* เครื่องที่ใช้มาก่อนมีป้ายเจ้าของ: ดูว่าข้อมูลเดิมบอกว่าเป็นของ uid ไหน */
  function hints(){
    const out=new Set();
    for(const k of ['spire_cachedUser','spire_setup','cendon_paint_identity','spire_studio_snap','spire_callnotes','spire_partner']){
      const v=read(k);if(v&&typeof v==='object'&&typeof v.uid==='string'&&v.uid)out.add(v.uid);
    }
    return out;
  }
  /* ข้อมูลของบัญชีจริง ๆ (ไม่นับป้ายบอกใบ้หน้าจอ) — เครื่องใหม่ที่มีแค่ป้ายเล็ก ๆ จะได้ไม่ต้องโหลดหน้าใหม่ */
  const USER_DATA=/^spire_(garage|selCar|cachedUser|setup|chatSessions|skills|partner|studio_snap|callnotes|tech_contact|odo_queue|fbQueue|mediaQueue|(sess|cursess|chatMsgs|carlab_\w+|cal_price|reg|wf|chatc|inbox|odo|drive_draft)_)|^spire___account_|^cendon_(line_|plain:|reveal:)/;
  const personal=()=>keys(localStorage).some(k=>USER_DATA.test(k));
  function wipe(){
    for(const k of keys(localStorage))if(!kept(k))try{localStorage.removeItem(k)}catch(e){}
    try{for(const k of keys(sessionStorage))if(!KEEP_SESSION.has(k))sessionStorage.removeItem(k)}catch(e){}
    /* รูป/เสียงที่แนบในแชตเก็บสำเนาในเครื่องด้วย — ของจริงอยู่บนเซิร์ฟเวอร์ ดึงกลับได้ */
    try{indexedDB.deleteDatabase('cendon-media')}catch(e){}
  }
  /* หน้าแอปที่กำลังจะโหลดใหม่/ออกไป: ห้ามเขียนข้อมูลส่วนตัวลงเครื่องอีก
     (ตัวแปรในหน่วยความจำยังเป็นของบัญชีเดิม ถ้าปล่อยให้บันทึกตอนปิดหน้า มันจะไปปนกับบัญชีใหม่) */
  let frozen=false;
  function freeze(){
    if(frozen||LOGIN)return;frozen=true;
    try{const set=Storage.prototype.setItem;
      Storage.prototype.setItem=function(k,v){if(this===W.localStorage&&!kept(String(k)))return;return set.call(this,k,v)}}catch(e){}
  }
  /* บัญชีนี้เข้ามา: ข้อมูลในเครื่องเป็นของคนอื่น (หรือบอกไม่ได้ว่าของใคร) → ล้างก่อน · คืน true ถ้าล้าง */
  function claim(uid){
    if(typeof uid!=='string'||!uid)return false;
    const was=owner();if(was===uid)return false;
    let dirty;
    if(was)dirty=true;
    else{const h=hints();dirty=h.size?(h.size>1||!h.has(uid)):personal()}
    if(dirty)wipe();
    try{localStorage.setItem(OWNER,uid)}catch(e){}
    return dirty;
  }
  /* ก่อนส่งข้อมูลในเครื่องขึ้นเซิร์ฟเวอร์ (ซิงก์รถ/ซิงก์คลาวด์): ข้อมูลในเครื่องต้องเป็นของบัญชีที่ล็อกอินอยู่
     ตัวซิงก์ของบางหน้าทำงานก่อน account.js — ตรวจ/ล้างตรงนี้ด้วย ของบัญชีเก่าจะได้ไม่ถูกส่งไปในนามบัญชีใหม่
     คืน false = ห้ามส่ง (กำลังล้างแล้วโหลดหน้าใหม่) */
  function mine(uid){
    if(frozen||typeof uid!=='string'||!uid)return false;
    if(owner()===uid)return true;
    if(claim(uid)){if(!LOGIN){freeze();setTimeout(()=>location.reload(),0)}return false}
    return true;
  }
  /* ออกจากระบบแล้ว: ไม่มีข้อมูลส่วนตัวของใครเหลือในเครื่อง */
  function release(){wipe();try{localStorage.removeItem(OWNER)}catch(e){}}
  const auth=()=>{try{return W.auth||W.spireAuth||(W.firebase&&W.firebase.apps&&W.firebase.apps.length?W.firebase.auth():null)}catch(e){return null}};
  /* ปุ่มออกจากระบบทุกหน้าเรียกตัวนี้: ส่งของที่ยังค้างขึ้นก่อน (ไม่รอเกิน 1.2 วิ) → ออก → ล้าง */
  async function signOut(){
    try{if(typeof W.cloudFlush==='function')await Promise.race([W.cloudFlush(),new Promise(r=>setTimeout(r,1200))])}catch(e){}
    const a=auth();
    if(a)await a.signOut();
    release();if(!LOGIN)freeze();
  }

  /* ── หน้าเข้าสู่ระบบ: เตรียมข้อมูลของบัญชีที่เพิ่งเข้าให้พร้อมก่อนพาเข้าแอป ──
     กติกาเดียวกับตัวซิงก์ในหน้าการาจ/แชต (FIXED/isTracked/sig ต้องตรงกัน)
     แต่ไม่แตะ setup/lang/units — account.js เขียนจากโปรไฟล์บนเซิร์ฟเวอร์เองแล้ว */
  const FIXED=['theme','chatTheme','primary','chatStyle','garage','selCar','skills','skillcat','chatSessions','notify'];
  const tracked=k=>FIXED.indexOf(k)>=0||/^(sess|cursess|chatMsgs|carlab_log|carlab_iv|carlab_todo|carlab_sym|cal_price|reg)_/.test(k);
  function sig(str){let h=5381;for(let i=0;i<str.length;i++)h=((h*33)^str.charCodeAt(i))>>>0;return str.length+':'+h.toString(36)}
  const obj=k=>{const v=read(k);return v&&typeof v==='object'&&!Array.isArray(v)?v:{}};
  /* รถ: รายการในคลาวด์ (มีประวัติ/สี) รวมกับตารางรถบนเซิร์ฟเวอร์ (ตัวจริงว่าบัญชีนี้มีรถคันไหน) */
  function cars(list,rows){
    const byId=new Map();
    (Array.isArray(list)?list:[]).forEach(c=>{if(c&&c.id)byId.set(c.id,Object.assign({},c))});
    (Array.isArray(rows)?rows:[]).forEach(c=>{
      if(!c||!c.id)return;const prev=byId.get(c.id)||{},name=((c.make||'')+' '+(c.model||'')).trim();
      let info=prev.info;try{const o=c.info?JSON.parse(c.info):null;if(o&&Object.keys(o).length)info=o}catch(e){}
      byId.set(c.id,Object.assign({},prev,{id:c.id,make:c.make||'',model:c.model||'',name:name||prev.name||'',
        year:c.year!=null?String(c.year):'',mileage:c.mileage!=null?String(c.mileage):'',
        type:prev.type||c.body||null,color:c.color||prev.color||'',info,history:prev.history||[]}));
    });
    return [...byId.values()];
  }
  function adopt(uid,state,rows){
    if(owner()!==uid)return false;
    const meta=obj('spire___meta'),synced=obj('spire___synced'),seen=obj('spire___seen');
    const put=(k,value,t,same)=>{const str=JSON.stringify(value);
      try{localStorage.setItem('spire_'+k,str)}catch(e){return}
      seen[k]=sig(str);
      /* ตรงกับคลาวด์ = ไม่ต้องส่งกลับ · ต่างจากคลาวด์ (เพิ่มรถจากตารางรถ) = ให้ตัวซิงก์ส่งขึ้นรอบแรก */
      if(same){meta[k]=t;synced[k]={t,h:sig(str)}}else{meta[k]=Date.now();delete synced[k]}};
    state=state&&typeof state==='object'?state:{};
    Object.keys(state).forEach(k=>{const r=state[k];if(!tracked(k)||k==='garage'||k==='selCar'||!r||typeof r!=='object'||!('v' in r))return;put(k,r.v,Number(r.t)||1,true)});
    const g=state.garage,list=g&&Array.isArray(g.v)?g.v:[];
    if(Array.isArray(rows)||list.length){
      const all=Array.isArray(rows)?cars(list,rows):list;
      put('garage',all,Number(g&&g.t)||1,!!g&&JSON.stringify(all)===JSON.stringify(g.v));
      const sel=state.selCar&&state.selCar.v,pick=all.some(c=>c.id===sel)?sel:(all[0]&&all[0].id)||'';
      put('selCar',pick,Number(state.selCar&&state.selCar.t)||1,!!state.selCar&&pick===sel);
    }
    try{localStorage.setItem('spire___meta',JSON.stringify(meta));localStorage.setItem('spire___synced',JSON.stringify(synced));localStorage.setItem('spire___seen',JSON.stringify(seen))}catch(e){}
    return true;
  }
  let priming=null,primeUid=null;
  function prime(u){
    if(!u||typeof u.getIdToken!=='function'||typeof W.fetch!=='function')return Promise.resolve(false);
    const uid=u.uid,api=String(W.BACKEND_URL||'https://spireonebackend.carspirethailand.workers.dev').replace(/\/+$/,'');
    if(priming&&primeUid===uid)return priming;
    primeUid=uid;
    priming=(async()=>{
      const tok=await u.getIdToken();
      if(auth()?.currentUser?.uid!==uid||owner()!==uid)return false;
      const get=p=>W.fetch(api+p,{headers:{Authorization:'Bearer '+tok},cache:'no-store',...(W.AbortSignal?.timeout?{signal:W.AbortSignal.timeout(10000)}:{})}).then(r=>r.ok?r.json():null).catch(()=>null);
      const [st,cr]=await Promise.all([get('/api/state'),get('/api/cars?sync=1')]);
      const cur=auth()&&auth().currentUser;if(!cur||cur.uid!==uid)return false;
      const rows=Array.isArray(cr)?cr:cr&&Array.isArray(cr.cars)?cr.cars:null;
      return adopt(uid,st&&st.state,rows);
    })().catch(()=>false);
    const task=priming;task.finally(()=>{if(priming===task)primeUid=null});
    return priming;
  }
  /* รอข้อมูลที่กำลังโหลด ไม่เกิน ms (เน็ตช้าก็ยังเข้าแอปได้ หน้าแอปดึงต่อเอง) */
  const ready=ms=>priming?Promise.race([priming,new Promise(r=>setTimeout(r,ms||2500))]):Promise.resolve(false);
  /* ชื่อ/รูปของบัญชีนี้ สำหรับแถบเมนูทุกหน้า — รูปแบบเดียวกับที่หน้าแอปเก็บ (cachedUser) */
  function me(u,res){
    if(!u||owner()!==u.uid)return;
    const r=res&&typeof res==='object'&&(!res.uid||res.uid===u.uid)?res:{},role=r.role||'user';
    const nm=r.name||u.displayName||(u.email?String(u.email).split('@')[0]:'');
    try{localStorage.setItem('spire_cachedUser',JSON.stringify({uid:u.uid,name:nm,email:r.email||u.email||'',photo:r.photo||u.photoURL||'',role,admin:role==='admin'||role==='owner'}))}catch(e){}
  }

  /* อีกแท็บเปลี่ยนเจ้าของข้อมูล (ออกจากระบบ / เข้าบัญชีอื่น) → แท็บนี้หยุดเขียนแล้วโหลดใหม่
     (จาก "ไม่มีป้าย" เป็นบัญชีเดิม = แค่ติดป้ายครั้งแรก ไม่ต้องโหลดใหม่) */
  W.addEventListener('storage',e=>{
    if(LOGIN||e.storageArea!==W.localStorage)return;
    if(e.key===OWNER?(e.oldValue!==null&&e.newValue!==e.oldValue):e.key===null){freeze();setTimeout(()=>location.reload(),0)}
  });
  W.CendonScope=Object.freeze({owner,claim,mine,release,freeze,signOut,prime,ready,me,frozen:()=>frozen});
})(window,document);
