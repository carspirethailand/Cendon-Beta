/* หน้าสาธารณะที่ Google ค้นเจอ: หน้าร้านช่าง (/tech/<id>) บริการ (/service/<id>) และหมวดช่าง (/category/<k>)
   ทำงานใน Cloudflare Pages Functions (functions/) — สร้าง HTML ที่ฝั่งเซิร์ฟเวอร์ เนื้อหาครบตั้งแต่ไบต์แรก ไม่ต้องรันจาวาสคริปต์ โหลดเร็ว
   ใครเห็นอะไร:
   - คนที่ล็อกอินอยู่ (คุกกี้ cendon_signed=1) → หน้าแอปตามเดิม (การ์ดแชร์ยังเป็นของร้านนั้น) ไม่ขึ้นผลค้นหา
   - คนทั่วไปและเครื่องมือค้นหา → หน้าสาธารณะแบบอ่านอย่างเดียว กดขอราคา/จอง/แชต = เข้าสู่ระบบก่อน แล้วกลับมาที่ร้านเดิม
   ข้อมูลที่แสดงมาจากรายชื่อสาธารณะของหลังบ้านเท่านั้น (ร้านที่ผ่านการตรวจ ไม่รวมร้านทดสอบ)
   ไม่แสดง: เบอร์โทร ไลน์ ที่อยู่ละเอียด พิกัด และข้อความรีวิวรายคน (แสดงแค่คะแนนรวม) — ข้อมูลคนใช้ไม่หลุดสู่เว็บเปิด
   อะไรพลาด (หลังบ้านล่ม) → หน้าแอปเดิม ไม่ทำให้ลิงก์เสีย · ร้าน/บริการที่ไม่มีอยู่ → 404 จริง */
import {SHELL,ICONS} from './ssr-shell.mjs';
import {CATS,catOf,shopIn,gigIn} from './cats.mjs';

const API='https://spireonebackend.carspirethailand.workers.dev';
const SITE_DEFAULT='https://cendon-beta.pages.dev';
export const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const clip=(s,n)=>{s=String(s||'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1).trimEnd()+'…':s};
const money=n=>Number(n||0).toLocaleString('en-US');
const L=(th,en=th)=>`<span data-l="th">${th}</span><span data-l="en" lang="en">${en}</span>`;
const DAYS=[['จันทร์','Monday'],['อังคาร','Tuesday'],['พุธ','Wednesday'],['พฤหัสบดี','Thursday'],['ศุกร์','Friday'],['เสาร์','Saturday'],['อาทิตย์','Sunday']];
const HHMM=/^\d{2}:\d{2}$/;

/* ── ข้อมูล ── รายชื่อร้าน + บริการ (สาธารณะ) เก็บแคชที่ขอบเครือข่าย 5 นาที */
export async function loadData(env){
  const api=env&&env.TECH_API_URL||API;
  const get=async(path,key)=>{
    const r=await fetch(api+path,{headers:{Accept:'application/json'},cf:{cacheTtl:300,cacheEverything:true}});
    if(!r.ok)throw Error('api '+r.status);const d=await r.json();return Array.isArray(d[key])?d[key]:[];
  };
  const [techs,gigs]=await Promise.all([get('/api/tech','techs'),get('/api/tech/gigs','gigs')]);
  const ok=t=>t&&t.verified&&!t.test;
  return {api,techs:techs.filter(ok),gigs:gigs.filter(g=>g&&g.tech&&ok(g.tech))};
}
const imgUrl=(api,id)=>id?`${api}/api/tech/img/${encodeURIComponent(id)}`:null;
const shopName=t=>t.shop||t.name||'ร้านช่าง';
const shopCats=t=>CATS.filter(c=>shopIn(t,c.k));
const rateTxt=t=>t.reviewCount>0?`★ ${Number(t.rating).toFixed(1)} (${t.reviewCount} ${t.reviewCount>1?'รีวิว':'รีวิว'})`:'';

/* ข้อเท็จจริงที่ทีมงานตรวจจริง (ชุดเดียวกับป้ายในแอป) — ไม่มีข้อมูล = ไม่แสดง */
function vetFacts(t){
  const v=t.vetting;if(!v)return [];
  const SH={site_visit:['ทีมงานไปดูอู่จริง','Staff visited the shop in person'],video_call:['ทีมงานดูอู่ผ่านวิดีโอคอล','Staff inspected the shop on a video call'],document_review:['ทีมงานตรวจเอกสารสถานที่','Staff reviewed the shop documents']};
  const cats=(v.cats||[]).map(k=>catOf(k)).filter(Boolean);
  return [v.identity&&['ทีมงานตรวจบัตรประชาชนของช่างแล้ว (ไม่เปิดเผยเลขบัตร)','Staff checked the mechanic’s national ID (never shown)'],
    v.phone&&['ทีมงานโทรคุยกับช่างที่เบอร์ของร้านจริง','Staff called the mechanic on the shop’s number'],
    v.shop&&(SH[v.shop]||['ทีมงานตรวจสถานที่แล้ว','Staff checked the location']),
    cats.length&&[`ตรวจทักษะงาน${cats.map(c=>c.short[0]).join(' · ')}`,`Skills checked: ${cats.map(c=>c.short[1]).join(', ')}`]].filter(Boolean);
}
const card=(title,body,id='')=>`<section class="sp-card"${id?` id="${id}"`:''}><h2>${title}</h2>${body}</section>`;
const crumbHtml=items=>`<nav class="sp-crumb" aria-label="${esc('เส้นทาง · Breadcrumb')}">${items.map(([href,label],i)=>i<items.length-1?`<a href="${href}">${label}</a> › `:`<span aria-current="page">${label}</span>`).join('')}</nav>`;
const crumbLd=(origin,items)=>({'@type':'BreadcrumbList',itemListElement:items.map(([href,name],i)=>({'@type':'ListItem',position:i+1,name,item:origin+href}))});
const gigRow=(api,g,withShop)=>{const p=(g.photos||[])[0];
  return `<li><a class="sp-row" href="/service/${encodeURIComponent(g.id)}">${p?`<img src="${esc(imgUrl(api,p))}" alt="${esc(g.title)}" loading="lazy" decoding="async" width="64" height="48">`:''}<span><b>${esc(g.title)}</b>${withShop?`<small>${esc(shopName(g.tech))}${g.tech.area?' · '+esc(g.tech.area):''}</small>`:''}</span>${g.price?`<span class="px">${L('เริ่ม','from')} ฿${money(g.price)}</span>`:''}</a></li>`};
const shopRow=(api,t)=>{const p=t.avatar||t.cover||(t.photos||[])[0],r=rateTxt(t);
  return `<li><a class="sp-row" href="/tech/${encodeURIComponent(t.id)}">${p?`<img src="${esc(imgUrl(api,p))}" alt="${esc(shopName(t))}" loading="lazy" decoding="async" width="64" height="48">`:`<span class="sp-ini" aria-hidden="true">${esc(shopName(t).slice(0,1))}</span>`}<span><b>${esc(shopName(t))}</b><small>${[t.area,r,(t.skills||[]).slice(0,3).join(' · ')].filter(Boolean).map(esc).join(' · ')}</small></span>${t.from?`<span class="px">${L('เริ่ม','from')} ฿${money(t.from)}</span>`:''}</a></li>`};
const signInCta=(path,th,en)=>`<a class="btn ink" href="/login?next=${encodeURIComponent(path)}" rel="nofollow">${L(th,en)}</a>`;

/* ── หน้าร้าน ── */
function shopPage(D,t,origin){
  const name=shopName(t),cats=shopCats(t),main=cats[0],path='/tech/'+encodeURIComponent(t.id),api=D.api;
  const gigs=D.gigs.filter(g=>g.tech.id===t.id),facts=vetFacts(t),r=rateTxt(t);
  const pics=[t.cover,...(t.photos||[])].filter((x,i,a)=>x&&x!==t.avatar&&a.indexOf(x)===i).slice(0,9);
  const week=Array.isArray(t.week)&&t.week.length===7?t.week:null;
  const chips=[r&&[ICONS.star,r,r],t.from>0&&[ICONS.wrench,`ราคาเริ่ม ฿${money(t.from)}`,`From ฿${money(t.from)}`],t.mobile&&[ICONS.car,'ออกไปซ่อมถึงที่','Comes to you'],
    t.urgent&&[ICONS.zap,'รับงานด่วน','Takes urgent jobs'],t.years>0&&[ICONS.clock,`ประสบการณ์ ${t.years} ปี`,`${t.years} years’ experience`],
    t.warranty>0&&[ICONS.shield,`รับประกันงาน ${t.warranty} วัน`,`${t.warranty}-day workmanship warranty`],
    t.proven>0&&[ICONS.check,`งานซ่อมมีคลิปหลักฐาน ${t.proven} งาน`,`${t.proven} repairs with video proof`]].filter(Boolean);
  const crumbs=[['/about','Cendon'],...(main?[['/category/'+main.k,main.th]]:[]),[path,name]];
  const body=`<header class="doc-head sp-head"><div class="wrap">
${crumbHtml(crumbs.map(([h,n],i)=>[h,i===0?'Cendon':esc(n)]))}
<div class="sp-id">${t.avatar?`<img class="sp-av" src="${esc(imgUrl(api,t.avatar))}" alt="${esc(name)}" width="72" height="72">`:`<span class="sp-av" aria-hidden="true">${esc(name.slice(0,1))}</span>`}
<div><h1>${esc(name)}</h1><p class="lead">${[t.area,(t.skills||[]).join(' · ')].filter(Boolean).map(esc).join(' · ')}</p></div></div>
${chips.length?`<div class="meta">${chips.map(([ic,th,en])=>`<span class="chip">${ic}${L(esc(th),esc(en))}</span>`).join('')}</div>`:''}
${t.vacation?`<p class="sp-note">${L('ร้านปิดรับงานชั่วคราว','Temporarily not taking jobs')}${t.vacation.note?' — '+esc(t.vacation.note):''}</p>`:''}
<div class="sp-cta">${signInCta(path,'ขอราคา หรือแชตกับร้าน','Get a quote or chat')}<a class="btn soft" href="#services">${L('ดูบริการและราคา','Services & prices')}</a></div>
</div></header>
<div class="wrap sp">
${pics[0]?`<img class="sp-cover" src="${esc(imgUrl(api,pics[0]))}" alt="${esc(name)} — ${esc('รูปร้าน')}" fetchpriority="high" decoding="async">`:''}
${t.about?card(L('เกี่ยวกับร้าน','About the shop'),`<p>${esc(t.about)}</p>${(t.brands2||[]).length?`<p class="sp-note">${L('ยี่ห้อที่ถนัด','Brands')}: ${esc(t.brands2.join(', '))}</p>`:''}`):''}
${card(L('บริการและราคาเริ่มต้น','Services and starting prices'),gigs.length?`<ul class="sp-list">${gigs.map(g=>gigRow(api,g,false)).join('')}</ul>`:`<p class="sp-note">${L('ร้านยังไม่ได้ลงบริการ — ขอราคาตามอาการรถได้เลย','No services listed yet — ask for a quote for your car')}</p>`,'services')}
${facts.length?card(L('ทีมงาน Cendon ตรวจอะไรแล้ว','What the Cendon team checked'),`<ul class="sp-facts">${facts.map(([th,en])=>`<li>${ICONS.check}<span>${L(esc(th),esc(en))}</span></li>`).join('')}</ul><p class="sp-note">${L('การตรวจบอกว่าร้านมีตัวตนจริงและทีมงานดูอะไรไปแล้ว ไม่ได้รับประกันผลงานทุกครั้ง มีปัญหาแจ้งทีมงานได้ในใบงาน','These checks show the shop is real and what staff reviewed — not a guarantee of every job. Report problems from the job.')}</p>`):''}
${week?card(L('เวลาทำการ','Opening hours'),`<table class="sp-week"><tbody>${week.map((w,i)=>`<tr><td>${L(DAYS[i][0],DAYS[i][1])}</td><td>${w&&w.on&&HHMM.test(w.open)&&HHMM.test(w.close)?`${esc(w.open)}–${esc(w.close)}`:L('ปิด','Closed')}</td></tr>`).join('')}</tbody></table>`):''}
${pics.length>1?card(L('รูปร้านและผลงาน','Shop and work photos'),`<div class="sp-gal">${pics.slice(1).map((p,i)=>`<img src="${esc(imgUrl(api,p))}" alt="${esc(name)} — ${esc('ผลงาน')} ${i+1}" loading="lazy" decoding="async">`).join('')}</div>`):''}
${cats.length?`<p class="sp-note">${L('หาร้านอื่นในหมวดเดียวกัน','More shops in')}: ${cats.map(c=>`<a href="/category/${c.k}">${L(esc(c.th),esc(c.en))}</a>`).join(' · ')}</p>`:''}
</div>`;
  const title=clip(`${name} — ${main?main.th:'ร้านช่างรถยนต์'}${t.area?' '+t.area:''}`,60)+' | Cendon';
  const desc=clip(`${name} ${main?main.th:'ร้านช่างรถยนต์'}${t.area?' ย่าน'+t.area:''}${r?' '+r:''} ที่ผ่านการตรวจโดยทีมงาน Cendon${t.about?' — '+t.about:''} · ดูบริการ ราคาเริ่มต้น และขอราคาออนไลน์`,158);
  const ld=[{'@type':'AutoRepair','@id':origin+path+'#shop',name,url:origin+path,description:clip(t.about||desc,300),
      ...(pics.length||t.avatar?{image:[t.avatar,...pics].filter(Boolean).slice(0,5).map(p=>imgUrl(api,p))}:{}),
      address:{'@type':'PostalAddress',...(t.area?{addressLocality:t.area}:{}),addressCountry:'TH'},...(t.area?{areaServed:t.area}:{}),
      ...(t.reviewCount>0?{aggregateRating:{'@type':'AggregateRating',ratingValue:Number(t.rating).toFixed(1),reviewCount:t.reviewCount,bestRating:5,worstRating:1}}:{}),
      ...(week?{openingHoursSpecification:week.map((w,i)=>w&&w.on&&HHMM.test(w.open)&&HHMM.test(w.close)?{'@type':'OpeningHoursSpecification',dayOfWeek:'https://schema.org/'+DAYS[i][1],opens:w.open,closes:w.close}:null).filter(Boolean)}:{}),
      ...(gigs.length?{makesOffer:gigs.map(g=>({'@type':'Offer',url:origin+'/service/'+g.id,...(g.price?{price:String(g.price),priceCurrency:'THB'}:{}),itemOffered:{'@type':'Service',name:g.title}}))}:{}),
      ...(t.from>0?{priceRange:`฿${money(t.from)}+`}:{})},
    crumbLd(origin,crumbs)];
  return {title,titleEn:clip(`${name} — ${main?main.en:'Car repair'}${t.area?' in '+t.area:''}`,60)+' | Cendon',desc,path,body,ld,image:pics[0]||t.avatar?imgUrl(api,pics[0]||t.avatar):null};
}

/* ── หน้าบริการ ── */
function servicePage(D,g,origin){
  const t=g.tech,name=shopName(t),api=D.api,path='/service/'+encodeURIComponent(g.id),cat=CATS.find(c=>gigIn(g,c.k))||shopCats(t)[0];
  const pics=(g.photos||[]).slice(0,9),crumbs=[['/about','Cendon'],...(cat?[['/category/'+cat.k,cat.th]]:[]),['/tech/'+encodeURIComponent(t.id),name],[path,g.title]];
  const others=D.gigs.filter(x=>x.id!==g.id&&cat&&gigIn(x,cat.k)).slice(0,6);
  const body=`<header class="doc-head sp-head"><div class="wrap">
${crumbHtml(crumbs.map(([h,n],i)=>[h,i===0?'Cendon':esc(n)]))}
<h1>${esc(g.title)}</h1>
<p class="lead">${g.price?`${L('ราคาเริ่ม','From')} <b>฿${money(g.price)}</b> · `:''}${L('โดย','by')} <a href="/tech/${encodeURIComponent(t.id)}">${esc(name)}</a>${t.area?' · '+esc(t.area):''}</p>
<div class="sp-cta">${signInCta(path,'จองบริการนี้','Book this service')}<a class="btn soft" href="/tech/${encodeURIComponent(t.id)}">${L('ดูหน้าร้าน','View the shop')}</a></div>
</div></header>
<div class="wrap sp">
${pics[0]?`<img class="sp-cover" src="${esc(imgUrl(api,pics[0]))}" alt="${esc(g.title)}" fetchpriority="high" decoding="async">`:''}
${g.body?card(L('รายละเอียด','Details'),`<p>${esc(g.body).replace(/\n/g,'<br>')}</p>${(g.brands||[]).length?`<p class="sp-note">${L('ยี่ห้อรถ','Car brands')}: ${esc(g.brands.join(', '))}</p>`:''}`):''}
${pics.length>1?card(L('รูปเพิ่มเติม','More photos'),`<div class="sp-gal">${pics.slice(1).map((p,i)=>`<img src="${esc(imgUrl(api,p))}" alt="${esc(g.title)} ${i+2}" loading="lazy" decoding="async">`).join('')}</div>`):''}
${card(L('ร้านที่ให้บริการ','The shop'),`<ul class="sp-list">${shopRow(api,t)}</ul><p class="sp-note">${L('ราคาเริ่มต้นตั้งโดยร้าน ราคาจริงขึ้นกับสภาพรถ — ร้านส่งใบเสนอราคาในแอปก่อนเริ่มงาน','Starting prices are set by the shop; the real price depends on your car — the shop sends a quote in the app before starting')}</p>`)}
${others.length?card(L('บริการอื่นในหมวดนี้','More services in this category'),`<ul class="sp-list">${others.map(x=>gigRow(api,x,true)).join('')}</ul>`):''}
</div>`;
  const title=clip(`${g.title}${g.price?' เริ่ม ฿'+money(g.price):''} — ${name}`,60)+' | Cendon';
  const desc=clip(`${g.title}${g.price?' ราคาเริ่ม ฿'+money(g.price):''} โดย ${name}${t.area?' ย่าน'+t.area:''} ร้านที่ผ่านการตรวจโดยทีมงาน Cendon${g.body?' — '+g.body:''} · จองหรือขอราคาออนไลน์`,158);
  const ld=[{'@type':'Service',name:g.title,url:origin+path,description:clip(g.body||desc,300),...(pics.length?{image:pics.slice(0,5).map(p=>imgUrl(api,p))}:{}),
      ...(cat?{category:cat.th}:{}),...(t.area?{areaServed:t.area}:{}),
      provider:{'@type':'AutoRepair','@id':origin+'/tech/'+encodeURIComponent(t.id)+'#shop',name,url:origin+'/tech/'+encodeURIComponent(t.id)},
      ...(g.price?{offers:{'@type':'Offer',price:String(g.price),priceCurrency:'THB',url:origin+path}}:{})},crumbLd(origin,crumbs)];
  return {title,titleEn:clip(`${g.title}${g.price?' from ฿'+money(g.price):''} — ${name}`,60)+' | Cendon',desc,path,body,ld,image:pics[0]?imgUrl(api,pics[0]):null};
}

/* ── หน้าหมวดช่าง ── ร้านที่มีหลักฐานงานซ่อม/รีวิวมากขึ้นก่อน (ไม่มีอันดับที่ซื้อได้ในหน้านี้) */
function categoryPage(D,c,origin){
  const shops=D.techs.filter(t=>shopIn(t,c.k)).sort((a,b)=>(b.proven||0)-(a.proven||0)||(b.reviewCount||0)-(a.reviewCount||0)||(b.rating||0)-(a.rating||0)||shopName(a).localeCompare(shopName(b),'th'));
  const gigs=D.gigs.filter(g=>gigIn(g,c.k)).slice(0,12),api=D.api,path='/category/'+c.k,crumbs=[['/about','Cendon'],[path,c.th]];
  const areas=[...new Set(shops.map(t=>t.area).filter(Boolean))].slice(0,12);
  const body=`<header class="doc-head sp-head"><div class="wrap">
${crumbHtml(crumbs.map(([h,n],i)=>[h,i===0?'Cendon':esc(n)]))}
<div class="eyebrow">${L('หาช่าง','Find a mechanic')}</div>
<h1>${L(esc(c.th)+'ที่ผ่านการตรวจ',esc(c.en))}</h1>
<p class="lead">${L(esc(c.intro[0]),esc(c.intro[1]))}</p>
<div class="sp-cta">${signInCta(path,'ขอราคาหลายร้านพร้อมกัน','Get quotes from several shops')}</div>
</div></header>
<div class="wrap sp">
${card(L(`ร้านในหมวดนี้ (${shops.length})`,`Shops (${shops.length})`),shops.length?`<ul class="sp-list">${shops.map(t=>shopRow(api,t)).join('')}</ul>${areas.length?`<p class="sp-note">${L('พื้นที่','Areas')}: ${areas.map(esc).join(' · ')}</p>`:''}`:`<p class="sp-note">${L('ยังไม่มีร้านในหมวดนี้ — กำลังเพิ่มร้านที่ผ่านการตรวจ','No shops here yet — checked shops are being added')}</p>`)}
${gigs.length?card(L('บริการพร้อมราคาเริ่มต้น','Services with starting prices'),`<ul class="sp-list">${gigs.map(g=>gigRow(api,g,true)).join('')}</ul>`):''}
${card(L('ร้านบน Cendon ผ่านอะไรมาบ้าง','How shops on Cendon are checked'),`<p>${L('ทุกร้านส่งใบสมัคร ทีมงานตรวจตัวตน เบอร์โทร สถานที่ และทักษะตามหมวดก่อนเปิดร้าน หน้าร้านบอกตามจริงว่าตรวจอะไรไปแล้ว · ลูกค้าขอราคาได้หลายร้าน เทียบแล้วเลือกเอง ใบเสนอราคาอยู่ในแอปก่อนเริ่มงาน','Every shop applies first; staff check identity, phone, location and skills before it opens. Each shop page states exactly what was checked. Ask several shops, compare, then choose — the quote is in the app before work starts.')}</p><p class="sp-note"><a href="/about">${L('Cendon คืออะไร','What is Cendon?')}</a> · <a href="/help">${L('วิธีขอราคาและจ้างช่าง','How quotes and jobs work')}</a></p>`)}
<p class="sp-note">${L('หมวดอื่น','Other categories')}: ${CATS.filter(x=>x.k!==c.k).map(x=>`<a href="/category/${x.k}">${L(esc(x.th),esc(x.en))}</a>`).join(' · ')}</p>
</div>`;
  const title=clip(`${c.th}ที่ผ่านการตรวจ — ขอราคาหลายร้าน เทียบก่อนจ้าง`,60)+' | Cendon';
  const desc=clip(`${c.th}${shops.length?` ${shops.length} ร้าน`:''}ที่ผ่านการตรวจโดยทีมงาน Cendon${areas.length?' ย่าน'+areas.slice(0,4).join(' '):''} ดูบริการ ราคาเริ่มต้น คะแนนรีวิว แล้วขอราคาหลายร้านพร้อมกัน — ${c.intro[0]}`,158);
  const ld=[{'@type':'CollectionPage',name:c.th,url:origin+path,description:desc,
      mainEntity:{'@type':'ItemList',numberOfItems:shops.length,itemListElement:shops.slice(0,50).map((t,i)=>({'@type':'ListItem',position:i+1,url:origin+'/tech/'+encodeURIComponent(t.id),name:shopName(t)}))}},crumbLd(origin,crumbs)];
  return {title,titleEn:`${c.en} — compare quotes | Cendon`,desc,path,body,ld,image:null,index:shops.length>0};
}

/* ใส่ชิ้นส่วนลงโครงหน้า · ป้องกันค่าที่มาจากร้านด้วย esc ทุกจุด (JSON-LD กัน </script> ด้วย \u003c) */
export function fill(p,origin,site=SITE_DEFAULT){
  const ld=`<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':p.ld}).replace(/</g,'\\u003c')}</script>\n`;
  /* เครื่องนี้ล็อกอินอยู่แต่ยังไม่มีคุกกี้ (ล็อกอินก่อนรุ่นนี้) → ตั้งคุกกี้แล้วโหลดใหม่ครั้งเดียว ได้หน้าแอปเลย */
  const hop=`<script>try{if(localStorage.getItem("cendon_signed")==="1"&&!/(^|; )cendon_signed=1/.test(document.cookie)&&!sessionStorage.getItem("cendon_hop")){sessionStorage.setItem("cendon_hop","1");document.cookie="cendon_signed=1; path=/; max-age=31536000; samesite=lax"+(location.protocol==="https:"?"; secure":"");location.reload()}}catch(e){}</script>\n`;
  let h=SHELL.split(site+'/__SSR_PATH__').join(origin+p.path)
    .split('__SSR_TITLE_EN__').join(esc(p.titleEn||p.title)).split('__SSR_TITLE__').join(esc(p.title))
    .split('__SSR_DESC__').join(esc(p.desc)).replace('<!--SSR_LD-->',hop+ld).replace('<!--SSR_BODY-->',p.body);
  if(p.image)h=h.replace(/(<meta property="og:image" content=")[^"]*(")/,(m,a,b)=>a+esc(p.image)+b).replace(/<meta property="og:image:width" content="\d+">\n?/,'').replace(/<meta property="og:image:height" content="\d+">\n?/,'');
  if(p.index===false)h=h.replace(/<link rel="canonical"[^>]*>\n?/,'').replace(/<meta name="robots" content="[^"]*">/,'<meta name="robots" content="noindex">');
  return h;
}

/* ── หน้าแอปเดิม (คนที่ล็อกอิน · ที่อยู่ลึกกว่า เช่น /tech/<id>/quote) ── เปลี่ยนแค่การ์ดแชร์ ไม่ให้ขึ้นผลค้นหา */
export function inject(html,info,url){
  const set=(re,val)=>{html=html.replace(re,(m,a,b)=>a+esc(val)+b)};
  set(/(<title>)[^<]*(<\/title>)/,info.title);
  set(/(<meta name="description" content=")[^"]*(")/,info.desc);
  set(/(<meta property="og:title" content=")[^"]*(")/,info.title);
  set(/(<meta property="og:description" content=")[^"]*(")/,info.desc);
  if(info.image){
    set(/(<meta property="og:image" content=")[^"]*(")/,info.image);
    html=html.replace(/<meta property="og:image:width" content="\d+">/,'').replace(/<meta property="og:image:height" content="\d+">/,'');
  }
  html=html.replace(/(<meta property="og:site_name" content="Cendon">)/,`$1<meta property="og:url" content="${esc(url)}">`);
  return html;
}

const SEC={'X-Frame-Options':'SAMEORIGIN','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin',
  'Content-Security-Policy':"frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'"};
const signedIn=req=>/(?:^|;\s*)cendon_signed=1(?:;|$)/.test(req.headers.get('cookie')||'');

/* ตัวจัดการของ Pages Function: kind = 'tech' | 'service' | 'category' */
export async function handle(ctx,kind){
  const {request,env,params}=ctx,url=new URL(request.url);
  const seg=Array.isArray(params&&params.path)?params.path:[params&&params.path].filter(Boolean);
  let id='';try{id=decodeURIComponent(seg[0]||'')}catch(e){id=''}
  /* /tech เฉย ๆ (ไม่มีรหัส) = ไฟล์เดิมของที่อยู่นั้น (tech.html ส่งต่อลิงก์รุ่นเก่า) */
  if(!seg.length&&typeof ctx.next==='function')return ctx.next();
  const app=async info=>{
    const shell=await env.ASSETS.fetch(new Request(new URL('/',url)));
    const headers=new Headers(shell.headers);for(const [k,v] of Object.entries(SEC))headers.set(k,v);
    headers.set('X-Robots-Tag','noindex');headers.set('Vary','Cookie');
    if(!shell.ok||!info)return new Response(shell.body,{status:shell.status,headers});
    headers.delete('content-length');headers.delete('etag');headers.set('Cache-Control','private, max-age=0, must-revalidate');
    return new Response(inject(await shell.text(),info,url.origin+url.pathname),{status:200,headers});
  };
  if(!/^[\w-]{1,64}$/.test(id))return app(null);
  let D=null;try{D=await loadData(env)}catch(e){D=null}
  if(!D)return app(null);
  let p=null;
  if(kind==='tech'){const t=D.techs.find(x=>x.id===id);if(t)p=shopPage(D,t,url.origin)}
  else if(kind==='service'){const g=D.gigs.find(x=>String(x.id)===id);if(g)p=servicePage(D,g,url.origin)}
  else if(kind==='category'){const c=catOf(id);if(c)p=categoryPage(D,c,url.origin);else if(!signedIn(request))return app(null)}
  /* ?preview=1 = เจ้าของร้านดูหน้าแบบที่ Google เห็น ทั้งที่ล็อกอินอยู่ (Studio › หน้าร้านบน Google) — ไม่ให้เก็บซ้ำ ไม่เก็บแคช */
  const preview=url.searchParams.get('preview')==='1'&&seg.length===1&&!!p;
  if(!preview&&(signedIn(request)||seg.length>1))return app(p&&{title:p.title,desc:p.desc,image:p.image});
  if(!p){
    /* ร้าน/บริการที่ไม่มีอยู่ (หรือยังไม่ผ่านการตรวจ) = 404 จริง ไม่ใช่หน้าแอป 200 */
    const nf=await env.ASSETS.fetch(new Request(new URL('/404',url)));   /* Pages ส่ง /404.html → 308 ไป /404 จึงขอชื่อสะอาดตรง ๆ */
    const headers=new Headers(nf.headers);for(const [k,v] of Object.entries(SEC))headers.set(k,v);headers.set('Vary','Cookie');
    return new Response(nf.body,{status:404,headers});
  }
  const headers=new Headers({'Content-Type':'text/html; charset=utf-8','Cache-Control':preview?'private, no-store':'public, max-age=0, must-revalidate','Vary':'Cookie',...SEC});
  if(p.index===false||preview)headers.set('X-Robots-Tag','noindex');
  return new Response(fill(p,url.origin),{status:200,headers});
}

/* ── แผนผังเว็บสด: ร้าน บริการ และหมวดที่มีร้าน ── */
export async function sitemap(ctx){
  const {env,request}=ctx,origin=new URL(request.url).origin;
  let D;try{D=await loadData(env)}catch(e){return new Response('backend unavailable',{status:503,headers:{'Retry-After':'600'}})}
  const day=ms=>{const d=new Date(Number(ms));return isNaN(d)?'':`<lastmod>${d.toISOString().slice(0,10)}</lastmod>`};
  const urls=[...CATS.filter(c=>D.techs.some(t=>shopIn(t,c.k))).map(c=>`<url><loc>${origin}/category/${c.k}</loc></url>`),
    ...D.techs.map(t=>`<url><loc>${origin}/tech/${encodeURIComponent(t.id)}</loc></url>`),
    ...D.gigs.map(g=>`<url><loc>${origin}/service/${encodeURIComponent(g.id)}</loc>${day(g.createdAt)}</url>`)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
    {headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=3600'}});
}
