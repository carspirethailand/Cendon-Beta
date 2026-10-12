/* Presentation only: never changes the selected tab, vehicle or API state. */
(function(W,D){
  'use strict';
  const mounted=new WeakMap(),mouse=W.matchMedia('(hover:hover) and (pointer:fine)'),quiet=W.matchMedia('(prefers-reduced-motion:reduce)');
  function mount(rail){
    if(!rail||rail.id!=='clTabs')return;
    const prior=mounted.get(rail);if(prior){prior.schedule(true);return}
    const shell=D.createElement('div');shell.className='cd-tabs-shell '+(rail.classList.contains('carx-tabs')?'cd-tabs-shell--carx':'cd-tabs-shell--legacy');
    const makeButton=(side)=>{const b=D.createElement('button');b.type='button';b.className='cd-tab-scroll';b.setAttribute('aria-controls',rail.id);b.innerHTML='<i class="ti ti-chevron-'+side+'" aria-hidden="true"></i>';return b};
    const prev=makeButton('left'),next=makeButton('right');
    rail.parentNode.insertBefore(shell,rail);shell.append(prev,rail,next);
    let frame=0,reveal=false;
    const tabs=()=>[...rail.querySelectorAll('.cl-tab')];
    const edges=()=>{const r=rail.getBoundingClientRect(),s=W.getComputedStyle(rail);return {left:r.left+(parseFloat(s.paddingLeft)||0),right:r.right-(parseFloat(s.paddingRight)||0)}};
    const max=()=>Math.max(0,rail.scrollWidth-rail.clientWidth);
    function scrollTo(left){const target=Math.max(0,Math.min(max(),left));rail.scrollTo({left:target,behavior:quiet.matches?'instant':'smooth'})}
    function showTab(tab){if(!tab||!rail.clientWidth)return;const b=tab.getBoundingClientRect(),e=edges();
      if(b.left<e.left-1)scrollTo(rail.scrollLeft+b.left-e.left);else if(b.right>e.right+1)scrollTo(rail.scrollLeft+b.right-e.right)}
    function update(){frame=0;
      const overflow=rail.scrollWidth>shell.clientWidth+1&&shell.clientWidth>0;
      shell.classList.toggle('has-overflow',overflow);
      const th=W.lang==='th';prev.setAttribute('aria-label',th?'เลื่อนแท็บไปทางซ้าย':'Scroll tabs left');next.setAttribute('aria-label',th?'เลื่อนแท็บไปทางขวา':'Scroll tabs right');
      for(const b of [prev,next]){b.tabIndex=overflow&&mouse.matches?0:-1;b.setAttribute('aria-hidden',String(!overflow||!mouse.matches))}
      prev.disabled=rail.scrollLeft<=1;next.disabled=rail.scrollLeft>=max()-1;
      if(reveal){reveal=false;showTab(rail.querySelector('.cl-tab[aria-selected="true"]'))}
    }
    function schedule(selected=false){reveal=reveal||selected;if(!frame)frame=W.requestAnimationFrame(update)}
    function step(dir){const e=edges(),a=tabs(),page=Math.max(1,e.right-e.left),left=rail.scrollLeft;
      // Move a viewport, keeping the partially hidden boundary tab in the
      // next view. A normal desktop rail reaches the far end in one click.
      const tab=dir>0?a.find(t=>t.getBoundingClientRect().right>e.right+1):a.reverse().find(t=>t.getBoundingClientRect().left<e.left-1);
      if(!tab)scrollTo(dir>0?max():0);
      else{const b=tab.getBoundingClientRect(),boundary=left+(dir>0?b.left-e.left:b.right-e.right);
        scrollTo(dir>0?Math.min(left+page,Math.max(left+1,boundary)):Math.max(left-page,Math.min(left-1,boundary)))}
      schedule()}
    prev.addEventListener('click',()=>step(-1));next.addEventListener('click',()=>step(1));
    rail.addEventListener('scroll',()=>schedule(),{passive:true});
    rail.addEventListener('focusin',e=>showTab(e.target.closest('.cl-tab')));
    const changes=new W.MutationObserver(()=>schedule(true));changes.observe(rail,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-selected']});
    let observedWidth=rail.clientWidth;
    const resized=()=>{const width=rail.clientWidth,changed=width!==observedWidth;observedWidth=width;schedule(changed)};
    if(W.ResizeObserver){const size=new W.ResizeObserver(resized);size.observe(shell);size.observe(rail)}else W.addEventListener('resize',resized,{passive:true});
    mouse.addEventListener?.('change',()=>schedule(true));
    D.fonts?.ready.then(()=>schedule(true));
    mounted.set(rail,{schedule});schedule(true);
  }
  W.CendonDetailTabs={mount};
  if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',()=>mount(D.getElementById('clTabs')),{once:true});else mount(D.getElementById('clTabs'));
})(window,document);
