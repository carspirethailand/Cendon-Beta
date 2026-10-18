/* ═══ ประตูเปิดตัว (นับถอยหลัง) ═══
   เจ้าของระบบตั้งวันเวลาเปิดตัวในแผงควบคุม → ระหว่างนั้นคนทั่วไปที่เปิดแอปจะไปหน้า /launch (นับถอยหลัง 3 มิติ)
   ผ่านได้: ทีมงาน (ป้าย cendon_staff ที่แอปตั้งให้หลังเช็กสิทธิ์กับหลังบ้าน) · หน้าที่เปิดสาธารณะอยู่แล้ว · /join (จองสิทธิ์เป็นช่าง)
   ?staff=1 = ทีมงานที่ล็อกอินเครื่องใหม่ ให้แอปเช็กสิทธิ์เอง (ไม่ใช่ทีมงาน → แอปส่งกลับไปหน้านับถอยหลัง)
   ตัดสินจากค่าที่จำไว้ในเครื่อง (ไม่หน่วงหน้า) แล้วถามหลังบ้านใหม่เบื้องหลังทุก ~2 นาที · เครื่องที่ยังไม่เคยรู้ค่า: ซ่อนหน้าไว้รอคำตอบไม่เกิน 1.5 วิ
   นี่คือหน้าต้อนรับ ไม่ใช่ระบบความปลอดภัย — สิทธิ์จริงทุกอย่างตรวจที่หลังบ้านเหมือนเดิม
   มาจากหน้านับถอยหลังตอนเวลาหมด (cendon_cloud_in) → เมฆแหวกออกเผยหน้าแอป ต่อจากที่บินเข้าเมฆในหน้า /launch */
(function(W,D){
  var K='cendon_cfg',API=(W.TECH_API_URL||'https://spireonebackend.carspirethailand.workers.dev'),L=W.location,P=L.pathname,H=D.documentElement;
  var OPEN=/^\/(launch|login|join|trip|passport|about|help|privacy|terms|tech|service|category|admin|handbook|console)(\.html)?(\/|$)/;
  function get(k){try{return W.localStorage.getItem(k)}catch(e){return null}}
  function read(){try{return JSON.parse(get(K)||'null')}catch(e){return null}}
  function now(c){return Date.now()+((c&&c.skew)||0)}
  /* นับถอยหลังอยู่ไหม (ตามเวลาหลังบ้าน) */
  function pre(c){var x=c&&c.launch;return !!(x&&x.enabled&&x.at>now(c))}
  function staff(){return get('cendon_staff')==='1'}
  /* หน้าเข้าสู่ระบบ: ผ่านเฉพาะคนที่จะไปจองสิทธิ์ช่าง/ลิงก์ที่แชร์/ทีมงาน — คนทั่วไปที่ถูกส่งมาจากหน้าแอปไปหน้านับถอยหลัง */
  function hold(){
    if(staff()||/[?&]staff=1/.test(L.search))return true;
    if(/^\/login(\.html)?\/?$/.test(P)){var n='';try{n=new URLSearchParams(L.search).get('next')||''}catch(e){}return /^\/(join|trip|passport|admin|handbook)/.test(n)||/[?&]staff=1/.test(n)}
    return OPEN.test(P);
  }
  function go(){H.style.visibility='hidden';L.replace('/launch')}
  var c=read();
  W.CendonLaunch={pre:function(){return pre(read())},cfg:read,now:function(){return now(read())},
    /* แอปบอกว่าคนนี้เป็นทีมงานไหม (หลังเช็กกับหลังบ้าน) */
    staff:function(on){try{on?W.localStorage.setItem('cendon_staff','1'):W.localStorage.removeItem('cendon_staff')}catch(e){}
      if(!on&&pre(read())&&!/^\/(join|launch|login)/.test(P)&&!/^\/(trip|passport)/.test(P))go()}};
  if(c&&pre(c)&&!hold()){go();return}
  /* จองสิทธิ์เป็นช่างระหว่างนับถอยหลัง: แอปโชว์แค่ใบสมัคร ปิดแล้วกลับหน้านับถอยหลัง (index.html) */
  if(c&&pre(c)&&!staff()&&/^\/join(\/|$)/.test(P))H.classList.add('prejoin');
  var stale=!c||!(Date.now()-(c.got||0)<120000);
  if(stale){
    /* ยังไม่เคยรู้ค่า: ซ่อนหน้าไว้ก่อน กันเห็นแอป/หน้าเข้าสู่ระบบแวบแล้วค่อยเด้ง */
    var wait=!c&&!hold()&&P!=='/launch';
    if(wait){H.style.visibility='hidden';setTimeout(function(){H.style.visibility=''},1500)}
    try{
      var t0=Date.now();
      fetch(API+'/api/config',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(j){
        if(!j)return;var t1=Date.now(),n={launch:j.launch||null,features:j.features||{},skew:j.now?j.now-Math.round((t0+t1)/2):0,got:t1};
        try{W.localStorage.setItem(K,JSON.stringify(n))}catch(e){}
        if(pre(n)&&!hold())go();else if(wait)H.style.visibility='';
      }).catch(function(){if(wait)H.style.visibility=''});
    }catch(e){if(wait)H.style.visibility=''}
  }
  /* ── เมฆแหวกเผยหน้าแอป (ต่อจากหน้า /launch) ── */
  var cloud=false;try{cloud=W.sessionStorage.getItem('cendon_cloud_in')==='1';W.sessionStorage.removeItem('cendon_cloud_in')}catch(e){}
  if(cloud&&!(W.matchMedia&&W.matchMedia('(prefers-reduced-motion: reduce)').matches)){
    H.classList.add('cloud-in');
    var st=D.createElement('style');
    st.textContent='html.cloud-in::after{content:"";position:fixed;inset:0;z-index:2147483647;background:#fff}'
      +'.cd-cloud{position:fixed;inset:0;z-index:2147483647;pointer-events:none;overflow:hidden;background:#fff;animation:cdFade 1.5s .55s cubic-bezier(.4,0,.2,1) forwards}'
      +'.cd-cloud i{position:absolute;border-radius:50%;background:radial-gradient(circle,#fff 0,#fff 38%,rgba(255,250,244,.85) 55%,rgba(255,244,232,0) 72%);filter:blur(6px);animation:cdPuff 2s cubic-bezier(.3,0,.2,1) forwards}'
      +'@keyframes cdFade{to{background:rgba(255,255,255,0)}}'
      +'@keyframes cdPuff{to{transform:translate(var(--x),var(--y)) scale(2.4);opacity:0}}';
    H.firstChild?H.insertBefore(st,H.firstChild):H.appendChild(st);
    var show=function(){
      var o=D.createElement('div');o.className='cd-cloud';o.setAttribute('aria-hidden','true');
      /* ก้อนเมฆรอบจอ ลอยออกจากกลางไปขอบ — เหมือนกล้องทะลุเมฆออกมา */
      for(var i=0;i<16;i++){var a=i/16*Math.PI*2+Math.random()*.3,r=18+Math.random()*26,s=55+Math.random()*45,e=D.createElement('i');
        e.style.cssText='width:'+s+'vmax;height:'+s+'vmax;left:'+(50+Math.cos(a)*r-s/2)+'vw;top:'+(50+Math.sin(a)*r-s/2)+'vh;--x:'+Math.cos(a)*70+'vmax;--y:'+Math.sin(a)*70+'vmax;animation-delay:'+(Math.random()*.25)+'s';
        o.appendChild(e)}
      D.body.appendChild(o);H.classList.remove('cloud-in');setTimeout(function(){o.remove()},2700);
    };
    D.readyState==='loading'?D.addEventListener('DOMContentLoaded',show):show();
  }
})(window,document);
