/* ════════════════════════════════════════════════════════════════════
   Cendon Home — หน้าหลักโครงใหม่ สำหรับเปิดทุกวัน
   เปิดแอปมาแล้วต้องรู้ 3 อย่างภายในหนึ่งวินาที:
     1) รถของฉันเป็นยังไงวันนี้   (การ์ดรถใหญ่ด้านบน)
     2) อยากถามอะไร ถามได้เลย     (ช่องถาม AI อยู่ใต้รถ ไม่ต้องหา)
     3) สิ่งที่ทำบ่อย กดได้ทันที    (ปุ่มลัดสี่อย่าง + แชตล่าสุด)
   ของเดิม (ห้องนักบิน/แดชบอร์ด) ยังอยู่ในหน้าแต่ซ่อนไว้ — ปุ่มลัดเรียกเครื่องมือเดิมผ่านมัน
   จึงไม่ต้องเขียนเครื่องมือใหม่ และไม่มีอะไรหาย
   ════════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
var D=document,$=function(id){return D.getElementById(id)};
function rd(k,d){try{var v=JSON.parse(localStorage.getItem("spire_"+k));return v==null?d:v}catch(e){return d}}
function en(){return (rd("lang","th")||"th")==="en"}
function T(th,e){return en()?e:th}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}

var CSS=`
body.ch-on #v-home>.scroll>*:not(#chHome):not(#mnav){display:none!important}
body.ch-on #v-home>.scroll{scroll-snap-type:none!important}
body.ch-on #cpRoom,body.ch-on #cpVeil{display:none!important}
#chHome{position:relative;z-index:3;max-width:1120px;margin:0 auto;padding:calc(22px + env(safe-area-inset-top)) 18px 140px;color:var(--ink)}
#chHome *{box-sizing:border-box}
.ch-top{display:flex;align-items:center;gap:12px;margin-bottom:22px}
.ch-logo{width:30px;height:34px;color:#F28C38;flex:none;filter:drop-shadow(0 4px 14px rgba(242,140,56,.5))}
.ch-hi{flex:1;min-width:0}
.ch-hi small{display:block;font-size:12.5px;color:var(--muted);letter-spacing:.02em}
.ch-hi b{display:block;font-family:var(--kd);font-size:21px;font-weight:600;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ch-links{display:none;gap:4px}
.ch-links a{padding:9px 14px;border-radius:12px;font-size:14px;color:var(--muted);transition:.2s}
.ch-links a:hover{background:rgba(127,127,127,.1);color:var(--ink)}
.ch-av{width:40px;height:40px;border-radius:50%;flex:none;display:grid;place-items:center;font-weight:700;color:#fff;overflow:hidden;
  background:linear-gradient(135deg,#FFB547,#F28C38 45%,#E4572E);box-shadow:0 6px 18px -6px rgba(242,110,40,.7)}
.ch-av img{width:100%;height:100%;object-fit:cover}
.ch-grid{display:grid;grid-template-columns:1fr;gap:16px}
/* ── การ์ดรถ: ชิ้นเอกของหน้า — มีมิติ มีแสง มีรถ ── */
.ch-car{position:relative;border-radius:28px;overflow:hidden;min-height:250px;padding:22px 22px 20px;isolation:isolate;cursor:pointer;
  background:radial-gradient(120% 90% at 100% 0%,rgba(242,140,56,.38),transparent 55%),radial-gradient(90% 80% at 0% 100%,rgba(139,107,255,.28),transparent 60%),linear-gradient(160deg,#1E1A17,#0E0C0B);
  color:#F4EFE9;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 30px 70px -30px rgba(0,0,0,.8),0 0 0 1px rgba(255,255,255,.06)}
.ch-car::before{content:"";position:absolute;inset:0;z-index:-1;opacity:.5;
  background:repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 1px,transparent 1px 44px),repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 44px);
  -webkit-mask-image:radial-gradient(80% 70% at 70% 70%,#000,transparent);mask-image:radial-gradient(80% 70% at 70% 70%,#000,transparent)}
.ch-car .eye{display:flex;align-items:center;gap:8px;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(244,239,233,.6)}
.ch-car .eye i{width:7px;height:7px;border-radius:50%;background:#5FE3B0;box-shadow:0 0 10px #5FE3B0}
.ch-car h2{font-family:var(--kd);font-size:clamp(30px,5vw,40px);font-weight:700;letter-spacing:-.02em;margin:8px 0 2px;line-height:1.15}
.ch-car .sub{font-size:13.5px;color:rgba(244,239,233,.65)}
.ch-car .sw{position:absolute;top:18px;right:18px;width:36px;height:36px;border-radius:12px;display:grid;place-items:center;
  background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#fff;font-size:17px;backdrop-filter:blur(10px)}
.ch-silo{position:absolute;right:-6%;bottom:14px;width:68%;max-width:420px;opacity:.95;pointer-events:none;
  filter:drop-shadow(0 18px 24px rgba(0,0,0,.6))}
.ch-silo .body{fill:url(#chBody)}.ch-silo .glass{fill:rgba(255,255,255,.14)}
.ch-silo .wheel{fill:#0B0A09;stroke:rgba(255,255,255,.25);stroke-width:2}
.ch-silo .light{fill:#FFB547;filter:drop-shadow(0 0 8px #F28C38)}
.ch-silo .beam{fill:url(#chBeam)}
.ch-stats{position:relative;display:flex;gap:10px;margin-top:84px;flex-wrap:wrap}
.ch-stat{padding:10px 14px;border-radius:16px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);backdrop-filter:blur(12px);min-width:118px}
.ch-stat small{display:block;font-size:11px;color:rgba(244,239,233,.55)}
.ch-stat b{font-family:var(--kd);font-size:19px;font-weight:700;font-variant-numeric:tabular-nums}
.ch-stat b em{font-style:normal;font-size:12px;font-weight:500;color:rgba(244,239,233,.55);margin-left:3px}
/* ── ช่องถาม AI ── */
.ch-ask{position:relative;display:flex;align-items:center;gap:10px;padding:8px 8px 8px 18px;border-radius:22px;
  background:var(--surface);border:1px solid var(--line);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 20px 44px -30px rgba(0,0,0,.7)}
.ch-ask::after{content:"";position:absolute;left:12%;right:12%;top:-1px;height:1px;border-radius:2px;pointer-events:none;transition:left .5s,right .5s;
  background:linear-gradient(90deg,transparent,#FFB547 25%,#F28C38 50%,#FF4D7A 75%,transparent);box-shadow:0 0 12px 1px rgba(242,140,56,.55)}
.ch-ask:focus-within::after{left:3%;right:3%}
.ch-ask i.lead{font-size:20px;color:#F28C38}
.ch-ask input{flex:1;min-width:0;border:0;outline:0;background:none;color:var(--ink);font:inherit;font-size:15.5px;padding:10px 0}
.ch-ask input::placeholder{color:var(--faint)}
.ch-ask button{width:44px;height:44px;border-radius:15px;border:0;display:grid;place-items:center;font-size:19px;color:#fff;cursor:pointer;
  background:linear-gradient(135deg,#FFB547,#F28C38 45%,#E4572E);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 8px 20px -8px rgba(242,110,40,.8)}
.ch-chips{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin-top:-4px;padding:2px}
.ch-chips::-webkit-scrollbar{display:none}
.ch-chips button{flex:none;padding:8px 13px;border-radius:999px;border:1px solid var(--line);background:none;color:var(--muted);font:inherit;font-size:13px;cursor:pointer;transition:.2s}
.ch-chips button:hover{color:var(--ink);border-color:rgba(242,140,56,.45)}
/* ── ปุ่มลัด ── */
.ch-h{display:flex;align-items:baseline;justify-content:space-between;margin:6px 2px 10px}
.ch-h b{font-family:var(--kd);font-size:16px;font-weight:600}
.ch-h a{font-size:13px;color:var(--muted);cursor:pointer}
.ch-acts{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.ch-act{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:18px;padding:14px;border-radius:20px;cursor:pointer;border:1px solid var(--line);
  background:linear-gradient(160deg,color-mix(in srgb,var(--c) 20%,var(--surface)),var(--surface) 70%);color:var(--ink);text-align:left;font:inherit;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 18px 36px -28px var(--c);transition:transform .35s cubic-bezier(.2,.9,.25,1),box-shadow .35s}
.ch-act:hover{transform:translateY(-3px);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 24px 44px -24px var(--c)}
.ch-act:active{transform:scale(.97)}
.ch-act i{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;font-size:20px;color:#fff;
  background:linear-gradient(145deg,color-mix(in srgb,var(--c) 80%,#fff),var(--c));box-shadow:0 8px 18px -6px var(--c)}
.ch-act b{font-size:13.5px;font-weight:600;line-height:1.25}
.ch-act small{display:block;font-size:11px;color:var(--muted);font-weight:400;margin-top:2px}
/* ── แผงขวา: วันนี้ + แชตล่าสุด ── */
.ch-card{border-radius:22px;padding:16px;background:var(--surface);border:1px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 22px 50px -34px rgba(0,0,0,.7)}
.ch-today{display:flex;gap:14px;align-items:center}
.ch-ring{--p:0;width:64px;height:64px;border-radius:50%;flex:none;display:grid;place-items:center;
  background:conic-gradient(#F28C38 calc(var(--p)*1%),rgba(127,127,127,.18) 0);position:relative}
.ch-ring::after{content:"";position:absolute;inset:6px;border-radius:50%;background:var(--surface)}
.ch-ring span{position:relative;z-index:1;font-family:var(--kd);font-weight:700;font-size:15px}
.ch-today p{font-size:13px;color:var(--muted);line-height:1.5;margin:3px 0 0}
.ch-today b{font-size:15px}
.ch-today .go{margin-left:auto;flex:none;width:36px;height:36px;border-radius:12px;display:grid;place-items:center;border:1px solid var(--line);color:var(--ink);background:none;cursor:pointer}
.ch-list{display:flex;flex-direction:column;gap:2px;margin-top:4px}
.ch-row{display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:14px;cursor:pointer;color:var(--ink);background:none;border:0;font:inherit;text-align:left;width:100%;transition:background .2s}
.ch-row:hover{background:rgba(127,127,127,.08)}
.ch-row i{width:34px;height:34px;border-radius:11px;flex:none;display:grid;place-items:center;font-size:16px;color:#F28C38;background:rgba(242,140,56,.12)}
.ch-row span{flex:1;min-width:0}
.ch-row b{display:block;font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ch-row small{font-size:11.5px;color:var(--faint)}
.ch-empty{font-size:13px;color:var(--muted);padding:8px}
@media(min-width:900px){
  #chHome{padding-top:34px}
  .ch-links{display:flex}
  .ch-grid{grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:20px;align-items:start}
  .ch-left,.ch-right{display:flex;flex-direction:column;gap:16px}
  .ch-car{min-height:330px;padding:28px}
  .ch-stats{margin-top:130px}
}
@media(max-width:899px){.ch-left,.ch-right{display:contents}}
body.ch-on .navwrap{display:none!important}
@media(max-width:899px){
  .ch-car{min-height:0}
  .ch-silo{width:92%;right:-12%;bottom:auto;top:92px}
  .ch-stats{margin-top:118px}
  .ch-acts{gap:8px}
  .ch-act{padding:12px 8px;align-items:center;text-align:center;gap:9px;border-radius:18px}
  .ch-act i{width:42px;height:42px}
  .ch-act b{font-size:12px}.ch-act small{display:none}
}
/* มือถือ: ย่อทุกอย่างลง ให้หน้าโปร่ง เห็นได้มากขึ้นในจอเดียว */
@media(max-width:899px){
  #chHome{padding:calc(14px + env(safe-area-inset-top)) 14px 120px}
  .ch-top{margin-bottom:14px;gap:10px}
  .ch-logo{width:22px;height:26px}
  .ch-hi small{font-size:11.5px}.ch-hi b{font-size:17px}
  .ch-av{width:32px;height:32px;font-size:13px}
  .ch-grid{gap:12px}
  .ch-car{border-radius:22px;padding:16px}
  .ch-car .eye{font-size:10px;letter-spacing:.1em}
  .ch-car h2{font-size:24px;margin-top:6px}
  .ch-car .sub{font-size:12px}
  .ch-car .sw{width:30px;height:30px;border-radius:10px;font-size:15px;top:14px;right:14px}
  .ch-silo{width:74%;right:-8%;top:58px}
  .ch-stats{margin-top:86px;gap:8px}
  .ch-stat{padding:7px 11px;border-radius:12px;min-width:0}
  .ch-stat small{font-size:10px}.ch-stat b{font-size:15px}.ch-stat b em{font-size:10.5px}
  .ch-ask{padding:5px 5px 5px 14px;border-radius:18px;gap:8px}
  .ch-ask i.lead{font-size:17px}
  .ch-ask input{font-size:14px;padding:8px 0}
  .ch-ask button{width:36px;height:36px;border-radius:12px;font-size:16px}
  .ch-chips button{padding:6px 11px;font-size:12px}
  .ch-h{margin:2px 2px 8px}.ch-h b{font-size:14.5px}.ch-h a{font-size:12px}
  .ch-act{padding:10px 6px;gap:7px;border-radius:16px}
  .ch-act i{width:34px;height:34px;border-radius:11px;font-size:17px}
  .ch-act b{font-size:11.5px}
  .ch-card{padding:13px;border-radius:18px}
  .ch-ring{width:48px;height:48px}.ch-ring::after{inset:5px}.ch-ring span{font-size:12px}
  .ch-today{gap:11px}.ch-today b{font-size:13.5px}.ch-today p{font-size:12px}
  .ch-today .go{width:30px;height:30px;border-radius:10px}
  .ch-row{padding:8px 6px;gap:10px}.ch-row i{width:30px;height:30px;font-size:15px}.ch-row b{font-size:13px}
}
/* ════ ลำดับความสำคัญชัด + ไม่มีกรอบ + หายใจได้ ════
   ตัวเด่นมีหนึ่งเดียว: การ์ดรถ (ใหญ่ ไล่สีเต็ม ไม่มีเส้นขอบ)
   ที่เหลือไม่มีกล่อง ไม่มีเส้น — แยกกันด้วยระยะห่างและขนาดตัวหนังสือแทน */
.ch-car{box-shadow:0 40px 80px -40px rgba(242,110,40,.55),0 30px 60px -30px rgba(0,0,0,.7)!important;
  background:radial-gradient(120% 100% at 100% 0%,rgba(255,150,60,.65),transparent 55%),radial-gradient(100% 90% at 0% 100%,rgba(139,107,255,.45),transparent 60%),linear-gradient(160deg,#2A1E16,#120D0A)!important}
.ch-stat{background:rgba(0,0,0,.22);border:0}
.ch-car .sw{border:0;background:rgba(0,0,0,.25)}
.ch-ask{border:0;background:rgba(127,127,127,.09);box-shadow:none}
.ch-ask::after{display:none}
.ch-chips{display:none}
.ch-act{border:0!important;background:none!important;box-shadow:none!important;padding:4px 0!important}
.ch-act:hover{transform:translateY(-2px)}
.ch-act small{display:none}
.ch-card{border:0;background:none;box-shadow:none;padding:0}
.ch-h b{font-size:13px;font-weight:500;color:var(--muted);letter-spacing:.02em}
.ch-row{padding:10px 0}
.ch-today .go{border:0;background:rgba(127,127,127,.1)}
.ch-grid{gap:30px}
.ch-left,.ch-right{gap:30px!important}
.ch-act{align-items:center;text-align:center}
.ch-act i{width:58px;height:58px;border-radius:19px;font-size:24px}
.ch-act b{font-weight:500;color:var(--muted)}
@media(max-width:899px){
  .ch-grid{gap:26px}
  .ch-acts{gap:4px}
  .ch-act{align-items:center}
  .ch-act i{width:52px!important;height:52px!important;border-radius:17px!important;font-size:22px!important}
  .ch-act b{font-size:11.5px;font-weight:500;color:var(--muted)}
  .ch-car{padding:18px!important}
  .ch-car h2{font-size:26px}
}
/* ════ สีเรียบ ไม่มีไล่สี ════
   ใช้สีทึบสีเดียวต่อชิ้น — ส้ม Cendon เป็นสีของการ์ดรถ (ตัวเด่นหนึ่งเดียวของหน้า)
   ที่เหลือเป็นพื้นกับตัวหนังสือ ไอคอนเป็นสีทึบแบนไม่มีเงาเรือง */
body.ch-on .one-aura{display:none!important}
.ch-car{background:#F28C38!important;color:#1A0F07!important;box-shadow:none!important}
.ch-car::before{display:none}
.ch-car .eye{color:rgba(26,15,7,.62)}
.ch-car .eye i{background:#1A0F07;box-shadow:none}
.ch-car .sub{color:rgba(26,15,7,.7)}
.ch-car .sw{background:rgba(26,15,7,.12)!important;color:#1A0F07;backdrop-filter:none}
.ch-silo{filter:none}
.ch-silo .body{fill:#1A0F07}.ch-silo .glass{fill:#F28C38;opacity:.35}
.ch-silo .wheel{fill:#1A0F07;stroke:#F28C38;stroke-width:3}
.ch-silo .light{fill:#FFF3E0;filter:none}.ch-silo .beam{display:none}
.ch-silo path[stroke]{stroke:rgba(242,140,56,.35)}
.ch-stat{background:rgba(26,15,7,.1)!important;backdrop-filter:none;color:#1A0F07}
.ch-stat small,.ch-stat b em{color:rgba(26,15,7,.6)!important}
.ch-ask button{background:#F28C38!important;box-shadow:none!important;color:#1A0F07}
.ch-ask i.lead{color:var(--muted)}
.ch-act i{background:var(--c)!important;box-shadow:none!important}
.ch-ring{background:conic-gradient(#F28C38 calc(var(--p)*1%),rgba(127,127,127,.18) 0)}
.ch-av{background:#F28C38!important;box-shadow:none!important;color:#1A0F07}
.ch-logo{filter:none}
.ch-row i{background:rgba(127,127,127,.1)!important;color:var(--ink)!important}
.ch-in{animation:chIn .7s cubic-bezier(.2,.9,.25,1) both}
@keyframes chIn{from{opacity:0;transform:translateY(14px);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}
@media (prefers-reduced-motion:reduce){.ch-in{animation:none}}
`;

var MARK='<svg class="ch-logo" viewBox="-6 -6 94.8 112" aria-hidden="true"><path fill="currentColor" d="M79.33 .29Q79.62 0 79.97 .21L81.37 1.05Q82.8 1.91 82.8 3.58V4.36Q82.8 6.37 82.17 8.27L75.34 28.74Q74.52 31.21 71.93 30.97L49.09 28.9Q46.5 28.66 44.6 30.44L37.56 37.07Q35.67 38.85 34.46 41.16L29.87 49.93Q28.66 52.23 28.92 54.82L29.04 56.01Q29.3 58.6 31.49 60L45.43 68.97Q47.13 70.06 49.14 69.78L49.59 69.71Q51.59 69.43 52.63 67.68L60.46 54.47Q61.78 52.23 64.32 52.79L64.98 52.94Q67.52 53.5 68.61 55.86L70.25 59.42Q71.34 61.78 70.55 64.26L63.84 85.42Q63.06 87.9 60.77 89.13L48.79 95.58Q46.5 96.82 43.96 96.25L43.14 96.07Q40.76 95.54 39.04 97.26L38.66 97.64Q36.94 99.36 34.52 99.61L33.16 99.74Q30.57 100 30.7 97.4L31.08 89.86Q31.21 87.26 29.02 85.87L5.38 70.82Q3.18 69.43 2.55 66.9L.63 59.21Q0 56.69 1.41 54.5L27.26 14.29Q28.66 12.1 29.48 9.64L31.02 5.01Q31.85 2.55 34.36 3.22L45.9 6.33Q48.41 7.01 51.01 7.01H61.73Q64.33 7.01 66.72 5.97L78.61 .8Q78.98 .64 79.27 .35Z"/></svg>';
/* รถด้านข้างแบบเส้นเรียบ ๆ ไฟหน้าเปิด — ภาพจำของ "รถของฉัน" */
var CAR='<svg class="ch-silo" viewBox="0 0 420 150" aria-hidden="true"><defs>'+
 '<linearGradient id="chBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A332D"/><stop offset=".55" stop-color="#1D1916"/><stop offset="1" stop-color="#0E0C0B"/></linearGradient>'+
 '<linearGradient id="chBeam" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#FFB547" stop-opacity="0"/><stop offset="1" stop-color="#FFB547" stop-opacity=".35"/></linearGradient></defs>'+
 '<path class="beam" d="M28 92 L-40 70 L-40 124 Z"/>'+
 '<path class="body" d="M30 110 Q22 108 24 94 Q28 80 52 76 L110 70 Q140 44 190 38 Q250 34 290 48 Q320 58 350 74 L386 82 Q404 88 404 104 L402 112 Q400 118 390 118 L30 118 Q26 116 30 110Z"/>'+
 '<path class="glass" d="M124 70 Q150 50 192 46 L200 70Z M212 46 Q256 44 290 56 L312 70 L212 70Z"/>'+
 '<path d="M40 96 L120 92 M200 88 L380 90" stroke="rgba(255,255,255,.12)" stroke-width="1.5" fill="none"/>'+
 '<rect class="light" x="26" y="86" width="18" height="6" rx="3"/><rect x="392" y="92" width="10" height="7" rx="3" fill="#FF4D4D" style="filter:drop-shadow(0 0 6px #FF4D4D)"/>'+
 '<circle class="wheel" cx="96" cy="118" r="24"/><circle cx="96" cy="118" r="10" fill="#2A2521"/>'+
 '<circle class="wheel" cx="334" cy="118" r="24"/><circle cx="334" cy="118" r="10" fill="#2A2521"/></svg>';

var ACTS=[
  {k:"image", ic:"ti-camera",  c:"#A46BF5", th:"ถ่ายรูปอาการ",  en:"Photo check", thd:"ให้ AI ดูให้", end:"AI looks at it"},
  {k:"listen",ic:"ti-ear",     c:"#37C08A", th:"ฟังเสียงเครื่อง", en:"Listen",      thd:"จับเสียงผิดปกติ", end:"Odd noises"},
  {k:"techs", ic:"ti-tool",    c:"#F08A3D", th:"หาช่าง",        en:"Find a pro",  thd:"ใกล้ตัวคุณ", end:"Near you"},
  {k:"park",  ic:"ti-map-pin", c:"#F0655C", th:"จำที่จอด",      en:"Parking",     thd:"กดตอนจอด", end:"Tap when parked"}
];

function user(){ return rd("cachedUser",null)||{} }
function car(){ var g=rd("garage",[])||[], id=rd("selCar",""); return g.find(function(c){return c.id===id})||g[0]||null }
function greet(){
  var h=new Date().getHours();
  return en()?(h<12?"Good morning":h<17?"Good afternoon":"Good evening"):(h<11?"สวัสดีตอนเช้า":h<16?"สวัสดีตอนบ่าย":h<19?"สวัสดีตอนเย็น":"สวัสดีตอนค่ำ");
}
function fmt(n){ n=+String(n||"").replace(/[^\d.]/g,""); return n?n.toLocaleString("en-US"):"—" }

/* เรียกเครื่องมือเดิมของหน้า — ไม่เขียนใหม่ ไม่มีอะไรหาย */
function tool(k){
  if(k==="techs"){ location.href="tech.html"; return }
  var b=D.querySelector('.mtool[data-mfeat="'+k+'"]');
  if(b){ b.click(); return }
  if(window.openTool){ try{ window.openTool(k); return }catch(e){} }
  location.href="chat.html?attach="+encodeURIComponent(k);
}
function ask(q){
  q=(q||"").trim();
  try{ if(q)localStorage.setItem("spire_deckQ",JSON.stringify(q)) }catch(e){}
  location.href="chat.html"+(q?"":"?attach=text");
}

function render(){
  var host=$("v-home"), sc=host&&host.querySelector(".scroll"); if(!sc)return;
  var el=$("chHome"); if(!el){ el=D.createElement("div"); el.id="chHome"; sc.insertBefore(el,sc.firstChild) }
  var u=user(), c=car(), nm=(u.name||"").split(" ")[0];
  var sess=(rd("chatSessions",[])||[]).slice().sort(function(a,b){return (b.t||0)-(a.t||0)}).slice(0,4);
  /* ความคืบหน้าถึงเช็กระยะถัดไป (ทุก 10,000 กม.) — ตัวเลขที่คนเจ้าของรถอยากรู้ทุกวัน */
  var km=+String(c&&c.mileage||"").replace(/[^\d]/g,"")||0, left=km?10000-(km%10000):0, pct=km?Math.round((km%10000)/100):0;
  el.innerHTML=
   '<div class="ch-top ch-in">'+MARK+
     '<div class="ch-hi"><small>'+esc(greet())+'</small><b>'+esc(nm?(en()?nm:"คุณ "+nm):"Cendon")+'</b></div>'+
     '<nav class="ch-links"><a href="garage.html">'+T("การาจ","Garage")+'</a><a href="news.html">'+T("นิตยสาร","Magazine")+'</a><a href="spares.html">'+T("อะไหล่","Spares")+'</a><a href="chat.html">'+T("แชต","Chat")+'</a></nav>'+
     '<a class="ch-av" href="profile.html" aria-label="'+T("บัญชี","Account")+'">'+(u.photo?'<img src="'+esc(u.photo)+'" referrerpolicy="no-referrer" alt="">':esc((u.name||"C")[0].toUpperCase()))+'</a>'+
   '</div>'+
   '<div class="ch-grid"><div class="ch-left">'+
     '<div class="ch-car ch-in" id="chCar" style="animation-delay:.05s">'+
       '<div class="eye"><i></i>'+T("รถของฉัน · พร้อมใช้งาน","My car · Ready")+'</div>'+
       '<h2>'+esc(c?c.name||((c.make||"")+" "+(c.model||"")):T("เพิ่มรถคันแรก","Add your first car"))+'</h2>'+
       '<div class="sub">'+esc(c?[c.year,c.make].filter(Boolean).join(" · "):T("แตะเพื่อเริ่ม ระบบจะดูแลให้ที่เหลือ","Tap to begin"))+'</div>'+
       '<span class="sw"><i class="ti ti-arrows-exchange"></i></span>'+CAR+
       '<div class="ch-stats">'+
         '<div class="ch-stat"><small>'+T("เลขไมล์","Odometer")+'</small><b data-count="'+km+'">'+fmt(km)+'<em>'+T("กม.","km")+'</em></b></div>'+
         '<div class="ch-stat"><small>'+T("เช็กระยะถัดไปอีก","Next service in")+'</small><b>'+(km?fmt(left):"—")+'<em>'+T("กม.","km")+'</em></b></div>'+
       '</div></div>'+
     '<div class="ch-ask ch-in" style="animation-delay:.1s"><i class="ti ti-sparkles lead"></i>'+
       '<input id="chQ" placeholder="'+T("รถเป็นอะไร ถาม Cendon ได้เลย…","What’s up with your car? Ask Cendon…")+'" enterkeyhint="send">'+
       '<button id="chGo" aria-label="'+T("ถาม","Ask")+'"><i class="ti ti-arrow-up"></i></button></div>'+
     '<div class="ch-chips ch-in" style="animation-delay:.14s">'+
       [T("แอร์ไม่เย็น","A/C not cold"),T("เสียงดังตอนเบรก","Noise when braking"),T("ไฟเครื่องยนต์ขึ้น","Check-engine light"),T("ถึงเวลาเปลี่ยนน้ำมันยัง","Oil change due?")]
         .map(function(s){return '<button data-q="'+esc(s)+'">'+esc(s)+'</button>'}).join("")+'</div>'+
     '<div class="ch-in" style="animation-delay:.18s"><div class="ch-h"><b>'+T("ทำบ่อย","Quick actions")+'</b><a id="chAll">'+T("ทั้งหมด","All tools")+'</a></div>'+
       '<div class="ch-acts">'+ACTS.map(function(a){return '<button class="ch-act" data-k="'+a.k+'" style="--c:'+a.c+'"><i class="ti '+a.ic+'"></i><b>'+T(a.th,a.en)+'<small>'+T(a.thd,a.end)+'</small></b></button>'}).join("")+'</div></div>'+
   '</div><div class="ch-right">'+
     '<div class="ch-card ch-in" style="animation-delay:.22s"><div class="ch-today">'+
       '<div class="ch-ring" style="--p:'+pct+'"><span>'+(km?pct+"%":"—")+'</span></div>'+
       '<div><b>'+T("รอบเช็กระยะนี้","This service cycle")+'</b><p>'+(km?T("ใช้ไปแล้ว "+pct+"% ของ 10,000 กม. อีก "+fmt(left)+" กม. ค่อยเข้าศูนย์","Used "+pct+"% of 10,000 km · "+fmt(left)+" km to go"):T("ใส่เลขไมล์ แล้ว Cendon จะเตือนให้เอง","Add your odometer and Cendon will remind you"))+'</p></div>'+
       '<button class="go" id="chCycle" aria-label="'+T("เปิด","Open")+'"><i class="ti ti-chevron-right"></i></button></div></div>'+
     '<div class="ch-card ch-in" style="animation-delay:.26s"><div class="ch-h" style="margin-top:0"><b>'+T("คุยล่าสุด","Recent chats")+'</b><a href="chat.html">'+T("ดูทั้งหมด","See all")+'</a></div>'+
       '<div class="ch-list">'+(sess.length?sess.map(function(s){return '<button class="ch-row" data-s="'+esc(s.id)+'"><i class="ti ti-message-2"></i><span><b>'+esc(s.title||T("แชต","Chat"))+'</b><small>'+(s.t?new Date(s.t).toLocaleDateString(en()?"en-GB":"th-TH",{day:"numeric",month:"short"}):"")+'</small></span><i class="ti ti-chevron-right" style="background:none;color:var(--faint)"></i></button>'}).join("")
         :'<div class="ch-empty">'+T("ยังไม่มีบทสนทนา — ลองถามเรื่องรถดูสักข้อ","No chats yet — ask anything about your car")+'</div>')+'</div></div>'+
   '</div></div>';

  $("chGo").onclick=function(){ ask($("chQ").value) };
  $("chQ").onkeydown=function(e){ if(e.key==="Enter"){ e.preventDefault(); ask($("chQ").value) } };
  el.querySelectorAll("[data-q]").forEach(function(b){ b.onclick=function(){ ask(b.dataset.q) } });
  el.querySelectorAll("[data-k]").forEach(function(b){ b.onclick=function(){ tool(b.dataset.k) } });
  el.querySelectorAll("[data-s]").forEach(function(b){ b.onclick=function(){ location.href="chat.html?session="+encodeURIComponent(b.dataset.s) } });
  $("chCar").onclick=function(){ location.href="garage.html" };
  $("chCycle").onclick=function(){ location.href="garage.html" };
  $("chAll").onclick=function(){ var b=D.querySelector('.mtool[data-mall]'); if(b)b.click(); else location.href="chat.html" };
  /* เลขไมล์นับขึ้นตอนเปิด — เหมือนหน้าปัดรถตอนสตาร์ท */
  var cnt=el.querySelector("[data-count]"), to=+cnt.dataset.count;
  if(to&&!render.done){ var t0=performance.now(); (function f(t){ var p=Math.min(1,(t-t0)/1100), e=1-Math.pow(1-p,3);
      cnt.firstChild.nodeValue=Math.round(to*e).toLocaleString("en-US"); if(p<1)requestAnimationFrame(f) })(t0) }
  render.done=true; sig=sigNow();
}

function boot(){
  if(!$("v-home"))return;
  if(!$("chCss")){ var s=D.createElement("style"); s.id="chCss"; s.textContent=CSS; D.head.appendChild(s) }
  D.body.classList.add("ch-on");
  render();
}
if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",function(){ setTimeout(boot,60) }); else setTimeout(boot,60);
/* ข้อมูลรถ/แชตซิงก์จากเซิร์ฟเวอร์ทีหลัง — วาดใหม่เมื่อค่าเปลี่ยน (เบา ๆ ไม่กระพริบ) */
function sigNow(){ return JSON.stringify([rd("garage",[]),rd("selCar",""),(rd("chatSessions",[])||[]).length,rd("lang","th"),(rd("cachedUser",{})||{}).name]) }
var sig="";
setInterval(function(){ var n=sigNow(); if(n!==sig&&$("chHome")){ sig=n; render() } },700);
})();
