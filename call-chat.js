/* A conversation view inside the current document. Never navigates, opens a
   microphone or creates a second Live session. File bytes exist in RAM only. */
(function(){
'use strict';
const cancelled=()=>Object.assign(Error('Cancelled'),{name:'AbortError'});
const check=signal=>{if(signal?.aborted)throw cancelled()};
function b64(bytes){let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s)}
function fileKind(file){
  if(!file||!Number.isFinite(file.size)||file.size<=0||file.size>8000000)throw Error('file_size');
  const type=String(file.type||'').toLowerCase(),name=String(file.name||'');
  if(['image/jpeg','image/png','image/webp'].includes(type))return 'image';
  if(type==='application/pdf'||(!type&&/\.pdf$/i.test(name))){if(file.size>3000000)throw Error('file_size');return 'pdf';}
  if((type==='text/plain'||type==='text/csv'||(!type&&/\.(txt|csv)$/i.test(name)))&&file.size<=64000)return 'text';
  throw Error('file_type');
}
async function imageData(file,signal){
  check(signal);const url=URL.createObjectURL(file),img=new Image();let timer,abort;
  try{
    await new Promise((resolve,reject)=>{abort=()=>reject(cancelled());timer=setTimeout(()=>reject(Error('image_timeout')),10000);img.onload=resolve;img.onerror=()=>reject(Error('image_unreadable'));signal?.addEventListener('abort',abort,{once:true});img.src=url;});
    check(signal);if(!img.naturalWidth||img.naturalWidth*img.naturalHeight>40000000)throw Error('file_size');
    const scale=Math.min(1,1280/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);
    check(signal);return {mime:'image/jpeg',b64:c.toDataURL('image/jpeg',.82).split(',')[1]};
  }finally{clearTimeout(timer);if(abort)signal?.removeEventListener('abort',abort);img.onload=img.onerror=null;img.src='';URL.revokeObjectURL(url);}
}
async function prepare(files,signal){
  if(!Array.isArray(files)||files.length>3)throw Error('file_count');
  const attachments=[],names=[],texts=[];let total=0;
  for(const file of files){
    check(signal);const kind=fileKind(file),name=String(file.name||'File').replace(/[\u0000-\u001f<>]/g,'').slice(0,120);names.push({name,kind});
    if(kind==='text'){const text=await file.text();check(signal);if(text.length>12000)throw Error('file_size');texts.push(name+'\n'+text);}
    else if(kind==='image')attachments.push(await imageData(file,signal));
    else{const bytes=new Uint8Array(await file.arrayBuffer());check(signal);if(String.fromCharCode(...bytes.subarray(0,5))!=='%PDF-')throw Error('file_type');attachments.push({mime:'application/pdf',b64:b64(bytes)});}
    total=attachments.reduce((n,x)=>n+x.b64.length,0);if(total>6000000||texts.join('\n').length>20000)throw Error('file_size');
  }
  return {attachments,referenceText:texts.join('\n\n'),names};
}
function create({language='th',history=()=>[],onSend,onFull,onEnd,onMute}={}){
  const T=(th,en)=>language==='th'?th:en,root=document.createElement('section');root.className='cc-panel';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-label',T('แชตระหว่างโทรกับ Cendon','Chat during your Cendon call'));
  root.innerHTML=`<header class="cc-head"><button type="button" class="cc-back" aria-label="${T('กลับหน้าสายเดิม','Return to the same call')}">⌃</button><div><b>Cendon</b><small class="cc-status" role="status">${T('คุยสายเดิมอยู่','Same call in progress')}</small></div><button type="button" class="cc-mute">${T('ปิดไมค์','Mute')}</button><button type="button" class="cc-end">${T('วางสาย','End')}</button></header><main class="cc-thread" tabindex="0" aria-label="${T('บทสนทนา','Conversation')}"><p class="cc-intro">${T('คุยต่อได้เลยครับ ส่งรูปหรือเอกสารเพิ่มได้โดยไม่ต้องวางสาย','Keep talking. Send a photo or document without ending your call.')}</p><div class="cc-messages"></div><p class="cc-live" aria-live="off"></p><div class="cc-results"></div></main><form class="cc-compose"><div class="cc-files"></div><p class="cc-error" role="status" hidden></p><div class="cc-row"><button class="cc-attach" type="button" aria-label="${T('แนบรูป PDF หรือข้อความ','Attach an image, PDF or text file')}">＋</button><textarea rows="1" maxlength="4000" placeholder="${T('พิมพ์หรือแนบสิ่งที่อยากให้ดู…','Type or attach something to look at…')}" aria-label="${T('ข้อความถึง AI ในสายเดิม','Message the AI in this call')}"></textarea><button class="cc-send" type="submit" aria-label="${T('ส่งเข้าสายเดิม','Send into the same call')}">↑</button></div><input class="cc-file-input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.txt,.csv" multiple hidden><small class="cc-privacy">${T('ส่งเมื่อกดส่งเท่านั้น · รูป / PDF / TXT / CSV สูงสุด 3 ไฟล์ · ใช้โควตา AI เดิม','Uploaded only when you send · image / PDF / TXT / CSV, up to 3 files · existing AI quota applies')}</small></form>`;
  document.body.append(root);
  const $=s=>root.querySelector(s),thread=$('.cc-thread'),list=$('.cc-messages'),input=$('textarea'),error=$('.cc-error'),fileInput=$('.cc-file-input'),send=$('.cc-send');
  let files=[],ready=false,busy=false,disposed=false,abort=null,lastSignature='',latestCaption='',lastMuted=null;
  root.setAttribute('aria-modal','true');
  const controls=document.createElement('div');controls.className='cc-call-controls';controls.append($('.cc-back'),$('.cc-mute'),$('.cc-end'));$('.cc-compose').prepend(controls);
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();onFull?.()}if(e.key==='Tab'){const nodes=[...root.querySelectorAll('button,textarea,input,[tabindex]')].filter(n=>!n.disabled&&n.getClientRects().length),i=nodes.indexOf(document.activeElement);if(nodes.length&&((e.shiftKey&&i<=0)||(!e.shiftKey&&i===nodes.length-1))){e.preventDefault();nodes[e.shiftKey?nodes.length-1:0].focus()}}});
  const message=e=>({file_type:T('รองรับ JPG, PNG, WebP, PDF, TXT และ CSV ครับ','Use JPG, PNG, WebP, PDF, TXT or CSV.'),file_count:T('แนบได้สูงสุด 3 ไฟล์ต่อครั้งครับ','Attach up to 3 files at a time.'),file_size:T('ไฟล์ใหญ่เกินไป: รูปสูงสุด 8 MB, PDF 3 MB, ข้อความ 64 KB','File too large: images up to 8 MB, PDFs 3 MB, text 64 KB.'),image_unreadable:T('เปิดรูปนี้ไม่ได้ ลองส่งเป็น JPG หรือ PNG ครับ','This image could not be read. Try JPG or PNG.'),image_timeout:T('เปิดรูปใช้เวลานานเกินไป ลองรูปขนาดเล็กลงครับ','Image loading timed out. Try a smaller file.')}[e.message]||T('ส่งไม่ได้ชั่วคราว ลองใหม่เมื่อสายเชื่อมต่อแล้วครับ','Could not send. Try again when the call reconnects.'));
  function sync(){send.disabled=busy||!ready||(!input.value.trim()&&!files.length);input.setAttribute('aria-busy',String(busy));$('.cc-status').textContent=busy?T('กำลังส่งข้อมูลเข้าสายเดิม…','Adding reference to this call…'):ready?T('คุยสายเดิมอยู่ · ไม่ได้ต่อสายใหม่','Same call · no new connection'):T('กำลังเชื่อมต่อสาย…','Connecting…');}
  function paintFiles(){const area=$('.cc-files');area.replaceChildren();files.forEach((f,i)=>{const b=document.createElement('button');b.type='button';b.textContent=f.name+' ×';b.setAttribute('aria-label',T('นำไฟล์ออก ','Remove attachment ')+f.name);b.onclick=()=>{if(busy)return;files.splice(i,1);paintFiles();sync()};area.append(b)});}
  function refresh(){
    if(disposed)return;const rows=(history()||[]).filter(m=>['user','ai'].includes(m.role)&&!m.typing&&m.text).slice(-120),signature=JSON.stringify(rows.map(m=>[m.role,m.text]));
    if(signature===lastSignature)return;lastSignature=signature;latestCaption='';const stick=thread.scrollHeight-thread.scrollTop-thread.clientHeight<120;list.replaceChildren();
    for(const m of rows){const article=document.createElement('article');article.className='cc-message '+(m.role==='user'?'cc-user':'cc-ai');const who=document.createElement('small'),text=document.createElement('p');who.textContent=m.role==='user'?T('คุณ','You'):'Cendon';text.textContent=String(m.text).slice(0,12000);article.append(who,text);list.append(article);}
    $('.cc-live').textContent=latestCaption;if(stick)thread.scrollTop=thread.scrollHeight;
  }
  input.oninput=()=>{input.style.height='auto';input.style.height=Math.min(132,input.scrollHeight)+'px';sync()};
  input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('.cc-compose').requestSubmit();}};
  $('.cc-attach').onclick=()=>{if(!busy)fileInput.click()};
  fileInput.onchange=()=>{if(busy)return;const next=[...files,...fileInput.files];fileInput.value='';try{if(next.length>3)throw Error('file_count');next.forEach(fileKind);files=next;error.hidden=true;paintFiles();sync()}catch(e){error.textContent=message(e);error.hidden=false}};
  $('.cc-compose').onsubmit=async e=>{
    e.preventDefault();const text=input.value.trim();if(!ready||busy||(!text&&!files.length))return;
    busy=true;error.hidden=true;abort=new AbortController();const controller=abort;sync();
    try{const payload=await prepare(files,controller.signal);check(controller.signal);await onSend({text,...payload});if(disposed||controller.signal.aborted)return;if(input.value.trim()===text){input.value='';input.style.height='auto'}files=[];paintFiles();latestCaption='';refresh();}
    catch(e){if(!disposed&&e.name!=='AbortError'){error.textContent=message(e);error.hidden=false;}}
    finally{if(!disposed&&abort===controller){busy=false;abort=null;sync();}}
  };
  $('.cc-back').onclick=()=>onFull?.();$('.cc-end').onclick=()=>onEnd?.();$('.cc-mute').onclick=()=>onMute?.();
  return Object.freeze({root,results:$('.cc-results'),open(){if(disposed)return;root.hidden=false;refresh();sync();$('.cc-back').focus({preventScroll:true})},hide(){root.hidden=true},refresh,
    state(value,muted=false){if(ready===value&&lastMuted===muted)return;ready=value;lastMuted=muted;$('.cc-mute').textContent=muted?T('เปิดไมค์','Unmute'):T('ปิดไมค์','Mute');$('.cc-mute').setAttribute('aria-pressed',String(muted));sync()},
    caption(who,text){latestCaption=text?(who==='user'?T('คุณ: ','You: '):'Cendon: ')+text:'';$('.cc-live').textContent=latestCaption},
    reset(){abort?.abort();abort=null;busy=false;files=[];fileInput.value='';latestCaption='';paintFiles();ready=false;sync()},
    dispose(){disposed=true;abort?.abort();files=[];fileInput.value='';root.remove()}});
}
window.CendonCallChat=Object.freeze({create,prepare,fileKind});
})();
