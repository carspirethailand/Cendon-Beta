import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
function fixture(){const preference={uid:'one',distance:'mi',currency:'USD'},listeners={};const window={spireAuth:{currentUser:{uid:'one'}},spireSetupRead:()=>preference,spireLang:()=> 'en',addEventListener:(name,fn)=>listeners[name]=fn};
  const requests=[];const context={window,document:{readyState:'loading',addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},Intl,Date,AbortSignal,requestAnimationFrame:()=>0,fetch:async(url,options)=>{requests.push({url,options});return{ok:true,json:async()=>({result:'success',base_code:'THB',rates:{THB:1,USD:.03},time_last_update_unix:Math.floor(Date.now()/1000)})}}};vm.createContext(context);vm.runInContext(read('display-prefs.js'),context);return{api:window.CendonDisplayPrefs,window,preference,requests};}
test('distance presentation converts values and ranges but never labels unchanged kilometres as miles',()=>{
  const {api,preference}=fixture();assert.equal(api.distance(1609.344),'1,000 mi');assert.equal(api.transform('160.9344–321.8688 km'),'100–200 mi');
  assert.equal(api.transform('1.000.000 km'),'1.000.000 km','ambiguous number representations must not be partially converted');
  preference.distance='km';assert.equal(api.distance(1609.344),'1,609.34 km');
});
test('no reference rate means explicit THB, not an invented USD conversion or changed stored amount',()=>{
  const {api,preference,window}=fixture();assert.equal(api.money(1000),'THB 1,000');assert.equal(api.transform('฿1,000'),'฿1,000');
  window.spireAuth.currentUser={uid:'two'};assert.equal(api.prefs().currency,'THB');assert.equal(api.prefs().distance,'km');assert.equal(preference.currency,'USD');
});
test('language is committed before repaint/reload, failures do not change it, and a live call is not reloaded',async()=>{
  const source=read('settings.js'),begin=source.indexOf("  if(b.hasAttribute('data-lang')){"),end=source.indexOf("  if(b.hasAttribute('data-cur'))",begin),branch=source.slice(begin,end);
  for(const mode of ['success','failed','call']){
    const actions=[],b={dataset:{lang:'fr'},disabled:false,hasAttribute:()=>true};let resolve;
    const wait=new Promise(r=>resolve=r),W={spireSavePrefs:async p=>{actions.push('save:'+p.lang);await wait;if(mode==='failed')throw Error('failed')},spireSetLang:c=>actions.push('set:'+c),CendonCallShell:{active:()=>mode==='call'},location:{reload:()=>actions.push('reload')}};
    const c={b,W,closeThen:f=>f(),render:()=>actions.push('render'),toast:()=>actions.push('notice'),t:a=>a};vm.createContext(c);
    const task=vm.runInContext('(async()=>{'+branch+'})()',c);assert.deepEqual(actions,['save:fr']);resolve();await task;
    if(mode==='failed'){assert.deepEqual(actions,['save:fr','notice']);assert.equal(b.disabled,false)}else{assert.ok(actions.indexOf('set:fr')>actions.indexOf('save:fr'));assert.equal(actions.includes('reload'),mode==='success')}
  }
});

test('a real reference rate converts scalar and range money consistently, without sending amounts or credentials',async()=>{
  const {api,requests}=fixture();await api.sync();assert.match(api.money(1000),/USD\s*30\.00/);
  assert.match(api.transform('฿100–200'),/USD\s*3\.00–≈ USD\s*6\.00/);
  assert.equal(api.transform('฿1.000.000'),'฿1.000.000','never partially convert an ambiguous grouping');
  await api.sync();assert.equal(requests.length,1);assert.ok(requests[0].url.endsWith('/api/display-rates'));
  assert.equal(requests[0].options.credentials,'omit');assert.equal(requests[0].options.referrerPolicy,'no-referrer');
});
test('the presentation module is included on every shared-settings page, and public passports stay canonical',()=>{
  for(const name of ['index','garage','chat','news','profile','spares'])assert.match(read(name+'.html'),/display-prefs\.js\?v=5/);
  assert.doesNotMatch(read('passport.html'),/display-prefs/);assert.doesNotMatch(read('display-prefs.js'),/\.setItem\(['"]spire_(garage|setup)|Authorization:|\/api\/cars/);
});
