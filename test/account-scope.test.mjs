import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

/* account-scope.js ตัวจริงใน VM: ที่เก็บในเครื่อง/การเรียกเซิร์ฟเวอร์เป็นของจำลอง ไม่มีบัญชีจริง */
const source = readFileSync(new URL('../account-scope.js', import.meta.url), 'utf8');
const settle = async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); };

function fixture({ pathname = '/garage', local = {}, session = {}, user = null, server = {} } = {}) {
  class Storage {
    constructor(init) { this.m = new Map(Object.entries(init)); }
    get length() { return this.m.size; }
    key(i) { return [...this.m.keys()][i] ?? null; }
    getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
    setItem(k, v) { this.m.set(String(k), String(v)); }
    removeItem(k) { this.m.delete(k); }
  }
  const localStorage = new Storage(local), sessionStorage = new Storage(session);
  const listeners = {}, deleted = [], reloads = [], calls = [];
  const auth = { currentUser: user, signOut: async () => { auth.currentUser = null; } };
  const window = {
    localStorage, sessionStorage, Storage, auth, BACKEND_URL: 'https://api.unit.test',
    addEventListener: (t, f) => { (listeners[t] ||= []).push(f); },
    fetch: async (url, opt) => { calls.push([url, opt?.headers?.Authorization]); const path = new URL(url).pathname + new URL(url).search; const body = server[path]; return { ok: body !== undefined, json: async () => JSON.parse(JSON.stringify(body)) }; },
  };
  const context = { window, document: {}, location: { pathname, reload: () => reloads.push(1) }, localStorage, sessionStorage, Storage,
    indexedDB: { deleteDatabase: n => deleted.push(n) }, setTimeout: (f, ms) => { if (!ms) { f(); return 1; } return setTimeout(f, ms); }, Promise, JSON, Object, Array, Map, Set, String, Number, console };
  vm.runInNewContext(source, context);
  return { S: window.CendonScope, window, localStorage, sessionStorage, deleted, reloads, calls, listeners,
    keys: () => [...localStorage.m.keys()].sort(), get: k => JSON.parse(localStorage.getItem(k)) };
}
const A_DATA = {
  spire_garage: JSON.stringify([{ id: 'cA1', make: 'Toyota', model: 'Hilux' }]), spire_selCar: '"cA1"',
  spire_cachedUser: JSON.stringify({ uid: 'A', name: 'Alice' }), spire_sess_cA1: '[{"t":"secret"}]',
  spire_theme: '"dark"', spire_lang: '"th"', cendon_signed: '1', 'firebase:authUser:k:[DEFAULT]': '{"uid":"A"}',
};

test('a different account wipes everything personal but keeps device language/theme and Firebase sign-in', () => {
  const f = fixture({ local: { ...A_DATA, spire___owner: 'A' }, session: { spire_postDraft: '{}', cendon_intro: '1' } });
  assert.equal(f.S.claim('B'), true);
  assert.deepEqual(f.keys(), ['cendon_signed', 'firebase:authUser:k:[DEFAULT]', 'spire___owner', 'spire_lang', 'spire_theme']);
  assert.equal(f.localStorage.getItem('spire___owner'), 'B');
  assert.deepEqual([...f.sessionStorage.m.keys()], ['cendon_intro']);
  assert.deepEqual(f.deleted, ['cendon-media']);
  assert.equal(f.S.claim('B'), false, 'same owner again is a no-op');
});

test('a device from before owner stamps keeps data only when every hint names the same account', () => {
  const same = fixture({ local: A_DATA });
  assert.equal(same.S.claim('A'), false);
  assert.equal(same.localStorage.getItem('spire_garage'), A_DATA.spire_garage);
  assert.equal(same.localStorage.getItem('spire___owner'), 'A');
  const other = fixture({ local: A_DATA });
  assert.equal(other.S.claim('B'), true);
  assert.equal(other.localStorage.getItem('spire_garage'), null);
  const mixed = fixture({ local: { ...A_DATA, spire_setup: JSON.stringify({ uid: 'B' }) } });
  assert.equal(mixed.S.claim('B'), true, 'mixed hints mean the data cannot be trusted');
  const unknown = fixture({ local: { spire_garage: A_DATA.spire_garage } });
  assert.equal(unknown.S.claim('B'), true, 'personal data without an owner is not adopted');
});

test('sign-out flushes pending cloud changes first, then removes all personal data and the owner', async () => {
  const order = [];
  const f = fixture({ local: { ...A_DATA, spire___owner: 'A' }, user: { uid: 'A' } });
  f.window.cloudFlush = async () => { order.push('flush:' + f.localStorage.getItem('spire_garage')?.length); };
  const signOut = f.window.auth.signOut; f.window.auth.signOut = async () => { order.push('signOut'); return signOut(); };
  await f.S.signOut();
  assert.deepEqual(order, ['flush:' + A_DATA.spire_garage.length, 'signOut']);
  assert.equal(f.localStorage.getItem('spire___owner'), null);
  assert.equal(f.localStorage.getItem('spire_garage'), null);
  assert.equal(f.localStorage.getItem('spire_cachedUser'), null);
  assert.equal(f.S.frozen(), true);
  f.localStorage.setItem('spire_garage', '[{"id":"stale"}]');
  assert.equal(f.localStorage.getItem('spire_garage'), null, 'a page that is leaving cannot write old in-memory data back');
  f.localStorage.setItem('spire_theme', '"light"');
  assert.equal(f.localStorage.getItem('spire_theme'), '"light"');
});

test('mine() blocks uploads of another account\'s local data and reloads the page clean', () => {
  const f = fixture({ local: { ...A_DATA, spire___owner: 'A' } });
  assert.equal(f.S.mine('B'), false);
  assert.equal(f.reloads.length, 1);
  assert.equal(f.localStorage.getItem('spire_garage'), null);
  const g = fixture({ local: { ...A_DATA, spire___owner: 'A' } });
  assert.equal(g.S.mine('A'), true);
  assert.equal(g.reloads.length, 0);
});

test('login prefetch writes the new account cars and chats with sync bookkeeping, server cars win', async () => {
  const user = { uid: 'B', getIdToken: async () => 'tok-B' };
  const T = 1700000000000;
  const f = fixture({ pathname: '/login', user, local: { spire___owner: 'B' }, server: {
    '/api/state': { state: {
      garage: { v: [{ id: 'cB1', make: 'Mazda', model: 'CX-5', history: [{ d: 1 }], type: 'suv' }, { id: 'cB0', make: 'Old', model: 'Local' }], t: T },
      selCar: { v: 'cB1', t: T }, sess_cB1: { v: [{ t: 'hi' }], t: T }, theme: { v: 'dark', t: T },
      setup: { v: { uid: 'B', level: 'x' }, t: T }, lang: { v: 'en', t: T }, junk: { v: 1, t: T } } },
    '/api/cars?sync=1': { cars: [{ id: 'cB1', make: 'Mazda', model: 'CX-5', year: 2022, mileage: 12000, body: 'suv' }, { id: 'cB2', make: 'Ford', model: 'Ranger', year: 2020, mileage: 5 }], deleted: [] },
  } });
  assert.equal(await f.S.prime(user), true);
  assert.equal(await f.S.ready(10), true);
  const garage = f.get('spire_garage');
  assert.deepEqual(garage.map(c => c.id), ['cB1', 'cB0', 'cB2']);
  assert.deepEqual(garage[0].history, [{ d: 1 }]);
  assert.equal(garage[2].name, 'Ford Ranger');
  assert.equal(f.get('spire_selCar'), 'cB1');
  assert.deepEqual(f.get('spire_sess_cB1'), [{ t: 'hi' }]);
  assert.equal(f.get('spire_theme'), 'dark');
  assert.equal(f.localStorage.getItem('spire_setup'), null, 'account.js owns setup');
  assert.equal(f.localStorage.getItem('spire_lang'), null, 'account.js owns language');
  assert.equal(f.localStorage.getItem('spire_junk'), null);
  const meta = f.get('spire___meta'), synced = f.get('spire___synced'), seen = f.get('spire___seen');
  assert.equal(meta.sess_cB1, T); assert.ok(synced.sess_cB1.h); assert.equal(seen.sess_cB1, synced.sess_cB1.h);
  assert.ok(meta.garage > T && !synced.garage, 'merged car list differs from the cloud copy, so it is uploaded once');
  assert.ok(f.calls.every(c => c[1] === 'Bearer tok-B'));
});

test('prefetch is discarded when the signed-in account changed meanwhile', async () => {
  const user = { uid: 'B', getIdToken: async () => 'tok-B' };
  const f = fixture({ pathname: '/login', user, local: { spire___owner: 'B' }, server: { '/api/state': { state: { garage: { v: [{ id: 'cB1' }], t: 1 } } }, '/api/cars?sync=1': { cars: [] } } });
  const job = f.S.prime(user); f.window.auth.currentUser = { uid: 'C' };
  assert.equal(await job, false);
  assert.equal(f.localStorage.getItem('spire_garage'), null);
});

test('profile cache for the first paint matches the signed-in account only', () => {
  const f = fixture({ local: { spire___owner: 'B' } });
  f.S.me({ uid: 'B', email: 'b@unit.test' }, { uid: 'B', name: 'Bob', role: 'admin', photo: 'https://img.unit.test/b.png' });
  assert.deepEqual(f.get('spire_cachedUser'), { uid: 'B', name: 'Bob', email: 'b@unit.test', photo: 'https://img.unit.test/b.png', role: 'admin', admin: true });
  f.S.me({ uid: 'C' }, { uid: 'C', name: 'Cara' });
  assert.equal(f.get('spire_cachedUser').uid, 'B');
});

test('another tab switching or signing out reloads this tab; first stamp of the same device does not', () => {
  const f = fixture({ local: { spire___owner: 'A' } });
  const fire = e => f.listeners.storage.forEach(h => h({ storageArea: f.localStorage, ...e }));
  fire({ key: 'spire___owner', oldValue: null, newValue: 'A' });
  assert.equal(f.reloads.length, 0);
  fire({ key: 'spire___owner', oldValue: 'A', newValue: 'B' });
  assert.equal(f.reloads.length, 1);
  assert.equal(f.S.frozen(), true);
});

test('pages load the scope guard before their own scripts, and sign-in/out paths use it', () => {
  const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
  for (const f of ['index.html', 'garage.html', 'chat.html', 'news.html', 'profile.html', 'spares.html', 'admin.html', 'handbook.html', 'plan.html']) {
    const html = read(f);
    assert.ok(html.indexOf('<script src="/account-scope.js?v=1"></script>') > 0, f);
    assert.ok(html.indexOf('account-scope.js') < html.indexOf('account.js?v='), f);
  }
  assert.match(read('login.html'), /<script src="\/account-scope\.js\?v=1"><\/script>\n<script src="\/account-paint\.js/);
  const acc = read('account.js');
  assert.match(acc, /W\.CendonScope\.claim\(u\.uid\)&&!LOGIN\)\{W\.CendonScope\.freeze\(\);location\.reload\(\);return\}/);
  assert.match(acc, /if\(W\.CendonScope\)W\.CendonScope\.release\(\);/);
  assert.match(acc, /if\(LOGIN&&W\.CendonScope\)W\.CendonScope\.prime\(u\);/);
  for (const f of ['garage.html', 'chat.html']) {
    const html = read(f);
    assert.match(html, /if\(window\.CendonScope&&!CendonScope\.mine\(auth\.currentUser\.uid\)\)return;/, f + ' car sync');
    assert.match(html, /if\(window\.CendonScope&&!CendonScope\.mine\(u\.uid\)\)throw new Error\("account changed"\);/, f + ' cloud sync');
    assert.match(html, /else if\(e\.status===409\)\{delete byId\[c\.id\];foreign\+\+\}/, f + ' foreign cars dropped');
    assert.match(html, /window\.cloudFlush=\(\)=>push\(\);/, f);
  }
  assert.match(read('sw.js'), /'\.\/account-scope\.js\?v=1'/);
});
