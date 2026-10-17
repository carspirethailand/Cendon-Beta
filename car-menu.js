/* ══ เมนูเลือกรถ (ใช้ร่วมกัน: หน้าแรก · ร้านค้า) ══
   แตะปุ่มรถ → เมนูห้อยลงใต้ปุ่ม แถวสูงพอให้นิ้วแตะง่าย (≥48px) · แตะนอกเมนู/กด Esc = ปิด
   ไม่ปิดเพราะหน้าเลื่อนนิดหน่อย (มือถือแถบที่อยู่ยุบ/ขยายตอนแตะ เดิมทำให้เมนูหายก่อนเลือกได้)
   ภาพเคลื่อนไหวมาจาก drop.js (จางเข้า + เลื่อนลงนิดเดียว) */
(function(D,W){
'use strict';
const css=D.createElement('style');css.id='cmCss';
css.textContent='.cm-pop{position:absolute;z-index:1300;box-sizing:border-box;min-width:240px;max-width:min(340px,calc(100vw - 24px));padding:6px;border-radius:16px;'+
  'background:var(--surface,#fff);color:var(--ink,#09090B);box-shadow:0 0 0 1px var(--line,rgba(0,0,0,.08)),0 24px 48px -20px rgba(0,0,0,.4);font-family:Kanit,system-ui,sans-serif}'+
  '.cm-pop button,.cm-pop a{display:flex;align-items:center;gap:10px;width:100%;min-height:48px;padding:10px 12px;border:0;border-radius:12px;background:none;color:inherit;font:500 14px Kanit,system-ui,sans-serif;text-align:left;text-decoration:none;cursor:pointer;box-sizing:border-box}'+
  '.cm-pop button:hover,.cm-pop button:focus-visible,.cm-pop a:hover,.cm-pop a:focus-visible{background:var(--surface-2,#F4F4F5);outline:none}'+
  '.cm-pop .ti{font-size:18px;color:var(--muted,#71717A);flex:none}.cm-pop .ti-check{margin-left:auto;color:var(--ink,#09090B)}'+
  '.cm-pop span{min-width:0;flex:1}.cm-pop b{display:block;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cm-pop small{display:block;font-size:12px;color:var(--muted,#71717A)}'+
  '.cm-pop hr{border:0;height:1px;background:var(--line,rgba(0,0,0,.08));margin:4px 6px}';
(D.head||D.documentElement).appendChild(css);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let open=null;
function close(){if(!open)return;const o=open;open=null;o.m.remove();o.btn.setAttribute('aria-expanded','false');
  removeEventListener('pointerdown',o.off,true);D.removeEventListener('keydown',o.key,true);removeEventListener('resize',o.win)}
/* show(ปุ่ม,{cars:[{id,name,sub}],cur,onPick(id),links:[{href,icon,label}]}) — กดซ้ำที่ปุ่มเดิม = ปิด */
function show(btn,o){
  if(open){const same=open.btn===btn;close();if(same)return}
  const m=D.createElement('div');m.className='cm-pop';m.setAttribute('role','menu');
  m.innerHTML=(o.cars||[]).map(c=>`<button type="button" role="menuitemradio" aria-checked="${c.id===o.cur}" data-c="${esc(c.id)}"><i class="ti ti-car"></i><span><b>${esc(c.name)}</b>${c.sub?`<small>${esc(c.sub)}</small>`:''}</span>${c.id===o.cur?'<i class="ti ti-check"></i>':''}</button>`).join('')
    +((o.links||[]).length?'<hr>'+o.links.map(l=>`<a role="menuitem" href="${esc(l.href)}"><i class="ti ${esc(l.icon)}"></i><span><b>${esc(l.label)}</b></span></a>`).join(''):'');
  D.body.appendChild(m);btn.setAttribute('aria-expanded','true');
  const r=btn.getBoundingClientRect(),w=Math.min(Math.max(240,Math.min(r.width,340)),innerWidth-24);
  m.style.width=w+'px';m.style.top=(r.bottom+6+scrollY)+'px';m.style.left=Math.max(12,Math.min(r.left,innerWidth-w-12))+scrollX+'px';
  const st={m,btn,w0:innerWidth,
    off:e=>{if(!m.contains(e.target)&&!btn.contains(e.target))close()},
    key:e=>{if(e.key==='Escape'){e.preventDefault();close();try{btn.focus({preventScroll:true})}catch(x){}}},
    win:()=>{if(Math.abs(innerWidth-st.w0)>2)close()}};
  open=st;
  setTimeout(()=>{if(open!==st)return;addEventListener('pointerdown',st.off,true);D.addEventListener('keydown',st.key,true);addEventListener('resize',st.win)},0);
  m.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{const id=b.dataset.c;close();if(id!==o.cur&&o.onPick)o.onPick(id)});
  /* โฟกัสเฉพาะตอนใช้คีย์บอร์ด — บนมือถือการโฟกัสทำให้หน้าเลื่อน/แป้นพิมพ์กระตุก */
  if(!matchMedia('(pointer:coarse)').matches){const f=m.querySelector('[aria-checked="true"]')||m.querySelector('button,a');if(f)f.focus({preventScroll:true})}
}
W.CendonCarMenu={show,close};
})(document,window);
