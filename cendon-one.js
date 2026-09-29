/* Cendon One — ใส่ชั้นแสงสีด้านบนของหน้า (คู่กับ cendon-one.css)
   หน้าหลักบนคอมมี "ห้องนักบิน" เต็มจอ ซึ่งมีพื้นทึบของตัวเอง แสงจึงต้องอยู่ข้างในห้องนั้น
   หน้าอื่นใช้แสงติดจอด้านบน อยู่หลังเนื้อหาทั้งหมด */
(function(){
  "use strict";
  var D=document;
  function make(cls){
    var a=D.createElement("div"); a.className=cls; a.setAttribute("aria-hidden","true");
    a.innerHTML='<i class="a1"></i><i class="a2"></i><i class="a3"></i>';
    return a;
  }
  function put(){
    if(!D.body)return;
    /* ใช้สวิตช์ของหน้าเองเพื่อปิดลายเกล็ดวิบวับบนปุ่ม (ปุ่มเรียบดูเป็นทางการกว่า) */
    D.body.setAttribute("data-flake","0");
    if(!D.querySelector("body>.one-aura")) D.body.insertBefore(make("one-aura"),D.body.firstChild);
    /* ห้องนักบินถูกสร้างทีหลังด้วยสคริปต์ของหน้า — ตามใส่ให้เมื่อมันโผล่มา */
    var hp=D.querySelector(".hpage");
    if(hp&&!hp.querySelector(":scope>.one-aura")) hp.insertBefore(make("one-aura in"),hp.firstChild);
  }
  if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",put); else put();
  var n=0, iv=setInterval(function(){ put(); if(++n>20)clearInterval(iv) },500);
  /* แท็บไม่ได้เปิดดูอยู่ หยุดแสงไว้ ไม่เปลืองแบต */
  D.addEventListener("visibilitychange",function(){ D.documentElement.classList.toggle("one-hidden-tab",D.hidden) });
})();
