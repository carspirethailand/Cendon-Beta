/* ═══ แผนที่หัวหน้าเรียกช่าง ═══
   แผนที่เวกเตอร์เอียงแบบ 3 มิติ ชุดสีเดียวกับหน้า /map (MapLibre + OpenFreeMap ไม่ใช้คีย์ ไม่ตั้งคุกกี้)
   ไว้ดูภาพรวมเท่านั้น — แตะ/ลากไม่ได้ · หมุดจริงยังปักในขั้น "ที่ไหน" ด้วยแผนที่เดิม (ตรวจบนบก/รัศมีครบ)
   แสดง: ตำแหน่งคุณ · ร้านรอบตัว (ชื่อ+ระยะของร้านใกล้สุด) · วงรัศมี · โหมดด่วน = เส้นไปร้านที่จะส่งถึงจริง
   ข้อมูลทั้งหมดมาจาก index.html (ไฟล์นี้ไม่เรียก API) · เครื่องไม่มี WebGL / โหลดไม่ได้ → โยน error ให้หน้าใช้ภาพแทน
   live: resolve เมื่อแผนที่วาดถนน/อาคารจริงแล้วเท่านั้น (ไทล์โหลดไม่ขึ้น = ไม่ resolve หน้าจึงคงภาพแทนไว้ ไม่เห็นพื้นเทาเปล่า) */
import {supported,loadLib,styleFor} from '/map-atlas.js?v=4';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ring(c,km,n=96){
  const pts=[],R=6371,la=c.lat*Math.PI/180;
  for(let i=0;i<=n;i++){const t=i/n*2*Math.PI;pts.push([c.lng+km/R*Math.cos(t)*180/Math.PI/Math.cos(la),c.lat+km/R*Math.sin(t)*180/Math.PI])}
  return {type:'Feature',geometry:{type:'Polygon',coordinates:[pts]},properties:{}};
}
const lines=(c,to)=>({type:'FeatureCollection',features:(to||[]).map(t=>({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:[[c.lng,c.lat],[t.lng,t.lat]]}}))});

export async function hero(el,o){
  if(!supported())throw Error('webgl');
  const ml=await loadLib(),dark=document.documentElement.dataset.theme==='dark',style=await styleFor(dark);
  if(!el.isConnected)throw Error('gone');
  let st={center:o.center,radius:o.radius||10,shops:o.shops||[],to:o.to||[],acc:o.acc||'#E9682A'};
  const map=new ml.Map({container:el,style,center:[st.center.lng,st.center.lat],zoom:11,pitch:58,bearing:-26,maxPitch:70,
    interactive:false,attributionControl:false,fadeDuration:0,trackResize:true});
  map.addControl(new ml.AttributionControl({compact:true}),'bottom-right');
  /* เครดิตแผนที่เริ่มแบบย่อ (ปุ่ม i) ไม่ทับป้ายร้านใกล้คุณ — แตะเพื่ออ่านเต็มได้ */
  map.once('load',()=>el.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'));
  const meEl=document.createElement('div');meEl.className='cx-me';meEl.style.zIndex='3';meEl.innerHTML='<i class="ti ti-car"></i>';
  const me=new ml.Marker({element:meEl}).setLngLat([st.center.lng,st.center.lat]).addTo(map);
  let pins=[],ready=false,first=true;
  const draw=()=>{
    pins.forEach(m=>m.remove());pins=[];
    for(const s of st.shops){
      const d=document.createElement('div');d.className='cx-pin'+(s.hot?' hot':'');
      d.innerHTML=`<span><i class="ti ti-tool"></i></span>${s.label?`<em>${esc(s.label)}</em>`:''}`;
      pins.push(new ml.Marker({element:d,anchor:'left',offset:[-14,0]}).setLngLat([s.lng,s.lat]).addTo(map));
    }
    me.setLngLat([st.center.lng,st.center.lat]);meEl.style.setProperty('--cx-acc',st.acc);
    if(!ready)return;
    map.getSource('cxr').setData(ring(st.center,st.radius));map.getSource('cxl').setData(lines(st.center,st.to));
    for(const id of ['cxr-f','cxr-l','cxl'])map.setPaintProperty(id,id==='cxr-f'?'fill-color':'line-color',st.acc);
    /* กรอบภาพ: ตัวคุณ + ร้านที่จะส่งถึง (ไม่มี = ร้านใกล้สุด 4 ร้าน) พอดีจอ — ไม่ซูมออกทั้งวงรัศมีจนหมุดกองกัน
       อย่างน้อยรอบตัว 1.2 กม. · เผื่อแถบลอยด้านบนและแผ่นข้อมูลที่ทับขอบล่าง */
    const b=new ml.LngLatBounds();ring(st.center,Math.min(1.2,st.radius),24).geometry.coordinates[0].forEach(p=>b.extend(p));
    (st.to.length?st.to:st.shops.slice(0,4)).forEach(t=>b.extend([t.lng,t.lat]));
    const cam=map.cameraForBounds(b,{padding:{top:120,bottom:60,left:24,right:24},bearing:-12});
    if(!cam)return;
    const z=Math.min(16,Math.max(9,cam.zoom+.6));
    /* ครั้งแรกเลื่อนกล้องเข้าช้า ๆ (ภาพเปิดฉาก) · ครั้งต่อไปขยับนุ่ม ๆ ตามตำแหน่งใหม่ */
    map.easeTo({center:[st.center.lng,st.center.lat],zoom:z,bearing:-12,pitch:58,duration:first?2600:900,easing:t=>1-Math.pow(1-t,3)});first=false;
  };
  let onLive;const live=new Promise(z=>onLive=z);
  const seen=()=>{try{return map.queryRenderedFeatures().some(f=>!/^cx/.test(f.source))}catch(e){return false}};
  const look=()=>{if(seen()){map.off('idle',look);onLive()}};
  map.on('idle',look);
  map.on('load',()=>{
    map.addSource('cxr',{type:'geojson',data:ring(st.center,st.radius)});
    map.addSource('cxl',{type:'geojson',data:lines(st.center,st.to)});
    map.addLayer({id:'cxr-f',type:'fill',source:'cxr',paint:{'fill-color':st.acc,'fill-opacity':.07}});
    map.addLayer({id:'cxr-l',type:'line',source:'cxr',paint:{'line-color':st.acc,'line-width':1.6,'line-opacity':.75,'line-dasharray':[1,3]}});
    map.addLayer({id:'cxl',type:'line',source:'cxl',layout:{'line-cap':'round'},paint:{'line-color':st.acc,'line-width':2.4,'line-opacity':.9,'line-dasharray':[2,2.4]}});
    ready=true;draw();
  });
  draw();
  /* ป้ายตำแหน่งในฟอร์มเปลี่ยนบ่อย (หาที่อยู่ ล็อกหมุด) — ขยับกล้องเฉพาะตอนข้อมูลบนแผนที่เปลี่ยนจริง */
  let key='';
  const keyOf=s=>[s.center.lat.toFixed(4),s.center.lng.toFixed(4),s.radius,s.acc,s.shops.map(p=>p.lat.toFixed(4)+','+p.lng.toFixed(4)+(p.hot?'!':'')+(p.label||'')).join(';'),s.to.map(t=>t.lat+','+t.lng).join(';')].join('|');
  return {
    live,
    set(d){const n={...st,...d},k=keyOf(n);st=n;if(k===key)return;key=k;draw()},
    resize(){try{map.resize()}catch(e){}},
    destroy(){try{map.remove()}catch(e){}}
  };
}
