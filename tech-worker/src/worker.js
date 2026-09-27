/*
 * Cendon Care — เซิร์ฟเวอร์ระบบช่าง (spireone-techs)
 *
 * ทำไมแยกออกมาจาก spireonebackend
 *   ใบงานช่างเก็บเบอร์โทรกับที่อยู่บ้านของลูกค้า ระบบหลักไม่จำเป็นต้องเห็นของพวกนี้
 *   แยกฐานข้อมูลไว้ ถ้าวันหนึ่งฝั่งไหนรั่ว อีกฝั่งยังอยู่ครบ
 *   และแก้ระบบช่างได้โดยไม่ต้องแตะโค้ดของระบบหลักเลย
 *
 * หลักที่ใช้ทั้งไฟล์
 *   - ทุกกฎตรวจที่นี่ซ้ำ ถึงหน้าเว็บจะตรวจแล้วก็ตาม — การตรวจในเบราว์เซอร์คือความสะดวก ไม่ใช่ความปลอดภัย
 *   - ใบงานเปลี่ยนสถานะได้ตามเส้นทางที่กำหนดเท่านั้น ข้ามขั้นไม่ได้
 *   - เบอร์กับที่อยู่ลูกค้าเปิดให้ช่างเห็นหลังลูกค้ายืนยันราคาแล้วเท่านั้น
 */
import * as jose from 'jose';

const JWKS = jose.createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

const CATS = ['body', 'ev', 'tyre', 'air', 'eng'];
const CAT_TH = { body: 'ตัวถัง & สี', ev: 'ไฟฟ้า & EV', tyre: 'ยาง & ช่วงล่าง', air: 'แอร์รถยนต์', eng: 'เครื่องยนต์' };
const CHECKS = ['identity', 'phone', 'portfolio', 'skills', 'equipment', 'terms'];
const PHONE = /^0\d{8,9}$/;
const now = () => Date.now();

/* ── ตอบกลับ ── */
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fail = (status, msg) => { throw new HttpError(status, msg); };

function cors(env, request) {
  const allowed = (env.ALLOWED_ORIGINS || '*').trim();
  let origin = '*';
  if (allowed !== '*') {
    const list = allowed.split(',').map(s => s.trim());
    const o = request.headers.get('Origin') || '';
    origin = list.includes(o) ? o : list[0];
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
const json = (data, status, headers) => new Response(JSON.stringify(data), {
  status: status || 200,
  headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

/* ── ตัวตน ── */
function owners(env) {
  return (env.OWNERS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
}
async function who(request, env, required = true) {
  const h = request.headers.get('Authorization') || '';
  if (!h.startsWith('Bearer ')) return required ? fail(401, 'กรุณาเข้าสู่ระบบ') : null;
  const token = h.slice(7);
  let uid, email;
  /* ทางลัดสำหรับรันทดสอบในเครื่องเท่านั้น — เปิดได้ด้วยตัวแปร DEV_AUTH ซึ่งไม่มีใน wrangler.jsonc
     บนเซิร์ฟเวอร์จริงทางนี้จึงไม่มีอยู่ ใครส่ง dev: มาก็ถูกปฏิเสธเหมือนโทเคนปลอมทั่วไป */
  if (env.DEV_AUTH === '1' && token.startsWith('dev:')) {
    [, uid, email] = token.split(':');
  } else {
    try {
      const { payload } = await jose.jwtVerify(token, JWKS, {
        issuer: 'https://securetoken.google.com/' + env.FIREBASE_PROJECT_ID,
        audience: env.FIREBASE_PROJECT_ID, clockTolerance: 120,
      });
      uid = payload.sub; email = payload.email || '';
    } catch (e) { return fail(401, 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'); }
  }
  if (!uid) return fail(401, 'กรุณาเข้าสู่ระบบ');
  email = String(email || '').toLowerCase();
  return { uid, email, admin: owners(env).includes(email) };
}
const adminOnly = me => { if (!me.admin) fail(403, 'เฉพาะผู้ดูแล'); };

/* ── ตรวจค่า ──
   คืนข้อความภาษาไทยที่บอกว่าช่องไหนผิด เพราะข้อความนี้ขึ้นให้ผู้ใช้เห็นตรง ๆ */
const str = (v, label, min, max) => {
  const s = String(v ?? '').trim();
  if (s.length < min) fail(400, `${label}: ต้องมีอย่างน้อย ${min} ตัวอักษร`);
  if (s.length > max) fail(400, `${label}: ยาวเกิน ${max} ตัวอักษร`);
  return s;
};
const num = (v, label, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) fail(400, `${label}: ต้องอยู่ระหว่าง ${min}–${max}`);
  return n;
};
const phone = (v, label) => {
  const p = String(v ?? '').replace(/[\s-]/g, '');
  if (!PHONE.test(p)) fail(400, `${label}: เบอร์ต้องขึ้นต้นด้วย 0 และมี 9–10 หลัก`);
  return p;
};
const parse = s => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

/* ── ซ่อนช่องทางติดต่อก่อนยืนยันงาน ──
   ไม่ได้หวังว่าจะกันคนตั้งใจได้ — คนตั้งใจเว้นวรรคหรือเขียนเลขไทยก็หลุดแล้ว
   แค่กันไม่ให้หลุดโดยไม่ตั้งใจ ก่อนที่ลูกค้าจะได้เห็นราคาและยืนยันงาน
   หลังยืนยันงานแล้วไม่ซ่อนอะไรเลย เพราะตอนนั้นต้องโทรนัดกันจริง */
function mask(text) {
  return text
    .replace(/(\+?66|0)[\s.-]?\d(?:[\s.-]?\d){7,8}/g, '[ซ่อนเบอร์ไว้จนกว่าจะยืนยันงาน]')
    .replace(/(line|ไลน์)\s*(id)?\s*[:：]?\s*@?[a-z0-9._-]{3,}/gi, '[ซ่อนไลน์ไว้จนกว่าจะยืนยันงาน]');
}

async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

/* ── ช่าง ── */
function publicTech(r) {
  const d = parse(r.data) || {};
  return {
    id: r.id, name: d.name, shop: d.shop || '', area: d.area || '',
    lat: d.lat ?? null, lng: d.lng ?? null,
    cats: d.cats || [], skills: (d.cats || []).map(c => CAT_TH[c]).filter(Boolean),
    about: d.about || '', years: d.years || 0, from: d.from || 0, to: 0,
    warranty: d.warranty || 0, radius: d.radius || 0,
    mobile: !!d.mobile, urgent: !!d.urgent, brands: [],
    /* ช่างที่ยังไม่มีรีวิวต้องได้ 0 ไม่ใช่ 5 — คะแนนเต็มที่ไม่มีใครให้ คือคะแนนปลอม */
    rating: r.review_count ? Math.round(r.rating_sum / r.review_count * 10) / 10 : 0,
    reviewCount: r.review_count, jobs: r.jobs,
    reply: null, verified: !!r.verified, test: !!r.test,
  };
}
async function techById(env, id) {
  return env.DB.prepare('SELECT * FROM techs WHERE id = ?').bind(id).first();
}

async function listTechs(env, me, url) {
  if (url.searchParams.get('test') === '1') {
    adminOnly(me);
    const { results } = await env.DB.prepare(
      'SELECT * FROM techs WHERE test = 1 AND suspended = 0 ORDER BY created_at DESC').all();
    return { techs: results.map(publicTech) };
  }
  const { results } = await env.DB.prepare(
    'SELECT * FROM techs WHERE test = 0 AND suspended = 0 AND verified = 1 ORDER BY created_at DESC LIMIT 500').all();
  return { techs: results.map(publicTech) };
}

function appOut(a) {
  if (!a) return null;
  const d = parse(a.data) || {};
  return { ...d, uid: a.uid, email: a.email, status: a.status, test: !!a.test,
    review: parse(a.review), revision: a.revision, createdAt: a.created_at };
}

async function meInfo(env, me) {
  const [a, t] = await Promise.all([
    env.DB.prepare('SELECT * FROM applications WHERE uid = ?').bind(me.uid).first(),
    env.DB.prepare('SELECT * FROM techs WHERE uid = ?').bind(me.uid).first(),
  ]);
  /* งานที่รอเราทำอะไรสักอย่าง + ข้อความที่ยังไม่ได้อ่าน
     ใช้ขึ้นตัวเลขบนปุ่ม "งานของฉัน" ช่างจะได้ไม่พลาดคำขอราคา
     เพราะเรายังไม่มีการแจ้งเตือนทาง SMS */
  const jobs = await myJobs(env, me, t);
  const attention = jobs.filter(j => j.needsMe || j.unread > 0).length;
  return {
    uid: me.uid, email: me.email, admin: me.admin,
    application: appOut(a),
    technician: t ? { ...publicTech(t), suspended: !!t.suspended } : null,
    attention,
  };
}

async function apply(env, me, b) {
  const t = now();
  if (b.test) {
    /* ทางผู้ดูแล — ข้ามเกณฑ์ทั้งหมดตามที่ตั้งใจ ใช้ทดสอบขั้นตอนรับงานด้วยบัญชีเดียว
       ช่างทดสอบไม่เคยโผล่ในรายชื่อสาธารณะ และรีวิวของเขาไม่ถูกนับ */
    adminOnly(me);
    const d = {
      name: str(b.name, 'ชื่อ', 2, 100), shop: String(b.shop || '').trim().slice(0, 120),
      phone: b.phone ? phone(b.phone, 'เบอร์โทร') : '',
      area: 'พื้นที่ทดสอบ', cats: CATS.slice(), mobile: !!b.mobile, urgent: false,
      about: 'บัญชีทดสอบของผู้ดูแล ใช้ทดลองขั้นตอนขอราคา รับงาน และคุยกับลูกค้า',
      years: 0, from: 0, warranty: 7, radius: 0,
    };
    const id = 't_' + (await sha(me.uid)).slice(0, 16);
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO applications (uid,email,data,status,test,review,revision,created_at,updated_at)
        VALUES (?,?,?,'approved',1,NULL,1,?,?)
        ON CONFLICT(uid) DO UPDATE SET data=excluded.data,status='approved',test=1,revision=revision+1,updated_at=excluded.updated_at`)
        .bind(me.uid, me.email, JSON.stringify(d), t, t),
      env.DB.prepare(`INSERT INTO techs (id,uid,phone,data,verified,test,suspended,created_at,updated_at)
        VALUES (?,?,?,?,0,1,0,?,?)
        ON CONFLICT(uid) DO UPDATE SET data=excluded.data,phone=excluded.phone,test=1,suspended=0,updated_at=excluded.updated_at`)
        .bind(id, me.uid, d.phone, JSON.stringify(d), t, t),
    ]);
    return { ok: true };
  }

  const existing = await env.DB.prepare('SELECT status FROM applications WHERE uid = ?').bind(me.uid).first();
  if (existing && existing.status === 'pending') fail(409, 'ใบสมัครของคุณอยู่ระหว่างตรวจ รอผลก่อนส่งใหม่');
  if (existing && existing.status === 'approved') fail(409, 'บัญชีนี้เป็นช่างในระบบแล้ว');

  const cats = [...new Set((Array.isArray(b.cats) ? b.cats : []).filter(c => CATS.includes(c)))];
  if (!cats.length) fail(400, 'เลือกหมวดงานที่รับอย่างน้อย 1 หมวด');
  const portfolio = (Array.isArray(b.portfolio) ? b.portfolio : []).map(u => String(u || '').trim()).filter(Boolean);
  if (portfolio.length < 3) fail(400, 'ต้องมีลิงก์ผลงานจริง 3 ลิงก์');
  portfolio.forEach((u, i) => { if (!/^https:\/\/\S{4,490}$/.test(u)) fail(400, `ลิงก์ผลงาน ${i + 1}: ต้องขึ้นต้นด้วย https://`); });
  if (b.consent !== true) fail(400, 'ต้องยืนยันเงื่อนไขก่อนส่งใบสมัคร');

  const d = {
    name: str(b.name, 'ชื่อผู้รับงาน', 2, 100), shop: String(b.shop || '').trim().slice(0, 120),
    phone: phone(b.phone, 'เบอร์โทร'), area: str(b.area, 'พื้นที่', 4, 160),
    age: num(b.age, 'อายุ', 18, 100), years: num(b.years, 'ประสบการณ์', 1, 80),
    experience: str(b.experience, 'ประสบการณ์ / บุคคลอ้างอิง', 10, 2000),
    about: str(b.about, 'ความถนัด', 40, 2000),
    from: num(b.from, 'ราคาเริ่มต้น', 1, 1000000), warranty: num(b.warranty, 'รับประกัน', 7, 365),
    radius: num(b.radius, 'รัศมีบริการ', 0, 200),
    cats, mobile: !!b.mobile, urgent: !!b.urgent, portfolio: portfolio.slice(0, 3),
    consentAt: t,
  };
  await env.DB.prepare(`INSERT INTO applications (uid,email,data,status,test,review,revision,created_at,updated_at)
    VALUES (?,?,?,'pending',0,NULL,1,?,?)
    ON CONFLICT(uid) DO UPDATE SET data=excluded.data,status='pending',test=0,revision=revision+1,updated_at=excluded.updated_at`)
    .bind(me.uid, me.email, JSON.stringify(d), t, t).run();
  return { ok: true };
}

async function pendingApps(env, me) {
  adminOnly(me);
  const { results } = await env.DB.prepare(
    "SELECT * FROM applications WHERE status = 'pending' ORDER BY created_at ASC").all();
  return { applications: results.map(appOut) };
}

/* ── ด่านคัดเลือกช่าง ──
   อนุมัติได้ก็ต่อเมื่อผู้ดูแลติ๊กครบทุกข้อ ไม่มีทางลัด
   บันทึกว่าใครตรวจ ตรวจอะไร เมื่อไร — ถ้ามีปัญหาทีหลังจะย้อนดูได้ว่าพลาดที่ด่านไหน */
async function review(env, me, b) {
  adminOnly(me);
  const a = await env.DB.prepare('SELECT * FROM applications WHERE uid = ?').bind(String(b.uid || '')).first();
  if (!a) fail(404, 'ไม่พบใบสมัคร');
  if (a.status !== 'pending') fail(409, 'ใบสมัครนี้ถูกตรวจไปแล้ว');
  if (Number(b.revision) !== a.revision) fail(409, 'ผู้สมัครเพิ่งแก้ใบสมัคร กรุณาโหลดใหม่ก่อนตรวจ');
  const checks = Object.fromEntries(CHECKS.map(k => [k, !!(b.checks && b.checks[k])]));
  const note = str(b.note, 'บันทึกการตรวจ', 10, 2000);
  const decision = b.decision === 'approve' ? 'approve' : 'reject';
  if (decision === 'approve' && !CHECKS.every(k => checks[k])) fail(400, 'อนุมัติได้เมื่อตรวจครบทุกข้อเท่านั้น');
  const t = now();
  const rv = JSON.stringify({ by: me.email, note, checks, decision, at: t });
  const stmts = [env.DB.prepare('UPDATE applications SET status=?, review=?, updated_at=? WHERE uid=?')
    .bind(decision === 'approve' ? 'approved' : 'rejected', rv, t, a.uid)];
  if (decision === 'approve') {
    const d = parse(a.data) || {};
    const id = 't_' + (await sha(a.uid)).slice(0, 16);
    const profile = { name: d.name, shop: d.shop, area: d.area, cats: d.cats, about: d.about, years: d.years,
      from: d.from, warranty: d.warranty, radius: d.radius, mobile: d.mobile, urgent: d.urgent };
    stmts.push(env.DB.prepare(`INSERT INTO techs (id,uid,phone,data,verified,test,suspended,created_at,updated_at)
      VALUES (?,?,?,?,1,0,0,?,?)
      ON CONFLICT(uid) DO UPDATE SET data=excluded.data,phone=excluded.phone,verified=1,test=0,suspended=0,updated_at=excluded.updated_at`)
      .bind(id, a.uid, d.phone, JSON.stringify(profile), t, t));
  }
  await env.DB.batch(stmts);
  return { ok: true };
}

async function moderate(env, me, b) {
  adminOnly(me);
  const r = await env.DB.prepare('UPDATE techs SET suspended=?, updated_at=? WHERE id=?')
    .bind(b.suspend === false ? 0 : 1, now(), String(b.id || '')).run();
  if (!r.meta.changes) fail(404, 'ไม่พบช่าง');
  return { ok: true };
}

/* ── ใบงาน ── */
const NEXT = {
  /* action: [ใครทำได้, สถานะที่ต้องเป็นอยู่, สถานะถัดไป] */
  quote:    ['tech',     ['requested', 'quoted'],                            'quoted'],
  accept:   ['customer', ['quoted'],                                          'accepted'],
  enroute:  ['tech',     ['accepted'],                                        'enroute'],
  start:    ['tech',     ['accepted', 'enroute'],                             'working'],
  done:     ['tech',     ['working'],                                         'done'],
  complete: ['customer', ['done'],                                            'completed'],
  cancel:   ['either',   ['requested', 'quoted', 'accepted', 'enroute'],      'cancelled'],
  dispute:  ['either',   ['accepted', 'enroute', 'working', 'done', 'completed'], 'disputed'],
  resolve:  ['admin',    ['disputed'],                                        null],
  review:   ['customer', ['completed'],                                       null],
};

async function loadJob(env, me, id) {
  const j = await env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first();
  if (!j) fail(404, 'ไม่พบใบงาน');
  const t = await techById(env, j.tech_id);
  const isCustomer = j.customer_uid === me.uid;
  const isTech = !!t && t.uid === me.uid;
  /* ตอบว่า "ไม่พบ" แทน "ไม่มีสิทธิ์" เพื่อไม่บอกคนนอกว่าใบงานเลขนี้มีอยู่จริง */
  if (!isCustomer && !isTech && !me.admin) fail(404, 'ไม่พบใบงาน');
  const role = isCustomer && isTech ? 'both' : isCustomer ? 'customer' : isTech ? 'technician' : 'admin';
  return { j, t, role, isCustomer, isTech };
}

function jobOut(j, t, role, messages) {
  const accepted = !!j.accepted_at;
  const d = parse(t && t.data) || {};
  const out = {
    id: j.id, status: j.status, test: !!j.test, role, revision: j.revision,
    techId: j.tech_id, techName: d.shop || d.name || 'ช่าง',
    car: j.car, symptom: j.symptom, area: j.area, requestedTime: j.requested_time, mode: j.mode,
    quote: parse(j.quote), completion: j.completion, dispute: j.dispute, resolution: j.resolution,
    review: parse(j.review), history: parse(j.history) || [],
    createdAt: j.created_at, acceptedAt: j.accepted_at,
    messages: messages || [],
  };
  /* ลูกค้าเห็นที่อยู่ของตัวเองเสมอ ช่างเห็นหลังลูกค้ายืนยันราคาแล้วเท่านั้น */
  if (role === 'customer' || role === 'both' || role === 'admin' || accepted) out.address = j.address;
  if (accepted) { out.customerPhone = j.phone; out.technicianPhone = (t && t.phone) || ''; }
  return out;
}

async function messagesOf(env, jobId, after) {
  const { results } = await env.DB.prepare(
    'SELECT id, role, text, at FROM messages WHERE job_id = ? AND id > ? ORDER BY id ASC LIMIT 500')
    .bind(jobId, after || 0).all();
  return results;
}
async function markRead(env, jobId, uid, last) {
  if (!last) return;
  await env.DB.prepare(`INSERT INTO reads (job_id, uid, last) VALUES (?,?,?)
    ON CONFLICT(job_id, uid) DO UPDATE SET last = MAX(last, excluded.last)`).bind(jobId, uid, last).run();
}

async function myJobs(env, me, myTech, all) {
  let q, args;
  if (all) { q = 'SELECT * FROM jobs ORDER BY updated_at DESC LIMIT 200'; args = []; }
  else if (myTech) {
    q = 'SELECT * FROM jobs WHERE customer_uid = ? OR tech_id = ? ORDER BY updated_at DESC LIMIT 200';
    args = [me.uid, myTech.id];
  } else { q = 'SELECT * FROM jobs WHERE customer_uid = ? ORDER BY updated_at DESC LIMIT 200'; args = [me.uid]; }
  const { results } = await env.DB.prepare(q).bind(...args).all();
  if (!results.length) return [];
  const ids = results.map(r => r.id);
  const ph = ids.map(() => '?').join(',');
  const [names, unread] = await Promise.all([
    env.DB.prepare(`SELECT id, data FROM techs WHERE id IN (${[...new Set(results.map(r => r.tech_id))].map(() => '?').join(',')})`)
      .bind(...new Set(results.map(r => r.tech_id))).all(),
    env.DB.prepare(`SELECT m.job_id, COUNT(*) AS n FROM messages m
      LEFT JOIN reads r ON r.job_id = m.job_id AND r.uid = ?
      WHERE m.job_id IN (${ph}) AND m.uid != ? AND m.id > COALESCE(r.last, 0) GROUP BY m.job_id`)
      .bind(me.uid, ...ids, me.uid).all(),
  ]);
  const nm = Object.fromEntries(names.results.map(r => { const d = parse(r.data) || {}; return [r.id, d.shop || d.name]; }));
  const un = Object.fromEntries(unread.results.map(r => [r.job_id, r.n]));
  return results.map(j => {
    const cust = j.customer_uid === me.uid, tech = !!myTech && j.tech_id === myTech.id;
    /* งานไหนรอเราอยู่ — ใช้เรียงขึ้นบนสุดและนับบนปุ่ม */
    const needsMe = (tech && ['requested', 'accepted', 'enroute', 'working'].includes(j.status))
      || (cust && ['quoted', 'done'].includes(j.status));
    return { id: j.id, status: j.status, test: !!j.test, techName: nm[j.tech_id] || 'ช่าง',
      car: j.car, symptom: j.symptom, createdAt: j.created_at, updatedAt: j.updated_at,
      side: cust && tech ? 'both' : cust ? 'customer' : tech ? 'technician' : 'admin',
      needsMe, unread: un[j.id] || 0 };
  });
}

async function createJob(env, me, b) {
  const id = String(b.id || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) fail(400, 'รหัสคำขอไม่ถูกต้อง');
  /* กดส่งซ้ำตอนเน็ตช้า ต้องได้ใบงานใบเดิม ไม่ใช่ใบที่สอง */
  const dup = await env.DB.prepare('SELECT customer_uid FROM jobs WHERE id = ?').bind(id).first();
  if (dup) { if (dup.customer_uid !== me.uid) fail(409, 'รหัสคำขอซ้ำ'); return { id }; }

  const t = await techById(env, String(b.techId || ''));
  if (!t || t.suspended) fail(404, 'ไม่พบช่าง หรือช่างงดรับงานชั่วคราว');
  if (t.test && !me.admin) fail(404, 'ไม่พบช่าง');
  if (!t.test && !t.verified) fail(404, 'ช่างยังไม่ผ่านการตรวจ');
  if (!t.test && t.uid === me.uid) fail(400, 'ขอราคาจากตัวเองไม่ได้');
  const d = parse(t.data) || {};
  const mode = b.mode === 'mobile' && d.mobile ? 'mobile' : 'shop';

  if (!t.test) {
    /* กันสแปมคำขอ — ลูกค้าจริงไม่มีใครต้องขอราคาเกินสิบครั้งในวันเดียว */
    const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM jobs WHERE customer_uid = ? AND created_at > ?')
      .bind(me.uid, now() - 86400000).first();
    if (c.n >= 10) fail(429, 'วันนี้ส่งคำขอครบ 10 ครั้งแล้ว ลองใหม่พรุ่งนี้');
  }
  const ts = now();
  await env.DB.prepare(`INSERT INTO jobs (id,tech_id,customer_uid,status,test,car,symptom,area,address,phone,requested_time,mode,history,revision,created_at,updated_at)
    VALUES (?,?,?,'requested',?,?,?,?,?,?,?,?,?,1,?,?)`).bind(
    id, t.id, me.uid, t.test ? 1 : 0,
    str(b.car, 'รถ / รุ่น / ปี', 2, 200), str(b.symptom, 'อาการ', 10, 2000),
    str(b.area, 'พื้นที่', 4, 160), str(b.address, 'ที่อยู่', 8, 500), phone(b.phone, 'เบอร์โทร'),
    str(b.requestedTime, 'วันและเวลา', 4, 160), mode,
    JSON.stringify([{ status: 'requested', at: ts, by: 'customer' }]), ts, ts).run();
  return { id };
}

async function getJob(env, me, id) {
  const { j, t, role } = await loadJob(env, me, id);
  const messages = await messagesOf(env, id, 0);
  if (role !== 'admin') await markRead(env, id, me.uid, messages.length ? messages[messages.length - 1].id : 0);
  return { job: jobOut(j, t, role, messages) };
}

/* ดึงเฉพาะข้อความใหม่ — หน้าแชตเรียกทุกไม่กี่วินาที จึงต้องเบาที่สุด */
async function pollJob(env, me, id, after) {
  const { j, role } = await loadJob(env, me, id);
  const messages = await messagesOf(env, id, after);
  if (role !== 'admin' && messages.length) await markRead(env, id, me.uid, messages[messages.length - 1].id);
  return { messages, status: j.status, revision: j.revision };
}

async function sendMessage(env, me, ctx, b) {
  const { j, role, isCustomer } = ctx;
  if (role === 'admin') fail(403, 'ผู้ดูแลอ่านได้อย่างเดียว');
  if (['completed', 'cancelled'].includes(j.status)) fail(409, 'ใบงานปิดแล้ว ส่งข้อความไม่ได้');
  let text = str(b.message ?? b.text, 'ข้อความ', 1, 2000);
  if (!j.accepted_at) text = mask(text);
  /* งานทดสอบที่ผู้ดูแลเป็นทั้งลูกค้าและช่าง ให้เลือกได้ว่าพิมพ์ในบทไหน
     ไม่งั้นทดสอบแชตสองฝั่งด้วยบัญชีเดียวไม่ได้ */
  const as = role === 'both' ? (b.as === 'technician' ? 'technician' : 'customer')
    : isCustomer ? 'customer' : 'technician';
  const ts = now();
  const r = await env.DB.prepare('INSERT INTO messages (job_id, uid, role, text, at) VALUES (?,?,?,?,?)')
    .bind(j.id, me.uid, as, text, ts).run();
  await env.DB.prepare('UPDATE jobs SET updated_at = ? WHERE id = ?').bind(ts, j.id).run();
  await markRead(env, j.id, me.uid, r.meta.last_row_id);
  return { ok: true, message: { id: r.meta.last_row_id, role: as, text, at: ts } };
}

async function updateJob(env, me, id, b) {
  const ctx = await loadJob(env, me, id);
  const { j, t, isCustomer, isTech } = ctx;
  const action = String(b.action || '');
  /* ข้อความไม่ต้องเช็ก revision — สองฝ่ายพิมพ์พร้อมกันเป็นเรื่องปกติของการคุยกัน
     ถ้าบังคับ revision ข้อความจะเด้งทุกครั้งที่อีกฝ่ายเพิ่งกดอะไรไป */
  if (action === 'message') return sendMessage(env, me, ctx, b);

  const rule = NEXT[action];
  if (!rule) fail(400, 'ไม่รู้จักคำสั่งนี้');
  const [who_, from, to] = rule;
  const ok = who_ === 'tech' ? isTech : who_ === 'customer' ? isCustomer
    : who_ === 'either' ? (isTech || isCustomer) : me.admin;
  if (!ok) fail(403, 'คุณทำขั้นตอนนี้ในใบงานนี้ไม่ได้');
  if (!from.includes(j.status)) fail(409, 'สถานะใบงานเปลี่ยนไปแล้ว กรุณารีเฟรช');
  if (Number(b.revision) !== j.revision) fail(409, 'ใบงานเพิ่งถูกอัปเดต กรุณารีเฟรชแล้วลองอีกครั้ง');
  if (action === 'enroute' && j.mode !== 'mobile') fail(400, 'งานนี้ลูกค้านำรถไปที่อู่');

  const ts = now();
  const set = {};
  let next = to;
  const by = isTech && !isCustomer ? 'technician' : isCustomer && !isTech ? 'customer'
    : who_ === 'tech' ? 'technician' : who_ === 'admin' ? 'admin' : 'customer';
  const extra = [];

  if (action === 'quote') {
    const labor = num(b.labor, 'ค่าแรง', 0, 1000000), parts = num(b.parts, 'อะไหล่', 0, 1000000),
      travel = num(b.travel, 'ค่าเดินทาง', 0, 100000);
    if (labor + parts + travel <= 0) fail(400, 'ราคารวมต้องมากกว่า 0');
    set.quote = JSON.stringify({ labor, parts, travel, total: Math.round((labor + parts + travel) * 100) / 100,
      scope: str(b.scope, 'ขอบเขตงาน', 10, 2000), appointment: str(b.appointment, 'วันเวลานัด', 4, 200),
      warranty: num(b.warranty, 'รับประกัน', 0, 365), at: ts });
  }
  if (action === 'accept') {
    if (b.consent !== true) fail(400, 'ต้องยอมรับขอบเขตงานและราคาก่อน');
    set.accepted_at = ts;
  }
  if (action === 'done') set.completion = str(b.note, 'สรุปงาน', 10, 2000);
  if (action === 'cancel') set.resolution = 'ยกเลิก: ' + str(b.note, 'เหตุผล', 5, 2000);
  if (action === 'dispute') set.dispute = str(b.note, 'รายละเอียดปัญหา', 10, 2000);
  if (action === 'resolve') {
    set.resolution = str(b.note, 'ผลการช่วยเหลือ', 10, 2000);
    next = b.outcome === 'cancelled' ? 'cancelled' : 'completed';
  }
  if (action === 'complete' && t) extra.push(env.DB.prepare('UPDATE techs SET jobs = jobs + 1 WHERE id = ?').bind(t.id));
  if (action === 'review') {
    if (j.review) fail(409, 'ให้คะแนนงานนี้ไปแล้ว');
    const rating = Math.round(num(b.rating, 'คะแนน', 1, 5));
    set.review = JSON.stringify({ rating, text: str(b.note, 'รีวิว', 5, 2000), at: ts });
    /* งานทดสอบไม่นับคะแนน — ไม่งั้นผู้ดูแลปั้นคะแนนให้ช่างทดสอบได้ */
    if (t && !j.test) extra.push(env.DB.prepare(
      'UPDATE techs SET rating_sum = rating_sum + ?, review_count = review_count + 1 WHERE id = ?').bind(rating, t.id));
  }
  const hist = parse(j.history) || [];
  if (next) { set.status = next; hist.push({ status: next, at: ts, by }); }
  else hist.push({ status: action, at: ts, by });
  set.history = JSON.stringify(hist);
  set.updated_at = ts;

  const cols = Object.keys(set);
  /* WHERE revision = ? คือกุญแจกันสองคนกดพร้อมกัน — คนที่มาทีหลังจะแก้ไม่ติด */
  const r = await env.DB.prepare(
    `UPDATE jobs SET ${cols.map(c => c + ' = ?').join(', ')}, revision = revision + 1 WHERE id = ? AND revision = ?`)
    .bind(...cols.map(c => set[c]), j.id, j.revision).run();
  if (!r.meta.changes) fail(409, 'ใบงานเพิ่งถูกอัปเดต กรุณารีเฟรชแล้วลองอีกครั้ง');
  if (extra.length) await env.DB.batch(extra);
  return { ok: true };
}

/* ── เส้นทาง ── */
async function route(request, env) {
  const url = new URL(request.url);
  const p = url.pathname.replace(/\/+$/, '');
  const m = request.method;
  const body = async () => { try { return await request.json(); } catch { return fail(400, 'ข้อมูลไม่ถูกต้อง'); } };

  if (p === '/api/tech' && m === 'GET') {
    const me = url.searchParams.get('test') === '1' ? await who(request, env) : null;
    return listTechs(env, me, url);
  }
  if (p === '/api/health') return { ok: true };

  const me = await who(request, env);
  if (p === '/api/tech/me' && m === 'GET') return meInfo(env, me);
  if (p === '/api/tech/apply' && m === 'POST') return apply(env, me, await body());
  if (p === '/api/tech/applications' && m === 'GET') return pendingApps(env, me);
  if (p === '/api/tech/review' && m === 'POST') return review(env, me, await body());
  if (p === '/api/tech/moderate' && m === 'POST') return moderate(env, me, await body());
  if (p === '/api/tech/jobs' && m === 'GET') {
    const all = url.searchParams.get('all') === '1';
    if (all) adminOnly(me);
    const myTech = await env.DB.prepare('SELECT id FROM techs WHERE uid = ?').bind(me.uid).first();
    const jobs = await myJobs(env, me, myTech, all);
    jobs.sort((a, b) => (b.needsMe - a.needsMe) || (b.unread > 0) - (a.unread > 0) || b.updatedAt - a.updatedAt);
    return { jobs };
  }
  if (p === '/api/tech/jobs' && m === 'POST') return createJob(env, me, await body());
  let mm = p.match(/^\/api\/tech\/jobs\/([0-9a-f-]{36})$/i);
  if (mm && m === 'GET') return getJob(env, me, mm[1]);
  if (mm && m === 'POST') return updateJob(env, me, mm[1], await body());
  mm = p.match(/^\/api\/tech\/jobs\/([0-9a-f-]{36})\/messages$/i);
  if (mm && m === 'GET') return pollJob(env, me, mm[1], Number(url.searchParams.get('after')) || 0);
  fail(404, 'ไม่พบปลายทาง');
}

export default {
  async fetch(request, env) {
    const h = cors(env, request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    try {
      return json(await route(request, env), 200, h);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status, h);
      console.error(e);
      return json({ error: 'ระบบขัดข้องชั่วคราว กรุณาลองใหม่' }, 500, h);
    }
  },
};
