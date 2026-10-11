/* Native swipe paging; keep category buttons and their existing handlers intact. */
(() => {
  const rail=document.getElementById('hRail');
  if(!rail)return;
  const T=(th,en)=>typeof window!=='undefined'&&window.spireT?window.spireT(th,en):th;
  const mobile=matchMedia('(max-width:760px)');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const dots=document.createElement('nav');
  dots.className='lx-pages';dots.setAttribute('aria-label',T('หน้าหมวดบริการ','Category pages'));
  rail.after(dots);
  let starts=[],frame=0;
  function targets(){
    const buttons=[...rail.children].filter(el=>el.tagName==='BUTTON');
    const left=rail.getBoundingClientRect().left;
    const padding=parseFloat(getComputedStyle(rail).paddingLeft)||0;
    const max=Math.max(0,rail.scrollWidth-rail.clientWidth);
    return buttons.filter((_,i)=>i%8===0).map(el=>Math.max(0,Math.min(max,el.getBoundingClientRect().left-left+rail.scrollLeft-padding)));
  }
  function active(){
    frame=0;
    if(!mobile.matches)return;
    let index=0;
    starts.forEach((x,i)=>{if(Math.abs(x-rail.scrollLeft)<Math.abs(starts[index]-rail.scrollLeft))index=i;});
    [...dots.children].forEach((dot,i)=>dot.setAttribute('aria-current',String(i===index)));
  }
  function update(){
    starts=targets();dots.hidden=starts.length<2;
    if(dots.children.length!==starts.length){
      dots.replaceChildren(...starts.map((_,i)=>{
        const dot=document.createElement('button');dot.type='button';
        dot.setAttribute('aria-label',T(`หมวดบริการ หน้า ${i+1} จาก ${starts.length}`,`Categories page ${i+1} of ${starts.length}`));
        dot.addEventListener('click',()=>rail.scrollTo({left:starts[i],behavior:reduced.matches?'auto':'smooth'}));
        return dot;
      }));
    }
    active();
  }
  rail.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(active);},{passive:true});
  new MutationObserver(update).observe(rail,{childList:true});
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(update).observe(rail);
  else window.addEventListener('resize',update,{passive:true});
  mobile.addEventListener('change',update);
  update();
})();
