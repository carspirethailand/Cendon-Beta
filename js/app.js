/* ==========================================================================
   MAIN APPLICATION MODULE (js/app.js)
   ========================================================================== */

import { $, LS, gParse, blobToB64, toast } from './helper.js';
import {
  fbConfig, ADMINS, GEMINI_KEY, GEMINI_MODEL,
  mags, BRANDS, PROJECT_PROMPTS, THEMES, BGS
} from './config.js';
import {
  auth, db, useFirebase, state, onAuthChange,
  openAuth, closeAuth, toggleDropdown, closeDropdown,
  picHTML, googleSignIn, doLogout
} from './auth.js';
import { callAI, geminiCall } from './ai.js';
import { revealActive, initMotionEffects, spawnParticles } from './ui.js';

// Global variables for local app state
let selectedLang = LS.get("lang", "th");

// Supported Languages
const LANGS = [
  { code: "th", flag: "🇹🇭", ln: "ไทย", ls: "Thai" },
  { code: "en", flag: "🇬🇧", ln: "English", ls: "English" }
];

// Mocks shop data
const shopDemo = [
  { ic: "ti-disc", bg: "linear-gradient(135deg,#3a8ce6,#2f6fd6)", name: "ผ้าเบรกหน้า เกรดพรีเมียม", src: "Lazada", price: "฿890", rate: "★ 4.8" },
  { ic: "ti-oil", bg: "linear-gradient(135deg,#c98a2e,#9e6a1a)", name: "น้ำมันเครื่องสังเคราะห์ 5W-30 4L", src: "Shopee", price: "฿1,290", rate: "★ 4.9" },
  { ic: "ti-battery", bg: "linear-gradient(135deg,#2f9e7a,#1a7a5e)", name: "แบตเตอรี่ MF 60Ah", src: "NGV Auto", price: "฿2,650", rate: "★ 4.7" },
  { ic: "ti-camera", bg: "linear-gradient(135deg,#9b5de5,#7048c4)", name: "กล้องติดรถ 2K WiFi", src: "Amazon", price: "฿1,990", rate: "★ 4.6" },
  { ic: "ti-engine", bg: "linear-gradient(135deg,#8c5a3a,#6b3f2f)", name: "หัวเทียน Iridium (4 หัว)", src: "Shopee", price: "฿760", rate: "★ 4.8" },
  { ic: "ti-air-conditioning", bg: "linear-gradient(135deg,#3ab4d6,#2f7fb8)", name: "ฟิลเตอร์แอร์ คาร์บอน", src: "Lazada", price: "฿320", rate: "★ 4.5" }
];

/* ===== MAGAZINE & ARTICLES RENDER ===== */
function renderMags() {
  const grid = $("magGrid");
  if (!grid) return;
  grid.innerHTML = mags.map(m => `
    <div class="mag-item tilt">
      <div class="mag-cover" style="background:${m.bg}"><i class="ti ${m.ic}"></i></div>
      <span class="pill ${m.pill}">${m.tag}</span>
      <h4 style="margin-top:8px">${m.title}</h4>
      <p>${m.body}</p>
      <div class="mag-item-foot"><span class="issue">${m.issue}</span><span class="mag-readmore"><i class="ti ti-arrow-right"></i></span></div>
    </div>
  `).join("");
}

/* ===== VIEW ROUTER ===== */
export function switchView(v, sub) {
  document.querySelectorAll(".view").forEach(s => s.classList.toggle("active", s.id === "view-" + v));
  document.querySelectorAll(".nav-links a,.mobile-tabs a").forEach(a => a.classList.toggle("active", a.dataset.view === v));

  if (v === "profile") {
    refreshProfile();
    if (sub) setTimeout(() => selectSet(sub), 40);
  }
  if (v === "garage") renderGarage();
  if (v === "project") renderCarBar();

  moveNavInd();
  setTimeout(revealActive, 40);
  closeDropdown();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ===== AUTH DECOUPLED UI HANDLERS ===== */
function onLogin() {
  const u = state.currentUser;
  $("loginBtn").style.display = "none";
  $("avatarBtn").style.display = "block";
  $("avatarBtn").innerHTML = picHTML(u);
  $("ddName").textContent = u.name;
  $("ddEmail").textContent = u.email;
  $("ddPic").innerHTML = picHTML(u);
  $("ddRole").style.display = u.admin ? "flex" : "none";
  $("ddAdmin").style.display = u.admin ? "flex" : "none";
  $("navAdmin").style.display = u.admin ? "flex" : "none";
  refreshProfile();
  renderGarage();
  renderCarBar();
  hideWelcome();
  toast("ยินดีต้อนรับ คุณ" + u.name, "ti-mood-smile");
}

function onLogout() {
  $("loginBtn").style.display = "flex";
  $("avatarBtn").style.display = "none";
  $("ddAdmin").style.display = "none";
  $("navAdmin").style.display = "none";
  refreshProfile();
  renderGarage();
  renderCarBar();
  showWelcome();
}

// Bind auth changes listener
onAuthChange(user => {
  if (user) {
    onLogin();
  } else {
    onLogout();
  }
});

/* ===== PROFILE / SETTINGS PANEL ===== */
function refreshProfile() {
  const has = !!state.currentUser;
  $("profileGate").style.display = has ? "none" : "block";
  $("profileBody").style.display = has ? "block" : "none";
  if (!has) return;
  const u = state.currentUser;
  $("profilePic").innerHTML = u.photo ? `<img src="${u.photo}" referrerpolicy="no-referrer"/>` : `<div class="fb">${u.name.charAt(0).toUpperCase()}</div>`;
  $("profileName").textContent = u.name;
  $("profileEmail").textContent = u.email;
  $("profileRole").style.display = u.admin ? "inline-flex" : "none";
  $("setName").value = u.name;
  $("setEmail").value = u.email;
  if (u.admin) loadAdmin();
}

function selectSet(s) {
  document.querySelectorAll("#setNav button").forEach(b => b.classList.toggle("active", b.dataset.set === s));
  document.querySelectorAll(".set-panel").forEach(p => p.classList.toggle("active", p.dataset.set === s));
}

function renderThemeMini() {
  if (!$("themeMini")) return;
  const cur = document.body.dataset.theme;
  $("themeMini").innerHTML = Object.entries(THEMES).map(([k, t]) =>
    `<button data-theme-key="${k}" class="${k === cur ? 'sel' : ''}" style="background:${t.accent};color:#0a0a0a">${t.name}</button>`
  ).join("");
}

function applyTheme(key) {
  const t = THEMES[key] || THEMES.kinpaku;
  for (const k in t.vars) document.documentElement.style.setProperty(k, t.vars[k]);
  document.body.dataset.theme = key;
  LS.set("theme", key);
  renderThemeMini();
}

function applyBg(k) {
  if (!BGS[k]) k = "default";
  document.body.dataset.bg = k;
  LS.set("bg", k);
  renderBgPick();
}

function renderBgPick() {
  const el = $("bgPick");
  if (!el) return;
  const cur = document.body.dataset.bg;
  el.innerHTML = Object.entries(BGS).map(([k, c]) =>
    `<button data-bgk="${k}" class="${k === cur ? 'sel' : ''}" title="${k}" style="background:linear-gradient(135deg,${c[0]},${c[1]})"></button>`
  ).join("");
}

/* ===== ADMIN PANEL ===== */
async function loadAdmin() {
  if (!state.currentUser || !state.currentUser.admin || !useFirebase) return;
  try {
    const snap = await db.ref("users").once("value");
    const users = snap.val() || {};
    const arr = Object.values(users);
    const admins = arr.filter(u => u.role === "admin").length;
    $("adminStats").innerHTML = `
      <div class="stat"><div class="n">${arr.length}</div><div class="l">ผู้ใช้ทั้งหมด</div></div>
      <div class="stat"><div class="n">${admins}</div><div class="l">ผู้ดูแล</div></div>
      <div class="stat"><div class="n">${arr.filter(u => Date.now() - (u.lastLogin || 0) < 864e5).length}</div><div class="l">ใช้งานวันนี้</div></div>`;

    $("adminRows").innerHTML = arr.sort((a, b) => (b.lastLogin || 0) - (a.lastLogin || 0)).map(u => `
      <tr>
        <td>${u.photo ? `<img class="mini-av" src="${u.photo}" referrerpolicy="no-referrer"/>` : ""}${u.name || "-"}</td>
        <td>${u.email || "-"}</td>
        <td>${u.role === "admin" ? '<span class="pill p-tech">ADMIN</span>' : '<span class="pill p-ev">USER</span>'}</td>
        <td>${u.lastLogin ? new Date(u.lastLogin).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-"}</td>
      </tr>
    `).join("") || '<tr><td colspan="4" style="color:var(--ink-faint)">ยังไม่มีผู้ใช้</td></tr>';
  } catch (err) {
    $("adminRows").innerHTML = `<tr><td colspan="4" style="color:var(--danger)">อ่านไม่ได้: ${err.code || err.message}<br/>ตรวจ Database Rules</td></tr>`;
  }
}

/* ===== HELPERS: severity class + relative time ===== */
function sevClass(s) {
  s = (s || "").toString();
  if (/สูง|เร่งด่วน|อันตราย|วิกฤต|รุนแรง/.test(s)) return "due";
  if (/ปานกลาง|ควรตรวจ|ระวัง|เฝ้าระวัง/.test(s)) return "warn";
  return "ok";
}

function timeAgo(t) {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "เมื่อสักครู่";
  if (s < 3600) return Math.floor(s / 60) + " นาทีที่แล้ว";
  if (s < 86400) return Math.floor(s / 3600) + " ชม.ที่แล้ว";
  const d = Math.floor(s / 86400);
  if (d < 30) return d + " วันที่แล้ว";
  return new Date(t).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function esc(s) {
  return (s || "").toString().replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Brand fill
function fillBrands() {
  const dl = $("brandList");
  if (dl) dl.innerHTML = BRANDS.map(b => `<option value="${b}">`).join("");
}

// Move Navbar Indicator
function moveNavInd() {
  const ind = $("navInd");
  const a = document.querySelector(".nav-links a.active");
  if (!ind || !a) return;
  ind.style.width = a.offsetWidth + "px";
  ind.style.transform = `translate(${a.offsetLeft}px,-50%)`;
}

/* ===== DIGITAL GARAGE ===== */
function getGarage() {
  return LS.get("garage", []);
}

function setGarage(cars) {
  LS.set("garage", cars);
}

function predict(car) {
  const m = parseInt((car.mileage || "0").toString().replace(/\D/g, "")) || 0;
  const items = [
    { name: "เปลี่ยนน้ำมันเครื่อง", every: 10000 },
    { name: "เปลี่ยนผ้าเบรก", every: 40000 },
    { name: "เปลี่ยนยาง", every: 50000 },
    { name: "เปลี่ยนแบตเตอรี่", every: 60000 },
    { name: "เปลี่ยนสายพานไทม์มิ่ง", every: 100000 }
  ];
  return items.map(it => {
    const next = Math.ceil((m + 1) / it.every) * it.every;
    const left = next - m;
    let cls = "", txt = "";
    if (left <= 1500) {
      cls = "due";
      txt = "ถึงรอบแล้ว!";
    } else if (left <= 5000) {
      cls = "warn";
      txt = "ใกล้ถึงรอบ";
    } else {
      cls = "";
      txt = "ปกติ";
    }
    return { name: it.name, next, left, cls, txt };
  }).sort((a, b) => a.left - b.left);
}

function health(car) {
  const m = parseInt((car.mileage || "0").toString().replace(/\D/g, "")) || 0;
  let h = 100 - Math.min(60, Math.floor(m / 3000));
  return Math.max(35, h);
}

function renderGarage() {
  if (!state.currentUser) {
    $("garageGate").style.display = "block";
    $("garageBody").style.display = "none";
    return;
  }
  $("garageGate").style.display = "none";
  $("garageBody").style.display = "block";
  const cars = getGarage();
  const wrap = $("garageCars");
  if (!cars.length) {
    wrap.innerHTML = '<div class="card" style="grid-column:1/-1;text-align:center;color:var(--ink-faint)">ยังไม่มีรถ — เพิ่มรถด้านล่างเพื่อให้ AI ประเมิน</div>';
    return;
  }
  wrap.innerHTML = cars.map((c, i) => {
    const h = health(c);
    const hc = h > 70 ? "var(--accent)" : h > 50 ? "var(--accent-2)" : "var(--danger)";
    const pr = predict(c);
    const hist = c.history || [];
    return `
      <div class="card tilt">
        <div class="gcar">
          <div class="gicon"><i class="ti ti-car"></i></div>
          <div style="flex:1">
            <h4>${esc(c.name)}</h4>
            <div class="gs">ปี ${esc(c.year) || "-"} · ${esc(c.mileage) || "-"} กม.</div>
            <div class="health"><i style="width:${h}%;background:${hc}"></i></div>
            <div class="gs" style="margin-top:4px">สุขภาพรถ ${h}%</div>
          </div>
          <button class="btn danger" onclick="rmCar(${i})" style="padding:7px 12px"><i class="ti ti-trash"></i></button>
        </div>
        <div class="block" style="border-top:1px solid var(--border);padding-top:12px">
          <div class="h"><i class="ti ti-brain"></i> AI ทำนายการบำรุงรักษา</div>
          <div class="timeline">
            ${pr.slice(0, 4).map(p => `
              <div class="tl-item ${p.cls}">
                <div class="t">${p.name} — ${p.txt}</div>
                <div class="s">รอบหน้า ~${p.next.toLocaleString()} กม. (อีก ${p.left.toLocaleString()} กม.)</div>
              </div>
            `).join("")}
          </div>
        </div>
        <button class="g-hist-toggle" data-car="${i}"><i class="ti ti-history"></i> ประวัติการวินิจฉัย (${hist.length})<i class="ti ti-chevron-down chev"></i></button>
        <div class="g-hist" id="gHist${i}">
          ${hist.length ? hist.map(h2 => `
            <div class="g-hist-item">
              <div class="ghi-top"><span class="dsev ${sevClass(h2.severity)}">${esc(h2.severity)}</span><span class="ghi-time">${timeAgo(h2.t)}</span></div>
              <div class="ghi-sum">${esc(h2.summary)}</div>
            </div>
          `).join("") : '<div class="g-hist-empty">ยังไม่มีประวัติการวินิจฉัยสำหรับรถคันนี้</div>'}
        </div>
      </div>`;
  }).join("");
}

function rmCar(i) {
  const c = getGarage();
  c.splice(i, 1);
  setGarage(c);
  renderGarage();
  renderCarBar();
  toast("ลบรถแล้ว", "ti-trash");
}

/* ===== E-SHOP RECOMMENDER ===== */
function renderShop(list) {
  $("shopGrid").innerHTML = list.map(p => `
    <div class="card product tilt">
      <div class="pimg" style="background:${p.bg}"><i class="ti ${p.ic}"></i></div>
      <div class="src"><i class="ti ti-world"></i> ${p.src}</div>
      <h4>${p.name}</h4>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="price">${p.price}</span>
        <span class="rate">${p.rate}</span>
      </div>
      ${p.url ? `<a class="buy" href="${p.url}" target="_blank" rel="noopener"><i class="ti ti-external-link"></i> ดูสินค้า</a>` : `<button class="buy"><i class="ti ti-external-link"></i> ดูสินค้า</button>`}
    </div>`).join("");
}

/* ===== PROJECT (AI CHAT DIAGNOSIS HOMEPAGE) ===== */
let projRotateTimer = null, projRotateIdx = 0;
let projActiveCarIdx = -1;
let pcAttachment = null; // { kind: photo|video|sound|other, b64, mime, name, url }
let pcMediaRec = null, pcChunks = [];

function projHeadlineText(i) {
  const p = PROJECT_PROMPTS[i % PROJECT_PROMPTS.length];
  return selectedLang === "en" ? p.en : p.th;
}

function startProjRotator() {
  const el = $("projHeadline");
  if (!el) return;
  clearInterval(projRotateTimer);
  el.textContent = projHeadlineText(projRotateIdx);
  projRotateTimer = setInterval(() => {
    el.classList.add("fade-out");
    setTimeout(() => {
      projRotateIdx++;
      el.textContent = projHeadlineText(projRotateIdx);
      el.classList.remove("fade-out");
    }, 360);
  }, 3600);
}

function renderCarBar() {
  const bar = $("pcCarBar");
  if (!bar) return;
  const cars = getGarage();
  if (projActiveCarIdx >= cars.length) projActiveCarIdx = -1;
  const general = selectedLang === "en" ? "General" : "ทั่วไป";
  bar.innerHTML = `<button class="pc-car${projActiveCarIdx === -1 ? ' sel' : ''}" data-car="-1"><i class="ti ti-sparkles"></i> ${general}</button>` +
    cars.map((c, i) => `<button class="pc-car${projActiveCarIdx === i ? ' sel' : ''}" data-car="${i}"><i class="ti ti-car"></i> ${esc(c.name)}</button>`).join("");
}

function clearAttachment() {
  pcAttachment = null;
  const at = $("pcAttach");
  at.style.display = "none";
  at.innerHTML = "";
}

function renderAttachPreview() {
  const at = $("pcAttach");
  if (!pcAttachment) {
    at.style.display = "none";
    at.innerHTML = "";
    return;
  }
  at.style.display = "flex";
  let body = "";
  if (pcAttachment.kind === "photo") body = `<img src="${pcAttachment.url}" class="pc-thumb"/>`;
  else if (pcAttachment.kind === "video") body = `<video src="${pcAttachment.url}" class="pc-thumb" muted></video>`;
  else if (pcAttachment.kind === "sound") body = `<i class="ti ti-microphone-2"></i><span>${esc(pcAttachment.name)}</span>`;
  else body = `<i class="ti ti-paperclip"></i><span>${esc(pcAttachment.name)}</span>`;
  at.innerHTML = `<div class="pc-attach-item">${body}<button class="pc-attach-x" id="pcAttachX"><i class="ti ti-x"></i></button></div>`;
  $("pcAttachX").onclick = clearAttachment;
}

function fileToAttachment(f, kind) {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = () => {
      const url = r.result;
      resolve({ kind, b64: url.split(",")[1], mime: f.type, name: f.name, url });
    };
    r.readAsDataURL(f);
  });
}

function addMsg(role, html) {
  const thread = $("projThread");
  const div = document.createElement("div");
  div.className = "msg " + role;
  div.innerHTML = `<div class="msg-bubble">${html}</div>`;
  thread.appendChild(div);
  thread.scrollTop = thread.scrollHeight;
  return div;
}

function userMsgHTML(text, attachment) {
  let att = "";
  if (attachment) {
    if (attachment.kind === "photo") att = `<img src="${attachment.url}" class="msg-thumb"/>`;
    else if (attachment.kind === "video") att = `<video src="${attachment.url}" class="msg-thumb" controls></video>`;
    else if (attachment.kind === "sound") att = `<audio src="${attachment.url}" controls></audio>`;
    else att = `<div class="msg-file"><i class="ti ti-paperclip"></i> ${esc(attachment.name)}</div>`;
  }
  return `${att}${text ? `<p>${esc(text)}</p>` : ""}`;
}

function loadingMsgHTML() {
  return `<div style="text-align:center"><div class="spinner"></div><div style="color:var(--ink-dim);font-weight:600">AI กำลังวิเคราะห์...</div></div>`;
}

function resultMsgHTML(dx) {
  const ai = dx.source !== "demo";
  return `
    <div class="ai-badge"><i class="ti ti-${ai ? 'sparkles' : 'robot'}"></i> ${ai ? 'Gemini AI' : 'ระบบจำลอง (Demo)'}</div>
    <div class="sev"><i class="ti ti-alert-triangle"></i> ความเร่งด่วน: ${esc(dx.severity)}</div>
    <p style="font-size:14px;color:var(--ink-dim)">${esc(dx.summary)}</p>
    <div class="block">
      <div class="h">สาเหตุที่เป็นไปได้</div>
      ${(dx.causes || []).map(c => `
        <div class="cause"><span class="pct">${c.pct}%</span><span>${esc(c.name)}</span></div>
        <div class="bar"><i style="width:${c.pct}%"></i></div>
      `).join("")}
    </div>
    <div class="block">
      <div class="h">คำแนะนำ</div>
      <ul class="steps">${(dx.steps || []).map(s => `<li><i class="ti ti-circle-check"></i>${esc(s)}</li>`).join("")}</ul>
    </div>
    <div class="block">
      <div class="h">ประมาณการค่าใช้จ่าย</div>
      <div style="font-size:18px;font-weight:800;color:var(--accent-2)">${esc(dx.cost || "-")}</div>
    </div>
    <div class="disclaimer">
      <i class="ti ti-info-circle"></i> ผลเบื้องต้นเพื่ออ้างอิงเท่านั้น กรุณานำรถเข้าตรวจที่ศูนย์/อู่เพื่อความปลอดภัย
    </div>`;
}

// Persist a diagnosis into the selected car's own history (kept latest 20)
function saveDiagToCar(dx) {
  if (projActiveCarIdx < 0) return;
  const cars = getGarage();
  const car = cars[projActiveCarIdx];
  if (!car) return;
  const hist = car.history || [];
  hist.unshift({ t: Date.now(), severity: dx.severity || "-", summary: dx.summary || "" });
  car.history = hist.slice(0, 20);
  setGarage(cars);
}

function attachToAICall(text) {
  const cars = getGarage();
  const car = projActiveCarIdx >= 0 ? cars[projActiveCarIdx] : null;
  const [brand, ...rest] = car ? car.name.split(" ") : [""];
  const base = { brand: car ? brand : "", model: car ? rest.join(" ") : "", year: car ? car.year : "", mileage: car ? car.mileage : "" };

  if (!pcAttachment) return { mode: "describe", params: { ...base, symptom: text || "-" } };
  const { kind, b64, mime, name } = pcAttachment;
  if (kind === "photo" || (kind === "other" && mime && mime.startsWith("image/")))
    return { mode: "photo", params: { ...base, imageBase64: b64, imageMediaType: mime, note: text } };
  if (kind === "video" || (kind === "other" && mime && mime.startsWith("video/")))
    return { mode: "video", params: { ...base, videoB64: b64, videoMime: mime, note: text } };
  if (kind === "sound")
    return { mode: "sound", params: { ...base, audioB64: b64, audioMime: mime } };
  return { mode: "describe", params: { ...base, symptom: (text ? text + " " : "") + "(แนบไฟล์: " + name + ")" } };
}

async function sendProjMessage() {
  const input = $("pcInput");
  const text = input.value.trim();
  if (!text && !pcAttachment) {
    toast("พิมพ์อาการ หรือแนบไฟล์ก่อน", "ti-alert-triangle");
    return;
  }
  $("projIdle").style.display = "none";
  $("projWrap").classList.add("chatting");

  addMsg("user", userMsgHTML(text, pcAttachment));
  const loadingEl = addMsg("ai", loadingMsgHTML());

  const { mode, params } = attachToAICall(text);
  const sentAttachment = pcAttachment;
  input.value = "";
  clearAttachment();

  try {
    const dx = await callAI(mode, params);
    loadingEl.querySelector(".msg-bubble").innerHTML = resultMsgHTML(dx);
    saveDiagToCar(dx);
    renderGarage();
  } catch (e) {
    loadingEl.querySelector(".msg-bubble").innerHTML = `<div class="disclaimer"><i class="ti ti-alert-triangle"></i> เกิดข้อผิดพลาด ลองใหม่อีกครั้ง</div>`;
  }
  const thread = $("projThread");
  thread.scrollTop = thread.scrollHeight;
}

/* ===== TRANSLATION & LOCALE CONTROL ===== */
function langTxt(el, s) {
  if (!el) return;
  const n = [...el.childNodes].reverse().find(x => x.nodeType === 3 && x.textContent.trim());
  if (n) n.textContent = " " + s;
  else el.textContent = s;
}

function applyLang(lang) {
  selectedLang = lang;
  LS.set("lang", lang);
  document.documentElement.lang = lang;
  const en = lang === "en";
  const nv = {
    project: ["Project", "Project"],
    garage: ["Garage", "Garage"],
    magazine: ["นิตยสาร", "Magazine"],
    profile: ["โปรไฟล์", "Profile"]
  };
  document.querySelectorAll(".nav-links a").forEach(a => {
    const k = a.dataset.view;
    if (nv[k]) langTxt(a, nv[k][en ? 1 : 0]);
  });
  langTxt($("loginBtn"), en ? "Sign in" : "เข้าสู่ระบบ");
  const sub = $("projSub");
  if (sub) sub.textContent = en
    ? "Type it out, snap a photo, record a video, or send a sound — let AI diagnose your car."
    : "พิมพ์ ถ่ายภาพ อัดวิดีโอ หรืออัดเสียง ให้ AI ช่วยวินิจฉัยรถของคุณ";
  projRotateIdx = 0;
  startProjRotator();
  renderCarBar();
  renderLangMini();
}

function renderLangCards() {
  if (!$("langCards")) return;
  $("langCards").innerHTML = LANGS.map(l =>
    `<div class="lang-card ${l.code === selectedLang ? 'sel' : ''}" data-lang="${l.code}">
      <span class="flag">${l.flag}</span>
      <div class="ln">${l.ln}</div>
      <div class="ls">${l.ls}</div>
    </div>`
  ).join("");
}

function renderLangMini() {
  if (!$("langMini")) return;
  $("langMini").innerHTML = LANGS.map(l =>
    `<button data-lang2="${l.code}" class="${l.code === selectedLang ? 'sel' : ''}" style="background:var(--ks-graphite);color:var(--ks-champagne)">${l.flag} ${l.ln}</button>`
  ).join("");
}

function hideWelcome() {
  $("welcome").classList.remove("show");
}

function showWelcome() {
  renderLangCards();
  $("wStep1").classList.add("active");
  $("wStep2").classList.remove("active");
  $("welcome").classList.add("show");
}

/* ===== REALTIME AI NEWS FETCH (magazine) ===== */
async function loadLiveNews() {
  if (!GEMINI_KEY) return;
  try {
    const { text } = await geminiCall([{
      text: `ค้นเว็บหาบทความรีวิว/เชิงลึกเกี่ยวกับรถยนต์ล่าสุด 4 เรื่อง ตอบเป็น JSON array เท่านั้น: [{"tag":"หมวด","title":"ชื่อบทความ","body":"สรุปสั้น"}]`
    }], { search: true, temp: 0.4 });
    const arr = gParse(text);
    if (Array.isArray(arr) && arr.length) {
      const ics = ["ti-news", "ti-car", "ti-bolt", "ti-tools"],
            bgs = ["linear-gradient(135deg,#3a8c52,#1f6b32)", "linear-gradient(135deg,#2f9e7a,#1a7a5e)", "linear-gradient(135deg,#3a7ce6,#2f5fd6)", "linear-gradient(135deg,#8c5a3a,#6b3f2f)"];
      mags.length = 0;
      arr.slice(0, 4).forEach((it, i) => mags.push({
        ic: ics[i % 4],
        bg: bgs[i % 4],
        pill: "p-tech",
        tag: it.tag || "ข่าว",
        title: it.title || "",
        body: it.body || "",
        issue: "LIVE"
      }));
      renderMags();
    }
  } catch (e) {
    console.warn("live mag", e);
  }
}

// Bind to window to allow HTML onclicks to work (required in ES modules)
window.rmCar = rmCar;
window.openAuth = openAuth;
window.closeAuth = closeAuth;

/* ==========================================================================
   INITIALIZATION & EVENT BINDINGS
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Bind global page-switch router click handler
  document.addEventListener("click", e => {
    const n = e.target.closest("[data-view]");
    if (n) {
      e.preventDefault();
      switchView(n.dataset.view, n.dataset.sub || n.dataset.set);
    }
  });

  // Quick-suggestion chip clicks fill the composer input
  $("projChips").addEventListener("click", e => {
    const c = e.target.closest(".chip");
    if (!c) return;
    $("pcInput").value = c.dataset.t;
    $("pcInput").focus();
  });

  // Car selector bar (general vs specific garage car)
  $("pcCarBar").addEventListener("click", e => {
    const b = e.target.closest(".pc-car");
    if (!b) return;
    projActiveCarIdx = parseInt(b.dataset.car, 10);
    renderCarBar();
  });

  // Garage diagnosis history toggle
  $("garageCars").addEventListener("click", e => {
    const b = e.target.closest(".g-hist-toggle");
    if (!b) return;
    const panel = $("gHist" + b.dataset.car);
    if (panel) panel.classList.toggle("open");
    b.classList.toggle("open");
  });

  // Welcome page robot 3D animation
  document.addEventListener("mousemove", e => {
    const wr = $("wRobot");
    if (!wr || document.body.dataset.motion === "0" || !$("welcome").classList.contains("show")) return;
    const x = e.clientX / window.innerWidth - 0.5,
          y = e.clientY / window.innerHeight - 0.5;
    wr.style.transform = `perspective(1300px) rotateY(${x * 9}deg) rotateX(${-y * 6}deg) scale(1.05)`;
  });

  // Profile save setting click handlers
  $("saveProfile").onclick = async () => {
    const name = $("setName").value.trim();
    if (!name) {
      toast("กรอกชื่อ", "ti-alert-triangle");
      return;
    }
    if (useFirebase && auth.currentUser) {
      await auth.currentUser.updateProfile({ displayName: name });
      await db.ref("users/" + state.currentUser.uid + "/name").set(name);
    }
    state.currentUser.name = name;
    $("ddName").textContent = name;
    $("profileName").textContent = name;
    if (!state.currentUser.photo) {
      $("avatarBtn").innerHTML = `<span class="fb">${name.charAt(0).toUpperCase()}</span>`;
    }
    toast("บันทึกแล้ว", "ti-check");
  };

  $("resetWelcome").onclick = () => {
    LS.del("onboarded");
    toast("รีเซ็ตแล้ว — รีเฟรชหน้าเพื่อดู Welcome", "ti-refresh");
  };

  document.querySelectorAll(".toggle").forEach(t => {
    if (t.id !== "tgMotion") t.addEventListener("click", () => t.classList.toggle("on"));
  });

  $("tgMotion").addEventListener("click", () => {
    $("tgMotion").classList.toggle("on");
    const on = $("tgMotion").classList.contains("on");
    document.body.dataset.motion = on ? "1" : "0";
    LS.set("motion", on);
  });

  // Theme settings bindings
  $("themeMini").addEventListener("click", e => {
    const b = e.target.closest("[data-theme-key]");
    if (!b) return;
    applyTheme(b.dataset.themeKey);
    if (useFirebase && state.currentUser) db.ref("users/" + state.currentUser.uid + "/theme").set(b.dataset.themeKey).catch(() => {});
    toast("เปลี่ยนธีมแล้ว", "ti-palette");
  });

  $("refreshUsers").onclick = loadAdmin;

  /* ----- PROJECT COMPOSER: attachments ----- */
  $("pcPhotoBtn").onclick = () => $("pcPhotoInput").click();
  $("pcVideoBtn").onclick = () => $("pcVideoInput").click();
  $("pcOtherBtn").onclick = () => $("pcOtherInput").click();

  $("pcPhotoInput").addEventListener("change", async e => {
    const f = e.target.files[0];
    if (!f) return;
    pcAttachment = await fileToAttachment(f, "photo");
    renderAttachPreview();
    e.target.value = "";
  });
  $("pcVideoInput").addEventListener("change", async e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast("คลิปใหญ่ไป (<10MB) ลองคลิปสั้นลง ~5-10 วิ", "ti-alert-triangle");
      return;
    }
    pcAttachment = await fileToAttachment(f, "video");
    renderAttachPreview();
    e.target.value = "";
  });
  $("pcOtherInput").addEventListener("change", async e => {
    const f = e.target.files[0];
    if (!f) return;
    pcAttachment = await fileToAttachment(f, "other");
    renderAttachPreview();
    e.target.value = "";
  });

  // Voice note recording (toggle on pcSoundBtn)
  $("pcSoundBtn").onclick = async () => {
    if (pcMediaRec && pcMediaRec.state === "recording") {
      pcMediaRec.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      pcChunks = [];
      pcMediaRec = new MediaRecorder(stream);
      pcMediaRec.ondataavailable = e => pcChunks.push(e.data);
      pcMediaRec.onstop = async () => {
        const blob = new Blob(pcChunks, { type: "audio/webm" });
        const b64 = await blobToB64(blob);
        pcAttachment = { kind: "sound", b64, mime: "audio/webm", name: "บันทึกเสียง", url: URL.createObjectURL(blob) };
        renderAttachPreview();
        $("pcSoundBtn").classList.remove("recording");
        stream.getTracks().forEach(t => t.stop());
      };
      pcMediaRec.start();
      $("pcSoundBtn").classList.add("recording");
      toast("กำลังอัดเสียง... แตะอีกครั้งเพื่อหยุด", "ti-microphone-2");
    } catch (err) {
      toast("ไม่สามารถใช้ไมโครโฟน", "ti-microphone-off");
    }
  };

  $("pcSend").onclick = sendProjMessage;
  $("pcInput").addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendProjMessage();
    }
  });

  // GARAGE Add Car event
  $("gAdd").onclick = () => {
    if (!state.currentUser) {
      openAuth();
      return;
    }
    const name = $("gName").value.trim();
    if (!name) {
      toast("กรอกยี่ห้อ/รุ่น", "ti-alert-triangle");
      return;
    }
    const cars = getGarage();
    cars.push({ name, year: $("gYear").value.trim(), mileage: $("gMileage").value.trim(), history: [] });
    setGarage(cars);
    $("gName").value = "";
    $("gYear").value = "";
    $("gMileage").value = "";
    renderGarage();
    renderCarBar();
    toast("เพิ่มรถแล้ว — AI ประเมินให้", "ti-check");
  };

  // SHOP Query Event (now inside Profile)
  $("shopGo").onclick = async () => {
    const q = $("shopQuery").value.trim() || "อะไหล่และอุปกรณ์รถยนต์ยอดนิยม";
    $("shopGrid").innerHTML = '<div class="card" style="grid-column:1/-1;text-align:center"><div class="spinner"></div>Gemini กำลังค้นหาสินค้าจริงจากอินเทอร์เน็ต...</div>';
    if (GEMINI_KEY) {
      try {
        const { text } = await geminiCall([{
          text: `ค้นหาสินค้า/อะไหล่รถยนต์จริงจากร้านค้าออนไลน์ในไทย (Lazada, Shopee, ฯลฯ) ตามคำค้น: "${q}" แนะนำ 6 รายการที่มีขายจริง ตอบเป็น JSON array เท่านั้น ไม่มีข้อความอื่น: [{"name":"ชื่อสินค้า","price":"฿ราคาโดยประมาณ","src":"ร้าน/แพลตฟอร์ม","rate":"★คะแนน","url":"ลิงก์สินค้า/ค้นหา"}]`
        }], { search: true, temp: 0.5 });
        const arr = gParse(text);
        if (Array.isArray(arr) && arr.length) {
          const ics = ["ti-disc", "ti-oil", "ti-battery", "ti-engine", "ti-bulb", "ti-air-conditioning"],
                bgs = ["linear-gradient(135deg,#3a8ce6,#2f6fd6)", "linear-gradient(135deg,#c98a2e,#9e6a1a)", "linear-gradient(135deg,#2f9e7a,#1a7a5e)", "linear-gradient(135deg,#9b5de5,#7048c4)", "linear-gradient(135deg,#8c5a3a,#6b3f2f)", "linear-gradient(135deg,#3ab4d6,#2f7fb8)"];
          renderShop(arr.slice(0, 6).map((p, i) => ({
            ic: ics[i % 6],
            bg: bgs[i % 6],
            name: p.name || "-",
            price: p.price || "-",
            src: p.src || "ออนไลน์",
            rate: p.rate || "",
            url: p.url
          })));
          toast("แนะนำสินค้าจริงจากเน็ต (Gemini)", "ti-world-search");
          return;
        }
      } catch (e) {
        console.warn("shop gemini", e);
        toast("ค้นไม่สำเร็จ ใช้รายการตัวอย่าง", "ti-alert-triangle");
      }
    }
    let list = shopDemo;
    if (q) {
      const k = q.toLowerCase();
      const f = shopDemo.filter(p => p.name.toLowerCase().includes(k));
      list = f.length ? f : shopDemo;
    }
    renderShop(list);
  };

  // Welcome page locale setup bindings
  $("wNext").onclick = () => {
    $("wStep1").classList.remove("active");
    $("wStep2").classList.add("active");
  };

  // Set background picker on clicks
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-bgk]");
    if (b) applyBg(b.dataset.bgk);
  });

  // Language Picker handlers
  document.addEventListener("click", e => {
    const c = e.target.closest("[data-lang]");
    if (c) {
      applyLang(c.dataset.lang);
      renderLangCards();
    }
    const b = e.target.closest("[data-lang2]");
    if (b) {
      applyLang(b.dataset.lang2);
      renderLangMini();
    }
  });

  // Profile submenu settings bindings
  $("setNav").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (b) selectSet(b.dataset.set);
  });

  // Deactivate account click handler
  $("deactivateBtn").onclick = async () => {
    if (!state.currentUser) return;
    if (!confirm("ปิดการใช้งานบัญชีถาวร? ข้อมูลจะหายหมด")) return;
    try {
      await db.ref("users/" + state.currentUser.uid).remove();
      await auth.currentUser.delete();
      toast("ปิดบัญชีแล้ว", "ti-user-x");
      switchView("project");
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        try {
          const p = new firebase.auth.GoogleAuthProvider();
          await auth.currentUser.reauthenticateWithPopup(p);
          await db.ref("users/" + state.currentUser.uid).remove();
          await auth.currentUser.delete();
          toast("ปิดบัญชีแล้ว", "ti-user-x");
          switchView("project");
        } catch (e2) {
          toast("ยกเลิก", "ti-x");
        }
      } else toast("ไม่สำเร็จ: " + err.code, "ti-x");
    }
  };

  // Reset Welcome Overlay close preview trigger
  if (location.protocol === "file:" && $("wPreview")) {
    $("wPreview").style.display = "block";
    $("wPreview").onclick = () => hideWelcome();
  }

  // --- INITIALIZE & START SYSTEM ---
  applyTheme(LS.get("theme", "kinpaku"));
  applyBg(LS.get("bg", "default"));
  fillBrands();
  applyLang(LS.get("lang", "th"));

  if (LS.get("motion", true) === false) {
    document.body.dataset.motion = "0";
    $("tgMotion").classList.remove("on");
  }

  renderMags();
  renderShop(shopDemo);
  renderGarage();
  renderCarBar();
  renderLangMini();
  renderBgPick();

  // Parallax & Tilt initialization
  initMotionEffects();

  setTimeout(moveNavInd, 120);
  setTimeout(revealActive, 60);

  // Load live data from AI search
  loadLiveNews();

  // If user is not logged in, trigger welcome onboarding modal
  if (!state.currentUser) {
    showWelcome();
  }

  if (!useFirebase) {
    onLogout();
  }
});
