/* repair-proof.js — หลักฐานการซ่อมในใบงาน (window.CendonProof) · โหลดในหน้าแรก (ใบงาน/Studio อยู่ที่นี่)

   ช่าง: กล้องในแอปแบบบอกทีละช็อต — อัดสดเท่านั้น เลือกจากคลังไม่ได้ · 3–8 วินาที · เวลาและเลขใบงานประทับลงคลิป
         ส่งแล้ว AI ตรวจทันที · ไม่ชัด อัดใหม่ได้ 1 ครั้ง · งานเปลี่ยนอะไหล่ต้องครบ 3 ช็อตก่อนกด "ซ่อมเสร็จ"
   ลูกค้า: ดูคลิปในใบงาน · ป้ายระดับหลักฐาน · อนุญาต/ไม่อนุญาต/ถอนการอนุญาตให้ร้านใช้คลิปเป็นผลงาน
   + สรุปใบงานเป็นภาษาคน (AI) สำหรับลูกค้า — เก็บไว้ในเครื่อง ไม่เรียกซ้ำถ้าใบเสนอราคา/สรุปงานไม่เปลี่ยน
   AI บอกได้แค่ว่าคลิปตรงกับขั้นตอนไหม และอ่านเลขบนกล่อง — ไม่ได้ตรวจว่าอะไหล่แท้หรือปลอม (บอกผู้ใช้ตรง ๆ) */
(function(){
if(window.CendonProof)return;
const D=document,W=window;
const EN=()=>{try{return (W.lang||JSON.parse(localStorage.getItem("spire_lang")||'"th"'))==="en"}catch(e){return false}};
const L=(th,en)=>EN()?en:th;
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const SHOT={
  old:{ic:"ti-recycle",th:"อะไหล่เก่าที่ถอดออก",en:"Old part removed",tip:["ถือชิ้นเก่าที่ถอดออกให้เห็นชัด หรือวางข้างรถ","Hold the removed part up close, or set it next to the car"]},
  new:{ic:"ti-package",th:"อะไหล่ใหม่ + ป้ายเลข",en:"New part + label",tip:["ถ่ายใกล้ ๆ ให้อ่านยี่ห้อและเลขอะไหล่บนกล่องได้","Get close so the brand and part number on the box are readable"]},
  fit:{ic:"ti-tool",th:"ใส่เสร็จในตัวรถ",en:"Fitted in the car",tip:["ถ่ายชิ้นใหม่ที่ใส่เข้าที่แล้ว ให้เห็นตำแหน่งในรถ","Show the new part fitted in place on the car"]},
  before:{ic:"ti-zoom-question",th:"ก่อนซ่อม",en:"Before",tip:["ถ่ายจุดที่มีปัญหาก่อนลงมือ","Film the problem area before you start"]},
  after:{ic:"ti-circle-check",th:"หลังซ่อมเสร็จ",en:"After",tip:["ถ่ายจุดเดิมหลังซ่อมเสร็จ","Film the same area after the repair"]},
};
const name=k=>L(SHOT[k].th,SHOT[k].en);
const MIN=3000,MAX=8000;

/* ── สไตล์ (ใช้สีของธีมเดิมทั้งหมด) ── */
const css=`
.pf{margin:14px 0;padding:14px;border-radius:18px;border:1px solid var(--line);background:var(--surface)}
.pf-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.pf-h .h4{margin:0;flex:1}
.pf-b{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:99px;font:600 12px var(--kb,inherit);background:var(--surface-2,rgba(0,0,0,.05));color:var(--muted)}
.pf-b.ok{background:color-mix(in srgb,var(--ok,#16a34a) 14%,transparent);color:var(--ok,#16a34a)}
.pf-b.warn{background:color-mix(in srgb,#d97706 16%,transparent);color:#b45309}
html[data-theme="dark"] .pf-b.warn{color:#fbbf24}
.pf-sub{margin:6px 0 10px;font-size:12.5px;color:var(--muted);line-height:1.5}
.pf-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.pf-g.n2{grid-template-columns:repeat(2,minmax(0,1fr))}
.pf-t{position:relative;display:flex;flex-direction:column;gap:6px;min-width:0}
.pf-m{position:relative;aspect-ratio:3/4;border-radius:14px;overflow:hidden;background:var(--surface-2,rgba(0,0,0,.05));display:grid;place-items:center}
.pf-m video{width:100%;height:100%;object-fit:cover;display:block;background:#000}
.pf-m.empty{border:1.5px dashed var(--line);background:none;color:var(--muted);font:500 12px var(--kb,inherit);text-align:center;padding:8px}
.pf-m.empty .ti{display:block;font-size:22px;margin:0 auto 4px}
button.pf-m.empty{cursor:pointer;color:var(--ink);border-color:color-mix(in srgb,var(--co) 55%,var(--line))}
button.pf-m.empty .ti{color:var(--co)}
.pf-n{display:flex;align-items:center;gap:5px;min-width:0;font:600 12px var(--kb,inherit);line-height:1.3}
.pf-n i{flex:none;width:8px;height:8px;border-radius:50%;background:var(--line)}
.pf-n.pass i{background:var(--ok,#16a34a)}.pf-n.unclear i{background:#d97706}.pf-n.unchecked i{background:var(--muted)}
.pf-n span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pf-t small{font-size:11.5px;color:var(--muted);line-height:1.4}
.pf-t .lnk,.pf-t .pf-x{align-self:flex-start;padding:0;border:0;background:none;color:var(--co);font:600 12px var(--kb,inherit);cursor:pointer}
.pf-two{display:flex;flex-direction:column;gap:6px}.pf-two button{min-height:34px;padding:0 8px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:600 12.5px var(--kb,inherit);white-space:nowrap;cursor:pointer}
.pf-two button.y{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.pf-w{margin:10px 0 0;padding:9px 11px;border-radius:12px;font-size:12.5px;line-height:1.5;background:color-mix(in srgb,#d97706 12%,transparent);color:var(--ink)}
.pf-w.ok{background:color-mix(in srgb,var(--ok,#16a34a) 10%,transparent)}
.pf-f{margin:10px 0 0;font-size:11.5px;color:var(--muted);line-height:1.5}
/* กล้อง */
.pf-cam{position:fixed;inset:0;z-index:3000;background:#000;color:#fff;display:flex;flex-direction:column;font-family:var(--kb,inherit)}
.pf-cam video.pf-v,.pf-cam video.pf-pv{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
/* ดูก่อนส่ง: เห็นทั้งภาพ รวมแถบเวลา/เลขใบงานที่ประทับไว้ด้านล่าง */
.pf-cam video.pf-pv{object-fit:contain;top:0;bottom:auto;height:calc(100% - 150px)}
.pf-cam .pf-top{position:relative;z-index:2;display:flex;align-items:center;gap:10px;padding:calc(12px + env(safe-area-inset-top)) 14px 10px;background:linear-gradient(#000a,#0000)}
.pf-cam .pf-close{width:40px;height:40px;border-radius:50%;border:0;background:#0006;color:#fff;font-size:20px;display:grid;place-items:center;cursor:pointer}
.pf-cam .pf-dots{display:flex;gap:6px;margin-left:auto}.pf-cam .pf-dots i{width:8px;height:8px;border-radius:50%;background:#fff5}.pf-cam .pf-dots i.on{background:#fff}.pf-cam .pf-dots i.ok{background:#4ade80}
.pf-cam .pf-tip{position:relative;z-index:2;margin:0 14px;padding:12px 14px;border-radius:16px;background:#000a;max-width:520px}
.pf-cam .pf-tip b{display:block;font-size:17px;font-weight:600}.pf-cam .pf-tip span{display:block;margin-top:2px;font-size:13.5px;color:#fffc;line-height:1.45}
.pf-cam .pf-bot{position:relative;z-index:2;margin-top:auto;padding:16px 16px calc(22px + env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:center;gap:10px;background:linear-gradient(#0000,#000b)}
.pf-cam .pf-rec{position:relative;width:76px;height:76px;border-radius:50%;border:4px solid #fff;background:none;cursor:pointer;display:grid;place-items:center}
.pf-cam .pf-rec span{width:58px;height:58px;border-radius:50%;background:#ef4444;transition:width .12s,height .12s,border-radius .12s}
.pf-cam .pf-rec.on span{width:28px;height:28px;border-radius:7px}
.pf-cam .pf-rec:disabled{opacity:.6}
.pf-cam .pf-rec svg{position:absolute;left:-4px;top:-4px;width:76px;height:76px;transform:rotate(-90deg)}
.pf-cam .pf-rec circle{fill:none;stroke:#fff;stroke-width:4;stroke-dasharray:251;stroke-dashoffset:251}
.pf-cam .pf-hint{font-size:13px;color:#fffd;text-align:center;min-height:18px}
.pf-cam .pf-acts{display:flex;gap:10px;width:100%;max-width:420px}
.pf-cam .pf-acts button{flex:1;min-height:50px;border-radius:16px;border:0;font:600 15px var(--kb,inherit);cursor:pointer;background:#fff2;color:#fff}
.pf-cam .pf-acts button.y{background:#fff;color:#000}
.pf-cam .pf-res{position:relative;z-index:2;margin:auto 16px;padding:22px 18px;border-radius:22px;background:#111d;text-align:center;max-width:440px;align-self:center}
.pf-cam .pf-res .ti{font-size:44px}.pf-cam .pf-res h3{margin:8px 0 4px;font-size:19px;font-weight:600}.pf-cam .pf-res p{margin:0;font-size:14px;color:#fffc;line-height:1.5}
.pf-cam .pf-err{position:relative;z-index:2;margin:auto 20px;text-align:center;font-size:15px;line-height:1.6}
@media(prefers-reduced-motion:reduce){.pf-cam .pf-rec span{transition:none}}
.pl{margin:12px 0;padding:13px 14px;border-radius:16px;background:var(--surface-2,rgba(0,0,0,.04))}
.pl .h4{margin:0 0 6px}.pl p{margin:4px 0;font-size:13.5px;line-height:1.55}.pl p b{font-weight:600}
.pl ul{margin:6px 0 0;padding-left:18px;font-size:13px;line-height:1.55}.pl small{display:block;margin-top:8px;font-size:11.5px;color:var(--muted)}
.pl.wait p{color:var(--muted)}`;
function style(){if(D.getElementById("pfCss"))return;const s=D.createElement("style");s.id="pfCss";s.textContent=css;D.head.appendChild(s)}

/* ── กล่องหลักฐานในใบงาน ── */
function card(j){
  const p=j.proof;if(!p||!p.plan)return "";
  style();
  const cust=j.role==="customer"||j.role==="both",tech=j.role==="technician"||j.role==="both",s=j.status;
  const by=Object.fromEntries((p.shots||[]).map(x=>[x.shot,x])),have=p.plan.filter(k=>by[k]).length;
  const rec=tech&&s==="working";
  if(!have&&!rec)return "";
  const badge=p.level==="verified"?`<span class="pf-b ok"><i class="ti ti-shield-check"></i>${L("ยืนยันด้วยคลิปแล้ว","Verified by clips")}</span>`
    :p.level==="unclear"?`<span class="pf-b warn"><i class="ti ti-shield-half"></i>${L("มีคลิป · AI ตรวจไม่ชัด","Clips · AI unsure")}</span>`
    :`<span class="pf-b">${have}/${p.plan.length} ${L("ช็อต","shots")}</span>`;
  const sub=rec?(p.need?L("งานนี้เปลี่ยนอะไหล่ — ถ่ายให้ครบ 3 ช็อตก่อนกด \"ซ่อมเสร็จแล้ว\" · อัดในแอปเท่านั้น ช็อตละ 3–8 วินาที","This job replaces parts — record all 3 shots before \"Finished\" · in-app only, 3–8 s each")
      :L("ไม่บังคับ · ถ่ายครบ 2 ช็อต ลูกค้าเห็นป้าย \"ยืนยันด้วยคลิป\" และร้านได้แต้มงานที่มีหลักฐาน","Optional · both shots earn a \"verified by clips\" label and count toward your proven work"))
    :cust?L("คลิปที่ช่างอัดในแอประหว่างซ่อม (ประทับเวลาและเลขใบงาน)","Clips the mechanic recorded in the app during the repair (time and job number stamped)"):"";
  const tile=k=>{const x=by[k],sh=SHOT[k];
    const media=x?`<div class="pf-m"><video data-mid="${esc(x.media)}" controls playsinline preload="metadata"></video></div>`
      :rec?`<button type="button" class="pf-m empty" data-pf-rec="${k}"><span><i class="ti ti-video-plus"></i>${L("ถ่าย","Record")}</span></button>`
      :`<div class="pf-m empty"><span><i class="ti ${sh.ic}"></i>${L("ยังไม่มี","Not yet")}</span></div>`;
    const st=x?`<p class="pf-n ${x.result}"><i></i><span>${name(k)}</span></p>`:`<p class="pf-n"><i></i><span>${name(k)}</span></p>`;
    let more="";
    if(x&&x.result==="unclear")more+=`<small>${esc(x.note||L("AI ไม่แน่ใจว่าเห็นขั้นตอนนี้","AI is unsure it shows this step"))}</small>`;
    if(rec&&x&&x.retake)more+=`<button type="button" class="lnk" data-pf-rec="${k}">${L("อัดใหม่ (เหลือ 1 ครั้ง)","Re-record (1 left)")}</button>`;
    if(x&&s==="completed"){
      const sc=x.showcase;
      if(tech&&!cust&&!sc)more+=`<button type="button" class="lnk" data-pf-sc="showcase_ask:${esc(x.media)}">${L("ขอใช้เป็นผลงาน","Ask to showcase")}</button>`;
      if(sc==="asked")more+=cust?`<small>${L("ร้านขอใช้คลิปนี้บนหน้าร้าน (อาจเห็นรถหรือสถานที่)","The shop asks to show this clip (your car or place may be visible)")}</small><div class="pf-two"><button type="button" class="y" data-pf-sc="showcase_ok:${esc(x.media)}">${L("อนุญาต","Allow")}</button><button type="button" data-pf-sc="showcase_no:${esc(x.media)}">${L("ไม่อนุญาต","No")}</button></div>`:`<small>${L("รอเจ้าของรถตอบ","Waiting for the owner")}</small>`;
      if(sc==="yes")more+=`<small>${L("ขึ้นเป็นผลงานบนหน้าร้าน","Shown on the shop page")}</small>`+(cust?`<button type="button" class="lnk" data-pf-sc="showcase_no:${esc(x.media)}">${L("ถอนการอนุญาต","Withdraw")}</button>`:"");
      if(sc==="no")more+=`<small>${L("เจ้าของรถไม่อนุญาต","Owner declined")}</small>`;
    }
    return `<div class="pf-t">${media}${st}${more}</div>`;
  };
  const pm=p.need&&have===p.plan.length&&cust?(p.partMatch==="differ"?`<p class="pf-w"><b>${L("เลขบนกล่องในคลิปไม่ตรงกับใบเสนอราคา","The part number in the clip differs from the quote")}</b> — ${L("อาจเป็นรุ่นเทียบเท่า ถามช่างได้ในแชต","it may be an equivalent part; ask the mechanic in chat")}</p>`
    :p.partMatch==="match"?`<p class="pf-w ok">${L("เลขอะไหล่ในคลิปตรงกับใบเสนอราคา","The part number in the clip matches the quote")}</p>`:""):"";
  const used=p.partsUsed?`<p class="pf-w">${L("ใบเสนอราคาระบุว่าใช้อะไหล่มือสอง","The quote says used parts")}</p>`:"";
  return `<div class="pf" id="pfBox"><div class="pf-h"><p class="h4">${L("หลักฐานการซ่อม","Repair proof")}</p>${badge}</div>
    ${sub?`<p class="pf-sub">${sub}</p>`:""}<div class="pf-g ${p.plan.length===2?"n2":""}">${p.plan.map(tile).join("")}</div>${pm}${used}
    <p class="pf-f">${L("AI ดูว่าคลิปตรงกับขั้นตอน และอ่านเลขบนกล่อง — ไม่ได้ตรวจว่าอะไหล่แท้หรือปลอม","AI checks that each clip shows the step and reads the box label — it cannot tell genuine from fake parts")}</p></div>`;
}
/* ปุ่มในกล่อง · ctx = {api, refresh(), toast(msg, icon), busy(btn, fn)} */
function wire(box,j,ctx){
  if(!box)return;
  if(W.CendonMedia)W.CendonMedia.hydrate(box);
  box.querySelectorAll("[data-pf-rec]").forEach(b=>b.onclick=()=>record(j,b.dataset.pfRec,ctx));
  box.querySelectorAll("[data-pf-sc]").forEach(b=>b.onclick=()=>{const [action,media]=b.dataset.pfSc.split(":");
    ctx.busy(b,async()=>{await ctx.api("/api/tech/jobs/"+j.id,{body:{action,media}});
      ctx.toast(action==="showcase_ask"?L("ส่งคำขอให้เจ้าของรถแล้ว","Request sent to the owner"):action==="showcase_ok"?L("อนุญาตแล้ว","Allowed"):L("ไม่อนุญาตแล้ว","Declined"),"ti-check");ctx.refresh()})});
}
/* ช็อตที่ยังขาด (งานเปลี่ยนอะไหล่) — ใบงานใช้กันกด "ซ่อมเสร็จ" ก่อนครบ */
function missing(j){const p=j.proof;if(!p||!p.need)return [];const by=new Set((p.shots||[]).map(x=>x.shot));return p.plan.filter(k=>!by.has(k))}

/* ── กล้อง ── */
const pickType=()=>{try{return ["video/mp4;codecs=avc1","video/mp4","video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"].find(t=>W.MediaRecorder&&MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))||""}catch(e){return ""}};
/* พิกัดหยาบเป็นหลักฐานเสริม (ทีมงานดูตอนมีข้อพิพาทเท่านั้น) — ใช้เฉพาะเครื่องที่อนุญาตตำแหน่งไว้แล้ว ไม่เด้งถามกลางขั้นตอน และรอไม่เกิน 2.5 วิ */
async function where(){
  try{if(!navigator.geolocation||!navigator.permissions||(await navigator.permissions.query({name:"geolocation"})).state!=="granted")return null}catch(e){return null}
  return Promise.race([new Promise(r=>navigator.geolocation.getCurrentPosition(p=>r({lat:p.coords.latitude,lng:p.coords.longitude}),()=>r(null),{timeout:2500,maximumAge:120000,enableHighAccuracy:false})),new Promise(r=>setTimeout(()=>r(null),2600))]);
}
function record(j,shot,ctx){
  style();
  const plan=j.proof.plan,done=new Set((j.proof.shots||[]).map(x=>x.shot));
  const box=D.createElement("div");box.className="pf-cam";box.setAttribute("role","dialog");box.setAttribute("aria-label",L("ถ่ายหลักฐานการซ่อม","Record repair proof"));
  D.body.appendChild(box);const prevOverflow=D.body.style.overflow;D.body.style.overflow="hidden";
  let stream=null,raf=0,mr=null,chunks=[],t0=0,timer=0,frames=[],blob=null,url="",closed=false,changed=false;
  const cv=D.createElement("canvas"),cx=cv.getContext("2d"),sm=D.createElement("canvas"),smx=sm.getContext("2d");
  const stamp=()=>{const d=new Date();return `Cendon · ${L("ใบงาน","Job")} #${String(j.id).slice(0,6).toUpperCase()} · ${d.toLocaleDateString(EN()?"en-GB":"th-TH",{day:"numeric",month:"short",year:"numeric"})} ${d.toLocaleTimeString("en-GB")}`};
  const stop=()=>{cancelAnimationFrame(raf);clearInterval(timer);try{mr&&mr.state!=="inactive"&&mr.stop()}catch(e){}if(stream)stream.getTracks().forEach(t=>t.stop());stream=null};
  const close=()=>{if(closed)return;closed=true;stop();if(url)URL.revokeObjectURL(url);box.remove();D.body.style.overflow=prevOverflow;removeEventListener("keydown",key);if(changed)ctx.refresh()};
  const key=e=>{if(e.key==="Escape")close()};addEventListener("keydown",key);
  const dots=()=>`<div class="pf-dots">${plan.map(k=>`<i class="${k===shot?"on":done.has(k)?"ok":""}"></i>`).join("")}</div>`;
  const top=()=>`<div class="pf-top"><button type="button" class="pf-close" aria-label="${L("ปิด","Close")}"><i class="ti ti-x"></i></button>${dots()}</div>`;
  const wireClose=()=>box.querySelector(".pf-close").onclick=close;
  /* หน้าถ่าย */
  async function live(){
    box.innerHTML=`<video class="pf-v" playsinline muted autoplay></video>${top()}
      <div class="pf-tip"><b>${plan.indexOf(shot)+1}. ${name(shot)}</b><span>${esc(L(...SHOT[shot].tip))}</span></div>
      <div class="pf-bot"><p class="pf-hint">${L("แตะเพื่อเริ่มอัด · 3–8 วินาที","Tap to record · 3–8 seconds")}</p>
        <button type="button" class="pf-rec" aria-label="${L("อัด","Record")}"><svg viewBox="0 0 84 84"><circle cx="42" cy="42" r="40"/></svg><span></span></button></div>`;
    wireClose();
    const v=box.querySelector(".pf-v"),btn=box.querySelector(".pf-rec"),hint=box.querySelector(".pf-hint"),ring=box.querySelector("circle");
    try{
      if(!stream)stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}},audio:false});
    }catch(e){box.innerHTML=`${top()}<p class="pf-err"><i class="ti ti-camera-off" style="font-size:40px;display:block;margin-bottom:8px"></i>${L("เปิดกล้องไม่ได้ — อนุญาตให้ Cendon ใช้กล้องในการตั้งค่าเครื่อง แล้วลองใหม่","Couldn't open the camera — allow Cendon to use the camera in your settings, then try again")}</p>`;wireClose();return}
    if(closed)return stop();
    v.srcObject=stream;try{await v.play()}catch(e){}
    btn.onclick=()=>{if(mr&&mr.state==="recording"){if(Date.now()-t0>=MIN)mr.stop();return}start(v,btn,hint,ring)};
  }
  function draw(v){
    const w=v.videoWidth||1280,h=v.videoHeight||720,k=Math.min(1,960/Math.max(w,h));
    if(cv.width!==Math.round(w*k)){cv.width=Math.round(w*k);cv.height=Math.round(h*k)}
    cx.drawImage(v,0,0,cv.width,cv.height);
    const fs=Math.max(14,Math.round(cv.width/42)),pad=Math.round(fs*.6);
    cx.fillStyle="rgba(0,0,0,.55)";cx.fillRect(0,cv.height-fs-pad*2,cv.width,fs+pad*2);
    cx.fillStyle="#fff";cx.font=`600 ${fs}px Kanit, system-ui, sans-serif`;cx.textBaseline="middle";
    cx.fillText(stamp(),pad,cv.height-pad-fs/2);
    cx.textAlign="right";cx.fillStyle="#ffb36b";cx.fillText(name(shot),cv.width-pad,cv.height-pad-fs/2);cx.textAlign="left";
  }
  /* ภาพนิ่งสำหรับ AI (ย่อ ≤640px) จากภาพที่ประทับเวลาแล้ว */
  const grab=()=>{const k=Math.min(1,640/Math.max(cv.width,cv.height));sm.width=Math.round(cv.width*k);sm.height=Math.round(cv.height*k);smx.drawImage(cv,0,0,sm.width,sm.height);return sm.toDataURL("image/jpeg",.72)};
  function start(v,btn,hint,ring){
    const type=pickType();
    if(!W.MediaRecorder){hint.textContent=L("เครื่องนี้อัดวิดีโอในแอปไม่ได้ — อัปเดตเบราว์เซอร์","This device can't record video in the app — update your browser");return}
    draw(v);
    /* อัดจากภาพที่ประทับเวลาแล้ว · เครื่องที่ทำไม่ได้ อัดจากกล้องตรง ๆ (เวลาอยู่ในระบบอยู่แล้ว) */
    let src=stream;try{if(cv.captureStream)src=cv.captureStream(24)}catch(e){}
    try{mr=new MediaRecorder(src,{...(type?{mimeType:type}:{}),videoBitsPerSecond:1500000})}catch(e){try{mr=new MediaRecorder(src)}catch(x){hint.textContent=L("อัดวิดีโอไม่ได้","Couldn't record");return}}
    chunks=[];frames=[];t0=Date.now();
    const loop=()=>{draw(v);const el=Date.now()-t0;
      if((frames.length===0&&el>700)||(frames.length===1&&el>MIN-400)||(frames.length===2&&el>MAX-700))frames.push(grab());
      raf=requestAnimationFrame(loop)};loop();
    mr.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
    mr.onstop=()=>{cancelAnimationFrame(raf);clearInterval(timer);if(closed)return;
      if(frames.length<3)frames.push(grab());
      const mime=(mr.mimeType||type||"video/webm").split(";")[0];blob=new Blob(chunks,{type:mime});review()};
    mr.start(250);btn.classList.add("on");btn.disabled=true;
    timer=setInterval(()=>{const el=Date.now()-t0;ring.style.strokeDashoffset=String(251*(1-Math.min(1,el/MAX)));
      if(el>=MIN){btn.disabled=false;hint.textContent=L("แตะเพื่อหยุด","Tap to stop")}else hint.textContent=L(`อัดต่ออีก ${Math.ceil((MIN-el)/1000)} วินาที`,`Keep going ${Math.ceil((MIN-el)/1000)} s`);
      if(el>=MAX&&mr.state==="recording")mr.stop()},100);
  }
  /* ดูก่อนส่ง: ถ่ายใหม่ในเครื่องได้ไม่จำกัด (ยังไม่นับเป็นการอัดใหม่) */
  function review(){
    if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);
    box.innerHTML=`<video class="pf-pv" playsinline controls loop autoplay muted src="${url}"></video>${top()}
      <div class="pf-bot"><p class="pf-hint">${L("ดูให้แน่ใจว่าเห็นชัด แล้วกดใช้คลิปนี้","Check it's clear, then use this clip")}</p>
      <div class="pf-acts"><button type="button" data-x="again">${L("ถ่ายใหม่","Retake")}</button><button type="button" class="y" data-x="send">${L("ใช้คลิปนี้","Use this clip")}</button></div></div>`;
    wireClose();
    box.querySelector('[data-x="again"]').onclick=()=>live();
    box.querySelector('[data-x="send"]').onclick=send;
  }
  async function send(){
    const acts=box.querySelector(".pf-acts"),hint=box.querySelector(".pf-hint");
    acts.querySelectorAll("button").forEach(b=>b.disabled=true);hint.textContent=L("กำลังส่งคลิป…","Uploading…");
    try{
      const M=W.CendonMedia,id=M.newId();
      await M.put(blob,{id,kind:"video",mime:blob.type,scope:"draft",upload:false});
      if(!await M.upload(id,"draft"))throw new Error(L("เน็ตหลุด ส่งคลิปไม่สำเร็จ ลองใหม่อีกครั้ง","Connection lost — try again"));
      hint.textContent=L("AI กำลังตรวจคลิป…","AI is checking the clip…");
      const pos=await where();
      const r=await ctx.api(`/api/tech/jobs/${j.id}/proof`,{body:{shot,media:id,frames:frames.slice(0,3),...(pos||{})}});
      changed=true;done.add(shot);result(r);
    }catch(e){hint.textContent=e.message||L("ส่งไม่สำเร็จ","Upload failed");acts.querySelectorAll("button").forEach(b=>b.disabled=false)}
  }
  function result(r){
    stop();
    const next=plan.find(k=>!done.has(k));
    const head=r.result==="pass"?`<i class="ti ti-circle-check" style="color:#4ade80"></i><h3>${L("AI ตรวจผ่าน","AI check passed")}</h3>`
      :r.result==="unclear"?`<i class="ti ti-alert-triangle" style="color:#fbbf24"></i><h3>${L("AI ยังไม่แน่ใจ","AI isn't sure")}</h3>`
      :`<i class="ti ti-circle-check" style="color:#fff"></i><h3>${L("บันทึกคลิปแล้ว","Clip saved")}</h3>`;
    const msg=r.result==="unclear"?(r.retake?L("อัดใหม่ได้อีก 1 ครั้ง หรือส่งงานต่อได้ (ป้ายจะเป็น \"AI ตรวจไม่ชัด\")","You can re-record once more, or carry on (label: \"AI unsure\")"):L("ส่งงานต่อได้ ป้ายจะเป็น \"AI ตรวจไม่ชัด\"","You can carry on; the label will say \"AI unsure\"")):"";
    box.innerHTML=`${top()}<div class="pf-res">${head}<p>${esc(r.note||"")}</p>${r.part?`<p style="margin-top:6px">${L("อ่านได้","Read")}: <b>${esc(r.part)}</b></p>`:""}${msg?`<p style="margin-top:8px">${msg}</p>`:""}</div>
      <div class="pf-bot"><div class="pf-acts">${r.result==="unclear"&&r.retake?`<button type="button" data-x="re">${L("อัดใหม่","Re-record")}</button>`:""}
      ${next?`<button type="button" class="y" data-x="next">${L("ถ่ายต่อ","Next")}: ${name(next)}</button>`:`<button type="button" class="y" data-x="close">${L("เสร็จ กลับไปใบงาน","Done")}</button>`}</div></div>`;
    wireClose();
    const re=box.querySelector('[data-x="re"]');if(re)re.onclick=()=>{done.delete(shot);live()};
    const nx=box.querySelector('[data-x="next"]');if(nx)nx.onclick=()=>{shot=next;live()};
    const cl=box.querySelector('[data-x="close"]');if(cl)cl.onclick=close;
  }
  live();
}

/* ── สรุปใบงานเป็นภาษาคน (ลูกค้า) ── */
const PK="cendon_plain:";
function plainKey(j){const q=j.quote||{};return PK+j.id+":"+(q.at||0)+":"+(j.completion?String(j.completion).length:0)}
function plainCard(j){
  const cust=j.role==="customer"||j.role==="both";
  if(!cust||!j.quote||!["quoted","accepted","enroute","working","done","completed"].includes(j.status))return "";
  style();
  return `<div class="pl wait" id="plBox"><p class="h4">${L("อ่านแบบเข้าใจง่าย","In plain words")}</p><p>${L("กำลังสรุปใบเสนอราคาให้อ่านง่าย…","Summarising the quote…")}</p></div>`;
}
async function plain(box,j,ctx){
  if(!box)return;
  const k=plainKey(j);let d=null;
  try{d=JSON.parse(localStorage.getItem(k)||"null")}catch(e){}
  if(!d){
    const q=j.quote,ex=(j.extras||[]).filter(x=>x.status==="accepted").map(x=>({desc:x.desc,total:x.total}));
    try{d=(await ctx.api("/api/features/analyze",{body:{tool:"plain",lang:EN()?"en":"th",question:L("สรุปใบงานนี้ให้เจ้าของรถเข้าใจง่าย","Explain this job simply"),
      context:{car:j.car,symptom:j.symptom,quote:{scope:q.scope,labor:q.labor,parts:q.parts,partsNote:q.partsNote||"",partsUsed:!!q.partsUsed,travel:q.travel,total:q.total,warranty:q.warranty,appointment:q.appointment},extras:ex,completion:j.completion||""}}})).data}
    catch(e){box.remove();return}
    if(!d||!d.what){box.remove();return}
    try{localStorage.setItem(k,JSON.stringify(d))}catch(e){}
  }
  if(!box.isConnected)return;
  box.classList.remove("wait");
  box.innerHTML=`<p class="h4">${L("อ่านแบบเข้าใจง่าย","In plain words")}</p>
    ${d.what?`<p><b>${L("เสียตรงไหน","What's wrong")}:</b> ${esc(d.what)}</p>`:""}${d.fix?`<p><b>${L("ช่างทำอะไร","What the mechanic does")}:</b> ${esc(d.fix)}</p>`:""}
    ${d.time?`<p><b>${L("ใช้เวลา","Time")}:</b> ${esc(d.time)}</p>`:""}${d.why?`<p><b>${L("ทำไมสำคัญ","Why it matters")}:</b> ${esc(d.why)}</p>`:""}
    ${(d.terms||[]).length?`<ul>${d.terms.map(t=>`<li><b>${esc(t.term)}</b> = ${esc(t.plain)}</li>`).join("")}</ul>`:""}
    ${(d.ask||[]).length?`<p style="margin-top:8px"><b>${L("ถามช่างได้","Questions to ask")}:</b></p><ul>${d.ask.map(a=>`<li>${esc(a)}</li>`).join("")}</ul>`:""}
    <small>${L("AI สรุปจากใบเสนอราคาและสรุปงานของช่างเท่านั้น ไม่ได้เห็นรถจริง","AI summary of the mechanic's own quote and notes — it hasn't seen the car")}</small>`;
}

window.CendonProof={card,wire,missing,record,plainCard,plain,SHOT,name};
})();
