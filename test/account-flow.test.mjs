import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../account.js', import.meta.url), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const settle = async () => { for (let i = 0; i < 100; i++) await Promise.resolve(); };
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => clone(body) });
const required = () => ({ status: 'required', completed: false, policy:{enabled:true,privacyUrl:'https://cendon.unit.test/privacy'}, versions: { terms: 'unit-terms-v1', privacy: 'unit-privacy-v1' } });
const complete = (uid = 'user-A', overrides = {}) => ({ status: 'completed', completed: true,
  profile: { uid, name: 'Account ' + uid, lang: 'en', units: 'metric', distance: 'km', currency: 'THB', birthDate: '1995-04-02', level: 'enthusiast', plan: 'free' },
  tutorial: { status: 'completed' }, ...overrides,
});

/* Tiny DOM/form fixture for the actual shipped account.js. It implements only
 * the APIs this module uses and parses its real rendered inputs/buttons. Auth,
 * transport, storage and timers are test-only; no real account or email is used.
 */
function fixture({ uid = null, pathname = '/garage', search = '', store = new Map(), sessionStore = new Map(), server = required(), transport, token, proxyAuth = false } = {}) {
  let document, callback, clock = Date.UTC(2026, 9, 10, 12), timerId = 0;
  const events = new Map(), timers = new Map(), calls = [], oauth = [], customTokens = [], marks = [], navigations = [], tours = [];
  const decode = text => String(text).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const attributes = text => {
    const out = {};
    for (const match of text.matchAll(/([a-z][\w:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gi)) out[match[1]] = decode(match[2] ?? match[3] ?? match[4] ?? '');
    return out;
  };
  const matches = (el, selector) => {
    if (selector === '[name]') return !!el.name;
    if (selector.startsWith('[name=')) return el.name === selector.match(/^\[name=["']?([^"'\]]+)/)?.[1];
    if (selector.startsWith('#')) return el.id === selector.slice(1);
    if (selector.startsWith('.')) return el.className?.split(' ').includes(selector.slice(1));
    const tag = selector.match(/^[a-z]+/i)?.[0];
    if (tag && el.tagName !== tag.toUpperCase()) return false;
    if (selector.includes(':not([disabled])') && el.disabled) return false;
    for (const match of selector.replace(/:not\(\[disabled\]\)/g, '').matchAll(/\[([\w-]+)(?:=["']?([^"'\]]+)["']?)?\]/g)) {
      if (!el.hasAttribute(match[1]) || (match[2] !== undefined && el.getAttribute(match[1]) !== match[2])) return false;
    }
    return !!tag || selector.startsWith('[');
  };
  class Element {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.dataset = {}; this.hidden = false; this.disabled = false; this.className = ''; this.value = ''; }
    setAttribute(name, value) {
      this.attrs[name] = String(value);
      if (['id', 'name', 'type', 'class', 'value'].includes(name)) this[name === 'class' ? 'className' : name] = String(value);
      if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value);
      if (name === 'disabled') this.disabled = true;
      if (name === 'checked') this.checked = true;
    }
    getAttribute(name) { return this.attrs[name] ?? null; }
    hasAttribute(name) { return Object.hasOwn(this.attrs, name); }
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
    prepend(child) { child.parentNode = this; this.children.unshift(child); }
    contains(node) { return node === this || this.children.some(child => child.contains(node)); }
    closest(selector) { for (let node = this; node; node = node.parentNode) if (matches(node, selector)) return node; return null; }
    focus() { document.activeElement = this; }
    querySelectorAll(selector) {
      const found = [];
      for (const child of this.children) { if (selector.split(',').some(s => matches(child, s.trim()))) found.push(child); found.push(...child.querySelectorAll(selector)); }
      return found;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    get innerHTML() { return this._html || ''; }
    set innerHTML(html) {
      this._html = html; this.children = [];
      if (!html.includes('<form')) return;
      const form = this.appendChild(new Element('form'));
      for (const match of html.matchAll(/<(input|select|button|a)\b([^>]*?)(?:\/>|>(?:([\s\S]*?)<\/\1>)?)/gi)) {
        const tag = match[1].toLowerCase(), el = new Element(tag);
        for (const [name, value] of Object.entries(attributes(match[2]))) el.setAttribute(name, value);
        el.textContent = decode((match[3] || '').replace(/<[^>]*>/g, ''));
        if (tag === 'select') {
          const options = [...(match[3] || '').matchAll(/<option\b([^>]*?)>([\s\S]*?)<\/option>/gi)].map(option => attributes(option[1]));
          el.value = (options.find(option => Object.hasOwn(option, 'selected')) || options[0] || {}).value || '';
        }
        form.appendChild(el);
      }
      const actions = new Element('div'); actions.className = 'ac-actions'; form.appendChild(actions);
    }
  }
  const body = new Element('body');
  document = { body, readyState: 'complete', activeElement: null, documentElement: { dataset: {} }, createElement: tag => new Element(tag),
    getElementById: id => body.querySelector('#' + id),
    addEventListener(name, fn) { if (!events.has(name)) events.set(name, []); events.get(name).push(fn); },
    dispatchEvent(event) { for (const fn of events.get(event.type) || []) fn(event); },
  };
  const storage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)), removeItem: key => store.delete(key) };
  const sessionStorage = { getItem: key => sessionStore.get(key) ?? null, setItem: (key, value) => sessionStore.set(key, String(value)), removeItem: key => sessionStore.delete(key) };
  const user = id => id ? { uid: id, displayName: 'Fixture ' + id, photoURL: '', getIdToken: () => token?.[id]?.promise || Promise.resolve('token-' + id) } : null;
  const auth = { currentUser: user(uid), onAuthStateChanged(fn) { callback = fn; fn(this.currentUser); return () => {}; }, getRedirectResult: async () => null,
    async signOut() { this.currentUser = null; callback(null); },
  };
  if (!proxyAuth) Object.assign(auth, {
    async signInWithPopup(provider) { oauth.push({ kind: provider.kind, scopes: provider.scopes, params: provider.params }); },
    async signInWithRedirect(provider) { oauth.push({ kind: provider.kind, redirect: true }); },
    async signInWithCustomToken(value) { customTokens.push(value); },
    signInWithEmailAndPassword() { throw new Error('Password authentication must not be used'); },
    createUserWithEmailAndPassword() { throw new Error('Password registration must not be used'); },
  });
  class GoogleProvider { constructor() { this.kind = 'google'; this.scopes = []; } setCustomParameters(params) { this.params = params; } }
  class AppleProvider { constructor(kind) { this.kind = kind; this.scopes = []; } addScope(scope) { this.scopes.push(scope); } }
  const firebase = { auth: { GoogleAuthProvider: GoogleProvider, OAuthProvider: AppleProvider } };
  let href = 'https://cendon.unit.test' + pathname + search;
  const location = { origin: 'https://cendon.unit.test', pathname, search, hash: '',
    replace(url) { navigations.push(url); }, assign(url) { navigations.push(url); },
  };
  Object.defineProperty(location, 'href', { get: () => href, set: value => { href = value; navigations.push(value); } });
  const tour = { async start(options) { tours.push(options); return true; }, stop() {} };
  const window = { auth, spireAuth: auth, firebase, BACKEND_URL: 'https://backend.unit.test', localStorage: storage, CendonTour: tour,
    cloudMark: key => marks.push(key), spireSetLang() {}, spireApplySetup() {},
  };
  class FixtureDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }
  const sandbox = { window, document, location, localStorage: storage, sessionStorage, firebase, CendonTour: tour,
    navigator: { userAgent: 'Unit browser' }, URL, URLSearchParams, AbortController, Date: FixtureDate, Intl,
    console: { warn() {} }, requestAnimationFrame: fn => { fn(); return 1; },
    setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, at: clock + ms, ms }); return id; }, clearTimeout: id => timers.delete(id),
    fetch: async (url, options) => {
      const path = new URL(url).pathname, requestUid = options.headers.Authorization?.replace('Bearer token-', '') || null;
      const bodyData = options.body ? JSON.parse(options.body) : undefined;
      const record = { path, method: options.method, uid: requestUid, body: bodyData, options }; calls.push(record);
      if (transport) { const result = await transport(record); if (result !== undefined) return result; }
      if (path === '/api/login') return response({ uid: requestUid });
      if (path === '/api/onboarding' && options.method === 'GET') return response(typeof server === 'function' ? server(requestUid) : server);
      if (path === '/api/onboarding' && options.method === 'POST') return response(complete(requestUid, { profile: { ...complete(requestUid).profile, ...bodyData } , tutorial: { status: 'pending' } }));
      if (path === '/api/onboarding/preferences') return response(complete(requestUid, { profile: { ...complete(requestUid).profile, ...bodyData } }));
      if (path === '/api/onboarding/tutorial') return response(complete(requestUid, { tutorial: { status: bodyData.status } }));
      if (path === '/api/auth/config') return response({ emailOtpReady: true, otpLength: 6 });
      if (path === '/api/auth/email/request') return response({ challengeId: '6bd69839-303b-4ee2-8822-08d2373e3e81', expiresIn: 600, resendAfter: 60 });
      if (path === '/api/auth/email/verify') return response({ customToken: 'unit-only-custom-token' });
      throw new Error('Unexpected fixture route ' + path);
    },
  };
  vm.runInNewContext(source, sandbox);
  const root = () => document.getElementById('accountFlow');
  const emit = (name, target, extra = {}) => { for (const fn of events.get(name) || []) fn({ target, preventDefault() {}, ...extra }); };
  const button = selector => root()?.querySelectorAll('button').find(el => selector.startsWith('data-provider=') ? el.dataset.provider === selector.slice(14) : el.hasAttribute(selector));
  const click = selector => { const el = button(selector); assert.ok(el, 'Rendered button exists: ' + selector); emit('click', el); };
  const fill = (values, name = 'input') => {
    for (const [key, value] of Object.entries(values)) { const el = root()?.querySelector(`[name="${key}"]`); assert.ok(el, 'Rendered field exists: ' + key); if (el.type === 'checkbox') el.checked = !!value; else el.value = String(value); emit(name, el); }
  };
  const submit = () => { assert.ok(root()?.querySelector('form')); emit('submit', root().querySelector('form')); };
  return { window, api: window.CendonAccount, auth, sandbox, document, store, sessionStore, calls, marks, navigations, tours, oauth, customTokens, root, click, fill, submit,
    value: key => JSON.parse(store.get(key) || 'null'),
    switchAccount(id) { auth.currentUser = user(id); callback(auth.currentUser); },
    advance(ms) { clock += ms; for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.fn(); } },
  };
}

async function wizardToCurrency(f) {
  await settle(); f.fill({ terms: true, privacy: true }); f.submit();
  f.fill({ name: 'ปอร์เช่ Porsche' }); f.submit();
  f.fill({ day: 29, month: 2, year: 2000 }); f.submit();
  f.fill({ lang: 'en' }, 'change'); f.submit();
  f.submit();
  assert.ok(f.root().querySelector('[name="currency"]'));
}

test('account flow: auth offers exactly Google, Apple, Email and never invokes a password API', async () => {
  const f = fixture({ pathname: '/login' });
  assert.deepEqual(f.root().querySelectorAll('button').filter(el => el.dataset.provider).map(el => el.dataset.provider), ['google', 'apple', 'email']);
  assert.equal(f.root().querySelector('input[type="password"]'), null);
  assert.doesNotMatch(source, /signInWithEmailAndPassword|createUserWithEmailAndPassword|sendPasswordResetEmail/);
  f.click('data-provider=google'); await settle();
  f.click('data-provider=apple'); await settle();
  assert.deepEqual(f.oauth.map(item => item.kind), ['google', 'apple.com']);
  assert.deepEqual(clone(f.oauth[1].scopes), ['email', 'name']);
});

test('account flow: old global setup or another UID cannot complete a new account', async () => {
  for (const old of [{ v: 2, name: 'Legacy', accountComplete: true }, { v: 3, uid: 'user-A', name: 'Foreign', accountComplete: true, birthDate: '1990-01-01' }]) {
    const store = new Map([['spire_setup', JSON.stringify(old)]]), f = fixture({ uid: 'user-B', store }); await settle();
    assert.equal(f.api.ready(), false); assert.equal(f.window.spireSetupDone(), false);
    assert.ok(f.root().querySelector('[name="terms"]')); assert.ok(!f.root().hidden);
    assert.deepEqual(clone(f.window.spireSetupRead()), {});
    assert.equal(store.has('spire_setup'), false);
    assert.equal(f.calls.filter(call => call.path === '/api/onboarding' && call.method === 'POST').length, 0);
    assert.equal(f.tours.length, 0);
  }
});

test('account flow: server completion survives six refreshes and a fresh browser without rerunning setup', async () => {
  let store = new Map();
  for (let i = 0; i < 7; i++) {
    const f = fixture({ uid: 'user-A', store, server: complete() }); await settle();
    assert.equal(f.api.ready(), true); assert.equal(f.root().hidden, true);
    assert.equal(f.calls.filter(call => call.path === '/api/onboarding' && call.method === 'POST').length, 0);
    assert.equal(f.calls.filter(call => call.path === '/api/onboarding' && call.method === 'GET').length, 1);
    assert.equal(f.value('spire_setup').uid, 'user-A'); assert.equal(f.value('spire_setup').v, 3);
    assert.equal(Object.hasOwn(f.value('spire_setup'), 'birthDate'), false);
    assert.equal(f.tours.length, 0);
    if (i === 5) store = new Map();
  }
});

test('account flow: failed account lookup opens retry, never a new setup wizard', async () => {
  for (const status of [401, 403, 500, 503]) {
    const f = fixture({ uid: 'user-A', transport: call => call.path === '/api/onboarding' ? response({ code: 'onboarding_unavailable' }, status) : undefined });
    await settle(); assert.equal(f.api.ready(), false); assert.ok(f.root().querySelector('button[data-retry]'));
    assert.equal(f.root().querySelector('[name="terms"]'), null); assert.equal(f.value('spire_setup'), null);
  }
  const offline = fixture({ uid: 'user-A', transport: call => { if (call.path === '/api/onboarding') throw new Error('offline'); } });
  await settle(); assert.ok(offline.root().querySelector('button[data-retry]'));
  assert.equal(offline.root().querySelector('[name="terms"]'), null);
});

test('account flow: switching UID while token resolves cannot request or publish the old account', async () => {
  const slow = deferred(), f = fixture({ uid: 'user-A', token: { 'user-A': slow }, server: uid => complete(uid) });
  await settle(); assert.equal(f.calls.length, 0);
  f.switchAccount('user-B'); await settle(); slow.resolve('token-user-A'); await settle();
  assert.equal(f.value('spire_setup').uid, 'user-B'); assert.equal(f.value('spire_setup').name, 'Account user-B');
  assert.equal(f.calls.some(call => call.uid === 'user-A'), false);
  assert.equal(f.store.has('spire___account_user-A_status'), false);
  assert.equal(Object.hasOwn(f.value('spire_setup'), 'birthDate'), false);
});

test('account flow: switching UID while cloud lookup resolves cannot leak the old profile or DOB', async () => {
  const slow = deferred();
  const f = fixture({ uid: 'user-A', server: uid => complete(uid), transport: call => call.path === '/api/onboarding' && call.uid === 'user-A' ? slow.promise : undefined });
  await settle(); f.switchAccount('user-B'); await settle();
  slow.resolve(response(complete('user-A', { profile: { ...complete().profile, name: 'Foreign secret name', birthDate: '1980-03-04' } }))); await settle();
  assert.equal(f.value('spire_setup').uid, 'user-B'); assert.equal(f.value('spire_setup').name, 'Account user-B');
  assert.equal(JSON.stringify(f.value('spire_setup')).includes('1980-03-04'), false);
  assert.equal(f.store.has('spire___account_user-A_status'), false);
});

test('account flow: birthdays validate real calendar days and reject future dates', () => {
  const { api } = fixture();
  for (const birth of ['2000-02-29', '2004-02-29', '1995-04-02', '1900-01-01', '2026-10-10']) assert.equal(api.validBirth(birth), true, birth);
  for (const birth of ['1900-02-29', '2023-02-29', '2000-04-31', '2000-13-01', '2000-00-10', '2000-01-00', '1899-12-31', '2026-10-11', '2569-01-01', '2000-2-29', '2000-02-29T00:00:00Z', '']) assert.equal(api.validBirth(birth), false, birth);
  assert.equal(api.validName('ปอร์เช่ Porsche'), true); assert.equal(api.validName('李明'), true);
  for (const name of ['', '   ', '<script>run()</script>', 'name\nextra', 'name\u200b', 'x'.repeat(61), '---']) assert.equal(api.validName(name), false);
});

test('account flow: consent is unchecked and required before advancing or posting setup', async () => {
  const f = fixture({ uid: 'user-A' }); await settle();
  assert.equal(!!f.root().querySelector('[name="terms"]').checked, false);
  assert.equal(!!f.root().querySelector('[name="privacy"]').checked, false);
  f.submit(); assert.ok(f.root().querySelector('[name="terms"]'));
  f.fill({ terms: true }); f.submit(); assert.ok(f.root().querySelector('[name="privacy"]'));
  assert.equal(f.calls.some(call => call.path === '/api/onboarding' && call.method === 'POST'), false);
  f.fill({ privacy: true }); f.submit(); assert.ok(f.root().querySelector('[name="name"]'));
});

test('account flow: setup completion and projection wait for a validated server acknowledgement', async () => {
  const ack = deferred(), f = fixture({ uid: 'user-A', transport: call => call.path === '/api/onboarding' && call.method === 'POST' ? ack.promise : undefined });
  await wizardToCurrency(f); f.fill({ currency: 'USD' }); f.submit(); await settle();
  const sent = f.calls.find(call => call.path === '/api/onboarding' && call.method === 'POST');
  assert.equal(sent.body.consent, true); assert.equal(sent.body.termsVersion, 'unit-terms-v1'); assert.equal(sent.body.privacyVersion, 'unit-privacy-v1');
  assert.equal(sent.body.birthDate, '2000-02-29'); assert.equal(sent.body.currency, 'USD');
  assert.equal(f.api.ready(), false); assert.equal(f.value('spire_setup'), null); assert.deepEqual(f.marks, []);
  ack.resolve(response(complete('user-A', { profile: { ...complete().profile, name: 'ปอร์เช่ Porsche', birthDate: '2000-02-29', currency: 'USD' }, tutorial: { status: 'pending' } }))); await settle();
  assert.equal(f.api.ready(), true); assert.equal(f.value('spire_setup').accountComplete, true);
  assert.equal(f.value('spire_setup').name, 'ปอร์เช่ Porsche'); assert.equal(f.value('spire_setup').currency, 'USD');
  assert.equal(Object.hasOwn(f.value('spire_setup'), 'birthDate'), false);
  assert.ok(f.root().querySelector('button[data-enter]'));
});

test('account flow: failed or incomplete setup acknowledgement preserves draft without setting complete', async () => {
  for (const result of [response({ completed: false }), response({ code: 'onboarding_unavailable' }, 503)]) {
    const f = fixture({ uid: 'user-A', transport: call => call.path === '/api/onboarding' && call.method === 'POST' ? result : undefined });
    await wizardToCurrency(f); f.submit(); await settle();
    assert.equal(f.api.ready(), false); assert.equal(f.value('spire_setup'), null); assert.ok(f.root().querySelector('[name="currency"]'));
    assert.equal(f.value('spire___account_user-A_draft').name, 'ปอร์เช่ Porsche'); assert.deepEqual(f.marks, []);
  }
});

test('account flow: duplicate auth callbacks do not restart setup, tour, or overwrite the saved profile', async () => {
  const f = fixture({ uid: 'user-A', pathname: '/', server: complete('user-A', { tutorial: { status: 'skipped' } }) }); await settle();
  const calls = f.calls.length, before = f.store.get('spire_setup');
  for (let i = 0; i < 6; i++) f.switchAccount('user-A'); await settle();
  assert.equal(f.calls.length, calls); assert.equal(f.store.get('spire_setup'), before);
  assert.equal(f.tours.length, 0); assert.equal(f.root().hidden, true);
});

test('account flow: pending tutorial starts on home only and skip persists once to the server', async () => {
  const f = fixture({ uid: 'user-A', pathname: '/', server: complete('user-A', { tutorial: { status: 'pending' } }) }); await settle();
  assert.equal(f.tours.length, 1); assert.equal(await f.tours[0].finish('skipped'), true);
  assert.equal(f.calls.filter(call => call.path === '/api/onboarding/tutorial').length, 1);
  assert.equal(f.value('spire___account_user-A_status').tutorial.status, 'skipped');
  f.switchAccount('user-A'); await settle(); assert.equal(f.tours.length, 1);
  const privatePage = fixture({ uid: 'user-A', server: complete('user-A', { tutorial: { status: 'pending' } }) }); await settle();
  assert.equal(privatePage.tours.length, 0);
});

test('account flow: unavailable OTP stays in the email form and never claims a code was sent', async () => {
  const f = fixture({ pathname: '/login', transport: call => call.path === '/api/auth/config' ? response({ emailOtpReady: false, otpLength: 6 }) : call.path === '/api/auth/email/request' ? response({ code: 'auth/unavailable' }, 503) : undefined });
  f.click('data-provider=email'); f.fill({ email: 'person@unit.test' }); f.submit(); await settle();
  assert.ok(f.root().querySelector('[name="email"]')); assert.equal(f.root().querySelector('[name="code"]'), null);
  assert.doesNotMatch(f.root().innerHTML, /Code sent to|ส่งรหัสไปที่/); assert.equal(f.customTokens.length, 0);
});

test('account flow: email code state appears after acknowledgement and only six digits can be verified', async () => {
  const pending = deferred(), f = fixture({ pathname: '/login', transport: call => call.path === '/api/auth/email/request' ? pending.promise : undefined });
  f.click('data-provider=email'); f.fill({ email: 'person@unit.test' }); f.submit(); await settle();
  assert.equal(f.root().querySelector('[name="code"]'), null); assert.doesNotMatch(f.root().innerHTML, /Code sent to|ส่งรหัสไปที่/);
  pending.resolve(response({ challengeId: 'unit-only-challenge', expiresIn: 600, resendAfter: 60 })); await settle();
  const field = f.root().querySelector('[name="code"]'); assert.ok(field);
  assert.equal(field.getAttribute('autocomplete'), 'one-time-code'); assert.equal(field.getAttribute('pattern'), '[0-9]{6}');
  f.fill({ code: '12345' }); f.submit(); await settle(); assert.equal(f.calls.some(call => call.path === '/api/auth/email/verify'), false);
  f.fill({ code: '012345' }); f.submit(); await settle();
  assert.equal(f.calls.find(call => call.path === '/api/auth/email/verify').body.code, '012345');
  assert.deepEqual(f.customTokens, ['unit-only-custom-token']);
});

test('account flow: safe destinations reject external URLs and backslashes while retaining LINE job queries', () => {
  const { api } = fixture();
  for (const next of ['https://evil.unit.test/garage', '//evil.unit.test/chat', 'javascript:alert(1)', 'data:text/html,hi', '/not-a-page', '/garage\\?job=1', '\\garage', '/\\evil.unit.test/garage']) assert.equal(api.safeNext(next), '/', next);
  assert.equal(api.safeNext('/tech.html?jobId=abc%2Fdef&openExternalBrowser=1#job'), '/tech?jobId=abc%2Fdef&openExternalBrowser=1#job');
  assert.equal(api.safeNext('/garage.html?car=mine'), '/garage?car=mine');
  assert.equal(api.safeNext('/index.html'), '/');
});

test('account flow: a projection-save caller cannot complete setup locally or overwrite profile before acknowledgement', async () => {
  const ack = deferred(), f = fixture({ uid: 'user-A', server: complete(), transport: call => call.path === '/api/onboarding/preferences' ? ack.promise : undefined }); await settle();
  const before = f.store.get('spire_setup');
  f.window.spireSetupSave({ name: 'Changed', birthDate: '2001-01-01', uid: 'foreign', accountComplete: false, completed: false }); await settle();
  assert.equal(f.store.get('spire_setup'), before); assert.deepEqual(f.marks, []);
  const posted = f.calls.find(call => call.path === '/api/onboarding/preferences');
  assert.equal(posted.uid, 'user-A'); assert.deepEqual(posted.body, { name: 'Changed' });
  ack.resolve(response(complete('user-A', { profile: { ...complete().profile, name: 'Changed' } }))); await settle();
  assert.equal(f.value('spire_setup').name, 'Changed'); assert.equal(f.value('spire_setup').uid, 'user-A');
  assert.equal(Object.hasOwn(f.value('spire_setup'), 'birthDate'), false); assert.equal(f.api.ready(), true);
});

test('account flow: a legacy setup-save call cannot mark an incomplete account as ready', async () => {
  const f = fixture({ uid: 'user-A' }); await settle();
  f.window.spireSetupSave({ uid: 'user-A', v: 3, accountComplete: true, completed: true, name: 'Unconfirmed', birthDate: '2000-02-29' }); await settle();
  assert.equal(f.api.ready(), false); assert.equal(f.value('spire_setup'), null); assert.deepEqual(f.marks, []);
  assert.equal(f.calls.filter(call => call.path === '/api/onboarding/preferences').length, 0);
  assert.ok(f.root().querySelector('[name="terms"]'));
});

test('account flow: delayed preference acknowledgement cannot replace a different signed-in account', async () => {
  const ack = deferred(), f = fixture({ uid: 'user-A', server: uid => complete(uid), transport: call => call.path === '/api/onboarding/preferences' ? ack.promise : undefined }); await settle();
  f.window.spireSetupSave({ name: 'Old account edit' }); await settle();
  f.switchAccount('user-B'); await settle();
  ack.resolve(response(complete('user-A', { profile: { ...complete().profile, name: 'Old account edit', birthDate: '1980-01-01' } }))); await settle();
  assert.equal(f.value('spire_setup').uid, 'user-B'); assert.equal(f.value('spire_setup').name, 'Account user-B');
  assert.equal(JSON.stringify(f.value('spire_setup')).includes('1980-01-01'), false); assert.deepEqual(f.marks, []);
});

test('account flow: a timed-out first account lookup opens retry and ignores its later success', async () => {
  const late = deferred(), f = fixture({ uid: 'user-A', transport: call => call.path === '/api/onboarding' ? late.promise : undefined }); await settle();
  f.advance(15_001); await settle();
  assert.equal(f.api.ready(), false); assert.ok(f.root().querySelector('button[data-retry]'));
  assert.equal(f.root().querySelector('[name="terms"]'), null);
  late.resolve(response(complete())); await settle();
  assert.equal(f.api.ready(), false); assert.equal(f.value('spire_setup'), null);
  assert.ok(f.root().querySelector('button[data-retry]'));
});

test('account flow: missing Firebase proxy provider method redirects to a safe dedicated login', async () => {
  const f = fixture({ proxyAuth: true, pathname: '/garage', search: '?jobId=123' });
  f.click('data-provider=google'); await settle();
  assert.equal(f.navigations.length, 1);
  const dest = new URL(f.navigations[0], 'https://cendon.unit.test');
  assert.equal(dest.pathname, '/login'); assert.equal(dest.searchParams.get('next'), '/garage?jobId=123');
  const helper = fixture({ proxyAuth: true, pathname: '/tech' });
  helper.api.openLogin('/tech?jobId=123'); await settle();
  const next = new URL(helper.navigations[0], 'https://cendon.unit.test');
  assert.equal(next.pathname, '/login'); assert.equal(next.searchParams.get('next'), '/tech?jobId=123');
});

test('account flow: unsupported translation copy falls back to English while retaining selected app locale', async () => {
  const f = fixture({ uid: 'user-A' }); await settle();
  f.fill({ terms: true, privacy: true }); f.submit(); f.fill({ name: 'Porsche' }); f.submit();
  f.fill({ day: 2, month: 4, year: 1995 }); f.submit(); f.fill({ lang: 'ja' }, 'change');
  assert.match(f.root().innerHTML, /Your familiar language/);
  f.submit(); assert.match(f.root().innerHTML, /Distance that makes sense/);
});

test('account flow: incomplete or foreign completion acknowledgements never release the gate', async () => {
  for(const server of [complete('user-B'),complete('user-A',{profile:null}),complete('user-A',{completed:'true'})]){
    const f=fixture({uid:'user-A',server});await settle();
    assert.equal(f.api.ready(),false);assert.equal(f.value('spire_setup'),null);
    assert.ok(f.root().querySelector('button[data-retry]'));
  }
});

test('account flow: deep car/chat and LINE destinations stay internal and are retained',()=>{
  const f=fixture();
  for(const path of ['/garage/car-A/spec','/chat/session-A','/tech/shop-A/reviews','/jobs/job-A?from=line#quote'])assert.equal(f.api.safeNext(path),path);
  for(const path of ['/api/admin/config','https://outside.test/garage/car-A','/garage\\outside','//outside.test/garage'])assert.equal(f.api.safeNext(path),'/');
});

test('account flow: duplicate SDK-ready event cannot reopen a completed account overlay', async()=>{
  const f=fixture({uid:'user-A',server:complete()});await settle();assert.equal(f.root().hidden,true);
  const before=f.calls.length;
  f.document.dispatchEvent({type:'cendon:auth-ready'});
  await settle();assert.equal(f.api.ready(),true);assert.equal(f.root().hidden,true);assert.equal(f.calls.length,before);
});

test('account flow: email challenge survives refresh without storing the verification code',async()=>{
  const sessionStore=new Map();let f=fixture({pathname:'/login',sessionStore});await settle();
  f.click('data-provider=email');f.fill({email:'preview@example.test'});f.submit();await settle();
  f.fill({code:'123456'});
  const checkpoint=JSON.parse(sessionStore.get('cendon_email_challenge'));
  assert.equal(checkpoint.email,'preview@example.test');assert.ok(checkpoint.id);
  assert.equal(Object.hasOwn(checkpoint,'code'),false);assert.equal(JSON.stringify(checkpoint).includes('123456'),false);
  for(let i=0;i<6;i++){f=fixture({pathname:'/login',sessionStore});await settle();assert.ok(f.root().querySelector('[name="code"]'));assert.equal(f.root().querySelector('[name="code"]').value,'');}
  f.click('data-change-email');assert.equal(sessionStore.has('cendon_email_challenge'),false);assert.ok(f.root().querySelector('[name="email"]'));
});

test('account flow: resend cooldown only enables resend and does not erase entered digits',async()=>{
  const f=fixture({pathname:'/login'});await settle();f.click('data-provider=email');f.fill({email:'preview@example.test'});f.submit();await settle();
  f.fill({code:'๑๒๓'});assert.equal(f.root().querySelector('[name="code"]').value,'123');
  f.advance(60000);assert.equal(f.root().querySelector('[name="code"]').value,'123');assert.equal(f.root().querySelector('[data-resend]').disabled,false);
});

test('account flow: sign out remains available without accepting the onboarding agreement',async()=>{
  const f=fixture({uid:'user-A',pathname:'/login'});await settle();f.click('data-switch-account');await settle();
  assert.equal(f.auth.currentUser,null);assert.equal(f.api.ready(),false);assert.ok(f.root().querySelector('[data-provider="google"]'));
  assert.equal(f.calls.some(c=>c.path==='/api/onboarding'&&c.method==='POST'),false);
});

test('account flow: tour cannot finish on a missing or foreign server acknowledgement',async()=>{
  for(const ack of [{},complete('user-B',{tutorial:{status:'skipped'}}),complete('user-A',{tutorial:{status:'pending'}})]){
    const f=fixture({uid:'user-A',pathname:'/',server:complete('user-A',{tutorial:{status:'pending'}}),transport:c=>c.path==='/api/onboarding/tutorial'?response(ack):undefined});await settle();
    await assert.rejects(f.tours[0].finish('skipped'),/onboarding_unavailable/);
    assert.equal(f.value('spire___account_user-A_status').tutorial.status,'pending');
  }
});

test('account assets resolve from the root before a deep-link base element and old wizard copies are removed',()=>{
  for(const file of ['index','garage','chat','news','spares','profile','admin','handbook','plan']){
    const html=readFileSync(new URL('../'+file+'.html',import.meta.url),'utf8');
    for(const name of ['account.css','account.js','account-actions.js','cendon-tour.js'])assert.match(html,new RegExp('(?:href|src)="/'+name.replace('.','\\.')+'"'),file+': '+name);
    assert.doesNotMatch(html,/id="setup(?:js|css)"/,file);
  }
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  for(const name of ['account.css','account.js','account-actions.js','auth-bootstrap.js','cendon-tour.js'])assert.ok(sw.includes("'./"+name+"'"),name+' precached');
});

test('account flow: unconfigured email is visibly unavailable and cannot claim delivery',async()=>{
  const f=fixture({pathname:'/login',transport:c=>c.path==='/api/auth/config'?response({emailOtpReady:false}):undefined});await settle();
  assert.equal(f.root().querySelector('[data-provider="email"]').disabled,true);
  assert.match(f.root().innerHTML,/รหัสทางอีเมลยังไม่เปิดใช้งาน/);
  f.click('data-provider=email');assert.equal(f.root().querySelector('[name="email"]'),null);
  assert.equal(f.calls.some(c=>c.path==='/api/auth/email/request'),false);
});

test('account flow: missing approved policy never opens a consent form or grants completion',async()=>{
  const f=fixture({uid:'user-A',server:{...required(),policy:{enabled:false,privacyUrl:null}}});await settle();
  assert.equal(f.api.completed(),false);assert.equal(f.api.ready(),false);assert.equal(f.root().querySelector('[name="terms"]'),null);
  assert.ok(f.root().querySelector('button[data-retry]'));
});

test('account flow: under-18 birthday stays on the date step and birthday fields never persist in a draft',async()=>{
  const f=fixture({uid:'user-A'});await settle();f.fill({terms:true,privacy:true});f.submit();f.fill({name:'Cendon Test'});f.submit();
  f.fill({day:1,month:1,year:2010});f.submit();assert.ok(f.root().querySelector('[name="year"]'));assert.match(f.root().innerHTML,/18 ปี/);
  const draft=f.value('spire___account_user-A_draft');for(const key of ['day','month','year','birthDate'])assert.equal(Object.hasOwn(draft,key),false);
  assert.equal(f.calls.some(c=>c.path==='/api/onboarding'&&c.method==='POST'),false);
});

test('legacy decorated login art is absent from both the dedicated login and native chat login pane',()=>{
  const html=readFileSync(new URL('../login.html',import.meta.url),'utf8');assert.doesNotMatch(html,/class="stage"|class="cmk"|id="bGoogle"/);
  const chat=readFileSync(new URL('../chat.html',import.meta.url),'utf8');const pane=chat.match(/<section[^>]*id="v-login"[\s\S]*?<\/section>/)[0];assert.doesNotMatch(pane,/logo-halo|big-logo|<svg|login\.google/);
});
