import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
/* ฟอนต์และไอคอนโหลดจากเว็บเราเองก่อนวาดเฟรมแรก — เดิมโหลดจาก CDN แบบไม่รอ
   เปลี่ยนหน้าแล้วไอคอน (กระดิ่ง เมนู) หายแวบ ตัวหนังสือ/เมนูขยับทุกครั้ง */
const u=f=>new URL('../'+f,import.meta.url),r=f=>readFileSync(u(f),'utf8'),h8=b=>createHash('sha256').update(b).digest('hex').slice(0,8);
const PAGES=['index.html','garage.html','spares.html','news.html','profile.html','chat.html'];
const ti=r('icons/ti.css'),have=new Set([...ti.matchAll(/\.ti-([a-z0-9-]+):before/g)].map(m=>m[1]));

test('every icon the app names exists in the local icon font (add new ones with tools/icons-subset.py)', () => {
  const miss=[];
  for(const f of readdirSync(u('.')).filter(f=>/\.(html|js|mjs|css)$/.test(f)))
    for(const m of r(f).matchAll(/(?<![A-Za-z0-9_-])ti-([a-z0-9]+(?:-[a-z0-9]+)*)(?![a-z0-9-]|\$\{)/g))if(!have.has(m[1]))miss.push(f+': ti-'+m[1]);
  assert.deepEqual([...new Set(miss)],[]);
});

test('app pages load fonts and icons from this site before the first frame, versioned by file hash', () => {
  const wv=ti.match(/ti\.woff2\?v=([a-f0-9]{8})/)[1];
  assert.equal(wv,h8(readFileSync(u('icons/ti.woff2'))),'icon font version is its hash');
  const cv=h8(readFileSync(u('icons/ti.css')));
  for(const f of PAGES){const s=r(f),head=s.slice(0,s.indexOf('</head>'));
    assert.doesNotMatch(s,/tabler-icons\.min\.css|family=Kanit/,f+': no CDN icon font or Google Kanit');
    assert.match(head,new RegExp(`<link rel="preload" href="/icons/ti\\.woff2\\?v=${wv}" as="font" type="font/woff2" crossorigin>`),f);
    assert.match(head,/<link rel="preload" href="\/fonts\/kanit-400-thai\.woff2" as="font" type="font\/woff2" crossorigin>/,f);
    assert.match(head,new RegExp(`<link rel="stylesheet" href="/fonts/kanit\\.css\\?v=1">\\n<link rel="stylesheet" href="/icons/ti\\.css\\?v=${cv}">`),f+': render-blocking, not media=print');
  }
  const sw=r('sw.js');assert.match(sw,new RegExp(`'\\./icons/ti\\.css\\?v=${cv}'`));assert.match(sw,new RegExp(`'\\./icons/ti\\.woff2\\?v=${wv}'`));
  for(const m of r('fonts/kanit.css').matchAll(/url\("([^"]+)"\)/g)){assert.ok(existsSync(u('fonts/'+m[1])),m[1]);assert.match(sw,new RegExp(`'\\./fonts/${m[1].replace('.','\\.')}'`),m[1])}
  assert.match(r('fonts/kanit.css'),/font-display:swap/);assert.ok(existsSync(u('fonts/OFL.txt'))&&existsSync(u('icons/LICENSE.txt')),'licenses shipped');
});
