/* สร้างหน้าเว็บ Cendon แบบไฟล์นิ่ง (SSG): node site/build.mjs
   ผลลัพธ์ about.html privacy.html terms.html help.html 404.html sitemap.xml robots.txt อยู่ที่รากเว็บ (Cloudflare Pages เสิร์ฟเป็น /about /privacy /terms /help)
   แก้เนื้อหาที่ site/content/*.mjs แล้วรันใหม่ — ห้ามแก้ไฟล์ html ที่สร้างออกมาตรง ๆ
   node site/build.mjs --check = ตรวจว่าไฟล์ในรีโปตรงกับที่ควรสร้าง (ใช้ในเทสต์) ไม่เขียนไฟล์ */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {page,SITE,I,ssrShell,SSR_ICONS} from './layout.mjs';
import about from './content/about.mjs';
import privacy from './content/privacy.mjs';
import terms from './content/terms.mjs';
import help from './content/help.mjs';
import notfound from './content/notfound.mjs';

export const PAGES=[about,help,terms,privacy,notfound];
const root=new URL('../',import.meta.url);

/* แผนผังเว็บให้เครื่องมือค้นหา: เฉพาะหน้าสาธารณะที่อยากให้ค้นเจอ (หน้าในแอปต้องล็อกอิน และกันด้วย X-Robots-Tag ใน _headers) */
function sitemap(){
  const urls=PAGES.filter(p=>p.index!==false).map(p=>`  <url><loc>${SITE}${p.path}</loc><priority>${p.key==='about'?'1.0':'0.6'}</priority></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}
const robots=()=>`# Cendon — เปิดให้เก็บทุกหน้าได้ หน้าในแอป/ลิงก์ส่วนตัวกันด้วย noindex (_headers) ไม่ใช่ Disallow
# (Disallow ทำให้เครื่องมือค้นหามองไม่เห็นคำสั่ง noindex แล้วอาจเก็บแค่ที่อยู่ไปขึ้นผลค้นหาแทน)
# หน้าร้าน/บริการ/หมวดช่างสาธารณะอยู่ใน /sitemaps/shops (สร้างสดจากรายชื่อร้านที่ผ่านการตรวจ)
User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
Sitemap: ${SITE}/sitemaps/shops
`;

/* โครงหน้าร้าน/บริการ/หมวดช่างสำหรับ Pages Functions (functions/ → lib/public-pages.mjs) — ไฟล์โค้ด ไม่ใช่หน้าเว็บ */
const ssrModule=()=>`/* สร้างโดย node site/build.mjs จาก site/layout.mjs — ห้ามแก้ไฟล์นี้เอง */
export const SHELL=${JSON.stringify(ssrShell())};
export const ICONS=${JSON.stringify(Object.fromEntries(SSR_ICONS.map(k=>[k,I[k]])))};
`;

export function render(){
  return [...PAGES.map(p=>({file:p.file,html:page(p)})),{file:'sitemap.xml',html:sitemap()},{file:'robots.txt',html:robots()},{file:'lib/ssr-shell.mjs',html:ssrModule()}];
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const check=process.argv.includes('--check');let stale=[];
  for(const {file,html} of render()){
    const out=new URL(file,root);
    const old=existsSync(out)?readFileSync(out,'utf8'):'';
    if(old===html){console.log('  =',file);continue}
    if(check){stale.push(file);continue}
    writeFileSync(out,html);console.log('  ✓',file,(html.length/1024).toFixed(1)+' KB');
  }
  if(stale.length){console.error('ไฟล์ไม่ตรงกับเนื้อหาใน site/ — รัน node site/build.mjs แล้ว commit: '+stale.join(', '));process.exit(1)}
}
