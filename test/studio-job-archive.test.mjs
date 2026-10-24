import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('const techJobClosed='),end=html.indexOf('let JOB_ARCHIVE_PENDING=',start),ctx={};
vm.runInNewContext(html.slice(start,end)+';this.closed=techJobClosed;this.hidden=techJobHidden',ctx);
test('only closed mechanic jobs can be hidden; sign-off, disputes, customer/admin work stay visible',()=>{
  for(const side of ['technician','both','customer','admin'])for(const status of ['completed','cancelled','requested','quoted','accepted','enroute','working','done','disputed']){
    const allowed=['technician','both'].includes(side)&&['completed','cancelled'].includes(status);
    assert.equal(ctx.closed({side,status}),allowed);assert.equal(ctx.hidden({side,status,archived:true}),allowed);assert.equal(ctx.hidden({side,status,archived:false}),false);
  }
});
test('archive actions use the authenticated endpoint, never delete jobs or store hiding in local browser state',()=>{
  const a=html.slice(html.indexOf('async function archiveTechJobs('),html.indexOf('/* คำขอ/ข้อเสนอที่ยังไม่ตกลงกัน',start));
  assert.match(a,/api\("\/api\/tech\/jobs\/archive",\{body:\{ids:rows\.map/);assert.match(a,/U\?\.uid===owner&&myShop\(\)\?\.id===shop/);assert.match(a,/\+\+JOBS_EPOCH/);assert.doesNotMatch(a,/localStorage|DELETE|\/delete/);
  assert.match(html,/epoch!==JOBS_EPOCH/);assert.match(html,/all\|\|!techJobHidden\(j\)/);assert.match(html,/data-restore/);
});
