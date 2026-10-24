/* Reference comparison is advisory, never manufacturer certification or a Garage write.
   Only make/model/year/market are sent to the sourced specification pipeline. */
((W)=>{
  'use strict';
  const norm=s=>String(s||'').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
  const value=x=>x&&typeof x==='object'?x.ok===false?null:x.v:x;
  const fuels={'เบนซิน':'petrol','ดีเซล':'diesel','ไฮบริด':'hybrid','ปลั๊กอินไฮบริด':'phev','ไฟฟ้า':'ev','แก๊ส':'lpg'};
  const gear=s=>/cvt/i.test(s)?'CVT':/dct|dual.clutch|double.clutch|ssg/i.test(s)?'DCT':/manual|ธรรมดา|\bmt\b/i.test(s)?'MT':/auto|อัตโนมัติ|\bat\b/i.test(s)?'AT':null;
  function compare(info,s){
    if(!['ready','verified'].includes(s?.status)||!s.sources?.length||!s.data?.variants?.length)return {status:'unconfirmed',warnings:[],checked:[]};
    const all=s.data.variants,exact=info.trim?all.filter(v=>norm(v.name)===norm(info.trim)):[];
    const variants=exact.length===1?exact:all,warnings=[],checked=[];
    if(info.trim&&!exact.length)warnings.push({field:'trim',values:all.map(v=>v.name).filter(Boolean).slice(0,8)});
    for(const field of ['drive','fuel','gear','engine']){
      if(!info[field])continue;
      const refs=[...new Set(variants.map(v=>field==='fuel'?v.fuel:field==='gear'?gear(value(v.gearbox)||''):value(v[field])).filter(Boolean))];
      if(!refs.length)continue;
      const given=field==='fuel'?fuels[info[field]]||info[field]:field==='gear'?gear(info[field]):info[field];
      const matched=refs.some(r=>norm(r)===norm(given)||(field==='engine'&&norm(r).includes(norm(given))));
      (matched?checked:warnings).push(matched?field:{field,values:refs});
    }
    return {status:'reference_only',warnings,checked,sources:s.sources.filter(x=>{try{return new URL(x.url).protocol==='https:'}catch{return false}}).slice(0,5)};
  }
  async function check(car,info){
    W.CendonGarageRules.infoPatch(info);
    if(!W.CarSpec)throw Error('Specification lookup is not ready');
    const s=await W.CarSpec.ensure({make:car.make,model:car.model,year:car.year,info:{model_year:info.model_year,market:info.market}});
    return compare(info,s);
  }
  W.CendonCarInfoReview=Object.freeze({check,compare});
})(window);
