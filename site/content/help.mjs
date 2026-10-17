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
      P('Cendon ต้องเข้าสู่ระบบก่อนใช้งาน · เลือก <b>Google</b> หรือใส่<b>อีเมล + รหัสผ่าน</b> (บัญชี Apple จะเปิดให้ใช้เร็ว ๆ นี้) · ไม่อยากใช้รหัสผ่าน กด <b>ส่งรหัสเข้าอีเมลแทน</b> แล้วกรอกรหัส 6 หลักที่ได้ (ใช้ได้ 10 นาที ครั้งเดียว) — บางช่วงจะเป็น <b>ส่งลิงก์เข้าอีเมลแทน</b>: เปิดอีเมลบนเครื่องเดียวกันแล้วกดลิงก์ก็เข้าสู่ระบบได้เลย · ยังไม่มีบัญชีกด <b>สร้างบัญชี</b> (รหัสผ่านอย่างน้อย 8 ตัว เราส่งลิงก์ยืนยันอีเมลให้) · ครั้งแรกจะมีหน้าตั้งค่าสั้น ๆ: ชื่อที่ให้เรียก วันเกิด ภาษา หน่วย และยอมรับข้อกำหนดกับนโยบาย · ลิงก์ใบงานที่มีคนแชร์ให้คุณเปิดดูได้โดยไม่ต้องล็อกอิน',
        'Cendon asks you to sign in before using the app · choose <b>Google</b> or your <b>email + password</b> (Apple sign-in is coming soon) · rather not use a password? Tap <b>Email me a code instead</b> and enter the six-digit code (valid 10 minutes, once) — at times it’s <b>Email me a link instead</b>: open the email on the same device and tap the link to sign in · No account yet? Tap <b>Create account</b> (password of 8+ characters; we email you a verification link) · The first time there’s a short setup: the name to call you, date of birth, language, units, and accepting the terms and policy · a trip link someone shares with you opens without signing in.')+
      UL([['<b>ลืมรหัสผ่าน</b>: หน้าเข้าสู่ระบบ → <b>ลืมรหัสผ่าน?</b> → ใส่อีเมล → เปิดลิงก์ในอีเมลเพื่อตั้งรหัสใหม่ (เช็กจดหมายขยะด้วย)','<b>Forgot your password?</b> On the sign-in page tap <b>Forgot password?</b>, enter your email and open the link we send (check spam too)'],
          ['เคยสมัครด้วย Google หรือ Apple ให้กดปุ่มเดิมทุกครั้ง — ใช้อีเมลเดียวกันสมัครแบบรหัสผ่านซ้ำไม่ได้','If you signed up with Google or Apple, keep using that button — the same email can’t be registered again with a password'],
          ['ตอนเปิดหน้าเข้าสู่ระบบครั้งแรกจะมีคลิปสั้น ๆ กด <b>ข้าม</b> ได้ตลอด (ถ้าตั้งเครื่องให้ลดภาพเคลื่อนไหวหรือประหยัดเน็ต คลิปจะไม่เล่น)','The sign-in page opens with a short clip the first time — tap <b>Skip</b> any time (it won’t play if your device is set to reduce motion or save data)']]))+
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
    Q('เรียกช่างจากหน้าแรก (ด่วน / ไม่ด่วน)','Calling a mechanic from Home (urgent / not urgent)',
      P('การ์ด <b>เรียกช่าง</b> มีสองด้าน: ด้านหน้า (แดง) = <b>ด่วน</b> รถเสียหรืออุบัติเหตุตอนนี้ · แตะปุ่ม ⇄ หรือปัดการ์ดเพื่อพลิกเป็น <b>ไม่ด่วน</b> ให้ช่างรอบตัวเสนอราคา · แตะที่การ์ดด้านที่เห็นเพื่อเริ่ม',
        'The <b>Call a mechanic</b> card has two sides: the red front = <b>urgent</b> (breakdown or accident right now) · tap ⇄ or swipe the card to flip to <b>not urgent</b>, where nearby shops send quotes · tap the side you see to start'))+
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
      P('ในหน้ารถ → <b>ปฏิทินค่าใช้จ่าย</b> ระบบคำนวณว่าเดือนไหนต้องเปลี่ยนอะไรจากระยะที่คุณขับจริงและวันที่ทำครั้งล่าสุด บอกยอดรวม 12 เดือนและควรเก็บเดือนละเท่าไร · ราคาใช้ที่คุณเคยจ่ายจริงก่อน ถ้ายังไม่มีจะแสดงช่วงราคาทั่วไป (ติดเครื่องหมาย ≈) แตะราคาเพื่อใส่ราคาของคุณเองได้ · เปิด <b>เตือนก่อนถึงกำหนด 7 วัน</b> เพื่อรับแจ้งเตือนทาง LINE (ถ้าเชื่อมไว้) และในเครื่อง · เครื่องมือ <b>ต้นทุน & สมุดรถ</b> ในแชตวิเคราะห์จากที่บันทึกจริงเท่านั้น ถ้ารถคันนั้นยังไม่มีรายการ แอปพาไปหน้าบันทึกค่าใช้จ่ายให้ (หรือบอก AI ว่า “เติมน้ำมัน 1,200 บาท” ให้จดแทน)',
        'Open a car → <b>12-month plan</b>. We work out what’s due each month from how far you really drive and when each item was last done, then show the 12-month total and how much to set aside monthly. · Prices use what you actually paid first; otherwise a typical range (marked ≈) — tap a price to set your own. · Turn on <b>Remind me 7 days before</b> to get reminders on LINE (if linked) and on your device. · The <b>Cost & record</b> tool in chat only analyses what you actually recorded — if that car has no entries yet, the app takes you to its cost log (or tell the AI “log ฿1,200 of fuel” to save it for you).'))+
    Q('Car Passport คืออะไร ปลอดภัยไหม','What is Car Passport? Is it safe?',
      P('หน้าประวัติรถที่คุณเลือกเปิดให้คนอื่นดู (เช่น ตอนขายรถมือสอง) — ส่งลิงก์หรือพิมพ์ QR ติดกระจก คนซื้อสแกนแล้วเห็นเลขไมล์ตามเวลา ประวัติซ่อม และงานที่ซ่อมผ่าน Cendon ซึ่งติดป้าย <b>“ยืนยันโดยร้าน”</b> (ดึงจากระบบ แก้ไม่ได้) ส่วนที่คุณบันทึกเองติดป้าย “บันทึกโดยเจ้าของ” · ไม่มีชื่อ ทะเบียน เบอร์ หรือที่อยู่ของคุณ · ราคาแสดงเฉพาะเมื่อคุณเปิด <b>แสดงค่าใช้จ่าย</b> (มีผลกับลิงก์ทันที เห็นจำนวนรายการและยอดรวมก่อนเปิด) · ปิดลิงก์ได้ทุกเมื่อ ลิงก์และ QR เดิมจะใช้ไม่ได้ทันที',
        'A history page you choose to share (for example when selling your car) — send the link or print the QR for the window. Buyers see mileage over time, service history and repairs done through Cendon, marked <b>“Shop-verified”</b> (taken from the system, can’t be edited); your own entries are marked “Owner-recorded”. · No name, plate, phone or address · prices only if you turn on <b>Show costs</b> (applies to the link right away; you see the item count and total before you do) · turn the link off anytime and the old link and QR stop working immediately.'))+
    Q('ทำไมบางข้อความหรือตัวเลขบันทึกไม่ได้','Why won’t some entries save?',
      P('การาจตรวจก่อนบันทึกเพื่อให้ AI และปฏิทินค่าใช้จ่ายคำนวณถูก: ชื่ออาการ งาน ทริป และหมายเหตุต้องเป็นคำที่อ่านได้และไม่ยาวเกิน (อาการ 120 ตัว งาน/ทริป 60 ตัว) · ยอดเงินต้องไม่เกินที่เป็นไปได้สำหรับรถรุ่นนั้น — รถหรูได้เพดานสูงกว่า ยอดที่สูงผิดปกติแต่เป็นไปได้ระบบจะถามยืนยันก่อน · เติมน้ำมันครั้งเดียวไม่เกิน ฿15,000 · ทริปเดียวไม่เกิน 10,000 กม. · รอบบำรุงรักษา 500 – 200,000 กม. หรือ 1 – 120 เดือน · ระบบบอกเหตุผลทุกครั้ง ไม่แก้ตัวเลขให้เงียบ ๆ',
        'The garage checks entries before saving so the AI and cost calendar stay accurate: symptom, reminder, trip and note names must be readable words and not too long (symptoms 120 characters, reminders/trips 60) · amounts can’t exceed what’s possible for that car model — premium cars get higher limits, and unusually high but possible amounts ask you to confirm first · one fill-up up to ฿15,000 · one trip up to 10,000 km · service intervals 500 – 200,000 km or 1 – 120 months · you’re always told why; numbers are never changed silently.'))+
    Q('สมุดรถย้ายไปเครื่องใหม่ได้ไหม','Does my logbook move to a new device?',
      P('ได้ — บันทึกซ่อม น้ำมัน และทริปซิงก์ตามบัญชีแล้ว เข้าบัญชีเดียวกันจากเครื่องไหนก็เห็นเหมือนกัน','Yes — service, fuel and trip logs sync with your account, so every device signed in to it shows the same thing.'))},

  {id:'ai',title:['ผู้ช่วย AI','The AI assistant'],body:
    Q('ช่องค้นหาหน้าแรกกับโหมด AI','The home search bar and AI mode',
      P('หน้าแรกเป็นช่องค้นหาอาการ อู่ หรือบริการ · <b>มือถือ: ปัดช่องไปด้านข้าง</b> ช่องหมุนตามนิ้ว ปล่อยเกินราวหนึ่งในสี่ก็พลิกเป็น <b>Cendon AI</b> (ปัดนิดเดียวจะเด้งกลับ) · <b>คอม: ดับเบิลคลิกที่พื้นที่ว่างของช่อง</b> (ไม่ใช่ปุ่ม) · ในโหมด AI เล่าอาการ ส่งรูป หรืออัดเสียงเครื่อง แล้วกดลูกศร ห้องแชตเปิดและส่งให้ AI ทันที · AI ถามถึงรถที่เลือกไว้ในการ์ดรถหน้าแรก — แตะการ์ดรถเพื่อเปลี่ยนคันได้เลย · ปัด/ดับเบิลคลิกอีกครั้งเพื่อกลับเป็นค้นหา',
        'The home page starts as a search bar for symptoms, shops or services · <b>On a phone, swipe the bar sideways</b>: it turns with your finger, and letting go past about a quarter flips it to <b>Cendon AI</b> (a small swipe springs back) · <b>On a computer, double-click an empty spot in the bar</b> (not a button) · in AI mode describe the problem, send a photo or record the engine, then tap the arrow: the chat opens and sends it right away · the AI asks about the car picked on the home car card — tap that card to switch cars · swipe or double-click again to go back to search.'))+
    Q('โทรคุยกับ AI จากหน้าแรก','Calling the AI from the home page',
      P('ในโหมด AI แตะ <b>ไมค์</b> (หรือปุ่มคลื่นเสียง 4 แท่งตอนช่องว่าง) แถบจะกลายเป็น <b>แท่งคลื่นสีดำ</b> ที่ขยับตามเสียงคุณและเสียง AI — ถามได้ทุกเรื่อง ให้หาช่าง หรือสั่ง Valet ทำแทนได้ทันที',
        'In AI mode tap the <b>microphone</b> (or the four-bar wave button when the bar is empty): the bar turns into <b>black wave bars</b> that move with your voice and the AI’s — ask anything, find a mechanic, or have Valet do things for you right away')+
      UL([['<b>แตะคลื่น</b> = ปิด/เปิดไมค์ (แท่งจะจางลงตอนปิด)','<b>Tap the wave</b> = mute / unmute (the bars fade while muted)'],
          ['<b>ปัดคลื่นไปซ้ายหรือขวา</b> = วางสาย แถบเดิมเลื่อนกลับมาเอง','<b>Swipe the wave left or right</b> = hang up; the bar slides back by itself'],
          ['<b>กดค้างที่คลื่น 1 วินาที</b> แท่งจะรวมเป็นจุดดำ — <b>ลากมาวางในวงกลางจอ</b> จุดจะแผ่ออกเป็นสายเต็มจอ · ปล่อยที่อื่นจุดจะลอยกลับเป็นคลื่น','<b>Hold the wave for one second</b> and the bars gather into a black dot — <b>drag it into the ring in the middle</b> and it spreads into a full-screen call · let go anywhere else and it floats back into the wave'],
          ['สายเต็มจอ (ทั้งหน้าแรกและห้องแชต) มีวงกลมที่ขยับตามเสียง · เปิดกล้องแล้วจะเป็นคลื่นตามขอบจอแทน','Full-screen calls (home and chat) show a circle that moves with the voices · with the camera on it becomes a glow around the screen edge'],
          ['<b>ปัดลงที่จอโทร</b> (หรือปุ่ม ⌄) = ย่อสาย คุยต่อได้ · ไปหน้าไหนก็ได้ สายไม่หลุดและไม่เริ่มสายใหม่ · มีคลื่นเม็ดเล็กลอยเหนือเมนูล่าง: <b>แตะ</b> = กลับเต็มจอ · ปุ่มไมค์ = ปิด/เปิดไมค์ · <b>ปัดซ้าย/ขวา</b> = วางสาย','<b>Swipe down on the call screen</b> (or tap ⌄) to minimize and keep talking · go to any page — the call doesn’t drop or restart · a small wave floats above the bottom menu: <b>tap</b> it to go full screen · the mic button mutes · <b>swipe it left or right</b> to hang up'],
          ['<b>ปุ่มรูป</b> ในจอโทร = ส่งรูปจากคลังหรือถ่ายใหม่ให้ AI ดู โดยไม่ต้องวางสาย','The <b>photo button</b> on the call screen sends a photo (from your gallery or a new one) for the AI to look at, without hanging up'],
          ['ในสายสั่งได้เกือบทุกอย่างในบัญชีของคุณ: “พาไปการาจ” “เปลี่ยนเป็นธีมมืด” “คุยเรื่องรถคันนี้” “เพิ่มรถ Civic ปี 2020” “ไมล์ 90,000 แล้ว” “มีข้อความจากร้านไหม” “เรียกช่างด่วน” — อะไรที่ส่งถึงคนอื่นหรือเปลี่ยนข้อมูล AI จะอ่านสรุปแล้วรอคุณพูดยืนยัน · ไม่แตะข้อมูลคนอื่นหรือเครื่องมือทีมงาน','On a call you can ask for almost anything in your own account: “take me to my garage”, “switch to dark mode”, “talk about this car”, “add a 2020 Civic”, “it’s at 90,000 km now”, “any messages from shops?”, “get me an urgent mechanic” — anything that reaches others or changes data is read back for you to confirm · it never touches other people’s data or staff tools'],
          ['โทรใหม่ภายใน 30 นาที AI ยังจำเรื่องที่คุยในสายก่อนได้','Call again within 30 minutes and the AI still remembers your last call'],
          ['ระหว่างโทร ดึงหน้าจอลงจะไม่รีเฟรช (กันสายหลุด) — ถ้าจะรีเฟรช วางสายก่อน','During a call, pulling the screen down won’t refresh the page (so the call isn’t cut off) — hang up first if you want to refresh']]))+
    Q('กระดิ่งแจ้งเตือนมุมขวาบน','The notification bell (top right)',
      P('กระดิ่งรวมเรื่องที่ต้องรู้: ช่างเสนอราคา รับงาน กำลังมา เริ่มซ่อม ซ่อมเสร็จ ข้อความใหม่ (ฝั่งช่าง: คำขอใหม่ ลูกค้ายืนยัน/ยกเลิก) และคำตอบของ AI ที่มาตอนคุณไม่ได้ดูหน้าแชต · กระดิ่งอยู่มุมขวาบนของทุกหน้า (คอมอยู่ข้างรูปโปรไฟล์ · ห้องแชตอยู่ข้างปุ่ม ⋮) · ตัวเลขบนกระดิ่ง = ยังไม่อ่าน · แตะรายการเพื่อไปที่งานนั้น',
        'The bell gathers what you need to know: a mechanic quoted, took the job, is on the way, started, finished, or sent a message (mechanics: new requests, customer accepted/cancelled), plus AI replies that arrived while you weren’t on the chat · the bell sits at the top right of every page (next to your profile picture on a computer, next to ⋮ in the chat) · the number on the bell = unread · tap an item to open that job.')+
      UL([['<b>แจ้งเตือนในเครื่อง</b>: แตะกระดิ่ง → <b>เปิด</b> แล้วอนุญาต — เครื่องจะเด้งแจ้งเตือนแม้ปิดแอปอยู่ · กดอีกครั้งเพื่อ <b>ปิด</b> ได้ทุกเมื่อ (รายการในกระดิ่งยังเก็บไว้ให้ดูเหมือนเดิม) · ในห้องแชตบนคอม กระดิ่งซ่อนไว้ไม่ให้บังแชต','<b>Device notifications</b>: tap the bell → <b>Turn on</b> and allow — your phone or computer alerts you even with the app closed · tap again to <b>turn off</b> anytime (the bell still keeps your list) · in the chat on a computer the bell is hidden so it doesn’t cover the chat'],
          ['ข้อความแจ้งเตือนมีแค่ชื่อร้าน รุ่นรถ และสถานะงาน ไม่มีเบอร์หรือที่อยู่ · กล่องแจ้งเตือนเก็บในเครื่องนี้ ล่าสุด 40 รายการ','Alerts show only the shop name, car model and job status — no phone or address · the inbox stays on this device, latest 40'],
          ['ถ้าเชื่อม LINE ไว้ จะได้ทั้งทาง LINE และในเครื่อง','If LINE is linked you get both LINE and device alerts']]))+
    Q('Cendon Valet คืออะไร','What is Cendon Valet?',
      P('Valet คือ AI ที่ลงมือทำในแอปแทนคุณจริง ๆ แค่บอกในแชตหรือพูดตอนโทรคุยกับ AI เช่น “ยางแตก เรียกช่างด่วนให้หน่อย” “ประกาศหาช่างล้างแอร์” “ขอราคาร้านนนท์แอร์” “ทักร้านถามว่าว่างเสาร์ไหม” “รับราคาร้านแอร์” “ยกเลิกใบงานนี้” “งานเสร็จแล้ว” “จดเติมน้ำมัน 1,200 บาท” “ตั้งวันต่อภาษี 15 มี.ค.” “เพิ่มรถ Civic ปี 2020” “รถฉันเกียร์ CVT ยาง 185/60 R15” (จดลงข้อมูลรถ) “พาไปการาจ” · ช่างสั่งเปลี่ยนสถานะร้านหรือเปิดหน้า Studio ได้ด้วย',
        'Valet is an AI that really acts inside the app for you — say it in chat or out loud during a call, e.g. “flat tyre, get me an urgent mechanic”, “post a job for an AC clean”, “ask Non Air for a quote”, “message the shop to ask about Saturday”, “accept the AC quote”, “cancel this job”, “the job is done”, “log ฿1,200 of fuel”, “set my road tax for 15 March”, “add a 2020 Civic”, “my car is a CVT on 185/60 R15 tyres” (saved to the car’s details), “take me to my garage” · mechanics can also change their shop status or open Studio pages.')+
      UL([['<b>เปิดใช้</b>: แตะปุ่มรูปจับมือข้างช่องพิมพ์ (มือถือ: ปุ่ม ⋮ มุมขวาบน) แล้วกด “อนุญาต Valet” — ปิดได้ทุกเมื่อที่ปุ่มเดิม','<b>Turn it on</b>: tap the handshake button next to the message box (phone: the ⋮ button at the top right) and choose “Allow Valet” — switch it off the same way anytime'],
          ['<b>ทุกอย่างที่เปลี่ยนข้อมูลหรือส่งถึงคนอื่น</b> (เรียกช่าง ประกาศ ขอราคา ทักร้าน รับราคา ยกเลิก ปิดงาน ส่งรูป เพิ่มรถ ข้อมูลรถ เลขไมล์ สมุดรถ สถานะร้าน) ขึ้นเป็นการ์ดให้คุณตรวจรถ อาการ ตำแหน่ง และเบอร์ แล้วกดยืนยันเองก่อนเสมอ — ส่งถึงช่างจริงทันทีที่กด · รับราคาต้องติ๊กยอมรับในการ์ดเอง · การพาไปหน้าอื่นนับถอยหลังสั้น ๆ ยกเลิกได้ · เปลี่ยนธีม/ภาษากดย้อนกลับได้','<b>Anything that changes your data or reaches someone else</b> (calling a mechanic, posts, quote requests, messages, accepting, cancelling or closing jobs, photos, adding a car, car details, mileage, logbook, shop status) appears as a card where you check the car, problem, location and phone, then confirm yourself — it reaches mechanics the moment you tap · accepting a quote needs your own tick on the card · moving to another page counts down briefly and can be cancelled · theme/language changes can be undone'],
          ['<b>ตอนโทรคุยกับ AI</b>: บอกสิ่งที่อยากให้ทำได้เลย AI จะขึ้นการ์ดบนจอแล้วอ่านสรุปให้ฟัง — พูดว่า “ยืนยัน” หรือกดปุ่มบนจอ ถึงจะส่งจริง · ถ้ายังไม่ได้อนุญาต Valet การ์ดจะให้กดอนุญาตบนจอก่อน (พูดอนุญาตแทนไม่ได้)','<b>During a voice call</b>: just say what you need — the AI shows a card on screen and reads the summary back; it is only sent once you say “confirm” or tap the button · if Valet isn’t allowed yet, the card asks you to tap Allow first (saying it isn’t enough)'],
          ['<b>ข้อมูลรถ</b> (รุ่นย่อย เครื่อง เกียร์ น้ำมัน ขับเคลื่อน ยาง VIN ทะเบียน) AI จดเฉพาะที่คุณพูดชัด ไม่เดาจากสเปกทั่วไป · แก้ในการ์ดได้ก่อนกดบันทึก · VIN ต้องครบ 17 ตัว','<b>Car details</b> (trim, engine, gearbox, fuel, drive, tyres, VIN, plate): the AI only saves what you clearly said and never fills in from general specs · you can edit them on the card before saving · a VIN must be 17 characters'],
          ['มีคนเจ็บหรือไม่ปลอดภัย โทร 1669 หรือ 191 ก่อนเสมอ — Valet เรียกช่าง ไม่ใช่บริการฉุกเฉิน','If anyone is hurt or unsafe, call 1669 or 191 first — Valet calls mechanics; it is not an emergency service'],
          ['Valet ทำได้เฉพาะสิ่งที่บัญชีของคุณทำได้อยู่แล้ว · ลบข้อมูล ลบบัญชี ลบรถ เปลี่ยนรหัสผ่านหรืออีเมล และเรื่องเงิน ยังทำเองเท่านั้น','Valet can only do what your own account can already do · deleting data, your account or a car, changing your password or email, and anything about money stay manual']]))+
    Q('ตั้งประสิทธิภาพ AI (Sprint · Grand Tour · Atelier)','AI performance (Sprint · Grand Tour · Atelier)',
      P('<b>Sprint</b> ตอบไว สั้น · <b>Grand Tour</b> สมดุล Cendon เลือกให้ว่าคิดแค่ไหน · <b>Atelier</b> ละเอียดที่สุด คิดลึก ค้นหลายแหล่ง · บนคอมอยู่ที่ปุ่มข้างช่องพิมพ์ · บนมือถืออยู่ในปุ่ม ⋮ มุมขวาบนของห้องแชต (รวมกับแชตใหม่และ Valet)',
        '<b>Sprint</b> is fast and short · <b>Grand Tour</b> is balanced — Cendon decides how deep to go · <b>Atelier</b> is the most thorough, with deeper thinking and more sources · on a computer it’s the button next to the message box · on a phone it’s in the ⋮ button at the top right of the chat (with New chat and Valet).'))+
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
      P('มีโควตารายวันต่อบัญชีเพื่อให้ทุกคนใช้ได้ทั่วถึง จำนวนที่เหลือแสดงในแอป และรีเซ็ตทุกวัน',
        'There’s a daily quota per account so everyone gets a fair share. What’s left is shown in the app and resets every day.'))+
    Q('AI ตอบผิดทำอย่างไร','What if the AI is wrong?',
      P('AI ผิดได้ ใช้เป็นข้อมูลประกอบก่อนคุยกับช่าง ถ้าคำตอบเกี่ยวกับความปลอดภัย (เบรก พวงมาลัย ยาง) ให้ช่างตรวจเสมอ · เจอคำตอบที่ผิด บอกเราผ่าน <b>ส่งความเห็น</b> ในแอปได้ ช่วยให้ระบบดีขึ้น',
        'It can be. Use it to prepare before you talk to a mechanic, and always have safety items (brakes, steering, tyres) checked in person. · Spotted a wrong answer? Tell us via <b>Send feedback</b> in the app — it helps us improve.'))+
    Q('ทำไมเปลี่ยนเครื่องแล้วประวัติแชตหาย','Why did my chat history disappear on a new device?',
      P('ประวัติแชต AI เก็บไว้ในเครื่องที่ใช้คุย (เพื่อความเป็นส่วนตัว) จึงไม่ตามไปเครื่องใหม่ ส่วนรถ ประวัติซ่อม และการตั้งค่าซิงก์ตามบัญชี · ล้างข้อมูลเบราว์เซอร์ก็ทำให้ประวัติแชตหายเช่นกัน',
        'AI chat history is stored on the device you used (for privacy), so it doesn’t follow you to a new one. Cars, service history and settings sync with your account. · Clearing your browser data also clears chat history.'))},

  {id:'hire',title:['หาช่างและจ้างช่าง','Finding and hiring a mechanic'],body:
    Q('ห้องคุยกับช่างพิมพ์ไม่ได้','I can’t type in a mechanic chat',
      P('ถ้างานเสร็จ ถูกยกเลิก หรือคำขอหมดอายุแล้ว ห้องคุยของงานนั้นจะเก็บไว้ดูย้อนหลังอย่างเดียว ท้ายห้องมีป้ายรูปกุญแจบอกเหตุผล · ถ้ายังต้องการช่าง ขอราคาใหม่ หรือกด <b>ทักช่าง</b> จากหน้าร้านเพื่อคุยต่อ · ปิดห้องได้ด้วยปุ่มย้อนกลับ หรือคลิกพื้นที่นอกห้องคุย',
        'Once a job is finished, cancelled or expired, its chat stays read-only for reference — a lock note at the bottom says why · if you still need help, ask for a new quote or tap <b>Message</b> on the shop page · close the chat with the back button or by clicking outside it.'))+
    Q('กดเรียกช่างแล้วขึ้น “ยังส่งไม่ได้”','“Almost there” pops up when I call a mechanic',
      P('กล่องนี้บอกครบทุกข้อที่ยังขาดหรือกรอกผิด เช่น ยังไม่ได้บอกอาการ (ไม่ด่วนต้องอย่างน้อย 10 ตัวอักษร) ยังไม่ได้ใส่รุ่นรถ ยังไม่ปักหมุดตำแหน่ง หรือเบอร์โทรไม่ถูก (ขึ้นต้นด้วย 0 มี 9–10 หลัก) · กด <b>กลับไปแก้</b> แล้วแอปพาไปช่องแรกที่ต้องแก้ ช่องที่ผิดมีขอบแดง',
        'It lists everything still missing or wrong — no symptom yet (non-urgent needs at least 10 characters), no car, no pinned location, or a phone number that isn’t 0 plus 9–10 digits · tap <b>Fix it</b> and the app jumps to the first field to fix; wrong fields get a red outline.'))+
    Q('ป้ายการตรวจสอบของช่างหมายถึงอะไร','What do mechanic check badges mean?',
      P('ช่างทุกร้านผ่านการตรวจจากทีมงานก่อนเปิดรับงาน ป้ายบอกเฉพาะสิ่งที่ตรวจแล้วจริง เช่น ยืนยันตัวตนแล้ว หรือประเภทงานที่ผ่านการตรวจ ถ้าไม่มีป้ายในเรื่องไหน แปลว่ายังไม่ได้ตรวจเรื่องนั้น ไม่ใช่ว่าตรวจแล้วไม่ผ่าน',
        'Every shop is checked by staff before it can take jobs. Badges show only what was actually verified — identity, or specific job categories. No badge for something means it hasn’t been checked yet, not that it failed.'))+
    Q('ขอราคาแบบไหนได้บ้าง','What ways can I get a price?',
      UL([['<b>ร้านเดียว</b> — จากหน้าร้านที่คุณเลือก','<b>One shop</b> — from the shop page you pick'],
          ['<b>หลายร้านแล้วเทียบราคา</b> — ส่งคำขอทีเดียวถึงหลายร้าน แล้วเทียบในหน้าเดียว','<b>Several shops</b> — one request to many, then compare side by side'],
          ['<b>เรียกช่างด่วน</b> — รถเสียกลางทาง ส่งถึงร้านที่ออกนอกสถานที่ใกล้สุดพร้อมกัน (ถ้าแถวนั้นยังไม่มี ระบบประกาศงานด่วนให้ช่างรอบตัวเห็นแทน) ช่างเห็นเป็นงานสีแดงบนสุด','<b>Urgent call-out</b> — broken down? It goes to the nearest mobile shops at once (if none are nearby, it’s posted as an urgent job for every mechanic around you), and mechanics see it in red at the top'],
          ['<b>ประกาศหาช่าง</b> — โพสต์งาน ให้ช่างแถวนั้นเสนอราคาเข้ามา (หน้าแรก: การ์ด <b>เรียกช่าง → ไม่ด่วน</b>) · หรือบอก Cendon Valet ในแชตหรือตอนโทร ให้ประกาศจากที่คุยกัน (คุณยืนยันในการ์ดก่อนส่ง)','<b>Post a job</b> — publish it and let nearby mechanics send quotes (home page: <b>Call a mechanic → Not urgent</b>) · or ask Cendon Valet in chat or on a call to post it from what you discussed (you confirm on the card first)'],
          ['<b>ทักช่าง</b> — ถามก่อนได้โดยยังไม่ต้องจอง','<b>Message a mechanic</b> — ask questions before booking anything']]))+
    Q('คำขอราคาและประกาศอยู่ได้นานแค่ไหน','How long do requests and posts stay open?',
      UL([['<b>เรียกช่างด่วน</b> — 3 ชั่วโมง','<b>Urgent call-out</b> — 3 hours'],
          ['<b>คำขอที่ร้านยังไม่เสนอราคา</b> และ<b>ประกาศหาช่าง</b> — 48 ชั่วโมง (ราคาที่ช่างเสนอในประกาศหมดพร้อมประกาศ)','<b>A request the shop hasn’t priced yet</b> and a <b>job post</b> — 48 hours (quotes on a post end with the post)'],
          ['<b>ราคาที่ร้านเสนอมาแล้ว</b> แต่คุณยังไม่กดยืนยัน — 7 วันนับจากที่ร้านเสนอล่าสุด','<b>A quote you haven’t accepted</b> — 7 days from the shop’s latest quote']])+
      P('หมดเวลาแล้วระบบยกเลิกให้อัตโนมัติทั้งสองฝ่าย ในใบงานบอกเหตุผลไว้ ส่งคำขอใหม่ได้ทุกเมื่อ · งานที่ยืนยันราคาแล้วไม่มีวันหมดอายุ',
        'When time runs out the system cancels it for both sides and the job shows why. You can send a new request anytime · Jobs with an accepted price never expire.'))+
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
      UL([['<b>อนุมัติ</b> — ร้านเปิดให้ลูกค้าเห็น เข้า Studio เริ่มรับงานได้เลย','<b>Approved</b> — your shop goes live; open Studio and start taking jobs'],
          ['<b>ให้แก้</b> — ทีมงานบอกสิ่งที่ต้องแก้ แก้แล้วยื่นใหม่ได้ทันที','<b>Needs changes</b> — staff tell you what to fix; fix it and resubmit right away'],
          ['<b>ไม่ผ่าน</b> — ใบสมัครปิดแล้ว ส่งใหม่ไม่ได้ ถ้าคิดว่าผิดพลาด ติดต่อทีมงาน','<b>Not accepted</b> — the application is closed and can’t be resubmitted; contact us if you think it’s a mistake'],
          ['<b>ร้านทดลอง</b> — บางครั้งทีมงานเปิดร้านทดลองให้ลองใช้ Studio ก่อน ลูกค้าทั่วไปยังไม่เห็นร้าน จนกว่าจะผ่านการตรวจจริง','<b>Trial shop</b> — sometimes we open a trial shop so you can try Studio first; customers can’t see it until it passes the full review']])+
      P('<b>เปลี่ยนใจ?</b> ยกเลิกการสมัครได้เองตอนรอตรวจหรือให้แก้ (หน้าสถานะใบสมัคร → <b>ยกเลิกการสมัคร</b>) หรือตอนเป็นร้านทดลอง (Studio → ตั้งค่า) · ระบบลบใบสมัคร รูปเอกสาร และร้านทดลองทันที และปล่อยเลขบัตรคืน สมัครใหม่ได้ภายหลัง · ร้านที่เปิดจริงแล้วหรือใบสมัครที่ไม่ผ่าน ติดต่อทีมงาน',
        '<b>Changed your mind?</b> Cancel the application yourself while it’s waiting or needs changes (application status → <b>Cancel application</b>) or while you have a trial shop (Studio → Settings) · your application, document photos and trial shop are deleted right away and your ID number is released, so you can apply again later · for a live shop or a closed application, contact us')+
    Q('ยืนยันตัวตนอย่างไร ข้อมูลบัตรปลอดภัยไหม','How does identity verification work? Is my ID safe?',
      P('ยืนยันผ่าน Didit (ถ่ายบัตรประชาชนและใบหน้า) หรือให้ทีมงานตรวจบัตรเอง ระหว่างรอตรวจ ใบสมัครและรูปบัตรเก็บแบบเข้ารหัส ทั้งสองทางรูปบัตรและเซลฟี่ถูกลบหลังตรวจเสร็จ (ค้างรอตรวจเกิน 30 วันก็ลบเอง แล้วแจ้งให้ส่งใหม่) เลขบัตรเต็มไม่ถูกเก็บ เหลือแค่แฮชแบบมีกุญแจกับ 3 หลักท้าย (ใช้กันสมัครซ้ำ) ลูกค้าไม่เห็นข้อมูลบัตรของคุณ และไม่มี AI ตัวไหนดูบัตร',
        'Through Didit (photos of your ID card and face) or a manual check by staff. While waiting for review, your application and ID images are stored encrypted. Either way, ID and selfie images are deleted after review (or automatically if the application waits more than 30 days — we’ll ask you to apply again). The full ID number is never stored — only a keyed hash plus its last 3 digits (to prevent duplicate sign-ups). Customers never see your ID details, and no AI looks at ID cards.'))+
    Q('Studio คืออะไร','What is Studio?',
      P('พื้นที่ทำงานของช่าง (<a href="/studio">/studio</a>): <b>งาน</b> (งานที่ต้องทำ และหางานจากประกาศใกล้คุณ) <b>ข้อความ</b> <b>บริการ</b> (ตั้งราคาและรายละเอียด) และ <b>ร้านของฉัน</b> (หน้าร้านที่ลูกค้าเห็น)',
        'The mechanic workspace (<a href="/studio">/studio</a>): <b>Jobs</b> (your to-do and nearby job posts), <b>Messages</b>, <b>Services</b> (prices and details) and <b>My shop</b> (the page customers see).'))+
    Q('ลงบริการให้อยู่หลายหมวด · การ์ดร้านกับ QR','Services in several categories · shop card & QR',
      UL([['ตอนโพสต์บริการ แตะเลือกหมวดได้หลายหมวด (สูงสุด 6 · เฉพาะหมวดที่ผ่านการตรวจทักษะ) ลูกค้าจะเห็นบริการนี้ในทุกหมวดที่เลือก','When posting a service, tap to pick several categories (up to 6, only skill-checked ones) — customers see it under every category you chose'],
          ['Studio › ร้านของฉัน: แตะหรือปัดการ์ดร้านเพื่อพลิกเป็น QR หน้าร้าน ให้ลูกค้าสแกนจากจอได้ทันที (ด้านหลังเป็นพื้นขาวเสมอ สแกนง่ายแม้เปิดโหมดมืด)','Studio › My shop: tap or swipe the shop card to flip it to your storefront QR so customers can scan it straight off the screen (always on white, easy to scan in dark mode)']]))+
    Q('แชร์ตำแหน่งตอนกำลังไปหาลูกค้า','Sharing your location on the way to a customer',
      P('กด <b>กำลังไป</b> ในใบงาน ระบบแชร์ตำแหน่งให้ลูกค้าเห็นบนแผนที่ทุกไม่กี่วินาที มีแถบบอกตลอดว่ากำลังแชร์ และกด <b>หยุด</b> ได้ · หยุดเองเมื่อเริ่มซ่อมหรือยกเลิก เก็บแค่จุดล่าสุด ไม่เก็บเส้นทาง · เบราว์เซอร์ส่งตำแหน่งได้เฉพาะตอนเปิดแอปค้างไว้ — ตั้งมือถือไว้ที่ขาตั้ง ห้ามใช้มือถือขณะขับ','Tap <b>On my way</b> in the job and your location is shared on the customer’s map every few seconds; a bar always shows it’s on, with a <b>Stop</b> button. · It stops on its own when you start the repair or the job is cancelled; only the latest point is kept, never a route. · Browsers can only send location while the app is open — mount the phone and never handle it while driving.'))+
    Q('งานด่วนใน Studio','Urgent jobs in Studio',
      P('ลูกค้าที่รถเสียตอนนี้และกด <b>เรียกช่างด่วน</b> จะขึ้นเป็นงานสีแดงบนสุดใน <b>งาน → ต้องทำต่อ</b> เองภายในไม่กี่วินาทีระหว่างที่เปิด Studio ไว้ ไม่ต้องรีเฟรช — ทั้งงานที่ส่งตรงถึงร้านคุณ และงานด่วนที่ประกาศในรัศมีรับงานของคุณ (ทุกหมวด) · ตั้งสถานะ <b>เปิดรับงาน</b> = มีเสียงเตือนด้วย · เชื่อม LINE ไว้ = ได้การ์ดแจ้งงานด่วนทาง LINE แม้ไม่ได้เปิดแอป · ลูกค้าเลือกร้านอื่นแล้ว หรือผ่านไป 3 ชั่วโมง งานด่วนหายไปเอง',
        'When a broken-down customer taps <b>Urgent call-out</b>, the job appears in red at the top of <b>Jobs → To do</b> within seconds while Studio is open — no refresh needed — whether it was sent to your shop or posted in your radius (any category). · Set <b>Taking jobs</b> to also get an alert sound · Link LINE to get urgent jobs on LINE even when the app is closed · Once the customer picks another shop, or after 3 hours, the urgent job disappears.'))+
    Q('หน้างานใน Studio เรียงอย่างไร','How is the Jobs list in Studio arranged?',
      P('<b>ต้องทำต่อ</b> แบ่งเป็น 3 กลุ่ม: <b>งานด่วน</b> (สีแดง) · <b>รอคุณ</b> (ต้องเสนอราคา นัดแล้ว กำลังไป กำลังซ่อม) · <b>รอลูกค้า</b> (รอตอบราคา รอตรวจรับงาน) ในแต่ละกลุ่มงานที่ขยับล่าสุดอยู่บนสุด · คำขอที่ใกล้หมดอายุบอกเวลาที่เหลือในการ์ด หมดอายุแล้วหายจากรายการเอง ไม่ค้างใน <b>งานที่ผ่านมา</b> (งานด่วน 3 ชม. · คำขอที่ยังไม่เสนอราคาและประกาศ 48 ชม. · ราคาที่ลูกค้ายังไม่ยืนยัน 7 วัน)',
        '<b>To do</b> is split into 3 groups: <b>Urgent</b> (red) · <b>Your turn</b> (quote, booked, on the way, in repair) · <b>Waiting for the customer</b> (quote reply, sign-off). In each group the most recently active job is on top · Requests close to expiring show the time left on the card; expired ones leave the list on their own and don’t pile up under <b>Past jobs</b> (urgent 3 h · unquoted requests and posts 48 h · quotes the customer hasn’t accepted 7 days).'))+
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
      P('แตะกระดิ่งมุมขวาบน (มีทุกหน้า · ในห้องแชตอยู่ข้างปุ่ม ⋮) → <b>เปิด</b> · ตรวจว่าอนุญาตการแจ้งเตือนให้เว็บ Cendon แล้ว · บน iPhone ต้อง “เพิ่มไปยังหน้าจอโฮม” แล้วเปิดจากไอคอนนั้นก่อน (iOS 16.4 ขึ้นไป) จึงจะรับแจ้งเตือนได้ · ทางที่ชัวร์ที่สุดคือเชื่อม LINE',
        'Tap the bell at the top right (on every page · in the chat it sits next to the ⋮ button) → <b>Turn on</b>. · Make sure notifications are allowed for Cendon. · On iPhone you must “Add to Home Screen” and open it from that icon first (iOS 16.4 or later) to receive notifications. · Linking LINE is the most reliable option.'))+
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
