/* GPS estimates only. No driver/car inference and no confirmed odometer writes. */
(function(W){
'use strict';
const gapMs=30000,maxSpeed=240/3.6;
const distance=(a,b)=>{const r=x=>x*Math.PI/180,p=r(b.lat-a.lat),q=r(b.lng-a.lng),h=Math.sin(p/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(q/2)**2;return 6371000*2*Math.asin(Math.min(1,Math.sqrt(h)))};
function create(uid,carId,resume){
  if(!uid||!carId)throw Error('Explicit account and car required');
  let last=null,seen=null,total=resume?.uid===uid&&resume?.carId===carId?Number(resume.metres)||0:0,gaps=total?1:0,rejected=0,samples=0,paused=false;
  function summary(){return {uid,carId,metres:Math.round(total),gaps,rejected,samples,estimated:true,incomplete:gaps>0||rejected>0,paused,t:Date.now()}}
  function push(p,now=Date.now()){
    if(paused)return {accepted:false,reason:'paused',...summary()};
    if(!p||![p.lat,p.lng,p.acc,p.t].every(Number.isFinite)||Math.abs(p.lat)>90||Math.abs(p.lng)>180||p.acc<0||p.acc>50||Math.abs(now-p.t)>10000){rejected++;last=null;return {accepted:false,reason:'quality',...summary()}}
    if(seen!=null&&p.t-seen>gapMs){gaps++;last=null}
    if(last){const dt=p.t-last.t,d=distance(last,p);
      if(dt<=0){rejected++;return {accepted:false,reason:'stale',...summary()}}
      if(d/(dt/1000)>maxSpeed){rejected++;last=null;return {accepted:false,reason:'jump',...summary()}}
      if(d>=Math.max(8,(last.acc+p.acc)*.6)){total+=d;last={...p}}
    }
    if(!last)last={...p};seen=p.t;samples++;return {accepted:true,...summary()};
  }
  return Object.freeze({push,summary,pause(){if(!paused){gaps++;paused=true;last=null;seen=null}return summary()},resume(){paused=false;last=null;seen=null;return summary()}});
}
const key=(uid,carId)=>'spire_drive_draft_'+encodeURIComponent(uid)+'_'+encodeURIComponent(carId);
function save(tracker){const s=tracker.summary();try{localStorage.setItem(key(s.uid,s.carId),JSON.stringify(s))}catch{}return s}
function load(uid,carId){try{const s=JSON.parse(localStorage.getItem(key(uid,carId))||'null');return s&&s.uid===uid&&s.carId===carId&&Number.isFinite(s.metres)&&s.metres>=0&&s.metres<=3000000&&Date.now()-s.t<12*3600000?s:null}catch{return null}}
function clear(uid,carId){if(!uid||!carId)return;try{localStorage.removeItem(key(uid,carId))}catch{}}
W.CendonMileage=Object.freeze({create,save,load,clear});
})(window);
