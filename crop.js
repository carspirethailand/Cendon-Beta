/* ═══ ครอปรูปก่อนใช้ — ทุกช่องใส่รูปในแอป ═══
   ดักตอนผู้ใช้เลือกรูปจาก <input type="file"> ทุกอัน (ก่อนโค้ดหน้านั้นจะเห็นไฟล์)
   เปิดหน้าครอป แล้วส่งรูปที่ครอปแล้วกลับเข้า input เดิม → โค้ดเดิมของทุกหน้าใช้ต่อได้เลย ไม่ต้องแก้ทีละจุด

   ตั้งค่าที่ input ได้ (ไม่ใส่ = ครอปอิสระ เริ่มที่รูปเต็ม กดใช้ทันทีได้รูปเดิม):
     data-crop="16:9" | "1:1" | "3:1" …  ล็อกสัดส่วน
     data-crop-w="1920"                 ความกว้างรูปที่ได้ (สัดส่วนล็อก)
     data-crop-exact                    บังคับขนาดตาม data-crop-w เป๊ะ (เช่น ปกโพสต์ 1920×1080)
     data-crop-round                    กรอบวงกลม (รูปโปรไฟล์)
     data-crop-max="4"                  เลือกหลายรูป ครอปได้ไม่เกินกี่รูป
     data-nocrop                        ไม่ต้องครอป
   เรียกตรงได้ด้วย: CendonCrop.open(file, {ratio:16/9, w:1920}) → Promise<File|null> */
(function(){
"use strict";
if(window.CendonCrop)return;
const D=document;
const TH=(()=>{try{const v=JSON.parse(localStorage.getItem("spire_lang"));if(typeof v==="string"&&v)return v==="th"}catch(e){}
  try{return /^th\b/i.test((navigator.languages||[navigator.language])[0]||"")}catch(e){return true}})();
const L=(th,en)=>TH?th:en;
/* สัดส่วนให้เลือกตอนครอปอิสระ — 0 = ตามรูปเดิม */
const FREE=[[0,L("ต้นฉบับ","Original")],[1,"1:1"],[4/3,"4:3"],[16/9,"16:9"],[3/4,"3:4"],[9/16,"9:16"]];
/* รูปที่ครอปได้ (gif ขยับได้/svg ไม่ครอป จะเสียของเดิม) */
const OK=/^image\/(jpe?g|png|webp|bmp|heic|heif|avif)$/i;
/* กล้องมือถือบางรุ่นส่งไฟล์มาไม่มีชนิด — ดูจากนามสกุลแทน */
const isImg=f=>OK.test(f.type)||(!f.type&&/\.(jpe?g|png|webp|heic|heif)$/i.test(f.name||""));

let css=false;
function style(){
  if(css)return;css=true;
  const s=D.createElement("style");s.id="cropcss";
  s.textContent=`
.ccx{position:fixed;inset:0;z-index:2147483600;display:flex;flex-direction:column;background:#09090B;color:#f4f4f5;
  font-family:inherit;-webkit-user-select:none;user-select:none;touch-action:none;animation:ccxIn .32s cubic-bezier(.32,.72,0,1)}
@keyframes ccxIn{from{opacity:0;transform:scale(1.02)}to{opacity:1;transform:none}}
.ccx-top{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(10px + env(safe-area-inset-top)) 14px 8px}
.ccx-top b{font-weight:600;font-size:15px;line-height:1.2;text-align:center;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ccx-top b small{display:block;font-weight:500;font-size:11.5px;color:#a1a1aa;margin-top:2px}
.ccx-b{height:40px;padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:none;color:#f4f4f5;font-family:inherit;font-weight:600;font-size:14px;cursor:pointer;white-space:nowrap}
.ccx-b.p{border:0;background:#E8590C;color:#fff}
.ccx-b:active{transform:scale(.97)}
.ccx-st{position:relative;flex:1;min-height:0}
.ccx-st canvas{position:absolute;inset:0;width:100%;height:100%;cursor:grab;touch-action:none}
.ccx-st canvas:active{cursor:grabbing}
.ccx-bt{display:grid;gap:12px;padding:10px 16px calc(14px + env(safe-area-inset-bottom))}
.ccx-rt{display:flex;gap:6px;justify-content:center;overflow-x:auto;scrollbar-width:none}
.ccx-rt button{flex:none;height:32px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:none;color:#d4d4d8;font-family:inherit;font-weight:500;font-size:13px;cursor:pointer}
.ccx-rt button.on{border-color:#E8590C;color:#fff}
.ccx-zm{display:flex;align-items:center;gap:12px;max-width:520px;width:100%;margin:0 auto}
.ccx-zm input{flex:1;accent-color:#E8590C}
.ccx-zm>span{display:grid;place-items:center;opacity:.7}.ccx-zm>span svg{width:18px;height:18px}
.ccx-ic{width:40px;height:40px;flex:none;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:none;color:#f4f4f5;display:grid;place-items:center;cursor:pointer;font-size:18px}
.ccx-ic svg{width:19px;height:19px}
.ccx-sk{justify-self:center;border:0;background:none;color:#a1a1aa;font-family:inherit;font-weight:500;font-size:13px;text-decoration:underline;cursor:pointer;padding:2px 8px}
@media(prefers-reduced-motion:reduce){.ccx{animation:none}}`;
  D.head.appendChild(s);
}

function loadImg(file){
  return new Promise((res,rej)=>{const u=URL.createObjectURL(file),im=new Image();
    im.onload=()=>{res({im,u})};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error("bad image"))};im.src=u});
}
/* หมุน 90° ทีละครั้ง: วาดลงผืนใหม่แล้วใช้ผืนนั้นเป็นต้นฉบับ (คำนวณกรอบง่ายกว่าหมุนตอนวาด) */
function rotated(src,q){
  if(!q)return src;
  const w=src.naturalWidth||src.width,h=src.naturalHeight||src.height,c=D.createElement("canvas");
  c.width=q%2?h:w;c.height=q%2?w:h;const x=c.getContext("2d");
  x.translate(c.width/2,c.height/2);x.rotate(q*Math.PI/2);x.drawImage(src,-w/2,-h/2);return c;
}
const ROT='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.95 11a8 8 0 1 0-.5 4m.5 5v-5h-5"/></svg>';
const ZO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10" cy="10" r="7"/><path d="M21 21l-6-6M7 10h6"/></svg>';
const ZI='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10" cy="10" r="7"/><path d="M21 21l-6-6M7 10h6M10 7v6"/></svg>';

/* เปิดหน้าครอป 1 รูป → File ที่ครอปแล้ว · null (ยกเลิก) · "skip" (ใช้ที่เหลือแบบไม่ครอป) */
async function open(file,o){
  o=o||{};style();
  let pic;try{pic=await loadImg(file)}catch(e){return file}/* เปิดไม่ได้ (เช่น HEIC บางเครื่อง) ส่งไฟล์เดิมไป ให้หน้านั้นจัดการเอง */
  return new Promise(resolve=>{
    const fixed=o.ratio>0;
    const ov=D.createElement("div");ov.className="ccx nt";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");
    const step=o.total>1?`<small>${L("รูปที่","Photo")} ${o.idx+1}/${o.total}</small>`:"";
    ov.innerHTML=`<div class="ccx-top"><button type="button" class="ccx-b" data-x>${L("ยกเลิก","Cancel")}</button><b>${o.title||L("ครอปรูป","Crop photo")}${step}</b><button type="button" class="ccx-b p" data-ok>${L("ใช้รูปนี้","Use photo")}</button></div>
      <div class="ccx-st"><canvas></canvas></div>
      <div class="ccx-bt">${fixed?"":`<div class="ccx-rt">${FREE.map(([r,t],i)=>`<button type="button" data-r="${i}" class="${i?"":"on"}">${t}</button>`).join("")}</div>`}
        <div class="ccx-zm"><span>${ZO}</span><input type="range" min="1" max="5" step="0.01" value="1" aria-label="zoom"/><span>${ZI}</span><button type="button" class="ccx-ic" data-rot title="${L("หมุน","Rotate")}">${ROT}</button></div>
        ${o.skip?`<button type="button" class="ccx-sk" data-sk>${L("ใช้รูปที่เหลือทั้งหมดแบบไม่ครอป","Use the rest without cropping")}</button>`:""}</div>`;
    D.body.appendChild(ov);
    const prevOv=D.body.style.overflow;D.body.style.overflow="hidden";
    const st=ov.querySelector(".ccx-st"),cv=ov.querySelector("canvas"),cx=cv.getContext("2d"),rg=ov.querySelector("input[type=range]");
    let src=pic.im,rot=0,ratio=fixed?o.ratio:0,ri=0,touched=false;
    let W=0,H=0,dpr=1,fx=0,fy=0,fw=0,fh=0,base=1,z=1,x=0,y=0,drag=false,ready=false;
    const sw=()=>src.naturalWidth||src.width,sh=()=>src.naturalHeight||src.height;
    /* กรอบครอปกลางจอ ขนาดใหญ่สุดที่ใส่ได้ตามสัดส่วน */
    function layout(keep){
      const r=st.getBoundingClientRect();W=r.width;H=r.height;dpr=Math.min(3,window.devicePixelRatio||1);
      cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
      const pad=Math.min(24,W*.05),aw=W-pad*2,ah=H-pad*2,rr=ratio||sw()/sh();
      fw=Math.min(aw,ah*rr);fh=fw/rr;fx=(W-fw)/2;fy=(H-fh)/2;
      const ob=base;base=Math.max(fw/sw(),fh/sh());
      if(keep&&ready){/* เปลี่ยนสัดส่วน/หมุนจอ: คงจุดกลางภาพไว้ */
        const cxs=(W/2-x)/(ob*z),cys=(H/2-y)/(ob*z);x=W/2-cxs*base*z;y=H/2-cys*base*z;
      }else{z=1;rg.value=1;x=fx+(fw-sw()*base)/2;y=fy+(fh-sh()*base)/2}
      ready=W>0&&H>0;paint();
    }
    function clamp(){const w=sw()*base*z,h=sh()*base*z;x=Math.min(fx,Math.max(fx+fw-w,x));y=Math.min(fy,Math.max(fy+fh-h,y))}
    function paint(){
      clamp();cx.setTransform(dpr,0,0,dpr,0,0);cx.clearRect(0,0,W,H);
      cx.imageSmoothingQuality="high";cx.drawImage(src,x,y,sw()*base*z,sh()*base*z);
      /* นอกกรอบมืดลง เห็นว่าส่วนไหนถูกตัด */
      cx.save();cx.beginPath();cx.rect(0,0,W,H);
      if(o.round){cx.moveTo(fx+fw,fy+fh/2);cx.ellipse(fx+fw/2,fy+fh/2,fw/2,fh/2,0,0,Math.PI*2,true)}else{cx.rect(fx+fw,fy,-fw,fh)}
      cx.fillStyle="rgba(9,9,11,.72)";cx.fill("evenodd");cx.restore();
      cx.strokeStyle="rgba(255,255,255,.9)";cx.lineWidth=1.5;
      if(o.round){cx.beginPath();cx.ellipse(fx+fw/2,fy+fh/2,fw/2,fh/2,0,0,Math.PI*2);cx.stroke()}else cx.strokeRect(fx+.75,fy+.75,fw-1.5,fh-1.5);
      if(drag){/* เส้นแบ่งสามส่วนระหว่างลาก ช่วยจัดองค์ประกอบ */
        cx.strokeStyle="rgba(255,255,255,.35)";cx.lineWidth=1;cx.beginPath();
        for(let i=1;i<3;i++){cx.moveTo(fx+fw*i/3,fy);cx.lineTo(fx+fw*i/3,fy+fh);cx.moveTo(fx,fy+fh*i/3);cx.lineTo(fx+fw,fy+fh*i/3)}cx.stroke()}
    }
    const zoomTo=(nz,px=fx+fw/2,py=fy+fh/2)=>{nz=Math.max(1,Math.min(5,nz));x=px-(px-x)*nz/z;y=py-(py-y)*nz/z;z=nz;rg.value=z;touched=true;paint()};
    rg.oninput=()=>zoomTo(+rg.value);
    cv.addEventListener("wheel",e=>{e.preventDefault();const r=cv.getBoundingClientRect();zoomTo(z*(e.deltaY<0?1.08:.93),e.clientX-r.left,e.clientY-r.top)},{passive:false});
    const pts=new Map();let pd=0;
    cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);drag=true;paint()};
    cv.onpointermove=e=>{if(!pts.has(e.pointerId))return;const p0=pts.get(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);
      if(pts.size===2){const [a,b]=[...pts.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pd){const r=cv.getBoundingClientRect();zoomTo(z*d/pd,(a[0]+b[0])/2-r.left,(a[1]+b[1])/2-r.top)}pd=d}
      else{x+=e.clientX-p0[0];y+=e.clientY-p0[1];touched=true;paint()}};
    cv.onpointerup=cv.onpointercancel=e=>{pts.delete(e.pointerId);pd=0;if(!pts.size){drag=false;paint()}};
    ov.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{ri=+b.dataset.r;ratio=FREE[ri][0];touched=true;
      ov.querySelectorAll("[data-r]").forEach(k=>k.classList.toggle("on",k===b));layout(true)});
    ov.querySelector("[data-rot]").onclick=()=>{rot=(rot+1)%4;src=rotated(pic.im,rot);touched=true;layout(false)};
    const ro=new ResizeObserver(()=>layout(true));ro.observe(st);
    const done=v=>{ro.disconnect();removeEventListener("keydown",key,true);D.body.style.overflow=prevOv;
      ov.style.transition="opacity .18s";ov.style.opacity="0";setTimeout(()=>ov.remove(),180);URL.revokeObjectURL(pic.u);resolve(v)};
    const key=e=>{if(e.key==="Escape"){e.stopPropagation();e.preventDefault();done(null)}else if(e.key==="Enter"){e.preventDefault();ok()}};
    addEventListener("keydown",key,true);
    ov.querySelector("[data-x]").onclick=()=>done(null);
    if(o.skip)ov.querySelector("[data-sk]").onclick=()=>done("skip");
    function ok(){
      /* ครอปอิสระที่ไม่ได้แตะอะไรเลย = ใช้ไฟล์เดิม ไม่ต้องบีบอัดซ้ำให้รูปเสีย */
      if(!fixed&&!touched)return done(file);
      const s=base*z,sx=(fx-x)/s,sy=(fy-y)/s,cw=fw/s,ch=fh/s;
      let ow,oh;
      if(fixed&&o.w){ow=o.exact?o.w:Math.min(o.w,Math.round(cw));oh=Math.round(ow/o.ratio)}
      else{const k=Math.min(1,(o.max||2048)/Math.max(cw,ch));ow=Math.round(cw*k);oh=Math.round(ch*k)}
      const c=D.createElement("canvas");c.width=Math.max(1,ow);c.height=Math.max(1,oh);const g=c.getContext("2d");
      const png=/png/i.test(file.type)&&!o.round;
      if(!png){g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height)}
      g.imageSmoothingQuality="high";g.drawImage(src,sx,sy,cw,ch,0,0,c.width,c.height);
      const type=png?"image/png":"image/jpeg";
      c.toBlob(b=>{if(!b)return done(file);
        const name=(file.name||"photo").replace(/\.[^.]+$/,"")+(png?".png":".jpg");
        let f;try{f=new File([b],name,{type,lastModified:Date.now()})}catch(e){f=b;f.name=name}
        done(f)},type,.9);
    }
    ov.querySelector("[data-ok]").onclick=ok;
    requestAnimationFrame(()=>layout(false));
  });
}

/* อ่านค่าตั้งจาก input */
function optsOf(inp){
  const d=inp.dataset,o={};
  if(d.crop&&d.crop!=="free"){const m=/^(\d+(?:\.\d+)?)\s*[:x\/]\s*(\d+(?:\.\d+)?)$/.exec(d.crop);if(m)o.ratio=+m[1]/+m[2]}
  if(d.cropW)o.w=+d.cropW;
  if("cropExact" in d)o.exact=true;
  if("cropRound" in d){o.round=true;o.ratio=o.ratio||1}
  if(d.cropTitle)o.title=d.cropTitle;
  return o;
}

/* ใส่ไฟล์กลับเข้า input ได้ไหม (Safari เก่ามาก ๆ ทำไม่ได้ → ไม่ดัก ใช้ไฟล์เดิมไป) */
const CAN=(()=>{try{const t=new DataTransfer();t.items.add(new File([""],"x.txt",{type:"text/plain"}));return t.files.length===1}catch(e){return false}})();
const pass=new WeakSet();
async function onPick(e){
  const inp=e.target;
  if(!CAN||!(inp instanceof HTMLInputElement)||inp.type!=="file")return;
  if(pass.has(inp)){if(e.type==="change")pass.delete(inp);return}/* รอบที่เราส่งต่อเอง ปล่อยผ่าน */
  if("nocrop" in inp.dataset)return;
  const files=[...(inp.files||[])];
  if(!files.some(isImg))return;
  /* หยุดไว้ก่อน โค้ดของหน้านั้นยังไม่เห็นไฟล์จนกว่าจะครอปเสร็จ */
  e.stopImmediatePropagation();
  if(e.type!=="change")return;
  const o=optsOf(inp),max=+inp.dataset.cropMax||files.length;
  const list=files.slice(0,max),out=[];
  let skip=false;
  for(let i=0;i<list.length;i++){
    const f=list[i];
    if(skip||!isImg(f)){out.push(f);continue}
    const r=await open(f,{...o,idx:i,total:list.length,skip:!o.ratio&&list.length-i>1});
    if(r==="skip"){skip=true;out.push(f)}else if(r)out.push(r);
  }
  if(!out.length){try{inp.value=""}catch(err){}return}
  const dt=new DataTransfer();out.forEach(f=>dt.items.add(f));
  try{inp.files=dt.files}catch(err){}
  pass.add(inp);
  inp.dispatchEvent(new Event("input",{bubbles:true}));
  inp.dispatchEvent(new Event("change",{bubbles:true}));
}
addEventListener("input",onPick,true);
addEventListener("change",onPick,true);

window.CendonCrop={open:(file,o)=>open(file,o).then(r=>r==="skip"?file:r)};
})();
