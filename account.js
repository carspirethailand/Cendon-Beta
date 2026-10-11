/* One account flow: verified Firebase identity + server-owned first-use status. */
(function(W,D){
  'use strict';
  const LANGS={th:'ไทย',en:'English',ja:'日本語',zh:'中文',ko:'한국어',de:'Deutsch',fr:'Français',es:'Español',id:'Bahasa Indonesia',vi:'Tiếng Việt',ms:'Bahasa Melayu',pt:'Português',ar:'العربية'};
  const MONEY=['THB','USD','EUR','GBP','JPY','CNY','SGD','AUD','CAD','CHF','NZD','HKD','MYR','IDR','KRW','VND','INR','TWD','AED'];
  const privacyUrl=()=>S.status?.policy?.privacyUrl||S.config?.privacyUrl||'https://carspirethailand.github.io/Phasmion.ai/privacy.html';
  const PRIVATE=/^\/(garage|chat|news|spares|profile)(?:\.html)?(?:\/|$)/;
  const LOGIN=/^\/login(?:\.html)?\/?$/.test(location.pathname);
  const S={uid:null,serial:0,status:null,phase:'loading',step:0,draft:{},error:'',busy:false,email:'',challenge:null,resendAt:0,next:null,config:null};
  const locked=new Map();let modalOpen=false,previousFocus=null;
  const auth=()=>W.auth||W.spireAuth, current=()=>auth()&&auth().currentUser;
  const read=(k,fallback)=>{try{const v=JSON.parse(localStorage.getItem(k));return v===null?fallback:v}catch(e){return fallback}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const locale=()=>S.draft.lang||S.status&&S.status.profile&&S.status.profile.lang||read('spire_lang','th');
  const T=(th,en)=>locale()==='th'?th:en;
  const scoped=k=>'spire___account_'+S.uid+'_'+k;
  function saveDraft(){const safe={};for(const k of ['terms','privacy','name','lang','distance','currency'])if(Object.hasOwn(S.draft,k))safe[k]=S.draft[k];write(scoped('draft'),safe)}
  const EMAIL_SESSION='cendon_email_challenge';
  function emailSession(value){try{if(value===null)sessionStorage.removeItem(EMAIL_SESSION);else sessionStorage.setItem(EMAIL_SESSION,JSON.stringify(value))}catch(e){}}
  function restoreEmail(){try{const p=JSON.parse(sessionStorage.getItem(EMAIL_SESSION));
    if(p&&typeof p.email==='string'&&p.email.length<=254&&typeof p.id==='string'&&p.id.length<=100&&p.expiresAt>Date.now()){
      S.email=p.email;S.challenge=p.id;S.resendAt=Number(p.resendAt)||0;S.phase='code';return true;
    }
  }catch(e){}emailSession(null);return false}
  function safeNext(raw){
    try{if(/[\\\p{Cc}]/u.test(decodeURIComponent(raw||'')))return '/';
      const u=new URL(raw||'/',location.origin),p=u.pathname.replace(/\.html$/,'').replace(/\/$/,'')||'/';
      const simple=['/','/index','/garage','/chat','/news','/spares','/profile','/tech','/techs','/admin','/handbook','/plan','/terms','/search','/map','/urgent','/diagnose','/jobs','/studio','/work','/staff','/join','/quotes','/post'];
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
    if(/popup-timeout/.test(code))return T('หน้าต่างล็อกอินยังไม่ตอบ ตรวจว่ามีหน้าต่างเปิดอยู่หรืออนุญาต pop-up แล้วลองใหม่','Sign-in has not responded. Check the sign-in window or allow pop-ups, then try again.');
    if(/minimum_age_18/.test(code))return T('นโยบายกำหนดให้ผู้ใช้มีอายุ 18 ปีขึ้นไป','The policy requires users to be 18 or older.');
    if(/operation-not-allowed|configuration-not-found/.test(code))return T('ช่องทางนี้ยังไม่ได้เปิดใช้งาน กรุณาใช้ Google หรือติดต่อผู้ดูแล','This sign-in method is not configured. Use Google or contact support.');
    if(/recovery-required/.test(code))return T('บัญชีนี้ต้องยืนยันกับช่องทางเดิมก่อน กรุณาใช้ Google หรือ Apple ที่เคยเชื่อมไว้','Use the Google or Apple sign-in already linked to this account.');
    if(/account-exists-with-different-credential/.test(code))return T('อีเมลนี้ผูกกับช่องทางอื่นอยู่ กรุณาใช้ช่องทางที่เคยสมัครไว้','This email is linked to another sign-in method. Use that method first.');
    if(/too-many|rate|cooldown/.test(code)||error&&error.status===429)return T('ขอรหัสบ่อยเกินไป รอสักครู่แล้วลองใหม่','Too many requests. Please wait before trying again.');
    if(/invalid.*code|expired|challenge|otp|verification/.test(code)&&error&&error.status!==503)return T('รหัสไม่ถูกต้องหรือหมดอายุแล้ว กรุณาตรวจรหัสหรือขอรหัสใหม่','The code is incorrect or expired. Check it or request a new code.');
    if(/unavailable|not-configured/.test(code)||error&&error.status===503)return T('ระบบยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง','This service is unavailable. Please try again later.');
    if(/suspended|disabled|banned/.test(code)||error&&error.status===403)return T('บัญชีนี้ยังเข้าใช้งานไม่ได้ กรุณาติดต่อผู้ดูแล','This account cannot sign in. Please contact support.');
    if(/consent_version_changed/.test(code))return T('ข้อมูลข้อตกลงเปลี่ยนแล้ว กรุณากดย้อนกลับไปอ่านและยอมรับอีกครั้ง','The agreement changed. Go back and review it again.');
    return T('เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่ ข้อมูลที่กรอกยังอยู่','Connection failed. Please try again. Your entries are still here.');
  }
  function host(){let el=D.getElementById('accountFlow');if(!el){el=D.createElement('main');el.id='accountFlow';D.body.appendChild(el)}
    if(!modalOpen){modalOpen=true;previousFocus=D.activeElement}
    for(const node of [...(D.body.children||[])])if(node!==el&&!locked.has(node)){locked.set(node,node.inert);node.inert=true}
    el.className='ac-screen';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','acTitle');el.hidden=false;return el}
  function close(){const el=D.getElementById('accountFlow');if(el)el.hidden=true;
    for(const [node,inert] of locked)node.inert=inert;locked.clear();modalOpen=false;
    if(previousFocus&&previousFocus.isConnected&&typeof previousFocus.focus==='function')previousFocus.focus({preventScroll:true});previousFocus=null;
    D.documentElement.dataset.gate='0';
    if(canonical(S.status,S.uid))D.documentElement.dataset.level=S.status.profile&&S.status.profile.level||'enthusiast';
  }
  function publish(data){
    if(!canonical(data,S.uid)||!uidIs(S.uid))return;
    S.status=data;const cachedStatus={...data,profile:{...data.profile}};delete cachedStatus.profile.birthDate;write(scoped('status'),cachedStatus);
    const p=data.profile||{},old=read('spire_setup',{}),prior=old&&old.uid===S.uid?old:{};
    const complete=!!canonical(data,S.uid),projection={...prior,...p,v:3,uid:S.uid,accountComplete:complete,onboardingComplete:complete,completed:complete,level:p.level||prior.level||'enthusiast',plan:p.plan||prior.plan||'free'};
    delete projection.birthDate;
    write('spire_setup',projection);write('spire_lang',p.lang||'th');write('spire_units',p.units||'metric');
    const cached=read('spire_cachedUser',null);if(cached&&cached.uid===S.uid){cached.name=p.name||cached.name;write('spire_cachedUser',cached)}
    try{if(W.currentUser&&W.currentUser.uid===S.uid)W.currentUser.name=p.name||W.currentUser.name}catch(e){}
    try{if(W.spireSetLang&&p.lang)W.spireSetLang(p.lang);if(W.spireApplySetup)W.spireApplySetup()}catch(e){}
    D.documentElement.dataset.level=projection.level;
    for(const name of ['renderAuthUI','renderProfile','updateGreeting'])try{if(W[name])W[name]()}catch(e){}
  }
  function option(value,label,selected){return `<option value="${esc(value)}"${value===String(selected)?' selected':''}>${esc(label)}</option>`}
  function providerIcon(kind){
    if(kind==='Email')return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3 5h18v14H3zM3 5l9 7 9-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    if(kind==='Apple')return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M17.1 12.5c0-2 1.6-3 1.7-3.1-1-1.4-2.5-1.6-3.1-1.6-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 7 1.2 9.2.7 1.1 1.6 2.2 2.7 2.2s1.5-.7 2.8-.7 1.7.7 2.8.7 1.9-1.1 2.6-2.1c.9-1.2 1.2-2.4 1.2-2.4-.1 0-2.3-.9-2.3-3.4v-1zm-2-6.2c.6-.8 1.1-1.8 1-2.8-1 .1-2.1.7-2.8 1.5-.6.7-1.1 1.8-1 2.8 1.1.1 2.1-.6 2.8-1.5z"/></svg>';
    return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.3h5.9c-.3 1.4-1 2.6-2.2 3.4v2.8h3.6c2.1-1.9 3.3-4.8 3.3-8.2z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.5l-3.6-2.8c-1 .6-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.4H2.1v2.9C3.9 20.6 7.6 23 12 23z"/><path fill="#FBBC05" d="M5.8 14.3c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3V6.8H2.1C1.4 8.4 1 10.1 1 12s.4 3.6 1.1 5.2z"/><path fill="#EA4335" d="M12 5.3c1.6 0 3.1.6 4.2 1.6l3.1-3.1C17.5 2.1 15 1 12 1 7.6 1 3.9 3.4 2.1 6.8l3.7 2.9C6.7 7.2 9.1 5.3 12 5.3z"/></svg>';
  }
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
    if(phase==='auth'){title=T('เข้ามาคุยกัน','Welcome back');copy=T('รถของคุณ มีเราอยู่ข้าง ๆ เลือกวิธีเข้าสู่ระบบที่สะดวก','A little help for your everyday car. Choose how you would like to sign in.');
      form=['Google','Apple','Email'].map(p=>`<button class="ac-provider" type="button" data-provider="${p.toLowerCase()}"${S.busy||p==='Email'&&S.config?.emailOtpReady===false||p==='Apple'&&S.config?.appleAuthReady===false?' disabled':''}><span class="ac-icon" aria-hidden="true">${providerIcon(p)}</span><span>${p==='Email'?T('รับรหัสทางอีเมล','Get a code by email'):T('เข้าสู่ระบบด้วย ','Continue with ')+p}</span></button>`).join('');
      if(S.config?.appleAuthReady===false)form+=`<p class="ac-availability" role="status">${T('Apple ยังไม่เปิดใช้งาน กรุณาใช้ Google ก่อน','Apple sign-in is not available yet. Please use Google.')}</p>`;
      if(S.config?.emailOtpReady===false)form+=`<p class="ac-availability" role="status">${T('รหัสทางอีเมลยังไม่เปิดใช้งาน กรุณาเลือกช่องทางอื่นด้านบน','Email codes are not available yet. Please choose another method above.')}</p>`;
      actions=`<a class="ac-link" href="/">${T('กลับหน้าหลัก','Back to home')}</a>`;
    }else if(phase==='email'){title=T('อีเมลของคุณ','Your email');copy=T('เราจะส่งรหัส 6 หลัก ไม่ต้องตั้งหรือจำรหัสผ่าน','We will send a six-digit code. No password to create or remember.');
      form=`<label class="ac-label" for="acEmail">${T('อีเมล','Email')}</label><input class="ac-input" id="acEmail" name="email" type="email" autocomplete="email" inputmode="email" value="${esc(S.email)}" required><button class="ac-primary" type="submit"${S.busy?' disabled':''}>${S.busy?T('กำลังส่งรหัส…','Sending…'):T('ส่งรหัสให้ฉัน','Send me a code')}</button>`;actions=`<button class="ac-back" type="button" data-back-auth>${T('ย้อนกลับ','Back')}</button>`;
    }else if(phase==='code'){title=T('เช็กกล่องจดหมาย','Check your inbox');copy=T('ส่งรหัสไปที่ ','Code sent to ')+S.email;
      form=`<label class="ac-label" for="acCode">${T('รหัส 6 หลัก','Six-digit code')}</label><input class="ac-input ac-code" id="acCode" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" aria-describedby="acCodeNote" required><p class="ac-copy" id="acCodeNote">${T('รหัสใช้ได้ 10 นาที และใช้ได้ครั้งเดียว','The code expires in ten minutes and can be used once.')}</p><button class="ac-primary" type="submit"${S.busy?' disabled':''}>${S.busy?T('กำลังตรวจรหัส…','Checking…'):T('ยืนยันและเข้าสู่ระบบ','Verify and sign in')}</button><button class="ac-link" type="button" data-resend${Date.now()<S.resendAt||S.busy?' disabled':''}>${T('ส่งรหัสอีกครั้ง','Send another code')}</button>`;actions=`<button class="ac-back" type="button" data-change-email>${T('เปลี่ยนอีเมล','Change email')}</button>`;
    }else if(phase==='wizard'){[title]=[T(...titles[S.step])];form=stepForm();
      actions=`${S.step?`<button class="ac-back" type="button" data-prev${S.busy?' disabled':''}>${T('ย้อนกลับ','Back')}</button>`:''}<button class="ac-primary" type="submit"${S.busy?' disabled':''}>${S.busy?T('กำลังบันทึก…','Saving…'):S.step===5?T('ตั้งค่าให้เรียบร้อย','Finish setup'):T('ถัดไป','Continue')}</button>`;
    }else if(phase==='complete'){title=T('พร้อมไปด้วยกันแล้ว','You are all set');copy=T('ตั้งค่าเสร็จแล้ว ครั้งต่อไปเข้าสู่ระบบก็ใช้งานได้เลย มาดูจุดสำคัญในแอปกันสั้น ๆ','Your setup is saved to your account. Next time, just sign in. Let us show you around.');
      form='<div class="ac-complete" aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M20 32 28 40 44 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>';
      actions=`<button class="ac-primary" type="button" data-enter>${T('เริ่มใช้งาน','Start using Cendon')}</button>`;
    }else{title=phase==='retry'?T('ขอลองเชื่อมต่ออีกครั้ง','Let us reconnect'):T('กำลังเตรียมพื้นที่ของคุณ','Getting your space ready');copy=phase==='retry'?T('ยังตรวจข้อมูลบัญชีไม่ได้ เราจะไม่ให้ตั้งค่าใหม่เพียงเพราะการเชื่อมต่อสะดุด','We could not check your account. A connection issue should not make you set everything up again.'):T('เช็กการตั้งค่าที่บันทึกไว้ให้ก่อน สักครู่นะครับ','Checking your saved settings. Just a moment.');
      form=phase==='retry'?`<button class="ac-primary" type="button" data-retry>${T('ลองใหม่','Try again')}</button>`:'<div class="ac-loading" role="status" aria-label="Loading"></div>'}
    const wizard=phase==='wizard'||phase==='complete',step=phase==='complete'?7:S.step+1;
    root.innerHTML=`<section class="ac-sheet"><header class="ac-brand"><span>Cendon</span>${wizard?`<span class="ac-progress" aria-label="${step}/7"><span style="width:${step/7*100}%"></span></span>`:''}${current()&&phase!=='loading'?`<button class="ac-link" type="button" data-switch-account>${T('ออกจากระบบ','Sign out')}</button>`:''}</header>${wizard?`<p class="ac-kicker">${step} / 7 · ${T('ครั้งแรก ครั้งเดียว','Once, for your account')}</p>`:''}<h1 class="ac-title" id="acTitle" tabindex="-1">${esc(title)}</h1>${copy?`<p class="ac-copy">${esc(copy)}</p>`:''}<form class="ac-form" novalidate>${form}<p class="ac-error" role="alert"${S.error?'':' hidden'}>${esc(S.error)}</p><div class="ac-actions">${actions}</div></form><footer class="ac-legal"><a href="/terms" target="_blank" rel="noopener">${T('ข้อกำหนด','Terms')}</a>${privacyUrl()?` · <a href="${esc(privacyUrl())}" target="_blank" rel="noopener">${T('ความเป็นส่วนตัว','Privacy')}</a>`:''}</footer></section>`;
    if(S.busy)root.querySelectorAll('input,select,button').forEach(el=>{el.disabled=true});
    D.documentElement.dataset.gate='1';
    requestAnimationFrame(()=>{if(!root.hidden){const f=phase!=='auth'&&!S.busy&&root.querySelector('form')?.querySelector('input,select,button')||root.querySelector('#acTitle');if(f&&typeof f.focus==='function')f.focus({preventScroll:true})}});
  }
  function collect(root){const form=root.querySelector('form');if(!form)return;
    form.querySelectorAll('[name]').forEach(el=>{if(S.phase==='wizard')S.draft[el.name]=el.type==='checkbox'?el.checked:el.value;else if(el.name==='email')S.email=el.value.trim()});
    if(S.uid&&S.phase==='wizard')saveDraft();
  }
  async function busy(fn){if(S.busy)return;const serial=S.serial;S.busy=true;S.error='';render();
    try{await fn()}catch(e){if(serial===S.serial){S.error=errorText(e);
      if(e.message==='consent_version_changed'&&uidIs(S.uid))try{const uid=S.uid,data=await request('/api/onboarding',undefined,'GET',uid);if(serial===S.serial&&uidIs(uid)){S.status=data;S.step=0;S.draft.terms=false;S.draft.privacy=false}}catch(x){}
    }}finally{if(serial===S.serial){S.busy=false;if(!D.getElementById('accountFlow')?.hidden)render()}}
  }
  async function emailRequest(){
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(S.email)||S.email.length>254){S.error=T('กรุณาใส่อีเมลให้ครบ','Enter a valid email address');render();return}
    if(Date.now()<S.resendAt&&S.challenge){S.error=T('รอสักครู่ก่อนขอรหัสใหม่','Please wait before requesting another code');render();return}
    const serial=S.serial,email=S.email;
    await busy(async()=>{const data=await request('/api/auth/email/request',{email});
      if(serial!==S.serial)return;
      if(!data.challengeId)throw new Error('verification_unavailable');S.email=email;S.challenge=data.challengeId;S.resendAt=Date.now()+(data.resendAfter||60)*1000;S.phase='code';
      emailSession({email,id:S.challenge,expiresAt:Date.now()+(data.expiresIn||600)*1000,resendAt:S.resendAt});
      const challenge=S.challenge;
      setTimeout(()=>{if(serial===S.serial&&S.phase==='code'&&S.challenge===challenge){const button=D.getElementById('accountFlow')?.querySelector('[data-resend]');if(button)button.disabled=S.busy}},(data.resendAfter||60)*1000);
    });
  }
  async function emailVerify(code){
    if(!/^\d{6}$/.test(code)){S.error=T('ใส่รหัสให้ครบ 6 หลัก','Enter all six digits');render();return}
    const serial=S.serial;
    await busy(async()=>{const a=auth();if(!a||typeof a.signInWithCustomToken!=='function')throw new Error('authentication_unavailable');
      const result=await request('/api/auth/email/verify',{challengeId:S.challenge,code});if(!result.customToken)throw new Error('verification_unavailable');
      if(serial!==S.serial)return;
      await a.signInWithCustomToken(result.customToken);S.challenge=null;emailSession(null);
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
    if(S.status?.tutorial?.status==='pending'&&(LOGIN||!/^\/(?:index(?:\.html)?)?\/?$/.test(location.pathname))){
      const returnTo=LOGIN?next:safeNext(location.pathname+location.search+location.hash);
      location.replace('/?tourReturn='+encodeURIComponent(returnTo));return;
    }
    if(LOGIN){location.replace(next);return}tutorial().catch(()=>{})
  }
  async function load(u){if(W.CendonTour)CendonTour.stop();const serial=++S.serial;S.uid=u.uid;S.status=null;S.phase='loading';S.error='';S.busy=false;
    const old=read('spire_setup',{});if(!old||old.uid!==u.uid)try{localStorage.removeItem('spire_setup')}catch(e){}
    S.draft={};render();
    try{
      await request('/api/login',{name:u.displayName||'',photo:u.photoURL||''},'POST',u.uid);
      const data=await request('/api/onboarding',undefined,'GET',u.uid);if(serial!==S.serial||!uidIs(u.uid))return;
      S.status=data;
      if(canonical(data,u.uid)){publish(data);enter();return}
      if(data.status!=='required'||data.policy?.enabled!==true)throw new Error('onboarding_policy_unavailable');
      const cached=read(scoped('draft'),{});
      S.draft={lang:'th',distance:'km',currency:'THB',name:u.displayName||'',...cached};
      if(!LANGS[S.draft.lang])S.draft.lang='th';if(!['km','mi'].includes(S.draft.distance))S.draft.distance='km';
      S.phase='wizard';S.step=0;render();
    }catch(e){if(serial!==S.serial||!uidIs(u.uid))return;
      const cache=read(scoped('status'),null);
      if(canonical(cache,u.uid)&&!e.status){publish(cache);enter();return}
      S.phase='retry';S.error=errorText(e);render();
    }
  }
  function changed(u){if(!u){S.serial++;S.uid=null;S.status=null;S.draft={};S.busy=false;S.challenge=null;if(W.CendonTour)CendonTour.stop();
      if(LOGIN||PRIVATE.test(location.pathname)){S.phase='auth';if(LOGIN)restoreEmail();render()}else close();return}
    emailSession(null);if(u.uid!==S.uid)load(u);
  }
  function openLogin(next){S.next=next?safeNext(next):null;
    if(!LOGIN){location.href='/login?next='+encodeURIComponent(S.next||safeNext(location.pathname+location.search+location.hash));return}
    S.error='';if(current()){load(current());return}S.phase='auth';render()}
  function setupRead(){const data=read('spire_setup',{}),u=current();return u&&data&&data.uid===u.uid?data:{}}
  function setupDone(){return !!(current()&&S.uid===current().uid&&canonical(S.status,S.uid))}
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
    const code=root.querySelector('[name="code"]')?.value||'';collect(root);
    if(S.phase==='email')emailRequest();else if(S.phase==='code')emailVerify(code.trim());else if(S.phase==='wizard')nextStep();
  });
  D.addEventListener('input',e=>{const root=D.getElementById('accountFlow');if(root&&!root.hidden&&root.contains(e.target)){
    if(e.target.name==='code')e.target.value=e.target.value.replace(/[๐-๙]/g,c=>String(c.charCodeAt(0)-3664)).replace(/[^0-9]/g,'').slice(0,6);
    collect(root);
  }});
  D.addEventListener('change',e=>{const root=D.getElementById('accountFlow');if(!root||root.hidden||!root.contains(e.target))return;collect(root);
    if(e.target.name==='lang'){S.error='';render()}
    if(['day','month','year'].includes(e.target.name)){const el=D.getElementById('acAge'),years=age(birthDate());if(el)el.textContent=years===null?'':T('อายุ '+years+' ปี',years+' years old')}
  });
  D.addEventListener('click',e=>{const root=D.getElementById('accountFlow');if(!root||root.hidden||!root.contains(e.target))return;
    const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.hasAttribute('data-switch-account')){busy(async()=>{if(W.CendonTour)CendonTour.stop();await auth().signOut()});return}
    if(b.dataset.provider){if(b.dataset.provider==='email'){S.phase='email';S.error='';render()}else provider(b.dataset.provider);return}
    if(b.hasAttribute('data-back-auth')){S.phase='auth';S.error='';render()}
    if(b.hasAttribute('data-change-email')){S.phase='email';S.challenge=null;S.resendAt=0;S.error='';emailSession(null);render()}
    if(b.hasAttribute('data-resend'))emailRequest();
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
  W.spireOpenSetup=()=>{if(current())load(current());else openLogin()};
  W.CendonAccount={openLogin,reload:()=>{if(current())load(current());else changed(null)},safeNext,validBirth,validName,ready:setupDone,completed:()=>!!canonical(S.status,S.uid)};
  const boundAuth=new WeakSet();
  function boot(){let tries=0;
    const existing=auth();if(existing&&boundAuth.has(existing))return;
    if(LOGIN&&!S.config){request('/api/auth/config',undefined,'GET').then(data=>{S.config=data;if(S.phase==='auth'&&!S.busy)render()}).catch(()=>{S.config={emailOtpReady:false};if(S.phase==='auth'&&!S.busy)render()})}
    if(W.spireRedirectError)S.error=errorText({message:W.spireRedirectError});
    if(LOGIN||PRIVATE.test(location.pathname))render();
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
  if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window,document);
