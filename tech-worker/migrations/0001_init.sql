-- ระบบช่าง Cendon Care — ฐานข้อมูลแยกจากระบบหลัก
-- แยกเพราะงานช่างมีข้อมูลส่วนตัว (เบอร์ ที่อยู่ลูกค้า) ที่ระบบหลักไม่จำเป็นต้องเห็น
-- ของที่ไม่ได้อยู่ด้วยกัน รั่วไปด้วยกันไม่ได้

-- ใบสมัคร 1 บัญชี = 1 ใบ แก้แล้วส่งใหม่ได้ (revision กันผู้ดูแลสองคนตรวจทับกัน)
CREATE TABLE IF NOT EXISTS applications (
  uid        TEXT PRIMARY KEY,
  email      TEXT,
  data       TEXT NOT NULL,            -- JSON ของทุกช่องในฟอร์ม
  status     TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  test       INTEGER NOT NULL DEFAULT 0,
  review     TEXT,                     -- JSON {by, note, checks, at}
  revision   INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- ช่างที่ผ่านการตรวจแล้วเท่านั้น
-- คะแนนเก็บเป็นผลรวม ไม่ใช่ค่าเฉลี่ย เพื่อบวกรีวิวใหม่ได้โดยไม่ต้องนับใหม่ทั้งหมด
CREATE TABLE IF NOT EXISTS techs (
  id           TEXT PRIMARY KEY,
  uid          TEXT NOT NULL UNIQUE,   -- บัญชีเจ้าของ ใช้ตัดสินว่าใครรับงานแทนช่างคนนี้ได้
  phone        TEXT,                   -- ไม่ส่งออกในรายชื่อสาธารณะ
  data         TEXT NOT NULL,          -- JSON โปรไฟล์ที่แสดงได้
  verified     INTEGER NOT NULL DEFAULT 0,
  test         INTEGER NOT NULL DEFAULT 0,
  suspended    INTEGER NOT NULL DEFAULT 0,
  jobs         INTEGER NOT NULL DEFAULT 0,
  rating_sum   INTEGER NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id             TEXT PRIMARY KEY,     -- ฝั่งหน้าเว็บสร้าง ใช้กันกดส่งซ้ำแล้วได้สองใบ
  tech_id        TEXT NOT NULL,
  customer_uid   TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'requested',
  test           INTEGER NOT NULL DEFAULT 0,
  car            TEXT NOT NULL,
  symptom        TEXT NOT NULL,
  area           TEXT NOT NULL,
  address        TEXT NOT NULL,
  phone          TEXT NOT NULL,
  requested_time TEXT NOT NULL,
  mode           TEXT NOT NULL,
  quote          TEXT,                 -- JSON
  completion     TEXT,
  dispute        TEXT,
  resolution     TEXT,
  review         TEXT,                 -- JSON {rating, text, at}
  history        TEXT NOT NULL,        -- JSON [{status, at, by}]
  accepted_at    INTEGER,
  revision       INTEGER NOT NULL DEFAULT 1,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS jobs_customer ON jobs(customer_uid, updated_at);
CREATE INDEX IF NOT EXISTS jobs_tech     ON jobs(tech_id, updated_at);

-- ข้อความแยกตาราง เพราะแชตถูกดึงบ่อยกว่าใบงานมาก
-- ดึงเฉพาะข้อความที่ใหม่กว่าที่เห็นแล้ว ไม่ต้องลากใบงานทั้งใบมาทุกสามวินาที
CREATE TABLE IF NOT EXISTS messages (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id  TEXT NOT NULL,
  uid     TEXT NOT NULL,
  role    TEXT NOT NULL,               -- customer | technician
  text    TEXT NOT NULL,
  at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_job ON messages(job_id, id);

-- เวลาที่แต่ละคนเปิดอ่านใบงานล่าสุด ใช้นับข้อความที่ยังไม่อ่าน
CREATE TABLE IF NOT EXISTS reads (
  job_id TEXT NOT NULL,
  uid    TEXT NOT NULL,
  last   INTEGER NOT NULL DEFAULT 0,   -- id ข้อความล่าสุดที่เห็น
  PRIMARY KEY (job_id, uid)
);
