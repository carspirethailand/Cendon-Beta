/* One account flow: verified Firebase identity + server-owned first-use status. */
(function(W,D){
  'use strict';
  const LANGS={th:'ไทย',en:'English',ja:'日本語',zh:'中文',ko:'한국어',de:'Deutsch',fr:'Français',es:'Español',id:'Bahasa Indonesia',vi:'Tiếng Việt',ms:'Bahasa Melayu',pt:'Português'};
  const MONEY=['THB','USD','EUR','GBP','JPY','CNY','SGD','AUD','CAD','CHF','NZD','HKD','MYR','IDR','KRW','VND','INR','TWD','AED'];
  const privacyUrl=()=>S.status?.policy?.privacyUrl||S.config?.privacyUrl||'/privacy';
  const PRIVATE=/^\/(garage|chat|news|spares|profile)(?:\.html)?(?:\/|$)/;
  const LOGIN=/^\/login(?:\.html)?\/?$/.test(location.pathname);
  const S={uid:null,serial:0,status:null,phase:'loading',step:0,draft:{},error:'',busy:false,email:'',password:'',showPw:false,mode:'in',notice:'',challenge:null,resendAt:0,code:'',next:null,config:null};
  const locked=new Map();let modalOpen=false,previousFocus=null;
  const auth=()=>W.auth||W.spireAuth, current=()=>auth()&&auth().currentUser;
  const read=(k,fallback)=>{try{const v=JSON.parse(localStorage.getItem(k));return v===null?fallback:v}catch(e){return fallback}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const locale=()=>S.draft.lang||S.status&&S.status.profile&&S.status.profile.lang||read('spire_lang','th');
  const T=(th,en)=>locale()==='th'?th:en;
  const scoped=k=>'spire___account_'+S.uid+'_'+k;
  function saveDraft(){const safe={};for(const k of ['terms','privacy','name','lang','distance','currency'])if(Object.hasOwn(S.draft,k))safe[k]=S.draft[k];write(scoped('draft'),safe)}
  const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  /* รหัส OTP ทางอีเมล: จำแค่ "รอรหัสของอีเมลไหน" ในแท็บนี้ (ไม่เก็บตัวรหัส) รีเฟรชแล้วกลับมากรอกต่อได้ */
  const EMAIL_SESSION='cendon_email_challenge',LINK_EMAIL='cendon_link_email';
  /* รหัส 6 หลักต้องให้หลังบ้านส่งอีเมล (ต้องมีโดเมนอีเมลของเราเอง) — ยังไม่พร้อมเมื่อไร ปุ่มเดียวกันส่ง "ลิงก์เข้าสู่ระบบ" ผ่าน Firebase แทน */
  const otpReady=()=>!!(S.config&&S.config.emailOtpReady===true);
  function emailSession(value){try{if(value===null)sessionStorage.removeItem(EMAIL_SESSION);else sessionStorage.setItem(EMAIL_SESSION,JSON.stringify(value))}catch(e){}}
  function restoreEmail(){try{const p=JSON.parse(sessionStorage.getItem(EMAIL_SESSION));
    if(p&&typeof p.email==='string'&&p.email.length<=254&&typeof p.id==='string'&&p.id.length<=100&&p.expiresAt>Date.now()){
      S.email=p.email;S.challenge=p.id;S.resendAt=Number(p.resendAt)||0;S.mode='code';return true;
    }
  }catch(e){}emailSession(null);return false}
  /* โหมดหน้าเข้าสู่ระบบ: in = เข้าสู่ระบบ · up = สร้างบัญชี · reset = ลืมรหัสผ่าน (เปิดตรงได้ด้วย /login?mode=signup) */
  const startMode=()=>{try{return new URLSearchParams(location.search).get('mode')==='signup'?'up':'in'}catch(e){return 'in'}};
  /* แอปต้องเข้าสู่ระบบก่อนใช้ — ยกเว้นลิงก์ใบงานที่แชร์ให้คนที่ไว้ใจ (/trip/…) · ป้าย cendon_signed ให้ auth-gate.js ตัดสินได้ทันทีตอนเปิดหน้า */
  const tripPath=()=>/^\/trip\//.test(location.pathname)||/[?&]trip=/.test(location.search||'');
  /* จำตั้งแต่ตอนโหลด: ตัวนำทางของหน้าแรกอาจสลับที่อยู่เป็น "/" ชั่วครู่ก่อนเปิดใบงาน — ไม่ให้จังหวะนั้นพาคนเปิดลิงก์ใบงานไปหน้าเข้าสู่ระบบ */
  const OPENED_TRIP=tripPath();let signedOut=false;
  const openPath=()=>tripPath()||OPENED_TRIP&&!signedOut;
  const toLogin=()=>{close();location.replace('/login?next='+encodeURIComponent(safeNext(location.pathname+location.search+location.hash)))};
  /* คุกกี้ cendon_signed คู่กับป้ายในเครื่อง: หน้าร้าน/บริการ/หมวดช่าง (Pages Functions) ใช้แยกว่าส่งหน้าแอปหรือหน้าสาธารณะ — เป็นแค่คำใบ้ ไม่ใช่สิทธิ์เข้าระบบ */
  const signedCookie=on=>{try{document.cookie='cendon_signed='+(on?'1; max-age=31536000':'; max-age=0')+'; path=/; samesite=lax'+(location.protocol==='https:'?'; secure':'')}catch(e){}};
  const signedHint=on=>{try{if(on)localStorage.setItem('cendon_signed','1');else localStorage.removeItem('cendon_signed')}catch(e){}signedCookie(on)};
  function safeNext(raw){
    try{if(/[\\\p{Cc}]/u.test(decodeURIComponent(raw||'')))return '/';
      const u=new URL(raw||'/',location.origin),p=u.pathname.replace(/\.html$/,'').replace(/\/$/,'')||'/';
      const simple=['/','/index','/garage','/chat','/news','/spares','/profile','/tech','/techs','/admin','/handbook','/plan','/terms','/search','/map','/urgent','/diagnose','/jobs','/studio','/work','/staff','/join','/quotes','/post','/line'];
      const deep=/^\/(garage|chat|news|spares|profile|tech|service|category|jobs|studio|work|staff|join|trip|quotes|compare|post)\/[^\s]+$/.test(p);
      return u.origin===location.origin&&(simple.includes(p)||deep)&&u.href.length<4096?(p==='/index'?'/':p)+u.search+u.hash:'/';
    }catch(e){return '/'}
  }
  function validName(name){return typeof name==='string'&&Array.from(name.trim()).length>=1&&Array.from(name.trim()).length<=60&&!/[<>\p{Cc}\p{Cf}]/u.test(name)&&/[\p{L}\p{N}]/u.test(name)}
  function birthDate(d=S.draft){return d.year&&d.month&&d.day?`${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`:''}
  function validBirth(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    const [y,m,d]=value.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d)),now=new Date();
    const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    return y>=1900&&date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d&&value<=today;
  }
  function uidIs(uid){const u=current();return !!u&&u.uid===uid}
  function canonical(data,uid){return data&&data.completed===true&&data.status==='completed'&&data.profile&&data.profile.uid===uid}
  async function request(path,body,method='POST',uid){
    const controller=new AbortController();let timer;
    const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('network_timeout'))},path.startsWith('/api/auth/email/')?30000:15000)});
    try{return await Promise.race([deadline,(async()=>{
      const headers={'Content-Type':'application/json'};
      if(uid){const u=current();if(!u||u.uid!==uid)throw new Error('account_changed');
        headers.Authorization='Bearer '+await u.getIdToken();if(!uidIs(uid)||controller.signal.aborted)throw new Error('account_changed')}
      const res=await fetch((W.BACKEND_URL||'https://spireonebackend.carspirethailand.workers.dev')+path,{method,headers,signal:controller.signal,body:body===undefined?undefined:JSON.stringify(body)});
      const data=await res.json();if(uid&&!uidIs(uid))throw new Error('account_changed');
      if(!res.ok){const error=new Error(data.code||data.error||'HTTP_'+res.status);error.status=res.status;error.retryAfter=data.retryAfter;throw error}
      return data;
    })()])}finally{clearTimeout(timer)}
  }
  function errorText(error){
    const code=String(error&&error.message||error&&error.code||'');
    if(/invalid-email/.test(code))return T('กรุณาตรวจอีเมลให้ถูกต้อง','Please check your email address.');
    if(/invalid-credential|wrong-password|user-not-found|invalid-login-credentials|missing-password/.test(code))return T('อีเมลหรือรหัสผ่านไม่ถูกต้อง','Incorrect email or password.');
    if(/email-already-in-use/.test(code))return T('อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบ หรือใช้ Google/Apple ที่เคยใช้สมัคร','This email already has an account. Sign in, or use the Google or Apple account you signed up with.');
    if(/weak-password/.test(code))return T('รหัสผ่านง่ายเกินไป ใช้อย่างน้อย 8 ตัวอักษร','That password is too weak. Use at least 8 characters.');
    if(/network-request-failed/.test(code))return T('เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่','No connection. Check your internet and try again.');
    if(/popup-timeout/.test(code))return T('หน้าต่างล็อกอินยังไม่ตอบ ตรวจว่ามีหน้าต่างเปิดอยู่หรืออนุญาต pop-up แล้วลองใหม่','Sign-in has not responded. Check the sign-in window or allow pop-ups, then try again.');
    if(/minimum_age_18/.test(code))return T('นโยบายกำหนดให้ผู้ใช้มีอายุ 18 ปีขึ้นไป','The policy requires users to be 18 or older.');
    if(/operation-not-allowed|configuration-not-found|unauthorized-domain|admin-restricted/.test(code))return T('ช่องทางนี้ยังไม่เปิดให้ใช้ ลองช่องทางอื่น หรือติดต่อทีมงาน','This sign-in option isn’t available yet. Try another option or contact support.');
    if(/recovery-required/.test(code))return T('อีเมลนี้ยังไม่ได้ยืนยัน — เข้าสู่ระบบด้วยรหัสผ่าน Google หรือ Apple ที่เคยใช้ แล้วกดลิงก์ยืนยันในอีเมลก่อน','This email isn’t verified yet — sign in with the password, Google or Apple you used before, then open the verification link we emailed you.');
    if(/account-exists-with-different-credential/.test(code))return T('อีเมลนี้ผูกกับช่องทางอื่นอยู่ กรุณาใช้ช่องทางที่เคยสมัครไว้','This email is linked to another sign-in method. Use that method first.');
    if(/too-many|rate|cooldown/.test(code)||error&&error.status===429)return T('ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่','Too many attempts. Please wait a moment and try again.');
    if(/invalid-code/.test(code))return T('รหัสไม่ถูกต้องหรือหมดอายุแล้ว กรุณาตรวจรหัสหรือขอรหัสใหม่','The code is incorrect or expired. Check it or request a new code.');
    if(/invalid-action-code|expired-action-code/.test(code))return T('ลิงก์นี้หมดอายุหรือใช้ไปแล้ว — ขอลิงก์ใหม่ได้เลย','This link has expired or was already used — request a new one.');
    if(S.phase==='auth'&&(S.mode==='otp'||S.mode==='code')&&(/unavailable|not-configured/.test(code)||error&&error.status===503))return T('ตอนนี้ยังส่งรหัสทางอีเมลไม่ได้ — ใช้รหัสผ่าน Google หรือ Apple ไปก่อน','Email codes aren’t available right now — use your password, Google or Apple for now.');
    if(/unavailable|not-configured/.test(code)||error&&error.status===503)return T('ระบบยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง','This service is unavailable. Please try again later.');
    if(/suspended|disabled|banned/.test(code)||error&&error.status===403)return T('บัญชีนี้ยังเข้าใช้งานไม่ได้ กรุณาติดต่อผู้ดูแล','This account cannot sign in. Please contact support.');
    if(/consent_version_changed/.test(code))return T('ข้อมูลข้อตกลงเปลี่ยนแล้ว กรุณากดย้อนกลับไปอ่านและยอมรับอีกครั้ง','The agreement changed. Go back and review it again.');
    return T('เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่ ข้อมูลที่กรอกยังอยู่','Connection failed. Please try again. Your entries are still here.');
  }
  function host(){let el=D.getElementById('accountFlow');if(!el){el=D.createElement('main');el.id='accountFlow';D.body.appendChild(el)}
    if(!modalOpen){modalOpen=true;previousFocus=D.activeElement}
    /* data-ac-free = ชั้นที่ต้องกดได้ระหว่างหน้าบัญชี (คลิปเปิดหน้าเข้าสู่ระบบ) */
    for(const node of [...(D.body.children||[])])if(node!==el&&!locked.has(node)&&!(node.hasAttribute&&node.hasAttribute('data-ac-free'))){locked.set(node,node.inert);node.inert=true}
    el.className='ac-screen';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','acTitle');el.hidden=false;return el}
  function close(){let el=D.getElementById('accountFlow');if(!el){el=D.createElement('main');el.id='accountFlow';el.hidden=true;D.body.appendChild(el)}else el.hidden=true;
    for(const [node,inert] of locked)node.inert=inert;locked.clear();modalOpen=false;
    if(previousFocus&&previousFocus.isConnected&&typeof previousFocus.focus==='function')previousFocus.focus({preventScroll:true});previousFocus=null;
    D.documentElement.dataset.gate='0';
    if(canonical(S.status,S.uid))D.documentElement.dataset.level='enthusiast';
  }
  /* ภาษา: เลือกใน Settings แล้วต้องคงเดิมทุกหน้าจนกว่าจะเปลี่ยนเอง
     เดิมทุกครั้งที่หน้าโหลดสถานะบัญชีใหม่ (ร้านค้า นิตยสาร ...) ภาษาถูกเขียนทับด้วยภาษาตอนสมัคร (ไทย)
     ใช้ภาษาในโปรไฟล์เมื่อ: เครื่องนี้ยังไม่เคยใช้บัญชีนี้ · ยังไม่เคยเลือกภาษา · หรือภาษาในโปรไฟล์เพิ่งเปลี่ยน (เลือกจากอีกเครื่อง/ตอนสมัคร) */
  function pickLang(p,old){
    const srv=typeof p.lang==='string'?p.lang:'',seen=read('spire_langSrv',null),local=read('spire_lang',null);
    const fromServer=!local||!(old&&old.uid===S.uid)||(!!srv&&seen!==null&&seen!==srv);
    write('spire_langSrv',srv);
    return fromServer?(srv||local||'th'):local;
  }
  /* เปลี่ยนภาษาใน Settings → บันทึกลงโปรไฟล์ด้วย (เครื่องอื่นได้ภาษาเดียวกัน และหน้าไหนโหลดสถานะใหม่ก็ไม่ย้อนกลับ) */
  function langHook(){if(langHook.on||!W.spireOnLang)return;langHook.on=1;
    W.spireOnLang(code=>{const p=S.status&&S.status.profile;if(!code||!setupDone()||(p&&p.lang===code))return;setupSave({lang:code})})}
  function publish(data){
    if(!canonical(data,S.uid)||!uidIs(S.uid))return;
    S.status=data;const cachedStatus={...data,profile:{...data.profile}};delete cachedStatus.profile.birthDate;write(scoped('status'),cachedStatus);
    const p=data.profile||{},old=read('spire_setup',{}),prior=old&&old.uid===S.uid?old:{};
    const complete=!!canonical(data,S.uid),lang=pickLang(p,old),projection={...prior,...p,lang,v:3,uid:S.uid,accountComplete:complete,onboardingComplete:complete,completed:complete,level:p.level||prior.level||'enthusiast',plan:p.plan||prior.plan||'free'};
    delete projection.birthDate;
    write('spire_setup',projection);write('spire_lang',lang);write('spire_units',p.units||'metric');
    const cached=read('spire_cachedUser',null);if(cached&&cached.uid===S.uid){cached.name=p.name||cached.name;write('spire_cachedUser',cached)}
    try{if(W.currentUser&&W.currentUser.uid===S.uid)W.currentUser.name=p.name||W.currentUser.name}catch(e){}
    try{if(W.spireSetLang&&lang&&!(W.spireLang&&W.spireLang()===lang))W.spireSetLang(lang);if(W.spireApplySetup)W.spireApplySetup()}catch(e){}
    langHook();
    D.documentElement.dataset.level='enthusiast';
    for(const name of ['renderAuthUI','renderProfile','updateGreeting'])try{if(W[name])W[name]()}catch(e){}
    try{if(W.CendonSettings)W.CendonSettings.refresh()}catch(e){}
    try{W.dispatchEvent(new CustomEvent('cendon:preferences',{detail:{uid:S.uid,distance:p.distance,currency:p.currency,lang}}))}catch(e){}
  }
  function option(value,label,selected){return `<option value="${esc(value)}"${value===String(selected)?' selected':''}>${esc(label)}</option>`}
  function providerIcon(kind){
    if(kind==='Email')return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3 5h18v14H3zM3 5l9 7 9-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    if(kind==='Apple')return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M17.1 12.5c0-2 1.6-3 1.7-3.1-1-1.4-2.5-1.6-3.1-1.6-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 7 1.2 9.2.7 1.1 1.6 2.2 2.7 2.2s1.5-.7 2.8-.7 1.7.7 2.8.7 1.9-1.1 2.6-2.1c.9-1.2 1.2-2.4 1.2-2.4-.1 0-2.3-.9-2.3-3.4v-1zm-2-6.2c.6-.8 1.1-1.8 1-2.8-1 .1-2.1.7-2.8 1.5-.6.7-1.1 1.8-1 2.8 1.1.1 2.1-.6 2.8-1.5z"/></svg>';
    return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.3h5.9c-.3 1.4-1 2.6-2.2 3.4v2.8h3.6c2.1-1.9 3.3-4.8 3.3-8.2z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.5l-3.6-2.8c-1 .6-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.4H2.1v2.9C3.9 20.6 7.6 23 12 23z"/><path fill="#FBBC05" d="M5.8 14.3c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3V6.8H2.1C1.4 8.4 1 10.1 1 12s.4 3.6 1.1 5.2z"/><path fill="#EA4335" d="M12 5.3c1.6 0 3.1.6 4.2 1.6l3.1-3.1C17.5 2.1 15 1 12 1 7.6 1 3.9 3.4 2.1 6.8l3.7 2.9C6.7 7.2 9.1 5.3 12 5.3z"/></svg>';
  }
  const MARK='<svg viewBox="-6 -6 94.8 112" aria-hidden="true"><path fill="currentColor" d="M 79.33 0.29 Q 79.62 0.00 79.97 0.21 L 81.37 1.05 Q 82.80 1.91 82.80 3.58 L 82.80 4.36 Q 82.80 6.37 82.17 8.27 L 75.34 28.74 Q 74.52 31.21 71.93 30.97 L 49.09 28.90 Q 46.50 28.66 44.60 30.44 L 37.56 37.07 Q 35.67 38.85 34.46 41.16 L 29.87 49.93 Q 28.66 52.23 28.92 54.82 L 29.04 56.01 Q 29.30 58.60 31.49 60.00 L 45.43 68.97 Q 47.13 70.06 49.14 69.78 L 49.59 69.71 Q 51.59 69.43 52.63 67.68 L 60.46 54.47 Q 61.78 52.23 64.32 52.79 L 64.98 52.94 Q 67.52 53.50 68.61 55.86 L 70.25 59.42 Q 71.34 61.78 70.55 64.26 L 63.84 85.42 Q 63.06 87.90 60.77 89.13 L 48.79 95.58 Q 46.50 96.82 43.96 96.25 L 43.14 96.07 Q 40.76 95.54 39.04 97.26 L 38.66 97.64 Q 36.94 99.36 34.52 99.61 L 33.16 99.74 Q 30.57 100.00 30.70 97.40 L 31.08 89.86 Q 31.21 87.26 29.02 85.87 L 5.38 70.82 Q 3.18 69.43 2.55 66.90 L 0.63 59.21 Q 0.00 56.69 1.41 54.50 L 27.26 14.29 Q 28.66 12.10 29.48 9.64 L 31.02 5.01 Q 31.85 2.55 34.36 3.22 L 45.90 6.33 Q 48.41 7.01 51.01 7.01 L 61.73 7.01 Q 64.33 7.01 66.72 5.97 L 78.61 0.80 Q 78.98 0.64 79.27 0.35 Z"/></svg>';
  const EYE=on=>on?'<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3 3l18 18M10.6 6.1A9.6 9.6 0 0 1 12 6c5 0 8.7 4.3 9.6 6-.4.8-1.4 2.3-2.9 3.6M6.4 7.6C4.5 8.9 3 10.8 2.4 12c.9 1.7 4.6 6 9.6 6 1.4 0 2.7-.3 3.8-.9M9.9 10a3 3 0 0 0 4.2 4.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
    :'<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M2.4 12C3.3 10.3 7 6 12 6s8.7 4.3 9.6 6c-.9 1.7-4.6 6-9.6 6s-8.7-4.3-9.6-6Z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  const ART='<aside class="ac-art" aria-hidden="true"><picture><source srcset="/login-hero.webp" type="image/webp"><img src="/login-hero.jpg" alt="" decoding="async"></picture></aside>';
  function age(value){if(!validBirth(value))return null;const [y,m,d]=value.split('-').map(Number),n=new Date();return n.getFullYear()-y-(n.getMonth()+1<m||n.getMonth()+1===m&&n.getDate()<d?1:0)}
  function stepForm(){const d=S.draft;
    if(S.step===0)return `<p class="ac-copy">${T('ก่อนเริ่มใช้งาน ลองอ่านข้อมูลสำคัญเหล่านี้สักครู่','Before we begin, please take a moment to read these important details.')}</p>
      <p class="ac-copy">${T('คำตอบของ AI เป็นข้อมูลเบื้องต้น ไม่ใช่การตรวจรถจริง หากอาการเกี่ยวกับความปลอดภัย ให้หยุดใช้รถและขอความช่วยเหลือจากช่าง','AI guidance is preliminary, not a physical inspection. Stop driving and seek professional help when safety is in doubt.')}</p>
      <label class="ac-consent"><input type="checkbox" name="terms"${d.terms?' checked':''}><span>${T('ฉันอ่านและยอมรับ','I have read and accept')} <a href="/terms" target="_blank" rel="noopener">${T('ข้อกำหนดการใช้งาน','the terms of use')}</a></span></label>
      <label class="ac-consent"><input type="checkbox" name="privacy"${d.privacy?' checked':''}><span>${T('ฉันรับทราบ','I acknowledge')} <a href="${esc(privacyUrl())}" target="_blank" rel="noopener">${T('นโยบายความเป็นส่วนตัว','the privacy policy')}</a> ${T('และข้อจำกัดของคำแนะนำจาก AI','and the limitations of AI guidance')}</span></label>`;
    if(S.step===1)return `<label class="ac-label" for="acName">${T('ชื่อที่อยากให้เรียก','What should we call you?')}</label><input class="ac-input" id="acName" name="name" autocomplete="nickname" maxlength="120" value="${esc(d.name||'')}" required><p class="ac-copy">${T('ใช้ชื่อเล่นก็ได้ เปลี่ยนภายหลังได้ในบัญชีของคุณ','A nickname is fine. You can change it later in your account.')}</p>`;
    if(S.step===2){const years=Array.from({length:new Date().getFullYear()-1899},(_,i)=>String(new Date().getFullYear()-i));
      return `<div class="ac-dob"><label class="ac-label">${T('วัน','Day')}<select class="ac-input" name="day" aria-label="${T('วันเกิด','Birth day')}" required>${option('',T('วัน','Day'),d.day)}${Array.from({length:31},(_,i)=>option(String(i+1),i+1,d.day)).join('')}</select></label><label class="ac-label">${T('เดือน','Month')}<select class="ac-input" name="month" aria-label="${T('เดือนเกิด','Birth month')}" required>${option('',T('เดือน','Month'),d.month)}${Array.from({length:12},(_,i)=>option(String(i+1),new Intl.DateTimeFormat(locale(),{month:'short'}).format(new Date(2000,i,1)),d.month)).join('')}</select></label><label class="ac-label">${T('ปี ค.ศ.','Year')}<select class="ac-input" name="year" aria-label="${T('ปีเกิด ค.ศ.','Birth year')}" required>${option('',T('ปี','Year'),d.year)}${years.map(y=>option(y,y,d.year)).join('')}</select></label></div><p class="ac-copy" id="acAge" aria-live="polite">${age(birthDate())!==null?T('อายุ '+age(birthDate())+' ปี',age(birthDate())+' years old'):''}</p><p class="ac-copy">${T('วันเกิดเก็บในข้อมูลบัญชีของคุณ ไม่แสดงบนโปรไฟล์ช่างหรือข้อมูลสาธารณะ','Your birthday stays in your private account profile, not in public listings.')}</p>`}
    if(S.step===3)return `<label class="ac-label" for="acLang">${T('ภาษาที่ใช้ในแอป','App language')}</label><select class="ac-input" id="acLang" name="lang">${Object.entries(LANGS).map(([k,v])=>option(k,v,d.lang)).join('')}</select>`;
    if(S.step===4)return `<div class="ac-options" role="group" aria-label="${T('หน่วยระยะทาง','Distance unit')}">${[['km',T('กิโลเมตร','Kilometres')],['mi',T('ไมล์','Miles')]].map(([k,v])=>`<button class="ac-option${d.distance===k?' selected':''}" type="button" data-distance="${k}" aria-pressed="${d.distance===k}">${v}<span>${k}</span></button>`).join('')}</div><p class="ac-copy">${T('ใช้กับเลขไมล์และระยะทาง เปลี่ยนได้ภายหลัง','Used for your odometer and distances. You can change it later.')}</p>`;
    return `<label class="ac-label" for="acMoney">${T('สกุลเงินที่คุ้นเคย','Your preferred currency')}</label><select class="ac-input" id="acMoney" name="currency">${MONEY.map(k=>option(k,k==='THB'?T('THB · บาทไทย','THB · Thai baht'):k,d.currency)).join('')}</select><p class="ac-copy">${T('ใช้แสดงค่าใช้จ่าย ไม่ใช่การสมัครแพ็กเกจหรือเรียกเก็บเงิน','Used to display costs. This does not subscribe you or charge a payment.')}</p>`;
  }
  function render(){const root=host(),phase=S.phase,titles=[['ยินดีที่ได้เจอกัน','Good to meet you'],['เรียกคุณว่าอะไรดี','Make it yours'],['คุณเกิดเมื่อไหร่','When were you born?'],['ภาษาแบบที่คุณถนัด','Your familiar language'],['ระยะทางที่อ่านง่าย','Distance that makes sense'],['เงินในหน่วยที่คุ้นเคย','Your everyday currency']];
    let title,copy='',form='',actions='';
    if(phase==='auth'){const m=S.mode,up=m==='up',reset=m==='reset',otp=m==='otp',sent=m==='code',linked=m==='linksent',confirm=m==='linkemail',viaCode=otpReady();
      title=up?T('สร้างบัญชี Cendon','Create your Cendon account'):reset?T('ตั้งรหัสผ่านใหม่','Reset your password'):otp?(viaCode?T('รับรหัสทางอีเมล','Get a code by email'):T('รับลิงก์ทางอีเมล','Get a sign-in link by email')):sent||linked?T('เช็กกล่องจดหมาย','Check your inbox'):confirm?T('ยืนยันอีเมลของคุณ','Confirm your email'):T('เข้าสู่ระบบ Cendon','Sign in to Cendon');
      copy=up?(viaCode?T('ยืนยันด้วยรหัส 6 หลักทางอีเมล','Verify with a six-digit email code'):T('สมัครด้วยอีเมลและรหัสผ่าน · ส่งลิงก์ยืนยัน ไม่ใช่ OTP','Create an account with email and password · verification uses a link, not an OTP')):reset?T('ใส่อีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้','Enter the email you signed up with and we’ll send you a reset link.'):otp?(viaCode?T('ใส่อีเมล เราจะส่งรหัส 6 หลักให้ ไม่ต้องใช้รหัสผ่าน','Enter your email and we’ll send a six-digit code — no password needed.'):T('ใส่อีเมล เราจะส่งลิงก์ให้ กดลิงก์ในอีเมลก็เข้าสู่ระบบได้เลย ไม่ต้องใช้รหัสผ่าน','Enter your email and we’ll send a link — tap it to sign in, no password needed.')):sent?T('ส่งรหัสไปที่ ','Code sent to ')+S.email
        :linked?T('ส่งลิงก์เข้าสู่ระบบไปที่ ','We sent a sign-in link to ')+S.email+T(' — เปิดอีเมลบนเครื่องนี้แล้วกดลิงก์ (เช็กจดหมายขยะด้วย)',' — open the email on this device and tap the link (check spam too).')
        :confirm?T('เพื่อความปลอดภัย ใส่อีเมลที่ใช้ขอลิงก์อีกครั้ง','For your security, enter the email you requested the link with.'):T('ยินดีต้อนรับกลับมา','Welcome back');
      /* Google / Apple ใช้ได้ทั้งเข้าสู่ระบบและสมัครใหม่ · ปุ่ม Apple ขึ้นเมื่อหลังบ้านบอกว่าเปิดแล้ว (AUTH_APPLE_ENABLED=1) */
      const apple=!!(S.config&&S.config.appleAuthReady===true);
      const prov=reset||otp||sent||linked||confirm?'':`<button class="ac-provider" type="button" data-provider="google"><span class="ac-icon" aria-hidden="true">${providerIcon('Google')}</span><span>${up?T('สมัครด้วย Google','Sign up with Google'):T('เข้าสู่ระบบด้วย Google','Continue with Google')}</span></button>${apple?`<button class="ac-provider" type="button" data-provider="apple"><span class="ac-icon" aria-hidden="true">${providerIcon('Apple')}</span><span>${T('ใช้บัญชี Apple','Continue with Apple')}</span></button>`:''}<div class="ac-or" role="separator"><span>${T('หรือใช้อีเมล','or use email')}</span></div>`;
      /* รหัสผ่านไม่ถูกเขียนลง HTML — ใส่กลับเข้าช่องหลังวาดเสร็จ (ดูท้าย render) */
      const pw=reset||otp||sent||linked||confirm||(up&&viaCode)?'':`<div class="ac-pass"><input class="ac-input" id="acPass" name="password" type="${S.showPw?'text':'password'}" autocomplete="${up?'new-password':'current-password'}" placeholder="${T('รหัสผ่าน','Password')}" aria-label="${T('รหัสผ่าน','Password')}"${up?' minlength="8" aria-describedby="acPwHint"':''} required><button class="ac-eye" type="button" data-eye aria-pressed="${S.showPw}" aria-label="${S.showPw?T('ซ่อนรหัสผ่าน','Hide password'):T('แสดงรหัสผ่าน','Show password')}">${EYE(S.showPw)}</button></div>${up?`<p class="ac-hint" id="acPwHint">${T('อย่างน้อย 8 ตัวอักษร','At least 8 characters')}</p>`:''}`;
      /* รหัส OTP ก็ไม่ถูกเขียนลง HTML เหมือนรหัสผ่าน */
      const box=sent?`<input class="ac-input ac-code" id="acCode" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="••••••" aria-label="${T('รหัส 6 หลัก','Six-digit code')}" aria-describedby="acCodeNote" required><p class="ac-hint" id="acCodeNote">${T('รหัสใช้ได้ 10 นาที และใช้ได้ครั้งเดียว','The code expires in ten minutes and can be used once.')}</p>`
        :linked?''
        :`<input class="ac-input" id="acEmail" name="email" type="email" inputmode="email" autocomplete="${up?'email':'username'}" placeholder="${T('อีเมล','Email')}" aria-label="${T('อีเมล','Email')}" value="${esc(S.email)}" required>`;
      form=prov+box+pw
        +(S.notice?`<p class="ac-note" role="status">${esc(S.notice)}</p>`:'');
      actions=`<button class="ac-primary ac-wide" type="submit"${S.busy?' disabled':''}>${S.busy?(up?T('กำลังสร้างบัญชี…','Creating…'):reset?T('กำลังส่ง…','Sending…'):otp?(viaCode?T('กำลังส่งรหัส…','Sending code…'):T('กำลังส่งลิงก์…','Sending link…')):sent||confirm?T('กำลังตรวจ…','Checking…'):T('กำลังเข้าสู่ระบบ…','Signing in…')):(up?T('สร้างบัญชี','Create account'):reset?T('ส่งลิงก์ตั้งรหัสใหม่','Send reset link'):otp?(viaCode?T('ส่งรหัสให้ฉัน','Send me a code'):T('ส่งลิงก์ให้ฉัน','Send me a link')):sent?T('ยืนยันและเข้าสู่ระบบ','Verify and sign in'):confirm?T('ยืนยันและเข้าสู่ระบบ','Verify and sign in'):T('เข้าสู่ระบบ','Sign in'))}</button>`
        +(m==='in'?`<div class="ac-row"><button class="ac-link" type="button" data-mode="reset">${T('ลืมรหัสผ่าน?','Forgot password?')}</button><span aria-hidden="true">·</span><button class="ac-link" type="button" data-mode="otp">${viaCode?T('ส่งรหัสเข้าอีเมลแทน','Email me a code instead'):T('ส่งลิงก์เข้าอีเมลแทน','Email me a link instead')}</button></div><p class="ac-swap">${T('ยังไม่มีบัญชี?','No account yet?')} <button class="ac-link ac-strong" type="button" data-mode="up">${T('สร้างบัญชี','Create one')}</button></p>`
          :otp?`<button class="ac-link" type="button" data-mode="in">${T('ใช้รหัสผ่านแทน','Use a password instead')}</button>`
          :linked?`<div class="ac-row"><button class="ac-link" type="button" data-resend${Date.now()<S.resendAt||S.busy?' disabled':''}>${T('ส่งลิงก์อีกครั้ง','Send another link')}</button><span aria-hidden="true">·</span><button class="ac-link" type="button" data-change-email>${T('เปลี่ยนอีเมล','Change email')}</button></div>`
          :confirm?`<button class="ac-link" type="button" data-mode="in">${T('กลับไปหน้าเข้าสู่ระบบ','Back to sign in')}</button>`
          :sent?`<div class="ac-row"><button class="ac-link" type="button" data-resend${Date.now()<S.resendAt||S.busy?' disabled':''}>${T('ส่งรหัสอีกครั้ง','Send another code')}</button><span aria-hidden="true">·</span><button class="ac-link" type="button" data-change-email>${T('เปลี่ยนอีเมล','Change email')}</button></div>`
          :up?`<p class="ac-swap">${T('มีบัญชีแล้ว?','Already have an account?')} <button class="ac-link ac-strong" type="button" data-mode="in">${T('เข้าสู่ระบบ','Sign in')}</button></p>`
          :`<button class="ac-link" type="button" data-mode="in">${T('กลับไปหน้าเข้าสู่ระบบ','Back to sign in')}</button>`);
    }else if(phase==='wizard'){[title]=[T(...titles[S.step])];form=stepForm();
      actions=`${S.step?`<button class="ac-back" type="button" data-prev${S.busy?' disabled':''}>${T('ย้อนกลับ','Back')}</button>`:''}<button class="ac-primary" type="submit"${S.busy?' disabled':''}>${S.busy?T('กำลังบันทึก…','Saving…'):S.step===5?T('ตั้งค่าให้เรียบร้อย','Finish setup'):T('ถัดไป','Continue')}</button>`;
    }else if(phase==='complete'){title=T('พร้อมไปด้วยกันแล้ว','You are all set');copy=T('ตั้งค่าเสร็จแล้ว ครั้งต่อไปเข้าสู่ระบบก็ใช้งานได้เลย มาดูจุดสำคัญในแอปกันสั้น ๆ','Your setup is saved to your account. Next time, just sign in. Let us show you around.');
      form='<div class="ac-complete" aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M20 32 28 40 44 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>';
      actions=`<button class="ac-primary" type="button" data-enter>${T('เริ่มใช้งาน','Start using Cendon')}</button>`;
    }else{title=phase==='retry'?T('ขอลองเชื่อมต่ออีกครั้ง','Let us reconnect'):T('กำลังเตรียมพื้นที่ของคุณ','Getting your space ready');copy=phase==='retry'?T('ยังตรวจข้อมูลบัญชีไม่ได้ เราจะไม่ให้ตั้งค่าใหม่เพียงเพราะการเชื่อมต่อสะดุด','We could not check your account. A connection issue should not make you set everything up again.'):T('เช็กการตั้งค่าที่บันทึกไว้ให้ก่อน สักครู่นะครับ','Checking your saved settings. Just a moment.');
      form=phase==='retry'?`<button class="ac-primary" type="button" data-retry>${T('ลองใหม่','Try again')}</button>`:'<div class="ac-loading" role="status" aria-label="Loading"></div>'}
    const wizard=phase==='wizard'||phase==='complete',step=phase==='complete'?7:S.step+1;
    const legal=phase==='auth'?`${T('การใช้งานถือว่าคุณยอมรับ','By continuing you accept the')} <a href="/terms" target="_blank" rel="noopener">${T('ข้อกำหนดการใช้งาน','terms of use')}</a>${privacyUrl()?` ${T('และ','and')} <a href="${esc(privacyUrl())}" target="_blank" rel="noopener">${T('นโยบายความเป็นส่วนตัว','privacy policy')}</a>`:''}`
      :`<a href="/terms" target="_blank" rel="noopener">${T('ข้อกำหนด','Terms')}</a>${privacyUrl()?` · <a href="${esc(privacyUrl())}" target="_blank" rel="noopener">${T('ความเป็นส่วนตัว','Privacy')}</a>`:''}`;
    /* ซ้าย = ฟอร์ม · ขวา = ภาพแบรนด์ (มือถือ: ภาพเป็นแถบบนเฉพาะหน้าเข้าสู่ระบบ) */
    root.dataset.phase=phase;
    root.innerHTML=`<div class="ac-split"><section class="ac-sheet"><header class="ac-brand"><span class="ac-badge">${MARK}</span>${wizard?`<span class="ac-progress" aria-label="${step}/7"><span style="width:${step/7*100}%"></span></span>`:''}${current()&&phase!=='loading'?`<button class="ac-link" type="button" data-switch-account>${T('ออกจากระบบ','Sign out')}</button>`:phase==='auth'?`<a class="ac-link" href="/help" target="_blank" rel="noopener">${T('ช่วยเหลือ','Help')}</a>`:''}</header>${wizard?`<p class="ac-kicker">${step} / 7 · ${T('ครั้งแรก ครั้งเดียว','Once, for your account')}</p>`:''}<h1 class="ac-title" id="acTitle" tabindex="-1">${esc(title)}</h1>${copy?`<p class="ac-copy">${esc(copy)}</p>`:''}<form class="ac-form" novalidate>${form}${S.notice&&phase!=='auth'?`<p class="ac-note" role="status">${esc(S.notice)}</p>`:''}<p class="ac-error" role="alert"${S.error?'':' hidden'}>${esc(S.error)}</p><div class="ac-actions">${actions}</div></form><footer class="ac-legal">${legal}</footer></section>${ART}</div>`;
    if(phase==='auth'){const pass=root.querySelector('[name="password"]');if(pass)pass.value=S.password;const c=root.querySelector('[name="code"]');if(c)c.value=S.code}
    if(S.busy)root.querySelectorAll('input,select,button').forEach(el=>{el.disabled=true});
    D.documentElement.dataset.gate='1';
    requestAnimationFrame(()=>{if(!root.hidden){const f=phase!=='auth'&&!S.busy&&root.querySelector('form')?.querySelector('input,select,button')||root.querySelector('#acTitle');if(f&&typeof f.focus==='function')f.focus({preventScroll:true})}});
  }
  function collect(root){const form=root.querySelector('form');if(!form)return;
    form.querySelectorAll('[name]').forEach(el=>{if(S.phase==='wizard')S.draft[el.name]=el.type==='checkbox'?el.checked:el.value;else if(el.name==='email')S.email=el.value.trim();else if(el.name==='password')S.password=el.value;else if(el.name==='code')S.code=el.value});
    if(S.uid&&S.phase==='wizard')saveDraft();
  }
  async function busy(fn){if(S.busy)return;const serial=S.serial;S.busy=true;S.error='';render();
    try{await fn()}catch(e){if(serial===S.serial){S.error=errorText(e);
      if(e.message==='consent_version_changed'&&uidIs(S.uid))try{const uid=S.uid,data=await request('/api/onboarding',undefined,'GET',uid);if(serial===S.serial&&uidIs(uid)){S.status=data;S.step=0;S.draft.terms=false;S.draft.privacy=false}}catch(x){}
    }}finally{if(serial===S.serial){S.busy=false;if(!D.getElementById('accountFlow')?.hidden)render()}}
  }
  /* ลิงก์ในอีเมลยืนยัน/ตั้งรหัสใหม่พากลับมาหน้าเข้าสู่ระบบของเรา · โดเมนยังไม่อนุญาตก็ส่งแบบปกติ */
  async function mailLink(send){const back={url:location.origin+'/login'};
    try{await send(back)}catch(e){if(/unauthorized-continue-uri|invalid-continue-uri|missing-continue-uri/.test(String(e&&(e.code||e.message))))await send(undefined);else throw e}}
  function emailReady(a,fn){if(a&&typeof a[fn]==='function')return true;
    if(!LOGIN){location.href='/login?next='+encodeURIComponent(location.pathname+location.search+location.hash);return false}
    S.error=T('ระบบล็อกอินกำลังโหลด กรุณาลองอีกครั้ง','Sign-in is still loading. Please try again.');render();return false}
  async function emailAuth(){
    if(S.mode==='up'&&otpReady())return emailRequest();
    const email=S.email.trim(),pw=S.password,up=S.mode==='up';
    if(!EMAIL_RE.test(email)||email.length>254){S.error=T('กรุณาใส่อีเมลให้ถูกต้อง','Enter a valid email address.');render();return}
    if(up&&Array.from(pw).length<8){S.error=T('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร','Use at least 8 characters for your password.');render();return}
    if(!pw){S.error=T('กรุณาใส่รหัสผ่าน','Enter your password.');render();return}
    const a=auth();if(!emailReady(a,up?'createUserWithEmailAndPassword':'signInWithEmailAndPassword'))return;
    try{a.languageCode=locale()==='th'?'th':'en'}catch(e){}
    const serial=S.serial;S.notice='';
    await busy(async()=>{
      if(up){const cred=await a.createUserWithEmailAndPassword(email,pw);
        /* ส่งลิงก์ยืนยันอีเมล — ไม่บังคับก่อนใช้งาน ส่งไม่สำเร็จก็ไม่ขวางการสมัคร */
        const u=cred&&cred.user;
        if(u&&typeof u.sendEmailVerification==='function'){
          try{await mailLink(o=>u.sendEmailVerification(o));S.notice=T('ส่งลิงก์ยืนยันอีเมลแล้ว ไม่ใช่รหัส OTP — เช็กกล่องจดหมายและจดหมายขยะ','Verification link sent, not an OTP — check your inbox and spam.')}
          catch(e){S.notice=T('สร้างบัญชีแล้ว แต่ส่งลิงก์ยืนยันไม่สำเร็จ กรุณาลองส่งใหม่ภายหลัง','Account created, but the verification email could not be sent. Please resend it later.')}
          if(current()?.uid===u.uid)render();
        }}
      else await a.signInWithEmailAndPassword(email,pw);
      if(serial===S.serial)S.password='';
    });
  }
  /* ลิงก์เข้าสู่ระบบทางอีเมล (Firebase ส่งให้ ไม่ต้องมีโดเมนอีเมลของเรา) · จำอีเมลไว้ในเครื่องนี้ไว้ยืนยันตอนกดลิงก์ แล้วลบทิ้ง */
  async function emailLink(email){
    const a=auth();if(!emailReady(a,'sendSignInLinkToEmail'))return;
    try{a.languageCode=locale()==='th'?'th':'en'}catch(e){}
    const next=S.next||safeNext(new URLSearchParams(location.search).get('next')),serial=S.serial;
    await busy(async()=>{
      await a.sendSignInLinkToEmail(email,{url:location.origin+'/login'+(next&&next!=='/'?'?next='+encodeURIComponent(next):''),handleCodeInApp:true});
      if(serial!==S.serial)return;
      try{localStorage.setItem(LINK_EMAIL,email)}catch(e){}
      S.email=email;S.resendAt=Date.now()+60000;S.mode='linksent';
      setTimeout(()=>{if(serial===S.serial&&S.mode==='linksent'){const b=D.getElementById('accountFlow')?.querySelector('[data-resend]');if(b)b.disabled=S.busy}},60000);
    });
  }
  const linkInUrl=()=>{try{const a=auth();return !!(a&&typeof a.isSignInWithEmailLink==='function'&&a.isSignInWithEmailLink(location.href))}catch(e){return false}};
  async function finishLink(email){
    const a=auth();if(!a||typeof a.signInWithEmailLink!=='function')return;
    /* เอารหัสในลิงก์ออกจากแถบที่อยู่ทันที (กันติดไปกับประวัติ/การแชร์หน้าจอ) */
    try{const u=new URL(linkHref),keep=new URLSearchParams();if(u.searchParams.get('next'))keep.set('next',u.searchParams.get('next'));history.replaceState(null,'',u.pathname+(keep.toString()?'?'+keep:''))}catch(e){}
    S.phase='auth';S.mode='linkemail';S.email=email||'';
    if(!email){render();return}
    return finishLinkWith(email);
  }
  let linkHref='';
  async function emailRequest(){
    const email=S.email.trim();
    if(!EMAIL_RE.test(email)||email.length>254){S.error=T('กรุณาใส่อีเมลให้ถูกต้อง','Enter a valid email address.');render();return}
    if(S.mode==='linkemail'){return finishLinkWith(email)}
    if(!otpReady()){if(Date.now()<S.resendAt&&S.mode==='linksent'){S.error=T('รอสักครู่ก่อนขอลิงก์ใหม่','Please wait before requesting another link.');render();return}return emailLink(email)}
    if(Date.now()<S.resendAt&&S.challenge){S.error=T('รอสักครู่ก่อนขอรหัสใหม่','Please wait before requesting another code.');render();return}
    const serial=S.serial;S.notice='';
    await busy(async()=>{const data=await request('/api/auth/email/request',{email});
      if(serial!==S.serial)return;
      if(!data.challengeId)throw new Error('verification_unavailable');
      S.email=email;S.challenge=data.challengeId;S.code='';S.resendAt=Date.now()+(data.resendAfter||60)*1000;S.mode='code';
      emailSession({email,id:S.challenge,expiresAt:Date.now()+(data.expiresIn||600)*1000,resendAt:S.resendAt});
      const challenge=S.challenge;
      /* ครบเวลารอแล้วเปิดปุ่ม "ส่งรหัสอีกครั้ง" โดยไม่วาดใหม่ (ตัวเลขที่พิมพ์ค้างไว้ไม่หาย) */
      setTimeout(()=>{if(serial===S.serial&&S.mode==='code'&&S.challenge===challenge){const button=D.getElementById('accountFlow')?.querySelector('[data-resend]');if(button)button.disabled=S.busy}},(data.resendAfter||60)*1000);
    });
  }
  /* กดลิงก์บนเครื่องอื่น (ไม่มีอีเมลที่จำไว้) → ให้พิมพ์อีเมลยืนยันก่อน */
  async function finishLinkWith(email){
    const a=auth();if(!a||typeof a.signInWithEmailLink!=='function')return;
    await busy(async()=>{await a.signInWithEmailLink(email,linkHref);try{localStorage.removeItem(LINK_EMAIL)}catch(e){}});
    /* ลิงก์หมดอายุ/ใช้ไปแล้ว/อีเมลไม่ตรง → กลับไปขอลิงก์ใหม่ (ข้อความผิดพลาดยังอยู่) */
    if(S.error&&!current()&&S.mode==='linkemail'){S.mode='otp';render()}
  }
  async function emailVerify(){
    const code=String(S.code||'').trim();
    if(!/^\d{6}$/.test(code)){S.error=T('ใส่รหัสให้ครบ 6 หลัก','Enter all six digits.');render();return}
    const serial=S.serial;
    await busy(async()=>{const a=auth();if(!a||typeof a.signInWithCustomToken!=='function')throw new Error('authentication_unavailable');
      const result=await request('/api/auth/email/verify',{challengeId:S.challenge,code});if(!result.customToken)throw new Error('verification_unavailable');
      if(serial!==S.serial)return;
      await a.signInWithCustomToken(result.customToken);S.challenge=null;S.code='';emailSession(null);
    });
  }
  async function resetPassword(){
    const email=S.email.trim();
    if(!EMAIL_RE.test(email)||email.length>254){S.error=T('กรุณาใส่อีเมลให้ถูกต้อง','Enter a valid email address.');render();return}
    const a=auth();if(!emailReady(a,'sendPasswordResetEmail'))return;
    try{a.languageCode=locale()==='th'?'th':'en'}catch(e){}
    S.notice='';
    await busy(async()=>{
      /* ไม่บอกว่าอีเมลนี้มีบัญชีหรือไม่ (กันคนสุ่มเช็กอีเมล) */
      try{await mailLink(o=>a.sendPasswordResetEmail(email,o))}catch(e){if(!/user-not-found/.test(String(e&&(e.code||e.message))))throw e}
      S.notice=T('ถ้ามีบัญชีที่ใช้อีเมลนี้ เราส่งลิงก์ตั้งรหัสผ่านใหม่ไปแล้ว — เช็กกล่องจดหมาย (และจดหมายขยะ)','If an account uses this email, a reset link is on its way — check your inbox (and spam).');
    });
  }
  async function provider(kind){if(S.busy)return;
    const serial=S.serial;
    const a=auth();if(!a||!W.firebase){S.error=T('ระบบล็อกอินกำลังโหลด กรุณาลองอีกครั้ง','Sign-in is still loading. Please try again.');render();return}
    if(typeof a.signInWithPopup!=='function'){
      if(!LOGIN){location.href='/login?next='+encodeURIComponent(location.pathname+location.search+location.hash);return}
      S.error=T('ระบบล็อกอินกำลังโหลด กรุณาลองอีกครั้ง','Sign-in is still loading. Please try again.');render();return;
    }
    if(/\bLine\//i.test(navigator.userAgent)){const u=new URL(location.href);u.searchParams.set('openExternalBrowser','1');
      S.error=T('เปิดลิงก์นี้ใน Safari หรือ Chrome ของเครื่องก่อนเข้าสู่ระบบ','Open this page in your device browser before signing in.');render();
      const el=D.getElementById('accountFlow').querySelector('.ac-actions'),link=D.createElement('a');link.className='ac-primary';link.href=u.href;link.textContent=T('เปิดในเบราว์เซอร์','Open in browser');el.prepend(link);return}
    const p=kind==='google'?new firebase.auth.GoogleAuthProvider():new firebase.auth.OAuthProvider('apple.com');
    if(kind==='google')p.setCustomParameters({prompt:'select_account'});else{p.addScope('email');p.addScope('name')}
    S.busy=true;S.error='';render();let popupTimer;
    try{await Promise.race([a.signInWithPopup(p),new Promise((_,reject)=>{popupTimer=setTimeout(()=>reject({code:'auth/popup-timeout'}),90000)})])}catch(e){
      if(['auth/popup-blocked','auth/cancelled-popup-request'].includes(e.code))try{await a.signInWithRedirect(p);return}catch(x){e=x}
      if(serial===S.serial&&e.code!=='auth/popup-closed-by-user')S.error=errorText({message:e.code||e.message});
    }finally{clearTimeout(popupTimer);if(serial===S.serial){S.busy=false;if(!D.getElementById('accountFlow')?.hidden)render()}}
  }
  async function nextStep(){
    const d=S.draft;
    if(S.step===0&&(!d.terms||!d.privacy)){S.error=T('กรุณาอ่านและเลือกยอมรับทั้งสองรายการก่อน','Please review and accept both items before continuing.');render();return}
    if(S.step===1&&!validName(d.name)){S.error=T('ใช้ชื่อ 1–60 ตัวอักษร โดยไม่ใส่โค้ดหรือสัญลักษณ์ควบคุม','Use a name of 1–60 characters without markup or control characters.');render();return}
    if(S.step===2&&!validBirth(birthDate())){S.error=T('กรุณาเลือกวันเกิดที่มีอยู่จริงและไม่ใช่วันในอนาคต','Choose a real date of birth, not a future date.');render();return}
    if(S.step===2&&age(birthDate())<18){S.error=T('นโยบายกำหนดให้ผู้ใช้มีอายุ 18 ปีขึ้นไป วันเกิดนี้จะไม่ถูกบันทึกไปยังบัญชี','The policy requires users to be 18 or older. This birthday will not be saved to your account.');render();return}
    if(S.step<5){S.step++;S.error='';render();return}
    const uid=S.uid,versions=S.status&&S.status.versions||{};
    await busy(async()=>{const data=await request('/api/onboarding',{consent:d.terms===true&&d.privacy===true,termsVersion:versions.terms,privacyVersion:versions.privacy,name:d.name.trim(),birthDate:birthDate(),lang:d.lang,distance:d.distance,currency:d.currency},'POST',uid);
      if(!canonical(data,uid))throw new Error('onboarding_unavailable');if(!uidIs(uid))return;publish(data);write(scoped('draft'),null);S.phase='complete';
    });
  }
  async function tutorial(){if(!W.CendonTour||!S.status||S.status.tutorial?.status!=='pending'||!/^\/(?:index(?:\.html)?)?\/?$/.test(location.pathname))return;
    const uid=S.uid,serial=S.serial;
    await CendonTour.start({language:locale()==='th'?'th':'en',finish:async status=>{if(serial!==S.serial||!uidIs(uid))return false;
      const data=await request('/api/onboarding/tutorial',{status},'POST',uid);if(serial!==S.serial||!uidIs(uid))return false;
      if(!canonical(data,uid)||data.tutorial?.status!==status)throw new Error('onboarding_unavailable');
      publish(data);
      const params=new URLSearchParams(location.search),returnTo=params.get('tourReturn');
      if(returnTo)location.replace(safeNext(returnTo));
      return true;
    }});
  }
  function enter(){close();
    const next=S.next||safeNext(new URLSearchParams(location.search).get('next'));
    // Only the first sign-in may introduce the Home tour. A pending optional
    // tour must never detour Chat/Garage/LINE navigation through Home.
    if(LOGIN&&S.status?.tutorial?.status==='pending'){
      const returnTo=LOGIN?next:safeNext(location.pathname+location.search+location.hash);
      go('/?tourReturn='+encodeURIComponent(returnTo));return;
    }
    if(LOGIN){go(next);return}tutorial().catch(()=>{})
  }
  /* ออกจากหน้าเข้าสู่ระบบ: รอรถ/แชตของบัญชีนี้ลงเครื่องก่อน (ไม่เกิน 2.5 วิ) แล้วส่งต่อการวาดหน้าแรก
     หน้าแอปที่เปิดจึงขึ้นชื่อ รูป และรถของบัญชีนี้ทันที ไม่มีของบัญชีก่อนหน้าแวบขึ้นมา */
  function go(to){
    if(!LOGIN||!W.CendonScope){location.replace(to);return}
    const leave=()=>{try{if(W.CendonPaint)W.CendonPaint.prepare(to)}catch(e){}location.replace(to)};
    W.CendonScope.ready(2500).then(leave,leave);
  }
  async function load(u){if(W.CendonTour)CendonTour.stop();
    const confirmed=S.uid===u.uid&&canonical(S.status,u.uid)?S.status:null;
    const old=read('spire_setup',{}),cache=read('spire___account_'+u.uid+'_status',null);
    // This is presentation only: Firebase must restore the same real UID, and
    // both cached records must belong to it. Never publish cached completion as
    // fresh server authority merely to avoid a navigation flash.
    const quiet=!LOGIN&&(confirmed||canonical(cache,u.uid)&&old?.uid===u.uid&&old.v===3&&['basic','advance','enthusiast'].includes(old.level));
    const serial=++S.serial;S.uid=u.uid;S.status=confirmed;S.phase='loading';S.error='';S.busy=false;
    if(!old||old.uid!==u.uid)try{localStorage.removeItem('spire_setup')}catch(e){}
    /* หน้าเข้าสู่ระบบ: ดึงรถ แชต สมุดรถ ของบัญชีนี้ลงเครื่องไปพร้อมกับตรวจบัญชี (ไม่ต้องรอกันทีละอย่าง) */
    if(LOGIN&&W.CendonScope)W.CendonScope.prime(u);
    S.draft={};
    if(quiet){close();D.documentElement.dataset.level='enthusiast'}else render();
    try{
      // Ordinary application pages already run their own authenticated login
      // hook. A known completed account needs only the current status check.
      if(!quiet){const me=await request('/api/login',{name:u.displayName||'',photo:u.photoURL||''},'POST',u.uid);if(W.CendonScope&&uidIs(u.uid))W.CendonScope.me(u,me)}
      const data=await request('/api/onboarding',undefined,'GET',u.uid);if(serial!==S.serial||!uidIs(u.uid))return;
      S.status=data;
      if(canonical(data,u.uid)){publish(data);enter();return}
      write(scoped('status'),null);
      if(W.CendonPaint)W.CendonPaint.invalidate(u.uid);
      if(data.status!=='required'||data.policy?.enabled!==true)throw new Error('onboarding_policy_unavailable');
      const cached=read(scoped('draft'),{});
      S.draft={lang:'th',distance:'km',currency:'THB',name:u.displayName||'',...cached};
      if(!LANGS[S.draft.lang])S.draft.lang='th';if(!['km','mi'].includes(S.draft.distance))S.draft.distance='km';
      S.phase='wizard';S.step=0;render();
    }catch(e){if(serial!==S.serial||!uidIs(u.uid))return;
      const cache=read(scoped('status'),null);
      if(canonical(cache,u.uid)&&!e.status){publish(cache);enter();return}
      S.status=null;if(e.status===401||e.status===403){write(scoped('status'),null);if(W.CendonPaint)W.CendonPaint.invalidate(u.uid)}
      S.phase='retry';S.error=errorText(e);render();
    }
  }
  function changed(u){if(!u){S.serial++;S.uid=null;S.status=null;S.draft={};S.busy=false;S.password='';S.notice='';S.code='';S.mode=startMode();if(W.CendonTour)CendonTour.stop();
      /* ไม่มีใครล็อกอิน = ไม่มีข้อมูลส่วนตัวของใครเหลือในเครื่อง (รถ แชต ชื่อ รูป) */
      if(W.CendonScope)W.CendonScope.release();
      if(W.CendonPaint)W.CendonPaint.observed(null);
      signedHint(false);
      /* ยังไม่ได้เข้าสู่ระบบ → เห็นได้แค่หน้าเข้าสู่ระบบ (หน้าแอปทุกหน้าพาไป /login แล้วกลับมาที่เดิมหลังล็อกอิน) */
      if(!LOGIN&&!openPath()){if(W.CendonScope)W.CendonScope.freeze();toLogin();return}
      signedOut=true;
      if(LOGIN){S.phase='auth';
        /* กลับมาจากลิงก์เข้าสู่ระบบในอีเมล → เข้าสู่ระบบให้เลย */
        if(linkInUrl()&&!linkHref){linkHref=location.href;let saved='';try{saved=localStorage.getItem(LINK_EMAIL)||''}catch(e){}finishLink(saved);return}
        restoreEmail();render()}else close();return}
    /* ข้อมูลในเครื่องเป็นของบัญชีอื่น → ล้างก่อน · หน้าแอปที่วาดของเก่าไปแล้วโหลดใหม่ (ปกติล้างตั้งแต่หน้าเข้าสู่ระบบ) */
    if(W.CendonScope&&W.CendonScope.claim(u.uid)&&!LOGIN){W.CendonScope.freeze();location.reload();return}
    if(W.CendonPaint)W.CendonPaint.observed(u.uid);
    signedHint(true);S.password='';S.code='';emailSession(null);if(u.uid!==S.uid)load(u);
  }
  function openLogin(next){S.next=next?safeNext(next):null;
    if(!LOGIN){location.href='/login?next='+encodeURIComponent(S.next||safeNext(location.pathname+location.search+location.hash));return}
    S.error='';if(current()){load(current());return}S.phase='auth';S.mode=startMode();render()}
  function setupRead(){const data=read('spire_setup',{}),u=current();return u&&data&&data.uid===u.uid?data:{}}
  function setupDone(){return !!(current()&&S.uid===current().uid&&canonical(S.status,S.uid))}
  /* หน้าตั้งค่า: บันทึกชื่อ ภาษา ระยะทาง สกุลเงิน ลงโปรไฟล์บนเซิร์ฟเวอร์ แล้วรอผล (สำเร็จ = เขียนลงเครื่อง + วาดชื่อใหม่ทุกที่) */
  function savePrefs(patch){const u=current();if(!u||!setupDone())return Promise.reject(new Error('not_ready'));
    const prefs={};for(const k of ['name','lang','currency','distance'])if(Object.hasOwn(patch||{},k))prefs[k]=patch[k];
    if(!Object.keys(prefs).length)return Promise.resolve(setupRead());
    return request('/api/onboarding/preferences',prefs,'PATCH',u.uid).then(data=>{if(!uidIs(u.uid))throw new Error('account_changed');
      if(!canonical(data,u.uid))throw new Error('onboarding_unavailable');publish(data);if(W.cloudMark)W.cloudMark('setup');return setupRead()})}
  function setupSave(patch){const u=current();if(!u||!setupDone())return setupRead();
    const allowed={};for(const k of ['name','lang','units','distance','currency','theme','level','plan','photo','notify'])if(Object.hasOwn(patch,k))allowed[k]=patch[k];
    const next={...setupRead(),...allowed,v:3,uid:u.uid};delete next.birthDate;
    const prefs={};for(const k of ['name','lang','currency','distance'])if(Object.hasOwn(patch,k))prefs[k]=patch[k];
    if(Object.hasOwn(patch,'units')&&!Object.hasOwn(prefs,'distance'))prefs.distance=patch.units==='imperial'?'mi':'km';
    if(Object.keys(prefs).length){request('/api/onboarding/preferences',prefs,'PATCH',u.uid).then(data=>{if(uidIs(u.uid)){if(!canonical(data,u.uid))throw new Error('onboarding_unavailable');publish(data);if(W.cloudMark)W.cloudMark('setup')}}).catch(()=>{if(W.toast)W.toast(T('บันทึกการตั้งค่าไม่สำเร็จ กรุณาลองใหม่','Could not save preferences. Please retry'),'ti-alert-triangle')});return setupRead()}
    write('spire_setup',next);if(W.cloudMark)W.cloudMark('setup');
    return next;
  }
  D.addEventListener('submit',e=>{const root=D.getElementById('accountFlow');if(!root||root.hidden||!root.contains(e.target))return;e.preventDefault();
    collect(root);
    if(S.phase==='auth'){if(S.mode==='reset')resetPassword();else if(S.mode==='otp'||S.mode==='linkemail')emailRequest();else if(S.mode==='code')emailVerify();else emailAuth()}else if(S.phase==='wizard')nextStep();
  });
  D.addEventListener('input',e=>{const root=D.getElementById('accountFlow');if(root&&!root.hidden&&root.contains(e.target)){
    /* รหัส: รับเลขไทยได้ เหลือเฉพาะตัวเลข 6 หลัก */
    if(e.target.name==='code')e.target.value=e.target.value.replace(/[๐-๙]/g,c=>String(c.charCodeAt(0)-3664)).replace(/[^0-9]/g,'').slice(0,6);
    collect(root);
  }});
  D.addEventListener('change',e=>{const root=D.getElementById('accountFlow');if(!root||root.hidden||!root.contains(e.target))return;collect(root);
    if(e.target.name==='lang'){S.error='';render()}
    if(['day','month','year'].includes(e.target.name)){const el=D.getElementById('acAge'),years=age(birthDate());if(el)el.textContent=years===null?'':T('อายุ '+years+' ปี',years+' years old')}
  });
  D.addEventListener('click',e=>{const root=D.getElementById('accountFlow');if(!root||root.hidden||!root.contains(e.target))return;
    const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.hasAttribute('data-switch-account')){busy(async()=>{if(W.CendonTour)CendonTour.stop();if(W.CendonScope)await W.CendonScope.signOut();else await auth().signOut()});return}
    if(b.dataset.provider){provider(b.dataset.provider);return}
    if(b.dataset.mode){collect(root);S.mode=b.dataset.mode;S.error='';S.notice='';S.showPw=false;render();return}
    if(b.hasAttribute('data-resend')){if(S.mode==='linksent'){if(Date.now()>=S.resendAt)emailLink(S.email)}else emailRequest();return}
    if(b.hasAttribute('data-change-email')){S.mode='otp';S.challenge=null;S.resendAt=0;S.code='';S.error='';emailSession(null);render();return}
    if(b.hasAttribute('data-eye')){collect(root);S.showPw=!S.showPw;render();const pass=D.getElementById('accountFlow').querySelector('[name="password"]');if(pass&&typeof pass.focus==='function')pass.focus();return}
    if(b.hasAttribute('data-prev')){collect(root);S.step=Math.max(0,S.step-1);S.error='';render()}
    if(b.dataset.distance){collect(root);S.draft.distance=b.dataset.distance;saveDraft();render()}
    if(b.hasAttribute('data-enter'))enter();
    if(b.hasAttribute('data-retry')){if(current())load(current());else location.reload()}
  });
  D.addEventListener('keydown',e=>{const root=D.getElementById('accountFlow');if(!root||root.hidden||e.key!=='Tab')return;
    const nodes=[...root.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]')];if(!nodes.length)return;
    const first=nodes[0],last=nodes[nodes.length-1];if(!root.contains(D.activeElement)){e.preventDefault();(e.shiftKey?last:first).focus()}else if(e.shiftKey&&D.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&D.activeElement===last){e.preventDefault();first.focus()}
  });
  D.addEventListener('focusin',e=>{const root=D.getElementById('accountFlow');if(root&&!root.hidden&&!root.contains(e.target)){const title=root.querySelector('#acTitle');if(title&&typeof title.focus==='function')title.focus({preventScroll:true})}});
  D.addEventListener('cendon:auth-error',e=>{if(LOGIN&&!current()){S.error=errorText({message:e.detail&&e.detail.code||'auth/redirect-error'});S.phase='auth';render()}});
  W.spireSetupRead=setupRead;W.spireSetupDone=setupDone;W.spireSetupSave=setupSave;W.spireSetupVersion=3;
  W.spireSavePrefs=savePrefs;W.spireMoney=()=>MONEY.slice();
  W.spireOpenSetup=()=>{if(current())load(current());else openLogin()};
  W.CendonAccount={openLogin,reload:()=>{if(current())load(current());else changed(null)},safeNext,validBirth,validName,ready:setupDone,completed:()=>!!canonical(S.status,S.uid)};
  const boundAuth=new WeakSet();
  function boot(){let tries=0;
    const existing=auth();if(existing&&boundAuth.has(existing))return;
    if(LOGIN&&!S.config){request('/api/auth/config',undefined,'GET').then(data=>{S.config=data;if(S.phase==='auth'&&!S.busy)render()}).catch(()=>{S.config={}})}
    if(W.spireRedirectError)S.error=errorText({message:W.spireRedirectError});
    // Do not paint the onboarding/loading sheet while a private page restores
    // identity. The existing page gate remains until the actual auth callback.
    if(LOGIN)render();
    const bind=()=>{const a=auth();if(a&&typeof a.onAuthStateChanged==='function'){
      if(boundAuth.has(a))return;boundAuth.add(a);
      let initial=false;const initialTimer=setTimeout(()=>{if(!initial&&(LOGIN||PRIVATE.test(location.pathname))){S.phase='retry';S.error=T('ระบบล็อกอินยังไม่ตอบ กรุณาลองเชื่อมต่ออีกครั้ง','Sign-in has not responded. Please reconnect.');render()}},12000);
      a.onAuthStateChanged(u=>{initial=true;clearTimeout(initialTimer);changed(u)});
      if(typeof a.getRedirectResult==='function'&&!W.spireRedirectResult)a.getRedirectResult().catch(e=>{S.error=errorText({message:e.code});if(LOGIN)render()});
      return;
    }if(++tries<40){setTimeout(bind,250);return}if(LOGIN||PRIVATE.test(location.pathname)){S.phase='auth';S.error=T('ระบบล็อกอินโหลดไม่สำเร็จ ลองรีเฟรชอีกครั้ง','Sign-in could not load. Please refresh and try again.');render()}};
    bind();
  }
  D.addEventListener('cendon:auth-ready',boot);
  /* คนที่เปิดลิงก์ใบงานแบบไม่ล็อกอิน ปิดใบงานแล้วกลับมาหน้าแอป → พาไปหน้าเข้าสู่ระบบ */
  if(typeof W.addEventListener==='function')W.addEventListener('popstate',()=>{if(signedOut&&!LOGIN&&!current()&&!tripPath())setTimeout(()=>{if(!current()&&!tripPath())toLogin()},60)});
  if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window,document);
