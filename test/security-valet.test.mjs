import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../call-agent.js',import.meta.url),'utf8');
function fixture(){
  let sent=0,card;const V={T:(_,en)=>en,on:()=>true,findCar:()=>null,shopName:x=>x.name,
    shops:async()=>[{id:'real-shop',name:'Fixture shop'}],message:async()=>{sent++;return{url:'/chat'}},carLabel:()=>''};
  const W={CendonValetCore:V};vm.runInNewContext(source,{window:W,Date,Map,Math,Number,JSON,String,Promise,Error,setTimeout});
  const A=W.CendonCallAgent.create({showValet:c=>card=c});return{A,sent:()=>sent,card:()=>card,ctx:{signal:{aborted:false},isCurrent:()=>true}};
}
test('voice Valet: silence, unrelated speech and refusal cannot authorize sending to a mechanic',async()=>{
  for(const answer of ['', 'ไม่ส่งครับ','อย่าส่ง','no','not now','what is the weather','ขอถามอย่างอื่นก่อน']){
    const f=fixture(),p=await f.A.execute('valet',{do:'msg_shop',shop_id:'real-shop',text:'Synthetic test draft'},f.ctx);
    assert.equal(p.missing.length,0);f.A.heard(Date.now()+1000,answer);
    const result=await f.A.execute('valet_confirm',{pending_id:p.pending_id},f.ctx);
    assert.ok(result.error,answer);assert.equal(f.sent(),0,answer);
  }
});
test('voice Valet: an explicit yes or actual Confirm tap runs exactly once',async()=>{
  for(const how of ['yes','ส่งเลยครับ','tap']){
    const f=fixture(),p=await f.A.execute('valet',{do:'msg_shop',shop_id:'real-shop',text:'Synthetic test draft'},f.ctx);
    if(how==='tap')await f.card().onConfirm();else{f.A.heard(Date.now()+1000,how);assert.equal((await f.A.execute('valet_confirm',{pending_id:p.pending_id},f.ctx)).done,true)}
    await f.A.execute('valet_confirm',{pending_id:p.pending_id},f.ctx);assert.equal(f.sent(),1,how);
  }
});
