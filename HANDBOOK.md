# คู่มือระบบ Cendon
### หนังสือสำหรับนักพัฒนา — ฉบับสมบูรณ์

**Cendon** — ผู้ช่วยดูแลรถยนต์ด้วย AI ภาษาไทย ของบริษัท **Phasmion**
ผู้ก่อตั้ง/CEO: **Anapat Maliwong (อนพัทย์ มะลิวงศ์)**

ปรับปรุงล่าสุด: สิงหาคม 2026 · ตรงกับ `SCHEMA_VERSION = 14`

---

## วิธีใช้หนังสือเล่มนี้

หนังสือเล่มนี้เขียนจากการอ่านโค้ดจริงและรันจริง ไม่ได้เขียนจากความจำหรือจากที่ควรจะเป็น
ตัวเลข ชื่อตาราง ชื่อ endpoint ทุกตัวถูกดึงออกมาจากไฟล์ในโปรเจกต์ ณ วันที่ปรับปรุง

อ่านแบบไหนก็ได้ตามที่ต้องการ:

| ถ้าคุณคือ… | อ่านภาคไหน |
|-----------|-----------|
| เพิ่ง deploy ครั้งแรก | ภาค 10 → ภาค 3 → ภาค 11 |
| อยากรู้ว่า backend คุยกับฐานข้อมูลยังไง | **ภาค 2** (ตอบคำถามนี้โดยตรง) |
| จะเพิ่ม API ใหม่ | ภาค 4 → ภาค 5 |
| แอปพัง ไม่รู้ว่าตรงไหน | ภาค 11 |
| จะแก้หน้าเว็บ | ภาค 8 → ภาค 9 |
| อยากรู้ว่ามีอะไรที่ยังไม่เรียบร้อย | **ภาค 12** — อ่านก่อนขึ้น production |

> **สัญลักษณ์ที่ใช้ในเล่ม**
> 🔴 = เรื่องที่ทำให้ระบบพังได้จริง ห้ามข้าม
> ⚠️ = เรื่องที่ต้องระวัง แต่ไม่ถึงกับพัง
> 💡 = เหตุผลเบื้องหลังการตัดสินใจ อ่านแล้วจะแก้โค้ดได้ถูกทาง

---

## สารบัญ

**ภาค 1 — ภาพรวมของระบบ**
- [1.1 ระบบนี้ประกอบด้วยอะไรบ้าง](#11-ระบบนี้ประกอบด้วยอะไรบ้าง)
- [1.2 เส้นทางของข้อมูลตั้งแต่ผู้ใช้พิมพ์จนได้คำตอบ](#12-เส้นทางของข้อมูลตั้งแต่ผู้ใช้พิมพ์จนได้คำตอบ)
- [1.3 ที่อยู่ของทุกอย่าง](#13-ที่อยู่ของทุกอย่าง)

**ภาค 2 — D1: ฐานข้อมูลบน Cloudflare**
- [2.1 Worker ต่อกับ D1 ยังไง](#21-worker-ต่อกับ-d1-ยังไง)
- [2.2 ตารางสร้างตัวเองโดยไม่ต้องรัน migration](#22-ตารางสร้างตัวเองโดยไม่ต้องรัน-migration)
- [2.3 ตารางทั้งหมด 26 ตาราง](#23-ตารางทั้งหมด-26-ตาราง)
- [2.4 โครงตารางที่ต้องรู้จัก](#24-โครงตารางที่ต้องรู้จัก)
- [2.5 วิธีเขียนคำสั่ง SQL ให้ปลอดภัย](#25-วิธีเขียนคำสั่ง-sql-ให้ปลอดภัย)
- [2.6 อัปโหลดและดึงข้อมูลเข้าออก D1](#26-อัปโหลดและดึงข้อมูลเข้าออก-d1)
- [2.7 ขีดจำกัดของ D1 ที่ต้องออกแบบเผื่อ](#27-ขีดจำกัดของ-d1-ที่ต้องออกแบบเผื่อ)

**ภาค 3 — Vectorize: สมองค้นด้วยความหมาย**
- [3.1 ทำไมต้องมี](#31-ทำไมต้องมี)
- [3.2 ตั้งครั้งเดียวจบ](#32-ตั้งครั้งเดียวจบ)
- [3.3 D1 คือตัวจริง Vectorize คือชั้นค้นหา](#33-d1-คือตัวจริง-vectorize-คือชั้นค้นหา)
- [3.4 สร้างดัชนีย้อนหลัง](#34-สร้างดัชนีย้อนหลัง)
- [3.5 การจูนคะแนนขั้นต่ำ](#35-การจูนคะแนนขั้นต่ำ)

**ภาค 4 — API ทั้งหมด**
- [4.1 โครงการจัดเส้นทาง](#41-โครงการจัดเส้นทาง)
- [4.2 ตารางเส้นทางทั้งหมด](#42-ตารางเส้นทางทั้งหมด)

**ภาค 5 — ยืนยันตัวตนและสิทธิ์**
- [5.1 Firebase ID token ตรวจที่ไหน อย่างไร](#51-firebase-id-token-ตรวจที่ไหน-อย่างไร)
- [5.2 ยศทั้งสี่ระดับ](#52-ยศทั้งสี่ระดับ)
- [5.3 การ์ดกันสามชั้น](#53-การ์ดกันสามชั้น)

**ภาค 6 — โควตาและการนับโทเคน**
- [6.1 หน้าต่างเลื่อน 5 ชั่วโมง](#61-หน้าต่างเลื่อน-5-ชั่วโมง)
- [6.2 ตารางที่เกี่ยวข้อง](#62-ตารางที่เกี่ยวข้อง)

**ภาค 7 — การค้นอินเทอร์เน็ต**
- [7.1 สี่ทางไล่ลงมา](#71-สี่ทางไล่ลงมา)
- [7.2 บทเรียนราคาแพง](#72-บทเรียนราคาแพง)

**ภาค 8 — Frontend: โครงและกลไกที่ทุกหน้าใช้ร่วมกัน**
- [8.1 ขนาดจริงของสิ่งที่ต้องดูแล](#81-ขนาดจริงของสิ่งที่ต้องดูแล)
- [8.2 หลักการที่เลือกไว้ และสิ่งที่ต้องแลก](#82-หลักการที่เลือกไว้-และสิ่งที่ต้องแลก)
- [8.3 ฟังก์ชันร่วม 73 ตัว](#83-ฟังก์ชันร่วม-73-ตัว)
- [8.4 คีย์ในเครื่องทั้ง 32 ตัว](#84-คีย์ในเครื่องทั้ง-32-ตัว)
- [8.5 Cloud sync สามชั้น](#85-cloud-sync-สามชั้น)
- [8.6 Service worker และเลขแคช](#86-service-worker-และเลขแคช)
- [8.7 การแก้ไฟล์ใหญ่อย่างปลอดภัย](#87-การแก้ไฟล์ใหญ่อย่างปลอดภัย)

**ภาค 9 — ทุกหน้าและทุกฟีเจอร์**
- [9.1 แผนผังการเดินของผู้ใช้](#91-แผนผังการเดินของผู้ใช้)
- [9.2 index.html — หน้าภาพรวม](#92-indexhtml--หน้าภาพรวม)
- [9.3 garage.html — การาจ](#93-garagehtml--การาจ)
- [9.4 chat.html — ห้องแชต](#94-chathtml--ห้องแชต)
- [9.5 news · spares · profile](#95-newshtml--spareshtml--profilehtml)
- [9.6 หน้าตั้งค่า — เหมือนกันทุกที่ที่เข้า](#96-หน้าตั้งค่า--เหมือนกันทุกที่ที่เข้า)
- [9.7 plan.html — หน้าแพ็กเกจ](#97-planhtml--หน้าแพ็กเกจ)
- [9.8 admin.html — แผงควบคุม](#98-adminhtml--แผงควบคุม)
- [9.9 handbook.html — คู่มือเล่มนี้](#99-handbookhtml--คู่มือเล่มนี้)
- [9.10 หน้าเนื้อหาคงที่](#910-หน้าเนื้อหาคงที่)
- [9.11 ฟีเจอร์ที่กระจายอยู่หลายหน้า](#911-ฟีเจอร์ที่กระจายอยู่หลายหน้า)

**ภาค 10 — การนำขึ้นระบบ**
- [10.1 ลำดับที่ต้องทำ](#91-ลำดับที่ต้องทำ)
- [10.2 ตัวแปรและความลับทั้งหมด](#92-ตัวแปรและความลับทั้งหมด)
- [10.3 งานตามเวลา (cron)](#93-งานตามเวลา-cron)
- [10.4 เช็กลิสต์ก่อนกด deploy](#94-เช็กลิสต์ก่อนกด-deploy)

**ภาค 11 — ตรวจสอบและแก้ปัญหา**
- [11.1 เครื่องมือตรวจในตัว](#101-เครื่องมือตรวจในตัว)
- [11.2 อาการที่เคยเจอจริงและวิธีแก้](#102-อาการที่เคยเจอจริงและวิธีแก้)
- [11.3 วิธีทำงานที่พิสูจน์แล้วว่าได้ผล](#103-วิธีทำงานที่พิสูจน์แล้วว่าได้ผล)

**ภาค 12 — สิ่งที่ยังค้างและความเสี่ยงที่รู้อยู่**
- [12.1 ต้องแก้ก่อนขึ้น production](#111-ต้องแก้ก่อนขึ้น-production)
- [12.2 ของที่ค้างอยู่แต่ไม่เร่งด่วน](#112-ของที่ค้างอยู่แต่ไม่เร่งด่วน)

---
---

# ภาค 1 — ภาพรวมของระบบ

## 1.1 ระบบนี้ประกอบด้วยอะไรบ้าง

ทั้งระบบมีสามก้อน ไม่มีมากกว่านี้

```
┌─────────────────────────────────────────────────────────┐
│  เบราว์เซอร์ของผู้ใช้                                    │
│  ไฟล์ HTML แบบ static · ไม่มี build step · ไม่มี framework │
│  index · chat · garage · news · spares · profile · plan  │
│  admin (เฉพาะผู้มียศ)                                     │
└────────────────────────┬────────────────────────────────┘
                         │  HTTPS + Firebase ID token
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Cloudflare Worker  (spireonebackend)                    │
│  src/worker.js — 5,985 บรรทัด · src/auth.js — 23 บรรทัด   │
│  ทำหน้าที่: ตรวจสิทธิ์ · เรียก AI · คุมโควตา · เขียนอ่านข้อมูล │
└──┬───────────────┬──────────────┬───────────────┬───────┘
   │               │              │               │
   ▼               ▼              ▼               ▼
┌────────┐  ┌────────────┐  ┌──────────┐  ┌─────────────┐
│  D1    │  │ Vectorize  │  │Workers AI│  │ ผู้ให้บริการ  │
│spireone│  │cendon-brain│  │  (AI)    │  │ ภายนอก      │
│        │  │            │  │          │  │ Gemini      │
│ที่เก็บ  │  │ชั้นค้นหา    │  │แปลงข้อความ│  │ OpenRouter  │
│ตัวจริง  │  │ด้วยความหมาย │  │เป็นเวกเตอร์│  │ LINE        │
└────────┘  └────────────┘  └──────────┘  └─────────────┘
```

**สิ่งที่ไม่มี และตั้งใจว่าจะไม่มี**

| ไม่มี | เพราะอะไร |
|------|-----------|
| Build step (webpack/vite) | แก้ไฟล์แล้ว refresh เห็นผลทันที ไม่ต้องรอ compile และไม่มีอะไรพังระหว่างทาง |
| React / Vue / framework | หน้าเว็บเป็นไฟล์เดี่ยวที่เปิดตรง ๆ ได้ ไม่ต้องมี node_modules เพื่อจะดูหน้าเว็บ |
| ORM | D1 คือ SQLite เขียน SQL ตรง ๆ อ่านง่ายกว่าและไม่มีชั้นแปลงที่ทำให้ query ช้าโดยไม่รู้ตัว |
| เซิร์ฟเวอร์ที่ต้องดูแล | Worker เป็น serverless ไม่มีเครื่องให้ patch ไม่มี uptime ให้เฝ้า |

💡 **ทำไมถึงเลือกแบบนี้** — ทีมพัฒนามีคนน้อย ทุกชั้นที่เพิ่มเข้ามาคือของที่ต้องดูแลตลอดไป
การไม่มี build step แปลว่าคนที่มารับช่วงต่อเปิดไฟล์แล้วแก้ได้เลย ไม่ต้องเรียนเครื่องมือก่อน

---

## 1.2 เส้นทางของข้อมูลตั้งแต่ผู้ใช้พิมพ์จนได้คำตอบ

นี่คือเส้นทางจริงของคำถามหนึ่งข้อ ตั้งแต่กด Enter จนตัวหนังสือขึ้นบนจอ

```
ผู้ใช้พิมพ์ "แอร์ไม่เย็น ทำไง"
   │
   1. เบราว์เซอร์แนบ Firebase ID token  →  POST /api/ai/stream
   │
   2. Worker: corsHeaders() ตรวจ origin
   │
   3. Worker: ensureSchema() — ตารางครบไหม ถ้าไม่ครบสร้างให้
   │
   4. Worker: guarded('user') → verifyFirebaseToken()
   │            ตรวจ token กับ JWKS ของ Google
   │            ตรวจว่าโดนแบนไหม · ยศพอไหม
   │
   5. Worker: เช็กโควตา — usage_win ของหน้าต่าง 5 ชั่วโมงปัจจุบัน
   │            เกินแล้ว → ตอบ 429 พร้อมเวลาที่จะเติมใหม่
   │
   6. Worker: embedOne(คำถาม) → Workers AI (bge-m3)
   │            ได้เวกเตอร์ 1024 มิติ  ← ทำรอบเดียว ใช้ต่อสามงาน
   │
   7. Worker: cacheLookup() — เคยตอบคำถามนี้ไปแล้วไหม
   │            เจอที่คะแนน ≥ 0.88 → ตอบเลย ไม่เรียก AI (ประหยัดที่สุด)
   │
   8. Worker: kbFor() — มีความรู้ที่สอนไว้ตรงกับเรื่องนี้ไหม (≥ 0.45)
   │          memFor() — เคยคุยอะไรกับคนนี้ไว้บ้าง (≥ 0.40)
   │          + ข้อมูลรถจากตาราง cars
   │          + skills ที่ผู้ใช้เลือก
   │
   9. Worker: คำถามเข้าข่ายต้องค้นเน็ตไหม (เอ่ยยี่ห้อ ถามราคา มีปี)
   │            ถ้าใช่ → searchWeb() ไล่สี่ทาง (ดูภาค 7)
   │
   10. Worker: ประกอบ system prompt แล้วเรียก Gemini
   │
   11. Worker: TransformStream + ctx.waitUntil
   │            ส่ง SSE กลับทีละชิ้นระหว่างที่ AI ยังคิดไม่จบ
   │            ผู้ใช้เห็นตัวหนังสือไหลออกมา ไม่ต้องรอทั้งก้อน
   │
   12. Worker (หลังส่งจบ): เขียนลง D1 พร้อมกันหลายที่
   │            usage_win  — หักโทเคน
   │            chat_logs  — เก็บบทสนทนา
   │            qa_cache   — เก็บคำตอบไว้ใช้ซ้ำ + ส่งเวกเตอร์เข้า Vectorize
   │            user_memory— จำสิ่งที่คุยไว้ + ส่งเวกเตอร์เข้า Vectorize
   │
   13. เบราว์เซอร์: แสดงผล + เก็บลง localStorage
   │            แล้ว cloud sync ส่งขึ้น /api/state ให้เครื่องอื่นเห็นด้วย
```

💡 **จุดสำคัญที่มองข้ามง่าย** — ขั้นที่ 6 แปลงคำถามเป็นเวกเตอร์ **รอบเดียว**
แล้วเอาเวกเตอร์ตัวเดียวกันไปใช้ทั้งขั้น 7, 8 ถ้าเผลอเรียก `embedOne()` แยกกันสามครั้ง
ค่าใช้จ่าย Workers AI จะเป็นสามเท่าโดยไม่ได้อะไรเพิ่ม

---

## 1.3 ที่อยู่ของทุกอย่าง

| อะไร | อยู่ที่ไหน |
|------|-----------|
| Frontend repo | `/home/user/SpireONE-Beta` · branch `claude/kind-heisenberg-o90e47` |
| Backend repo | `/home/user/SpireONE-backend` · branch `main` |
| Worker ที่ deploy แล้ว | `https://spireonebackend.carspirethailand.workers.dev` |
| D1 database | ชื่อ `spireone` · id `bf9b1815-2ef6-4463-8b35-6b97717b5d9a` |
| Vectorize index | ชื่อ `cendon-brain` · 1024 มิติ · cosine |
| Firebase project | `sp1p-82396` |

**ไฟล์ในโปรเจกต์ frontend**

```
index.html      หน้าหลัก การาจ ตั้งค่า สมัคร/ล็อกอิน
chat.html       ห้องแชต (ไฟล์ใหญ่สุด ~12,000 บรรทัด)
garage.html     รายละเอียดรถ
news.html       นิตยสาร
spares.html     ค้นอะไหล่
profile.html    โปรไฟล์
plan.html       หน้าแพ็กเกจ (แยกออกมาเป็นหน้าของตัวเอง)
admin.html      หน้าผู้ดูแล
about/help/terms/privacy.html
sw.js           service worker — เลขแคชอยู่ที่นี่
manifest.webmanifest
fonts/          Spire09 (ละตินเท่านั้น)
```

**ไฟล์ในโปรเจกต์ backend**

```
src/worker.js       ทุกอย่าง — routing, AI, D1, Vectorize, cron
src/auth.js         ตรวจ Firebase token (23 บรรทัด)
wrangler.jsonc      bindings และ vars
migrations/         SQL 14 ไฟล์ (ดูข้อควรระวังในภาค 2.2)
```

---
---

# ภาค 2 — D1: ฐานข้อมูลบน Cloudflare

> ภาคนี้ตอบคำถาม "backend ต่อกับ D1 ยังไง และอัปโหลดกันได้ยังไง" โดยตรง

## 2.1 Worker ต่อกับ D1 ยังไง

**ไม่มี connection string ไม่มีรหัสผ่าน ไม่มีการเปิดการเชื่อมต่อ**

D1 ผูกกับ Worker ผ่าน **binding** ที่ประกาศไว้ใน `wrangler.jsonc` ตอน deploy
Cloudflare จะยัดฐานข้อมูลเข้ามาเป็น object ใน `env` ให้เลย

```jsonc
// wrangler.jsonc
"d1_databases": [
  {
    "binding": "DB",                                   // ชื่อที่จะใช้ในโค้ด → env.DB
    "database_name": "spireone",                       // ชื่อที่คนอ่าน
    "database_id": "bf9b1815-2ef6-4463-8b35-6b97717b5d9a"  // ตัวจริงที่ Cloudflare ใช้
  }
]
```

พอ deploy แล้ว ในโค้ดเรียกใช้ได้เลย:

```js
export default {
  async fetch(request, env, ctx) {
    if (!env.DB) return deny('Database is not configured', 500);
    // env.DB พร้อมใช้ทันที ไม่ต้อง connect ไม่ต้อง await อะไรก่อน
  }
}
```

💡 **ทำไมถึงไม่มีรหัสผ่าน** — Worker กับ D1 อยู่ในบัญชี Cloudflare เดียวกัน
การอนุญาตทำที่ระดับ binding ตอน deploy ไม่ใช่ตอน runtime
แปลว่า **ไม่มีรหัสผ่านฐานข้อมูลให้หลุด** เพราะไม่มีรหัสผ่านตั้งแต่แรก
ใครที่ deploy Worker ได้ = เข้าถึง D1 ได้ ความปลอดภัยจึงอยู่ที่สิทธิ์บัญชี Cloudflare

🔴 **ข้อควรระวัง** — `binding` คือชื่อที่ใช้ในโค้ด (`env.DB`) ถ้าเปลี่ยนชื่อนี้
ต้องไล่แก้ทุกที่ใน `worker.js` ที่เขียน `env.DB` (มีหลายร้อยจุด) อย่าเปลี่ยนโดยไม่จำเป็น

### รูปแบบการเรียกใช้

D1 ใช้ prepared statement เสมอ มีสี่แบบ:

```js
// 1) .first() — อยากได้แถวเดียว หรือ null
const row = await env.DB.prepare('SELECT role, banned FROM users WHERE uid = ?')
                        .bind(uid).first();

// 2) .all() — อยากได้หลายแถว  → { results: [...] }
const { results } = await env.DB.prepare('SELECT * FROM cars WHERE uid = ?')
                                .bind(uid).all();

// 3) .run() — เขียนอย่างเดียว ไม่ต้องการผลลัพธ์
await env.DB.prepare('INSERT INTO users (uid, name) VALUES (?, ?)')
            .bind(uid, name).run();

// 4) .batch() — หลายคำสั่งในรอบเดียว ลดจำนวน round-trip
await env.DB.batch([
  env.DB.prepare('INSERT INTO a ...').bind(x),
  env.DB.prepare('UPDATE b ...').bind(y),
]);
```

⚠️ **`.batch()` ไม่ใช่ transaction** — ถ้าคำสั่งที่สามล้ม สองคำสั่งแรกที่สำเร็จไปแล้ว **ไม่ถูกย้อนกลับ**
D1 ยังไม่รองรับ transaction เต็มรูปแบบ ออกแบบเผื่อไว้ว่าเขียนไปครึ่งทางแล้วพังได้เสมอ

### ตัวอย่างจริงจากโค้ด — การล็อกอิน

จุดนี้เป็นตัวอย่างที่ดีเพราะมีทั้งการเขียน การอ่าน และการรักษาข้อมูลเดิม:

```js
// src/worker.js — /api/login
await env.DB.prepare(`
  INSERT INTO users (uid, name, email, photo, role, last_login, created_at, banned)
  VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  ON CONFLICT(uid) DO UPDATE SET
    name       = excluded.name,
    email      = excluded.email,
    photo      = excluded.photo,
    last_login = excluded.last_login,
    role       = CASE WHEN excluded.role = 'owner' THEN 'owner' ELSE users.role END,
    created_at = COALESCE(users.created_at, excluded.created_at)
`).bind(uid, name, email, photo, isOwner ? 'owner' : 'user', now, now).run();
```

💡 **สองบรรทัดสุดท้ายสำคัญมาก** — `ON CONFLICT DO UPDATE` คือ "มีแล้วอัปเดต ไม่มีก็สร้าง" (upsert)
แต่ถ้าเขียน `role = excluded.role` เฉย ๆ **ยศที่แอดมินตั้งไว้จะถูกลบทิ้งทุกครั้งที่ผู้ใช้ล็อกอิน**
บรรทัด `CASE WHEN` จึงมีไว้เพื่อรักษายศเดิม ยกเว้นเจ้าของระบบที่ต้องเป็น owner เสมอ
เช่นเดียวกับ `COALESCE(users.created_at, ...)` ที่รักษาวันสมัครเดิมไว้ ไม่ให้ถูกเขียนทับเป็นวันนี้

---

## 2.2 ตารางสร้างตัวเองโดยไม่ต้องรัน migration

นี่คือจุดที่ต่างจากโปรเจกต์ทั่วไปมากที่สุด และเป็นเรื่องที่เข้าใจผิดกันบ่อย

**ทุก request ที่เข้ามา Worker จะเรียก `ensureSchema(env)` ก่อนทำอย่างอื่น**

```js
// src/worker.js บรรทัด 389
const SCHEMA_VERSION = 14;
let schemaChecked = false;          // ตัวแปรระดับโมดูล อยู่รอดข้าม request ใน isolate เดียวกัน

async function ensureSchema(env) {
  if (schemaChecked || !env.DB) return;     // ตรวจแล้วในรอบนี้ ไม่ต้องตรวจซ้ำ
  try {
    const row = await env.DB.prepare("SELECT value FROM config WHERE key = 'schema_version'").first();
    const have = row && row.value ? parseInt(JSON.parse(row.value), 10) : 0;
    if (have >= SCHEMA_VERSION) { schemaChecked = true; return; }
  } catch (e) {
    /* ตาราง config เองยังไม่มี = ฐานข้อมูลเปล่า ต้องสร้างทั้งชุด ไปต่อ */
  }
  for (const sql of SCHEMA_SQL) { /* CREATE TABLE IF NOT EXISTS ... */ }
}
```

**ผลที่ตามมา**

- ฐานข้อมูลเปล่า ๆ deploy ไปแล้วเปิดเว็บครั้งแรก → ตารางถูกสร้างครบเอง
- เพิ่มตารางใหม่ → เขียน SQL ลงใน `SCHEMA_SQL` แล้วบวก `SCHEMA_VERSION` ขึ้นหนึ่ง
- `schemaChecked` เป็นตัวแปรระดับโมดูล → ตรวจจริงแค่ครั้งเดียวต่อ isolate ไม่ได้ query ทุก request

🔴 **`wrangler d1 migrations apply` ไม่ใช่ขั้นตอนบังคับอีกต่อไป**
คู่มือเก่าเขียนว่าต้องรัน ซึ่งทำให้เข้าใจผิดว่าถ้าไม่รันแล้วระบบจะไม่ทำงาน
ความจริงคือ `ensureSchema()` สร้างให้เองหมด **ยกเว้นสามตาราง** — อ่านหัวข้อถัดไป

🔴 **สามตารางที่ `ensureSchema()` ไม่ได้สร้าง**

โฟลเดอร์ `migrations/` มีสามตารางที่ไม่อยู่ใน `SCHEMA_SQL`:

| ตาราง | Worker ใช้ไหม | ผลถ้าไม่มี |
|-------|--------------|-----------|
| `chat_logs` | **ใช้** — `INSERT INTO chat_logs` สองจุด | บันทึกบทสนทนาหายเงียบ ๆ |
| `part_prices` | ไม่ใช้แล้ว | ไม่มีผล |
| `part_price_runs` | ไม่ใช้แล้ว | ไม่มีผล |

`chat_logs` เป็นตัวที่มีปัญหาจริง โค้ดที่เขียนลงตารางนี้อยู่ใน `try/catch`:

```js
} catch (e) { console.error('[meter/chat_logs] write failed', e); }
```

แปลว่า **ถ้าตารางไม่มี ระบบไม่พัง แต่บันทึกบทสนทนาจะหายไปเงียบ ๆ**
ไม่มีใครรู้จนกว่าจะเปิดหน้าแอดมินแล้วพบว่าไม่มีข้อมูล

**ทางแก้ที่แนะนำ (สองทาง เลือกทางเดียว)**

```bash
# ทาง ก — รัน migration ตอนตั้งฐานข้อมูลใหม่ (ทำครั้งเดียว)
cd /home/user/SpireONE-backend
wrangler d1 migrations apply spireone --remote

# ทาง ข — ย้าย CREATE TABLE ของ chat_logs เข้าไปใน SCHEMA_SQL
#          แล้วบวก SCHEMA_VERSION เป็น 15  ← ทางนี้ดีกว่า เพราะทำให้กฎเป็นหนึ่งเดียว
```

> 📌 ไฟล์ `src/worker.js` อยู่ในความรับผิดชอบของ Grok ตามธรรมนูญทีมใน `AI-TEAM.md`
> เรื่องนี้จึงถูกบันทึกไว้เป็นรายงาน ไม่ได้แก้เอง — ดูภาค 12.1

---

## 2.3 ตารางทั้งหมด 26 ตาราง

จัดกลุ่มตามหน้าที่ ไม่ได้เรียงตามตัวอักษร เพราะการรู้ว่าตารางไหนทำงานกับตารางไหนสำคัญกว่า

### กลุ่มผู้ใช้และรถ

| ตาราง | เก็บอะไร |
|-------|---------|
| `users` | บัญชีผู้ใช้ · `uid` จาก Firebase เป็น primary key · ยศ · สถานะแบน |
| `cars` | รถในการาจ · ผูกกับ `users.uid` แบบ CASCADE (ลบผู้ใช้ = รถหายตาม) |
| `user_state` | สถานะที่ซิงก์ข้ามเครื่อง · key-value ต่อผู้ใช้ |
| `chat_prefs` | ค่าตั้งของห้องแชต (สไตล์การพูด ความยาวคำตอบ) |

### กลุ่มสมอง AI

| ตาราง | เก็บอะไร |
|-------|---------|
| `kb` | ความรู้ที่สอน AI ไว้ · มี `make`/`model` ให้กรองเฉพาะรุ่น |
| `qa_cache` | คำตอบที่เคยตอบแล้ว เอามาใช้ซ้ำได้ · มีคะแนนโหวตดี/ไม่ดี |
| `user_memory` | สิ่งที่ AI จำได้เกี่ยวกับผู้ใช้แต่ละคน |
| `chat_logs` | บทสนทนาเต็ม + จำนวนโทเคนที่ใช้ 🔴 *(ดู 2.2)* |
| `skills` | คำสั่งสำเร็จรูปที่ผู้ใช้เขียนเอง เรียกด้วย `/ชื่อ` |
| `skill_stars` | ใครกดดาวให้ skill ไหน |

### กลุ่มโควตา

| ตาราง | เก็บอะไร |
|-------|---------|
| `usage_win` | **ตัวจริงที่กั้นโควตา** · หน้าต่างละ 5 ชั่วโมง · `PRIMARY KEY (uid, win)` |
| `usage` | ตัวนับรายวันแบบเก่า ยังเขียนอยู่เพื่อดูสถิติ |

### กลุ่มเนื้อหาและร้านค้า

| ตาราง | เก็บอะไร |
|-------|---------|
| `magazine` | บทความนิตยสาร (cron ดึงมาวันละครั้ง) |
| `shop` | ร้านค้า/อู่ |
| `spares_cache` | ผลค้นอะไหล่ที่แคชไว้ |

### กลุ่มแจ้งเตือนและระยะทาง

| ตาราง | เก็บอะไร |
|-------|---------|
| `push_subs` | การสมัครรับแจ้งเตือน (endpoint + คีย์ของเบราว์เซอร์) |
| `push_jobs` | คิวงานแจ้งเตือนที่นัดเวลาไว้ |
| `notify_state` | สถานะว่าเคยเตือนเรื่องไหนไปแล้ว กันเตือนซ้ำ |
| `odo_state` · `odo_anchor` | เลขไมล์ปัจจุบันและจุดอ้างอิงสำหรับคำนวณ |
| `maint_item` | รายการบำรุงรักษาและกำหนดครั้งถัดไป |

### กลุ่มอุปกรณ์และ LINE

| ตาราง | เก็บอะไร |
|-------|---------|
| `obd_device` | อุปกรณ์ OBD ที่จับคู่ไว้ |
| `line_code` · `line_link` | รหัสจับคู่และการผูกบัญชี LINE |

### กลุ่มระบบ

| ตาราง | เก็บอะไร |
|-------|---------|
| `config` | ค่าตั้งของเว็บ · **เก็บ `schema_version` ไว้ที่นี่ด้วย** |
| `audit` | บันทึกการกระทำของแอดมิน (ใคร ทำอะไร เมื่อไหร่) |
| `feedback` | ความเห็นจากผู้ใช้ |

รวม **19 ดัชนี** กระจายอยู่ตามตารางที่ต้องค้นบ่อย

---

## 2.4 โครงตารางที่ต้องรู้จัก

ยกมาเฉพาะตัวที่แตะบ่อยและตัวที่มีลูกเล่นที่ต้องเข้าใจก่อนแก้

### `users` — จุดเริ่มของทุกอย่าง

```sql
CREATE TABLE IF NOT EXISTS users (
  uid        TEXT PRIMARY KEY,        -- มาจาก Firebase ไม่ใช่เลขที่เรารันเอง
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  photo      TEXT,
  role       TEXT DEFAULT 'user',     -- owner / admin / moderator / user
  last_login INTEGER NOT NULL
)
```

💡 **ทำไม `uid` เป็น TEXT ไม่ใช่ AUTOINCREMENT** — เพราะตัวตนของผู้ใช้เป็นของ Firebase
ถ้าเราออกเลขเอง จะมีสองแหล่งความจริงเรื่อง "คนนี้คือใคร" แล้ววันหนึ่งมันจะไม่ตรงกัน
การใช้ `uid` ของ Firebase ตรง ๆ ทำให้มีแหล่งความจริงแหล่งเดียว

### `cars` — ผูกกับผู้ใช้แบบ CASCADE

```sql
CREATE TABLE IF NOT EXISTS cars (
  id         TEXT PRIMARY KEY,
  uid        TEXT NOT NULL,
  make       TEXT NOT NULL,
  model      TEXT NOT NULL,
  year       TEXT,
  mileage    TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
)
```

⚠️ `year` กับ `mileage` เป็น **TEXT ไม่ใช่ INTEGER** — ผู้ใช้พิมพ์ "2018" บ้าง "ปี 61" บ้าง
"ประมาณ 80,000" บ้าง การบังคับเป็นตัวเลขจะทำให้บันทึกไม่ได้ในหลายกรณี
ถ้าต้องคำนวณ ให้แปลงตอนอ่าน ไม่ใช่บังคับตอนเขียน

### `kb` — คลังความรู้

```sql
CREATE TABLE IF NOT EXISTS kb (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  keywords   TEXT NOT NULL DEFAULT '',   -- ทางถอยเมื่อ Vectorize ล่ม
  make       TEXT NOT NULL DEFAULT '',   -- ว่าง = ใช้ได้ทุกยี่ห้อ
  model      TEXT NOT NULL DEFAULT '',   -- ว่าง = ใช้ได้ทุกรุ่น
  author     TEXT NOT NULL DEFAULT '',
  enabled    INTEGER NOT NULL DEFAULT 1,
  uses       INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)
```

💡 **`keywords` ยังอยู่ทั้งที่มี Vectorize แล้ว** — ตั้งใจ ถ้าดัชนีเวกเตอร์ล่มหรือยังไม่ได้ตั้ง
ระบบถอยไปใช้การจับคำจาก `keywords` อัตโนมัติ ผู้ใช้ยังได้คำตอบ แค่แม่นน้อยลง
การลบคอลัมน์นี้ทิ้งเท่ากับตัดทางถอยเส้นสุดท้าย

💡 **`make`/`model` ว่าง = ใช้ได้ทุกคัน** — ตอนค้นจะกรองด้วย `$in: ['', make]`
ความรู้ทั่วไปกับความรู้เฉพาะรุ่นจึงอยู่ตารางเดียวกันได้โดยไม่ต้องแยกตาราง

### `qa_cache` — คำตอบใช้ซ้ำ

```sql
CREATE TABLE IF NOT EXISTS qa_cache (
  id         TEXT PRIMARY KEY,
  make       TEXT NOT NULL DEFAULT '',
  model      TEXT NOT NULL DEFAULT '',
  qhash      TEXT NOT NULL,      -- แฮชของคำถามที่ทำให้เป็นมาตรฐานแล้ว → เจอเป๊ะ ตอบทันที
  qnorm      TEXT NOT NULL,      -- คำถามที่ทำให้เป็นมาตรฐาน → ใช้เทียบแบบ Jaccard
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  hits       INTEGER NOT NULL DEFAULT 0,
  good       INTEGER NOT NULL DEFAULT 0,
  bad        INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  used_at    INTEGER NOT NULL
)
```

**การค้นคำตอบเก่าไล่สามชั้น** เร็วไปช้า ถูกไปแพง:

1. `qhash` ตรงเป๊ะ → ตอบทันที ไม่เสียอะไรเลย
2. เวกเตอร์คล้ายกัน ≥ `VEC_MIN_CACHE` (0.88) → ตอบ เสียแค่ค่า embed หนึ่งครั้ง
3. Jaccard บน `qnorm` → ทางถอยเมื่อ Vectorize ใช้ไม่ได้

### `usage_win` — ตัวที่กั้นโควตาจริง

```sql
CREATE TABLE IF NOT EXISTS usage_win (
  uid     TEXT NOT NULL,
  win     INTEGER NOT NULL,      -- เลขหน้าต่าง = floor(now / 5 ชั่วโมง)
  in_tok  INTEGER NOT NULL DEFAULT 0,
  out_tok INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (uid, win)
)
```

💡 **ทำไมใช้เลขหน้าต่างแทน timestamp** — `win` คำนวณจาก `Math.floor(Date.now() / 18000000)`
การหาว่า "ตอนนี้ใช้ไปเท่าไหร่" จึงเป็นการอ่านแถวเดียวด้วย primary key ไม่ต้อง `SUM` ช่วงเวลา
และการ "รีเซ็ต" ไม่ต้องลบอะไรเลย — พอข้ามหน้าต่าง `win` เปลี่ยนเลข ก็เริ่มนับใหม่เองที่แถวใหม่

### `user_state` — ตัวกลางของ cloud sync

```sql
CREATE TABLE IF NOT EXISTS user_state (
  uid TEXT NOT NULL,
  k   TEXT NOT NULL,          -- ชื่อคีย์ (ไม่มีคำนำหน้า spire_)
  v   TEXT NOT NULL,          -- ค่าเป็น JSON string
  t   INTEGER NOT NULL,       -- เวลาที่เขียน ใช้ตัดสินว่าใครใหม่กว่า
  PRIMARY KEY (uid, k)
)
```

`t` คือหัวใจของกติกา "คนเขียนทีหลังชนะ" (last-writer-wins) — ดูภาค 8.2

---

## 2.5 วิธีเขียนคำสั่ง SQL ให้ปลอดภัย

🔴 **กฎเหล็กข้อเดียว: อย่าต่อสตริงเข้าไปใน SQL เด็ดขาด**

```js
// ❌ ห้ามทำ — ใครส่ง uid = "x' OR '1'='1" มาก็อ่านข้อมูลคนอื่นได้หมด
await env.DB.prepare(`SELECT * FROM cars WHERE uid = '${uid}'`).all();

// ✅ ถูกต้อง — ค่าถูกส่งแยกจากคำสั่ง ฐานข้อมูลไม่มีทางตีความเป็นคำสั่ง
await env.DB.prepare('SELECT * FROM cars WHERE uid = ?').bind(uid).all();
```

**กรณีที่ต้องสร้าง SQL แบบยืดหยุ่นจริง ๆ** เช่นรายการ `IN (?, ?, ?)` ที่ไม่รู้จำนวนล่วงหน้า
ให้สร้างเฉพาะ **จำนวนเครื่องหมายคำถาม** จากความยาวอาเรย์ ห้ามเอาค่าไปต่อ:

```js
const ids = ['a', 'b', 'c'];
const marks = ids.map(() => '?').join(',');            // "?,?,?"  ← ปลอดภัย
await env.DB.prepare(`SELECT * FROM kb WHERE id IN (${marks})`)
            .bind(...ids).all();                        // ค่ายังส่งผ่าน bind
```

⚠️ **จำกัดจำนวนพารามิเตอร์** — D1 มีเพดานจำนวน bind ต่อคำสั่ง (ราว 100)
ถ้าต้องยิงรายการยาวกว่านั้น ให้แบ่งเป็นก้อน ๆ อย่าส่งทีเดียว

**ตรวจว่ามีที่ไหนต่อสตริงหลงเหลืออยู่ไหม**

```bash
cd /home/user/SpireONE-backend
grep -nE 'prepare\(`[^`]*\$\{' src/worker.js
# ผลที่ควรได้: เฉพาะบรรทัดที่ต่อ "?,?,?" เท่านั้น ไม่มีบรรทัดที่ต่อค่าจริง
```

---

## 2.6 อัปโหลดและดึงข้อมูลเข้าออก D1

### ก. ผ่านหน้าเว็บแอดมิน (วิธีปกติ)

`admin.html` ทำงานผ่าน API เดียวกับที่แอปใช้ ไม่ได้ต่อฐานข้อมูลตรง

| อยากทำอะไร | เข้าไปที่ | เบื้องหลังเรียก |
|-----------|----------|----------------|
| เพิ่มความรู้ทีละชิ้น | สอน AI → เพิ่ม | `POST /api/kb` |
| นำเข้าความรู้ทีละมาก | สอน AI → นำเข้าเป็นชุด | `POST /api/kb/bulk` |
| ดูคำตอบที่ใช้ซ้ำ | คำตอบใช้ซ้ำ | `GET /api/cache` |
| ดาวน์โหลดทุกอย่าง | ส่งออกข้อมูล | `GET /api/admin/export` |
| จัดการผู้ใช้/ยศ | ผู้ใช้ & ยศ | `GET/POST /api/admin/users*` |

**รูปแบบไฟล์นำเข้าความรู้เป็นชุด** — JSON อาเรย์:

```json
[
  {
    "title": "แอร์ไม่เย็น",
    "body": "สาเหตุที่พบบ่อยเรียงตามความน่าจะเป็น...",
    "keywords": "แอร์ ไม่เย็น คอมแอร์ น้ำยา",
    "make": "",
    "model": ""
  }
]
```

`make`/`model` ปล่อยว่างถ้าเป็นความรู้ทั่วไป ระบบจะออก `id` และเวลาให้เอง
และ **ส่งเวกเตอร์เข้า Vectorize ให้อัตโนมัติ** ไม่ต้องสั่งสร้างดัชนีแยก

### ข. ผ่าน API ตรง ๆ ด้วย curl

ต้องมี Firebase ID token ของบัญชีที่มียศพอ วิธีเอา token: เปิดเว็บ ล็อกอิน แล้วใน console

```js
await firebase.auth().currentUser.getIdToken()
```

```bash
BASE="https://spireonebackend.carspirethailand.workers.dev"
TOKEN="วางโทเคนที่ได้ตรงนี้"

# อ่าน
curl -s "$BASE/api/kb" -H "Authorization: Bearer $TOKEN" | head -c 400

# เขียนทีละชิ้น
curl -s -X POST "$BASE/api/kb" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"เบรกมีเสียง","body":"...","keywords":"เบรก เสียง ผ้าเบรก"}'

# นำเข้าเป็นชุดจากไฟล์
curl -s -X POST "$BASE/api/kb/bulk" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data-binary @kb-pack-01.json

# ส่งออกทั้งหมด
curl -s "$BASE/api/admin/export" -H "Authorization: Bearer $TOKEN" > backup.json
```

### ค. ผ่าน wrangler ตรงเข้าฐานข้อมูล (ทางลัดของ dev)

🔴 **ทางนี้ข้าม API ทั้งหมด** แปลว่า **ข้ามการสร้างเวกเตอร์ด้วย**
ถ้าเพิ่มแถวใน `kb` ด้วยวิธีนี้ AI จะค้นไม่เจอจนกว่าจะกดสร้างดัชนีย้อนหลัง (ภาค 3.4)

```bash
cd /home/user/SpireONE-backend

# รันคำสั่งเดียว  (--remote = ฐานข้อมูลจริง, ไม่ใส่ = ฐานข้อมูลจำลองในเครื่อง)
wrangler d1 execute spireone --remote --command "SELECT COUNT(*) AS n FROM users"

# รันจากไฟล์
wrangler d1 execute spireone --remote --file=./scratch/patch.sql

# สำรองทั้งฐาน
wrangler d1 export spireone --remote --output=backup-$(date +%F).sql

# ดูรายชื่อฐานข้อมูล
wrangler d1 list
```

⚠️ **`--remote` คือความต่างระหว่างของจริงกับของจำลอง**
ลืมใส่แล้วสั่ง `DELETE` คุณจะลบฐานข้อมูลจำลองในเครื่องโดยไม่รู้ว่าของจริงยังอยู่
ใส่แล้วสั่ง `DELETE` ผิด คือลบของจริง **ที่ไม่มีปุ่ม undo**

**ก่อนสั่งอะไรที่ลบหรือแก้ ให้ SELECT ดูก่อนเสมอ**

```bash
# 1) ดูก่อนว่าจะโดนกี่แถว
wrangler d1 execute spireone --remote --command \
  "SELECT COUNT(*) FROM qa_cache WHERE bad > good"
# 2) เห็นตัวเลขแล้วพอใจ ค่อยลบ
wrangler d1 execute spireone --remote --command \
  "DELETE FROM qa_cache WHERE bad > good"
```

### ง. สรุปว่าควรใช้ทางไหน

| สถานการณ์ | ใช้ทาง | เหตุผล |
|----------|--------|--------|
| เพิ่มความรู้ให้ AI | หน้าแอดมิน หรือ API | ได้เวกเตอร์อัตโนมัติ |
| นำเข้าครั้งละหลายร้อยชิ้น | `POST /api/kb/bulk` | แปลงเวกเตอร์เป็นชุดละ 50 ประหยัดกว่ามาก |
| แก้ข้อมูลผิดเร่งด่วน | `wrangler d1 execute` | เร็วที่สุด แต่ต้องสร้างดัชนีย้อนหลังตาม |
| สำรองข้อมูล | `wrangler d1 export` | ได้ SQL ที่กู้คืนได้จริง |
| ตรวจว่าข้อมูลถูกไหม | `wrangler d1 execute` + SELECT | ไม่กระทบอะไร |

---

## 2.7 ขีดจำกัดของ D1 ที่ต้องออกแบบเผื่อ

| ขีดจำกัด | ผลต่อการออกแบบ |
|---------|----------------|
| ไม่มี transaction เต็มรูปแบบ | เขียนหลายตารางแล้วพังกลางทางได้ ต้องเขียนโค้ดให้ทนต่อสถานะครึ่ง ๆ |
| `.batch()` ไม่ย้อนกลับให้ | ใช้เพื่อลด round-trip เท่านั้น อย่าคาดหวังความ atomic |
| เพดานพารามิเตอร์ต่อคำสั่ง | รายการยาวต้องแบ่งก้อน |
| ขนาดฐานข้อมูลมีเพดาน | ตารางที่โตไม่จำกัด (`chat_logs`) ควรมีแผนตัดของเก่าทิ้ง |
| เขียนพร้อมกันหนัก ๆ จะช้า | งานที่เขียนถี่มากควรรวบก่อนเขียน ไม่ใช่เขียนทุกครั้งที่มีเหตุ |

💡 **สิ่งที่ทำแล้วในโค้ดเพื่อรับมือ** — การเขียน `chat_logs`, `qa_cache`, `user_memory`
ทำหลังจากส่งคำตอบให้ผู้ใช้ไปแล้วผ่าน `ctx.waitUntil()`
ผู้ใช้จึงไม่ต้องรอการเขียนฐานข้อมูล และถ้าการเขียนล้ม คำตอบก็ถึงมือผู้ใช้ไปแล้ว

---
---

# ภาค 3 — Vectorize: สมองค้นด้วยความหมาย

## 3.1 ทำไมต้องมี

การจับคำตรงตัวใช้ไม่ได้กับภาษาไทยและกับวิธีที่คนถามจริง

> ผู้ใช้ถาม: **"ในห้องโดยสารลมออกมาไม่เย็นเลย"**
> ความรู้ที่มี: **"แอร์ไม่เย็น"**
> คำที่ตรงกัน: **ศูนย์คำ**

การค้นด้วยความหมายเจอ เพราะทั้งสองประโยคถูกแปลงเป็นเวกเตอร์ที่อยู่ใกล้กันในปริภูมิ 1024 มิติ

**ค่าที่ใช้**

| ค่า | ตัวเลข | ทำไมเป็นค่านี้ |
|-----|-------|---------------|
| โมเดล | `@cf/baai/bge-m3` | รองรับหลายภาษารวมไทย ไม่ต้องแปลก่อน |
| มิติ | 1024 | ตามที่โมเดลออกมา เปลี่ยนไม่ได้ |
| วิธีวัดระยะ | cosine | วัดทิศทาง ไม่สนความยาว เหมาะกับข้อความยาวไม่เท่ากัน |
| ขนาดชุด | 50 | จำนวนข้อความต่อการเรียก Workers AI หนึ่งครั้ง |

---

## 3.2 ตั้งครั้งเดียวจบ

```bash
cd /home/user/SpireONE-backend

# ดัชนีหลัก — มิติต้องตรงกับโมเดล ไม่งั้นใส่เวกเตอร์ไม่ได้เลย
wrangler vectorize create cendon-brain --dimensions=1024 --metric=cosine

# ฟิลด์ที่ใช้กรอง ต้องประกาศก่อน ไม่งั้น filter เงียบ ๆ ไม่ทำงาน
wrangler vectorize create-metadata-index cendon-brain --property-name=kind  --type=string
wrangler vectorize create-metadata-index cendon-brain --property-name=make  --type=string
wrangler vectorize create-metadata-index cendon-brain --property-name=model --type=string
wrangler vectorize create-metadata-index cendon-brain --property-name=uid   --type=string

wrangler deploy
```

🔴 **metadata index ต้องสร้างก่อนใส่ข้อมูล** — ถ้าลืม ตัวกรองจะไม่ทำงานแต่ **ไม่มี error**
อาการที่เห็นคือ AI ตอบด้วยความรู้ของรถคันอื่น ซึ่งดูเหมือนโมเดลมั่ว ทั้งที่จริงคือ filter ไม่ทำงาน

ผูกไว้ใน `wrangler.jsonc` ให้แล้ว:

```jsonc
"ai":        { "binding": "AI" },
"vectorize": [{ "binding": "VECTORIZE", "index_name": "cendon-brain" }]
```

---

## 3.3 D1 คือตัวจริง Vectorize คือชั้นค้นหา

**`id` ของเวกเตอร์ = `id` ของแถวใน D1 เสมอ** ค้นเจอแล้วเอา id ไปหยิบเนื้อเต็มจาก D1

ทำไมไม่ย้ายทุกอย่างไปอยู่ใน Vectorize:

1. **metadata จำกัด 10 KiB ต่อเวกเตอร์** — เนื้อความรู้เต็ม ๆ ใส่ไม่ลง
2. **แก้ทีละฟิลด์ไม่ได้ · ไม่มี transaction · ไล่รายการทั้งหมดไม่ได้** — หน้าแอดมินที่ต้องแสดงรายการและแก้ทีละช่องจะพังทันที
3. **ถ้าดัชนีหาย ข้อมูลต้องไม่หายตาม** — สร้างใหม่ได้เสมอจาก D1 ด้วยปุ่มสร้างย้อนหลัง

### ทางถอยเมื่อ Vectorize ใช้ไม่ได้

ยังไม่ได้ผูก หรือดัชนีล่ม → ระบบ **กลับไปใช้การจับคำอัตโนมัติ** ไม่มีอะไรพัง
ดูสถานะได้ที่ admin → สุขภาพระบบ → ตรวจระบบ

---

## 3.4 สร้างดัชนีย้อนหลัง

ใช้เมื่อ: เพิ่งตั้ง Vectorize ครั้งแรก · เพิ่มข้อมูลผ่าน `wrangler d1 execute` · ดัชนีหาย

**ทางที่ง่าย** — admin.html → สมองเวกเตอร์ → สร้างดัชนีย้อนหลัง → ทั้งหมด
หน้าเว็บวนเรียกทีละ 100 ชิ้นจนครบเอง เปิดค้างไว้จนขึ้นว่าเสร็จ

**ทางที่เรียกเอง**

```bash
curl -X POST "$BASE/api/admin/vectorize/backfill" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"kind":"kb","after":"","limit":100}'
# ตอบกลับมี after กับ done — วนส่ง after ตัวล่าสุดกลับไปจนกว่า done เป็น true
# kind มีสามค่า: kb · cache · memory
```

**ค่าใช้จ่าย** — นำเข้า 300 ชิ้นเรียก Workers AI **6 รอบ** (ชุดละ 50) ไม่ใช่ 300 รอบ

---

## 3.5 การจูนคะแนนขั้นต่ำ

| ตัวแปร | ค่าเริ่มต้น | ใช้กับ | ปรับขึ้นถ้า | ปรับลงถ้า |
|--------|-----------|--------|-----------|----------|
| `VEC_MIN_CACHE` | `0.88` | คำตอบใช้ซ้ำ | ตอบคำถามที่ไม่เหมือนกันด้วยคำตอบเดิม | คำถามซ้ำ ๆ ยังเรียก AI ใหม่ทุกครั้ง |
| `VEC_MIN_KB` | `0.45` | ความรู้ที่สอนไว้ | หยิบความรู้ที่ไม่เกี่ยวมาตอบ | มีความรู้อยู่แต่ไม่ถูกหยิบมาใช้ |
| `VEC_MIN_MEMORY` | `0.40` | ความจำผู้ใช้ | อ้างเรื่องเก่าที่ไม่เกี่ยว | ลืมสิ่งที่เพิ่งคุยกัน |

**อย่าเดาค่า วัดก่อน** — ใช้ probe ยิงคำถามจริงแล้วดูคะแนนที่ได้จริง:

```bash
curl -s "$BASE/api/admin/vectorize/probe?q=แอร์ไม่เย็น&kind=kb" \
  -H "Authorization: Bearer $TOKEN"
```

ดูว่าอันที่ควรเจอได้คะแนนเท่าไหร่ อันที่ไม่ควรเจอได้เท่าไหร่ **แล้วตั้งเส้นแบ่งตรงกลาง**
`VEC_MIN_CACHE` สูงถึง 0.88 เพราะการตอบผิดด้วยคำตอบเก่าเสียหายกว่าการเรียก AI ใหม่มาก

---
---

# ภาค 4 — API ทั้งหมด

## 4.1 โครงการจัดเส้นทาง

ไม่มี router library — เป็น if-chain บน `url.pathname` + `request.method` ใน `fetch()`

```js
export default {
  async fetch(request, env, ctx) {
    const url  = new URL(request.url);
    const cors = corsHeaders(env, request);

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (!env.DB) return deny('Database is not configured', 500);

    await ensureSchema(env);                     // ตารางครบไหม

    const guarded = (minRole, handler) => async () => {
      let actor;
      try { actor = await getActor(request, env); }
      catch (e) { return deny('Invalid authentication token', 401); }
      if (actor.banned) return deny('Account suspended', 403);
      if (rank(actor.role) < rank(minRole)) return deny('Forbidden: insufficient role', 403);
      try { return await handler(actor); }
      catch (e) { return deny(e.message || 'Server error', 500); }
    };

    if (url.pathname === '/api/config' && request.method === 'GET') { /* ... */ }
    if (url.pathname === '/api/login'  && request.method === 'POST') { /* ... */ }
    // ... เส้นทางที่เหลือ
  }
}
```

💡 **`guarded()` คือหัวใจของความปลอดภัย** — เส้นทางที่ต้องมีสิทธิ์ทุกเส้นห่อด้วยตัวนี้
การตรวจสามอย่าง (token · แบน · ยศ) จึงเกิดที่เดียว ไม่ต้องไปเขียนซ้ำทุก endpoint
และไม่มีทางลืม เพราะถ้าไม่ห่อ ก็ไม่มี `actor` ให้ใช้เลย

⚠️ **`e.message` ถูกส่งกลับไปหาผู้ใช้ตรง ๆ** — ในบรรทัด `catch (e) { return deny(e.message ...) }`
ข้อความ error ภายในอาจหลุดออกไปถึงผู้เรียก ดูภาค 12.1

---

## 4.2 ตารางเส้นทางทั้งหมด

ยศต่ำสุดที่เรียกได้ระบุไว้ในคอลัมน์ "สิทธิ์" · `—` คือเรียกได้โดยไม่ต้องล็อกอิน

### สาธารณะและบัญชี

| เส้นทาง | สิทธิ์ | ทำอะไร |
|---------|-------|--------|
| `GET /api/config` | — | ประกาศ · โหมดปิดปรับปรุง · เพดานโควตา |
| `POST /api/login` | token | upsert `users` แล้วคืนยศ |
| `POST /api/account/reset` | user | ล้างข้อมูลของตัวเอง |
| `POST /api/account/deactivate` | user | ปิดบัญชีตัวเอง |

### AI

| เส้นทาง | สิทธิ์ | ทำอะไร |
|---------|-------|--------|
| `POST /api/ai/stream` | user | แชตแบบสตรีม (SSE) — เส้นทางหลัก |
| `POST /api/ai/chat` | user | แชตแบบตอบทีเดียวจบ |
| `POST /api/ai/live-token` | user | โทเคนชั่วคราวสำหรับคุยเสียง/วิดีโอ |
| `POST /api/diagnose` | — | วินิจฉัยอาการ (จำกัดตาม IP ด้วย `AI_ANON_DAILY_LIMIT`) |
| `POST /api/listen` | user | วิเคราะห์เสียงเครื่อง |
| `POST /api/quote` | user | อ่านใบเสนอราคา |
| `GET /api/quota` | user | ยอดโควตาที่เหลือ + เวลาที่จะเติมใหม่ |
| `GET /api/v1/...` | — | เส้นทางรุ่นเก่า ยังเปิดไว้เพื่อความเข้ากันได้ย้อนหลัง |

### สมอง AI

| เส้นทาง | สิทธิ์ | ทำอะไร |
|---------|-------|--------|
| `GET /api/kb` · `POST /api/kb` | moderator | อ่าน/เขียนคลังความรู้ |
| `POST /api/kb/bulk` | moderator | นำเข้าเป็นชุด (สร้างเวกเตอร์ให้อัตโนมัติ) |
| `DELETE /api/kb/:id` | moderator | ลบความรู้ |
| `GET /api/cache` | moderator | ดูคำตอบที่ใช้ซ้ำ |
| `DELETE /api/cache/:id` | moderator | ลบคำตอบที่ใช้ซ้ำ |
| `POST /api/cache/vote` | user | โหวตว่าคำตอบดีหรือไม่ดี |
| `GET /api/memory` · `POST /api/memory` | user | ความจำของตัวเอง |
| `GET /api/chat/prefs` · `POST /api/chat/prefs` | user | ค่าตั้งห้องแชต |

### Skills

| เส้นทาง | สิทธิ์ | ทำอะไร |
|---------|-------|--------|
| `GET /api/skills/all` | user | skills ทั้งหมดที่ใช้ได้ |
| `GET /api/skills/mine` | user | skills ที่ตัวเองสร้าง |
| `GET /api/skills/hub` | user | skills ที่คนอื่นแบ่งปัน |
| `GET /api/skills/pending` | moderator | skills ที่รออนุมัติ |
| `POST /api/skills` | user | สร้างหรือแก้ skill |

### ข้อมูลผู้ใช้

| เส้นทาง | สิทธิ์ | ทำอะไร |
|---------|-------|--------|
| `GET /api/cars` · `POST /api/cars` | user | รถในการาจ |
| `DELETE /api/cars/:id` | user | ลบรถ |
| `GET /api/state` · `PUT /api/state` | user | cloud sync (ดูภาค 8.2) |
| `POST /api/feedback` | user | ส่งความเห็น |

### เนื้อหา

| เส้นทาง | สิทธิ์ | ทำอะไร |
|---------|-------|--------|
| `GET /api/magazine` | — | อ่านนิตยสาร |
| `POST /api/magazine/sync` | moderator | ดึงบทความใหม่ |
| `GET /api/shop` | — | รายชื่อร้าน/อู่ |
| `POST /api/shop/sync` | moderator | ดึงข้อมูลร้านใหม่ |
| `GET /api/spares` | user | ค้นอะไหล่ |

### ระยะทาง OBD และ LINE

| เส้นทาง | สิทธิ์ | ทำอะไร |
|---------|-------|--------|
| `GET /api/odo/state` · `POST /api/odo/state` | user | เลขไมล์ปัจจุบัน |
| `POST /api/odo/anchor` | user | ตั้งจุดอ้างอิงเลขไมล์ |
| `POST /api/maint/done` | user | บันทึกว่าทำบำรุงรักษาแล้ว |
| `POST /api/maint/set` | user | ตั้งรอบบำรุงรักษา |
| `POST /api/obd/pair` | user | จับคู่อุปกรณ์ OBD |
| `POST /api/obd/ingest` | — | อุปกรณ์ส่งข้อมูลเข้ามา |
| `POST /api/line/webhook` | — | LINE เรียกเข้ามา |
| `POST /api/line/code` | user | ขอรหัสจับคู่ LINE |
| `POST /api/line/link` | — | ผูกบัญชี LINE |

### แจ้งเตือน

| เส้นทาง | สิทธิ์ | ทำอะไร |
|---------|-------|--------|
| `GET /api/push/key` | — | VAPID public key |
| `POST /api/push/subscribe` | user | สมัครรับแจ้งเตือน |
| `POST /api/push/unsubscribe` | user | ยกเลิก |
| `POST /api/push/test` | user | ส่งทดสอบ |
| `POST /api/push/schedule` | user | นัดเวลาแจ้งเตือน |
| `POST /api/push/cancel` | user | ยกเลิกที่นัดไว้ |

### ผู้ดูแล

| เส้นทาง | สิทธิ์ | ทำอะไร |
|---------|-------|--------|
| `GET /api/admin/stats` | moderator | ภาพรวมตัวเลข |
| `GET /api/admin/health` | moderator | binding ครบไหม คีย์ตั้งไหม |
| `GET /api/admin/audit` · `POST /api/admin/audit` | moderator | บันทึกการทำงานของแอดมิน |
| `GET /api/admin/cars` | moderator | รถทั้งระบบ |
| `GET /api/admin/users` | admin | รายชื่อผู้ใช้ |
| `POST /api/admin/users/role` | admin | เปลี่ยนยศ (owner เท่านั้นที่ตั้ง admin ได้) |
| `POST /api/admin/users/ban` | admin | ระงับบัญชี |
| `POST /api/admin/users/tpd` | admin | ตั้งเพดานโทเคนรายคน |
| `GET /api/admin/magazine` · `POST /api/admin/magazine` | admin | จัดการนิตยสาร |
| `GET /api/admin/shop` | admin | จัดการร้านค้า |
| `GET /api/admin/config` | admin | ค่าตั้งเว็บ (ประกาศ · โหมดปิดปรับปรุง) |
| `GET /api/admin/export` | admin | ส่งออกข้อมูลทั้งหมด |
| `GET /api/admin/feedback` · `POST /api/admin/feedback` | moderator | ความเห็นผู้ใช้ |
| `GET /api/admin/diag` | moderator | **ตรวจการค้นเน็ตด้วยของจริง** |
| `GET /api/admin/vectorize/status` | admin | จำนวนเวกเตอร์เทียบกับ D1 |
| `POST /api/admin/vectorize/backfill` | admin | สร้างดัชนีย้อนหลัง |
| `GET /api/admin/vectorize/probe` | admin | ลองค้นดูคะแนนจริง |

---
---

# ภาค 5 — ยืนยันตัวตนและสิทธิ์

## 5.1 Firebase ID token ตรวจที่ไหน อย่างไร

ทั้งไฟล์ `src/auth.js` มี 23 บรรทัด และนี่คือทั้งหมดของการตรวจตัวตน:

```js
import * as jose from 'jose';

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const JWKS = jose.createRemoteJWKSet(new URL(JWKS_URL));

export async function verifyFirebaseToken(token, firebaseProjectId) {
  if (!token) throw new Error('Token is empty');
  const { payload } = await jose.jwtVerify(token, JWKS, {
    issuer:   `https://securetoken.google.com/${firebaseProjectId}`,
    audience: firebaseProjectId,
    clockTolerance: 120,        // เผื่อนาฬิกาเครื่องคลาดเคลื่อน 2 นาที
  });
  return payload;
}
```

**เกิดอะไรขึ้นจริง ๆ**

1. เบราว์เซอร์ล็อกอินกับ Firebase แล้วได้ **JWT ที่ Google เซ็นด้วยกุญแจส่วนตัว**
2. แนบมาเป็น `Authorization: Bearer <token>`
3. Worker ดึง **กุญแจสาธารณะ** ของ Google จาก JWKS แล้วตรวจลายเซ็น
4. ตรวจ `issuer` และ `audience` ว่าเป็นของโปรเจกต์เรา
5. ผ่านแล้วได้ `payload.sub` = `uid` ที่เชื่อถือได้

💡 **ทำไมปลอมไม่ได้** — ต้องมีกุญแจส่วนตัวของ Google ถึงจะเซ็น JWT ที่ผ่านการตรวจได้
การแก้ JavaScript ในหน้าเว็บไม่ช่วยอะไร เพราะการตรวจเกิดที่ Worker ไม่ใช่ที่เบราว์เซอร์

💡 **ทำไมต้อง `clockTolerance`** — นาฬิกาเครื่องผู้ใช้เพี้ยนได้เป็นเรื่องปกติ
ถ้าไม่เผื่อไว้ คนที่นาฬิกาเร็วไป 30 วินาทีจะล็อกอินไม่ได้โดยไม่มีใครเข้าใจว่าทำไม

---

## 5.2 ยศทั้งสี่ระดับ

```js
const ROLE_RANK = { owner: 4, admin: 3, moderator: 2, user: 1 };
function rank(role) { return ROLE_RANK[role] || 0; }
```

| ยศ | ทำอะไรได้ |
|----|-----------|
| **owner** | ทุกอย่าง · เป็นคนเดียวที่ให้/ถอนยศ admin ได้ · ลดยศไม่ได้ |
| **admin** | จัดการ moderator/user · นิตยสาร · ค่าตั้งเว็บ · บันทึกการทำงาน · สร้างดัชนีย้อนหลัง |
| **moderator** | ดูภาพรวม · จัดการนิตยสาร · สอน AI · ดูคำตอบใช้ซ้ำ · ตรวจระบบ |
| **user** | ใช้แอปตามปกติ |

**owner มาจากไหน** — อีเมลใน `OWNERS` ของ `wrangler.jsonc`
ตรวจทุกครั้งที่ล็อกอิน ใครที่อีเมลอยู่ในนั้นจะเป็น owner เสมอ แม้ในฐานข้อมูลจะเขียนไว้เป็นอย่างอื่น

**ให้ยศ** — admin.html → ผู้ใช้ & ยศ → เลือกจาก dropdown ที่แถวของคนนั้น

---

## 5.3 การ์ดกันสามชั้น

| ชั้น | ป้องกันอะไร |
|-----|------------|
| 1. ตรวจลายเซ็น token | คนที่ไม่ได้ล็อกอิน หรือปลอม token |
| 2. ตรวจสถานะแบน | บัญชีที่ถูกระงับ — ปฏิเสธทุกจุด ไม่ใช่แค่ตอนล็อกอิน |
| 3. ตรวจยศ | คนที่ล็อกอินแล้วแต่ไม่มีสิทธิ์ในเส้นทางนั้น |

🔴 **การตรวจยศทำที่ backend เท่านั้น ไม่ใช่แค่ซ่อนปุ่มใน UI**
การซ่อนปุ่มเป็นเรื่องของประสบการณ์ใช้งาน ไม่ใช่ความปลอดภัย

### เรื่อง "ซ่อน" โค้ด HTML

HTML/JS แบบ static มองเห็นได้เสมอผ่าน inspect — เว็บทุกเว็บบนโลกเป็นแบบนี้
ความปลอดภัยมาจากการที่ backend บังคับ auth + ยศ **ไม่ใช่จากการซ่อนโค้ด**
คีย์ทั้งหมดอยู่ใน Worker เท่านั้น เปิด inspect ก็ไม่เจออะไร

---
---

# ภาค 6 — โควตาและการนับโทเคน

## 6.1 หน้าต่างเลื่อน 5 ชั่วโมง

```js
const QUOTA_WINDOW_MS = 5 * 60 * 60 * 1000;
const winKey     = (now) => Math.floor((now || Date.now()) / QUOTA_WINDOW_MS);
const winResetAt = (now) => (winKey(now) + 1) * QUOTA_WINDOW_MS;
```

**หักตามโทเคนจริง ไม่ได้นับเป็นครั้ง** — ถามสั้นหักน้อย คุยยาวหักมาก

| การใช้งาน | ราวเท่าไหร่ |
|-----------|-----------|
| ข้อความสั้น | 300–800 โทเคน |
| คุยยาวหลายรอบ | เพิ่มขึ้นตามความยาวบทสนทนา |
| แนบรูปหรือวิดีโอ | 1,500–4,000 โทเคน |
| ค้นข้อมูลจากเว็บ | บวกเพิ่มเล็กน้อย |

💡 **ทำไม 5 ชั่วโมงไม่ใช่รายวัน** — โควตารายวันที่หมดตอนเที่ยงทำให้ผู้ใช้รอถึงเที่ยงคืน
หน้าต่าง 5 ชั่วโมงเติมเองเรื่อย ๆ คนที่ชนเพดานรออีกไม่นานก็ใช้ต่อได้
และไม่ต้องมี cron มารีเซ็ต เพราะพอข้ามหน้าต่าง เลข `win` เปลี่ยนเอง

**owner และ admin ไม่ถูกจำกัด** — `/api/quota` จะคืน `unlimited: true`

---

## 6.2 ตารางที่เกี่ยวข้อง

| ตาราง | บทบาท |
|-------|-------|
| `usage_win` | **ตัวจริงที่กั้น** — `PRIMARY KEY (uid, win)` อ่านแถวเดียวรู้ยอด |
| `usage` | ตัวนับรายวันแบบเก่า เก็บไว้ดูสถิติ ไม่ได้ใช้กั้น |
| `chat_logs` | เก็บ `in_tok` / `out_tok` / `total_tok` ต่อบทสนทนา 🔴 *(ดู 2.2)* |

**ตัวแปรที่ปรับได้**

| ตัวแปร | ค่าเริ่มต้น | ใช้กับ |
|--------|-----------|--------|
| `AI_DAILY_LIMIT` | `60` | เพดานของคนที่ล็อกอินแล้ว |
| `AI_ANON_DAILY_LIMIT` | `15` | `/api/diagnose` ต่อ IP สำหรับคนที่ยังไม่ล็อกอิน |
| `AI_TOKEN_DAILY_LIMIT` | ไม่ได้ตั้งใน vars | เพดานโทเคน ตั้งเป็น secret หรือ var เพิ่มได้ |
| `AI_LIVE_CALL_TOKENS` | ไม่ได้ตั้งใน vars | ค่าหักต่อการโทรหนึ่งครั้ง |

---
---

# ภาค 7 — การค้นอินเทอร์เน็ต

## 7.1 สี่ทางไล่ลงมา

AI ค้นข้อมูลสดเมื่อคำถามเข้าข่าย: เอ่ยยี่ห้อรถ · ถามราคา · ถามรุ่นใหม่ · มีปี พ.ศ./ค.ศ.

```js
const chain = [
  ['gemini',     searchViaGemini],       // ต้องมี GEMINI_KEY
  ['openrouter', searchViaOpenRouter],   // ต้องมี OPENROUTER_API_KEY
  ['duckduckgo', searchViaDuckDuckGo],   // ไม่ต้องใช้คีย์
  ['wikipedia',  searchViaWikipedia],    // ไม่ต้องใช้คีย์
];
// หยุดที่ทางแรกที่ได้ผลลัพธ์ยาวเกิน 40 ตัวอักษร
```

💡 **ทำไมสองทางสุดท้ายไม่ต้องใช้คีย์** — เพื่อให้ระบบยังค้นได้แม้คีย์หมดอายุหรือถูกปิดสิทธิ์
ถ้าพึ่งคีย์อย่างเดียว วันที่คีย์มีปัญหา = ค้นไม่ได้ทั้งระบบและไม่มีใครรู้จนผู้ใช้บ่น

**ตรวจสถานะ** — admin.html → สุขภาพระบบ → ตรวจเดี๋ยวนี้ หรือ `GET /api/admin/diag?q=...`
จะบอกว่าแต่ละทางล้มเพราะอะไร ใช้เวลาเท่าไหร่ ได้ข้อมูลหน้าตาแบบไหน

> 🔴 ค้นไม่สำเร็จ ระบบสั่ง AI ให้บอกตรง ๆ ว่ายังไม่มีข้อมูลยืนยัน **ห้ามเดา**
> การตอบว่าไม่รู้ถือว่าถูกต้องเสมอ การเดาแล้วพูดเหมือนรู้จริงถือว่าผิดร้ายแรงที่สุด

---

## 7.2 บทเรียนราคาแพง

ระบบค้นเน็ตพัง **100% เป็นเวลาหลายสัปดาห์** โดยไม่มีใครรู้

สาเหตุ: ฟังก์ชัน `cleanSearch()` ถูก **เรียก 1 ครั้ง แต่ไม่เคยถูกนิยามเลย**

- อ่านโค้ดแล้วเห็นไหม — **ไม่เห็น** ตาข้ามไปเพราะชื่อฟังก์ชันดูสมเหตุสมผล
- เจอได้ยังไง — สคริปต์ที่นับว่า "แต่ละชื่อถูกนิยามกี่ครั้ง เรียกกี่ครั้ง" แล้วรายงานตัวที่นิยาม 0 เรียก ≥1

**เครื่องมือที่เขียนไว้จับกรณีแบบนี้**

```bash
node <scratchpad>/scan.mjs      # กวาดหาฟังก์ชันที่ถูกเรียกแต่ไม่มีตัวตน
```

⚠️ **บทเรียน** — `try/catch` ที่กลืน error ทำให้บั๊กแบบนี้เงียบสนิท
ทุกครั้งที่เขียน `catch (e) {}` ให้ถามตัวเองว่า "ถ้าตรงนี้พัง จะมีใครรู้ไหม"

---
---

# ภาค 8 — Frontend: โครงและกลไกที่ทุกหน้าใช้ร่วมกัน

## 8.1 ขนาดจริงของสิ่งที่ต้องดูแล

ตัวเลขชุดนี้มาจากสคริปต์ที่อ่านไฟล์จริง ไม่ได้ไล่ด้วยตา

| ไฟล์ | ขนาด | บรรทัด | หน้าย่อยข้างใน |
|------|------|--------|----------------|
| `spares.html` | 1,020 KB | 15,034 | shop · settings · skills · brief · quote |
| `index.html` | 875 KB | 15,781 | home · settings · skills · brief · quote |
| `garage.html` | 866 KB | 15,677 | garage · settings · skills · brief · quote |
| `profile.html` | 839 KB | 15,073 | profile · settings · skills · brief · quote |
| `news.html` | 837 KB | 15,043 | magazine · settings · skills · brief · quote |
| `chat.html` | 748 KB | 13,346 | login · gate · welcome · choices · symcats · symlist · thread · settings · work · skills · quote |
| `admin.html` | 114 KB | 1,727 | 12 แท็บ |
| `terms.html` | 82 KB | 700 | — |
| `privacy.html` | 80 KB | 677 | — |
| `help.html` | 77 KB | 621 | — |
| `about.html` | 76 KB | 582 | — |
| `plan.html` | 36 KB | 696 | สองช่วงล็อก |
| `handbook.html` | เปลือกเปล่า | — | หน้าที่คุณกำลังอ่าน |

รวม **13 หน้า · 27 หน้าย่อย · 32 คีย์ในเครื่อง · 54 เส้นทาง API · 73 ฟังก์ชันที่ใช้ร่วมกัน**

🔴 **ห้าหน้าหลักมีโค้ดชุดเดียวกันซ้ำอยู่ห้าชุด**

`index` `garage` `news` `profile` `spares` ทุกหน้ามีหน้าย่อย settings · skills · brief · quote
แท็บ cost · odo และแผ่นเลื่อน odoSheet เหมือนกันหมด ต่างกันแค่หน้าย่อยหลักหน้าเดียว

**แก้อะไรที่เป็นของร่วม ต้องแก้ทั้งห้าไฟล์** ลืมไฟล์เดียวคือผู้ใช้เจอพฤติกรรมไม่เหมือนกัน
แล้วแทบไม่มีใครรายงาน เพราะคนใช้ไม่รู้ว่าหน้าอื่นทำงานต่างออกไป

**วิธีตรวจว่าแก้ครบไหม**

```bash
cd /home/user/SpireONE-Beta
for f in index garage news profile spares; do
  printf '%-10s %s\n' $f "$(grep -c 'ข้อความที่เพิ่งแก้' $f.html)"
done
# ตัวเลขต้องเท่ากันทั้งห้าบรรทัด ถ้าไม่เท่าคือแก้ไม่ครบ
```

## 8.2 หลักการที่เลือกไว้ และสิ่งที่ต้องแลก

แต่ละไฟล์ HTML สมบูรณ์ในตัว — CSS และ JS อยู่ในไฟล์เดียวกัน ไม่มีไฟล์แยก ไม่มี bundler

| ได้อะไร | ต้องแลกกับอะไร |
|---------|----------------|
| เปิดไฟล์แล้วแก้ได้ทันที ไม่ต้องรอ build | ไฟล์ใหญ่มาก (`spares.html` แตะ 1 MB) |
| ไม่มี build ให้พัง ไม่มี node_modules | โค้ดซ้ำห้าชุด ต้องแก้หลายที่ |
| เปิดตรงจาก disk ก็ทำงาน | ต้องระวังชื่อตัวแปรชนกันระหว่าง script block |
| คนมารับช่วงต่อไม่ต้องเรียนเครื่องมือก่อน | ตัวแก้ไขบางตัวช้าเมื่อเปิดไฟล์ขนาดนี้ |

⚠️ **แต่ละ `<script>` เป็นคนละขอบเขต** — `const t` ในก้อนหนึ่งเรียกจากอีกก้อนไม่ได้
นี่คือเหตุผลที่มี `window.spireXxx` เต็มไปหมด มันคือสะพานเชื่อมระหว่างก้อน
เคยมีบั๊กที่ผมพยายามเรียก `api()` ของก้อน skills จากก้อน settings แล้วพัง
เพราะก้อน skills ห่อด้วย IIFE ตัวมันจึงไม่เป็นของกลาง

## 8.3 ฟังก์ชันร่วม 73 ตัว

ทุกตัวแขวนไว้ที่ `window` เพื่อให้ script block อื่นเรียกได้ แบ่งตามงาน

| กลุ่ม | ฟังก์ชัน | ทำอะไร |
|-------|---------|--------|
| **ภาษา** | `spireLang` `spireSetLang` `spireT` `spireOnLang` `spireLocales` `spireI18nHas` `spireI18nPaint` `spireI18nCoverage` | อ่าน/ตั้งภาษา · แปลข้อความ · แจ้งเตือนเมื่อเปลี่ยน |
| **ธีมและสี** | `spireTheme` `spireSetTheme` `spireThemes` `spireThemeName` `spireOnTheme` `spirePrimary` `spireSetPrimary` `spireApplyPrimary` `spirePrimaryPresets` `spireOnPrimary` | ธีมสว่าง/มืด · สีหลัก 9 สี · แจ้งเตือนเมื่อเปลี่ยน |
| **ตั้งค่าครั้งแรก** | `spireOpenSetup` `spireSetupRead` `spireSetupSave` `spireSetupDone` `spireSetupVersion` `spireApplySetup` `spireLevel` `spireSetLevel` `spireLevels` `spireOnLevel` | ขั้นตอนตั้งค่าแรกเข้า 8 ขั้น · ระดับความรู้เรื่องรถ |
| **หน้าตั้งค่า** | `spireOpenSettings` `spireCloseSettings` | เปิด/ปิดหน้าตั้งค่า |
| **บัญชี** | `spireAwaitUser` `spireFbReady` `spireResetAccount` `spireDangerHTML` `spireWireDanger` | รอสถานะล็อกอิน · โซนอันตราย |
| **ซิงก์คลาวด์** | `cloudSync` `cloudMark` `cloudPullNow` `cloudStatus` `spireSyncPush` | ส่ง/ดึงข้อมูลข้ามเครื่อง · ตรวจสถานะ |
| **โควตา** | `quotaHit` `quotaUpdate` | เตือนเมื่อใกล้หมด · ล็อกเมื่อหมด |
| **Skills** | `spireSkillsOpen` `spireSkillsClose` `spireSkillsPicker` `spireSkillsLocal` `spireSkillsAttached` `spireSkillsClear` `spireSkillsPreamble` `spireSkillsRefresh` | คำสั่งสำเร็จรูปที่ผู้ใช้เขียนเอง |
| **เลขไมล์** | `spireOdoState` `spireOdoFor` `spireOdoAnchor` `spireOdoRefresh` `spireOdoSheet` | บันทึกเลขไมล์ · จุดอ้างอิง · แผ่นเลื่อนกรอกเลข |
| **ที่จอดรถ** | `spireParkOpen` `spireParkClose` `spireParkGet` `spireParkCard` `spireParkGeo` `spireParkNav` `spireParkClear` `spireParkRefresh` `spireParkBestFix` | จำที่จอด · นำทางกลับ · เลือกพิกัดที่แม่นที่สุด |
| **ต่ออายุ** | `spireRenewChips` `spireRenewList` | ป้ายเตือนภาษี/พ.ร.บ./ประกัน |
| **อื่น ๆ** | `spireNextAction` `spireToolsMenu` `spireToolsClose` `spireHasFeature` `spireEnableNotif` `spireAwake` `spireCloseSideIfDrawer` | สิ่งที่ควรทำต่อ · เมนูเครื่องมือ · แจ้งเตือน |

💡 **ทำไมต้องมี `spireOnLang` / `spireOnTheme` / `spireOnPrimary`** — เป็นตัวรับแจ้งเตือน
เมื่อผู้ใช้เปลี่ยนภาษาในหน้าตั้งค่า ส่วนอื่นของหน้าต้องวาดใหม่ทันที
ถ้าไม่มีตัวนี้ ต้องรีเฟรชหน้าถึงจะเห็นผล ซึ่งจะทำให้เสียสิ่งที่พิมพ์ค้างไว้

## 8.4 คีย์ในเครื่องทั้ง 32 ตัว

ทุกตัวใช้คำนำหน้า `spire_` ยกเว้นที่ระบุไว้ ตัวช่วย `LS.get/set/del` เติมคำนำหน้าให้เอง

### ตัวตนและบัญชี

| คีย์ | เก็บอะไร | ซิงก์ข้ามเครื่อง |
|------|---------|------------------|
| `spire_cachedUser` | ข้อมูลผู้ใช้ที่แคชไว้ ให้หน้าขึ้นเร็วก่อน Firebase ตอบ | ไม่ |
| `spire_setup` | ผลการตั้งค่าครั้งแรก (ระดับ · ภาษา · ธีม · รถ · หน่วย) | ใช่ |
| `spire_auth_off` | จำว่าวิธีเข้าระบบไหนถูกปิดอยู่ ไม่ต้องให้ผู้ใช้ลองซ้ำ | ไม่ |

### หน้าตา

| คีย์ | เก็บอะไร | ซิงก์ |
|------|---------|-------|
| `spire_theme` | ธีม (light / dark) | ใช่ |
| `spire_chatTheme` | ธีมเฉพาะห้องแชต (midnight / aurora / sunset / pearl) | ใช่ |
| `spire_primary` | สีหลักที่เลือก | ใช่ |
| `spire_lang` | ภาษา | ใช่ |
| `spire_opacity` | ความโปร่งของพื้นหลัง | ไม่ |
| `spire_sideOpen` | แถบข้างกางอยู่หรือย่อ | ไม่ |
| `spire_widgetOrder` | ลำดับการ์ดบนหน้าหลัก | ใช่ |
| `spire_widgetToggles` | การ์ดไหนเปิด/ปิด | ใช่ |

### ข้อมูลรถ

| คีย์ | เก็บอะไร | ซิงก์ |
|------|---------|-------|
| `spire_garage` | รายการรถ (สำเนาในเครื่อง ตัวจริงอยู่ที่ D1) | ใช่ |
| `spire_selCar` | รถที่กำลังเลือกอยู่ | ใช่ |
| `spire_carlab_spec_*` | สเปกรถที่ค้นมาแล้ว แคชไว้ต่อคัน | ไม่ |

### บทสนทนา

| คีย์ | เก็บอะไร | ซิงก์ |
|------|---------|-------|
| `spire_chatSessions` | รายการบทสนทนา | ใช่ |
| `spire_sess_*` | เนื้อหาของแต่ละบทสนทนา | ใช่ |
| `spire_cursess_*` | บทสนทนาที่เปิดอยู่ต่อรถ | ใช่ |
| `spire_chatMsgs_*` | ข้อความ (รูปแบบเก่า) | — |
| `spire_sessmig_*` | ธงว่าย้ายรูปแบบเก่าแล้ว | ไม่ |
| `spire_chatStyle` | สไตล์การพูดของ AI | ใช่ |
| `spire_deckQ` | คิวคำถามที่รอส่ง | ไม่ |

### โควตาและความเห็น

| คีย์ | เก็บอะไร | ซิงก์ |
|------|---------|-------|
| `spire_quotaLock` | เวลาที่โควตาจะปลดล็อก | ไม่ |
| `spire_aiUsedToday` | ตัวนับเดิม (เลิกใช้แล้ว เหลือไว้ดูย้อนหลัง) | ไม่ |
| `spire_feedback` · `spire_fbQueue` | ความเห็นที่ยังส่งไม่สำเร็จ รอส่งใหม่ | ไม่ |
| `spire_plan_interest` | กดสนใจแพ็กเกจไหนไว้ | ไม่ |

### ตัวคุมการซิงก์

| คีย์ | เก็บอะไร |
|------|---------|
| `spire___meta` | เวลาที่แก้ล่าสุดของแต่ละคีย์ |
| `spire___synced` | คีย์ไหนขึ้นไปถึงเซิร์ฟเวอร์แล้ว พร้อมลายเซ็นของค่า |
| `spire___seen` | เคยเห็นค่าจากเซิร์ฟเวอร์รุ่นไหนแล้ว |
| `spire___pulled` | เวลาที่ดึงลงมาล่าสุด |

⚠️ **คีย์ที่ลงท้ายด้วย `_` คือคำนำหน้าของกลุ่ม** เช่น `spire_sess_` มีได้หลายร้อยคีย์
เวลาล้างข้อมูลต้องไล่ `Object.keys(localStorage)` แล้วกรองด้วยคำนำหน้า ไม่ใช่ลบทีละชื่อ

## 8.5 Cloud sync สามชั้น

**กติกา: คนเขียนทีหลังชนะ (last-writer-wins)** ตัดสินด้วยคอลัมน์ `t` ในตาราง `user_state`

```
เครื่อง A แก้ธีมตอน 10:00  →  PUT /api/state  {theme:{v:"dark", t:10:00}}
เครื่อง B แก้ธีมตอน 10:05  →  PUT /api/state  {theme:{v:"light", t:10:05}}
เครื่อง A เปิดใหม่ตอน 11:00 →  GET /api/state  ได้ light เพราะ t ใหม่กว่า
```

**การลองใหม่เมื่อส่งไม่สำเร็จ** — ถอยห่างขึ้นเรื่อย ๆ 15 วิ → 30 → 60 → 120 → สูงสุด 5 นาที
ผู้ใช้ไม่ต้องกดอะไร พอ deploy เสร็จมันจะไปเองในรอบถัดไป

**ตรวจสถานะ** — พิมพ์ใน console ของเบราว์เซอร์

```js
cloudStatus()
// { pulled, pushed, error, keys, user, url }
// user เป็น "NOT SIGNED IN" → ยังไม่ล็อกอิน ซิงก์ไม่ทำงานเป็นเรื่องปกติ
// error เป็น HTTP 404      → Worker ยังไม่ได้ deploy เวอร์ชันที่มี /api/state
```

💡 **บทเรียน** — ของเดิมกลืนข้อผิดพลาดทั้งหมด cloud sync จึงตายเงียบโดยไม่มีใครรู้
สาเหตุจริงคือ `window.auth` ไม่เคยมีอยู่จริง `cloudStatus()` ถูกเพิ่มมาเพื่อให้ตรวจได้

## 8.6 Service worker และเลขแคช

```js
const CACHE = 'cendon-v60';        // ต้องขยับทุกครั้งที่แก้ไฟล์หน้าเว็บ
const SHELL = ['./', './index.html', './garage.html', './news.html',
  './spares.html', './profile.html', './chat.html',
  './about.html', './help.html', './terms.html', './privacy.html',
  './plan.html'];
```

🔴 **แก้ไฟล์หน้าเว็บแล้วไม่ขยับเลขแคช = ผู้ใช้เดิมยังเห็นของเก่า**
และจะไม่มีใครรายงาน เพราะเครื่องคุณเห็นของใหม่อยู่แล้ว

**เพิ่มหน้าใหม่ต้องเพิ่มใน `SHELL` ด้วย** ไม่งั้นเปิด URL ตรงตอนออฟไลน์จะไม่ขึ้น

หน้าเว็บใช้ **network-first** เสมอ เพราะไฟล์เปลี่ยนบ่อย
แคชเป็นแค่ทางถอยตอนเน็ตหลุด ไม่ใช่แหล่งหลัก

## 8.7 การแก้ไฟล์ใหญ่อย่างปลอดภัย

🔴 **ห้ามแก้ด้วยตาเปล่า** ใช้สคริปต์ที่ยืนยันตำแหน่งก่อนแก้เสมอ

```python
def one(anchor):
    assert s.count(anchor) == 1, ("anchor เจอไม่ใช่หนึ่งครั้ง", s.count(anchor))
```

ถ้า anchor เจอมากกว่าหรือน้อยกว่าหนึ่งครั้ง ให้ล้มทันที **อย่าเดาว่าอันไหนถูก**
เคยมีกรณีที่ anchor ตรงกับสามจุดในไฟล์เดียว ถ้าไม่ assert จะแก้ผิดจุดโดยไม่รู้ตัว

⚠️ **กฎของเจ้าของโปรเจกต์: ห้ามให้การเปลี่ยนแปลงกระทบขนาด ความกว้าง ความยาวของ layout บนจอคอม**

---

# ภาค 9 — ทุกหน้าและทุกฟีเจอร์

## 9.1 แผนผังการเดินของผู้ใช้

```
เปิดเว็บครั้งแรก
   └── ตั้งค่าครั้งแรก 8 ขั้น (ระดับ → แพ็กเกจ → ภาษา → ธีม
        → โปรไฟล์ → หน่วย → รถ → แจ้งเตือน)
        └── index.html  ภาพรวม
             ├── garage.html   การาจ
             ├── news.html     นิตยสาร
             ├── spares.html   อะไหล่ · ร้านค้า
             ├── profile.html  โปรไฟล์
             ├── chat.html     ห้องแชต
             ├── plan.html     แพ็กเกจ
             └── admin.html    แผงควบคุม  (ยศผู้ควบคุมขึ้นไป)
                  └── handbook.html  คู่มือเล่มนี้  (ยศผู้ควบคุมขึ้นไป)
```

หน้าที่เปิดได้โดยไม่ต้องล็อกอิน: `about` `help` `terms` `privacy` `plan`

## 9.2 index.html — หน้าภาพรวม

หน้าแรกที่ผู้ใช้เห็น จัดเป็นการ์ดที่ **ลากสลับตำแหน่งได้และปิดได้**

| การ์ด | รหัส | เนื้อหา | ค่าเริ่มต้น |
|-------|------|--------|-------------|
| รถของฉัน | `w-cars` | รถในการาจ · เลือกคันที่ใช้อยู่ | เปิด |
| ทางลัด | `w-quick-actions` | ปุ่มลัดไปงานที่ทำบ่อย | เปิด |
| ผู้ช่วย AI (ด่วน) | `w-ai` | ถาม AI ได้จากหน้าแรกเลย | **ปิด** |
| ข่าวสารล่าสุด | `w-magazine` | บทความจากนิตยสาร | เปิด |
| ตั้งค่า | `w-settings` | ทางลัดเข้าตั้งค่า | เปิด |
| สมุดประวัติรถ | `w-brief` | สรุปประวัติรถคันที่เลือก | ตามข้อมูล |
| เลขไมล์ | `w-odo` | เลขไมล์ล่าสุดและแนวโน้ม | ตามข้อมูล |
| ต่ออายุ | `w-renew` | ภาษี · พ.ร.บ. · ประกัน ที่ใกล้หมด | ตามข้อมูล |
| ร้านค้า 3D | `w-shop` | ร้านและอู่ใกล้ตัว | ตามข้อมูล |

ลำดับเก็บใน `spire_widgetOrder` สถานะเปิด/ปิดเก็บใน `spire_widgetToggles` ทั้งคู่ซิงก์ข้ามเครื่อง

**หน้าย่อยที่ซ่อนอยู่ในไฟล์เดียวกัน** — `settings` `skills` `brief` `quote`
เปิดทับหน้าหลักโดยไม่เปลี่ยน URL จึงกดปุ่มย้อนกลับของเบราว์เซอร์แล้วไม่หลุดออกจากแอป

## 9.3 garage.html — การาจ

| ส่วน | ทำอะไร |
|------|--------|
| รายการรถ | เพิ่ม · แก้ · ลบ · เลือกคันที่ใช้อยู่ |
| แท็บ **ค่าใช้จ่าย** (`cost`) | รวมค่าใช้จ่ายต่อเดือน/ต่อปี · เชื้อเพลิง · ค่าบำรุงรักษา |
| แท็บ **เลขไมล์** (`odo`) | กราฟเลขไมล์ · จุดอ้างอิง · ประมาณการระยะทางต่อเดือน |
| แผ่นเลื่อนเลขไมล์ (`odoSheet`) | กรอกเลขไมล์ปัจจุบัน — เรียกจากหลายหน้า |
| รายการบำรุงรักษา | รอบถัดไปของแต่ละรายการ · กดว่าทำแล้ว |

ข้อมูลรถอยู่ที่ D1 ตาราง `cars` และมีสำเนาในเครื่องที่ `spire_garage`
รายการบำรุงรักษาอยู่ที่ `maint_item` · เลขไมล์อยู่ที่ `odo_state` และ `odo_anchor`

## 9.4 chat.html — ห้องแชต

ไฟล์ที่ซับซ้อนที่สุด มี **11 หน้าย่อย**

| หน้าย่อย | เมื่อไหร่ที่เห็น |
|---------|------------------|
| `login` | ยังไม่ได้เข้าสู่ระบบ |
| `gate` | เข้าแล้วแต่ยังไม่ได้เลือกรถ |
| `welcome` | หน้าเริ่มแชต ยังไม่ได้พิมพ์อะไร |
| `choices` | เลือกหัวข้อที่จะถาม |
| `symcats` | หมวดอาการผิดปกติ |
| `symlist` | รายการอาการในหมวดนั้น |
| `thread` | บทสนทนาที่กำลังคุยอยู่ |
| `settings` | หน้าตั้งค่า |
| `work` | โหมดทำงาน |
| `skills` | จัดการคำสั่งสำเร็จรูป |
| `quote` | อ่านใบเสนอราคา |

**แผ่นเลื่อน** — `sheetBg` (พื้นหลัง) · `sheetSet` (ตั้งค่าบนมือถือ) · `sheetHist` (ประวัติ) · `odoSheet`

### ความสามารถของห้องแชต

| ความสามารถ | เรียกอะไร |
|-----------|-----------|
| แชตแบบสตรีม | `POST /api/ai/stream` — เห็นตัวหนังสือไหลออกมา |
| แนบรูป/วิดีโอ | ส่งไปพร้อมคำถาม |
| โทรคุยด้วยเสียง/วิดีโอ | `POST /api/ai/live-token` → WebSocket ตรงไป Gemini Live |
| ฟังเสียงเครื่อง | `POST /api/listen` |
| อ่านใบเสนอราคา | `POST /api/quote` |
| Skills — พิมพ์ `/` | เลือกคำสั่งสำเร็จรูปที่เขียนไว้เอง |
| ค้นอินเทอร์เน็ต | อัตโนมัติเมื่อคำถามเข้าข่าย (ดูภาค 7) |
| แถบข้างพับได้ | จำสถานะไว้ที่ `spire_sideOpen` |

⚠️ **การโทรคุยสดใช้ WebSocket ตรงไปหา Gemini ไม่ผ่าน Worker**
โทเคนที่ได้จาก `/api/ai/live-token` เป็นโทเคนชั่วคราว หมดอายุเร็ว
ถ้าเปลี่ยนวิธีออกโทเคน ต้องแก้ทั้งฝั่ง Worker และฝั่งหน้าเว็บพร้อมกัน

## 9.5 news.html · spares.html · profile.html

| หน้า | หน้าย่อยหลัก | ทำอะไร |
|------|-------------|--------|
| `news.html` | `magazine` | บทความ · cron ดึงมาวันละครั้งเก็บที่ตาราง `magazine` |
| `spares.html` | `shop` | ค้นอะไหล่ (`/api/spares`) · ร้านและอู่ (`/api/shop`) · แคชที่ `spares_cache` |
| `profile.html` | `profile` | ข้อมูลส่วนตัว · ปุ่มเข้าหน้าตั้งค่า · โซนอันตราย |

ทั้งสามหน้ามีหน้าย่อย settings · skills · brief · quote เหมือนกับ index และ garage

💡 **`profile.html` เคยเป็นหน้าโปรไฟล์เต็ม แต่ซ้ำกับหน้าตั้งค่าทั้งหมด**
(ชื่อ อีเมล ภาษา ธีม ระดับ โซนอันตราย อยู่ครบทั้งสองที่)
ตอนนี้ปุ่มเดิมพาไปที่แท็บ "บัญชี" ของหน้าตั้งค่าแทน เหลือทางเดียวจะได้ไม่ต้องเดาว่าอยู่ไหน

## 9.6 หน้าตั้งค่า — เหมือนกันทุกที่ที่เข้า

เข้าได้จากทุกหน้าหลักและจากห้องแชต **หน้าตาและเนื้อหาต้องตรงกันทุกประการ**

| แท็บ | เนื้อหา |
|------|--------|
| ทั่วไป | ระดับความรู้เรื่องรถ · ภาษา 12 ภาษา · ธีม · สีหลัก 9 สี · การซิงก์ |
| แชตบอท *(เฉพาะในห้องแชต)* | สไตล์การพูด · ความยาวคำตอบ |
| บัญชี | ชื่อ · อีเมล · จำนวนรถ · ดาวน์โหลดข้อมูล · โซนอันตราย |
| โควตา | ยอดที่ใช้ไป · เวลาที่เติมใหม่ · ปุ่มดูแพ็กเกจ |
| ส่งความเห็น | เลือกหมวด (บั๊ก · อยากได้ · ใช้แล้วงง · ชอบมาก) แล้วพิมพ์ |
| เรียนรู้เพิ่มเติม | ลิงก์ไปหน้าช่วยเหลือ |

🔴 **แท็บ "แพ็กเกจ" ถูกย้ายออกไปเป็น `plan.html` แล้ว** อย่าเพิ่มกลับเข้ามา
ทางเข้าอยู่ที่เมนูบัญชีและปุ่มท้ายแท็บโควตา

⚠️ **หน้าตั้งค่าเคยไม่เหมือนกันระหว่างหน้าหลักกับห้องแชต** — CSS และรายการแท็บแยกกันไปคนละทาง
แก้แล้วโดยยกโครงจากห้องแชตมาใช้ทั้งสองที่ ถ้าจะแก้อีก **ต้องแก้ทั้งสองที่พร้อมกัน**

## 9.7 plan.html — หน้าแพ็กเกจ

หน้าเดียวที่แยกออกมาเป็นไฟล์ของตัวเอง เพราะเป็นหน้าขายของที่ควรมีที่ทางของมันเอง

- **เลื่อนแบบล็อกสองช่วง** — ช่วงบนคือแพ็กเกจครบในจอเดียว ช่วงล่างคือข้อมูลประกอบ
- ราคามาจาก `GET /api/quota` ถ้าเรียกไม่ได้จะใช้ค่าสำรองที่เขียนไว้ในไฟล์
- "คุ้มที่สุด" คำนวณจากโทเคนต่อบาทของข้อมูลจริง ไม่ได้ตั้งไว้ตายตัว
- ตัวเลขราคาใช้ฟอนต์ Kanit ไม่ใช่ Spire09 (Spire09 มีแต่อักษรละติน)
- ปุ่ม "สนใจแผนนี้" เป็นการลงชื่อความสนใจ **ยังไม่มีระบบเก็บเงิน** เก็บที่ `spire_plan_interest`

## 9.8 admin.html — แผงควบคุม

ต้องมียศ **ผู้ควบคุมขึ้นไป** · 12 แท็บ · เรียก API 28 เส้น

| แท็บ | ยศขั้นต่ำ | ทำอะไร |
|------|----------|--------|
| ภาพรวม | moderator | ตัวเลขรวมของระบบ |
| ผู้ใช้ & ยศ | admin | รายชื่อ · เปลี่ยนยศ · ระงับบัญชี · ตั้งเพดานโทเคน |
| รถ | moderator | รถทั้งระบบ |
| สอน AI | moderator | คลังความรู้ · เพิ่ม/แก้/ลบ/นำเข้าเป็นชุด |
| คำตอบใช้ซ้ำ | moderator | ดู · ลบ · ดูคะแนนโหวต |
| สมองเวกเตอร์ | admin | สถานะดัชนี · สร้างย้อนหลัง · ทดลองค้น |
| ความเห็น | moderator | ความเห็นจากผู้ใช้ |
| นิตยสาร | admin | จัดการบทความ |
| ร้านค้า | admin | จัดการร้าน |
| ตั้งค่าเว็บ | admin | ประกาศ · โหมดปิดปรับปรุง · เพดานโควตา |
| บันทึกการทำงาน | admin | ใครทำอะไรเมื่อไหร่ |
| สุขภาพระบบ | moderator | ตรวจการค้นเน็ต · binding · คีย์ |

แท็บที่ต้องยศ admin จะถูกใส่คลาส `locked` ให้ผู้ควบคุมกดไม่ได้
🔴 **แต่การกันจริงอยู่ที่ backend** การใส่ `locked` เป็นแค่การบอกผู้ใช้ให้เร็ว

## 9.9 handbook.html — คู่มือเล่มนี้

ต้องมียศ **ผู้ควบคุมขึ้นไป** เช่นเดียวกับแผงควบคุม

🔴 **ไฟล์ `handbook.html` ไม่มีเนื้อหาคู่มืออยู่ในตัวแม้แต่ตัวอักษรเดียว**

ไฟล์ HTML บนเว็บเปิดดูได้เสมอด้วย view-source ไม่ว่าจะซ่อน UI ยังไง
ถ้าเก็บเนื้อหาไว้ในไฟล์ ใครที่รู้ที่อยู่หน้าก็อ่านได้หมด
การเช็กยศด้วย JavaScript เป็นแค่การซ่อนปุ่ม ไม่ใช่การปกป้อง

**เนื้อหาอยู่ในฐานข้อมูล ตาราง `kb` แถวที่ `id` ขึ้นต้นด้วย `hb_`**
ดึงผ่าน `GET /api/kb` ซึ่งฝั่งเซิร์ฟเวอร์บังคับ `guarded('moderator')`
คนที่ยศไม่ถึงได้ 403 **ต่อให้แก้ JavaScript ในหน้านั้นยังไงก็ไม่ได้เนื้อหา**

🔴 **ทุกแถวต้องตั้ง `enabled = 0`**

ตัวค้นความรู้ของ AI กรอง `enabled = 1` เสมอ (บรรทัด 1350 และ 1364 ของ `worker.js`)
การตั้งเป็น 0 จึงทำให้คู่มือไม่มีทางหลุดไปอยู่ในคำตอบที่ผู้ใช้ทั่วไปได้รับ
**ถ้าเผลอตั้งเป็น 1 ผู้ใช้ทั่วไปจะได้ยินเรื่อง D1 และชื่อเซิร์ฟเวอร์จากปาก AI**
ซึ่งผิดกฎของเจ้าของโปรเจกต์โดยตรง

**วิธีนำเข้า/อัปเดตเนื้อหา**

เปิด `handbook.html` แล้วกดเลือกไฟล์ `HANDBOOK.md` — หน้านั้นแบ่งตอนและส่งให้เอง
ถ้ามีเนื้อหาเก่าอยู่แล้ว ตอนที่เกินจะถูกลบทิ้งให้ด้วย เนื้อหาเวอร์ชันก่อนจึงไม่ค้างต่อท้าย

🔴 **ห้ามใช้ `/api/kb/bulk` กับคู่มือ** — อ่านโค้ดแล้วพบว่ามันทำสามอย่างที่ใช้ไม่ได้

| ปัญหา | บรรทัดใน `worker.js` | ผลที่ตามมา |
|-------|---------------------|-----------|
| รับ `{items:[...]}` ไม่ใช่อาเรย์เปล่า ๆ | 4241 | ตอบ 400 ไม่มีอะไรเข้าเลย |
| สร้างรหัสใหม่เป็น `kb_*` เสมอ ไม่สนใจ `id` ที่ส่งไป | 4256 | หน้าคู่มือกรอง `hb_` ไม่เจอ |
| ฮาร์ดโค้ด `enabled = 1` | 4259 | **คู่มือหลุดไปอยู่ในคำตอบที่ AI ให้ผู้ใช้ทั่วไป** |

`POST /api/kb` ทีละตอนทำได้ครบ เพราะบรรทัด 4210 ใช้ `b.id` ที่ส่งไป
และบรรทัด 4222 รับ `enabled` — แต่ต้องส่งเป็น **`false` ที่เป็น boolean เท่านั้น**

```js
enabled: b.enabled === false ? 0 : 1     // โค้ดจริงบรรทัด 4222
```

⚠️ **ส่ง `0` จะกลายเป็นเปิดใช้งาน** เพราะ `0 !== false` เป็นกับดักที่มองไม่เห็น
จนกว่า AI จะพูดเรื่องฐานข้อมูลออกมาให้ผู้ใช้ฟัง

ถ้าจะยิงเองด้วย curl

```bash
# ทีละตอน — ห้ามใช้ bulk
for i in $(seq -w 0 16); do
  jq ".[] | select(.id==\"hb_$i\")" handbook-parts.json |
  curl -sS -X POST "$BASE/api/kb" -H "Authorization: Bearer $TOKEN" \
       -H "Content-Type: application/json" --data-binary @- ; done
```

**ตรวจว่าปลอดภัยจริงหลังนำเข้า**

```bash
wrangler d1 execute spireone --remote --command \
  "SELECT id, enabled FROM kb WHERE make = '__handbook__' AND enabled != 0"
# ต้องได้ผลลัพธ์ว่าง ถ้ามีแถวโผล่มา = คู่มือกำลังหลุดไปอยู่ในคำตอบของ AI
```

### ข้อตกลงรักษาความลับ (NDA)

ทุกคนต้องลงลายมือชื่อก่อนเห็นเนื้อหา แม้จะมียศครบแล้วก็ตาม

| ขั้นตอน | กติกา |
|---------|-------|
| อ่านข้อกำหนด | ต้องเลื่อนอ่านถึงท้ายจริง ๆ ปุ่มยอมรับถึงจะกดได้ |
| ติ๊กยอมรับ | เปิดใช้ได้หลังอ่านจบเท่านั้น |
| วาดลายมือชื่อ | ต้องมีเนื้อจริง — วัดความยาวเส้นรวม ≥ 140px กว้าง ≥ 45px และ ≥ 12 จุด |
| กดลงนาม | บันทึกแล้วเข้าเล่มได้ทันที ครั้งต่อไปไม่ต้องเซ็นซ้ำ |

💡 **ทำไมต้องบังคับเลื่อนอ่าน** — เอกสารที่กดยอมรับได้ทันทีคือเอกสารที่ไม่มีใครอ่าน
แล้วข้อกำหนดก็ไม่ได้ทำหน้าที่อะไรเลย เป็นแค่พิธีกรรม

💡 **ทำไมต้องวัดคุณภาพลายเซ็น** — ถ้าไม่วัด คนกดผ่านด้วยการแตะจอครั้งเดียวได้
แล้วลายมือชื่อที่เก็บไว้ก็ใช้เป็นหลักฐานอะไรไม่ได้

**สิ่งที่เก็บลงฐานข้อมูล** — ตาราง `kb` แถวรหัส `nda_<uid>` และ `enabled = 0` เหมือนคู่มือ

| ช่อง | เก็บอะไร |
|------|---------|
| `body` | ภาพลายมือชื่อ PNG แบบ data URL พื้นขาวหมึกดำ ตัดขอบว่างแล้ว |
| `keywords` | JSON: รุ่นข้อกำหนด · เวลา · อีเมล · ชื่อ · ยศตอนลงนาม · อุปกรณ์ |
| `make` | `__nda__` แยกจากคู่มือ (`__handbook__`) และความรู้จริง |

⚠️ **ภาพต้องเล็กกว่า 7,600 ตัวอักษร** เพราะเซิร์ฟเวอร์ตัด `body` ที่ 8,000
ตัวแปลงลองย่อลงทีละขั้น (460 → 380 → 300 → 240 กว้าง) จนกว่าจะพอดี
ถ้าปล่อยให้โดนตัด จะได้ไฟล์ภาพเสียที่เปิดไม่ขึ้น ซึ่งแย่กว่าไม่มีภาพเลย

**เปลี่ยนข้อกำหนดแล้วให้ทุกคนเซ็นใหม่** — แก้ `NDA_VERSION` ใน `handbook.html`
คนที่เซ็นรุ่นเก่าไว้จะถูกขอให้อ่านและเซ็นใหม่โดยอัตโนมัติ

**ดูว่าใครเซ็นแล้ว** — แผงควบคุม → ผู้ลงนาม NDA (ต้องยศผู้ดูแลขึ้นไป)
แสดงลายมือชื่อจริง เวลา อุปกรณ์ และเตือนถ้าพบแถวที่ `enabled` ไม่ใช่ 0

### ลายน้ำในเล่ม

ชื่อกับอีเมลของผู้อ่านถูกวางเป็นลายน้ำจาง ๆ ทั่วหน้าตลอดเวลาที่เปิดอ่าน
**ถ้าเอกสารหลุดออกไปเป็นภาพถ่ายจอหรือภาพแคป จะรู้ได้ว่าหลุดจากบัญชีไหน**
ข้อกำหนดข้อ 4 แจ้งผู้เซ็นไว้แล้วว่ามีสิ่งนี้ ไม่ได้แอบทำ

## 9.10 หน้าเนื้อหาคงที่

`about.html` `help.html` `terms.html` `privacy.html` — เปิดได้โดยไม่ต้องล็อกอิน
ทั้งสี่หน้าลิงก์ถึงกันครบ และลิงก์กลับไปทุกหน้าหลัก

## 9.11 ฟีเจอร์ที่กระจายอยู่หลายหน้า

| ฟีเจอร์ | อยู่ที่ไหนบ้าง | เก็บที่ไหน |
|---------|---------------|-----------|
| **ที่จอดรถ** | ทุกหน้าหลัก | ในเครื่อง + พิกัด GPS |
| **เลขไมล์** | ทุกหน้าหลัก (แผ่นเลื่อน `odoSheet`) | `odo_state` · `odo_anchor` |
| **ต่ออายุ** | การ์ดในหน้าแรก + การาจ | คำนวณจากข้อมูลรถ |
| **Skills** | ทุกหน้าหลัก + ห้องแชต | `skills` · `skill_stars` |
| **แจ้งเตือน** | ตั้งในหน้าตั้งค่า | `push_subs` · `push_jobs` |
| **OBD** | การาจ | `obd_device` |
| **LINE** | โปรไฟล์ | `line_code` · `line_link` |
| **สิ่งที่ควรทำต่อ** | หน้าแรก | คำนวณสด ไม่ได้เก็บ |

---

# ภาค 10 — การนำขึ้นระบบ

## 10.1 ลำดับที่ต้องทำ

**Backend ก่อนเสมอ** — frontend เรียก API ที่ต้องมีอยู่ก่อนแล้ว

```bash
cd /home/user/SpireONE-backend

# 1) ตรวจว่าไฟล์ไม่มี syntax error ก่อนอย่างอื่น
node --check src/worker.js

# 2) ตั้งความลับ (ทำครั้งเดียว หรือเมื่อคีย์เปลี่ยน)
wrangler secret put GEMINI_KEY
wrangler secret put OPENROUTER_API_KEY

# 3) ตั้งฐานข้อมูลครั้งแรกเท่านั้น — ดูข้อควรระวังในภาค 2.2
wrangler d1 migrations apply spireone --remote

# 4) สร้างดัชนีเวกเตอร์ครั้งแรกเท่านั้น — ดูภาค 3.2

# 5) deploy
wrangler deploy
```

จากนั้น frontend — เป็นไฟล์ static ล้วน วางที่ไหนที่เสิร์ฟ HTTPS ได้ก็ใช้ได้

```bash
cd /home/user/SpireONE-Beta
# 🔴 ขยับเลขแคชใน sw.js ก่อน ถ้าแก้ไฟล์หน้าเว็บ
git add -A && git commit -m "..." && git push
```

⚠️ **`BACKEND_URL` ฝังอยู่ในไฟล์ HTML ทุกหน้า** — ถ้าเปลี่ยน URL ของ Worker
ต้องไล่แก้ทั้ง 8 ไฟล์: `index` `chat` `garage` `news` `profile` `spares` `plan` `admin`

---

## 10.2 ตัวแปรและความลับทั้งหมด

### `vars` ใน `wrangler.jsonc` — เปิดเผยได้ อยู่ใน repo ได้

| Key | ค่าปัจจุบัน | ความหมาย |
|-----|-----------|----------|
| `FIREBASE_PROJECT_ID` | `sp1p-82396` | ใช้ตรวจ token |
| `OWNERS` | 2 อีเมล | เจ้าของระบบ ยศสูงสุด ลดไม่ได้ |
| `ALLOWED_ORIGINS` | `*` | 🔴 **ต้องตั้งเป็นโดเมนจริงก่อนขึ้น production** |
| `GEMINI_MODEL` | `gemini-3.6-flash` | โมเดลหลัก |
| `GEMINI_LIVE_MODEL` | `gemini-3.1-flash-live-preview` | โทรคุยเสียง/วิดีโอ |
| `GEMINI_BASE_URL` | Google API | — |
| `AI_DAILY_LIMIT` | `60` | เพดานคนล็อกอิน |
| `AI_ANON_DAILY_LIMIT` | `15` | เพดานต่อ IP สำหรับคนไม่ล็อกอิน |
| `CF_AI_FALLBACK_MODEL` | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | ทางถอยเมื่อ Gemini ล่ม |
| `OPENROUTER_MODEL` · `OPENROUTER_BASE_URL` | — | ทางสำรอง |
| `VEC_MIN_CACHE` | `0.88` | เกณฑ์คำตอบใช้ซ้ำ |
| `VEC_MIN_KB` | `0.45` | เกณฑ์ความรู้ |
| `VEC_MIN_MEMORY` | `0.40` | เกณฑ์ความจำ |

⚠️ **ตัวที่ประกาศไว้แต่โค้ดไม่ใช้แล้ว** — `CEREBRAS_MODEL` `CEREBRAS_BASE_URL`
`GROQ_MODEL` `GROQ_BASE_URL` เป็นของที่ค้างจากการทดลองเดิม ลบได้ปลอดภัย

### `secret` — ต้องใช้ `wrangler secret put` ห้าม commit

| Key | จำเป็นไหม | ไม่มีแล้วเป็นยังไง |
|-----|----------|-------------------|
| `GEMINI_KEY` | **จำเป็น** | AI ไม่ทำงาน ค้นเน็ตทางที่ 1 ใช้ไม่ได้ |
| `OPENROUTER_API_KEY` | แนะนำ | เสียทางสำรอง แต่ยังมี DuckDuckGo/Wikipedia |
| `VAPID_PUBLIC` · `VAPID_PRIVATE` · `VAPID_SUBJECT` | ถ้าใช้แจ้งเตือน | ส่ง push ไม่ได้ |
| `LINE_CHANNEL_SECRET` · `LINE_CHANNEL_TOKEN` · `LINE_OA_ID` | ถ้าใช้ LINE | ฟีเจอร์ LINE ไม่ทำงาน |
| `SITE_URL` | แนะนำ | ลิงก์ในแจ้งเตือนอาจไม่ถูก |

**ตัวเลือกเสริม** (ไม่ตั้งก็ใช้ค่าเริ่มต้น): `GEMINI_FALLBACK_MODEL` `GEMINI_SEARCH_MODEL`
`OPENROUTER_SEARCH_MODEL` `VEC_MODEL_OVERRIDE` `AI_TOKEN_DAILY_LIMIT` `AI_LIVE_CALL_TOKENS`

```bash
wrangler secret list          # ดูว่าตั้งอะไรไว้แล้วบ้าง (ไม่โชว์ค่า)
wrangler secret put ชื่อ       # ตั้งหรือเปลี่ยน
wrangler secret delete ชื่อ    # ลบ
```

---

## 10.3 งานตามเวลา (cron)

```jsonc
"triggers": { "crons": ["0 17 * * *"] }     // ทุกวัน 17:00 UTC = เที่ยงคืนไทย
```

```js
async scheduled(event, env, ctx) {
  ctx.waitUntil(ensureSchema(env));       // cron ทำงานได้แม้ไม่มีใครเปิดเว็บ ต้องตรวจตรงนี้ด้วย
  ctx.waitUntil(runDueJobs(env));         // งานที่นัดเวลาไว้ — ทำทุกรอบ
  if (event.cron !== '*/10 * * * *') {    // งานหนัก ทำเฉพาะรอบวันละครั้ง
    ctx.waitUntil(fetchAndSaveNews(env));
    ctx.waitUntil(runPushRound(env));
    ctx.waitUntil(runOdoRound(env));
  }
}
```

⚠️ **โค้ดรองรับ cron `*/10 * * * *` แต่ `wrangler.jsonc` ไม่ได้ตั้งไว้**
ถ้าอยากให้งานที่นัดเวลา (`runDueJobs`) ทำงานถี่กว่าวันละครั้ง ต้องเพิ่มเข้าไปใน `triggers.crons`

---

## 10.4 เช็กลิสต์ก่อนกด deploy

**Backend**
- [ ] `node --check src/worker.js` ผ่าน
- [ ] `wrangler secret list` มี `GEMINI_KEY`
- [ ] ดัชนี `cendon-brain` มีอยู่ พร้อม metadata index ครบ 4 ตัว
- [ ] `ALLOWED_ORIGINS` เป็นโดเมนจริง ไม่ใช่ `*`
- [ ] ตาราง `chat_logs` มีอยู่จริง *(ดูภาค 2.2)*
```bash
  wrangler d1 execute spireone --remote --command \
    "SELECT name FROM sqlite_master WHERE type='table' AND name='chat_logs'"
```

**Frontend**
- [ ] ขยับเลขแคชใน `sw.js` แล้ว ถ้าแก้ไฟล์หน้าเว็บ
- [ ] หน้าใหม่ (ถ้ามี) เพิ่มใน `SHELL` แล้ว
- [ ] `BACKEND_URL` ตรงกันทั้ง 8 ไฟล์

**หลัง deploy**
- [ ] admin → สุขภาพระบบ → ตรวจเดี๋ยวนี้ → ขึ้น "ค้นได้"
- [ ] admin → สมองเวกเตอร์ → ขึ้น "ครบแล้ว"
- [ ] เปิดหน้าแชต ถามหนึ่งคำถาม → ได้คำตอบ
- [ ] เปิด console พิมพ์ `cloudStatus()` → ไม่มี error

---
---

# ภาค 11 — ตรวจสอบและแก้ปัญหา

## 11.1 เครื่องมือตรวจในตัว

| เครื่องมือ | เข้าถึงยังไง | บอกอะไร |
|-----------|-------------|---------|
| ตรวจการค้นเน็ต | `GET /api/admin/diag?q=...` | แต่ละทางล้มเพราะอะไร ใช้เวลาเท่าไหร่ |
| สุขภาพระบบ | `GET /api/admin/health` | binding ครบไหม คีย์ตั้งไหม |
| สถานะเวกเตอร์ | `GET /api/admin/vectorize/status` | จำนวนเวกเตอร์เทียบกับแถวใน D1 |
| ทดลองค้น | `GET /api/admin/vectorize/probe?q=...` | คะแนนที่ได้จริง ใช้จูน `VEC_MIN_*` |
| สถานะ cloud sync | `cloudStatus()` ใน console | ซิงก์ล่าสุดสำเร็จไหม เพราะอะไร |
| Log ของ Worker | `wrangler tail` | log สด ๆ ระหว่างที่มีคนใช้จริง |

`observability` เปิดไว้ใน `wrangler.jsonc` แล้ว — log เก็บถาวรและดูย้อนหลังได้ใน dashboard

---

## 11.2 อาการที่เคยเจอจริงและวิธีแก้

| อาการ | สาเหตุที่แท้จริง | วิธีตรวจ |
|-------|-----------------|---------|
| AI ค้นเน็ตไม่ได้เลย | `cleanSearch()` ถูกเรียกแต่ไม่เคยถูกนิยาม | สคริปต์นับ นิยาม 0 / เรียก 1 |
| Worker ปฏิเสธ body | `JSON.stringify` ซ้อนสองชั้น | เปิดเซิร์ฟเวอร์จริงให้ปฏิเสธ |
| Cloud sync ตายเงียบ | `window.auth` ไม่เคยมีอยู่จริง | ทดสอบด้วย firebase ปลอมที่เดินผ่านโค้ดจริง |
| โลโก้ซ้อนสองอันตอนสตรีม | สร้าง element ซ้ำระหว่างสตรีม | นับ DOM ทุกเฟรมระหว่างสตรีม |
| การ์ดไม่ขยับตอนชี้เมาส์ | `animation-fill-mode:both` ค้างค่า transform ทับ `:hover` | วัด transform ก่อนและหลัง hover |
| ตัวหนังสือไทยเพี้ยน | ฟอนต์ละตินไม่ได้จำกัด `unicode-range` | ดูภาพหน้าจอ ตัวเลขทุกตัวผ่านหมด |
| AI ตอบด้วยความรู้ของรถคันอื่น | ลืมสร้าง metadata index ตัวกรองเลยไม่ทำงาน | `/api/admin/vectorize/probe` |
| บันทึกบทสนทนาหาย | ตาราง `chat_logs` ไม่มี แต่ error ถูกกลืน | เช็ก `sqlite_master` |

**สิ่งที่ทุกแถวมีเหมือนกัน: อ่านโค้ดแล้วมองไม่เห็นสักอัน**

---

## 11.3 วิธีทำงานที่พิสูจน์แล้วว่าได้ผล

> **วัด อย่าเดา** — บั๊กที่แพงที่สุดทุกตัวในโปรเจกต์นี้ มองไม่เห็นจากการอ่านโค้ด

🔴 **บทเรียนที่แพงที่สุด: สามครั้งที่ตัวทดสอบเอง *บัง* บั๊กที่กำลังตามหา**

ตัวอย่าง: เขียน stub `window.auth` ไว้ในเทสต์เอง เลยไม่เห็นว่าของจริงไม่มี
เทสต์ผ่านสวยงามในขณะที่ผู้ใช้จริงใช้ไม่ได้เลย

→ **ทดสอบต้องเดินผ่านโค้ดจริง ไม่ใช่เดินผ่านของปลอมที่เราวางไว้เอง**

**ข้อควรระวังอีกข้อ: ตัววัดที่หลวมเกินไปก็โกหกได้**

เคยเขียนเทสต์ว่า "ภาพต่างกันไหม" ซึ่งต่างกันหนึ่งพิกเซลก็ผ่าน
ทั้งที่ตาคนมองไม่เห็นอะไรเลย ต้องเปลี่ยนเป็นวัด **ความต่างเฉลี่ยต่อพิกเซล**
พร้อมกำหนดทั้งเพดานล่างและเพดานบน ถึงจะสะท้อนสิ่งที่ตาเห็นจริง

**เครื่องมือที่มีในเครื่อง**

```bash
node <scratchpad>/scan.mjs        # ฟังก์ชันที่ถูกเรียกแต่ไม่มีตัวตน
node <scratchpad>/t-logo.mjs      # สตรีม + โลโก้ · มือถือ 390 + คอม 1440
node <scratchpad>/t-vecui.mjs     # หน้าแอดมิน สมองเวกเตอร์
node <scratchpad>/t-signup.mjs    # สมัครสมาชิก 4 สถานการณ์
node <scratchpad>/t-vec.mjs       # ชั้นเวกเตอร์ + sqlite จริง
node <scratchpad>/t-search.mjs    # ชั้นค้นเน็ต 4 ทาง
node <scratchpad>/t-water.mjs     # หน้าแพ็กเกจ 4 สถานการณ์
node <scratchpad>/t-theme2.mjs    # ธีมและสีหลัก
```

**สภาพแวดล้อมทดสอบ**

- Playwright: `/opt/node22/lib/node_modules/playwright/index.js`
- Chromium: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
- ต้องเสิร์ฟผ่าน **https** (ใบรับรอง self-signed อยู่ใน scratchpad)
  เพราะ `route.continue({url})` เปลี่ยนปลายทางข้ามโปรโตคอลไม่ได้

⚠️ **ภาพหน้าจอจับสิ่งที่ตัวเลขจับไม่ได้** — มีสองครั้งที่การวัดผ่านหมดทุกข้อ
แต่พอดูภาพจริงแล้วพัง (ป้ายทับกัน · ตัวหนังสือไทยเพี้ยน)
การดูภาพจึงเป็นส่วนหนึ่งของการทดสอบ ไม่ใช่ของแถม

---
---

# ภาค 12 — สิ่งที่ยังค้างและความเสี่ยงที่รู้อยู่

## 12.1 ต้องแก้ก่อนขึ้น production

### 🔴 1. `ALLOWED_ORIGINS` ยังเป็น `*`

เว็บไหนก็เรียก API นี้ได้ ต้องตั้งเป็นโดเมนจริงก่อนเปิดใช้จริง
**ติดอยู่ที่: ยังไม่ทราบโดเมนจริงที่จะใช้**

### 🔴 2. `chat_logs` ไม่อยู่ใน `SCHEMA_SQL`

ฐานข้อมูลใหม่ที่ตั้งโดยไม่รัน migration จะไม่มีตารางนี้
บันทึกบทสนทนาหายเงียบเพราะ error ถูกกลืนใน `try/catch`
**ทางแก้: ย้าย `CREATE TABLE chat_logs` เข้า `SCHEMA_SQL` แล้วบวก `SCHEMA_VERSION` เป็น 15**
*(อยู่ในเขต `src/worker.js` ของ Grok — รายงานไว้ ไม่ได้แก้เอง)*

### 🔴 3. `e.message` หลุดออกไปหาผู้เรียก

```js
catch (e) { return deny(e.message || 'Server error', 500); }
```

ข้อความ error ภายในอาจเปิดเผยโครงสร้างระบบ
**ทางแก้: log ไว้ฝั่งเซิร์ฟเวอร์ ส่งกลับแค่ข้อความกลาง ๆ**
*(อยู่ในเขตของ Grok — รายงานไว้)*

### 🔴 4. สมัครสมาชิกด้วยอีเมลยังไม่เปิดใช้งาน

อาการ: กดสร้างบัญชีแล้วขึ้น "วิธีนี้ยังไม่ได้เปิดใช้งานในระบบ"
(`auth/operation-not-allowed`) เกิดกับทุกวิธีที่ไม่ใช่ Continue with Google

**นี่ไม่ใช่บั๊กในโค้ด และแก้จากฝั่งโค้ดไม่ได้**
**ทางแก้: Firebase Console → Authentication → Sign-in method → เปิด Email/Password**

### ⚠️ 5. auth สองชุดคู่ขนานใน `index.html`

- บรรทัด ~5450 — `signInWithPopup` + `toast`
- บรรทัด ~6119 — `emailSubmit` + `authMsg`

กดคนละปุ่มได้คนละพฤติกรรม และข้อความผิดพลาดไม่เหมือนกัน
**ทางแก้: รวมเป็นชุดเดียว**

---

## 12.2 ของที่ค้างอยู่แต่ไม่เร่งด่วน

| เรื่อง | รายละเอียด |
|-------|-----------|
| `part_prices` · `part_price_runs` | อยู่ใน `migrations/` แต่โค้ดไม่ใช้แล้ว ลบได้ |
| `CEREBRAS_*` · `GROQ_*` ใน vars | ค้างจากการทดลองเดิม โค้ดไม่ใช้แล้ว |
| ตาราง `usage` | ถูกแทนที่ด้วย `usage_win` แล้ว เก็บไว้ดูสถิติ |
| `chat_logs` โตไม่จำกัด | ควรมีแผนตัดของเก่าทิ้งก่อนชนเพดาน D1 |
| cron `*/10` | โค้ดรองรับแต่ยังไม่ได้ตั้งใน `wrangler.jsonc` |
| `BACKEND_URL` ฝังใน 8 ไฟล์ | เปลี่ยน URL ต้องไล่แก้ทุกไฟล์ |
| `git push` ตอบ 403 | Claude GitHub App ยังไม่มีสิทธิ์เขียน — ต้องให้เจ้าของ org เปิด **Contents: Read and write** |

---

## ภาคผนวก — คำสั่งที่ใช้บ่อย

```bash
# ── Backend ────────────────────────────────────────────────
cd /home/user/SpireONE-backend
node --check src/worker.js                    # ตรวจ syntax ก่อนเสมอ
wrangler deploy                               # ขึ้นระบบ
wrangler tail                                 # ดู log สด
wrangler secret list                          # ความลับที่ตั้งไว้

# ── D1 ─────────────────────────────────────────────────────
wrangler d1 list
wrangler d1 execute spireone --remote --command "SELECT COUNT(*) FROM users"
wrangler d1 execute spireone --remote --file=./patch.sql
wrangler d1 export  spireone --remote --output=backup-$(date +%F).sql
wrangler d1 migrations apply spireone --remote

# ── Vectorize ──────────────────────────────────────────────
wrangler vectorize list
wrangler vectorize get cendon-brain

# ── ตรวจระบบผ่าน API ───────────────────────────────────────
BASE="https://spireonebackend.carspirethailand.workers.dev"
curl -s "$BASE/api/config"                                        # ไม่ต้องล็อกอิน
curl -s "$BASE/api/admin/health"          -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/api/admin/diag?q=ราคาน้ำมัน" -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/api/admin/vectorize/status" -H "Authorization: Bearer $TOKEN"
```

---

## เอกสารอื่นในโปรเจกต์

| ไฟล์ | เนื้อหา |
|------|--------|
| `CLAUDE.md` | กฎของเจ้าของโปรเจกต์ · การแบ่งงานในทีม AI |
| `AI-TEAM.md` | ธรรมนูญทีม · ตารางสิทธิ์การแก้ไฟล์ |
| `GEMINI.md` · `GROK.md` | คำสั่งเฉพาะของ AI แต่ละตัว |
| `DEPLOY.md` | คู่มือ deploy ฉบับสั้น (เล่มนี้ครอบคลุมแทนแล้ว) |
| `SETUP-MILEAGE.md` | การตั้งระบบเลขไมล์ |
| `API_DOCUMENTATION.md` *(backend)* | เอกสาร API ฉบับเดิม |

---

*จบเล่ม — เอกสารนี้เขียนจากโค้ดจริง ณ `SCHEMA_VERSION = 14` · `sw.js` v59*
*ถ้าพบว่าเนื้อหาไม่ตรงกับโค้ด ให้เชื่อโค้ดแล้วมาแก้เอกสาร*
