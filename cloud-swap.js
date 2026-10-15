/* ═══════════════════════════════════════════════════════════════════
   เปลี่ยนภาษา / ธีม / สีหลักในแอป แบบ "เมฆลอยตัดหน้า" — ชุดเดียวกับเว็บ Cendon (/about /help ...)
   ───────────────────────────────────────────────────────────────────
   ทำงานโดยดักการกดปุ่มตั้งค่าไว้ก่อน (ไม่ไปแก้ฟังก์ชันเดิมของแต่ละหน้า):
     กด → เมฆลอยเข้า หมอกบังเต็มจอ → ตอนนั้นค่อยปล่อยให้ปุ่มทำงานจริง (เปลี่ยนภาษา/ธีม + วาดหน้าใหม่)
     → เมฆลอยผ่านไป หมอกจางเผยหน้าใหม่ — ผู้ใช้ไม่เห็นตัวหนังสือหรือสีกระโดด
   ปุ่มที่ดัก: ภาษา button[data-lang] .lang-opt · ธีม button[data-sitetheme] #v-settings button[data-theme] .th-opt
               สีหลัก button[data-pri]   — เพิ่มปุ่มตั้งค่าแบบใหม่ ให้เพิ่มตัวเลือกใน SEL ข้างล่าง
   ใช้แค่ opacity/transform (การ์ดจอวาดให้ ลื่น) · โหมดลดการเคลื่อนไหว: หมอกจางเข้า-ออกเฉย ๆ
   ═══════════════════════════════════════════════════════════════════ */
(function(W,D){
  'use strict';
  if(W.CendonCloud)return;
  var reduce=W.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var LANG_SEL='button[data-lang],.lang-opt[data-l]';
  var THEME_SEL='button[data-sitetheme],#v-settings button[data-theme],.th-opt[data-th]';
  var PRI_SEL='button[data-pri]';
  var SEL=LANG_SEL+','+THEME_SEL+','+PRI_SEL;
  var ORDER=['th','en','zh','ja','ko','id','vi','ms','de','fr','es','pt'];
  var busy=false,pending=null;

  var H=D.documentElement;
  var curLang=function(){try{if(W.spireLang)return W.spireLang()}catch(e){}return H.lang||'th'};
  var curTheme=function(){try{if(W.spireTheme)return W.spireTheme()}catch(e){}return H.getAttribute('data-theme')||'light'};
  var curPri=function(){try{if(W.spirePrimary)return String(W.spirePrimary()).toLowerCase()}catch(e){}return ''};
  var dark=function(t){return t==='dark'};

  /* ── หน้าตาเมฆ: สร้างครั้งเดียว ใส่เป็น <style> ── */
  var seed=7;function rnd(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646}
  function bank(n,yb,yj,w0,w1){
    var out=[];for(var i=0;i<n;i++){
      var big=i%3!==1,w=(w0+(w1-w0)*rnd())*(big?1:.7),h=w*(1.5+.4*rnd());
      out.push([w.toFixed(1),h.toFixed(1),(2+96*i/(n-1)+(rnd()*4-2)).toFixed(1),(yb+(rnd()*2-1)*yj-(big?0:9)).toFixed(1)]);
    }return out;
  }
  function puffs(list,core,shade,dy){
    var g=function(p,c,ox,oy){return 'radial-gradient('+p[0]+'% '+p[1]+'% at '+(+p[2]+ox).toFixed(1)+'% '+(+p[3]+oy).toFixed(1)+'%,'+c+' 0,'+c+' 38%,transparent 70%)'};
    /* ปุยขาวทับเงา เหลือเงาเฉพาะขอบล่างของกลุ่มเมฆ */
    return list.map(function(p){return g(p,core,0,0)}).concat(list.map(function(p){return g(p,shade,.6,dy)})).join(',');
  }
  var B=bank(11,50,8,9,13),M=bank(14,56,6,8,12),F=bank(6,70,12,4,6);
  var PAL={
    light:{back:['rgba(243,246,251,.97)','rgba(200,212,230,.55)'],mid:['#fff','rgba(196,208,226,.6)'],front:['#fff','rgba(205,215,232,.55)'],mist:'rgba(249,247,243,.9)'},
    dark:{back:['rgba(46,50,62,.97)','rgba(10,11,16,.6)'],mid:['rgba(62,67,82,.98)','rgba(14,15,21,.65)'],front:['rgba(78,84,100,.95)','rgba(18,20,27,.6)'],mist:'rgba(15,16,21,.9)'}
  };
  var css='.cendon-cloud{position:fixed;inset:0;z-index:2147483600;pointer-events:none;overflow:hidden}'+
    '.cendon-cloud .pf{position:absolute;left:0;top:-20vh;width:200vw;height:140vh;will-change:transform;transform:translate3d(-200vw,0,0);'+
    '-webkit-mask-image:linear-gradient(90deg,transparent,#000 9%,#000 91%,transparent),linear-gradient(180deg,transparent,#000 18%,#000 82%,transparent);-webkit-mask-composite:source-in;'+
    'mask-image:linear-gradient(90deg,transparent,#000 9%,#000 91%,transparent),linear-gradient(180deg,transparent,#000 18%,#000 82%,transparent);mask-composite:intersect}'+
    '.cendon-cloud .front{top:10vh;height:110vh}'+
    '.cendon-cloud .veil{position:absolute;inset:0;opacity:0;-webkit-backdrop-filter:blur(22px) saturate(1.1);backdrop-filter:blur(22px) saturate(1.1)}'+
    '@media (max-aspect-ratio:1/1){.cendon-cloud .pf{top:8vh;height:72vh}.cendon-cloud .front{top:30vh;height:60vh}}';
  ['light','dark'].forEach(function(k){var p=PAL[k];
    css+='.cendon-cloud.t-'+k+' .back{opacity:.85;background:'+puffs(B,p.back[0],p.back[1],6)+'}'+
         '.cendon-cloud.t-'+k+' .mid{background:'+puffs(M,p.mid[0],p.mid[1],5)+'}'+
         '.cendon-cloud.t-'+k+' .front{opacity:.95;background:'+puffs(F,p.front[0],p.front[1],4)+'}';
  });
  function style(){if(D.getElementById('cendonCloudCss'))return;var s=D.createElement('style');s.id='cendonCloudCss';s.textContent=css;(D.head||H).appendChild(s)}

  /* ── เล่นเมฆ แล้วเรียก apply ตอนหมอกบังเต็มจอ ── */
  function run(job,apply){
    style();busy=true;
    var from=dark(curTheme())?'dark':'light',to=job.kind==='theme'?(dark(job.to)?'dark':'light'):from;
    var ov=D.createElement('div');ov.className='cendon-cloud t-'+from;ov.setAttribute('aria-hidden','true');
    /* หมอกอยู่บนสุด: ตอนบังเต็มจอ เมฆกับหน้าเดิมหายไปใต้หมอกทั้งหมด จึงสลับได้โดยไม่มีใครเห็น */
    ov.innerHTML=(reduce?'':'<div class="pf back"></div><div class="pf mid"></div><div class="pf front"></div>')+'<div class="veil"></div>';
    (D.body||H).appendChild(ov);
    var T=reduce?420:1250,pf=ov.querySelectorAll('.pf'),left=pf.length+1,done=false,applied=false,veil=ov.lastChild;
    function end(){if(--left>0||done)return;finish()}
    /* จบแล้ว ถ้าระหว่างเมฆลอยมีการกดปุ่มอื่นค้างไว้ (เช่นเปลี่ยนภาษาแล้วรีบกดธีม) ทำต่อให้เลย */
    function finish(){done=true;ov.remove();busy=false;var q=pending;pending=null;if(!q)return;
      /* หน้าตั้งค่ามักวาดปุ่มใหม่หลังเปลี่ยนภาษา ปุ่มเดิมอาจหายไปแล้ว — หาปุ่มที่ทำสิ่งเดียวกันในหน้าตอนนี้ */
      var el=q.isConnected?q.el:D.querySelector(q.sel);if(el)setTimeout(function(){el.click()},60)}
    function doApply(){if(applied)return;applied=true;try{apply()}catch(e){}
      /* เมฆที่ลอยออกไปใช้สีของธีมใหม่ (สลับใต้หมอก ไม่มีใครเห็น) */
      ov.className='cendon-cloud t-'+(dark(curTheme())?'dark':'light')}
    var m0=PAL[from].mist,m1=PAL[to].mist;
    /* หมอกสองช่วง: ฟุ้งขึ้นจนทึบ → (ค้างทึบไว้) สลับจริง → ค่อยจาง
       ช่วงจางเริ่มหลังสลับเสร็จเท่านั้น เครื่องช้า/หน่วงแค่ไหน ก็ไม่มีทางเห็นตัวหนังสือหรือสีกระโดด */
    var vin=veil.animate(reduce?[{opacity:0,backgroundColor:m0},{opacity:1,backgroundColor:m0}]:
      [{opacity:0,backgroundColor:m0},{opacity:0,backgroundColor:m0,offset:.33},{opacity:1,backgroundColor:m0}],
      {duration:T*(reduce?.45:.42),easing:'linear',fill:'forwards'});
    vin.onfinish=function(){
      doApply();
      var vout=veil.animate(reduce?[{opacity:1,backgroundColor:m1},{opacity:1,backgroundColor:m1,offset:.18},{opacity:0,backgroundColor:m1}]:
        [{opacity:1,backgroundColor:m0},{opacity:1,backgroundColor:m1,offset:.26},{opacity:0,backgroundColor:m1,offset:.72},{opacity:0,backgroundColor:m1}],
        {duration:T*(reduce?.55:.58),easing:'linear',fill:'forwards'});
      vout.onfinish=end;vout.oncancel=end;
    };
    /* ทิศ: ภาษาถัดไปในรายการ / ไปธีมสว่าง = ซ้ายไปขวา · ย้อนกลับ / ไปธีมมืด = ขวาไปซ้าย */
    var dir=job.kind==='lang'?(ORDER.indexOf(job.to)>=ORDER.indexOf(job.from)?1:-1):job.kind==='theme'?(dark(job.to)?-1:1):1;
    [].forEach.call(pf,function(p,i){
      var k=[1.12,1,.9][i],a=dir>0?-200:100,b=dir>0?100:-200;
      var an=p.animate([{transform:'translate3d('+a+'vw,0,0)'},{transform:'translate3d('+b+'vw,0,0)'}],
        {duration:T*k,delay:(1-k)*T/2,easing:'cubic-bezier(.42,.02,.28,1)',fill:'both'});
      an.onfinish=end;an.oncancel=end;
    });
    /* กันค้าง: ภาพเคลื่อนไหวไม่จบด้วยเหตุใดก็ตาม — ยังเปลี่ยนค่าให้ตามที่กด แล้วปลดหมอกเอง */
    setTimeout(function(){if(!done){doApply();finish()}},T+1500);
  }

  function job(el){
    if(el.matches(LANG_SEL)){var to=el.getAttribute('data-lang')||el.getAttribute('data-l');return {kind:'lang',to:to,from:curLang()}}
    if(el.matches(THEME_SEL)){var t=el.getAttribute('data-sitetheme')||el.getAttribute('data-theme')||el.getAttribute('data-th');return {kind:'theme',to:t,from:curTheme()}}
    if(el.matches(PRI_SEL)){return {kind:'pri',to:String(el.getAttribute('data-pri')||'').toLowerCase(),from:curPri()}}
    return null;
  }
  /* ดักก่อนทุกตัว (window + capture) — ปุ่มยังทำงานเหมือนเดิมทุกอย่าง แค่เลื่อนไปทำตอนหมอกบัง */
  W.addEventListener('click',function(e){
    var el=e.target&&e.target.closest&&e.target.closest(SEL);if(!el)return;
    if(el.__cloudPass){el.__cloudPass=false;return}
    var j=job(el);if(!j||!j.to||j.to===j.from||!el.animate)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(busy){var a=['data-lang','data-l','data-sitetheme','data-theme','data-th','data-pri'].filter(function(n){return el.hasAttribute(n)})[0];
      pending={el:el,get isConnected(){return el.isConnected},sel:a?el.tagName.toLowerCase()+'['+a+'="'+String(el.getAttribute(a)).replace(/"/g,'')+'"]':''};return}
    run(j,function(){el.__cloudPass=true;el.click()});
  },true);

  W.CendonCloud={run:run,busy:function(){return busy}};
})(window,document);
