import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../call-agent.js',import.meta.url),'utf8');
function fixture(){
 const calls=[],notices=[];let confirm,cancel,current=true;const window={CendonCallActivity:{create:()=>({task(){},reset(){cancel?.()},confirmation(d,yes,no){confirm=yes;cancel=no;return true}})}};vm.runInNewContext(source,{window,AbortController,setTimeout,clearTimeout});
 const host={notify:r=>notices.push(r),api:async(path,opts)=>{calls.push({path,opts});if(path==='/api/tech')return{techs:[{id:'real',verified:true,shop:'Approved shop'}]};if(path==='/api/tech/agent')return{status:'pending_confirmation',id:'action-id',confirmToken:'UI_SECRET_NOT_FOR_MODEL',preview:{shopId:'real',shopName:'Approved shop',message:'Test only draft'}};return{status:'sent',threadId:'own-thread',messageId:1}}};
 const agent=window.CendonCallAgent.create(host),ctx={signal:new AbortController().signal,isCurrent:()=>current};return{agent,ctx,calls,notices,confirm:()=>confirm(),stop:()=>{current=false}};
}
test('AI prepares only a searched shop message; model response never receives UI secret and no send occurs until UI confirmation',async()=>{
 const f=fixture();assert.ok((await f.agent.execute('prepare_mechanic_message',{shop_id:'forged',message:'x'},f.ctx)).error);assert.equal(f.calls.length,0);
 await f.agent.execute('find_mechanics',{},f.ctx);const r=await f.agent.execute('prepare_mechanic_message',{shop_id:'real',message:'Test only draft'},f.ctx);assert.equal(r.status,'pending_confirmation');assert.ok(!JSON.stringify(r).includes('UI_SECRET'));assert.ok(!f.calls.some(x=>x.path.endsWith('/confirm')));
 await f.confirm();assert.equal(f.calls.filter(x=>x.path.endsWith('/confirm')).length,1);assert.equal(f.notices[0].status,'sent');
});
test('ended/replaced call cannot confirm a stale draft, and arbitrary execution/admin tools remain unsupported',async()=>{
 const f=fixture();await f.agent.execute('find_mechanics',{},f.ctx);await f.agent.execute('prepare_mechanic_message',{shop_id:'real',message:'Test'},f.ctx);f.stop();await assert.rejects(f.confirm());assert.ok(!f.calls.some(x=>x.path.endsWith('/confirm')));
 const g=fixture();for(const tool of ['execute','fetch','admin','send_mechanic_message','confirm','delete_car'])assert.ok((await g.agent.execute(tool,{},g.ctx)).error);assert.equal(g.calls.length,0);
});
