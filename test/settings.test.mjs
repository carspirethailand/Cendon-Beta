import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const r = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const st = r('settings.js'), css = r('settings.css'), acts = r('account-actions.js'), acc = r('account.js');

test('settings: one shared page on every app page — the old per-page copies are gone', () => {
  for (const f of ['profile.html', 'garage.html', 'news.html', 'spares.html', 'chat.html']) {
    const s = r(f);
    assert.match(s, /<link rel="stylesheet" href="\/settings\.css\?v=\d+">/, f);
    assert.match(s, /<script src="\/settings\.js\?v=\d+" defer><\/script>/, f);
    assert.doesNotMatch(s, /id="settingsjs"|id="settingscss"|class="set-rail"/, f);
  }
  assert.match(r('chat.html'), /CendonSettings\.open\(tab,\{root:v,back:settingsBack,extra:chatExtra\}\)/);
  assert.match(r('sw.js'), /'\.\/settings\.js\?v=\d+', '\.\/settings\.css\?v=\d+'/);
});

test('settings: become-a-mechanic card sits right under the profile, with the right state', () => {
  const html = st.slice(st.indexOf('function mainHTML'), st.indexOf('function manageHTML'));
  assert.ok(html.indexOf('class="st-me"') < html.indexOf('${partnerHTML()}'), 'profile first');
  assert.ok(html.indexOf('${partnerHTML()}') < html.indexOf("t('การตั้งค่าแอป','App settings')"), 'partner card before the settings groups');
  for (const s of ['none', 'pending', 'rejected', 'shop']) assert.match(st, new RegExp(`${s}:\\['ti-`), s);
  assert.match(st, /const href=fbUser\(\)\|\|u\.uid\?'\/studio':'\/login\?next=%2Fjoin';/);
});

test('settings: download, sign out and delete look different, live apart and each asks before acting', () => {
  const html = st.slice(st.indexOf('function mainHTML'), st.indexOf('function manageHTML'));
  const dl = html.indexOf("act:'export'"), out = html.indexOf('class="st-out" data-st="signout"'), del = html.indexOf('class="st-del" data-st="delete"');
  assert.ok(dl > 0 && out > dl && del > out, 'download row → sign-out button → delete text, in that order');
  assert.match(css, /\.st-del\{display:flex;align-items:center;gap:8px;margin:44px auto 0;/, 'delete sits far below sign out');
  assert.match(css, /\.st-out\{margin-top:28px;width:100%;height:54px;/);
  /* ออกจากระบบ / รีเซ็ต / ปิดใช้งาน = แผ่นยืนยันก่อนทำจริง */
  for (const k of ['signout', 'reset', 'deactivate']) assert.match(st, new RegExp(`if\\(kind==='${k}'\\)return`), k);
  /* ลบ = ต้องพิมพ์คำยืนยันให้ตรง ปุ่มแดงถึงจะกดได้ — ไม่ใช้กล่อง prompt ของเบราว์เซอร์ */
  assert.match(st, /function confirmWord\(\)\{return curLang\(\)==='th'\?'ลบบัญชี':'DELETE'\}/);
  assert.match(st, /data-st="do-delete" disabled>/);
  assert.match(st, /if\(e\.target\.id==='stDelIn'\)\{const b=sheetEl\.querySelector\('\[data-st="do-delete"\]'\);if\(b\)b\.disabled=!matches\(e\.target\.value\)\}/);
  assert.match(st, /if\(!inp\|\|!matches\(inp\.value\)\)return;/);
  assert.doesNotMatch(st, /W\.prompt|window\.prompt|confirm\(/);
  assert.match(acts, /remove:say=>deleteAccount\(say,true\)/);
  assert.match(acts, /async function deleteAccount\(say,confirmed\)\{\n    if\(!confirmed\)\{const typed=W\.prompt\(/);
  /* รีเซ็ต/ปิดใช้งาน อยู่ในหน้าย่อยของตัวเอง ไม่ใช่แถวปุ่มรวมกัน */
  assert.doesNotMatch(st, /spireDangerHTML/);
  assert.match(st, /function manageHTML\(\)/);
});

test('settings: name, distance and currency save to the server profile; quota comes from the server', () => {
  assert.match(acc, /function savePrefs\(patch\)\{/);
  assert.match(acc, /request\('\/api\/onboarding\/preferences',prefs,'PATCH',u\.uid\)\.then\(data=>/);
  assert.match(acc, /W\.spireSavePrefs=savePrefs;W\.spireMoney=\(\)=>MONEY\.slice\(\);/);
  assert.match(st, /await W\.spireSavePrefs\(\{distance:v\}\)/);
  assert.match(st, /await W\.spireSavePrefs\(\{currency:v\}\)/);
  assert.match(st, /await W\.spireSavePrefs\(\{name:v\}\)/);
  assert.match(st, /fetch\(API\(\)\+'\/api\/quota'/);
  assert.doesNotMatch(st, /spire_aiUsedToday/, 'no local fake counter');
});

test('settings: sub-page and sheets join browser history (back closes them), old tab links still land', () => {
  assert.match(st, /W\.Nav\.watch\(\{sel:'#stManage',cls:'on',tag:'stmanage',/);
  assert.match(st, /W\.Nav\.watch\(\{sel:'#stSheet',cls:'on',tag:'stsheet',close:closeSheet\}\)/);
  const nav = r('nav-pages.js');
  assert.match(nav, /const SETS=\["general","acct","usage","fb","learn","manage"\];/);
  assert.match(nav, /if\(window\.CendonSettings\)window\.CendonSettings\.go\(k\)/);
});

test('settings: LINE shows as one row in settings, the full card stays for Studio', () => {
  assert.match(st, /data-line-connect="row"/);
  const line = r('cendon-line.js');
  assert.match(line, /if\(el\.dataset\.lineConnect==="row"\)\{el\.innerHTML=rowHTML\(\);return\}/);
  assert.match(css, /#v-settings \.cl-row \.cl-go\{/, 'button text colour wins over the page link colour');
});
