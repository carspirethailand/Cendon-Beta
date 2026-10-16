/* ศูนย์ช่วยเหลือ — วิธีใช้ทุกฟีเจอร์หลัก เขียนตามปุ่ม/ชื่อเมนูที่มีในแอปจริง
   เปลี่ยนชื่อปุ่มหรือขั้นตอนในแอปเมื่อไร แก้ที่นี่ด้วย แล้วรัน node site/build.mjs */
import {L,P,UL,NOTE,I,docBody,EMAIL,LINE_OA,LINE_ADD} from '../layout.mjs';

const Q=(th,en,a)=>`<details class="faq"><summary>${L(th,en)}</summary><div class="a">${a}</div></details>`;
const OL=items=>UL(items,'ol');

const sections=[
  {id:'start',title:['เริ่มต้นใช้งาน','Getting started'],body:
    Q('Cendon คืออะไร','What is Cendon?',
      P('ผู้ช่วยดูแลรถที่คุยภาษาคน ถามอาการรถ ส่งรูปหรือเสียงให้ AI ช่วยดู เช็กใบเสนอราคาว่าแพงเกินไหม จดประวัติซ่อมบำรุงและเตือนเมื่อถึงรอบ และหาช่างที่ผ่านการตรวจใกล้คุณ — ใช้ฟรี',
        'A car companion that talks like a person: ask about symptoms, send a photo or a sound for the AI to check, see whether a quote looks fair, keep service records with reminders, and find checked mechanics near you — free to use.'))+
    Q('ล็อกอินอย่างไร','How do I sign in?',
      P('กด <b>เข้าสู่ระบบ</b> แล้วเลือก Google หรือ LINE ครั้งแรกจะมีหน้าตั้งค่าสั้น ๆ: ชื่อที่ให้เรียก วันเกิด ภาษา หน่วย และยอมรับข้อกำหนดกับนโยบาย · ยังไม่ล็อกอินก็ลองถาม AI ได้ แต่โควตาน้อยกว่าและบันทึกรถไม่ได้',
        'Tap <b>Sign in</b> and choose Google or LINE. The first time there’s a short setup: the name to call you, date of birth, language, units, and accepting the terms and policy. · You can try the AI without signing in, with a smaller quota and no saved cars.'))+
    Q('ทำไมต้องใส่วันเกิด','Why do you ask for my date of birth?',
      P('เพื่อยืนยันว่าคุณอายุ 18 ปีขึ้นไปตามข้อกำหนด ไม่ได้ใช้ทำอย่างอื่น และไม่แสดงให้ใครเห็น',
        'Only to confirm you’re 18 or over, as the terms require. It isn’t used for anything else or shown to anyone.'))+
    Q('ติดตั้งเป็นแอปบนมือถือได้ไหม','Can I install it like an app?',
      P('ได้ เปิด Cendon ในเบราว์เซอร์แล้ว:','Yes. Open Cendon in your browser, then:')+
      UL([['<b>iPhone (Safari):</b> กดปุ่มแชร์ → “เพิ่มไปยังหน้าจอโฮม”','<b>iPhone (Safari):</b> tap Share → “Add to Home Screen”'],
          ['<b>Android (Chrome):</b> เมนู ⋮ → “ติดตั้งแอป” หรือ “เพิ่มไปยังหน้าจอหลัก”','<b>Android (Chrome):</b> menu ⋮ → “Install app” or “Add to Home screen”']]))+
    Q('เปลี่ยนภาษาได้ไหม','Can I change the language?',
      P('ได้ 12 ภาษา: ไทย อังกฤษ จีน ญี่ปุ่น เกาหลี อินโดนีเซีย เวียดนาม มลายู เยอรมัน ฝรั่งเศส สเปน และโปรตุเกส (ส่วนที่ยังแปลไม่ครบจะแสดงเป็นภาษาอังกฤษ) เปลี่ยนได้ที่การตั้งค่าในแอป หัวข้อ <b>ภาษา</b> · เว็บไซต์นี้มีไทยและอังกฤษ (ปุ่ม TH/EN ด้านบน)',
        '12 languages: Thai, English, Chinese, Japanese, Korean, Indonesian, Vietnamese, Malay, German, French, Spanish and Portuguese (anything not yet translated shows in English). Change it under <b>Language</b> in the app’s settings. · This website comes in Thai and English (the TH/EN switch at the top).'))},

  {id:'cars',title:['รถและการดูแลรถ','Cars and upkeep'],body:
    Q('เพิ่มรถอย่างไร','How do I add a car?',
      P('ไปที่ <b>โรงรถ</b> → เพิ่มรถ ใส่ยี่ห้อ รุ่น ปี และเลขไมล์ ข้อมูลอื่น (เช่น เลขตัวถัง VIN) ใส่หรือไม่ก็ได้ — ยิ่งครบ AI ยิ่งตอบตรงกับรถคันนั้น',
        'Go to <b>Garage</b> → add a car with make, model, year and mileage. Everything else (such as the VIN) is optional — the more you add, the more precisely the AI can answer for that car.'))+
    Q('สเปกรถมาจากไหน','Where do car specs come from?',
      P('ระบบค้นจากแหล่งข้อมูลผู้ผลิตและสื่อยานยนต์ แล้วเก็บเป็นคลังสเปกที่ทุกคนใช้ร่วมกัน ถ้าเจอข้อมูลผิด กดแจ้งในหน้าสเปกได้ · ใส่ VIN แล้วกดถอดรหัส ระบบจะเติมข้อมูลรุ่นให้ (ส่งเฉพาะเลข VIN ไปถอดรหัส)',
        'We research manufacturer and motoring sources and keep a shared spec library. If something’s wrong, report it from the spec page. · Add a VIN and decode it to fill in model details (only the VIN is sent to be decoded).'))+
    Q('การแจ้งเตือนดูแลรถทำงานอย่างไร','How do upkeep reminders work?',
      P('บันทึกการเปลี่ยนน้ำมันเครื่อง ยาง แบตเตอรี่ ฯลฯ พร้อมเลขไมล์ ระบบคำนวณรอบถัดไปจากระยะทางและเวลา แล้วเตือนในแอป (และ LINE หรือเบราว์เซอร์ ถ้าเปิดไว้)',
        'Log oil changes, tyres, batteries and so on with the mileage. We work out the next service from distance and time and remind you in the app (and on LINE or in your browser, if switched on).'))+
    Q('Cendon Wrapped คืออะไร','What is Cendon Wrapped?',
      P('สรุปปีของรถคุณแบบสไลด์เต็มจอ — ระยะทาง ค่าน้ำมัน ทริปที่ไกลที่สุด การดูแลรถ เดือนที่ยุ่งที่สุด และฉายาประจำปีที่ AI ตั้งให้จากตัวเลขจริง กดดูได้ที่แบนเนอร์บน <b>โรงรถ</b> แล้วแชร์เป็นรูปลงสตอรี่ได้ · ตัวเลขคำนวณในเครื่องจากสมุดรถที่คุณบันทึก (ส่งให้ AI แค่ยอดรวมเพื่อตั้งฉายา) · รูปแชร์ไม่มีทะเบียนหรือชื่อคุณ',
        'A full-screen year in review for your car — distance, fuel spend, longest trip, care, busiest month, and a yearly nickname the AI comes up with from your real numbers. Tap the banner in <b>Garage</b> and share it as a story image. · Numbers are worked out on your device from your logbook (only the totals go to the AI for the nickname) · the share image has no plate or name.'))+
    Q('ปฏิทินค่าใช้จ่าย 12 เดือนทำงานอย่างไร','How does the 12-month cost calendar work?',
      P('ในหน้ารถ → <b>ปฏิทินค่าใช้จ่าย</b> ระบบคำนวณว่าเดือนไหนต้องเปลี่ยนอะไรจากระยะที่คุณขับจริงและวันที่ทำครั้งล่าสุด บอกยอดรวม 12 เดือนและควรเก็บเดือนละเท่าไร · ราคาใช้ที่คุณเคยจ่ายจริงก่อน ถ้ายังไม่มีจะแสดงช่วงราคาทั่วไป (ติดเครื่องหมาย ≈) แตะราคาเพื่อใส่ราคาของคุณเองได้ · เปิด <b>เตือนก่อนถึงกำหนด 7 วัน</b> เพื่อรับแจ้งเตือนทาง LINE (ถ้าเชื่อมไว้) และในเครื่อง',
        'Open a car → <b>12-month plan</b>. We work out what’s due each month from how far you really drive and when each item was last done, then show the 12-month total and how much to set aside monthly. · Prices use what you actually paid first; otherwise a typical range (marked ≈) — tap a price to set your own. · Turn on <b>Remind me 7 days before</b> to get reminders on LINE (if linked) and on your device.'))+
    Q('Car Passport คืออะไร ปลอดภัยไหม','What is Car Passport? Is it safe?',
      P('หน้าประวัติรถที่คุณเลือกเปิดให้คนอื่นดู (เช่น ตอนขายรถมือสอง) — ส่งลิงก์หรือพิมพ์ QR ติดกระจก คนซื้อสแกนแล้วเห็นเลขไมล์ตามเวลา ประวัติซ่อม และงานที่ซ่อมผ่าน Cendon ซึ่งติดป้าย <b>“ยืนยันโดยร้าน”</b> (ดึงจากระบบ แก้ไม่ได้) ส่วนที่คุณบันทึกเองติดป้าย “บันทึกโดยเจ้าของ” · ไม่มีชื่อ ทะเบียน เบอร์ หรือที่อยู่ของคุณ · ราคาแสดงเฉพาะเมื่อคุณเปิด · ปิดลิงก์ได้ทุกเมื่อ ลิงก์และ QR เดิมจะใช้ไม่ได้ทันที',
        'A history page you choose to share (for example when selling your car) — send the link or print the QR for the window. Buyers see mileage over time, service history and repairs done through Cendon, marked <b>“Shop-verified”</b> (taken from the system, can’t be edited); your own entries are marked “Owner-recorded”. · No name, plate, phone or address · prices only if you turn them on · turn the link off anytime and the old link and QR stop working immediately.'))+
    Q('สมุดรถย้ายไปเครื่องใหม่ได้ไหม','Does my logbook move to a new device?',
      P('ได้ — บันทึกซ่อม น้ำมัน และทริปซิงก์ตามบัญชีแล้ว เข้าบัญชีเดียวกันจากเครื่องไหนก็เห็นเหมือนกัน','Yes — service, fuel and trip logs sync with your account, so every device signed in to it shows the same thing.'))},

  {id:'ai',title:['ผู้ช่วย AI','The AI assistant'],body:
    Q('ถามอะไรได้บ้าง','What can I ask?',
      UL([['อาการรถ เสียงแปลก ไฟเตือนบนหน้าปัด','Symptoms, odd noises, warning lights'],
          ['<b>ถ่ายรูป</b> ชิ้นส่วนหรือไฟเตือนให้ AI ดู','<b>Take a photo</b> of a part or warning light for the AI to look at'],
          ['<b>ฟังเสียงรถ</b> อัดเสียงหรือวิดีโอเสียงเครื่องยนต์ให้ AI ฟัง','<b>Listen to the car</b> — record audio or video of the engine for the AI'],
          ['<b>เช็กใบเสนอราคา</b> ถ่ายใบเสนอราคาจากอู่ ให้ AI ดูว่าราคาสมเหตุสมผลไหม และควรถามอะไรเพิ่ม','<b>Check a quote</b> — photograph a garage quote and the AI tells you whether it looks fair and what to ask'],
          ['คุยด้วยเสียงแบบสด ๆ ได้ (ปุ่มไมค์)','Talk to it live by voice (the mic button)'],
          ['<b>ระหว่างโทร</b> กด <b>ฟังเสียงเครื่อง</b> (หรือพูดว่า “ฟังเสียงเครื่องหน่อย”) แล้วจ่อมือถือใกล้จุดที่มีเสียง 10 วินาที — ระบบปิดตัวกรองเสียงรบกวนให้ AI ได้ยินเสียงเครื่องจริง เห็นคลื่นเสียงสด แล้ว AI บอกว่าได้ยินอะไร ด่วนแค่ไหน','<b>During a call</b>, tap <b>Listen to engine</b> (or say “listen to my engine”) and hold the phone near the sound for 10 seconds — noise filtering is switched off so the AI hears the real engine; you see a live sound graph, then the AI tells you what it heard and how urgent it is'],
          ['<b>ระหว่างโทร</b> กด <b>สแกนห้องเครื่อง</b> (หรือพูดว่า “ดูห้องเครื่องให้หน่อย”) แล้วเล็งกล้องไปที่ห้องเครื่อง — กรอบสีพร้อมหมายเลขและชื่อชิ้นส่วน (แบตเตอรี่ ท่ออากาศ ถังน้ำมันเบรก ฯลฯ) ขึ้นบนภาพสดทันที ขยับกล้องกรอบก็เลื่อนตาม · แตะกรอบไหน AI อธิบายชิ้นนั้นให้ฟังในสาย · กด <b>หยุดภาพ</b> เพื่อดูช้า ๆ (ดับเครื่องและรอให้เย็นก่อนจับเสมอ)','<b>During a call</b>, tap <b>Scan engine bay</b> (or say “look at my engine bay”) and point the camera at it — coloured, numbered boxes with part names (battery, air intake, brake fluid and so on) appear on the live picture and follow the camera as you move · tap a box and the AI explains that part on the call · tap <b>Pause</b> to look closely (always engine off and cool before touching)']]))+
    Q('ใช้ฟังเสียงเครื่อง/สแกนห้องเครื่องได้วันละกี่ครั้ง','How often can I use engine listening or the engine-bay scan?',
      P('ฟังเสียงเครื่องวันละ 8 ครั้ง (นับรวมในโควตา AI รายวันด้วย) · สแกนห้องเครื่องแบบสดส่งภาพให้ AI ใหม่เฉพาะตอนภาพเปลี่ยน ไม่เกิน 80 ภาพต่อวัน (ไม่กินจำนวนครั้ง AI ปกติ) · สรุปอุบัติเหตุด้วย AI วันละ 5 ครั้ง · ฉายา Wrapped วันละ 3 ครั้ง','Engine listening: 8 a day (also counted in your daily AI quota) · the live engine-bay scan only sends a new picture when the view changes, up to 80 pictures a day (not counted against your normal AI uses) · AI accident summaries: 5 a day · Wrapped nicknames: 3 a day'))+
    Q('ใช้ AI ได้วันละกี่ครั้ง','How many AI questions a day?',
      P('มีโควตารายวันเพื่อให้ทุกคนใช้ได้ทั่วถึง สมาชิกได้มากกว่าคนที่ยังไม่ล็อกอิน จำนวนที่เหลือแสดงในแอป และรีเซ็ตทุกวัน',
        'There’s a daily quota so everyone gets a fair share; signed-in members get more than guests. What’s left is shown in the app and resets every day.'))+
    Q('AI ตอบผิดทำอย่างไร','What if the AI is wrong?',
      P('AI ผิดได้ ใช้เป็นข้อมูลประกอบก่อนคุยกับช่าง ถ้าคำตอบเกี่ยวกับความปลอดภัย (เบรก พวงมาลัย ยาง) ให้ช่างตรวจเสมอ · เจอคำตอบที่ผิด บอกเราผ่าน <b>ส่งความเห็น</b> ในแอปได้ ช่วยให้ระบบดีขึ้น',
        'It can be. Use it to prepare before you talk to a mechanic, and always have safety items (brakes, steering, tyres) checked in person. · Spotted a wrong answer? Tell us via <b>Send feedback</b> in the app — it helps us improve.'))+
    Q('ทำไมเปลี่ยนเครื่องแล้วประวัติแชตหาย','Why did my chat history disappear on a new device?',
      P('ประวัติแชต AI เก็บไว้ในเครื่องที่ใช้คุย (เพื่อความเป็นส่วนตัว) จึงไม่ตามไปเครื่องใหม่ ส่วนรถ ประวัติซ่อม และการตั้งค่าซิงก์ตามบัญชี · ล้างข้อมูลเบราว์เซอร์ก็ทำให้ประวัติแชตหายเช่นกัน',
        'AI chat history is stored on the device you used (for privacy), so it doesn’t follow you to a new one. Cars, service history and settings sync with your account. · Clearing your browser data also clears chat history.'))},

  {id:'hire',title:['หาช่างและจ้างช่าง','Finding and hiring a mechanic'],body:
    Q('ป้ายการตรวจสอบของช่างหมายถึงอะไร','What do mechanic check badges mean?',
      P('ช่างทุกร้านผ่านการตรวจจากทีมงานก่อนเปิดรับงาน ป้ายบอกเฉพาะสิ่งที่ตรวจแล้วจริง เช่น ยืนยันตัวตนแล้ว หรือประเภทงานที่ผ่านการตรวจ ถ้าไม่มีป้ายในเรื่องไหน แปลว่ายังไม่ได้ตรวจเรื่องนั้น ไม่ใช่ว่าตรวจแล้วไม่ผ่าน',
        'Every shop is checked by staff before it can take jobs. Badges show only what was actually verified — identity, or specific job categories. No badge for something means it hasn’t been checked yet, not that it failed.'))+
    Q('ขอราคาแบบไหนได้บ้าง','What ways can I get a price?',
      UL([['<b>ร้านเดียว</b> — จากหน้าร้านที่คุณเลือก','<b>One shop</b> — from the shop page you pick'],
          ['<b>หลายร้านแล้วเทียบราคา</b> — ส่งคำขอทีเดียวถึงหลายร้าน แล้วเทียบในหน้าเดียว','<b>Several shops</b> — one request to many, then compare side by side'],
          ['<b>เรียกช่างด่วน</b> — รถเสียกลางทาง ส่งถึงร้านที่ออกนอกสถานที่ใกล้สุดพร้อมกัน (ถ้าแถวนั้นยังไม่มี ระบบประกาศงานด่วนให้ช่างรอบตัวเห็นแทน) ช่างเห็นเป็นงานสีแดงบนสุด','<b>Urgent call-out</b> — broken down? It goes to the nearest mobile shops at once (if none are nearby, it’s posted as an urgent job for every mechanic around you), and mechanics see it in red at the top'],
          ['<b>ประกาศหาช่าง</b> — โพสต์งาน ให้ช่างแถวนั้นเสนอราคาเข้ามา','<b>Post a job</b> — publish it and let nearby mechanics send quotes'],
          ['<b>ทักช่าง</b> — ถามก่อนได้โดยยังไม่ต้องจอง','<b>Message a mechanic</b> — ask questions before booking anything']]))+
    Q('ช่างเห็นเบอร์และที่อยู่ของฉันตอนไหน','When does a mechanic see my phone and address?',
      P('<b>หลังคุณกดยืนยันราคาเท่านั้น</b> ก่อนหน้านั้นช่างเห็นแค่รถ อาการ พื้นที่ และตำแหน่งโดยประมาณ (รัศมีราว 1.6 กม.) และในการ์ดแจ้งเตือน LINE ไม่มีเบอร์หรือที่อยู่เลย',
        '<b>Only after you accept their price.</b> Before that they see the car, the symptom, the area and an approximate location (about 1.6 km). LINE notification cards never include your phone or address.'))+
    Q('รหัสเริ่มงานคืออะไร','What is the start code?',
      P('รหัส 4 หลักที่คุณได้หลังยืนยันราคา บอกช่างเมื่อเจอกัน ช่างต้องใส่รหัสนี้ก่อนเริ่มงาน เป็นการยืนยันว่าเจอกันจริงและงานเริ่มแล้ว ขอรหัสใหม่ได้ในใบงานถ้าหมดอายุ',
        'A 4-digit code you get after accepting a price. Give it to the mechanic when you meet; they enter it to start the job, confirming you’ve really met. You can get a new one in the job if it expires.'))+
    Q('ช่างขอซ่อมเพิ่มระหว่างทำ','The mechanic wants to do extra work',
      P('ช่างต้องเสนองานเพิ่มในแอป (ค่าแรง ค่าอะไหล่) และ<b>คุณต้องกดยอมรับก่อน</b> ไม่ยอมรับก็ไม่ต้องจ่ายส่วนนั้น ราคาเดิมที่ยืนยันแล้วแก้ย้อนหลังไม่ได้',
        'They must propose it in the app (labour and parts) and <b>you must accept it first</b>. If you don’t, you don’t pay for it. The price you already accepted can’t be changed.'))+
    Q('จ่ายเงินอย่างไร','How do I pay?',
      P('ตอนนี้จ่ายให้ช่างโดยตรงเมื่องานเสร็จ ตามราคาในใบงาน (รวมงานเพิ่มที่คุณยอมรับ) Cendon ไม่เก็บค่าธรรมเนียมและไม่ได้ถือเงินแทน · ตรวจงานให้เรียบร้อยก่อนจ่าย',
        'For now you pay the mechanic directly when the job’s done, at the price in the job (plus any extra work you accepted). Cendon takes no fee and doesn’t hold money. · Check the work before you pay.'))+
    Q('ดูช่างกำลังมาบนแผนที่ได้ไหม','Can I watch the mechanic coming on a map?',
      P('ได้ — เมื่อช่างกด <b>กำลังไป</b> ในใบงาน คุณจะเห็นช่างเคลื่อนที่บนแผนที่พร้อมเวลาถึงโดยประมาณ (คำนวณจากระยะทาง ไม่ใช่เส้นทางจริง) · ถ้าสัญญาณช่างขาดหาย ใบงานจะบอก ลองโทรหาช่างได้ · ตำแหน่งหยุดแชร์เองเมื่อเริ่มซ่อม','Yes — once the mechanic taps <b>On my way</b>, you see them moving on a map with a rough arrival time (estimated from distance, not the actual route). · If their signal drops, the job tells you — try calling them. · Sharing stops on its own when the repair starts.'))+
    Q('ให้คนที่บ้านติดตามงานได้ไหม','Can family follow the job?',
      P('ได้ ในใบงานกด <b>แชร์ใบงานให้คนที่ไว้ใจ</b> คนที่ได้ลิงก์จะเห็นว่าช่างคนไหน รถอะไร นัดเมื่อไร และสถานะตอนนี้ — ไม่เห็นที่อยู่หรือเบอร์ ลิงก์หมดอายุใน 24 ชั่วโมง และยกเลิกได้ทุกเมื่อ',
        'Yes — in the job, tap <b>Share with someone you trust</b>. They’ll see which mechanic, which car, when, and the current status, but not your address or phone. The link lasts 24 hours and can be revoked anytime.'))+
    Q('มีปัญหากับช่างทำอย่างไร','I have a problem with a mechanic',
      P('กด <b>แจ้งปัญหา</b> ในใบงาน เล่าสิ่งที่เกิดขึ้นและแนบรูปถ้ามี ทีมงานจะดูหลักฐานในใบงาน (ราคาที่ยืนยัน ข้อความ รูปก่อน/หลัง) แล้วตัดสิน และอาจระงับร้านที่ทำผิดกติกา',
        'Tap <b>Report a problem</b> in the job, describe what happened and add photos if you have them. Staff review the evidence in the job — accepted price, messages, before/after photos — make a decision, and may suspend shops that break the rules.'))},

  {id:'mechanics',title:['สำหรับช่าง','For mechanics'],body:
    Q('สมัครเป็นช่างกับ Cendon','How do I join as a mechanic?',
      OL([['ล็อกอิน แล้วกด <b>สมัครเป็นช่าง</b> (หรือเปิด <a href="/join">/join</a>)','Sign in and tap <b>Become a mechanic</b> (or open <a href="/join">/join</a>)'],
          ['กรอกข้อมูลร้าน บริการ พื้นที่ และแนบรูปอู่/ผลงาน','Fill in your shop, services and area, and add workshop and work photos'],
          ['ยืนยันตัวตน (ด้านล่าง)','Verify your identity (below)'],
          ['ทีมงานตรวจ อาจโทรถามหรือขอดูอู่ผ่านวิดีโอ แล้วแจ้งผลในแอป (และ LINE ถ้าเชื่อมไว้)','Staff review it — they may call or ask for a video look at the workshop — and tell you the result in the app (and on LINE if linked)']]))+
    Q('ยืนยันตัวตนอย่างไร ข้อมูลบัตรปลอดภัยไหม','How does identity verification work? Is my ID safe?',
      P('ยืนยันผ่าน Didit (ถ่ายบัตรประชาชนและใบหน้า) หรือให้ทีมงานตรวจบัตรเอง ระหว่างรอตรวจ ใบสมัครและรูปบัตรเก็บแบบเข้ารหัส ทั้งสองทางรูปบัตรและเซลฟี่ถูกลบหลังตรวจเสร็จ (ค้างรอตรวจเกิน 30 วันก็ลบเอง แล้วแจ้งให้ส่งใหม่) เลขบัตรเต็มไม่ถูกเก็บ เหลือแค่แฮชแบบมีกุญแจกับ 3 หลักท้าย (ใช้กันสมัครซ้ำ) ลูกค้าไม่เห็นข้อมูลบัตรของคุณ และไม่มี AI ตัวไหนดูบัตร',
        'Through Didit (photos of your ID card and face) or a manual check by staff. While waiting for review, your application and ID images are stored encrypted. Either way, ID and selfie images are deleted after review (or automatically if the application waits more than 30 days — we’ll ask you to apply again). The full ID number is never stored — only a keyed hash plus its last 3 digits (to prevent duplicate sign-ups). Customers never see your ID details, and no AI looks at ID cards.'))+
    Q('Studio คืออะไร','What is Studio?',
      P('พื้นที่ทำงานของช่าง (<a href="/studio">/studio</a>): <b>งาน</b> (งานที่ต้องทำ และหางานจากประกาศใกล้คุณ) <b>ข้อความ</b> <b>บริการ</b> (ตั้งราคาและรายละเอียด) และ <b>ร้านของฉัน</b> (หน้าร้านที่ลูกค้าเห็น)',
        'The mechanic workspace (<a href="/studio">/studio</a>): <b>Jobs</b> (your to-do and nearby job posts), <b>Messages</b>, <b>Services</b> (prices and details) and <b>My shop</b> (the page customers see).'))+
    Q('แชร์ตำแหน่งตอนกำลังไปหาลูกค้า','Sharing your location on the way to a customer',
      P('กด <b>กำลังไป</b> ในใบงาน ระบบแชร์ตำแหน่งให้ลูกค้าเห็นบนแผนที่ทุกไม่กี่วินาที มีแถบบอกตลอดว่ากำลังแชร์ และกด <b>หยุด</b> ได้ · หยุดเองเมื่อเริ่มซ่อมหรือยกเลิก เก็บแค่จุดล่าสุด ไม่เก็บเส้นทาง · เบราว์เซอร์ส่งตำแหน่งได้เฉพาะตอนเปิดแอปค้างไว้ — ตั้งมือถือไว้ที่ขาตั้ง ห้ามใช้มือถือขณะขับ','Tap <b>On my way</b> in the job and your location is shared on the customer’s map every few seconds; a bar always shows it’s on, with a <b>Stop</b> button. · It stops on its own when you start the repair or the job is cancelled; only the latest point is kept, never a route. · Browsers can only send location while the app is open — mount the phone and never handle it while driving.'))+
    Q('งานด่วนใน Studio','Urgent jobs in Studio',
      P('ลูกค้าที่รถเสียตอนนี้และกด <b>เรียกช่างด่วน</b> จะขึ้นเป็นงานสีแดงบนสุดใน <b>งาน → ต้องทำต่อ</b> เองภายในไม่กี่วินาทีระหว่างที่เปิด Studio ไว้ ไม่ต้องรีเฟรช — ทั้งงานที่ส่งตรงถึงร้านคุณ และงานด่วนที่ประกาศในรัศมีรับงานของคุณ (ทุกหมวด) · ตั้งสถานะ <b>เปิดรับงาน</b> = มีเสียงเตือนด้วย · เชื่อม LINE ไว้ = ได้การ์ดแจ้งงานด่วนทาง LINE แม้ไม่ได้เปิดแอป · ลูกค้าเลือกร้านอื่นแล้ว หรือผ่านไป 3 ชั่วโมง งานด่วนหายไปเอง',
        'When a broken-down customer taps <b>Urgent call-out</b>, the job appears in red at the top of <b>Jobs → To do</b> within seconds while Studio is open — no refresh needed — whether it was sent to your shop or posted in your radius (any category). · Set <b>Taking jobs</b> to also get an alert sound · Link LINE to get urgent jobs on LINE even when the app is closed · Once the customer picks another shop, or after 3 hours, the urgent job disappears.'))+
    Q('สปอนเซอร์บริการคืออะไร เสียเงินไหม','What is sponsoring a service? Does it cost anything?',
      P('ทำให้บริการขึ้นต้นรายการ มีป้าย “สปอนเซอร์” บอกลูกค้าเสมอ (ไม่เกิน 2 บริการต่อแถว) ตอนนี้อยู่ในช่วง<b>ทดลองฟรี</b> เลือก 3, 7 หรือ 14 วัน หยุดได้ทุกเมื่อ ถ้าอนาคตมีค่าใช้จ่าย จะแสดงราคาก่อนเสมอและไม่ต่ออายุอัตโนมัติ',
        'It puts your service near the top of a list, always with a “Sponsored” label (max 2 per row). It’s in a <b>free trial</b> right now: 3, 7 or 14 days, stop anytime. If it ever costs money, you’ll see the price first and it won’t auto-renew.'))+
    Q('Cendon เก็บค่าธรรมเนียมช่างไหม','Does Cendon charge mechanics?',
      P('ตอนนี้ไม่เก็บค่าสมัครหรือค่าธรรมเนียมใด ๆ ลูกค้าจ่ายเงินให้คุณโดยตรง ถ้าจะเปลี่ยน จะแจ้งล่วงหน้าและต้องได้รับความยินยอมจากคุณก่อน',
        'No sign-up fee or commission right now — customers pay you directly. If that changes, we’ll tell you in advance and ask for your consent first.'))},

  {id:'line',title:['LINE','LINE'],body:
    Q('เชื่อม LINE เพื่อรับแจ้งเตือน','Link LINE to get notifications',
      OL([[`เพิ่มเพื่อน Cendon ใน LINE: <a href="${LINE_ADD}" rel="noopener">${LINE_OA}</a>`,`Add Cendon on LINE: <a href="${LINE_ADD}" rel="noopener">${LINE_OA}</a>`],
          ['กดเมนู <b>เชื่อมบัญชี</b> ในแชต (หรือพิมพ์ “เชื่อมต่อบัญชี”)','Tap <b>Link account</b> in the chat menu (or type “เชื่อมต่อบัญชี”)'],
          ['บอทส่งลิงก์มา กดเปิด ล็อกอินบัญชี Cendon แล้วกดเชื่อมต่อ','The bot sends a link — open it, sign in to Cendon and confirm'],
          ['บอทตอบกลับว่าเชื่อมสำเร็จ เท่านี้ก็ได้รับแจ้งเตือนงานทาง LINE แล้ว','The bot confirms the link — you’ll now get job notifications on LINE']])+
      NOTE('calm','lock','ลิงก์เชื่อมบัญชีใช้ได้ครั้งเดียวภายใน 15 นาที และต้องมาจากบอท Cendon เท่านั้น อย่าเปิดลิงก์เชื่อมบัญชีที่คนอื่นส่งมา','Link-account links work once, for 15 minutes, and must come from the Cendon bot. Never open a link-account link someone else sends you.'))+
    Q('เชื่อมแล้วแต่ไม่ได้รับแจ้งเตือน','Linked but no notifications?',
      P('LINE ส่งข้อความได้เฉพาะคนที่เป็นเพื่อนกับบัญชี Cendon และไม่ได้บล็อก ลองเพิ่มเพื่อนหรือเลิกบล็อก แล้วตรวจสถานะได้ในแอป',
        'LINE only delivers to people who have added the Cendon account and haven’t blocked it. Add or unblock it, then check the status in the app.'))+
    Q('คุยกับ AI ใน LINE ได้ไหม','Can I chat with the AI in LINE?',
      P('ได้ พิมพ์คำถามในแชต Cendon ได้เลย บอทจำบทสนทนาล่าสุดสั้น ๆ และเริ่มใหม่เมื่อเงียบไปนาน มีโควตารายวันแยกจากในแอป · ถ้าคำตอบยาวหรือต้องใช้รูป แนะนำให้เปิดในแอป',
        'Yes — just type your question in the Cendon chat. The bot remembers the last few messages and starts fresh after a long pause, with its own daily quota. · For long answers or photos, the app works better.'))+
    Q('ยกเลิกการเชื่อม LINE','Unlink LINE',
      P('กด <b>ยกเลิกการเชื่อม</b> ในส่วน LINE ของแอปได้ทุกเมื่อ หรือลบบัญชีก็ยกเลิกการเชื่อมให้อัตโนมัติ',
        'Tap <b>Unlink</b> in the LINE section of the app anytime. Deleting your account also unlinks automatically.'))},

  {id:'account',title:['บัญชีและข้อมูลของฉัน','My account and data'],body:
    P('ทุกอย่างในหัวข้อนี้อยู่ที่ <b>โปรไฟล์ → บัญชีและความปลอดภัย</b>','Everything here lives in <b>Profile → Account and safety</b>.')+
    Q('ดาวน์โหลดข้อมูลของฉัน','Download my data',
      P('กด <b>ดาวน์โหลดข้อมูลของฉัน</b> ได้ไฟล์ JSON ของทุกอย่างที่ผูกกับบัญชี (รถ ประวัติซ่อม ใบงาน ข้อความกับช่าง ฯลฯ) ประวัติแชต AI อยู่ในเครื่องของคุณอยู่แล้ว',
        'Tap <b>Download my data</b> for a JSON file of everything linked to your account (cars, service history, jobs, mechanic messages and more). AI chat history is already on your device.'))+
    Q('รีเซ็ต ปิดใช้งาน และลบบัญชี ต่างกันอย่างไร','Reset, deactivate, delete — what’s the difference?',
      UL([['<b>รีเซ็ตบัญชี</b> — ล้างรถ แชต AI และการตั้งค่า แต่คงบัญชี ร้านช่าง และใบงานไว้','<b>Reset account</b> — clears cars, AI chats and settings but keeps your account, shop and jobs'],
          ['<b>ปิดใช้งานบัญชี</b> — ล็อกบัญชีไว้ ข้อมูลยังอยู่ เข้าใช้ไม่ได้จนกว่าจะติดต่อให้เปิดคืน','<b>Deactivate</b> — locks the account; data stays; you can’t sign in until you ask us to restore it'],
          ['<b>ลบบัญชีถาวร</b> — ลบทุกอย่างรวมถึงบัญชีล็อกอิน กู้คืนไม่ได้ พิมพ์ DELETE เพื่อยืนยัน · แนะนำให้ดาวน์โหลดข้อมูลก่อน','<b>Delete account</b> — erases everything including your sign-in; can’t be undone; type DELETE to confirm · download your data first']]))+
    Q('ลบบัญชีไม่ได้ ขึ้นว่ามีงานค้าง','I can’t delete — it says I have active jobs',
      P('ถ้ามีงานซ่อมที่ยืนยันราคาแล้วแต่ยังไม่จบ (หรือมีข้อพิพาทค้าง) ต้องปิดงานหรือยกเลิกก่อน เพื่อไม่ให้อีกฝ่ายเสียหาย จากนั้นลบได้ทันที',
        'If a repair has an accepted price but isn’t finished (or a dispute is open), finish or cancel it first so the other side isn’t left stranded — then you can delete straight away.'))+
    Q('ข้อมูลของฉันไปที่ไหนบ้าง','Where does my data go?',
      P('อ่านได้ครบใน<a href="/privacy">นโยบายความเป็นส่วนตัว</a> สรุปคือ ไม่มีโฆษณา ไม่มีตัวติดตาม ไม่ขายข้อมูล และ AI ไม่ได้รับอีเมล เบอร์ หรือที่อยู่ของคุณ',
        'It’s all in the <a href="/privacy">Privacy Policy</a>. In short: no ads, no trackers, no selling data, and the AI never gets your email, phone or address.'))},

  {id:'trouble',title:['แอปมีปัญหา','Troubleshooting'],body:
    Q('หน้าค้าง หรือยังเห็นเวอร์ชันเก่า','The app is stuck or looks out of date',
      P('ปิดแอป/แท็บแล้วเปิดใหม่ หรือดึงหน้าจอลงเพื่อรีเฟรช แอปจะโหลดเวอร์ชันล่าสุดเอง ถ้ายังไม่หาย แจ้งเราพร้อมรุ่นมือถือและเบราว์เซอร์',
        'Close and reopen the app or tab, or pull down to refresh — it picks up the latest version by itself. Still stuck? Tell us your phone model and browser.'))+
    Q('ไม่ได้รับแจ้งเตือนในเบราว์เซอร์','No browser notifications',
      P('ตรวจว่าอนุญาตการแจ้งเตือนให้เว็บ Cendon แล้ว · บน iPhone ต้อง “เพิ่มไปยังหน้าจอโฮม” แล้วเปิดจากไอคอนนั้นก่อน (iOS 16.4 ขึ้นไป) จึงจะรับแจ้งเตือนได้ · ทางที่ชัวร์ที่สุดคือเชื่อม LINE',
        'Make sure notifications are allowed for Cendon. · On iPhone you must “Add to Home Screen” and open it from that icon first (iOS 16.4 or later) to receive notifications. · Linking LINE is the most reliable option.'))+
    Q('กล้อง ไมค์ หรือตำแหน่งใช้ไม่ได้','Camera, mic or location not working',
      P('เบราว์เซอร์จะถามสิทธิ์ครั้งแรกที่ใช้ ถ้าเคยกดไม่อนุญาต ให้เปิดใหม่ในการตั้งค่าเว็บไซต์ของเบราว์เซอร์ (ไอคอนแม่กุญแจข้างที่อยู่เว็บ)',
        'Your browser asks the first time. If you said no before, re-enable it in the browser’s site settings (the padlock next to the address).'))},

  {id:'emergency',title:['เหตุฉุกเฉิน','Emergencies'],body:
    NOTE('alert','phone','อุบัติเหตุ มีคนบาดเจ็บ หรือไม่ปลอดภัย โทร <b>191</b> (ตำรวจ) หรือ <b>1669</b> (การแพทย์ฉุกเฉิน) ก่อนเสมอ — Cendon ไม่ใช่บริการฉุกเฉิน · รถเสียหรือเกิดอุบัติเหตุแต่ปลอดภัยแล้ว กดปุ่ม <b>ฉุกเฉิน · รถเสีย / อุบัติเหตุ</b> ในแอป: โหมดอุบัติเหตุพาทำทีละขั้น — เช็กความปลอดภัย ถ่ายรูปหลักฐานที่ประทับวันเวลาและพิกัด (เก็บในเครื่องคุณเท่านั้น) ให้ AI ช่วยเขียนสรุปส่งประกัน แล้วเรียกรถยกหรือช่างด่วน · ไม่ด่วน ใช้ <b>เรียกช่าง (ไม่ด่วน)</b>',
      'Accident, injury or feeling unsafe? Call <b>191</b> (police) or <b>1669</b> (emergency medical) first — Cendon is not an emergency service. · Broken down or had an accident and you’re safe? Tap <b>Emergency · breakdown / accident</b> in the app: accident mode walks you through it — safety checks, evidence photos stamped with time and location (kept on your device only), an AI-drafted summary for your insurer, then a tow or urgent mechanic. · Not urgent? Use <b>Find a mechanic (not urgent)</b>.')},

  {id:'contact',title:['ติดต่อเรา','Contact us'],body:
    `<div class="contact">
<a href="mailto:${EMAIL}">${I.mail}<b>${L('อีเมล','Email')}</b><span>${EMAIL}</span></a>
<a href="${LINE_ADD}" rel="noopener">${I.chat}<b>LINE</b><span>${LINE_OA}</span></a>
<a href="/">${I.flag}<b>${L('ส่งความเห็นในแอป','Feedback in the app')}</b><span>${L('กด “ส่งความเห็น” ในแอป เล่าปัญหาหรือข้อเสนอแนะได้เลย','Tap “Send feedback” in the app to report a problem or suggest something')}</span></a>
</div>`+
    P('เราตั้งใจตอบภายใน 2 วันทำการ เรื่องข้อมูลส่วนบุคคลตอบภายใน 30 วันตามกฎหมาย','We aim to reply within two business days, and to personal-data requests within the 30 days the law allows.')},
];

export default {
  key:'help',path:'/help',file:'help.html',
  title:['ศูนย์ช่วยเหลือ · Cendon','Help Centre · Cendon'],
  desc:['วิธีใช้ Cendon: ล็อกอิน รถ ผู้ช่วย AI หาและจ้างช่าง LINE บัญชีและข้อมูลของคุณ','How to use Cendon: signing in, cars, the AI assistant, hiring mechanics, LINE, and your account and data.'],
  doc:true,
  body:docBody({
    eyebrow:['ช่วยเหลือ','Help'],
    h1:['มีอะไรให้ช่วยไหม','How can we help?'],
    lead:['คำตอบสั้น ๆ สำหรับทุกฟีเจอร์ เลือกหัวข้อด้านข้าง หรือเลื่อนอ่านได้เลย','Short answers for every feature. Pick a topic, or just scroll.'],
    meta:[['mail',EMAIL,EMAIL],['chat',`LINE ${LINE_OA}`,`LINE ${LINE_OA}`]],
    sections:sections.map(s=>({...s,n:false})),
  }),
};
