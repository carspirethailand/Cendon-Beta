/* Amounts are entered in the selected display currency; storage/API stay THB.
   Each open field keeps its own rate snapshot. Never reinterpret edited values. */
((W,D)=>{
'use strict';if(W.CendonMoneyFields)return;
const IDS=new Set(['gP','ssMin','xL','xP','qL','qP','qT','aF','oL','oP','oT','sF','pBud']);
const states=new WeakMap();
const uid=()=>W.spireAuth?.currentUser?.uid||W.auth?.currentUser?.uid||null;
const pref=()=>W.CendonDisplayPrefs?.prefs().currency||'THB';
const fx=c=>c==='THB'?1:W.CendonDisplayPrefs?.rate(c);
const t=(th,en)=>W.spireT?W.spireT(th,en):th;
function bind(el){
  if(states.has(el))return;
  const label=el.closest('label'),title=label?.querySelector(':scope>span');
  const s={uid:uid(),currency:'THB',rate:1,dirty:false,original:el.value,min:el.getAttribute('min')??'0',max:el.getAttribute('max')??'1000000'};states.set(el,s);
  el.dataset.moneyInput='';el.dataset.money='1';el.step='0.01';
  if(title){
    const walker=D.createTreeWalker(title,NodeFilter.SHOW_TEXT);let n;
    while(n=walker.nextNode())n.nodeValue=n.nodeValue.replace(/\(?\s*(?:บาท|THB|฿)\s*\)?/g,' ').trim();
    const code=D.createElement('b');code.className='nt';code.dataset.moneyCode='';code.style.cssText='margin-inline-start:6px;font:inherit';title.append(code);s.code=code;
  }
  if(label){const note=D.createElement('small');note.dataset.moneyNote='';note.style.cssText='display:block;font-size:12px;line-height:1.5;color:var(--muted,#71717a)';label.append(note);s.note=note;}
  const apply=()=>{
    if(!el.isConnected||s.dirty||s.uid!==uid())return;
    const c=pref(),r=fx(c);s.currency=r?c:'THB';s.rate=r||1;
    el.dataset.moneyCurrency=s.currency;if(s.code)s.code.textContent=s.currency;
    el.value=s.original===''?'':String(Math.round(Number(s.original)*s.rate*100)/100);
    if(s.min!=null)el.min=String(Number(s.min)*s.rate);
    if(s.max!=null)el.max=String(Math.round(Number(s.max)*s.rate*100)/100);
    const prefix=el.closest('.pb-in')?.querySelector(':scope>b');if(prefix)prefix.hidden=true;
    if(s.note)s.note.textContent=c!=='THB'&&!r?t('อัตรา '+c+' ยังไม่พร้อม ช่องนี้ใช้ THB ชั่วคราว',c+' rate unavailable; this field uses THB for now'):s.currency==='THB'?'':t('กรอก '+s.currency+' · 1 THB = '+s.rate+' '+s.currency+' · บันทึกเป็น THB ด้วยอัตรานี้','Enter '+s.currency+' · 1 THB = '+s.rate+' '+s.currency+' · saved in THB at this rate');
    s.applying=true;el.dispatchEvent(new Event('input',{bubbles:true}));s.applying=false;
  };
  el.addEventListener('input',()=>{if(!s.applying)s.dirty=true});apply();
  if(pref()!=='THB'&&!fx(pref()))W.CendonDisplayPrefs?.sync().then(apply);
}
function mount(root=D){root.querySelectorAll('input').forEach(el=>{if(IDS.has(el.id)||el.hasAttribute('data-money-input'))bind(el)})}
function read(id){
  const el=typeof id==='string'?D.getElementById(id):id;if(!el)return 0;bind(el);
  const s=states.get(el);if(s.uid&&s.uid!==uid())throw Error(t('บัญชีเปลี่ยนแล้ว กรุณาเปิดฟอร์มใหม่','Account changed. Reopen the form.'));
  const value=Number(el.value||0);if(!Number.isFinite(value)||value<0||(el.value!==''&&(value<Number(el.min)||value>Number(el.max))))throw Object.assign(Error(t('กรอกจำนวนเงินในช่วงที่ระบุ ('+s.currency+')','Enter an amount within the displayed limits ('+s.currency+')')),{form:[{id:el.id,msg:t('กรอกจำนวนเงินในช่วงที่ระบุ ('+s.currency+')','Enter an amount within the displayed limits ('+s.currency+')')}]});
  return Math.round(value/s.rate*100)/100;
}
function total(ids){
  const els=ids.map(id=>D.getElementById(id)).filter(Boolean);els.forEach(bind);
  const s=states.get(els[0]),currency=s?.currency||'THB',rate=s?.rate||1;
  const value=els.reduce((sum,el)=>{const n=Number(el.value||0);return sum+(Number.isFinite(n)&&n>=0?n/states.get(el).rate:0)},0)*rate;
  return new Intl.NumberFormat(W.spireLang?.()||'en',{style:'currency',currency,currencyDisplay:'code',maximumFractionDigits:2}).format(value);
}
W.CendonMoneyFields=Object.freeze({mount,read,total});
})(window,document);
