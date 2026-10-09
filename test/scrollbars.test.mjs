import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const css=readFileSync(new URL('stability.css',root),'utf8');
test('every rendered app page loads shared scrollbar styling before first paint',()=>{
  for(const file of readdirSync(root).filter(name=>name.endsWith('.html'))){
    const html=readFileSync(new URL(file,root),'utf8');
    if(/location\.replace\(/.test(html)&&html.length<1000)continue;
    const link=html.indexOf('href="stability.css"');
    assert.ok(link>=0&&link<html.indexOf('</head>'),file);
  }
});
test('scrollbar chrome is hidden on both axes without changing overflow or input',()=>{
  const rules=css.slice(css.indexOf('/* Hide only'),css.indexOf('@media'));
  assert.match(rules,/html,body,\*\{scrollbar-width:none!important/);
  assert.match(rules,/\*::-webkit-scrollbar\{display:none!important;width:0!important;height:0!important\}/);
  assert.ok(!/overflow\s*:|touch-action\s*:|pointer-events\s*:|position\s*:/.test(rules));
});
