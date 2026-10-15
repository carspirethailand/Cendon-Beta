/* โครงหน้าเว็บ Cendon ที่ทุกหน้าใช้ร่วมกัน: หัวหน้า แถบเมนูบนแบบแอปบนคอม ส่วนท้าย
   ทุกข้อความมีสองภาษา (ไทย/อังกฤษ) แสดงทีละภาษาตาม data-lang บน <html>
   เนื้อหาเขียนเองทั้งหมด (ไม่รับจากผู้ใช้) จึงใส่เป็น HTML ได้ตรง ๆ */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

/* โดเมนจริงของเว็บ — เปลี่ยนโดเมนเมื่อไรแก้ที่นี่ที่เดียวแล้วรัน build */
export const SITE='https://cendon-beta.pages.dev';
export const EMAIL='carspirethailand@gmail.com';
/* บัญชี LINE ทางการ — ต้องตรงกับ LINE_OA_ID ใน wrangler.jsonc ของหลังบ้าน */
export const LINE_OA='@988omovg';
export const LINE_ADD='https://line.me/R/ti/p/'+encodeURIComponent(LINE_OA);

const here=p=>new URL(p,import.meta.url);
const WORDMARK=readFileSync(here('./brand/wordmark.svg.txt'),'utf8').trim();
const LOGO=readFileSync(here('./brand/logo-path.txt'),'utf8').trim();
/* ใส่ลายนิ้วมือไฟล์ท้ายลิงก์ แก้ css/js แล้วเครื่องผู้ใช้โหลดใหม่ทันที ไม่ค้างของเก่า */
const ver=p=>createHash('sha1').update(readFileSync(here(p))).digest('hex').slice(0,10);
const V={css:ver('./static/site.css'),js:ver('./static/site.js'),font:ver('./static/spire09.css')};

/* ── ตัวช่วยสองภาษา ── */
export const L=(th,en=th)=>`<span data-l="th">${th}</span><span data-l="en" lang="en">${en}</span>`;
export const P=(th,en,cls='')=>{const c=cls?` class="${cls}"`:'';return `<p data-l="th"${c}>${th}</p><p data-l="en" lang="en"${c}>${en}</p>`};
export const UL=(items,tag='ul')=>`<${tag}>${items.map(([th,en])=>`<li>${L(th,en)}</li>`).join('')}</${tag}>`;
const pair=v=>Array.isArray(v)?v:[v,v];
/* ตาราง: หัวคอลัมน์ติดไปกับทุกช่องด้วย (มือถือแสดงเป็นการ์ด) */
export const TABLE=(head,rows)=>{
  const h=head.map(pair);
  return `<div class="tbl"><table><thead><tr>${h.map(([th,en])=>`<th scope="col">${L(th,en)}</th>`).join('')}</tr></thead><tbody>${
    rows.map(r=>`<tr>${r.map((c,i)=>{const [th,en]=pair(c);return `<td${i?` data-hth="${h[i][0]}" data-hen="${h[i][1]}"`:''}>${L(th,en)}</td>`}).join('')}</tr>`).join('')
  }</tbody></table></div>`;
};
export const NOTE=(kind,icon,th,en)=>`<div class="note ${kind}">${I[icon]}<div>${L(th,en)}</div></div>`;

/* ── ไอคอนเส้น (แบบเดียวกับในแอป) ── */
const ic=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const I={
  sparkle:ic('<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.13-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0l1.58 6.14a2 2 0 0 0 1.44 1.44l6.13 1.58a.5.5 0 0 1 0 .96l-6.13 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/>'),
  help:ic('<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>'),
  terms:ic('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>'),
  shield:ic('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>'),
  open:ic('<path d="M7 7h10v10"/><path d="M7 17 17 7"/>'),
  chat:ic('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>'),
  camera:ic('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>'),
  mic:ic('<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>'),
  receipt:ic('<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>'),
  wrench:ic('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'),
  usercheck:ic('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>'),
  eyeoff:ic('<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61"/><path d="M2 2l20 20"/>'),
  lock:ic('<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
  wallet:ic('<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>'),
  flag:ic('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>'),
  download:ic('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>'),
  trash:ic('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>'),
  bell:ic('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
  globe:ic('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>'),
  mail:ic('<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'),
  info:ic('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'),
  alert:ic('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
  check:ic('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>'),
  car:ic('<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>'),
  phone:ic('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>'),
  clock:ic('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  pin:ic('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
  star:ic('<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>'),
  key:ic('<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>'),
  phoneapp:ic('<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>'),
  store:ic('<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/>'),
  link:ic('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
  zap:ic('<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'),
  image:ic('<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>'),
  user:ic('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  refresh:ic('<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>'),
  scale:ic('<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>'),
};
export const MARK=`<svg class="mark" viewBox="-6 -6 94.8 112" aria-hidden="true"><path fill="currentColor" d="${LOGO}"/></svg>`;
const WM=`<svg class="wm" viewBox="-44 -744 4817 788" aria-hidden="true">${WORDMARK}</svg>`;

/* ภาษาเริ่มต้น: ที่เลือกไว้ในแอป/เว็บ (spire_lang) → ภาษาเบราว์เซอร์ → อังกฤษ
   ต้องรันก่อนวาดหน้า ไม่งั้นจะเห็นภาษาผิดแวบหนึ่ง */
const LANG_JS=`(function(){var l=null;try{l=JSON.parse(localStorage.getItem("spire_lang"))}catch(e){}if(l!=="th"&&l!=="en"){if(l)l="en";else{l="en";try{var a=navigator.languages||[navigator.language];for(var i=0;i<a.length;i++){if(/^th\\b/i.test(a[i])){l="th";break}if(/^en\\b/i.test(a[i]))break}}catch(e){}}}var h=document.documentElement;h.setAttribute("data-lang",l);h.lang=l})();`;

const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');

/* ไม่มีแถบเมนูบน (หน้าโล่ง สบายตา) — มีแค่โลโก้นิ่งบนหัวหน้า
   ทางไปหน้าอื่นอยู่ส่วนท้าย และในแอป: ตั้งค่า → "อ่านเพิ่มเติม" */
const top=()=>`<header class="top"><div class="wrap"><a class="brand" href="/about" aria-label="Cendon">${MARK}${WM}</a></div></header>`;
const LANG=`<div class="lang" role="group" aria-label="ภาษา · Language"><button type="button" data-set="th" aria-pressed="false">ไทย</button><button type="button" data-set="en" aria-pressed="false">English</button></div>`;

function foot(active){
  const a=(href,key,th,en)=>`<a href="${href}"${key===active?' aria-current="page"':''}>${L(th,en)}</a>`;
  return `<footer class="foot"><div class="wrap">
<div class="brandcol"><a class="brand" href="/about" aria-label="Cendon">${MARK}${WM}</a>
<p class="about">${L('ผู้ช่วยดูแลรถที่คุยรู้เรื่อง และช่างที่ผ่านการตรวจ ใกล้คุณ','A car companion that explains things plainly, and checked mechanics near you.')}</p></div>
<nav aria-label="Cendon"><h4>Cendon</h4><ul><li><a href="/">${L('เปิดแอป','Open the app')}</a></li><li>${a('/about','about','เกี่ยวกับ','About')}</li><li>${a('/help','help','ศูนย์ช่วยเหลือ','Help centre')}</li></ul></nav>
<nav aria-label="ข้อตกลง · Legal"><h4>${L('ข้อตกลง','Legal')}</h4><ul><li>${a('/terms','terms','ข้อกำหนดการใช้งาน','Terms of service')}</li><li>${a('/privacy','privacy','นโยบายความเป็นส่วนตัว','Privacy policy')}</li></ul></nav>
<div><h4>${L('ติดต่อ','Contact')}</h4><ul><li><a href="mailto:${EMAIL}">${EMAIL}</a></li><li><a href="${LINE_ADD}" rel="noopener">LINE ${LINE_OA}</a></li></ul></div>
<div class="legal"><span>© 2026 Car Spire Thailand · Cendon</span><span>${L('ไม่มีโฆษณา ไม่มีตัวติดตาม','No ads. No trackers.')}</span>${LANG}</div>
</div></footer>`;
}

/* หน้าเต็ม: page = {key, path, title:[th,en], desc:[th,en], body, doc:true|false} */
export function page({key,path,title,desc,body,doc=false}){
  const url=SITE+path;
  return `<!doctype html>
<html lang="th" data-lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<script>${LANG_JS}</script>
<title>${esc(title[0])}</title>
<meta name="x-title-th" content="${esc(title[0])}">
<meta name="x-title-en" content="${esc(title[1])}">
<meta name="description" content="${esc(desc[0])}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#FBFAF7">
<meta name="color-scheme" content="light">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Cendon">
<meta property="og:title" content="${esc(title[0])}">
<meta property="og:description" content="${esc(desc[0])}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="th_TH">
<meta property="og:locale:alternate" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.png">
<link rel="apple-touch-icon" href="/icon192.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap">
<link rel="stylesheet" href="stability.css">
<link rel="stylesheet" href="/site/static/spire09.css?v=${V.font}">
<link rel="stylesheet" href="/site/static/site.css?v=${V.css}">
</head>
<body class="pg-${key}">
${doc?'<div class="readbar" aria-hidden="true"></div>':''}
${top()}
<main id="main">
${body}
</main>
${foot(key)}
<script src="/site/static/site.js?v=${V.js}" defer></script>
</body>
</html>
`;
}

/* หน้าเอกสาร: หัว + สรุปสั้น + สารบัญติดข้าง + หัวข้อเรียงเลข */
export function docBody({eyebrow,h1,lead,meta=[],summary,sections}){
  return `<header class="doc-head"><div class="wrap">
<div class="eyebrow">${L(...eyebrow)}</div>
<h1>${L(...h1)}</h1>
${P(lead[0],lead[1],'lead')}
<div class="meta">${meta.map(([icon,th,en])=>`<span class="chip">${I[icon]||''}${L(th,en)}</span>`).join('')}</div>
${summary?`<section class="summary rv" aria-label="${esc(summary.title[0])}"><h2>${L(...summary.title)}</h2>${UL(summary.items)}</section>`:''}
</div></header>
<div class="wrap doc">
<nav class="toc" aria-label="สารบัญ · Contents"><b>${L('ในหน้านี้','On this page')}</b>${
  sections.map((s,i)=>`<a href="#${s.id}">${s.n===false?'':`${i+1}. `}${L(...s.title)}</a>`).join('')
}</nav>
<article class="article">${
  sections.map((s,i)=>`<section class="sec" id="${s.id}"><h2>${s.n===false?'':`<span class="n">${String(i+1).padStart(2,'0')}</span>`}${L(...s.title)}</h2>${s.body}</section>`).join('\n')
}</article>
</div>`;
}
