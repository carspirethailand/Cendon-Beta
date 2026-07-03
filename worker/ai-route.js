/* ═══════════════════════════════════════════════════════════════════
   SpireONE — /api/ai route สำหรับ Cloudflare Worker เดิมของคุณ
   (spireonebackend.carspirethailand.workers.dev)

   วิธีติดตั้ง:
   1. Cloudflare Dashboard → Workers → spireonebackend → Settings →
      Variables → เพิ่ม Secret ชื่อ GEMINI_KEY = คีย์ Gemini ของคุณ
      (คีย์เดิมที่เคยอยู่ใน chat.html — แนะนำ regenerate คีย์ใหม่ก่อน
       เพราะคีย์เก่าเคยอยู่ในหน้าเว็บสาธารณะมาแล้ว)
   2. เอาโค้ดไฟล์นี้ไปวางใน worker เดิม แล้วเพิ่ม 2 บรรทัดใน fetch handler:

        if (url.pathname === "/api/ai" && request.method === "POST")
          return handleAI(request, env);
        if (url.pathname === "/api/ai" && request.method === "OPTIONS")
          return corsPreflight(request);

   3. Deploy — เสร็จ. chat.html เวอร์ชันใหม่เรียก /api/ai ให้เองอยู่แล้ว
   ═══════════════════════════════════════════════════════════════════ */

const FIREBASE_PROJECT_ID = "sp1p-82396";
const GEMINI_MODEL = "gemini-2.5-flash";

// โดเมนที่อนุญาตให้เรียก API (แก้เป็นโดเมนจริงของเว็บคุณ)
const ALLOWED_ORIGINS = [
  "https://carspirethailand.github.io",
  "http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:5500", "http://127.0.0.1:5500",
];

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const ok = ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function corsPreflight(request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

/* ตรวจ Firebase ID token กับ Google — ต้องล็อกอินจริงเท่านั้นถึงใช้ AI ได้
   (กันคนนอกยิง endpoint ตรงๆ เพื่อเผา quota ของคุณ) */
async function verifyFirebaseToken(request) {
  const authz = request.headers.get("Authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!token) return null;
  try {
    const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(token));
    if (!r.ok) return null;
    const info = await r.json();
    if (info.aud !== FIREBASE_PROJECT_ID) return null;      // token ของโปรเจกต์เราเท่านั้น
    if (Number(info.exp) * 1000 < Date.now()) return null;  // หมดอายุ
    return { uid: info.sub || info.user_id, email: info.email || "" };
  } catch (e) { return null; }
}

export async function handleAI(request, env) {
  const cors = corsHeaders(request);

  const user = await verifyFirebaseToken(request);
  if (!user)
    return new Response(JSON.stringify({ error: "unauthorized — login required" }),
      { status: 401, headers: { "Content-Type": "application/json", ...cors } });

  let payload;
  try { payload = await request.json(); }
  catch (e) { return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers: { "Content-Type": "application/json", ...cors } }); }

  const { contents, system, search, temp } = payload || {};
  if (!Array.isArray(contents) || !contents.length)
    return new Response(JSON.stringify({ error: "contents required" }), { status: 400, headers: { "Content-Type": "application/json", ...cors } });

  // กัน payload ใหญ่ผิดปกติ (เช่นยัดรูปเกิน ~8MB)
  if (JSON.stringify(contents).length > 8_000_000)
    return new Response(JSON.stringify({ error: "payload too large" }), { status: 413, headers: { "Content-Type": "application/json", ...cors } });

  const body = { contents, generationConfig: { temperature: typeof temp === "number" ? temp : 0.5 } };
  if (system) body.systemInstruction = { parts: [{ text: String(system) }] };
  if (search) body.tools = [{ google_search: {} }];

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );

  if (!r.ok) {
    const errText = (await r.text()).slice(0, 300);
    return new Response(JSON.stringify({ error: "ai upstream " + r.status, detail: errText }),
      { status: 502, headers: { "Content-Type": "application/json", ...cors } });
  }

  const d = await r.json();
  const c = (d.candidates && d.candidates[0]) || {};
  const text = ((c.content && c.content.parts) || []).map(p => p.text || "").join("");

  return new Response(JSON.stringify({ text }),
    { headers: { "Content-Type": "application/json", ...cors } });
}

/* ─────────────────────────────────────────────────────────────────
   ถ้าอยาก deploy เป็น Worker แยกตัวใหม่แทนการ merge:
   ใช้ default export ข้างล่างนี้ได้เลย (ทั้งไฟล์นี้คือ worker สมบูรณ์)
   แล้วเปลี่ยน BACKEND_URL ใน chat.html เป็น URL ของ worker ใหม่
   ───────────────────────────────────────────────────────────────── */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/ai") {
      if (request.method === "OPTIONS") return corsPreflight(request);
      if (request.method === "POST") return handleAI(request, env);
    }
    return new Response("not found", { status: 404 });
  },
};
