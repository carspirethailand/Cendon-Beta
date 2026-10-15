/* เว็บ Cendon: สลับภาษาแบบเมฆลอยผ่าน · สำรองภาพเคลื่อนไหวสำหรับเบราว์เซอร์ที่ยังไม่รองรับ scroll-driven · สารบัญตามตำแหน่งอ่าน
   ไม่มีตัวติดตาม ไม่มีคุกกี้ เก็บแค่ภาษาที่เลือกในเครื่อง (spire_lang ชื่อเดียวกับในแอป) */
(function(){
  'use strict';
  var D=document,H=D.documentElement;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── ภาษา: ปุ่มไทย/English (บนแถบและส่วนท้าย ทำงานพร้อมกัน) บันทึกค่าเดียวกับแอป เปิดแอปต่อแล้วภาษาตรงกัน ── */
  var langBox=D.querySelectorAll('.lang'),busy=false;
  /* แคปซูลสีหมึกที่เลื่อนไปใต้ภาษาที่เลือก */
  langBox.forEach(function(g){var t=D.createElement('span');t.className='thumb';t.setAttribute('aria-hidden','true');g.insertBefore(t,g.firstChild);g.classList.add('has-thumb')});
  function placeThumbs(){
    langBox.forEach(function(g){
      var b=g.querySelector('button[aria-pressed="true"]'),t=g.querySelector('.thumb');if(!b||!t)return;
      t.style.width=b.offsetWidth+'px';t.style.transform='translateX('+(b.offsetLeft-3)+'px)';
    });
  }
  function press(l){D.querySelectorAll('.lang button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.set===l))});placeThumbs()}
  function apply(l){
    H.setAttribute('data-lang',l);H.lang=l;
    var t=D.querySelector('meta[name="x-title-'+l+'"]');if(t)D.title=t.content;
  }
  /* จุดที่กำลังอ่าน (กลางจอค่อนบน) — สลับภาษาแล้วความยาวข้อความเปลี่ยน ต้องเลื่อนคืนให้อยู่ที่เดิม */
  function anchor(){
    if(scrollY<4)return null;
    var y=innerHeight*0.35,el=D.elementFromPoint(innerWidth/2,y);
    while(el&&el!==D.body&&(el.closest('[data-l]')||!el.offsetHeight))el=el.parentElement;
    if(!el||el===D.body||el===H)return null;
    var r=el.getBoundingClientRect();return {el:el,y:y,f:(y-r.top)/(r.height||1)};
  }
  function restore(a){
    if(!a)return;var r=a.el.getBoundingClientRect();
    scrollTo({top:scrollY+(r.top+a.f*r.height-a.y),behavior:'instant'});
  }
  function swap(l){apply(l);D.dispatchEvent(new Event('scroll'));}
  /* เมฆลอยตัดหน้าจอ: หมอกบังเต็มจอตรงกลางจังหวะ → สลับภาษาตอนนั้น → เมฆลอยผ่านไป หมอกจางเผยภาษาใหม่
     ใช้แค่ opacity/transform (การ์ดจอทำให้ ลื่น) · โหมดลดการเคลื่อนไหว: หมอกจางเข้า-ออกเฉย ๆ ไม่มีเมฆลอย */
  function cloudSwap(l){
    var a=anchor(),ov=D.createElement('div');
    ov.className='cloudswipe';ov.setAttribute('aria-hidden','true');
    ov.innerHTML='<div class="veil"></div>'+(reduce?'':'<div class="puffs back"></div><div class="puffs mid"></div><div class="puffs front"></div>');
    D.body.appendChild(ov);
    var T=reduce?420:1350,dir=l==='en'?1:-1,done=0,total=0;
    function end(){if(++done>=total){ov.remove();busy=false}}
    /* หมอกตามหลังขอบเมฆ: เห็นก้อนเมฆลอยเข้ามาบนหน้าใส ๆ ก่อน แล้วค่อยฟุ้งบังเต็มจอ */
    var v=ov.querySelector('.veil').animate(reduce?[{opacity:0},{opacity:1,offset:.45},{opacity:1,offset:.55},{opacity:0}]:[{opacity:0},{opacity:0,offset:.14},{opacity:1,offset:.42},{opacity:1,offset:.57},{opacity:0,offset:.84},{opacity:0}],{duration:T,easing:'linear',fill:'forwards'});
    total++;v.onfinish=end;
    /* แต่ละชั้นเมฆยาว 200vw: ชั้นหลังช้า ชั้นหน้าเร็ว ให้ดูมีความลึก ทุกชั้นบังจอเต็มที่ราวกลางจังหวะ */
    ov.querySelectorAll('.puffs').forEach(function(p,i){
      var k=[1.12,1,0.9][i],from=dir>0?-200:100,to=dir>0?100:-200;
      var an=p.animate([{transform:'translate3d('+from+'vw,0,0)'},{transform:'translate3d('+to+'vw,0,0)'}],{duration:T*k,delay:(1-k)*T/2,easing:'cubic-bezier(.42,.02,.28,1)',fill:'both'});
      total++;an.onfinish=end;
    });
    setTimeout(function(){swap(l);restore(a)},T*0.49);
  }
  function choose(l){
    if(busy||l===H.getAttribute('data-lang'))return;
    /* บันทึกเฉพาะตอนกดปุ่มเอง — คนที่ตั้งแอปเป็นภาษาอื่น (ญี่ปุ่น ฯลฯ) เปิดเว็บเฉย ๆ ภาษาในแอปต้องไม่เปลี่ยน */
    try{localStorage.setItem('spire_lang',JSON.stringify(l))}catch(e){}
    press(l);
    if(!H.animate){var a=anchor();swap(l);restore(a);return}
    busy=true;cloudSwap(l);
  }
  D.querySelectorAll('.lang button').forEach(function(b){b.addEventListener('click',function(){choose(b.dataset.set)})});
  var cur0=H.getAttribute('data-lang')||'th';apply(cur0);press(cur0);
  /* วางแคปซูลครั้งแรกแบบไม่เลื่อน แล้วค่อยเปิดภาพเคลื่อนไหว */
  function settle(){placeThumbs();requestAnimationFrame(function(){langBox.forEach(function(g){g.classList.add('ready')})})}
  if(D.fonts&&D.fonts.ready)D.fonts.ready.then(settle);else settle();
  addEventListener('resize',placeThumbs);addEventListener('load',placeThumbs);

  /* ── แถบบนแบบเมฆจาง: เบราว์เซอร์ที่รองรับใช้ CSS ผูกกับการเลื่อนอยู่แล้ว ตรงนี้เป็นตัวสำรอง (และโหมดลดการเคลื่อนไหว) ── */
  var bar=D.querySelector('.sitebar'),bt=false;
  function cloud(){bt=false;if(bar)bar.classList.toggle('on',scrollY>8)}
  addEventListener('scroll',function(){if(!bt){bt=true;requestAnimationFrame(cloud)}},{passive:true});
  cloud();

  /* ── สารบัญหน้าเอกสาร: ไฮไลต์หัวข้อที่กำลังอ่าน (หัวข้อสุดท้ายที่หัวเลื่อนผ่านเส้นอ่าน ~30% ของจอ) ── */
  var toc=D.querySelectorAll('.toc a[href^="#"]'),secs=D.querySelectorAll('.sec[id]');
  if(toc.length&&secs.length){
    var map={},cur=null,tt=false;toc.forEach(function(a){map[a.getAttribute('href').slice(1)]=a});
    function mark(){
      tt=false;var id=secs[0].id,line=innerHeight*0.3;
      for(var i=0;i<secs.length;i++){if(secs[i].getBoundingClientRect().top<=line)id=secs[i].id;else break}
      if(id===cur)return;cur=id;
      toc.forEach(function(a){a.classList.toggle('on',a===map[id])});
      /* มือถือ: สารบัญเป็นแถบเลื่อนแนวนอน เลื่อนให้หัวข้อที่อ่านอยู่มองเห็น */
      var on=map[id],tb=on&&on.parentNode;
      if(tb&&tb.scrollWidth>tb.clientWidth)tb.scrollTo({left:on.offsetLeft-16,behavior:reduce?'auto':'smooth'});
    }
    addEventListener('scroll',function(){if(!tt){tt=true;requestAnimationFrame(mark)}},{passive:true});
    mark();
  }

  /* ── สำรองภาพเคลื่อนไหว: ใช้เมื่อเบราว์เซอร์ไม่รองรับ animation-timeline ── */
  var sda=window.CSS&&CSS.supports&&CSS.supports('animation-timeline: view()');
  if(!('IntersectionObserver' in window))return;
  /* เรื่องเล่าบนโทรศัพท์ (ใช้ทั้งตอนเบราว์เซอร์ไม่รองรับ และตอนผู้ใช้ตั้งลดการเคลื่อนไหว — สลับจอทันทีไม่มีภาพเคลื่อน) */
  var story=D.querySelector('.story');
  if(story&&(!sda||reduce)){
    story.setAttribute('data-s','1');
    var st=new IntersectionObserver(function(es){
      es.forEach(function(e){if(e.isIntersecting)story.setAttribute('data-s',e.target.getAttribute('data-step'))});
    },{rootMargin:'-45% 0px -45% 0px'});
    story.querySelectorAll('.step[data-step]').forEach(function(s){st.observe(s)});
  }
  if(sda||reduce)return;
  H.classList.add('no-sda');

  var show=new IntersectionObserver(function(es){
    es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');show.unobserve(e.target)}});
  },{rootMargin:'0px 0px -12% 0px'});
  D.querySelectorAll('.rv,.tstep,.linecard').forEach(function(el){show.observe(el)});

  /* แถบอ่าน + เส้นเวลาความไว้ใจ: คำนวณจากตำแหน่งเลื่อน */
  var rb=D.querySelector('.readbar'),line=D.querySelector('.trust .line'),tick=false;
  function onScroll(){
    tick=false;
    var max=H.scrollHeight-innerHeight;
    if(rb)rb.style.setProperty('--p',max>0?Math.min(1,scrollY/max):0);
    if(line){
      var r=line.parentNode.getBoundingClientRect(),p=(innerHeight*.85-r.top)/(r.height+innerHeight*.35);
      line.style.setProperty('--p',Math.max(0,Math.min(1,p)));
    }
  }
  addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(onScroll)}},{passive:true});
  onScroll();
})();
