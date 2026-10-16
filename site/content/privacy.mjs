/* นโยบายความเป็นส่วนตัว — ต้องตรงกับที่ระบบทำจริงเสมอ
   เปลี่ยนวิธีเก็บ/ใช้ข้อมูล หรือเพิ่มผู้ให้บริการภายนอก → แก้ไฟล์นี้ + เลื่อนเวอร์ชัน (ให้ตรงกับ ONBOARDING_VERSIONS ในหลังบ้าน) แล้วรัน node site/build.mjs
   เทสต์ test/site.test.mjs ตรวจว่ามีชื่อผู้ให้บริการครบทุกตัว */
import {L,P,UL,TABLE,NOTE,I,docBody,EMAIL} from '../layout.mjs';

export const VERSION='1.4';
export const EFFECTIVE=['16 ตุลาคม 2569','16 October 2026'];

/* ผู้ให้บริการภายนอกทุกตัวที่ได้รับข้อมูล — ชื่อในคอลัมน์แรกต้องตรงกับรายการใน test/site.test.mjs */
const PROCESSORS=[
  ['Cloudflare',
    ['เว็บและหลังบ้านของแอป ฐานข้อมูล ไฟล์ที่คุณแนบ AI สำรอง (Workers AI) และการช่วยดูรูปอู่ของผู้สมัครช่างเมื่อยินยอม','Hosting the app and its back end, the database, files you attach, backup AI (Workers AI), and helping review applicant workshop photos when they consent'],
    ['ข้อมูลทุกอย่างในบัญชีที่เก็บบนเซิร์ฟเวอร์ ที่อยู่ IP','All account data stored on our servers; IP address']],
  ['Google Firebase Authentication',
    ['ล็อกอินและยืนยันว่าเป็นคุณจริงทุกครั้งที่เรียกใช้ระบบ','Signing in and proving it is you on every request'],
    ['ชื่อ อีเมล รูปโปรไฟล์ รหัสบัญชี','Name, email, profile photo, account ID']],
  ['Google Gemini',
    ['AI หลัก: ตอบคำถาม ดูรูป ฟังเสียง คุยด้วยเสียงสด สรุปข่าว ค้นสเปกรถ','Main AI: answers, photo and sound analysis, live voice conversation, news summaries, car spec research'],
    ['คำถาม ไฟล์แนบ ข้อมูลรถ และบริบทตามหัวข้อ 4 · เสียงสดส่งจากเครื่องคุณถึง Google โดยตรง','Your question, attachments, car details and the context in section 4 · live voice goes from your device straight to Google']],
  ['Groq',
    ['AI สำรองเมื่อ Gemini ใช้ไม่ได้ชั่วคราว','Backup AI when Gemini is temporarily unavailable'],
    ['เหมือน Gemini เฉพาะครั้งที่สำรอง','Same as Gemini, only when used as backup']],
  ['OpenRouter',
    ['AI สำรองลำดับสุดท้าย (ส่งต่อให้ผู้ให้บริการโมเดลที่ OpenRouter เลือก)','Last-resort backup AI (forwards to a model provider chosen by OpenRouter)'],
    ['เหมือน Gemini เฉพาะครั้งที่สำรอง','Same as Gemini, only when used as backup']],
  ['LINE (LY Corporation)',
    ['ล็อกอินด้วย LINE การแจ้งเตือน และคุยกับบอท Cendon','Sign in with LINE, notifications, and chatting with the Cendon bot'],
    ['LINE user ID ชื่อและรูปใน LINE ข้อความแจ้งเตือน ข้อความที่คุณคุยกับบอท','LINE user ID, LINE name and picture, notification text, messages you send the bot']],
  ['Didit',
    ['ยืนยันตัวตนผู้สมัครเป็นช่าง','Identity verification for mechanic applicants'],
    ['รูปบัตรประชาชน ภาพใบหน้า/การตรวจว่าเป็นคนจริง ผลการตรวจ','ID document images, face/liveness check, verification result']],
  ['Resend',
    ['ส่งรหัสยืนยันทางอีเมล (เมื่อเปิดใช้การล็อกอินด้วยอีเมล)','Sending one-time sign-in codes by email (when email sign-in is enabled)'],
    ['อีเมลของคุณ รหัสยืนยัน','Your email address and the code']],
  ['Web Push',
    ['ส่งการแจ้งเตือนถึงเบราว์เซอร์ของคุณ ผ่านบริการของผู้ผลิตเบราว์เซอร์ (เช่น Google Apple Mozilla Microsoft)','Delivering notifications to your browser through its maker’s push service (e.g. Google, Apple, Mozilla, Microsoft)'],
    ['ที่อยู่รับแจ้งเตือนของเบราว์เซอร์ · เนื้อหาถูกเข้ารหัส ผู้ส่งต่ออ่านไม่ได้','Your browser’s push address · contents are encrypted and unreadable in transit']],
  ['Tavily · Brave Search · DuckDuckGo · Bing · Wikipedia',
    ['ค้นเว็บประกอบคำตอบ AI ข่าว และสเปกรถ','Web search for AI answers, news and car specs'],
    ['คำค้นเท่านั้น (ไม่มีชื่อหรือบัญชีของคุณ)','Search terms only (no name or account)']],
  ['NHTSA vPIC',
    ['ถอดรหัสเลขตัวถัง (VIN) เป็นข้อมูลรุ่นรถ — บริการของหน่วยงานรัฐบาลสหรัฐฯ','Decoding a VIN into model details — a US government service'],
    ['เลข VIN เท่านั้น เมื่อคุณกดถอดรหัส','The VIN only, when you ask us to decode it']],
  ['OpenStreetMap',
    ['ภาพแผนที่ และแปลงหมุดที่คุณปักเป็นชื่อถนน/ย่าน (Nominatim)','Map images, and turning a pin you drop into a street/area name (Nominatim)'],
    ['ตำแหน่งบนแผนที่ที่กำลังดู พิกัดหมุด ที่อยู่ IP','Map area viewed, pin coordinates, IP address']],
  ['Open-Meteo',
    ['พยากรณ์อากาศในแอป','Weather in the app'],
    ['พิกัดโดยประมาณ หรือชื่อเมืองที่คุณพิมพ์','Approximate coordinates, or the city name you type']],
  ['Google Fonts · cdnjs · jsDelivr · unpkg',
    ['ฟอนต์และไลบรารีโค้ดที่หน้าเว็บโหลดมาใช้','Fonts and code libraries the pages load'],
    ['ที่อยู่ IP และข้อมูลเบราว์เซอร์ตอนโหลดไฟล์','IP address and browser details when files load']],
];
export const PROCESSOR_NAMES=PROCESSORS.map(p=>p[0]);

const sections=[
  {id:'who',title:['เราคือใคร','Who we are'],body:
    P(`Cendon ให้บริการโดย <b>Car Spire Thailand</b> ซึ่งเป็น “ผู้ควบคุมข้อมูลส่วนบุคคล” ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) สำหรับข้อมูลที่เก็บผ่านแอป เว็บ และบอท LINE ของ Cendon`,
      `Cendon is run by <b>Car Spire Thailand</b>, the data controller under Thailand’s Personal Data Protection Act B.E. 2562 (PDPA) for data collected through the Cendon app, website and LINE bot.`)+
    P(`ติดต่อเรื่องข้อมูลส่วนบุคคลได้ที่ <a href="mailto:${EMAIL}">${EMAIL}</a> นโยบายนี้ใช้คู่กับ<a href="/terms">ข้อกำหนดการใช้งาน</a>`,
      `For anything about your personal data, email <a href="mailto:${EMAIL}">${EMAIL}</a>. This policy sits alongside our <a href="/terms">Terms of Service</a>.`)},

  {id:'collect',title:['ข้อมูลที่เราเก็บ','What we collect'],body:
    P('เราเก็บเท่าที่ต้องใช้ทำงานให้คุณ ส่วนใหญ่คุณเป็นคนใส่เอง และหลายอย่างเลือกได้ว่าจะให้หรือไม่',
      'We keep what we need to do the job for you. Most of it you enter yourself, and much of it is optional.')+
    TABLE([['ประเภท','Type'],['ตัวอย่าง','Examples'],['มาจากไหน','Where it comes from']],[
      [['บัญชี','Account'],['ชื่อ อีเมล รูปโปรไฟล์ รหัสบัญชี','Name, email, profile photo, account ID'],['Google หรือ LINE ตอนล็อกอิน','Google or LINE when you sign in']],
      [['โปรไฟล์ตอนเริ่มใช้','Setup profile'],['ชื่อที่ให้เรียก วันเกิด (เพื่อยืนยันอายุ 18 ปีขึ้นไป) ภาษา หน่วยระยะทาง สกุลเงิน ระดับความรู้เรื่องรถ เวลาและเวอร์ชันข้อกำหนด/นโยบายที่คุณยอมรับ','Preferred name, date of birth (to confirm you are 18+), language, distance unit, currency, car-knowledge level, when and which terms/policy versions you accepted'],['คุณ','You']],
      [['รถและการดูแล','Cars and upkeep'],['ยี่ห้อ รุ่น ปี เลขไมล์ เลขตัวถัง (ถ้าใส่) สมุดรถ (ซ่อม น้ำมัน ทริป — ซิงก์ตามบัญชีให้เห็นทุกเครื่อง) การแจ้งเตือนและปฏิทินค่าใช้จ่าย อุปกรณ์ OBD (ถ้าเชื่อม) · Car Passport ที่คุณเลือกเปิด','Make, model, year, mileage, VIN (if added), logbook (service, fuel, trips — synced to your account so every device sees it), reminders and the cost calendar, OBD device (if paired) · any Car Passport you choose to publish'],['คุณ','You']],
      [['การคุยกับ AI','AI conversations'],['คำถาม รูป เสียง วิดีโอ ที่คุณส่ง · บันทึกความจำสั้น ๆ เรื่องรถของคุณที่ AI จดไว้ใช้ครั้งหน้า','Questions, photos, audio and video you send · short memory notes about your car the AI keeps for next time'],['คุณ','You']],
      [['ตำแหน่ง','Location'],['เฉพาะตอนคุณอนุญาตและใช้ฟีเจอร์ที่ต้องใช้: หาช่างใกล้คุณ ปักหมุดในคำขอราคา/ประกาศหาช่าง สภาพอากาศ ตัวช่วยขับขี่และจอดรถ (สองอย่างหลังคำนวณในเครื่อง) · ช่าง: ตำแหน่งของคุณระหว่างใบงานอยู่ในสถานะ “ช่างกำลังมา” (เก็บแค่จุดล่าสุดจุดเดียว)','Only when you allow it and use a feature that needs it: nearby mechanics, the pin on a quote request or job post, weather, driving and parking helpers (the last two stay on your device) · mechanics: your position while a job is “on the way” (latest point only)'],['อุปกรณ์ของคุณ','Your device']],
      [['ใบงานกับช่าง','Jobs with mechanics'],['รถ อาการ พื้นที่ ที่อยู่ เบอร์โทร เวลานัด ราคา รูปก่อน/หลังซ่อม ข้อความ รีวิว ข้อพิพาท','Car, symptom, area, address, phone, appointment, price, before/after photos, messages, review, disputes'],['คุณและช่าง','You and the mechanic']],
      [['ข้อมูลช่าง (เฉพาะผู้สมัคร)','Mechanic data (applicants only)'],['ชื่อร้าน ที่ตั้ง เบอร์ บริการ ราคา รูปอู่และผลงาน ใบรับรอง · การยืนยันตัวตนด้วยบัตรประชาชนและใบหน้า (ข้อมูลชีวภาพ — ขอความยินยอมแยกต่างหาก)','Shop name, location, phone, services, prices, workshop and work photos, certificates · identity check with ID card and face (biometric data — separate explicit consent)'],['ผู้สมัคร และ Didit','The applicant and Didit']],
      [['LINE','LINE'],['LINE user ID ชื่อและรูปใน LINE ข้อความที่คุยกับบอท','LINE user ID, LINE name and picture, messages to the bot'],['LINE ตอนคุณเชื่อมบัญชีหรือทักบอท','LINE, when you link or message the bot']],
      [['การแจ้งเตือน','Notifications'],['ที่อยู่รับแจ้งเตือนของเบราว์เซอร์ (Web Push)','Your browser’s push subscription'],['เบราว์เซอร์ เมื่อคุณเปิดแจ้งเตือน','Your browser, when you turn notifications on']],
      [['ความคิดเห็นที่ส่งมา','Feedback you send'],['ข้อความ คะแนน หน้าที่ส่ง ชนิดเบราว์เซอร์','Message, rating, page, browser type'],['คุณ','You']],
      [['ข้อมูลทางเทคนิค','Technical data'],['ที่อยู่ IP (ใช้นับโควตา AI ของคนที่ยังไม่ล็อกอิน และกันการเดารหัส) ตัวนับการใช้งาน บันทึกข้อผิดพลาดของ AI แบบสั้น','IP address (for the anonymous AI quota and to stop code guessing), usage counters, short AI error logs'],['ระบบ','Our systems']],
    ])+
    NOTE('ok','check','<b>สิ่งที่เราไม่ทำ:</b> ไม่มีตัววิเคราะห์หรือตัวติดตาม (เช่น Google Analytics หรือพิกเซลโฆษณา) ไม่มีคุกกี้โฆษณา ไม่ขายข้อมูล และตอนนี้ไม่มีการรับชำระเงินในแอป จึงไม่เก็บข้อมูลบัตรหรือบัญชีธนาคาร',
      '<b>What we don’t do:</b> no analytics or trackers (such as Google Analytics or ad pixels), no advertising cookies, no selling data — and there is no payment in the app today, so we hold no card or bank details.')},

  {id:'use',title:['เราใช้ข้อมูลทำอะไร และอาศัยฐานกฎหมายใด','How we use it, and on what legal basis'],body:
    TABLE([['เพื่อ','Purpose'],['ข้อมูลที่ใช้','Data used'],['ฐานกฎหมาย (PDPA)','Legal basis (PDPA)']],[
      [['ให้บริการแอป: บัญชี โรงรถ การแจ้งเตือนดูแลรถ','Running the app: account, garage, upkeep reminders'],['บัญชี โปรไฟล์ รถ','Account, profile, cars'],['จำเป็นเพื่อปฏิบัติตามสัญญา (ม.24(3))','Performance of a contract (s.24(3))']],
      [['ให้ AI ตอบคำถามและวิเคราะห์รูป/เสียง','AI answers and photo/sound analysis'],['คำถาม ไฟล์แนบ บริบทรถ','Questions, attachments, car context'],['สัญญา (ม.24(3))','Contract (s.24(3))']],
      [['จับคู่และทำงานกับช่าง: ขอราคา ใบงาน แชต รีวิว','Finding and working with mechanics: quotes, jobs, chat, reviews'],['ใบงาน ตำแหน่ง เบอร์ ที่อยู่','Jobs, location, phone, address'],['สัญญา (ม.24(3))','Contract (s.24(3))']],
      [['ยืนยันตัวตนช่างเพื่อความปลอดภัยของลูกค้า','Verifying mechanics’ identity to keep customers safe'],['บัตรประชาชน ใบหน้า','ID card, face'],['ความยินยอมโดยชัดแจ้ง (ม.26) และประโยชน์โดยชอบด้วยกฎหมาย','Explicit consent (s.26) and legitimate interests']],
      [['ให้ AI ช่วยดูรูปอู่/ผลงานของผู้สมัคร','AI help reviewing applicant workshop photos'],['รูปอู่และผลงาน','Workshop and work photos'],['ความยินยอม (ไม่ยินยอมก็สมัครได้ ทีมงานดูเอง)','Consent (optional — staff review by hand otherwise)']],
      [['ส่งแจ้งเตือนทาง LINE หรือเบราว์เซอร์','LINE and browser notifications'],['LINE ID ที่อยู่รับแจ้งเตือน','LINE ID, push subscription'],['ความยินยอม (เปิด/ปิดเองได้)','Consent (you switch it on or off)']],
      [['กันโกง กันสแปม ความปลอดภัยของระบบ บันทึกการทำงานของทีมงาน','Fraud, spam and abuse prevention, system security, staff audit log'],['IP ตัวนับ บันทึกการทำงาน','IP, counters, logs'],['ประโยชน์โดยชอบด้วยกฎหมาย (ม.24(5))','Legitimate interests (s.24(5))']],
      [['ตัดสินข้อพิพาทระหว่างลูกค้ากับช่าง','Resolving customer–mechanic disputes'],['ใบงาน ข้อความ รูป','Job, messages, photos'],['สัญญา และประโยชน์โดยชอบด้วยกฎหมาย','Contract and legitimate interests']],
      [['ทำตามกฎหมายหรือคำสั่งของหน่วยงานรัฐ','Complying with law or lawful orders'],['เท่าที่กฎหมายกำหนด','Only what the law requires'],['หน้าที่ตามกฎหมาย (ม.24(6))','Legal obligation (s.24(6))']],
    ])+
    P('เราไม่ใช้ข้อมูลของคุณยิงโฆษณา และไม่ใช้ตัดสินใจเรื่องสำคัญเกี่ยวกับคุณด้วยเครื่องอย่างเดียว — การอนุมัติช่างและการตัดสินข้อพิพาททำโดยคนเสมอ',
      'We don’t use your data for advertising, and we never make significant decisions about you by machine alone — mechanic approvals and dispute rulings are always made by a person.')},

  {id:'ai',title:['AI กับข้อมูลของคุณ','AI and your data'],body:
    `<h3>${L('ส่งอะไรให้ AI','What the AI receives')}</h3>`+
    UL([
      ['คำถามของคุณ ข้อความก่อนหน้าในแชตเดียวกัน และไฟล์ที่คุณแนบ','Your question, earlier messages in the same chat, and files you attach'],
      ['ข้อมูลรถ (ยี่ห้อ รุ่น ปี เลขไมล์) รายการซ่อมบำรุงล่าสุด และบันทึกความจำของ AI','Car details (make, model, year, mileage), recent maintenance, and the AI’s memory notes'],
      ['ชื่อที่คุณตั้งให้เรียก ระดับความรู้เรื่องรถ และหน่วยที่ใช้','The name you asked us to use, your car-knowledge level, and units'],
      ['<b>ระหว่างโทรคุยกับ Cendon</b> เมื่อคุณกด (หรือขอให้ AI) “ฟังเสียงเครื่อง”: เสียงดิบ 10 วินาทีจากไมค์ (ไม่ผ่านตัวกรองเสียงรบกวน จึงอาจมีเสียงรอบข้างติดไปด้วย) · “สแกนห้องเครื่อง”: ภาพนิ่ง 1 ภาพจากกล้อง — ส่งผ่านเซิร์ฟเวอร์ของเราไปวิเคราะห์ ไม่เก็บไฟล์เสียง/ภาพไว้','<b>During a Cendon call</b>, when you tap (or ask the AI to) “listen to engine”: 10 seconds of raw microphone audio (no noise filter, so background sound may be included) · “scan engine bay”: one still photo — sent through our server for analysis; the audio and photo are not stored'],
      ['<b>โหมดอุบัติเหตุ</b>: เมื่อคุณกดให้ AI สรุป — คำเล่า เวลา พื้นที่ และรูปหลักฐานไม่เกิน 3 รูป (AI ถูกสั่งไม่ให้อ่านทะเบียนหรือใบหน้า และไม่ตัดสินว่าใครผิด)','<b>Accident mode</b>: when you ask for an AI summary — your notes, the time, the area and up to 3 evidence photos (the AI is told not to read out plates or faces and not to decide fault)'],
      ['<b>Cendon Wrapped</b>: เฉพาะตัวเลขสรุปทั้งปี (ระยะทาง ค่าน้ำมัน จำนวนครั้งที่ดูแลรถ) เพื่อตั้งฉายา — ไม่มีวันที่ สถานที่ หรือรายการละเอียด','<b>Cendon Wrapped</b>: only the yearly totals (distance, fuel spend, number of services) to come up with a nickname — no dates, places or detailed entries'],
    ])+
    NOTE('calm','lock','<b>ไม่ส่ง:</b> อีเมล เบอร์โทร ที่อยู่ หรือรหัสบัญชีของคุณ — ผู้ให้บริการ AI ไม่รู้ว่าคุณเป็นใครจากบัญชี Cendon',
      '<b>Not sent:</b> your email, phone, address or account ID — AI providers can’t tell who you are from your Cendon account.')+
    `<h3>${L('ส่งไปที่ไหน','Where it goes')}</h3>`+
    P('Google Gemini เป็น AI หลัก ถ้าใช้ไม่ได้ชั่วคราวระบบจะสลับไป Groq, Cloudflare Workers AI (เมื่อมีรูป) หรือ OpenRouter ตามลำดับ · การคุยด้วยเสียงสด เสียงของคุณส่งจากเครื่องถึง Google โดยตรงด้วยกุญแจใช้ครั้งเดียว เซิร์ฟเวอร์ของเราไม่ได้รับหรือบันทึกเสียงนั้น · เมื่อ AI ค้นเว็บ ผู้ให้บริการค้นหาได้รับเฉพาะคำค้น',
      'Google Gemini is the main AI. If it’s briefly unavailable we switch to Groq, Cloudflare Workers AI (for photos) or OpenRouter, in that order. · In live voice chat, your voice goes from your device straight to Google with a single-use key; our servers never receive or record it. · When the AI searches the web, search providers only see the search terms.')+
    `<h3>${L('คำตอบที่ใช้ซ้ำ','Reused answers')}</h3>`+
    P('คำตอบทั่วไปเกี่ยวกับรุ่นรถ (เช่น “น้ำมันเครื่องของรุ่นนี้ใช้เบอร์อะไร”) อาจถูกเก็บไว้ตอบคนอื่นที่ถามเรื่องเดียวกันกับรุ่นเดียวกัน โดยไม่ผูกกับบัญชีของคุณ · ระบบ<b>ไม่เก็บ</b>คำตอบที่มีเบอร์โทร อีเมล LINE ID หรือชื่อ/อีเมลของคุณ',
      'General answers about a car model (e.g. “which oil grade does this model use”) may be kept to answer others asking the same thing about the same model, without linking to your account. · We <b>never keep</b> an answer containing a phone number, email, LINE ID, or your name or email.')+
    `<h3>${L('ข้อควรรู้','Good to know')}</h3>`+
    UL([
      ['ผู้ให้บริการ AI แต่ละรายเก็บหรือใช้ข้อมูลที่ได้รับตามเงื่อนไขของตัวเอง (โดยเฉพาะบริการแบบใช้ฟรี อาจนำไปปรับปรุงบริการของเขา) — กรุณาอย่าพิมพ์เลขบัตรประชาชน ข้อมูลธนาคาร หรือข้อมูลส่วนตัวของคนอื่นในแชต','Each AI provider keeps or uses what it receives under its own terms (free tiers in particular may use it to improve their services) — please don’t type ID numbers, bank details or other people’s personal data into the chat'],
      ['AI ตอบผิดได้ ใช้เป็นข้อมูลประกอบ ไม่ใช่ผลตรวจของช่าง','The AI can be wrong. Treat it as guidance, not a mechanic’s inspection'],
      ['ไม่มี AI ตัวไหนดูบัตรประชาชน — การยืนยันตัวตนทำผ่าน Didit หรือทีมงานตรวจเอง','No AI looks at ID cards — identity checks go through Didit or staff'],
    ])},

  {id:'share',title:['ใครเห็นข้อมูลของคุณ','Who sees your data'],body:
    TABLE([['ใคร','Who'],['เห็นอะไร','What they see']],[
      [['ช่างที่คุณขอราคา','Mechanics you ask for a quote'],['ก่อนคุณยืนยันราคา: รถ อาการ พื้นที่ และตำแหน่งโดยประมาณ (รัศมีราว 1.6 กม.) · <b>หลังคุณยืนยันราคาแล้วเท่านั้น</b>: ที่อยู่ พิกัดจริง และเบอร์โทร','Before you accept a price: car, symptom, area and an approximate location (about 1.6 km) · <b>Only after you accept</b>: address, exact location and phone']],
      [['ลูกค้า','Customers'],['โปรไฟล์ร้าน พื้นที่ให้บริการ ราคา คะแนน และป้ายการตรวจสอบ — ไม่เห็นข้อมูลบัตรหรือเลขบัตรของช่าง','Shop profile, service area, prices, ratings and check badges — never the mechanic’s ID details']],
      [['ทุกคน','Everyone'],['รีวิวแสดงแบบไม่มีชื่อลูกค้า · โปรไฟล์ร้านช่างที่ผ่านการอนุมัติ','Reviews, shown without the customer’s name · approved mechanic shop profiles']],
      [['คนที่คุณส่งลิงก์ติดตามงานให้','People you share a job link with'],['ช่างคนไหน รถอะไร นัดเมื่อไร สถานะตอนนี้ และตำแหน่งช่างกับเวลาถึงโดยประมาณระหว่าง “ช่างกำลังมา” — ไม่มีที่อยู่หรือเบอร์ของคุณ ลิงก์หมดอายุใน 24 ชั่วโมงและยกเลิกได้ทุกเมื่อ','Which mechanic, which car, when, the current status, and the mechanic’s position and rough arrival time while they’re on the way — never your address or phone. Links expire in 24 hours and can be revoked anytime']],
      [['ลูกค้าของงานที่ช่างกำลังเดินทางไป','The customer of a job a mechanic is driving to'],['ตำแหน่งล่าสุดของช่างบนแผนที่และเวลาถึงโดยประมาณ เฉพาะตอนสถานะ “ช่างกำลังมา” — หยุดเองเมื่อเริ่มซ่อมหรือยกเลิก ช่างกดหยุดเองได้','The mechanic’s latest position on a map and a rough arrival time, only while the job is “on the way” — stops when the repair starts or the job is cancelled, and the mechanic can stop it anytime']],
      [['ใครก็ได้ที่มีลิงก์/QR Car Passport ของคุณ','Anyone with your Car Passport link or QR'],['ยี่ห้อ รุ่น ปี เลขไมล์ตามเวลา รายการซ่อมที่คุณบันทึก (และราคา ถ้าคุณเปิด) และงานที่ซ่อมผ่าน Cendon ที่คุณเลือก (ชื่อร้าน สรุปงาน วันที่) — ไม่มีชื่อ ทะเบียน เบอร์ ที่อยู่ หรือข้อความแชต · คุณปิดลิงก์ได้ทุกเมื่อ','Make, model, year, mileage over time, the services you logged (and prices, if you turn them on) and the Cendon jobs you pick (shop name, work summary, date) — no name, plate, phone, address or chat messages · you can turn the link off anytime']],
      [['ทีมงาน Cendon','Cendon staff'],['เฉพาะเท่าที่ต้องใช้ตรวจใบสมัคร ตัดสินข้อพิพาท หรือตอบเรื่องที่คุณแจ้ง — ทุกการกระทำของทีมงานมีบันทึกตรวจสอบย้อนหลัง','Only what’s needed to review applications, resolve disputes or answer your reports — every staff action is logged']],
      [['ผู้ให้บริการภายนอก','Service providers'],['เฉพาะที่ระบุในหัวข้อ 6 และทำงานแทนเราเท่านั้น','Only those listed in section 6, acting for us']],
      [['หน่วยงานรัฐ','Authorities'],['เมื่อกฎหมายหรือคำสั่งศาลบังคับ และเท่าที่จำเป็น','When law or a court order requires it, and no more than necessary']],
    ])+
    NOTE('ok','eyeoff','เราไม่ขาย ไม่ให้เช่า และไม่แลกเปลี่ยนข้อมูลส่วนบุคคลของคุณกับใคร','We never sell, rent or trade your personal data.')},

  {id:'processors',title:['ผู้ให้บริการที่ทำงานแทนเรา','Service providers'],body:
    P('ผู้ให้บริการเหล่านี้ประมวลผลข้อมูลเพื่อให้ Cendon ทำงานได้ ได้รับเฉพาะข้อมูลที่ต้องใช้ในงานนั้น',
      'These providers process data so Cendon can work, and receive only what each task needs.')+
    TABLE([['ผู้ให้บริการ','Provider'],['ใช้ทำอะไร','What for'],['ข้อมูลที่ได้รับ','Data they receive']],PROCESSORS)+
    P('ลิงก์ไปร้านอะไหล่ ตลาดออนไลน์ แผนที่นำทาง หรือโซเชียลมีเดีย พาคุณออกจาก Cendon — เว็บเหล่านั้นมีนโยบายของตัวเอง และเราไม่ส่งข้อมูลของคุณไปให้',
      'Links to parts shops, marketplaces, navigation maps or social media take you out of Cendon — those sites have their own policies, and we don’t pass your data to them.')},

  {id:'transfer',title:['การส่งข้อมูลไปต่างประเทศ','International transfers'],body:
    P('ผู้ให้บริการหลายรายข้างต้นมีศูนย์ข้อมูลนอกประเทศไทย (เช่น สหรัฐอเมริกา ยุโรป สิงคโปร์ ญี่ปุ่น) ข้อมูลของคุณจึงอาจถูกส่งไปประมวลผลในประเทศเหล่านั้น เราส่งเท่าที่จำเป็นต่อการให้บริการตามที่คุณขอ (PDPA ม.28(3)) และเลือกผู้ให้บริการที่มีมาตรการคุ้มครองข้อมูลตามสัญญาการให้บริการของเขา',
      'Several providers above run data centres outside Thailand (for example the US, Europe, Singapore and Japan), so your data may be processed there. We transfer only what is needed to provide the service you asked for (PDPA s.28(3)), using providers whose service terms include data-protection safeguards.')},

  {id:'retention',title:['เก็บไว้นานแค่ไหน','How long we keep it'],body:
    TABLE([['ข้อมูล','Data'],['ระยะเวลา','How long']],[
      [['บัญชีและโปรไฟล์','Account and profile'],['จนกว่าคุณจะลบบัญชี','Until you delete your account']],
      [['รถ เลขไมล์ รายการซ่อมบำรุง ความจำของ AI','Cars, mileage, maintenance, AI memory'],['จนกว่าคุณจะลบเอง รีเซ็ตบัญชี หรือลบบัญชี','Until you delete them, reset or delete your account']],
      [['ประวัติแชต AI','AI chat history'],['อยู่ในเครื่องของคุณ (ลบได้ในแอป) · ไฟล์แนบเก็บบนเซิร์ฟเวอร์ให้เปิดดูซ้ำได้ ไม่เกิน 500 MB ต่อบัญชี จนกว่าคุณจะรีเซ็ตหรือลบบัญชี','On your device (delete it in the app) · attachments are stored so you can reopen them, up to 500 MB per account, until you reset or delete your account']],
      [['บันทึกการใช้ AI','AI usage logs'],['เก็บเฉพาะจำนวนการใช้ (ไม่มีข้อความแชต) · บันทึกข้อผิดพลาดเก็บแค่ราว 300 รายการล่าสุดของทั้งระบบ คำถามตัดเหลือ 80 ตัวอักษร','Usage counts only (no chat text) · error logs keep only the latest ~300 entries system-wide, questions cut to 80 characters']],
      [['แชตกับบอท LINE','LINE bot chat'],['8 ข้อความล่าสุด เริ่มบทสนทนาใหม่เมื่อเงียบเกิน 2 ชั่วโมง ลบเมื่อรีเซ็ตหรือลบบัญชี','Last 8 messages; a new conversation starts after 2 hours of quiet; erased on reset or account deletion']],
      [['ลิงก์เชื่อม LINE','LINE link tokens'],['15 นาที ใช้ได้ครั้งเดียว','15 minutes, single use']],
      [['รหัสยืนยันทางอีเมล','Email sign-in codes'],['10 นาที เก็บแบบแฮช','10 minutes, stored hashed']],
      [['ใบงาน ข้อความกับช่าง รีวิว','Jobs, mechanic messages, reviews'],['เก็บเป็นหลักฐานของทั้งสองฝ่าย ข้อความที่แก้ไขเก็บต้นฉบับไว้ใช้ตัดสินข้อพิพาท · เมื่อลบบัญชี: บทสนทนาถูกลบ ใบงานที่จบแล้วตัดชื่อ เบอร์ ที่อยู่ และหมายเหตุออก รีวิวเหลือเฉพาะคะแนน','Kept as a record for both sides; edited messages keep the original for disputes · on account deletion: conversations are erased, finished jobs lose name, phone, address and notes, reviews keep only the star rating']],
      [['ลิงก์ติดตามงาน','Job share links'],['24 ชั่วโมง ยกเลิกได้ทุกเมื่อ','24 hours; revocable anytime']],
      [['ตำแหน่งช่างระหว่างเดินทาง','Mechanic position while on the way'],['เก็บแค่จุดล่าสุดจุดเดียว (ไม่เก็บเส้นทาง) ลบทันทีเมื่อเริ่มซ่อม ยกเลิก หรือเปลี่ยนสถานะ · ลูกค้าเห็นเฉพาะจุดที่ส่งมาภายใน 3 นาทีล่าสุด','Only the single latest point (no route history), deleted as soon as the repair starts, the job is cancelled or its status changes · customers only see a point sent within the last 3 minutes']],
      [['Car Passport','Car Passport'],['จนกว่าคุณจะปิดลิงก์หรือลบบัญชี · นับจำนวนครั้งที่เปิดดูเท่านั้น ไม่เก็บว่าใครเปิด','Until you turn off the link or delete your account · we only count views, never who viewed']],
      [['เตือนจากปฏิทินค่าใช้จ่าย','Cost-calendar reminders'],['ตั้งล่วงหน้าได้ไม่เกิน 400 วัน ลบเองหลังส่งแล้ว 3 วัน หรือเมื่อคุณปิดการเตือน','Scheduled up to 400 days ahead; removed 3 days after sending or when you turn reminders off']],
      [['ใบสมัครช่างและการยืนยันตัวตน','Mechanic applications and identity'],['ทั้งหมดเก็บแบบเข้ารหัส · รูปบัตรและเซลฟี่ลบหลังตรวจเสร็จ · ใบที่ค้างรอตรวจเกิน 30 วันหมดอายุ ลบรูปบัตรและเซลฟี่ทิ้งเอง แล้วแจ้งให้ส่งใหม่ · ชื่อและวันเกิดจาก Didit ลบเมื่ออนุมัติ · เลขบัตรเต็มไม่เก็บเลย เหลือแฮชแบบมีกุญแจกับ 3 หลักท้าย (กันสมัครซ้ำ) ลบเมื่อลบบัญชี ยกเว้นร้านที่ทีมงานระงับ จะเก็บแฮชไว้กันสมัครใหม่โดยไม่ผูกกับบัญชี','All of it is stored encrypted · ID and selfie images are deleted after review · applications left waiting more than 30 days expire, their ID and selfie images are deleted automatically, and you’re asked to apply again · name and birth date from Didit are removed on approval · the full ID number is never stored — only a keyed hash plus the last 3 digits (to stop duplicate sign-ups), erased with the account — except for staff-suspended shops, where the hash is kept, unlinked from any account, to block re-registration']],
      [['ความคิดเห็นที่ส่งมา','Feedback'],['จนกว่าคุณจะลบบัญชี','Until you delete your account']],
      [['บันทึกการทำงานของทีมงาน','Staff audit log'],['เก็บไว้ตรวจสอบย้อนหลัง เมื่อลบบัญชี อีเมลของคุณในบันทึกถูกแทนด้วยคำว่า deleted','Kept for accountability; on deletion your email in it is replaced with “deleted”']],
      [['สำเนาสำรองของฐานข้อมูล','Database backups'],['Cloudflare เก็บจุดย้อนคืนอัตโนมัติประมาณ 30 วัน แล้วหมดไปเอง','Cloudflare keeps automatic restore points for about 30 days, then they expire']],
    ])},

  {id:'rights',title:['สิทธิของคุณ','Your rights'],body:
    P('ตาม PDPA คุณมีสิทธิขอเข้าถึงและขอสำเนา ขอรับหรือโอนย้ายข้อมูล ขอแก้ไข ขอลบ ขอระงับการใช้ คัดค้านการประมวลผล และถอนความยินยอมได้ทุกเมื่อ (ไม่กระทบสิ่งที่ทำไปก่อนถอน) ส่วนใหญ่ทำเองได้ทันทีในแอป:',
      'Under the PDPA you can access and get a copy of your data, receive or move it, correct it, have it deleted, restrict or object to its use, and withdraw consent at any time (without affecting what happened before). Most of this you can do yourself, right now, in the app:')+
    `<div class="contact">
<div>${I.download}<b>${L('ดาวน์โหลดข้อมูลของฉัน','Download my data')}</b><span>${L('ไฟล์ JSON ทุกอย่างที่ผูกกับบัญชี เปิดอ่านหรือย้ายไปที่อื่นได้','A JSON file of everything linked to your account, readable and portable')}</span></div>
<div>${I.refresh}<b>${L('รีเซ็ตบัญชี','Reset account')}</b><span>${L('ล้างรถ แชต AI และการตั้งค่า แต่คงบัญชีไว้','Clears cars, AI chats and settings but keeps the account')}</span></div>
<div>${I.trash}<b>${L('ลบบัญชีถาวร','Delete account')}</b><span>${L('ลบทุกอย่างรวมถึงบัญชีล็อกอิน พิมพ์ DELETE เพื่อยืนยัน','Erases everything including your sign-in. Type DELETE to confirm')}</span></div>
</div>`+
    P('ทั้งหมดอยู่ที่ <b>โปรไฟล์ → บัญชีและความปลอดภัย</b> · ถ้ามีงานซ่อมที่ยังไม่จบ ต้องปิดงานหรือยกเลิกก่อนลบบัญชี เพื่อไม่ให้อีกฝ่ายเสียหาย · ปิดการแจ้งเตือนและยกเลิกการเชื่อม LINE ได้เองในแอป',
      'All of these are in <b>Profile → Account and safety</b>. · If a repair is still in progress, finish or cancel it before deleting, so the other side isn’t left stranded. · You can switch off notifications and unlink LINE yourself in the app.')+
    P(`เรื่องอื่น (เช่น คัดค้าน ขอระงับ หรือถอนความยินยอมการตรวจรูปด้วย AI) อีเมลมาที่ <a href="mailto:${EMAIL}">${EMAIL}</a> เราอาจขอยืนยันตัวตนก่อน และจะตอบภายใน 30 วัน · หากไม่พอใจ ร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.) ได้ที่ <a href="https://www.pdpc.or.th" rel="noopener">pdpc.or.th</a>`,
      `For anything else (objecting, restricting, or withdrawing consent to AI photo review) email <a href="mailto:${EMAIL}">${EMAIL}</a>. We may ask you to confirm your identity and will reply within 30 days. · If you’re not satisfied, you can complain to Thailand’s Personal Data Protection Committee (PDPC) at <a href="https://www.pdpc.or.th" rel="noopener">pdpc.or.th</a>.`)},

  {id:'security',title:['การดูแลความปลอดภัย','Security'],body:
    UL([
      ['ไม่มีกุญแจหรือรหัสลับของระบบอยู่ในแอปบนเครื่องคุณ ทุกอย่างอยู่ฝั่งเซิร์ฟเวอร์','No system keys or secrets live in the app on your device — they stay on the server'],
      ['ทุกคำขอที่ต้องล็อกอิน ตรวจยืนยันตัวตนที่เซิร์ฟเวอร์ สิทธิ์ทีมงานตรวจที่เซิร์ฟเวอร์ ไม่ใช่แค่ซ่อนปุ่ม','Every signed-in request is verified on the server; staff permissions are checked there too, not just hidden buttons'],
      ['เชื่อมต่อแบบเข้ารหัส (HTTPS) ตลอด','Encrypted connections (HTTPS) throughout'],
      ['ลบข้อมูลตำแหน่ง (EXIF) ออกจากรูปที่คุณส่งให้ช่าง','Location data (EXIF) is stripped from photos you send mechanics'],
      ['ใบสมัครช่าง ผลยืนยันตัวตน และรูปบัตร เซลฟี่ ใบรับรอง เข้ารหัส (AES-256) ก่อนบันทึกทุกครั้ง กุญแจเก็บแยกจากฐานข้อมูล — ถ้าฐานข้อมูลหรือสำเนาสำรองหลุด ก็เปิดอ่านไม่ได้ และถ้ามีคนแอบแก้หรือสลับข้อมูล ระบบจะรู้และไม่ยอมใช้','Mechanic applications, identity results, and ID, selfie and certificate images are encrypted (AES-256) before they’re saved, with the key kept apart from the database — a leaked database or backup can’t be read, and if anyone tampers with or swaps the data, the system detects it and refuses to use it'],
      ['เลขบัตรประชาชนเต็มไม่ถูกเก็บที่ไหนเลย เหลือแฮชแบบมีกุญแจ (ย้อนกลับเป็นเลขบัตรไม่ได้) กับ 3 หลักท้าย · ทีมงานตรวจบัตรโดยพิมพ์เลขที่เห็นบนรูปบัตรให้ระบบเทียบ ระบบตอบแค่ตรงหรือไม่ตรง','Full ID numbers are never stored anywhere — only a keyed hash (which can’t be turned back into the number) and the last 3 digits · staff check an ID by typing the number they see on the card photo; the system only answers match or no match'],
      ['ทีมงานทุกคนเปิดดูหรือตัดสินใบสมัครได้ตามสิทธิ์เท่านั้น และทุกครั้งมีบันทึกว่าใครทำอะไรเมื่อไร','Staff can view or decide on applications only within their role, and every action is logged with who did what and when'],
      ['จำกัดจำนวนครั้งการล็อกอิน การส่งข้อความ และการใช้ AI เพื่อกันการโจมตีและสแปม','Rate limits on sign-in, messaging and AI use to stop attacks and spam'],
    ])+
    P(`ไม่มีระบบใดปลอดภัย 100% หากเกิดเหตุละเมิดข้อมูลที่มีความเสี่ยงต่อคุณ เราจะแจ้งสำนักงานคณะกรรมการฯ ภายใน 72 ชั่วโมง และแจ้งคุณโดยเร็วตามที่กฎหมายกำหนด · พบช่องโหว่ แจ้งได้ที่ <a href="mailto:${EMAIL}">${EMAIL}</a>`,
      `No system is 100% secure. If a breach puts you at risk, we’ll notify the regulator within 72 hours and tell you promptly, as the law requires. · Found a vulnerability? Email <a href="mailto:${EMAIL}">${EMAIL}</a>.`)},

  {id:'device',title:['ข้อมูลในเครื่องและคุกกี้','On your device, and cookies'],body:
    P('แอปเก็บประวัติแชต AI สำเนาโรงรถ ภาษา ธีม การตั้งค่า และ (สำหรับช่าง) รายการงานล่าสุดใน Studio — รถ อาการ สถานะ ไม่มีชื่อ เบอร์ หรือที่อยู่ลูกค้า ลบเองเมื่อออกจากระบบ — ไว้ในพื้นที่เก็บของเบราว์เซอร์บนเครื่องคุณ (localStorage / IndexedDB) เพื่อให้เปิดเร็วและใช้ออฟไลน์ได้บางส่วน · รูปหลักฐานและสรุปจากโหมดอุบัติเหตุเก็บในเครื่องนี้เท่านั้น (IndexedDB) ไม่เกิน 7 วัน ไม่ขึ้นเซิร์ฟเวอร์จนกว่าคุณจะกดส่ง/แชร์เอง ลบได้ทุกเมื่อ ระบบล็อกอินของ Firebase เก็บสถานะการล็อกอินไว้ในเครื่องเช่นกัน เราไม่ใช้คุกกี้ติดตามหรือคุกกี้โฆษณา จึงไม่มีป้ายขอความยินยอมคุกกี้',
      'The app keeps your AI chat history, a copy of your garage, language, theme, settings and (for mechanics) your latest Studio job list — car, symptom and status only, no customer name, phone or address, cleared when you sign out — in your browser’s storage on your device (localStorage / IndexedDB) so it opens fast and partly works offline. · Accident-mode evidence photos and summaries stay on this device only (IndexedDB) for up to 7 days and never reach our servers unless you send or share them; delete them anytime. Firebase sign-in also keeps your session on the device. We use no tracking or advertising cookies, so there’s no cookie banner.')+
    P('ล้างข้อมูลเว็บไซต์ในเบราว์เซอร์ = ลบข้อมูลในเครื่องทั้งหมด (ข้อมูลบนเซิร์ฟเวอร์ยังอยู่จนกว่าคุณจะลบบัญชี) · เว็บนี้ (หน้าเกี่ยวกับ นโยบาย ข้อกำหนด ช่วยเหลือ) จำแค่ภาษาที่คุณเลือก',
      'Clearing site data in your browser removes everything stored locally (server data stays until you delete your account). · This website (about, policy, terms and help pages) only remembers the language you pick.')},

  {id:'age',title:['อายุผู้ใช้','Age'],body:
    P('Cendon สำหรับผู้มีอายุ 18 ปีขึ้นไป เราถามวันเกิดตอนเริ่มใช้เพื่อยืนยันอายุ และไม่ตั้งใจเก็บข้อมูลของผู้เยาว์ หากพบว่ามีบัญชีของผู้เยาว์ แจ้งเราเพื่อลบได้',
      'Cendon is for people aged 18 and over. We ask for your date of birth at setup to confirm this and don’t knowingly collect minors’ data. If you find a minor’s account, tell us and we’ll delete it.')},

  {id:'changes',title:['การเปลี่ยนแปลงนโยบายนี้','Changes to this policy'],body:
    P('เมื่อระบบเปลี่ยนวิธีเก็บหรือใช้ข้อมูล เราจะแก้หน้านี้ให้ตรงทันที เปลี่ยนเลขเวอร์ชันและวันที่ด้านบน และถ้าเป็นการเปลี่ยนสาระสำคัญ จะแจ้งในแอปก่อนมีผล การเปลี่ยนที่ต้องได้รับความยินยอมใหม่ เราจะขอความยินยอมใหม่ก่อน',
      'Whenever the way we collect or use data changes, we update this page straight away, with a new version number and date at the top. Material changes are announced in the app before they take effect, and anything that needs fresh consent will ask for it first.')+
    UL([
      ['<b>1.4 · 16 ต.ค. 2569</b> — ฟีเจอร์ใหม่: ช่างกำลังมา (ตำแหน่งช่างระหว่างเดินทาง) · ฟังเสียงเครื่องและสแกนห้องเครื่องระหว่างโทร · โหมดอุบัติเหตุ · Car Passport · Cendon Wrapped · ปฏิทินค่าใช้จ่าย · สมุดรถซิงก์ตามบัญชี','<b>1.4 · 16 Oct 2026</b> — new features: live mechanic tracking while on the way · engine listening and engine-bay scan during calls · accident mode · Car Passport · Cendon Wrapped · cost calendar · logbook synced to your account'],
      ['<b>1.3 · 16 ต.ค. 2569</b> — ระบุว่า Studio เก็บรายการงานล่าสุดไว้ในเครื่องช่างเพื่อให้เปิดได้ทันที (ไม่มีข้อมูลติดต่อลูกค้า) · ประกาศหาช่างจากทุกบัญชีเป็นงานจริง','<b>1.3 · 16 Oct 2026</b> — notes that Studio keeps the latest job list on the mechanic’s device so it opens instantly (no customer contact details) · job posts from every account are real jobs'],
      ['<b>1.2 · 15 ต.ค. 2569</b> — ใบสมัครช่างและรูปบัตรเข้ารหัสก่อนเก็บ · เลิกเก็บเลขบัตรเต็ม · ใบสมัครค้างรอตรวจเกิน 30 วันลบรูปบัตรทิ้งเอง (เป็นการเพิ่มการป้องกัน ไม่ต้องยอมรับใหม่)','<b>1.2 · 15 Oct 2026</b> — mechanic applications and ID images are encrypted before storage · full ID numbers are no longer stored · ID images of applications waiting over 30 days are deleted automatically (added protection; no new consent needed)'],
      ['<b>1.1 · 15 ต.ค. 2569</b> — เขียนใหม่ทั้งฉบับให้ตรงกับระบบปัจจุบัน: ตลาดช่าง การยืนยันตัวตนช่าง LINE ดาวน์โหลด/ลบบัญชีเองในแอป รายชื่อผู้ให้บริการครบ เลิกเก็บข้อความแชตในบันทึกการใช้ และไม่ส่งอีเมลให้ AI','<b>1.1 · 15 Oct 2026</b> — rewritten to match the current system: mechanic marketplace, mechanic identity checks, LINE, self-service download/delete, full provider list, chat text no longer kept in usage logs, and email no longer sent to the AI'],
      ['<b>1.0 · 1 ส.ค. 2569</b> — ฉบับแรก','<b>1.0 · 1 Aug 2026</b> — first version'],
    ])},

  {id:'contact',title:['ติดต่อเรา','Contact'],body:
    `<div class="contact">
<a href="mailto:${EMAIL}">${I.mail}<b>${L('อีเมล','Email')}</b><span>${EMAIL}</span></a>
<a href="/help">${I.help}<b>${L('ศูนย์ช่วยเหลือ','Help centre')}</b><span>${L('คำถามที่พบบ่อยและวิธีใช้','FAQs and how-tos')}</span></a>
<div>${I.store}<b>Car Spire Thailand</b><span>${L('ผู้ควบคุมข้อมูลส่วนบุคคล','Data controller')}</span></div>
</div>`},
];

export default {
  key:'privacy',path:'/privacy',file:'privacy.html',
  title:['นโยบายความเป็นส่วนตัว · Cendon','Privacy Policy · Cendon'],
  desc:['Cendon เก็บข้อมูลอะไร ใช้ทำอะไร ส่งให้ใคร เก็บนานแค่ไหน และคุณดาวน์โหลดหรือลบข้อมูลได้เองอย่างไร','What Cendon collects, why, who receives it, how long we keep it, and how to download or delete your data yourself.'],
  doc:true,
  body:docBody({
    eyebrow:['ความเป็นส่วนตัว','Privacy'],
    h1:['นโยบายความเป็นส่วนตัว','Privacy Policy'],
    lead:['เราเขียนให้อ่านจบได้ และตรงกับสิ่งที่ระบบทำจริง — ข้อมูลของคุณเป็นของคุณ ดาวน์โหลดหรือลบได้เองทุกเมื่อ','Written to be read, and to match what the system actually does. Your data is yours — download or delete it yourself, anytime.'],
    meta:[['clock',`มีผล ${EFFECTIVE[0]}`,`Effective ${EFFECTIVE[1]}`],['terms',`เวอร์ชัน ${VERSION}`,`Version ${VERSION}`],['shield','ตาม PDPA ประเทศไทย','Thailand PDPA']],
    summary:{title:['สรุปสั้น ๆ','In short'],items:[
      ['เก็บเท่าที่ต้องใช้ ไม่มีโฆษณา ไม่มีตัวติดตาม ไม่ขายข้อมูล','We keep only what we need — no ads, no trackers, no selling data'],
      ['AI ได้รับคำถามและข้อมูลรถ แต่ไม่ได้รับอีเมล เบอร์ หรือที่อยู่ของคุณ','The AI gets your question and car details, never your email, phone or address'],
      ['ช่างเห็นเบอร์และที่อยู่ของคุณ เฉพาะหลังคุณยืนยันราคาแล้ว','Mechanics see your phone and address only after you accept their price'],
      ['ประวัติแชต AI อยู่ในเครื่องของคุณ','Your AI chat history lives on your device'],
      ['ดาวน์โหลดหรือลบบัญชีได้เองที่ โปรไฟล์ → บัญชีและความปลอดภัย','Download or delete everything at Profile → Account and safety'],
    ]},
    sections,
  }),
};
