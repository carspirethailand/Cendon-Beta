import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {render,PAGES} from '../site/build.mjs';
import {PROCESSOR_NAMES} from '../site/content/privacy.mjs';

/* เว็บ Cendon (/about /help /terms /privacy) สร้างจาก site/ — เทสต์นี้กันหน้าเว็บกับระบบจริงพูดไม่ตรงกัน */
const root=new URL('../',import.meta.url);
const read=f=>readFileSync(new URL(f,root),'utf8');
const built=Object.fromEntries(render().map(p=>[p.file,p.html]));

test('site: ไฟล์ html ในรีโปตรงกับเนื้อหาใน site/ (แก้ site/content แล้วต้องรัน node site/build.mjs)',()=>{
  for(const [file,html] of Object.entries(built))assert.equal(read(file),html,`${file} ไม่ตรง — รัน node site/build.mjs`);
});

/* ทุกโดเมนภายนอกที่แอปติดต่อหรือโหลดไฟล์ ต้องอยู่ในนโยบายความเป็นส่วนตัว (หรือเป็นแค่ลิงก์ที่ผู้ใช้กดออกไปเอง)
   เพิ่มบริการภายนอกใหม่ → เพิ่มในตาราง PROCESSORS ของ site/content/privacy.mjs แล้วเพิ่มโดเมนที่นี่ */
const HOSTS={
  'spireonebackend.carspirethailand.workers.dev':'Cloudflare','cendon-beta.pages.dev':'Cloudflare','cdnjs.cloudflare.com':'cdnjs',
  'www.gstatic.com':'Google Firebase','sp1p-82396-default-rtdb.firebaseio.com':'Google Firebase',
  'generativelanguage.googleapis.com':'Google Gemini',
  'fonts.googleapis.com':'Google Fonts','fonts.gstatic.com':'Google Fonts','cdn.jsdelivr.net':'jsDelivr','unpkg.com':'unpkg',
  'tile.openstreetmap.org':'OpenStreetMap','nominatim.openstreetmap.org':'OpenStreetMap','www.openstreetmap.org':'OpenStreetMap',
  'api.open-meteo.com':'Open-Meteo','geocoding-api.open-meteo.com':'Open-Meteo',
};
/* ลิงก์ที่ผู้ใช้กดออกไปเอง ไม่มีข้อมูลส่งไปจากระบบเรา */
const LINKS=new Set(['www.google.com','maps.google.com','line.me','facebook.com','www.tiktok.com','shopee.co.th','www.lazada.co.th','www.jd.co.th','www.ebay.com','www.amazon.com','www.aliexpress.com','www.pdpc.or.th']);

test('site: ทุกบริการภายนอกที่แอปใช้ มีชื่ออยู่ในนโยบายความเป็นส่วนตัว',()=>{
  const files=readdirSync(root).filter(f=>/\.(html|js)$/.test(f)&&!PAGES.some(p=>p.file===f));
  const unknown=new Set();
  for(const f of files)for(const m of read(f).matchAll(/(?:https|wss):\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)+)/gi)){
    const h=m[1].toLowerCase();
    if(!(h in HOSTS)&&!LINKS.has(h))unknown.add(`${h} (${f})`);
  }
  assert.deepEqual([...unknown],[],'มีโดเมนภายนอกใหม่ — ใส่ในนโยบาย /privacy (site/content/privacy.mjs) แล้วเพิ่มใน HOSTS ของเทสต์นี้');
  const privacy=built['privacy.html'];
  for(const name of new Set(Object.values(HOSTS)))assert.ok(privacy.includes(name),`นโยบายต้องระบุ ${name}`);
  /* ผู้ให้บริการฝั่งหลังบ้าน (ไม่เห็นในโค้ดหน้าเว็บ) */
  for(const name of ['Groq','OpenRouter','Workers AI','LINE','Didit','Resend','Web Push','Tavily','Brave','DuckDuckGo','Bing','Wikipedia','NHTSA'])
    assert.ok(privacy.includes(name),`นโยบายต้องระบุ ${name}`);
  assert.ok(PROCESSOR_NAMES.length>=14);
});

test('site: ทุกข้อความมีทั้งไทยและอังกฤษ และไม่มีชื่อแบรนด์เก่า',()=>{
  for(const [file,html] of Object.entries(built)){
    const th=(html.match(/data-l="th"/g)||[]).length,en=(html.match(/data-l="en"/g)||[]).length;
    assert.ok(th>20&&th===en,`${file}: ไทย ${th} อังกฤษ ${en}`);
    assert.doesNotMatch(html,/phasmion|github\.io|cendon[- ]?one/i,file);
    assert.match(html,/<html lang="th" data-lang="th">/);
    assert.match(html,/aria-current="page"/,file);
    /* แถบบนแบบเมฆจาง: แค่โลโก้ + ปุ่มภาษา ไม่มีเมนูลิงก์ (เจ้าของขอให้หน้าโล่ง) — ทางไปหน้าอื่นอยู่ส่วนท้าย และทางลัดในแอป */
    assert.doesNotMatch(html,/class="(navwrap|nav|nav-links)"/,file);
    assert.match(html,/<footer class="foot">[\s\S]*class="lang"/,file+': ปุ่มภาษาต้องอยู่ส่วนท้าย');
    assert.match(html,/<header class="sitebar">[\s\S]*?class="lang"[\s\S]*?<\/header>/,file+': ปุ่มภาษาต้องอยู่บนแถบบนด้วย');
    assert.doesNotMatch(html.slice(html.indexOf('<header class="sitebar">'),html.indexOf('</header>')),/href="\/(help|terms|privacy)"/,file+': แถบบนไม่มีเมนูลิงก์ (ให้โล่ง)');
  }
  assert.doesNotMatch(read('_redirects'),/github\.io|phasmion/i);
  assert.doesNotMatch(read('_redirects'),/^\/(privacy|help|about|terms)\b/m,'/privacy /help /about /terms เป็นไฟล์จริง ห้าม redirect');
  assert.doesNotMatch(read('account.js'),/github\.io|phasmion/i);
});

test('site: ลิงก์ภายในเว็บชี้ไปหัวข้อที่มีอยู่จริง',()=>{
  const ids=Object.fromEntries(Object.entries(built).map(([f,h])=>['/'+f.replace('.html',''),new Set([...h.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]))]));
  for(const [file,html] of Object.entries(built)){
    for(const m of html.matchAll(/href="(\/(?:about|help|terms|privacy))?#([^"]+)"/g)){
      const page=m[1]||'/'+file.replace('.html','');
      assert.ok(ids[page]&&ids[page].has(m[2]),`${file}: ลิงก์ ${m[0]} ไม่มีหัวข้อปลายทาง`);
    }
  }
});

test('site: นโยบายตรงกับระบบ — AI ไม่ได้รับอีเมล ช่างเห็นเบอร์หลังยืนยันราคา ลบ/ดาวน์โหลดได้เอง ไม่มีค่าธรรมเนียม',()=>{
  const p=built['privacy.html'],t=built['terms.html'];
  assert.match(p,/ไม่ส่ง:<\/b> อีเมล เบอร์โทร ที่อยู่/);
  assert.match(p,/หลังคุณยืนยันราคาแล้วเท่านั้น/);
  assert.match(p,/ดาวน์โหลดข้อมูลของฉัน/);assert.match(p,/ลบบัญชีถาวร/);
  assert.match(p,/เวอร์ชัน 1\.6/);
  /* ตู้เซฟใบสมัครช่าง (หลังบ้าน src/vault.js): เข้ารหัสจริง ไม่เก็บเลขบัตรเต็ม ใบค้างเกิน 30 วันลบรูปบัตรเอง */
  assert.match(p,/เข้ารหัส \(AES-256\)/);assert.match(p,/เลขบัตรประชาชนเต็มไม่ถูกเก็บ/);assert.match(p,/เกิน 30 วัน/);
  assert.match(built['help.html'],/เลขบัตรเต็มไม่ถูกเก็บ/);
  assert.match(t,/ตอนนี้ Cendon ฟรี/);
  assert.match(t,/191/);assert.match(t,/1669/);
  /* ปุ่มในหน้าบัญชีต้องชี้มาที่นโยบายใหม่ในเว็บเดียวกัน */
  assert.match(read('account-actions.js'),/href="\/privacy"/);
  /* ทางลัดในแอป (ตั้งค่า → อ่านเพิ่มเติม) ไปครบทั้ง 4 หน้า */
  for(const f of ['garage.html','news.html','profile.html','spares.html'])for(const pg of ['/about','/help','/terms','/privacy'])assert.ok(read(f).includes(`extLink("${pg}"`),`${f} ${pg}`);
});

test('site: service worker รู้จักหน้าเว็บ ให้เปิดได้ตอนออฟไลน์',()=>{
  const sw=read('sw.js');
  for(const p of ['/about','/help','/privacy','/terms'])assert.ok(sw.includes(`'${p}'`),p);
});

test('site: เปลี่ยนภาษาแบบเมฆลอยผ่าน — สลับข้อความตอนหมอกบังเต็มจอ และรักษาตำแหน่งที่อ่าน',()=>{
  const js=read('site/static/site.js'),css=read('site/static/site.css');
  assert.match(js,/function cloudSwap\(l\)/);
  /* สลับภาษาหลังหมอกฟุ้งจนทึบเสร็จ และหมอกเริ่มจางหลังสลับเสร็จเท่านั้น (เครื่องหน่วงก็ไม่เห็นตัวหนังสือกระโดด) */
  assert.match(js,/vin\.onfinish=function\(\)\{\s*doSwap\(\);\s*var vout=veil\.animate\(/);
  assert.match(js,/function doSwap\(\)\{if\(swapped\)return;swapped=true;swap\(l\);restore\(a\)\}/);
  assert.match(css,/\.cloudswipe\{position:fixed;inset:0;z-index:200;pointer-events:none/);
});

/* กันเศษโค้ดหลุดใน CSS: เศษที่ค้างจะไปกลืนกฎถัดไปทั้งกฎ (เคยทำให้ปุ่ม .btn เสียรูปทั้งเว็บ)
   ตรวจทุกตัวเลือก (selector) ว่าเป็นตัวเลือกจริง ไม่มีค่า CSS ปนมา และปีกกาเปิด-ปิดครบ */
test('site: site.css โครงสร้างถูกต้อง — ไม่มีเศษโค้ดค้างกลืนกฎอื่น',()=>{
  const css=read('site/static/site.css').replace(/\/\*[\s\S]*?\*\//g,'');
  let depth=0,prelude='',bad=[];
  for(const ch of css){
    if(ch==='{'){const sel=prelude.trim();
      /* ตัวเลือกจริงไม่มีฟังก์ชันค่าสี/รูปทรง และไม่ขึ้นต้นด้วยตัวเลข (ยกเว้นจังหวะใน @keyframes เช่น 0%,18% · from · to) */
      const keyframe=/^(\d+(\.\d+)?%\s*,?\s*)+$|^(from|to)$/.test(sel);
      if(!sel||(!keyframe&&!/^@/.test(sel)&&/gradient\(|rgba?\(|;|^\d|^\.\d/.test(sel)))bad.push(sel.slice(0,80));
      depth++;prelude='';}
    else if(ch==='}'){depth--;assert.ok(depth>=0,'ปีกกาปิดเกิน');prelude='';}
    else if(ch===';'&&depth>0)prelude='';
    else prelude+=ch;
  }
  assert.equal(depth,0,'ปีกกาเปิด-ปิดไม่ครบ');
  assert.deepEqual(bad,[],'ตัวเลือกแปลก ๆ (มีเศษโค้ดปน)');
  for(const sel of ['.btn','.btn.ink','.btn.soft','.lang','.sitebar','.foot','.toc','.hero','.card','.faq'])
    assert.match(css,new RegExp('(^|\\})\\s*'+sel.replace(/\./g,'\\.')+'\\{','m'),`ต้องมีกฎ ${sel} ที่ไม่ถูกกลืน`);
});
