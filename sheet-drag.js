/* แผ่นเลื่อนขึ้นจากล่างที่มีขีดจับด้านบน (ทุกแบบในแอป): ลากขึ้นลงตามนิ้วได้แบบแอปทั่วไป
   - จับที่ขีด/หัวแผ่น แล้วลาก แผ่นเลื่อนตามนิ้ว (ลากขึ้นได้นิดเดียวแบบยางยืด เพราะแผ่นสูงเต็มที่แล้ว)
   - เนื้อหาในแผ่นเลื่อนอยู่บนสุดแล้วลากลงต่อ = แผ่นเลื่อนลงตามนิ้ว
   - ปล่อยนิ้วตอนลากลงเกินราวหนึ่งในสี่ของแผ่น หรือปัดลงเร็ว ๆ = ปิด (ใช้ทางปิดเดิมของแผ่นนั้น ปุ่มย้อนของเครื่องจึงยังถูก)
   - ไม่ถึง = เด้งกลับที่เดิม · ลากแล้วไม่นับเป็นการแตะปุ่มที่นิ้วเริ่มกด
   ทำเฉพาะตอนแผ่นชิดล่างเต็มความกว้าง (มือถือ) — บนคอมที่เป็นหน้าต่างกลางจอหรือแผงข้าง ไม่ยุ่ง */
(function(W,D){
  if(W.CendonSheetDrag)return;
  const q=(p,s)=>p?p.querySelector(s):null;
  const tap=el=>{if(!el)return false;el.click();return true};
  /* แผ่นแต่ละแบบ: panel = แผ่นที่เปิดอยู่ · head = หัวแผ่น (จับลากได้ทั้งแถบ) · bg = พื้นมืดด้านหลัง
     close = ปิดด้วยทางเดิมของแผ่น · open = ยังเปิดอยู่ไหม · key = เนื้อหาชุดไหน (แผ่นที่ปิดแล้วกลับไปแผ่นก่อนหน้า) */
  const KINDS=[
    /* หน้าแรก/หน้าช่าง: แผ่นเต็มจอ (.full) ไม่มีขีด จึงไม่ลาก */
    {panel:'.bs.on:not(.full)>.pn',head:'.hd',bg:p=>q(p.parentNode,'.bg'),
      close:()=>tap(D.getElementById('bsX')),open:p=>p.parentNode.classList.contains('on')},
    /* การาจ: เพิ่มรถ · ข้อมูลรถ · สีรถ */
    {panel:'.gx-pop.on>.gx-sh',head:'.gx-sh-head',bg:p=>q(p.parentNode,'.gx-bd'),
      close:p=>tap(q(p,'.gx-x'))||tap(q(p.parentNode,'.gx-bd')),open:p=>p.parentNode.classList.contains('on')},
    /* หน้ารถ: ประวัติรถ · รายการดูแล · บันทึก · เมนูรถ */
    {panel:'.crm-sh.on',head:'.crm-shh',bg:()=>D.getElementById('clShBg'),
      close:p=>tap(q(p,'[data-shx]'))||tap(D.getElementById('clShBg')),open:p=>p.classList.contains('on'),key:p=>p.dataset.sheet||''},
    /* ตั้งค่า: ออกจากระบบ · ภาษา · สกุลเงิน · ชื่อ · ความเห็น · ลบบัญชี */
    {panel:'#stSheet.in .st-sh',head:'.st-sh-t,.st-sh-h,.st-sh-ic',bg:p=>q(p.parentNode,'.st-scrim'),
      close:p=>tap(q(p.parentNode,'.st-scrim')),open:p=>p.parentNode.classList.contains('in')},
    /* ฟังเสียงเครื่อง: เลือกรถในเสียง */
    {panel:'.va-sheet',head:'h2',bg:p=>{const b=p.previousElementSibling;return b&&b.classList.contains('va-sheet-bg')?b:null},
      close:p=>{const b=p.previousElementSibling;return !!(b&&b.classList.contains('va-sheet-bg')&&tap(b))},open:p=>p.isConnected},
    /* เครื่องมือทั้งหมด (มือถือ) */
    {panel:'.msheet.on',head:'.mgrid-t',bg:()=>D.querySelector('.msheet-bg'),
      close:()=>tap(D.querySelector('.msheet-bg.on')),open:p=>p.isConnected&&p.classList.contains('on')}
  ];
  /* นิ้วเริ่มบนของพวกนี้ = ใช้งานของชิ้นนั้น ไม่ลากแผ่น (พิมพ์ เลือกข้อความ แผนที่ การ์ดขูด ฯลฯ) */
  const SKIP='input,textarea,select,[contenteditable="true"],canvas,video,.leaflet-container,.picker,[data-nodrag]';
  /* ตั้งสไตล์บนแผ่นแบบ !important — motion.css กำหนดทรานซิชันของแผ่นแบบ !important ไว้ ค่าธรรมดาจะแพ้
     (แผ่นจะไหลตามนิ้วช้า ๆ แทนที่จะติดนิ้ว) · ค่าว่าง = เอาออก กลับไปใช้ของหน้าเว็บ */
  const css=(el,k,v)=>{if(v==='')el.style.removeProperty(k);else el.style.setProperty(k,v,'important')};
  const reduce=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}};
  const EASE='cubic-bezier(.2,.8,.2,1)';

  function find(t){
    if(!t||!t.closest||t.closest(SKIP))return null;
    for(const k of KINDS){const p=t.closest(k.panel);if(p)return {k,p}}
    return null;
  }
  /* แผ่นชิดล่างเต็มความกว้างเท่านั้น */
  function bottomSheet(p){
    const r=p.getBoundingClientRect(),vw=D.documentElement.clientWidth||W.innerWidth;
    return r.width>=vw*.85&&r.bottom>=W.innerHeight-8&&r.height>0;
  }
  /* กล่องที่เลื่อนได้ตัวแรก จากนิ้วขึ้นไปถึงแผ่น */
  function scroller(t,p){
    for(let el=t;el&&el!==p.parentNode;el=el.parentNode){
      if(el.nodeType!==1)continue;
      const oy=getComputedStyle(el).overflowY;
      if((oy==='auto'||oy==='scroll')&&el.scrollHeight>el.clientHeight+1)return el;
      if(el===p)break;
    }
    return null;
  }
  /* ลากขึ้นเกินที่เดิม = ยางยืด ขยับได้นิดเดียว */
  const rubber=dy=>dy>=0?dy:-Math.min(56,Math.sqrt(-dy)*4);

  let g=null,swallow=0;
  function start(x,y,t,target){
    if(g)return false;
    const f=find(target);if(!f||!bottomSheet(f.p))return false;
    const {k,p}=f,pr=p.getBoundingClientRect(),hd=q(p,k.head);
    const hb=hd?Math.min(hd.getBoundingClientRect().bottom,pr.top+160):pr.top+56;
    const inHead=y<=Math.max(hb,pr.top+44);
    const sc=scroller(target,p);
    /* นิ้วอยู่ในเนื้อหาที่เลื่อนลงมาแล้ว = ให้เนื้อหาเลื่อนตามปกติก่อน ถ้าเลื่อนจนสุดบนแล้วยังลากลงต่อ แผ่นค่อยตามนิ้ว */
    g={k,p,inHead,sc,x0:x,y0:y,ly:y,mode:!inHead&&sc&&sc.scrollTop>0?'wait':null,y:0,h:p.offsetHeight||1,bg:k.bg(p),pts:[[y,t]]};
    return true;
  }
  /* คืน true = นิ้วนี้เป็นของแผ่นแล้ว (ให้กันหน้าเลื่อน) */
  function grab(y,t){
    g.mode='drag';g.y0=y;g.pts=[[y,t]];
    css(g.p,'transition','none');css(g.p,'animation','none');
    if(g.bg)css(g.bg,'transition','none');
  }
  function move(x,y,t){
    if(!g)return false;
    if(g.mode==='wait'){
      if(Math.abs(x-g.x0)>Math.abs(y-g.y0)+8){g=null;return false}
      const down=y>g.ly;g.ly=y;
      if(!(down&&g.sc.scrollTop<=0))return false;
      grab(y,t);
    }else if(!g.mode){
      const dx=x-g.x0,dy=y-g.y0;
      if(Math.abs(dx)<8&&Math.abs(dy)<8)return false;
      /* ปัดข้าง = ของในแผ่น (แถวชิปเลื่อนข้าง ฯลฯ) · ลากขึ้นในเนื้อหา = เลื่อนเนื้อหา */
      if(Math.abs(dx)>Math.abs(dy)||(!g.inHead&&(dy<0||(g.sc&&g.sc.scrollTop>0)))){g=null;return false}
      grab(y,t);
    }
    g.y=rubber(y-g.y0);
    css(g.p,'transform',`translate3d(0,${g.y}px,0)`);
    if(g.bg)css(g.bg,'opacity',String(Math.max(0,1-Math.max(0,g.y)/g.h)));
    g.pts.push([y,t]);if(g.pts.length>6)g.pts.shift();
    return true;
  }
  function end(){
    const s=g;g=null;
    if(!s||s.mode!=='drag')return;
    swallow=Date.now();
    /* ความเร็วช่วงท้าย (ราว 100ms สุดท้าย) — ปัดเร็ว ๆ แม้ระยะสั้นก็ปิด */
    const b=s.pts[s.pts.length-1];let a=s.pts[0];for(const pt of s.pts)if(b[1]-pt[1]<=100){a=pt;break}
    const v=b[1]>a[1]?(b[0]-a[0])/(b[1]-a[1]):0;
    const shut=s.y>Math.min(s.h*.25,180)||(v>.5&&s.y>16);
    const ms=reduce()?0:shut?200:280;
    css(s.p,'transition',ms?`transform ${ms}ms ${EASE}`:'none');
    if(s.bg)css(s.bg,'transition',ms?`opacity ${ms}ms ease`:'none');
    if(!shut){
      css(s.p,'transform','translate3d(0,0,0)');if(s.bg)css(s.bg,'opacity','');
      setTimeout(()=>{if(g&&g.p===s.p)return;css(s.p,'transform','');css(s.p,'transition','');if(s.bg)css(s.bg,'transition','')},ms+30);
      return;
    }
    css(s.p,'transform',`translate3d(0,${s.h+24}px,0)`);if(s.bg)css(s.bg,'opacity','0');
    setTimeout(()=>{
      const before=s.k.key?s.k.key(s.p):null;
      if(!s.k.close(s.p)){back(s);return}
      /* แผ่นที่ปิดแล้วกลับไปแผ่นก่อนหน้า (เช่น บันทึก → ประวัติรถ) = เลื่อนแผ่นใหม่ขึ้นมาเลย */
      if(s.k.key&&s.k.open(s.p)&&s.k.key(s.p)!==before){back(s);return}
      settle(s,performance.now());
    },ms);
  }
  /* เลื่อนแผ่นกลับขึ้นมาที่เดิม */
  function back(s){
    const ms=reduce()?0:280;
    css(s.p,'transition',ms?`transform ${ms}ms ${EASE}`:'none');css(s.p,'transform','translate3d(0,0,0)');
    if(s.bg){css(s.bg,'transition',ms?`opacity ${ms}ms ease`:'none');css(s.bg,'opacity','')}
    setTimeout(()=>{css(s.p,'transform','');css(s.p,'transition','');if(s.bg)css(s.bg,'transition','')},ms+30);
  }
  /* รอแผ่นปิดจริง (บางแผ่นปิดผ่านประวัติย้อนกลับ ใช้เวลาเล็กน้อย) แล้วคืนสไตล์ให้แผ่นเปิดครั้งหน้าได้ตามปกติ */
  function settle(s,t0){
    if(s.k.open(s.p)){
      if(performance.now()-t0<700){requestAnimationFrame(()=>settle(s,t0));return}
      back(s);return;
    }
    css(s.p,'transition','none');css(s.p,'transform','');css(s.p,'animation','');
    if(s.bg){css(s.bg,'transition','none');css(s.bg,'opacity','')}
    requestAnimationFrame(()=>requestAnimationFrame(()=>{css(s.p,'transition','');if(s.bg)css(s.bg,'transition','')}));
  }

  /* นิ้ว (มือถือ) — touchmove ต้องกันหน้าเลื่อนได้ จึงไม่ใช่ passive */
  D.addEventListener('touchstart',e=>{if(e.touches.length!==1){g=null;return}const p=e.touches[0];start(p.clientX,p.clientY,e.timeStamp,e.target)},{passive:true});
  D.addEventListener('touchmove',e=>{
    if(!g)return;
    if(e.touches.length!==1){end();return}
    const p=e.touches[0];if(move(p.clientX,p.clientY,e.timeStamp)&&e.cancelable)e.preventDefault();
  },{passive:false});
  D.addEventListener('touchend',()=>{if(g)end()},{passive:true});
  D.addEventListener('touchcancel',()=>{if(g)end()},{passive:true});
  /* เมาส์: จับที่ขีด/หัวแผ่นเท่านั้น */
  D.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='mouse'||e.button!==0)return;
    if(!start(e.clientX,e.clientY,e.timeStamp,e.target))return;
    if(!g.inHead){g=null;return}
    const mv=ev=>move(ev.clientX,ev.clientY,ev.timeStamp),up=()=>{W.removeEventListener('pointermove',mv);W.removeEventListener('pointerup',up);end()};
    W.addEventListener('pointermove',mv);W.addEventListener('pointerup',up);
  });
  /* ลากเสร็จแล้วไม่ให้กลายเป็นการแตะปุ่มที่นิ้ว/เมาส์เริ่มกด (เช่น ปุ่ม × บนหัวแผ่น)
     กันเฉพาะคลิกจากผู้ใช้จริง — คลิกที่เราสั่งปิดแผ่นเองต้องผ่านไปได้ */
  D.addEventListener('click',e=>{if(e.isTrusted&&swallow&&Date.now()-swallow<400){swallow=0;e.preventDefault();e.stopPropagation()}},true);

  W.CendonSheetDrag=Object.freeze({kinds:KINDS.map(k=>k.panel)});
})(window,document);
