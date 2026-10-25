import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const page=readFileSync(new URL('../handbook.html',import.meta.url),'utf8');
const book=readFileSync(new URL('../HANDBOOK.md',import.meta.url),'utf8');

test('admins can replace an existing handbook from a file; others never see the control',()=>{
  /* ปุ่มอยู่ในแถบสารบัญ ซ่อนไว้ก่อนเสมอ แล้วเปิดเฉพาะแอดมินหลังวาดเนื้อหา */
  assert.match(page,/<label id="upd" hidden>อัปเดตจากไฟล์<input type="file"[^>]*id="updFile" hidden><\/label>/);
  assert.match(page,/\$\("upd"\)\.hidden=rank\(me\.role\)<rank\("admin"\);/);
  /* ใช้ตัวนำเข้าตัวเดียวกับครั้งแรก (ลบตอนเก่าที่เกินให้) และถามก่อนแทนที่ทั้งเล่ม */
  const h=page.slice(page.indexOf('$("updFile").onchange'));
  assert.match(h.slice(0,600),/confirm\(/);
  assert.match(h.slice(0,600),/importMd\(String\(rd\.result\|\|""\),\[\]\)/);
});

test('handbook packs from the repo root and no longer tells anyone to set up Vectorize',()=>{
  const r=spawnSync(process.execPath,[new URL('../handbookpack.mjs',import.meta.url).pathname,'--check'],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
  assert.match(r.stdout,/enabled = 0 ครบทุกตอน/);
  /* Vectorize ถูกถอดแล้ว — คู่มือต้องไม่มีคำสั่งให้สร้างอีก (กล่าวถึงในเนื้อความได้) */
  assert.ok(!/^\s*wrangler vectorize create/m.test(book));
});
