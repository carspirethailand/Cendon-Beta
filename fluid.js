/* fluid.js — แอนิเมชันเปิดหน้าต่างแบบเหลวของทั้งแอป (โหลดทุกหน้า) */
/* ═══ FLUID OPEN — หน้าต่าง/แผ่นล่าง "ไหล" ออกมาจากจุดที่นิ้วแตะ แบบ iPhone ═══
   เริ่มเป็นหยดเล็กๆ มนๆ เบลอ ยืดตัวแนวตั้งนิดๆ (ดูเหลว) แล้วกางเต็มด้วยเส้นจังหวะเดียวกับ iOS
   ไม่มีเด้งเกิน → ดูแน่น หนักแน่น แพง · ใช้ scale/translate แยก จึงไม่ทับ transform เดิมของแต่ละหน้า */
(function () {
  if (!window.Element || !Element.prototype.animate) return;
  var EASE = 'cubic-bezier(.32,.72,0,1)';
  var tap = { x: innerWidth / 2, y: innerHeight / 2, t: 0 };
  addEventListener('pointerdown', function (e) { tap = { x: e.clientX, y: e.clientY, t: Date.now() }; }, true);
  var still = function () { return matchMedia('(prefers-reduced-motion: reduce)').matches; };
  function fluid(el) {
    if (!el || still()) return;
    // A sheet's own CSS transition already supplies motion. Never stack two entrances.
    if (el.getAnimations && el.getAnimations().some(function(a){ return a.playState === 'running'; })) return;
    var r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    var fresh = Date.now() - tap.t < 900;
    var ox = fresh ? Math.max(0, Math.min(r.width, tap.x - r.left)) : r.width / 2;
    var oy = fresh ? Math.max(0, Math.min(r.height, tap.y - r.top)) : r.height / 2;
    var s = .985;
    var o = ox + 'px ' + oy + 'px';
    el.animate([
      { transformOrigin: o, scale: String(s), opacity: .9 },
      { transformOrigin: o, scale: '1', opacity: 1 }
    ], { duration: 180, easing: EASE });
  }
  window.cendonFluid = fluid;
  /* เฝ้าทุกหน้า: .modal-bg / .sheet / [data-fluid] ได้คลาส show หรือ open = เพิ่งเปิด */
  var shown = new WeakSet();
  function check(n) {
    if (!(n instanceof Element)) return;
    var on = /(^|\s)(show|open)(\s|$)/.test(n.className || '');
    if (!on) { shown.delete(n); return; }
    if (shown.has(n)) return; shown.add(n);
    var c = n.className;
    if (/toast|call-ui|hearth|dyno/.test(c)) return;
    /* ฉากหลังมืด (bg/backdrop) → ให้ตัวกล่องข้างในไหลออกมา, ตัวกล่องเอง (modal/sheet/menu/drop/pop) → ไหลทั้งก้อน */
    if (/(modal-bg|sheet-bg|backdrop)/.test(c)) fluid(n.querySelector('.modal,.sheet,[class*="modal"]:not([class*="backdrop"])') || n.firstElementChild);
    else if (/(^|\s|-)(modal|sheet|menu|drop|dropin|pop|popup)(\s|$|-)/.test(c) || n.hasAttribute('data-fluid')) fluid(n);
  }
  function start() {
    new MutationObserver(function (ms) { ms.forEach(function (m) { check(m.target); }); })
      .observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }
  if (document.body) start(); else addEventListener('DOMContentLoaded', start);
})();
