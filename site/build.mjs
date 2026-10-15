/* สร้างหน้าเว็บ Cendon แบบไฟล์นิ่ง (SSG): node site/build.mjs
   ผลลัพธ์ about.html privacy.html terms.html help.html อยู่ที่รากเว็บ (Cloudflare Pages เสิร์ฟเป็น /about /privacy /terms /help)
   แก้เนื้อหาที่ site/content/*.mjs แล้วรันใหม่ — ห้ามแก้ไฟล์ html ที่สร้างออกมาตรง ๆ
   node site/build.mjs --check = ตรวจว่าไฟล์ในรีโปตรงกับที่ควรสร้าง (ใช้ในเทสต์) ไม่เขียนไฟล์ */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {page} from './layout.mjs';
import about from './content/about.mjs';
import privacy from './content/privacy.mjs';
import terms from './content/terms.mjs';
import help from './content/help.mjs';

export const PAGES=[about,help,terms,privacy];
const root=new URL('../',import.meta.url);

export function render(){
  return PAGES.map(p=>({file:p.file,html:page(p)}));
}

if(import.meta.url===`file://${process.argv[1]}`){
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
