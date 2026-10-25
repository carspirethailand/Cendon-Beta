/* ═══ แผนที่ช่าง (หน้า /map) ═══
   MapLibre = แผนที่เวกเตอร์ สีชุดเดียวกับแอป (ถนนหลักอมส้ม โหมดมืดเป็นสีมืดจริง ไม่ใช่กลับสีภาพ) · เอียงเป็น 3 มิติเห็นตึกได้
   แผ่นแผนที่จาก OpenFreeMap (ฟรี ไม่ใช้คีย์ ไม่ตั้งคุกกี้) — โหลดไม่ได้ใช้แผ่น OSM แทน
   ข้อมูลร้าน งาน และตำแหน่งคุณ มาจาก index.html ผ่าน A ทั้งหมด (ไฟล์นี้ไม่เรียก API เอง)
   ตำแหน่งคุณและจุดจอดรถอยู่ในเครื่องนี้เท่านั้น ไม่ส่งออก
   เครื่องไม่มี WebGL / โหลดไลบรารีไม่ได้ → mount() โยน error ให้ index.html ใช้แผนที่เดิม (Leaflet) */

const ML='/vendor/maplibre-gl-4.7.1',STYLE='https://tiles.openfreemap.org/styles/liberty',CSS_URL='/map-atlas.css?v=2';
/* สีแผนที่สองธีม — ตรงกับบอร์ด "สีแผนที่ใหม่" ในงานออกแบบ */
const PAL={
  light:{bg:'#F3F1EC',green:'#DDE8D3',water:'#C8DCE7',road:'#FFFFFF',casing:'#E2DCD2',major:'#FDE7D2',majorCase:'#EDC29A',motor:'#F8CFA6',motorCase:'#E3A06A',
    rail:'#C6BFB3',bld:'#E7E2D9',text:'#6E6A63',halo:'#FBFAF7',sky:'#DCE7F0',horizon:'#F4EDE4',fog:'#F3F1EC',ink:'#09090B'},
  dark:{bg:'#101114',green:'#0E1A12',water:'#08151E',road:'#202227',casing:'#0B0C0E',major:'#4A3019',majorCase:'#140D07',motor:'#6A3D1A',motorCase:'#1E1208',
    rail:'#30323A',bld:'#191A1F',text:'#9798A1',halo:'#0F1013',sky:'#04050A',horizon:'#21160D',fog:'#101114',ink:'#FAFAF9'}};
const TEAL='#0D9488',RED='#DC2626',ORANGE='#E9682A';

let lib=null,raw=null;
function loadLib(){
  if(lib)return lib;
  return lib=new Promise((ok,no)=>{
    if(window.maplibregl)return ok(window.maplibregl);
    if(!document.querySelector(`link[href="${ML}.css"]`)){const c=document.createElement('link');c.rel='stylesheet';c.href=ML+'.css';document.head.appendChild(c)}
    const s=document.createElement('script');s.src=ML+'.js';
    s.onload=()=>window.maplibregl?ok(window.maplibregl):no(Error('maplibre'));
    s.onerror=()=>{lib=null;no(Error('maplibre'))};document.head.appendChild(s);
  });
}
export function supported(){
  try{const c=document.createElement('canvas'),gl=c.getContext('webgl2')||c.getContext('webgl');if(!gl)return false;
    const x=gl.getExtension('WEBGL_lose_context');x&&x.loseContext();return true}catch(e){return false}
}
/* ทาสีสไตล์ liberty ใหม่ตามชนิดข้อมูล (OpenMapTiles) · ตัดป้ายร้านค้า/สถานที่ออก ให้หมุดช่างเด่นที่สุด */
function restyle(src,P){
  const s=JSON.parse(JSON.stringify(src)),vec=Object.keys(s.sources||{}).find(k=>s.sources[k].type==='vector');
  const drop=new Set(['poi','housenumber','aerodrome_label','mountain_peak','park']);
  s.layers=(s.layers||[]).filter(l=>!(l.type==='symbol'&&drop.has(l['source-layer'])));
  let ext=false;
  for(const l of s.layers){
    const sl=l['source-layer']||'',id=l.id||'',p=l.paint=l.paint||{};
    if(l.type==='background')p['background-color']=P.bg;
    else if(l.type==='fill'){
      delete p['fill-pattern'];delete p['fill-outline-color'];
      p['fill-color']=sl==='water'?P.water:sl==='building'?P.bld:(sl==='landcover'||sl==='park'||/park|wood|grass|forest/.test(id))?P.green:P.bg;
    }else if(l.type==='line'){
      delete p['line-pattern'];
      if(sl==='waterway')p['line-color']=P.water;
      else if(sl==='transportation'){
        const cas=/casing/.test(id),mw=/motorway/.test(id),mj=/trunk|primary/.test(id);
        p['line-color']=/rail|transit/.test(id)?P.rail:cas?(mw?P.motorCase:mj?P.majorCase:P.casing):mw?P.motor:mj?P.major:P.road;
      }else if(sl==='building')p['line-color']=P.bld;
      else if(sl==='boundary')p['line-color']=P.casing;
    }else if(l.type==='fill-extrusion'){ext=true;Object.assign(p,EXT(P))}
    else if(l.type==='symbol'){
      const y=l.layout=l.layout||{};
      if(y['text-field']){p['text-color']=P.text;p['text-halo-color']=P.halo;p['text-halo-width']=1.2}
      if(/oneway|shield/.test(id)||(sl==='transportation_name'&&y['icon-image']))y.visibility='none';
    }
  }
  if(!ext&&vec){const at=s.layers.findIndex(l=>l.type==='symbol');s.layers.splice(at<0?s.layers.length:at,0,{id:'atl-bld3d',type:'fill-extrusion',source:vec,'source-layer':'building',minzoom:13,paint:EXT(P)})}
  s.sky=SKY(P);s.light={anchor:'viewport',color:'#ffffff',intensity:.35,position:[1.3,200,35]};
  return s;
}
const SKY=P=>({'sky-color':P.sky,'horizon-color':P.horizon,'fog-color':P.fog,'sky-horizon-blend':.55,'horizon-fog-blend':.65,'fog-ground-blend':.3,'atmosphere-blend':0});
/* ตึกค่อย ๆ งอกขึ้นตอนซูมเข้า */
const EXT=P=>({'fill-extrusion-color':P.bld,'fill-extrusion-opacity':.9,'fill-extrusion-vertical-gradient':true,
  'fill-extrusion-height':['interpolate',['linear'],['zoom'],13,0,14.3,['coalesce',['get','render_height'],8]],
  'fill-extrusion-base':['interpolate',['linear'],['zoom'],13,0,14.3,['coalesce',['get','render_min_height'],0]]});
const rasterStyle=(P,dark)=>({version:8,sky:SKY(P),
  sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:'© OpenStreetMap contributors'}},
  layers:[{id:'bg',type:'background',paint:{'background-color':P.bg}},{id:'osm',type:'raster',source:'osm',paint:dark?{'raster-brightness-max':.4,'raster-saturation':-.75,'raster-contrast':.15}:{'raster-saturation':-.35,'raster-brightness-min':.08}}]});
async function styleFor(dark){
  const P=dark?PAL.dark:PAL.light;
  try{
    if(!raw){const ac=new AbortController(),t=setTimeout(()=>ac.abort(),4500);
      try{const r=await fetch(STYLE,{signal:ac.signal});if(!r.ok)throw Error(r.status);raw=await r.json()}finally{clearTimeout(t)}}
    return restyle(raw,P);
  }catch(e){return rasterStyle(P,dark)}
}

/* ── เรขาคณิต ── */
const KM_LAT=110.574,kmLng=lat=>111.32*Math.cos(lat*Math.PI/180);
function ring(c,km,n=72){
  const out=[];for(let i=0;i<=n;i++){const a=i/n*2*Math.PI;out.push([c.lng+km*Math.sin(a)/kmLng(c.lat),c.lat+km*Math.cos(a)/KM_LAT])}
  return out;
}
const poly=(c,km,props)=>({type:'Feature',properties:props||{},geometry:{type:'Polygon',coordinates:[ring(c,km)]}});
const FC=f=>({type:'FeatureCollection',features:f.filter(Boolean)});
/* ขับรถในเมืองเฉลี่ยราว 22 กม./ชม. — เป็นค่าประมาณ ไม่ใช่เส้นทางจริง จึงขึ้นคำว่า "ราว" ทุกครั้ง */
const etaMin=d=>Math.max(3,Math.round(d/22*60)+2);

export async function mount(host,A){
  const ml=await loadLib();
  const D=document,T=A.T,esc=A.esc,RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!D.querySelector(`link[href="${CSS_URL}"]`)){const c=D.createElement('link');c.rel='stylesheet';c.href=CSS_URL;D.head.appendChild(c)}
  const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
  /* เลเยอร์ที่ผู้ใช้เลือกไว้ จำในเครื่อง (ความสะดวกของคนดู ไม่ใช่ข้อมูลสำคัญ) */
  const LAY=Object.assign({rings:true,cover:false,heat:false,car:true,closed:true,d3:false},LS.get('spire_mapLayers',{}));
  if(!A.want3d)LAY.d3=false;
  const MF={open:false,urgent:false,mobile:false,roam:false,verified:false,top:false,cat:'',q:'',sort:'near',area:null};
  const f0=A.filter()||{};
  if(f0.cat==='mobile')MF.mobile=true;else if(f0.cat==='urgent')MF.urgent=true;else if(f0.cat&&f0.cat!=='all'&&A.cats[f0.cat])MF.cat=f0.cat;
  MF.q=f0.q||'';
  const st={sel:null,sheet:'peek',urg:false,match:null,dark:D.documentElement.getAttribute('data-theme')==='dark',list:[],all:[],markers:new Map(),me:null,car:null,labs:[],
    userMoved:false,ready:false,styleOk:false,fitDone:false,layers:false,carOpen:false};
  const isDesk=()=>matchMedia('(min-width:1024px)').matches;

  host.innerHTML=`<div class="atl" data-sheet="peek">
    <div class="atl-map"></div><div class="atl-dim" aria-hidden="true"></div>
    <div class="atl-top">
      <button class="atl-ic" type="button" data-a="back"><i class="ti ti-arrow-left"></i></button>
      <label class="atl-search"><i class="ti ti-search" aria-hidden="true"></i><input type="search" enterkeyhint="search" autocomplete="off"><button class="atl-ai" type="button" data-a="ai"><i class="ti ti-sparkles"></i></button></label>
    </div>
    <div class="atl-ubar" hidden><button class="atl-ic" type="button" data-a="unurg"><i class="ti ti-x"></i></button><div><i class="ti ti-flame" aria-hidden="true"></i><b></b><span></span></div></div>
    <div class="atl-chips" role="toolbar"></div>
    <div class="atl-float"><button class="atl-live" type="button" data-a="live" hidden></button><button class="atl-area" type="button" data-a="area" hidden></button></div>
    <div class="atl-fab"><button class="atl-sos" type="button" data-a="urgent"><i class="ti ti-flame" aria-hidden="true"></i><span></span></button><button class="atl-match" type="button" data-a="match"><i class="ti ti-target-arrow" aria-hidden="true"></i><span></span></button></div>
    <div class="atl-ctl"><button class="atl-ic" type="button" data-a="layers"><i class="ti ti-stack-2"></i></button><button class="atl-ic" type="button" data-a="tilt"></button><button class="atl-ic atl-loc" type="button" data-a="locate"><i class="ti ti-current-location"></i></button></div>
    <section class="atl-sheet"><div class="atl-grab" data-a="grab"><span></span></div><div class="atl-sb"></div></section>
    <div class="atl-pop" hidden></div>
    <div class="atl-lay" hidden></div>
  </div>`;
  const R=host.firstElementChild,$=s=>R.querySelector(s),sheetEl=$('.atl-sheet'),sb=$('.atl-sb'),input=$('.atl-search input');

  /* ── แผนที่ ── */
  const here0=A.here();
  const map=new ml.Map({container:$('.atl-map'),style:await styleFor(st.dark),center:here0?[here0.lng,here0.lat]:[100.5018,13.7563],zoom:here0?13:10.5,
    attributionControl:false,maxPitch:70,dragRotate:true,pitchWithRotate:true,touchPitch:true,fadeDuration:150});
  st.map=map;
  map.addControl(new ml.AttributionControl({compact:true}),'bottom-right');
  /* รอแค่สไตล์พร้อม (ไม่รอแผ่นแผนที่ครบ) — เน็ตช้าก็เห็นหมุดก่อน แผ่นแผนที่ค่อยตามมา */
  await new Promise((ok,no)=>{const t=setTimeout(()=>no(Error('style timeout')),12000),done=()=>{clearTimeout(t);ok()};
    if(map.isStyleLoaded())return done();
    map.once('style.load',done);map.once('load',done);
    map.on('error',e=>{if(!map.isStyleLoaded()&&e&&e.error&&/webgl/i.test(String(e.error.message||''))){clearTimeout(t);no(e.error)}})});
  const P=()=>st.dark?PAL.dark:PAL.light;
  const before=()=>{const l=(map.getStyle().layers||[]).find(x=>x.type==='symbol');return l&&l.id};
  /* เลเยอร์ของเราอยู่ใต้ป้ายชื่อถนนเสมอ */
  function addLayers(){
    const b=before(),src=id=>{if(!map.getSource(id))map.addSource(id,{type:'geojson',data:FC([])})};
    ['atl-cover','atl-pts','atl-rings','atl-sel','atl-path','atl-reach'].forEach(src);
    const add=l=>{if(!map.getLayer(l.id))map.addLayer(l,b)};
    add({id:'atl-heat',type:'heatmap',source:'atl-pts',maxzoom:16,paint:{'heatmap-weight':1,'heatmap-intensity':['interpolate',['linear'],['zoom'],8,.6,15,1.4],
      'heatmap-radius':['interpolate',['linear'],['zoom'],8,18,15,48],'heatmap-opacity':.6,
      'heatmap-color':['interpolate',['linear'],['heatmap-density'],0,'rgba(233,104,42,0)',.3,'rgba(233,104,42,.22)',.6,'rgba(240,122,54,.45)',1,'rgba(220,38,38,.6)']}});
    add({id:'atl-cover-f',type:'fill',source:'atl-cover',paint:{'fill-color':TEAL,'fill-opacity':.08}});
    add({id:'atl-cover-l',type:'line',source:'atl-cover',paint:{'line-color':TEAL,'line-opacity':.45,'line-width':1.2}});
    add({id:'atl-reach-f',type:'fill',source:'atl-reach',paint:{'fill-color':RED,'fill-opacity':.09}});
    add({id:'atl-reach-l',type:'line',source:'atl-reach',layout:{'line-cap':'round'},paint:{'line-color':'#F87171','line-width':1.6,'line-dasharray':[2,3]}});
    add({id:'atl-rings-l',type:'line',source:'atl-rings',layout:{'line-cap':'round'},paint:{'line-color':P().ink,'line-opacity':.22,'line-width':1.2,'line-dasharray':[1,3]}});
    add({id:'atl-sel-f',type:'fill',source:'atl-sel',paint:{'fill-color':TEAL,'fill-opacity':.1}});
    add({id:'atl-sel-l',type:'line',source:'atl-sel',layout:{'line-cap':'round'},paint:{'line-color':TEAL,'line-width':1.8,'line-dasharray':[2,2.5]}});
    add({id:'atl-path',type:'line',source:'atl-path',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':P().ink,'line-width':2.4,'line-dasharray':[.2,2.6]}});
    paintOverlays();
  }
  const setData=(id,fc)=>{const s=map.getSource(id);s&&s.setData(fc)};
  addLayers();st.ready=true;
  map.on('style.load',()=>{addLayers()});

  /* ── สถานะร้าน (จากข้อมูลจริงเท่านั้น) ── */
  function status(t){
    if(t.vacation)return {on:false,txt:T('ปิดรับงานชั่วคราว','Not taking jobs')};
    const o=A.openNow(t);if(o)return o;
    return t.online?{on:true,txt:T('รับงานอยู่ตอนนี้','Taking jobs now')}:null;
  }
  const ratingOk=t=>t.reviewCount>0&&Number(t.rating)>=4.5;
  const inArea=t=>{const a=MF.area;return !a||(t.lat>=a.s&&t.lat<=a.n&&t.lng>=a.w&&t.lng<=a.e)};
  function compute(){
    const base=A.shown({cat:MF.cat||'all',q:MF.q}).filter(t=>t.lat!=null&&t.lng!=null);
    st.all=base;
    let l=base.map(t=>({...t,st:status(t)}));
    if(MF.open)l=l.filter(t=>t.st&&t.st.on);
    if(MF.urgent)l=l.filter(t=>t.urgent);
    if(MF.mobile)l=l.filter(t=>t.mobile);
    if(MF.roam)l=l.filter(t=>t.roam&&t.live);
    if(MF.verified)l=l.filter(t=>t.verified);
    if(MF.top)l=l.filter(ratingOk);
    if(!LAY.closed)l=l.filter(t=>!t.st||t.st.on);
    const S={near:(a,b)=>(a.dist??1e9)-(b.dist??1e9),rating:(a,b)=>(b.reviewCount?b.rating:0)-(a.reviewCount?a.rating:0)||(a.dist??1e9)-(b.dist??1e9),
      price:(a,b)=>(a.from||1e9)-(b.from||1e9)||(a.dist??1e9)-(b.dist??1e9)}[MF.sort];
    st.list=l.slice().sort(S);
    st.view=st.list.filter(inArea);
  }
  const filtered=()=>MF.open||MF.urgent||MF.mobile||MF.roam||MF.verified||MF.top||!!MF.cat||!!MF.q;
  /* ช่างเคลื่อนที่: ตำแหน่งมาจากมือถือช่าง (หลังบ้านปัดแล้ว ~300 ม.) — บอกเสมอว่าอัปเดตเมื่อไร */
  const liveAgo=at=>{const m=Math.floor((Date.now()-at)/60000);return m<1?T('เพิ่งอัปเดต','just updated'):T(`อัปเดต ${m} นาทีที่แล้ว`,`updated ${m} min ago`)};
  const moving=t=>!!(t.roam&&t.live);

  /* ── จับคู่ช่าง: 3 ร้านที่ใช่ จากข้อมูลจริงเท่านั้น (ระยะ · งานซ่อมจบพร้อมหลักฐาน · ทีมงานตรวจ · ดาวรีวิว) ──
     ดาวใช้ค่าเฉลี่ยถ่วงจำนวนรีวิว: ร้าน 1 รีวิว 5 ดาว ไม่ชนะร้าน 4.9 จาก 127 รีวิว · ไม่จับคู่ร้านตัวเอง ร้านไม่รับงาน และร้านงานเต็ม */
  const bay=t=>t.reviewCount>0?(Number(t.rating)*t.reviewCount+4*5)/(t.reviewCount+5):0;
  const qual=t=>Math.min(1,Math.log1p(t.proven||0)/Math.log1p(40))*.75+(t.verified?.25:0);
  const nearSc=d=>d==null?.3:1/(1+d/4);
  const onNow=t=>!!(t.st&&t.st.on);
  const MATCH={
    best:{key:'',sc:t=>.4*nearSc(t.dist)+.35*qual(t)+.25*(t.reviewCount?Math.max(0,Math.min(1,(bay(t)-3.5)/1.5)):0)+(onNow(t)?.08:0)},
    near:{key:'dist',cmp:(a,b)=>(a.dist??1e9)-(b.dist??1e9)||onNow(b)-onNow(a)},
    quality:{key:'proven',cmp:(a,b)=>(b.proven||0)-(a.proven||0)||!!b.verified-!!a.verified||(b.warranty||0)-(a.warranty||0)||bay(b)-bay(a)||(a.dist??1e9)-(b.dist??1e9)},
    stars:{key:'stars',need:t=>t.reviewCount>0,cmp:(a,b)=>bay(b)-bay(a)||b.reviewCount-a.reviewCount||(a.dist??1e9)-(b.dist??1e9)}};
  function matchList(){
    const h=A.here(),m=MATCH[st.match]||MATCH.best;
    let c=st.list.filter(t=>!A.isMine(t)&&!t.vacation&&!t.full&&(!m.need||m.need(t)));
    /* มีตำแหน่งคุณ = ดูแค่ร้านในระยะที่ไปถึงจริง (30 กม. · ไม่ถึง 3 ร้านขยายเป็น 80 กม.) */
    if(h){const w=c.filter(t=>t.dist!=null&&t.dist<=30);c=w.length>=3?w:c.filter(t=>t.dist!=null&&t.dist<=80)}
    c=m.sc?c.map(t=>({...t,_s:m.sc(t)})).sort((a,b)=>b._s-a._s||(a.dist??1e9)-(b.dist??1e9)):c.slice().sort(m.cmp);
    return c.slice(0,3).map((t,i)=>({...t,rank:i+1}));
  }
  /* เหตุผลที่เลือก — ตัวเลขจริงทุกข้อ เรียงเอาเรื่องที่ใช้จัดอันดับขึ้นก่อน */
  function why(t){
    const d=t.dist,out=[];
    if(d!=null)out.push(['dist','ti-map-pin',moving(t)?T(`ห่างคุณตอนนี้ ${A.distTxt(d)}`,`${A.distTxt(d)} from you now`):T(`ห่าง ${A.distTxt(d)}`,`${A.distTxt(d)} away`)]);
    if(t.proven)out.push(['proven','ti-shield-check',T(`ซ่อมจบมีหลักฐาน ${t.proven} งาน`,`${t.proven} proven jobs`)]);
    else if(t.verified)out.push(['proven','ti-rosette-discount-check-filled',T('ทีมงานตรวจแล้ว','Checked by staff')]);
    out.push(['stars','ti-star-filled',t.reviewCount?T(`${Number(t.rating).toFixed(1)} จาก ${t.reviewCount} รีวิว`,`${Number(t.rating).toFixed(1)} from ${t.reviewCount} reviews`):T('ยังไม่มีรีวิว','No reviews yet')]);
    if(onNow(t))out.push(['on','ti-circle-check',esc(t.st.txt)]);
    const k=(MATCH[st.match]||{}).key;
    return out.sort((a,b)=>(b[0]===k)-(a[0]===k)).slice(0,3);
  }

  /* ── หมุด + กลุ่มร้าน (รวมหมุดที่ทับกันบนจอ) ── */
  const avHTML=(t,cls)=>{const ph=t.avatar||t.cover||(t.photos||[])[0];
    return `<span class="${cls}" style="--c:${A.colorOf(t)}${ph?`;background-image:url('${A.img(ph)}')`:''}">${ph?'':A.initial(t.shop||t.name)}</span>`};
  function pinEl(t){
    const el=D.createElement('div');el.className='atl-mk';
    el.innerHTML=`<button type="button" class="atl-pin" aria-label="${esc(t.shop||t.name)}"></button>`;
    el.firstElementChild.addEventListener('click',e=>{e.stopPropagation();select(t.id)});
    return el;
  }
  function paintPin(el,t,sel){
    const b=el.firstElementChild,s=t.st,urg=t.urgent&&(!s||s.on)&&!t.full;
    b.className='atl-pin'+(sel?' sel':'')+(s&&!s.on?' off':'')+(urg?' urg':'')+(t.test?' test':'');
    b.setAttribute('aria-pressed',sel?'true':'false');
    b.innerHTML=sel
      ?`<span class="atl-lab">${avHTML(t,'atl-av')}<span class="atl-lt"><b>${esc(t.shop||t.name)}</b><small>${t.from?T('เริ่ม','From')+' ฿'+A.money(t.from):T('ถามราคา','Ask for price')}</small></span></span><span class="atl-tip"></span>`
      :`${urg?'<span class="atl-halo"></span>':''}${moving(t)?'<span class="atl-roam"></span>':''}<span class="atl-stem"></span>${avHTML(t,'atl-av')}${s?`<span class="atl-dot ${s.on?'on':''}"></span>`:''}${t.rank?`<span class="atl-rank">${t.rank}</span>`:t.mobile?`<span class="atl-mob"><i class="ti ti-${moving(t)?'navigation':'truck'}"></i></span>`:''}`;
  }
  function clusterEl(g){
    const el=D.createElement('div');el.className='atl-mk';
    const n=g.length,by={};g.forEach(t=>{const c=A.colorOf(t);by[c]=(by[c]||0)+1});
    let acc=0;const seg=Object.entries(by).map(([c,k])=>{const a=acc;acc+=k/n*100;return `${c} ${a.toFixed(1)}% ${acc.toFixed(1)}%`}).join(',');
    el.innerHTML=`<button type="button" class="atl-clu" style="--seg:conic-gradient(${seg})" aria-label="${T(`${n} ร้าน แตะเพื่อซูม`,`${n} shops, tap to zoom`)}"><b>${n}</b></button>`;
    el.firstElementChild.addEventListener('click',e=>{e.stopPropagation();
      const b=new ml.LngLatBounds();g.forEach(t=>b.extend([t.lng,t.lat]));map.fitBounds(b,{padding:pad(70),maxZoom:16.5,duration:RM?0:700})});
    return el;
  }
  function layout(){
    if(!st.ready)return;
    const pts=(st.urg?urgentList().all:st.match?matchList():st.list),seen=new Set(),out=[],z=map.getZoom(),R=z>=16.5?0:46;
    const pr=pts.map(t=>({t,p:map.project([t.lng,t.lat])}));
    /* ร้านที่เลือกไม่ถูกรวมเข้ากลุ่ม */
    const order=pr.slice().sort((a,b)=>(b.t.id===st.sel)-(a.t.id===st.sel)||(b.t.urgent-a.t.urgent));
    for(const a of order){
      if(seen.has(a.t.id))continue;seen.add(a.t.id);
      if(!R||a.t.id===st.sel){out.push({one:a.t});continue}
      const g=[a.t];
      for(const b of order){if(seen.has(b.t.id)||b.t.id===st.sel)continue;if(Math.abs(a.p.x-b.p.x)<R&&Math.abs(a.p.y-b.p.y)<R){g.push(b.t);seen.add(b.t.id)}}
      out.push(g.length>1?{g}:{one:a.t});
    }
    const keep=new Set();
    for(const o of out){
      if(o.one){const t=o.one,k='s:'+t.id,sel=t.id===st.sel,sig=[sel,t.st&&t.st.on,t.urgent,t.full,t.avatar,t.from,t.shop,t.rank,moving(t)].join('|');keep.add(k);
        let m=st.markers.get(k);
        if(!m){const el=pinEl(t);m={mk:new ml.Marker({element:el,anchor:'bottom'}).setLngLat([t.lng,t.lat]).addTo(map),el,sig:''};st.markers.set(k,m)}
        if(m.sig!==sig){paintPin(m.el,t,sel);m.sig=sig}
        glide(m.mk,[t.lng,t.lat],t.roam);m.el.style.zIndex=sel?30:t.rank?14:t.urgent?12:10;
      }else{
        const ids=o.g.map(t=>t.id).sort(),k='c:'+ids.join(',');keep.add(k);
        if(!st.markers.has(k)){const b=new ml.LngLatBounds();o.g.forEach(t=>b.extend([t.lng,t.lat]));
          const el=clusterEl(o.g);st.markers.set(k,{mk:new ml.Marker({element:el,anchor:'center'}).setLngLat(b.getCenter()).addTo(map),el,sig:''});el.style.zIndex=20}
      }
    }
    for(const [k,m] of st.markers)if(!keep.has(k)){m.mk.remove();st.markers.delete(k)}
    placePop();
  }

  /* ช่างเคลื่อนที่ขยับ = หมุดไหลไปจุดใหม่ (ไม่กระโดด) · ระยะไกลเกินหรือผู้ใช้ลดการเคลื่อนไหว = ย้ายทันที */
  function glide(mk,to,soft){
    const a=mk.getLngLat();if(a.lng===to[0]&&a.lat===to[1])return;
    cancelAnimationFrame(mk._g);
    if(!soft||RM||A.km({lat:a.lat,lng:a.lng},{lat:to[1],lng:to[0]})>5){mk.setLngLat(to);return}
    const t0=performance.now(),step=n=>{const k=Math.min(1,(n-t0)/900),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
      mk.setLngLat([a.lng+(to[0]-a.lng)*e,a.lat+(to[1]-a.lat)*e]);if(k<1)mk._g=requestAnimationFrame(step)};
    mk._g=requestAnimationFrame(step);
  }

  /* ── คุณ · รถของคุณ · วงระยะ ── */
  function paintMe(){
    const h=A.here();
    if(!h){if(st.me){st.me.remove();st.me=null}return}
    if(!st.me){const el=D.createElement('div');el.className='atl-me';el.innerHTML='<span></span>';st.me=new ml.Marker({element:el,anchor:'center'}).setLngLat([h.lng,h.lat]).addTo(map)}
    st.me.setLngLat([h.lng,h.lat]);
  }
  const ageTxt=ms=>{const m=Math.max(1,Math.round(ms/60000));
    return m<60?T(`จอด ${m} นาที`,`Parked ${m} min`):m<1440?T(`จอด ${Math.round(m/60)} ชม.`,`Parked ${Math.round(m/60)} hr`):T(`จอด ${Math.round(m/1440)} วัน`,`Parked ${Math.round(m/1440)} days`)};
  function paintCar(){
    const p=LAY.car&&A.parked();
    if(!p||!Number.isFinite(+p.lat)||!Number.isFinite(+p.lng)){if(st.car){st.car.remove();st.car=null}return}
    if(!st.car){const el=D.createElement('div');el.className='atl-carmk';st.car=new ml.Marker({element:el,anchor:'bottom'}).setLngLat([+p.lng,+p.lat]).addTo(map)}
    const el=st.car.getElement(),walk=`https://www.google.com/maps/dir/?api=1&destination=${(+p.lat).toFixed(6)},${(+p.lng).toFixed(6)}&travelmode=walking`;
    el.innerHTML=`<button type="button" class="atl-car" aria-expanded="${st.carOpen}"><span><i class="ti ti-car"></i></span><b>${T('รถของคุณ','Your car')}</b>${p.t?`<small>${ageTxt(Date.now()-p.t)}</small>`:''}</button>
      ${st.carOpen?`<div class="atl-carx">${p.note?`<p>${esc(String(p.note).slice(0,120))}</p>`:''}<a href="${walk}" target="_blank" rel="noopener"><i class="ti ti-walk"></i>${T('เดินไปที่รถ','Walk to car')}</a></div>`:''}`;
    el.querySelector('.atl-car').onclick=e=>{e.stopPropagation();st.carOpen=!st.carOpen;paintCar()};
    st.car.setLngLat([+p.lng,+p.lat]);
  }
  function paintOverlays(){
    if(!st.ready)return;
    const h=A.here(),sel=st.sel&&st.all.find(t=>t.id===st.sel),calm=st.urg||!!st.match,to=sel||(st.match&&matchList()[0]);
    setData('atl-rings',FC(LAY.rings&&h&&!st.urg?[poly(h,1),poly(h,3)]:[]));
    st.labs.forEach(m=>m.remove());st.labs=[];
    if(LAY.rings&&h&&!st.urg)[1,3].forEach(k=>{const el=D.createElement('span');el.className='atl-rlab';el.textContent=A.distTxt(k);
      st.labs.push(new ml.Marker({element:el,anchor:'center'}).setLngLat([h.lng,h.lat+k/KM_LAT]).addTo(map))});
    setData('atl-cover',FC(LAY.cover&&!calm?st.list.filter(t=>t.mobile&&t.radius>0).map(t=>poly(t,Math.min(t.radius,60))):[]));
    setData('atl-pts',FC(LAY.heat&&!calm?st.all.map(t=>({type:'Feature',properties:{},geometry:{type:'Point',coordinates:[t.lng,t.lat]}})):[]));
    map.setLayoutProperty('atl-heat','visibility',LAY.heat&&!calm?'visible':'none');
    setData('atl-sel',FC(sel&&sel.mobile&&sel.radius>0&&!st.urg?[poly(sel,Math.min(sel.radius,60))]:[]));
    setData('atl-path',FC(to&&h&&!st.urg?[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:[[h.lng,h.lat],[to.lng,to.lat]]}}]:[]));
    const u=st.urg&&urgentList();
    setData('atl-reach',FC(u&&h&&u.reach?[poly(h,u.reach)]:[]));
    const ink=P().ink;try{map.setPaintProperty('atl-rings-l','line-color',ink);map.setPaintProperty('atl-path','line-color',ink)}catch(e){}
  }

  /* ── โหมดด่วน: กติกาเดียวกับปุ่มเรียกช่างด่วน (3 ร้านมาหาถึงที่ ไม่นับร้านงานเต็ม/ไม่รับงาน · ร้านที่รับงานอยู่ตอนนี้ก่อน แล้วใกล้สุด) ── */
  function urgentList(){
    const h=A.here(),TS=A.techs().filter(t=>!A.isMine(t)&&!t.full&&!t.vacation&&t.lat!=null);
    let l=TS.filter(t=>t.mobile&&t.urgent);if(!l.length)l=TS.filter(t=>t.mobile);
    l=l.map(t=>({...t,st:status(t),dist:A.km(h,t)})).filter(t=>t.dist==null||t.dist<=Math.max(t.radius||30,30)).sort((a,b)=>(!!b.online-!!a.online)||(a.dist??1e9)-(b.dist??1e9));
    const pick=l.slice(0,3),far=Math.max(0,...pick.map(t=>t.dist||0));
    return {all:l,pick,reach:h&&far?Math.max(1,far*1.12):0};
  }

  /* ── ตัวกรอง ── */
  function chips(){
    const fl=[['open',`<span class="atl-gd"></span>`,T('เปิดอยู่ตอนนี้','Open now')],['urgent','<i class="ti ti-flame"></i>',T('รับงานด่วน','Urgent jobs')],
      ['mobile','<i class="ti ti-truck"></i>',T('มาหาถึงที่','Comes to you')],['roam','<i class="ti ti-navigation"></i>',T('ตำแหน่งสด','Live location')],['verified','<i class="ti ti-rosette-discount-check-filled"></i>',T('ทีมงานตรวจแล้ว','Checked by staff')],
      ['top','<i class="ti ti-star-filled"></i>',T('4.5 ขึ้นไป','4.5+')]];
    const cats=Object.values(A.cats).filter(c=>c.c&&c.id!=='mobile'&&c.id!=='urgent');
    $('.atl-chips').innerHTML=fl.map(([k,ic,l])=>`<button type="button" class="atl-chip f-${k}" data-f="${k}" aria-pressed="${!!MF[k]}">${ic}<span>${l}</span></button>`).join('')
      +cats.map(c=>`<button type="button" class="atl-chip" data-c="${c.id}" aria-pressed="${MF.cat===c.id}"><i class="ti ${c.ic}" style="color:${c.c}"></i><span>${T(c.th)}</span></button>`).join('');
    $('.atl-chips').setAttribute('aria-label',T('ตัวกรองร้าน','Shop filters'));
  }

  /* ── แผ่นล่าง / แผงซ้าย ── */
  const row=(t,i)=>{const s=t.st,d=t.dist;
    return `<button type="button" class="atl-row${t.id===st.sel?' on':''}" data-id="${esc(t.id)}" style="animation-delay:${Math.min(i*30,180)}ms">${avHTML(t,'atl-rav')}
      <span class="atl-rb"><span class="atl-rn"><b>${esc(t.shop||t.name)}</b>${t.verified?`<i class="ti ti-rosette-discount-check-filled" title="${T('ทีมงานตรวจแล้ว','Checked by staff')}"></i>`:''}${A.isMine(t)?`<em>${T('ร้านของคุณ','Your shop')}</em>`:''}</span>
      <span class="atl-rm">${t.reviewCount?`<i class="ti ti-star-filled"></i>${Number(t.rating).toFixed(1)} (${t.reviewCount})`:T('ร้านใหม่','New shop')}${d!=null?` · ${A.distTxt(d)}`:''}${t.proven?` · ${T(`หลักฐาน ${t.proven} งาน`,`${t.proven} proven jobs`)}`:''}</span>
      <span class="atl-rs">${s?`<span class="${s.on?'on':''}">${esc(s.txt)}</span>`:''}${moving(t)?`<span class="atl-tag live"><i class="ti ti-navigation"></i>${T('ช่างเคลื่อนที่','Mobile mechanic')} · ${liveAgo(t.live.at)}</span>`:t.mobile?`<span class="atl-tag">${T('มาหาถึงที่','Comes to you')}</span>`:''}</span></span>
      <span class="atl-rp">${t.from?`<small>${T('เริ่ม','From')}</small><b>฿${A.money(t.from)}</b>`:''}</span></button>`};
  function listHTML(){
    const v=st.view,h=A.here(),openN=v.filter(t=>t.st&&t.st.on).length,urgN=v.filter(t=>t.urgent&&(!t.st||t.st.on)).length,mobN=v.filter(t=>t.mobile).length;
    const title=MF.area?T('ร้านในบริเวณนี้','Shops in this area'):filtered()?T('ร้านที่ตรงกับตัวกรอง','Matching shops'):h?T('ช่างใกล้คุณ','Mechanics near you'):T('ช่างบนแผนที่','Mechanics on the map');
    const head=`<div class="atl-hd"><h2>${title}</h2><span>${A.loaded()?T(`${v.length} ร้าน`,`${v.length} shops`):''}</span></div>`;
    if(!A.loaded())return head+'<div class="atl-skel"></div><div class="atl-skel"></div>';
    const stats=`<div class="atl-stats"><span><span class="atl-gd"></span>${T(`เปิดอยู่ ${openN}`,`Open ${openN}`)}</span><span><i class="ti ti-flame"></i>${T(`ด่วน ${urgN}`,`Urgent ${urgN}`)}</span><span><i class="ti ti-truck"></i>${T(`มาหาถึงที่ ${mobN}`,`Mobile ${mobN}`)}</span></div>`;
    const sort=`<div class="atl-seg" role="group" aria-label="${T('เรียงร้าน','Sort shops')}">${[['near',T('ใกล้สุด','Nearest')],['rating',T('คะแนนสูง','Top rated')],['price',T('ราคาเริ่มต่ำ','Lowest price')]].map(([k,l])=>`<button type="button" data-s="${k}" aria-pressed="${MF.sort===k}">${l}</button>`).join('')}</div>`;
    const noHere=!h?`<button type="button" class="atl-hint" data-a="locate"><i class="ti ti-current-location"></i>${T('แตะเพื่อเรียงร้านตามระยะจากคุณ','Tap to sort shops by distance from you')}</button>`:'';
    if(!v.length)return head+emptyHTML();
    return head+stats+noHere+sort+`<div class="atl-rows">${v.slice(0,80).map(row).join('')}</div>`+(v.length>80?`<p class="atl-more">${T('ซูมเข้าเพื่อดูร้านที่เหลือ','Zoom in to see more shops')}</p>`:'');
  }
  function emptyHTML(){
    const q=MF.q.trim();
    return `<div class="atl-empty"><span class="atl-ei"><i class="ti ti-map-pin-off"></i></span>
      <b>${MF.area?T('ยังไม่มีร้านในบริเวณนี้','No shops in this area yet'):filtered()?T('ไม่มีร้านที่ตรงกับตัวกรอง','No shops match these filters'):T('ยังไม่มีช่างในพื้นที่','No mechanics here yet')}</b>
      <p>${T('ลองล้างตัวกรอง ขยายพื้นที่ หรือประกาศให้ช่างแถวนี้ติดต่อกลับ','Clear filters, widen the area, or post a job so nearby mechanics can reach you')}</p>
      <button type="button" class="atl-btn p" data-a="post"><i class="ti ti-speakerphone"></i>${T('ประกาศหาช่างในพื้นที่นี้','Post a job in this area')}</button>
      <div class="atl-two">${filtered()||MF.area?`<button type="button" class="atl-btn" data-a="clear"><i class="ti ti-refresh"></i>${T('ล้างตัวกรอง','Clear filters')}</button>`:''}
      ${q?`<button type="button" class="atl-btn" data-a="ai"><i class="ti ti-sparkles"></i>${T('ให้ AI ดูอาการก่อน','Ask AI first')}</button>`:''}</div></div>`;
  }
  function cardHTML(t){
    const s=t.st||status(t),h=A.here(),d=A.km(h,t),facts=(A.vetFacts(t)||[]).map(f=>f[1]),mine=A.isMine(t),inside=t.mobile&&t.radius&&d!=null&&d<=t.radius;
    return `<div class="atl-card"><div class="atl-ch">${avHTML(t,'atl-cav')}
      <div class="atl-ct"><h2><span>${esc(t.shop||t.name)}</span>${t.verified?`<i class="ti ti-rosette-discount-check-filled" title="${T('ทีมงานตรวจแล้ว','Checked by staff')}"></i>`:''}</h2>
      <span class="atl-cr">${t.reviewCount?`<i class="ti ti-star-filled"></i>${Number(t.rating).toFixed(1)} · ${T(`${t.reviewCount} รีวิว`,`${t.reviewCount} reviews`)}`:T('ร้านใหม่ ยังไม่มีรีวิว','New shop, no reviews yet')}</span>
      ${s?`<span class="atl-cs${s.on?' on':''}">${esc(s.txt)}</span>`:''}</div>
      <button type="button" class="atl-x" data-a="close" aria-label="${T('ปิดการ์ดร้าน','Close shop card')}"><i class="ti ti-x"></i></button></div>
      ${t.roam?`<p class="atl-roamln${moving(t)?' on':''}"><i class="ti ti-navigation"></i><span>${moving(t)?T('ช่างเคลื่อนที่ · ตำแหน่งตามมือถือช่าง (โดยประมาณ)','Mobile mechanic · location follows their phone (approximate)')+' · '+liveAgo(t.live.at):T('ช่างเคลื่อนที่ · ตอนนี้ไม่ได้แชร์ตำแหน่ง แสดงจุดตั้งต้น','Mobile mechanic · not sharing location now, showing their base')}</span></p>`:''}
      ${facts.length?`<div class="atl-vet"><i class="ti ti-shield-check"></i><span>${T('ทีมงานตรวจแล้ว','Checked by staff')}: ${facts.map(esc).join(' · ')}</span></div>`:''}
      <div class="atl-grid">
        <div><small>${T('ระยะทาง','Distance')}</small><b>${d!=null?A.distTxt(d):'—'}</b><small>${d!=null?(moving(t)?T(`มาถึงคุณราว ${etaMin(d)} นาที`,`Could reach you in about ${etaMin(d)} min`):inside?T('คุณอยู่ในวงบริการ','You are in range'):T(`ขับรถราว ${etaMin(d)} นาที`,`About ${etaMin(d)} min drive`)):T('ยังไม่รู้ตำแหน่งคุณ','Location unknown')}</small></div>
        <div><small>${T('ราคาเริ่ม','From')}</small><b>${t.from?'฿'+A.money(t.from):'—'}</b><small>${esc((t.skills||[])[0]||'')}</small></div>
        <div><small>${T('ซ่อมจบมีหลักฐาน','Proven jobs')}</small><b>${t.proven?T(`${t.proven} งาน`,`${t.proven}`):'—'}</b><small>${t.mobile?T(`มาหาถึงที่ ${t.radius||0} กม.`,`Mobile ${t.radius||0} km`):T('ที่ร้าน','At the shop')}</small></div>
      </div>
      ${t.full?`<p class="atl-note"><i class="ti ti-clock"></i>${T('งานเต็มชั่วคราว ยังขอราคาใหม่ไม่ได้','Fully booked for now')}</p>`:''}
      <div class="atl-acts">${mine?`<button type="button" class="atl-btn p w" data-a="store">${T('ดูหน้าร้านของคุณ','View your shop')}</button>`
        :`<button type="button" class="atl-btn p w" data-a="book"${t.vacation||t.full?' disabled':''}>${T('ขอราคา','Get a quote')}</button>
        <button type="button" class="atl-ib" data-a="msg" aria-label="${T('แชตกับร้าน','Message the shop')}"><i class="ti ti-message-circle"></i></button>
        ${moving(t)?'':`<a class="atl-ib" href="https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}" target="_blank" rel="noopener" aria-label="${T('นำทางไปร้าน','Directions to the shop')}"><i class="ti ti-navigation"></i></a>`}
        <button type="button" class="atl-ib" data-a="store" aria-label="${T('ดูหน้าร้าน','View shop')}"><i class="ti ti-building-store"></i></button>`}</div></div>`;
  }
  function urgentHTML(){
    const u=urgentList(),h=A.here(),n=u.all.length;
    const c=u.pick.reduce((a,t)=>t.dist!=null&&(a==null||t.dist<a)?t.dist:a,null),near=c!=null?T(`ใกล้สุด ${A.distTxt(c)}`,`Closest ${A.distTxt(c)}`):'';
    return `<div class="atl-urg"><div class="atl-hd"><h2>${n?T(`ช่างรับงานด่วนใกล้คุณ ${n} ร้าน`,`Urgent mechanics near you: ${n}`):T('ยังไม่มีช่างรับงานด่วนใกล้คุณ','No urgent mechanics near you yet')}</h2><span>${near}</span></div>
      ${u.pick.length?`<div class="atl-ustack">${u.pick.map(t=>avHTML(t,'atl-uav')).join('')}<span>${T(`คำขอจะส่งถึง ${u.pick.length} ร้าน — ร้านที่รับงานอยู่ตอนนี้ก่อน แล้วใกล้สุด`,`Your request goes to ${u.pick.length} shops — those taking jobs now first, then the closest`)}</span></div>`:''}
      ${!h?`<button type="button" class="atl-btn w" data-a="locate"><i class="ti ti-current-location"></i>${T('ใช้ตำแหน่งของฉัน','Use my location')}</button>`:''}
      <button type="button" class="atl-btn red w" data-a="sos"><i class="ti ti-flame"></i>${T('เรียกช่างด่วนตอนนี้','Call an urgent mechanic now')}</button>
      <p class="atl-priv"><i class="ti ti-lock"></i>${T('ช่างเห็นแค่ย่านคร่าว ๆ ของคุณ พิกัดจริงเปิดให้เฉพาะช่างที่คุณเลือก','Mechanics only see your general area until you choose one')}</p></div>`;
  }
  const MODES=()=>[['best',T('แนะนำ','Best match')],['near',T('ใกล้สุด','Nearest')],['quality',T('คุณภาพดีสุด','Best quality')],['stars',T('ดาวเยอะสุด','Most stars')]];
  function matchHTML(){
    const h=A.here(),L=matchList(),k=st.match;
    const how={best:T('ชั่งระยะทาง งานที่ซ่อมจบพร้อมหลักฐาน และดาวรีวิวรวมกัน ร้านที่รับงานอยู่ตอนนี้ได้คะแนนเพิ่ม','Weighs distance, proven jobs and review stars together; shops taking jobs now get a boost'),
      near:T('ใกล้คุณที่สุดก่อน ช่างเคลื่อนที่วัดจากตำแหน่งมือถือตอนนี้','Closest first; mobile mechanics are measured from their phone right now'),
      quality:T('งานที่ซ่อมจบพร้อมหลักฐานมากสุดก่อน แล้วดูการตรวจของทีมงานและระยะรับประกัน','Most proven finished jobs first, then staff checks and warranty'),
      stars:T('ดาวเฉลี่ยถ่วงจำนวนรีวิว ร้านที่รีวิวน้อยไม่ชนะร้านรีวิวเยอะเพราะฟลุก','Average stars weighted by review count, so a few lucky reviews never win')}[k];
    const pick=t=>`<div class="atl-pick${t.id===st.sel?' on':''}">
      <button type="button" class="atl-pm" data-id="${esc(t.id)}"><span class="atl-pav">${avHTML(t,'atl-rav')}<span class="atl-rk">${t.rank}</span></span>
        <span class="atl-pb"><b>${esc(t.shop||t.name)}</b><small>${t.from?`${T('เริ่ม','From')} ฿${A.money(t.from)}`:T('ถามราคา','Ask for price')}</small></span></button>
      <button type="button" class="atl-btn p sm" data-a="pbook" data-t="${esc(t.id)}">${T('ขอราคา','Get a quote')}</button>
      <span class="atl-why">${why(t).map(([,ic,x])=>`<span><i class="ti ${ic}"></i>${x}</span>`).join('')}</span></div>`;
    return `<div class="atl-mm"><div class="atl-hd"><h2>${T('จับคู่ช่างให้คุณ','Your best matches')}</h2><button type="button" class="atl-x" data-a="unmatch" aria-label="${T('ปิดการจับคู่','Close matching')}"><i class="ti ti-x"></i></button></div>
      <div class="atl-seg" role="group" aria-label="${T('จับคู่แบบ','Match by')}">${MODES().map(([m,l])=>`<button type="button" data-mm="${m}" aria-pressed="${k===m}">${l}</button>`).join('')}</div>
      <p class="atl-how"><i class="ti ti-info-circle"></i><span>${how}</span></p>
      ${!h&&(k==='near'||k==='best')?`<button type="button" class="atl-btn w" data-a="locate"><i class="ti ti-current-location"></i>${T('ใช้ตำแหน่งของฉันเพื่อหาร้านใกล้สุด','Use my location to find the closest')}</button>`:''}
      ${L.length?`<div class="atl-picks">${L.map(pick).join('')}</div>`
        :`<div class="atl-empty sm"><b>${k==='stars'?T('ยังไม่มีร้านที่มีรีวิวในบริเวณนี้','No reviewed shops around here yet'):T('ยังไม่มีร้านที่จับคู่ได้','No shops to match yet')}</b><p>${T('ลองล้างตัวกรอง หรือเลือกหมวดอื่น','Try clearing filters or another category')}</p></div>`}</div>`;
  }
  /* จัดกล้องให้เห็นคุณกับ 3 ร้านที่จับคู่ได้พร้อมกัน */
  function fitMatch(){
    const L=matchList(),h=A.here(),b=new ml.LngLatBounds();if(!L.length)return;
    L.forEach(t=>b.extend([t.lng,t.lat]));if(h)b.extend([h.lng,h.lat]);
    requestAnimationFrame(()=>map.fitBounds(b,{padding:pad(56),maxZoom:15,duration:RM?0:700}));
  }
  function renderSheet(){
    const t=st.sel&&st.all.find(x=>x.id===st.sel);
    if(st.sel&&!t)st.sel=null;
    const desk=isDesk();
    sb.innerHTML=`<div class="atl-in">${st.urg?urgentHTML():(t&&!desk)?cardHTML({...t,st:status(t)}):st.match?matchHTML():listHTML()}</div>`;
    R.dataset.mode=st.urg?'urg':(t&&!desk)?'card':st.match?'match':A.loaded()&&!st.view.length?'empty':'list';
    placePop();sizeSheet();
  }

  /* ── ความสูงแผ่นล่าง (มือถือ): ย่อ · ครึ่งจอ · เต็มจอ · การ์ดร้าน ── */
  const H=()=>R.clientHeight||innerHeight;
  function heightOf(s){
    const h=H();
    /* การ์ด/โหมดด่วน/ไม่มีร้าน = สูงเท่าเนื้อหา (ขีดลาก 22 + ขอบล่าง) */
    if(['card','urg','empty','match'].includes(R.dataset.mode)){const c=sb.firstElementChild;return Math.min(h*.78,(c?c.offsetHeight:300)+22+parseFloat(getComputedStyle(sb).paddingBottom||16))}
    return s==='full'?h-96:s==='half'?Math.round(h*.52):Math.min(232,Math.round(h*.34));
  }
  function sizeSheet(px){
    if(isDesk()){sheetEl.style.transform='';sheetEl.style.height='';R.style.setProperty('--sv','0px');return}
    const v=px??heightOf(st.sheet),full=H()-96;
    sheetEl.style.height=full+'px';sheetEl.style.transform=`translateY(${full-v}px)`;
    R.style.setProperty('--sv',v+'px');R.dataset.sheet=st.sheet;
  }
  /* ลากแผ่นล่าง แล้วปล่อยให้ดีดไปขั้นที่ใกล้สุด */
  (()=>{let y0=0,v0=0,id=null,moved=false;
    const start=e=>{if(isDesk())return;if(e.target.closest('button,a,input')&&!e.target.closest('.atl-grab'))return;
      id=e.pointerId;y0=e.clientY;v0=heightOf(st.sheet);moved=false;sheetEl.classList.add('drag')};
    sheetEl.addEventListener('pointerdown',e=>{if(e.target.closest('.atl-grab')||e.target.closest('.atl-hd')||e.target.closest('.atl-ch'))start(e)});
    addEventListener('pointermove',e=>{if(e.pointerId!==id)return;const dy=y0-e.clientY;if(Math.abs(dy)>4)moved=true;sizeSheet(Math.max(90,Math.min(H()-96,v0+dy)))},{passive:true});
    const end=e=>{if(e.pointerId!==id)return;id=null;sheetEl.classList.remove('drag');
      const v=parseFloat(R.style.getPropertyValue('--sv'))||v0;
      if(!moved){if(e.target.closest&&e.target.closest('.atl-grab')){if(R.dataset.mode==='list')st.sheet=st.sheet==='peek'?'half':st.sheet==='half'?'full':'peek'}sizeSheet();return}
      if(R.dataset.mode==='card'&&v<v0-80){deselect();return}
      if(['urg','empty','match'].includes(R.dataset.mode)){sizeSheet();return}
      const opts=['peek','half','full'].map(s=>[s,Math.abs(heightOf(s)-v)]).sort((a,b)=>a[1]-b[1]);st.sheet=opts[0][0];sizeSheet()};
    addEventListener('pointerup',end);addEventListener('pointercancel',end);
  })();

  /* ── การ์ดลอยข้างหมุด (คอม) ── */
  let popRaf=0;
  function placePop(){
    const pop=$('.atl-pop'),t=st.sel&&!st.urg&&isDesk()&&st.all.find(x=>x.id===st.sel);
    if(!t){pop.hidden=true;return}
    if(pop.dataset.id!==t.id||pop.dataset.v!==String(st.ver)){pop.innerHTML=cardHTML({...t,st:status(t)});pop.dataset.id=t.id;pop.dataset.v=String(st.ver)}
    pop.hidden=false;
    cancelAnimationFrame(popRaf);popRaf=requestAnimationFrame(()=>{
      /* วางใต้หมุด (ป้ายชื่อร้านอยู่เหนือจุด) · ที่ข้างล่างไม่พอ → ขึ้นไปอยู่เหนือป้าย */
      const mp=$('.atl-map'),ox=mp.offsetLeft,mw=mp.clientWidth,p=map.project([t.lng,t.lat]),W=R.clientWidth,Hh=R.clientHeight,w=pop.offsetWidth,h=pop.offsetHeight;
      let x=ox+p.x-w/2,y=p.y+18;if(y+h>Hh-16)y=p.y-64-h;x=Math.max(ox+16,Math.min(W-w-16,x));y=Math.max(16,y);
      pop.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px)`;
      pop.classList.toggle('far',p.x<0||p.x>mw||p.y<0||p.y>Hh)});
  }

  /* ── เลือกร้าน ── */
  function select(id){
    const t=st.all.find(x=>x.id===id);if(!t)return;
    st.sel=id;st.ver=(st.ver||0)+1;st.carOpen=false;
    renderSheet();layout();paintOverlays();
    sb.scrollTop=0;
    map.easeTo({center:[t.lng,t.lat],zoom:Math.max(map.getZoom(),14),offset:off(),duration:RM?0:650});
  }
  function deselect(){if(!st.sel)return;st.sel=null;renderSheet();layout();paintOverlays()}

  /* ── จัดกล้องครั้งแรก: ร้านใกล้สุดไม่กี่ร้าน ไม่ใช่ทั้งประเทศ ── */
  function fitFirst(){
    if(st.fitDone||!A.loaded())return;st.fitDone=true;
    const h=A.here(),pts=st.list.map(t=>[t.lng,t.lat]);
    let fp=pts;
    if(h)fp=st.list.slice().sort((a,b)=>(a.dist??1e9)-(b.dist??1e9)).slice(0,8).map(t=>[t.lng,t.lat]).concat([[h.lng,h.lat]]);
    else if(pts.length>2){const md=i=>pts.map(p=>p[i]).sort((a,b)=>a-b)[pts.length>>1],c={lng:md(0),lat:md(1)};fp=pts.filter(p=>A.km(c,{lat:p[1],lng:p[0]})<=80)}
    if(fp.length>1){const b=new ml.LngLatBounds();fp.forEach(p=>b.extend(p));map.fitBounds(b,{padding:pad(60),maxZoom:14.5,duration:0})}
    else if(fp.length===1)map.jumpTo({center:fp[0],zoom:13.5,offset:off()});
    if(LAY.d3)map.easeTo({pitch:56,bearing:-16,duration:0});
  }
  /* จุดกึ่งกลางของส่วนแผนที่ที่มองเห็นจริง (ไม่โดนแผ่นล่าง/แผงซ้ายบัง) เทียบกับกลางจอ */
  const off=()=>isDesk()?[0,0]:[0,Math.round((130-Math.min(heightOf(st.sheet),H()*.6))/2)];
  /* คอม: แถบนำทางของแอป (.navwrap 76px) บังขอบบนของแผนที่ — เว้นที่ให้หมุดไม่ไปซ่อนใต้แถบ */
  const pad=n=>isDesk()?{top:n+80,bottom:n,left:n,right:n}:{top:n+120,bottom:n+Math.min(heightOf(st.sheet),H()*(R.dataset.mode==='match'?.62:.5)),left:n,right:n};

  /* ── ส่วนบนและปุ่มลอย ── */
  function chrome(){
    $('[data-a=back]').setAttribute('aria-label',T('ย้อนกลับ','Back'));
    input.placeholder=T('ค้นหาร้าน หรือบอกอาการรถ','Search shops or describe the problem');input.setAttribute('aria-label',input.placeholder);
    if(D.activeElement!==input)input.value=MF.q;
    $('[data-a=ai]').setAttribute('aria-label',T('ให้ AI ช่วยดูอาการ','Ask AI about the problem'));
    $('[data-a=layers]').setAttribute('aria-label',T('เลเยอร์แผนที่','Map layers'));
    $('[data-a=locate]').setAttribute('aria-label',T('ไปที่ตำแหน่งของฉัน','Go to my location'));
    const tilt=$('[data-a=tilt]');tilt.hidden=!A.want3d;tilt.textContent=map.getPitch()>10?'2D':'3D';
    tilt.setAttribute('aria-label',map.getPitch()>10?T('กลับเป็นมุมมอง 2 มิติ','Back to 2D'):T('มุมมอง 3 มิติ','3D view'));
    $('.atl-sos span').textContent=T('เรียกช่างด่วน','Urgent help');
    $('.atl-match span').textContent=T('จับคู่ช่าง','Match me');$('.atl-match').setAttribute('aria-label',T('จับคู่ช่างที่ใกล้ ดี และดาวเยอะ','Match the closest, best and top-rated mechanics'));
    const ub=$('.atl-ubar');ub.hidden=!st.urg;$('.atl-top').hidden=st.urg;$('.atl-chips').hidden=st.urg;$('.atl-fab').hidden=st.urg||!!st.match;
    ub.querySelector('b').textContent=T('โหมดด่วน','Urgent mode');ub.querySelector('span').textContent=T('แสดงเฉพาะช่างที่รับงานด่วน','Showing urgent mechanics only');
    ub.querySelector('button').setAttribute('aria-label',T('ออกจากโหมดด่วน','Leave urgent mode'));
    R.classList.toggle('urg',st.urg);
    const area=$('.atl-area');area.hidden=!st.userMoved||st.urg;
    area.innerHTML=`<i class="ti ti-refresh"></i>${T('ค้นหาในบริเวณนี้','Search this area')}`;
    const j=(A.jobs()||[]).find(x=>x.side!=='technician'&&x.status==='enroute'),live=$('.atl-live');
    live.hidden=!j||st.urg;
    if(j){live.dataset.id=j.id;live.innerHTML=`<span class="atl-pulse"></span><b>${T('ช่างกำลังมา','Mechanic on the way')}</b><span>${esc(j.techName||'')}</span><i class="ti ti-chevron-right"></i>`}
  }

  /* ── เลเยอร์ ── */
  function layersHTML(){
    const tg=(k,a,b)=>`<button type="button" class="atl-tg" data-l="${k}" role="switch" aria-checked="${!!LAY[k]}"><span><b>${a}</b><small>${b}</small></span><i></i></button>`;
    return `<div class="atl-lh"><h2>${T('เลเยอร์แผนที่','Map layers')}</h2><button type="button" class="atl-x" data-a="unlay" aria-label="${T('ปิด','Close')}"><i class="ti ti-x"></i></button></div>
      ${A.want3d?`<div class="atl-mt"><button type="button" data-m="2d" aria-pressed="${map.getPitch()<=10}"><span class="atl-mt2"><i class="ti ti-map-2"></i></span>${T('แผนที่ปกติ','Standard')}</button>
        <button type="button" data-m="3d" aria-pressed="${map.getPitch()>10}"><span class="atl-mt3"><i class="ti ti-box"></i></span>${T('3 มิติ มีตึก','3D buildings')}</button></div>`:''}
      ${tg('rings',T('วงระยะทางจากคุณ','Distance rings'),`${A.distTxt(1)} · ${A.distTxt(3)}`)}
      ${tg('cover',T('พื้นที่ที่ช่างมาหาถึงที่','Where mechanics come to you'),T('รวมรัศมีที่แต่ละร้านตั้งไว้','Each shop\'s own service radius'))}
      ${tg('heat',T('ความหนาแน่นของร้าน','Shop density'),T('ย่านไหนมีช่างเยอะ','Where mechanics cluster'))}
      ${tg('car',T('รถของฉัน','My car'),T('จุดจอดที่บันทึกไว้ เก็บในเครื่องนี้เท่านั้น','Saved parking spot, kept on this device only'))}
      ${tg('closed',T('แสดงร้านที่ปิดอยู่','Show closed shops'),T('หมุดสีจางพร้อมเวลาเปิด','Faded pins with opening times'))}`;
  }
  function openLayers(on){st.layers=on;const el=$('.atl-lay');el.hidden=!on;R.classList.toggle('lay',on);if(on)el.innerHTML=layersHTML()}

  /* ── วาดใหม่ทั้งหมด (index.html เรียกเมื่อรายชื่อร้าน/ตำแหน่ง/งานเปลี่ยน) ── */
  function refresh(){
    compute();chips();chrome();renderSheet();layout();paintMe();paintCar();paintOverlays();fitFirst();
    if(st.layers)$('.atl-lay').innerHTML=layersHTML();
  }

  /* ── ปุ่มต่าง ๆ ── */
  const fly=(h,z)=>map.flyTo({center:[h.lng,h.lat],zoom:z||Math.max(map.getZoom(),13.5),offset:off(),duration:RM?0:900});
  R.addEventListener('click',async e=>{
    const b=e.target.closest('[data-a],[data-f],[data-c],[data-s],[data-id],[data-l],[data-m],[data-mm]');if(!b||!R.contains(b))return;
    const a=b.dataset.a,cur=st.sel&&st.all.find(t=>t.id===st.sel);
    if(b.dataset.f){MF[b.dataset.f]=!MF[b.dataset.f];MF.area=null;st.sel=null;refresh();if(st.match)fitMatch();return}
    if(b.dataset.c){MF.cat=MF.cat===b.dataset.c?'':b.dataset.c;MF.area=null;st.sel=null;refresh();if(st.match)fitMatch();return}
    if(b.dataset.mm){st.match=b.dataset.mm;st.sel=null;refresh();fitMatch();return}
    if(b.dataset.s){MF.sort=b.dataset.s;refresh();return}
    if(b.dataset.l){LAY[b.dataset.l]=!LAY[b.dataset.l];LS.set('spire_mapLayers',LAY);refresh();return}
    if(b.dataset.m){const on=b.dataset.m==='3d';LAY.d3=on;LS.set('spire_mapLayers',LAY);map.easeTo(on?{pitch:56,bearing:-16,zoom:Math.max(map.getZoom(),15)}:{pitch:0,bearing:0,duration:RM?0:600});setTimeout(()=>{chrome();if(st.layers)$('.atl-lay').innerHTML=layersHTML()},650);return}
    if(b.dataset.id&&!a){select(b.dataset.id);return}
    switch(a){
      case 'back':A.back();break;
      case 'ai':{const q=input.value.trim()||MF.q.trim();if(q)A.ai(q);else input.focus();break}
      case 'layers':openLayers(!st.layers);break;
      case 'unlay':openLayers(false);break;
      case 'locate':{b.classList.add('busy');const h=await A.locate();b.classList.remove('busy');if(h){MF.area=null;st.userMoved=false;refresh();if(st.match)fitMatch();else fly(h,14)}break}
      case 'tilt':{const on=map.getPitch()<=10;LAY.d3=on;LS.set('spire_mapLayers',LAY);map.easeTo(on?{pitch:56,bearing:-16,zoom:Math.max(map.getZoom(),15),duration:RM?0:800}:{pitch:0,bearing:0,duration:RM?0:600});break}
      case 'area':{const bb=map.getBounds();MF.area={s:bb.getSouth(),n:bb.getNorth(),w:bb.getWest(),e:bb.getEast()};st.userMoved=false;st.sel=null;st.sheet=st.sheet==='peek'?'half':st.sheet;refresh();break}
      case 'clear':MF.open=MF.urgent=MF.mobile=MF.roam=MF.verified=MF.top=false;MF.cat='';MF.q='';MF.area=null;input.value='';refresh();break;
      case 'post':A.post();break;
      case 'live':A.openJob(b.dataset.id);break;
      case 'urgent':st.urg=true;st.match=null;st.sel=null;openLayers(false);refresh();{const h=A.here(),u=urgentList();
        if(h&&u.reach){const bb=new ml.LngLatBounds();ring(h,u.reach,24).forEach(p=>bb.extend(p));map.fitBounds(bb,{padding:pad(30),duration:RM?0:700})}}break;
      case 'unurg':st.urg=false;refresh();break;
      case 'match':st.match=st.match||'best';st.urg=false;st.sel=null;MF.area=null;openLayers(false);refresh();fitMatch();break;
      case 'unmatch':st.match=null;st.sel=null;refresh();break;
      case 'pbook':{const t=st.all.find(x=>x.id===b.dataset.t);t&&A.book(t);break}
      case 'sos':A.urgent();break;
      case 'close':deselect();break;
      case 'book':cur&&A.book(cur);break;
      case 'msg':cur&&A.message(cur);break;
      case 'store':cur&&A.openTech(cur.id);break;
    }
  });
  let qT=0;
  input.addEventListener('input',()=>{clearTimeout(qT);qT=setTimeout(()=>{MF.q=input.value;MF.area=null;st.sel=null;refresh()},220)});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur()}});
  addEventListener('keydown',e=>{if(e.key!=='Escape'||R.closest('[hidden]'))return;if(st.layers)openLayers(false);else if(st.sel)deselect();else if(st.urg){st.urg=false;refresh()}else if(st.match){st.match=null;refresh()}});
  $('.atl-dim').addEventListener('click',()=>{if(st.layers)openLayers(false)});
  map.on('click',()=>{if(st.carOpen){st.carOpen=false;paintCar()}else if(st.sel&&isDesk())deselect()});
  map.on('moveend',()=>layout());
  map.on('move',()=>{if(st.sel&&isDesk())placePop()});
  /* ผู้ใช้เลื่อน/ซูมเอง (ไม่ใช่ flyTo ของเรา) → เสนอปุ่มค้นหาในบริเวณนี้ */
  map.on('dragend',()=>{st.userMoved=true;chrome()});
  map.on('zoomend',e=>{if(e.originalEvent){st.userMoved=true;chrome()}});
  map.on('pitchend',()=>chrome());
  matchMedia('(min-width:1024px)').addEventListener('change',()=>{renderSheet();setTimeout(()=>map.resize(),60)});
  addEventListener('resize',()=>{if(R.offsetParent)sizeSheet()});
  /* เปลี่ยนธีม → เปลี่ยนสีแผนที่ (เลเยอร์ของเราใส่กลับเองตอน style.load) */
  new MutationObserver(async()=>{const dark=D.documentElement.getAttribute('data-theme')==='dark';if(dark===st.dark)return;st.dark=dark;
    try{map.setStyle(await styleFor(dark),{diff:false})}catch(e){}}).observe(D.documentElement,{attributes:true,attributeFilter:['data-theme']});

  refresh();
  return {
    refresh,
    show(){requestAnimationFrame(()=>{map.resize();sizeSheet();layout()})},
    focus(id){select(id)},
    match(m){st.match=MATCH[m]?m:'best';st.urg=false;st.sel=null;refresh();fitMatch()},
    map
  };
}
