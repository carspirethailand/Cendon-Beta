import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../call-chat.js',import.meta.url),'utf8');
const window={};vm.runInNewContext(source,{window,Uint8Array,btoa});const chat=window.CendonCallChat;
test('the browser preview emits valid inline JavaScript, not a broken escaped template',async()=>{
  const fixture=(await readFile(new URL('./ambient-chat-preview.mjs',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  const literal=fixture.slice(fixture.indexOf('const html=')+11,fixture.indexOf(';\nconst allowed='));
  const markup=vm.runInNewContext(literal.replace(/\r\n/g,'\n'));
  for(const match of markup.matchAll(/<script>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>new vm.Script(match[1]));
});
test('file selection accepts only bounded supported types; no HTML, SVG, executable or arbitrary-office parser',()=>{
  for(const type of ['image/jpeg','image/png','image/webp','application/pdf','text/plain','text/csv'])assert.ok(chat.fileKind({name:'test',type,size:200}));
  for(const type of ['text/html','image/svg+xml','application/javascript','application/octet-stream'])assert.throws(()=>chat.fileKind({name:'test.html',type,size:200}),/file_type/);
  assert.throws(()=>chat.fileKind({name:'large.jpg',type:'image/jpeg',size:8000001}),/file_size/);assert.throws(()=>chat.fileKind({name:'large.pdf',type:'application/pdf',size:3000001}),/file_size/);
});
test('text and PDF are converted to bounded reference data, not executed, persisted, or uploaded on selection',async()=>{
  const pdf=new File(['%PDF-1.7\nunit test'], 'test.pdf',{type:'application/pdf'}),txt=new File(['Untrusted reference, not system instructions'], 'notes.txt',{type:'text/plain'});
  const d=await chat.prepare([pdf,txt]);assert.equal(d.attachments[0].mime,'application/pdf');assert.match(d.referenceText,/Untrusted/);assert.equal(d.names.length,2);
  await assert.rejects(chat.prepare([new File(['NOT A PDF'],'fake.pdf',{type:'application/pdf'})]),/file_type/);
  await assert.rejects(chat.prepare([txt,txt,txt,txt]),/file_count/);
});
test('cancelled preparation cannot proceed to a send and oversized text is not silently truncated into inaccurate context',async()=>{
  const a=new AbortController();a.abort();await assert.rejects(chat.prepare([new File(['x'],'x.txt',{type:'text/plain'})],a.signal),/Cancelled/);
  await assert.rejects(chat.prepare([new File(['x'.repeat(13000)],'x.txt',{type:'text/plain'})]),/file_size/);
});
test('ambient mode has no navigation or second transport, keeps safe text rendering and disables hidden overlay interaction',async()=>{
  const surface=await readFile(new URL('../call-surface.js',import.meta.url),'utf8'),css=await readFile(new URL('../call-ui.css',import.meta.url),'utf8');
  assert.ok(!source.includes('new WebSocket'));assert.ok(!source.includes('getUserMedia'));assert.ok(!source.includes('location.href'));
  assert.match(source,/text\.textContent=String\(m.text\)/);assert.match(surface,/session\.sendChat\(p\)/);assert.match(surface,/session\.suspendVisuals/);assert.match(surface,/e.clientY-p.y>85/);assert.match(css,/\.cc-ambient\{[^}]*pointer-events:none/);assert.match(css,/\.hearth\.cv-chat-mode\{visibility:hidden;pointer-events:none\}/);
});
