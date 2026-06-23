/* ==========================================================================
   HELPER FUNCTIONS & UTILITIES (js/helper.js)
   ========================================================================== */

// DOM Selector Helper
export const $ = id => document.getElementById(id);

// LocalStorage Helper
export const LS = {
  get: (k, d) => {
    try {
      return JSON.parse(localStorage.getItem("spireone_" + k)) ?? d;
    } catch {
      return d;
    }
  },
  set: (k, v) => localStorage.setItem("spireone_" + k, JSON.stringify(v)),
  del: k => localStorage.removeItem("spireone_" + k)
};

// Safe JSON parser for AI outputs
export function gParse(t) {
  if (!t) return null;
  let s = t.replace(/```json/gi, "").replace(/```/g, "").trim();
  const m = s.match(/[\[{][\s\S]*[\]}]/);
  if (m) s = m[0];
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// Convert audio blob to base64
export async function blobToB64(blob) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.readAsDataURL(blob);
  });
}

// Global Toast notification system
let toastTimer;
export function toast(msg, ic) {
  const el = $("toast");
  if (!el) return;
  el.innerHTML = `<i class="ti ${ic || 'ti-check'}"></i>${msg}`;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
