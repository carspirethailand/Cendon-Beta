#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
   แบ่งคู่มือเป็นตอน ๆ ให้พร้อมนำเข้าฐานข้อมูล

   ทำไมต้องแบ่ง — คู่มือทั้งเล่มเป็นก้อนเดียวจะยาวเกินกว่าที่จะแก้ทีละส่วนได้
   แบ่งตามภาคทำให้อัปเดตเฉพาะภาคที่เปลี่ยนได้ และถ้าแถวไหนเสียก็เสียแค่ภาคนั้น

   วิธีใช้
     node tools/handbook-pack.mjs                 → เขียน handbook-parts.json
     node tools/handbook-pack.mjs --check         → ตรวจอย่างเดียว ไม่เขียนไฟล์

   จากนั้นนำเข้าที่ แผงควบคุม → สอน AI → นำเข้าเป็นชุด
   หรือ  curl -X POST "$BASE/api/kb/bulk" -H "Authorization: Bearer $TOKEN" \
           -H "Content-Type: application/json" --data-binary @handbook-parts.json
   ══════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC  = path.join(ROOT, 'HANDBOOK.md');
const OUT  = path.join(ROOT, 'handbook-parts.json');
const check = process.argv.includes('--check');

const md = fs.readFileSync(SRC, 'utf8');

/* แบ่งที่หัวข้อระดับหนึ่ง (# ภาค N) ส่วนหัวก่อนภาคแรกเป็นตอนที่ 00

   ต้องข้ามบล็อกโค้ดก่อน เพราะคอมเมนต์ของ bash ขึ้นต้นด้วย # เหมือนหัวข้อ Markdown เป๊ะ
   ถ้าไม่ข้าม จะได้ตอนปลอมเป็นสิบตอนจากคอมเมนต์ในตัวอย่างคำสั่ง */
const lines = md.split('\n');
const marks = [];
{
  let inCode = false, pos = 0;
  for (const ln of lines) {
    if (ln.startsWith('```')) inCode = !inCode;
    else if (!inCode) {
      const m = /^# (.+)$/.exec(ln);
      if (m) marks.push({ index: pos, 1: m[1] });
    }
    pos += ln.length + 1;
  }
}
if (!marks.length) { console.error('ไม่พบหัวข้อระดับภาคเลย — รูปแบบไฟล์เปลี่ยนไปหรือเปล่า'); process.exit(1); }

const parts = [];
const push = (title, body) => {
  body = body.trim();
  if (!body) return;
  parts.push({
    id: 'hb_' + String(parts.length).padStart(2, '0'),
    title: title.slice(0, 200),
    body,
    keywords: 'handbook คู่มือระบบ',
    /* ทำเครื่องหมายไว้ให้แยกออกจากความรู้จริงได้ทันทีที่เห็น */
    make: '__handbook__',
    model: '',
    /* 🔴 ต้องเป็น 0 เสมอ — ตัวค้นความรู้ของ AI กรอง enabled = 1
       ถ้าเผลอเป็น 1 ผู้ใช้ทั่วไปจะได้ยินเรื่องฐานข้อมูลและชื่อเซิร์ฟเวอร์จากปาก AI */
    enabled: 0,
  });
};

push('คู่มือระบบ Cendon — ส่วนหัว', md.slice(0, marks[0].index));
for (let i = 0; i < marks.length; i++) {
  const from = marks[i].index;
  const to = i + 1 < marks.length ? marks[i + 1].index : md.length;
  push(marks[i][1], md.slice(from, to));
}

/* ── ตรวจก่อนส่งออก ────────────────────────────────────────────────── */
let bad = 0;
const fail = (m) => { console.error('  ✗ ' + m); bad++; };
console.log('ตรวจก่อนส่งออก');
for (const p of parts) {
  if (p.enabled !== 0) fail(p.id + ' : enabled ไม่ใช่ 0 — คู่มือจะหลุดไปอยู่ในคำตอบของ AI');
  if (!/^hb_\d\d$/.test(p.id)) fail(p.id + ' : รหัสผิดรูปแบบ หน้าคู่มือกรองด้วย hb_');
  if (p.title.length < 3) fail(p.id + ' : หัวข้อสั้นเกินไป เซิร์ฟเวอร์จะปฏิเสธ');
  if (p.body.length < 10) fail(p.id + ' : เนื้อหาสั้นเกินไป เซิร์ฟเวอร์จะปฏิเสธ');
  /* D1 เก็บได้เยอะ แต่แถวใหญ่มากทำให้การดึงทั้งชุดช้าโดยไม่จำเป็น */
  if (p.body.length > 90000) fail(p.id + ' : ยาวเกิน 90 KB ควรแบ่งภาคนี้ย่อยลง');
}
if (new Set(parts.map(p => p.id)).size !== parts.length) fail('มีรหัสซ้ำกัน');
if (bad) { console.error(`\n══ ตก ${bad} ข้อ ไม่เขียนไฟล์ ══`); process.exit(1); }

const total = parts.reduce((n, p) => n + p.body.length, 0);
console.log(`  ✓ ${parts.length} ตอน · รวม ${(total / 1024).toFixed(0)} KB · enabled = 0 ครบทุกตอน`);
parts.forEach(p => console.log(`     ${p.id}  ${String(Math.round(p.body.length / 1024)).padStart(3)} KB  ${p.title}`));

if (check) { console.log('\n(โหมดตรวจอย่างเดียว ไม่ได้เขียนไฟล์)'); process.exit(0); }
fs.writeFileSync(OUT, JSON.stringify(parts, null, 1));
console.log(`\nเขียนแล้ว: ${path.relative(ROOT, OUT)}`);
console.log('นำเข้าที่ แผงควบคุม → สอน AI → นำเข้าเป็นชุด');
