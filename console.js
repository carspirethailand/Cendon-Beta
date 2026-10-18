/* Public, unlisted catalogue only. No account reads, analytics or API calls. */
(() => {
  'use strict';
  const D=document,input=D.getElementById('toolSearch'),sections=[...D.querySelectorAll('.tool-section')],buttons=[...D.querySelectorAll('[data-filter]')];
  let category='all';
  const normalize=value=>String(value||'').normalize('NFKC').toLocaleLowerCase('th').replace(/\s+/g,' ').trim();
  function filter(){
    const words=normalize(input.value).split(' ').filter(Boolean);let count=0;
    for(const section of sections){let visible=0;for(const link of section.querySelectorAll('.tool')){
      const show=(category==='all'||section.dataset.group===category)&&words.every(w=>normalize(link.dataset.search).includes(w));
      link.hidden=!show;if(show){visible++;count++;}
    }section.hidden=visible===0;}
    for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.filter===category));
    D.getElementById('toolCount').textContent=count+' เครื่องมือ';D.getElementById('emptyTools').hidden=count!==0;
  }
  input.addEventListener('input',filter);
  for(const button of buttons)button.addEventListener('click',()=>{category=button.dataset.filter;filter();});
  D.getElementById('resetTools').addEventListener('click',()=>{category='all';input.value='';filter();input.focus();});
  D.addEventListener('keydown',event=>{if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!/^(INPUT|TEXTAREA|SELECT)$/.test(D.activeElement?.tagName||'')&&!D.activeElement?.isContentEditable){event.preventDefault();input.focus();}});
  filter();
})();
