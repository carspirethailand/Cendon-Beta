/* หน้าปัดเสียง (ใช้ร่วม: ฟังเสียงในสาย call-tools.js · หน้าฟังเสียงรถ index.html)
   มุม = เวลา (ครบหนึ่งรอบตามที่ผู้เรียกกำหนด) · รัศมี = ความถี่ 60Hz–8kHz แบบลอการิทึม · สี = ความดัง
   โหมดมืด ดำ → แดงเข้ม → ส้ม → ครีม · โหมดสว่าง กระดาษ → พีช → ส้ม → น้ำตาลเข้ม · ไม่เก็บหรือส่งเสียงไปไหน */
(function(){
'use strict';
const LUT=stops=>{const o=[];for(let i=0;i<256;i++){const x=i/255;let k=0;while(k<stops.length-2&&x>stops[k+1][0])k++;const [a,ca]=stops[k],[b,cb]=stops[k+1],f=(x-a)/(b-a||1);
  const c=ca.map((v,j)=>v+(cb[j]-v)*f);o.push(`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${c[3].toFixed(3)})`)}return o};
const EMBER=LUT([[0,[9,9,11,0]],[.18,[60,18,12,.55]],[.38,[150,42,22,.85]],[.6,[240,122,54,1]],[.82,[255,190,130,1]],[1,[255,244,226,1]]]);
const PAPER=LUT([[0,[250,250,249,0]],[.18,[252,222,200,.6]],[.4,[244,150,96,.9]],[.62,[233,104,42,1]],[.84,[150,52,20,1]],[1,[50,18,8,1]]]);
/* พื้นหน้าปัด: ร่อง + วงบาง + ขีด 100 เส้น */
function base(cv,{light=false}={}){
  const dpr=Math.min(2,window.devicePixelRatio||1),S=Math.round((cv.clientWidth||320)*dpr)||640;cv.width=cv.height=S;
  const g=cv.getContext('2d'),C=S/2,G={g,S,C,r0:S*.178,r1:S*.417,t0:S*.439,t1:S*.464,light,
    track:light?'rgba(9,9,11,.035)':'rgba(250,250,250,.045)',ring:light?'rgba(9,9,11,.08)':'rgba(250,250,250,.08)',off:light?'rgba(9,9,11,.18)':'rgba(250,250,250,.17)',on:light?'rgba(9,9,11,.62)':'rgba(250,250,250,.6)',lut:light?PAPER:EMBER,tick:0};
  if(!g||!g.beginPath)return G;
  g.clearRect(0,0,S,S);g.beginPath();g.arc(C,C,G.r1,0,Math.PI*2);g.moveTo(C+G.r0,C);g.arc(C,C,G.r0,0,Math.PI*2,true);g.fillStyle=G.track;g.fill('evenodd');
  for(const r of [G.r0,(G.r0+G.r1)/2,G.r1]){g.beginPath();g.arc(C,C,r,0,Math.PI*2);g.strokeStyle=G.ring;g.lineWidth=dpr;g.stroke()}
  for(let i=0;i<100;i++)tick(G,i,false);
  return G;
}
function tick(G,i,on){
  const {g,C}=G;if(!g||!g.beginPath)return;const a=-Math.PI/2+i/100*Math.PI*2,maj=i%10===0,ra=maj?G.t0-G.S*.006:G.t0,rb=maj?G.t1+G.S*.008:G.t1;
  g.beginPath();g.moveTo(C+Math.cos(a)*ra,C+Math.sin(a)*ra);g.lineTo(C+Math.cos(a)*rb,C+Math.sin(a)*rb);
  g.strokeStyle=on?G.on:G.off;g.lineWidth=(maj?2.4:1.4)*G.S/720;g.lineCap='round';g.stroke();
}
/* เสียงช่วงล่าสุด (p0→p1 ของหนึ่งรอบ) เป็นชิ้นวงแหวน 64 ชั้นความถี่ */
function slice(G,bins,hz,p0,p1){
  const {g,C,r0,r1,lut}=G;if(!g||!g.beginPath||p1<=p0)return;
  const a0=-Math.PI/2+p0*Math.PI*2,a1=-Math.PI/2+p1*Math.PI*2+.004,N=64,lo=Math.log(60),span=Math.log(8000)-lo;
  for(let k=0;k<N;k++){
    const f=Math.exp(lo+(k+.5)/N*span),v=bins[Math.min(bins.length-1,Math.round(f/hz))]|0,rA=r0+(r1-r0)*k/N,rB=r0+(r1-r0)*(k+1)/N;
    if(v<8)continue;
    g.beginPath();g.arc(C,C,rB,a0,a1);g.arc(C,C,rA,a1,a0,true);g.closePath();g.fillStyle=lut[Math.min(255,v)];g.fill();
  }
  const upto=Math.min(100,Math.floor(p1*100)+1);while(G.tick<upto)tick(G,G.tick++,true);
}
window.CendonLens=Object.freeze({base,tick,slice});
})();
