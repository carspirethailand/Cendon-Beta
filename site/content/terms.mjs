/* ข้อกำหนดการใช้งาน — ต้องตรงกับที่แอปทำจริง (เช่น ตอนนี้ไม่มีค่าธรรมเนียม ลูกค้าจ่ายช่างโดยตรง)
   เปิดระบบรับเงิน/เปลี่ยนค่าธรรมเนียม/เปลี่ยนกติกาสปอนเซอร์ → แก้หัวข้อ "ค่าบริการ" และเลื่อนเวอร์ชันก่อนเปิดใช้ แล้วรัน node site/build.mjs */
import {L,P,UL,NOTE,I,docBody,EMAIL,crumbs} from '../layout.mjs';
import {VERSION,EFFECTIVE} from './privacy.mjs';

const sections=[
  {id:'parties',title:['ข้อกำหนดนี้ทำกับใคร','Who these terms are with'],body:
    P('Cendon (“บริการ”) ดำเนินการโดย Car Spire Thailand (“เรา”) การสร้างบัญชีหรือใช้บริการถือว่าคุณยอมรับข้อกำหนดนี้และ<a href="/privacy">นโยบายความเป็นส่วนตัว</a> หากไม่ยอมรับ กรุณาอย่าใช้บริการ',
      'Cendon (“the Service”) is operated by Car Spire Thailand (“we”, “us”). By creating an account or using the Service you accept these terms and our <a href="/privacy">Privacy Policy</a>. If you don’t accept them, please don’t use the Service.')+
    P('หากคุณใช้บริการในนามอู่ ร้าน หรือบริษัท คุณรับรองว่ามีอำนาจยอมรับข้อกำหนดนี้แทนองค์กรนั้น และคำว่า “คุณ” หมายรวมถึงองค์กรนั้น',
      'If you use the Service on behalf of a garage, shop or company, you confirm you’re authorised to accept these terms for it, and “you” includes that organisation.')},

  {id:'what',title:['Cendon คืออะไร และไม่ใช่อะไร','What Cendon is — and isn’t'],body:
    P('Cendon มีสองส่วน: <b>ผู้ช่วย AI</b> ที่ช่วยอธิบายอาการรถ ดูรูปหรือฟังเสียง เช็กใบเสนอราคา และเตือนการดูแลรถ กับ<b>ตลาดช่าง</b> ที่ช่วยให้คุณหา ขอราคา และทำงานกับช่างที่ผ่านการตรวจ',
      'Cendon has two parts: an <b>AI assistant</b> that explains car symptoms, looks at photos or listens to sounds, checks quotes and reminds you about upkeep — and a <b>mechanic marketplace</b> that helps you find, get quotes from and work with checked mechanics.')+
    NOTE('calm','info','Cendon <b>ไม่ใช่อู่และไม่ได้ซ่อมรถเอง</b> งานซ่อมเป็นข้อตกลงระหว่างคุณกับช่างโดยตรง เราเป็นตัวกลางที่ช่วยคัดกรอง จัดระเบียบใบงาน และช่วยดูแลเมื่อมีปัญหา',
      'Cendon <b>is not a garage and does not repair cars</b>. A repair is an agreement directly between you and the mechanic. We’re the platform in between: we screen, keep the job organised, and help when something goes wrong.')},

  {id:'safety',title:['ความปลอดภัย — ข้อนี้ต้องอ่าน','Safety — please read'],body:
    P('ข้อมูลจาก AI เป็นคำอธิบายและการประเมินเบื้องต้น <b>ไม่ใช่ผลตรวจของช่าง</b>',
      'What the AI tells you is an explanation and a first assessment, <b>not a mechanic’s inspection</b>.')+
    UL([
      ['อย่าใช้บริการนี้ตัดสินว่ารถขับได้อย่างปลอดภัยหรือไม่','Don’t use the Service to decide whether a car is safe to drive'],
      ['ถ้า AI กับช่างผู้ชำนาญบอกไม่ตรงกัน ให้เชื่อช่าง','Where the AI and a qualified mechanic disagree, follow the mechanic'],
      ['อย่าใช้แอปขณะขับรถ จอดรถในที่ปลอดภัยก่อน','Don’t use the app while driving — stop somewhere safe first'],
      ['ถ้ามีสัญญาณผิดปกติของเบรก พวงมาลัย ยาง เชื้อเพลิง หรือไฟฟ้า ให้หยุดขับและให้ช่างตรวจ','If brakes, steering, tyres, fuel or electrics seem wrong, stop driving and have the car inspected'],
    ])+
    NOTE('alert','phone','เหตุฉุกเฉิน อุบัติเหตุ หรือมีคนบาดเจ็บ โทร <b>191</b> (ตำรวจ) หรือ <b>1669</b> (การแพทย์ฉุกเฉิน) ก่อนเสมอ — Cendon ไม่ใช่บริการฉุกเฉิน',
      'In an emergency, accident or injury, call <b>191</b> (police) or <b>1669</b> (emergency medical) first — Cendon is not an emergency service.')},

  {id:'account',title:['บัญชีของคุณ','Your account'],body:
    P('คุณต้องมีอายุ 18 ปีขึ้นไป ต้องเข้าสู่ระบบก่อนใช้งาน ด้วย Google หรืออีเมล (รหัสผ่านหรือรหัสทางอีเมล) และ Apple เมื่อเปิดให้ใช้ หนึ่งบัญชีต่อหนึ่งคน คุณรับผิดชอบสิ่งที่เกิดขึ้นในบัญชีและการดูแลการล็อกอินให้ปลอดภัย หากสงสัยว่ามีคนอื่นเข้าบัญชี แจ้งเราโดยเร็ว',
      'You must be 18 or over. You need to sign in to use the app, with Google or email (password or an emailed code), and Apple once it’s available, one account per person. You’re responsible for activity on your account and for keeping your sign-in secure. Tell us promptly if you think someone else has accessed it.')+
    P('กรุณาใส่ข้อมูลตามจริง ข้อมูลรถ เลขไมล์ และประวัติซ่อมบำรุงมีประโยชน์เท่าที่ถูกต้อง ข้อมูลผิดทำให้การแจ้งเตือนผิดตาม',
      'Please keep your details accurate. Car records, mileage and service history are only as useful as they are correct.')},

  {id:'ai',title:['ผู้ช่วย AI','The AI assistant'],body:
    UL([
      ['AI อาจตอบผิด ไม่ครบ หรือไม่ตรงกับรถคันของคุณ ราคาประเมินเป็นค่าประมาณ ไม่ใช่ราคาจริงของอู่','The AI can be wrong, incomplete or not match your exact car. Price estimates are estimates, not a garage’s actual price'],
      ['การใช้ AI มีโควตารายวัน (จำนวนแสดงในแอป) เพื่อให้ทุกคนใช้ได้อย่างทั่วถึง','AI use has a daily quota (shown in the app) so everyone gets a fair share'],
      ['ห้ามนำคำตอบของ AI ไปอ้างว่าเป็นผลตรวจสภาพ ใบรับรอง หรือการประเมินราคาโดยผู้เชี่ยวชาญ','Don’t present AI output as an inspection, certificate or professional valuation'],
      ['ผลฟังเสียงเครื่อง สแกนห้องเครื่อง และสรุปอุบัติเหตุเป็นการประเมินเบื้องต้นจาก AI ไม่ใช่การวินิจฉัยหรือรายงานทางการ · สรุปอุบัติเหตุเป็นร่างช่วยเรียบเรียง คุณต้องตรวจทานความถูกต้องก่อนส่งให้ประกันหรือเจ้าหน้าที่ และ AI ไม่ได้ตัดสินว่าใครผิด','Engine listening, engine-bay scans and accident summaries are first assessments by AI, not a diagnosis or an official report · an accident summary is a draft to help you write; check it before sending it to an insurer or the authorities — the AI doesn’t decide who was at fault'],
      ['วิธีที่เราส่งข้อมูลให้ผู้ให้บริการ AI อธิบายไว้ใน<a href="/privacy#ai">นโยบายความเป็นส่วนตัว หัวข้อ AI</a>','How we send data to AI providers is explained in the <a href="/privacy#ai">AI section of the Privacy Policy</a>'],
    ])},

  {id:'hiring',title:['การจ้างช่างผ่าน Cendon','Hiring a mechanic through Cendon'],body:
    P('ขั้นตอนในแอปออกแบบให้ทั้งสองฝ่ายรู้ราคาและขอบเขตงานก่อนเริ่ม:',
      'The flow in the app is designed so both sides know the price and scope before work starts:')+
    UL([
      ['<b>ขอราคา</b> — จากร้านเดียว หลายร้านแล้วเทียบ เรียกช่างด่วน หรือประกาศหาช่างให้ช่างแถวนั้นเสนอราคา','<b>Ask for a price</b> — from one shop, several to compare, an urgent call-out, or a public job post for nearby mechanics to quote on'],
      ['<b>Cendon Valet</b> — ถ้าคุณอนุญาต AI จะเสนอการ์ดคำสั่งในแอป ทั้งในแชตและระหว่างโทร (เรียกช่างด่วน ประกาศหาช่าง ขอราคา ทักร้าน รับราคา ยกเลิกหรือปิดงาน จดสมุดรถ ฯลฯ) สิ่งที่เปลี่ยนข้อมูลหรือส่งถึงคนอื่นเกิดขึ้นเมื่อคุณยืนยันเท่านั้น (กดในการ์ด หรือพูดยืนยันหลังได้ยินสรุปในสาย) และมีผลเหมือนคุณทำเองในแอป — เช่น รับราคาผ่าน Valet คือการตกลงนัดช่างตามใบเสนอราคานั้น โปรดตรวจรายละเอียดก่อนยืนยันทุกครั้ง · Valet ไม่ลบข้อมูล ไม่เปลี่ยนรหัสผ่าน และไม่ชำระเงินแทนคุณ','<b>Cendon Valet</b> — if you allow it, the AI proposes action cards in the app, in chat and during calls (urgent call-outs, job posts, quote requests, messaging shops, accepting, cancelling or closing jobs, logbook entries and so on). Anything that changes your data or reaches someone else happens only when you confirm (on the card, or by saying so after hearing the summary on a call) and counts as if you did it yourself — e.g. accepting a quote through Valet books that mechanic on that quote. Please check the details each time · Valet never deletes data, changes passwords or pays on your behalf'],
      ['<b>อายุคำขอ</b> — งานด่วน 3 ชั่วโมง · คำขอที่ร้านยังไม่เสนอราคา และประกาศหาช่าง 48 ชั่วโมง · ราคาที่เสนอแล้วแต่ยังไม่ยืนยัน 7 วัน หมดเวลาแล้วระบบยกเลิกให้ทั้งสองฝ่าย ส่งคำขอใหม่ได้เสมอ','<b>Request lifetime</b> — urgent call-outs 3 hours · requests not yet priced and job posts 48 hours · quotes not yet accepted 7 days. After that the system cancels it for both sides; you can always send a new one'],
      ['<b>ยืนยันราคา</b> — ราคาที่คุณกดยืนยันคือราคาที่ตกลงกัน แก้ย้อนหลังไม่ได้ เบอร์และที่อยู่ของคุณเปิดให้ช่างหลังขั้นนี้เท่านั้น','<b>Accept the price</b> — the price you accept is the agreed price and can’t be changed afterwards. Your phone and address are shared with the mechanic only from this point'],
      ['<b>รหัสเริ่มงาน</b> — ช่างต้องใส่รหัสจากคุณก่อนเริ่มงาน เพื่อยืนยันว่าเจอกันจริง','<b>Start code</b> — the mechanic enters a code from you before starting, confirming you’ve actually met'],
      ['<b>งานเพิ่ม</b> — ถ้าระหว่างทำต้องซ่อมเพิ่ม ช่างต้องเสนอในแอปและคุณต้องกดยอมรับก่อน ไม่ยอมรับ = ไม่ต้องจ่ายส่วนนั้น','<b>Extra work</b> — anything extra must be proposed in the app and accepted by you first. If you don’t accept it, you don’t pay for it'],
      ['<b>ปิดงานและจ่ายเงิน</b> — ตอนนี้คุณจ่ายเงินให้ช่างโดยตรงเมื่องานเสร็จ ตามราคาในใบงาน Cendon ยังไม่ได้รับหรือถือเงินแทนใคร','<b>Finish and pay</b> — for now you pay the mechanic directly when the job is done, at the price in the job. Cendon does not take or hold payments'],
      ['<b>รีวิว</b> — ให้คะแนนจากงานที่ทำจริง','<b>Review</b> — rate the job you actually had done'],
    ])+
    P('มีปัญหา (งานไม่ตรงที่ตกลง เรียกเก็บเกิน ช่างไม่มา ฯลฯ) กด <b>แจ้งปัญหา</b> ในใบงาน ทีมงานจะดูหลักฐานในใบงาน (ราคา ข้อความ รูปก่อน/หลัง) และตัดสินอย่างเป็นธรรม เราอาจระงับร้านที่ทำผิดกติกา แต่เราไม่ใช่คู่สัญญาของงานซ่อม และไม่ได้รับประกันผลงานของช่าง สิทธิของคุณตามกฎหมายคุ้มครองผู้บริโภคต่อช่างยังคงอยู่ครบ',
      'If something goes wrong (work not as agreed, overcharging, no-show and so on), tap <b>Report a problem</b> in the job. Staff review the evidence in the job — price, messages, before/after photos — and decide fairly. We may suspend shops that break the rules, but we are not a party to the repair and don’t guarantee a mechanic’s work. Your consumer-law rights against the mechanic remain in full.')},

  {id:'mechanics',title:['สำหรับช่างและร้าน','For mechanics and shops'],body:
    UL([
      ['สมัครผ่านแอป ทีมงานตรวจทุกใบก่อนอนุมัติ รวมถึงยืนยันตัวตน (ผ่าน Didit หรือทีมงานตรวจบัตรเองแล้วลบรูปทันที) — ป้ายการตรวจสอบบอกเฉพาะสิ่งที่ตรวจแล้วจริง','Apply in the app. Staff check every application before approval, including identity (via Didit, or staff check the ID and delete the images straight away). Check badges show only what was actually verified'],
      ['ข้อมูลร้าน บริการ ราคา และรูปผลงานต้องเป็นของจริงและเป็นของคุณ','Shop details, services, prices and work photos must be real and your own'],
      ['ทำตามราคาที่ลูกค้ายืนยันแล้ว งานเพิ่มต้องเสนอในแอปและรอลูกค้ายอมรับ','Honour the accepted price. Extra work must be proposed in the app and accepted by the customer'],
      ['เมื่อกด “กำลังไป” ตำแหน่งของคุณจะแสดงให้ลูกค้าของงานนั้น (และคนที่ลูกค้าแชร์ลิงก์ติดตามงานให้) เห็นจนกว่าจะเริ่มซ่อมหรือคุณกดหยุด · ห้ามใช้มือถือขณะขับรถ','When you tap “On my way”, your location is shown to that job’s customer (and anyone they shared the job link with) until the repair starts or you stop it · never handle your phone while driving'],
      ['ใช้ข้อมูลลูกค้า (ชื่อ เบอร์ ที่อยู่ ตำแหน่ง) <b>เฉพาะเพื่องานนั้น</b> ห้ามเก็บไว้ใช้ทำการตลาด ขายต่อ หรือติดต่อเรื่องอื่น — คุณมีหน้าที่ดูแลข้อมูลนั้นตาม PDPA เช่นกัน','Use customer data (name, phone, address, location) <b>only for that job</b> — never for marketing, resale or unrelated contact. You are responsible for that data under the PDPA too'],
      ['ห้ามรีวิวปลอม ห้ามกดดันลูกค้าให้รีวิว และห้ามชวนลูกค้าเลี่ยงขั้นตอนความปลอดภัยของแอป','No fake reviews, no pressuring customers for reviews, and no steering customers around the app’s safety steps'],
      ['เราอาจระงับร้านชั่วคราวหรือถาวรเมื่อมีการร้องเรียนที่มีหลักฐาน ข้อมูลไม่จริง หรือทำผิดกติกา','We may suspend a shop temporarily or permanently for evidenced complaints, false information or rule-breaking'],
    ])},

  {id:'fees',title:['ค่าบริการ','Fees'],body:
    NOTE('ok','wallet','<b>ตอนนี้ Cendon ฟรี</b> — ไม่มีแพ็กเกจเสียเงิน ไม่เก็บค่าสมัครหรือค่าธรรมเนียมจากช่าง และลูกค้าจ่ายช่างโดยตรง',
      '<b>Cendon is free right now</b> — there are no paid plans, no sign-up fees or commissions for mechanics, and customers pay mechanics directly.')+
    UL([
      ['<b>สปอนเซอร์บริการ</b> (สำหรับช่าง) อยู่ในช่วงทดลองฟรี เลือกได้ 3, 7 หรือ 14 วัน ต่อได้รวมไม่เกิน 30 วันล่วงหน้า หยุดเองได้ทุกเมื่อ','<b>Sponsored services</b> (for mechanics) are in a free trial: 3, 7 or 14 days, extendable up to 30 days ahead, and you can stop anytime'],
      ['บริการที่สปอนเซอร์มีป้าย “สปอนเซอร์” บอกลูกค้าชัดเจนเสมอ และขึ้นต้นรายการได้ไม่เกิน 2 บริการต่อแถว — ลำดับอื่นไม่ได้ขึ้นกับการจ่ายเงิน','Sponsored services always carry a clear “Sponsored” label and at most 2 can lead a row — no other ordering depends on payment'],
      ['ถ้าในอนาคตจะเริ่มเก็บเงินสำหรับอะไรก็ตาม เราจะแจ้งล่วงหน้า แสดงราคาก่อนเก็บทุกครั้ง ต้องได้รับความยินยอมจากคุณก่อน และไม่ต่ออายุอัตโนมัติโดยที่คุณไม่ได้เลือก','If we ever start charging for anything, we’ll tell you in advance, show the price before every charge, ask for your consent first, and never auto-renew unless you choose to'],
    ])},

  {id:'reviews',title:['รีวิวและสิ่งที่คุณโพสต์','Reviews and what you post'],body:
    P('รีวิวต้องมาจากประสบการณ์จริงและสุภาพ รีวิวแสดงต่อสาธารณะโดยไม่มีชื่อของคุณ เราอาจซ่อนหรือลบรีวิว ข้อความ หรือรูปที่ปลอม หยาบคาย มีข้อมูลส่วนตัวของผู้อื่น หรือผิดกฎหมาย',
      'Reviews must reflect a real experience and stay civil. They’re shown publicly without your name. We may hide or remove reviews, messages or photos that are fake, abusive, expose someone else’s personal data, or are unlawful.')},

  {id:'use',title:['การใช้งานที่ยอมรับได้','Acceptable use'],body:
    P('คุณตกลงว่าจะไม่:','You agree not to:')+
    UL([
      ['ใช้บริการทำสิ่งผิดกฎหมาย หลอกลวง หรือละเมิดสิทธิของผู้อื่น','use the Service for anything unlawful or deceptive, or to infringe anyone’s rights'],
      ['คุกคาม ข่มขู่ หรือรบกวนช่าง ลูกค้า หรือทีมงาน','harass, threaten or abuse mechanics, customers or staff'],
      ['อัปโหลดเนื้อหาที่คุณไม่มีสิทธิ หรือข้อมูลส่วนตัวของคนอื่นโดยไม่ได้รับอนุญาต','upload content you have no right to, or other people’s personal data without permission'],
      ['พยายามเข้าถึงบัญชี ข้อมูล หรือระบบที่ไม่ใช่ของคุณ สแกนหาช่องโหว่ หรือสร้างภาระเกินควรให้ระบบ','try to access accounts, data or systems that aren’t yours, probe for vulnerabilities, or overload the Service'],
      ['ดึงข้อมูลอัตโนมัติ ขายต่อ หรือนำผลลัพธ์ไปทำบริการแข่งหรือฝึกโมเดลแข่ง','scrape, resell, or use the output to build a competing service or train a competing model'],
      ['สร้างหลายบัญชีเพื่อเลี่ยงโควตา การระงับ หรือกติกา','create multiple accounts to dodge quotas, suspensions or rules'],
    ])+
    P('เราอาจระงับหรือปิดบัญชีที่ฝ่าฝืน และจะแจ้งเหตุผลเท่าที่ทำได้',
      'We may suspend or close accounts that break these rules, and will tell you why where we reasonably can.')},

  {id:'content',title:['เนื้อหาและข้อมูลของคุณ','Your content and data'],body:
    P('สิ่งที่คุณใส่เข้ามา — ข้อมูลรถ รูป เสียง เอกสาร ข้อความ — ยังเป็นของคุณ คุณให้สิทธิเราแบบจำกัดในการจัดเก็บ ประมวลผล และแสดงผล เพื่อให้บริการแก่คุณเท่านั้น (รวมถึงส่งให้ผู้ให้บริการ AI และส่งให้ช่างที่คุณเลือก ตามนโยบายความเป็นส่วนตัว) สิทธินี้สิ้นสุดเมื่อคุณลบเนื้อหาหรือลบบัญชี ยกเว้นส่วนที่ต้องเก็บเป็นหลักฐานของงานที่ทำกับอีกฝ่าย ตามที่อธิบายใน<a href="/privacy#retention">นโยบาย</a>',
      'What you put in — car records, photos, audio, documents, messages — stays yours. You give us a limited licence to store, process and display it only to provide the Service to you (including sending it to AI providers and to mechanics you choose, as the Privacy Policy describes). The licence ends when you delete the content or your account, except for what must be kept as a record of a job with someone else, as explained in the <a href="/privacy#retention">policy</a>.')+
    P('ดาวน์โหลดข้อมูลทั้งหมด หรือลบบัญชีถาวร ได้เองที่ โปรไฟล์ → บัญชีและความปลอดภัย · เราไม่ขายเนื้อหาของคุณ และไม่ใช้ยิงโฆษณา',
      'Download everything, or delete your account for good, at Profile → Account and safety. · We don’t sell your content or use it for advertising.')+
    P('<b>Car Passport:</b> ข้อมูลที่คุณบันทึกเองและเปิดให้คนอื่นดูต้องเป็นความจริง ห้ามแก้เลขไมล์หรือใส่ประวัติซ่อมปลอมเพื่อหลอกผู้ซื้อ — เราอาจปิดลิงก์และระงับบัญชีที่ทำเช่นนั้น · ป้าย “ยืนยันโดยร้าน” ยืนยันว่างานนั้นทำผ่าน Cendon เท่านั้น ไม่ใช่การรับรองสภาพรถ',
      '<b>Car Passport:</b> anything you record yourself and choose to share must be true. Don’t alter mileage or add fake service history to mislead buyers — we may turn off the link and suspend accounts that do. · A “Shop-verified” badge only confirms the job was done through Cendon; it is not a certification of the car’s condition.')},

  {id:'ours',title:['เนื้อหาของเรา','Our content'],body:
    P('ตัวบริการ ซอฟต์แวร์ งานออกแบบ ฟอนต์ Spire09 ชื่อ Cendon และโลโก้ เป็นของเราหรือผู้ให้สิทธิแก่เรา ข้อกำหนดนี้ไม่ได้โอนสิทธิเหล่านั้นให้คุณ แต่คุณนำผลลัพธ์จากบริการไปใช้เพื่อตัวเองได้ เช่น ให้อู่หรือบริษัทประกันดู',
      'The Service, its software, design, the Spire09 typeface, the Cendon name and logo belong to us or our licensors. These terms don’t transfer them to you, but you may use the Service’s output for your own purposes — showing it to a garage or insurer, for example.')},

  {id:'third',title:['บริการและลิงก์ของบุคคลภายนอก','Third-party services and links'],body:
    P('แอปมีลิงก์ไปร้านอะไหล่ ตลาดออนไลน์ แผนที่ และเว็บอื่น และแสดงราคาประมาณจากแหล่งสาธารณะ เราไม่ได้ขายอะไหล่ ไม่ได้ควบคุมเว็บเหล่านั้น และไม่รับผิดชอบเนื้อหา ราคา หรือเงื่อนไขของเขา การซื้อเป็นสัญญาระหว่างคุณกับผู้ขาย',
      'The app links to parts shops, marketplaces, maps and other sites, and shows estimated prices from public sources. We don’t sell parts, don’t control those sites and aren’t responsible for their content, prices or terms. Any purchase is between you and the seller.')+
    P('การที่ร้านหรือสินค้าปรากฏในแอปไม่ใช่การรับรองจากเรา รายการที่ได้รับการสปอนเซอร์มีป้ายกำกับเสมอ (ดูหัวข้อค่าบริการ)',
      'A shop or product appearing in the app is not an endorsement. Sponsored listings are always labelled (see Fees).')},

  {id:'line',title:['LINE','LINE'],body:
    P('คุณเชื่อมบัญชี Cendon กับ LINE ได้เพื่อรับแจ้งเตือนงานและคุยกับ AI ในแชต LINE การใช้ LINE อยู่ภายใต้ข้อกำหนดของ LINE ด้วย แชต AI ใน LINE มีโควตารายวันแยก และยกเลิกการเชื่อมได้ทุกเมื่อในแอป',
      'You can link your Cendon account to LINE to get job notifications and chat with the AI in LINE. LINE’s own terms also apply. AI chat in LINE has its own daily quota, and you can unlink anytime in the app.')},

  {id:'availability',title:['ความพร้อมใช้งานและการเปลี่ยนแปลง','Availability and changes'],body:
    P('เราตั้งใจให้บริการทำงานต่อเนื่อง แต่ไม่รับประกันว่าจะไม่สะดุดหรือไม่มีข้อผิดพลาด เราอาจเพิ่ม เปลี่ยน หรือเลิกฟีเจอร์ ถ้าเลิกฟีเจอร์ที่คุณใช้อยู่หรือยุติบริการ เราจะแจ้งล่วงหน้าตามสมควรและให้คุณดาวน์โหลดข้อมูลออกไปได้',
      'We aim to keep the Service running but can’t promise it will be uninterrupted or error-free. We may add, change or remove features. If we remove one you rely on, or close the Service, we’ll give reasonable notice and a way to download your data.')},

  {id:'liability',title:['การรับประกันและความรับผิด','Warranties and liability'],body:
    P('บริการให้ “ตามสภาพที่เป็นอยู่” และ “ตามที่มีให้ใช้” เท่าที่กฎหมายอนุญาต เราไม่รับประกันโดยปริยายเรื่องความเหมาะสมเชิงพาณิชย์ ความเหมาะสมกับวัตถุประสงค์เฉพาะ หรือการไม่ละเมิดสิทธิ',
      'The Service is provided “as is” and “as available”. To the extent the law allows, we exclude implied warranties of merchantability, fitness for a particular purpose and non-infringement.')+
    P('เท่าที่กฎหมายอนุญาต เราไม่รับผิดต่อความเสียหายทางอ้อมหรือสืบเนื่อง การสูญเสียกำไรหรือข้อมูล ความเสียหายหรือค่าซ่อมรถจากการเชื่อ AI แทนการตรวจของช่าง หรือผลงานของช่างที่คุณจ้าง ความรับผิดรวมของเราต่อข้อเรียกร้องใด ๆ ไม่เกินจำนวนที่คุณจ่ายให้เราใน 12 เดือนก่อนเกิดเหตุ หรือ 1,000 บาท แล้วแต่จำนวนใดสูงกว่า',
      'To the extent the law allows, we’re not liable for indirect or consequential loss, lost profit or data, vehicle damage or repair costs from relying on the AI instead of an inspection, or for the work of a mechanic you hire. Our total liability for any claim is limited to the greater of what you paid us in the 12 months before the claim, or THB 1,000.')+
    P('ไม่มีข้อใดในข้อกำหนดนี้จำกัดความรับผิดที่กฎหมายห้ามจำกัด เช่น การเสียชีวิตหรือบาดเจ็บจากความประมาทเลินเล่อ หรือการฉ้อฉล และหากคุณเป็นผู้บริโภค คุณยังมีสิทธิครบตามกฎหมายคุ้มครองผู้บริโภคของไทย',
      'Nothing in these terms limits liability that can’t legally be limited, such as death or injury caused by negligence, or fraud. If you’re a consumer, you keep all your rights under Thai consumer protection law.')},

  {id:'ending',title:['การระงับและการเลิกใช้','Suspension and ending'],body:
    P('คุณเลิกใช้และลบบัญชีถาวรได้เองทุกเมื่อในแอป (ถ้ามีงานซ่อมที่ยังไม่จบ ต้องปิดหรือยกเลิกก่อน เพื่อไม่ให้อีกฝ่ายเสียหาย) เราอาจระงับหรือยุติการเข้าถึงหากคุณฝ่าฝืนข้อกำหนดนี้ในสาระสำคัญ เมื่อกฎหมายกำหนด หรือเมื่อการให้บริการต่อจะเกิดความเสี่ยงด้านความปลอดภัยหรือกฎหมาย หัวข้อ 11, 12, 16 และ 19 ยังมีผลหลังเลิกใช้',
      'You can stop using the Service and delete your account yourself, anytime, in the app (finish or cancel any repair in progress first, so the other side isn’t left stranded). We may suspend or end your access if you materially breach these terms, if the law requires it, or if continuing would create a security or legal risk. Sections 11, 12, 16 and 19 survive.')},

  {id:'changes',title:['การแก้ไขข้อกำหนด','Changes to these terms'],body:
    P('เราอาจปรับข้อกำหนดนี้ให้ตรงกับบริการ ถ้าเป็นการเปลี่ยนสาระสำคัญ เราจะแจ้งในแอปก่อนมีผล และเลขเวอร์ชันกับวันที่ด้านบนจะเปลี่ยน การใช้บริการต่อหลังวันมีผลถือว่ายอมรับฉบับใหม่',
      'We may update these terms to match the Service. Material changes are announced in the app before they take effect, and the version and date at the top will change. Continuing to use the Service after that date means you accept the new version.')+
    UL([
      ['<b>1.1 · 15 ต.ค. 2569</b> — เพิ่มตลาดช่าง (ขั้นตอนใบงาน ข้อพิพาท หน้าที่ของช่าง) สปอนเซอร์ LINE เหตุฉุกเฉิน ระบุชัดว่าตอนนี้ไม่มีค่าบริการ และลบบัญชีเองได้ในแอป','<b>1.1 · 15 Oct 2026</b> — added the mechanic marketplace (job flow, disputes, mechanics’ duties), sponsorship, LINE and emergencies; made clear there are no fees today; self-service account deletion'],
      ['<b>1.0 · 1 ส.ค. 2569</b> — ฉบับแรก','<b>1.0 · 1 Aug 2026</b> — first version'],
    ])},

  {id:'law',title:['กฎหมายที่ใช้บังคับ','Governing law'],body:
    P('ข้อกำหนดนี้อยู่ภายใต้กฎหมายไทย และให้ศาลไทยมีเขตอำนาจ หากคุณเป็นผู้บริโภคที่อยู่ประเทศอื่น ข้อนี้ไม่ตัดความคุ้มครองตามกฎหมายบังคับของประเทศที่คุณอยู่',
      'These terms are governed by Thai law and Thai courts have jurisdiction. If you’re a consumer living elsewhere, this doesn’t remove the protection of the mandatory law where you live.')},

  {id:'contact',title:['ติดต่อ','Contact'],body:
    `<div class="contact">
<a href="mailto:${EMAIL}">${I.mail}<b>${L('อีเมล','Email')}</b><span>${EMAIL}</span></a>
<a href="/help">${I.help}<b>${L('ศูนย์ช่วยเหลือ','Help centre')}</b><span>${L('คำถามที่พบบ่อยและวิธีใช้','FAQs and how-tos')}</span></a>
<a href="/privacy">${I.shield}<b>${L('ความเป็นส่วนตัว','Privacy')}</b><span>${L('ข้อมูลของคุณ เราดูแลอย่างไร','How we look after your data')}</span></a>
</div>`+
    P('เราตั้งใจตอบภายใน 2 วันทำการ','We aim to reply within two business days.')},
];

export default {
  key:'terms',path:'/terms',file:'terms.html',
  ld:[crumbs('ข้อกำหนดการใช้งาน','/terms')],
  title:['ข้อกำหนดการใช้งาน · Cendon','Terms of Service · Cendon'],
  desc:['ข้อตกลงระหว่างคุณกับ Car Spire Thailand เมื่อใช้ Cendon: ผู้ช่วย AI ตลาดช่าง ความปลอดภัย และสิทธิของคุณ','The agreement between you and Car Spire Thailand when you use Cendon: the AI assistant, the mechanic marketplace, safety and your rights.'],
  doc:true,
  body:docBody({
    eyebrow:['ข้อตกลง','Legal'],
    h1:['ข้อกำหนดการใช้งาน','Terms of Service'],
    lead:['ข้อตกลงระหว่างคุณกับ Car Spire Thailand เมื่อใช้ Cendon — เขียนให้อ่านเข้าใจง่าย และตรงกับที่แอปทำจริง','The agreement between you and Car Spire Thailand when you use Cendon — written to be understood, and to match what the app really does.'],
    meta:[['clock',`มีผล ${EFFECTIVE[0]}`,`Effective ${EFFECTIVE[1]}`],['terms',`เวอร์ชัน ${VERSION}`,`Version ${VERSION}`],['scale','กฎหมายไทย','Thai law']],
    summary:{title:['สรุปสั้น ๆ','In short'],items:[
      ['AI ช่วยอธิบาย แต่ไม่ใช่ช่าง — เรื่องความปลอดภัยให้เชื่อช่างเสมอ','The AI explains things, but it isn’t a mechanic — on safety, always follow the mechanic'],
      ['งานซ่อมเป็นข้อตกลงระหว่างคุณกับช่าง ราคาที่ยืนยันแล้วแก้ย้อนหลังไม่ได้ งานเพิ่มต้องให้คุณกดยอมรับ','A repair is between you and the mechanic; an accepted price can’t change, and extra work needs your OK'],
      ['ตอนนี้ฟรี ไม่มีค่าธรรมเนียม ลูกค้าจ่ายช่างโดยตรง','It’s free right now — no fees, and customers pay mechanics directly'],
      ['ข้อมูลของคุณเป็นของคุณ ดาวน์โหลดหรือลบได้เอง','Your data is yours — download or delete it yourself'],
      ['หากสรุปนี้ขัดกับฉบับเต็ม ให้ยึดฉบับเต็ม','If this summary conflicts with the full terms, the full terms win'],
    ]},
    sections,
  }),
};
