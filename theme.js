/* ═══════════════════════════════════════════════════════════════════
   ธีมและสีหลัก — ตัวเดียวกับที่หน้าหลักใช้
   ───────────────────────────────────────────────────────────────────
   ผู้ใช้ตั้งค่าสองอย่างแยกกัน และหน้าใดก็ตามที่อ่านไม่ครบทั้งสอง
   จะแสดงสีผิดทันที
     spire_theme    โครงสีพื้นหลังและตัวหนังสือ  light | dark
     spire_primary  สีหลักของปุ่มและไฮไลต์      รหัสสีหก หลัก

   ต้องโหลดไฟล์นี้แบบไม่มี defer และวางไว้ใน <head> ก่อนอย่างอื่น
   ไม่งั้นจะเห็นธีมตั้งต้นแวบหนึ่งก่อนสลับ ซึ่งน่ารำคาญกว่าไม่มีธีม
   ═══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
var D=document, TKEY="spire_theme", PKEY="spire_primary", DEF="#E8943C";

/* ── โครงสี ── */
var KEYS=["light","dark"];
/* ธีมรุ่นเก่าที่เลิกใช้แล้ว ให้ตกลงมาที่โครงสีที่ใกล้ที่สุด
   ไม่งั้นคนที่เคยตั้งไว้จะเปิดมาเจอสีผิดโดยไม่รู้ว่าทำไม
   ตารางนี้ต้องตรงกับของหน้าหลักทุกตัว */
var OLD={warm:"light",pearl:"light",emerald:"light",plant:"light",moss:"light",
         carbon:"dark",night:"dark",midnight:"dark",cyber:"dark",
         aurora:"dark",ocean:"dark",sunset:"dark",magma:"dark",
         wire:"dark",grid:"light"};
function readTheme(){
  var v=null;
  try{ v=JSON.parse(localStorage.getItem(TKEY)) }catch(e){}
  if(typeof v!=="string"){ try{ v=JSON.parse(localStorage.getItem("spire_chatTheme")) }catch(e){} }
  if(typeof v!=="string")return "light";
  if(KEYS.indexOf(v)>=0)return v;
  return OLD[v]||"light";
}
function applyTheme(k){
  var el=D.documentElement;
  /* ตั้งทั้งสองแอตทริบิวต์ให้เป็นค่าเดียวกัน เพราะสไตล์ของสองฝั่ง
     (หน้าเว็บกับห้องแชต) อ้างคนละชื่อกัน */
  el.setAttribute("data-theme",k);
  el.setAttribute("data-ctheme",k);
}

/* ── สีหลัก ── */
function hex2rgb(h){
  h=String(h||"").trim().replace(/^#/,"");
  if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  if(!/^[0-9a-f]{6}$/i.test(h))return null;
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
}
function rgb2hex(r,g,b){
  return "#"+[r,g,b].map(function(x){
    return Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,"0")}).join("");
}
function rgb2hsl(r,g,b){
  r/=255;g/=255;b/=255;
  var mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,h=0;
  if(d){ h=mx===r?((g-b)/d+(g<b?6:0)):mx===g?((b-r)/d+2):((r-g)/d+4); h*=60 }
  var l=(mx+mn)/2, s=d?d/(1-Math.abs(2*l-1)):0;
  return [h,s,l];
}
function hsl2rgb(h,s,l){
  h=((h%360)+360)%360;
  var c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((h/60)%2-1)), m=l-c/2, t;
  if(h<60)t=[c,x,0]; else if(h<120)t=[x,c,0]; else if(h<180)t=[0,c,x];
  else if(h<240)t=[0,x,c]; else if(h<300)t=[x,0,c]; else t=[c,0,x];
  return [(t[0]+m)*255,(t[1]+m)*255,(t[2]+m)*255];
}
function shift(hex,dl,dh){
  var c=hex2rgb(hex); if(!c)return hex;
  var a=rgb2hsl(c[0],c[1],c[2]), l=Math.max(0,Math.min(1,a[2]+dl));
  return rgb2hex.apply(null,hsl2rgb(a[0]+(dh||0),a[1],l));
}
function readPrim(){
  var v=null;
  try{ v=JSON.parse(localStorage.getItem(PKEY)) }catch(e){}
  return (typeof v==="string"&&hex2rgb(v))?v:DEF;
}
function applyPrim(raw){
  var base=hex2rgb(raw)?raw:DEF;
  var c=hex2rgb(base)||hex2rgb(DEF);
  var soft=function(a){ return "rgba("+c[0]+","+c[1]+","+c[2]+","+a+")" };
  var light=shift(base,.10,10), dark=shift(base,-.12,-6);
  var st=D.documentElement.style, set=function(k,v){ st.setProperty(k,v) };
  /* ชื่อตัวแปรของหน้าแดชบอร์ดกับห้องแชตไม่เหมือนกัน ตั้งให้ครบทั้งสองชุด
     ตกไปแม้แต่ตัวเดียว หน้านั้นจะมีสีปุ่มไม่ตรงกับที่ผู้ใช้เลือกไว้ */
  set("--accent",base); set("--accent-2",light); set("--accent-d",dark);
  set("--grad","linear-gradient(135deg,"+light+","+dark+")");
  set("--c-acc",base); set("--c-acc-soft",soft(.16));
  set("--c-grad","linear-gradient(135deg,"+light+","+dark+")");
  set("--c-user","linear-gradient(135deg,"+light+","+dark+")");
  set("--c-aura1",soft(.12));
  /* สีตัวหนังสือบนพื้นสีหลัก คำนวณจากความสว่างจริง ไม่ใช่เดา
     สีหลักอ่อน ๆ อย่างสีทอง ถ้าใช้ตัวหนังสือขาวจะอ่านไม่ออก */
  var lum=(0.299*c[0]+0.587*c[1]+0.114*c[2])/255;
  set("--on-acc",lum>0.62?"#1A1204":"#ffffff");
  try{
    var mt=D.querySelector('meta[name="theme-color"]');
    if(mt){
      var cs=getComputedStyle(D.documentElement);
      var bg=cs.getPropertyValue("--c-bg0").trim()||cs.getPropertyValue("--bg").trim();
      if(bg)mt.setAttribute("content",bg);
    }
  }catch(e){}
}

function sync(){ applyTheme(readTheme()); applyPrim(readPrim()) }
sync();
/* ตั้งค่าจากอีกแท็บหนึ่ง ต้องมีผลกับแท็บนี้ด้วย
   ไม่งั้นเปลี่ยนธีมในหน้าตั้งค่าแล้วกลับมาหน้านี้ยังเป็นสีเดิม */
addEventListener("storage",function(e){
  if(e.key===TKEY||e.key===PKEY||e.key==="spire_chatTheme")sync();
});
window.spireThemeSync=sync;
})();
