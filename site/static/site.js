/* เว็บ Cendon: สลับภาษา (ปุ่มอยู่ส่วนท้าย) · สำรองภาพเคลื่อนไหวสำหรับเบราว์เซอร์ที่ยังไม่รองรับ scroll-driven · สารบัญตามตำแหน่งอ่าน
   ไม่มีตัวติดตาม ไม่มีคุกกี้ เก็บแค่ภาษาที่เลือกในเครื่อง (spire_lang ชื่อเดียวกับในแอป) */
(function(){
  'use strict';
  var D=document,H=D.documentElement;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── ภาษา: ปุ่ม TH/EN บันทึกค่าเดียวกับแอป เปิดแอปต่อแล้วภาษาตรงกัน ── */
  function setLang(l,save){
    H.setAttribute('data-lang',l);H.lang=l;
    /* บันทึกเฉพาะตอนกดปุ่มเอง — คนที่ตั้งแอปเป็นภาษาอื่น (ญี่ปุ่น ฯลฯ) เปิดเว็บเฉย ๆ ภาษาในแอปต้องไม่เปลี่ยน */
    if(save)try{localStorage.setItem('spire_lang',JSON.stringify(l))}catch(e){}
    D.querySelectorAll('.lang button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.set===l))});
    var t=D.querySelector('meta[name="x-title-'+l+'"]');if(t)D.title=t.content;
  }
  D.querySelectorAll('.lang button').forEach(function(b){b.addEventListener('click',function(){setLang(b.dataset.set,true)})});
  setLang(H.getAttribute('data-lang')||'th');

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
      var on=map[id],bar=on&&on.parentNode;
      if(bar&&bar.scrollWidth>bar.clientWidth)bar.scrollTo({left:on.offsetLeft-16,behavior:reduce?'auto':'smooth'});
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
  var bar=D.querySelector('.readbar'),line=D.querySelector('.trust .line'),tick=false;
  function onScroll(){
    tick=false;
    var max=H.scrollHeight-innerHeight;
    if(bar)bar.style.setProperty('--p',max>0?Math.min(1,scrollY/max):0);
    if(line){
      var r=line.parentNode.getBoundingClientRect(),p=(innerHeight*.85-r.top)/(r.height+innerHeight*.35);
      line.style.setProperty('--p',Math.max(0,Math.min(1,p)));
    }
  }
  addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(onScroll)}},{passive:true});
  onScroll();
})();
