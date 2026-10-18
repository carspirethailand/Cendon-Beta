/* การ์ดตัวอย่างตอนแชร์ลิงก์ร้าน/บริการ (LINE · Facebook · X)
   บอทของแอปพวกนี้ไม่รันจาวาสคริปต์ อ่านแค่ <meta> ใน HTML — เดิมทุกลิงก์ /tech/… /service/… ได้การ์ด "Cendon" เหมือนกันหมด
   ตรงนี้ (Cloudflare Pages Function) ส่งหน้าแอปตัวเดิม แต่เปลี่ยนหัวเรื่อง คำอธิบาย และรูป เป็นของร้าน/บริการนั้น
   ใช้แค่ข้อมูลที่เปิดสาธารณะอยู่แล้ว (รายชื่อร้านที่ผ่านการตรวจ/บริการ) · ร้านทดสอบไม่อยู่ในรายชื่อสาธารณะ = ได้การ์ดปกติ
   อะไรพลาด (หลังบ้านล่ม หาไม่เจอ) = ส่งหน้าเดิมทันที ไม่ทำให้ลิงก์เสีย */
const API='https://spireonebackend.carspirethailand.workers.dev';
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const clip=(s,n)=>{s=String(s||'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1).trimEnd()+'…':s};
const money=n=>Number(n||0).toLocaleString('en-US');

async function list(env,path,key){
  const r=await fetch((env&&env.TECH_API_URL||API)+path,{headers:{Accept:'application/json'},cf:{cacheTtl:300,cacheEverything:true}});
  if(!r.ok)return [];
  const d=await r.json();return Array.isArray(d[key])?d[key]:[];
}

/* ข้อมูลการ์ดจากรหัสในที่อยู่ — null = ไม่รู้จัก (ใช้การ์ดปกติ) */
export async function lookup(kind,id,env){
  const api=env&&env.TECH_API_URL||API,img=p=>p?`${api}/api/tech/img/${encodeURIComponent(p)}`:null;
  if(kind==='tech'){
    const t=(await list(env,'/api/tech','techs')).find(x=>x&&x.id===id&&x.verified&&!x.test);if(!t)return null;
    const name=t.shop||t.name||'ร้านช่าง',skills=(t.skills||[]).slice(0,3).join(' · ');
    const rate=t.reviewCount?` · ★ ${Number(t.rating).toFixed(1)} (${t.reviewCount} รีวิว)`:'';
    return {title:clip(`${name}${t.area?' · '+t.area:''}`,70)+' · Cendon',
      desc:clip(`${skills?'ช่าง'+skills:'ร้านช่าง'}${t.area?' ย่าน'+t.area:''}${rate}${t.about?' — '+t.about:''} · ขอราคาและแชตกับร้านได้ใน Cendon`,190),
      image:img(t.cover||t.avatar||(t.photos||[])[0])};
  }
  if(kind==='service'){
    const g=(await list(env,'/api/tech/gigs','gigs')).find(x=>x&&String(x.id)===id);if(!g||!g.tech||g.tech.test)return null;
    const shop=g.tech.shop||g.tech.name||'';
    return {title:clip(`${g.title}${g.price?' · เริ่ม ฿'+money(g.price):''}`,70)+' · Cendon',
      desc:clip(`${shop?shop+(g.tech.area?' ('+g.tech.area+')':'')+' — ':''}${g.body||g.title} · จองหรือทักร้านได้ใน Cendon`,190),
      image:img((g.photos||[])[0]||g.tech.cover||g.tech.avatar)};
  }
  return null;
}

/* เปลี่ยนเฉพาะแท็กหัวเรื่อง/คำอธิบาย/รูปใน <head> ของหน้าแอป — เนื้อหาหน้าเหมือนเดิมทุกตัวอักษร */
export function inject(html,info,url){
  const set=(re,val)=>{html=html.replace(re,(m,a,b)=>a+esc(val)+b)};
  set(/(<title>)[^<]*(<\/title>)/,info.title);
  set(/(<meta name="description" content=")[^"]*(")/,info.desc);
  set(/(<meta property="og:title" content=")[^"]*(")/,info.title);
  set(/(<meta property="og:description" content=")[^"]*(")/,info.desc);
  if(info.image){
    set(/(<meta property="og:image" content=")[^"]*(")/,info.image);
    /* ขนาดรูปร้านไม่ตายตัว — เอาขนาดของรูปการ์ดปกติออก ให้แอปอ่านเอง */
    html=html.replace(/<meta property="og:image:width" content="\d+">/,'').replace(/<meta property="og:image:height" content="\d+">/,'');
  }
  html=html.replace(/(<meta property="og:site_name" content="Cendon">)/,`$1<meta property="og:url" content="${esc(url)}">`);
  return html;
}

/* ตัวจัดการของ Pages Function: kind = 'tech' | 'service' */
export async function preview(ctx,kind){
  const {request,env,params}=ctx,url=new URL(request.url);
  const seg=Array.isArray(params&&params.path)?params.path:[params&&params.path].filter(Boolean);
  let id='';try{id=decodeURIComponent(seg[0]||'')}catch(e){}
  /* /tech เฉย ๆ (ไม่มีรหัส) = ไฟล์เดิมของที่อยู่นั้น (tech.html ส่งต่อลิงก์รุ่นเก่า) ไม่ยุ่ง */
  if(!seg.length&&typeof ctx.next==='function')return ctx.next();
  /* หน้าแอปตัวเดียวกับที่ _redirects ส่งให้ที่อยู่นี้ (/tech/* → /) */
  const shell=await env.ASSETS.fetch(new Request(new URL('/',url)));
  const headers=new Headers(shell.headers);
  /* หน้าในแอปต้องล็อกอิน — ไม่ให้ขึ้นผลค้นหา (การ์ดแชร์ยังทำงาน) */
  headers.set('X-Robots-Tag','noindex');headers.set('X-Frame-Options','SAMEORIGIN');
  if(!shell.ok||!id||!/^[\w-]{1,64}$/.test(id))return new Response(shell.body,{status:shell.status,headers});
  let info=null;try{info=await lookup(kind,id,env)}catch(e){info=null}
  if(!info)return new Response(shell.body,{status:shell.status,headers});
  headers.delete('content-length');headers.delete('etag');
  headers.set('Cache-Control','public, max-age=0, must-revalidate');
  return new Response(inject(await shell.text(),info,url.origin+url.pathname),{status:200,headers});
}
