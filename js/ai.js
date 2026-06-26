/* ==========================================================================
   GOOGLE GEMINI AI INTEGRATION (js/ai.js)
   ========================================================================== */

import { GEMINI_KEY, GEMINI_MODEL } from './config.js';
import { gParse, toast } from './helper.js';

// Call Google Gemini API directly from browser
export async function geminiCall(parts, opts) {
  opts = opts || {};
  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: opts.temp != null ? opts.temp : 0.4 }
  };
  if (opts.search) body.tools = [{ google_search: {} }];

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!r.ok) throw new Error("gemini " + r.status + ": " + (await r.text()).slice(0, 200));

  const d = await r.json();
  const cand = (d.candidates && d.candidates[0]) || {};
  const text = ((cand.content && cand.content.parts) || []).map(p => p.text || "").join("");
  const links = [];
  const gm = cand.groundingMetadata;
  if (gm && gm.groundingChunks) {
    gm.groundingChunks.forEach(c => {
      if (c.web && c.web.uri) links.push({ title: c.web.title || c.web.uri, uri: c.web.uri });
    });
  }
  return { text, links };
}

// Global entrypoint to call AI for different diagnostics modes
export async function callAI(mode, p) {
  p = p || {};
  if (GEMINI_KEY) {
    try {
      let instr = `คุณเป็นช่างยนต์ผู้เชี่ยวชาญของ SpireONE วิเคราะห์ปัญหารถยนต์อย่างมืออาชีพเป็นภาษาไทย\nรถ: ${p.brand || ""} ${p.model || ""} ปี ${p.year || "-"} เลขไมล์ ${p.mileage || "-"} กม.\n`;
      if (mode === "photo") instr += "ผู้ใช้แนบรูป (ไฟเตือน/ชิ้นส่วน) — ดูรูปแล้ววินิจฉัย บริบทเพิ่ม: " + (p.note || "-");
      else if (mode === "video") instr += "ผู้ใช้แนบวิดีโออาการรถ — ดูวิดีโอ (ภาพ+เสียง) แล้ววิเคราะห์อาการที่สังเกตได้ บริบท: " + (p.note || "-");
      else if (mode === "sound") instr += "ผู้ใช้แนบไฟล์เสียงเครื่องยนต์ — ฟังเสียงแล้ววิเคราะห์อาการจากลักษณะเสียง";
      else if (mode === "obd") instr += "ค่าที่อ่านจากกล่อง OBD-II: " + JSON.stringify(p.obd || {}) + " — แปลผลรหัส DTC และวินิจฉัย";
      else instr += "อาการที่ผู้ใช้แจ้ง: " + (p.symptom || "-");

      instr += `\nตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่น:\n{"severity":"ระดับความเร่งด่วน","summary":"สรุปสั้นๆ","causes":[{"name":"สาเหตุที่เป็นไปได้","pct":ความน่าจะเป็น0ถึง100}],"steps":["คำแนะนำเบื้องต้น"],"cost":"ช่วงราคาประมาณการเป็นบาท"}`;
      const parts = [{ text: instr }];
      
      if (mode === "photo" && p.imageBase64) parts.push({ inline_data: { mime_type: p.imageMediaType || "image/jpeg", data: p.imageBase64 } });
      if (mode === "video" && p.videoB64) parts.push({ inline_data: { mime_type: p.videoMime || "video/mp4", data: p.videoB64 } });
      if (mode === "sound" && p.audioB64) parts.push({ inline_data: { mime_type: p.audioMime || "audio/webm", data: p.audioB64 } });
      
      const { text } = await geminiCall(parts, { temp: 0.3 });
      const j = gParse(text);
      if (j && j.causes) {
        j.source = "ai";
        return j;
      }
    } catch (e) {
      console.warn("gemini diag fail", e);
      toast("AI ขัดข้อง ใช้ระบบจำลองแทน", "ti-alert-triangle");
    }
  }
  return demoAI(mode, p);
}

// Fallback demo mock diagnostic data
export function demoAI(mode, p) {
  if (mode === "photo") return {
    source: "demo",
    severity: "ปานกลาง — ควรตรวจเพิ่ม",
    summary: "จากภาพ AI สันนิษฐานว่าเป็นไฟเตือนระบบเครื่องยนต์/เซนเซอร์ แนะนำสแกน OBD-II เพื่อยืนยัน",
    causes: [{ name: "เซนเซอร์ O2 / หัวฉีด", pct: 52 }, { name: "ฝาถังน้ำมันหลวม", pct: 34 }, { name: "ระบบไอเสีย/แคท", pct: 28 }],
    steps: ["ตรวจฝาถังน้ำมันว่าปิดแน่น", "สแกนรหัส OBD-II เพื่อระบุชัด", "สังเกตว่าไฟกระพริบหรือค้าง"],
    cost: "500 – 4,000 บาท"
  };
  if (mode === "sound") return {
    source: "demo",
    severity: "ปานกลาง",
    summary: "จากเสียง AI ได้ยินจังหวะการเต้นไม่สม่ำเสมอ อาจเกี่ยวกับการจุดระเบิดหรือสายพาน",
    causes: [{ name: "หัวเทียน/คอยล์จุดระเบิด", pct: 58 }, { name: "สายพานหน้าเครื่องตึง/หลวม", pct: 40 }, { name: "วาล์ว/ไฮดรอลิกลิฟเตอร์", pct: 26 }],
    steps: ["ฟังว่าเสียงดังตอนรอบเดินเบาหรือเร่ง", "ตรวจหัวเทียนและคอยล์", "ตรวจความตึงสายพาน"],
    cost: "300 – 3,000 บาท"
  };
  return demoDx(p.symptom || "");
}

// Symptom keyword matching for mock diagnostics
function demoDx(s) {
  s = s.toLowerCase();
  if (s.includes("เบรก") || s.includes("เอี๊ยด")) return {
    source: "demo",
    severity: "สูง — ควรตรวจเร็ว",
    summary: "อาการบ่งชี้ระบบเบรกอาจมีปัญหา เกี่ยวกับความปลอดภัยโดยตรง",
    causes: [{ name: "ผ้าเบรกสึก/หมด", pct: 72 }, { name: "จานเบรกเป็นร่อง", pct: 48 }, { name: "น้ำมันเบรกต่ำ/รั่ว", pct: 25 }],
    steps: ["เลี่ยงขับเร็วจนกว่าจะตรวจ", "ตรวจระดับน้ำมันเบรก", "นำเข้าตรวจระบบเบรกโดยเร็ว"],
    cost: "800 – 3,500 บาท"
  };
  if (s.includes("ร้อน") || s.includes("น้ำ")) return {
    source: "demo",
    severity: "สูง — ระวังเครื่องน็อค",
    summary: "ความร้อนขึ้นสูงอาจเกิดจากระบบหล่อเย็น",
    causes: [{ name: "น้ำหล่อเย็นต่ำ/รั่ว", pct: 64 }, { name: "พัดลม/ปั๊มน้ำเสีย", pct: 42 }, { name: "วาล์วน้ำค้าง", pct: 30 }],
    steps: ["ดับเครื่องหากเข็มขึ้นแดง", "ห้ามเปิดฝาหม้อน้ำขณะร้อน", "เติม/ตรวจน้ำหล่อเย็นเมื่อเย็น"],
    cost: "500 – 4,000 บาท"
  };
  if (s.includes("สตาร์ท") || s.includes("แบต")) return {
    source: "demo",
    severity: "ปานกลาง",
    summary: "อาการสตาร์ทไม่ติดมักเกี่ยวกับแบตเตอรี่หรือระบบสตาร์ท",
    causes: [{ name: "แบตเตอรี่เสื่อม/หมด", pct: 68 }, { name: "ไดสตาร์ทมีปัญหา", pct: 38 }, { name: "ขั้วแบตหลวม/สกปรก", pct: 30 }],
    steps: ["ตรวจไฟหน้าปัดว่าหรี่ไหม", "ลองพ่วงแบต", "เช็กอายุแบต (2-3 ปี)"],
    cost: "2,500 – 5,000 บาท"
  };
  if (s.includes("สั่น") || s.includes("ดึง") || s.includes("ยาง")) return {
    source: "demo",
    severity: "ปานกลาง",
    summary: "อาการสั่น/ดึงข้างมักเกี่ยวกับล้อ ยาง ช่วงล่าง",
    causes: [{ name: "ถ่วงล้อ/ตั้งศูนย์", pct: 60 }, { name: "ยางสึกไม่เท่ากัน", pct: 44 }, { name: "ลูกหมาก/ช่วงล่างหลวม", pct: 28 }],
    steps: ["ตรวจลมยาง", "ดูดอกยาง", "ตั้งศูนย์-ถ่วงล้อ"],
    cost: "400 – 2,500 บาท"
  };
  if (s.includes("ควัน")) return {
    source: "demo",
    severity: "สูง",
    summary: "ควันผิดปกติบ่งบอกปัญหาเครื่องยนต์ สีควันช่วยระบุสาเหตุ",
    causes: [{ name: "ซีล/แหวนรั่ว (น้ำเงิน)", pct: 55 }, { name: "ปะเก็นฝาสูบ (ขาว)", pct: 45 }, { name: "หัวฉีด/จูน (ดำ)", pct: 35 }],
    steps: ["สังเกตสีควัน", "ตรวจน้ำมันเครื่อง+น้ำหล่อเย็น", "นำเข้าอู่ตรวจ"],
    cost: "1,500 – 15,000 บาท"
  };
  return {
    source: "demo",
    severity: "ปานกลาง — ควรตรวจเพิ่ม",
    summary: "จากอาการ AI วิเคราะห์ความเป็นไปได้เบื้องต้น แนะนำตรวจเพิ่มที่อู่",
    causes: [{ name: "เครื่องยนต์/เซนเซอร์", pct: 50 }, { name: "ระบบไฟฟ้า", pct: 38 }, { name: "สึกหรอตามอายุ", pct: 30 }],
    steps: ["สแกน OBD-II ดูรหัสปัญหา", "สังเกตว่าอาการเกิดตอนไหน", "ปรึกษาช่างพร้อมข้อมูล"],
    cost: "ขึ้นกับผลตรวจ"
  };
}
