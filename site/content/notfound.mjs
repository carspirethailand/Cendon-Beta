/* หน้า 404: ที่อยู่ที่ไม่มีอยู่จริงต้องตอบ 404 (ไม่ใช่ส่งหน้าแอปกลับไปพร้อม 200 — Google จะมองว่าเป็น "soft 404" และเสียเครดิตเว็บ)
   Cloudflare Pages ใช้ไฟล์ 404.html ที่รากเว็บเองเมื่อมี · ที่อยู่ลึกของแอปทั้งหมดอยู่ใน _redirects แล้ว จึงไม่กระทบ */
import {L,P} from '../layout.mjs';

const body=`<section class="doc-head nf"><div class="wrap">
<div class="eyebrow">${L('404','404')}</div>
<h1>${L('ไม่พบหน้านี้','Page not found')}</h1>
${P('ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกย้ายไปแล้ว','The link may be mistyped, or the page has moved.','lead')}
<p style="margin-top:22px"><a class="btn ink" href="/">${L('เปิดแอป Cendon','Open the Cendon app')}</a></p>
<p style="margin-top:14px"><a href="/about">${L('เกี่ยวกับ Cendon','About Cendon')}</a> · <a href="/help">${L('ศูนย์ช่วยเหลือ','Help centre')}</a></p>
</div></section>`;

export default {
  key:'notfound',path:'/404',file:'404.html',index:false,
  title:['ไม่พบหน้านี้ · Cendon','Page not found · Cendon'],
  desc:['ไม่พบหน้าที่คุณเปิด กลับไปหน้าแรกของ Cendon ได้','The page you opened does not exist. Head back to Cendon.'],
  body,
};
