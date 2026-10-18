/* ต้องเข้าสู่ระบบก่อนใช้แอป: ยังไม่ได้ล็อกอินในเบราว์เซอร์นี้ → ไปหน้าเข้าสู่ระบบทันที ก่อนหน้าแอปจะวาด (ไม่เห็นหน้าแอปแวบ)
   เปิดได้โดยไม่ต้องล็อกอิน: ลิงก์ใบงานที่แชร์ให้คนที่ไว้ใจ (/trip/… หรือ ?trip=) · หน้านโยบาย/ช่วยเหลือ/เกี่ยวกับ และ Car Passport ไม่ได้โหลดไฟล์นี้
   ป้าย cendon_signed เป็นแค่คำใบ้ให้ไม่ต้องรอ Firebase — ตัวตัดสินจริงคือ account.js ตอน Firebase ตอบว่าไม่มีผู้ใช้ (พาไปหน้าเข้าสู่ระบบเหมือนกัน) */
(function(W,D){
  try{
    var L=W.location,p=L.pathname;
    if(/^\/trip\//.test(p)||/[?&]trip=/.test(L.search)||/^\/login(?:\.html)?\/?$/.test(p))return;
    if(W.localStorage.getItem('cendon_signed')==='1'){
      /* ล็อกอินไว้ก่อนมีคุกกี้คู่กัน → ตั้งให้ครั้งเดียว (หน้าร้านสาธารณะจะได้ส่งหน้าแอปให้คนที่ล็อกอินอยู่) */
      if(!/(?:^|; )cendon_signed=1/.test(D.cookie))D.cookie='cendon_signed=1; max-age=31536000; path=/; samesite=lax'+(L.protocol==='https:'?'; secure':'');
      return;
    }
    var h=D.documentElement;h.style.background='#0b0b0c';h.style.visibility='hidden';
    L.replace('/login?next='+encodeURIComponent(p+L.search+L.hash));
  }catch(e){}
})(window,document);
