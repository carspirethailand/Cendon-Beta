import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../page-core.js',import.meta.url),'utf8');
function fixture({uid='fixture',owner='fixture',token=true,handlers=true}={}){
 const events=[],listeners={},window={CendonView:{},frameElement:{dataset:{cendonView:'garage'}},CendonScope:{owner:()=>owner},spireAuth:{currentUser:uid?{uid,...token?{getIdToken:async()=>''}:{}}:null},openAddCar:handlers?()=>{}:null,openCarDetail:()=>{},Nav:{started:true},CendonGarageRules:{},CendonGarageData:{},spireGuard:{}},document={getElementById:id=>id==='garageList'?{}:id==='gAdd'?{onclick:handlers?()=>{}:null}:null,dispatchEvent:e=>events.push(e.type),addEventListener:(n,f)=>listeners[n]=f};
 vm.runInNewContext(source,{window,document,Event:class{constructor(type){this.type=type}},setTimeout});return {window,events};
}
test('early foreground readiness requires a real live identity, matching owner and wired primary form',()=>{
 const good=fixture();assert.equal(good.window.CendonPageCore.ready(),true);assert.deepEqual(good.events,['cendon:primary-ready']);
 for(const props of [{uid:null},{owner:'another-account'},{token:false},{handlers:false}])assert.equal(fixture(props).window.CendonPageCore.ready(),false);
 delete good.window.spireGuard;assert.equal(good.window.CendonPageCore.ready(),false,'early form must not lose its validators');
});
test('early presentation never overrides account gates or deep-route readiness',()=>{
 const bridge=readFileSync(new URL('../app-navigation-bridge.js',import.meta.url),'utf8');
 assert.ok(bridge.includes("path===base&&!W.location.search&&W.CendonPageCore?.ready()"));assert.ok(bridge.includes("r.dataset.gate!=='1'&&r.dataset.level!=='pending'"));
 assert.ok(bridge.includes("Date.now()-began<18000"));assert.ok(bridge.includes("!frame.classList.contains('is-active')"));
});
test('Home decorative work respects logical visibility independently of a background call',()=>{
 const home=readFileSync(new URL('../index.html',import.meta.url),'utf8'),fx=readFileSync(new URL('../fx3d.js',import.meta.url),'utf8');
 assert.ok(home.includes('CendonView.visible'));assert.ok(fx.includes('CendonView.visible'));assert.ok(home.includes('cancelIdleCallback'));
 const skyStart=home.indexOf('const HSKY='),sky=home.slice(skyStart,home.indexOf('/* ═══ ช่องค้นหา',skyStart));assert.ok(sky.includes('!foreground()'));assert.ok(sky.includes('CendonView.visible'),'the previous Home stops drawing particles while the next view loads');
});
