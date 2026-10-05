/* Shared real-data tools. No provider keys or synthetic results in the browser. */
(() => {
  'use strict';
  const D = document;
  const labels = {quote:['ตรวจใบเสนอราคา','Quote','ti-receipt-2'],listen:['ฟังเสียงรถ','Listen','ti-ear'],shake:['วัดอาการสั่น','Shake test','ti-activity'],park:['จำที่จอด','Parking','ti-map-pin'],own:['ต้นทุน & สมุดรถ','Cost & record','ti-report-money']};
  const descriptions = {
    quote:['แนบภาพใบเสนอราคา แล้วให้ AU+I อ่านรายการและช่วยตั้งคำถามก่อนซ่อม','Attach a quote. AU+I reads the items and helps you ask better questions.'],
    listen:['แนบหรืออัดเสียงขณะรถจอด เพื่อวิเคราะห์สิ่งที่ได้ยินและข้อจำกัด','Attach or record audio while parked for observations and safe next checks.'],
    shake:['วัดด้วยเซ็นเซอร์ก่อน แล้วให้ AU+I ช่วยแปลผล ไม่ใช่การฟันธงว่าอะไหล่เสีย','Measure first. AU+I interprets the evidence, not a definitive parts diagnosis.'],
    park:['ช่วยอ่านโน้ตและป้ายที่จอด พิกัดแม่นยำยังใช้แผนที่ในเครื่อง','Interpret parking notes and signs. Exact navigation stays with local maps.'],
    own:['ดูแนวโน้มจากค่าใช้จ่ายที่บันทึกจริง ไม่รวมรายจ่ายที่ยังไม่ได้จด','Explore recorded costs and gaps, without inventing missing expenses.']
  };
  const en = () => (window.lang || window.spireLang?.() || 'th') === 'en';
  const t = pair => pair[en()?1:0];
  let selected = null, bridge = null;
  const results = new Map();
  let busy = false;
  const escape = value => String(value || '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hint = key => t(descriptions[key]);

  function validate(key, attachments, context, question) {
    if (!context.car?.model && !context.car?.make) throw Error(t(['เลือกหรือเพิ่มรถใน Garage ก่อนครับ','Select a car in Garage first.']));
    if (key === 'quote' && !attachments.some(a=>a.mime?.startsWith('image/'))) throw Error(t(['แนบรูปใบเสนอราคาก่อนวิเคราะห์','Attach a quote photo first.']));
    if (key === 'listen' && !attachments.some(a=>a.mime?.startsWith('audio/'))) throw Error(t(['แนบเสียงหรือกดอัดเสียงก่อนวิเคราะห์','Attach or record audio first.']));
    if (key === 'shake' && !context.measurement?.peaks?.length) throw Error(t(['เปิดเตรียมข้อมูลและวัดการสั่นให้เสร็จก่อน','Open Prepare data and complete a measurement first.']));
    if (key === 'own' && !context.cost?.entryCount) throw Error(t(['ยังไม่มีประวัติค่าใช้จ่าย ให้บันทึกก่อนเพื่อให้ AI วิเคราะห์จากข้อมูลจริง','Save cost records first so AI has real data to analyze.']));
    if (key === 'park' && !context.parking && !attachments.length && !question) throw Error(t(['บันทึกจุดจอด หรือแนบรูปและโน้ตก่อน','Save a parking spot, or attach a photo and note first.']));
    if (attachments.length > 3 || attachments.reduce((n,a)=>n+(a.b64?.length||0),0)>12000000) throw Error(t(['แนบไม่เกิน 3 ไฟล์ และลดขนาดไฟล์ก่อนส่ง','Use up to 3 smaller files.']));
    if (attachments.some(a=>! /^(image\/(jpeg|png|webp)|audio\/(webm|mp4|mpeg|wav|ogg|x-wav))(;[\w=.-]+)?$/i.test(a.mime||''))) throw Error(t(['เครื่องมือนี้รองรับภาพ JPG/PNG/WebP และไฟล์เสียงเท่านั้น','Use JPG/PNG/WebP images or audio for this tool.']));
  }

  async function request(key, attachments, context, question, signal) {
    validate(key, attachments, context, question);
    const user = window.spireAuth?.currentUser || await window.spireAwaitUser?.();
    if (!user) throw Error(t(['กรุณาเข้าสู่ระบบเพื่อใช้ AI','Sign in to use AI.']));
    const token = await user.getIdToken();
    const response = await fetch(window.BACKEND_URL + '/api/features/analyze', {
      method:'POST', signal, headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
      body:JSON.stringify({tool:key,attachments:attachments.map(a=>({mime:a.mime,b64:a.b64})),context,question,lang:en()?'en':'th'})
    });
    const data = await response.json().catch(()=>null);
    if (!response.ok) {
      const error = Error(response.status===429?t(['โควตา AI หมดแล้ว กรุณาลองใหม่ภายหลัง','AI usage limit reached. Try again later.']):response.status===404?t(['ต้องอัปเดต backend เพื่อเปิดใช้ AI เครื่องมือนี้','Update the backend to enable tool analysis.']):t(['วิเคราะห์ไม่ได้ชั่วคราว กรุณาตรวจข้อมูลแล้วลองใหม่','Analysis unavailable. Check your input and try again.']));
      error.userQuota = response.status===429; throw error;
    }
    if (!data?.text || data.source !== 'ai') throw Error(t(['ยังไม่ได้รับผลจาก AI กรุณาลองใหม่','No AI result received. Please retry.']));
    return data.text;
  }

  function mount(key) {
    if (!labels[key]) return;
    const inline=D.getElementById('faInline');
    if (inline && !inline.hidden && inline.contains(D.getElementById('v-quote'))) { selected=key; paintSelection(); }
    let card=D.getElementById('faInsight');
    if(!card){card=D.createElement('section');card.id='faInsight';card.className='fa-insight';D.getElementById('lgQuote')?.after(card);}
    const result=results.get(key);
    card.innerHTML=`<div class="fa-insight-head"><span class="fa-mark">AU+I</span><div><h3>${t(['มองให้ลึกขึ้น ด้วยข้อมูลของคุณ','A second look at your real data'])}</h3><p>${escape(hint(key))}</p></div></div><div class="fa-actions"><button type="button" class="fa-primary" id="faAnalyze" ${busy?'disabled':''}><i class="ti ti-sparkles"></i>${busy?t(['กำลังวิเคราะห์…','Analyzing…']):t(['วิเคราะห์ด้วย AU+I','Analyze with AU+I'])}</button>${D.getElementById('composer')?'':`<a href="/chat?tool=${key}" class="fa-link">${t(['คุยต่อในแชต','Continue in chat'])} ↗</a>`}</div><p class="fa-privacy">${t(['ส่งข้อมูลเพื่อวิเคราะห์เมื่อคุณกดเท่านั้น • ไม่ส่งพิกัดที่จอดให้ AI','Data is sent only when you ask • Parking coordinates stay local'])}</p><div id="faResult" role="status" aria-live="polite" class="fa-result" ${result?'':'hidden'}>${escape(result)}</div>`;
    D.getElementById('faAnalyze').onclick=async()=>{
      if(busy)return;
      const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),90000);
      busy=true;mount(key);
      try { results.set(key,await request(key,await bridge.media(key),bridge.context(key),'',controller.signal)); }
      catch(e){results.set(key,e.name==='AbortError'?t(['ใช้เวลานานเกินไป กรุณาลองใหม่','Timed out. Please retry.']):e.message);}
      finally{clearTimeout(timeout);busy=false;mount(bridge.current());}
    };
  }

  function paintSelection(){
    D.getElementById('faToolbar')?.setAttribute('data-active',String(!!selected));
    D.querySelectorAll('[data-fa-tool]').forEach(b=>{const on=b.dataset.faTool===selected;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
    const status=D.getElementById('faSelection');
    if(status)status.textContent=selected?hint(selected):t(['เลือกเครื่องมือให้ AU+I รู้ว่าต้องช่วยเรื่องอะไร','Choose a tool to give AU+I the right task.']);
    const details=D.getElementById('faPrepare'); if(details)details.hidden=!selected;
  }

  function reset(){
    bridge?.stop();selected=null;results.clear();
    const workspace=D.getElementById('faInline');if(workspace)workspace.hidden=true;
    paintSelection();
  }

  function select(key){
    if(!labels[key])return;
    if(window.spireHasFeature && !window.spireHasFeature(key)) {window.toast?.(t(['แผนของคุณยังไม่เปิดเครื่องมือนี้','This tool is not included in your plan.']),'ti-lock');return;}
    bridge?.stop();selected=key;paintSelection();
    if(D.body.dataset.phase==='welcome')window.setPhase?.('thread');
    if(D.getElementById('faInline')&&!D.getElementById('faInline').hidden)bridge?.open(key,true);
    const input=D.getElementById('inp');
    if(input && !input.value.trim()) {input.value=t(['ช่วยวิเคราะห์ข้อมูลด้วยเครื่องมือนี้','Please analyze my data with this tool']);input.dispatchEvent(new Event('input',{bubbles:true}));}
    input?.focus();
    if(key==='shake')D.getElementById('faPrepare')?.click();
  }

  function chatToolbar(){
    const composer=D.getElementById('composer');if(!composer||D.getElementById('faToolbar'))return;
    const toolbar=D.createElement('div');toolbar.id='faToolbar';toolbar.className='fa-toolbar';
    toolbar.innerHTML=`<div class="fa-tools" aria-label="AU+I tools">${Object.entries(labels).map(([key,v])=>`<button type="button" data-fa-tool="${key}" aria-pressed="false"><i class="ti ${v[2]}"></i>${escape(t(v))}</button>`).join('')}<button type="button" id="faClear" aria-label="${t(['แชตปกติ','Normal chat'])}"><i class="ti ti-x"></i></button></div><div class="fa-selection"><span id="faSelection"></span><button type="button" id="faPrepare" hidden>${t(['เตรียมข้อมูล','Prepare data'])} ↗</button></div><div id="faInline" hidden><button type="button" id="faCollapse">${t(['ย่อเครื่องมือ','Collapse tool'])} ↑</button></div>`;
    composer.prepend(toolbar);
    toolbar.querySelectorAll('[data-fa-tool]').forEach(b=>b.onclick=()=>select(b.dataset.faTool));
    D.getElementById('faPrepare').onclick=()=>{
      const workspace=D.getElementById('faInline'),view=D.getElementById('v-quote');
      if(!view)return;
      workspace.hidden=false;workspace.append(view);view.classList.add('active');bridge.open(selected,true);
    };
    D.getElementById('faCollapse').onclick=()=>{bridge.stop();D.getElementById('faInline').hidden=true;};
    D.getElementById('faClear').onclick=reset;
    paintSelection();
    const initial=new URLSearchParams(location.search).get('tool');if(labels[initial])select(initial);
  }

  window.CendonFeatureAI={
    register(value){bridge=value;queueMicrotask(chatToolbar);},mount,select,reset,
    async prepare(attachments,question,previous){
      if(!selected)return null;
      const key=selected,context=bridge.context(key);
      let media=attachments.length?attachments.slice():await bridge.media(key);
      if(!media.length && previous?.featureTool===key)media=(previous.atts||[]).filter(a=>a.b64&&a.mime);
      validate(key,media,context,question);
      return {key,context,question,attachments:media};
    },
    async analyze(job,signal){
      const attachments=job.attachments.length?job.attachments:await bridge.media(job.key);
      return request(job.key,attachments,job.context,job.question,signal);
    }
  };
})();
