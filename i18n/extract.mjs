/* ดึงข้อความ UI ภาษาอังกฤษทั้งหมดของหน้าแรก/หน้าช่าง (index.html + สคริปต์ร่วมที่หน้านั้นโหลด)
   ใช้ทำพจนานุกรมภาษาอื่น (i18n/home-<lang>.js) และเทสต์ความครบ
   แหล่งข้อความ: พจนานุกรม EN ไทย→อังกฤษ (ทุกก้อน) · อาร์กิวเมนต์ที่สองของ T("ไทย","English")
                 · คู่ "ไทย","English" ในอาร์เรย์ · {th:"ไทย",en:"English"}
   T แบบเทมเพลต `...${x}...` → ช่องแทนค่ากลายเป็น {0} {1} … ตามลำดับ (หน้าเว็บจับคู่แบบรูปแบบตอนแสดงผล) */
import fs from 'fs';
/* ข้อความอังกฤษที่ประกอบขึ้นตอนแสดงผล ดึงอัตโนมัติไม่ได้ */
export const EXTRA=['item','items','CENDON PARTNER PROGRAM'];
export const SHARED=['account.js','account-actions.js','category-pages.js','cendon-line.js','mobile-ui.js'];
const THAI=/[฀-๿]/;
const val=(q,raw)=>{try{return Function('return '+q+raw+q)()}catch{return raw}};
export function extract(html,shared=[]){
  const out=new Set(),EN={};
  const a=html.indexOf('const EN={'),b=html.indexOf('\n};',a);
  Object.assign(EN,Function('return '+html.slice(a+9,b+2))());
  for(const m of html.matchAll(/Object\.assign\(EN,(\{[\s\S]*?\n?\})\);/g)){try{Object.assign(EN,Function('return '+m[1])())}catch{}}
  Object.values(EN).forEach(v=>out.add(v));EXTRA.forEach(v=>out.add(v));
  for(const src of [html,...shared]){
    const re=/\bT\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1\s*,\s*(["'`])((?:\\.|(?!\3)[^\\])*)\3\s*\)/g;let m;
    while((m=re.exec(src))){
      let raw=m[4],q=m[3];
      if(q==='`'){let i=0;raw=raw.replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g,()=>'{'+(i++)+'}');}
      out.add(val(q,raw));
    }
    /* คู่ "ไทย","English" ที่อยู่ติดกัน (เช่น ["ti-x","ไทย","English"]) — ไล่สตริงทีละตัวแล้วดูตัวถัดไป */
    const lits=[...src.matchAll(/(["'])((?:\\.|(?!\1)[^\\\n])*)\1/g)];
    for(let i=0;i+1<lits.length;i++){
      const a=lits[i],b=lits[i+1];
      if(!/^\s*,\s*$/.test(src.slice(a.index+a[0].length,b.index)))continue;
      const th=val(a[1],a[2]),en=val(b[1],b[2]);
      if(THAI.test(th)&&!THAI.test(en)&&/[A-Za-z]/.test(en))out.add(en);
    }
    for(const m of src.matchAll(/data-t(?:-ph)?="([^"|]*)\|([^"]*)"/g))out.add(m[2]);
    for(const m of src.matchAll(/\bth\s*:\s*(["'])((?:\\.|(?!\1)[^\\\n])*)\1\s*,\s*en\s*:\s*(["'])((?:\\.|(?!\3)[^\\\n])*)\3/g))out.add(val(m[3],m[4]));
  }
  return {EN,strings:[...out].filter(x=>typeof x==='string'&&/[A-Za-z]/.test(x)&&!/^(https?:|\/|#|ti-)/.test(x)).map(s=>s.trim()).filter((s,i,arr)=>s&&arr.indexOf(s)===i)};
}
export function load(dir=new URL('../',import.meta.url)){
  const html=fs.readFileSync(new URL('index.html',dir),'utf8');
  return extract(html,SHARED.map(f=>fs.readFileSync(new URL(f,dir),'utf8')));
}
if(process.argv[1]&&process.argv[1].endsWith('extract.mjs')){
  const {strings}=load();
  fs.writeFileSync(process.argv[2]||'/dev/stdout',strings.map((s,i)=>i+'\t'+JSON.stringify(s)).join('\n')+'\n');
}
