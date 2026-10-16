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
  const guide=data.coverGuidance,coverGuidance=guide&&['leave_on','change_view','manual_required'].includes(guide.action)?{action:guide.action,message:text(guide.message,650),coverVisible:guide.coverVisible===true,maySuggestRemoval:false}:null;
  return {scene:data.scene,quality:data.quality,items,coverGuidance,uncertain:Number.isInteger(data.uncertain)?Math.max(0,Math.min(80,data.uncertain)):0};
}
function frameKey(r){return [r.W,r.H,r.v.videoWidth,r.v.videoHeight,r.sx,r.sy,r.sw,r.sh,r.mirror?1:0].map(v=>Math.round(v*10)/10).join(':')}
function captureSize(r){const scale=Math.min(1,1280/Math.max(r.sw,r.sh));return{w:Math.max(1,Math.round(r.sw*scale)),h:Math.max(1,Math.round(r.sh*scale))}}
function fresh({frame,current,track,hidden=false}){return !hidden&&frame===current&&!!track&&track.lost===0}
window.CendonEngineScan=Object.freeze({read,frameKey,captureSize,fresh,color:'#FF514B',version:2});
})();
