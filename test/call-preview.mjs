// Read-only UI harness: uses production markup, CSS and waveform/zoom functions.
// Never opens a camera/microphone, requests tokens or touches account storage.
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const source=readFileSync(new URL('chat.html',root),'utf8').replace(/\r\n/g,'\n');
const styles=[...source.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/g)].map(m=>m[0]).join('\n');
const links=[...source.matchAll(/<link\b[^>]*href="https:[^"]+"[^>]*>/g)].map(m=>m[0]).join('\n');
const markup=source.slice(source.indexOf('<div class="hearth"'),source.indexOf('\n</div>\n</div>',source.indexOf('<div class="hearth"'))+7)
  .replace('class="hearth"','class="hearth show cam"').replace('aria-hidden="true"','aria-hidden="false"')
  .replace('id="callZoomBox" hidden','id="callZoomBox"').replace('id="callFlipBtn" onclick="flipCamera()" type="button" aria-label="สลับกล้อง" hidden','id="callFlipBtn" onclick="flipCamera()" type="button" aria-label="สลับกล้อง"');
const wave=source.slice(source.indexOf('function drawCallEdges()'),source.indexOf('function callHealth()'));
const zoom=source.slice(source.indexOf('function setCallZoom(value)'),source.indexOf('function stopCamera()'));
const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${links}${styles}<link rel="stylesheet" href="/call-ui.css"><style>.hh-cam{background:linear-gradient(135deg,#484238,#938578,#2e3433)}.preview-note{position:absolute;top:90px;left:24px;color:white;z-index:5;font-size:13px}.preview-note input{display:block}</style></head><body>${markup}<script>
const $=id=>document.getElementById(id);let camZoom=1,camFacing='environment';
const orb={a:.4,t:0,ctx:$('hhOrb').getContext('2d')};
function buildGauges(){const c=$('hhOrb'),d=Math.min(2,devicePixelRatio||1);c.width=c.clientWidth*d;c.height=c.clientHeight*d;}
${wave}\n${zoom}
function toggleCamera(){$('callUI').classList.toggle('cam');$('callZoomBox').hidden=!$('callUI').classList.contains('cam');}
function flipCamera(){camFacing=camFacing==='user'?'environment':'user';setCallZoom(camZoom);}
function toggleCallMute(){$('callMuteBtn').classList.toggle('muted');}
function endCall(){$('callUI').classList.remove('show');}
$('heardTag').textContent='ตัวอย่างหน้าจอ — ไม่ได้เปิดกล้องหรือโทรจริง';$('callCaption').textContent='คลื่นตัวอย่างสำหรับตรวจ layout เท่านั้น';
buildGauges();function tick(){orb.t+=.025;orb.a=.18+.3*(.5+.5*Math.sin(orb.t*2));drawCallEdges();requestAnimationFrame(tick)}tick();
</script></body></html>`;
createServer((req,res)=>{if(req.url==='/call-ui.css'){res.setHeader('Content-Type','text/css');res.end(readFileSync(new URL('call-ui.css',root)));}else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);}}).listen(4175,'127.0.0.1',()=>console.log('Call UI preview: http://127.0.0.1:4175/'));
