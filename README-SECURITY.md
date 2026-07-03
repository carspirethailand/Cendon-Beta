# SpireONE — Secure Pack

ทุกไฟล์ในนี้ **ต่อกันทำงานได้จริง ไม่มี feature ไหนหาย** — เปลี่ยนเฉพาะเรื่องความปลอดภัย

```
secure-pack/
├── index.html            ← เว็บหลัก (secure แล้ว) — วางทับของเดิม
├── chat.html             ← หน้าแชท (secure แล้ว) — วางทับของเดิม
├── database.rules.json   ← Firebase Security Rules — ต้อง publish (ขั้นตอนที่ 1)
├── worker/ai-route.js    ← โค้ด /api/ai สำหรับ Cloudflare Worker (ขั้นตอนที่ 2)
└── README-SECURITY.md
```

## เข้าใจก่อน: อะไร "ซ่อนได้" อะไร "ซ่อนไม่ได้"

เว็บ static ทุกเว็บบนโลก เปิด inspect เห็นโค้ด HTML/JS เสมอ — ซ่อนไม่ได้ และไม่ต้องซ่อน
สิ่งที่ต้องกันคือ 2 อย่าง และตอนนี้กันครบแล้ว:

| ความเสี่ยงเดิม | แก้ยังไง |
|---|---|
| `GEMINI_KEY` อยู่ใน chat.html → ใครก็ copy ไปเผา quota ได้ | ❌ เอาออกจาก browser แล้ว → ย้ายไปเป็น Secret ใน Cloudflare Worker เรียกผ่าน `/api/ai` + ต้องล็อกอิน Firebase ก่อนถึงเรียกได้ |
| รายชื่อ `ADMINS` + ข้อมูลผู้ใช้ใน Firebase อ่าน/เขียนได้อิสระ | ❌ เอา ADMINS ออกจากโค้ด → ยศอยู่ใน `roles/{uid}` + rules บังคับที่ **server ของ Google**: ใครแก้ JS ใน DevTools ยังไง ก็อ่านข้อมูลคนอื่น/ตั้งยศตัวเองไม่ได้ |
| `fbConfig` (apiKey ของ Firebase) เห็นใน inspect | ✅ อันนี้**ไม่ใช่ความลับ** — เป็น public identifier ตามดีไซน์ของ Firebase ทุกเว็บที่ใช้ Firebase มีให้เห็นหมด สิ่งที่กันข้อมูลคือ rules ไม่ใช่การซ่อน config |

## ติดตั้ง (3 ขั้นตอน — ตามลำดับ)

### 1) Publish Security Rules ⭐ สำคัญสุด
Firebase Console → โปรเจกต์ `sp1p-82396` → Realtime Database → **Rules**
→ ลบของเดิม → paste เนื้อหา `database.rules.json` → **Publish**

จากนั้นตั้งตัวเองเป็น owner ครั้งเดียว: Realtime Database → Data → สร้าง
`roles/<UID ของคุณ>: "owner"` (UID ดูได้จาก Authentication → Users)

### 2) เพิ่ม /api/ai ใน Worker + ย้าย Gemini key
1. Cloudflare Dashboard → Workers → `spireonebackend` → Settings → Variables
   → **Add Secret**: ชื่อ `GEMINI_KEY` ค่า = คีย์ Gemini
   ⚠️ แนะนำ **สร้างคีย์ใหม่** ที่ [aistudio.google.com](https://aistudio.google.com/apikey) แล้วปิดคีย์เก่า
   เพราะคีย์เก่าเคยอยู่ในหน้าเว็บสาธารณะ ถือว่าหลุดแล้ว
2. เปิด `worker/ai-route.js` → ทำตามคอมเมนต์หัวไฟล์ (merge เข้า worker เดิม
   หรือ deploy เป็น worker แยกก็ได้ — โค้ดพร้อมทั้งสองแบบ)
3. แก้ `ALLOWED_ORIGINS` ในไฟล์ให้เป็นโดเมนจริงของเว็บคุณ

### 3) อัปโหลด index.html + chat.html ทับของเดิม
เสร็จแล้ว — ทุกอย่างทำงานเหมือนเดิมทุกประการ:
แชท AI, วินิจฉัย, การาจ (sync ผ่าน `/api/cars` เดิม ไม่แตะต้อง), ล็อกอิน, admin panel, ภาษา, ธีม

## สิ่งที่เปลี่ยนในโค้ด (ละเอียด)

**chat.html** — 2 จุดเท่านั้น:
- ลบ `GEMINI_KEY` + `GEMINI_MODEL` ออก
- ฟังก์ชัน `gemini()` เปลี่ยนจากยิง Google ตรง → ยิง `${BACKEND_URL}/api/ai`
  พร้อม Firebase ID token (payload/พฤติกรรม/ผลลัพธ์เหมือนเดิมทุกอย่าง รวม google_search)

**index.html** — 3 จุด:
- ลบ `ADMINS` hardcode → ยศอ่านจาก `roles/{uid}` ใน database
- เพิ่มเช็คแบน (`bans/{uid}`) ตอนล็อกอิน
- Admin panel: escape HTML ทุก field ที่มาจาก database (กัน XSS)

**เพิ่มเติมที่แนะนำ (ทำใน console ไม่ต้องแก้โค้ด):**
- Firebase → Authentication → Settings → Authorized domains → ลบ domain ที่ไม่ใช้
- Google Cloud Console → Credentials → จำกัด Firebase apiKey ให้ใช้ได้เฉพาะ
  HTTP referrer ของโดเมนคุณ (กันคนเอา config ไปใช้กับเว็บปลอม)

> หมายเหตุพฤติกรรมเดียวที่เปลี่ยน: การเรียก AI ต้อง**ล็อกอินก่อน** (Worker ตอบ 401 ถ้าไม่มี token)
> — นี่คือกลไกที่กันคนนอกขโมย quota ถ้าอยากให้คนไม่ล็อกอินใช้ได้ บอกผมได้ แต่จะเปิดช่องให้โดนเผา quota
