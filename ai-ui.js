/* ═══ Cendon AI · Intelligent UI ═══
   AI ปิดท้ายคำตอบด้วย [[UI]]{...}[[/UI]] = หน้าจอที่ AI ประกอบเองจากชิ้นส่วนชุดนี้ (การ์ด แถว ตาราง เกจ เช็กลิสต์ ไทม์ไลน์ ปุ่ม ...)
   · AI จัดวางได้อิสระ (ซ้อนกันได้ 6 ชั้น) แต่ "ห้ามเขียน HTML/สคริปต์เอง" — ไฟล์นี้ตรวจทุกชิ้น ทิ้งชนิด/ค่าที่ไม่รู้จัก
     ตัวอักษรทุกตัวผ่าน esc ก่อนวาด (ผลค้นเว็บที่ปนเข้ามาในคำตอบจึงฝังลิงก์/สคริปต์หลอกลงในแชตไม่ได้)
   · ปุ่มทำได้แค่ 3 อย่างที่แอปอนุญาต: ส่งข้อความแทนผู้ใช้ (ask) · เปิดหน้าในแอปตามรายชื่อ (open) · เปิดเครื่องมือในแชต (tool)
     ไม่มีลิงก์ออกนอกแอป ไม่มีโทรออก ไม่มีคำสั่งที่เปลี่ยนข้อมูล (งานแบบนั้นต้องผ่านการ์ดยืนยันของ Valet)
   · ร้าน/ช่าง: AI ห้ามแต่งชื่อร้านเอง — ชิ้น shops ดึงร้านจริงจากรายชื่อสาธารณะของ Cendon มาแสดง
   · แกะไม่ได้ / ผิดรูป = ทิ้งบล็อกทั้งก้อน ผู้ใช้ยังเห็นคำตอบที่เป็นข้อความครบ */
(function(W,D){
'use strict';
const T=(th,en)=>W.spireT?W.spireT(th,en):((W.lang||'')==='en'?en:th);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* ตัวหนา **x** อย่างเดียว (หลัง esc แล้ว) */
const rich=s=>esc(s).replace(/\*\*([^*\n]{1,120})\*\*/g,'<b>$1</b>');
const LIM={depth:6,nodes:120,str:160,long:600,arr:12,cols:6,rows:14};
const TONES=new Set(['info','ok','warn','danger','ember','neutral']);
/* หน้าในแอปที่ปุ่มของ AI เปิดได้ (ชื่อ → ที่อยู่) — นอกรายชื่อนี้ไม่มีปุ่ม */
const OPEN={garage:'/garage',post:'/post',home_service:'/post?at=home',urgent:'/urgent/breakdown',accident:'/urgent/accident',map:'/map',
  quotes:'/quotes',jobs:'/jobs',messages:'/messages',search:'/search',category:'/category',news:'/news',spares:'/spares',home:'/'};
const TOOLS=new Set(['quote','listen','shake','park','own']);
const CATS=new Set(['air','eng','tyre','ev','body','mobile','urgent']);
const TYPES=new Set(['card','row','col','grid','divider','h','text','badge','stat','meter','gauge','range','list','steps','timeline','table','alert','checklist','choices','button','buttons','shops']);

const S=(x,n)=>(typeof x==='string'||typeof x==='number')?String(x).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u2028\u2029]/g,'').trim().slice(0,n||LIM.str):'';
const N=(x,lo,hi)=>{const v=typeof x==='number'?x:parseFloat(String(x??'').replace(/[,\s฿]/g,''));return Number.isFinite(v)?Math.min(hi,Math.max(lo,v)):null};
const tone=x=>TONES.has(x)?x:'';
/* ไอคอนต้องมีอยู่จริงในชุดไอคอนของแอป (ตัดมาเฉพาะที่ใช้) — ชื่อที่ AI แต่งขึ้นเองจะกลายเป็นช่องว่าง จึงทิ้ง */
let ICONS=null;
function iconSet(){
  if(ICONS&&ICONS.size)return ICONS;const set=new Set();
  for(const sh of D.styleSheets){let rules;try{if(!/\/icons\/ti\.css/.test(sh.href||''))continue;rules=sh.cssRules}catch(e){continue}
    for(const r of rules){const m=r.selectorText&&r.selectorText.match(/^\.(ti-[a-z0-9-]+)::?before$/);if(m)set.add(m[1])}}
  return ICONS=set;
}
const icon=x=>{const s=S(x,44).replace(/^ti-/,'');if(!/^[a-z0-9-]{2,40}$/.test(s))return '';const set=iconSet();return !set.size||set.has('ti-'+s)?'ti-'+s:''};
const arr=(x,n)=>Array.isArray(x)?x.slice(0,n||LIM.arr):[];
const idOf=(x,i)=>{const s=S(x,24).replace(/[^\w-]/g,'');return s||'i'+i};

function act(a){
  if(!a||typeof a!=='object')return null;
  if(a.do==='ask'){const text=S(a.text,300);return text?{do:'ask',text}:null}
  if(a.do==='open'&&Object.hasOwn(OPEN,a.to)){const o={do:'open',to:a.to};
    if(a.to==='search'){o.q=S(a.q,80);if(!o.q)return null}
    if(a.to==='category'){if(!CATS.has(a.cat))return null;o.cat=a.cat}
    return o}
  if(a.do==='tool'&&TOOLS.has(a.k))return {do:'tool',k:a.k};
  return null;
}
function kids(list,d,c){return arr(list,LIM.arr).map(x=>node(x,d+1,c)).filter(Boolean)}
function node(n,d,c){
  if(!n||typeof n!=='object'||Array.isArray(n)||!TYPES.has(n.t)||d>LIM.depth||++c.n>LIM.nodes)return null;
  const t=n.t,o={t};
  switch(t){
    case 'card':o.title=S(n.title);o.sub=S(n.sub);o.icon=icon(n.icon);o.tone=tone(n.tone);o.children=kids(n.children,d,c);return o.title||o.children.length?o:null;
    case 'row':case 'col':o.children=kids(n.children,d,c);return o.children.length?o:null;
    case 'grid':o.cols=N(n.cols,2,3)||2;o.children=kids(n.children,d,c);return o.children.length?o:null;
    case 'divider':return o;
    case 'h':o.text=S(n.text);o.level=N(n.level,1,3)||2;return o.text?o:null;
    case 'text':o.text=S(n.text,LIM.long);o.muted=!!n.muted;o.size=['sm','md','lg'].includes(n.size)?n.size:'md';return o.text?o:null;
    case 'badge':o.text=S(n.text,40);o.tone=tone(n.tone);o.icon=icon(n.icon);return o.text?o:null;
    case 'stat':o.label=S(n.label,60);o.value=S(n.value,24);o.unit=S(n.unit,16);o.tone=tone(n.tone);o.icon=icon(n.icon);o.trend=['up','down','flat'].includes(n.trend)?n.trend:'';return o.value?o:null;
    case 'meter':case 'gauge':o.label=S(n.label,80);o.value=N(n.value,0,100);o.note=S(n.note,120);o.tone=tone(n.tone);o.unit=S(n.unit,8)||'%';return o.value==null?null:o;
    case 'range':{o.label=S(n.label,80);o.unit=S(n.unit,8)||'฿';o.note=S(n.note,140);
      let lo=N(n.min,0,1e9),hi=N(n.max,0,1e9);if(lo==null||hi==null)return null;if(lo>hi)[lo,hi]=[hi,lo];
      o.min=lo;o.max=hi;const ty=N(n.typical,lo,hi);if(ty!=null)o.typical=ty;return o}
    case 'list':o.ordered=!!n.ordered;o.items=arr(n.items).map(x=>typeof x==='object'&&x?{text:S(x.text,240),icon:icon(x.icon),tone:tone(x.tone)}:{text:S(x,240),icon:'',tone:''}).filter(x=>x.text);return o.items.length?o:null;
    case 'steps':o.items=arr(n.items).map(x=>typeof x==='object'&&x?{title:S(x.title,90),text:S(x.text,260)}:{title:S(x,90),text:''}).filter(x=>x.title);return o.items.length?o:null;
    case 'timeline':o.items=arr(n.items).map(x=>x&&typeof x==='object'?{when:S(x.when,40),title:S(x.title,90),note:S(x.note,160),state:['done','due','soon','later'].includes(x.state)?x.state:'later'}:null).filter(x=>x&&x.title);return o.items.length?o:null;
    case 'table':{o.head=arr(n.head,LIM.cols).map(x=>S(x,60));const w=o.head.length;
      o.rows=arr(n.rows,LIM.rows).map(r=>arr(r,LIM.cols).map(x=>S(x,90))).filter(r=>r.length);
      if(!o.rows.length)return null;o.best=N(n.best,0,LIM.cols-1);if(w&&o.rows.some(r=>r.length>w))o.rows=o.rows.map(r=>r.slice(0,w));return o}
    case 'alert':o.tone=tone(n.tone)||'warn';o.title=S(n.title,90);o.text=S(n.text,LIM.long);o.icon=icon(n.icon);return o.title||o.text?o:null;
    case 'checklist':o.id=idOf(n.id,c.n);o.title=S(n.title,90);o.submit=S(n.submit,40);o.items=arr(n.items).map((x,i)=>x&&typeof x==='object'?{id:idOf(x.id,i),text:S(x.text,160),hint:S(x.hint,160)}:{id:'i'+i,text:S(x,160),hint:''}).filter(x=>x.text);return o.items.length?o:null;
    case 'choices':o.id=idOf(n.id,c.n);o.label=S(n.label,90);o.multi=!!n.multi;o.submit=S(n.submit,40);o.options=arr(n.options,8).map(x=>S(x,60)).filter(Boolean);return o.options.length>=2?o:null;
    case 'button':{o.label=S(n.label,40);o.icon=icon(n.icon);o.style=['primary','ghost','danger'].includes(n.style)?n.style:'ghost';o.act=act(n.act);return o.label&&o.act?o:null}
    case 'buttons':o.items=arr(n.items,4).map(x=>node({...(x||{}),t:'button'},d+1,c)).filter(Boolean);return o.items.length?o:null;
    case 'shops':{o.cat=CATS.has(n.cat)?n.cat:'';o.q=S(n.q,60);o.title=S(n.title,80);o.limit=N(n.limit,1,3)||3;return o.cat||o.q?o:null}
  }
  return null;
}
/* ข้อมูลดิบจาก AI → สเปกที่ปลอดภัย (หรือ null) */
function sanitize(raw){
  let v=raw;if(typeof v==='string'){try{v=JSON.parse(v)}catch(e){return null}}
  const list=Array.isArray(v)?v:v&&Array.isArray(v.blocks)?v.blocks:v&&typeof v==='object'?[v]:[];
  const c={n:0},blocks=list.slice(0,LIM.arr).map(x=>node(x,0,c)).filter(Boolean);
  return blocks.length?{v:1,id:'u'+Math.random().toString(36).slice(2,10),blocks}:null;
}
/* แกะ [[UI]]...[[/UI]] ออกจากข้อความ (ทุกบล็อก รวมกันเป็นหน้าจอเดียว) */
function cut(text){
  const blocks=[];let out=String(text||'');
  out=out.replace(/\[\[UI\]\]([\s\S]*?)(?:\[\[\/UI\]\]|$)/g,(_,j)=>{const s=sanitize(j.trim());if(s)blocks.push(...s.blocks);return ''});
  return {text:out.trim(),ui:blocks.length?{v:1,id:'u'+Math.random().toString(36).slice(2,10),blocks:blocks.slice(0,LIM.arr)}:null};
}

/* ── วาด ── */
const fmt=v=>Number(v).toLocaleString(T('th-TH','en-US'),{maximumFractionDigits:0});
const ic=x=>x?`<i class="ti ${esc(x)}" aria-hidden="true"></i>`:'';
const tc=x=>x?' t-'+x:'';
function actAttrs(a){
  let s=` data-aui-do="${a.do}"`;
  if(a.text)s+=` data-aui-text="${esc(a.text)}"`;if(a.to)s+=` data-aui-to="${esc(a.to)}"`;
  if(a.q)s+=` data-aui-q="${esc(a.q)}"`;if(a.cat)s+=` data-aui-cat="${esc(a.cat)}"`;if(a.k)s+=` data-aui-k="${esc(a.k)}"`;return s;
}
function draw(n,st){
  const C=x=>(x||[]).map(k=>draw(k,st)).join('');
  switch(n.t){
    case 'card':return `<section class="aui-card${tc(n.tone)}">${n.title||n.icon?`<header class="aui-ch">${n.icon?`<span class="aui-ci">${ic(n.icon)}</span>`:''}<span><b>${esc(n.title)}</b>${n.sub?`<small>${esc(n.sub)}</small>`:''}</span></header>`:''}${n.children.length?`<div class="aui-cb">${C(n.children)}</div>`:''}</section>`;
    case 'row':return `<div class="aui-row">${C(n.children)}</div>`;
    case 'col':return `<div class="aui-col">${C(n.children)}</div>`;
    case 'grid':return `<div class="aui-grid" style="--cols:${n.cols}">${C(n.children)}</div>`;
    case 'divider':return '<hr class="aui-hr">';
    case 'h':return `<div class="aui-h l${n.level}" role="heading" aria-level="${n.level+2}">${rich(n.text)}</div>`;
    case 'text':return `<p class="aui-p s-${n.size}${n.muted?' muted':''}">${rich(n.text)}</p>`;
    case 'badge':return `<span class="aui-badge${tc(n.tone)}">${ic(n.icon)}${esc(n.text)}</span>`;
    case 'stat':return `<div class="aui-stat${tc(n.tone)}">${n.label?`<small>${ic(n.icon)}${esc(n.label)}</small>`:''}<b>${esc(n.value)}${n.unit?`<em>${esc(n.unit)}</em>`:''}${n.trend?`<i class="ti ti-trending-${n.trend==='flat'?'up':n.trend} tr-${n.trend}" aria-hidden="true"></i>`:''}</b></div>`;
    case 'meter':return `<div class="aui-meter${tc(n.tone)}" style="--v:${n.value}"><div class="aui-mh"><span>${esc(n.label)}</span><b>${fmt(n.value)}${esc(n.unit)}</b></div><div class="aui-track" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${n.value}" aria-label="${esc(n.label)}"><i></i></div>${n.note?`<small>${esc(n.note)}</small>`:''}</div>`;
    case 'gauge':{const r=34,L=2*Math.PI*r;return `<div class="aui-gauge${tc(n.tone)}" style="--v:${n.value};--len:${L.toFixed(1)}"><svg viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="${r}" class="g0"/><circle cx="42" cy="42" r="${r}" class="g1"/></svg><b>${fmt(n.value)}<em>${esc(n.unit)}</em></b>${n.label?`<small>${esc(n.label)}</small>`:''}</div>`}
    case 'range':{const span=Math.max(1,n.max-n.min),pos=n.typical!=null?((n.typical-n.min)/span*100):null,u=esc(n.unit),pre=u==='฿';
      const f=v=>pre?u+fmt(v):fmt(v)+' '+u;
      return `<div class="aui-range">${n.label?`<div class="aui-mh"><span>${esc(n.label)}</span>${pos!=null?`<b>${T('ปกติราว','Typical')} ${f(n.typical)}</b>`:''}</div>`:''}<div class="aui-rt"><i></i>${pos!=null?`<span class="aui-rm" style="left:${pos.toFixed(1)}%"></span>`:''}</div><div class="aui-rl"><span>${f(n.min)}</span><span>${f(n.max)}</span></div>${n.note?`<small>${esc(n.note)}</small>`:''}</div>`}
    case 'list':{const tag=n.ordered?'ol':'ul';return `<${tag} class="aui-list">${n.items.map(x=>`<li${x.tone?` class="t-${x.tone}"`:''}>${x.icon?ic(x.icon):''}<span>${rich(x.text)}</span></li>`).join('')}</${tag}>`}
    case 'steps':return `<ol class="aui-steps">${n.items.map((x,i)=>`<li><span class="n">${i+1}</span><div><b>${esc(x.title)}</b>${x.text?`<p>${rich(x.text)}</p>`:''}</div></li>`).join('')}</ol>`;
    case 'timeline':return `<ol class="aui-tl">${n.items.map(x=>`<li class="s-${x.state}"><i aria-hidden="true"></i><div>${x.when?`<small>${esc(x.when)}</small>`:''}<b>${esc(x.title)}</b>${x.note?`<p>${esc(x.note)}</p>`:''}</div></li>`).join('')}</ol>`;
    case 'table':return `<div class="aui-tw"><table class="aui-table">${n.head.length?`<thead><tr>${n.head.map((h,i)=>`<th${i===n.best?' class="best"':''}>${esc(h)}</th>`).join('')}</tr></thead>`:''}<tbody>${n.rows.map(r=>`<tr>${r.map((x,i)=>`<td${i===n.best?' class="best"':''}>${rich(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    case 'alert':return `<div class="aui-alert${tc(n.tone)}" role="${n.tone==='danger'?'alert':'note'}">${ic(n.icon||(n.tone==='danger'?'ti-alert-octagon':n.tone==='ok'?'ti-circle-check':n.tone==='info'?'ti-info-circle':'ti-alert-triangle'))}<div>${n.title?`<b>${esc(n.title)}</b>`:''}${n.text?`<p>${rich(n.text)}</p>`:''}</div></div>`;
    case 'checklist':{const s=st[n.id]||{},on=new Set(s.on||[]),done=!!s.done;
      return `<div class="aui-ck${done?' done':''}" data-aui-ck="${esc(n.id)}">${n.title?`<b class="aui-ckt">${esc(n.title)}</b>`:''}${n.items.map(x=>`<button type="button" class="aui-cki" role="checkbox" aria-checked="${on.has(x.id)}" data-aui-ci="${esc(x.id)}"${done?' disabled':''}><span class="bx" aria-hidden="true"><i class="ti ti-check"></i></span><span><b>${esc(x.text)}</b>${x.hint?`<small>${esc(x.hint)}</small>`:''}</span></button>`).join('')}${done?`<p class="aui-sent"><i class="ti ti-circle-check"></i>${T('ส่งผลให้ AI แล้ว','Sent to the AI')}</p>`:`<button type="button" class="aui-btn primary aui-cks"><i class="ti ti-send"></i>${esc(n.submit||T('ส่งผลการเช็ก','Send results'))}</button>`}</div>`}
    case 'choices':{const s=st[n.id]||{},on=new Set(s.on||[]),done=!!s.done;
      return `<div class="aui-ch2${done?' done':''}" data-aui-choice="${esc(n.id)}"${n.multi?' data-multi="1"':''}>${n.label?`<b class="aui-ckt">${esc(n.label)}</b>`:''}<div class="aui-opts">${n.options.map((x,i)=>`<button type="button" class="aui-opt" aria-pressed="${on.has(i)}" data-aui-oi="${i}"${done?' disabled':''}>${esc(x)}</button>`).join('')}</div>${n.multi&&!done?`<button type="button" class="aui-btn primary aui-chs"><i class="ti ti-send"></i>${esc(n.submit||T('ส่งคำตอบ','Send'))}</button>`:''}</div>`}
    case 'button':return `<button type="button" class="aui-btn ${n.style}"${actAttrs(n.act)}>${ic(n.icon)}<span>${esc(n.label)}</span></button>`;
    case 'buttons':return `<div class="aui-btns">${n.items.map(x=>draw(x,st)).join('')}</div>`;
    case 'shops':return `<div class="aui-shops" data-aui-shops data-cat="${esc(n.cat)}" data-q="${esc(n.q)}" data-limit="${n.limit}">${n.title?`<b class="aui-ckt">${esc(n.title)}</b>`:''}<div class="aui-shl" aria-busy="true"><span class="aui-sk"></span><span class="aui-sk"></span></div></div>`;
  }
  return '';
}
function html(m){
  const u=m&&m.ui;if(!u||!Array.isArray(u.blocks))return '';
  return `<div class="aui" data-aui="${esc(u.id||'')}">${u.blocks.map(b=>draw(b,m.uiState||{})).join('')}</div>`;
}

/* ── การกด ── */
let CFG={send:null,find:null,save:null,openTool:null,token:null,me:null};
const stateOf=(el,key)=>{const host=el.closest('[data-aui]'),m=CFG.find&&host?CFG.find(host.dataset.aui):null;if(!m)return {m:null,s:{}};m.uiState=m.uiState||{};return {m,s:(m.uiState[key]=m.uiState[key]||{})}};
function go(path){try{if(W.CendonPaint)W.CendonPaint.prepare(path)}catch(e){}W.location.href=path}
function run(b){
  const d=b.dataset;
  if(d.auiDo==='ask'&&CFG.send)return CFG.send(d.auiText);
  if(d.auiDo==='open'&&Object.hasOwn(OPEN,d.auiTo)){
    let p=OPEN[d.auiTo];
    if(d.auiTo==='search')p+='?q='+encodeURIComponent(d.auiQ||'');
    if(d.auiTo==='category'){if(!CATS.has(d.auiCat))return;p+='/'+d.auiCat}
    return go(p);
  }
  if(d.auiDo==='tool'&&TOOLS.has(d.auiK)){const f=CFG.openTool||W.openTool;if(typeof f==='function')return f(d.auiK)}
}
D.addEventListener('click',e=>{
  const t=e.target;if(!t.closest||!t.closest('.aui'))return;
  const b=t.closest('[data-aui-do]');if(b){e.preventDefault();run(b);return}
  const ci=t.closest('.aui-cki');if(ci&&!ci.disabled){const box=ci.closest('[data-aui-ck]'),{m,s}=stateOf(ci,box.dataset.auiCk),id=ci.dataset.auiCi;
    const on=new Set(s.on||[]);on.has(id)?on.delete(id):on.add(id);s.on=[...on];ci.setAttribute('aria-checked',on.has(id));if(m&&CFG.save)CFG.save();return}
  const cs=t.closest('.aui-cks');if(cs){const box=cs.closest('[data-aui-ck]'),{m,s}=stateOf(cs,box.dataset.auiCk);if(s.done)return;
    const items=[...box.querySelectorAll('.aui-cki')],yes=items.filter(x=>x.getAttribute('aria-checked')==='true'),no=items.filter(x=>x.getAttribute('aria-checked')!=='true');
    const name=x=>x.querySelector('b').textContent;
    const msg=[T('ผลการเช็กตามรายการ:','My check results:'),...yes.map(x=>'✓ '+name(x)),...no.map(x=>'✗ '+name(x)+T(' (ไม่ใช่/ไม่พบ)',' (no / not found)'))].join('\n');
    s.done=true;if(m&&CFG.save)CFG.save();box.classList.add('done');box.querySelectorAll('button').forEach(x=>x.disabled=true);
    if(CFG.send)CFG.send(msg);return}
  const op=t.closest('.aui-opt');if(op&&!op.disabled){const box=op.closest('[data-aui-choice]'),{m,s}=stateOf(op,box.dataset.auiChoice),i=+op.dataset.auiOi;
    if(box.dataset.multi==='1'){const on=new Set(s.on||[]);on.has(i)?on.delete(i):on.add(i);s.on=[...on];op.setAttribute('aria-pressed',on.has(i));if(m&&CFG.save)CFG.save();return}
    s.on=[i];s.done=true;if(m&&CFG.save)CFG.save();box.classList.add('done');box.querySelectorAll('button').forEach(x=>{x.disabled=true;x.setAttribute('aria-pressed',x===op)});
    if(CFG.send)CFG.send(op.textContent);return}
  const chs=t.closest('.aui-chs');if(chs){const box=chs.closest('[data-aui-choice]'),{m,s}=stateOf(chs,box.dataset.auiChoice);if(s.done)return;
    const picked=[...box.querySelectorAll('.aui-opt[aria-pressed="true"]')].map(x=>x.textContent);if(!picked.length)return;
    s.done=true;if(m&&CFG.save)CFG.save();box.classList.add('done');box.querySelectorAll('button').forEach(x=>x.disabled=true);chs.remove();
    const lab=box.querySelector('.aui-ckt');if(CFG.send)CFG.send((lab?lab.textContent+': ':'')+picked.join(', '))}
});

/* ── ร้านจริงจากรายชื่อสาธารณะของ Cendon (ไม่ให้ AI แต่งชื่อร้าน) ── */
let shopsP=null,shopsAt=0;
function shops(){
  if(shopsP&&Date.now()-shopsAt<5*60e3)return shopsP;
  shopsAt=Date.now();
  shopsP=(async()=>{const base=String(W.BACKEND_URL||'https://spireonebackend.carspirethailand.workers.dev').replace(/\/+$/,'');
    const h={};try{const tk=CFG.token&&await CFG.token();if(tk)h.Authorization='Bearer '+tk}catch(e){}
    const r=await fetch(base+'/api/tech',{headers:h});if(!r.ok)throw Error('shops '+r.status);const d=await r.json();return Array.isArray(d.techs)?d.techs:[]})();
  shopsP.catch(()=>{shopsP=null});
  return shopsP;
}
const stars=v=>v>0?`<span class="aui-star"><i class="ti ti-star-filled" aria-hidden="true"></i>${Number(v).toFixed(1)}</span>`:'';
function fill(el){
  if(el.dataset.on)return;el.dataset.on='1';
  const cat=el.dataset.cat,q=(el.dataset.q||'').toLowerCase(),limit=+el.dataset.limit||3,list=el.querySelector('.aui-shl');
  shops().then(all=>{
    const mine=CFG.me&&CFG.me();
    let l=all.filter(t=>t&&t.id&&!t.test&&!t.vacation&&!t.full&&t.id!==mine);
    if(cat==='mobile')l=l.filter(t=>t.mobile);else if(cat==='urgent')l=l.filter(t=>t.urgent);else if(cat)l=l.filter(t=>(t.cats||[]).includes(cat));
    if(q&&!cat)l=l.filter(t=>[t.shop,t.name,...(t.cats||[]),t.bio||'',t.about||''].join(' ').toLowerCase().includes(q));
    l.sort((a,b)=>(!!b.online-!!a.online)||((+b.rating||0)-(+a.rating||0))||((+b.reviewCount||0)-(+a.reviewCount||0)));
    l=l.slice(0,limit);list.removeAttribute('aria-busy');
    list.innerHTML=l.length?l.map(t=>`<button type="button" class="aui-shop" data-aui-tech="${esc(t.id)}"><span class="av">${esc(String(t.shop||t.name||'?').trim().charAt(0))}</span><span class="tx"><b>${esc(t.shop||t.name)}</b><small>${t.online?`<span class="on">${T('รับงานอยู่','Taking jobs')}</span>`:''}${stars(+t.rating)}${t.verified?`<i class="ti ti-rosette-discount-check-filled vf" aria-label="${T('ยืนยันแล้ว','Verified')}"></i>`:''}</small></span><span class="go">${T('ขอราคา','Get a quote')}<i class="ti ti-chevron-right"></i></span></button>`).join('')
      +(cat?`<button type="button" class="aui-btn ghost" data-aui-do="open" data-aui-to="category" data-aui-cat="${esc(cat)}"><i class="ti ti-list-search"></i><span>${T('ดูร้านทั้งหมด','See all shops')}</span></button>`:'')
      :`<p class="aui-p s-sm muted">${T('ยังไม่มีร้านที่ตรงในรายชื่อตอนนี้','No matching shops listed yet')}</p><button type="button" class="aui-btn ghost" data-aui-do="open" data-aui-to="post"><i class="ti ti-speakerphone"></i><span>${T('ประกาศหาช่างแทน','Post a job instead')}</span></button>`;
  }).catch(()=>{list.removeAttribute('aria-busy');list.innerHTML=`<p class="aui-p s-sm muted">${T('โหลดรายชื่อร้านไม่ได้ตอนนี้','Couldn’t load shops right now')}</p>`;delete el.dataset.on});
}
D.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-aui-tech]');if(!b)return;e.preventDefault();go('/tech/'+encodeURIComponent(b.dataset.auiTech))});
new MutationObserver(()=>D.querySelectorAll('.aui-shops:not([data-on])').forEach(fill)).observe(D.documentElement,{childList:true,subtree:true});

W.CendonAIUI=Object.freeze({cut,sanitize,html,config:o=>{CFG={...CFG,...o}},LIM,OPEN:Object.keys(OPEN),TOOLS:[...TOOLS],CATS:[...CATS],TYPES:[...TYPES]});
})(window,document);
