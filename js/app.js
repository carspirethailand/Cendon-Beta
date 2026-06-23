/* ==========================================================================
   MAIN APPLICATION MODULE (js/app.js)
   ========================================================================== */

import { $, LS, gParse, blobToB64, toast } from './helper.js';
import { 
  fbConfig, ADMINS, GEMINI_KEY, GEMINI_MODEL, 
  briefs, mags, bbSlides, BRANDS, QUIZ, THEMES, BGS 
} from './config.js';
import { 
  auth, db, useFirebase, state, onAuthChange, 
  openAuth, closeAuth, toggleDropdown, closeDropdown, 
  picHTML, googleSignIn, doLogout 
} from './auth.js';
import { callAI, geminiCall } from './ai.js';
import { updateGreeting, revealActive, initMotionEffects, spawnParticles } from './ui.js';

// Global variables for local app state
let bbIdx = 0, bbTimer = null;
let qi = 0, qscore = 0;
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

/* ===== BILLBOARD RENDER ===== */
function renderBillboard() {
  const tr = $("bbTrack");
  if (!tr) return;
  tr.innerHTML = bbSlides.map(s => `<div class="bb-slide acc-${s.acc}"><span class="bb-tag"><i class="ti ${s.icon}"></i> ${s.tag}</span><h2>${s.title}</h2><p>${s.body}</p></div>`).join("");
  $("bbDots").innerHTML = bbSlides.map((_, i) => `<button class="bb-dot${i ? '' : ' on'}" data-bb="${i}"></button>`).join("");
  bbGo(0);
  bbAuto();
}

function bbGo(i) {
  bbIdx = (i + bbSlides.length) % bbSlides.length;
  const tr = $("bbTrack");
  if (!tr) return;
  tr.style.transform = `translateX(${-bbIdx * 100}%)`;
  document.querySelectorAll(".bb-dot").forEach((d, j) => d.classList.toggle("on", j === bbIdx));
}

function bbAuto() {
  clearInterval(bbTimer);
  if (document.body.dataset.motion === "0") return;
  bbTimer = setInterval(() => bbGo(bbIdx + 1), 5500);
}

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
      <div class="issue">${m.issue}</div>
    </div>
  `).join("");
}

function setDate() {
  const el = $("briefSub");
  if (!el) return;
  const d = new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  el.textContent = "ข่าวสารยานยนต์ประจำวัน " + d;
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
  if (v === "diagnose" && sub) selectDiagTab(sub);
  
  moveNavInd();
  if (v === "home") updateGreeting();
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
  updateGreeting();
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

/* ===== CAR DIAGNOSTICS TAB CONTROLLER ===== */
function selectDiagTab(s) {
  document.querySelectorAll("#diagTabs button").forEach(b => b.classList.toggle("active", b.dataset.sub === s));
  document.querySelectorAll(".subpanel").forEach(p => p.classList.toggle("active", p.dataset.sub === s));
}

function loading(label, sub) {
  $("result").innerHTML = `
    <div style="text-align:center">
      <div class="spinner"></div>
      <div style="color:var(--ink-dim);font-weight:600">${label}</div>
      <div style="color:var(--ink-faint);font-size:13px;margin-top:6px">${sub || ""}</div>
    </div>`;
}

function showResult(dx) {
  const ai = dx.source !== "demo";
  $("result").innerHTML = `
    <div>
      <div class="ai-badge"><i class="ti ti-${ai ? 'sparkles' : 'robot'}"></i> ${ai ? 'Gemini AI' : 'ระบบจำลอง (Demo)'}</div>
      <h3 style="font-size:18px;font-weight:800">ผลวินิจฉัยเบื้องต้น</h3>
      <div class="sev"><i class="ti ti-alert-triangle"></i> ความเร่งด่วน: ${dx.severity}</div>
      <p style="font-size:14px;color:var(--ink-dim)">${dx.summary}</p>
      <div class="block">
        <div class="h">สาเหตุที่เป็นไปได้</div>
        ${(dx.causes || []).map(c => `
          <div class="cause"><span class="pct">${c.pct}%</span><span>${c.name}</span></div>
          <div class="bar"><i style="width:${c.pct}%"></i></div>
        `).join("")}
      </div>
      <div class="block">
        <div class="h">คำแนะนำ</div>
        <ul class="steps">${(dx.steps || []).map(s => `<li><i class="ti ti-circle-check"></i>${s}</li>`).join("")}</ul>
      </div>
      <div class="block">
        <div class="h">ประมาณการค่าใช้จ่าย</div>
        <div style="font-size:18px;font-weight:800;color:var(--accent-2)">${dx.cost || "-"}</div>
      </div>
      <div class="disclaimer">
        <i class="ti ti-info-circle"></i> ผลเบื้องต้นเพื่ออ้างอิงเท่านั้น กรุณานำรถเข้าตรวจที่ศูนย์/อู่เพื่อความปลอดภัย
      </div>
    </div>`;
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

/* ===== CAR-CARE QUIZ GAME ===== */
function renderQuiz() {
  qi = 0;
  qscore = 0;
  showQ();
}

function showQ() {
  const b = $("qBody");
  if (!b) return;
  const bar = $("qBar");
  if (bar) bar.style.width = (qi / QUIZ.length * 100) + "%";
  if (qi >= QUIZ.length) {
    const pct = Math.round(qscore / QUIZ.length * 100);
    b.innerHTML = `
      <div class="qres">
        <div class="big">${qscore}/${QUIZ.length}</div>
        <p style="margin:8px 0 2px;font-size:15px">
          ${pct >= 75 ? "เก่งมาก! รู้จักรถดีเลย 🚗" : pct >= 50 ? "ดีนะ รู้พอตัว 👍" : "ไม่เป็นไร เดี๋ยว SpireONE ดูแลรถให้เอง 😉"}
        </p>
        <button class="qbtn" onclick="renderQuiz()"><i class="ti ti-rotate"></i> เล่นอีกครั้ง</button>
      </div>`;
    return;
  }
  const it = QUIZ[qi];
  b.innerHTML = `
    <div class="qq">${qi + 1}. ${it.q}</div>
    <div class="qopts">${it.o.map((o, i) => `<div class="qopt" data-qo="${i}">${o}</div>`).join("")}</div>`;
}

/* ===== DIGITAL GARAGE ===== */
function getGarage() {
  return LS.get("garage", []);
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
    return `
      <div class="card tilt">
        <div class="gcar">
          <div class="gicon"><i class="ti ti-car"></i></div>
          <div style="flex:1">
            <h4>${c.name}</h4>
            <div class="gs">ปี ${c.year || "-"} · ${(c.mileage || "-")} กม.</div>
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
      </div>`;
  }).join("");
}

function rmCar(i) {
  const c = getGarage();
  c.splice(i, 1);
  LS.set("garage", c);
  renderGarage();
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
    home: ["หน้าแรก", "Home"], 
    magazine: ["นิตยสาร", "Magazine"], 
    diagnose: ["วินิจฉัย", "Diagnose"], 
    garage: ["Garage", "Garage"], 
    shop: ["ช็อป", "Shop"] 
  };
  document.querySelectorAll(".nav-links a").forEach(a => {
    const k = a.dataset.view;
    if (nv[k]) langTxt(a, nv[k][en ? 1 : 0]);
  });
  langTxt($("loginBtn"), en ? "Sign in" : "เข้าสู่ระบบ");
  const eb = document.querySelector("#view-home .eyebrow");
  if (eb) langTxt(eb, en ? "AI-POWERED CAR CARE" : "นวัตกรรมดูแลรถด้วย AI");
  const hh = document.querySelector("#view-home .hero h1");
  if (hh) hh.innerHTML = en ? 'Your smart garage,<br/>in <span class="hl">your pocket</span>' : 'ผู้ช่วยอู่<span class="hl">อัจฉริยะ</span><br/>ในมือคุณ';
  const hp = document.querySelector("#view-home .hero p");
  if (hp) hp.textContent = en ? "Diagnose by photo, engine sound and real OBD-II. Predict issues early. Find parts online — powered by Claude AI." : "วินิจฉัยด้วยภาพ เสียงเครื่อง และ OBD-II จริง · ทำนายอาการล่วงหน้า · แนะนำอะไหล่จากอินเทอร์เน็ต — ขับเคลื่อนด้วย Claude AI";
  langTxt(document.querySelector("#view-home .hero-cta"), en ? "Start diagnosing" : "เริ่มวินิจฉัยรถของคุณ");
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

/* ===== REALTIME AI NEWS FETCH ===== */
async function loadLiveNews() {
  if (!GEMINI_KEY) return;
  try {
    const { text } = await geminiCall([{ 
      text: `ค้นเว็บหาข่าวยานยนต์/รถยนต์ในไทยล่าสุด 4 ข่าว แล้วตอบเป็น JSON array เท่านั้น ไม่มีข้อความอื่น: [{"tag":"หมวด","title":"พาดหัวสั้น","body":"สรุป 1 ประโย"}]` 
    }], { search: true, temp: 0.4 });
    const arr = gParse(text);
    if (Array.isArray(arr) && arr.length) {
      const accs = ["gold", "cyan", "green", "gold"];
      bbSlides.length = 0;
      arr.slice(0, 4).forEach((it, i) => bbSlides.push({ 
        tag: (it.tag || "NEWS").toUpperCase(), 
        icon: "ti-news", 
        acc: accs[i % 4], 
        title: it.title || "", 
        body: it.body || "" 
      }));
      renderBillboard();
    }
  } catch (e) {
    console.warn("live news", e);
  }
  
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
window.renderQuiz = renderQuiz;
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

  // Billboard Slider Swipe handlers
  const t = $("bbTrack");
  if (t) {
    let sx = null;
    const ds = e => { sx = (e.touches ? e.touches[0].clientX : e.clientX); };
    const de = e => {
      if (sx === null) return;
      const x = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX),
            dx = x - sx;
      sx = null;
      if (Math.abs(dx) > 50) {
        bbGo(bbIdx + (dx < 0 ? 1 : -1));
        bbAuto();
      }
    };
    t.addEventListener("mousedown", ds);
    t.addEventListener("touchstart", ds, { passive: true });
    window.addEventListener("mouseup", de);
    t.addEventListener("touchend", de);
  }

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

  // DIAGNOSTIC TABS & INPUT BINDINGS
  $("chips").addEventListener("click", e => {
    const c = e.target.closest(".chip");
    if (!c) return;
    c.classList.toggle("on");
    const ta = $("dSymptom");
    if (c.classList.contains("on")) ta.value = ta.value ? ta.value + ", " + c.dataset.t : c.dataset.t;
  });

  $("goDescribe").onclick = async () => {
    const brand = $("dBrand").value,
          model = $("dModel").value.trim(),
          symptom = $("dSymptom").value.trim();
    if (!brand && !model) {
      toast("เลือกยี่ห้อหรือกรอกรุ่น", "ti-alert-triangle");
      return;
    }
    if (!symptom) {
      toast("กรอกอาการ", "ti-alert-triangle");
      return;
    }
    loading("AI กำลังวิเคราะห์อาการ...", `${brand} ${model}`);
    const dx = await callAI("describe", {
      brand, model, year: $("dYear").value, mileage: $("dMileage").value, symptom
    });
    showResult(dx);
  };

  // Diagnostic Photo Upload handlers
  const pd = $("photoDrop"),
        pi = $("photoInput");
  let photoB64 = null, photoMime = null;
  pd.addEventListener("click", () => pi.click());
  ["dragover", "dragenter"].forEach(ev => pd.addEventListener(ev, e => { e.preventDefault(); pd.classList.add("drag"); }));
  ["dragleave", "drop"].forEach(ev => pd.addEventListener(ev, e => { e.preventDefault(); pd.classList.remove("drag"); }));
  pd.addEventListener("drop", e => { if (e.dataTransfer.files[0]) handlePhoto(e.dataTransfer.files[0]); });
  pi.addEventListener("change", e => { if (e.target.files[0]) handlePhoto(e.target.files[0]); });

  function handlePhoto(f) {
    if (!f.type.startsWith("image/")) {
      toast("เลือกรูปภาพ", "ti-alert-triangle");
      return;
    }
    photoMime = f.type;
    const r = new FileReader();
    r.onload = () => {
      const url = r.result;
      $("photoImg").src = url;
      photoB64 = url.split(",")[1];
      $("photoName").textContent = "📎 " + f.name;
      $("photoPrev").style.display = "block";
    };
    r.readAsDataURL(f);
  }

  $("goPhoto").onclick = async () => {
    if (!photoB64) {
      toast("เลือกรูปก่อน", "ti-alert-triangle");
      return;
    }
    loading("AI กำลังดูภาพ...", "วิเคราะห์ด้วย vision");
    const dx = await callAI("photo", {
      imageBase64: photoB64, imageMediaType: photoMime, note: $("photoNote").value,
      brand: $("dBrand").value, model: $("dModel").value, year: $("dYear").value, mileage: $("dMileage").value
    });
    showResult(dx);
  };

  // Diagnostic Video Upload handlers
  const vd = $("vidDrop"),
        vfi = $("vidInput");
  let videoB64 = null, videoMime = null;
  vd && vd.addEventListener("click", () => vfi.click());
  vfi && vfi.addEventListener("change", e => { if (e.target.files[0]) handleVid(e.target.files[0]); });
  ["dragover", "dragenter"].forEach(ev => vd && vd.addEventListener(ev, e => { e.preventDefault(); vd.classList.add("drag"); }));
  ["dragleave", "drop"].forEach(ev => vd && vd.addEventListener(ev, e => { e.preventDefault(); vd.classList.remove("drag"); }));
  vd && vd.addEventListener("drop", e => { if (e.dataTransfer.files[0]) handleVid(e.dataTransfer.files[0]); });

  function handleVid(f) {
    if (!f.type.startsWith("video/")) {
      toast("เลือกไฟล์วิดีโอ", "ti-alert-triangle");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast("คลิปใหญ่ไป (<10MB) ลองคลิปสั้นลง ~5-10 วิ", "ti-alert-triangle");
      return;
    }
    videoMime = f.type;
    $("vidEl").src = URL.createObjectURL(f);
    $("vidName").textContent = "🎬 " + f.name;
    $("vidPrev").style.display = "block";
    const r = new FileReader();
    r.onload = () => { videoB64 = r.result.split(",")[1]; };
    r.readAsDataURL(f);
  }

  $("goVideo").onclick = async () => {
    if (!videoB64) {
      toast("เลือกวิดีโอก่อน", "ti-alert-triangle");
      return;
    }
    loading("AI กำลังดูวิดีโอ...", "Gemini วิเคราะห์ภาพ+เสียงในคลิป");
    const dx = await callAI("video", {
      videoB64, videoMime, note: $("vidNote").value, brand: $("dBrand").value, model:
      $("dModel").value, year: $("dYear").value, mileage: $("dMileage").value
    });
    showResult(dx);
  };

  // Sound Recording Handler
  let mediaRec = null, chunks = [], audioBlob = null;
  $("recBtn").onclick = async () => {
    if (mediaRec && mediaRec.state === "recording") {
      mediaRec.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      mediaRec = new MediaRecorder(stream);
      mediaRec.ondataavailable = e => chunks.push(e.data);
      mediaRec.onstop = () => {
        audioBlob = new Blob(chunks, { type: "audio/webm" });
        $("audioEl").src = URL.createObjectURL(audioBlob);
        $("audioPrev").style.display = "block";
        $("wave").style.display = "none";
        $("recBtn").classList.remove("recording");
        $("recBtn").innerHTML = '<i class="ti ti-microphone"></i>';
        $("recStatus").textContent = "อัดเสร็จแล้ว — แตะอัดใหม่ได้";
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRec.start();
      $("recBtn").classList.add("recording");
      $("recBtn").innerHTML = '<i class="ti ti-player-stop"></i>';
      $("recStatus").textContent = "กำลังอัด... แตะเพื่อหยุด";
      $("wave").style.display = "flex";
      $("wave").innerHTML = Array.from({ length: 9 }).map((_, i) => `<i style="animation-delay:${i * .1}s"></i>`).join("");
    } catch (err) {
      toast("ไม่สามารถใช้ไมโครโฟน", "ti-microphone-off");
    }
  };

  $("goSound").onclick = async () => {
    if (!audioBlob) {
      toast("อัดเสียงก่อน", "ti-alert-triangle");
      return;
    }
    loading("AI กำลังฟังเสียง...", "Gemini วิเคราะห์เสียงเครื่องยนต์จริง");
    const audioB64 = await blobToB64(audioBlob);
    const dx = await callAI("sound", { audioB64, audioMime: "audio/webm", brand: $("dBrand").value, model: $("dModel").value });
    showResult(dx);
  };

  // OBD-II simulated device connection
  let obdData = null;
  $("obdConnect").onclick = () => {
    const sc = $("obdScreen");
    sc.style.display = "block";
    sc.innerHTML = '<div style="text-align:center;padding:30px"><div class="spinner"></div>กำลังเชื่อมต่อกล่อง OBD-II...</div>';
    setTimeout(() => {
      obdData = {
        rpm: 820,
        coolant: 96,
        speed: 0,
        load: 18,
        voltage: 14.1,
        dtc: ["P0301 — Misfire สูบ 1", "P0420 — ประสิทธิภาพแคทต่ำ"]
      };
      sc.innerHTML = `
        <div style="margin-bottom:10px"><span class="led"></span>เชื่อมต่อสำเร็จ — ELM327</div>
        <div class="obd-line"><span>รอบเครื่อง (RPM)</span><span class="v">${obdData.rpm}</span></div>
        <div class="obd-line"><span>อุณหภูมิน้ำ (°C)</span><span class="v">${obdData.coolant}</span></div>
        <div class="obd-line"><span>โหลดเครื่อง (%)</span><span class="v">${obdData.load}</span></div>
        <div class="obd-line"><span>ไฟแบต (V)</span><span class="v">${obdData.voltage}</span></div>
        ${obdData.dtc.map(d => `<div class="dtc"><i class="ti ti-alert-triangle"></i> ${d}</div>`).join("")}`;
      $("goObd").style.display = "flex";
      toast("เชื่อม OBD-II สำเร็จ (จำลอง)", "ti-plug-connected");
    }, 1800);
  };

  $("goObd").onclick = async () => {
    loading("AI กำลังแปลผล OBD...", "วิเคราะห์รหัส DTC");
    const dx = await callAI("obd", { obd: obdData, symptom: "พบรหัส " + (obdData ? obdData.dtc.join(", ") : "") });
    if (dx.source === "demo") {
      dx.summary = "พบรหัส P0301 (สูบ 1 จุดระเบิดผิดพลาด) และ P0420 (แคทเสื่อม) — AI แนะนำตรวจหัวเทียน/คอยล์สูบ 1 ก่อน";
      dx.causes = [{ name: "หัวเทียน/คอยล์ สูบ 1", pct: 70 }, { name: "หัวฉีดสูบ 1 ตัน", pct: 42 }, { name: "แคตตาไลติกเสื่อม", pct: 38 }];
      dx.steps = ["เปลี่ยน/ตรวจหัวเทียนสูบ 1", "สลับคอยล์เพื่อทดสอบ", "ตรวจแคทหลังแก้ misfire"];
      dx.severity = "ปานกลาง-สูง";
      dx.cost = "800 – 12,000 บาท";
    }
    showResult(dx);
  };

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
    cars.push({ name, year: $("gYear").value.trim(), mileage: $("gMileage").value.trim() });
    LS.set("garage", cars);
    $("gName").value = "";
    $("gYear").value = "";
    $("gMileage").value = "";
    renderGarage();
    toast("เพิ่มรถแล้ว — AI ประเมินให้", "ti-check");
  };

  // SHOP Query Event
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

  // Replay Quiz button window click binding
  document.addEventListener("click", e => {
    if (e.target.closest(".qbtn")) {
      renderQuiz();
    }
  });

  // Deactivate account click handler
  $("deactivateBtn").onclick = async () => {
    if (!state.currentUser) return;
    if (!confirm("ปิดการใช้งานบัญชีถาวร? ข้อมูลจะหายหมด")) return;
    try {
      await db.ref("users/" + state.currentUser.uid).remove();
      await auth.currentUser.delete();
      toast("ปิดบัญชีแล้ว", "ti-user-x");
      switchView("home");
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        try {
          const p = new firebase.auth.GoogleAuthProvider();
          await auth.currentUser.reauthenticateWithPopup(p);
          await db.ref("users/" + state.currentUser.uid).remove();
          await auth.currentUser.delete();
          toast("ปิดบัญชีแล้ว", "ti-user-x");
          switchView("home");
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
  renderQuiz();
  applyLang(LS.get("lang", "th"));
  
  if (LS.get("motion", true) === false) {
    document.body.dataset.motion = "0";
    $("tgMotion").classList.remove("on");
  }
  
  setDate();
  renderBillboard();
  renderMags();
  renderShop(shopDemo);
  renderGarage();
  renderLangMini();
  renderBgPick();
  updateGreeting();
  
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
