/* หน้าแรกของเว็บ (/about): เล่าเรื่องด้วยการเลื่อน — ภาพเคลื่อนไหวทั้งหมดผูกกับการเลื่อน (CSS scroll-driven)
   หน้าจอในโทรศัพท์เป็น "ภาพตัวอย่าง" (มีป้ายบอก) ไม่มีตัวเลขสถิติหรือรีวิวปลอม
   ทุกคำสัญญาในหน้านี้ต้องเป็นสิ่งที่ระบบทำจริง — ดูหน้า /privacy และ /terms ประกอบ */
import {L,P,I,MARK,SITE,ORG} from '../layout.mjs';

const LANGS=['ไทย','English','中文','日本語','한국어','Bahasa Indonesia','Tiếng Việt','Bahasa Melayu','Deutsch','Français','Español','Português'];
const top=(th,en)=>`<div class="top">${MARK.replace('class="mark"','class="mk"')}${L(th,en)}</div>`;
const wave=n=>`<div class="wave">${Array.from({length:n},(_,i)=>`<i style="animation-delay:-${(i*0.13%1.6).toFixed(2)}s"></i>`).join('')}</div>`;

/* หน้าจอตัวอย่างทั้ง 4 ขั้น — ใช้ทั้งโทรศัพท์ค้างบนจอใหญ่ และโทรศัพท์เล็กในแต่ละขั้นบนมือถือ */
const SCREENS=[
  `${top('Cendon AI','Cendon AI')}
<div class="bub me">${L('เบรกแล้วมีเสียงเอี๊ยด ๆ ตอนเช้า','My brakes squeal in the morning')}</div>
<div class="bub ai"><span class="t">${L('น่าจะเป็นความชื้นบนจานเบรก หรือผ้าเบรกใกล้หมด','Likely morning moisture on the discs, or worn pads')}</span>${L('ถ้าเสียงหายหลังเบรกไป 2–3 ครั้ง มักเป็นความชื้น ถ้ายังดังตลอดวัน ให้ตรวจความหนาผ้าเบรก','If it stops after a few stops, it’s usually moisture. If it squeals all day, have the pad thickness checked')}</div>
<div><span class="pill w">${I.clock}${L('ไม่ต้องรีบ ตรวจภายในสัปดาห์นี้','No rush — check this week')}</span></div>`,

  `${top('ฟังเสียงรถ','Listen to the car')}
<div class="bub me" style="width:86%">${wave(22)}<small style="opacity:.7">${L('เสียงเครื่องยนต์ · 8 วินาที','Engine sound · 8 s')}</small></div>
<div class="bub ai"><span class="t">${L('ฟังคล้ายสายพานหน้าเครื่องลื่น','Sounds like a slipping drive belt')}</span>${L('เสียงแหลมตอนสตาร์ทเครื่องเย็น มักมาจากสายพานหย่อนหรือเริ่มแข็ง ไม่อันตรายทันที แต่ไม่ควรปล่อยนาน','A squeal on a cold start usually means a loose or hardened belt. Not urgent, but don’t leave it long')}</div>
<div><span class="pill o">${I.mic}${L('วิเคราะห์จากเสียงที่คุณอัด','From the sound you recorded')}</span></div>`,

  `${top('เช็กใบเสนอราคา','Check a quote')}
<div class="qline"><div>${L('เปลี่ยนผ้าเบรกหน้า','Front brake pads')}<br><small>฿1,800</small></div><span class="pill">${I.check}${L('สมเหตุสมผล','Fair')}</span></div>
<div class="qline"><div>${L('เจียรจานเบรก','Skim brake discs')}<br><small>฿1,200</small></div><span class="pill w">${I.help}${L('ถามว่าจำเป็นไหม','Ask if needed')}</span></div>
<div class="qline"><div>${L('ล้างระบบเบรก','Brake system flush')}<br><small>฿900</small></div><span class="pill o">${I.alert}${L('มักไม่จำเป็น','Often unnecessary')}</span></div>
<div class="bub ai">${L('ลองถามอู่ว่าจานเบรกบางกว่าค่ากำหนดหรือยัง ถ้ายัง ไม่ต้องเจียร','Ask whether the discs are below minimum thickness — if not, no skim needed')}</div>`,

  `${top('ช่างใกล้คุณ','Mechanics near you')}
<div class="shop"><span class="av">${I.wrench}</span><div><b>${L('ช่างเบรกและช่วงล่าง','Brakes & suspension')}</b><small>${L('2.1 กม. · ยืนยันตัวตนแล้ว','2.1 km · ID verified')}</small></div><span class="pr">฿1,650</span></div>
<div class="shop"><span class="av">${I.car}</span><div><b>${L('ช่างนอกสถานที่','Mobile mechanic')}</b><small>${L('มาหาคุณ · ยืนยันตัวตนแล้ว','Comes to you · ID verified')}</small></div><span class="pr">฿1,900</span></div>
<div class="shop"><span class="av">${I.store}</span><div><b>${L('อู่ซ่อมทั่วไป','General garage')}</b><small>${L('3.4 กม.','3.4 km')}</small></div><span class="pr">฿1,700</span></div>
<div class="bub ai">${L('ยืนยันราคาแล้ว ช่างถึงจะเห็นเบอร์และที่อยู่ของคุณ','Mechanics only see your phone and address after you accept a price')}</div>`,
];

const STEPS=[
  ['01',['บอกอาการ','Describe it'],['เล่าเหมือนเล่าให้เพื่อนที่เป็นช่างฟัง','Say it like you’d tell a mechanic friend'],
    ['ไม่ต้องรู้ศัพท์ช่าง พิมพ์หรือพูดสิ่งที่เจอ AI ถามต่อเท่าที่จำเป็น แล้วบอกว่าน่าจะเป็นอะไร เร่งด่วนแค่ไหน','No jargon needed. Type or say what you notice; the AI asks only what it must, then tells you what it likely is and how urgent']],
  ['02',['ส่งรูปหรือเสียง','Show or play it'],['ถ่ายรูป หรืออัดเสียงให้ AI ช่วยดู','Snap a photo or record the sound'],
    ['ไฟเตือนบนหน้าปัด รอยรั่วใต้รถ หรือเสียงแปลกตอนสตาร์ท — บางอย่างเห็นหรือได้ยินแล้วเข้าใจง่ายกว่าเล่า','A dashboard light, a leak under the car, a strange start-up noise — some things are easier shown than described']],
  ['03',['เช็กใบเสนอราคา','Check the quote'],['รู้ก่อนจ่าย ว่ารายการไหนจำเป็น','Know what’s needed before you pay'],
    ['ถ่ายใบเสนอราคาจากอู่ AI แยกให้ว่ารายการไหนสมเหตุสมผล รายการไหนควรถามก่อน พร้อมคำถามที่ควรถามช่าง','Photograph a garage quote. The AI flags what looks fair, what to question, and the questions worth asking']],
  ['04',['หาช่างที่ไว้ใจได้','Find someone you trust'],['ช่างที่ผ่านการตรวจ ใกล้คุณ','Checked mechanics, nearby'],
    ['ขอราคาร้านเดียวหรือหลายร้านแล้วเทียบ เรียกช่างด่วน หรือประกาศให้ช่างแถวนั้นเสนอราคา ทุกร้านผ่านการตรวจจากทีมงานก่อน','Ask one shop or several and compare, call someone urgently, or post a job for nearby mechanics — every shop is checked by our team first']],
];

const TRUST=[
  ['usercheck',['ช่างผ่านการตรวจ','Checked mechanics'],['ทีมงานตรวจทุกร้านและยืนยันตัวตนจริง ป้ายบอกเฉพาะสิ่งที่ตรวจแล้ว','Staff review every shop and verify identity. Badges show only what was checked']],
  ['receipt',['ราคาชัดก่อนเริ่ม','Price agreed first'],['ราคาที่ยืนยันแล้วแก้ย้อนหลังไม่ได้ งานเพิ่มต้องให้คุณกดยอมรับก่อน','An accepted price can’t change. Extra work needs your OK first']],
  ['eyeoff',['เบอร์ยังไม่เปิด','Your number stays private'],['ช่างเห็นเบอร์และที่อยู่ของคุณ หลังคุณยืนยันราคาเท่านั้น','Mechanics see your phone and address only after you accept']],
  ['key',['รหัสเริ่มงาน','Start code'],['ช่างใส่รหัสจากคุณก่อนเริ่มงาน และถ่ายรูปก่อน/หลังซ่อม','The mechanic enters your code to start, with before and after photos']],
  ['flag',['มีปัญหา มีคนช่วย','Help if it goes wrong'],['แจ้งปัญหาในใบงาน ทีมงานดูหลักฐานแล้วตัดสินอย่างเป็นธรรม','Report it in the job — staff review the evidence and decide fairly']],
];

const PROMISES=[
  ['lock',['AI ไม่รู้ว่าคุณเป็นใคร','The AI doesn’t know who you are'],['ไม่ส่งอีเมล เบอร์ หรือที่อยู่ของคุณให้ผู้ให้บริการ AI','Your email, phone and address are never sent to AI providers']],
  ['phoneapp',['แชตอยู่ในเครื่องคุณ','Chats stay on your device'],['ประวัติการคุยกับ AI เก็บไว้ในเครื่องที่คุณใช้','Your AI chat history is kept on the device you use']],
  ['eyeoff',['ไม่มีโฆษณา<br>ไม่มีตัวติดตาม','No ads,<br>no trackers'],['ไม่ขายข้อมูล ไม่มีคุกกี้โฆษณาหรือตัววิเคราะห์','We don’t sell data, and run no ad cookies or analytics']],
  ['download',['ดาวน์โหลด หรือลบได้เอง','Download or delete, yourself'],['ทุกอย่างในบัญชีโหลดออกได้ ลบถาวรได้ในไม่กี่วินาที','Export everything, or delete it for good in seconds']],
];

const body=`
<section class="hero" aria-labelledby="h-hero">
  <div class="hero-bg" aria-hidden="true"><i></i><i></i><i></i></div>
  <div class="hero-in">
    <div class="eyebrow">${L('ผู้ช่วยดูแลรถ','Your car companion')}</div>
    <h1 id="h-hero">${L('ดูแลรถ<br><em>แบบสบายใจ</em>','Car care,<br><em>minus the worry</em>')}</h1>
    ${P('ถามอาการรถได้เหมือนคุยกับเพื่อนที่เป็นช่าง ส่งรูปหรือเสียงให้ AI ช่วยดู เช็กใบเสนอราคา แล้วหาช่างที่ผ่านการตรวจใกล้คุณ','Ask about your car like you’d ask a mechanic friend. Show it a photo or a sound, check a quote, then find a checked mechanic nearby.','lead')}
    <div class="cta"><a class="btn ink" href="/">${I.open}${L('เริ่มใช้ฟรี','Start free')}</a><a class="btn soft" href="#story">${L('ดูว่าทำงานอย่างไร','See how it works')}</a></div>
  </div>
  <div class="scrollhint" aria-hidden="true"><i></i>${L('เลื่อนลง','Scroll')}</div>
</section>

<section class="band" id="story" aria-labelledby="h-story"><div class="wrap">
  <div class="band-h rv"><h2 id="h-story">${L('จากอาการแปลก ๆ<br>ถึงช่างที่ไว้ใจได้','From a strange noise<br>to someone you trust')}</h2>${P('สี่ขั้นที่ Cendon อยู่ข้างคุณ ตั้งแต่ยังไม่แน่ใจว่าเป็นอะไร จนรถกลับมาปกติ','Four steps where Cendon stays beside you — from “what is that?” to back on the road.')}</div>
  <div class="story" data-s="1">
    <div class="story-stage" aria-hidden="true"><div>
      <div class="phone"><div class="screen-wrap">${SCREENS.map((s,i)=>`<div class="screen s${i+1}">${s}</div>`).join('')}</div></div>
      <span class="cap">${L('ภาพตัวอย่างหน้าจอ','Illustrative screens')}</span>
    </div></div>
    <div class="story-steps">${STEPS.map(([k,name,h,p],i)=>`
      <div class="step" data-step="${i+1}"><div class="txt">
        <div class="k">${k} · ${L(...name)}</div>
        <h3>${L(...h)}</h3>
        ${P(...p)}
      </div>
      <div class="mini" aria-hidden="true"><div class="phone"><div class="screen-wrap"><div class="screen s${i+1}">${SCREENS[i]}</div></div></div></div></div>`).join('')}
    </div>
  </div>
</div></section>

<section class="band" aria-labelledby="h-trust" style="background:var(--paper);border-block:1px solid var(--line)"><div class="wrap">
  <div class="band-h c rv"><h2 id="h-trust">${L('ไว้ใจได้ ทุกขั้นตอน','Trust, built into every step')}</h2>${P('ทุกขั้นของการจ้างช่างมีตัวช่วยกันพลาด ทั้งของคุณและของช่าง','Each step of hiring a mechanic has a safeguard — for you and for them.')}</div>
  <div class="trust"><span class="line" aria-hidden="true"></span>${TRUST.map(([ic,h,p])=>`
    <div class="tstep"><div class="dot">${I[ic]}</div><div><h3>${L(...h)}</h3>${P(...p)}</div></div>`).join('')}
  </div>
</div></section>

<section class="band" aria-labelledby="h-data"><div class="wrap">
  <div class="band-h rv"><h2 id="h-data">${L('ข้อมูลของคุณ<br>เป็นของคุณ','Your data<br>stays yours')}</h2>${P('เราเก็บเท่าที่ต้องใช้ และบอกตรง ๆ ว่าส่งอะไรไปที่ไหน','We keep only what we need, and say plainly what goes where.')}</div>
  <div class="cards">${PROMISES.map(([ic,h,p])=>`
    <div class="card rv"><div class="ic">${I[ic]}</div><h3>${L(...h)}</h3>${P(...p)}</div>`).join('')}
  </div>
  <p class="rv" style="margin-top:28px"><a class="btn soft" href="/privacy">${I.shield}${L('อ่านนโยบายความเป็นส่วนตัว','Read the privacy policy')}</a></p>
</div></section>

<section class="band" aria-labelledby="h-line" style="padding-top:40px"><div class="wrap split">
  <div class="rv">
    <div class="band-h" style="margin-bottom:24px"><h2 id="h-line">${L('อัปเดตงานซ่อม<br>ส่งถึง LINE','Every update,<br>right in LINE')}</h2>${P('ช่างตอบราคา ยืนยันนัด เริ่มงาน หรือซ่อมเสร็จ — แจ้งในแชต LINE ทันที โดยไม่มีเบอร์หรือที่อยู่ในข้อความ และถามคำถามรถกับ AI ใน LINE ได้ด้วย','Quotes, confirmed appointments, work started, job done — straight to LINE, with no phone or address in the message. You can ask the AI car questions there too.')}</div>
    ${`<ol>${[
      ['เพิ่มเพื่อน Cendon ใน LINE','Add Cendon on LINE'],
      ['กดเมนู “เชื่อมบัญชี” ในแชต','Tap “Link account” in the chat menu'],
      ['เปิดลิงก์ที่บอทส่งมา ล็อกอิน แล้วกดเชื่อมต่อ','Open the bot’s link, sign in and confirm'],
    ].map(([th,en])=>`<li>${L(th,en)}</li>`).join('')}</ol>`}
    <p><a class="btn soft sm" href="/help#line">${I.help}${L('วิธีเชื่อมแบบละเอียด','Step-by-step guide')}</a></p>
  </div>
  <div>
    <div class="linecard" aria-hidden="true">
      <div class="hd"><i>${MARK}</i>Cendon</div>
      <div class="bd">
        <div class="msg"><small>CENDON</small><b>${L('เชื่อมบัญชีสำเร็จ','Account linked')}</b>${L('ต่อจากนี้จะแจ้งความคืบหน้างานซ่อมที่นี่','Job updates will arrive here from now on')}</div>
        <div class="msg"><small>${L('ใบงาน','JOB')}</small><b>${L('ช่างยืนยันนัดแล้ว','Appointment confirmed')}</b>${L('พรุ่งนี้ 10:00 · เปลี่ยนผ้าเบรกหน้า','Tomorrow 10:00 · front brake pads')}<span class="go">${L('เปิดใบงาน','Open job')}</span></div>
      </div>
    </div>
    <span class="cap">${L('ภาพตัวอย่างข้อความ','Illustrative messages')}</span>
  </div>
</div></section>

<section class="band" aria-labelledby="h-langs" style="padding-top:40px"><div class="wrap">
  <div class="band-h c rv"><h2 id="h-langs">${L('ใช้ได้ 12 ภาษา','Speaks 12 languages')}</h2>${P('ใช้แอปในภาษาที่คุณถนัด และถาม AI เป็นภาษาไหนก็ได้','Use the app in your language, and ask the AI in whichever you like.')}</div>
</div>
  <div class="langs" aria-hidden="true">
    <div class="row">${[...LANGS,...LANGS].map(l=>`<span>${l}</span>`).join('')}</div>
    <div class="row">${[...LANGS,...LANGS].reverse().map(l=>`<span>${l}</span>`).join('')}</div>
  </div>
  <p class="sr-only">${L(LANGS.join(' · '),LANGS.join(' · '))}</p>
</section>

<section class="final" aria-labelledby="h-final"><div class="wrap rv">
  <h2 id="h-final">${L('รถของคุณ<br>มีคนช่วยดูแลแล้ว','Your car,<br>looked after')}</h2>
  ${P('ใช้ฟรี ไม่มีโฆษณา เริ่มจากถามคำถามแรกได้เลย','Free, with no ads. Start with your first question.')}
  <div class="cta"><a class="btn ink" href="/">${I.open}${L('เปิด Cendon','Open Cendon')}</a><a class="btn soft" href="/help">${I.help}${L('ศูนย์ช่วยเหลือ','Help centre')}</a></div>
</div></section>
`;

/* คำค้นที่คนไทยใช้จริง (ถามอาการรถ ราคาซ่อม ช่างใกล้ฉัน) อยู่ในหัวข้อและคำอธิบาย — ยาวไม่เกินที่ Google แสดง */
const TITLE=['Cendon — ถามอาการรถกับ AI เช็กราคาซ่อม หาช่างใกล้คุณ','Cendon — ask AI about your car, check repair quotes, find mechanics nearby'];
const DESC=['ผู้ช่วยดูแลรถ: ถามอาการรถกับ AI ส่งรูปหรือเสียงเครื่องยนต์ให้ช่วยดู เช็กว่าใบเสนอราคาอู่แพงไปไหม จดประวัติซ่อม และเรียกช่างที่ผ่านการตรวจใกล้คุณ ใช้ฟรี ไม่มีโฆษณา',
  'A car companion: ask AI about symptoms, send a photo or engine sound, check whether a garage quote is fair, keep service records, and call checked mechanics near you. Free, no ads.'];
export default {
  key:'about',path:'/about',file:'about.html',
  title:TITLE,desc:DESC,
  ld:[ORG,
    {'@type':'WebSite','@id':SITE+'/#site',name:'Cendon',url:SITE+'/',inLanguage:['th','en'],publisher:{'@id':ORG['@id']}},
    {'@type':'WebApplication',name:'Cendon',url:SITE+'/',description:DESC[0],applicationCategory:'LifestyleApplication',operatingSystem:'Web browser (Android, iOS, desktop)',
      inLanguage:['th','en'],isAccessibleForFree:true,offers:{'@type':'Offer',price:'0',priceCurrency:'THB'},publisher:{'@id':ORG['@id']}}],
  body,
};
