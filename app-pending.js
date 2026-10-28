/* Immediate, honest destination chrome. Never fabricates account or car data. */
import {ROOTS} from './app-routes.js';
const LABELS={home:['หน้าหลัก','Home'],garage:['การาจ','Garage'],chat:['Cendon AI','Cendon AI'],news:['นิตยสาร','Magazine'],spares:['ร้านค้า','Shop'],profile:['บัญชีและการตั้งค่า','Account & settings']};
export function pendingView(document,navigate,cancel){
  const root=document.createElement('section');root.id='appPending';root.hidden=true;root.setAttribute('aria-busy','true');
  const head=document.createElement('header'),brand=document.createElement('span');brand.textContent='Cendon';head.append(brand);
  const back=document.createElement('button');back.type='button';back.addEventListener('click',cancel);head.append(back);root.append(head);
  const main=document.createElement('div');main.className='app-pending-main';const title=document.createElement('h1'),status=document.createElement('p');title.tabIndex=-1;status.setAttribute('role','status');main.append(title,status);
  const blocks=document.createElement('div');blocks.className='app-pending-blocks';blocks.setAttribute('aria-hidden','true');for(let i=0;i<3;i++)blocks.append(document.createElement('div'));main.append(blocks);root.append(main);
  const nav=document.createElement('nav');root.append(nav);document.body.append(root);
  return {show(ns){let en=false;try{en=JSON.parse(localStorage.getItem('spire_lang')||'"th"')==='en';}catch{}
    title.textContent=LABELS[ns]?.[en?1:0]||'Cendon';back.textContent=en?'Cancel':'กลับหน้าก่อนหน้า';status.textContent=en?'Preparing this page…':'กำลังเตรียมหน้านี้…';nav.replaceChildren();nav.setAttribute('aria-label',en?'Main navigation':'เมนูหลัก');
    for(const key of ['home','garage','chat','news','profile']){const b=document.createElement('button');b.type='button';b.textContent=LABELS[key][en?1:0];b.setAttribute('aria-current',key===ns?'page':'false');b.addEventListener('click',()=>navigate(ROOTS[key]));nav.append(b);}
    root.hidden=false;title.focus({preventScroll:true});
  },hide(){root.hidden=true;},get visible(){return !root.hidden;}};
}
