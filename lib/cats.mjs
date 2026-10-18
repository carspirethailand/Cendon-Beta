/* หมวดช่างที่มีหน้าสาธารณะ (/category/<k>) — ใช้ร่วมกันทั้งตอนสร้างเว็บ (ลิงก์ส่วนท้าย) และ Pages Functions (หน้าหมวด หน้าร้าน แผนผังเว็บ)
   ชื่อเขียนแบบที่คนพิมพ์ค้นจริง · คำโปรยเป็นข้อเท็จจริงทั่วไป ไม่อ้างตัวเลขหรือคำรับประกันที่ระบบไม่ได้ทำ
   has(t) = ร้านนี้อยู่ในหมวดไหม (ตามหมวดที่ร้านผ่านการตรวจ/เลือกรับ) */
export const CATS=[
  {k:'air',th:'ช่างแอร์รถยนต์',en:'Car air-con mechanics',short:['แอร์รถยนต์','Air-con'],subs:['air','air-clean'],
    intro:['แอร์ไม่เย็น มีกลิ่นอับ ลมออกน้อย หรือคอมแอร์มีเสียง — ร้านในหน้านี้รับงานแอร์รถยนต์ เช่น ล้างแอร์ เติมน้ำยา เปลี่ยนคอมเพรสเซอร์',
      'Air-con not cold, musty smell, weak airflow or a noisy compressor — these shops handle car air-con work such as cleaning, refrigerant top-ups and compressor replacement.']},
  {k:'eng',th:'ช่างเครื่องยนต์',en:'Engine mechanics',short:['เครื่องยนต์','Engine'],subs:['eng','oil','service','gear','cool','exhaust'],
    intro:['เครื่องสะดุด สตาร์ทติดยาก ไฟเตือนเครื่องยนต์ขึ้น หรือถึงรอบเช็กระยะ เปลี่ยนน้ำมันเครื่อง เกียร์ หม้อน้ำ ท่อไอเสีย',
      'Rough idle, hard starts, an engine warning light, or a due service — oil changes, gearbox, cooling system and exhaust work.']},
  {k:'tyre',th:'ร้านยาง ช่วงล่าง เบรก',en:'Tyres, suspension & brakes',short:['ยาง ช่วงล่าง','Tyres'],subs:['tyre','brake','susp','align'],
    intro:['ยางรั่ว ยางสึก เบรกมีเสียง พวงมาลัยสั่น ช่วงล่างดัง — เปลี่ยนยาง ปะยาง ผ้าเบรก โช้คอัพ ตั้งศูนย์ถ่วงล้อ',
      'Flat or worn tyres, noisy brakes, a shaking wheel, knocking suspension — tyres, puncture repair, brake pads, shocks, alignment and balancing.']},
  {k:'ev',th:'ช่างไฟรถยนต์ และรถ EV',en:'Auto electrical & EV',short:['ระบบไฟ EV','Electrical & EV'],subs:['ev','battery','audio'],
    intro:['แบตเตอรี่หมด ไฟรถผิดปกติ ระบบไฟรถไฟฟ้า เครื่องเสียงและกล้องติดรถ — ร้านที่รับงานไฟฟ้ารถยนต์และรถ EV',
      'Flat battery, electrical faults, EV systems, audio and dash cams — shops that take on auto electrical and EV work.']},
  {k:'body',th:'อู่เคาะ พ่นสี ขัดเคลือบ',en:'Body, paint & detailing',short:['เคาะ พ่นสี','Body & paint'],subs:['body','detail','glass','wash'],
    intro:['รอยบุบ รอยขีดข่วน ทำสี ขัดเคลือบเงา กระจก ฟิล์ม และล้างรถ',
      'Dents, scratches, paintwork, polishing and coating, glass, tint and car washing.']},
  {k:'mobile',th:'ช่างนอกสถานที่ มาซ่อมถึงที่',en:'Mobile mechanics',short:['ช่างมาถึงที่','Mobile'],subs:['mobile','tow'],
    intro:['รถเสียที่บ้าน ที่ทำงาน หรือริมถนน — ร้านที่ออกไปซ่อมถึงที่ รวมถึงรถยกลากรถ',
      'Broken down at home, at work or by the road — shops that come to you, including tow trucks.']},
];
export const catOf=k=>CATS.find(c=>c.k===k)||null;
/* ร้านอยู่หมวดนี้ไหม: หมวดหลักที่ร้านรับ (ช่างมาถึงที่ = ร้านที่ออกนอกสถานที่) */
export const shopIn=(t,k)=>k==='mobile'?!!(t&&t.mobile):!!(t&&(t.cats||[]).includes(k));
/* บริการอยู่หมวดนี้ไหม (บริการเลือกได้หลายหมวดย่อย) */
export const gigIn=(g,k)=>{const c=catOf(k);return !!(c&&(g.cats||[]).some(x=>c.subs.includes(x)))};
