/* ═══════════════════════════════════════════════════════════════════
   กดแท็บแล้วขึ้นทันที (window.CendonInstant)
   ───────────────────────────────────────────────────────────────────
   ต้นเหตุที่กดแล้วต้องรอ: ทุกแท็บเป็นหน้าเว็บใหม่ทั้งหน้า (~1 MB) — มือถือต้องอ่าน HTML/CSS
   รันสคริปต์ทั้งหมดใหม่ทุกครั้งที่กด (วัดบนมือถือจำลอง: ภาพแรก ~0.75 วิ พร้อมใช้ ~2.2 วิ)
   ตอนนี้: หลังหน้าปัจจุบันโหลดเสร็จและว่างแล้ว ให้เบราว์เซอร์เตรียม "หน้าแท็บล่าง" ไว้เบื้องหลัง
   (Speculation Rules · prerender) พอกดแท็บ หน้านั้นสลับขึ้นมาทันที ไม่ต้องอ่าน/รันใหม่
   ความปลอดภัย (ครั้งก่อนเคยเตรียม "ทุกลิงก์" ล่วงหน้า แล้วถูกถอดออก):
     • เตรียมเฉพาะแท็บล่าง 4 หน้า ไม่แตะลิงก์ที่มีผลข้างเคียง (ออกจากระบบ แนบไฟล์ ฯลฯ)
     • หน้าที่เตรียมไว้ "ยังไม่เรียกเซิร์ฟเวอร์ Cendon" จนกว่าผู้ใช้จะกดเข้าจริง — ไม่มีคำขอซ้ำ/ข้อมูลเปลี่ยนเบื้องหลัง
     • ข้อมูลในเครื่องที่หน้าใช้วาด (รถ ภาษา ธีม หน่วย ชื่อ) เปลี่ยนหลังเตรียมไว้ → เริ่มเตรียมใหม่
       และถ้ากดทันก่อนเตรียมใหม่เสร็จ หน้านั้นโหลดใหม่เองหนึ่งครั้ง ไม่โชว์ของเก่า
     • เบราว์เซอร์ที่ไม่รองรับ (เช่น Safari บน iPhone) ทำงานแบบเดิมทุกอย่าง
   โหลดแบบไม่ defer ต้นหน้า ก่อนสคริปต์อื่นที่เรียกเซิร์ฟเวอร์
   ═══════════════════════════════════════════════════════════════════ */
(function(W,D){
  'use strict';
  if(W.CendonInstant)return;
  /* ข้อมูลที่หน้าแท็บใช้วาดตอนเปิด — เปลี่ยนเมื่อไร หน้าที่เตรียมไว้ถือว่าเก่า */
  const WATCH=['spire_garage','spire_selCar','spire_setup','spire_lang','spire_theme','spire_chatTheme','spire_units','spire_cachedUser','spire___owner','cendon_signed'];
  const TABS=['/','/garage','/messages','/news','/profile'];   /* เรียงตามที่ใช้บ่อย */
  const sig=()=>{let s='';try{for(const k of WATCH)s+=k+'='+(localStorage.getItem(k)||'')+'\n'}catch(e){}return s};
  const shell=p=>{p=String(p||'/').replace(/\.html$/,'').replace(/\/index$/,'/').replace(/\/+$/,'')||'/';const t='/'+(p.split('/')[1]||'');return t};
  const api=u=>{try{const x=new URL(u,location.href);return /\.workers\.dev$/.test(x.hostname)||x.origin===location.origin&&/^\/api(\/|$)/.test(x.pathname)}catch(e){return false}};

  /* ── หน้านี้ถูกเตรียมไว้เบื้องหลัง ── */
  let start=D.prerendering?sig():'';
  if(D.prerendering){
    const queue=[],nativeFetch=W.fetch.bind(W);
    /* คำขอไปเซิร์ฟเวอร์ Cendon รอจนผู้ใช้กดเข้ามาจริง (GET ที่ซ้ำกันยิงครั้งเดียว) */
    W.fetch=function(input,init){
      if(!D.prerendering||!api(typeof input==='string'?input:input&&input.url))return nativeFetch(input,init);
      return new Promise((resolve,reject)=>queue.push({input,init,resolve,reject}));
    };
    D.addEventListener('prerenderingchange',()=>{
      W.fetch=nativeFetch;
      /* ข้อมูลในเครื่องเปลี่ยนระหว่างรอ (เช่น เพิ่งเพิ่มรถ/เปลี่ยนภาษาในหน้าก่อน) → โหลดหน้านี้ใหม่ให้ตรงของจริง */
      if(sig()!==start){location.reload();return}
      const shared=new Map();
      for(const q of queue){
        const url=typeof q.input==='string'?q.input:q.input.url,method=String(q.init&&q.init.method||q.input&&q.input.method||'GET').toUpperCase();
        const key=method==='GET'&&!(q.init&&q.init.body)?url+'\n'+JSON.stringify(q.init&&q.init.headers||null):null;
        let p=key&&shared.get(key);
        if(!p){p=nativeFetch(q.input,q.init);if(key)shared.set(key,p)}
        p.then(r=>q.resolve(key?r.clone():r),q.reject);
      }
      queue.length=0;
    },{once:true});
  }

  /* ── หน้าที่ผู้ใช้กำลังดู: เตรียมแท็บอื่นไว้ ── */
  const supported=()=>{try{return HTMLScriptElement.supports&&HTMLScriptElement.supports('speculationrules')}catch(e){return false}};
  let rules=null,timer=0,last='';
  function urls(){
    const here=shell(location.pathname),home=here==='/'||here==='/messages'||!/^\/(garage|news|profile|spares|chat)$/.test(here);
    /* หน้าแรกเปิดกล่องข้อความในหน้าเดิมอยู่แล้ว ไม่ต้องเตรียม /messages ซ้ำ
       หน้าที่เตรียมไว้กินแรมหน้าละหลายสิบ MB: แรม ≥6GB เตรียม 4 หน้า · 4–5GB เตรียม 2 หน้า (หน้าแรก การาจ ก่อน) · น้อยกว่านั้นไม่เตรียม */
    const mem=navigator.deviceMemory||8,max=mem>=6?4:mem>=4?2:0;
    return TABS.filter(u=>u!==here&&!(home&&u==='/messages')).slice(0,max);
  }
  function arm(){
    timer=0;if(D.prerendering||D.hidden||!supported())return;
    try{if(localStorage.getItem('cendon_signed')!=='1')return}catch(e){return}
    /* ประหยัดเน็ต/แบตเตอรี่ = ไม่เตรียมล่วงหน้า */
    const c=navigator.connection;if(c&&(c.saveData||/(^|-)2g$/.test(c.effectiveType||'')))return;
    const list=urls();if(!list.length)return;
    const s=sig();if(rules&&s===last)return;last=s;
    /* ลบกฎเดิม = ทิ้งหน้าที่เตรียมไว้ (ข้อมูลเก่า) แล้วเตรียมใหม่ */
    if(rules)rules.remove();
    rules=D.createElement('script');rules.type='speculationrules';rules.dataset.instant='';
    rules.textContent=JSON.stringify({prerender:[{urls:list,eagerness:'immediate'}]});
    D.head.appendChild(rules);
  }
  function drop(){if(rules){rules.remove();rules=null;last=''}}
  function soon(ms){if(timer)clearTimeout(timer);timer=setTimeout(()=>{const go=()=>arm();W.requestIdleCallback?requestIdleCallback(go,{timeout:2000}):go()},ms)}
  function boot(){
    if(D.prerendering){D.addEventListener('prerenderingchange',()=>soon(2500),{once:true});return}
    soon(2500);
  }
  if(D.readyState==='complete')boot();else W.addEventListener('load',boot,{once:true});
  /* ข้อมูลที่หน้าแท็บใช้วาดเปลี่ยน (ในหน้านี้หรือแท็บอื่น) → เตรียมใหม่เมื่อนิ่งแล้ว */
  try{
    const set=Storage.prototype.setItem,del=Storage.prototype.removeItem;
    const touch=(store,k,fn)=>{const before=store===W.localStorage&&WATCH.includes(String(k))?store.getItem(k):undefined;const r=fn();
      if(before!==undefined&&store.getItem(k)!==before){
        /* หน้าที่ถูกเตรียมเขียนเอง (ตอนบูต) ไม่นับว่าข้อมูลเก่า */
        /* หน้าที่เตรียมไว้มีข้อมูลเก่าแล้ว → ทิ้งทันที (กดตอนนี้ = เปิดหน้าแบบปกติ ไม่แวบของเก่า) แล้วเตรียมใหม่เมื่อนิ่ง */
        if(D.prerendering)start=sig();else if(rules){drop();soon(1500)}
      }return r};
    Storage.prototype.setItem=function(k,v){return touch(this,k,()=>set.call(this,k,v))};
    Storage.prototype.removeItem=function(k){return touch(this,k,()=>del.call(this,k))};
  }catch(e){}
  W.addEventListener('storage',e=>{if(rules&&(e.key===null||WATCH.includes(e.key))){drop();soon(1500)}});
  D.addEventListener('visibilitychange',()=>{if(!D.hidden&&rules&&sig()!==last)soon(800)});
  W.CendonInstant=Object.freeze({refresh:()=>soon(0)});
})(window,document);
