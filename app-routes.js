/* Presentation routing only. Never an authorization decision. */
export const ROOTS=Object.freeze({home:'/',garage:'/garage',chat:'/chat',news:'/news',spares:'/spares',profile:'/profile'});
const HOME=new Set(['index','messages','jobs','studio','work','staff','join','listen','quote','photo','search','map','post','urgent','compare','quotes','diagnose','line','tech','techs','service','category']);
export function namespace(raw,origin=globalThis.location?.origin||'http://localhost'){
  try{const u=new URL(raw,origin);if(u.origin!==new URL(origin).origin)return null;
    const p=u.pathname.replace(/\.html$/,'').replace(/\/+$/,''),first=p.split('/')[1]||'';
    if(!first||HOME.has(first))return 'home';return Object.hasOwn(ROOTS,first)&&first!=='home'?first:null;
  }catch{return null;}
}
export function appUrl(raw,origin){try{const u=new URL(raw,origin);if(!namespace(u.href,origin))return null;
  // Settings now live in Profile. Legacy same-origin links must not boot another
  // large page and wait for a settings panel that no longer exists there.
  const settings=u.pathname.match(/^\/(?:garage|news|spares)\/settings(?:\/(general|acct|usage|fb|learn|manage|notif))?\/?$/);
  if(settings)u.pathname='/profile'+(settings[1]?'/'+settings[1]:'');return u;
}catch{return null;}}
