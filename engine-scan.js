/* Pure scan contract/geometry helpers. No devices, network or image persistence. */
(function(){
'use strict';
const text=(v,n)=>typeof v==='string'?v.replace(/[<>\u0000-\u001f]/g,' ').trim().slice(0,n):'';
function read(data){
  if(!data||data.scanVersion!==2||!Array.isArray(data.items)||!['engine_bay','car_other','not_car'].includes(data.scene)
    ||!['clear','limited','blurred','dark','blocked'].includes(data.quality))throw Error('scan_version');
  const usable=data.scene==='engine_bay'&&['clear','limited'].includes(data.quality);
  const items=usable?data.items.slice(0,24).filter(x=>x&&/^[a-z_]{2,30}$/.test(x.part)&&x.certainty==='high'&&text(x.evidence,100).length>=4
    &&Array.isArray(x.box)&&x.box.length===4&&x.box.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1000)
    &&x.box[2]-x.box[0]>=8&&x.box[3]-x.box[1]>=8&&text(x.name,50)).map((x,i)=>({
      key:x.part+':'+i,part:x.part,name:text(x.name,50),box:x.box.slice(),certainty:'high',evidence:text(x.evidence,100),
      what:text(x.what,220),check:text(x.check,300),look:'',hazard:['high_voltage','keep_clear','observe'].includes(x.hazard)?x.hazard:'observe'
    })):[];
  const vehicleKind=['car','motorcycle'].includes(data.vehicleKind)?data.vehicleKind:'unknown';
  const guide=data.coverGuidance,coverGuidance=guide&&['leave_on','change_view'].includes(guide.action)?{action:guide.action,coverVisible:guide.coverVisible===true,maySuggestRemoval:false,message:text(guide.message,650)}:null;
  return {scene:data.scene,quality:data.quality,items,vehicleKind,coverGuidance,uncertain:Number.isInteger(data.uncertain)?Math.max(0,Math.min(80,data.uncertain)):0};
}
function frameKey(r){return [r.W,r.H,r.v.videoWidth,r.v.videoHeight,r.sx,r.sy,r.sw,r.sh,r.mirror?1:0].map(v=>Math.round(v*10)/10).join(':')}
function captureSize(r){const scale=Math.min(1,1280/Math.max(r.sw,r.sh));return{w:Math.max(1,Math.round(r.sw*scale)),h:Math.max(1,Math.round(r.sh*scale))}}
function fresh({frame,current,track,hidden=false}){return !hidden&&frame===current&&!!track&&track.lost===0}
function failure(status,data,lang){
  const en=lang==='en',code=typeof data?.error==='string'?data.error:'';
  const messages={
    scan_provider_busy:['ระบบอ่านภาพติดโควตาผู้ให้บริการชั่วคราว รอสักครู่แล้วแตะสแกนใหม่','Image provider is temporarily rate-limited. Wait briefly and tap Rescan.'],
    scan_timeout:['อ่านภาพใช้เวลานานเกินไป แตะสแกนใหม่ได้โดยไม่ต้องวางสาย','Image analysis timed out. Tap Rescan without ending the call.'],
    scan_not_configured:['ระบบอ่านภาพยังไม่ได้ตั้งค่า กรุณาแจ้งทีม Cendon','Image analysis is not configured. Please contact Cendon.'],
    scan_invalid_result:['AI ส่งตำแหน่งไม่ครบ จึงยังไม่แสดงกรอบ แตะสแกนใหม่ได้เลย','AI returned incomplete locations. No boxes shown. Tap Rescan.'],
    scan_upstream:['ระบบอ่านภาพขัดข้องชั่วคราว แตะสแกนใหม่ได้โดยไม่ต้องวางสาย','Image analysis is temporarily unavailable. Tap Rescan without ending the call.']
  };
  if(messages[code])return messages[code][en?1:0];
  if(status===401)return en?'Sign in again to use the scanner.':'กรุณาเข้าสู่ระบบอีกครั้งเพื่อใช้สแกน';
  if(status===403)return en?'This account cannot use the scanner.':'บัญชีนี้ยังไม่สามารถใช้ระบบสแกนได้';
  if(status===429)return en?'Today’s AI allowance has been used. Try again tomorrow.':'ใช้โควตา AI ของวันนี้ครบแล้ว พรุ่งนี้ใช้ได้อีกครับ';
  if(status===400||status===413)return en?'This image could not be sent. Tap Rescan to take a new frame.':'ส่งภาพนี้ไม่ได้ แตะสแกนใหม่เพื่อถ่ายเฟรมใหม่';
  return messages.scan_upstream[en?1:0];
}
window.CendonEngineScan=Object.freeze({read,frameKey,captureSize,fresh,failure,color:'#FF514B',version:2});
})();
