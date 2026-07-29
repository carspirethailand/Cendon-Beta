
(function(){try{var r=localStorage.getItem("spire_theme"),t=r?JSON.parse(r):"warm";document.documentElement.setAttribute("data-theme",t);}catch(e){}})();

;

"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const LS={get:(k,d)=>{try{return JSON.parse(localStorage.getItem("spire_"+k))??d}catch{return d}},set:(k,v)=>localStorage.setItem("spire_"+k,JSON.stringify(v)),del:k=>localStorage.removeItem("spire_"+k)};

/* ===== CONFIG ===== */
const BACKEND_URL = "https://spireonebackend.carspirethailand.workers.dev";
const fbConfig={apiKey:"AIzaSyDDtvz4d4FRG_KOq5EQHmlDijU-x1FDZlQ",authDomain:"sp1p-82396.firebaseapp.com",databaseURL:"https://sp1p-82396-default-rtdb.firebaseio.com",projectId:"sp1p-82396",storageBucket:"sp1p-82396.appspot.com",messagingSenderId:"924479207020",appId:"1:924479207020:web:ec64428a61403e1ad48a49"};
const ADMINS=["anapatmaliwong@gmail.com","carspirethailand@gmail.com"];
/* AI + secrets live on the backend only — nothing sensitive ships in this file */
let auth=null,useFb=false;
try{firebase.initializeApp(fbConfig);auth=firebase.auth();auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});useFb=true;}catch(e){console.warn("fb",e)}
let currentUser=LS.get("cachedUser",null),lang=LS.get("lang","th");
try{window.BACKEND_URL=BACKEND_URL;Object.defineProperty(window,"spireAuth",{configurable:true,get:function(){return auth}});}catch(e){}
let currentTheme = LS.get("theme", "warm");
let wireframeOpacity = LS.get("opacity", 0.15);

/* ===== VEHICLE CATALOG & SVGs ===== */
/* compact catalog: "Model|bodytype|startYear" — body ∈ sedan,suv,pickup,hatchback,coupe,van,mpv,ev */
function M(s){return s.split(",").map(x=>{const p=x.trim().split("|");return{name:p[0].trim(),type:(p[1]||"sedan").trim(),startYear:+(p[2]||1990)}})}
const CAR_DATABASE = {
 "Toyota":M("Corolla|sedan|1990, Corolla Altis|sedan|2001, Corolla Cross|suv|2020, Camry|sedan|1990, Vios|sedan|2003, Yaris|hatchback|2006, Yaris Ativ|sedan|2017, Yaris Cross|suv|2023, C-HR|suv|2018, Fortuner|suv|2005, Hilux|pickup|1990, Hilux Revo|pickup|2015, Hilux Champ|pickup|2023, Innova|mpv|2004, Innova Zenix|mpv|2023, Veloz|mpv|2022, Avanza|mpv|2004, Sienta|mpv|2016, Alphard|van|2008, Vellfire|van|2008, Majesty|van|2019, Commuter|van|2005, Granvia|van|2019, Supra|coupe|2019, GR86|coupe|2022, GR Yaris|hatchback|2020, Prius|hatchback|2009, bZ4X|ev|2022, Land Cruiser|suv|1998, Land Cruiser Prado|suv|2003, Rush|suv|2018, Raize|suv|2021, Crown|sedan|2003, Wish|mpv|2003, 86|coupe|2012"),
 "Honda":M("City|sedan|1996, City Hatchback|hatchback|2021, Civic|sedan|1990, Civic Type R|hatchback|2008, Accord|sedan|1990, Jazz|hatchback|2003, Fit|hatchback|2003, HR-V|suv|2015, CR-V|suv|1996, BR-V|suv|2016, WR-V|suv|2023, e:N1|ev|2023, Mobilio|mpv|2014, Freed|mpv|2008, Odyssey|van|2002, StepWGN|van|2009, Brio|hatchback|2011, Elysion|van|2004, Stream|mpv|2000"),
 "Isuzu":M("D-Max|pickup|2002, D-Max V-Cross|pickup|2012, D-Max Spark|pickup|2020, MU-X|suv|2014, MU-7|suv|2004"),
 "Mitsubishi":M("Mirage|hatchback|2012, Attrage|sedan|2013, Lancer|sedan|1992, Lancer EX|sedan|2008, Triton|pickup|2005, Pajero Sport|suv|2008, Outlander|suv|2003, Outlander PHEV|suv|2014, Xpander|mpv|2017, Xpander Cross|mpv|2019, Xforce|suv|2023, Space Wagon|mpv|2003"),
 "Nissan":M("Almera|sedan|2011, March|hatchback|2010, Note|hatchback|2005, Sylphy|sedan|2008, Teana|sedan|2004, Kicks|suv|2016, X-Trail|suv|2003, Terra|suv|2018, Navara|pickup|2014, Frontier|pickup|1998, Juke|suv|2010, Leaf|ev|2010, GT-R|coupe|2007, 370Z|coupe|2009, Z|coupe|2022, Serena|mpv|2010, Livina|mpv|2007"),
 "Mazda":M("Mazda 2|hatchback|2007, Mazda 2 Sedan|sedan|2015, Mazda 3|sedan|2004, Mazda 6|sedan|2002, CX-3|suv|2015, CX-30|suv|2019, CX-5|suv|2012, CX-8|suv|2018, CX-60|suv|2023, CX-9|suv|2016, BT-50|pickup|2006, MX-5|coupe|1998"),
 "Ford":M("Ranger|pickup|1998, Ranger Raptor|pickup|2018, Everest|suv|2003, Mustang|coupe|1990, Mustang Mach-E|ev|2021, Focus|hatchback|2004, Fiesta|hatchback|2008, EcoSport|suv|2013, Territory|suv|2023, Escape|suv|2001, Explorer|suv|2011"),
 "Suzuki":M("Swift|hatchback|2005, Celerio|hatchback|2014, Ciaz|sedan|2014, Ertiga|mpv|2012, XL7|suv|2020, Jimny|suv|1998, Carry|pickup|2005, Vitara|suv|2015, S-Presso|hatchback|2020, Fronx|suv|2023"),
 "MG":M("MG3|hatchback|2014, MG4 Electric|ev|2022, MG5|sedan|2013, MG ZS|suv|2017, MG HS|suv|2019, MG GT|sedan|2021, MG VS HEV|suv|2022, MG Extender|pickup|2019, MG Maxus 9|van|2022, MG Cyberster|coupe|2024, MG ES|ev|2019, MG EP|ev|2020"),
 "BYD":M("Atto 3|suv|2022, Dolphin|hatchback|2022, Seal|sedan|2022, Seal U|suv|2023, Sealion 6|suv|2023, Sealion 7|suv|2024, M6|mpv|2024, Han|sedan|2020, Tang|suv|2018, Song Plus|suv|2020"),
 "Tesla":M("Model 3|sedan|2017, Model Y|suv|2020, Model S|sedan|2012, Model X|suv|2015, Cybertruck|pickup|2023"),
 "BMW":M("1 Series|hatchback|2004, 2 Series|coupe|2014, 2 Series Gran Coupe|sedan|2020, 3 Series|sedan|1990, 4 Series|coupe|2014, 5 Series|sedan|1990, 7 Series|sedan|1994, 8 Series|coupe|2018, X1|suv|2009, X3|suv|2003, X4|suv|2014, X5|suv|1999, X6|suv|2008, X7|suv|2019, Z4|coupe|2002, i3|ev|2013, i4|ev|2021, i5|ev|2023, i7|ev|2022, iX|ev|2021, iX1|ev|2022, iX3|ev|2021, M3|sedan|1990, M4|coupe|2014"),
 "Mercedes-Benz":M("A-Class|hatchback|2013, A-Class Sedan|sedan|2018, C-Class|sedan|1993, E-Class|sedan|1995, S-Class|sedan|1991, CLA|sedan|2013, CLS|coupe|2004, GLA|suv|2014, GLB|suv|2019, GLC|suv|2015, GLE|suv|2015, GLS|suv|2016, G-Class|suv|2000, V-Class|van|2014, Vito|van|2014, EQA|ev|2021, EQB|ev|2021, EQE|ev|2022, EQS|ev|2021, EQE SUV|ev|2022, AMG GT|coupe|2015, SL|coupe|1990"),
 "Audi":M("A1|hatchback|2010, A3|sedan|1996, A4|sedan|1994, A5|coupe|2007, A6|sedan|1994, A7|coupe|2010, A8|sedan|1994, Q2|suv|2016, Q3|suv|2011, Q5|suv|2008, Q7|suv|2005, Q8|suv|2018, TT|coupe|1998, R8|coupe|2006, e-tron GT|ev|2021, Q4 e-tron|ev|2021, Q8 e-tron|ev|2019"),
 "Volkswagen":M("Polo|hatchback|2002, Golf|hatchback|1990, Golf GTI|hatchback|2004, Jetta|sedan|1992, Passat|sedan|1990, Tiguan|suv|2008, Touareg|suv|2003, T-Cross|suv|2019, T-Roc|suv|2017, ID.3|ev|2020, ID.4|ev|2021, ID.Buzz|van|2022, Caravelle|van|2003, Arteon|coupe|2017"),
 "Hyundai":M("i10|hatchback|2008, i20|hatchback|2009, i30|hatchback|2007, Accent|sedan|2010, Elantra|sedan|1992, Sonata|sedan|1990, Creta|suv|2015, Tucson|suv|2004, Santa Fe|suv|2001, Palisade|suv|2019, Venue|suv|2019, Staria|van|2021, H-1|van|2007, Ioniq 5|ev|2021, Ioniq 6|ev|2022, Kona|suv|2017, Kona Electric|ev|2018"),
 "Kia":M("Picanto|hatchback|2004, Rio|hatchback|2005, Cerato|sedan|2004, K3|sedan|2018, K5|sedan|2010, Soul|hatchback|2009, Seltos|suv|2019, Sportage|suv|1995, Sorento|suv|2002, Carnival|van|1999, Carens|mpv|2006, EV6|ev|2021, EV9|ev|2023, Niro|suv|2016, Stinger|coupe|2017"),
 "Volvo":M("S60|sedan|2001, S90|sedan|2016, V60|hatchback|2010, V90|hatchback|2016, XC40|suv|2018, XC60|suv|2008, XC90|suv|2002, C40 Recharge|ev|2021, EX30|ev|2023, EX90|ev|2024"),
 "Lexus":M("IS|sedan|1999, ES|sedan|1990, LS|sedan|1990, GS|sedan|1993, UX|suv|2018, NX|suv|2014, RX|suv|1998, GX|suv|2002, LX|suv|2007, RZ|ev|2022, RC|coupe|2014, LC|coupe|2017, LM|van|2020"),
 "Subaru":M("Impreza|hatchback|1992, WRX|sedan|1992, Legacy|sedan|1990, XV|suv|2012, Crosstrek|suv|2023, Forester|suv|1997, Outback|suv|1995, BRZ|coupe|2012, Levorg|hatchback|2014"),
 "Chevrolet":M("Cruze|sedan|2008, Colorado|pickup|2003, Trailblazer|suv|2012, Captiva|suv|2006, Camaro|coupe|1990, Corvette|coupe|1990, Spark|hatchback|2010, Aveo|sedan|2004, Sonic|hatchback|2011"),
 "Porsche":M("911|coupe|1990, 718 Cayman|coupe|2005, 718 Boxster|coupe|1996, Panamera|sedan|2009, Macan|suv|2014, Cayenne|suv|2002, Taycan|ev|2019"),
 "MINI":M("Cooper|hatchback|2001, Cooper S|hatchback|2002, Clubman|hatchback|2007, Countryman|suv|2010, Cooper Convertible|coupe|2004, Cooper SE|ev|2020"),
 "GWM":M("Haval H6|suv|2011, Haval Jolion|suv|2021, Haval H6 PHEV|suv|2021, Tank 300|suv|2021, Tank 500|suv|2023, Ora Good Cat|ev|2020, Ora 07|ev|2023, Cannon|pickup|2021"),
 "NETA":M("Neta V|suv|2020, Neta X|suv|2022, Neta S|sedan|2022, Neta GT|coupe|2023, Neta Aya|suv|2023"),
 "Changan":M("Deepal S07|suv|2023, Deepal L07|sedan|2023, Deepal S05|suv|2024, CS35 Plus|suv|2018, CS55|suv|2017, Hunter|pickup|2022, Lumin|ev|2022, Alsvin|sedan|2018, UNI-T|suv|2020, UNI-K|suv|2021"),
 "AION":M("Aion Y Plus|suv|2021, Aion ES|sedan|2023, Aion V|suv|2023, Aion S|sedan|2019, Aion Hyptec HT|suv|2023"),
 "GAC":M("GAC GS3|suv|2017, GAC GS8|suv|2018, GAC M8|mpv|2017, GAC Emkoo|suv|2022"),
 "Zeekr":M("Zeekr 001|hatchback|2021, Zeekr 009|van|2022, Zeekr X|suv|2023, Zeekr 007|sedan|2023"),
 "XPeng":M("P7|sedan|2020, P5|sedan|2021, G6|suv|2023, G9|suv|2022, X9|van|2023"),
 "NIO":M("ET5|sedan|2022, ET7|sedan|2021, ES6|suv|2018, ES8|suv|2018, EL7|suv|2022"),
 "Geely":M("Coolray|suv|2018, Okavango|suv|2020, Emgrand|sedan|2009, Geometry C|ev|2020, Galaxy E5|suv|2024"),
 "Lynk & Co":M("01|suv|2017, 03|sedan|2018, 05|suv|2019, 06|suv|2023, 09|suv|2021"),
 "Wuling":M("Air EV|ev|2022, Bingo|hatchback|2023, Almaz|suv|2019, Cortez|mpv|2018, Hongguang|van|2010"),
 "Land Rover":M("Defender|suv|1990, Discovery|suv|1990, Discovery Sport|suv|2014, Range Rover|suv|1990, Range Rover Sport|suv|2005, Range Rover Evoque|suv|2011, Range Rover Velar|suv|2017"),
 "Jaguar":M("XE|sedan|2015, XF|sedan|2008, F-Type|coupe|2013, E-Pace|suv|2017, F-Pace|suv|2016, I-Pace|ev|2018"),
 "Jeep":M("Wrangler|suv|1990, Grand Cherokee|suv|1992, Compass|suv|2007, Renegade|suv|2014, Gladiator|pickup|2019, Cherokee|suv|1990"),
 "Peugeot":M("208|hatchback|2012, 308|hatchback|2007, 2008|suv|2013, 3008|suv|2008, 5008|suv|2009, 408|sedan|2010, Partner|van|1996, Expert|van|1995, e-2008|ev|2020"),
 "Renault":M("Clio|hatchback|1990, Megane|hatchback|1995, Captur|suv|2013, Koleos|suv|2008, Duster|suv|2010, Kwid|hatchback|2015, Zoe|ev|2012, Triber|mpv|2019"),
 "Skoda":M("Octavia|sedan|1996, Fabia|hatchback|1999, Superb|sedan|2001, Kodiaq|suv|2016, Karoq|suv|2017, Kamiq|suv|2019, Enyaq|ev|2020"),
 "Fiat":M("500|hatchback|2007, 500X|suv|2014, Panda|hatchback|1990, Tipo|sedan|2015, 500e|ev|2020"),
 "Acura":M("Integra|sedan|2022, TLX|sedan|2014, MDX|suv|2000, RDX|suv|2006, NSX|coupe|1990"),
 "Infiniti":M("Q50|sedan|2013, Q60|coupe|2016, QX50|suv|2013, QX60|suv|2012, QX80|suv|2010"),
 "Genesis":M("G70|sedan|2017, G80|sedan|2016, G90|sedan|2015, GV60|ev|2021, GV70|suv|2020, GV80|suv|2020"),
 "Cadillac":M("CT4|sedan|2019, CT5|sedan|2019, Escalade|suv|1998, XT4|suv|2018, XT5|suv|2016, Lyriq|ev|2022"),
 "GMC":M("Sierra|pickup|1998, Canyon|pickup|2003, Yukon|suv|1992, Acadia|suv|2006, Hummer EV|ev|2021"),
 "Dodge":M("Charger|sedan|2005, Challenger|coupe|2008, Durango|suv|1997"),
 "RAM":M("1500|pickup|1994, 2500|pickup|1994"),
 "Chrysler":M("300|sedan|2004, Pacifica|van|2016"),
 "Alfa Romeo":M("Giulia|sedan|2015, Stelvio|suv|2016, Tonale|suv|2022, 4C|coupe|2013"),
 "Maserati":M("Ghibli|sedan|2013, Quattroporte|sedan|1990, Levante|suv|2016, Grecale|suv|2022, MC20|coupe|2020"),
 "Aston Martin":M("DB11|coupe|2016, DB12|coupe|2023, Vantage|coupe|2005, DBX|suv|2020"),
 "Ferrari":M("Roma|coupe|2020, 296 GTB|coupe|2021, SF90|coupe|2019, Purosangue|suv|2022, F8|coupe|2019"),
 "Lamborghini":M("Huracan|coupe|2014, Aventador|coupe|2011, Urus|suv|2018, Revuelto|coupe|2023"),
 "Bentley":M("Continental GT|coupe|2003, Flying Spur|sedan|2005, Bentayga|suv|2015"),
 "Rolls-Royce":M("Phantom|sedan|1990, Ghost|sedan|2009, Cullinan|suv|2018, Spectre|ev|2023"),
 "McLaren":M("720S|coupe|2017, Artura|coupe|2021, GT|coupe|2019"),
 "Lotus":M("Emira|coupe|2021, Eletre|ev|2022, Evora|coupe|2009"),
 "Polestar":M("Polestar 2|ev|2020, Polestar 3|ev|2023, Polestar 4|ev|2024"),
 "Rivian":M("R1T|pickup|2021, R1S|suv|2022"),
 "Lucid":M("Air|sedan|2021, Gravity|suv|2024"),
 "VinFast":M("VF 3|suv|2024, VF 5|suv|2023, VF 6|suv|2023, VF 7|suv|2023, VF 8|suv|2022, VF 9|suv|2023, VF e34|ev|2021"),
 "Smart":M("Smart #1|ev|2022, Smart #3|ev|2023, Fortwo|hatchback|1998"),
 "DS":M("DS 3|suv|2015, DS 4|hatchback|2021, DS 7|suv|2017, DS 9|sedan|2020"),
 "Cupra":M("Leon|hatchback|2020, Formentor|suv|2020, Born|ev|2021, Tavascan|ev|2024"),
 "SEAT":M("Ibiza|hatchback|1990, Leon|hatchback|1999, Ateca|suv|2016, Arona|suv|2017"),
 "Proton":M("Saga|sedan|1990, Persona|sedan|2007, X50|suv|2020, X70|suv|2018"),
 "Perodua":M("Myvi|hatchback|2005, Axia|hatchback|2014, Bezza|sedan|2016, Ativa|suv|2021"),
 "Tata":M("Nexon|suv|2017, Punch|suv|2021, Harrier|suv|2019, Tiago|hatchback|2016"),
 "Mahindra":M("Scorpio|suv|2002, XUV700|suv|2021, Thar|suv|2010, Bolero|suv|2000"),
 "KGM":M("Tivoli|suv|2015, Korando|suv|1996, Rexton|suv|2001, Musso|pickup|2018"),
 "Daihatsu":M("Terios|suv|2006, Sirion|hatchback|2004, Ayla|hatchback|2013, Gran Max|van|2007"),
 "Chery":M("Tiggo 4|suv|2017, Tiggo 7 Pro|suv|2020, Tiggo 8 Pro|suv|2021, Omoda 5|suv|2022"),
 "JAC":M("JAC T9|pickup|2023, JAC e-JS4|ev|2021, JAC Sehol|sedan|2020"),
 "Maxus":M("T60|pickup|2017, G50|mpv|2019, Mifa 9|ev|2022, D90|suv|2017"),
 "Leapmotor":M("C10|suv|2024, T03|ev|2020, C01|sedan|2022"),
 "Li Auto":M("Li L7|suv|2023, Li L8|suv|2022, Li L9|suv|2022, Li Mega|van|2024"),
 "Opel":M("Corsa|hatchback|1990, Astra|hatchback|1991, Mokka|suv|2012, Grandland|suv|2017")
};
const BODY_TYPES=[
 {k:"sedan",th:"รถเก๋ง (Sedan)",en:"Sedan"},
 {k:"hatchback",th:"แฮทช์แบ็ก (Hatchback)",en:"Hatchback"},
 {k:"suv",th:"เอสยูวี (SUV)",en:"SUV"},
 {k:"pickup",th:"กระบะ (Pickup)",en:"Pickup"},
 {k:"mpv",th:"อเนกประสงค์ (MPV)",en:"MPV"},
 {k:"van",th:"รถตู้ (Van)",en:"Van"},
 {k:"coupe",th:"คูเป้/สปอร์ต",en:"Coupe / Sport"},
 {k:"ev",th:"รถไฟฟ้า (EV)",en:"Electric"}
];
function bodyLabel(k){const b=BODY_TYPES.find(x=>x.k===k)||BODY_TYPES[0];return lang==="th"?b.th:b.en}

/* ===== 3/4-ANGLE BLUEPRINT WIREFRAMES (generated) ===== */
const _WF_OFF=[26,-18], _WF_GROUND=100;
function _wfO(p){return [p[0]+_WF_OFF[0],p[1]+_WF_OFF[1]]}
function _wfPath(pts){return "M"+pts.map(p=>p[0]+" "+p[1]).join(" L")}
function buildWire(d){
  const far=d.side.map(_wfO); let s="";
  s+=`<path d="${_wfPath(far)} Z" stroke-dasharray="3 2" opacity="0.4"/>`;
  for(let i=1;i<d.side.length-1;i++){const p=d.side[i],q=_wfO(p);s+=`<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" opacity="0.38"/>`}
  const fb=d.side[0],ft=d.side[1],fbo=_wfO(fb),fto=_wfO(ft);
  s+=`<path d="M${fb[0]} ${fb[1]} L${fbo[0]} ${fbo[1]} L${fto[0]} ${fto[1]} L${ft[0]} ${ft[1]} Z"/>`;
  s+=`<path d="${_wfPath(d.side)} Z"/>`;
  if(d.win){s+=`<path d="${_wfPath(d.win)}"/>`;s+=`<path d="${_wfPath(d.win.map(_wfO))}" stroke-dasharray="3 2" opacity="0.4"/>`}
  (d.extra||[]).forEach(e=>{s+=`<path d="${_wfPath(e)}"/>`});
  d.wheels.forEach(w=>{const f=_wfO([w.x,_WF_GROUND]);
    s+=`<circle cx="${f[0]}" cy="${f[1]}" r="${(w.r*0.78).toFixed(1)}" stroke-dasharray="3 2" opacity="0.4"/>`;
    s+=`<circle cx="${w.x}" cy="${_WF_GROUND}" r="${w.r}"/><circle cx="${w.x}" cy="${_WF_GROUND}" r="${(w.r*0.42).toFixed(1)}"/>`});
  return `<svg class="gcar-wireframe-bg" viewBox="0 0 252 152" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">${s}</svg>`;
}
const CARDEF={
 sedan:{side:[[16,100],[16,86],[60,80],[92,54],[150,54],[178,78],[214,82],[214,100]],win:[[88,78],[98,56],[148,56],[170,78]],wheels:[{x:58,r:18},{x:178,r:18}]},
 suv:{side:[[14,100],[14,82],[56,78],[82,48],[176,48],[198,56],[206,74],[206,100]],win:[[80,76],[90,50],[170,50],[190,72]],wheels:[{x:56,r:19},{x:178,r:19}]},
 pickup:{side:[[12,100],[12,84],[52,80],[74,50],[120,50],[134,72],[214,72],[214,100]],win:[[70,76],[80,52],[116,52],[128,72]],extra:[[[134,72],[134,86],[210,86]]],wheels:[{x:52,r:19},{x:182,r:19}]},
 hatchback:{side:[[16,100],[16,86],[60,80],[88,54],[150,54],[174,62],[182,82],[182,100]],win:[[84,78],[94,56],[148,56],[170,76]],wheels:[{x:58,r:18},{x:156,r:18}]},
 coupe:{side:[[16,100],[16,90],[58,84],[100,58],[150,58],[198,80],[210,90],[210,100]],win:[[92,80],[104,60],[148,60],[188,80]],wheels:[{x:56,r:18},{x:182,r:18}]},
 van:{side:[[12,100],[12,70],[36,44],[64,40],[208,40],[214,48],[214,100]],win:[[44,68],[44,48],[204,48],[204,68]],extra:[[[110,48],[110,68]],[[160,48],[160,68]]],wheels:[{x:54,r:18},{x:186,r:18}]},
 mpv:{side:[[14,100],[14,76],[44,50],[80,44],[196,46],[210,60],[212,74],[212,100]],win:[[60,72],[80,48],[190,50],[202,72]],extra:[[[128,49],[128,72]]],wheels:[{x:56,r:18},{x:184,r:18}]},
 ev:{side:[[16,100],[16,84],[58,78],[104,56],[156,56],[200,76],[210,84],[210,100]],win:[[96,76],[108,58],[152,58],[190,76]],wheels:[{x:58,r:18},{x:182,r:18}]}
};
const WIREFRAME_SVGs={};
for(const _k in CARDEF)WIREFRAME_SVGs[_k]=buildWire(CARDEF[_k]);

function getBodyStyle(name) {
  const lower = name.toLowerCase();
  for (const make in CAR_DATABASE) {
    for (const model of CAR_DATABASE[make]) {
      if (lower.includes(model.name.toLowerCase())) {
        return model.type;
      }
    }
  }
  return "sedan";
}

/* ===== SITE CONFIG (announcement / maintenance from backend) ===== */
let siteMaint=null;
async function loadSiteConfig(){
  try{
    const r=await fetch(`${BACKEND_URL}/api/config`);if(!r.ok)return;
    const cfg=await r.json();
    if(cfg.announcement&&cfg.announcement.enabled&&cfg.announcement.text){
      const b=document.createElement("div");
      b.className="site-announce"+(cfg.announcement.type==="warn"?" warn":"");
      b.innerHTML=`<i class="ti ${cfg.announcement.type==="warn"?"ti-alert-triangle":"ti-speakerphone"}"></i> ${esc(cfg.announcement.text)}`;
      document.querySelector(".app").prepend(b);
    }
    siteMaint=cfg.maintenance||null;
    updateMaintOverlay();
  }catch(e){}
}
function updateMaintOverlay(){
  const staff=currentUser&&["owner","admin","moderator"].includes(currentUser.role);
  const o=$("maintOverlay");
  if(siteMaint&&siteMaint.enabled&&!staff){
    if(o)return;
    const el=document.createElement("div");el.id="maintOverlay";el.className="maint-overlay";
    el.innerHTML=`<div class="maint-card"><i class="ti ti-tool" style="font-size:42px;color:var(--accent)"></i>
      <h2>ปิดปรับปรุงชั่วคราว</h2><p>${esc(siteMaint.message||"ระบบกำลังปรับปรุง กลับมาเร็วๆ นี้ครับ")}</p></div>`;
    document.body.appendChild(el);
  }else if(o)o.remove();
}

/* ===== i18n ===== */
const LANG_INDEXES = { th: 0, en: 1, ja: 2, zh: 3, de: 4, es: 5 };
const T={
 "nav.home":["หน้าหลัก","Home","ホーム","首页","Startseite","Inicio"],
 "nav.garage":["การาจ","Garage","ガレージ","车库","Garage","Garaje"],
 "nav.magazine":["นิตยสาร","Magazine","マガジン","杂志","Magazin","Revista"],
 "signin":["เข้าสู่ระบบ","Sign in","ログイン","登录","Einloggen","Iniciar Sesión"],
 "menu.profile":["โปรไฟล์ & ตั้งค่า","Profile & Settings","プロファイル & 設定","个人资料 & 设置","Profil & Einstellungen","Perfil & Configuración"],
 "menu.logout":["ออกจากระบบ","Log out","ログアウト","退出登录","Abmelden","Cerrar Sesión"],
 "menu.admin":["แผงควบคุมแอดมิน","Admin Panel","管理パネル","管理面板","Admin-Panel","Panel de Admin"],
 "set.openadmin":["เปิดแผงควบคุม","Open dashboard","ダッシュボードを開く","打开控制面板","Dashboard öffnen","Abrir panel"],
 "dash.sub":["เลือกวิธีวินิจฉัย หรือกดวินิจฉัยรถในการาจของคุณได้เลย","Pick a way to diagnose, or tap a car in your garage","診断方法を選択するか、ガレージの車をタップしてください","选择诊断方式，或点击车库中的车辆","Wählen Sie eine Diagnosemethode oder tippen Sie auf ein Auto in Ihrer Garage","Elija un método de diagnóstico o toque un automóvil en su garaje"],
 "dash.cars":["รถของฉัน","My cars","マイカー","我的车辆","Meine Autos","Mis coches"],
 "dash.manage":["จัดการ →","Manage →","管理 →","管理 →","Verwalten →","Administrar →"],
 "dash.customize":["แต่งหน้าหลัก","Customize Layout","レイアウト編集","自定义布局","Layout anpassen","Personalizar diseño"],
 "dash.custom_done":["เสร็จสิ้น","Done","完了","完成","Fertig","Hecho"],
 "dash.widget_ai":["ผู้ช่วย AI (ด่วน)","Quick AI Assistant","クイックAIアシスタント","快捷AI助手","Schneller KI-Assistent","Asistente rápido de IA"],
 "dash.widget_news":["ข่าวสารล่าสุด","Latest News","最新ニュース","最新消息","Neueste Nachrichten","Últimas Noticias"],
 "dash.widget_settings":["ตั้งค่าธีมและสี","Theme & Settings","テーマ & 設定","主题 & 设置","Design & Einstellungen","Temas y Ajustes"],
 "qa.text":["พิมพ์ถาม","Type","テキスト入力","文字输入","Tippen","Escribir"],
 "qa.image":["ถ่ายรูป","Photo","写真撮影","照片上传","Foto","Foto"],
 "qa.video":["วิดีโอ","Video","動画撮影","视频上传","Video","Video"],
 "qa.mic":["อัดเสียง","Voice","音声録音","语音输入","Sprachaufnahme","Voz"],
 "chat.title":["SpireONE","SpireONE","SpireONE","SpireONE","SpireONE","SpireONE"],
 "composer.ph":["พิมพ์อาการรถ หรือถามอะไรก็ได้...","Describe a car issue or ask anything...","車の症状を入力するか、何でも質問してください...","描述车辆症状或提问...","Beschreiben Sie ein Autoproblem oder fragen Sie etwas...","Describa un problema del automóvil o pregunte algo..."],
 "chat.select_car_prompt":["กรุณาเลือกรถในการาจเพื่อเริ่มคุยกับ AI","Please select a car in your garage to chat with AI","AIと対話するにはガレージから車を選択してください","请在车库中选择一辆车以与AI对话","Bitte wählen Sie ein Auto in Ihrer Garage aus, um mit der KI zu chatten","Seleccione un automóvil en su garaje para chatear con la IA"],
 "chat.diagnose_opt":["วินิจฉัยปัญหารถ","Diagnose Car","車を診断する","诊断车辆","Auto diagnostizieren","Diagnosticar coche"],
 "chat.symptom_opt":["บอกอาการหรือปัญหา","Report Symptoms","症状を報告する","报告症状","Symptome melden","Reportar síntomas"],
 "chat.clear_history":["ล้างประวัติคุย","Clear History","履歴を消去","清除历史","Verlauf löschen","Limpiar historial"],
 "chat.clear_confirm":["ยืนยันล้างประวัติสำหรับรถคันนี้หรือไม่?","Are you sure you want to clear chat history for this car?","この車のチャット履歴を消去してもよろしいですか？","您确定要清除这辆车的聊天历史吗？","Sind Sie sicher, dass Sie den Chatverlauf für dieses Auto löschen möchten?","¿Está seguro de que desea borrar el historial de chat de este automóvil?"],
 "garage.title":["การาจของฉัน","My Garage","マイガレージ","我的车库","Meine Garage","Mi Garaje"],
 "garage.sub":["บันทึกรถของคุณ — ประวัติอาการที่เคยวินิจฉัยจะถูกเก็บไว้ในแต่ละคัน","Save your cars — past diagnosis history is kept per car","車を登録する — 過去の診断履歴は車ごとに保存されます","保存您的车辆 — 历史诊断记录将按车保存","Speichern Sie Ihre Autos — die bisherige Diagnosehistorie wird pro Auto gespeichert","Guarde sus autos: el historial de diagnóstico anterior se guarda por auto"],
 "garage.add":["เพิ่มรถ","Add car","車を追加","添加车辆","Auto hinzufügen","Añadir coche"],
 "garage.name":["ยี่ห้อ + รุ่น เช่น Honda Civic","Make + model e.g. Honda Civic","メーカー＋車種（例：ホンダ・シビック）","品牌+车型，例如 本田思域","Marke + Modell, z. B. Honda Civic","Marca + modelo p. ej. Honda Civic"],
 "garage.year":["ปี เช่น 2020","Year e.g. 2020","年式（例：2020）","年份，例如 2020","Jahr, z. B. 2020","Año, p. ej. 2020"],
 "garage.km":["เลขไมล์ปัจจุบัน (กม.)","Current mileage (km)","現在の走行距離 (km)","当前里程（公里）","Aktueller Kilometerstand (km)","Kilometraje actual (km)"],
 "garage.empty":["ยังไม่มีรถ — เพิ่มคันแรกด้านล่าง","No cars yet — add your first below","車が登録されていません。以下から追加してください","暂无车辆 — 在下方添加您的第一辆车","Noch keine Autos — fügen Sie unten Ihr erstes hinzu","Aún no hay autos: agregue el primero a continuación"],
 "garage.hist":["ประวัติการวินิจฉัย","Diagnosis history","診断履歴","诊断历史","Diagnosehistorie","Historial de diagnóstico"],
 "garage.nohist":["ยังไม่มีประวัติ ลองถาม AI ดู","No history yet — ask the AI","履歴がありません。AIに質問してみましょう","暂无历史 — 咨询AI试试","Noch kein Verlauf — fragen Sie die KI","Aún no hay historial — pregúntele a la IA"],
 "mag.title":["นิตยสารรถยนต์","Car Magazine","カーマガジン","汽车杂志","Automagazin","Revista de Coches"],
 "mag.sub":["ข่าวสารและบทความรถยนต์ล่าสุด — ดึงสดด้วย Gemini","Latest car news & articles — live via Gemini","最新の自動車ニュース＆記事 — Geminiでリアルタイム取得","最新汽车新闻与文章 — 通过Gemini实时获取","Aktuelle Autonews & Artikel — live via Gemini","Últimas noticias y artículos de automóviles: en vivo a través de Gemini"],
 "mag.loading":["กำลังโหลดข่าวล่าสุด...","Loading latest...","最新情報を読み込み中...","正在加载最新消息...","Lade aktuelle Nachrichten...","Cargando últimas noticias..."],
 "profile.guest":["ผู้มาเยือน","Guest","ゲスト","访客","Gast","Invitado"],
 "profile.guestsub":["ยังไม่ได้เข้าสู่ระบบ","Not signed in","未ログイン","未登录","Nicht angemeldet","No ha iniciado sesión"],
 "set.lang":["ภาษา / Language","Language","言語 / Language","语言 / Language","Sprache / Language","Idioma / Language"],
 "set.langd":["เลือกภาษาที่ใช้ในเว็บไซต์ (มีผลกับข้อความและ AI)","Choose the site & AI language","サイトとAIの言語を選択します","选择网站和AI语言","Wählen Sie die Website- & KI-Sprache","Elija el idioma del sitio y de la IA"],
 "set.theme":["ธีมและสีของระบบ","System Theme & Color","システムテーマとカラー","系统主题与颜色","System-Design & Farbe","Tema y color del sistema"],
 "set.themed":["เลือกธีมสีที่ต้องการเปลี่ยนสำหรับเว็บไซต์","Choose your preferred layout color theme","お好みのカラーテーマを選択してください","选择您喜欢的色彩主题","Wählen Sie Ihr bevorzugt Farbedesign","Elija su tema de color preferido"],
 "set.opacity":["ความชัดเจนของพื้นหลังการาจ","Garage Card Wireframe Opacity","ガレージカード背景の不透明度","车库卡片背景不透明度","Deckkraft der Garagenkarten-Drahtgitter","Opacidad de la estructura de la tarjeta de garaje"],
 "set.opacityd":["ปรับระดับความ visible ของเส้นโครงสร้างรถ 3D","Adjust visibility level of the 3D car outlines","3D車のワイヤーフレームの視認性を調整します","调整3D车辆轮廓的可见度","Stellen Sie die Sichtbarkeit der 3D-Autoumrisse ein","Ajuste el nivel de visibilidad de los contornos 3D del coche"],
 "set.account":["บัญชี","Account","アカウント","账户","Konto","Cuenta"],
 "set.accountd":["เข้าสู่ระบบด้วย Google เพื่อใช้ Admin และจดจำข้อมูล","Sign in with Google for Admin & sync","管理機能と同期を使用するにはGoogleでサインインしてください","使用Google登录以获得管理员功能和同步","Melden Sie sich mit Google für Admin & Synchronisierung an","Inicie sesión con Google para administración y sincronización"],
 "set.admind":["ภาพรวมผู้ใช้งานทั้งหมด (เฉพาะผู้ดูแล)","All users overview (admins only)","全ユーザーの概要（管理者のみ）","所有用户概览（仅限管理员）","Gesamtübersicht der Benutzer (nur Admins)","Descripción general de todos los usuarios (solo administradores)"],
 "select.make":["เลือกยี่ห้อ...","Select Make...","メーカーを選択...","选择品牌...","Marke wählen...","Seleccionar Marca..."],
 "select.model":["เลือกรุ่น...","Select Model...","車種を選択...","选择车型...","Modell wählen...","Seleccionar Modelo..."],
 "select.year":["เลือกปี...","Select Year...","年式を選択...","选择年份...","Jahr wählen...","Seleccionar Año..."],
 "sym.engine":["เครื่องยนต์","Engine","エンジン","发动机","Motor","Motor"],
 "sym.ac":["ระบบแอร์","A/C System","エアコン","空调系统","Klimaanlage","Aire Acondicionado"],
 "sym.gear":["ระบบเกียร์","Gearbox","ギアボックス","变速箱","Getriebe","Caja de cambios"],
 "sym.wheels":["ล้อและยาง","Wheels & Tires","ホイール & タイヤ","车轮与轮胎","Räder & Reifen","Ruedas y Llantas"]
};
function tr(k) {
  const v = T[k];
  if (!v) return k;
  const idx = LANG_INDEXES[lang] ?? 0;
  return v[idx] || v[0] || k;
}

function applyLang(l){
  lang = l;
  LS.set("lang", l);
  document.documentElement.lang = l;
  const i = LANG_INDEXES[l] ?? 0;
  
  document.querySelectorAll("[data-i18n]").forEach(e=>{
    const v = T[e.dataset.i18n];
    if (v) e.textContent = v[i];
  });
  
  document.querySelectorAll("[data-i18n-ph]").forEach(e=>{
    const v = T[e.dataset.i18nPh];
    if (v) e.placeholder = v[i];
  });
  
  renderCarSel();
  renderLangSeg();
  renderGarage();
  renderDashboard();
}

function renderLangSeg(){
  document.querySelectorAll("#langSeg button").forEach(b => {
    b.classList.toggle("active", b.dataset.l === lang);
  });
}

$("langSeg").addEventListener("click", e => {
  const b = e.target.closest("[data-l]");
  if (b) applyLang(b.dataset.l);
});

/* ===== NAV / VIEW ===== */
function moveInd(){const ind=$("navInd"),a=document.querySelector(".nav-links a.active");if(!ind||!a)return;ind.style.width=a.offsetWidth+"px";ind.style.transform=`translate(${a.offsetLeft}px,-50%)`}
window.addEventListener("resize",moveInd);
function switchView(v){
  document.querySelectorAll(".view").forEach(s=>s.classList.toggle("active",s.id==="v-"+v));
  document.querySelectorAll(".nav-links a").forEach(a=>a.classList.toggle("active",a.dataset.view===v));
  if(v==="home")renderDashboard();
  if(v==="magazine")loadMag();
  if(v==="shop")loadShop();
  if(v==="garage")renderGarage();
  if(v==="profile")renderProfile();
  $("dd").classList.remove("show");moveInd();
}
document.addEventListener("click",e=>{const n=e.target.closest("[data-view]");if(n)switchView(n.dataset.view)});
$("avatarBtn").onclick=e=>{e.stopPropagation();$("dd").classList.toggle("show")};
document.addEventListener("click",e=>{if(!e.target.closest(".nav-right"))$("dd").classList.remove("show")});

/* ===== CUSTOM WIDGETS LAYOUT ===== */
let widgetOrder = LS.get("widgetOrder", ["w-cars", "w-quick-actions", "w-ai", "w-magazine", "w-settings"]);
let widgetToggles = LS.get("widgetToggles", { "w-ai": false, "w-magazine": true, "w-settings": true });
let editMode = false;

function applyWidgetLayout() {
  const grid = $("widgetGrid");
  if (!grid) return;
  
  // Sort widgets in DOM
  const widgets = Array.from(grid.children);
  widgetOrder.forEach(id => {
    const w = widgets.find(x => x.id === id);
    if (w) grid.appendChild(w);
  });
  
  // Apply toggles
  for (const id in widgetToggles) {
    const el = $(id);
    if (el) el.style.display = widgetToggles[id] ? "block" : "none";
    const chk = $("chk-" + id.replace("w-", ""));
    if (chk) chk.checked = widgetToggles[id];
  }
}

function saveWidgetLayout() {
  const grid = $("widgetGrid");
  if (!grid) return;
  const order = Array.from(grid.children).map(x => x.id);
  LS.set("widgetOrder", order);
  widgetOrder = order;
}

function toggleWidget(id, show) {
  widgetToggles[id] = show;
  LS.set("widgetToggles", widgetToggles);
  const el = $(id);
  if (el) el.style.display = show ? "block" : "none";
}

function toggleEditMode() {
  editMode = !editMode;
  const grid = $("widgetGrid");
  const btn = $("customizeBtn");
  const panel = $("customizePanel");
  
  if (grid) grid.classList.toggle("edit-mode", editMode);
  if (panel) panel.style.display = editMode ? "block" : "none";
  
  if (btn) {
    btn.innerHTML = editMode 
      ? `<i class="ti ti-check"></i> <span data-i18n="dash.custom_done">เสร็จสิ้น</span>` 
      : `<i class="ti ti-adjustments-alt"></i> <span data-i18n="dash.customize">แต่งหน้าหลัก</span>`;
    applyLang(lang);
  }
}

function moveWidget(id, dir) {
  const grid = $("widgetGrid");
  const el = $(id);
  if (!grid || !el) return;
  
  const children = Array.from(grid.children);
  const idx = children.indexOf(el);
  const newIdx = idx + dir;
  
  if (newIdx >= 0 && newIdx < children.length) {
    if (dir === 1) {
      grid.insertBefore(el, children[newIdx].nextSibling);
    } else {
      grid.insertBefore(el, children[newIdx]);
    }
    saveWidgetLayout();
  }
}

function initWidgetDragging() {
  const grid = $("widgetGrid");
  if (!grid) return;
  
  let dragEl = null;
  grid.addEventListener("dragstart", e => {
    if (!editMode) {
      e.preventDefault();
      return;
    }
    const widget = e.target.closest(".widget");
    if (!widget) return;
    dragEl = widget;
    widget.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });
  
  grid.addEventListener("dragover", e => {
    if (!editMode || !dragEl) return;
    e.preventDefault();
    const widget = e.target.closest(".widget");
    if (!widget || widget === dragEl) return;
    
    const rect = widget.getBoundingClientRect();
    const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
    grid.insertBefore(dragEl, next ? widget.nextSibling : widget);
  });
  
  grid.addEventListener("dragend", e => {
    if (dragEl) {
      dragEl.classList.remove("dragging");
      dragEl = null;
      saveWidgetLayout();
    }
  });
}

/* ===== CUSTOM SEARCHABLE SELECT DROPDOWNS ===== */
let selectedMake = "";
let selectedModel = null;
let selectedYear = "";
let customMode = false;
let selectedBody = "sedan";

function initCustomSelects() {
  const makeList = $("gMakeList");
  if (!makeList) return;

  makeList.innerHTML = Object.keys(CAR_DATABASE).sort().map(make =>
    `<div class="option-item" onclick="selectMake('${make.replace(/'/g,"\\'")}')">${esc(make)}</div>`
  ).join("") + `<div class="option-item" style="color:var(--accent);font-weight:600" onclick="selectMake('__other')">${lang==="th"?"➕ อื่นๆ (พิมพ์เอง)":"➕ Other (type it)"}</div>`;
  initBodySelect();
  
  document.addEventListener("click", e => {
    if (!e.target.closest(".custom-select")) {
      document.querySelectorAll(".custom-select").forEach(el => el.classList.remove("active"));
    }
  });
}

function toggleCustomSelect(id) {
  const el = $(id);
  const trigger = el.querySelector(".custom-select-trigger");
  if (trigger.classList.contains("disabled")) return;
  
  document.querySelectorAll(".custom-select").forEach(other => {
    if (other.id !== id) other.classList.remove("active");
  });
  
  el.classList.toggle("active");
  if (el.classList.contains("active")) {
    const searchInput = el.querySelector(".custom-select-search");
    if (searchInput) {
      searchInput.value = "";
      filterCustomSelect(id, "");
      searchInput.focus();
    }
  }
}

function filterCustomSelect(id, query) {
  const el = $(id);
  const items = el.querySelectorAll(".option-item");
  items.forEach(item => {
    const matches = item.textContent.toLowerCase().includes(query.toLowerCase());
    item.style.display = matches ? "block" : "none";
  });
}

function fillYears(startYear){
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= startYear; y--) years.push(y);
  $("gYearList").innerHTML = years.map(y => `<div class="option-item" onclick="selectYear(${y})">${y}</div>`).join("");
}

function selectMake(make) {
  if (make === "__other") {
    customMode = true; selectedMake = "__other"; selectedModel = null; selectedYear = "";
    const ms = $("gMakeSelect");
    ms.querySelector(".val").textContent = (lang==="th"?"อื่นๆ (พิมพ์เอง)":"Other (custom)");
    ms.classList.remove("active");
    $("gModelTrigger").classList.add("disabled");
    $("gModelTrigger").querySelector(".val").textContent = tr("select.model");
    $("gCustomBox").style.display = "block";
    $("gYearTrigger").classList.remove("disabled");
    $("gYearTrigger").querySelector(".val").textContent = tr("select.year");
    fillYears(1980);
    return;
  }
  customMode = false; $("gCustomBox").style.display = "none";
  selectedMake = make;
  selectedModel = null;
  selectedYear = "";

  const makeSelect = $("gMakeSelect");
  makeSelect.querySelector(".val").textContent = make;
  makeSelect.classList.remove("active");

  const modelTrigger = $("gModelTrigger");
  modelTrigger.classList.remove("disabled");
  modelTrigger.querySelector(".val").textContent = tr("select.model");

  const yearTrigger = $("gYearTrigger");
  yearTrigger.classList.add("disabled");
  yearTrigger.querySelector(".val").textContent = tr("select.year");

  const modelList = $("gModelList");
  modelList.innerHTML = CAR_DATABASE[make].map(model =>
    `<div class="option-item" onclick="selectModel('${model.name.replace(/'/g,"\\'")}', '${model.type}', ${model.startYear})">${esc(model.name)}</div>`
  ).join("");
}

function selectModel(modelName, type, startYear) {
  selectedModel = { name: modelName, type: type, startYear: startYear };
  selectedYear = "";

  const modelSelect = $("gModelSelect");
  modelSelect.querySelector(".val").textContent = modelName;
  modelSelect.classList.remove("active");

  const yearTrigger = $("gYearTrigger");
  yearTrigger.classList.remove("disabled");
  yearTrigger.querySelector(".val").textContent = tr("select.year");
  fillYears(startYear);
}

function selectYear(year) {
  selectedYear = year.toString();
  const yearSelect = $("gYearSelect");
  yearSelect.querySelector(".val").textContent = year;
  yearSelect.classList.remove("active");
}

function initBodySelect(){
  const l = $("gBodyList"); if(!l) return;
  l.innerHTML = BODY_TYPES.map(b=>`<div class="option-item" onclick="selectBody('${b.k}')">${esc(lang==="th"?b.th:b.en)}</div>`).join("");
}
function selectBody(k){
  selectedBody = k;
  const bs = $("gBodySelect");
  bs.querySelector(".val").textContent = bodyLabel(k);
  bs.classList.remove("active");
}

/* ===== SYSTEM THEME & COLOR SETTINGS ===== */
function setTheme(theme) {
  currentTheme = theme;
  LS.set("theme", theme);
  const root = document.documentElement;
  root.classList.add("theme-fade");
  clearTimeout(setTheme._t);
  setTheme._t = setTimeout(() => root.classList.remove("theme-fade"), 560);
  root.setAttribute("data-theme", theme);
  
  document.querySelectorAll(".theme-btn, .theme-btn-p").forEach(btn => {
    btn.classList.toggle("active", btn.classList.contains(theme));
  });
}

function setWireframeOpacity(val) {
  wireframeOpacity = val;
  LS.set("opacity", val);
  document.documentElement.style.setProperty("--wireframe-opacity", val);
  
  const s1 = $("wireframeOpacitySlider");
  const s2 = $("profileOpacitySlider");
  if (s1) s1.value = val;
  if (s2) s2.value = val;
}

/* ===== GREETING + DASHBOARD ===== */
function updateGreeting(){const el=$("greet");if(!el)return;const h=new Date().getHours();
  const GREET={
    th:[h<11?"สวัสดีตอนเช้า":h<16?"สวัสดีตอนบ่าย":h<19?"สวัสดีตอนเย็น":"สวัสดีตอนค่ำ", n=>n?" คุณ "+esc(n):""],
    en:[h<12?"Good morning":h<17?"Good afternoon":"Good evening", n=>n?", "+esc(n):""],
    ja:[h<11?"おはようございます":h<18?"こんにちは":"こんばんは", n=>n?"、"+esc(n)+"さん":""],
    zh:[h<11?"早上好":h<18?"下午好":"晚上好", n=>n?"，"+esc(n):""],
    de:[h<12?"Guten Morgen":h<18?"Guten Tag":"Guten Abend", n=>n?", "+esc(n):""],
    es:[h<12?"Buenos días":h<19?"Buenas tardes":"Buenas noches", n=>n?", "+esc(n):""],
    ko:[h<11?"좋은 아침이에요":h<18?"안녕하세요":"안녕하세요", n=>n?", "+esc(n)+"님":""]
  };
  const entry=GREET[lang]||GREET.th;
  const name=currentUser?currentUser.name:"";
  el.innerHTML=`${entry[0]}${entry[1](name)} <span class="w">👋</span>`}

function renderDashboard(){
  updateGreeting();
  renderDashCars();
  applyWidgetLayout();
  // Sync the magazine preview widget if visible
  if (widgetToggles["w-magazine"]) {
    setTimeout(() => { if (magLoaded && magItems.length) renderMagWidget(); else loadMag(); }, 100);
  }
}

function renderDashCars(){const w=$("dashCars");if(!w)return;const g=garage();
  if(!g.length) {
    w.innerHTML = `<div class="cadd" data-view="garage"><i class="ti ti-plus" style="font-size:26px"></i><span>${lang==="en"?"Add a car":"เพิ่มรถ"}</span></div>`;
    return;
  }
  let html=g.map(c=>{const last=(c.history&&c.history[0])||null;
    const style = c.type || getBodyStyle(c.name);
    const wireframe = WIREFRAME_SVGs[style] || WIREFRAME_SVGs.sedan;
    const stat=last?`<div class="cstatus"><span class="dot"></span>${lang==="en"?"Last checked":"ตรวจล่าสุด"}: ${new Date(last.t).toLocaleDateString(lang==="en"?"en-US":"th-TH",{day:"numeric",month:"short"})}</div>`
      :`<div class="cstatus warn"><span class="dot"></span>${lang==="en"?"Never diagnosed":"ยังไม่เคยวินิจฉัย"}</div>`;
    return `<div class="ccard">${wireframe}<div class="top" style="position:relative; z-index:1;"><div class="ci"><i class="ti ti-car"></i></div><div><h4>${esc(c.name)}</h4><div class="cs">${esc(c.year||"-")} · ${esc(c.mileage||"-")} กม.</div></div></div><div style="position:relative; z-index:1;">${stat}<button class="cdiag" data-diag="${c.id}"><i class="ti ti-stethoscope"></i> ${lang==="en"?"Diagnose":"วินิจฉัย"}</button></div></div>`}).join("");
  html+=`<div class="cadd" data-view="garage"><i class="ti ti-plus" style="font-size:26px"></i><span>${lang==="en"?"Add a car":"เพิ่มรถ"}</span></div>`;
  w.innerHTML=html}

document.querySelector("#v-home").addEventListener("click",e=>{
  const b=e.target.closest("[data-open]");
  if(b) openChat({attach:b.dataset.open});
});
$("dashCars").addEventListener("click",e=>{const d=e.target.closest("[data-diag]");if(d)openChat({car:d.dataset.diag,starter:true})});

/* ===== CHAT — moved to standalone app (chat.html) ===== */
function openChat(opts){opts=opts||{};
  if(opts.car)LS.set("selCar",opts.car);
  const p=new URLSearchParams();
  if(opts.attach)p.set("attach",opts.attach);
  if(opts.starter)p.set("starter","1");
  location.href="chat.html"+(p.toString()?"?"+p.toString():"");
}
function updateFabBadge(){
  const badge=$("fabBadge");if(!badge)return;
  const c=selCar();let has=false;
  if(c){const sess=LS.get("sess_"+c.id,[]);has=Array.isArray(sess)&&sess.some(s=>s.msgs&&s.msgs.length);
    if(!has){const legacy=LS.get("chatMsgs_"+c.id,[]);has=!!(legacy&&legacy.length)}}
  badge.classList.toggle("show",has);
}
$("fab").onclick=()=>openChat({});

/* ===== GARAGE CONTROL ===== */
function garage(){return LS.get("garage",[])}
function saveGarage(g){LS.set("garage",g)}
/* ===== BACKEND CAR SYNC (Cloudflare D1 via /api/cars) ===== */
function carsAreRemote(){return !!(currentUser && useFb && auth && auth.currentUser && location.protocol!=="file:")}
async function carTok(){return await auth.currentUser.getIdToken()}
async function syncCars(){
  if(!carsAreRemote())return;
  try{
    const r=await fetch(`${BACKEND_URL}/api/cars`,{headers:{"Authorization":"Bearer "+await carTok()}});
    if(!r.ok)throw new Error(r.status+" "+r.statusText);
    const arr=await r.json(); if(!Array.isArray(arr))return;
    const local=garage();
    const merged=arr.map(c=>{
      const name=`${c.make||""} ${c.model||""}`.trim();
      const prev=local.find(x=>x.id===c.id)||{};
      return {id:c.id,make:c.make||"",model:c.model||"",name,year:(c.year!=null?String(c.year):""),mileage:(c.mileage!=null?String(c.mileage):""),type:prev.type||getBodyStyle(name),history:prev.history||[]};
    });
    saveGarage(merged);
    if($("v-garage").classList.contains("active"))renderGarage();
    if($("v-home").classList.contains("active"))renderDashboard();
    renderCarSel();
  }catch(e){console.warn("syncCars failed",e)}
}
function selCar(){const id=LS.get("selCar","");return garage().find(c=>c.id===id)||null}
function renderCarSel(){const el=$("carSel");if(!el)return;const g=garage(),cur=LS.get("selCar","");
  el.innerHTML=`<option value="">${lang==="en"?"No car":"ไม่ระบุรถ"}</option>`+g.map(c=>`<option value="${c.id}" ${c.id===cur?"selected":""}>${esc(c.name)}</option>`).join("")}

function renderGarage(){const g=garage();const w=$("garageList");if(!w)return;
  if(!g.length){
    w.innerHTML=`<div class="card" style="text-align:center;color:var(--muted);margin-bottom:6px">${tr("garage.empty")}</div>`;
    renderCarSel();
    return;
  }
  w.innerHTML=g.map(c=>{
    const bodyStyle = c.type || getBodyStyle(c.name);
    const wireframeSvg = WIREFRAME_SVGs[bodyStyle] || WIREFRAME_SVGs.sedan;
    return `<div class="card gcard-wrap" style="margin-bottom:14px;">${wireframeSvg}
      <div class="gcar" style="position:relative; z-index:1;"><div class="gi"><i class="ti ti-car"></i></div>
      <div style="flex:1"><h4>${esc(c.name)}</h4><div class="gs">${esc(c.year||"-")} · ${esc(c.mileage||"-")} กม.</div></div>
      <button class="btn primary" data-diag2="${c.id}" style="padding:8px 14px"><i class="ti ti-stethoscope"></i> ${lang==="en"?"Diagnose":"วินิจฉัย"}</button>
      <button class="btn danger" data-del="${c.id}" style="padding:8px 12px"><i class="ti ti-trash"></i></button></div>
      <div class="ghist" style="position:relative; z-index:1;"><div class="h">${tr("garage.hist")}</div>${(c.history&&c.history.length)?c.history.slice(0,8).map(h=>`<div class="hrow"><div class="q">${esc(h.q)}</div><div class="a">${esc(h.a)}</div><div class="t">${new Date(h.t).toLocaleString(lang==="en"?"en-US":"th-TH",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div></div>`).join(""):`<div style="color:var(--faint);font-size:13px">${tr("garage.nohist")}</div>`}</div></div>`
  }).join("");
  renderCarSel()}

$("garageList").addEventListener("click",async e=>{const dg=e.target.closest("[data-diag2]");if(dg){openChat({car:dg.dataset.diag2,starter:true});return}
  const d=e.target.closest("[data-del]");if(d){const id=d.dataset.del;
    if(carsAreRemote()){try{await fetch(`${BACKEND_URL}/api/cars/${encodeURIComponent(id)}`,{method:"DELETE",headers:{"Authorization":"Bearer "+await carTok()}})}catch(err){console.warn("delete car failed",err)}}
    const g=garage().filter(c=>c.id!==id);saveGarage(g);renderGarage();renderDashboard();toast(lang==="en"?"Car removed":"ลบรถแล้ว","ti-trash")}});

$("gAdd").onclick=async()=>{
  let make,model,type;
  if(customMode){
    make=($("gCustomMake").value||"").trim();
    model=($("gCustomModel").value||"").trim();
    if(!make||!model){toast(lang==="en"?"Please type Make and Model":"กรุณาพิมพ์ยี่ห้อและรุ่นรถ","ti-alert-triangle");return}
    type=selectedBody||"sedan";
  }else{
    if(!selectedMake || !selectedModel){toast(lang==="en"?"Please select Make and Model":"กรุณาเลือกยี่ห้อและรุ่นรถ","ti-alert-triangle");return}
    make=selectedMake; model=selectedModel.name; type=selectedModel.type;
  }
  if(!selectedYear){toast(lang==="en"?"Please select Year":"กรุณาเลือกปีรถ","ti-alert-triangle");return}
  const name = `${make} ${model}`.trim();
  const year = String(selectedYear);
  const mileage = $("gMileage").value.trim() || "-";

  $("gAdd").disabled=true;
  let id = "c"+Date.now();
  if(carsAreRemote()){
    try{
      const r=await fetch(`${BACKEND_URL}/api/cars`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+await carTok()},body:JSON.stringify({make,model,year,mileage})});
      if(!r.ok)throw new Error(r.status+" "+r.statusText);
      const res=await r.json(); if(res&&res.id)id=res.id;
    }catch(err){toast((lang==="en"?"Saved locally (server error): ":"บันทึกในเครื่องแทน (เซิร์ฟเวอร์ผิดพลาด): ")+err.message,"ti-cloud-off")}
  }

  const g = garage();
  g.push({id,make,model,name,year,mileage,type,history:[]});
  saveGarage(g);

  selectedMake = ""; selectedModel = null; selectedYear = ""; customMode = false; selectedBody = "sedan";
  $("gMakeSelect").querySelector(".val").textContent = tr("select.make");
  $("gModelTrigger").classList.add("disabled");
  $("gModelTrigger").querySelector(".val").textContent = tr("select.model");
  $("gYearTrigger").classList.add("disabled");
  $("gYearTrigger").querySelector(".val").textContent = tr("select.year");
  $("gCustomBox").style.display = "none";
  $("gCustomMake").value=""; $("gCustomModel").value="";
  $("gBodySelect").querySelector(".val").textContent = (lang==="th"?"ประเภทตัวถัง...":"Body type...");
  $("gMileage").value = "";
  $("gAdd").disabled=false;

  renderGarage();renderDashboard();toast(lang==="en"?"Car added":"เพิ่มรถแล้ว","ti-check")};

/* ===== MAGAZINE ===== */
let magLoaded=false, magItems=[];
const MAG_COVERS=["linear-gradient(135deg,#3a8c52,#1f6b32)","linear-gradient(135deg,#2f7fb8,#2f5fd6)","linear-gradient(135deg,#c98a2e,#9e6a1a)","linear-gradient(135deg,#8c3a52,#6b1f3a)"];
const MAG_ICONS=["ti-car","ti-bolt","ti-engine","ti-news"];
function renderMagSkeleton(){
  const card=`<div><div class="sk mag-skel-cover"></div><div class="sk sk-line" style="width:38%;margin-bottom:8px"></div><div class="sk sk-line" style="width:86%;height:16px;margin-bottom:7px"></div><div class="sk sk-line" style="width:60%"></div></div>`;
  const mb=$("magBody");if(mb)mb.innerHTML=`<div class="sk mag-skel-hero"></div><div class="mag-grid">${card.repeat(4)}</div>`;
  const wb=$("w-magBody");if(wb)wb.innerHTML=`<div class="mag-widget-list">`+Array.from({length:5},()=>`<div class="mag-widget-item" style="pointer-events:none"><div class="sk" style="width:38px;height:38px;border-radius:11px;flex-shrink:0"></div><div style="flex:1"><div class="sk sk-line" style="width:30%;height:9px;margin-bottom:6px"></div><div class="sk sk-line" style="width:85%"></div></div></div>`).join("")+`</div>`;
}
function renderMagArticles(){
  const items=magItems;if(!items.length)return;
  const hero=items[0],rest=items.slice(1);
  const magHtml=`<div class="mag-hero mag-in" onclick="openMagModal(0)"><div class="bg"></div><div class="ov"></div>
    <div class="tx"><div class="k">${esc(hero.tag||"FEATURED")}</div><h2>${esc(hero.title)}</h2><p>${esc(hero.body)}</p></div></div>
    <div class="mag-grid">${rest.map((m,i)=>`<div class="mag-card mag-in" style="animation-delay:${(0.12+i*0.09).toFixed(2)}s" onclick="openMagModal(${i+1})">
      <div class="mag-cover" style="background:${MAG_COVERS[i%4]}"><i class="ti ${MAG_ICONS[i%4]}"></i></div>
      <div class="k">${esc(m.tag||"ข่าว")}</div><h4>${esc(m.title)}</h4><p>${esc(m.body)}</p></div>`).join("")}</div>`;
  const mb=$("magBody");if(mb)mb.innerHTML=magHtml;
}
function renderMagWidget(){
  const wm=$("w-magBody");if(!wm||!magItems.length)return;
  const widgetItems=magItems.slice(0,5);
  wm.innerHTML=`<div class="mag-widget-list">${widgetItems.map((m,i)=>`<div class="mag-widget-item mag-in" style="animation-delay:${(i*0.07).toFixed(2)}s" onclick="openMagModal(${i})">
      <div class="mag-widget-icon" style="background:${MAG_COVERS[i%4]}"><i class="ti ${MAG_ICONS[i%4]}"></i></div>
      <div class="mag-widget-text"><div class="mag-widget-tag">${esc(m.tag||"ข่าว")}</div><div class="mag-widget-title">${esc(m.title)}</div></div>
      <i class="ti ti-chevron-right mag-widget-arrow"></i></div>`).join("")}</div>
    <button class="mag-widget-btn mag-in" style="animation-delay:.4s" onclick="switchView('magazine')"><i class="ti ti-book-2"></i> ดูทั้งหมด <i class="ti ti-arrow-right" style="font-size:12px"></i></button>`;
}
async function loadMag(){if(magLoaded)return;magLoaded=true;
  renderMagSkeleton();
  let items=null;

  // 1) Backend D1
  try{
    const r=await fetch(`${BACKEND_URL}/api/magazine`);
    if(r.ok){const arr=await r.json();
      if(Array.isArray(arr)&&arr.length)
        items=arr.map(n=>({tag:n.type||"ข่าว",title:n.title||"",body:n.short_description||"",full:n.full_description||"",url:""}));
    }
  }catch(e){console.warn("mag backend",e)}

  // 2) Demo fallback
  if(!items)items=[
    {tag:"รีวิว",title:"ยุคใหม่ของรถ EV ในไทย คุ้มจริงไหม?",body:"เจาะลึกต้นทุน ระยะทาง และเครือข่ายชาร์จที่กำลังเปลี่ยนเกมตลาดรถ",full:"รถ EV กำลังเป็นที่นิยมอย่างรวดเร็วในไทย โดยเฉพาะแบรนด์จากจีนอย่าง BYD และ MG ที่มีราคาเข้าถึงง่าย ต้นทุนการชาร์จไฟต่ำกว่าการเติมน้ำมันถึง 60-70% ต่อระยะทาง อย่างไรก็ตาม สถานีชาร์จยังกระจุกตัวในเมืองใหญ่ ผู้ใช้ต้องวางแผนการเดินทางระยะไกลอย่างรอบคอบ รัฐบาลมีมาตรการอุดหนุนลดภาษีและส่วนลดค่ารถเพื่อกระตุ้นตลาด",url:""},
    {tag:"ข่าวเด่น",title:"ยอดขายรถ EV พุ่ง 40% ต้นปี",body:"แรงหนุนจากมาตรการรัฐและรุ่นใหม่ราคาเข้าถึงง่าย",full:"ยอดจดทะเบียนรถ EV ใหม่ในไทยช่วงไตรมาสแรกของปีนี้เพิ่มขึ้นกว่า 40% เมื่อเทียบกับปีก่อน โดยมีปัจจัยหลักจากการลดภาษีนำเข้าและการผลิตในประเทศของแบรนด์จีน ราคาเฉลี่ยลดลงมาอยู่ที่ประมาณ 800,000 บาท ทำให้ผู้บริโภคทั่วไปเข้าถึงได้มากขึ้น",url:""},
    {tag:"เคล็ดลับ",title:"5 สัญญาณผ้าเบรกใกล้หมด",body:"เสียงเอี๊ยด แป้นเบรกลึก ระยะเบรกยาวขึ้น เช็กก่อนอันตราย",full:"1. มีเสียงเอี๊ยดหรือเสียงโลหะขณะเบรก\n2. แป้นเบรกต้องกดลึกกว่าปกติ\n3. รถสั่นหรือดึงไปด้านใดด้านหนึ่งขณะเบรก\n4. ระยะเบรกยาวขึ้นผิดปกติ\n5. ไฟเตือน Brake Pad ติดบนหน้าปัด\n\nหากพบสัญญาณเหล่านี้ควรนำรถเข้าศูนย์ตรวจสอบโดยด่วน เพราะผ้าเบรกหมดอาจทำให้เกิดอุบัติเหตุได้",url:""},
    {tag:"เทคโนโลยี",title:"ADAS รุ่นใหม่ลดอุบัติเหตุ 27%",body:"ระบบช่วยขับขั้นสูงช่วยลดการชนท้ายอย่างมีนัยสำคัญ",full:"ระบบ ADAS (Advanced Driver-Assistance Systems) ในรถรุ่นปี 2025 ได้รับการพัฒนาให้ฉลาดขึ้นมาก ทั้งการเบรกอัตโนมัติฉุกเฉิน การเตือนออกนอกเลน และการตรวจจับจุดอับสายตา ข้อมูลจาก Euro NCAP แสดงให้เห็นว่าอุบัติเหตุชนท้ายลดลง 27% ในรถที่ติดตั้ง AEB รุ่นใหม่",url:""}
  ];

  magItems=items;
  renderMagArticles();
  renderMagWidget();
}

function openMagModal(i){
  const m=magItems[i];if(!m)return;
  $("mmTag").textContent=m.tag||"ข่าว";
  $("mmTitle").textContent=m.title||"";
  $("mmFull").textContent=m.full||m.body||"";
  const ua=$("mmUrl");
  if(m.url){ua.href=m.url;ua.style.display="inline-flex"}else{ua.style.display="none"}
  $("magModal").classList.add("show");
}
function closeMagModal(){$("magModal").classList.remove("show")}

/* ===== AUTH ===== */
const isAdmin=e=>ADMINS.includes((e||"").toLowerCase());
function picHTML(u){return u.photo?`<img src="${u.photo}" referrerpolicy="no-referrer">`:`<span class="fb">${(u.name||"?").charAt(0).toUpperCase()}</span>`}
async function signIn(){
  if(!useFb){toast(lang==="en"?"Auth unavailable":"ระบบล็อกอินไม่พร้อม","ti-alert-triangle");return}
  if(location.protocol==="file:"){toast("ล็อกอิน Google ต้องเปิดผ่าน localhost/เว็บจริง (file:// ใช้ไม่ได้) — แต่ใช้แชต/การาจได้เลย","ti-info-circle");return}
  const p=new firebase.auth.GoogleAuthProvider();p.setCustomParameters({prompt:"select_account"});
  try{await auth.signInWithPopup(p)}catch(e){if(e.code==="auth/popup-closed-by-user")return;toast("ล็อกอินไม่สำเร็จ: "+e.code,"ti-alert-triangle")}}
window.signIn=signIn;
$("signinBtn").onclick=signIn;
$("logoutBtn").onclick=async()=>{if(useFb)await auth.signOut();$("dd").classList.remove("show");switchView("home");toast(lang==="en"?"Logged out":"ออกจากระบบแล้ว","ti-logout")};
if(useFb)auth.onAuthStateChanged(async u=>{
  if(u){
    try {
      const idToken = await u.getIdToken();
      const r = await fetch(`${BACKEND_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + idToken
        },
        body: JSON.stringify({
          name: u.displayName || u.email.split("@")[0],
          photo: u.photoURL || ""
        })
      });
      if (r.status === 403) {
        toast("บัญชีนี้ถูกระงับการใช้งาน — ติดต่อผู้ดูแลระบบ", "ti-ban");
        currentUser = null;
        LS.set("cachedUser", null);
        await auth.signOut();
        return;
      }
      if (!r.ok) throw new Error(r.status + " " + r.statusText);
      const res = await r.json();
      currentUser = {
        uid: res.uid,
        name: res.name,
        email: res.email,
        photo: res.photo,
        role: res.role || "user",
        admin: res.role === "admin" || res.role === "owner"
      };
      LS.set("cachedUser", currentUser);
    } catch (e) {
      console.warn("backend login error", e);
      currentUser = {
        uid: u.uid,
        name: u.displayName || u.email.split("@")[0],
        email: u.email,
        photo: u.photoURL || "",
        admin: isAdmin(u.email)
      };
      LS.set("cachedUser", currentUser);
    }
  } else {
    currentUser = null;
    LS.set("cachedUser", null);
  }
  renderAuthUI();renderProfile();renderDashboard();syncCars();updateMaintOverlay();
});
function renderAuthUI(){const u=currentUser;
  $("signinBtn").style.display=u?"none":"flex";
  $("avatarBtn").style.display=u?"block":"none";
  if(u){$("avatarBtn").innerHTML=picHTML(u);$("ddAdmin").style.display=["owner","admin","moderator"].includes(u.role)?"flex":"none"}}

/* ===== PROFILE ===== */
function renderProfile(){const u=currentUser;
  $("pPic").innerHTML=u?picHTML(u):`<div class="fb">?</div>`;
  $("pName").textContent=u?u.name:tr("profile.guest");
  $("pEmail").textContent=u?u.email:tr("profile.guestsub");
  const staff=u&&["owner","admin","moderator"].includes(u.role);
  $("pRole").style.display=staff?"inline-flex":"none";
  if(staff){const rt={owner:"เจ้าของระบบ",admin:"ผู้ดูแลระบบ",moderator:"ผู้ควบคุม"};$("pRole").innerHTML=`<i class="ti ti-shield-check"></i> ${rt[u.role]||"ผู้ดูแล"}`}
  $("accountBox").innerHTML=u
    ?`<button class="btn danger" onclick="document.getElementById('logoutBtn').click()"><i class="ti ti-logout"></i> ${lang==="en"?"Log out":"ออกจากระบบ"}</button>`
    :`<button class="btn primary" onclick="signIn()"><i class="ti ti-brand-google"></i> ${lang==="en"?"Sign in with Google":"เข้าสู่ระบบด้วย Google"}</button>${location.protocol==="file:"?`<div class="note"><i class="ti ti-info-circle"></i> เปิดไฟล์แบบ double-click จะล็อกอินไม่ได้ (Google บล็อก file://) — เปิดผ่าน localhost หรือเว็บจริงเพื่อล็อกอิน + ใช้ Admin</div>`:""}`;
  $("adminCard").style.display=staff?"block":"none";
  renderLangSeg()}

/* ===== TOAST ===== */
let tt;function toast(m,ic){const el=$("toast");el.innerHTML=`<i class="ti ${ic||"ti-check"}"></i>${esc(m)}`;el.classList.add("show");clearTimeout(tt);tt=setTimeout(()=>el.classList.remove("show"),3200)}

/* ===== INIT ===== */
initCustomSelects();
initWidgetDragging();
setTheme(currentTheme);
setWireframeOpacity(wireframeOpacity);
applyLang(lang);renderAuthUI();renderProfile();renderCarSel();renderDashboard();
updateFabBadge();
loadSiteConfig();
(function(){
  const v=new URLSearchParams(location.search).get("view");
  if(v){switchView(v);history.replaceState(null,"",location.pathname);return}
  // Auto-resume: if the selected car has a saved conversation, jump straight into chat.html
  try{
    if(sessionStorage.getItem("spire_stayHome"))return;
    const c=selCar();if(!c)return;
    const sess=LS.get("sess_"+c.id,[]);
    const legacy=LS.get("chatMsgs_"+c.id,[]);
    if((Array.isArray(sess)&&sess.some(s=>s.msgs&&s.msgs.length))||(legacy&&legacy.length))location.replace("chat.html");
  }catch(e){}
})();
/* Card hover 3D tilt — desktop pointers only */
(function(){
  if(!window.matchMedia("(hover:hover) and (pointer:fine)").matches)return;
  if(window.matchMedia("(prefers-reduced-motion:reduce)").matches)return;
  const SEL=".ccard,.mag-card,.mag-hero";
  let raf=null;
  document.addEventListener("pointermove",e=>{
    const el=e.target.closest(SEL);if(!el||raf)return;
    raf=requestAnimationFrame(()=>{raf=null;
      const r=el.getBoundingClientRect();
      const rx=((e.clientY-r.top)/r.height-.5)*-6;
      const ry=((e.clientX-r.left)/r.width-.5)*6;
      el.style.transition="transform .12s ease-out";
      el.style.transform=`perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-3px)`;
    });
  },{passive:true});
  document.addEventListener("pointerout",e=>{
    const el=e.target.closest(SEL);if(!el)return;
    if(e.relatedTarget&&el.contains(e.relatedTarget))return;
    el.style.transition="transform .55s cubic-bezier(.2,.9,.3,1.2)";
    el.style.transform="";
  });
})();
setTimeout(moveInd,150);window.addEventListener("load",()=>setTimeout(moveInd,80));
async function loadShop(){
  const b=$("shopBody");
  if(!b)return;
  b.innerHTML=`<div style="text-align:center;color:var(--muted);padding:40px"><i class="ti ti-loader" style="font-size:30px"></i><br/>กำลังโหลด...</div>`;
  try{
    const mk = $("shopMakeFilter") ? $("shopMakeFilter").value.trim() : "";
    const md = $("shopModelFilter") ? $("shopModelFilter").value.trim() : "";
    let url = BACKEND_URL+"/api/shop";
    if (mk && md) url += `?make=${encodeURIComponent(mk)}&model=${encodeURIComponent(md)}`;
    const items = await fetch(url).then(r=>r.json());
    if(!items||!items.length){b.innerHTML=`<div style="text-align:center;color:var(--muted);padding:30px">ไม่พบสินค้าที่ตรงกับการค้นหา</div>`;return}
    b.innerHTML = items.map(m => `
      <div class="shop-item-card">
        <div class="shop-item-img"></div>
        <div style="flex:1; min-width:0">
          <div style="font-size:10px; color:var(--accent); font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:2px">${esc(m.type||"Shop")} · ${esc(m.make||"")} ${esc(m.model||"")}</div>
          <div style="font-size:16px; font-weight:700; font-family:var(--kd); margin-bottom:4px; line-height:1.3">${esc(m.title||"")}</div>
          <div style="font-size:13px; color:var(--muted); margin-bottom:8px; line-height:1.4">${esc(m.short_description||"")}</div>
          <div style="font-size:16px; font-weight:800; color:var(--ink)">${esc(m.price||"")}</div>
        </div>
      </div>
    `).join("");
  }catch(e){b.innerHTML=`<div style="color:var(--danger);padding:20px;text-align:center"><i class="ti ti-alert-triangle"></i> โหลดข้อมูลไม่สำเร็จ</div>`}
}

if(document.fonts)document.fonts.ready.then(moveInd);

;

/* ══════════════════════════════════════════════════════════════════
   DIMENSION — ธีม 8 โลก · ระบบแสงดวงเดียวทั้งเว็บ · พื้นหลังมีชีวิต
   ต่อยอดจากระบบเดิม ไม่แตะฟังก์ชันอื่น
   ══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
const D=document, root=D.documentElement, body=D.body;
const reduce=matchMedia("(prefers-reduced-motion:reduce)");
const LSg=(k,d)=>{try{const v=localStorage.getItem("spire_"+k);return v?JSON.parse(v):d}catch(e){return d}};
const LSs=(k,v)=>{try{localStorage.setItem("spire_"+k,JSON.stringify(v))}catch(e){}};

/* ───────── ทะเบียนธีมทั้งหมด ───────── */
const WORLDS=[
 {k:"warm",   th:"อบอุ่นดินเผา", en:"Warm Clay",   sw:["#F6F3EC","#D9733C","#E8A23C"]},
 {k:"emerald",th:"มรกตมินต์",   en:"Emerald Mint",sw:["#EDF4F2","#3E9E6E","#8FE388"]},
 {k:"cyber",  th:"ไซเบอร์ลึก",  en:"Deep Cyber",  sw:["#0A0D1A","#9B5DE5","#00F5D4"]},
 {k:"carbon", th:"คาร์บอนแดง",  en:"Carbon Red",  sw:["#1A1A1E","#E53E3E","#ED8936"]},
 {k:"sunset", th:"ซันเซ็ต 77",  en:"Retro 70s",   sw:["#F5E6CE","#E2571E","#F0A73C"]},
 {k:"moss",   th:"มอสส์ฟีลด์",  en:"Nature",      sw:["#EDE8DA","#4F7343","#8FA87E"]},
 {k:"wire",   th:"ไนต์ไวร์",    en:"Neon HUD",    sw:["#05070E","#00E5FF","#FF2E88"]},
 {k:"grid",   th:"กริด 72",     en:"Swiss",       sw:["#FAFAF7","#E3000F","#0B0B0B"]}
];
const WMAP={}; WORLDS.forEach(w=>WMAP[w.k]=w);
const curTheme=()=>root.getAttribute("data-theme")||"warm";
const isTH=()=>(root.lang||"th").slice(0,2)==="th";

/* ───────── สร้าง element ที่ต้องใช้ ───────── */
const cv=D.createElement("canvas"); cv.id="livingBg"; cv.setAttribute("aria-hidden","true");
const pool=D.createElement("div");  pool.id="lightPool"; pool.setAttribute("aria-hidden","true");
const wipe=D.createElement("div");  wipe.id="dimWipe"; wipe.setAttribute("aria-hidden","true");
wipe.innerHTML="<b></b>";
body.insertBefore(cv,body.firstChild); body.appendChild(pool); body.appendChild(wipe);

/* ───────── สถานะที่ผู้ใช้ตั้งได้ ───────── */
let alive=LSg("alive",true), depth=LSg("depth",true), gyro=LSg("gyro",false);
function applyFlags(){
  body.dataset.alive=alive?"1":"0";
  body.dataset.depth=(depth&&!reduce.matches)?"1":"0";
}
applyFlags();

/* ══════════ ระบบแสงดวงเดียว ══════════ */
let lxT=50,lyT=24,lx=50,ly=24;
function pushLight(){
  lx+=(lxT-lx)*.09; ly+=(lyT-ly)*.09;
  root.style.setProperty("--lx",lx.toFixed(2)+"%");
  root.style.setProperty("--ly",ly.toFixed(2)+"%");
  root.style.setProperty("--lnx",((lx-50)/50).toFixed(3));
  root.style.setProperty("--lny",((ly-50)/50).toFixed(3));
}
addEventListener("pointermove",e=>{
  if(!depth||gyro)return;
  lxT=e.clientX/innerWidth*100; lyT=e.clientY/innerHeight*100;
},{passive:true});
function onTilt(e){
  if(!depth)return;
  const g=e.gamma||0, b=e.beta||0;
  lxT=Math.max(2,Math.min(98,50+Math.max(-45,Math.min(45,g))*1.1));
  lyT=Math.max(2,Math.min(98,42+Math.max(-45,Math.min(45,b-38))*.9));
}
function enableGyro(){
  const DO=window.DeviceOrientationEvent;
  if(!DO)return Promise.resolve(false);
  if(typeof DO.requestPermission==="function"){
    return DO.requestPermission().then(r=>{
      if(r==="granted"){addEventListener("deviceorientation",onTilt,{passive:true});return true}
      return false;}).catch(()=>false);
  }
  addEventListener("deviceorientation",onTilt,{passive:true});
  return Promise.resolve(true);
}
if(gyro)enableGyro().then(ok=>{if(!ok){gyro=false;LSs("gyro",false);syncRows()}});

/* ══════════ การ์ดเอียงตามนิ้ว (3D) ══════════ */
/* เฉพาะการ์ดย่อยเท่านั้น — การ์ดหลัก (.widget/.card) ไม่หมุน */
const TILT_SEL=".qa, .ccard, .stat";
let tilted=null;
function tiltMove(e){
  if(!depth||reduce.matches)return;
  const el=e.target.closest(TILT_SEL);
  if(el!==tilted){clearTilt(); tilted=el; if(el)el.classList.add("dim-tilt","tilting")}
  if(!el)return;
  const r=el.getBoundingClientRect();
  const px=(e.clientX-r.left)/r.width, py=(e.clientY-r.top)/r.height;
  const rx=(.5-py)*3, ry=(px-.5)*3.8;
  el.style.transform=`rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
}
function clearTilt(){
  if(!tilted)return;
  tilted.classList.remove("tilting");
  tilted.style.transform="";
  const el=tilted; setTimeout(()=>{if(el!==tilted)el.classList.remove("dim-tilt")},520);
  tilted=null;
}
addEventListener("pointermove",tiltMove,{passive:true});
addEventListener("pointerleave",clearTilt,{passive:true});
addEventListener("pointercancel",clearTilt,{passive:true});
addEventListener("scroll",clearTilt,{passive:true,capture:true});

/* ══════════ พื้นหลังมีชีวิต — ตัววาดประจำแต่ละโลก ══════════ */
const cx=cv.getContext("2d");
let W=0,H=0,DPR=1,t=0,dots=[],grain=null;
function fit(){
  DPR=Math.min(devicePixelRatio||1,2);
  W=innerWidth; H=innerHeight;
  cv.width=W*DPR; cv.height=H*DPR;
  cv.style.width=W+"px"; cv.style.height=H+"px";
  cx.setTransform(DPR,0,0,DPR,0,0);
  dots=Array.from({length:innerWidth<620?22:38},()=>({
    x:Math.random()*W,y:Math.random()*H,r:1+Math.random()*2.8,
    s:.1+Math.random()*.3,d:Math.random()*6.283}));
}
function mkGrain(){
  const g=D.createElement("canvas"); g.width=g.height=88;
  const gc=g.getContext("2d"), id=gc.createImageData(88,88);
  for(let i=0;i<id.data.length;i+=4){
    const v=190+Math.random()*65;
    id.data[i]=id.data[i+1]=id.data[i+2]=v; id.data[i+3]=Math.random()*22;
  }
  gc.putImageData(id,0,0); grain=g;
}
mkGrain();
const V=n=>getComputedStyle(root).getPropertyValue(n).trim();

const PAINT={
  /* ค่าเริ่มต้นเดิม — ทำให้มีชีวิตขึ้นโดยไม่เปลี่ยนโทนสี */
  warm(){
    const A="#E8943C",B="#D95E3C",C="#E8A23C";
    [[.14,.12,.30,A],[.86,.10,.26,B],[.78,.92,.30,C],[.10,.82,.24,A]].forEach((o,i)=>{
      const px=W*o[0]+Math.sin(t/150+i*1.7)*W*.05;
      const py=H*o[1]+Math.cos(t/175+i*2.1)*H*.05;
      const rr=Math.max(W,H)*o[2]*(1+Math.sin(t/210+i)*.07);
      const g=cx.createRadialGradient(px,py,0,px,py,rr);
      g.addColorStop(0,o[3]+"2e"); g.addColorStop(.55,o[3]+"12"); g.addColorStop(1,"transparent");
      cx.fillStyle=g; cx.fillRect(0,0,W,H);
    });
    cx.globalAlpha=.5;
    for(let y=0;y<H;y+=88)for(let x=0;x<W;x+=88)cx.drawImage(grain,x,y);
    cx.globalAlpha=1;
  },
  emerald(){
    const A="#3E9E6E",B="#8FE388";
    [[.2,.15,.3,A],[.85,.8,.28,B]].forEach((o,i)=>{
      const px=W*o[0]+Math.sin(t/170+i*2)*W*.05, py=H*o[1]+Math.cos(t/190+i)*H*.05;
      const g=cx.createRadialGradient(px,py,0,px,py,Math.max(W,H)*o[2]);
      g.addColorStop(0,o[3]+"28"); g.addColorStop(1,"transparent");
      cx.fillStyle=g; cx.fillRect(0,0,W,H);
    });
    cx.globalAlpha=.5;
    dots.forEach(p=>{
      p.y-=p.s*.8; p.x+=Math.sin((t+p.d*40)/80)*.2;
      if(p.y<-8){p.y=H+8;p.x=Math.random()*W}
      cx.fillStyle=B; cx.beginPath(); cx.arc(p.x,p.y,p.r*.8,0,6.283); cx.fill();
    });
    cx.globalAlpha=1;
  },
  cyber(){ neon("#9B5DE5","#00F5D4",.20,52) },
  carbon(){
    cx.globalAlpha=.16; cx.strokeStyle="#6a6a72"; cx.lineWidth=1;
    for(let x=-H;x<W;x+=9){cx.beginPath();cx.moveTo(x,0);cx.lineTo(x+H,H);cx.stroke()}
    cx.globalAlpha=.07;
    for(let x=0;x<W+H;x+=9){cx.beginPath();cx.moveTo(x,0);cx.lineTo(x-H,H);cx.stroke()}
    const sx=((t*1.5)%(W+420))-210;
    const g=cx.createLinearGradient(sx-200,0,sx+200,H);
    g.addColorStop(0,"transparent"); g.addColorStop(.5,"#E53E3E44"); g.addColorStop(1,"transparent");
    cx.globalAlpha=1; cx.fillStyle=g; cx.fillRect(0,0,W,H);
  },
  sunset(){
    const bands=["#E2571E","#F0A73C","#2E7D74"];
    bands.forEach((c,i)=>{
      const yy=H*(.2+i*.27)+Math.sin(t/95+i*1.15)*14, hh=H*.055;
      const g=cx.createLinearGradient(0,yy,0,yy+hh);
      g.addColorStop(0,"transparent"); g.addColorStop(.5,c+"22"); g.addColorStop(1,"transparent");
      cx.fillStyle=g; cx.fillRect(0,yy,W,hh);
    });
    cx.globalAlpha=.09; cx.fillStyle="#E2571E";
    cx.beginPath(); cx.arc(W*.82,H*.18+Math.sin(t/130)*11,Math.min(W,H)*.2,0,6.283); cx.fill();
    cx.globalAlpha=.55;
    for(let y=0;y<H;y+=88)for(let x=0;x<W;x+=88)cx.drawImage(grain,x,y);
    cx.globalAlpha=1;
  },
  moss(){
    const g=cx.createRadialGradient(W*.28,H*.88,0,W*.28,H*.88,Math.max(W,H)*.8);
    g.addColorStop(0,"#4F734326"); g.addColorStop(1,"transparent");
    cx.fillStyle=g; cx.fillRect(0,0,W,H);
    cx.globalAlpha=.45;
    dots.forEach((p,i)=>{
      p.y-=p.s; p.x+=Math.sin((t+p.d*40)/70)*.26;
      if(p.y<-8){p.y=H+8;p.x=Math.random()*W}
      cx.fillStyle=i%3?"#8FA87E":"#C4835C";
      cx.beginPath(); cx.arc(p.x,p.y,p.r,0,6.283); cx.fill();
    });
    cx.globalAlpha=1;
  },
  wire(){ neon("#00E5FF","#FF2E88",.3,74) },
  grid(){
    const line="rgba(11,11,11,.16)";
    cx.strokeStyle=line; cx.lineWidth=1; cx.globalAlpha=.7;
    const cols=8, m=Math.max(W*.055,20), cw=(W-m*2)/cols;
    for(let i=0;i<=cols;i++){
      const x=Math.round(m+i*cw)+.5;
      cx.beginPath(); cx.moveTo(x,0); cx.lineTo(x,H); cx.stroke();
    }
    cx.globalAlpha=.32;
    for(let y=0;y<H;y+=36){cx.beginPath();cx.moveTo(0,y+.5);cx.lineTo(W,y+.5);cx.stroke()}
    cx.globalAlpha=.9; cx.strokeStyle="#E3000F"; cx.lineWidth=2;
    const rx=Math.round(m+(Math.floor(t/170)%cols)*cw)+.5;
    cx.beginPath(); cx.moveTo(rx,0); cx.lineTo(rx,H); cx.stroke();
    cx.globalAlpha=1;
  }
};
function neon(a,b,alpha,glow){
  const hz=H*.44, off=(t*.85)%42;
  cx.strokeStyle=a; cx.globalAlpha=alpha; cx.lineWidth=1;
  for(let i=0;i<14;i++){
    const yy=hz+Math.pow(i*42+off,1.4)/72;
    if(yy>H+40)break;
    cx.beginPath(); cx.moveTo(0,yy); cx.lineTo(W,yy); cx.stroke();
  }
  for(let i=-8;i<=8;i++){
    cx.beginPath(); cx.moveTo(W/2+i*(W/12),H); cx.lineTo(W/2+i*6,hz); cx.stroke();
  }
  cx.globalAlpha=alpha*.5; cx.strokeStyle=b;
  for(let y=0;y<H;y+=4){cx.beginPath();cx.moveTo(0,y);cx.lineTo(W,y);cx.stroke()}
  cx.globalAlpha=alpha*.55; cx.fillStyle=a;
  cx.beginPath(); cx.arc(W*.5,hz,glow+Math.sin(t/28)*20,0,6.283); cx.fill();
  cx.globalAlpha=1;
}

let hidden=false;
D.addEventListener("visibilitychange",()=>{hidden=D.hidden});
let last=performance.now();
function loop(now){
  const dt=Math.min(now-last,50); last=now;
  if(!hidden){
    if(depth)pushLight();
    if(alive){
      if(!reduce.matches)t+=dt/16.7;
      cx.clearRect(0,0,W,H);
      (PAINT[curTheme()]||PAINT.warm)();
    }
  }
  requestAnimationFrame(loop);
}
addEventListener("resize",fit); fit(); requestAnimationFrame(loop);

/* ══════════ ม่านสลับธีม ══════════ */
const origSetTheme=window.setTheme;
window.setTheme=function(theme,ev){
  const w=WMAP[theme];
  const go=()=>{ origSetTheme(theme); syncSwatches(); };
  if(!w||reduce.matches||theme===curTheme()){go();return}
  const e=ev||window.event;
  const x=e&&e.clientX?e.clientX:innerWidth/2, y=e&&e.clientY?e.clientY:innerHeight/2;
  wipe.style.setProperty("--wx",(x/innerWidth*100).toFixed(1)+"%");
  wipe.style.setProperty("--wy",(y/innerHeight*100).toFixed(1)+"%");
  wipe.style.background=`linear-gradient(135deg,${w.sw[1]},${w.sw[2]})`;
  wipe.querySelector("b").textContent=isTH()?w.th:w.en;
  wipe.classList.remove("go"); void wipe.offsetWidth; wipe.classList.add("go");
  setTimeout(go,340);
  setTimeout(()=>wipe.classList.remove("go"),950);
};

/* ══════════ ตัวเลือกธีม 8 โลก + สวิตช์ ══════════ */
function swatchHTML(){
  return WORLDS.map(w=>
   `<button class="dim-sw ${w.k}" data-tk="${w.k}" title="${w.en}">
      <span class="dots">${w.sw.map(c=>`<i style="background:${c}"></i>`).join("")}</span>
      <span class="nm"><b>${w.th}</b><span>${w.en}</span></span>
    </button>`).join("");
}
function rowsHTML(){
  return `<div class="dim-row">
      <div><div class="t">พื้นหลังมีชีวิต</div><div class="s">ภาพเคลื่อนไหวประจำแต่ละธีม</div></div>
      <span class="dim-tg" data-flag="alive" role="switch" tabindex="0" aria-checked="${alive}"></span></div>
    <div class="dim-row">
      <div><div class="t">ความลึก 3 มิติ</div><div class="s">การ์ดย่อยเอียงเล็กน้อย · เงาตามแสง</div></div>
      <span class="dim-tg" data-flag="depth" role="switch" tabindex="0" aria-checked="${depth}"></span></div>
    <div class="dim-row">
      <div><div class="t">แสงตามการเอียงเครื่อง</div><div class="s">ใช้เซนเซอร์มือถือขยับแสงทั้งจอ</div></div>
      <span class="dim-tg" data-flag="gyro" role="switch" tabindex="0" aria-checked="${gyro}"></span></div>`;
}
function buildPickers(){
  D.querySelectorAll(".theme-grid,.theme-grid-profile").forEach(g=>{
    if(g.dataset.dim)return;
    g.dataset.dim="1"; g.removeAttribute("style");
    g.className=(g.className||"")+" dim-themes";
    g.innerHTML=swatchHTML();
    const rows=D.createElement("div");
    rows.style.cssText="margin-top:12px"; rows.innerHTML=rowsHTML();
    g.parentNode.insertBefore(rows,g.nextSibling);
  });
  syncSwatches();
}
function syncSwatches(){
  const c=curTheme();
  D.querySelectorAll(".dim-sw").forEach(b=>b.classList.toggle("active",b.dataset.tk===c));
}
function syncRows(){
  D.querySelectorAll(".dim-tg").forEach(t=>{
    const f=t.dataset.flag;
    t.setAttribute("aria-checked", f==="alive"?alive : f==="depth"?depth : gyro);
  });
}
D.addEventListener("click",e=>{
  const b=e.target.closest(".dim-sw");
  if(b){window.setTheme(b.dataset.tk,e);return}
  const tg=e.target.closest(".dim-tg");
  if(!tg)return;
  toggleFlag(tg.dataset.flag);
});
D.addEventListener("keydown",e=>{
  const tg=e.target.closest&&e.target.closest(".dim-tg");
  if(tg&&(e.key===" "||e.key==="Enter")){e.preventDefault();toggleFlag(tg.dataset.flag)}
});
function toggleFlag(f){
  if(f==="alive"){alive=!alive;LSs("alive",alive)}
  else if(f==="depth"){depth=!depth;LSs("depth",depth);
    if(!depth){clearTilt();root.style.setProperty("--lnx",0);root.style.setProperty("--lny",-.45)}}
  else if(f==="gyro"){
    if(!gyro){enableGyro().then(ok=>{gyro=ok;LSs("gyro",ok);syncRows();
      if(!ok&&typeof toast==="function")toast("อุปกรณ์นี้ไม่รองรับ หรือไม่ได้อนุญาตเซนเซอร์","ti-alert-triangle")})}
    else{gyro=false;LSs("gyro",false);removeEventListener("deviceorientation",onTilt)}
  }
  applyFlags(); syncRows();
}

/* สร้างเมื่อ DOM พร้อม และเฝ้าดูกรณี UI ถูก render ใหม่ */
function boot(){ buildPickers(); syncRows(); }
if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",boot); else boot();
new MutationObserver(()=>{
  if(D.querySelector(".theme-grid:not([data-dim]),.theme-grid-profile:not([data-dim])"))buildPickers();
}).observe(D.body,{childList:true,subtree:true});
reduce.addEventListener("change",()=>{applyFlags();clearTilt()});
})();

;

/* ══════════════════════════════════════════════════════════════════
   CARLAB — ระบบข้อมูลรถเชิงลึก
   · สเปก / อุปกรณ์ / ตารางบำรุงรักษา / อะไหล่ที่เข้ากันได้
   · คะแนนสุขภาพรถรายระบบ · ค่าใช้จ่ายต่อ กม. · สมุดบันทึกการเดินทาง
   · วิดเจ็ตแดชบอร์ด: สิ่งที่ต้องทำ / สุขภาพ / ค่าใช้จ่าย / การขับขี่วันนี้
   ══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
const D=document, $=id=>D.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const EN=()=>(window.lang||"th")==="en";
const T=(th,en)=>EN()?en:th;
const num=n=>Number(n||0).toLocaleString("th-TH");
const LG=(k,d)=>{try{const v=localStorage.getItem("spire_"+k);return v?JSON.parse(v):d}catch(e){return d}};
const LSt=(k,v)=>{try{localStorage.setItem("spire_"+k,JSON.stringify(v))}catch(e){}};
const cars=()=>{try{return window.garage?window.garage():LG("garage",[])}catch(e){return LG("garage",[])}};

/* ═══════════ ฐานความรู้ประมาณการสเปก ═══════════
   ใช้ heuristic จากยี่ห้อ/บอดี้/ปี เป็นค่าตั้งต้น แล้วให้ AI ยืนยันทับได้
   ทุกค่าที่ยังไม่ยืนยันจะติดป้าย "ประมาณการ" ชัดเจน */
const BRANDS={
 toyota:{o:"ญี่ปุ่น",oe:"Japan",rel:93,parts:"หาง่ายมาก",partsE:"Very easy",svc:"ศูนย์ทั่วประเทศ",svcE:"Nationwide"},
 honda:{o:"ญี่ปุ่น",oe:"Japan",rel:91,parts:"หาง่ายมาก",partsE:"Very easy",svc:"ศูนย์ทั่วประเทศ",svcE:"Nationwide"},
 isuzu:{o:"ญี่ปุ่น",oe:"Japan",rel:92,parts:"หาง่ายมาก",partsE:"Very easy",svc:"เน้นกระบะ",svcE:"Pickup focus"},
 mitsubishi:{o:"ญี่ปุ่น",oe:"Japan",rel:87,parts:"หาง่าย",partsE:"Easy",svc:"ครอบคลุมดี",svcE:"Good coverage"},
 nissan:{o:"ญี่ปุ่น",oe:"Japan",rel:86,parts:"หาง่าย",partsE:"Easy",svc:"ครอบคลุมดี",svcE:"Good coverage"},
 mazda:{o:"ญี่ปุ่น",oe:"Japan",rel:88,parts:"ปานกลาง",partsE:"Moderate",svc:"ครอบคลุมดี",svcE:"Good coverage"},
 suzuki:{o:"ญี่ปุ่น",oe:"Japan",rel:85,parts:"ปานกลาง",partsE:"Moderate",svc:"ปานกลาง",svcE:"Moderate"},
 ford:{o:"สหรัฐฯ",oe:"USA",rel:80,parts:"ปานกลาง",partsE:"Moderate",svc:"ปานกลาง",svcE:"Moderate"},
 chevrolet:{o:"สหรัฐฯ",oe:"USA",rel:74,parts:"หายาก",partsE:"Limited",svc:"จำกัด",svcE:"Limited"},
 bmw:{o:"เยอรมนี",oe:"Germany",rel:82,parts:"ราคาสูง",partsE:"Pricey",svc:"ศูนย์เฉพาะ",svcE:"Specialist"},
 "mercedes-benz":{o:"เยอรมนี",oe:"Germany",rel:83,parts:"ราคาสูง",partsE:"Pricey",svc:"ศูนย์เฉพาะ",svcE:"Specialist"},
 benz:{o:"เยอรมนี",oe:"Germany",rel:83,parts:"ราคาสูง",partsE:"Pricey",svc:"ศูนย์เฉพาะ",svcE:"Specialist"},
 volvo:{o:"สวีเดน",oe:"Sweden",rel:84,parts:"ราคาสูง",partsE:"Pricey",svc:"ศูนย์เฉพาะ",svcE:"Specialist"},
 mg:{o:"จีน/อังกฤษ",oe:"China/UK",rel:76,parts:"ปานกลาง",partsE:"Moderate",svc:"กำลังขยาย",svcE:"Growing"},
 byd:{o:"จีน",oe:"China",rel:80,parts:"ปานกลาง",partsE:"Moderate",svc:"กำลังขยาย",svcE:"Growing"},
 gwm:{o:"จีน",oe:"China",rel:77,parts:"ปานกลาง",partsE:"Moderate",svc:"กำลังขยาย",svcE:"Growing"},
 haval:{o:"จีน",oe:"China",rel:77,parts:"ปานกลาง",partsE:"Moderate",svc:"กำลังขยาย",svcE:"Growing"},
 tesla:{o:"สหรัฐฯ",oe:"USA",rel:83,parts:"สั่งเฉพาะ",partsE:"Order-in",svc:"ศูนย์เฉพาะ",svcE:"Specialist"},
 hyundai:{o:"เกาหลี",oe:"Korea",rel:84,parts:"ปานกลาง",partsE:"Moderate",svc:"ปานกลาง",svcE:"Moderate"},
 kia:{o:"เกาหลี",oe:"Korea",rel:84,parts:"ปานกลาง",partsE:"Moderate",svc:"ปานกลาง",svcE:"Moderate"}
};
const BODY={
 sedan:{th:"ซีดาน",en:"Sedan",seat:5,door:4,kerb:1320,tank:50,l100:7.0,cc:1600,tire:"195/65 R15",batt:"NS60 / 45Ah",wiper:'24" + 16"',oil:"3.7 ลิตร"},
 hatchback:{th:"แฮทช์แบ็ก",en:"Hatchback",seat:5,door:5,kerb:1150,tank:42,l100:6.2,cc:1300,tire:"185/60 R15",batt:"NS40 / 35Ah",wiper:'22" + 14"',oil:"3.2 ลิตร"},
 suv:{th:"เอสยูวี",en:"SUV",seat:7,door:5,kerb:1850,tank:65,l100:9.2,cc:2400,tire:"225/65 R17",batt:"75D23L / 65Ah",wiper:'26" + 16"',oil:"4.5 ลิตร"},
 pickup:{th:"กระบะ",en:"Pickup",seat:5,door:4,kerb:1950,tank:76,l100:8.6,cc:2500,tire:"265/65 R17",batt:"105D31R / 80Ah",wiper:'22" + 20"',oil:"7.0 ลิตร"},
 mpv:{th:"เอ็มพีวี",en:"MPV",seat:7,door:5,kerb:1650,tank:60,l100:8.4,cc:2000,tire:"215/60 R17",batt:"75D23L / 65Ah",wiper:'26" + 16"',oil:"4.2 ลิตร"},
 ev:{th:"ไฟฟ้า",en:"Electric",seat:5,door:5,kerb:1720,tank:0,l100:0,cc:0,tire:"215/55 R18",batt:"12V เสริม 45Ah",wiper:'24" + 18"',oil:"— (ไม่มี)"}
};
const EVBRAND=["tesla","byd"];
function normBrand(s){return String(s||"").trim().toLowerCase().replace(/\s+/g,"-")}
function bodyOf(c){
  const t=String(c.type||"").toLowerCase();
  if(BODY[t])return t;
  const n=(c.name||"")+" "+(c.model||"");
  if(EVBRAND.includes(normBrand(c.make)))return "ev";
  if(/ev|electric|ไฟฟ้า/i.test(n))return "ev";
  if(/pickup|d-max|hilux|ranger|triton|navara|กระบะ/i.test(n))return "pickup";
  if(/suv|fortuner|pajero|crv|cr-v|everest|mu-x|x-trail/i.test(n))return "suv";
  if(/mpv|innova|veloz|xpander|carnival/i.test(n))return "mpv";
  if(/jazz|yaris|march|swift|brio|hatch/i.test(n))return "hatchback";
  return "sedan";
}
/* สเปกประมาณการ + ค่าที่ AI/ผู้ใช้ยืนยันแล้วจะทับ */
function specOf(c){
  const b=BODY[bodyOf(c)], br=BRANDS[normBrand(c.make)]||
    {o:"ไม่ระบุ",oe:"Unknown",rel:80,parts:"ปานกลาง",partsE:"Moderate",svc:"ปานกลาง",svcE:"Moderate"};
  const yr=parseInt(c.year)||new Date().getFullYear()-5;
  const base={body:b,brand:br,year:yr,ev:bodyOf(c)==="ev"};
  const saved=LG("carlab_spec_"+c.id,null);
  return Object.assign(base,{confirmed:saved||null});
}
function sv(spec,key,fallback){
  const cf=spec.confirmed;
  if(cf&&cf[key]!=null&&cf[key]!=="")return {v:cf[key],est:false};
  return {v:fallback,est:true};
}

/* ═══════════ ตารางบำรุงรักษา ═══════════ */
const PLAN=[
 {k:"oil",     th:"เปลี่ยนน้ำมันเครื่อง",   en:"Engine oil",       km:10000, mo:6,  sys:"engine", ev:false},
 {k:"airf",    th:"ไส้กรองอากาศ",          en:"Air filter",       km:20000, mo:12, sys:"engine", ev:false},
 {k:"cabin",   th:"กรองแอร์ในห้องโดยสาร",   en:"Cabin filter",     km:20000, mo:12, sys:"comfort",ev:true},
 {k:"plug",    th:"หัวเทียน",              en:"Spark plugs",      km:40000, mo:36, sys:"engine", ev:false},
 {k:"brakepad",th:"ผ้าเบรก",               en:"Brake pads",       km:40000, mo:36, sys:"brake",  ev:true},
 {k:"brakeoil",th:"น้ำมันเบรก",             en:"Brake fluid",      km:40000, mo:24, sys:"brake",  ev:true},
 {k:"tire",    th:"ยาง 4 เส้น",            en:"Tyres",            km:50000, mo:48, sys:"tire",   ev:true},
 {k:"align",   th:"ตั้งศูนย์ถ่วงล้อ",        en:"Wheel alignment",  km:20000, mo:12, sys:"tire",   ev:true},
 {k:"batt",    th:"แบตเตอรี่",              en:"Battery",          km:60000, mo:36, sys:"elec",   ev:true},
 {k:"coolant", th:"น้ำหล่อเย็น",            en:"Coolant",          km:60000, mo:36, sys:"engine", ev:false},
 {k:"gearoil", th:"น้ำมันเกียร์",           en:"Gearbox oil",      km:60000, mo:48, sys:"drive",  ev:false},
 {k:"belt",    th:"สายพานหน้าเครื่อง",      en:"Drive belt",       km:80000, mo:60, sys:"engine", ev:false},
 {k:"shock",   th:"โช้คอัพ",               en:"Shock absorbers",  km:80000, mo:60, sys:"susp",   ev:true}
];
const SYS={
 engine:{th:"เครื่องยนต์",en:"Engine",ic:"ti-engine"},
 brake:{th:"ระบบเบรก",en:"Brakes",ic:"ti-disc"},
 tire:{th:"ยางและล้อ",en:"Tyres & wheels",ic:"ti-circle-dotted"},
 elec:{th:"ไฟฟ้าและแบต",en:"Electrical",ic:"ti-battery-3"},
 drive:{th:"ระบบส่งกำลัง",en:"Drivetrain",ic:"ti-settings-automation"},
 susp:{th:"ช่วงล่าง",en:"Suspension",ic:"ti-arrows-vertical"},
 comfort:{th:"ความสบาย",en:"Comfort",ic:"ti-air-conditioning"}
};
/* ผู้ใช้ปรับรอบเองได้ต่อคัน — เก็บทับค่ามาตรฐาน */
const ivKey=id=>"carlab_iv_"+id;
const getIv=id=>LG(ivKey(id),{})||{};
const setIv=(id,v)=>LSt(ivKey(id),v);
const planFor=c=>{
  const ev=bodyOf(c)==="ev", iv=getIv(c.id);
  return PLAN.filter(p=>!ev||p.ev).map(p=>{
    const o=iv[p.k];
    return o?Object.assign({},p,{km:Number(o.km)||p.km,mo:Number(o.mo)||p.mo,custom:true}):p;
  });
};
/* งานที่ผู้ใช้เพิ่มเอง */
const getTodos=id=>LG("carlab_todo_"+id,[])||[];
const setTodos=(id,v)=>LSt("carlab_todo_"+id,v);

/* บันทึกของผู้ใช้ต่อคัน */
const logKey=id=>"carlab_log_"+id;
const getLog=id=>LG(logKey(id),{services:[],fuel:[],trips:[]});
const setLog=(id,v)=>LSt(logKey(id),v);

/* เลขไมล์ที่ใช้คำนวณ — ถ้า ODO engine พร้อมใช้ค่าประมาณล่าสุด */
const KM=c=>{try{if(window.SpireODO)return window.SpireODO.value(c)}catch(e){}
  return parseInt(c.mileage)||0};

/* กม. ล่าสุดที่ทำรายการนั้น */
function lastDone(c,k){
  const l=getLog(c.id).services.filter(s=>s.k===k);
  if(!l.length)return null;
  return l.sort((a,b)=>(b.km||0)-(a.km||0))[0];
}
/* สถานะรายการ: เหลืออีกกี่ กม. */
function dueOf(c,p){
  const km=KM(c);
  const d=lastDone(c,p.k);
  const since=d?Math.max(0,km-(parseInt(d.km)||0)):km%p.km;
  const left=p.km-since;
  const pct=Math.max(0,Math.min(100,Math.round(left/p.km*100)));
  return {since,left,pct,logged:!!d,lastKm:d?parseInt(d.km)||0:null};
}
/* คะแนนรายระบบ 0-100 */
function health(c){
  const items=planFor(c).map(p=>({p,d:dueOf(c,p)}));
  const bySys={};
  items.forEach(({p,d})=>{(bySys[p.sys]=bySys[p.sys]||[]).push(d.pct)});
  const sys=Object.entries(bySys).map(([k,arr])=>({
    k,...SYS[k],score:Math.round(arr.reduce((a,b)=>a+b,0)/arr.length)}));
  const yr=parseInt(c.year)||0, age=yr?new Date().getFullYear()-yr:6;
  const agePen=Math.min(12,Math.max(0,(age-8)*1.5));
  const total=Math.max(0,Math.round(sys.reduce((a,s)=>a+s.score,0)/(sys.length||1)-agePen));
  return {total,sys:sys.sort((a,b)=>a.score-b.score),items,age};
}
/* คะแนน 0-100 ถูกถอดออกจากหน้าจอทั้งหมดแล้ว — ระบบต่อกับรถไม่ได้จริง
   จะรู้สภาพเครื่องได้ต้องอ่านจาก OBD ซึ่งยังไม่มี ตัวเลขที่เดาเอาจึงหลอกผู้ใช้
   สิ่งที่บอกได้ตรงไปตรงมาคือ "อะไรเลยกำหนด" กับ "อะไรยังไม่เคยบันทึก" เท่านั้น */
function status(c){
  const items=planFor(c).map(p=>({p,d:dueOf(c,p)}));
  const logged=items.filter(({p})=>lastDone(c,p.k)!=null);
  const over=items.filter(({d})=>d.left<=0);
  const soon=items.filter(({d})=>d.left>0&&d.left<=2000);
  return {items,total:items.length,logged:logged.length,
    unlogged:items.length-logged.length,over,soon};
}
const hColor=s=>s>=70?"var(--ok)":s>=40?"var(--accent-2)":"var(--danger)";
const hWord=s=>s>=85?T("พร้อมใช้งานเต็มที่","Excellent"):s>=70?T("สภาพดี","Good"):
  s>=45?T("ควรเข้าเช็ก","Service soon"):T("ต้องเข้าอู่ด่วน","Needs attention");

/* ═══════════ ค่าใช้จ่าย ═══════════ */
function costOf(c){
  const l=getLog(c.id);
  const all=[...l.services.map(s=>({...s,type:"svc"})),...l.fuel.map(f=>({...f,type:"fuel"}))];
  const now=new Date(), ms=[];
  for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    ms.push({y:d.getFullYear(),m:d.getMonth(),total:0})}
  all.forEach(x=>{const d=new Date(x.date||0);
    const b=ms.find(z=>z.y===d.getFullYear()&&z.m===d.getMonth());
    if(b)b.total+=Number(x.amount)||0});
  const totalAll=all.reduce((a,x)=>a+(Number(x.amount)||0),0);
  const kms=l.fuel.map(f=>parseInt(f.km)||0).filter(Boolean).sort((a,b)=>a-b);
  const span=kms.length>1?kms[kms.length-1]-kms[0]:0;
  return {months:ms,thisMonth:ms[ms.length-1].total,totalAll,span,
          perKm:span>0?totalAll/span:0,entries:all.sort((a,b)=>new Date(b.date)-new Date(a.date))};
}

/* ═══════════ AI เติมสเปก (ถ้าหลังบ้านพร้อม) ═══════════ */
async function askAI(c){
  const url=(window.BACKEND_URL||"")+"/api/ai";
  const q=`ให้ข้อมูลสเปกรถ ${c.make||""} ${c.model||""} ปี ${c.year||""} สำหรับตลาดไทย `+
    `ตอบเป็น JSON เท่านั้น ไม่ต้องมีคำอธิบาย ใช้คีย์: engine (เช่น "1.8L 4 สูบ เบนซิน"), power (แรงม้า ตัวเลข), `+
    `torque (นิวตันเมตร ตัวเลข), gearbox, drive (ขับหน้า/หลัง/4WD), seats (ตัวเลข), tank (ลิตร ตัวเลข), `+
    `l100 (ลิตรต่อ100กม. ตัวเลข), tire (ขนาดยาง), batt (แบตเตอรี่), wiper (ขนาดใบปัดน้ำฝน), oil (ปริมาณน้ำมันเครื่อง), `+
    `safety (อาร์เรย์ของสตริงอุปกรณ์ความปลอดภัยที่มี)`;
  const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({contents:[{role:"user",parts:[{text:q}]}],temp:.2})});
  if(!r.ok)throw new Error("ai "+r.status);
  const d=await r.json();
  let s=(d.text||"").replace(/```json/gi,"").replace(/```/g,"").trim();
  const m=s.match(/\{[\s\S]*\}/); if(m)s=m[0];
  return JSON.parse(s);
}

/* ═══════════ โมดัลรายละเอียดรถ ═══════════ */
let modal=null, curCar=null, curTab="spec";
function ensureModal(){
  if(modal)return modal;
  modal=D.createElement("div");
  modal.className="mag-modal-backdrop"; modal.id="clModal";
  modal.innerHTML=`<div class="mag-modal-sheet" role="dialog" aria-modal="true">
    <div class="cl-head">
      <div class="ic"><i class="ti ti-car"></i></div>
      <div style="flex:1;min-width:0"><h2 id="clName">—</h2><div class="sub" id="clSub">—</div></div>
      <button class="mag-modal-close" id="clX" aria-label="ปิด"><i class="ti ti-x"></i></button>
    </div>
    <div class="cl-tabs" role="tablist" id="clTabs"></div>
    <div class="mag-modal-body" id="clBody"></div>
  </div>`;
  D.body.appendChild(modal);
  modal.addEventListener("click",e=>{if(e.target===modal)closeCL()});
  $("clX").onclick=closeCL;
  D.addEventListener("keydown",e=>{if(e.key==="Escape"&&modal.classList.contains("show"))closeCL()});
  return modal;
}
function closeCL(){if(modal)modal.classList.remove("show")}
const TABS=[
 {k:"odo",   th:"เลขไมล์",     en:"Mileage",     ic:"ti-gauge"},
 {k:"spec",  th:"สเปก",       en:"Specs",       ic:"ti-list-details"},
 {k:"equip", th:"อุปกรณ์",     en:"Equipment",   ic:"ti-shield-check"},
 {k:"health",th:"บันทึกของรถ",  en:"Records",     ic:"ti-clipboard-text"},
 {k:"plan",  th:"บำรุงรักษา",  en:"Maintenance", ic:"ti-calendar-check"},
 {k:"parts", th:"อะไหล่",      en:"Parts",       ic:"ti-tools"},
 {k:"cost",  th:"ค่าใช้จ่าย",   en:"Costs",       ic:"ti-coin"},
 {k:"trip",  th:"สมุดเดินทาง", en:"Trips",       ic:"ti-route"}
];
window.openCarDetail=function(id){
  const c=cars().find(x=>x.id===id); if(!c)return;
  curCar=c; ensureModal();
  $("clName").textContent=c.name||`${c.make||""} ${c.model||""}`.trim()||T("รถของฉัน","My car");
  const b=BODY[bodyOf(c)];
  $("clSub").textContent=`${c.year||"—"} · ${T(b.th,b.en)} · ${num(KM(c))} ${T("กม.","km")}`;
  $("clTabs").innerHTML=TABS.map(t=>
    `<button class="cl-tab" role="tab" data-tab="${t.k}" aria-selected="${t.k===curTab}">
       <i class="ti ${t.ic}"></i> ${T(t.th,t.en)}</button>`).join("");
  renderTab();
  modal.classList.add("show");
};
D.addEventListener("click",e=>{
  const t=e.target.closest("[data-tab]");
  if(t&&t.closest("#clTabs")){curTab=t.dataset.tab;
    $("clTabs").querySelectorAll(".cl-tab").forEach(x=>x.setAttribute("aria-selected",x.dataset.tab===curTab));
    renderTab();}
});
function renderTab(){
  const c=curCar; if(!c)return;
  const f={spec:paneSpec,equip:paneEquip,health:paneHealth,plan:panePlan,
           parts:paneParts,cost:paneCost,trip:paneTrip,
           odo:(window.odoPane||paneSpec)}[curTab]||paneSpec;
  $("clBody").innerHTML=`<div class="cl-pane on">${f(c)}</div>`;
  if(curTab==="odo"&&window.odoNotifRow)window.odoNotifRow();
}
const row=(k,o)=>`<div class="cl-spec"><span class="k">${esc(k)}</span>
  <span class="v">${esc(o.v)}${o.est?' <span class="cl-est">'+T("ประมาณการ","EST")+'</span>':''}</span></div>`;

function paneSpec(c){
  const s=specOf(c), b=s.body, br=s.brand, cf=s.confirmed;
  const P=(k,fb)=>sv(s,k,fb);
  const bd=bodyOf(c);
  const fuel=s.ev?"":bd==="pickup"?T("ดีเซล","diesel")
    :bd==="suv"?T("เบนซินหรือดีเซล","petrol or diesel"):T("เบนซิน","petrol");
  const eng=s.ev?T("มอเตอร์ไฟฟ้า","Electric motor"):`${(b.cc/1000).toFixed(1)}L ${fuel}`;
  return `
  <div class="cl-grp"><h4>${T("เครื่องยนต์และการขับเคลื่อน","Powertrain")}</h4>
    ${row(T("เครื่องยนต์","Engine"),P("engine",eng))}
    ${s.ev?"":row(T("ความจุกระบอกสูบ","Displacement"),P("cc",b.cc+" cc"))}
    ${row(T("แรงม้าโดยประมาณ","Power"),P("power",Math.round(b.cc*0.075)+" hp"))}
    ${row(T("แรงบิด","Torque"),P("torque",Math.round(b.cc*0.11)+" Nm"))}
    ${row(T("ระบบเกียร์","Gearbox"),P("gearbox",s.ev?T("เกียร์เดียว","Single speed"):T("อัตโนมัติ","Automatic")))}
    ${row(T("ระบบขับเคลื่อน","Drive"),P("drive",bodyOf(c)==="pickup"?T("ขับหลัง / 4WD","RWD / 4WD"):T("ขับหน้า","FWD")))}
  </div>
  <div class="cl-grp"><h4>${T("ตัวถังและความจุ","Body & capacity")}</h4>
    ${row(T("ประเภทตัวถัง","Body type"),{v:T(b.th,b.en),est:false})}
    ${row(T("จำนวนที่นั่ง","Seats"),P("seats",b.seat+T(" ที่นั่ง"," seats")))}
    ${row(T("จำนวนประตู","Doors"),{v:b.door,est:true})}
    ${row(T("น้ำหนักตัวรถ","Kerb weight"),{v:num(b.kerb)+" kg",est:true})}
    ${s.ev?"":row(T("ความจุถังน้ำมัน","Fuel tank"),P("tank",b.tank+" "+T("ลิตร","L")))}
  </div>
  <div class="cl-grp"><h4>${T("อัตราสิ้นเปลือง","Efficiency")}</h4>
    ${s.ev
      ? row(T("ใช้ไฟโดยประมาณ","Consumption"),{v:"16 kWh/100 "+T("กม.","km"),est:true})
      : row(T("กินน้ำมันโดยประมาณ","Fuel economy"),P("l100",b.l100+" "+T("ลิตร/100 กม.","L/100km")))}
    ${s.ev?"":row(T("เทียบเป็น กม./ลิตร","Equivalent"),{v:(100/b.l100).toFixed(1)+" "+T("กม./ลิตร","km/L"),est:true})}
    ${s.ev?"":row(T("ระยะวิ่งต่อถัง","Range per tank"),{v:num(Math.round(b.tank*100/b.l100))+" "+T("กม.","km"),est:true})}
  </div>
  <div class="cl-grp"><h4>${T("แบรนด์และการดูแล","Brand & ownership")}</h4>
    ${row(T("ประเทศต้นกำเนิด","Origin"),{v:T(br.o,br.oe),est:false})}
    ${row(T("คะแนนความทนทาน","Reliability"),{v:br.rel+"/100",est:true})}
    ${row(T("การหาอะไหล่","Parts availability"),{v:T(br.parts,br.partsE),est:false})}
    ${row(T("เครือข่ายศูนย์บริการ","Service network"),{v:T(br.svc,br.svcE),est:false})}
    ${row(T("อายุรถ","Vehicle age"),{v:(new Date().getFullYear()-(parseInt(c.year)||new Date().getFullYear()))+" "+T("ปี","yrs"),est:false})}
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
    <button class="btn primary" id="clAI"><i class="ti ti-sparkles"></i> ${T("ให้ AI ยืนยันสเปก","Confirm with AI")}</button>
    ${cf?`<button class="btn" id="clAIclear"><i class="ti ti-eraser"></i> ${T("ล้างค่าที่ยืนยัน","Clear")}</button>`:""}
  </div>
  <p style="font-size:11.5px;color:var(--faint);margin-top:10px;line-height:1.6">
    <i class="ti ti-info-circle"></i> ${T(
      "ค่าที่ติดป้าย ‘ประมาณการ’ คำนวณจากยี่ห้อ ประเภทตัวถัง และปีรถ ใช้เป็นแนวทางคร่าวๆ — กดปุ่มด้านบนให้ AI ช่วยยืนยันตัวเลขจริงของรุ่นคุณ",
      "Values marked EST are derived from brand, body type and year as a rough guide — use the button above to have AI confirm your exact model.")}</p>`;
}

function paneEquip(c){
  const yr=parseInt(c.year)||2015, s=specOf(c), cf=s.confirmed;
  const seg=BRANDS[normBrand(c.make)]?.rel||80;
  const has=(fromYear,premOnly)=>yr>=fromYear&&(!premOnly||seg>=82);
  const SAFE=[
   [T("ถุงลมนิรภัยคู่หน้า","Front airbags"),has(2008),"ti-shield"],
   [T("ถุงลมด้านข้าง/ม่าน","Side & curtain airbags"),has(2016,true),"ti-shield"],
   [T("เบรก ABS","ABS"),has(2010),"ti-disc"],
   [T("ระบบกระจายแรงเบรก EBD","EBD"),has(2012),"ti-disc"],
   [T("ควบคุมการทรงตัว ESC","Stability control"),has(2015),"ti-steering-wheel"],
   [T("สัญญาณกันขโมย/อิมโมบิไลเซอร์","Immobiliser"),has(2012),"ti-lock"],
   [T("กล้องมองหลัง","Reverse camera"),has(2016),"ti-camera"],
   [T("เซนเซอร์ถอยจอด","Parking sensors"),has(2015),"ti-parking"],
   [T("เตือนจุดอับสายตา","Blind spot monitor"),has(2019,true),"ti-eye"],
   [T("เบรกฉุกเฉินอัตโนมัติ","Autonomous braking"),has(2019,true),"ti-alert-triangle"],
   [T("ครูสคอนโทรลแบบแปรผัน","Adaptive cruise"),has(2020,true),"ti-car"],
   [T("เตือนออกนอกเลน","Lane departure"),has(2019,true),"ti-road"]
  ];
  const COMF=[
   [T("แอร์อัตโนมัติ","Auto climate"),has(2014),"ti-air-conditioning"],
   [T("กุญแจอัจฉริยะ/ปุ่มสตาร์ท","Keyless & push start"),has(2014),"ti-key"],
   [T("จอสัมผัสกลาง","Touchscreen"),has(2015),"ti-device-tablet"],
   [T("Apple CarPlay / Android Auto"),has(2018),"ti-brand-apple"],
   [T("เชื่อมบลูทูธ","Bluetooth"),has(2012),"ti-bluetooth"],
   [T("พวงมาลัยมัลติฟังก์ชัน","Multifunction wheel"),has(2013),"ti-steering-wheel"],
   [T("เบาะปรับไฟฟ้า","Power seats"),has(2017,true),"ti-armchair"],
   [T("ซันรูฟ","Sunroof"),has(2018,true),"ti-sun"],
   [T("ชาร์จไร้สาย","Wireless charging"),has(2020,true),"ti-battery-charging"]
  ];
  const grp=(title,arr)=>`<div class="cl-grp"><h4>${title}</h4><div class="cl-chips">${
    arr.map(([n,ok,ic])=>`<span class="cl-chip ${ok?"yes":"no"}">
      <i class="ti ${ok?"ti-check":"ti-minus"}"></i>${esc(n)}</span>`).join("")}</div></div>`;
  const extra=cf&&Array.isArray(cf.safety)&&cf.safety.length
    ? `<div class="cl-grp"><h4>${T("ยืนยันโดย AI","Confirmed by AI")}</h4><div class="cl-chips">${
        cf.safety.map(x=>`<span class="cl-chip yes"><i class="ti ti-check"></i>${esc(x)}</span>`).join("")}</div></div>`
    : "";
  return extra+grp(T("ความปลอดภัย","Safety"),SAFE)+grp(T("ความสะดวกสบาย","Comfort & tech"),COMF)+
   `<p style="font-size:11.5px;color:var(--faint);line-height:1.6">
     <i class="ti ti-info-circle"></i> ${T(
       "รายการนี้ประเมินจากปีรถและระดับของแบรนด์ รุ่นย่อยต่างกันอุปกรณ์อาจไม่เท่ากัน — กด ‘ให้ AI ยืนยันสเปก’ ในแท็บสเปกเพื่อความแม่นยำ",
       "Estimated from model year and brand tier; trim levels differ. Use ‘Confirm with AI’ in the Specs tab for accuracy.")}</p>`;
}

/* แท็บ "บันทึกของรถ" — เจ้าของกรอกเองได้ทุกช่อง
   เปลี่ยนอะไรไปเมื่อไร ที่เลขไมล์เท่าไร และมีอาการอะไรอยู่บ้าง
   ไม่มีคะแนนรวมให้ดู เพราะเว็บต่อกับรถไม่ได้ จะสรุปสภาพเครื่องแทนเจ้าของไม่ได้ */
function paneHealth(c){
  const st=status(c), km=KM(c);
  const sym=getSymptoms(c.id);
  const rows=st.items.slice().sort((a,b)=>a.d.left-b.d.left).map(({p,d})=>{
    const last=lastRecord(c,p.k);
    return `<div class="cl-rec${d.left<=0&&d.logged?" over":""}">
      <div class="hd"><b>${T(p.th,p.en)}</b>
        <span class="ev">${d.logged
          ? (d.left<=0?T("เลยกำหนดแล้ว","overdue")
             :T(`อีก ${num(d.left)} กม.`,`${num(d.left)} km left`))
          : T("ยังไม่เคยบันทึก","never recorded")}</span></div>
      <div class="in">
        <label><small>${T("เปลี่ยนล่าสุดวันที่","Last changed")}</small>
          <input type="date" data-rd="${p.k}" value="${esc(last?last.date:"")}"></label>
        <label><small>${T("ที่เลขไมล์ (กม.)","At odometer (km)")}</small>
          <input type="number" inputmode="numeric" data-rk="${p.k}"
            placeholder="${num(km)}" value="${last&&last.km?esc(last.km):""}"></label>
        <label><small>${T("ค่าใช้จ่าย (บาท)","Cost (baht)")}</small>
          <input type="number" inputmode="numeric" data-ra="${p.k}"
            placeholder="0" value="${last&&last.amount?esc(last.amount):""}"></label>
        <button class="btn primary" data-rsave="${p.k}"><i class="ti ti-check"></i></button>
      </div>
      <div class="nt"><input type="text" data-rn="${p.k}"
        placeholder="${T("ยี่ห้อที่ใช้ อู่ที่ทำ หรือหมายเหตุ","Brand used, which garage, or a note")}"
        value="${esc(last&&last.note||"")}"></div>
    </div>`}).join("");

  return `
  <div class="cl-grp"><h4>${T("อาการที่พบอยู่ตอนนี้","Symptoms you've noticed")}</h4>
    <p class="cl-hint">${T(
      "จดไว้ตอนเจอ เดี๋ยวลืม พอเข้าอู่หรือคุยกับ AI จะเล่าได้ครบและตรง",
      "Note it when it happens — you'll forget. It makes talking to a garage or the AI far more accurate.")}</p>
    <div class="cl-symadd">
      <input type="text" id="symTxt" placeholder="${T(
        "เช่น มีเสียงเอี๊ยดตอนเลี้ยวซ้าย เฉพาะตอนเช้า","e.g. squeal when turning left, mornings only")}">
      <button class="btn primary" id="symAdd"><i class="ti ti-plus"></i>${T("เพิ่ม","Add")}</button>
    </div>
    ${sym.length?sym.map((x,i)=>`<div class="cl-sym">
        <span class="tx"><b>${esc(x.t)}</b><small>${esc(x.date)}${
          x.km?` · ${num(x.km)} ${T("กม.","km")}`:""}</small></span>
        <button class="cl-mini" data-symask="${i}" title="${T("ถาม AI เรื่องนี้","Ask the AI")}"><i class="ti ti-message-2"></i></button>
        <button class="cl-mini" data-symdel="${i}" title="${T("ลบ","Delete")}"><i class="ti ti-trash"></i></button>
      </div>`).join("")
      :`<p class="cl-hint" style="margin:0">${T("ยังไม่มีอาการที่บันทึกไว้","Nothing noted yet")}</p>`}
  </div>

  <div class="cl-grp"><h4>${T("เปลี่ยนอะไรไปแล้วบ้าง","What's been changed")}</h4>
    <p class="cl-hint">${T(
      `กรอกเท่าที่จำได้ ไม่ต้องครบก็ได้ ตอนนี้บันทึกไว้ ${st.logged} จาก ${st.total} รายการ — ` +
      "รายการที่ยังไม่กรอก ระบบจะไม่เดาให้ว่าถึงกำหนดหรือยัง",
      `Fill in what you remember — ${st.logged} of ${st.total} recorded so far. ` +
      "We won't guess about the ones you leave blank.")}</p>
    ${rows}
  </div>

  <p style="font-size:11.5px;color:var(--faint);line-height:1.7">
    <i class="ti ti-info-circle"></i> ${T(
      "SpireONE ไม่ได้ต่อสายกับรถ จึงไม่บอกว่ารถ ‘สุขภาพกี่เปอร์เซ็นต์’ เพราะจะเป็นการเดา ระบบบอกได้แค่สิ่งที่คุณกรอกไว้เทียบกับรอบบำรุงรักษามาตรฐาน การอ่านค่าจากตัวรถจริงต้องต่อ OBD-II ซึ่งยังไม่มีในเวอร์ชันนี้",
      "SpireONE isn't wired to your car, so it won't quote a health percentage — that would be a guess. It reports what you've entered against standard service intervals. Reading the car itself needs an OBD-II link, which this version doesn't have.")}</p>`;
}

/* ── บันทึกอาการ ── */
const symKey=id=>"carlab_sym_"+id;
const getSymptoms=id=>LG(symKey(id),[])||[];
const setSymptoms=(id,v)=>LSt(symKey(id),v);

/* รายการล่าสุดของงานหนึ่ง ๆ พร้อมรายละเอียดที่เจ้าของกรอกไว้ */
function lastRecord(c,k){
  const l=getLog(c.id).services.filter(s=>s.k===k)
    .sort((a,b)=>new Date(b.date)-new Date(a.date));
  return l[0]||null;
}

function panePlan(c){
  const items=planFor(c).map(p=>({p,d:dueOf(c,p)})).sort((a,b)=>a.d.pct-b.d.pct);
  const km=KM(c), todos=getTodos(c.id);
  return `
  <div class="cl-grp"><h4>${T("กำหนดถัดไป","Next due")}</h4>
    ${items.map(({p,d})=>`<div class="cl-mt">
      <span class="dot" style="background:${hColor(d.pct)}"></span>
      <span class="nm"><b>${T(p.th,p.en)}${p.custom?` <span class="cl-est">${T("ปรับเอง","custom")}</span>`:""}</b>
        <span>${T(`ทุก ${num(p.km)} กม. หรือ ${p.mo} เดือน`,`Every ${num(p.km)} km / ${p.mo} mo`)}</span></span>
      <span style="display:flex;align-items:center;gap:6px;flex-shrink:0">
        <span class="due" style="color:${hColor(d.pct)}">${d.left>0
          ? T(`อีก ${num(d.left)} กม.`,`in ${num(d.left)} km`) : T("เลยกำหนด","Overdue")}</span>
        <button class="cl-mini" data-done="${p.k}" title="${T("ทำแล้ววันนี้","Mark done")}"><i class="ti ti-check"></i></button>
        <button class="cl-mini" data-editiv="${p.k}" title="${T("แก้รอบ","Edit interval")}"><i class="ti ti-adjustments"></i></button>
      </span></div>
      <div class="cl-ivedit" id="iv-${p.k}" hidden>
        <input type="number" inputmode="numeric" id="ivkm-${p.k}" value="${p.km}" placeholder="${T("ทุกกี่ กม.","Every km")}"/>
        <input type="number" inputmode="numeric" id="ivmo-${p.k}" value="${p.mo}" placeholder="${T("ทุกกี่เดือน","Every months")}"/>
        <button class="btn primary" data-saveiv="${p.k}">${T("บันทึก","Save")}</button>
        <button class="btn" data-resetiv="${p.k}">${T("ค่ามาตรฐาน","Default")}</button>
      </div>`).join("")}
  </div>
  <div class="cl-grp"><h4>${T("งานของฉัน","My reminders")}</h4>
    ${todos.length?todos.map((t,i)=>`<div class="cl-mt">
      <span class="dot" style="background:${t.done?"var(--ok)":(t.dueKm&&km>=t.dueKm?"var(--danger)":"var(--accent)")}"></span>
      <span class="nm"><b style="${t.done?"text-decoration:line-through;opacity:.55":""}">${esc(t.title)}</b>
        <span>${t.dueKm?T(`ครบที่ ${num(t.dueKm)} กม.`,`Due at ${num(t.dueKm)} km`)
                      :(t.dueDate?T(`ครบวันที่ ${esc(t.dueDate)}`,`Due ${esc(t.dueDate)}`):T("ไม่กำหนด","No due"))}</span></span>
      <span style="display:flex;gap:6px;flex-shrink:0">
        <button class="cl-mini" data-tdone="${i}"><i class="ti ti-${t.done?"rotate":"check"}"></i></button>
        <button class="cl-mini" data-tdel="${i}"><i class="ti ti-trash"></i></button>
      </span></div>`).join("")
    :`<div class="cl-empty" style="padding:16px"><i class="ti ti-clipboard-list"></i>${
      T("ยังไม่มีงานที่เพิ่มเอง","Nothing added yet")}</div>`}
    <div class="cl-form">
      <input id="tdT" class="wide" placeholder="${T("เช่น เปลี่ยนใบปัดน้ำฝน, ต่อ พ.ร.บ.","e.g. Replace wipers, renew tax")}"/>
      <input id="tdKm" type="number" inputmode="numeric" placeholder="${T("ครบที่ กม. (ไม่บังคับ)","Due at km (optional)")}"/>
      <input id="tdDate" type="date"/>
      <button class="btn primary wide" id="tdAdd"><i class="ti ti-plus"></i> ${T("เพิ่มงาน","Add reminder")}</button>
    </div>
  </div>
  <div class="cl-grp"><h4>${T("บันทึกการเข้าศูนย์","Log a service")}</h4>
    <div class="cl-form">
      <select id="clSvcK">${planFor(c).map(p=>`<option value="${p.k}">${T(p.th,p.en)}</option>`).join("")}</select>
      <input id="clSvcKm" type="number" inputmode="numeric" placeholder="${T("เลขไมล์ (กม.)","Mileage (km)")}" value="${km||""}"/>
      <input id="clSvcAmt" type="number" inputmode="numeric" placeholder="${T("ค่าใช้จ่าย (บาท)","Cost (THB)")}"/>
      <input id="clSvcDate" type="date" value="${new Date().toISOString().slice(0,10)}"/>
      <button class="btn primary wide" id="clSvcAdd"><i class="ti ti-plus"></i> ${T("บันทึก","Add record")}</button>
    </div>
  </div>
  ${logList(c,"services",T("ยังไม่มีประวัติการเข้าศูนย์","No service history yet"))}`;
}

function paneParts(c){
  const s=specOf(c), b=s.body, P=(k,fb)=>sv(s,k,fb);
  const list=[
   [T("ยาง","Tyres"),P("tire",b.tire),"ti-circle-dotted"],
   [T("แบตเตอรี่","Battery"),P("batt",b.batt),"ti-battery-3"],
   [T("ใบปัดน้ำฝน","Wiper blades"),P("wiper",b.wiper),"ti-wiper"],
   [T("ปริมาณน้ำมันเครื่อง","Engine oil volume"),P("oil",b.oil),"ti-droplet"],
   [T("ไส้กรองน้ำมันเครื่อง","Oil filter"),{v:s.ev?T("ไม่มี","N/A"):T("ตามรหัสรุ่น","By model code"),est:true},"ti-filter"],
   [T("ไส้กรองอากาศ","Air filter"),{v:T("ตามรหัสรุ่น","By model code"),est:true},"ti-wind"],
   [T("ผ้าเบรกหน้า","Front brake pads"),{v:T("ตามรหัสรุ่น","By model code"),est:true},"ti-disc"],
   [T("หัวเทียน","Spark plugs"),{v:s.ev?T("ไม่มี","N/A"):T("อิริเดียม แนะนำ","Iridium recommended"),est:true},"ti-flame"]
  ];
  return `
  <div class="cl-grp"><h4>${T("ขนาดและชนิดอะไหล่","Sizes & types")}</h4>
    ${list.map(([k,o])=>row(k,o)).join("")}
  </div>
  <div class="cl-grp"><h4>${T("ซื้ออะไหล่","Buy parts")}</h4>
    <p style="font-size:12.5px;color:var(--muted);line-height:1.6;margin-bottom:12px">${T(
      "นำขนาดด้านบนไปเทียบก่อนสั่งซื้อทุกครั้ง ขนาดยางและแบตเตอรี่ต่างกันได้ตามรุ่นย่อยและล้อที่ติดรถมา",
      "Always match the sizes above before ordering — tyre and battery sizes vary by trim and factory wheels.")}</p>
    <button class="btn primary" data-view="shop" id="clShop"><i class="ti ti-shopping-bag"></i> ${T("ไปที่ร้านค้า","Open shop")}</button>
  </div>`;
}

function paneCost(c){
  const k=costOf(c), mx=Math.max(1,...k.months.map(m=>m.total));
  const MN=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  return `
  <div class="cl-grp"><h4>${T("ภาพรวม","Overview")}</h4>
    <div class="cl-hero" style="margin-bottom:14px">
      <div><div class="big" style="color:var(--accent)">฿${num(Math.round(k.thisMonth))}</div>
        <div class="lb">${T("เดือนนี้","This month")}</div></div>
      <div><div class="big">${k.perKm?"฿"+k.perKm.toFixed(2):"—"}</div>
        <div class="lb">${T("ต่อกิโลเมตร","Per km")}</div></div>
      <div><div class="big">฿${num(Math.round(k.totalAll))}</div>
        <div class="lb">${T("รวมทั้งหมด","All time")}</div></div>
    </div>
    <div class="cl-spark">${k.months.map((m,i)=>
      `<i style="height:${Math.max(4,m.total/mx*100)}%" class="${i===5?"now":""}"
          title="${MN[m.m]} ฿${num(Math.round(m.total))}"></i>`).join("")}</div>
    <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:10px;color:var(--faint)">
      ${k.months.map(m=>`<span>${MN[m.m]}</span>`).join("")}</div>
  </div>
  <div class="cl-grp"><h4>${T("เติมน้ำมัน / ชาร์จไฟ","Fuel / charging")}</h4>
    <div class="cl-form">
      <input id="clFuelKm" type="number" inputmode="numeric" placeholder="${T("เลขไมล์ (กม.)","Mileage (km)")}" value="${esc(c.mileage||"")}"/>
      <input id="clFuelAmt" type="number" inputmode="numeric" placeholder="${T("จำนวนเงิน (บาท)","Amount (THB)")}"/>
      <input id="clFuelL" type="number" inputmode="decimal" step="0.01" placeholder="${T("ลิตร / kWh","Litres / kWh")}"/>
      <input id="clFuelDate" type="date" value="${new Date().toISOString().slice(0,10)}"/>
      <button class="btn primary wide" id="clFuelAdd"><i class="ti ti-plus"></i> ${T("บันทึกการเติม","Add fill-up")}</button>
    </div>
  </div>
  ${k.span>0?`<p style="font-size:11.5px;color:var(--faint);line-height:1.6">
    <i class="ti ti-info-circle"></i> ${T(
      `คำนวณจากระยะทาง ${num(k.span)} กม. ที่มีบันทึก`,`Based on ${num(k.span)} km of logged distance`)}</p>`:""}
  ${logList(c,"fuel",T("ยังไม่มีบันทึกการเติม","No fill-ups logged yet"))}`;
}

function paneTrip(c){
  const l=getLog(c.id), trips=l.trips.slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  const totalKm=trips.reduce((a,t)=>a+(Number(t.km)||0),0);
  return `
  <div class="cl-grp"><h4>${T("สรุป","Summary")}</h4>
    <div class="cl-hero">
      <div><div class="big" style="color:var(--accent)">${num(totalKm)}</div>
        <div class="lb">${T("กม. ที่บันทึกไว้","km logged")}</div></div>
      <div><div class="big">${trips.length}</div>
        <div class="lb">${T("ทริป","trips")}</div></div>
    </div>
  </div>
  <div class="cl-grp"><h4>${T("บันทึกทริปใหม่","Log a trip")}</h4>
    <div class="cl-form">
      <input id="clTripT" class="wide" placeholder="${T("ไปไหนมา เช่น กรุงเทพ–หัวหิน","Where to? e.g. Bangkok–Hua Hin")}"/>
      <input id="clTripKm" type="number" inputmode="numeric" placeholder="${T("ระยะทาง (กม.)","Distance (km)")}"/>
      <input id="clTripDate" type="date" value="${new Date().toISOString().slice(0,10)}"/>
      <button class="btn primary wide" id="clTripAdd"><i class="ti ti-plus"></i> ${T("บันทึกทริป","Add trip")}</button>
    </div>
  </div>
  ${trips.length?`<div class="cl-grp"><h4>${T("ทริปที่ผ่านมา","Past trips")}</h4>${
    trips.map((t,i)=>`<div class="cl-log">
      <span class="d">${esc((t.date||"").slice(5))}</span>
      <span class="t">${esc(t.title||T("ไม่ระบุ","Untitled"))}</span>
      <span class="a">${num(t.km)} ${T("กม.","km")}</span>
      <button class="x" data-del="trips" data-i="${i}" aria-label="ลบ"><i class="ti ti-x"></i></button></div>`).join("")
    }</div>`:`<div class="cl-empty"><i class="ti ti-route"></i>${T("ยังไม่มีทริป — บันทึกอันแรกได้เลย","No trips yet — log your first")}</div>`}`;
}

function logList(c,kind,emptyTxt){
  const l=getLog(c.id)[kind]||[];
  const arr=l.slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  if(!arr.length)return `<div class="cl-empty"><i class="ti ti-notebook"></i>${emptyTxt}</div>`;
  const nameOf=x=>{const p=PLAN.find(p=>p.k===x.k);return p?T(p.th,p.en):T("รายการ","Item")};
  return `<div class="cl-grp"><h4>${T("ประวัติ","History")}</h4>${arr.map(x=>{
    const i=l.indexOf(x);
    return `<div class="cl-log">
      <span class="d">${esc((x.date||"").slice(5))}</span>
      <span class="t">${kind==="fuel"
        ? (x.litres?esc(x.litres)+" "+T("ลิตร","L"):T("เติมเชื้อเพลิง","Fill-up"))+
          (x.km?` · ${num(x.km)} ${T("กม.","km")}`:"")
        : esc(nameOf(x))+(x.km?` · ${num(x.km)} ${T("กม.","km")}`:"")}</span>
      <span class="a">฿${num(x.amount||0)}</span>
      <button class="x" data-del="${kind}" data-i="${i}" aria-label="ลบ"><i class="ti ti-x"></i></button></div>`
  }).join("")}</div>`;
}

/* ─── การกระทำในโมดัล ─── */
D.addEventListener("click",async e=>{
  const c=curCar;
  const del=e.target.closest("[data-del]");
  if(del&&c){const l=getLog(c.id);l[del.dataset.del].splice(+del.dataset.i,1);setLog(c.id,l);
    renderTab();refreshWidgets();return}
  if(e.target.closest("#clSvcAdd")&&c){
    const km=$("clSvcKm").value,amt=$("clSvcAmt").value,dt=$("clSvcDate").value,k=$("clSvcK").value;
    if(!km){toastx(T("ใส่เลขไมล์ก่อน","Enter mileage"));return}
    const l=getLog(c.id);l.services.push({k,km:+km,amount:+amt||0,date:dt});setLog(c.id,l);
    try{if(window.SpireODO)window.SpireODO.confirm(c,+km,"service")}catch(e){}
    toastx(T("บันทึกแล้ว","Saved"));renderTab();refreshWidgets();
    try{window.odoRefresh&&window.odoRefresh()}catch(e){}return}
  if(e.target.closest("#clFuelAdd")&&c){
    const km=$("clFuelKm").value,amt=$("clFuelAmt").value,li=$("clFuelL").value,dt=$("clFuelDate").value;
    if(!amt){toastx(T("ใส่จำนวนเงินก่อน","Enter amount"));return}
    const l=getLog(c.id);l.fuel.push({km:+km||0,amount:+amt,litres:+li||0,date:dt});setLog(c.id,l);
    if(+km)try{if(window.SpireODO)window.SpireODO.confirm(c,+km,"manual")}catch(e){}
    toastx(T("บันทึกแล้ว","Saved"));renderTab();refreshWidgets();
    try{window.odoRefresh&&window.odoRefresh()}catch(e){}return}
  if(e.target.closest("#clTripAdd")&&c){
    const ti=$("clTripT").value.trim(),km=$("clTripKm").value,dt=$("clTripDate").value;
    if(!km){toastx(T("ใส่ระยะทางก่อน","Enter distance"));return}
    const l=getLog(c.id);l.trips.push({title:ti,km:+km,date:dt});setLog(c.id,l);
    toastx(T("บันทึกทริปแล้ว","Trip saved"));renderTab();return}
  if(e.target.closest("#clAIclear")&&c){
    localStorage.removeItem("spire_carlab_spec_"+c.id);toastx(T("ล้างแล้ว","Cleared"));renderTab();return}
  if(e.target.closest("#clAI")&&c){
    const b=e.target.closest("#clAI");
    const old=b.innerHTML; b.innerHTML='<i class="ti ti-loader-2"></i> '+T("กำลังถาม AI...","Asking AI...");
    b.disabled=true;
    try{const d=await askAI(c);LSt("carlab_spec_"+c.id,d);toastx(T("AI ยืนยันสเปกแล้ว","Specs confirmed"));renderTab()}
    catch(err){b.innerHTML=old;b.disabled=false;
      toastx(T("ยังต่อ AI ไม่ได้ — ใช้ค่าประมาณการไปก่อน","AI unavailable — using estimates"))}
    return}
  if(e.target.closest("#clShop")){closeCL()}
});
function toastx(m){try{if(typeof window.toast==="function")return window.toast(m)}catch(e){}
  console.log(m)}

/* ═══════════ ปุ่ม "ดูรายละเอียด" บนการ์ดรถ ═══════════ */
function addDetailBtns(){
  D.querySelectorAll("#dashCars .ccard, #garageList .gcard, #garageList .gcar").forEach(card=>{
    if(card.querySelector(".cl-detail"))return;
    const diag=card.querySelector("[data-diag]");
    const id=diag?diag.dataset.diag:card.dataset.carId;
    if(!id)return;
    const b=D.createElement("button");
    b.className="cl-detail"; b.type="button";
    b.innerHTML='<i class="ti ti-list-details"></i> '+T("ดูรายละเอียด","View details");
    b.onclick=ev=>{ev.stopPropagation();window.openCarDetail(id)};
    (diag&&diag.parentNode?diag.parentNode:card).appendChild(b);
  });
}
["renderDashCars","renderGarage"].forEach(fn=>{
  const orig=window[fn];
  if(typeof orig!=="function")return;
  window[fn]=function(){const r=orig.apply(this,arguments);
    setTimeout(()=>{addDetailBtns();refreshWidgets()},0);return r};
});

/* ═══════════ วิดเจ็ตแดชบอร์ดใหม่ ═══════════ */
const WID=[
 {id:"w-todo",  th:"สิ่งที่ต้องทำ",       en:"Needs attention", ic:"ti-alert-hexagon"},
 {id:"w-health",th:"สถานะตามบันทึก",     en:"Record status",   ic:"ti-clipboard-text"},
 {id:"w-cost",  th:"ค่าใช้จ่ายเดือนนี้",  en:"This month",      ic:"ti-coin"},
 {id:"w-drive", th:"การขับขี่วันนี้",     en:"Driving today",   ic:"ti-steering-wheel"}
];
function widgetShell(w){
  return `<div class="widget" id="${w.id}" draggable="true">
    <div class="widget-header">
      <span class="widget-drag-handle"><i class="ti ti-hand-grab"></i></span>
      <h3><i class="ti ${w.ic}" style="color:var(--accent);margin-right:5px"></i>${T(w.th,w.en)}</h3>
      <div class="widget-actions">
        <button class="widget-nav-btn" onclick="moveWidget('${w.id}',-1);event.stopPropagation();"><i class="ti ti-arrow-narrow-up"></i></button>
        <button class="widget-nav-btn" onclick="moveWidget('${w.id}',1);event.stopPropagation();"><i class="ti ti-arrow-narrow-down"></i></button>
      </div>
    </div>
    <div class="card" style="padding:16px;border:none;box-shadow:none;background:transparent"
         id="${w.id}-body"></div>
  </div>`;
}
function mountWidgets(){
  const grid=$("widgetGrid"); if(!grid||$("w-todo"))return;
  const anchor=$("w-cars");
  WID.forEach(w=>{
    const t=D.createElement("template"); t.innerHTML=widgetShell(w).trim();
    const el=t.content.firstChild;
    if(anchor&&anchor.nextSibling)grid.insertBefore(el,anchor.nextSibling);
    else grid.appendChild(el);
  });
  // เพิ่มสวิตช์เปิด/ปิดในแผงแต่งหน้าหลัก
  const panel=D.querySelector("#customizePanel div[style*='flex-wrap']");
  if(panel&&!panel.querySelector("[data-clchk]")){
    WID.forEach(w=>{
      const l=D.createElement("label"); l.className="toggle-label"; l.dataset.clchk="1";
      l.innerHTML=`<input type="checkbox" id="chk-${w.id.replace("w-","")}" checked
        onchange="toggleWidget('${w.id}',this.checked)"> <span>${T(w.th,w.en)}</span>`;
      panel.appendChild(l);
    });
  }
}

/* จัดลำดับใน DOM แล้วให้ระบบเดิมบันทึกเอง (widgetOrder เป็นตัวแปรในสโคปของมัน
   จึงเขียนทับตรงๆ ไม่ได้ — ต้องเรียง DOM แล้วเรียก saveWidgetLayout()) */
/* ค่าเริ่มต้นเหลือสามใบเต็มความกว้าง (Brief / News / Spares) — น้อยใบแต่ใหญ่
   การ์ดจึงมีพื้นที่พอให้ไล่สีและกราฟิกเห็นเต็มๆ ที่เหลือเปิดเองได้ในหน้าปรับแต่ง */
const DEFAULT_ON=["w-brief","w-magazine","w-shop"];
const WANT=["w-brief","w-magazine","w-shop","w-cars","w-todo","w-health",
            "w-quick-actions","w-cost","w-drive","w-odo","w-settings","w-ai"];
let arranged=false;
function arrangeWidgets(){
  const grid=$("widgetGrid"); if(!grid||arranged||!$("w-todo"))return;
  const saved=LG("widgetOrder",null);
  let order;
  if(Array.isArray(saved)&&saved.length&&saved.some(id=>WID.find(w=>w.id===id))){
    order=saved.slice();                       // ผู้ใช้เคยจัดไว้แล้ว และมีของใหม่อยู่ด้วย
  }else if(Array.isArray(saved)&&saved.length){
    order=saved.slice();                       // ของเดิม — แทรกของใหม่ตามจุดที่เหมาะ
    const after={"w-todo":"w-cars","w-health":"w-todo",
                 "w-cost":"w-quick-actions","w-drive":"w-cost"};
    WID.forEach(w=>{const i=order.indexOf(after[w.id]);
      if(i>=0)order.splice(i+1,0,w.id); else order.push(w.id)});
  }else{
    order=WANT.slice();
  }
  order.forEach(id=>{const el=$(id); if(el)grid.appendChild(el)});
  [...grid.children].forEach(el=>{if(!order.includes(el.id))grid.appendChild(el)});
  arranged=true;
  try{if(typeof window.saveWidgetLayout==="function")window.saveWidgetLayout()}catch(e){}
  // ผู้ใช้ใหม่เห็นสามใบ; ผู้ใช้เดิมที่เคยตั้งไว้แล้วไม่ถูกแตะ ของใหม่ปิดไว้ก่อน
  try{
    const saved=LG("widgetToggles",null);
    const tg=saved||{};
    if(!saved){
      WANT.forEach(id=>{tg[id]=DEFAULT_ON.indexOf(id)>=0});
    }else{
      WID.forEach(w=>{if(tg[w.id]===undefined)tg[w.id]=false});
      if(tg["w-brief"]===undefined)tg["w-brief"]=true;
    }
    LSt("widgetToggles",tg);
    Object.keys(tg).forEach(id=>{const el=$(id); if(el)el.style.display=tg[id]?"block":"none";
      const chk=$("chk-"+id.replace("w-","")); if(chk)chk.checked=tg[id]});
  }catch(e){}
}

function activeCar(){
  const g=cars(); if(!g.length)return null;
  const sel=LG("selCar",""); return g.find(x=>x.id===sel)||g[0];
}
function refreshWidgets(){
  const c=activeCar();
  fillTodo(c); fillHealth(c); fillCost(c); fillDrive(c);
}
const noCar=`<div class="cl-empty"><i class="ti ti-car"></i>${T("เพิ่มรถของคุณก่อน แล้วข้อมูลจะขึ้นที่นี่","Add a car and this fills in")}</div>`;

function fillTodo(c){const el=$("w-todo-body");if(el)el.innerHTML=renderTodo(c)}
/* ความเร่งด่วนวัดจาก "เหลืออีกกี่กิโล" เทียบกับระยะที่เจ้าของขับได้ในราวหนึ่งเดือน
   ไม่ใช่ % ของรอบ เพราะรอบ 80,000 กม. ที่เหลืออีกหมื่นกว่ายังไม่ใช่เรื่องด่วน */
function monthKm(c){
  let r=null; try{if(window.SpireODO)r=window.SpireODO.km(c).rate}catch(e){}
  return Math.max(500,Math.min(3000,(r!=null?r:38)*30));
}
const urgCol=u=>u<=0?"var(--danger)":u<1?"var(--accent-2)":u<3?"var(--accent)":"var(--ok)";
function renderTodo(c){
  if(!c)return noCar;
  const mk=monthKm(c);
  const items=planFor(c).map(p=>({p,d:dueOf(c,p),u:dueOf(c,p).left/mk}))
    .sort((a,b)=>a.d.left-b.d.left).slice(0,4);
  const mine=getTodos(c.id).filter(t=>!t.done).slice(0,2);
  const kmNow=KM(c);
  return items.map(({p,d,u})=>{
    const col=urgCol(u);
    const lab=d.left<=0?T("เลยกำหนด","Overdue"):u<1?T("ใกล้ถึง","Due soon")
      :u<3?T("อีกไม่นาน","Coming up"):T("ยังไหว","On track");
    return `<div class="cl-todo">
      <span class="pri" style="background:${col}"></span>
      <span class="bd"><b>${T(p.th,p.en)}</b>
        <span>${d.left>0?T(`อีก ${num(d.left)} กม.`,`in ${num(d.left)} km`):T("ควรทำทันที","Do it now")}</span></span>
      <button class="cl-mini" data-wdone="${p.k}" title="${T("ทำแล้ว","Done")}"><i class="ti ti-check"></i></button>
      <span class="tag" style="color:${col};background:color-mix(in srgb,${col} 14%,transparent)">${lab}</span>
    </div>`}).join("")+
    mine.map((t,i)=>{const over=t.dueKm&&kmNow>=t.dueKm;
      const col=over?"var(--danger)":"var(--accent)";
      return `<div class="cl-todo">
        <span class="pri" style="background:${col}"></span>
        <span class="bd"><b>${esc(t.title)}</b>
          <span>${t.dueKm?T(`ครบที่ ${num(t.dueKm)} กม.`,`Due at ${num(t.dueKm)} km`)
                        :(t.dueDate||T("งานของคุณ","Your reminder"))}</span></span>
        <button class="cl-mini" data-wtdone="${i}" title="${T("ทำแล้ว","Done")}"><i class="ti ti-check"></i></button>
        <span class="tag" style="color:${col};background:color-mix(in srgb,${col} 14%,transparent)">${
          T("ของฉัน","Mine")}</span>
      </div>`}).join("")+
    `<button class="btn" style="width:100%;margin-top:12px;justify-content:center"
      onclick="openCarDetail('${c.id}')"><i class="ti ti-calendar-check"></i> ${T("ดูตารางทั้งหมด","Full schedule")}</button>`;
}
function fillHealth(c){const el=$("w-health-body");if(el)el.innerHTML=renderHealth(c)}
function renderHealth(c){
  if(!c)return noCar;
  const st=status(c);
  const tone=st.over.length?"var(--danger)":st.soon.length?"var(--accent-2)":"var(--ok)";
  const head=st.over.length
    ? T(`เลยกำหนดแล้ว ${st.over.length} รายการ`,`${st.over.length} item(s) overdue`)
    : st.soon.length
      ? T(`ใกล้ถึงกำหนด ${st.soon.length} รายการ`,`${st.soon.length} item(s) due soon`)
      : st.logged?T("ยังไม่มีรายการที่ถึงกำหนด","Nothing due right now")
                 :T("ยังไม่ได้บันทึกอะไรเลย","Nothing recorded yet");
  const rows=[...st.over,...st.soon].slice(0,3);
  return `<div class="cl-score" style="margin-bottom:12px">
      <div class="cl-ring" style="width:52px;height:52px;display:grid;place-items:center">
        <i class="ti ${st.over.length?"ti-alert-triangle":"ti-circle-check"}"
           style="font-size:30px;color:${tone}"></i></div>
      <div class="txt"><b style="color:${tone}">${head}</b>
        <span>${T(`บันทึกไว้ ${st.logged} จาก ${st.total} รายการ`,
                  `${st.logged} of ${st.total} items recorded`)}</span></div></div>
    ${rows.map(({p,d})=>`<div class="cl-sys">
      <i class="ti ti-tool" style="color:${d.left<=0?"var(--danger)":"var(--accent-2)"};font-size:16px"></i>
      <span class="nm">${T(p.th,p.en)}</span>
      <span class="pc" style="color:${d.left<=0?"var(--danger)":"var(--accent-2)"}">${
        d.left<=0?T("เลยกำหนด","overdue"):T(`อีก ${num(d.left)} กม.`,`${num(d.left)} km`)}</span>
      </div>`).join("")}
    ${st.unlogged?`<div class="cl-note" style="margin-top:10px;font-size:11.5px;color:var(--muted);line-height:1.7">
      ${T(`อีก ${st.unlogged} รายการยังไม่เคยบันทึกว่าเปลี่ยนเมื่อไร ระบบจึงยังไม่รู้ว่าถึงกำหนดหรือยัง`,
          `${st.unlogged} item(s) have never been recorded, so we can't tell whether they're due`)}
      <button class="btn" style="width:100%;margin-top:9px;justify-content:center"
        onclick="openCarDetail('${c.id}')"><i class="ti ti-edit"></i> ${
        T("กรอกข้อมูลรถ","Fill in the details")}</button></div>`:""}`;
}
function fillCost(c){const el=$("w-cost-body");if(el)el.innerHTML=renderCost(c)}
function renderCost(c){
  if(!c)return noCar;
  const k=costOf(c), mx=Math.max(1,...k.months.map(m=>m.total));
  const MN=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  return `<div class="cl-hero" style="margin-bottom:12px">
      <div><div class="big" style="color:var(--accent)">฿${num(Math.round(k.thisMonth))}</div>
        <div class="lb">${T("รวมเดือนนี้","This month")}</div></div>
      <div class="cl-spark">${k.months.map((m,i)=>
        `<i style="height:${Math.max(4,m.total/mx*100)}%" class="${i===5?"now":""}"
            title="${MN[m.m]}"></i>`).join("")}</div>
    </div>
    <div style="display:flex;gap:14px;font-size:12px;color:var(--muted)">
      <span><b style="color:var(--ink)">${k.perKm?"฿"+k.perKm.toFixed(2):"—"}</b> ${T("ต่อ กม.","per km")}</span>
      <span><b style="color:var(--ink)">฿${num(Math.round(k.totalAll))}</b> ${T("รวมทั้งหมด","all time")}</span>
    </div>
    <button class="btn" style="width:100%;margin-top:12px;justify-content:center"
      onclick="openCarDetail('${c.id}')"><i class="ti ti-plus"></i> ${T("บันทึกค่าใช้จ่าย","Log an expense")}</button>`;
}
function fillDrive(c){const el=$("w-drive-body");if(el)el.innerHTML=renderDrive(c)}
function renderDrive(c){
  const now=new Date(), h=now.getHours(), mo=now.getMonth(), dow=now.getDay();
  const rainy=mo>=4&&mo<=9;                    // พ.ค.–ต.ค. หน้าฝนไทย
  const rush=(h>=7&&h<=9)||(h>=16&&h<=19);
  const night=h>=19||h<6;
  const weekend=dow===0||dow===6;
  let ic,col,title,body;
  if(rainy&&rush){ic="ti-cloud-rain";col="var(--accent-2)";
    title=T("ฝนกับรถติดพร้อมกัน","Rain plus rush hour");
    body=T("หน้าฝนช่วงเร่งด่วน ถนนลื่นและรถหนาแน่น เผื่อเวลาและเว้นระยะเบรกให้มากกว่าปกติ",
           "Wet roads at peak hour — leave earlier and double your braking distance.")}
  else if(rainy){ic="ti-umbrella";col="var(--accent-2)";
    title=T("ช่วงหน้าฝน","Rainy season");
    body=T("ตรวจดอกยางและใบปัดน้ำฝนให้พร้อม ถนนลื่นที่สุดในสิบนาทีแรกที่ฝนเริ่มตก",
           "Check tread and wipers — roads are slickest in the first ten minutes of rain.")}
  else if(rush){ic="ti-traffic-lights";col="var(--accent)";
    title=T("ชั่วโมงเร่งด่วน","Rush hour");
    body=T("รถติดยาว เครื่องทำงานหนักตอนคลานช้าๆ ถ้าจอดนิ่งนานให้สังเกตเข็มความร้อนด้วย",
           "Stop-and-go traffic works the engine hard — keep an eye on the temperature gauge.")}
  else if(night){ic="ti-moon-stars";col="var(--accent)";
    title=T("ขับกลางคืน","Night driving");
    body=T("ทัศนวิสัยลดลงมาก เช็กไฟหน้าให้ครบและลดความเร็วลงจากปกติสักหน่อย",
           "Visibility drops sharply — check your headlights and ease off the speed.")}
  else if(weekend){ic="ti-road";col="var(--ok)";
    title=T("เหมาะกับออกทริป","Good day for a drive");
    body=T("ถนนโล่งกว่าวันธรรมดา ถ้าจะไปไกลเช็กลมยางและระดับน้ำมันเครื่องก่อนออกเดินทาง",
           "Roads are clearer than weekdays — check tyre pressure and oil before a long run.")}
  else{ic="ti-sun-high";col="var(--ok)";
    title=T("สภาพการขับขี่ปกติ","Normal conditions");
    body=T("ช่วงเวลาที่ถนนไม่หนาแน่น เหมาะกับการเดินทางหรือแวะเข้าศูนย์บริการ",
           "Traffic is light right now — a good window for errands or a service visit.")}
  const tips=[];
  if(c){
    const st=status(c);
    if(st.over.length)tips.push(T(`เลยกำหนด ${st.over.length} รายการ`,`${st.over.length} overdue`));
    else if(st.soon.length)tips.push(T(`ใกล้ถึงกำหนด ${st.soon.length} รายการ`,`${st.soon.length} due soon`));
  }
  if(rainy)tips.push(T("เช็กใบปัดน้ำฝน","Check wipers"));
  if(night)tips.push(T("เช็กไฟหน้า-ไฟท้าย","Check lights"));
  return `<div class="cl-drive">
      <span class="ic" style="background:${col}"><i class="ti ${ic}"></i></span>
      <span class="bd"><b>${title}</b><span>${body}</span></span></div>
    ${tips.length?`<div class="cl-tips">${tips.map(t=>`<span>${esc(t)}</span>`).join("")}</div>`:""}`;
}

/* ปุ่ม "ทำแล้ว" บนวิดเจ็ตหน้าแรก */
D.addEventListener("click",e=>{
  const w=e.target.closest("[data-wdone]"), wt=e.target.closest("[data-wtdone]");
  if(!w&&!wt)return;
  const c=activeCar(); if(!c)return;
  if(w){const km=KM(c), l=getLog(c.id);
    l.services.push({k:w.dataset.wdone,km,amount:0,date:new Date().toISOString().slice(0,10)});
    setLog(c.id,l);
    try{if(window.SpireODO)window.SpireODO.confirm(c,km,"service")}catch(err){}
    toastx(T("บันทึกว่าทำแล้ว","Marked as done"),"ti-check");}
  else{const arr=getTodos(c.id);arr[+wt.dataset.wtdone].done=true;setTodos(c.id,arr);
    toastx(T("เรียบร้อย","Done"),"ti-check");}
  refreshWidgets();
  try{window.odoRefresh&&window.odoRefresh()}catch(err){}
});

/* ─── แก้ไขข้อมูลรถ: ทำแล้ว / แก้รอบ / งานของฉัน ─── */
D.addEventListener("click",e=>{
  const c=curCar; if(!c)return;

  /* ── บันทึกรายการที่เปลี่ยนไปแล้ว พร้อมวันที่ เลขไมล์ ค่าใช้จ่าย และหมายเหตุ ── */
  const recSave=e.target.closest("[data-rsave]");
  if(recSave){
    const k=recSave.dataset.rsave;
    const g=sel=>{const el=D.querySelector(`[data-${sel}="${k}"]`); return el?el.value.trim():""};
    const date=g("rd"), kmv=g("rk"), amt=g("ra"), note=g("rn");
    if(!date&&!kmv){ toastx(T("ใส่วันที่หรือเลขไมล์อย่างน้อยหนึ่งช่อง","Enter a date or an odometer reading"),"ti-alert-triangle"); return }
    const l=getLog(c.id);
    /* แก้ของเดิมถ้าเคยบันทึกไว้แล้ว ไม่ใช่ยัดแถวใหม่ทุกครั้งจนประวัติซ้ำ */
    const idx=l.services.map((x,i)=>({x,i})).filter(o=>o.x.k===k)
      .sort((a,b)=>new Date(b.x.date)-new Date(a.x.date))[0];
    const rec={k,km:parseInt(kmv)||0,amount:parseInt(amt)||0,
      date:date||new Date().toISOString().slice(0,10),note:note||""};
    if(idx)l.services[idx.i]=rec; else l.services.push(rec);
    setLog(c.id,l);
    if(rec.km){try{if(window.SpireODO&&rec.km>=KM(c))window.SpireODO.confirm(c,rec.km,"service")}catch(err){}}
    toastx(T("บันทึกแล้ว","Saved"),"ti-check"); renderTab(); refreshWidgets();
    try{window.odoRefresh&&window.odoRefresh();window.briefRefresh&&window.briefRefresh()}catch(err){}
    return;
  }
  const sa=e.target.closest("#symAdd");
  if(sa){
    const el=$("symTxt"), t=el?el.value.trim():"";
    if(!t)return;
    const list=getSymptoms(c.id);
    list.unshift({t:t.slice(0,200),date:new Date().toISOString().slice(0,10),km:KM(c)});
    setSymptoms(c.id,list.slice(0,40)); renderTab(); return;
  }
  const sd=e.target.closest("[data-symdel]");
  if(sd){ const list=getSymptoms(c.id); list.splice(+sd.dataset.symdel,1);
    setSymptoms(c.id,list); renderTab(); return }
  const sq=e.target.closest("[data-symask]");
  if(sq){
    const x=getSymptoms(c.id)[+sq.dataset.symask]; if(!x)return;
    /* ส่งอาการเข้าห้องสนทนาพร้อมบริบทรถ ไม่ต้องให้เจ้าของพิมพ์ซ้ำ */
    const q=T(`รถ ${c.name||""} มีอาการ: ${x.t} (พบเมื่อ ${x.date} ที่ ${num(x.km)} กม.) น่าจะเกิดจากอะไร`,
              `My ${c.name||"car"} has this symptom: ${x.t} (noticed ${x.date} at ${num(x.km)} km). What could cause it?`);
    try{ localStorage.setItem("spire_deckQ",JSON.stringify(q)) }catch(err){}
    location.href="chat.html?attach=text"; return;
  }

  const dn=e.target.closest("[data-done]");
  if(dn){const k=dn.dataset.done, km=KM(c), l=getLog(c.id);
    l.services.push({k,km,amount:0,date:new Date().toISOString().slice(0,10)});setLog(c.id,l);
    try{if(window.SpireODO)window.SpireODO.confirm(c,km,"service")}catch(err){}
    toastx(T("บันทึกว่าทำแล้ว","Marked as done"),"ti-check");renderTab();refreshWidgets();
    try{window.odoRefresh&&window.odoRefresh()}catch(err){}return}
  const ed=e.target.closest("[data-editiv]");
  if(ed){const box=$("iv-"+ed.dataset.editiv); if(box)box.hidden=!box.hidden; return}
  const sv2=e.target.closest("[data-saveiv]");
  if(sv2){const k=sv2.dataset.saveiv, iv=getIv(c.id);
    const kmv=Number(($("ivkm-"+k)||{}).value), mov=Number(($("ivmo-"+k)||{}).value);
    if(kmv>0){iv[k]={km:kmv,mo:mov>0?mov:undefined};setIv(c.id,iv);
      toastx(T("ปรับรอบแล้ว","Interval updated"));renderTab();refreshWidgets();}
    else toastx(T("ใส่จำนวนกิโลเมตรก่อน","Enter a km interval"));return}
  const rs=e.target.closest("[data-resetiv]");
  if(rs){const iv=getIv(c.id);delete iv[rs.dataset.resetiv];setIv(c.id,iv);
    toastx(T("กลับเป็นค่ามาตรฐาน","Reset to default"));renderTab();refreshWidgets();return}
  if(e.target.closest("#tdAdd")){
    const t=$("tdT").value.trim(); if(!t){toastx(T("ใส่ชื่องานก่อน","Name it first"));return}
    const arr=getTodos(c.id);
    arr.push({title:t,dueKm:Number($("tdKm").value)||0,dueDate:$("tdDate").value||"",done:false});
    setTodos(c.id,arr);toastx(T("เพิ่มงานแล้ว","Added"));renderTab();refreshWidgets();return}
  const td=e.target.closest("[data-tdone]");
  if(td){const arr=getTodos(c.id);arr[+td.dataset.tdone].done=!arr[+td.dataset.tdone].done;
    setTodos(c.id,arr);renderTab();refreshWidgets();return}
  const tx=e.target.closest("[data-tdel]");
  if(tx){const arr=getTodos(c.id);arr.splice(+tx.dataset.tdel,1);setTodos(c.id,arr);
    renderTab();refreshWidgets();return}
});

/* เปิด API ให้โมดูล ODO ใช้ร่วม */
window.SpireCarLab={
  getLog, planFor, dueOf, health, status, bodyOf, getSymptoms,
  economy:c=>{const s=specOf(c);
    if(s.confirmed&&Number(s.confirmed.l100)>0)return Number(s.confirmed.l100);
    return s.body.l100||7.5}
};
window.clRefreshWidgets=refreshWidgets;
window.clSections={todo:renderTodo,health:renderHealth,cost:renderCost,drive:renderDrive};
window.clRerender=()=>{try{renderTab()}catch(e){}};

/* ═══════════ เริ่มทำงาน ═══════════ */
function boot(){
  mountWidgets(); arrangeWidgets(); addDetailBtns(); refreshWidgets();
}
if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",boot);
else boot();
setTimeout(boot,700);
addEventListener("storage",e=>{if(e.key&&e.key.indexOf("spire_")===0)refreshWidgets()});
new MutationObserver(()=>{addDetailBtns()}).observe(D.body,{childList:true,subtree:true});
})();

;

/* ══════════════════════════════════════════════════════════════════
   ODOMETER ENGINE — ประเมินเลขไมล์จากหลายสัญญาณ + เตือนให้ผู้ใช้ยืนยัน
   ทำตามเอกสาร "SpireONE — Routine/Schedule Car Maintenance"
     §4.2  Energy Accounting : ลิตรที่เติม × อัตราสิ้นเปลือง = ระยะทาง
     §4.5  Multi-signal fusion : เก็บค่าประมาณพร้อมช่วงความเชื่อมั่น
           และ "หมุนค่ากลับ" ทุกครั้งที่มีจุดยืนยันจริงเข้ามา
     §8    Data model : MileageReading(value, source, recorded_at, confidence)
     §9    Notification flow : เตือนล่วงหน้าเมื่อใกล้ถึงกำหนด (ปรับ threshold
           ให้อิงระยะที่ผู้ใช้ขับจริงต่อเดือน แทน % ของ interval ตายตัว)
   สิ่งที่เว็บทำไม่ได้ (OBD dongle / vibration / background GPS / BT fingerprint)
   แสดงไว้เป็นโหมดที่ต้องใช้แอปมือถือ ไม่แกล้งว่าทำได้
   ══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
const D=document,$=id=>D.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const EN=()=>(window.lang||"th")==="en", T=(th,en)=>EN()?en:th;
const num=n=>Math.round(Number(n)||0).toLocaleString("th-TH");
const LG=(k,d)=>{try{const v=localStorage.getItem("spire_"+k);return v?JSON.parse(v):d}catch(e){return d}};
const LSt=(k,v)=>{try{localStorage.setItem("spire_"+k,JSON.stringify(v))}catch(e){}};
const cars=()=>{try{return window.garage?window.garage():LG("garage",[])}catch(e){return LG("garage",[])}};
const DAY=864e5, now=()=>Date.now();
const days=ms=>Math.max(0,ms/DAY);

/* ═══════════ §8 DATA MODEL ═══════════ */
const key=id=>"odo_"+id;
const blank={readings:[],mode:"manual",rate:null,lastPrompt:0,snooze:{},notified:{}};
const get=id=>Object.assign({},blank,LG(key(id),null)||{});
const set=(id,v)=>LSt(key(id),v);
const SRC={
 manual :{th:"กรอกเอง",en:"Manual",  conf:1.0, cls:"src-manual"},
 service:{th:"เข้าศูนย์",en:"Service",conf:0.98,cls:"src-service"},
 energy :{th:"จากน้ำมัน",en:"Fuel",  conf:0.75,cls:"src-energy"},
 estimate:{th:"ประเมิน", en:"Estimate",conf:0.4, cls:"src-estimate"}
};
/* จุดยืนยันล่าสุด = readings ที่มาจากคนจริง (manual/service) */
function lastAnchor(c){
  const rs=get(c.id).readings.filter(r=>r.source==="manual"||r.source==="service");
  if(rs.length)return rs.slice().sort((a,b)=>b.at-a.at)[0];
  const km=parseInt(c.mileage)||0;
  return km?{value:km,source:"manual",at:carAddedAt(c),confidence:1}:null;
}
function carAddedAt(c){
  const g=get(c.id);
  if(g.seededAt)return g.seededAt;
  const t=now(); const v=get(c.id); v.seededAt=t; set(c.id,v); return t;
}

/* ═══════════ §4.2 ENERGY ACCOUNTING ═══════════
   ระยะทาง ≈ ลิตรที่เติม × (100 / อัตราสิ้นเปลือง L/100km)
   อัตราสิ้นเปลืองมาจากยี่ห้อ/รุ่น/ปี ที่ผู้ใช้กรอกไว้ตอนสร้างรถ */
function economy(c){
  const CL=window.SpireCarLab;
  if(CL&&typeof CL.economy==="function"){const e=CL.economy(c);if(e>0)return e}
  return 7.5;
}
function fuelSince(c,sinceMs){
  const CL=window.SpireCarLab;
  const log=CL&&CL.getLog?CL.getLog(c.id):{fuel:[]};
  const l100=economy(c);
  let litres=0,count=0;
  (log.fuel||[]).forEach(f=>{
    const t=new Date(f.date||0).getTime();
    if(!t||t<sinceMs)return;
    const L=Number(f.litres)||0;
    if(L>0){litres+=L;count++}
  });
  return {litres,count,km:litres*(100/l100),l100};
}

/* ═══════════ อัตราการขับที่เรียนรู้จากผู้ใช้รายคน ═══════════ */
function learnRate(c){
  const g=get(c.id);
  const anchors=g.readings.filter(r=>r.source==="manual"||r.source==="service")
    .slice().sort((a,b)=>a.at-b.at);
  if(anchors.length<2)return null;
  let wsum=0,vsum=0;
  for(let i=1;i<anchors.length;i++){
    const dKm=anchors[i].value-anchors[i-1].value;
    const dD=days(anchors[i].at-anchors[i-1].at);
    if(dD<0.5||dKm<0)continue;
    const r=dKm/dD;
    if(r>800)continue;                       // กันค่าผิดปกติ
    const w=Math.pow(1.6,i);                 // ช่วงใหม่ ๆ มีน้ำหนักมากกว่า
    wsum+=w; vsum+=r*w;
  }
  return wsum?vsum/wsum:null;
}
const DEFAULT_RATE=38;                        // กม./วัน โดยประมาณถ้ายังไม่มีข้อมูล [ประมาณการ]

/* ═══════════ §4.5 MULTI-SIGNAL FUSION ═══════════
   คืนค่าเป็นช่วงความน่าจะเป็น ไม่ใช่ตัวเลขเดียว */
function estimate(c){
  const a=lastAnchor(c);
  if(!a)return {value:0,lo:0,hi:0,conf:"low",pm:0,dayGap:0,anchor:null,signals:[],rate:null};
  const gap=days(now()-a.at);
  const en=fuelSince(c,a.at);
  const rate=learnRate(c);
  const timeKm=(rate!=null?rate:DEFAULT_RATE)*gap;

  const signals=[];
  let value,pm;
  if(en.km>0&&gap>0){
    // มีทั้งสองสัญญาณ — ถ่วงน้ำหนักไปทางน้ำมันเพราะผูกกับการใช้จริง
    const wE=0.68, wT=0.32;
    value=a.value+en.km*wE+timeKm*wT;
    const disagree=Math.abs(en.km-timeKm);
    pm=Math.max(60,disagree*0.5+gap*4);
    signals.push({k:"energy",km:en.km,w:wE,note:T(`${en.count} ครั้ง · ${en.litres.toFixed(1)} ลิตร · ${en.l100} ล./100กม.`,
      `${en.count} fill-ups · ${en.litres.toFixed(1)} L · ${en.l100} L/100km`)});
    signals.push({k:"time",km:timeKm,w:wT,note:T(`${Math.round(gap)} วัน × ${Math.round(rate!=null?rate:DEFAULT_RATE)} กม./วัน`,
      `${Math.round(gap)} days × ${Math.round(rate!=null?rate:DEFAULT_RATE)} km/day`)});
  }else if(en.km>0){
    value=a.value+en.km; pm=Math.max(50,en.km*0.15);
    signals.push({k:"energy",km:en.km,w:1,note:T(`${en.count} ครั้ง · ${en.litres.toFixed(1)} ลิตร`,
      `${en.count} fill-ups · ${en.litres.toFixed(1)} L`)});
  }else{
    value=a.value+timeKm;
    pm=Math.max(40,timeKm*(rate!=null?0.28:0.55));
    signals.push({k:"time",km:timeKm,w:1,note:rate!=null
      ? T(`${Math.round(gap)} วัน × ${Math.round(rate)} กม./วัน (เรียนรู้จากคุณ)`,
          `${Math.round(gap)} days × ${Math.round(rate)} km/day (learned)`)
      : T(`${Math.round(gap)} วัน × ${DEFAULT_RATE} กม./วัน (ค่าเริ่มต้น)`,
          `${Math.round(gap)} days × ${DEFAULT_RATE} km/day (default)`)});
  }
  // ความเชื่อมั่นเสื่อมตามเวลา (§5.2 "สัญญาณที่มีวันหมดอายุ")
  let conf="high";
  if(gap>7||pm>250)conf="med";
  if(gap>30||pm>700||(rate==null&&en.km<=0&&gap>3))conf="low";
  return {value:Math.round(value),lo:Math.round(value-pm),hi:Math.round(value+pm),
          conf,pm:Math.round(pm),dayGap:gap,anchor:a,signals,rate};
}
/* API ให้โมดูลอื่นใช้ */
window.SpireODO={
  km:c=>estimate(c),
  value:c=>estimate(c).value,
  confirm:(c,v,src)=>addReading(c,v,src||"manual"),
  mode:c=>get(c.id).mode
};

function addReading(c,value,source){
  value=Math.round(Number(value)||0); if(!value)return false;
  const g=get(c.id);
  g.readings.push({value,source,at:now(),confidence:(SRC[source]||SRC.manual).conf});
  g.readings=g.readings.slice(-60);
  g.notified={};                              // §4.5 หมุนค่ากลับ → เคลียร์การเตือนเดิม
  g.snooze={};
  set(c.id,g);
  // อัปเดตเลขไมล์ในการาจให้ตรงกัน
  try{
    const all=cars(), i=all.findIndex(x=>x.id===c.id);
    if(i>=0){all[i].mileage=String(value);
      if(typeof window.saveGarage==="function")window.saveGarage(all);
      else LSt("garage",all);}
  }catch(e){}
  refreshAll();
  return true;
}

/* ═══════════ §9 NOTIFICATION FLOW ═══════════ */
/* §9.1 เตือนเมื่อ "ใกล้ถึง" — นิยามจากระยะที่ผู้ใช้ขับจริงราวหนึ่งเดือน
   (อย่างน้อย 500 กม. อย่างมาก 3,000 กม.) แทนการใช้ % ของ interval ตายตัว
   เพราะ 80% ของรอบ 80,000 กม. ยังเหลืออีกหมื่นกว่า ไม่ใช่เรื่องด่วน */
function nearKm(rate){
  const perMonth=(rate!=null?rate:DEFAULT_RATE)*30;
  return Math.max(500,Math.min(3000,perMonth));
}
function prompts(c){
  const g=get(c.id), est=estimate(c), out=[];
  const snoozed=k=>g.snooze[k]&&now()<g.snooze[k];

  // 1) อะไหล่ใกล้ถึงกำหนด — ต้องรู้เลขไมล์จริงถึงจะเตือนแม่น
  const CL=window.SpireCarLab;
  if(CL&&CL.planFor&&CL.dueOf){
    const near=nearKm(est.rate);
    const due=[];
    CL.planFor(c).forEach(p=>{
      const d=CL.dueOf(c,p);
      if(d.left>near)return;
      const k="due_"+p.k; if(snoozed(k))return;
      due.push({p,d,k});
    });
    due.sort((a,b)=>a.d.left-b.d.left);
    const extra=due.length-2;
    due.slice(0,2).forEach(({p,d,k})=>{
      out.push({k,urgent:d.left<=0,ic:"ti-tool",col:d.left<=0?"var(--danger)":"var(--accent-2)",
        title:d.left<=0?T(`${p.th} เลยกำหนดแล้ว`,`${p.en} is overdue`)
                       :T(`ใกล้ถึงกำหนด${p.th}`,`${p.en} due soon`),
        body:(d.left<=0
          ? T(`ประเมินว่าเลยมา ${num(-d.left)} กม. — ยืนยันเลขไมล์จริงเพื่อเช็กให้ชัด`,
              `Estimated ${num(-d.left)} km past due — confirm your real odometer to be sure`)
          : T(`เหลืออีกราว ${num(d.left)} กม. — ยืนยันเลขไมล์เพื่อให้เตือนได้แม่นขึ้น`,
              `About ${num(d.left)} km left — confirm your odometer for a sharper reminder`))
          +(extra>0?T(` · อีก ${extra} รายการใกล้ครบเช่นกัน`,` · ${extra} more items are close too`):""),
        cta:"confirm"});
    });
  }
  // 2) ความเชื่อมั่นตก / ไม่ได้ยืนยันมานาน (§5.2 anchor เสื่อมตามเวลา)
  if(!snoozed("stale")&&est.anchor){
    if(est.conf==="low"){
      out.push({k:"stale",urgent:false,ic:"ti-gauge",col:"var(--accent)",
        title:T("ค่าเลขไมล์เริ่มไม่แน่นอนแล้ว",`Mileage estimate is drifting`),
        body:T(`ไม่ได้ยืนยันมา ${Math.round(est.dayGap)} วัน ตอนนี้คลาดเคลื่อนได้ ±${num(est.pm)} กม. — กรอกเลขจากหน้าปัดสักครั้งจะกลับมาแม่นทันที`,
               `${Math.round(est.dayGap)} days since your last confirmation, now ±${num(est.pm)} km. One reading from the dash resets it.`),
        cta:"confirm"});
    }else if(est.dayGap>14){
      out.push({k:"stale",urgent:false,ic:"ti-calendar",col:"var(--accent)",
        title:T("ยืนยันเลขไมล์สักครั้งไหม",`Time for a quick odometer check`),
        body:T(`ผ่านมา ${Math.round(est.dayGap)} วันแล้ว ระบบประเมินไว้ที่ ${num(est.value)} กม.`,
               `${Math.round(est.dayGap)} days on — we estimate ${num(est.value)} km.`),
        cta:"confirm"});
    }
  }
  // 3) เติมน้ำมันแล้วแต่ยังไม่ได้กรอกลิตร (สัญญาณ energy ขาด §4.2)
  if(CL&&CL.getLog&&!snoozed("litres")){
    const bad=(CL.getLog(c.id).fuel||[]).filter(f=>!(Number(f.litres)>0)).length;
    if(bad>0)out.push({k:"litres",urgent:false,ic:"ti-gas-station",col:"var(--accent-2)",
      title:T(`มี ${bad} รายการเติมน้ำมันที่ยังไม่ได้ใส่จำนวนลิตร`,`${bad} fill-ups missing litres`),
      body:T("จำนวนลิตรคือสิ่งที่ระบบใช้คำนวณระยะทางแทนคุณ ใส่แล้วไมล์จะแม่นขึ้นเอง",
             "Litres are what we turn into distance for you — add them and the estimate sharpens itself."),
      cta:"cost"});
  }
  return out.sort((a,b)=>(b.urgent?1:0)-(a.urgent?1:0));
}

/* แจ้งเตือนของเบราว์เซอร์ — ทำงานตอนเปิดเว็บ (background push ต้องใช้แอปมือถือ) */
function pushNote(c,p){
  if(!("Notification" in window)||Notification.permission!=="granted")return;
  const g=get(c.id);
  if(g.notified[p.k]&&now()-g.notified[p.k]<3*DAY)return;
  g.notified[p.k]=now(); set(c.id,g);
  try{
    const n=new Notification("SpireONE — "+(c.name||T("รถของคุณ","Your car")),
      {body:p.title+"\n"+p.body,tag:"spire-"+c.id+"-"+p.k});
    n.onclick=()=>{window.focus();openConfirm(c.id);n.close()};
  }catch(e){}
}
function runNotify(){
  const c=activeCar(); if(!c)return;
  const g=get(c.id);
  if(now()-g.lastPrompt<6*36e5)return;        // ค่อย ๆ เตือน ไม่ถี่เกิน 6 ชม.
  const ps=prompts(c); if(!ps.length)return;
  g.lastPrompt=now(); set(c.id,g);
  pushNote(c,ps[0]);
}

/* ═══════════ UI ═══════════ */
function activeCar(){
  const g=cars(); if(!g.length)return null;
  const sel=LG("selCar",""); return g.find(x=>x.id===sel)||g[0];
}
const CONF_TXT={high:["แม่นยำ","Sharp"],med:["พอใช้","Fair"],low:["หยาบ","Rough"]};
function confChip(e){
  const c=e.conf, col=c==="high"?"var(--ok)":c==="med"?"var(--accent-2)":"var(--danger)";
  return `<span class="odo-conf ${c==="high"?"high":c==="med"?"med":"low"}">
    <i style="background:${col}"></i>${T(CONF_TXT[c][0],CONF_TXT[c][1])} ±${num(e.pm)} ${T("กม.","km")}</span>`;
}

/* วิดเจ็ตเลขไมล์ */
function odoWidget(){
  return `<div class="widget" id="w-odo" draggable="true">
    <div class="widget-header">
      <span class="widget-drag-handle"><i class="ti ti-hand-grab"></i></span>
      <h3><i class="ti ti-gauge" style="color:var(--accent);margin-right:5px"></i>${T("เลขไมล์และการเตือน","Mileage & reminders")}</h3>
      <div class="widget-actions">
        <button class="widget-nav-btn" onclick="moveWidget('w-odo',-1);event.stopPropagation();"><i class="ti ti-arrow-narrow-up"></i></button>
        <button class="widget-nav-btn" onclick="moveWidget('w-odo',1);event.stopPropagation();"><i class="ti ti-arrow-narrow-down"></i></button>
      </div>
    </div>
    <div class="card" style="padding:16px;border:none;box-shadow:none;background:transparent" id="w-odo-body"></div>
  </div>`;
}
function fillOdo(){const el=$("w-odo-body");if(el)el.innerHTML=odoSection(activeCar())}
window.odoSection=c=>odoSection(c);
function odoSection(c){
  if(!c)return `<div class="cl-empty"><i class="ti ti-car"></i>${
    T("เพิ่มรถของคุณก่อน","Add a car first")}</div>`;
  const e=estimate(c), ps=prompts(c);
  const pct=e.conf==="high"?100:e.conf==="med"?58:26;
  const col=e.conf==="high"?"var(--ok)":e.conf==="med"?"var(--accent-2)":"var(--danger)";
  return `
    <div class="odo-big"><b>${num(e.value)}</b><em>${T("กม. (ประเมิน)","km (estimated)")}</em></div>
    <div class="odo-pm">${T("ช่วงที่เป็นไปได้","Likely range")} ${num(e.lo)}–${num(e.hi)} ${T("กม.","km")}</div>
    <div class="odo-meter"><i style="width:${pct}%;background:${col}"></i></div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:9px;flex-wrap:wrap">
      ${confChip(e)}
      <span style="font-size:11px;color:var(--faint)">${e.anchor
        ? T(`ยืนยันล่าสุด ${num(e.anchor.value)} กม. เมื่อ ${Math.round(e.dayGap)} วันก่อน`,
            `Last confirmed ${num(e.anchor.value)} km, ${Math.round(e.dayGap)} days ago`)
        : T("ยังไม่มีจุดยืนยัน","No confirmed reading yet")}</span>
    </div>
    <div class="odo-form">
      <div class="odo-in">
        <input id="odoQuick" type="number" inputmode="numeric" placeholder="${num(e.value)}"/>
        <button id="odoQuickGo">${T("ยืนยัน","Confirm")}</button>
      </div>
      <div class="odo-hint">${T("อ่านเลขจากหน้าปัดรถแล้วกรอกตรงนี้ — ระบบจะหมุนค่าประมาณกลับให้ตรงทันที",
        "Read the number off your dash and enter it — the estimate re-anchors instantly.")}</div>
    </div>
    ${ps.length?`<div style="margin-top:16px">
      <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);
        font-weight:700;margin-bottom:9px">${T("รอคุณยืนยัน","Waiting on you")}</div>
      ${ps.slice(0,3).map(p=>`<div class="odo-ask${p.urgent?" urgent":""}">
        <span class="ic" style="background:${p.col}"><i class="ti ${p.ic}"></i></span>
        <span class="bd"><b>${esc(p.title)}</b><span>${esc(p.body)}</span>
          <span class="acts">
            <button class="go" data-odo-cta="${p.cta}">${
              p.cta==="cost"?T("ไปใส่จำนวนลิตร","Add litres"):T("กรอกเลขไมล์","Enter odometer")}</button>
            <button data-odo-snooze="${p.k}">${T("ไว้ทีหลัง","Later")}</button>
          </span></span></div>`).join("")}
    </div>`:`<div style="margin-top:14px;font-size:12px;color:var(--faint);display:flex;gap:7px;align-items:center">
      <i class="ti ti-circle-check" style="color:var(--ok);font-size:16px"></i>
      ${T("ตอนนี้ไม่มีอะไรต้องกรอก","Nothing to fill in right now")}</div>`}`;
}

/* แผงตั้งค่า/รายละเอียดในโมดัลรถ — เพิ่มเป็นแท็บของ CARLAB */
window.odoPane=function(c){
  const e=estimate(c), g=get(c.id);
  const rs=g.readings.slice().sort((a,b)=>b.at-a.at).slice(0,12);
  const MODES=[
   {k:"manual",ic:"ti-pencil",th:"กรอกเอง",en:"Manual",
    dth:"คุณกรอกเลขไมล์เอง ระบบเตือนเป็นระยะ — แม่นที่สุดเท่าที่เว็บทำได้",
    den:"You enter the odometer; we remind you. The most accurate a web app can be.",soon:false},
   {k:"energy",ic:"ti-gas-station",th:"คำนวณจากน้ำมัน",en:"Fuel-based",
    dth:"บันทึกลิตรที่เติมทุกครั้ง ระบบแปลงเป็นระยะทางให้อัตโนมัติ",
    den:"Log litres per fill-up; we convert them into distance automatically.",soon:false},
   {k:"obd",ic:"ti-plug-connected",th:"OBD-II Bluetooth",en:"OBD-II dongle",
    dth:"อ่านเลขไมล์จริงจาก ECU — ต้องใช้แอปมือถือและอุปกรณ์เสริม",
    den:"Reads the real ECU odometer — needs the mobile app and a dongle.",soon:true},
   {k:"auto",ic:"ti-device-mobile",th:"ตรวจจับการขับอัตโนมัติ",en:"Automatic drive detection",
    dth:"ใช้เซนเซอร์การเคลื่อนไหวและ Bluetooth ของรถ — ต้องใช้แอปมือถือ",
    den:"Uses motion sensors and your car's Bluetooth — needs the mobile app.",soon:true}
  ];
  return `
  <div class="cl-grp"><h4>${T("ค่าปัจจุบัน","Current estimate")}</h4>
    <div class="odo-big"><b>${num(e.value)}</b><em>${T("กม.","km")}</em></div>
    <div class="odo-pm">${T("ช่วงที่เป็นไปได้","Range")} ${num(e.lo)}–${num(e.hi)} ${T("กม.","km")}</div>
    <div style="margin-top:9px">${confChip(e)}</div>
    <div class="odo-form"><div class="odo-in">
      <input id="odoIn" type="number" inputmode="numeric" placeholder="${num(e.value)}"/>
      <button id="odoGo">${T("ยืนยัน","Confirm")}</button></div>
      <div class="odo-hint">${T(
        "ทุกครั้งที่คุณยืนยันเลขจริง ระบบจะเรียนรู้ว่าคุณขับวันละกี่กิโล แล้วทำนายแม่นขึ้นเรื่อย ๆ",
        "Every confirmation teaches us your daily distance, so the next estimate lands closer.")}</div>
    </div>
  </div>
  <div class="cl-grp"><h4>${T("สัญญาณที่ใช้คำนวณ","Signals in use")}</h4>
    ${e.signals.map(s=>`<div class="odo-sig">
      <i class="ti ${s.k==="energy"?"ti-gas-station":"ti-clock"}" style="color:var(--accent);font-size:17px"></i>
      <span class="nm"><b>${s.k==="energy"?T("จากน้ำมันที่เติม","From fuel logged"):T("จากรูปแบบการขับ","From your driving pattern")}</b>
        <span>${esc(s.note)}</span></span>
      <span class="w">+${num(s.km)} ${T("กม.","km")}${s.w<1?` · ${Math.round(s.w*100)}%`:""}</span></div>`).join("")}
    ${e.rate!=null?`<div class="odo-hint">${T(
      `ระบบเรียนรู้จากคุณแล้วว่าขับเฉลี่ยวันละ ${Math.round(e.rate)} กม.`,
      `Learned from you: about ${Math.round(e.rate)} km per day.`)}</div>`:""}
  </div>
  <div class="cl-grp"><h4>${T("โหมดติดตามระยะทาง","Tracking mode")}</h4>
    <div class="odo-mode">${MODES.map(m=>`
      <button class="odo-m${m.soon?" soon":""}" data-odo-mode="${m.k}"
        aria-pressed="${g.mode===m.k}" ${m.soon?"disabled":""}>
        <span class="ic"><i class="ti ${m.ic}"></i></span>
        <span class="bd"><b>${T(m.th,m.en)}</b><span>${T(m.dth,m.den)}</span></span>
      </button>`).join("")}</div>
    <div class="odo-hint">${T(
      "สองโหมดล่างต้องอ่านค่าจากฮาร์ดแวร์และเซนเซอร์เบื้องหลัง ซึ่งเว็บเบราว์เซอร์ทำไม่ได้ — จะเปิดใช้เมื่อมีแอปมือถือ",
      "The last two need hardware and background sensors a browser cannot reach — they unlock with the mobile app.")}</div>
  </div>
  <div class="cl-grp"><h4>${T("การแจ้งเตือน","Notifications")}</h4>
    <div id="odoNotifRow"></div>
  </div>
  ${rs.length?`<div class="cl-grp"><h4>${T("ประวัติค่าที่บันทึก","Reading history")}</h4>
    ${rs.map(r=>{const s=SRC[r.source]||SRC.manual;
      return `<div class="odo-read">
        <span class="src ${s.cls}">${T(s.th,s.en)}</span>
        <span class="val">${num(r.value)} ${T("กม.","km")}</span>
        <span class="at">${new Date(r.at).toLocaleDateString("th-TH",{day:"numeric",month:"short",year:"2-digit"})}</span>
      </div>`}).join("")}</div>`:""}`;
};
function notifRow(){
  const el=$("odoNotifRow"); if(!el)return;
  const sup="Notification" in window;
  const st=sup?Notification.permission:"unsupported";
  const map={granted:[T("เปิดอยู่","On"),"var(--ok)","ti-bell-check"],
             denied:[T("ถูกปิดไว้ในเบราว์เซอร์","Blocked in browser"),"var(--danger)","ti-bell-off"],
             default:[T("ยังไม่ได้เปิด","Not enabled"),"var(--accent-2)","ti-bell"],
             unsupported:[T("เบราว์เซอร์นี้ไม่รองรับ","Not supported here"),"var(--faint)","ti-bell-x"]};
  const [txt,col,ic]=map[st]||map.default;
  el.innerHTML=`<div class="odo-sig" style="border:none;padding-top:0">
      <i class="ti ${ic}" style="color:${col};font-size:19px"></i>
      <span class="nm"><b>${T("แจ้งเตือนของเบราว์เซอร์","Browser notifications")}</b>
        <span style="color:${col}">${txt}</span></span>
      ${st==="default"?`<button class="btn primary" id="odoAskPerm" style="padding:8px 14px;font-size:12px">${
        T("เปิด","Enable")}</button>`:""}</div>
    <div class="odo-hint">${T(
      "เว็บจะเตือนได้เฉพาะตอนเปิดหน้าเว็บอยู่ ถ้าอยากให้เตือนตอนปิดแอปด้วยต้องใช้แอปมือถือ",
      "A website can only notify you while it is open. Reminders that reach you with the app closed need the mobile app.")}</div>`;
}

/* ═══════════ EVENTS ═══════════ */
D.addEventListener("click",async e=>{
  const c=activeCar();
  const go=e.target.closest("#odoQuickGo,#odoGo");
  if(go&&c){
    const inp=$(go.id==="odoGo"?"odoIn":"odoQuick");
    const v=Number(inp.value);
    if(!v){toastx(T("กรอกเลขไมล์จากหน้าปัดก่อน","Enter the number from your dash"));return}
    const a=lastAnchor(c);
    if(a&&v<a.value-50){
      if(!confirm(T(`เลขที่กรอก (${num(v)}) น้อยกว่าที่เคยยืนยันไว้ (${num(a.value)}) ยืนยันว่าถูกต้องไหม`,
        `${num(v)} is lower than your last confirmed ${num(a.value)}. Is that right?`)))return;
    }
    addReading(c,v,"manual");
    toastx(T("ยืนยันแล้ว — ค่าประมาณหมุนกลับมาตรงแล้ว","Confirmed — estimate re-anchored"),"ti-gauge");
    inp.value="";
    if(typeof window.clRerender==="function")window.clRerender();
    return;
  }
  const sn=e.target.closest("[data-odo-snooze]");
  if(sn&&c){const g=get(c.id);g.snooze[sn.dataset.odoSnooze]=now()+3*DAY;set(c.id,g);
    fillOdo();toastx(T("เลื่อนไป 3 วัน","Snoozed for 3 days"));return}
  const cta=e.target.closest("[data-odo-cta]");
  if(cta&&c){
    if(cta.dataset.odoCta==="cost"){window.openCarDetail&&window.openCarDetail(c.id);
      setTimeout(()=>{const t=D.querySelector('[data-tab="cost"]');t&&t.click()},120);}
    else{window.openCarDetail&&window.openCarDetail(c.id);
      setTimeout(()=>{const t=D.querySelector('[data-tab="odo"]');t&&t.click();
        setTimeout(()=>{const i=$("odoIn");i&&i.focus()},250)},120);}
    return;
  }
  const md=e.target.closest("[data-odo-mode]");
  if(md&&c&&!md.disabled){const g=get(c.id);g.mode=md.dataset.odoMode;set(c.id,g);
    D.querySelectorAll("[data-odo-mode]").forEach(b=>b.setAttribute("aria-pressed",b===md));
    toastx(T("เปลี่ยนโหมดแล้ว","Mode updated"));return}
  if(e.target.closest("#odoAskPerm")){
    try{const r=await Notification.requestPermission();notifRow();
      toastx(r==="granted"?T("เปิดแจ้งเตือนแล้ว","Notifications on")
                          :T("ยังไม่ได้อนุญาต","Not granted"))}catch(err){}
    return;
  }
});
function toastx(m,ic){try{if(typeof window.toast==="function")return window.toast(m,ic)}catch(e){}}

/* ═══════════ MOUNT ═══════════ */
function mount(){
  const grid=$("widgetGrid");
  if(grid&&!$("w-odo")){
    const t=D.createElement("template"); t.innerHTML=odoWidget().trim();
    const anchor=$("w-cars");
    if(anchor&&anchor.nextSibling)grid.insertBefore(t.content.firstChild,anchor.nextSibling);
    else grid.appendChild(t.content.firstChild);
    try{const tg=LG("widgetToggles",{})||{};if(tg["w-odo"]===undefined){tg["w-odo"]=true;LSt("widgetToggles",tg)}}catch(e){}
    const panel=D.querySelector("#customizePanel div[style*='flex-wrap']");
    if(panel&&!panel.querySelector("[data-odochk]")){
      const l=D.createElement("label"); l.className="toggle-label"; l.dataset.odochk="1";
      l.innerHTML=`<input type="checkbox" id="chk-odo" checked onchange="toggleWidget('w-odo',this.checked)">
        <span>${T("เลขไมล์และการเตือน","Mileage & reminders")}</span>`;
      panel.appendChild(l);
    }
    try{if(typeof window.saveWidgetLayout==="function")window.saveWidgetLayout()}catch(e){}
  }
  fillOdo(); notifRow();
}
function refreshAll(){
  fillOdo();
  try{if(typeof window.briefRefresh==="function")window.briefRefresh()}catch(e){}
  try{if(typeof window.clRefreshWidgets==="function")window.clRefreshWidgets()}catch(e){}
  try{if(typeof window.renderDashCars==="function")window.renderDashCars()}catch(e){}
}
window.odoRefresh=refreshAll;
window.odoNotifRow=notifRow;

if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",mount); else mount();
setTimeout(mount,900);
setTimeout(runNotify,4000);
setInterval(()=>{runNotify();fillOdo()},18e5);   // ทุก 30 นาทีระหว่างเปิดเว็บ
})();

;

/* ══════════════════════════════════════════════════════════════════
   TODAY'S BRIEF — วิดเจ็ตเล็ก → เรื่องเล่าเต็มจอ ล็อคทีละหน้า
   นวัตกรรม: อ่านสรุปให้ฟัง · วันนี้ทำแค่อย่างเดียวพอ · เช็กก่อนออกทริป · คำนวณล่วงหน้า
   ลูกเล่น:  การ์ดแชร์ได้ · สตรีคการดูแล · อารมณ์รถ · เทียบเดือนก่อน
   อากาศดึงจริงจาก Open-Meteo (ไม่ต้องใช้คีย์) ต่อไม่ได้ก็บอกตรง ๆ ไม่แต่งตัวเลข
   ══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
const D=document,$=id=>D.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const EN=()=>(window.lang||"th")==="en", T=(th,en)=>EN()?en:th;
const num=n=>Math.round(Number(n)||0).toLocaleString("th-TH");
const LG=(k,d)=>{try{const v=localStorage.getItem("spire_"+k);return v?JSON.parse(v):d}catch(e){return d}};
const LSt=(k,v)=>{try{localStorage.setItem("spire_"+k,JSON.stringify(v))}catch(e){}};
const cars=()=>{try{return window.garage?window.garage():LG("garage",[])}catch(e){return LG("garage",[])}};
const activeCar=()=>{const g=cars();if(!g.length)return null;
  const s=LG("selCar","");return g.find(x=>x.id===s)||g[0]};
const reduce=matchMedia("(prefers-reduced-motion:reduce)");
const CL=()=>window.SpireCarLab, ODO=()=>window.SpireODO;
const DAY=864e5;

/* ═══════════ อากาศ ═══════════ */
const WMO={
 0:["ท้องฟ้าแจ่มใส","Clear sky","ti-sun","clear"],1:["แดดจัดเป็นส่วนใหญ่","Mainly clear","ti-sun","clear"],
 2:["มีเมฆบางส่วน","Partly cloudy","ti-cloud-filled","cloud"],3:["เมฆมาก","Overcast","ti-cloud","cloud"],
 45:["หมอก","Fog","ti-mist","cloud"],48:["หมอกหนา","Rime fog","ti-mist","cloud"],
 51:["ฝนละอองเบา","Light drizzle","ti-cloud-rain","rain"],53:["ฝนละออง","Drizzle","ti-cloud-rain","rain"],
 55:["ฝนละอองหนัก","Dense drizzle","ti-cloud-rain","rain"],61:["ฝนเล็กน้อย","Light rain","ti-cloud-rain","rain"],
 63:["ฝนปานกลาง","Rain","ti-cloud-rain","rain"],65:["ฝนตกหนัก","Heavy rain","ti-cloud-storm","rain"],
 80:["ฝนซู่","Rain showers","ti-cloud-rain","rain"],81:["ฝนซู่ปานกลาง","Showers","ti-cloud-rain","rain"],
 82:["ฝนซู่หนัก","Violent showers","ti-cloud-storm","rain"],95:["พายุฝนฟ้าคะนอง","Thunderstorm","ti-bolt","rain"],
 96:["พายุฝนฟ้าคะนอง","Thunderstorm","ti-bolt","rain"],99:["พายุรุนแรง","Severe storm","ti-bolt","rain"]};
const wmo=c=>WMO[c]||["ไม่ทราบสภาพอากาศ","Unknown","ti-cloud","cloud"];
let WX=LG("wxCache",null), wxState="idle";
const wxFresh=()=>WX&&Date.now()-WX.t<45*6e4;
const isRaining=()=>WX&&wmo(WX.code)[3]==="rain";
async function fetchWx(lat,lon,place){
  const u=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`+
    `&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min`+
    `&timezone=auto&forecast_days=5`;
  const r=await fetch(u); if(!r.ok)throw new Error("wx");
  const d=await r.json();
  WX={t:Date.now(),temp:d.current.temperature_2m,code:d.current.weather_code,
      hi:d.daily.temperature_2m_max[0],lo:d.daily.temperature_2m_min[0],place:place||"",
      daily:d.daily.time.map((day,i)=>({day,code:d.daily.weather_code[i],
        hi:d.daily.temperature_2m_max[i],lo:d.daily.temperature_2m_min[i]}))};
  LSt("wxCache",WX); wxState="ok"; return WX;
}
function loadWx(force){
  if(!force&&wxFresh()){wxState="ok";return Promise.resolve(WX)}
  if(wxState==="loading")return Promise.resolve(null);
  wxState="loading"; render();
  return new Promise(res=>{
    const bkk=()=>fetchWx(13.7563,100.5018,T("กรุงเทพฯ","Bangkok"))
      .then(w=>{render();fillWidget();res(w)}).catch(()=>{wxState="fail";render();res(null)});
    if(!navigator.geolocation)return bkk();
    navigator.geolocation.getCurrentPosition(
      p=>fetchWx(p.coords.latitude,p.coords.longitude,"")
        .then(w=>{render();fillWidget();res(w)}).catch(()=>{wxState="fail";render();res(null)}),
      bkk,{timeout:8000,maximumAge:9e5});
  });
}

/* ═══════════ ตัวเลขที่ใช้เล่าเรื่อง ═══════════ */
function stats(c){
  const o={km:0,conf:"low",pm:0,rate:null,logged:0,unlogged:0,worst:null,overdue:[],near:[],
           month:0,prevMonth:0,perKm:0,streak:0,mood:null};
  /* ยังไม่มีรถก็ต้องมี mood เสมอ ไม่งั้นหน้าสรุปจะพังตอนการาจว่าง */
  if(!c){ o.mood=moodOf(o); return o }
  try{const e=ODO()&&ODO().km(c); if(e){o.km=e.value;o.conf=e.conf;o.pm=e.pm;o.rate=e.rate}}catch(e){}
  try{
    const cl=CL();
    if(cl&&cl.health){
      const h=cl.health(c);
      /* จำนวนรายการที่เจ้าของบันทึกไว้จริง — ใช้ตัดสินว่าพูดได้แค่ไหน */
      try{ const st=cl.status(c); o.logged=st.logged; o.unlogged=st.unlogged }catch(e){}
      const items=h.items.slice().sort((a,b)=>a.d.left-b.d.left);
      o.worst=items[0]||null;
      o.overdue=items.filter(x=>x.d.left<=0);
      const mk=Math.max(500,Math.min(3000,(o.rate!=null?o.rate:38)*30));
      o.near=items.filter(x=>x.d.left>0&&x.d.left<=mk);
      o.items=items;
    }
    if(cl&&cl.getLog){
      const l=cl.getLog(c.id), all=[...(l.services||[]),...(l.fuel||[])];
      const now=new Date();
      const inM=(x,off)=>{const d=new Date(x.date||0);
        const m=new Date(now.getFullYear(),now.getMonth()-off,1);
        return d.getFullYear()===m.getFullYear()&&d.getMonth()===m.getMonth()};
      o.month=all.filter(x=>inM(x,0)).reduce((a,x)=>a+(+x.amount||0),0);
      o.prevMonth=all.filter(x=>inM(x,1)).reduce((a,x)=>a+(+x.amount||0),0);
      const kms=(l.fuel||[]).map(f=>+f.km||0).filter(Boolean).sort((a,b)=>a-b);
      const span=kms.length>1?kms[kms.length-1]-kms[0]:0;
      const tot=all.reduce((a,x)=>a+(+x.amount||0),0);
      o.perKm=span>0?tot/span:0;
      /* สตรีค: นับวันติดกันย้อนหลังที่มีการบันทึกอะไรก็ได้ */
      const days=new Set();
      [...all,...(l.trips||[])].forEach(x=>{if(x.date)days.add(String(x.date).slice(0,10))});
      try{(LG("odo_"+c.id,{readings:[]}).readings||[]).forEach(r=>
        days.add(new Date(r.at).toISOString().slice(0,10)))}catch(e){}
      let s=0;
      for(let i=0;i<400;i++){
        const d=new Date(Date.now()-i*DAY).toISOString().slice(0,10);
        if(days.has(d))s++; else if(i>0)break;
      }
      o.streak=s;
    }
  }catch(e){}
  o.mood=moodOf(o);
  return o;
}
/* อารมณ์ของรถผูกกับ "มีอะไรค้างอยู่กี่รายการ" ไม่ใช่คะแนนที่คิดขึ้นเอง
   เพราะระบบไม่ได้ต่อกับรถ จะให้คะแนนสภาพเครื่องไม่ได้ */
function moodOf(o){
  if(!o.logged)return {face:"🚗",th:"ยังไม่รู้จักรถคุณ",en:"Nothing recorded yet",
    line:["กรอกในแท็บบันทึกของรถว่าเปลี่ยนอะไรไปแล้วบ้าง เดี๋ยวผมดูให้",
          "Fill in what's been changed under Records and I can start tracking."]};
  const ov=o.overdue.length, nr=o.near.length;
  if(ov>=3)return {face:"🥵",th:"ค้างหลายรายการ",en:"Several items overdue",
    line:[`เลยกำหนดแล้ว ${ov} รายการ อย่าปล่อยไว้`,`${ov} items are past due — don't leave them.`]};
  if(ov>0)return {face:"😟",th:"มีของเลยกำหนด",en:"Something's overdue",
    line:[`เลยกำหนดแล้ว ${ov} รายการ`,`${ov} item is past due.`]};
  if(nr>=2)return {face:"😐",th:"ใกล้ถึงคิว",en:"A few coming up",
    line:[`อีก ${nr} รายการจะถึงกำหนดเร็ว ๆ นี้`,`${nr} items fall due shortly.`]};
  if(nr>0)return {face:"🙂",th:"สบายดี",en:"Doing fine",
    line:["มีรายการเดียวที่เริ่มใกล้ครบรอบ","Just one item creeping up on its interval."]};
  return {face:"😄",th:"ไม่มีอะไรค้าง",en:"Nothing pending",
    line:["ตามบันทึกที่มี ยังไม่มีรายการไหนถึงกำหนด","Going by your records, nothing is due."]};
}
/* วันนี้ทำแค่อย่างเดียวพอ */
function oneThing(c,s){
  if(!c)return {ic:"ti-car",th:"เพิ่มรถของคุณก่อน",en:"Add your car first",
    why:["พอมีรถในระบบ ผมจะเริ่มดูรอบบำรุงรักษาให้","Once a car is in, I'll start tracking its schedule."],act:null};
  if(s.overdue.length){const p=s.overdue[0].p;
    return {ic:"ti-tool",th:T(p.th,p.en),en:T(p.th,p.en),
      why:[`เลยกำหนดมาแล้วราว ${num(-s.overdue[0].d.left)} กม. เรื่องนี้รอไม่ได้`,
           `About ${num(-s.overdue[0].d.left)} km past due — this one can't wait.`],
      act:{k:"done",id:p.k,th:"บันทึกว่าทำแล้ว",en:"Mark it done"}};}
  if(s.conf==="low")
    return {ic:"ti-gauge",th:"ยืนยันเลขไมล์",en:"Confirm your odometer",
      why:[`ตอนนี้คลาดเคลื่อนได้ ±${num(s.pm)} กม. อ่านเลขจากหน้าปัดครั้งเดียวก็กลับมาแม่น`,
           `Off by up to ±${num(s.pm)} km. One reading from the dash fixes it.`],
      act:{k:"odo",th:"กรอกเลขไมล์",en:"Enter reading"}};
  if(s.near.length){const p=s.near[0].p;
    return {ic:"ti-calendar-check",th:T(p.th,p.en),en:T(p.th,p.en),
      why:[`เหลืออีกราว ${num(s.near[0].d.left)} กม. นัดคิวไว้ก่อนได้เลย`,
           `About ${num(s.near[0].d.left)} km to go — worth booking ahead.`],
      act:{k:"done",id:p.k,th:"บันทึกว่าทำแล้ว",en:"Mark it done"}};}
  return {ic:"ti-circle-check",th:"วันนี้ไม่มีอะไรต้องทำ",en:"Nothing needed today",
    why:["รถอยู่ในรอบที่ดี ขับได้สบายใจ","Everything's inside its interval. Drive easy."],act:null};
}
/* คำนวณล่วงหน้า */
function forecast(c,s){
  const rate=s.rate!=null?s.rate:38, out=[];
  if(s.worst&&s.worst.d.left>0){
    const days=Math.round(s.worst.d.left/Math.max(1,rate));
    out.push({ic:"ti-tool",th:`${s.worst.p.th}ครบใน ~${days} วัน`,
      en:`${s.worst.p.en} due in ~${days} days`,
      sub:[`ที่ ${num(s.km+s.worst.d.left)} กม.`,`at ${num(s.km+s.worst.d.left)} km`]});
  }
  if(s.unlogged>0){
    out.push({ic:"ti-clipboard-text",th:`ยังไม่ได้บันทึก ${s.unlogged} รายการ`,
      en:`${s.unlogged} items never recorded`,
      sub:["กรอกแล้วระบบจะเตือนได้ครบขึ้น","fill them in and the reminders get complete"]});
  }
  if(s.perKm>0){
    const m=Math.round(s.perKm*rate*30);
    out.push({ic:"ti-coin",th:`เดือนหน้าน่าจะราว ฿${num(m)}`,en:`Next month ≈ ฿${num(m)}`,
      sub:[`จาก ฿${s.perKm.toFixed(2)}/กม. × ${Math.round(rate)} กม./วัน`,
           `from ฿${s.perKm.toFixed(2)}/km × ${Math.round(rate)} km/day`]});
  }
  if(!out.length)out.push({ic:"ti-info-circle",th:"ยังคำนวณล่วงหน้าไม่ได้",
    en:"Not enough history yet",sub:["บันทึกการเข้าศูนย์หรือเติมน้ำมันสักครั้ง","Log a service or fill-up first"]});
  return out;
}
/* เช็กก่อนออกทริป */
function tripCheck(c,s,km){
  if(!c||!km)return null;
  const blockers=[],warns=[];
  (s.items||[]).forEach(({p,d})=>{
    if(d.left<=0)blockers.push(T(p.th,p.en));
    else if(d.left<km)warns.push(T(p.th,p.en)+" ("+T(`ครบระหว่างทางที่ ~${num(d.left)} กม.`,`due mid-trip at ~${num(d.left)} km`)+")");
  });
  const rainy=isRaining();
  if(blockers.length)return {cls:"bad",ic:"ti-alert-triangle",
    th:"ควรเข้าศูนย์ก่อนออกเดินทาง",en:"Service it before you go",
    body:[`${blockers.slice(0,3).join(" · ")} เลยกำหนดแล้ว การขับไกลจะยิ่งเร่งการสึกหรอ`,
          `${blockers.slice(0,3).join(" · ")} already overdue — a long run only accelerates the wear.`]};
  if(warns.length)return {cls:"warn",ic:"ti-alert-circle",
    th:"ไปได้ แต่จะครบรอบระหว่างทาง",en:"You can go, but it'll come due en route",
    body:[`${warns.slice(0,2).join(" · ")}${rainy?" · ฝนกำลังตก เผื่อเวลาเพิ่ม":""}`,
          `${warns.slice(0,2).join(" · ")}${rainy?" · it's raining, leave extra time":""}`]};
  return {cls:"ok",ic:"ti-circle-check",th:"พร้อมออกเดินทาง",en:"Good to go",
    body:[`ไม่มีรายการไหนครบรอบภายใน ${num(km)} กม. นี้${rainy?" — แต่ฝนกำลังตก ขับระวัง":""}`,
          `Nothing falls due within ${num(km)} km${rainy?" — though it's raining, take care":""}.`]};
}

/* ═══════════ หน้าเรื่องเล่า ═══════════ */
const PAGES=["wx","one","odo","todo","health","cost","trip","recap"];
function palOf(k){
  if(k==="wx"){
    const h=new Date().getHours(), night=h>=19||h<6;
    if(isRaining())return ["#39485F","#586C88","#8A9EB6"];
    if(night)return ["#0F1A30","#20325A","#3C547E"];
    if(WX&&wmo(WX.code)[3]==="cloud")return ["#5A7B9D","#83A4C1","#B6CEDF"];
    return ["#1B6BC9","#4BA0E6","#98D2F1"];
  }
  return {one:["#12243F","#1E3D69","#2F5B94"],
          odo:["#14213D","#243B6B","#3C5A99"],
          todo:["#553010","#864E16","#BB7828"],
          health:["#0E3A32","#15604D","#2C9175"],
          cost:["#311849","#4B2870","#7648A5"],
          trip:["#0E3348","#17516E","#2A7FA0"],
          recap:["#3A1E52","#6B2C6B","#A8437A"]}[k]||["#14213D","#243B6B","#3C5A99"];
}
let curPage=0, tripKm=LG("briefTripKm",300);

function pageWx(){
  if(!WX){
    return `<div class="bkicker"><i class="ti ti-cloud"></i>${T("อากาศวันนี้","Weather today")}</div>
      <h2 class="bhero">${wxState==="loading"?T("กำลังดูสภาพอากาศ...","Checking the sky..."):
        T("ยังไม่ได้ดึงพยากรณ์","No forecast yet")}</h2>
      <p class="bsub">${T("ดึงข้อมูลจริงจาก Open-Meteo — อนุญาตตำแหน่งจะได้ของพื้นที่คุณ ไม่อนุญาตใช้กรุงเทพฯ",
        "Real data from Open-Meteo. Allow location for your area, otherwise Bangkok.")}</p>
      <div class="bacts"><button class="bbtn" id="wxLoad"><i class="ti ti-cloud-download"></i>
        ${T("ดึงพยากรณ์อากาศ","Load forecast")}</button></div>`;
  }
  const [th,en,ic]=wmo(WX.code);
  const DN=EN()?["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]:["อา","จ","อ","พ","พฤ","ศ","ส"];
  return `<div class="bkicker"><i class="ti ti-map-pin"></i>${
    WX.place?esc(WX.place):T("ตำแหน่งของคุณ","Your location")}</div>
    <div class="bwx-now"><div class="deg">${Math.round(WX.temp)}<sup>°</sup></div>
      <i class="ti ${ic} ic"></i></div>
    <h2 class="bhero" style="font-size:clamp(22px,6vw,30px);margin:8px 0 6px">${T(th,en)}</h2>
    <p class="bsub">${T(`สูงสุด ${Math.round(WX.hi)}° ต่ำสุด ${Math.round(WX.lo)}° · ${driveNote()}`,
      `High ${Math.round(WX.hi)}° low ${Math.round(WX.lo)}° · ${driveNote()}`)}</p>
    <div class="bwx-days">${(WX.daily||[]).slice(0,5).map((d,i)=>{const w=wmo(d.code);
      return `<div class="bwx-day"><div class="d">${i===0?T("วันนี้","Today"):DN[new Date(d.day).getDay()]}</div>
        <i class="ti ${w[2]} i"></i><div class="t">${Math.round(d.hi)}°/${Math.round(d.lo)}°</div></div>`}).join("")}</div>`;
}
function driveNote(){
  const kind=WX?wmo(WX.code)[3]:"", h=new Date().getHours();
  const rush=(h>=7&&h<=9)||(h>=16&&h<=19), night=h>=19||h<6;
  if(kind==="rain")return T("ถนนลื่นที่สุดในสิบนาทีแรก เว้นระยะเบรกเพิ่ม","Roads are slickest in the first ten minutes — add braking distance.");
  if(WX&&WX.temp>=35)return T("ร้อนจัด เช็กลมยางและน้ำหล่อเย็นก่อนไปไกล","Very hot — check tyres and coolant before a long run.");
  if(night)return T("กลางคืนทัศนวิสัยลดลง เช็กไฟให้ครบ","Visibility drops at night — check your lights.");
  if(rush)return T("ชั่วโมงเร่งด่วน เครื่องทำงานหนักตอนคลาน","Rush hour — the engine works hard in stop-and-go.");
  return T("อากาศเป็นใจ เหมาะกับการเดินทาง","Good conditions for a drive.");
}
function pageOne(c,s){
  const o=oneThing(c,s), m=s.mood;
  return `<div class="bkicker"><i class="ti ti-target-arrow"></i>${T("วันนี้ทำแค่อย่างเดียวพอ","One thing today")}</div>
    <div class="bmood"><div class="bface">${m.face}</div>
      <div><div style="font-size:13px;opacity:.9;font-weight:700">${T(m.th,m.en)}</div>
        <div style="font-size:12px;opacity:.78;margin-top:3px;line-height:1.5">${T(m.line[0],m.line[1])}</div></div></div>
    <h2 class="bhero" style="margin-top:18px"><i class="ti ${o.ic}" style="font-size:.8em;opacity:.9"></i> ${esc(T(o.th,o.en))}</h2>
    <p class="bsub">${esc(T(o.why[0],o.why[1]))}</p>
    ${s.streak>0?`<div class="bstreak"><i class="ti ti-flame"></i>${
      T(`ดูแลต่อเนื่อง ${s.streak} วัน`,`${s.streak}-day care streak`)}</div>`:""}
    ${o.act?`<div class="bacts">
      <button class="bbtn" data-bact="${o.act.k}" data-bid="${o.act.id||""}">
        <i class="ti ti-check"></i>${T(o.act.th,o.act.en)}</button></div>`:""}`;
}
function pageOdo(c,s){
  if(!c)return noCarPage("ti-gauge",T("เลขไมล์","Mileage"));
  const cw={high:[T("แม่นยำ","Sharp"),"#7CE7B0"],med:[T("พอใช้","Fair"),"#FFD27A"],low:[T("หยาบ","Rough"),"#FF9C9C"]}[s.conf];
  return `<div class="bkicker"><i class="ti ti-gauge"></i>${T("เลขไมล์ประเมิน","Estimated mileage")}</div>
    <div class="bnum" style="font-size:clamp(46px,14vw,72px)">${num(s.km)}</div>
    <p class="bsub" style="margin-top:8px">${T("กม. · ช่วงที่เป็นไปได้","km · likely range")} ${num(s.km-s.pm)}–${num(s.km+s.pm)}</p>
    <div class="bpanel">
      <div class="brow"><span class="bi" style="color:${cw[1]}"><i class="ti ti-circle-dot"></i></span>
        <span class="bd"><b>${T("ความเชื่อมั่น","Confidence")} ${cw[0]}</b>
          <span>±${num(s.pm)} ${T("กม.","km")}${s.rate!=null?T(` · เรียนรู้แล้วว่าขับวันละ ~${Math.round(s.rate)} กม.`,
            ` · learned ~${Math.round(s.rate)} km/day`):""}</span></span></div>
    </div>
    <div class="bacts"><button class="bbtn" data-bact="odo"><i class="ti ti-pencil"></i>${
      T("ยืนยันเลขไมล์","Confirm reading")}</button></div>`;
}
function pageTodo(c,s){
  if(!c)return noCarPage("ti-alert-hexagon",T("สิ่งที่ต้องทำ","Needs attention"));
  const list=[...s.overdue,...s.near].slice(0,4);
  if(!list.length)return `<div class="bkicker"><i class="ti ti-alert-hexagon"></i>${T("สิ่งที่ต้องทำ","Needs attention")}</div>
    <h2 class="bhero">${T("ไม่มีอะไรค้าง","Nothing pending")}</h2>
    <p class="bsub">${T("ทุกรายการยังอยู่ในรอบ ไม่ต้องรีบทำอะไร","Everything's inside its interval — nothing urgent.")}</p>`;
  return `<div class="bkicker"><i class="ti ti-alert-hexagon"></i>${T("สิ่งที่ต้องทำ","Needs attention")}</div>
    <div class="bnum" style="font-size:clamp(40px,12vw,60px)">${list.length}</div>
    <p class="bsub" style="margin-top:6px">${T("รายการที่ควรจัดการ","items worth handling")}</p>
    <div class="bpanel">${list.map(({p,d})=>`<div class="brow">
      <span class="bi"><i class="ti ti-tool"></i></span>
      <span class="bd"><b>${T(p.th,p.en)}</b><span>${d.left<=0
        ? T(`เลยมา ${num(-d.left)} กม.`,`${num(-d.left)} km over`)
        : T(`อีก ${num(d.left)} กม.`,`in ${num(d.left)} km`)}</span></span>
      <button class="cl-mini" data-bact="done" data-bid="${p.k}"
        style="background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.3);color:#fff">
        <i class="ti ti-check"></i></button></div>`).join("")}</div>`;
}
function pageHealth(c,s){
  if(!c)return noCarPage("ti-clipboard-text",T("สถานะตามบันทึก","Record status"));
  const fc=forecast(c,s);
  /* ตัวเลขใหญ่ตรงนี้เคยเป็นคะแนน 0-100 ที่ระบบคิดขึ้นเอง
     เปลี่ยนเป็นจำนวนรายการที่ค้างจริง ซึ่งตรวจสอบย้อนกลับได้ */
  const big=s.overdue.length||s.near.length||0;
  const lab=s.overdue.length?T("รายการเลยกำหนด","items overdue")
    :s.near.length?T("รายการใกล้ครบรอบ","items due soon"):T("รายการที่ค้าง","items pending");
  return `<div class="bkicker"><i class="ti ti-clipboard-text"></i>${T("สถานะและสิ่งที่กำลังจะมา","Status & what's ahead")}</div>
    <div class="bnum" style="font-size:clamp(52px,16vw,80px)">${big}<span style="font-size:.34em;opacity:.7"> ${esc(lab)}</span></div>
    <p class="bsub" style="margin-top:6px">${esc(T(s.mood.th,s.mood.en))} — ${esc(T(s.mood.line[0],s.mood.line[1]))}</p>
    <div class="bpanel">${fc.map(f=>`<div class="brow">
      <span class="bi"><i class="ti ${f.ic}"></i></span>
      <span class="bd"><b>${esc(T(f.th,f.en))}</b><span>${esc(T(f.sub[0],f.sub[1]))}</span></span></div>`).join("")}</div>`;
}
function pageCost(c,s){
  if(!c)return noCarPage("ti-coin",T("ค่าใช้จ่าย","Costs"));
  const diff=s.month-s.prevMonth;
  const pct=s.prevMonth>0?Math.round(diff/s.prevMonth*100):null;
  const up=diff>0;
  return `<div class="bkicker"><i class="ti ti-coin"></i>${T("ค่าใช้จ่ายเดือนนี้","This month")}</div>
    <div class="bnum" style="font-size:clamp(44px,13vw,68px)">฿${num(s.month)}</div>
    <p class="bsub" style="margin-top:8px">${s.prevMonth>0
      ? T(`เดือนก่อน ฿${num(s.prevMonth)} — ${up?"มากขึ้น":"น้อยลง"} ฿${num(Math.abs(diff))}${pct!=null?` (${up?"+":"−"}${Math.abs(pct)}%)`:""}`,
          `Last month ฿${num(s.prevMonth)} — ${up?"up":"down"} ฿${num(Math.abs(diff))}${pct!=null?` (${up?"+":"−"}${Math.abs(pct)}%)`:""}`)
      : T("ยังไม่มีข้อมูลเดือนก่อนมาเทียบ","No previous month to compare yet")}</p>
    <div class="bpanel">
      <div class="brow"><span class="bi"><i class="ti ti-route"></i></span>
        <span class="bd"><b>${s.perKm>0?"฿"+s.perKm.toFixed(2):"—"}</b>
          <span>${T("ต้นทุนต่อกิโลเมตร","cost per kilometre")}</span></span></div>
      ${s.prevMonth>0?`<div class="brow"><span class="bi" style="color:${up?"#FF9C9C":"#7CE7B0"}">
        <i class="ti ti-arrow-${up?"up":"down"}-right"></i></span>
        <span class="bd"><b>${up?T("จ่ายมากกว่าเดือนก่อน","More than last month"):T("จ่ายน้อยกว่าเดือนก่อน","Less than last month")}</b>
          <span>${T("เทียบช่วงเวลาเดียวกัน","same period compared")}</span></span></div>`:""}
    </div>
    <div class="bacts"><button class="bbtn ghost" data-bact="cost"><i class="ti ti-plus"></i>${
      T("บันทึกค่าใช้จ่าย","Log an expense")}</button></div>`;
}
function pageTrip(c,s){
  const v=tripCheck(c,s,tripKm);
  return `<div class="bkicker"><i class="ti ti-route"></i>${T("เช็กก่อนออกทริป","Trip readiness")}</div>
    <h2 class="bhero" style="font-size:clamp(24px,6.6vw,34px)">${T("จะไปไกลแค่ไหน?","How far are you going?")}</h2>
    <p class="bsub">${T("ใส่ระยะทางไป-กลับ แล้วผมจะบอกว่ามีอะไรครบรอบระหว่างทางไหม",
      "Enter the round-trip distance and I'll tell you what falls due en route.")}</p>
    <div class="btrip"><input id="tripKm" type="number" inputmode="numeric" value="${tripKm||""}"
      placeholder="${T("กม.","km")}"/></div>
    <div class="btrip-quick">${[120,300,600,1000].map(k=>
      `<button data-trip="${k}">${num(k)} ${T("กม.","km")}</button>`).join("")}</div>
    ${v?`<div class="bverdict ${v.cls}"><b><i class="ti ${v.ic}"></i> ${esc(T(v.th,v.en))}</b>
      ${esc(T(v.body[0],v.body[1]))}</div>`:""}`;
}
function pageRecap(c,s){
  return `<div class="bkicker"><i class="ti ti-sparkles"></i>${T("สรุปวันนี้","Today at a glance")}</div>
    <canvas class="bshare" id="shareCard" width="1080" height="1350"
      style="max-height:44vh;object-fit:contain"></canvas>
    <div class="bacts">
      <button class="bbtn" id="shareGo"><i class="ti ti-share"></i>${T("แชร์การ์ดนี้","Share this card")}</button>
      <button class="bbtn ghost" id="shareSave"><i class="ti ti-download"></i>${T("บันทึกรูป","Save image")}</button>
    </div>
    <div class="bexit" id="bExit">
      <div class="bexit-ring"><svg width="46" height="46" viewBox="0 0 46 46">
        <circle cx="23" cy="23" r="19" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="3"/>
        <circle id="exitArc" cx="23" cy="23" r="19" fill="none" stroke="#fff" stroke-width="3"
          stroke-linecap="round" stroke-dasharray="119.4" stroke-dashoffset="119.4"/></svg>
        <i class="ti ti-chevron-down"></i></div>
      <div class="bexit-t">${T("เลื่อนต่อเพื่อกลับหน้าหลัก","Keep scrolling to go back")}</div>
    </div>`;
}
const noCarPage=(ic,title)=>`<div class="bkicker"><i class="ti ${ic}"></i>${title}</div>
  <h2 class="bhero">${T("ยังไม่มีรถในระบบ","No car yet")}</h2>
  <p class="bsub">${T("เพิ่มรถของคุณแล้วส่วนนี้จะมีข้อมูลขึ้นมาเอง","Add your car and this fills itself in.")}</p>`;

function render(){
  const wrap=$("briefPages"); if(!wrap)return;
  const c=activeCar(), s=stats(c);
  const F={wx:()=>pageWx(),one:()=>pageOne(c,s),odo:()=>pageOdo(c,s),todo:()=>pageTodo(c,s),
           health:()=>pageHealth(c,s),cost:()=>pageCost(c,s),trip:()=>pageTrip(c,s),recap:()=>pageRecap(c,s)};
  wrap.innerHTML=PAGES.map((k,i)=>
    `<section class="bpage" data-page="${k}" data-vis="${i===0?1:0}">${F[k]()}</section>`).join("");
  $("bpDots").innerHTML=PAGES.map((_,i)=>`<i class="${i===0?"on":""}"></i>`).join("");
  observePages();
  const b=$("wxLoad"); if(b)b.onclick=()=>loadWx(true);
  drawShare(c,s);
}

/* ═══════════ การมองเห็น / จุดบอกหน้า ═══════════ */
let io=null;
function observePages(){
  if(io)io.disconnect();
  const root=$("briefScroll"); if(!root)return;
  io=new IntersectionObserver(es=>{
    es.forEach(e=>{
      e.target.dataset.vis=e.intersectionRatio>0.5?"1":"0";
      if(e.intersectionRatio>0.6){
        const i=[...root.querySelectorAll(".bpage")].indexOf(e.target);
        if(i>=0&&i!==curPage){curPage=i;
          [...$("bpDots").children].forEach((d,j)=>d.classList.toggle("on",j===curPage));}
      }
    });
  },{root,threshold:[0,.5,.6,.9]});
  root.querySelectorAll(".bpage").forEach(p=>io.observe(p));
}

/* ═══════════ ออกจากหน้าโดยเลื่อนต่อที่ท้ายสุด ═══════════ */
let pull=0, exiting=false;
function atBottom(){const el=$("briefScroll");
  return el&&el.scrollTop+el.clientHeight>=el.scrollHeight-4}
function addPull(px){
  if(exiting||!atBottom())  {pull=Math.max(0,pull-px*0.5);drawArc();return}
  pull=Math.max(0,Math.min(140,pull+px));
  drawArc();
  if(pull>=140){exiting=true;leave()}
}
function drawArc(){
  const a=$("exitArc"); if(!a)return;
  const p=Math.min(1,pull/140);
  a.style.strokeDashoffset=(119.4*(1-p)).toFixed(1);
}
function leave(){
  const el=$("v-brief"); if(el)el.style.transition="opacity .3s ease",el.style.opacity="0";
  setTimeout(()=>{if(el)el.style.opacity="";pull=0;exiting=false;drawArc();
    if(window.switchView)window.switchView("home")},220);
}

/* ═══════════ การ์ดสรุปแชร์ได้ ═══════════ */
function drawShare(c,s){
  const cv=$("shareCard"); if(!cv)return;
  const x=cv.getContext("2d"), W=cv.width, H=cv.height;
  const pal=palOf("recap");
  const g=x.createLinearGradient(0,0,W,H);
  g.addColorStop(0,pal[0]);g.addColorStop(.55,pal[1]);g.addColorStop(1,pal[2]);
  x.fillStyle=g;x.fillRect(0,0,W,H);
  x.globalAlpha=.06;x.fillStyle="#fff";
  for(let i=0;i<160;i++)x.fillRect((i*97)%W,(i*211)%H,3,3);
  x.globalAlpha=1;
  const F=(w,sz)=>`${w} ${sz}px "Kanit",system-ui,sans-serif`;
  x.fillStyle="rgba(255,255,255,.82)";x.font=F(600,40);
  x.fillText("SpireONE · Today's Brief",80,132);
  x.fillStyle="#fff";x.font=F(700,96);
  const title=c?(c.name||T("รถของฉัน","My car")):T("ยังไม่มีรถ","No car yet");
  x.fillText(title.slice(0,20),80,268);
  x.fillStyle="rgba(255,255,255,.8)";x.font=F(400,42);
  x.fillText(new Date().toLocaleDateString(EN()?"en-GB":"th-TH",
    {weekday:"long",day:"numeric",month:"long",year:"numeric"}),80,336);
  const box=(cx,cy,w,h)=>{x.fillStyle="rgba(255,255,255,.14)";
    x.beginPath();x.roundRect(cx,cy,w,h,34);x.fill()};
  const stat=(cx,cy,w,val,lab)=>{box(cx,cy,w,220);
    x.fillStyle="#fff";x.font=F(700,88);x.fillText(val,cx+40,cy+128);
    x.fillStyle="rgba(255,255,255,.75)";x.font=F(500,34);x.fillText(lab,cx+40,cy+180)};
  stat(80,420,440,String(s.overdue.length),T("เลยกำหนด","Overdue"));
  stat(560,420,440,s.km?num(s.km):"—",T("กิโลเมตร","Kilometres"));
  stat(80,672,440,"฿"+num(s.month),T("ใช้จ่ายเดือนนี้","Spent this month"));
  stat(560,672,440,s.streak?String(s.streak):"0",T("วันดูแลต่อเนื่อง","Day streak"));
  box(80,924,920,250);
  x.fillStyle="rgba(255,255,255,.75)";x.font=F(500,34);
  x.fillText(T("วันนี้ทำแค่อย่างเดียวพอ","One thing today"),120,990);
  x.fillStyle="#fff";x.font=F(700,52);
  const o=oneThing(c,s), line=T(o.th,o.en);
  x.fillText(line.length>26?line.slice(0,26)+"…":line,120,1064);
  if(WX){x.fillStyle="rgba(255,255,255,.7)";x.font=F(400,36);
    x.fillText(`${Math.round(WX.temp)}° ${T(wmo(WX.code)[0],wmo(WX.code)[1])}`,120,1126)}
  x.fillStyle="rgba(255,255,255,.5)";x.font=F(400,32);
  x.fillText("spireone",80,1272);
}
async function shareCard(save){
  const cv=$("shareCard"); if(!cv)return;
  const blob=await new Promise(r=>cv.toBlob(r,"image/png"));
  if(!blob)return;
  const file=new File([blob],"spireone-brief.png",{type:"image/png"});
  if(!save&&navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:"SpireONE — Today's Brief"});return}catch(e){if(e.name==="AbortError")return}
  }
  const a=D.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download="spireone-brief.png"; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),3000);
}

/* ═══════════ อ่านสรุปให้ฟัง ═══════════ */
let speaking=false;
function briefText(){
  const c=activeCar(), s=stats(c), out=[];
  const hail=new Date().getHours()<12?T("สวัสดีตอนเช้า","Good morning"):T("สวัสดี","Hello");
  out.push(hail+".");
  if(WX)out.push(T(`ตอนนี้ ${Math.round(WX.temp)} องศา ${wmo(WX.code)[0]}. ${driveNote()}`,
                   `It's ${Math.round(WX.temp)} degrees, ${wmo(WX.code)[1]}. ${driveNote()}`));
  const o=oneThing(c,s);
  out.push(T(`วันนี้ทำแค่อย่างเดียวพอ: ${o.th}. ${o.why[0]}`,
             `One thing today: ${o.en}. ${o.why[1]}`));
  if(c){
    out.push(T(`เลขไมล์ประเมิน ${num(s.km)} กิโลเมตร`,`Estimated mileage ${num(s.km)} kilometres.`));
    if(s.logged)out.push(T(`ตามบันทึกที่มี ${s.mood.th} เลยกำหนด ${s.overdue.length} รายการ`,
                           `Going by your records: ${s.mood.en}, ${s.overdue.length} overdue.`));
    if(s.month)out.push(T(`เดือนนี้ใช้จ่ายไป ${num(s.month)} บาท`,`Spent ${num(s.month)} baht this month.`));
  }
  return out.join(" ");
}
function toggleSpeak(){
  if(!("speechSynthesis" in window)){toastx(T("เบราว์เซอร์นี้อ่านออกเสียงไม่ได้","Speech not supported here"));return}
  const btn=$("bpSpeak");
  if(speaking){speechSynthesis.cancel();speaking=false;btn&&btn.classList.remove("on");return}
  const u=new SpeechSynthesisUtterance(briefText());
  u.lang=EN()?"en-US":"th-TH"; u.rate=1.02;
  u.onend=u.onerror=()=>{speaking=false;btn&&btn.classList.remove("on")};
  speaking=true; btn&&btn.classList.add("on");
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}

/* ═══════════ พื้นหลัง canvas ═══════════ */
let cx=null,W=0,H=0,tick=0,prog=0,drops=[],running=false;
function initCanvas(){
  const cv=$("briefCanvas"); if(!cv)return; cx=cv.getContext("2d");
  const fit=()=>{const d=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;
    cv.width=W*d;cv.height=H*d;cv.style.width=W+"px";cv.style.height=H+"px";cx.setTransform(d,0,0,d,0,0);
    drops=Array.from({length:innerWidth<620?70:120},()=>drop(true))};
  addEventListener("resize",fit); fit();
}
const drop=i=>({x:Math.random()*W,y:i?Math.random()*H:-20,l:8+Math.random()*16,
  s:5+Math.random()*7,o:.15+Math.random()*.35});
const hx=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const mix=(a,b,t)=>{const A=hx(a),B=hx(b);
  return `rgb(${Math.round(A[0]+(B[0]-A[0])*t)},${Math.round(A[1]+(B[1]-A[1])*t)},${Math.round(A[2]+(B[2]-A[2])*t)})`};
function syncProg(){
  const el=$("briefScroll"); if(!el)return;
  const h=Math.max(1,el.clientHeight);
  prog=Math.max(0,Math.min(PAGES.length-1,el.scrollTop/h));
}
function draw(){
  if(!cx)return;
  const i=Math.max(0,Math.min(PAGES.length-1,Math.floor(prog)));
  const j=Math.min(PAGES.length-1,i+1);
  const raw=prog-i, f=raw*raw*(3-2*raw);
  const A=palOf(PAGES[i]), B=palOf(PAGES[j]);
  const g=cx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,mix(A[0],B[0],f)); g.addColorStop(.55,mix(A[1],B[1],f)); g.addColorStop(1,mix(A[2],B[2],f));
  cx.fillStyle=g; cx.fillRect(0,0,W,H);
  const palm=Math.max(0,1-prog*0.8);
  if(palm>0.02){
    cx.save(); cx.fillStyle="#08221A";
    cx.globalAlpha=palm*0.13; palmAt(W*0.12,H*1.06,H*0.30,-0.14);
    cx.globalAlpha=palm*0.11; palmAt(W*0.92,H*1.08,H*0.34,0.12);
    cx.globalAlpha=palm*0.07; palmAt(W*0.58,H*1.10,H*0.22,0.03);
    cx.restore();
  }
  if(palm>0.05&&!isRaining()){
    const night=new Date().getHours()>=19||new Date().getHours()<6;
    cx.save(); cx.globalAlpha=palm*(night?.5:.7);
    const sx=W*.78, sy=H*.2, r=Math.min(W,H)*.09;
    const sg=cx.createRadialGradient(sx,sy,0,sx,sy,r*2.6);
    sg.addColorStop(0,night?"rgba(226,235,255,.95)":"rgba(255,236,170,.95)");
    sg.addColorStop(.4,night?"rgba(180,200,240,.35)":"rgba(255,214,110,.4)");
    sg.addColorStop(1,"transparent"); cx.fillStyle=sg;
    cx.beginPath();cx.arc(sx,sy,r*2.6,0,6.283);cx.fill(); cx.restore();
  }
  if(isRaining()&&!reduce.matches){
    const inten=Math.max(0,1-prog*.45);
    cx.save();cx.strokeStyle="#DCEBFF";cx.lineWidth=1.2;cx.lineCap="round";
    drops.forEach(d=>{cx.globalAlpha=d.o*inten;
      cx.beginPath();cx.moveTo(d.x,d.y);cx.lineTo(d.x-2.5,d.y+d.l);cx.stroke();
      d.y+=d.s;d.x-=.6; if(d.y>H+20)Object.assign(d,drop(false))});
    cx.restore();
  }
  cx.save();cx.globalAlpha=.05;cx.fillStyle="#fff";
  for(let k=0;k<26;k++){const px=((k*137.5+tick*.25)%(W+60))-30,py=((k*221.1+tick*.12)%(H+60))-30;
    cx.beginPath();cx.arc(px,py,1.4,0,6.283);cx.fill()}
  cx.restore();
}
function palmAt(x,base,h,lean){
  cx.save();cx.translate(x,base);
  const tx=lean*h,ty=-h,w=Math.max(3,h*.022);
  cx.beginPath();cx.moveTo(-w,0);cx.quadraticCurveTo(lean*h*.45,-h*.55,tx,ty);
  cx.quadraticCurveTo(lean*h*.45-w*1.5,-h*.55,-w*2.6,0);cx.closePath();cx.fill();
  for(let a=0;a<8;a++){
    const ang=-Math.PI*.95+a*(Math.PI*1.9/7), len=h*.42, dr=len*.42;
    const ex=tx+Math.cos(ang)*len, ey=ty+Math.sin(ang)*len+dr;
    cx.beginPath();cx.moveTo(tx,ty);
    cx.quadraticCurveTo(tx+Math.cos(ang)*len*.55,ty+Math.sin(ang)*len*.55-len*.1,ex,ey);
    cx.quadraticCurveTo(tx+Math.cos(ang)*len*.5,ty+Math.sin(ang)*len*.5+len*.14,tx,ty);
    cx.closePath();cx.fill();
  }
  cx.restore();
}
function loop(){ if(running){tick++;draw()} requestAnimationFrame(loop) }
requestAnimationFrame(loop);

/* ═══════════ สร้างหน้า ═══════════ */
function ensureView(){
  if($("v-brief"))return;
  const main=D.querySelector(".main"); if(!main)return;
  const s=D.createElement("section"); s.className="view"; s.id="v-brief";
  s.innerHTML=`<div class="bp-bar">
      <button class="bp-ico" id="bpBack" aria-label="${T("กลับ","Back")}"><i class="ti ti-arrow-left"></i></button>
      <b>Today's Brief</b>
      <button class="bp-ico" id="bpSpeak" style="margin-left:auto" aria-label="${T("อ่านให้ฟัง","Read aloud")}">
        <i class="ti ti-volume"></i></button>
    </div>
    <div class="bp-dots" id="bpDots"></div>
    <div class="scroll" id="briefScroll"><div id="briefPages"></div></div>`;
  main.appendChild(s);
  const cv=D.createElement("canvas"); cv.id="briefCanvas"; cv.setAttribute("aria-hidden","true");
  D.body.insertBefore(cv,D.body.firstChild);
  $("bpBack").onclick=leave;
  $("bpSpeak").onclick=toggleSpeak;
  const sc=$("briefScroll");
  sizePages(); addEventListener("resize",sizePages);
  sc.addEventListener("scroll",()=>{syncProg();if(!atBottom()&&pull){pull=0;drawArc()}},{passive:true});
  sc.addEventListener("wheel",e=>{if(e.deltaY>0)addPull(e.deltaY*.6)},{passive:true});
  let ty=0;
  sc.addEventListener("touchstart",e=>{ty=e.touches[0].clientY},{passive:true});
  sc.addEventListener("touchmove",e=>{const d=ty-e.touches[0].clientY;ty=e.touches[0].clientY;
    if(d>0)addPull(d*.9)},{passive:true});
  initCanvas();
}

/* ความสูงหน้าต้องเท่ากับกล่องเลื่อนพอดี ไม่งั้น scroll-snap ไม่ล็อค */
function sizePages(){
  const sc=$("briefScroll"), v=$("v-brief"); if(!sc||!v)return;
  const h=sc.clientHeight; if(h>0)v.style.setProperty("--bph",h+"px");
}
window.addEventListener("orientationchange",()=>setTimeout(sizePages,300));

/* ═══════════ การกระทำในหน้า ═══════════ */
D.addEventListener("click",async e=>{
  const q=e.target.closest("[data-trip]");
  if(q){tripKm=+q.dataset.trip;LSt("briefTripKm",tripKm);
    const p=D.querySelector('[data-page="trip"]'); if(p){const c=activeCar();p.innerHTML=pageTrip(c,stats(c))}
    return}
  const a=e.target.closest("[data-bact]"); if(a){
    const k=a.dataset.bact, c=activeCar(); if(!c)return;
    if(k==="done"){
      const cl=CL(); if(!cl)return;
      const km=ODO()?ODO().value(c):(parseInt(c.mileage)||0);
      const l=cl.getLog(c.id);
      l.services.push({k:a.dataset.bid,km,amount:0,date:new Date().toISOString().slice(0,10)});
      LSt("carlab_log_"+c.id,l);
      try{ODO()&&ODO().confirm(c,km,"service")}catch(err){}
      toastx(T("บันทึกว่าทำแล้ว","Marked done"),"ti-check"); render();
      try{window.clRefreshWidgets&&window.clRefreshWidgets();window.odoRefresh&&window.odoRefresh()}catch(err){}
      return;
    }
    if(k==="odo"||k==="cost"){
      leave();
      setTimeout(()=>{window.openCarDetail&&window.openCarDetail(c.id);
        setTimeout(()=>{const t=D.querySelector(`[data-tab="${k==="odo"?"odo":"cost"}"]`);t&&t.click()},160)},320);
      return;
    }
  }
  if(e.target.closest("#shareGo")){shareCard(false);return}
  if(e.target.closest("#shareSave")){shareCard(true);return}
});
D.addEventListener("input",e=>{
  if(e.target&&e.target.id==="tripKm"){
    tripKm=+e.target.value||0; LSt("briefTripKm",tripKm);
    clearTimeout(window.__tripT);
    window.__tripT=setTimeout(()=>{
      const p=D.querySelector('[data-page="trip"]'); if(!p)return;
      const c=activeCar(), v=tripCheck(c,stats(c),tripKm);
      let box=p.querySelector(".bverdict");
      if(!v){if(box)box.remove();return}
      if(!box){box=D.createElement("div");p.appendChild(box)}
      box.className="bverdict "+v.cls;
      box.innerHTML=`<b><i class="ti ${v.ic}"></i> ${esc(T(v.th,v.en))}</b>${esc(T(v.body[0],v.body[1]))}`;
    },400);
  }
});
function toastx(m,ic){try{if(typeof window.toast==="function")window.toast(m,ic)}catch(e){}}

/* ═══════════ วิดเจ็ตเล็ก + การซ่อนวิดเจ็ตอื่น ═══════════ */
const OTHERS=["w-odo","w-todo","w-health","w-cost","w-drive"];
function briefOn(){const t=LG("widgetToggles",{})||{};return t["w-brief"]!==false}
function syncOthers(){
  const on=briefOn();
  OTHERS.forEach(id=>{const el=$(id); if(!el)return;
    if(on)el.style.display="none";
    else{const t=LG("widgetToggles",{})||{};el.style.display=t[id]===false?"none":"block"}
    const chk=$("chk-"+id.replace("w-",""));
    if(chk){chk.disabled=on; chk.parentElement.style.opacity=on?".45":"";}
  });
}
/* ══════════════════════════════════════════════════════════════════
   ฉากหลังวิดเจ็ต — ท้องฟ้าตามอากาศจริง + รถวิ่งบนถนน
   แยกเป็นชั้นๆ ขนาดคงที่ ไม่ยืดตามการ์ด เพราะ SVG ที่ยืดจะถูกครอปจนถนนหาย
   ══════════════════════════════════════════════════════════════════ */
function bwScene(){
  const kind=WX?wmo(WX.code)[3]:"clear";
  const code=WX?WX.code:0;
  const h=new Date().getHours(), night=(h<6||h>=19);
  const storm=code>=95;

  /* ── ชั้นฟ้า: ดวงอาทิตย์/จันทร์ ดาว เมฆ ฝน (กล่องคงที่มุมขวาบน) ── */
  let sky="";
  if(night){
    sky+=`<g class="bw-moon"><circle cx="112" cy="26" r="13" fill="#fff" opacity=".85"/>
      <circle cx="106" cy="22" r="12" fill="#5F9BDA" opacity=".6"/></g>`;
    for(let i=0;i<10;i++){
      const x=8+((i*29)%140), y=6+((i*37)%54);
      sky+=`<circle class="bw-star" cx="${x}" cy="${y}" r="${i%3?1:1.5}" fill="#fff"
        style="--d:${(2.4+(i%4)*0.7).toFixed(1)}s;--dl:${(i*0.31).toFixed(2)}s"/>`;
    }
  }else if(kind==="clear"){
    sky+=`<g class="bw-sun"><g class="bw-rays">${
      Array.from({length:12},(_,i)=>`<rect x="111" y="0" width="2" height="8" rx="1" fill="#fff"
        transform="rotate(${i*30} 112 26)"/>`).join("")}</g>
      <circle cx="112" cy="26" r="13" fill="#fff" opacity=".92"/>
      <circle class="bw-halo" cx="112" cy="26" r="22" fill="#fff" opacity=".16"/></g>`;
  }else{
    sky+=`<circle cx="112" cy="24" r="12" fill="#fff" opacity=".5"/>`;
  }
  const cloud=(x,y,sc,op,dur,dl)=>`<g class="bw-cl" style="--y:${y};--s:${sc};--o:${op};--d:${dur}s;--dl:${dl}s">
    <path d="M0 14c-5 0-9-4-9-9s4-9 9-9c1-6 6-10 12-10 7 0 13 5 14 12 5 0 9 4 9 8s-4 8-9 8z" fill="#fff"/></g>`;
  sky+=cloud(0,30,1.15,.34,30,0)+cloud(0,14,.8,.24,44,-11)+cloud(0,50,1.5,.16,56,-26);
  if(kind==="cloud")sky+=cloud(0,38,1.7,.3,38,-19);
  if(kind==="rain"){
    const n=storm?16:11;
    sky+=`<g class="bw-rain">${Array.from({length:n},(_,i)=>{
      const x=6+i*13+((i*7)%9);
      return `<line x1="${x}" y1="0" x2="${x-5}" y2="11" stroke="#fff" stroke-width="1.4"
        stroke-linecap="round" style="--dl:${((i%6)*0.14).toFixed(2)}s;--d:${(0.7+(i%3)*0.14).toFixed(2)}s"/>`
    }).join("")}</g>`;
  }
  const skyL=`<svg class="bw-sky" viewBox="0 0 150 80" aria-hidden="true">${sky}</svg>`;
  const flash=storm?`<span class="bw-flash"></span>`:"";

  /* ── ชั้นเมือง: บล็อกสี่เหลี่ยม ยืดตามกว้างได้โดยไม่เสียรูป ── */
  const blocks=Array.from({length:20},(_,i)=>{
    const w=13+((i*11)%12), hh=14+((i*29)%26);
    return `<rect x="${i*27}" y="${40-hh}" width="${w}" height="${hh}" rx="1.5"/>`}).join("");
  const cityL=`<svg class="bw-city" viewBox="0 0 540 40" preserveAspectRatio="none" aria-hidden="true">
    <g class="bw-cityrun">${blocks}</g></svg>`;

  /* ── ชั้นถนน + รถ: รถขนาดคงที่ วิ่งจากซ้ายไปขวาตลอดความกว้างการ์ด ── */
  const carL=`<span class="bw-road"><span class="bw-lane"></span>
    <span class="bw-car"><svg viewBox="0 0 100 28" aria-hidden="true"><g class="bw-bob">
      ${night?`<path class="bw-beam" d="M92 12l34-8v22l-34-6z" fill="#FFF3C4" opacity=".45"/>`:""}
      <path d="M4 20c1-7 4-11 9-12l14-2c4-4 9-6 15-6h13c7 0 13 3 18 8l12 2c6 1 9 5 9 10z"
        fill="#fff" opacity=".95"/>
      <path d="M31 8h11v8H26zM46 8h11c4 0 8 2 11 5l3 3H46z" fill="#2F6FB8" opacity=".5"/>
      <g class="bw-wh" style="--cx:24px;--cy:20px"><circle cx="24" cy="20" r="6" fill="#fff"/>
        <rect x="23" y="15" width="2" height="10" fill="#4C8AC8"/></g>
      <g class="bw-wh" style="--cx:70px;--cy:20px"><circle cx="70" cy="20" r="6" fill="#fff"/>
        <rect x="69" y="15" width="2" height="10" fill="#4C8AC8"/></g>
    </g></svg></span></span>`;

  return `<span class="bw-scene${night?" night":""}">${skyL}${cityL}${carL}${flash}</span>`;
}function widgetShell(){
  return `<div class="widget wbrief" id="w-brief" draggable="true">
    <button class="bw" id="briefCard"></button>
    <div class="bw-ctl">
      <span class="widget-drag-handle"><i class="ti ti-hand-grab"></i></span>
      <button class="widget-nav-btn" onclick="moveWidget('w-brief',-1);event.stopPropagation();"><i class="ti ti-arrow-narrow-up"></i></button>
      <button class="widget-nav-btn" onclick="moveWidget('w-brief',1);event.stopPropagation();"><i class="ti ti-arrow-narrow-down"></i></button>
    </div>
  </div>`;
}
function fillWidget(){
  const el=$("briefCard"); if(!el)return;
  const c=activeCar(), s=stats(c), now=new Date(), h=now.getHours();
  const hail=h<11?T("สรุปเช้านี้","This morning"):h<16?T("สรุปช่วงบ่าย","This afternoon")
    :h<19?T("สรุปช่วงเย็น","This evening"):T("สรุปคืนนี้","Tonight");
  const date=now.toLocaleDateString(EN()?"en-GB":"th-TH",{weekday:"long",day:"numeric",month:"long"});
  let temp="",ic="ti-cloud"; if(WX){ic=wmo(WX.code)[2];temp=Math.round(WX.temp)+"°"}
  const chips=[];
  const o=oneThing(c,s);
  chips.push({t:T(o.th,o.en),hot:!!(s.overdue&&s.overdue.length)});
  /* ต่อภาษี/พ.ร.บ. ที่ใกล้ครบกำหนด มาก่อนตัวเลขสุขภาพ เพราะเลยกำหนดแล้วมีค่าปรับ */
  try{ (window.spireRenewChips?window.spireRenewChips():[]).forEach(x=>chips.push(x)) }catch(e){}
  if(s.overdue.length)chips.push({t:T(`เลยกำหนด ${s.overdue.length}`,`${s.overdue.length} overdue`),hot:true});
  else if(s.near.length)chips.push({t:T(`ใกล้ครบ ${s.near.length}`,`${s.near.length} due soon`),hot:false});
  if(s.streak>1)chips.push({t:T(`${s.streak} วันติด`,`${s.streak}-day streak`),hot:false});
  el.innerHTML=`${bwScene()}
    <div class="bw-eye"><i class="ti ti-sunrise"></i>Today's Brief</div>
    <div class="bw-top"><div><div class="bw-t">${esc(hail)}</div><div class="bw-d">${esc(date)}</div></div>
      ${temp?`<div class="bw-temp"><i class="ti ${ic}"></i><b>${temp}</b></div>`:""}</div>
    <div class="bw-chips">${chips.slice(0,3).map(x=>
      `<span class="bw-chip${x.hot?" hot":""}">${esc(x.t)}</span>`).join("")}</div>
    <div class="bw-go">${T("เปิดสรุปวันนี้","Open your brief")} <i class="ti ti-arrow-right"></i></div>`;
  el.onclick=openBrief;
}
function openBrief(){ ensureView(); if(window.switchView)window.switchView("brief") }

const origSwitch=window.switchView;
if(typeof origSwitch==="function"){
  window.switchView=function(v){
    if(v==="brief"){
      ensureView();
      D.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id==="v-brief"));
      D.querySelectorAll(".nav-links a").forEach(a=>a.classList.remove("active"));
      D.body.dataset.briefOpen="1"; running=true; curPage=0; prog=0; pull=0;
      render(); if(!wxFresh())loadWx(false);
      requestAnimationFrame(sizePages);
      const sc=$("briefScroll"); if(sc)sc.scrollTop=0;
      try{const dd=$("dd");if(dd)dd.classList.remove("show")}catch(e){}
      return;
    }
    if(speaking){speechSynthesis.cancel();speaking=false}
    D.body.dataset.briefOpen="0"; running=false;
    const bv=$("v-brief"); if(bv)bv.classList.remove("active");
    const r=origSwitch.apply(this,arguments);
    syncOthers(); fillWidget();
    return r;
  };
}
const origToggle=window.toggleWidget;
if(typeof origToggle==="function"){
  window.toggleWidget=function(id,show){
    const r=origToggle.apply(this,arguments);
    if(id==="w-brief")syncOthers();
    return r;
  };
}

/* ═══════════ หน้าการาจ ═══════════ */
function garageSummary(){
  const list=$("garageList"); if(!list)return;
  const cl=CL();
  list.querySelectorAll(".gcard-wrap").forEach((card,i)=>{
    if(card.querySelector(".gsum"))return;
    const g=cars()[i]; if(!g)return;
    const km=ODO()?ODO().value(g):(parseInt(g.mileage)||0);
    let h=null,next=null;
    try{ if(cl&&cl.health){h=cl.health(g);
      next=h.items.slice().sort((a,b)=>a.d.left-b.d.left)[0]||null} }catch(e){}
    const col=h?(h.total>=70?"var(--ok)":h.total>=40?"var(--accent-2)":"var(--danger)"):"var(--faint)";
    const box=D.createElement("div"); box.className="gsum";
    box.innerHTML=`<div class="gsum-row">
        <div class="gsum-cell"><b style="color:${col}">${h?h.total:"—"}</b><span>${T("สุขภาพรถ","Health")}</span></div>
        <div class="gsum-cell"><b>${num(km)}</b><span>${T("กม. (ประเมิน)","km est.")}</span></div>
        <div class="gsum-cell"><b>${next?(next.d.left>0?num(next.d.left):T("เลย","Over")):"—"}<small>${
          next&&next.d.left>0?T(" กม."," km"):""}</small></b>
          <span>${next?esc(T(next.p.th,next.p.en)):T("กำหนดถัดไป","Next due")}</span></div>
      </div>
      <button class="btn primary gsum-btn" data-gdetail="${esc(g.id)}">
        <i class="ti ti-list-details"></i> ${T("ดูรายละเอียดทั้งหมด","View full details")}</button>`;
    const hist=card.querySelector(".ghist");
    if(hist)card.insertBefore(box,hist); else card.appendChild(box);
  });
}
D.addEventListener("click",e=>{
  const b=e.target.closest("[data-gdetail]");
  if(b&&window.openCarDetail){e.stopPropagation();window.openCarDetail(b.dataset.gdetail)}
});

function mount(){
  const grid=$("widgetGrid");
  if(grid&&!$("w-brief")){
    const t=D.createElement("template"); t.innerHTML=widgetShell().trim();
    /* Brief อยู่ใบแรกเสมอ — carlab เรียงใบอื่นไว้ก่อนแล้ว จึงต้องแทรกหัวแถว */
    grid.insertBefore(t.content.firstChild,grid.firstChild);
    try{const tg=LG("widgetToggles",{})||{};if(tg["w-brief"]===undefined){tg["w-brief"]=true;LSt("widgetToggles",tg)}}catch(e){}
    const panel=D.querySelector("#customizePanel div[style*='flex-wrap']");
    if(panel&&!panel.querySelector("[data-briefchk]")){
      const l=D.createElement("label"); l.className="toggle-label"; l.dataset.briefchk="1";
      l.style.fontWeight="700";
      l.innerHTML=`<input type="checkbox" id="chk-brief" ${briefOn()?"checked":""}
        onchange="toggleWidget('w-brief',this.checked)"> <span>Today's Brief ${
        T("(รวมข้อมูลทั้งหมด)","(holds everything)")}</span>`;
      panel.insertBefore(l,panel.firstChild);
    }
    try{if(typeof window.saveWidgetLayout==="function")window.saveWidgetLayout()}catch(e){}
  }
  fillWidget(); ensureView(); syncOthers(); garageSummary();
  if(!wxFresh()&&wxState==="idle")loadWx(false);
}
window.briefRefresh=()=>{fillWidget();if(D.body.dataset.briefOpen==="1")render()};
if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",mount); else mount();
setTimeout(mount,1100);
new MutationObserver(()=>{garageSummary();syncOthers()}).observe(D.body,{childList:true,subtree:true});
setInterval(()=>{fillWidget();if(D.body.dataset.briefOpen==="1")render()},18e4);
})();

;

/* ══════════════════════════════════════════════════════════════════
   SPIRE ROOM — ห้อง 3 มิติจริงด้วย WebGL เขียนเอง ไม่พึ่งไลบรารีภายนอก
   • เรขาคณิตจริง: พื้น เพดาน ผนังซ้าย-ขวา ผนังหลัง + ราวไฟเรืองแสง
   • ผนังไม่เรียบ — สร้างลายแผงเว้า ร่องต่อ ช่องระบาย และซี่โครงในเชดเดอร์
   • แสงจุดสามดวง + สเปคูลาร์ + หมอกระยะ + ขอบมืด
   window.SpireRoom.mount(canvas,{tint:[r,g,b]}) -> {start,stop,look,setTint,resize}
   ══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
const VS=`
attribute vec3 aPos; attribute vec3 aNrm; attribute vec2 aUV; attribute float aKind;
uniform mat4 uProj,uView;
varying vec3 vP,vN; varying vec2 vUV; varying float vK;
void main(){ vP=aPos; vN=aNrm; vUV=aUV; vK=aKind;
  gl_Position=uProj*uView*vec4(aPos,1.0); }`;

const FS=`
precision highp float;
varying vec3 vP,vN; varying vec2 vUV; varying float vK;
uniform vec3 uEye,uTint;
uniform float uTime;
uniform vec2 uRes;

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }

/* ผิวผนัง: เรียบเข้ม เห็นแค่ร่องต่อแผงจาง ๆ ให้รู้ว่าเป็นระนาบจริง
   ไม่มีลายช่องระบาย/ซี่โครง — ลายเยอะแล้วดูเชย */
void panel(vec2 uv,out float base,out float ao,out float bev,out float emis){
  vec2 cell=vec2(3.2,2.4);
  vec2 f=fract(uv/cell);
  vec2 d=min(f,1.0-f)*cell;
  float g=min(d.x,d.y);
  ao=smoothstep(0.0,0.045,g);
  bev=(1.0-smoothstep(0.045,0.16,g))*ao;
  emis=0.0;
  base=0.030;
}

vec3 lightAt(vec3 p,vec3 n,vec3 v,vec3 lp,vec3 lc,float pw,float rough){
  vec3 L=lp-p; float dist=length(L); L/=dist;
  float att=pw/(1.0+0.085*dist*dist+0.20*dist);
  float dif=max(dot(n,L),0.0);
  vec3 H=normalize(L+v);
  float spec=pow(max(dot(n,H),0.0),rough)*0.55;
  return lc*att*(dif+spec);
}

void main(){
  vec3 N=normalize(vN), V=normalize(uEye-vP);

  /* ราวไฟ / ขอบเรืองแสง */
  if(vK>1.5){
    float pulse=0.86+0.14*sin(uTime*0.6+vP.z*0.35);
    vec3 c=(vK>2.5)?uTint:vec3(0.42,0.66,0.92);
    gl_FragColor=vec4(c*pulse*0.34,1.0); return;
  }

  float base,ao,bev,emis;
  panel(vUV,base,ao,bev,emis);

  vec3 alb=vec3(base)*vec3(0.80,0.90,1.12);
  if(vK>0.5) alb*=0.70;                  /* พื้นเข้มกว่านิด */

  vec3 col=alb*0.035;                                        /* แสงรอบทิศ */
  col+=alb*lightAt(vP,N,V,vec3( 0.0, 1.62,-2.0),vec3(0.40,0.62,0.92),1.05,60.0);
  col+=alb*lightAt(vP,N,V,vec3( 0.0,-0.90, 3.4),uTint,       0.46,34.0);
  col+=alb*lightAt(vP,N,V,vec3(-3.6,-1.95,-8.0),vec3(0.16,0.28,0.55),0.40,24.0);
  col+=alb*lightAt(vP,N,V,vec3( 3.6,-1.95,-8.0),vec3(0.16,0.28,0.55),0.40,24.0);

  col*=mix(0.60,1.0,ao);                 /* ร่องต่อมืดลง */
  col+=bev*vec3(0.020,0.030,0.052);         /* ขอบลบมุมรับแสง */
  col+=emis*uTint*0.28;

  /* เงาสะท้อนอ่อน ๆ บนพื้น */
  if(vK>0.5 && vK<1.5){
    float m=exp(-max(0.0,vP.z+13.0)*0.02);
    col+=uTint*0.016*m*max(0.0,1.0-abs(vP.x)*0.22);
  }

  /* หมอกระยะ + ขอบมืด */
  float fog=1.0-exp(-max(0.0,-(vP.z)-0.5)*0.150);
  col=mix(col,vec3(0.004,0.007,0.016),clamp(fog,0.0,0.95));

  col=col/(col+vec3(1.25));              /* โทนแมป */
  /* ขอบจอมืดลง ให้ UI เด่นขึ้น */
  vec2 q=gl_FragCoord.xy/uRes;
  float vig=smoothstep(1.15,0.28,length((q-0.5)*vec2(1.25,1.0))*1.6);
  col*=mix(0.22,1.0,vig);
  col=pow(col,vec3(0.4545));
  gl_FragColor=vec4(col,1.0);
}`;

/* ── เรขาคณิต ── */
const W=11.0,H=5.4,ZB=-20.0,ZF=8.5;
function build(){
  const P=[],N=[],U=[],K=[];
  function quad(a,b,c,d,n,uvs,kind){
    const idx=[0,1,2,0,2,3],v=[a,b,c,d];
    for(const i of idx){ P.push(v[i][0],v[i][1],v[i][2]); N.push(n[0],n[1],n[2]);
      U.push(uvs[i][0],uvs[i][1]); K.push(kind) }
  }
  const hw=W/2,hh=H/2;
  /* พื้น */
  quad([-hw,-hh,ZF],[hw,-hh,ZF],[hw,-hh,ZB],[-hw,-hh,ZB],[0,1,0],
       [[-hw,ZF],[hw,ZF],[hw,ZB],[-hw,ZB]],1);
  /* เพดาน */
  quad([-hw,hh,ZB],[hw,hh,ZB],[hw,hh,ZF],[-hw,hh,ZF],[0,-1,0],
       [[-hw,ZB],[hw,ZB],[hw,ZF],[-hw,ZF]],0);
  /* ผนังซ้าย */
  quad([-hw,-hh,ZB],[-hw,-hh,ZF],[-hw,hh,ZF],[-hw,hh,ZB],[1,0,0],
       [[ZB,-hh],[ZF,-hh],[ZF,hh],[ZB,hh]],0);
  /* ผนังขวา */
  quad([hw,-hh,ZF],[hw,-hh,ZB],[hw,hh,ZB],[hw,hh,ZF],[-1,0,0],
       [[ZF,-hh],[ZB,-hh],[ZB,hh],[ZF,hh]],0);
  /* ผนังหลัง */
  quad([-hw,-hh,ZB],[hw,-hh,ZB],[hw,hh,ZB],[-hw,hh,ZB],[0,0,1],
       [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]],0);

  /* ราวไฟเพดานสองเส้น */
  [-2.9,2.9].forEach(x=>{
    quad([x-0.065,hh-0.012,ZB+0.4],[x+0.065,hh-0.012,ZB+0.4],
         [x+0.065,hh-0.012,ZF-0.4],[x-0.065,hh-0.012,ZF-0.4],[0,-1,0],
         [[0,0],[1,0],[1,1],[0,1]],2);
  });
  /* ไฟคอฟตามขอบพื้นชิดผนัง (สีธีม) */
  [-hw+0.16,hw-0.16].forEach(x=>{
    quad([x-0.055,-hh+0.012,ZB+0.4],[x+0.055,-hh+0.012,ZB+0.4],
         [x+0.055,-hh+0.012,ZF-0.4],[x-0.055,-hh+0.012,ZF-0.4],[0,1,0],
         [[0,0],[1,0],[1,1],[0,1]],3);
  });
  /* เส้นเรืองแสงกลางผนังหลัง */
  quad([-hw+0.5,-0.9,ZB+0.02],[hw-0.5,-0.9,ZB+0.02],
       [hw-0.5,-0.84,ZB+0.02],[-hw+0.5,-0.84,ZB+0.02],[0,0,1],
       [[0,0],[1,0],[1,1],[0,1]],3);
  /* ซี่โครงเพดานขวางเป็นช่วง ๆ */
  for(let z=ZB+2.2; z<ZF-1.0; z+=3.1){
    quad([-hw,hh-0.014,z-0.05],[hw,hh-0.014,z-0.05],
         [hw,hh-0.014,z+0.05],[-hw,hh-0.014,z+0.05],[0,-1,0],
         [[0,0],[1,0],[1,1],[0,1]],2);
  }
  return {P:new Float32Array(P),N:new Float32Array(N),
          U:new Float32Array(U),K:new Float32Array(K),n:P.length/3};
}

/* ── คณิตเมทริกซ์ ── */
function perspective(fovy,a,n,f){
  const t=1/Math.tan(fovy/2);
  return new Float32Array([t/a,0,0,0, 0,t,0,0, 0,0,(f+n)/(n-f),-1, 0,0,2*f*n/(n-f),0]);
}
function lookAt(e,c,u){
  let z=[e[0]-c[0],e[1]-c[1],e[2]-c[2]];
  let l=Math.hypot(z[0],z[1],z[2]); z=[z[0]/l,z[1]/l,z[2]/l];
  let x=[u[1]*z[2]-u[2]*z[1],u[2]*z[0]-u[0]*z[2],u[0]*z[1]-u[1]*z[0]];
  l=Math.hypot(x[0],x[1],x[2])||1; x=[x[0]/l,x[1]/l,x[2]/l];
  const y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];
  return new Float32Array([x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0,
    -(x[0]*e[0]+x[1]*e[1]+x[2]*e[2]),-(y[0]*e[0]+y[1]*e[1]+y[2]*e[2]),
    -(z[0]*e[0]+z[1]*e[1]+z[2]*e[2]),1]);
}

function compile(gl,type,src){
  const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.warn(gl.getShaderInfoLog(s));return null}
  return s;
}

function mount(canvas,opts){
  opts=opts||{};
  let gl=null;
  try{ gl=canvas.getContext("webgl",{antialias:true,alpha:false,powerPreference:"low-power"})
        ||canvas.getContext("experimental-webgl") }catch(e){}
  if(!gl){ canvas.dataset.fallback="1"; return null }

  const vs=compile(gl,gl.VERTEX_SHADER,VS), fs=compile(gl,gl.FRAGMENT_SHADER,FS);
  if(!vs||!fs){ canvas.dataset.fallback="1"; return null }
  const pr=gl.createProgram();
  gl.attachShader(pr,vs); gl.attachShader(pr,fs); gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){ canvas.dataset.fallback="1"; return null }
  gl.useProgram(pr);

  const g=build();
  function buf(data,loc,size){
    const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b);
    gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    const l=gl.getAttribLocation(pr,loc);
    gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l,size,gl.FLOAT,false,0,0);
  }
  buf(g.P,"aPos",3); buf(g.N,"aNrm",3); buf(g.U,"aUV",2); buf(g.K,"aKind",1);

  const uProj=gl.getUniformLocation(pr,"uProj"),uView=gl.getUniformLocation(pr,"uView"),
        uEye=gl.getUniformLocation(pr,"uEye"),uTint=gl.getUniformLocation(pr,"uTint"),
        uTime=gl.getUniformLocation(pr,"uTime"),uRes=gl.getUniformLocation(pr,"uRes");
  gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
  gl.clearColor(0.012,0.02,0.04,1);

  let tint=opts.tint||[1.0,0.55,0.28];
  const FOV=opts.fov||0.72, EZ=opts.eyeZ||8.2;
  let tx=0,ty=0,cx=0,cy=0,raf=0,alive=false,t0=performance.now();
  const LOW=matchMedia("(max-width:640px)").matches;

  function resize(){
    const r=Math.min(devicePixelRatio||1,LOW?1.5:2);
    const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
    if(canvas.width!==Math.round(w*r)||canvas.height!==Math.round(h*r)){
      canvas.width=Math.round(w*r); canvas.height=Math.round(h*r);
    }
    gl.viewport(0,0,canvas.width,canvas.height);
  }
  function frame(){
    if(!alive){raf=0;return}
    resize();
    cx+=(tx-cx)*0.06; cy+=(ty-cy)*0.06;
    const asp=canvas.width/Math.max(1,canvas.height);
    const eye=[cx*1.1,0.10+cy*0.7,EZ];
    gl.uniformMatrix4fv(uProj,false,perspective(FOV,asp,0.1,80));
    gl.uniformMatrix4fv(uView,false,lookAt(eye,[cx*1.8,cy*1.2-0.18,-4.0],[0,1,0]));
    gl.uniform3fv(uEye,eye);
    gl.uniform3fv(uTint,tint);
    gl.uniform1f(uTime,(performance.now()-t0)/1000);
    gl.uniform2f(uRes,canvas.width,canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES,0,g.n);
    raf=requestAnimationFrame(frame);
  }
  const api={
    start(){ if(alive)return; alive=true; if(!raf)raf=requestAnimationFrame(frame) },
    stop(){ alive=false },
    look(px,py){ tx=(px-0.5)*1.25; ty=(0.5-py)*0.75 },
    setTint(c){ tint=c },
    resize(){ resize(); if(!alive){alive=true;frame();alive=false} }
  };
  api.start();
  return api;
}

/* อ่านสีเน้นของธีมปัจจุบันเป็น [r,g,b] 0..1 */
function tintFromCss(varName,fallback){
  try{
    const v=getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if(!v)return fallback;
    const d=document.createElement("span");
    d.style.color=v; document.body.appendChild(d);
    const m=getComputedStyle(d).color.match(/[\d.]+/g); d.remove();
    if(!m)return fallback;
    return [Math.pow(m[0]/255,2.2),Math.pow(m[1]/255,2.2),Math.pow(m[2]/255,2.2)];
  }catch(e){ return fallback }
}

window.SpireRoom={mount,tintFromCss};
})();

;

/* ══════════════════════════════════════════════════════════════════
   THE COCKPIT — หน้าเดียวเต็มจอ ควบคุมได้ทุกอย่าง
   • ล็อคหนึ่งหน้าด้วย scroll-snap (ผู้ใช้เลื่อนเอง ไม่เลื่อนอัตโนมัติ)
   • พ้นหน้านี้แล้วเลื่อนอิสระ เจอ "สวัสดีตอน…" + วิดเจ็ตเดิมครบ
   • ดูดโหนดจริง (#dashCars, .qa-grid) เข้ามา ตัวจัดการเดิมจึงยังทำงาน
   ══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
const D=document,$=id=>D.getElementById(id);
const EN=()=>(window.lang||"th")==="en";
const T=(th,en)=>EN()?en:th;
const num=n=>(n==null||isNaN(n))?"—":Math.round(n).toLocaleString("en-US");
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

const SEEDS=[["เครื่องสั่นตอนจอด","Rough idle"],["แอร์ไม่เย็น","A/C not cold"],
             ["มีเสียงตอนเบรก","Noise when braking"],["ไฟเครื่องยนต์ขึ้น","Check-engine light"]];

/* ─────────── ข้อมูล ─────────── */
function cars(){try{return window.garage()||[]}catch(e){return[]}}
function active(){try{const c=window.selCar&&window.selCar();return c||cars()[0]||null}
  catch(e){return cars()[0]||null}}
function km(c){try{if(window.SpireODO)return window.SpireODO.value(c)}catch(e){}
  return parseInt(c&&c.mileage)||0}
function health(c){try{return window.SpireCarLab&&window.SpireCarLab.health(c)}catch(e){return null}}
function stat(c){try{return window.SpireCarLab&&window.SpireCarLab.status(c)}catch(e){return null}}

/* ─────────── ชิ้นส่วน ─────────── */
/* วงแหวนนี้เคยแสดงคะแนนสุขภาพ 0-100 ที่ระบบคิดขึ้นเอง
   เปลี่ยนมาแสดงจำนวนรายการที่เลยกำหนดจริงตามบันทึกของเจ้าของ
   ตัวเลขที่ตรวจสอบย้อนกลับได้ดีกว่าตัวเลขที่ฟังดูฉลาดแต่เดาเอา */
function ring(st){
  const over=st?st.over.length:null, soon=st?st.soon.length:0;
  const tone=over==null?"":over>0?" bad":soon>0?" warn":"";
  /* วงแหวนเต็มเมื่อไม่มีอะไรค้าง แล้วพร่องลงตามจำนวนที่ค้าง สูงสุดที่ 5 รายการ */
  const filled=over==null?0:Math.max(0,1-Math.min(5,over+soon*0.5)/5);
  const C=2*Math.PI*70, off=C*(1-filled);
  return `<div class="gring${tone}"><svg viewBox="0 0 160 160" aria-hidden="true">
      <circle class="trk" cx="80" cy="80" r="70"/>
      <circle class="val" cx="80" cy="80" r="70"
        stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg>
    <div class="cen"><b>${over==null?"—":over}</b>
      <span>${over===0&&soon>0?T("ใกล้ครบ "+soon,soon+" due soon"):T("เลยกำหนด","Overdue")}</span></div></div>`;
}
function dial(lab,val,unit,cls){
  return `<div class="dial${cls?" "+cls:""}"><small>${esc(lab)}</small>
    <b>${val}${unit?`<u>${esc(unit)}</u>`:""}</b></div>`;
}

/* ═══════════════════════════════════════════════════════════════
   ฟีเจอร์ทั้งหมดอยู่ที่เดียว — เลิกมีหน้า "วิธีวินิจฉัย" แยกต่างหาก
   เดิมมีทั้งแผงซ้ายและปุ่มในหน้าอื่น ผู้ใช้ต้องเดาว่าอะไรอยู่ตรงไหน
   ตอนนี้เข้าถึงได้สองทางที่ชี้ไปที่เดียวกัน: เลื่อนจอกลาง หรือกด + ข้างช่องพิมพ์

   mode = โหมดของห้องแชต (ส่งไป chat.html)  ·  tool = เครื่องมือในหน้านี้
   สีแยกกันทุกตัวเพื่อให้จำด้วยสีได้ ไม่ต้องอ่านทุกครั้ง               */
const FEATS=[
  {k:"text",  kind:"mode", ic:"ti-message-2",      c:"#4F8FF7", th:"พิมพ์ถาม",      en:"Ask"},
  {k:"image", kind:"mode", ic:"ti-camera",         c:"#A46BF5", th:"ถ่ายรูป",       en:"Photo"},
  {k:"video", kind:"mode", ic:"ti-video",          c:"#E85DA6", th:"วิดีโอ",        en:"Video"},
  {k:"listen",kind:"tool", ic:"ti-ear",            c:"#37C08A", th:"ฟังเสียงรถ",    en:"Listen"},
  {k:"quote", kind:"tool", ic:"ti-receipt-2",      c:"#E8A33D", th:"ตรวจใบเสนอราคา",en:"Check a quote"},
  {k:"shake", kind:"tool", ic:"ti-activity",       c:"#3FC3D6", th:"วัดอาการสั่น",  en:"Shake test"},
  {k:"park",  kind:"tool", ic:"ti-map-pin",        c:"#F0655C", th:"จำที่จอด",      en:"Parking"},
  {k:"trip",  kind:"tool", ic:"ti-route",          c:"#5BB98C", th:"ก่อนเดินทางไกล",en:"Trip check"},
  {k:"own",   kind:"tool", ic:"ti-report-money",   c:"#7B8CF0", th:"ต้นทุน & สมุดรถ",en:"Cost & record"},
  {k:"spares",kind:"view", ic:"ti-package",        c:"#F08A3D", th:"อะไหล่ Spares", en:"Spares"}
];
function runFeat(k){
  const f=FEATS.find(x=>x.k===k); if(!f)return;
  if(f.kind==="tool"){ try{ window.openTool&&window.openTool(f.k) }catch(e){} return }
  if(f.kind==="view"){ try{ window.switchView("shop") }catch(e){} return }
  /* โหมดแชตเรียกตัวเปิดห้องแชตของหน้าหลักตรง ๆ
     เดิมยิงผ่านปุ่มที่ซ่อนอยู่ในวิดเจ็ต ซึ่งพึ่ง event delegation อีกชั้นโดยไม่จำเป็น */
  try{ if(typeof window.openChat==="function"){ window.openChat({attach:f.k}); return } }catch(e){}
  location.href="chat.html?attach="+encodeURIComponent(f.k);
}
const featTiles=()=>FEATS.map(f=>`<button class="ft" data-feat="${f.k}" style="--c:${f.c}">
    <span class="ic"><i class="ti ${f.ic}"></i></span>
    <span class="tx">${T(f.th,f.en)}</span></button>`).join("");

function shell(){
  const c=active(), list=cars(), h=c?health(c):null, k=c?km(c):0;
  let eco=null; try{ if(window.SpireCarLab&&window.SpireCarLab.economy)eco=window.SpireCarLab.economy(c) }catch(e){}
  const items=h&&h.items?h.items.slice().sort((a,b)=>a.d.left-b.d.left):[];
  const nx=items[0]||null, left=nx?nx.d.left:null;
  const over=items.filter(x=>x.d.left<=0).length;
  const last=c&&c.history&&c.history[0]
    ? new Date(c.history[0].t).toLocaleDateString(EN()?"en-GB":"th-TH",{day:"numeric",month:"short"})
    : T("ยังไม่เคย","Never");

  const plan=items.slice(0,3).map((it,i)=>{
    const l=it.d.left, cls=l<=0?"over":l<1500?"due":"";
    return `<div class="plan-row ${cls}"><span class="n">${String(i+1).padStart(2,"0")}</span>
      <span class="t">${esc(T(it.p.th,it.p.en))}</span>
      <span class="d">${l<=0?T("เลย ","over ")+num(-l):num(l)} km</span></div>`}).join("")
    || `<div class="plan-row"><span class="n">—</span>
        <span class="t">${T("กรอกเลขไมล์เพื่อเริ่มวางแผน","Add your odometer to build a plan")}</span>
        <span class="d"></span></div>`;

  const swi=list.length>1
    ? `<div class="cswitch">${list.map(x=>`<button data-hcar="${esc(x.id)}"${
        c&&x.id===c.id?' class="on"':""}>${esc(x.name)}</button>`).join("")}</div>` : "";

  return `<section class="hpage" data-hp="cockpit">
    <div class="room"><i class="ceil"></i><i class="floor"></i><i class="wl"></i><i class="wr"></i>
      <i class="glow"></i><i class="edge"></i></div>

    <!-- แถบงานถัดไป — เติมโดย ledger.js ที่โหลดทีหลัง จึงวางเป็นช่องว่างไว้ก่อน -->
    <div id="cpNext"></div>

    <div class="cockpit">
      <!-- จอกลาง: เลื่อนซ้ายขวาได้ หน้าแรกคือสถานะรถ หน้าสองคือเครื่องมือทั้งหมด -->
      <div class="screen">
       <div class="scr-deck" id="scrDeck">
        <div class="scr-page">
        <div class="scr-grid">
          <div class="scr-col">
            <div class="hud-eye"><span class="dot"></span>${T("รถ","Vehicle")}</div>
            <div class="scr-car">${c?esc(c.name):T("ยังไม่มีรถ","No vehicle")}</div>
            <div class="scr-meta">${c
              ? `${esc(String(c.year||"-"))} · ${num(k)} ${T("กม. (ประเมิน)","km est.")}`
              : T("เพิ่มรถเพื่อเปิดใช้ห้องนักบิน","Add a car to arm the cockpit")}</div>
            ${swi}
            ${ring(c?stat(c):null)}
          </div>
          <div class="scr-col">
            <div class="hud-eye">${T("สถานะ","Status")}</div>
            <div class="dials">
              ${dial(T("กำหนดถัดไป","Next due"),
                     left==null?"—":(left<0?num(-left):num(left)),
                     left==null?"":(left<0?T("กม.เลย","km over"):"km"),
                     left==null?"":left<0?"bad":left<1500?"warn":"")}
              ${dial(T("รายการเลยกำหนด","Overdue"),String(over),"",over>0?"warn":"")}
              ${dial(T("ค่าใช้จ่าย/กม.","Cost / km"),eco&&eco.perKm?("฿"+eco.perKm.toFixed(2)):"—","")}
              ${dial(T("ตรวจล่าสุด","Last check"),esc(last),"")}
            </div>
            <div class="plan">${plan}</div>
          </div>
        </div>
        </div>

        <div class="scr-page">
          <div class="hud-eye"><span class="dot"></span>${T("เครื่องมือทั้งหมด","Everything you can do")}</div>
          <div class="ft-grid">${featTiles()}</div>
        </div>
       </div>
       <div class="scr-dots"><i class="on"></i><i></i></div>
       <div class="scr-hint">${T("ปัดไปทางซ้ายเพื่อดูเครื่องมือ","Swipe left for tools")} &rarr;</div>
      </div>

      <!-- ผนังขวา: การาจ -->
      <aside class="pane r">
        <div class="pane-lbl">${T("การาจ","Garage")}</div>
        <div id="cpCars"></div>
      </aside>
    </div>

    <!-- คอนโซลสั่งงาน -->
    <div class="control">
      <div class="ctl-head">
        <div class="hud-eye">${T("ควบคุม AI","AI control")}</div>
        <span class="rule"></span>
        <span class="ctl-lnk" data-hact="chat">${T("เปิดห้องแชต","Open chat")} &rarr;</span>
        ${c?`<span class="ctl-lnk" data-hact="detail">${T("แผงรถ","Vehicle panel")} &rarr;</span>`:""}
      </div>
      <div class="ctl-pick" id="cpPick" hidden>
        <div class="ft-grid sm">${featTiles()}</div>
      </div>
      <div class="ctl-ask">
        <button class="ctl-plus" id="cpPlus" aria-label="${T("เครื่องมือ","Tools")}">
          <i class="ti ti-plus"></i></button>
        <textarea id="cpQ" rows="1" placeholder="${
          T("บอกอาการรถของคุณ หรือสั่งงานอะไรก็ได้…","Describe a symptom, or ask anything…")}"></textarea>
        <button class="ctl-send" id="cpSend" disabled aria-label="${T("ส่ง","Send")}">
          <i class="ti ti-arrow-up"></i></button>
      </div>
      <div class="ctl-seeds" id="cpSeeds"></div>
    </div>

    <div class="hscroll"><span>${T("เลื่อนลงเพื่อดูแดชบอร์ด","Scroll for dashboard")}</span>
      <span class="m"></span></div>
  </section>`;
}

/* ─────────── ฉากหลัง: ห้อง 3 มิติจริง (WebGL) ─────────── */
let room=null,roomEl=null,veil=null,running=false;
function initRoom(){
  if(roomEl)return;
  roomEl=D.createElement("canvas"); roomEl.id="cpRoom"; roomEl.setAttribute("aria-hidden","true");
  D.body.insertBefore(roomEl,D.body.firstChild);
  veil=D.createElement("div"); veil.id="cpVeil"; veil.setAttribute("aria-hidden","true");
  D.body.insertBefore(veil,roomEl.nextSibling);
  if(window.SpireRoom){
    room=window.SpireRoom.mount(roomEl,{tint:BLUE,fov:0.70,eyeZ:8.6});
    if(room)room.stop();
  }
  if(!room)roomEl.classList.add("nogl");   /* ไม่มี WebGL → ใช้ไล่สีนิ่งแทน */
}
/* ห้องนักบินใช้โทนฟ้าเสมอ ให้เข้ากับจอและมาตรวัดสีฟ้า ไม่ใช่สีส้มของธีม */
const BLUE=[0.055,0.30,0.86];
function roomTint(){ if(room)room.setTint(BLUE) }

/* ─────────── พารัลแลกซ์: ขยับกล้องในห้องจริง ─────────── */
function parallax(px,py){
  if(room)room.look(px,py);
  const ck=D.querySelector(".cockpit");
  if(ck)ck.style.perspectiveOrigin=`${(40+px*20).toFixed(1)}% ${(38+py*18).toFixed(1)}%`;
}

/* ─────────── ประกอบ ─────────── */
let sc=null,lastTop=0,wired=false;
function sizePage(){ if(sc&&sc.clientHeight>60)
  D.documentElement.style.setProperty("--hph",sc.clientHeight+"px") }
const sstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
/* สีพื้นของธีมปัจจุบัน (อ่านครั้งเดียวต่อธีม) */
const ROOM_RGB=[7,14,28];
let bgRGB=[250,247,241],bgCache="";
function themeBg(){
  const v=getComputedStyle(D.documentElement).getPropertyValue("--bg").trim();
  if(v===bgCache)return bgRGB;
  bgCache=v;
  try{ const d=D.createElement("span"); d.style.color=v||"#FAF7F1"; D.body.appendChild(d);
    const m=getComputedStyle(d).color.match(/[\d.]+/g); d.remove();
    if(m)bgRGB=[+m[0],+m[1],+m[2]];
  }catch(e){}
  return bgRGB;
}
const mixc=(a,b,t)=>`rgb(${Math.round(a[0]+(b[0]-a[0])*t)},${
  Math.round(a[1]+(b[1]-a[1])*t)},${Math.round(a[2]+(b[2]-a[2])*t)})`;
function onScroll(){
  if(!sc)return;
  const top=sc.scrollTop,h=sc.clientHeight||1,p=top/h;
  lastTop=top;
  /* ไล่สีสองทาง: ออกจากห้อง → แดชบอร์ด และย้อนกลับขึ้นมา */
  const f=sstep(.06,.92,p);
  if(roomEl)roomEl.style.opacity=(1-f).toFixed(3);
  if(veil){
    /* ผ้าคลุมทึบเสมอเมื่อพ้นห้อง แล้วค่อย ๆ เปลี่ยน "สี" จากสีห้องเป็นสีธีม
       — ไม่ใช่แถบไล่สี จึงไม่มีขอบขาวโผล่ด้านบน */
    veil.style.background=mixc(ROOM_RGB,themeBg(),f);
    veil.style.opacity=(f>0?1:0).toString();
  }
  /* ล็อคเฉพาะช่วงห้องนักบิน พ้นแล้วเลื่อนอิสระ */
  sc.classList.toggle("snapon",p<1.15);
  const inDeck=p<.55;
  D.body.dataset.deck=inDeck?"1":"0";
  if(room){ if(p<1.02){ if(!running){running=true;room.start()} }
            else if(running){running=false;room.stop()} }
}
function toFree(){ if(sc)sc.scrollTo({top:sc.clientHeight,behavior:"smooth"}) }

function go(q){
  try{ if(q)localStorage.setItem("spire_deckQ",JSON.stringify(q)) }catch(e){}
  location.href="chat.html?attach=text";
}
function wire(){
  /* ปุ่มฟีเจอร์มีทั้งในจอเลื่อนและในตัวเลือก ใช้ตัวจัดการเดียวกันทั้งหมด */
  D.querySelectorAll("[data-feat]").forEach(b=>b.onclick=()=>{
    const pick=$("cpPick"); if(pick)pick.hidden=true;
    runFeat(b.dataset.feat);
  });
  const plus=$("cpPlus"),pick=$("cpPick");
  if(plus&&pick)plus.onclick=()=>{ pick.hidden=!pick.hidden;
    plus.classList.toggle("on",!pick.hidden) };

  /* จุดบอกหน้าใต้จอ อัปเดตตามการเลื่อน */
  const deck=$("scrDeck");
  if(deck){
    const dots=[...D.querySelectorAll(".scr-dots i")];
    const hint=D.querySelector(".scr-hint");
    deck.addEventListener("scroll",()=>{
      const i=Math.round(deck.scrollLeft/Math.max(1,deck.clientWidth));
      dots.forEach((d,n)=>d.classList.toggle("on",n===i));
      if(hint)hint.style.opacity=i===0?"":"0";
    },{passive:true});
    D.querySelectorAll(".scr-dots i").forEach((d,n)=>d.onclick=()=>
      deck.scrollTo({left:n*deck.clientWidth,behavior:"smooth"}));
  }

  const ta=$("cpQ"),btn=$("cpSend"); if(!ta||!btn)return;
  const sync=()=>{btn.disabled=!ta.value.trim();
    ta.style.height="auto"; ta.style.height=Math.min(ta.scrollHeight,74)+"px"};
  ta.addEventListener("input",sync);
  ta.addEventListener("keydown",e=>{
    if(e.key==="Enter"&&!e.shiftKey){e.preventDefault(); if(ta.value.trim())go(ta.value.trim())}});
  btn.onclick=()=>{const v=ta.value.trim(); if(v)go(v)};
  const s=$("cpSeeds");
  if(s){ s.innerHTML=SEEDS.map(x=>`<button class="ctl-seed">${T(x[0],x[1])}</button>`).join("");
    s.onclick=e=>{const b=e.target.closest(".ctl-seed"); if(b)go(b.textContent.trim())} }
  sync();
}
/* จอแคบ: รายการรถกลับไปอยู่ในวิดเจ็ตด้านล่าง ห้องนักบินจะได้พอดีหนึ่งหน้าจริง ๆ */
const NARROW=()=>matchMedia("(max-width:640px)").matches;
/* ย้ายโหนดจริงเข้าห้องนักบิน */
function adopt(){
  const cars=$("dashCars");
  const narrow=NARROW();
  D.body.dataset.cpnarrow=narrow?"1":"0";
  const slot=narrow?$("w-cars"):$("cpCars");
  if(cars&&slot&&cars.parentNode!==slot){cars.classList.add("cars-grid");slot.appendChild(cars)}
  /* ไม่ดูด .qa-grid มาแล้ว ปุ่มพวกนั้นย้ายไปอยู่ในจอเลื่อนกับตัวเลือกข้างช่องพิมพ์
     ตัวมันยังอยู่ในวิดเจ็ตเดิมแบบซ่อนไว้ เพราะ runFeat ยังกดผ่านมันเพื่อเปิดห้องแชต */
}

function build(){
  const view=$("v-home"); if(!view)return;
  sc=view.querySelector(".scroll"); if(!sc)return;
  if(!$("hstack")){
    let free=$("hfree");
    if(!free){
      free=D.createElement("div"); free.className="hfree"; free.id="hfree";
      while(sc.firstChild)free.appendChild(sc.firstChild);
      sc.appendChild(free);
    }
    const stack=D.createElement("div"); stack.id="hstack";
    stack.innerHTML=shell();
    sc.insertBefore(stack,free);

    stack.addEventListener("click",e=>{
      const sw=e.target.closest("[data-hcar]");
      if(sw){ try{localStorage.setItem("spire_selCar",JSON.stringify(sw.dataset.hcar))}catch(err){}
        rebuild(); try{window.updateFabBadge&&window.updateFabBadge()}catch(err){} return }
      const b=e.target.closest("[data-hact]"); if(!b)return;
      if(b.dataset.hact==="chat")location.href="chat.html";
      else if(b.dataset.hact==="detail"){const c=active(); if(c&&window.openCarDetail)window.openCarDetail(c.id)}
      else if(b.dataset.hact==="down")toFree();
    });
  }
  adopt(); wire();
  initRoom(); if(room){running=true;room.start()} sizePage(); onScroll();

  if(!wired){
    wired=true;
    sc.addEventListener("scroll",onScroll,{passive:true});
    addEventListener("resize",()=>{sizePage();if(room)room.resize();adopt()});
    addEventListener("orientationchange",()=>setTimeout(()=>{sizePage();if(room)room.resize();adopt()},220));
    if(matchMedia("(pointer:fine)").matches)
      addEventListener("mousemove",e=>parallax(e.clientX/innerWidth,e.clientY/innerHeight),{passive:true});
    else if(window.DeviceOrientationEvent)
      addEventListener("deviceorientation",e=>{ if(e.gamma==null)return;
        parallax(.5+Math.max(-1,Math.min(1,e.gamma/38))*.5,
                 .5+Math.max(-1,Math.min(1,((e.beta||45)-45)/38))*.5)},{passive:true});
  }
}

/* ประกอบใหม่เมื่อข้อมูลเปลี่ยน — ย้ายโหนดจริงออกมาพักก่อนแล้วค่อยดูดกลับ */
function rebuild(){
  const stack=$("hstack"); if(!stack)return;
  const cars=$("dashCars"),park=$("hfree")||D.body;
  if(cars)park.appendChild(cars);
  stack.innerHTML=shell();
  adopt(); wire(); sizePage();
  try{window.renderDashCars&&window.renderDashCars.__raw&&window.renderDashCars.__raw()}catch(e){}
}
window.cockpitRefresh=rebuild;

["renderDashCars","renderGarage","setLang","setTheme"].forEach(n=>{
  const o=window[n];
  if(typeof o!=="function"||o.__cp)return;
  const f=function(){const r=o.apply(this,arguments); try{ if(n==="renderDashCars")adopt(); else if(n==="setTheme")roomTint(); else rebuild() }catch(e){} return r};
  f.__cp=true; f.__raw=o; window[n]=f;
});

/* ห้องนักบินอยู่เฉพาะหน้าแรก */
const origSwitch=window.switchView;
if(typeof origSwitch==="function"){
  window.switchView=function(v){
    const r=origSwitch.apply(this,arguments);
    const home=v==="home";
    if(home){ setTimeout(()=>{sizePage();onScroll()},60) }
    else{ /* หน้าอื่นใช้พื้นหลังปกติของธีม — เก็บทั้งห้องและผ้าคลุมไปเลย */
          D.body.dataset.deck="0"; running=false; if(room)room.stop();
          if(roomEl)roomEl.style.opacity="0"; if(veil)veil.style.opacity="0" }
    return r;
  };
}

if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",build); else build();
setTimeout(build,400); setTimeout(()=>{build();rebuild()},1200); setTimeout(sizePage,1900);
})();

;

/* ══════════════════════════════════════════════════════════════════
   SPARES — อะไหล่ที่ตรงกับรถของคุณ
   1. ผู้ใช้เลือกแอปที่จะไปหาซื้อ (เลือกได้หลายแอป) — เก็บไว้ในเครื่อง
   2. หน้าเว็บส่งรถคันที่เลือกอยู่ + รายการที่ใกล้ถึงกำหนดไปให้ AI
   3. AI คืนของที่ใส่กับรถรุ่นนั้นได้ พร้อมคำค้นที่ใช้จริง
   4. การ์ดแต่ละใบมีปุ่มเปิดหน้าค้นหาของแต่ละแอปที่เลือกไว้
   ราคาเป็นการประมาณจาก AI ไม่ใช่ราคาจริงจากร้าน — บอกไว้ชัดบนหน้า
   ══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
const D=document,$=id=>D.getElementById(id);
const EN=()=>(window.lang||"th")==="en";
const T=(th,en)=>EN()?en:th;
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const num=n=>(n==null||isNaN(n))?"—":Math.round(n).toLocaleString("en-US");

/* ─────────── แอปที่เลือกไปหาซื้อได้ ─────────── */
const APPS=[
  {k:"shopee",   n:"Shopee",      c:"#EE4D2D", th:"ส่งเร็ว ราคาถูก",       en:"Fast, cheap",
   url:q=>`https://shopee.co.th/search?keyword=${encodeURIComponent(q)}`, local:true},
  {k:"lazada",   n:"Lazada",      c:"#0F146D", th:"ของแท้เยอะ",           en:"More genuine stock",
   url:q=>`https://www.lazada.co.th/catalog/?q=${encodeURIComponent(q)}`, local:true},
  {k:"tiktok",   n:"TikTok Shop", c:"#111111", th:"ดีลสด ราคาดี",          en:"Live deals",
   url:q=>`https://www.tiktok.com/search?q=${encodeURIComponent(q)}`, local:true},
  {k:"amazon",   n:"Amazon",      c:"#FF9900", th:"ของนอก ตัวเลือกเยอะ",   en:"Global catalogue",
   url:q=>`https://www.amazon.com/s?k=${encodeURIComponent(q)}`},
  {k:"aliexpress",n:"AliExpress", c:"#E62E04", th:"ถูกที่สุด รอนาน",       en:"Cheapest, slow",
   url:q=>`https://www.aliexpress.com/w/wholesale-${encodeURIComponent(q)}.html`},
  {k:"ebay",     n:"eBay",        c:"#0064D2", th:"ของหายาก มือสอง",       en:"Rare & used",
   url:q=>`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}`},
  {k:"jd",       n:"JD Central",  c:"#D0021B", th:"ของแท้ ส่งในไทย",       en:"Genuine, ships in TH",
   url:q=>`https://www.jd.co.th/search?keyword=${encodeURIComponent(q)}`, local:true},
  {k:"local",    n:T("ร้านอะไหล่ไทย","Thai parts shops"), c:"#3E9E6E",
   th:"ค้น Google หาร้านใกล้ตัว", en:"Find a nearby shop",
   url:q=>`https://www.google.com/search?q=${encodeURIComponent(q+" ราคา อะไหล่")}`, local:true},
];
const appOf=k=>APPS.find(a=>a.k===k);

/* ─────────── กราฟิกหัวการ์ดตามหมวดหมู่ (ไม่มีไฟล์รูป) ─────────── */
const ART={
  "เบรก":            ["linear-gradient(150deg,#C2410C,#F97316)","ti-disc"],
  "ช่วงล่าง":         ["linear-gradient(150deg,#3730A3,#6366F1)","ti-arrows-vertical"],
  "เครื่องยนต์":       ["linear-gradient(150deg,#7C2D12,#EA580C)","ti-engine"],
  "ไฟฟ้า":           ["linear-gradient(150deg,#1E3A8A,#3B82F6)","ti-bolt"],
  "แอร์":            ["linear-gradient(150deg,#0E7490,#22D3EE)","ti-wind"],
  "ยางและล้อ":        ["linear-gradient(150deg,#1F2937,#4B5563)","ti-steering-wheel"],
  "ของตกแต่ง":        ["linear-gradient(150deg,#6D28D9,#A78BFA)","ti-sparkles"],
  "ดูแลรักษา":        ["linear-gradient(150deg,#047857,#34D399)","ti-droplet"],
  "อุปกรณ์ความปลอดภัย":["linear-gradient(150deg,#9F1239,#FB7185)","ti-shield"],
  "อะไหล่สิ้นเปลือง":  ["linear-gradient(150deg,#155E75,#38BDF8)","ti-settings"],
};
const artOf=c=>ART[c]||["linear-gradient(150deg,#334155,#64748B)","ti-package"];

/* ─────────── สถานะ ─────────── */
const LSg=(k,d)=>{try{const v=localStorage.getItem("spire_"+k);return v?JSON.parse(v):d}catch(e){return d}};
const LSs=(k,v)=>{try{localStorage.setItem("spire_"+k,JSON.stringify(v))}catch(e){}};
let picked=LSg("sparesApps",null);      /* null = ยังไม่เคยตั้งค่า */
let items=null,loading=false,lastErr="",cachedAt=0,forCar="",stale=false;

function car(){ try{const c=window.selCar&&window.selCar(); return c||(window.garage()||[])[0]||null}
  catch(e){ return null } }
function carParts(c){
  if(!c)return {make:"",model:"",year:"",mileage:""};
  const p=String(c.name||"").trim().split(/\s+/);
  return {make:p[0]||"",model:p.slice(1).join(" ")||"",
    year:String(c.year||""),mileage:String(c.mileage||"")};
}
/* รายการที่ใกล้ถึงกำหนด — ส่งไปให้ AI จัดลำดับความสำคัญ */
function needs(c){
  try{
    const h=window.SpireCarLab&&window.SpireCarLab.health(c);
    if(!h||!h.items)return [];
    return h.items.slice().sort((a,b)=>a.d.left-b.d.left).slice(0,6)
      .filter(x=>x.d.left<20000).map(x=>x.p.th);
  }catch(e){ return [] }
}

/* ─────────── ประกอบหน้า ─────────── */
function mount(){
  const sc=D.querySelector("#v-shop .scroll"); if(!sc||$("spWrap"))return;
  sc.innerHTML=`<div id="spWrap">
    <div class="sp-head">
      <div class="tx"><div class="sp-eye">SPIREONE</div>
        <div class="sp-h1">Spares</div>
        <p class="section-sub" id="spSub"></p></div>
      <button class="btn" id="spCfgBtn" style="display:none"><i class="ti ti-adjustments"></i>
        <span></span></button>
    </div>
    <div id="spMain"></div>
  </div>`;
  $("spCfgBtn").onclick=()=>{picked=null;render()};
  render();
}

function render(){
  const wrap=$("spMain"); if(!wrap)return;
  const c=car(),cp=carParts(c);
  $("spSub").textContent=T("อะไหล่และของแต่งที่ใส่กับรถของคุณได้จริง — เลือกแอปที่จะไปซื้อได้เอง",
    "Parts that actually fit your car — from whichever marketplaces you choose");
  const cfgOn=!!(picked&&picked.length);
  $("spCfgBtn").style.display=cfgOn?"":"none";
  if(cfgOn)$("spCfgBtn").querySelector("span").textContent=T("เปลี่ยนแอป","Change apps");

  if(!cfgOn){ wrap.innerHTML=cfgView(c,cp); wireCfg(); return }
  wrap.innerHTML=resultView(c,cp);
  wireResults();
  if(!items&&!loading&&!lastErr)fetchItems(false);
}

/* ── หน้าตั้งค่า ── */
function cfgView(c,cp){
  const sel=new Set(picked||[]);
  return `<div class="sp-cfg">
    <h4>${T("ตั้งค่าก่อนเริ่ม","Set this up first")}</h4>
    <p>${T("เลือกได้หลายแอป — SpireONE จะหาของที่ใส่กับรถของคุณได้ แล้วพาไปที่หน้าค้นหาของแอปที่คุณเลือก",
          "Pick as many as you like — SpireONE finds parts that fit your car and sends you to each store's search")}</p>

    <div class="sp-lbl">${T("รถที่จะหาอะไหล่ให้","Which car")}</div>
    ${c?`<div class="sp-car">
        <span class="ic"><i class="ti ti-car"></i></span>
        <span class="tx"><b>${esc(c.name)}</b>
          <small>${[cp.year,cp.mileage?num(cp.mileage)+" "+T("กม.","km"):""].filter(Boolean).join(" · ")||"—"}</small></span>
        <span class="sp-chip on"><i class="ti ti-check"></i>${T("ใช้คันนี้","Using this")}</span>
      </div>`
     :`<div class="sp-car"><span class="ic"><i class="ti ti-plus"></i></span>
        <span class="tx"><b>${T("ยังไม่มีรถในการาจ","No car in your garage")}</b>
          <small>${T("เพิ่มรถก่อน แล้วเราจะหาอะไหล่ให้ตรงรุ่น","Add a car and we can match parts to it")}</small></span>
        <button class="btn primary" data-view="garage" style="padding:8px 14px">${T("เพิ่มรถ","Add a car")}</button>
      </div>`}

    <div class="sp-lbl">${T("ไปหาซื้อจากแอปไหน","Where to shop")}</div>
    <div class="sp-apps" id="spApps">
      ${APPS.map(a=>`<button class="sp-app" data-app="${a.k}" aria-pressed="${sel.has(a.k)}">
        <span class="ic" style="background:${a.c}">${esc(a.n[0])}</span>
        <span class="tx"><b>${esc(a.n)}</b><small>${T(a.th,a.en)}</small></span>
        <span class="tick"><i class="ti ti-check"></i></span>
      </button>`).join("")}
    </div>

    <div class="sp-acts">
      <button class="btn primary" id="spGo" ${c?"":"disabled"}>
        <i class="ti ti-sparkles"></i> ${T("หาอะไหล่ให้รถคันนี้","Find parts for this car")}</button>
      <span class="sp-chip" id="spCount"></span>
    </div>
    <p class="sp-note">${T(
      "SpireONE ไม่ได้เชื่อมต่อ API ของร้านค้าโดยตรง จึงยังดึงราคาสดกับสต็อกจริงไม่ได้ — สิ่งที่ทำได้คือเลือกของที่ตรงรุ่นให้ ประมาณช่วงราคาจากราคาตลาด แล้วพาไปที่หน้าค้นหาของร้านที่คุณเลือก",
      "SpireONE is not wired into the stores' APIs, so it cannot read live prices or stock. What it does is pick parts that fit your model, estimate a market price range, and hand you a ready-made search on each store you picked.")}</p>
  </div>`;
}
function wireCfg(){
  const box=$("spApps"); if(!box)return;
  const sel=new Set(picked||[]);
  const count=()=>{ const el=$("spCount");
    if(el)el.textContent=sel.size?T(`เลือกไว้ ${sel.size} แอป`,`${sel.size} selected`)
      :T("ยังไม่ได้เลือกแอป","No app selected yet");
    const go=$("spGo"); if(go)go.disabled=!sel.size||!car() };
  count();
  box.onclick=e=>{
    const b=e.target.closest("[data-app]"); if(!b)return;
    const k=b.dataset.app;
    if(sel.has(k))sel.delete(k); else sel.add(k);
    b.setAttribute("aria-pressed",sel.has(k)); count();
  };
  const go=$("spGo");
  if(go)go.onclick=()=>{
    if(!sel.size||!car())return;
    picked=[...sel]; LSs("sparesApps",picked);
    items=null; lastErr=""; render();
  };
}

/* ── หน้าผลลัพธ์ ── */
function resultView(c,cp){
  const chips=(picked||[]).map(k=>{const a=appOf(k); return a?
    `<span class="sp-chip on"><span class="dot" style="width:8px;height:8px;border-radius:2px;background:${a.c}"></span>${esc(a.n)}</span>`:""}).join("");
  const bar=`<div class="sp-bar">
    <span class="sp-chip"><i class="ti ti-car"></i>${esc(c?c.name:"—")}</span>
    ${chips}<span class="grow"></span>
    ${cachedAt?`<span class="sp-chip${stale?" warn":""}">${
      stale?`<i class="ti ti-clock-exclamation"></i>${T("ข้อมูลเก่า","Cached")} `:T("อัปเดต","Updated")+" "}${
      new Date(cachedAt).toLocaleString(EN()?"en-GB":"th-TH",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>`:""}
    <button class="btn" id="spRefresh" style="padding:8px 14px"><i class="ti ti-refresh"></i>
      ${T("หาใหม่","Refresh")}</button>
  </div>`;

  if(loading)return bar+`<div class="sp-grid">${
    Array.from({length:6},()=>`<div class="sp-skel"></div>`).join("")}</div>`;
  if(lastErr)return bar+`<div class="sp-empty"><i class="ti ti-alert-triangle"></i>
    <b style="display:block;color:var(--ink);font-size:14.5px;margin-bottom:6px">${
      T("หาอะไหล่ไม่สำเร็จ","Could not fetch parts")}</b>${esc(lastErr)}</div>`;
  if(!items||!items.length)return bar+`<div class="sp-empty"><i class="ti ti-package-off"></i>
    ${T("ยังไม่มีรายการ — กดหาใหม่เพื่อให้ SpireONE ลองอีกครั้ง",
        "Nothing yet — hit Refresh to let SpireONE try again")}</div>`;

  return bar+`<div class="sp-grid">${items.map((x,i)=>{
    const [g,ic]=artOf(x.category);
    const price=(x.priceLow||x.priceHigh)
      ? (x.priceLow&&x.priceHigh&&x.priceLow!==x.priceHigh
          ? `฿${num(x.priceLow)} – ${num(x.priceHigh)}` : `฿${num(x.priceHigh||x.priceLow)}`)
      : T("ไม่ทราบราคา","Price unknown");
    return `<article class="sp-card">
      <div class="sp-art" style="--a1:${g}">
        <span class="tag">${esc(x.category||"")}</span>
        ${x.oem?`<span class="badge">${T("ของแท้","OEM")}</span>`
               :x.diy?`<span class="badge">${T("เปลี่ยนเองได้","DIY")}</span>`:""}
        <i class="ti ${ic}"></i>
      </div>
      <div class="sp-body">
        <div class="sp-title">${esc(x.title)}</div>
        ${x.fit?`<div class="sp-fit"><i class="ti ti-circle-check"></i>${esc(x.fit)}</div>`:""}
        <div class="sp-why">${esc(x.why||"")}</div>
        <div class="sp-price">${price}<small>${T("ประมาณการ","estimated")}</small></div>
        <div class="sp-links">${(picked||[]).map(k=>{const a=appOf(k); if(!a)return"";
          const q=a.local?(x.query||x.title):(x.queryEn||x.query||x.title);
          return `<a class="sp-link" href="${esc(a.url(q))}" target="_blank" rel="noopener noreferrer">
            <span class="dot" style="background:${a.c}"></span>${esc(a.n)}</a>`}).join("")}</div>
      </div>
    </article>`}).join("")}</div>
  <p class="sp-note" style="margin-top:16px">${T(
    "ราคาเป็นการประมาณจากราคาตลาด ไม่ใช่ราคาจริงจากร้าน ณ ตอนนี้ — กดปุ่มร้านเพื่อดูราคาและสต็อกจริง และตรวจว่าตรงรุ่นก่อนสั่งซื้อทุกครั้ง",
    "Prices are market estimates, not live listings. Tap a store to see the real price and stock, and always confirm fitment before buying.")}</p>`;
}
function wireResults(){
  const r=$("spRefresh");
  if(r)r.onclick=()=>fetchItems(true);
}

/* ── เรียกข้อมูลจากหลังบ้าน ── */
async function fetchItems(refresh){
  const c=car(); if(!c||!picked||!picked.length)return;
  loading=true; lastErr=""; render();
  try{
    const cp=carParts(c);
    const body={car:cp,apps:picked,needs:needs(c),lang:window.lang||"th",refresh:!!refresh};
    const d=await api("/api/spares",body);
    items=d.items||[]; cachedAt=d.cachedAt||Date.now(); stale=!!d.stale; forCar=c.id;
  }catch(e){
    lastErr=String(e&&e.message||e).slice(0,200)||T("เชื่อมต่อไม่ได้","Connection failed");
    items=null;
  }
  loading=false; render();
}
async function api(path,body){
  const auth=window.spireAuth;
  if(!(auth&&auth.currentUser))
    throw new Error(T("กรุณาเข้าสู่ระบบก่อน","Please sign in first"));
  const tok=await auth.currentUser.getIdToken();
  const r=await fetch(window.BACKEND_URL+path,{method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+tok},
    body:JSON.stringify(body)});
  let d=null; try{ d=await r.json() }catch(e){}
  if(!r.ok){
    const err=(d&&d.error)||"";
    if(r.status===429||err==="quota")throw new Error(T("ใช้โควตา AI ของวันนี้ครบแล้ว ลองใหม่พรุ่งนี้","Daily AI quota reached"));
    if(r.status===401)throw new Error(T("กรุณาเข้าสู่ระบบใหม่","Please sign in again"));
    if(r.status===404)throw new Error(T("เซิร์ฟเวอร์ยังไม่มีระบบนี้ — ต้อง deploy Worker เวอร์ชันใหม่ก่อน","Server is on an older build — deploy the Worker first"));
    /* โควตาของคีย์ AI หมด ไม่ใช่โควตารายวันของผู้ใช้ */
    if(err.indexOf("AI quota exhausted")>=0)throw new Error(T(
      "โควตา AI ของระบบหมดชั่วคราว — ยังหาอะไหล่ใหม่ไม่ได้ตอนนี้ ลองอีกครั้งในภายหลัง",
      "The system's AI quota is used up — parts search is unavailable right now, please try later"));
    if(err.indexOf("spares_ai")===0)throw new Error(T(
      "AI ตอบกลับมาไม่ครบ ลองกดหาใหม่อีกครั้ง — ถ้ายังไม่ได้แปลว่าโมเดลกำลังแน่น",
      "The model came back incomplete — try Refresh; if it keeps failing the model is busy")+
      "\n"+err.replace("spares_ai: ",""));
    if(err.indexOf("AI upstream error")===0)throw new Error(T(
      "เซิร์ฟเวอร์ AI ปฏิเสธคำขอ","The AI server rejected the request")+" — "+err.slice(0,140));
    throw new Error(err||("Error "+r.status));
  }
  return d;
}

/* ── รถเปลี่ยน → ล้างผลเดิม ── */
function watchCar(){
  const c=car();
  if(c&&forCar&&c.id!==forCar){ items=null; lastErr=""; cachedAt=0; stale=false;
    if(D.getElementById("v-shop")&&D.getElementById("v-shop").classList.contains("active"))render() }
}

/* ── วิดเจ็ต Spares บนหน้าแรก ── */
/* ══════════════════════════════════════════════════════════════════
   ฉากวิดเจ็ต Spares — โถงห้างหรู + เทอร์โบหมุน
   แยกสองชั้น: โถงยืดเต็มความกว้าง เทอร์โบขนาดคงที่ จึงไม่บวมตามการ์ด
   ══════════════════════════════════════════════════════════════════ */
function spwScene(){
  /* ซุ้มโค้งซ้อนกันเป็นระยะลึก + เส้นพื้นสะท้อนแสง ให้เหมือนโถงห้าง */
  let hall="";
  for(let i=0;i<5;i++){
    const w=60+i*46, x=270-w/2, h=42+i*15, o=(0.30-i*0.05).toFixed(2);
    hall+=`<path d="M${x} 120V${120-h} a${w/2} ${w/2} 0 0 1 ${w} 0V120"
      fill="none" stroke="#fff" stroke-width="1.5" opacity="${o}"/>`;
  }
  hall+=`<g opacity=".18">${Array.from({length:11},(_,i)=>
    `<line x1="270" y1="120" x2="${-60+i*66}" y2="74" stroke="#fff" stroke-width="1"/>`).join("")}</g>`;
  const hallL=`<svg class="spw-hall" viewBox="0 0 540 120" preserveAspectRatio="xMidYMax slice"
    aria-hidden="true">${hall}</svg>`;

  /* เทอร์โบ ใบพัดหมุนจริง */
  const blades=Array.from({length:11},(_,i)=>
    `<path d="M0 -4 C10 -13 26 -15 33 -6 C24 -4 12 0 0 4Z" fill="#fff" transform="rotate(${i*32.7})"/>`).join("");
  const turboL=`<svg class="spw-turbo" viewBox="-60 -60 120 120" aria-hidden="true">
    <circle r="46" fill="none" stroke="#fff" stroke-width="2.2" opacity=".45"/>
    <circle r="55" fill="none" stroke="#fff" stroke-width="1.1" opacity=".2"/>
    <path d="M-55 0 a55 55 0 0 1 38 -52 l9 17 a37 37 0 0 0 -25 35Z" fill="#fff" opacity=".16"/>
    <g class="spw-fan" opacity=".6">${blades}</g>
    <circle r="8" fill="#fff" opacity=".9"/><circle r="3.4" fill="#22375E"/></svg>`;

  return `<span class="spw-scene">${hallL}${turboL}</span>`;
}

function widget(force){
  const host=D.getElementById("w-shop"); if(!host||(host.dataset.spares&&!force))return;
  host.dataset.spares="1"; host.classList.add("wspares");
  const c=car();

  /* หัวข้อของที่จะไปหาให้ — ดึงจากรายการที่ใกล้ถึงกำหนดจริง ไม่ใช่ข้อความลอยๆ */
  const nd=c?needs(c):[];
  const shown=(picked&&picked.length)?picked:["shopee","lazada","amazon"];
  const dots=shown.slice(0,5).map(k=>{const a=appOf(k); return a?
    `<span class="spw-dot" style="background:${a.c}" title="${esc(a.n)}">${esc(a.n[0])}</span>`:""}).join("");
  /* เติมให้ครบสามแถวเสมอ ไม่งั้นรถที่ยังไม่มีประวัติจะเห็นการ์ดโล่ง
     แถวที่มาจากกำหนดจริงติดป้ายไว้ ส่วนที่เติมเป็นหมวดยอดนิยม */
  const FILL=[T("ผ้าเบรกและจานเบรก","Brake pads & discs"),
              T("ไส้กรองและน้ำมันเครื่อง","Filters & engine oil"),
              T("ยางและใบปัดน้ำฝน","Tyres & wiper blades")];
  const list=nd.slice(0,3).map(x=>({t:x,due:true}));
  FILL.forEach(x=>{ if(list.length<3&&!list.some(r=>r.t===x))list.push({t:x,due:false}) });
  const rows=list.slice(0,3).map((r,i)=>
    `<div class="spw-row"><i class="ti ${["ti-disc","ti-droplet","ti-settings"][i]||"ti-package"}"></i>
      <span>${esc(r.t)}</span>${r.due?`<em>${T("ใกล้ถึงกำหนด","due soon")}</em>`:""}</div>`).join("");

  host.innerHTML=`<button class="spw" id="spwCard">
      ${spwScene()}
      <div class="spw-eye"><i class="ti ti-package"></i>SPARES</div>
      <div class="spw-t">${T("อะไหล่ที่ใส่กับรถคุณได้จริง","Parts that fit your car")}</div>
      <div class="spw-s">${c?T(`คัดจากรุ่น ${c.name} แล้วพาไปที่ร้านที่คุณเลือกเอง`,
          `Matched to your ${c.name}, then straight to the store you picked`)
        :T("เพิ่มรถในการาจ แล้ว SpireONE จะคัดของให้ตรงรุ่น","Add a car and SpireONE matches parts to it")}</div>
      <div class="spw-list">${rows}</div>
      <div class="spw-foot"><span class="spw-dots">${dots}</span>
        <span class="spw-go">${T("เปิด Spares","Open Spares")} <i class="ti ti-arrow-right"></i></span></div>
    </button>
    <div class="spw-ctl">
      <span class="widget-drag-handle"><i class="ti ti-hand-grab"></i></span>
      <button class="widget-nav-btn" onclick="moveWidget('w-shop',-1);event.stopPropagation();"><i class="ti ti-arrow-narrow-up"></i></button>
      <button class="widget-nav-btn" onclick="moveWidget('w-shop',1);event.stopPropagation();"><i class="ti ti-arrow-narrow-down"></i></button>
    </div>`;
  const btn=D.getElementById("spwCard");
  if(btn)btn.onclick=()=>{try{window.switchView("shop")}catch(e){}};
}

/* ── ผูกกับ switchView ── */
const origSwitch=window.switchView;
if(typeof origSwitch==="function"){
  window.switchView=function(v){
    const r=origSwitch.apply(this,arguments);
    if(v==="shop"){ mount(); watchCar(); render() }
    return r;
  };
}
/* ปิด loadShop เดิมที่ยิงไปยัง /api/shop (ตารางว่างจึงไม่เคยมีสินค้าขึ้น) */
window.loadShop=function(){ mount(); render() };
window.sparesWidgetRefresh=()=>{try{widget(true)}catch(e){}};

function boot(){ widget(); if(D.getElementById("v-shop")&&D.getElementById("v-shop").classList.contains("active"))mount() }
if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",boot); else boot();
setTimeout(boot,600);
/* วิดเจ็ตต้องตามรถและแอปที่เลือกไว้ — วาดใหม่เมื่อค่าใดค่าหนึ่งเปลี่ยน */
let wsig="";
setInterval(()=>{
  widget(); watchCar();
  const c=car(), sig=(c?c.id+"|"+c.mileage:"-")+"|"+(picked||[]).join(",");
  if(sig!==wsig){ wsig=sig; widget(true) }
},2500);
})();

;

/* ══════════════════════════════════════════════════════════════════
   LEDGER — สองเรื่องที่เจ้าของรถเจอทุกวันแต่ระบบยังไม่เคยช่วย

   1. สแกนใบเสนอราคา  ถ่ายรูปใบที่อู่ยื่นให้ แล้วบอกว่าควรจ่ายอะไรบ้าง
      ผลพลอยได้สำคัญ: ใบเสร็จมีเลขไมล์จริงพิมพ์อยู่ จึงดึงเข้าระบบได้เลย
      ทำให้เลขไมล์เลิกเป็นแค่ค่าประมาณ และได้ประวัติซ่อมโดยไม่ต้องพิมพ์

   2. เตือนต่อภาษี พ.ร.บ. ประกัน และ ตรอ.
      คำนวณจากวันที่ล้วน ๆ ไม่เรียก AI เลย จึงแม่นเต็มร้อยและไม่กินโควตา
   ══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
const D=document,$=id=>D.getElementById(id);
const EN=()=>(window.lang||"th")==="en";
const T=(th,en)=>EN()?en:th;
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const num=n=>(n==null||isNaN(n))?"—":Math.round(n).toLocaleString("en-US");
const LG=(k,d)=>{try{const v=localStorage.getItem("spire_"+k);return v?JSON.parse(v):d}catch(e){return d}};
const LSt=(k,v)=>{try{localStorage.setItem("spire_"+k,JSON.stringify(v))}catch(e){}};
const DAY=864e5;
const today=()=>new Date(new Date().toISOString().slice(0,10));
const fmtDate=d=>new Date(d).toLocaleDateString(EN()?"en-GB":"th-TH",{day:"numeric",month:"short",year:"numeric"});

function car(){ try{const c=window.selCar&&window.selCar(); return c||(window.garage()||[])[0]||null}
  catch(e){ return null } }
function carParts(c){
  if(!c)return {make:"",model:"",year:"",mileage:""};
  const p=String(c.name||"").trim().split(/\s+/);
  return {make:p[0]||"",model:p.slice(1).join(" ")||"",
    year:String(c.year||""),mileage:String(c.mileage||"")};
}

/* ══════════ ส่วนที่ 1 — ต่อภาษี / พ.ร.บ. / ประกัน / ตรอ. ══════════ */

const REG=[
  {k:"tax", ic:"ti-receipt-tax",   th:"ต่อภาษีรถ",   en:"Road tax",      every:12},
  {k:"act", ic:"ti-shield-check",  th:"พ.ร.บ.",     en:"Compulsory ins.",every:12},
  {k:"ins", ic:"ti-umbrella",      th:"ประกันภัย",   en:"Insurance",     every:12},
  {k:"chk", ic:"ti-clipboard-check",th:"ตรวจสภาพ ตรอ.",en:"Vehicle inspection",every:12}
];
const regKey=id=>"reg_"+id;
const getReg=id=>LG(regKey(id),{})||{};
const setReg=(id,v)=>LSt(regKey(id),v);

/* รถอายุตั้งแต่ 7 ปีขึ้นไปต้องผ่าน ตรอ. ก่อนถึงจะต่อภาษีได้ */
function needsChk(c){
  const y=parseInt(c&&c.year); if(!y)return false;
  return (new Date().getFullYear()-y)>=7;
}
/* วันครบกำหนดถัดไป — เลื่อนไปทีละรอบจนกว่าจะถึงวันในอนาคต
   ถ้าเลยมาแล้วไม่เกิน 60 วัน ให้ค้างไว้เป็น "เลยกำหนด" ไม่กระโดดไปปีหน้า */
function nextDue(dateStr,every){
  if(!dateStr)return null;
  const base=new Date(dateStr); if(isNaN(base))return null;
  const now=today(), d=new Date(base);
  let guard=0;
  while(d<now&&guard++<40)d.setMonth(d.getMonth()+every);
  const prev=new Date(d); prev.setMonth(prev.getMonth()-every);
  if(prev>=new Date(now-60*DAY)&&prev<now)return prev;
  return d;
}
function renewals(c){
  if(!c)return [];
  const r=getReg(c.id), out=[];
  REG.forEach(x=>{
    if(x.k==="chk"&&!needsChk(c))return;
    const due=nextDue(r[x.k],x.every);
    if(!due)return;
    out.push({...x,due,left:Math.round((due-today())/DAY)});
  });
  return out.sort((a,b)=>a.left-b.left);
}
/* รายการที่ควรเตือนแล้ว — ภายใน 30 วัน หรือเลยกำหนดไปแล้ว */
const dueSoon=c=>renewals(c).filter(x=>x.left<=30);

function regTone(left){
  if(left<0)return "over";
  if(left<=7)return "hot";
  if(left<=30)return "warn";
  return "ok";
}
function regCard(c){
  const list=renewals(c), miss=REG.filter(x=>(x.k!=="chk"||needsChk(c))&&!getReg(c.id)[x.k]);
  const rows=list.map(x=>`<div class="lg-reg ${regTone(x.left)}">
      <span class="ic"><i class="ti ${x.ic}"></i></span>
      <span class="tx"><b>${T(x.th,x.en)}</b><small>${fmtDate(x.due)}</small></span>
      <span class="lft">${x.left<0
        ? T(`เลย ${Math.abs(x.left)} วัน`,`${Math.abs(x.left)}d over`)
        : x.left===0?T("วันนี้","today"):T(`อีก ${x.left} วัน`,`${x.left}d`)}</span>
    </div>`).join("");
  return `<div class="lg-card" id="lgReg">
    <div class="lg-head"><div class="tx"><small>RENEWALS</small>
      <b>${T("ต่อภาษีและประกัน","Tax & insurance")}</b></div>
      <button class="btn" id="lgRegEdit" style="padding:8px 13px"><i class="ti ti-calendar-plus"></i>
        ${list.length?T("แก้วันที่","Edit dates"):T("ใส่วันที่","Add dates")}</button></div>
    ${rows||`<div class="lg-empty"><i class="ti ti-calendar-question"></i>
      ${T("ใส่วันที่ต่อภาษีครั้งล่าสุดครั้งเดียว แล้วระบบจะเตือนให้เองทุกปี",
          "Enter your last renewal dates once and we'll remind you every year")}</div>`}
    ${miss.length&&list.length?`<div class="lg-note">${T("ยังไม่ได้ใส่: ","Not set yet: ")}${
      miss.map(x=>T(x.th,x.en)).join(", ")}</div>`:""}
  </div>`;
}
function regForm(c){
  const r=getReg(c.id);
  const f=REG.filter(x=>x.k!=="chk"||needsChk(c)).map(x=>`<label class="lg-f">
      <span><i class="ti ${x.ic}"></i>${T(x.th,x.en)}</span>
      <input type="date" data-reg="${x.k}" value="${esc(r[x.k]||"")}">
    </label>`).join("");
  return `<div class="lg-card">
    <div class="lg-head"><div class="tx"><small>RENEWALS</small>
      <b>${T("วันที่ต่อครั้งล่าสุด","Last renewal dates")}</b></div></div>
    <p class="lg-sub">${T("ใส่วันที่ที่ต่อไปครั้งล่าสุด ระบบจะบวกไปอีกหนึ่งปีให้เอง",
      "Enter when you last renewed — we add a year automatically")}</p>
    ${f}
    <div class="lg-acts"><button class="btn primary" id="lgRegSave"><i class="ti ti-check"></i>
      ${T("บันทึก","Save")}</button>
      <button class="btn" id="lgRegCancel">${T("ยกเลิก","Cancel")}</button></div>
  </div>`;
}

/* ══════════ ส่วนที่ 2 — สแกนใบเสนอราคา ══════════ */

const VD={
  yes:  {c:"yes",  ic:"ti-alert-circle-filled", th:"ควรทำตอนนี้", en:"Do it now"},
  later:{c:"later",ic:"ti-clock",               th:"รอได้",       en:"Can wait"},
  no:   {c:"no",   ic:"ti-circle-x",            th:"ยังไม่ต้อง",   en:"Skip for now"}
};
/* จับคู่ชื่อรายการในใบเสร็จกับรหัสรอบบำรุงรักษาของระบบ เพื่อบันทึกเข้าประวัติได้ */
const MATCH=[
  [/น้ำมันเครื่อง|engine oil/i,"oil"],[/กรองอากาศ|air filter/i,"airf"],
  [/กรองแอร์|cabin/i,"cabin"],[/หัวเทียน|spark/i,"plug"],
  [/ผ้าเบรก|brake pad/i,"brakepad"],[/น้ำมันเบรก|brake fluid/i,"brakeoil"],
  [/ยาง(?!รถยนต์ตัน)|tyre|tire/i,"tire"],[/ตั้งศูนย์|ถ่วงล้อ|align/i,"align"],
  [/แบตเตอ|battery/i,"batt"],[/หล่อเย็น|coolant|หม้อน้ำ/i,"coolant"],
  [/น้ำมันเกียร์|gear oil/i,"gearoil"],[/สายพาน|belt/i,"belt"],[/โช้ค|shock/i,"shock"]
];
const svcKey=n=>{const m=MATCH.find(([re])=>re.test(n)); return m?m[1]:null};

let qImg=null,qMime="",qBusy=false,qRes=null,qErr="",qSaved={odo:false,svc:false};
/* โหมดนำเข้าย้อนหลัง — เลือกใบเสร็จเก่าทีเดียวหลายใบ
   การกรอกประวัติครั้งแรกคือกำแพงที่ทำให้คนเลิกใช้ ตรงนี้ต้องเร็วที่สุด */
let bulk=null;

/* แท็บทั้งหมดอยู่ในหน้าเดียว เพราะแถบนำทางบนมือถือแน่นอยู่แล้ว
   ใส่เพิ่มอีกสี่เมนูจะล้นกรอบเหมือนที่เคยเจอมา */
const TOOLS=[
  {k:"quote", ic:"ti-receipt-2",    th:"ใบเสนอราคา", en:"Quote"},
  {k:"listen",ic:"ti-ear",          th:"ฟังเสียงรถ", en:"Listen"},
  {k:"shake", ic:"ti-activity",     th:"วัดอาการสั่น",en:"Shake test"},
  {k:"park",  ic:"ti-map-pin",      th:"จำที่จอด",   en:"Parking"},
  {k:"trip",  ic:"ti-route",        th:"ก่อนเดินทาง",en:"Trip"},
  {k:"own",   ic:"ti-report-money", th:"ต้นทุน & สมุดรถ",en:"Cost & record"}
];
let tool="quote";
const TOOLSUB={
  quote:["ถ่ายรูปใบที่อู่ยื่นให้ แล้วดูว่ารายการไหนควรจ่ายตอนนี้จริง และราคาสมเหตุสมผลไหม",
    "Photograph the quote your garage handed you and see what's actually needed — and whether the price is fair"],
  listen:["อัดเสียงรถตามท่าที่กำหนด แล้วให้ระบบบอกว่าน่าจะมาจากอะไร ดีกว่าเลียนเสียงให้ช่างฟัง",
    "Record your car the way we guide you and hear what it's likely to be — better than imitating the noise to a mechanic"],
  park:["จอดแล้วกดปุ่มเดียว ระบบจำพิกัดไว้ แล้วพาเดินกลับไปหารถพร้อมเตือนก่อนหมดเวลาจอด",
    "One tap when you park — we remember the spot, walk you back to it, and warn you before the parking expires"],
  shake:["วางมือถือไว้ในรถแล้วขับ ระบบวัดความถี่การสั่นเทียบกับรอบหมุนล้อ แล้วบอกว่ามาจากล้อ ยาง หรือเครื่องยนต์",
    "Put your phone in the car and drive — we lock the vibration against your wheel's rotation and tell you where it comes from"],
  trip:["บอกปลายทางก่อนออกเดินทางไกล ระบบเช็กว่าอะไรจะถึงกำหนดระหว่างทาง และอากาศเป็นอย่างไร",
    "Say where you're headed and we'll check what falls due mid-trip and what the weather will do"],
  own:["รถคันนี้กินเงินจริงเท่าไรต่อกิโลเมตร และสมุดประวัติที่ส่งออกไปเพิ่มราคาขายต่อได้",
    "What this car really costs per kilometre, plus an ownership record that lifts its resale value"]
};

function quoteView(){
  return `<section class="view" id="v-quote"><div class="scroll"><div class="lg-wrap">
    <div class="lg-title">
      <div><div class="lg-eye">SPIREONE</div>
        <h2 class="section-title" style="margin:0" id="lgH1"></h2>
        <p class="section-sub" id="lgSub"></p></div>
    </div>
    <div class="lg-tabs" id="lgTabs"></div>
    <div id="lgQuote"></div>
    <div id="lgRegBox" style="margin-top:22px"></div>
    <div id="lgNotifBox" style="margin-top:14px"></div>
  </div></div></section>`;
}
function tabsHtml(){
  return TOOLS.map(x=>`<button class="lg-tab${x.k===tool?" on":""}" data-tool="${x.k}">
    <i class="ti ${x.ic}"></i><span>${T(x.th,x.en)}</span></button>`).join("");
}

function quoteBody(){
  const c=car();
  if(bulk)return bulkBody();
  if(!c)return `<div class="lg-card"><div class="lg-empty"><i class="ti ti-car"></i>
    ${T("เพิ่มรถในการาจก่อน ระบบจะได้รู้ว่าใบนี้เป็นของรถรุ่นไหน",
        "Add a car first so we know which model this quote is for")}
    <div style="margin-top:12px"><button class="btn primary" data-view="garage">${
      T("ไปที่การาจ","Open garage")}</button></div></div></div>`;

  if(qBusy)return `<div class="lg-card"><div class="lg-scan">
    <div class="lg-spin"></div>
    <b>${T("กำลังอ่านใบนี้…","Reading the quote…")}</b>
    <small>${T("อ่านทีละบรรทัด เทียบกับระยะรถและรอบบำรุงรักษาของคุณ",
      "Going line by line against your car's mileage and service schedule")}</small></div></div>`;

  if(qRes)return quoteResult(c);

  return `<div class="lg-card lg-drop" id="lgDrop">
      <input type="file" id="lgFile" accept="image/*" capture="environment" hidden>
      ${qImg?`<img class="lg-prev" src="${qImg}" alt="">`
            :`<div class="lg-dropin"><i class="ti ti-camera-plus"></i>
        <b>${T("ถ่ายรูปหรือเลือกไฟล์ใบเสนอราคา","Photograph or choose the quote")}</b>
        <small>${T("ถ่ายให้เห็นทั้งใบ ตัวเลขชัด ไม่เอียงมาก","Capture the whole page, numbers legible, not too skewed")}</small></div>`}
      <div class="lg-acts">
        <button class="btn" id="lgPick"><i class="ti ti-photo-plus"></i>${
          qImg?T("เปลี่ยนรูป","Change photo"):T("เลือกรูป","Choose photo")}</button>
        ${qImg?`<button class="btn primary" id="lgGo"><i class="ti ti-scan"></i>${
          T("ตรวจใบนี้","Check this quote")}</button>`:""}
      </div>
      <div class="lg-orline"><span>${T("หรือ","or")}</span></div>
      <button class="btn" id="lgBulk" style="width:100%;justify-content:center">
        <i class="ti ti-files"></i>${T("นำเข้าใบเสร็จเก่าหลายใบพร้อมกัน","Import a stack of old receipts")}</button>
      <p class="lg-note" style="margin-top:8px">${T(
        "มีใบเสร็จเก่าเก็บไว้อยู่แล้วใช่ไหม เลือกทีเดียวหลาย ๆ ใบ ระบบจะอ่านให้ทั้งหมดแล้วเติมประวัติรถให้เสร็จในรอบเดียว",
        "Got a pile of old receipts? Select them all at once and we'll read every one and fill your history in a single pass")}</p>
      ${qErr?`<div class="lg-err"><i class="ti ti-alert-triangle"></i>${esc(qErr)}</div>`:""}
      <p class="lg-note">${T(
        "รูปถูกส่งไปให้ AI อ่านครั้งเดียวเพื่อสรุปผล ไม่ได้เก็บไว้บนเซิร์ฟเวอร์",
        "The photo is read once to produce the summary and is not stored on the server")}</p>
    </div>`;
}

function quoteResult(c){
  const r=qRes;
  const g=v=>r.items.filter(x=>x.verdict===v);
  const sum=a=>a.reduce((t,x)=>t+(x.price||0),0);
  const yes=g("yes"),later=g("later"),no=g("no");
  const save=sum(later)+sum(no);

  const bar=[["yes",yes],["later",later],["no",no]].filter(([,a])=>a.length)
    .map(([k,a])=>`<span class="seg ${k}" style="flex:${a.length}">${a.length}</span>`).join("");

  const item=x=>{
    const v=VD[x.verdict]||VD.later;
    const over=(x.fairHigh!=null&&x.price!=null&&x.price>x.fairHigh*1.15);
    const under=(x.fairLow!=null&&x.price!=null&&x.price<x.fairLow*.85);
    return `<div class="lg-item ${v.c}">
      <div class="hd"><span class="vd"><i class="ti ${v.ic}"></i>${T(v.th,v.en)}</span>
        <span class="nm">${esc(x.name)}</span>
        <span class="pr">฿${num(x.price)}${x.qty>1?` <em>×${x.qty}</em>`:""}</span></div>
      ${x.reason?`<div class="rs">${esc(x.reason)}</div>`:""}
      ${(x.fairLow!=null||x.fairHigh!=null)?`<div class="fr ${over?"over":under?"under":""}">
        <i class="ti ${over?"ti-trending-up":under?"ti-trending-down":"ti-check"}"></i>
        ${T("ราคาตลาด","Market")} ฿${num(x.fairLow)}–${num(x.fairHigh)}
        ${over?` · ${T("แพงกว่าปกติ","above normal")}`:under?` · ${T("ถูกกว่าปกติ","below normal")}`:` · ${T("อยู่ในช่วงปกติ","in range")}`}</div>`:""}
    </div>`};

  const svc=r.items.filter(x=>svcKey(x.name));
  return `<div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${esc(r.shop||T("ใบเสนอราคา","Quote"))}</small>
        <b>${T("รวม","Total")} ฿${num(r.total)}</b></div>
        <button class="btn" id="lgAgain"><i class="ti ti-refresh"></i>${T("ตรวจใบใหม่","New quote")}</button></div>
      ${r.docDate?`<div class="lg-sub">${T("วันที่บนเอกสาร","Document date")} ${fmtDate(r.docDate)}</div>`:""}

      <div class="lg-bar">${bar}</div>
      <div class="lg-legend">
        <span><i class="ti ti-alert-circle-filled" style="color:#C2410C"></i>${T("ควรทำ","Needed")} ${yes.length} · ฿${num(sum(yes))}</span>
        <span><i class="ti ti-clock" style="color:#B45309"></i>${T("รอได้","Can wait")} ${later.length}</span>
        <span><i class="ti ti-circle-x" style="color:#4B5563"></i>${T("ยังไม่ต้อง","Skip")} ${no.length}</span>
      </div>
      ${save>0?`<div class="lg-save"><i class="ti ti-pig-money"></i>
        <b>${T("เลื่อนออกไปก่อนได้ราว","You could defer about")} ฿${num(save)}</b>
        <small>${T("ถ้าทำเฉพาะรายการที่จำเป็นตอนนี้","if you only do what's needed today")}</small></div>`:""}
      ${r.summary?`<div class="lg-sum">${esc(r.summary)}</div>`:""}
    </div>

    <div class="lg-items">${r.items.map(item).join("")}</div>

    ${r.askShop&&r.askShop.length?`<div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("ก่อนตกลง","Before you agree")}</small>
        <b>${T("ลองถามอู่แบบนี้","Ask the garage this")}</b></div></div>
      ${r.askShop.map(q=>`<div class="lg-ask"><i class="ti ti-message-question"></i>${esc(q)}</div>`).join("")}
    </div>`:""}

    <div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("เก็บเข้าระบบ","Save to your car")}</small>
        <b>${T("ใช้ข้อมูลจากใบนี้ต่อ","Use what's on this quote")}</b></div></div>
      ${r.odometer?`<div class="lg-keep">
        <span><i class="ti ti-gauge"></i>${T("เลขไมล์บนเอกสาร","Odometer on the document")}
          <b>${num(r.odometer)} ${T("กม.","km")}</b></span>
        <button class="btn ${qSaved.odo?"":"primary"}" id="lgSaveOdo" ${qSaved.odo?"disabled":""}>${
          qSaved.odo?T("บันทึกแล้ว","Saved"):T("ใช้เป็นเลขไมล์จริง","Use as real reading")}</button>
      </div>`:`<div class="lg-note">${T("ไม่พบเลขไมล์บนเอกสารนี้","No odometer reading found on this document")}</div>`}
      ${svc.length?`<div class="lg-keep col">
        <span><i class="ti ti-history"></i>${T("บันทึกเข้าประวัติซ่อม","Add to service history")}</span>
        <p class="lg-note" style="margin:0">${T(
          "ติ๊กเฉพาะงานที่อู่ทำไปแล้วจริง — คำแนะนำข้างบนบอกว่าควรจ่ายไหม ไม่ได้บอกว่าทำไปหรือยัง",
          "Tick only what the garage actually did — the advice above is about paying, not about what was done")}</p>
        <div class="lg-picks">${svc.map((x,i)=>`<label class="lg-pick">
          <input type="checkbox" data-svc="${r.items.indexOf(x)}" ${x.verdict==="yes"?"checked":""}>
          <span>${esc(x.name)}</span><em>฿${num(x.price)}</em></label>`).join("")}</div>
        <button class="btn ${qSaved.svc?"":"primary"}" id="lgSaveSvc" ${qSaved.svc?"disabled":""}>${
          qSaved.svc?T("บันทึกแล้ว","Saved"):T("บันทึกที่ติ๊กไว้","Save ticked items")}</button>
      </div>`:""}
      <p class="lg-note">${T(
        "ราคาตลาดเป็นค่าประเมิน ใช้ประกอบการตัดสินใจ ไม่ใช่คำตัดสินแทนช่าง",
        "Market prices are estimates to inform your decision, not a verdict replacing your mechanic")}</p>
    </div>`;
}

/* ══════════ นำเข้าใบเสร็จเก่าหลายใบ ══════════ */
function bulkBody(){
  const b=bulk;
  const done=b.results.length, total=b.files.length;
  if(b.stage==="run"){
    return `<div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("กำลังอ่าน","Reading")}</small>
        <b>${T(`ใบที่ ${done+1} จาก ${total}`,`Receipt ${done+1} of ${total}`)}</b></div></div>
      <div class="lg-prog"><i style="width:${Math.round(done/total*100)}%"></i></div>
      <div class="lg-scan" style="padding-top:22px"><div class="lg-spin"></div>
        <small>${T("อ่านทีละใบ ใบละไม่กี่วินาที ปล่อยหน้านี้ไว้ได้",
          "One at a time, a few seconds each — you can leave this open")}</small></div>
      ${b.fails.length?`<div class="lg-note">${T(
        `อ่านไม่ออก ${b.fails.length} ใบ จะข้ามไปก่อน`,`${b.fails.length} couldn't be read and were skipped`)}</div>`:""}
      <div class="lg-acts"><button class="btn" id="blStop">${T("หยุด","Stop")}</button></div>
    </div>`;
  }
  if(b.stage==="review"){
    const rows=b.entries.map((e,i)=>`<label class="lg-pick">
      <input type="checkbox" data-blpick="${i}" ${e.on?"checked":""}>
      <span>${esc(e.name)}</span>
      <em>${e.date||"—"}${e.km?` · ${num(e.km)} ${T("กม.","km")}`:""}${
        e.amount?` · ฿${num(e.amount)}`:""}</em></label>`).join("");
    const odo=b.odo;
    return `<div class="lg-card">
        <div class="lg-head"><div class="tx"><small>${T("อ่านเสร็จแล้ว","Done reading")}</small>
          <b>${T(`เจอ ${b.entries.length} รายการจาก ${b.results.length} ใบ`,
                 `${b.entries.length} items from ${b.results.length} receipts`)}</b></div>
          <button class="btn" id="blCancel">${T("ยกเลิก","Cancel")}</button></div>
        ${b.fails.length?`<div class="lg-tip"><i class="ti ti-alert-triangle"></i>${T(
          `อ่านไม่ออก ${b.fails.length} ใบ ลองถ่ายใหม่ให้ชัดขึ้นแล้วนำเข้าเฉพาะใบนั้น`,
          `${b.fails.length} couldn't be read — retake those and import them separately`)}</div>`:""}
        <p class="lg-sub" style="margin-top:11px">${T(
          "ติ๊กเฉพาะรายการที่ทำไปจริง แล้วกดบันทึกเข้าประวัติรถทีเดียว",
          "Tick what was actually done, then save it all into the car's history at once")}</p>
        <div class="lg-picks">${rows||`<p class="lg-note">${T("ไม่เจอรายการที่ตรงกับรอบบำรุงรักษา","Nothing matched a service interval")}</p>`}</div>
        ${odo?`<div class="lg-keep" style="margin-top:12px"><span><i class="ti ti-gauge"></i>
          ${T("เลขไมล์ล่าสุดที่เจอในใบเสร็จ","Latest odometer found")}
          <b>${num(odo)} ${T("กม.","km")}</b></span></div>`:""}
        <div class="lg-acts"><button class="btn primary" id="blSave"><i class="ti ti-check"></i>
          ${T("บันทึกที่ติ๊กไว้","Save ticked items")}</button></div>
      </div>`;
  }
  return `<div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("นำเข้าย้อนหลัง","Backfill")}</small>
        <b>${T("เลือกใบเสร็จเก่าทีเดียวหลายใบ","Pick a stack of old receipts")}</b></div>
        <button class="btn" id="blCancel">${T("ยกเลิก","Cancel")}</button></div>
      <p class="lg-sub">${T(
        "ยิ่งประวัติครบ ระบบยิ่งเตือนได้ตรง และตอนขายรถเอกสารชุดนี้ทำให้ได้ราคาดีกว่า",
        "The fuller the history, the sharper the reminders — and it's what lifts the price when you sell")}</p>
      <input type="file" id="blFiles" accept="image/*" multiple hidden>
      <div class="lg-acts">
        <button class="btn primary" id="blPick"><i class="ti ti-files"></i>${
          T("เลือกรูปใบเสร็จ","Choose receipt photos")}</button></div>
      <p class="lg-note">${T(
        "เลือกได้สูงสุด 12 ใบต่อรอบ · แต่ละใบใช้โควตา AI เท่ากับการตรวจใบเสนอราคาหนึ่งครั้ง",
        "Up to 12 at a time · each one costs the same AI quota as a single quote check")}</p>
      ${b.err?`<div class="lg-err"><i class="ti ti-alert-triangle"></i>${esc(b.err)}</div>`:""}
    </div>`;
}

async function runBulk(){
  const c=car(); if(!c||!bulk)return;
  bulk.stage="run"; bulk.err=""; renderTool();
  for(const f of bulk.files){
    if(bulk.abort)break;
    try{
      const o=await shrink(f);
      const d=await api("/api/quote",{image:o.url,mime:o.mime,car:carParts(c),
        done:[],lang:window.lang||"th"});
      bulk.results.push(d);
    }catch(e){ bulk.fails.push(String(e&&e.message||e).slice(0,80)) }
    renderTool();
  }
  /* รวมทุกใบเป็นรายการเดียว เรียงตามวันที่ แล้วให้เจ้าของติ๊กยืนยัน */
  const seen=new Set();
  bulk.entries=[];
  bulk.results.forEach(r=>{
    (r.items||[]).forEach(it=>{
      const k=svcKey(it.name); if(!k)return;
      const date=r.docDate||"", km=r.odometer||0;
      const sig=k+"|"+date+"|"+km;
      if(seen.has(sig))return; seen.add(sig);
      bulk.entries.push({k,name:it.name,date,km,amount:it.price||0,on:true});
    });
  });
  bulk.entries.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  bulk.odo=bulk.results.reduce((m,r)=>Math.max(m,r.odometer||0),0);
  bulk.stage=bulk.entries.length||bulk.results.length?"review":"pick";
  if(!bulk.results.length)bulk.err=T("อ่านไม่ออกสักใบ ลองถ่ายใหม่ให้เห็นทั้งใบและตัวเลขชัด",
    "None could be read — retake them with the whole page in frame");
  renderTool();
}
function wireBulk(){
  const pk=$("blPick"),fi=$("blFiles");
  if(pk&&fi)pk.onclick=()=>fi.click();
  if(fi)fi.onchange=e=>{
    const list=[...(e.target.files||[])].slice(0,12);
    e.target.value="";
    if(!list.length)return;
    bulk.files=list; bulk.results=[]; bulk.fails=[]; bulk.abort=false;
    runBulk();
  };
  const st=$("blStop"); if(st)st.onclick=()=>{ bulk.abort=true };
  const cn=$("blCancel"); if(cn)cn.onclick=()=>{ bulk=null; renderTool() };
  D.querySelectorAll("[data-blpick]").forEach(i=>i.onchange=()=>{
    const e=bulk.entries[+i.dataset.blpick]; if(e)e.on=i.checked });
  const sv=$("blSave");
  if(sv)sv.onclick=()=>{
    const c=car(); if(!c)return;
    const picked=bulk.entries.filter(x=>x.on);
    if(!picked.length)return;
    const l=LG("carlab_log_"+c.id,{services:[],fuel:[],trips:[]});
    l.services=l.services||[];
    picked.forEach(e=>{
      /* ไม่เขียนทับของเดิมที่วันเดียวกัน เพราะใบเสร็จซ้ำกันได้ */
      const dup=l.services.some(x=>x.k===e.k&&x.date===e.date&&(x.km||0)===(e.km||0));
      if(!dup)l.services.push({k:e.k,km:e.km||0,amount:e.amount||0,
        date:e.date||new Date().toISOString().slice(0,10),note:T("นำเข้าจากใบเสร็จ","imported from receipt")});
    });
    LSt("carlab_log_"+c.id,l);
    if(bulk.odo){try{ if(window.SpireODO)window.SpireODO.confirm(c,bulk.odo,"service") }catch(e){}}
    bulk=null; renderTool();
    try{ window.clRefreshWidgets&&window.clRefreshWidgets(); window.odoRefresh&&window.odoRefresh();
         window.briefRefresh&&window.briefRefresh(); window.spireNextAction&&window.spireNextAction() }catch(e){}
  };
}

/* ── ย่อรูปก่อนส่ง ── ใบเสนอราคาอ่านออกที่ด้านยาว 1600px แล้ว
   ไม่ต้องส่งไฟล์กล้อง 8MB ให้เปลืองเวลาและโดนลิมิตขนาดคำขอ */
function shrink(file){
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onerror=()=>rej(new Error("read failed"));
    fr.onload=()=>{
      const im=new Image();
      im.onerror=()=>rej(new Error("decode failed"));
      im.onload=()=>{
        const MAX=1600, sc=Math.min(1,MAX/Math.max(im.width,im.height));
        const w=Math.round(im.width*sc), h=Math.round(im.height*sc);
        const cv=D.createElement("canvas"); cv.width=w; cv.height=h;
        cv.getContext("2d").drawImage(im,0,0,w,h);
        res({url:cv.toDataURL("image/jpeg",.82),mime:"image/jpeg"});
      };
      im.src=fr.result;
    };
    fr.readAsDataURL(file);
  });
}

async function runQuote(){
  const c=car(); if(!c||!qImg)return;
  qBusy=true; qErr=""; renderQuote();
  try{
    const done=[];
    try{
      const l=LG("carlab_log_"+c.id,{services:[]});
      (l.services||[]).slice(-8).forEach(s=>done.push(s.k));
    }catch(e){}
    const d=await api("/api/quote",{
      image:qImg,mime:qMime,car:carParts(c),done,lang:window.lang||"th"});
    qRes=d; qSaved={odo:false,svc:false};
  }catch(e){
    qErr=String(e&&e.message||e).slice(0,240)||T("เชื่อมต่อไม่ได้","Connection failed");
  }
  qBusy=false; renderQuote();
}

async function api(path,body){
  const auth=window.spireAuth;
  if(!(auth&&auth.currentUser))
    throw new Error(T("กรุณาเข้าสู่ระบบก่อน","Please sign in first"));
  const tok=await auth.currentUser.getIdToken();
  const r=await fetch(window.BACKEND_URL+path,{method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+tok},
    body:JSON.stringify(body)});
  let d=null; try{ d=await r.json() }catch(e){}
  if(!r.ok){
    const err=(d&&d.error)||"";
    if(err.indexOf("quote_unreadable")>=0)throw new Error(T(
      "อ่านใบนี้ไม่ออก ลองถ่ายใหม่ให้เห็นทั้งใบ แสงพอ และตัวเลขคมชัด",
      "Couldn't read this. Retake it with the whole page in frame, good light and sharp numbers"));
    if(err.indexOf("AI quota exhausted")>=0)throw new Error(T(
      "โควตา AI ของระบบหมดชั่วคราว ลองใหม่ภายหลัง",
      "The system's AI quota is used up — please try later"));
    if(r.status===429||err==="quota")throw new Error(T(
      "ใช้โควตา AI ของวันนี้ครบแล้ว ลองใหม่พรุ่งนี้","Daily AI quota reached"));
    if(r.status===413)throw new Error(T("รูปใหญ่เกินไป ลองถ่ายใหม่","Image too large — retake it"));
    if(r.status===401)throw new Error(T("กรุณาเข้าสู่ระบบใหม่","Please sign in again"));
    if(r.status===404)throw new Error(T(
      "เซิร์ฟเวอร์ยังไม่มีระบบนี้ — ต้อง deploy Worker เวอร์ชันใหม่ก่อน",
      "Server is on an older build — deploy the Worker first"));
    if(err.indexOf("quote_ai")===0)throw new Error(T(
      "AI ตอบกลับมาไม่ครบ ลองกดตรวจใหม่อีกครั้ง",
      "The model came back incomplete — try again"));
    throw new Error(err||("Error "+r.status));
  }
  return d;
}

/* ตัวเดิมยังเรียกจากที่อื่นอยู่ ให้ชี้มาที่ตัวจัดการแท็บตัวเดียวกัน */
function renderQuote(){ renderTool() }

function renderTool(){
  const b=$("lgQuote"); if(!b)return;
  const cur=TOOLS.find(x=>x.k===tool)||TOOLS[0];
  const h1=$("lgH1"), sub=$("lgSub"), tabs=$("lgTabs");
  if(h1)h1.textContent=T(cur.th,cur.en)==="Quote"?T("ตรวจใบเสนอราคา","Check a quote"):T(cur.th,cur.en);
  if(sub)sub.textContent=T(TOOLSUB[tool][0],TOOLSUB[tool][1]);
  if(tabs){ tabs.innerHTML=tabsHtml();
    tabs.querySelectorAll("[data-tool]").forEach(t=>t.onclick=()=>{
      /* ออกจากแท็บฟังเสียงต้องปิดไมค์ ไม่งั้นไฟไมค์ค้างทั้งที่ไม่ได้ใช้ */
      if(tool==="listen"&&t.dataset.tool!=="listen"){ try{lRec&&lRec.stop()}catch(e){} lArmed=false }
      /* ออกจากแท็บวัดสั่นต้องปลดเซ็นเซอร์กับ GPS ไม่งั้นกินแบตทิ้งไว้เฉย ๆ */
      if(tool==="shake"&&t.dataset.tool!=="shake"){ stopShake(); if(sk.stage==="run")sk.stage="idle" }
      /* ออกจากแท็บให้ปล่อย GPS แต่ถ้าโหมดขับรถทำงานอยู่ต้องไม่ตัด
         ไม่งั้นผู้ใช้สลับไปดูแท็บอื่นแล้วทริปขาดกลางคัน */
      if(tool==="park"&&t.dataset.tool!=="park"&&!dv.on)stopPkWatch();
      tool=t.dataset.tool; renderTool();
      const sc=D.querySelector("#v-quote .scroll"); if(sc)sc.scrollTop=0; }); }

  if(tool==="quote"){ b.innerHTML=quoteBody(); wireQuote() }
  else if(tool==="listen"){ b.innerHTML=listenBody(); wireListen();
    /* เข้าแท็บแล้วอัดเลย ไม่ต้องกดปุ่มก่อน — คนเปิดหน้านี้เพราะรถกำลังมีเสียงอยู่ */
    if(!lArmed&&!lRec&&!lUrl&&!lRes&&!lBusy&&car()){ lArmed=true; startRec() } }
  else if(tool==="shake"){ b.innerHTML=shakeBody(); wireShake() }
  else if(tool==="park"){ b.innerHTML=parkBody(); wirePark() }
  else if(tool==="trip"){ b.innerHTML=tripBody(); wireTrip() }
  else { b.innerHTML=ownBody(); wireOwn() }

  /* การ์ดต่อภาษีขึ้นเฉพาะหน้าใบเสนอราคา ไม่งั้นจะเกะกะทุกแท็บ */
  const rb=$("lgRegBox"), c=car();
  if(rb&&c&&tool==="quote"){ rb.innerHTML=regCard(c); wireReg() }
  else if(rb) rb.innerHTML="";
  const nb=$("lgNotifBox");
  if(nb){ if(tool==="quote"){ renderNotifCard() } else nb.innerHTML="" }
}

function wireQuote(){
  if(bulk){ wireBulk(); return }
  const bl=$("lgBulk");
  if(bl)bl.onclick=()=>{ bulk={stage:"pick",files:[],results:[],fails:[],entries:[],odo:0,err:""};
    renderTool() };
  const f=$("lgFile"),pick=$("lgPick");
  if(pick&&f)pick.onclick=()=>f.click();
  if(f)f.onchange=async e=>{
    const file=e.target.files&&e.target.files[0]; if(!file)return;
    qErr="";
    try{ const o=await shrink(file); qImg=o.url; qMime=o.mime; }
    catch(err){ qErr=T("เปิดรูปนี้ไม่ได้ ลองไฟล์อื่น","Couldn't open that image — try another"); }
    f.value=""; renderQuote();
  };
  const go=$("lgGo"); if(go)go.onclick=runQuote;
  const ag=$("lgAgain"); if(ag)ag.onclick=()=>{qRes=null;qImg=null;qErr="";renderQuote()};

  const so=$("lgSaveOdo");
  if(so)so.onclick=()=>{
    const c=car(); if(!c||!qRes||!qRes.odometer)return;
    try{ window.SpireODO&&window.SpireODO.confirm(c,qRes.odometer,"manual") }catch(e){}
    qSaved.odo=true; renderQuote();
    try{ window.odoRefresh&&window.odoRefresh(); window.clRefreshWidgets&&window.clRefreshWidgets();
         window.briefRefresh&&window.briefRefresh() }catch(e){}
  };
  const ss=$("lgSaveSvc");
  if(ss)ss.onclick=()=>{
    const c=car(); if(!c||!qRes)return;
    const km=qRes.odometer||(()=>{try{return window.SpireODO.value(c)}catch(e){return 0}})();
    const date=qRes.docDate||new Date().toISOString().slice(0,10);
    const l=LG("carlab_log_"+c.id,{services:[],fuel:[],trips:[]});
    l.services=l.services||[];
    const picked=new Set();
    D.querySelectorAll("[data-svc]").forEach(i=>{ if(i.checked)picked.add(+i.dataset.svc) });
    if(!picked.size){ qSaved.svc=false; return }
    qRes.items.forEach((x,i)=>{
      const k=svcKey(x.name); if(!k||!picked.has(i))return;
      l.services.push({k,km:+km||0,amount:+x.price||0,date});
    });
    LSt("carlab_log_"+c.id,l);
    qSaved.svc=true; renderQuote();
    try{ window.clRefreshWidgets&&window.clRefreshWidgets(); window.clRerender&&window.clRerender();
         window.briefRefresh&&window.briefRefresh() }catch(e){}
  };
}

let regEditing=false;
function wireReg(){
  const c=car(); if(!c)return;
  const e=$("lgRegEdit");
  if(e)e.onclick=()=>{ regEditing=true; const b=$("lgRegBox");
    if(b){ b.innerHTML=regForm(c); wireRegForm() } };
}
function wireRegForm(){
  const c=car(); if(!c)return;
  const s=$("lgRegSave"), x=$("lgRegCancel");
  if(s)s.onclick=()=>{
    const r=getReg(c.id);
    D.querySelectorAll("[data-reg]").forEach(i=>{ r[i.dataset.reg]=i.value||"" });
    setReg(c.id,r); regEditing=false;
    const b=$("lgRegBox"); if(b){ b.innerHTML=regCard(c); wireReg() }
    try{ window.briefRefresh&&window.briefRefresh() }catch(e){}
    renewWidget(true); renderNext(); syncPush();
  };
  if(x)x.onclick=()=>{ regEditing=false;
    const b=$("lgRegBox"); if(b){ b.innerHTML=regCard(c); wireReg() } };
}

/* ══════════ วิดเจ็ตเตือนต่อภาษี (เปิดเองได้ในหน้าปรับแต่ง) ══════════ */
function renewWidget(force){
  const grid=$("widgetGrid"); if(!grid)return;
  let w=$("w-renew");
  if(!w){
    w=D.createElement("div");
    w.className="widget"; w.id="w-renew"; w.draggable=true;
    w.style.display="none";
    grid.appendChild(w);
    /* ค่าเริ่มต้นปิดไว้ เพราะหน้าแรกตั้งใจให้เหลือสามใบ */
    try{const tg=LG("widgetToggles",{})||{};
      if(tg["w-renew"]===undefined){tg["w-renew"]=false;LSt("widgetToggles",tg)}
      w.style.display=tg["w-renew"]?"block":"none"}catch(e){}
    addRenewToggle();
    try{if(typeof window.saveWidgetLayout==="function")window.saveWidgetLayout()}catch(e){}
  }else if(!force&&w.dataset.filled)return;
  w.dataset.filled="1";
  const c=car(), list=c?renewals(c):[];
  w.innerHTML=`<div class="widget-header">
      <span class="widget-drag-handle"><i class="ti ti-hand-grab"></i></span>
      <h3>${T("ต่อภาษีและประกัน","Tax & insurance")}</h3>
      <div class="widget-actions">
        <button class="widget-nav-btn" onclick="moveWidget('w-renew',-1);event.stopPropagation();"><i class="ti ti-arrow-narrow-up"></i></button>
        <button class="widget-nav-btn" onclick="moveWidget('w-renew',1);event.stopPropagation();"><i class="ti ti-arrow-narrow-down"></i></button>
      </div></div>
    <div class="lg-wid">${list.length?list.map(x=>`<div class="lg-reg ${regTone(x.left)}">
        <span class="ic"><i class="ti ${x.ic}"></i></span>
        <span class="tx"><b>${T(x.th,x.en)}</b><small>${fmtDate(x.due)}</small></span>
        <span class="lft">${x.left<0?T(`เลย ${Math.abs(x.left)} วัน`,`${Math.abs(x.left)}d over`)
          :x.left===0?T("วันนี้","today"):T(`อีก ${x.left} วัน`,`${x.left}d`)}</span>
      </div>`).join("")
      :`<div class="lg-empty" style="padding:22px 12px"><i class="ti ti-calendar-question"></i>
        ${T("ยังไม่ได้ใส่วันที่ต่อภาษี","No renewal dates yet")}
        <div style="margin-top:11px"><button class="btn primary" data-lgopen="1" style="padding:8px 14px">${
          T("ใส่วันที่","Add dates")}</button></div></div>`}</div>`;
}
function addRenewToggle(){
  const panel=D.querySelector("#customizePanel div[style*='flex-wrap']");
  if(!panel||panel.querySelector("[data-renewchk]"))return;
  const on=(()=>{try{return !!(LG("widgetToggles",{})||{})["w-renew"]}catch(e){return false}})();
  const l=D.createElement("label"); l.className="toggle-label"; l.dataset.renewchk="1";
  l.innerHTML=`<input type="checkbox" id="chk-renew" ${on?"checked":""}
    onchange="toggleWidget('w-renew',this.checked)"> <span>${T("ต่อภาษีและประกัน","Tax & insurance")}</span>`;
  panel.appendChild(l);
}

/* ══════════ ส่วนที่ 3 — ฟังเสียงเครื่องยนต์ ══════════ */

const TAKES=[
  {k:"cold", ic:"ti-snowflake",     th:"ตอนสตาร์ทเครื่องเย็น", en:"Cold start",
   tip:["จอดทิ้งไว้อย่างน้อย 4 ชั่วโมง แล้วอัดตั้งแต่ก่อนบิดกุญแจ",
        "Leave it parked 4+ hours, start recording before you turn the key"]},
  {k:"idle", ic:"ti-engine",        th:"เดินเบาอยู่กับที่", en:"Idling",
   tip:["เปิดฝากระโปรง ถือมือถือห่างเครื่องราวหนึ่งช่วงแขน ปิดแอร์",
        "Open the bonnet, hold the phone an arm's length from the engine, A/C off"]},
  {k:"rev",  ic:"ti-gauge",         th:"เร่งเครื่องอยู่กับที่", en:"Revving",
   tip:["เกียร์ว่าง เหยียบคันเร่งขึ้นลงช้า ๆ สองสามครั้ง",
        "In neutral, ease the throttle up and down a few times"]},
  {k:"brake",ic:"ti-disc",          th:"ตอนเหยียบเบรก", en:"Braking",
   tip:["ขับช้า ๆ ในที่ปลอดภัย เหยียบเบรกเบา ๆ ปิดแอร์และเพลง",
        "Drive slowly somewhere safe and brake gently, A/C and music off"]},
  {k:"drive",ic:"ti-steering-wheel",th:"ตอนขับอยู่", en:"Driving",
   tip:["ให้คนอื่นถือมือถือ อย่าอัดเองขณะขับ",
        "Have a passenger hold the phone — never record while driving"]}
];
const URG={
  now:  {c:"now",  th:"ควรตรวจทันที",    en:"Check immediately"},
  soon: {c:"soon", th:"ควรตรวจเร็ว ๆ นี้", en:"Check soon"},
  watch:{c:"watch",th:"เฝ้าดูอาการไว้",   en:"Keep an ear on it"},
  fine: {c:"fine", th:"ฟังแล้วปกติ",      en:"Sounds normal"}
};
let lTake="idle",lRec=null,lChunks=[],lBlob=null,lUrl="",lBusy=false,lRes=null,lErr="",lSec=0,lTimer=null;
let lChat=[],lAsk=false,lArmed=false;

function listenBody(){
  const c=car();
  if(!c)return noCarCard();
  if(lBusy)return `<div class="lg-card"><div class="lg-scan"><div class="lg-spin"></div>
    <b>${T("กำลังฟังคลิปนี้…","Listening…")}</b>
    <small>${T("เทียบกับอาการที่พบบ่อยของรถรุ่นนี้","Comparing against common faults for this model")}</small></div></div>`;
  if(lRes)return listenResult();

  const tk=TAKES.find(x=>x.k===lTake)||TAKES[1];
  return `<div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("กำลังอัดอยู่ตอนนี้","Recording now")}</small>
        <b>${T("เปลี่ยนท่าได้ระหว่างอัด","Switch take while it records")}</b></div></div>
      <div class="lg-takes">${TAKES.map(x=>`<button class="lg-take${x.k===lTake?" on":""}" data-take="${x.k}">
        <i class="ti ${x.ic}"></i><span>${T(x.th,x.en)}</span></button>`).join("")}</div>
      <div class="lg-tip"><i class="ti ti-bulb"></i>${T(tk.tip[0],tk.tip[1])}</div>
    </div>

    <div class="lg-card" style="text-align:center">
      ${lUrl?`<audio class="lg-audio" src="${lUrl}" controls></audio>`
        :`<div class="lg-mic${lRec?" rec":""}"><i class="ti ti-microphone"></i></div>`}
      ${lRec?`<div class="lg-timer">${String(Math.floor(lSec/60)).padStart(2,"0")}:${String(lSec%60).padStart(2,"0")}
        <small>${T("อัดอยู่ อัดสัก 10-20 วินาทีก็พอ","Recording — 10-20 seconds is plenty")}</small></div>`
        :lUrl?`<div class="lg-timer"><small>${T("ฟังทวนก่อนส่งได้","Play it back before sending")}</small></div>`:""}
      <div class="lg-acts" style="justify-content:center">
        ${lRec?`<button class="btn danger" id="lgStop"><i class="ti ti-player-stop"></i>${T("หยุดอัด","Stop")}</button>`
          :`<button class="btn" id="lgRec"><i class="ti ti-microphone"></i>${
            lUrl?T("อัดใหม่","Record again"):T("เริ่มอัด","Start recording")}</button>`}
        ${lUrl&&!lRec?`<button class="btn primary" id="lgSend"><i class="ti ti-waveform"></i>${
          T("ให้ระบบฟัง","Analyse it")}</button>`:""}
        ${!lRec&&!lUrl?`<button class="btn" id="lgUpBtn"><i class="ti ti-upload"></i>${
          T("ใช้ไฟล์เสียงที่มีอยู่","Use a file")}</button>`:""}
      </div>
      <input type="file" id="lgAud" accept="audio/*" hidden>
      ${lErr?`<div class="lg-err"><i class="ti ti-alert-triangle"></i>${esc(lErr)}</div>`:""}
      <p class="lg-note">${T(
        "เสียงถูกส่งไปวิเคราะห์ครั้งเดียว ไม่ได้เก็บไว้บนเซิร์ฟเวอร์ · อย่าอัดขณะขับรถเอง",
        "The clip is analysed once and not stored on the server · never record while you're the one driving")}</p>
    </div>`;
}
function listenResult(){
  const r=lRes, u=URG[r.urgency]||URG.watch;
  const tk=TAKES.find(x=>x.k===r.take);
  return `<div class="lg-card">
      <div class="lg-head"><div class="tx">
        <small>${tk?T(tk.th,tk.en):T("คลิปที่อัด","Your clip")}</small>
        <b>${T(u.th,u.en)}</b></div>
        <button class="btn" id="lgLAgain"><i class="ti ti-refresh"></i>${T("อัดใหม่","Record again")}</button></div>
      <div class="lg-urg ${u.c}"><i class="ti ${r.normal?"ti-check":"ti-alert-triangle"}"></i>
        <span>${esc(r.heard)}</span></div>
      ${r.quality==="noisy"?`<div class="lg-tip"><i class="ti ti-volume-3"></i>${T(
        "คลิปมีเสียงรบกวนพอควร ถ้าอัดใหม่ในที่เงียบกว่านี้ผลจะแม่นขึ้น",
        "There's a fair bit of background noise — a quieter take would read better")}</div>`:""}
    </div>
    ${r.causes.length?`<div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("น่าจะมาจาก","Likely cause")}</small>
        <b>${T("สาเหตุที่เป็นไปได้","What it could be")}</b></div></div>
      ${r.causes.map(x=>`<div class="lg-cause">
        <div class="hd"><b>${esc(x.what)}</b>${x.chance!=null?`<em>${x.chance}%</em>`:""}</div>
        ${x.chance!=null?`<div class="bar"><i style="width:${x.chance}%"></i></div>`:""}
        ${x.why?`<div class="rs">${esc(x.why)}</div>`:""}
        ${x.check?`<div class="ck"><i class="ti ti-search"></i>${esc(x.check)}</div>`:""}
      </div>`).join("")}</div>`:""}
    ${r.doNow.length?`<div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("ทำต่อ","Next")}</small>
        <b>${T("ควรทำอะไรต่อ","What to do")}</b></div></div>
      ${r.doNow.map((x,i)=>`<div class="lg-ask"><i class="ti ti-circle-number-${Math.min(i+1,9)}"></i>${esc(x)}</div>`).join("")}
    </div>`:""}
    ${r.tellShop?`<div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("ยื่นให้ช่าง","Hand to the mechanic")}</small>
        <b>${T("บอกช่างแบบนี้","Say this to the shop")}</b></div>
        <button class="btn" id="lgCopy"><i class="ti ti-copy"></i>${T("คัดลอก","Copy")}</button></div>
      <div class="lg-sum">${esc(r.tellShop)}</div>
    </div>`:""}

    <div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("ถามต่อได้","Keep asking")}</small>
        <b>${T("คุยกับ AI เรื่องเสียงนี้","Talk it through")}</b></div></div>
      <div class="lg-chat" id="lgChat">${lChat.length?lChat.map(m=>
        `<div class="lg-msg ${m.role}">${esc(m.text)}</div>`).join("")
        :`<div class="lg-seeds">${[
          T("ขับต่อได้ไหม อันตรายหรือเปล่า","Is it safe to keep driving?"),
          T("ซ่อมน่าจะราคาประมาณเท่าไร","Roughly what will this cost to fix?"),
          T("ถ้าปล่อยไว้จะเป็นยังไง","What happens if I leave it?"),
          T("เปลี่ยนเองได้ไหม","Can I fix it myself?")
        ].map(q=>`<button class="lg-seed" data-lseed="${esc(q)}">${esc(q)}</button>`).join("")}</div>`}
        ${lAsk?`<div class="lg-msg ai typing"><span></span><span></span><span></span></div>`:""}
      </div>
      <div class="lg-ask">
        <input type="text" id="lgQ" placeholder="${T("ถามต่อเรื่องเสียงนี้…","Ask about this noise…")}">
        <button class="btn primary" id="lgQSend"><i class="ti ti-send"></i></button>
      </div>
      <p class="lg-note" style="margin-top:9px">${T(
        "AI จำผลวิเคราะห์เสียงกับข้อมูลรถของคุณไว้แล้ว ถามต่อได้เลยไม่ต้องเล่าซ้ำ",
        "The AI already has the analysis and your car's details — just ask")}</p>
    </div>`;
}

async function startRec(){
  lErr="";
  if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&window.MediaRecorder)){
    lErr=T("เบราว์เซอร์นี้อัดเสียงไม่ได้ ใช้ปุ่มเลือกไฟล์เสียงแทนได้",
           "This browser can't record — use the file button instead");
    renderTool(); return;
  }
  try{
    const st=await navigator.mediaDevices.getUserMedia({audio:true});
    lChunks=[]; lSec=0;
    /* ไม่ระบุ mimeType ปล่อยให้เบราว์เซอร์เลือกที่รองรับเอง
       Safari กับ Chrome คนละฟอร์แมตกัน ถ้าฟิกซ์ไว้จะพังบนเครื่องหนึ่ง */
    lRec=new MediaRecorder(st);
    lRec.ondataavailable=e=>{ if(e.data&&e.data.size)lChunks.push(e.data) };
    lRec.onstop=()=>{
      st.getTracks().forEach(t=>t.stop());
      const type=(lChunks[0]&&lChunks[0].type)||lRec.mimeType||"audio/webm";
      lBlob=new Blob(lChunks,{type});
      if(lUrl)URL.revokeObjectURL(lUrl);
      lUrl=URL.createObjectURL(lBlob);
      lRec=null; clearInterval(lTimer); lTimer=null; renderTool();
    };
    lRec.start();
    lTimer=setInterval(()=>{ lSec++;
      /* กันคลิปยาวเกินจนไฟล์ใหญ่เกินขีดของคำขอ */
      if(lSec>=45&&lRec){ try{lRec.stop()}catch(e){} return }
      renderTool();
    },1000);
    renderTool();
  }catch(e){
    lErr=T("เปิดไมโครโฟนไม่ได้ ต้องอนุญาตให้เว็บใช้ไมค์ก่อน",
           "Couldn't open the microphone — allow mic access first");
    renderTool();
  }
}
function blobB64(b){
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onerror=()=>rej(new Error("read failed"));
    fr.onload=()=>res(String(fr.result));
    fr.readAsDataURL(b);
  });
}
async function runListen(){
  const c=car(); if(!c||!lBlob)return;
  lBusy=true; lErr=""; renderTool();
  try{
    const d64=await blobB64(lBlob);
    const d=await api("/api/listen",{audio:d64,mime:lBlob.type||"audio/webm",
      take:lTake,car:carParts(c),lang:window.lang||"th"});
    lRes=d;
  }catch(e){ lErr=String(e&&e.message||e).slice(0,240) }
  lBusy=false; renderTool();
}
/* ถามต่อเรื่องเสียงที่เพิ่งวิเคราะห์ไป — ส่งบริบทไปให้ครั้งเดียวในเทิร์นแรก
   เจ้าของจึงไม่ต้องเล่าอาการซ้ำ ซึ่งเป็นจุดที่แชทบอตทั่วไปทำให้เสียเวลาที่สุด */
async function askListen(q){
  q=String(q||"").trim(); if(!q||lAsk)return;
  const c=car(); if(!c||!lRes)return;
  const qi=$("lgQ"); if(qi)qi.value="";
  lChat.push({role:"me",text:q}); lAsk=true; renderTool();

  const cp=carParts(c);
  const brief=[
    `รถ: ${[cp.year,cp.make,cp.model].filter(Boolean).join(" ")}${cp.mileage?` เลขไมล์ ${cp.mileage} กม.`:""}`,
    `อัดเสียง: ${(TAKES.find(x=>x.k===lRes.take)||{}).th||"ระหว่างใช้งาน"}`,
    `สิ่งที่ได้ยิน: ${lRes.heard}`,
    lRes.causes.length?`สาเหตุที่ประเมินไว้: ${lRes.causes.map(x=>
      `${x.what} (${x.chance}%)`).join(", ")}`:""
  ].filter(Boolean).join("\n");

  const contents=[{role:"user",parts:[{text:
    `นี่คือผลวิเคราะห์เสียงรถของฉันที่ระบบทำไว้แล้ว ใช้เป็นบริบทในการตอบ\n\n${brief}\n\n`+
    `ตอบสั้น ตรงประเด็น เป็นภาษา${EN()?"อังกฤษ":"ไทย"} ไม่ต้องทวนบริบท\n\nคำถาม: ${q}`}]}];
  lChat.slice(0,-1).forEach(m=>{ /* เทิร์นก่อนหน้าใส่ต่อท้ายให้บทสนทนาต่อเนื่อง */ });
  const hist=lChat.slice(0,-1).map(m=>({role:m.role==="me"?"user":"model",parts:[{text:m.text}]}));
  const payload=[contents[0],...hist.slice(-6)];
  if(hist.length)payload.push({role:"user",parts:[{text:q}]});

  try{
    const d=await api("/api/ai/chat",{contents:payload,
      make:cp.make,model:cp.model,year:cp.year,mileage:cp.mileage});
    const txt=(d&&(d.text||d.reply||d.message))||
      (d&&d.candidates&&d.candidates[0]&&d.candidates[0].content&&
       (d.candidates[0].content.parts||[]).map(x=>x.text||"").join(""))||"";
    lChat.push({role:"ai",text:txt||T("ตอบไม่ได้ ลองถามใหม่","No answer — try again")});
  }catch(e){
    lChat.push({role:"ai",text:String(e&&e.message||e).slice(0,240)});
  }
  lAsk=false; renderTool();
  const box=$("lgChat"); if(box)box.scrollTop=box.scrollHeight;
}

function wireListen(){
  const t=D.getElementById("lgTakeWrap");
  D.querySelectorAll("[data-take]").forEach(b=>b.onclick=()=>{lTake=b.dataset.take;renderTool()});
  const rec=$("lgRec"); if(rec)rec.onclick=startRec;
  const st=$("lgStop"); if(st)st.onclick=()=>{ try{lRec&&lRec.stop()}catch(e){} };
  const sd=$("lgSend"); if(sd)sd.onclick=runListen;
  const ub=$("lgUpBtn"),ua=$("lgAud");
  if(ub&&ua)ub.onclick=()=>ua.click();
  if(ua)ua.onchange=e=>{
    const f=e.target.files&&e.target.files[0]; if(!f)return;
    if(f.size>5e6){ lErr=T("ไฟล์ใหญ่เกินไป ใช้คลิปสั้นกว่านี้","File too large — use a shorter clip");
      e.target.value=""; renderTool(); return }
    lBlob=f; if(lUrl)URL.revokeObjectURL(lUrl); lUrl=URL.createObjectURL(f);
    e.target.value=""; renderTool();
  };
  const ag=$("lgLAgain"); if(ag)ag.onclick=()=>{
    lRes=null; lBlob=null; if(lUrl)URL.revokeObjectURL(lUrl); lUrl=""; lErr="";
    lChat=[]; lArmed=false; renderTool() };
  D.querySelectorAll("[data-lseed]").forEach(b=>b.onclick=()=>askListen(b.dataset.lseed));
  const qs=$("lgQSend"),qi=$("lgQ");
  if(qs&&qi)qs.onclick=()=>askListen(qi.value);
  if(qi)qi.onkeydown=e=>{ if(e.key==="Enter")askListen(qi.value) };
  const cp=$("lgCopy"); if(cp)cp.onclick=()=>{
    try{ navigator.clipboard.writeText(lRes.tellShop);
      cp.innerHTML='<i class="ti ti-check"></i>'+T("คัดลอกแล้ว","Copied");
      setTimeout(()=>{try{cp.innerHTML='<i class="ti ti-copy"></i>'+T("คัดลอก","Copy")}catch(e){}},1600);
    }catch(e){}
  };
}

/* ══════════ ส่วนที่ 4 — โหมดก่อนเดินทางไกล ══════════ */

let tDest="",tKm="",tBusy=false,tRes=null,tErr="";

function tripBody(){
  const c=car(); if(!c)return noCarCard();
  return `<div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("ก่อนออกเดินทาง","Before you set off")}</small>
        <b>${T("จะไปไหน ไกลแค่ไหน","Where to, and how far")}</b></div></div>
      <label class="lg-f"><span><i class="ti ti-map-pin"></i>${T("ปลายทาง","Destination")}</span>
        <input type="text" id="tDest" placeholder="${T("เช่น เชียงใหม่","e.g. Chiang Mai")}" value="${esc(tDest)}"></label>
      <label class="lg-f"><span><i class="ti ti-route"></i>${T("ระยะทางไป-กลับ (กม.)","Round trip (km)")}</span>
        <input type="number" id="tKm" inputmode="numeric" placeholder="${T("เช่น 1400","e.g. 1400")}" value="${esc(tKm)}"></label>
      <div class="lg-acts"><button class="btn primary" id="tGo"><i class="ti ti-checklist"></i>
        ${T("เช็กความพร้อม","Run the checks")}</button></div>
      ${tErr?`<div class="lg-err"><i class="ti ti-alert-triangle"></i>${esc(tErr)}</div>`:""}
      <p class="lg-note">${T(
        "อากาศดึงจาก Open-Meteo ตามชื่อเมืองที่พิมพ์ · รายการที่จะถึงกำหนดคำนวณจากระยะที่ระบบติดตามไว้",
        "Weather comes from Open-Meteo for the place you type · due items are worked out from the mileage we track")}</p>
    </div>
    ${tBusy?`<div class="lg-card"><div class="lg-scan"><div class="lg-spin"></div>
      <b>${T("กำลังเช็ก…","Checking…")}</b></div></div>`:""}
    ${tRes?tripResult():""}`;
}
const WCODE=c=>{
  if(c===0||c===1)return ["ti-sun","แดดจัด","Clear"];
  if(c===2||c===3)return ["ti-cloud","มีเมฆ","Cloudy"];
  if(c===45||c===48)return ["ti-mist","หมอก","Fog"];
  if(c>=95)return ["ti-bolt","พายุฝนฟ้าคะนอง","Thunderstorms"];
  if(c>=51)return ["ti-cloud-rain","ฝน","Rain"];
  return ["ti-cloud","—","—"];
};
function tripResult(){
  const r=tRes;
  const wet=r.days.some(d=>d.code>=51);
  return `<div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${esc(r.place)}</small>
        <b>${T("อากาศปลายทาง 5 วัน","5-day forecast there")}</b></div></div>
      <div class="lg-days">${r.days.map(d=>{const w=WCODE(d.code);
        return `<div class="lg-day"><small>${new Date(d.day).toLocaleDateString(
          EN()?"en-GB":"th-TH",{weekday:"short"})}</small>
          <i class="ti ${w[0]}"></i><b>${Math.round(d.hi)}°</b><em>${Math.round(d.lo)}°</em></div>`}).join("")}</div>
      ${wet?`<div class="lg-tip"><i class="ti ti-umbrella"></i>${T(
        "มีฝนในช่วงที่ไป — ตรวจใบปัดน้ำฝนและดอกยางให้ดีก่อนออก ระยะเบรกบนถนนเปียกยาวขึ้นมาก",
        "Rain is forecast — check wipers and tread depth; wet braking distances are far longer")}</div>`:""}
    </div>

    <div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("ระหว่างทาง","Mid-trip")}</small>
        <b>${r.willDue.length?T(`${r.willDue.length} รายการจะถึงกำหนดระหว่างทริปนี้`,
              `${r.willDue.length} item(s) fall due during this trip`)
            :T("ไม่มีอะไรถึงกำหนดระหว่างทาง","Nothing falls due on the way")}</b></div></div>
      ${r.willDue.length?r.willDue.map(x=>`<div class="lg-reg ${x.left<=0?"over":"warn"}">
          <span class="ic"><i class="ti ti-tool"></i></span>
          <span class="tx"><b>${esc(x.name)}</b><small>${x.left<0
            ? T(`เลยกำหนดมาแล้ว ${num(-x.left)} กม.`,`${num(-x.left)} km overdue`)
            : x.left===0?T("ถึงกำหนดพอดีแล้ว","due right now")
            : T(`อีก ${num(x.left)} กม. จะถึงกำหนด`,`due in ${num(x.left)} km`)}</small></span>
          <span class="lft">${x.left<=0?T("ทำก่อนไป","Do it first"):T("จะถึงระหว่างทาง","Falls due")}</span>
        </div>`).join("")
        :`<div class="lg-empty" style="padding:20px"><i class="ti ti-circle-check"></i>
          ${T("รอบบำรุงรักษาผ่านหมดแล้วสำหรับระยะนี้","Your service intervals clear this distance")}</div>`}
      ${r.fuel?`<div class="lg-keep"><span><i class="ti ti-gas-station"></i>
        ${T("ค่าน้ำมันโดยประมาณทั้งทริป","Estimated fuel for the trip")}
        <b>฿${num(r.fuel)}</b></span></div>`:""}
    </div>

    <div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("เช็กลิสต์","Checklist")}</small>
        <b>${T("ก่อนออกจากบ้าน","Before you leave")}</b></div></div>
      ${r.checks.map((x,i)=>`<label class="lg-pick"><input type="checkbox" data-tchk="${i}">
        <span>${esc(x)}</span></label>`).join("")}
    </div>`;
}
/* ระยะคงเหลือของแต่ละรายการ เอามาจากตารางบำรุงรักษาของ carlab โดยตรง */
function dueWithin(c,km){
  try{
    const h=window.SpireCarLab&&window.SpireCarLab.health(c);
    if(!h||!h.items)return [];
    return h.items.filter(x=>x.d.left<=km).sort((a,b)=>a.d.left-b.d.left)
      .slice(0,6).map(x=>({name:EN()?x.p.en:x.p.th,left:x.d.left}));
  }catch(e){ return [] }
}
async function runTrip(){
  const c=car(); if(!c)return;
  tDest=($("tDest")&&$("tDest").value||"").trim();
  tKm=($("tKm")&&$("tKm").value||"").trim();
  if(!tDest){ tErr=T("ใส่ปลายทางก่อน","Enter a destination"); renderTool(); return }
  const km=parseInt(tKm)||0;
  tBusy=true; tErr=""; tRes=null; renderTool();
  try{
    const gu=`https://geocoding-api.open-meteo.com/v1/search?name=${
      encodeURIComponent(tDest)}&count=1&language=${EN()?"en":"th"}`;
    const gr=await fetch(gu); if(!gr.ok)throw new Error("geo");
    const gj=await gr.json();
    const hit=gj.results&&gj.results[0];
    if(!hit)throw new Error("notfound");
    const wu=`https://api.open-meteo.com/v1/forecast?latitude=${hit.latitude}&longitude=${
      hit.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`;
    const wr=await fetch(wu); if(!wr.ok)throw new Error("wx");
    const wj=await wr.json();
    const days=wj.daily.time.map((day,i)=>({day,code:wj.daily.weather_code[i],
      hi:wj.daily.temperature_2m_max[i],lo:wj.daily.temperature_2m_min[i]}));

    /* ค่าน้ำมันประมาณจากอัตราสิ้นเปลืองที่ระบบรู้ ราคาน้ำมันเป็นค่ากลางที่แก้ได้ภายหลัง */
    let fuel=0;
    try{
      const l100=window.SpireCarLab?window.SpireCarLab.economy(c):7.5;
      if(km&&l100)fuel=Math.round(km/100*l100*36);
    }catch(e){}

    const wet=days.some(d=>d.code>=51);
    const checks=[
      T("เติมลมยางให้ครบทั้งสี่เส้นรวมยางอะไหล่","Check tyre pressures on all four plus the spare"),
      T("ดูระดับน้ำมันเครื่องและน้ำหล่อเย็น","Check engine oil and coolant levels"),
      T("ลองไฟหน้า ไฟท้าย ไฟเลี้ยว และไฟเบรก","Test headlights, tail lights, indicators and brake lights"),
      T("เติมน้ำฉีดกระจก","Top up the washer fluid")];
    if(wet)checks.push(T("ตรวจใบปัดน้ำฝนและความลึกดอกยาง","Check wiper blades and tread depth"));
    if(km>=500)checks.push(T("วางแผนจุดพักทุก 2 ชั่วโมง","Plan a rest stop every two hours"));
    checks.push(T("เช็กว่ามีแม่แรง ยางอะไหล่ และสามเหลี่ยมครบ","Confirm the jack, spare and warning triangle are aboard"));

    tRes={place:[hit.name,hit.admin1,hit.country].filter(Boolean).join(", "),
      days,willDue:km?dueWithin(c,km):[],fuel,km,checks};
  }catch(e){
    const m=String(e&&e.message||e);
    tErr=m==="notfound"?T("หาปลายทางนี้ไม่เจอ ลองพิมพ์ชื่อเมืองหลักแทน",
        "Couldn't find that place — try a major town name")
      :T("ดึงข้อมูลอากาศไม่สำเร็จ ลองใหม่อีกครั้ง","Couldn't fetch the forecast — try again");
  }
  tBusy=false; renderTool();
}
function wireTrip(){
  const g=$("tGo"); if(g)g.onclick=runTrip;
  const d=$("tDest"); if(d)d.onkeydown=e=>{ if(e.key==="Enter")runTrip() };
}

/* ══════════ ส่วนที่ 5 — ต้นทุนต่อกิโลเมตร และสมุดรถตอนขาย ══════════ */

function ownData(c){
  const l=LG("carlab_log_"+c.id,{services:[],fuel:[],trips:[]});
  const svc=l.services||[], fuel=l.fuel||[];
  const sSvc=svc.reduce((a,x)=>a+(Number(x.amount)||0),0);
  const sFuel=fuel.reduce((a,x)=>a+(Number(x.amount)||0),0);
  /* ช่วงระยะที่มีข้อมูลจริง ใช้เลขไมล์จากทั้งบันทึกเติมน้ำมันและงานซ่อม
     เพราะบางคนจดแค่อย่างใดอย่างหนึ่ง */
  const kms=[...fuel,...svc].map(x=>parseInt(x.km)||0).filter(Boolean).sort((a,b)=>a-b);
  const span=kms.length>1?kms[kms.length-1]-kms[0]:0;
  const dates=[...fuel,...svc].map(x=>new Date(x.date||0)).filter(d=>!isNaN(d)&&d.getFullYear()>2000)
    .sort((a,b)=>a-b);
  const months=dates.length>1?Math.max(1,(dates[dates.length-1]-dates[0])/(30*DAY)):0;
  const total=sSvc+sFuel;
  return {svc,fuel,sSvc,sFuel,total,span,months,
    perKm:span>0?total/span:0,
    perMonth:months>0?total/months:0,
    entries:[...svc.map(x=>({...x,type:"svc"})),...fuel.map(x=>({...x,type:"fuel"}))]
      .sort((a,b)=>new Date(b.date)-new Date(a.date))};
}
function ownBody(){
  const c=car(); if(!c)return noCarCard();
  const o=ownData(c), thin=(o.span<500||o.entries.length<3);
  const reg=renewals(c);
  const bars=[
    {t:T("ค่าน้ำมัน","Fuel"),v:o.sFuel,c:"#C2410C"},
    {t:T("ค่าซ่อมบำรุง","Servicing"),v:o.sSvc,c:"#2F6FB8"}
  ].filter(x=>x.v>0);
  const mx=Math.max(1,...bars.map(x=>x.v));

  return `<div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("ต้นทุนจริง","Real cost")}</small>
        <b>${o.perKm>0?`฿${o.perKm.toFixed(2)} ${T("ต่อกิโลเมตร","per km")}`
          :T("ยังคำนวณไม่ได้","Not enough data yet")}</b></div></div>
      ${thin?`<div class="lg-tip"><i class="ti ti-info-circle"></i>${T(
        "ตัวเลขจะแม่นขึ้นเรื่อย ๆ เมื่อบันทึกการเติมน้ำมันและค่าซ่อมมากขึ้น ตอนนี้ยังมีข้อมูลน้อย",
        "These figures sharpen as you log more fill-ups and repairs — there's little data so far")}</div>`:""}
      <div class="lg-stats">
        <div><b>฿${num(o.perMonth)}</b><small>${T("เฉลี่ยต่อเดือน","per month")}</small></div>
        <div><b>฿${num(o.perMonth*12)}</b><small>${T("ประมาณต่อปี","per year")}</small></div>
        <div><b>${num(o.span)}</b><small>${T("กม. ที่มีข้อมูล","km covered")}</small></div>
        <div><b>${o.entries.length}</b><small>${T("รายการที่บันทึก","entries logged")}</small></div>
      </div>
      ${bars.length?`<div class="lg-split">${bars.map(x=>`<div class="row">
        <span class="t">${x.t}</span>
        <span class="b"><i style="width:${Math.round(x.v/mx*100)}%;background:${x.c}"></i></span>
        <span class="v">฿${num(x.v)}</span></div>`).join("")}</div>`:""}
      ${o.perKm>0?`<div class="lg-tip"><i class="ti ti-scale"></i>${T(
        `ขับ 1,000 กม. คันนี้กินเงินราว ฿${num(o.perKm*1000)} — เอาไว้เทียบตอนคิดว่าจะซ่อมต่อหรือเปลี่ยนคัน`,
        `Every 1,000 km costs about ฿${num(o.perKm*1000)} — useful when weighing repair against replacement`)}</div>`:""}
    </div>

    <div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("ตอนขายต่อ","At resale")}</small>
        <b>${T("สมุดประวัติรถ","Ownership record")}</b></div>
        <button class="btn primary" id="ownExp"><i class="ti ti-file-download"></i>${
          T("ส่งออกเอกสาร","Export")}</button></div>
      <p class="lg-sub">${T(
        "รถที่มีประวัติดูแลครบขายต่อได้ราคาดีกว่ารถที่เจ้าของบอกได้แค่ปากเปล่า เอกสารนี้รวมทุกอย่างไว้ในแผ่นเดียว เปิดแล้วสั่งพิมพ์หรือบันทึกเป็น PDF ได้",
        "A car with a complete record sells for more than one whose owner can only say it was looked after. This gathers everything into one page you can print or save as PDF")}</p>
      <div class="lg-stats">
        <div><b>${o.svc.length}</b><small>${T("งานซ่อมบำรุง","service records")}</small></div>
        <div><b>${o.fuel.length}</b><small>${T("ครั้งที่เติมน้ำมัน","fill-ups")}</small></div>
        <div><b>${reg.length}</b><small>${T("รายการต่ออายุ","renewals tracked")}</small></div>
      </div>
    </div>`;
}
/* เอกสารเปิดในแท็บใหม่ ให้ผู้ใช้สั่งพิมพ์หรือบันทึกเป็น PDF เองด้วยเบราว์เซอร์
   ไม่ต้องพึ่งไลบรารีสร้าง PDF ที่จะทำให้ไฟล์เดียวจบบวมขึ้นมาก */
function exportRecord(){
  const c=car(); if(!c)return;
  const o=ownData(c), reg=renewals(c);
  let km=0; try{ km=window.SpireODO?window.SpireODO.value(c):0 }catch(e){}
  const PARTS={oil:"เปลี่ยนน้ำมันเครื่อง",airf:"ไส้กรองอากาศ",cabin:"กรองแอร์",plug:"หัวเทียน",
    brakepad:"ผ้าเบรก",brakeoil:"น้ำมันเบรก",tire:"ยาง",align:"ตั้งศูนย์ถ่วงล้อ",batt:"แบตเตอรี่",
    coolant:"น้ำหล่อเย็น",gearoil:"น้ำมันเกียร์",belt:"สายพาน",shock:"โช้คอัพ"};
  const row=x=>`<tr><td>${esc(x.date||"—")}</td>
    <td>${esc(x.type==="fuel"?"เติมน้ำมัน":(PARTS[x.k]||x.k||"งานซ่อม"))}</td>
    <td class="r">${x.km?num(x.km):"—"}</td><td class="r">${x.amount?"฿"+num(x.amount):"—"}</td></tr>`;
  const html=`<!doctype html><html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>สมุดประวัติรถ — ${esc(c.name)}</title>
<style>
*{box-sizing:border-box}
body{font-family:"Sarabun","Segoe UI",sans-serif;max-width:820px;margin:0 auto;padding:38px 26px;
  color:#20242B;line-height:1.7}
h1{font-size:27px;margin:0 0 3px;color:#1F4E79}
.sub{color:#5A6472;font-size:14px;margin-bottom:22px}
h2{font-size:16px;color:#2F6FB8;margin:26px 0 9px;padding-bottom:5px;border-bottom:2px solid #D6DCE5}
table{width:100%;border-collapse:collapse;font-size:13.5px}
th{background:#1F4E79;color:#fff;text-align:left;padding:8px 10px;font-weight:600}
td{padding:7px 10px;border-bottom:1px solid #E6EAF0}
td.r,th.r{text-align:right}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:11px;margin:12px 0}
.box{border:1px solid #D6DCE5;border-radius:9px;padding:11px 13px}
.box b{display:block;font-size:19px;color:#1F4E79}
.box small{color:#5A6472;font-size:12px}
.foot{margin-top:30px;padding-top:12px;border-top:1px solid #D6DCE5;color:#7A8496;font-size:11.5px}
@media print{body{padding:0}h2{break-after:avoid}tr{break-inside:avoid}}
</style></head><body>
<h1>สมุดประวัติรถ</h1>
<div class="sub">${esc(c.name)}${c.year?" · ปี "+esc(c.year):""} · ออกเอกสารวันที่ ${
  new Date().toLocaleDateString("th-TH",{day:"numeric",month:"long",year:"numeric"})}</div>

<h2>ภาพรวม</h2>
<div class="grid">
  <div class="box"><b>${num(km)}</b><small>เลขไมล์ล่าสุด (กม.)</small></div>
  <div class="box"><b>${o.svc.length}</b><small>งานซ่อมบำรุงที่บันทึก</small></div>
  <div class="box"><b>฿${num(o.total)}</b><small>ค่าใช้จ่ายรวมที่บันทึก</small></div>
  <div class="box"><b>${o.perKm>0?"฿"+o.perKm.toFixed(2):"—"}</b><small>ต้นทุนต่อกิโลเมตร</small></div>
</div>

<h2>ประวัติการบำรุงรักษา</h2>
${o.svc.length?`<table><tr><th>วันที่</th><th>รายการ</th><th class="r">เลขไมล์</th><th class="r">ค่าใช้จ่าย</th></tr>
${o.svc.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).map(x=>row({...x,type:"svc"})).join("")}</table>`
  :"<p>ยังไม่มีบันทึกการบำรุงรักษา</p>"}

<h2>สถานะการต่ออายุ</h2>
${reg.length?`<table><tr><th>รายการ</th><th>ครบกำหนดถัดไป</th><th class="r">คงเหลือ</th></tr>
${reg.map(x=>`<tr><td>${esc(x.th)}</td><td>${new Date(x.due).toLocaleDateString("th-TH",
  {day:"numeric",month:"long",year:"numeric"})}</td><td class="r">${
  x.left<0?"เลยกำหนด "+Math.abs(x.left)+" วัน":x.left+" วัน"}</td></tr>`).join("")}</table>`
  :"<p>ยังไม่ได้บันทึกวันต่อภาษีและประกัน</p>"}

${o.fuel.length?`<h2>บันทึกการเติมน้ำมัน (${o.fuel.length} ครั้ง)</h2>
<table><tr><th>วันที่</th><th>รายการ</th><th class="r">เลขไมล์</th><th class="r">จำนวนเงิน</th></tr>
${o.fuel.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,40)
  .map(x=>row({...x,type:"fuel"})).join("")}</table>`:""}

<div class="foot">เอกสารนี้สร้างจากบันทึกที่เจ้าของรถกรอกไว้ในระบบ SpireONE
เลขไมล์บางรายการเป็นค่าประเมินจากรูปแบบการใช้งาน ผู้ซื้อควรตรวจสอบสภาพรถจริงประกอบเสมอ</div>
<script>try{setTimeout(function(){window.print()},700)}catch(e){}<\/script>
</body></html>`;
  const w=window.open("","_blank");
  if(!w){ alert(T("เบราว์เซอร์บล็อกหน้าต่างใหม่ อนุญาต pop-up ให้เว็บนี้ก่อน",
    "Your browser blocked the new window — allow pop-ups for this site")); return }
  w.document.write(html); w.document.close();
}
function wireOwn(){
  const e=$("ownExp"); if(e)e.onclick=exportRecord;
}

function noCarCard(){
  return `<div class="lg-card"><div class="lg-empty"><i class="ti ti-car"></i>
    ${T("เพิ่มรถในการาจก่อน","Add a car first")}
    <div style="margin-top:12px"><button class="btn primary" data-view="garage">${
      T("ไปที่การาจ","Open garage")}</button></div></div></div>`;
}

/* ══════════════════════════════════════════════════════════════════
   SHAKE — วัดการสั่นของรถด้วยเซ็นเซอร์ในมือถือ

   นี่คือสิ่งที่แชทบอตทั่วไปทำไม่ได้ เพราะมันวัดอะไรไม่ได้เลย
   หลักการเป็นวิธีที่ช่างใช้จริง: ถ้าการสั่นมีความถี่ล็อกกับรอบหมุนของล้อ
   แปลว่าต้นเหตุหมุนไปพร้อมล้อ และ "กี่เท่าของรอบล้อ" บอกได้ว่าคืออะไร
     1 เท่า  → ถ่วงล้อไม่ได้สมดุล ล้อคด ยางบวม
     2 เท่า  → ยางไม่กลม หน้ายางสึกเป็นคลื่น
   ถ้าความถี่ไม่ล็อกกับล้อเลย แปลว่ามาจากเครื่องยนต์หรือเพลา ไม่ใช่ล้อ

   ความเร็วอ่านจาก GPS เส้นรอบวงคำนวณจากรหัสยาง แล้วได้รอบหมุนของล้อ
   ══════════════════════════════════════════════════════════════════ */
/* ── คณิตศาสตร์ของการวิเคราะห์การสั่น ──

/* FFT แบบ radix-2 in-place (Cooley-Tukey) — ความยาวต้องเป็นกำลังของสอง */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

/* สเปกตรัมกำลังของสัญญาณจริง — ตัดค่าเฉลี่ยทิ้งและใส่หน้าต่าง Hann
   ไม่งั้นแรงโน้มถ่วงกับการสั่นที่ไม่เป็นคาบจะกลบยอดที่เราสนใจ */
function spectrum(samples, hz) {
  let n = 1;
  while (n * 2 <= samples.length) n *= 2;
  if (n < 64) return null;
  const seg = samples.slice(samples.length - n);
  const mean = seg.reduce((a, b) => a + b, 0) / n;
  const re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1));
    re[i] = (seg[i] - mean) * w;
  }
  fft(re, im);
  const half = n / 2;
  const mag = new Float64Array(half);
  for (let i = 0; i < half; i++) mag[i] = Math.hypot(re[i], im[i]) / half;
  return { mag, df: hz / n, n };
}

/* ยอดคลื่นที่โดดจริง ๆ — ต้องสูงกว่าเพื่อนบ้านและสูงกว่าพื้นสัญญาณพอสมควร */
const MIN_AMP = 0.015;   // m/s² — ต่ำกว่านี้คนไม่รู้สึก ไม่ควรรายงานว่าเจออะไร

function peaks(spec, minHz, maxHz, count) {
  const { mag, df } = spec;
  const lo = Math.max(1, Math.floor(minHz / df));
  const hi = Math.min(mag.length - 2, Math.ceil(maxHz / df));
  if (hi <= lo) return [];
  /* ใช้มัธยฐานเป็นพื้นสัญญาณ ไม่ใช่ค่าเฉลี่ย เพราะยอดสูงไม่กี่ยอด
     จะดันค่าเฉลี่ยขึ้นจนยอดจริงกลายเป็นไม่โดด */
  const band = [];
  for (let i = lo; i <= hi; i++) band.push(mag[i]);
  band.sort((a, b) => a - b);
  const floor = band[Math.floor(band.length / 2)] || 1e-9;
  const out = [];
  for (let i = lo; i <= hi; i++) {
    if (mag[i] > mag[i - 1] && mag[i] >= mag[i + 1] &&
        mag[i] > floor * 4 && mag[i] > MIN_AMP) {
      // ประมาณยอดจริงด้วยพาราโบลาจากสามจุด ให้ความถี่ละเอียดกว่าช่องของ FFT
      const d = (mag[i - 1] - mag[i + 1]) / (2 * (mag[i - 1] - 2 * mag[i] + mag[i + 1]) || 1e-9);
      out.push({ hz: (i + d) * df, amp: mag[i], snr: mag[i] / (floor || 1e-9) });
    }
  }
  return out.sort((a, b) => b.amp - a.amp).slice(0, count || 5);
}

/* เส้นรอบวงยางจากรหัสข้างแก้ม เช่น 195/65 R15 → เมตร */
function tyreCircumference(code) {
  const m = String(code || '').match(/(\d{3})\s*\/\s*(\d{2})\s*R?\s*(\d{2})/i);
  if (!m) return null;
  const width = +m[1], aspect = +m[2], rim = +m[3];
  const dia = (2 * width * aspect / 100) + rim * 25.4;   // มิลลิเมตร
  return Math.PI * dia / 1000;
}

/* ความถี่การหมุนของล้อที่ความเร็วหนึ่ง — หัวใจของการวิเคราะห์ทั้งหมด
   ถ้าการสั่นล็อกกับความถี่นี้ แปลว่าต้นเหตุหมุนไปพร้อมล้อ */
function wheelHz(speedKmh, circumferenceM) {
  if (!speedKmh || !circumferenceM) return null;
  return (speedKmh / 3.6) / circumferenceM;
}

/* ยอมคลาดเคลื่อนได้ราว 6% ตามความคลาดของความเร็วจาก GPS กับยางที่สึกไม่เท่ากัน
   กว้างกว่านี้จะเริ่มจับการสั่นที่ไม่เกี่ยวกับล้อมาใส่หมวดโดยไม่มีเหตุผล */
const ORDERS = [
  { o: 0.5, tol: 0.06, k: 'driveline' },
  { o: 1,   tol: 0.06, k: 'balance' },
  { o: 2,   tol: 0.06, k: 'uniform' },
  { o: 3,   tol: 0.06, k: 'uniform' },
];

/* จัดกลุ่มยอดที่เจอว่าเป็นกี่เท่าของรอบล้อ — ค่าที่ช่างใช้เรียกว่า order */
function classify(peakList, wHz) {
  return peakList.map((p) => {
    if (!wHz) return { ...p, order: null, kind: null };
    const ord = p.hz / wHz;
    let best = null;
    ORDERS.forEach((c) => {
      const err = Math.abs(ord - c.o) / c.o;
      if (err <= c.tol && (!best || err < best.err)) best = { ...c, err };
    });
    return { ...p, order: +ord.toFixed(2), kind: best ? best.k : null };
  });
}

/* ค่าความแรงของการสั่นโดยรวม (RMS) — ใช้บอกว่า "แรงแค่ไหน" ไม่ใช่ "มาจากไหน" */
function rms(samples) {
  if (!samples.length) return 0;
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  return Math.sqrt(samples.reduce((a, b) => a + (b - mean) * (b - mean), 0) / samples.length);
}

function analyse({ samples, hz, speedKmh, tyre }) {
  const spec = spectrum(samples, hz);
  if (!spec) return { ok: false, why: 'short' };
  const circ = tyreCircumference(tyre);
  const wHz = wheelHz(speedKmh, circ);
  // เกิน Nyquist อ่านไม่ได้ และต่ำกว่า 1.5 Hz เป็นการโคลงของตัวรถ ไม่ใช่การสั่น
  const top = peaks(spec, 1.5, Math.min(hz / 2 - 1, 60), 5);
  return {
    ok: true, hz, wheelHz: wHz, circumference: circ,
    rms: rms(samples), peaks: classify(top, wHz), bins: spec.n,
  };
}


const SHAKE_MEAN={
  balance:["ถ่วงล้อไม่สมดุล ล้อคด หรือยางบวม","Wheel balance, a bent rim, or a bulged tyre"],
  uniform:["ยางไม่กลม หน้ายางสึกเป็นคลื่น หรือจานเบรกคด","Tyre out-of-round, cupped tread, or a warped disc"],
  driveline:["เพลาขับหรือยางแท่นเครื่อง","Driveshaft or engine mounts"]
};
const SHAKE_FIX={
  balance:["ถ่วงล้อใหม่ทั้งสี่เส้น ถ้ายังสั่นให้เช็กว่าล้อคดไหม",
           "Rebalance all four wheels; if it persists, check the rims for runout"],
  uniform:["ให้ร้านยางเช็กความกลมของยาง และสลับยางดูว่าอาการย้ายตำแหน่งไหม",
           "Have the tyres checked for roundness, and rotate them to see if the vibration moves"],
  driveline:["ให้ช่างยกรถเช็กเพลาขับกับยางแท่นเครื่อง",
             "Have the driveshaft and engine mounts inspected on a lift"]
};

let sk={stage:"idle",samples:[],speeds:[],t0:0,hz:0,res:null,err:"",tyre:"",
        speed:0,secs:0,timer:null,geo:null,onMotion:null};

function carTyre(){
  const c=car(); if(!c)return "";
  try{
    const cl=window.SpireCarLab;
    if(cl&&cl.bodyOf){
      const spec=LG("carlab_spec_"+c.id,null);
      if(spec&&spec.confirmed&&spec.confirmed.tire)return spec.confirmed.tire;
    }
  }catch(e){}
  return LG("tyre_"+c.id,"")||"";
}
function shakeBody(){
  const c=car(); if(!c)return noCarCard();
  if(sk.stage==="run")return shakeRun();
  if(sk.stage==="done")return shakeResult();

  const tyre=sk.tyre||carTyre();
  const ok=("DeviceMotionEvent" in window);
  return `<div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("วัดจากตัวรถจริง","Measured from the car")}</small>
        <b>${T("หาสาเหตุอาการสั่น","Find what's shaking")}</b></div></div>
      <p class="lg-sub">${T(
        "วางมือถือไว้ในรถแล้วขับ ระบบจะจับความถี่การสั่นเทียบกับรอบหมุนของล้อ แล้วบอกว่าน่าจะมาจากล้อ ยาง หรือเครื่องยนต์ — เป็นวิธีเดียวกับที่ช่างใช้ ต่างกันแค่ใช้เซ็นเซอร์ในมือถือแทนเครื่องมือ",
        "Put the phone in the car and drive. We lock the vibration frequency against your wheel's rotation and tell you whether it comes from the wheels, the tyres or the engine — the same method a workshop uses, with your phone's sensors instead of their kit")}</p>

      <div class="sk-safe"><i class="ti ti-alert-triangle"></i>
        <span><b>${T("ให้คนนั่งข้างเป็นคนกด หรือจอดตั้งค่าก่อนออกรถ","Have a passenger run it, or set it up before you drive")}</b>
        ${T("อย่ากดหรือดูจอขณะขับเอง วางมือถือให้แนบกับที่วางแก้วหรือช่องเก็บของ อย่าถือไว้ในมือ เพราะมือจะซับการสั่นจนวัดไม่ได้",
            "Never operate or watch the screen while driving. Rest the phone in a cup holder or tray — holding it damps the vibration and ruins the reading")}</span></div>

      <label class="lg-f"><span><i class="ti ti-circle-dotted"></i>${T("ขนาดยาง","Tyre size")}</span>
        <input type="text" id="skTyre" placeholder="195/65 R15" value="${esc(tyre)}"></label>
      <p class="lg-note" style="margin-top:2px">${T(
        "ดูที่แก้มยางได้เลย ต้องใส่ให้ตรง เพราะระบบใช้ค่านี้คำนวณรอบหมุนของล้อ",
        "It's printed on the tyre wall. It must be right — we compute wheel rotation from it")}</p>

      <div class="sk-how">${[
        [T("1. ขับให้ได้ความเร็วที่รถสั่น","1. Get to the speed where it shakes"),
         T("ปกติคือ 80–120 กม./ชม. บนถนนเรียบ","Usually 80–120 km/h on smooth tarmac")],
        [T("2. รักษาความเร็วให้นิ่ง","2. Hold that speed steady"),
         T("อย่าเร่ง อย่าเบรก อย่าเปลี่ยนเลน ระหว่างวัด","No accelerating, braking or lane changes while it records")],
        [T("3. ปล่อยให้วัด 20 วินาที","3. Let it record for 20 seconds"),
         T("ระบบจะบอกเองเมื่อเสร็จ","We'll tell you when it's done")]
      ].map(([a,b2])=>`<div class="sk-step"><b>${esc(a)}</b><small>${esc(b2)}</small></div>`).join("")}</div>

      ${!ok?`<div class="lg-err"><i class="ti ti-alert-triangle"></i>${T(
        "เครื่องนี้ไม่มีเซ็นเซอร์วัดความเร่ง หรือเบราว์เซอร์ไม่เปิดให้ใช้",
        "This device has no motion sensor, or the browser blocks it")}</div>`:""}
      ${sk.err?`<div class="lg-err"><i class="ti ti-alert-triangle"></i>${esc(sk.err)}</div>`:""}
      <div class="lg-acts"><button class="btn primary" id="skGo" ${ok?"":"disabled"}>
        <i class="ti ti-activity"></i>${T("เริ่มวัด","Start measuring")}</button></div>
    </div>`;
}
function shakeRun(){
  const need=20;
  const pct=Math.min(100,Math.round(sk.secs/need*100));
  const slow=sk.speed<40;
  return `<div class="lg-card">
    <div class="lg-head"><div class="tx"><small>${T("กำลังวัด","Recording")}</small>
      <b>${T(`เหลืออีก ${Math.max(0,need-sk.secs)} วินาที`,`${Math.max(0,need-sk.secs)}s to go`)}</b></div></div>
    <div class="sk-live">
      <div><b>${sk.speed?Math.round(sk.speed):"—"}</b><small>${T("กม./ชม. (GPS)","km/h (GPS)")}</small></div>
      <div><b>${sk.hz?Math.round(sk.hz):"—"}</b><small>${T("ตัวอย่าง/วินาที","samples/sec")}</small></div>
      <div><b>${sk.samples.length}</b><small>${T("ตัวอย่างที่เก็บได้","samples")}</small></div>
    </div>
    <div class="lg-prog" style="margin-top:12px"><i style="width:${pct}%"></i></div>
    ${slow?`<div class="lg-tip"><i class="ti ti-gauge"></i>${T(
      "ความเร็วยังต่ำ ต้องเกิน 40 กม./ชม. ขึ้นไปถึงจะแยกความถี่ของล้อออกจากการสั่นทั่วไปได้",
      "Too slow — above 40 km/h is needed to separate wheel frequencies from general shake")}</div>`
      :`<div class="lg-tip"><i class="ti ti-check"></i>${T(
      "ดีแล้ว รักษาความเร็วนี้ไว้จนกว่าจะครบ","Good — hold this speed until it finishes")}</div>`}
    <div class="lg-acts"><button class="btn" id="skStop">${T("หยุด","Stop")}</button></div>
  </div>`;
}
function shakeResult(){
  const r=sk.res;
  if(!r||!r.ok)return `<div class="lg-card">
    <div class="lg-empty"><i class="ti ti-alert-triangle"></i>
      ${esc(sk.err||T("ข้อมูลไม่พอ ลองวัดใหม่โดยขับให้เร็วขึ้นและนิ่งกว่านี้",
        "Not enough data — try again at a steadier, higher speed"))}</div>
    <div class="lg-acts"><button class="btn primary" id="skAgain">${T("วัดใหม่","Measure again")}</button></div>
  </div>`;

  const linked=r.peaks.filter(p=>p.kind);
  const top=r.peaks[0];
  const verdict=!r.peaks.length
    ? {c:"fine",t:T("ไม่พบการสั่นที่ผิดปกติ","No abnormal vibration found"),
       s:T("ที่ความเร็วนี้ระบบไม่เจอความถี่ที่โดดออกมา ถ้ารู้สึกว่าสั่นให้ลองวัดที่ความเร็วอื่น",
           "Nothing stood out at this speed. If you still feel it, try another speed")}
    : linked.length
      ? {c:"hit",t:T("การสั่นล็อกกับรอบหมุนของล้อ","The vibration tracks your wheel rotation"),
         s:T("แปลว่าต้นเหตุหมุนไปพร้อมล้อ ไม่ใช่เครื่องยนต์",
             "That means the source turns with the wheel, not the engine")}
      : {c:"other",t:T("สั่นจริง แต่ไม่ล็อกกับรอบล้อ","There's vibration, but not at a wheel order"),
         s:T("น่าจะมาจากเครื่องยนต์ เพลา หรือยางแท่นเครื่อง มากกว่าล้อและยาง",
             "More likely the engine, driveline or mounts than the wheels")};

  const rows=r.peaks.map(p=>`<div class="sk-peak${p.kind?" on":""}">
      <div class="hd"><b>${p.hz.toFixed(1)} Hz</b>
        ${p.order?`<em>${p.order}× ${T("รอบล้อ","wheel")}</em>`:""}</div>
      <div class="bar"><i style="width:${Math.min(100,Math.round(p.amp/r.peaks[0].amp*100))}%"></i></div>
      <div class="ms">${p.kind?esc(T(SHAKE_MEAN[p.kind][0],SHAKE_MEAN[p.kind][1]))
        :T("ไม่ตรงกับรอบล้อเท่าใด ๆ","Doesn't match a wheel order")}</div>
    </div>`).join("");

  const fixes=[...new Set(linked.map(p=>p.kind))];
  return `<div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("ผลการวัด","Result")}</small>
        <b>${esc(verdict.t)}</b></div>
        <button class="btn" id="skAgain"><i class="ti ti-refresh"></i>${T("วัดใหม่","Again")}</button></div>
      <div class="lg-urg ${verdict.c==="hit"?"soon":verdict.c==="other"?"watch":"fine"}">
        <i class="ti ${verdict.c==="fine"?"ti-check":"ti-activity"}"></i><span>${esc(verdict.s)}</span></div>
      <div class="lg-stats">
        <div><b>${Math.round(sk.avgSpeed||0)}</b><small>${T("กม./ชม. เฉลี่ย","km/h average")}</small></div>
        <div><b>${r.wheelHz?r.wheelHz.toFixed(1):"—"}</b><small>${T("รอบล้อ (Hz)","wheel Hz")}</small></div>
        <div><b>${r.rms.toFixed(2)}</b><small>${T("ความแรง (m/s²)","strength m/s²")}</small></div>
        <div><b>${Math.round(r.hz)}</b><small>${T("ความถี่สุ่ม (Hz)","sample rate")}</small></div>
      </div>
    </div>

    ${r.peaks.length?`<div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("ความถี่ที่จับได้","Frequencies found")}</small>
        <b>${T("อ่านค่าอย่างไร","What they mean")}</b></div></div>
      ${rows}
      <p class="lg-note">${T(
        `เทียบกับรอบหมุนล้อที่ ${r.wheelHz?r.wheelHz.toFixed(1):"—"} Hz ณ ความเร็วเฉลี่ยที่วัดได้ · ยาง ${esc(sk.tyre)}`,
        `Against a wheel rotation of ${r.wheelHz?r.wheelHz.toFixed(1):"—"} Hz at the average speed measured · tyres ${esc(sk.tyre)}`)}</p>
    </div>`:""}

    ${fixes.length?`<div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("ทำต่อ","Next")}</small>
        <b>${T("ควรบอกช่างว่าอะไร","What to tell the workshop")}</b></div>
        <button class="btn" id="skCopy"><i class="ti ti-copy"></i>${T("คัดลอก","Copy")}</button></div>
      ${fixes.map(k=>`<div class="lg-ask"><i class="ti ti-tool"></i>${
        esc(T(SHAKE_FIX[k][0],SHAKE_FIX[k][1]))}</div>`).join("")}
      <div class="lg-sum" style="margin-top:11px">${esc(shakeSentence())}</div>
    </div>`:""}

    <div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("เก็บไว้","Keep it")}</small>
        <b>${T("บันทึกผลนี้ไว้ในรถ","Save this to the car")}</b></div></div>
      <div class="lg-keep"><span><i class="ti ti-clipboard-text"></i>
        ${T("เก็บเป็นอาการที่บันทึกไว้ เอาไปคุยกับ AI หรือช่างต่อได้",
            "Files it as a recorded symptom you can take to the AI or a mechanic")}</span>
        <button class="btn primary" id="skSave">${T("บันทึก","Save")}</button></div>
      <p class="lg-note">${T(
        "ค่านี้วัดจากการสั่นที่ตัวถังส่งมาถึงมือถือ ใช้ชี้ทิศทางว่าควรตรวจอะไรก่อน ไม่ใช่คำตัดสินแทนการยกรถขึ้นตรวจจริง",
        "This reads vibration reaching the phone through the body. It points at what to check first — it doesn't replace putting the car on a lift.")}</p>
    </div>`;
}
function shakeSentence(){
  const r=sk.res; if(!r)return "";
  const p=r.peaks.filter(x=>x.kind)[0]||r.peaks[0];
  if(!p)return "";
  return T(
    `รถสั่นที่ความเร็วราว ${Math.round(sk.avgSpeed||0)} กม./ชม. วัดความถี่การสั่นได้ ${p.hz.toFixed(1)} Hz `+
    `ซึ่งเท่ากับ ${p.order||"—"} เท่าของรอบหมุนล้อ (${r.wheelHz?r.wheelHz.toFixed(1):"—"} Hz) `+
    `รบกวนตรวจ${p.kind?T(SHAKE_MEAN[p.kind][0],SHAKE_MEAN[p.kind][1]):"ระบบช่วงล่างและล้อ"}`,
    `Vibration at about ${Math.round(sk.avgSpeed||0)} km/h measures ${p.hz.toFixed(1)} Hz, `+
    `which is ${p.order||"—"}× wheel rotation (${r.wheelHz?r.wheelHz.toFixed(1):"—"} Hz). `+
    `Please check: ${p.kind?SHAKE_MEAN[p.kind][1]:"suspension and wheels"}`);
}

async function startShake(){
  const c=car(); if(!c)return;
  const el=$("skTyre");
  sk.tyre=(el&&el.value.trim())||carTyre();
  if(!tyreCircumference(sk.tyre)){
    sk.err=T("ใส่ขนาดยางให้ถูกรูปแบบก่อน เช่น 195/65 R15",
             "Enter the tyre size properly first, e.g. 195/65 R15");
    renderTool(); return;
  }
  try{ LSt("tyre_"+c.id,sk.tyre) }catch(e){}

  /* iOS ตั้งแต่ 13 ต้องขออนุญาตใช้เซ็นเซอร์ และต้องขอจากการกดของผู้ใช้เท่านั้น */
  try{
    if(typeof DeviceMotionEvent!=="undefined"&&
       typeof DeviceMotionEvent.requestPermission==="function"){
      const st=await DeviceMotionEvent.requestPermission();
      if(st!=="granted"){ sk.err=T("ไม่ได้รับอนุญาตให้ใช้เซ็นเซอร์การเคลื่อนไหว",
        "Motion sensor permission was denied"); renderTool(); return }
    }
  }catch(e){ sk.err=String(e&&e.message||e); renderTool(); return }

  sk.stage="run"; sk.samples=[]; sk.speeds=[]; sk.err=""; sk.secs=0; sk.speed=0; sk.hz=0;
  sk.t0=Date.now();

  sk.onMotion=(ev)=>{
    const a=ev.accelerationIncludingGravity||ev.acceleration;
    if(!a)return;
    /* ใช้ขนาดของเวกเตอร์ จึงไม่ต้องสนใจว่ามือถือวางเอียงทางไหน */
    const m=Math.hypot(a.x||0,a.y||0,a.z||0);
    if(isFinite(m))sk.samples.push(m);
  };
  window.addEventListener("devicemotion",sk.onMotion);

  if(navigator.geolocation){
    sk.geo=navigator.geolocation.watchPosition(pos=>{
      const v=pos.coords.speed;                    // เมตร/วินาที
      if(v!=null&&isFinite(v)&&v>=0){ sk.speed=v*3.6; sk.speeds.push(v*3.6) }
    },()=>{},{enableHighAccuracy:true,maximumAge:1000,timeout:10000});
  }

  sk.timer=setInterval(()=>{
    sk.secs=Math.round((Date.now()-sk.t0)/1000);
    sk.hz=sk.samples.length/Math.max(1,(Date.now()-sk.t0)/1000);
    if(sk.secs>=20){ finishShake(); return }
    renderTool();
  },1000);
  renderTool();
}
function stopShake(){
  if(sk.timer)clearInterval(sk.timer); sk.timer=null;
  if(sk.onMotion)window.removeEventListener("devicemotion",sk.onMotion);
  sk.onMotion=null;
  if(sk.geo!=null&&navigator.geolocation)navigator.geolocation.clearWatch(sk.geo);
  sk.geo=null;
}
function finishShake(){
  stopShake();
  const dur=Math.max(1,(Date.now()-sk.t0)/1000);
  const hz=sk.samples.length/dur;
  /* ความเร็วเอามัธยฐาน ไม่ใช่ค่าเฉลี่ย เพราะ GPS มักมีค่าหลุดตอนเริ่มจับสัญญาณ */
  const sp=sk.speeds.slice().sort((a,b)=>a-b);
  const med=sp.length?sp[Math.floor(sp.length/2)]:0;
  sk.avgSpeed=med;
  sk.stage="done";

  if(sk.samples.length<256||hz<20){
    sk.res={ok:false};
    sk.err=T(`เก็บข้อมูลได้ไม่พอ (${sk.samples.length} ตัวอย่าง ที่ ${Math.round(hz)} ครั้ง/วินาที) `+
             "เบราว์เซอร์บางตัวจำกัดความถี่เซ็นเซอร์ ลองใช้ Chrome บนมือถือ",
             `Not enough data (${sk.samples.length} samples at ${Math.round(hz)}/s). `+
             "Some browsers throttle the sensor — try Chrome on a phone");
    renderTool(); return;
  }
  if(!med){
    sk.res={ok:false};
    sk.err=T("อ่านความเร็วจาก GPS ไม่ได้ ต้องมีความเร็วถึงจะคำนวณรอบหมุนล้อได้ ลองเปิดตำแหน่งแล้ววัดใหม่กลางแจ้ง",
             "No GPS speed. We need speed to compute wheel rotation — enable location and try again outdoors");
    renderTool(); return;
  }
  sk.res=analyse({samples:sk.samples,hz,speedKmh:med,tyre:sk.tyre});
  renderTool();
}
function wireShake(){
  const g=$("skGo"); if(g)g.onclick=startShake;
  const st=$("skStop"); if(st)st.onclick=()=>{ finishShake() };
  const ag=$("skAgain"); if(ag)ag.onclick=()=>{ sk.stage="idle"; sk.res=null; sk.err=""; renderTool() };
  const cp=$("skCopy"); if(cp)cp.onclick=()=>{
    try{ navigator.clipboard.writeText(shakeSentence());
      cp.innerHTML='<i class="ti ti-check"></i>'+T("คัดลอกแล้ว","Copied");
      setTimeout(()=>{try{cp.innerHTML='<i class="ti ti-copy"></i>'+T("คัดลอก","Copy")}catch(e){}},1600) }catch(e){}
  };
  const sv=$("skSave"); if(sv)sv.onclick=()=>{
    const c=car(); if(!c||!sk.res)return;
    const list=LG("carlab_sym_"+c.id,[])||[];
    let km=0; try{ km=window.SpireODO?window.SpireODO.value(c):0 }catch(e){}
    list.unshift({t:shakeSentence().slice(0,200),date:new Date().toISOString().slice(0,10),km});
    LSt("carlab_sym_"+c.id,list.slice(0,40));
    sv.disabled=true; sv.innerHTML='<i class="ti ti-check"></i>'+T("บันทึกแล้ว","Saved");
    try{ window.clRerender&&window.clRerender() }catch(e){}
  };
}

/* ══════════════════════════════════════════════════════════════════
   PARK — จำที่จอดรถ แล้วพาเดินกลับไปหา

   เรื่อง Bluetooth จับรถอัตโนมัติ: เว็บทำไม่ได้ และไม่ควรแกล้งทำ
   Web Bluetooth เห็นเฉพาะอุปกรณ์ BLE ที่ผู้ใช้กดเลือกเองในกล่อง chooser
   วิทยุรถเป็น Bluetooth Classic ซึ่งมองไม่เห็นเลย สแกนพื้นหลังก็ไม่ได้
   และ iOS ไม่รองรับ Web Bluetooth เลย — ต้องเป็นแอปเนทีฟเท่านั้น

   สิ่งที่เว็บทำได้จริงและทำได้ดี คือทุกอย่างหลังจากนั้น:
   บันทึกจุดจอดแม่นระดับเมตร พาเดินกลับด้วยเข็มทิศ และเตือนก่อนหมดเวลาจอด
   ผ่าน push จริงแม้ปิดเว็บไปแล้ว
   ══════════════════════════════════════════════════════════════════ */
const R_EARTH=6371000;
const rad=d=>d*Math.PI/180, deg=r=>r*180/Math.PI;
function gDist(a,b){
  const p1=rad(a.lat),p2=rad(b.lat);
  const dp=rad(b.lat-a.lat), dl=rad(b.lng-a.lng);
  const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R_EARTH*Math.asin(Math.min(1,Math.sqrt(h)));
}
function gBear(a,b){
  const p1=rad(a.lat),p2=rad(b.lat),dl=rad(b.lng-a.lng);
  const y=Math.sin(dl)*Math.cos(p2);
  const x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);
  return (deg(Math.atan2(y,x))+360)%360;
}
/* แผนที่จริงของจุดจอด — วาดจากไทล์ OpenStreetMap ตรง ๆ
   ไม่ต้องมี API key ไม่ต้องโหลดไลบรารีแผนที่ และเห็นภาพชัดกว่าลูกศรมาก
   โดยเฉพาะในลานจอดที่ต้องจำว่าอยู่ฝั่งไหนของอาคาร */
const OSM_Z=17, TILE=256;
function tileXY(lat,lng,z){
  const n=Math.pow(2,z);
  const x=(lng+180)/360*n;
  const la=rad(lat);
  const y=(1-Math.log(Math.tan(la)+1/Math.cos(la))/Math.PI)/2*n;
  return {x,y};
}
function miniMap(p,w,h){
  const {x,y}=tileXY(p.lat,p.lng,OSM_Z);
  const cx=Math.floor(x), cy=Math.floor(y);
  const offX=(x-cx)*TILE, offY=(y-cy)*TILE;
  /* กริด 3x3 รอบไทล์กลาง แล้วเลื่อนให้จุดจอดมาอยู่กลางกรอบพอดี */
  const left=w/2-(TILE+offX), top=h/2-(TILE+offY);
  let tiles="";
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    tiles+=`<img src="https://tile.openstreetmap.org/${OSM_Z}/${cx+dx}/${cy+dy}.png"
      loading="lazy" alt="" onerror="this.dataset.bad=1"
      style="left:${(dx+1)*TILE}px;top:${(dy+1)*TILE}px">`;
  }
  /* ถ้าโหลดไทล์ไม่ได้ (ออฟไลน์ หรือเซิร์ฟเวอร์แผนที่ล่ม) ต้องไม่เหลือกล่องเทาว่าง ๆ
     ให้ถอยไปแสดงพิกัดกับปุ่มเปิดแผนที่แทน ซึ่งยังพาไปหารถได้อยู่ */
  return `<div class="pk-map" style="height:${h}px" id="pkMap">
    <div class="pk-tiles" style="transform:translate(${left}px,${top}px)">${tiles}</div>
    <span class="pk-pin"><i class="ti ti-map-pin-filled"></i></span>
    <a class="pk-attr" href="https://www.openstreetmap.org/copyright"
       target="_blank" rel="noopener">© OpenStreetMap</a>
    <div class="pk-mapoff"><i class="ti ti-map-off"></i>
      <b>${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</b>
      <small>${T("โหลดแผนที่ไม่ได้ตอนนี้ ใช้ปุ่มเปิดในแผนที่ด้านล่างแทนได้",
                 "Map tiles couldn't load — use Open in Maps below")}</small></div>
  </div>`;
}

/* ══════════ โหมดขับรถ — บันทึกจุดจอดให้เองเมื่อรถหยุด ══════════
   กดปุ่มเดียวตอนเริ่มขับ แล้วไม่ต้องแตะอะไรอีกเลย
   ระบบเฝ้าพิกัด พอรถนิ่งอยู่ที่เดิมนานพอก็ถือว่าจอดแล้ว บันทึกให้ทันที
   พร้อมสรุประยะทางที่ขับได้จริง เอาไปยืนยันเลขไมล์ต่อได้

   ทำไมต้องกดเริ่มเอง: เว็บรันเบื้องหลังไม่ได้ ต่างจากแอปเนทีฟ
   แต่พอเริ่มแล้วที่เหลืออัตโนมัติทั้งหมด ซึ่งคือส่วนที่คนลืมจริง ๆ */
const STOP_MS=90000, STOP_R=30, MOVED_M=150;

function parkedNow(pts,now){
  if(!pts.length)return {stopped:false,why:"empty"};
  const start=pts[0], last=pts[pts.length-1];
  let far=0;
  for(const q of pts)far=Math.max(far,gDist(start,q));
  if(far<MOVED_M)return {stopped:false,why:"never-moved",far};
  let since=last.t;
  for(let i=pts.length-1;i>=0;i--){
    if(gDist(pts[i],last)>STOP_R)break;
    since=pts[i].t;
  }
  return {stopped:(now||last.t)-since>=STOP_MS,still:(now||last.t)-since,far,at:last};
}
function tripMetres(pts){
  let sum=0,prev=null;
  for(const q of pts){
    if(q.acc!=null&&q.acc>50)continue;      // จุดที่ GPS ไม่มั่นใจ ตัดทิ้งก่อนบวกระยะ
    if(prev){ const d=gDist(prev,q); if(d>=5)sum+=d }
    prev=q;
  }
  return sum;
}

let dv={on:false,pts:[],watch:null,lock:null,tick:null,t0:0,speed:0,saved:null,err:""};

function driveCard(){
  const p=getPark();
  if(dv.saved)return `<div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("บันทึกให้แล้ว","Saved for you")}</small>
        <b>${T("รถจอดแล้ว เก็บจุดไว้เรียบร้อย","Parked — spot recorded")}</b></div></div>
      <div class="lg-urg fine"><i class="ti ti-circle-check"></i><span>${T(
        `ขับไปทั้งหมดราว ${(dv.saved.km).toFixed(1)} กม. ใช้เวลา ${dv.saved.mins} นาที`,
        `About ${(dv.saved.km).toFixed(1)} km over ${dv.saved.mins} minutes`)}</span></div>
      ${dv.saved.km>=1?`<div class="lg-keep"><span><i class="ti ti-gauge"></i>
        ${T("บวกระยะนี้เข้าเลขไมล์","Add this to your odometer")}
        <b>+${Math.round(dv.saved.km)} ${T("กม.","km")}</b></span>
        <button class="btn primary" id="dvOdo">${T("บวกเลย","Add it")}</button></div>`:""}
      <div class="lg-acts"><button class="btn" id="dvClose">${T("ปิด","Close")}</button></div>
    </div>`;

  if(dv.on){
    const mins=Math.round((Date.now()-dv.t0)/60000);
    const km=tripMetres(dv.pts)/1000;
    const st=parkedNow(dv.pts,Date.now());
    const stillSec=st.still?Math.round(st.still/1000):0;
    return `<div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("กำลังขับ","Driving")}</small>
        <b>${T("จะบันทึกจุดจอดให้เองเมื่อรถหยุด","We'll save the spot when you stop")}</b></div>
        <button class="btn" id="dvStop">${T("จบทริป","End trip")}</button></div>
      <div class="sk-live">
        <div><b>${Math.round(dv.speed)}</b><small>${T("กม./ชม.","km/h")}</small></div>
        <div><b>${km.toFixed(1)}</b><small>${T("กม. ที่ขับมา","km so far")}</small></div>
        <div><b>${mins}</b><small>${T("นาที","minutes")}</small></div>
      </div>
      ${st.why==="never-moved"?`<div class="lg-tip"><i class="ti ti-car"></i>${T(
        "รอให้รถออกตัวก่อน ระบบจะเริ่มนับเมื่อขยับไปแล้วอย่างน้อย 150 เมตร",
        "Waiting for the car to move — tracking starts after about 150 metres")}</div>`
      :stillSec>10?`<div class="lg-tip"><i class="ti ti-hourglass"></i>${T(
        `รถนิ่งมา ${stillSec} วินาที ถ้าครบ 90 วินาทีจะถือว่าจอดแล้ว`,
        `Stationary for ${stillSec}s — 90s counts as parked`)}</div>`
      :`<div class="lg-tip"><i class="ti ti-check"></i>${T(
        "กำลังติดตามอยู่ วางมือถือไว้ได้เลย ไม่ต้องแตะอะไรอีก",
        "Tracking — put the phone down, nothing else to do")}</div>`}
      <p class="lg-note">${T(
        "หน้าจอถูกกันไม่ให้ดับระหว่างนี้ เพราะเบราว์เซอร์หยุดอ่านพิกัดเมื่อหน้าจอดับ · อย่าสลับไปแอปอื่นนาน ๆ",
        "The screen is kept awake because browsers stop reading location when it sleeps · don't switch away for long")}</p>
    </div>`;
  }

  return `<div class="lg-card">
    <div class="lg-head"><div class="tx"><small>${T("อัตโนมัติ","Automatic")}</small>
      <b>${T("โหมดขับรถ","Drive mode")}</b></div></div>
    <p class="lg-sub">${T(
      "กดก่อนออกรถครั้งเดียว จากนั้นไม่ต้องแตะอะไรอีก พอรถจอดนิ่ง ระบบบันทึกจุดจอดให้เอง และสรุประยะทางที่ขับจริงมาให้ด้วย",
      "Tap once before you set off. When the car comes to rest we save the spot automatically and tell you how far you actually drove")}</p>
    <div class="lg-acts"><button class="btn primary" id="dvGo">
      <i class="ti ti-steering-wheel"></i>${T("เริ่มโหมดขับรถ","Start drive mode")}</button></div>
    ${dv.err?`<div class="lg-err"><i class="ti ti-alert-triangle"></i>${esc(dv.err)}</div>`:""}
    <p class="lg-note">${T(
      "เว็บรันเบื้องหลังไม่ได้เหมือนแอปที่ติดตั้ง จึงต้องกดเริ่มเอง แต่ส่วนที่คนลืมจริง ๆ คือตอนจอด ซึ่งอันนี้ทำให้เอง",
      "The web can't run in the background like an installed app, so you tap to start — but the part people actually forget is the parking, and that's handled")}</p>
  </div>`;
}

async function startDrive(){
  dv.err="";
  if(!navigator.geolocation){ dv.err=T("เครื่องนี้ไม่มีระบบระบุตำแหน่ง","No geolocation here"); renderTool(); return }
  try{ await pkPos({timeout:20000}) }
  catch(e){
    dv.err=(e&&e.code===1)?T("ต้องอนุญาตให้ใช้ตำแหน่งก่อน","Location permission is required")
      :T("ยังจับสัญญาณ GPS ไม่ได้ ลองอีกครั้งกลางแจ้ง","No GPS fix yet — try again outdoors");
    renderTool(); return;
  }
  dv.on=true; dv.pts=[]; dv.t0=Date.now(); dv.saved=null;
  /* หน้าจอดับเมื่อไร เบราว์เซอร์หยุดส่งพิกัด ทริปจะขาดกลางคัน */
  try{ if(navigator.wakeLock)dv.lock=await navigator.wakeLock.request("screen") }catch(e){}
  dv.watch=navigator.geolocation.watchPosition(pos=>{
    const c=pos.coords;
    dv.speed=(c.speed!=null&&isFinite(c.speed)&&c.speed>0)?c.speed*3.6:0;
    dv.pts.push({lat:c.latitude,lng:c.longitude,acc:c.accuracy,t:Date.now()});
    if(dv.pts.length>3000)dv.pts.splice(0,1000);
    const st=parkedNow(dv.pts,Date.now());
    if(st.stopped)finishDrive(true);
  },()=>{},{enableHighAccuracy:true,maximumAge:1000,timeout:20000});
  dv.tick=setInterval(()=>{ if(tool==="park")renderTool() },3000);
  renderTool();
}
async function finishDrive(auto){
  const pts=dv.pts.slice();
  stopDrive();
  if(!pts.length){ renderTool(); return }
  const last=pts[pts.length-1];
  const km=tripMetres(pts)/1000;
  const mins=Math.max(1,Math.round((Date.now()-dv.t0)/60000));
  const old=getPark()||{};
  setPark({lat:last.lat,lng:last.lng,acc:last.acc,t:Date.now(),
    note:old.note||"",photo:"",timerAt:0,auto:!!auto,km:+km.toFixed(1)});
  dv.saved={km,mins};
  /* สั่นเตือนสั้น ๆ ให้รู้ว่าบันทึกแล้ว โดยไม่ต้องมองจอ */
  try{ if(navigator.vibrate)navigator.vibrate([60,40,60]) }catch(e){}
  try{
    if(("Notification" in window)&&Notification.permission==="granted"){
      const reg=await navigator.serviceWorker.getRegistration();
      if(reg)reg.showNotification(T("บันทึกจุดจอดแล้ว","Parking spot saved"),
        {body:T(`ขับมา ${km.toFixed(1)} กม.`,`${km.toFixed(1)} km driven`),
         icon:"./icon-192.png",tag:"park"});
    }
  }catch(e){}
  startPkWatch();
  renderTool();
}
function stopDrive(){
  dv.on=false;
  if(dv.watch!=null&&navigator.geolocation)navigator.geolocation.clearWatch(dv.watch);
  dv.watch=null;
  if(dv.tick)clearInterval(dv.tick); dv.tick=null;
  try{ if(dv.lock){ dv.lock.release(); dv.lock=null } }catch(e){}
}
function wireDrive(){
  const g=$("dvGo"); if(g)g.onclick=startDrive;
  const st=$("dvStop"); if(st)st.onclick=()=>finishDrive(false);
  const cl=$("dvClose"); if(cl)cl.onclick=()=>{ dv.saved=null; renderTool() };
  const od=$("dvOdo"); if(od)od.onclick=()=>{
    const c=car(); if(!c||!dv.saved)return;
    try{
      const cur=window.SpireODO?window.SpireODO.value(c):0;
      window.SpireODO.confirm(c,Math.round(cur+dv.saved.km),"manual");
      od.disabled=true; od.textContent=T("บวกแล้ว","Added");
      window.odoRefresh&&window.odoRefresh();
      window.clRefreshWidgets&&window.clRefreshWidgets();
      window.briefRefresh&&window.briefRefresh();
    }catch(e){}
  };
}

const parkKey=()=>{const c=car(); return "park_"+(c?c.id:"none")};
const getPark=()=>LG(parkKey(),null);
const setPark=v=>LSt(parkKey(),v);

let pk={busy:false,err:"",here:null,heading:null,watch:null,tick:null,photo:""};

function parkBody(){
  const c=car(); if(!c)return noCarCard();
  const p=getPark();
  /* โหมดขับรถอยู่บนสุดเสมอ เพราะเป็นทางที่ทำให้ระบบทำงานเองได้จริง */
  if(dv.on||dv.saved)return driveCard();
  if(!p)return driveCard()+`<div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("จำที่จอด","Parking")}</small>
        <b>${T("จอดแล้วกดปุ่มเดียว","One tap when you park")}</b></div></div>
      <p class="lg-sub">${T(
        "เก็บพิกัดที่จอดไว้ แล้วตอนกลับมาระบบชี้ทิศและบอกระยะให้เดินตาม พร้อมตั้งเตือนก่อนหมดเวลาจอดได้ด้วย",
        "We save the spot, then point you back to it with a live bearing and distance — and can warn you before the parking runs out")}</p>
      <div class="pk-big"><i class="ti ti-map-pin"></i></div>
      <div class="lg-acts" style="justify-content:center">
        <button class="btn primary" id="pkSave" ${pk.busy?"disabled":""}>
          <i class="ti ti-map-pin-plus"></i>${pk.busy?T("กำลังหาพิกัด…","Locating…"):T("บันทึกจุดที่จอด","Save this spot")}</button>
      </div>
      ${pk.err?`<div class="lg-err"><i class="ti ti-alert-triangle"></i>${esc(pk.err)}</div>`:""}
      <p class="lg-note">${T(
        "ในลานจอดใต้ดินสัญญาณ GPS อ่อน ให้ถ่ายรูปเสาหรือป้ายชั้นไว้ประกอบด้วย จะหาเจอง่ายกว่ามาก",
        "GPS is weak in underground car parks — add a photo of the pillar or level sign and it gets far easier")}</p>
    </div>${parkNote()}`;

  const d=pk.here?gDist(pk.here,p):null;
  const brg=pk.here?gBear(pk.here,p):null;
  /* หมุนลูกศรตามทิศที่ถือมือถือ ถ้าอ่านเข็มทิศไม่ได้ก็ชี้ตามทิศเหนือจริง */
  const rot=(brg!=null)?(pk.heading!=null?brg-pk.heading:brg):0;
  const acc=p.acc?Math.round(p.acc):null;
  const mins=Math.round((Date.now()-p.t)/60000);
  const dur=mins<60?T(`${mins} นาทีที่แล้ว`,`${mins} min ago`)
    :T(`${Math.floor(mins/60)} ชม. ${mins%60} นาทีที่แล้ว`,`${Math.floor(mins/60)}h ${mins%60}m ago`);

  return driveCard()+`<div class="lg-card">
      <div class="lg-head"><div class="tx"><small>${T("จอดไว้ที่นี่","Parked here")}</small>
        <b>${esc(dur)}</b></div>
        <button class="btn" id="pkClear"><i class="ti ti-trash"></i>${T("ล้าง","Clear")}</button></div>

      <div class="pk-nav">
        <div class="pk-arrow" style="transform:rotate(${rot}deg)"><i class="ti ti-arrow-up"></i></div>
        <div class="pk-dist">
          <b>${d==null?"—":d<1000?Math.round(d):(d/1000).toFixed(2)}</b>
          <small>${d==null?T("กำลังหาตำแหน่งคุณ…","finding you…"):d<1000?T("เมตร","metres"):T("กม.","km")}</small>
        </div>
      </div>
      ${pk.heading==null?`<p class="lg-note" style="text-align:center;margin-top:0">${T(
        "ลูกศรชี้ตามทิศเหนือจริง หันมือถือให้ตรงกับแผนที่ในหัวคุณ (เครื่องนี้ไม่ให้ใช้เข็มทิศ)",
        "The arrow points relative to true north — this device doesn't expose a compass")}</p>`:""}

      ${miniMap(p,320,190)}

      ${p.note||p.photo?`<div class="pk-memo">
        ${p.photo?`<img src="${p.photo}" alt="">`:""}
        ${p.note?`<span>${esc(p.note)}</span>`:""}</div>`:""}

      <div class="lg-acts">
        <a class="btn" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking"
           target="_blank" rel="noopener"><i class="ti ti-map"></i>${T("เปิดในแผนที่","Open in Maps")}</a>
        <button class="btn" id="pkEdit"><i class="ti ti-pencil"></i>${T("แก้โน้ต/รูป","Note & photo")}</button>
      </div>
      <p class="lg-note">${acc?T(`ความแม่นของพิกัดตอนบันทึกราว ±${acc} เมตร`,
        `Saved with about ±${acc} m accuracy`):""}</p>
    </div>
    ${parkTimer(p)}
    ${parkNote()}`;
}

/* ── ตัวตั้งเตือนก่อนหมดเวลาจอด ── */
function parkTimer(p){
  const on=p.timerAt&&p.timerAt>Date.now();
  const left=on?Math.round((p.timerAt-Date.now())/60000):0;
  return `<div class="lg-card">
    <div class="lg-head"><div class="tx"><small>${T("กันลืม","Don't get a ticket")}</small>
      <b>${on?T(`เตือนอีก ${left} นาที`,`Alert in ${left} min`)
            :T("เตือนก่อนหมดเวลาจอด","Warn me before parking expires")}</b></div>
      ${on?`<button class="btn" id="pkTimerOff">${T("ยกเลิก","Cancel")}</button>`:""}</div>
    ${on?`<p class="lg-sub" style="margin:0">${T(
      "เราจะส่งแจ้งเตือนถึงมือถือคุณ แม้ปิดเว็บไปแล้ว",
      "We'll push it to your phone even with the site closed")}</p>`
    :`<div class="pk-mins">${[30,60,120,180].map(m=>
      `<button class="pk-min" data-pkmin="${m}">${m<60?T(`${m} นาที`,`${m} min`)
        :T(`${m/60} ชม.`,`${m/60} h`)}</button>`).join("")}</div>
     <p class="lg-note">${T(
       "เตือนล่วงหน้า 10 นาทีก่อนครบเวลา · ต้องเปิดการแจ้งเตือนไว้ก่อน",
       "Fires 10 minutes before the time is up · notifications must be on")}</p>`}
    ${pk.terr?`<div class="lg-err"><i class="ti ti-alert-triangle"></i>${esc(pk.terr)}</div>`:""}
  </div>`;
}

/* ── บอกความจริงเรื่อง Bluetooth ตรง ๆ แทนที่จะปล่อยให้เข้าใจผิด ── */
function parkNote(){
  return `<div class="lg-card">
    <div class="lg-head"><div class="tx"><small>${T("ทำไมไม่จำอัตโนมัติ","Why not automatic")}</small>
      <b>${T("เรื่อง Bluetooth ที่ต้องบอกตรง ๆ","About Bluetooth")}</b></div></div>
    <p class="lg-sub" style="margin:0">${T(
      "แอปเนทีฟจับได้ว่ามือถือหลุดจาก Bluetooth รถแล้วบันทึกจุดจอดให้เอง แต่เว็บทำแบบนั้นไม่ได้ — เบราว์เซอร์เปิดให้เห็นเฉพาะอุปกรณ์ BLE ที่ผู้ใช้กดเลือกเอง วิทยุรถเป็น Bluetooth คนละแบบ และ iOS ไม่รองรับเลย เราจึงเลือกทำปุ่มเดียวจบให้เร็วที่สุดแทนการหลอกว่าอัตโนมัติ",
      "A native app can notice your phone dropping off the car's Bluetooth and save the spot for you. The web genuinely cannot: browsers only expose BLE devices the user picks by hand, car stereos use a different Bluetooth profile entirely, and iOS doesn't support it at all. So we made the one tap as fast as possible instead of pretending it's automatic")}</p>
  </div>`;
}

function pkPos(opts){
  return new Promise((res,rej)=>{
    if(!navigator.geolocation)return rej(new Error(T("เครื่องนี้ไม่มีระบบระบุตำแหน่ง","No geolocation on this device")));
    navigator.geolocation.getCurrentPosition(p=>res(p),e=>rej(e),
      Object.assign({enableHighAccuracy:true,timeout:15000,maximumAge:0},opts||{}));
  });
}
async function savePark(){
  pk.busy=true; pk.err=""; renderTool();
  try{
    const pos=await pkPos();
    const old=getPark()||{};
    setPark({lat:pos.coords.latitude,lng:pos.coords.longitude,
      acc:pos.coords.accuracy,t:Date.now(),note:old.note||"",photo:old.photo||"",timerAt:0});
    startPkWatch();
  }catch(e){
    pk.err=(e&&e.code===1)
      ? T("ต้องอนุญาตให้ใช้ตำแหน่งก่อน ระบบถึงจะจำที่จอดได้",
          "Location permission is needed to remember where you parked")
      : T("หาพิกัดไม่สำเร็จ ลองออกไปที่โล่งกว่านี้แล้วกดใหม่",
          "Couldn't get a fix — try somewhere more open and tap again");
  }
  pk.busy=false; renderTool();
}
function startPkWatch(){
  stopPkWatch();
  if(!navigator.geolocation)return;
  pk.watch=navigator.geolocation.watchPosition(pos=>{
    pk.here={lat:pos.coords.latitude,lng:pos.coords.longitude};
    if(tool==="park")renderTool();
  },()=>{},{enableHighAccuracy:true,maximumAge:2000,timeout:15000});
  /* เข็มทิศต้องขออนุญาตแยกบน iOS และขอได้จากการกดของผู้ใช้เท่านั้น */
  if(!pk.orient){
    pk.orient=ev=>{
      const h=(ev.webkitCompassHeading!=null)?ev.webkitCompassHeading
        :(ev.absolute&&ev.alpha!=null)?360-ev.alpha:null;
      if(h!=null&&isFinite(h))pk.heading=h;
    };
    window.addEventListener("deviceorientationabsolute",pk.orient);
    window.addEventListener("deviceorientation",pk.orient);
  }
}
function stopPkWatch(){
  if(pk.watch!=null&&navigator.geolocation)navigator.geolocation.clearWatch(pk.watch);
  pk.watch=null;
  if(pk.orient){
    window.removeEventListener("deviceorientationabsolute",pk.orient);
    window.removeEventListener("deviceorientation",pk.orient);
    pk.orient=null;
  }
}
async function setParkTimer(mins){
  const p=getPark(); if(!p)return;
  pk.terr="";
  const at=Date.now()+mins*60000;
  const fireAt=at-10*60000;               // เตือนล่วงหน้าสิบนาที
  if(fireAt<=Date.now()+30000){
    pk.terr=T("ช่วงเวลาสั้นเกินกว่าจะเตือนล่วงหน้าได้","Too short to warn ahead of time");
    renderTool(); return;
  }
  try{
    await api("/api/push/schedule",{id:"park-"+(car()||{}).id,sendAt:fireAt,
      title:T("อีก 10 นาทีหมดเวลาจอด","10 minutes of parking left"),
      body:T("กลับไปที่รถหรือต่อเวลาได้แล้ว","Head back to the car or extend it"),
      url:"/",tag:"park"});
    p.timerAt=at; setPark(p);
  }catch(e){
    pk.terr=String(e&&e.message||e).slice(0,180);
  }
  renderTool();
}
async function clearParkTimer(){
  const p=getPark(); if(!p)return;
  try{ await api("/api/push/cancel",{id:"park-"+(car()||{}).id}) }catch(e){}
  p.timerAt=0; setPark(p); renderTool();
}
function wirePark(){
  wireDrive();
  /* ไทล์โหลดแบบ lazy จึงต้องรอสักครู่ค่อยตัดสินว่าล้มจริงหรือยังไม่ถึงคิว */
  const map=$("pkMap");
  if(map)setTimeout(()=>{
    const imgs=[...map.querySelectorAll(".pk-tiles img")];
    const ok=imgs.some(i=>i.naturalWidth>0);
    if(!ok)map.classList.add("off");
  },2500);
  const s2=$("pkSave"); if(s2)s2.onclick=savePark;
  const c2=$("pkClear"); if(c2)c2.onclick=()=>{
    if(!confirm(T("ลบจุดจอดที่บันทึกไว้?","Forget the saved spot?")))return;
    clearParkTimer(); LSt(parkKey(),null); stopPkWatch(); pk.here=null; renderTool() };
  D.querySelectorAll("[data-pkmin]").forEach(b=>b.onclick=()=>setParkTimer(+b.dataset.pkmin));
  const off=$("pkTimerOff"); if(off)off.onclick=clearParkTimer;
  const ed=$("pkEdit"); if(ed)ed.onclick=()=>{
    const p=getPark(); if(!p)return;
    const n=prompt(T("โน้ตที่จอด เช่น ชั้น B2 โซน C เสา 14","Note, e.g. Level B2, zone C, pillar 14"),p.note||"");
    if(n!=null){ p.note=String(n).slice(0,120); setPark(p); renderTool() }
  };
  if(getPark()&&!pk.watch)startPkWatch();
}

/* ══════════ งานถัดไป — บรรทัดเดียวบนสุดที่ชี้ว่าตอนนี้ควรทำอะไร ══════════
   หน้าแรกที่สวยแต่ไม่บอกว่าให้ทำอะไรต่อ คนเปิดมาแล้วก็ปิดไป
   เรียงตามความเสียหายจริงถ้าไม่ทำ: โดนปรับ > รถพัง > ระบบยังเตือนไม่ได้ */
function nextAction(){
  const c=car();
  if(!c)return {tone:"calm",ic:"ti-car",
    b:T("เริ่มจากเพิ่มรถของคุณ","Start by adding your car"),
    s:T("ใส่ยี่ห้อ รุ่น ปี แล้วทุกอย่างที่เหลือจะเริ่มทำงานให้เอง",
        "Make, model, year — everything else starts working from there"),
    cta:T("เพิ่มรถ","Add a car"),go:()=>{try{window.switchView("garage")}catch(e){}}};

  const rg=renewals(c), due=rg.filter(x=>x.left<=30);
  const over=rg.filter(x=>x.left<0)[0];
  if(over)return {tone:"hot",ic:over.ic,
    b:T(`${over.th}เลยกำหนดมาแล้ว ${Math.abs(over.left)} วัน`,
        `${over.en} is ${Math.abs(over.left)} days overdue`),
    s:T("ยิ่งช้ายิ่งมีค่าปรับ และต่อภาษีไม่ได้ถ้า พ.ร.บ. ขาด",
        "Fines accrue, and you can't renew tax without valid compulsory insurance"),
    cta:T("ดูรายละเอียด","Details"),go:()=>openQuote("quote")};
  const soon=due.filter(x=>x.left<=7)[0];
  if(soon)return {tone:"hot",ic:soon.ic,
    b:T(`${soon.th}เหลืออีก ${soon.left} วัน`,`${soon.en} due in ${soon.left} days`),
    s:T("จัดการตอนนี้เลยดีกว่า ใช้เวลาไม่นาน","Get it done now — it doesn't take long"),
    cta:T("ดูรายละเอียด","Details"),go:()=>openQuote("quote")};

  let st=null; try{ st=window.SpireCarLab&&window.SpireCarLab.status(c) }catch(e){}
  if(st&&st.over.length){
    const w=st.over[0];
    return {tone:"hot",ic:"ti-tool",
      b:T(`${w.p.th}เลยกำหนดแล้ว`,`${w.p.en} is overdue`),
      s:st.over.length>1?T(`และอีก ${st.over.length-1} รายการที่ค้างอยู่`,
                           `plus ${st.over.length-1} more waiting`)
        :T("ตามระยะที่บันทึกไว้ ถึงรอบเปลี่ยนแล้ว","Going by your records, it's past its interval"),
      cta:T("เปิดการาจ","Open garage"),go:()=>{try{window.openCarDetail(c.id)}catch(e){}}};
  }

  /* ระบบเตือนอะไรไม่ได้เลยถ้าไม่มีข้อมูล — บอกตรง ๆ ว่าติดตรงไหน */
  if(st&&st.unlogged>=st.total-2)return {tone:"warn",ic:"ti-clipboard-text",
    b:T(`ยังไม่ได้บันทึกอะไรเลย ${st.unlogged} จาก ${st.total} รายการ`,
        `Nothing recorded yet — ${st.unlogged} of ${st.total} items`),
    s:T("กรอกแค่ไม่กี่รายการที่จำได้ ระบบก็เริ่มเตือนให้ได้แล้ว",
        "Fill in the few you remember and the reminders start working"),
    cta:T("กรอกข้อมูล","Fill it in"),go:()=>{try{window.openCarDetail(c.id)}catch(e){}}};

  if(!rg.length)return {tone:"warn",ic:"ti-receipt-tax",
    b:T("ยังไม่ได้ใส่วันต่อภาษีและ พ.ร.บ.","Tax and insurance dates not set"),
    s:T("ใส่ครั้งเดียว แล้วระบบเตือนให้เองทุกปี ไม่ต้องจำอีก",
        "Enter them once and we'll remind you every year"),
    cta:T("ใส่วันที่","Add dates"),go:()=>openQuote("quote")};

  const near=due[0];
  if(near)return {tone:"warn",ic:near.ic,
    b:T(`${near.th}อีก ${near.left} วัน`,`${near.en} in ${near.left} days`),
    s:T("ยังมีเวลา แต่จดไว้ในปฏิทินได้แล้ว","Still time, but worth putting in the diary"),
    cta:T("ดูรายละเอียด","Details"),go:()=>openQuote("quote")};

  if(st&&st.soon.length){
    const w=st.soon[0];
    return {tone:"calm",ic:"ti-tool",
      b:T(`${w.p.th}อีก ${num(w.d.left)} กม.`,`${w.p.en} in ${num(w.d.left)} km`),
      s:T("ยังไม่ด่วน แต่เตรียมงบไว้ได้","Not urgent, but you can budget for it"),
      cta:T("ดูแผน","See plan"),go:()=>{try{window.openCarDetail(c.id)}catch(e){}}};
  }
  if(st&&st.unlogged)return {tone:"calm",ic:"ti-clipboard-text",
    b:T(`ยังไม่ได้บันทึกอีก ${st.unlogged} รายการ`,`${st.unlogged} items still unrecorded`),
    s:T("กรอกเพิ่มแล้วการเตือนจะครบขึ้น","Fill them in and the reminders get complete"),
    cta:T("กรอกเพิ่ม","Add them"),go:()=>{try{window.openCarDetail(c.id)}catch(e){}}};

  return {tone:"calm",ic:"ti-circle-check",
    b:T("ตอนนี้ไม่มีอะไรค้าง","Nothing pending right now"),
    s:T("ถ้ารถมีเสียงแปลก ๆ อัดไว้ให้ระบบฟังได้เลย","If it starts making a noise, record it and we'll listen"),
    cta:T("ฟังเสียงรถ","Listen"),go:()=>openQuote("listen")};
}
let nxGo=null;
function renderNext(){
  const box=$("cpNext"); if(!box)return;
  const a=nextAction(); nxGo=a.go;
  box.innerHTML=`<div class="nx ${a.tone}">
    <span class="ic"><i class="ti ${a.ic}"></i></span>
    <span class="tx"><b>${esc(a.b)}</b><small>${esc(a.s)}</small></span>
    <button class="go" id="nxGo">${esc(a.cta)}</button></div>`;
  const g=$("nxGo"); if(g)g.onclick=()=>{ try{nxGo&&nxGo()}catch(e){} };
}
window.spireNextAction=renderNext;
/* Cockpit สร้างช่อง #cpNext ทีหลัง แล้วยัง re-render ทับได้อีกเรื่อย ๆ
   จึงต้องเฝ้าตลอด ไม่ใช่เติมครั้งเดียวแล้วเลิก — ไม่งั้นแถบจะหายเงียบ ๆ
   เช็กแค่ว่าว่างหรือไม่ ถูกมาก ไม่ต้องคำนวณอะไรถ้ายังอยู่ */
setInterval(()=>{
  const box=D.getElementById("cpNext");
  if(box&&!box.firstChild)renderNext();
},400);

/* ══════════ ติดตั้งลงจอโฮม และแจ้งเตือนก่อนถึงกำหนด ══════════
   เว็บเปล่าเตือนอะไรไม่ได้เลย ผู้ใช้ต้องนึกถึงเองถึงจะเปิด
   ฟีเจอร์ดีแค่ไหนก็ไร้ค่าถ้าไม่มีใครเปิดมาเจอ ตรงนี้จึงสำคัญที่สุด */
const PUSHOK=()=>("serviceWorker" in navigator)&&("PushManager" in window)&&("Notification" in window);
const isStandalone=()=>window.matchMedia("(display-mode: standalone)").matches||
  window.navigator.standalone===true;
let installEvt=null;
window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); installEvt=e; renderNotifCard() });

async function swReg(){
  if(!("serviceWorker" in navigator))return null;
  try{
    /* ถ้าลงทะเบียนไว้แล้วให้ใช้ตัวเดิม — เรียก register ซ้ำจะไปค้างรอตรวจอัปเดต
       ทำให้ปุ่มเปิดแจ้งเตือนค้างที่ "กำลังเปิด…" โดยไม่มีอะไรบอกผู้ใช้ */
    const has=await navigator.serviceWorker.getRegistration();
    if(has)return has;
    return await navigator.serviceWorker.register("./sw.js",{scope:"./"});
  }catch(e){ return null }
}
const u8=b64=>{
  const pad="=".repeat((4-b64.length%4)%4);
  const raw=atob((b64+pad).replace(/-/g,"+").replace(/_/g,"/"));
  const a=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);
  return a;
};
/* วันครบกำหนดอยู่ในเครื่อง เซิร์ฟเวอร์ไม่รู้ ต้องส่งขึ้นไปด้วยตอนสมัคร
   และส่งซ้ำทุกครั้งที่แก้วันที่ ไม่งั้นจะเตือนผิดวัน */
function pushCars(){
  try{
    return (window.garage()||[]).slice(0,6).map(c=>{
      const r=getReg(c.id)||{};
      return {id:c.id,name:c.name||"",tax:r.tax||"",act:r.act||"",ins:r.ins||"",chk:r.chk||""};
    }).filter(x=>x.tax||x.act||x.ins||x.chk);
  }catch(e){ return [] }
}
async function enableNotif(){
  if(!PUSHOK()){ notifMsg=T("เบราว์เซอร์นี้ยังไม่รองรับการแจ้งเตือน",
    "This browser doesn't support notifications"); renderNotifCard(); return }
  notifBusy=true; renderNotifCard();
  /* กันค้าง: ถ้าอะไรสักอย่างไม่ยอม resolve ปุ่มต้องกลับมากดได้เสมอ */
  const guard=setTimeout(()=>{ if(notifBusy){ notifBusy=false;
    notifMsg=T("ใช้เวลานานผิดปกติ ลองใหม่อีกครั้ง","That took too long — try again"); renderNotifCard() } },25000);
  try{
    const kr=await fetch(window.BACKEND_URL+"/api/push/key");
    const kj=await kr.json();
    if(!kj.enabled||!kj.key)throw new Error(T(
      "เซิร์ฟเวอร์ยังไม่ได้ตั้งคีย์แจ้งเตือน","The server has no notification key configured"));

    /* ถ้าอนุญาตไว้แล้วอย่าถามซ้ำ — บางเบราว์เซอร์คืน promise ที่ไม่ resolve เลย
       ปุ่มจะค้างที่ "กำลังเปิด…" ตลอดกาลโดยไม่มีข้อความบอกอะไรผู้ใช้ */
    let perm=Notification.permission;
    if(perm==="default"){
      perm=await Promise.race([
        Notification.requestPermission(),
        new Promise(r=>setTimeout(()=>r(Notification.permission),20000))
      ]);
    }
    if(perm!=="granted")throw new Error(T(
      "คุณยังไม่ได้อนุญาต ถ้าเปลี่ยนใจให้เปิดในการตั้งค่าเบราว์เซอร์",
      "Permission wasn't granted — you can turn it on in browser settings"));

    const reg=await swReg();
    if(!reg)throw new Error(T("ลงทะเบียนตัวช่วยไม่สำเร็จ","Couldn't register the service worker"));
    await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(!sub){
      try{
        sub=await reg.pushManager.subscribe({userVisibleOnly:true,
          applicationServerKey:u8(kj.key)});
      }catch(err){
        /* เบราว์เซอร์บางตัวปิด Push API ไว้ เช่นโหมดไม่ระบุตัวตน
           บอกให้ชัดดีกว่าปล่อยให้เห็นข้อความ AbortError ดิบ ๆ */
        throw new Error(T("เบราว์เซอร์นี้เปิดแจ้งเตือนไม่ได้ (โหมดไม่ระบุตัวตนหรือถูกปิดไว้) ลองหน้าต่างปกติ",
          "This browser can't enable push (incognito or disabled). Try a normal window")+
          " — "+(err&&err.message||err));
      }
    }

    await api("/api/push/subscribe",{sub:sub.toJSON(),cars:pushCars(),lang:window.lang||"th"});
    try{ await api("/api/push/test",{}) }catch(e){}
    LSt("notifOn",true); notifMsg="";
  }catch(e){ notifMsg=String(e&&e.message||e).slice(0,200) }
  clearTimeout(guard); notifBusy=false; renderNotifCard();
}
async function disableNotif(){
  try{
    const reg=await navigator.serviceWorker.getRegistration();
    const sub=reg&&await reg.pushManager.getSubscription();
    if(sub){ await api("/api/push/unsubscribe",{endpoint:sub.endpoint}); await sub.unsubscribe() }
  }catch(e){}
  LSt("notifOn",false); notifMsg=""; renderNotifCard();
}
/* วันที่เปลี่ยน ต้องซิงก์ขึ้นไปใหม่ ไม่งั้นเซิร์ฟเวอร์ยังเตือนตามของเก่า */
async function syncPush(){
  if(!LG("notifOn",false)||!PUSHOK())return;
  try{
    const reg=await navigator.serviceWorker.getRegistration();
    const sub=reg&&await reg.pushManager.getSubscription();
    if(!sub)return;
    await api("/api/push/subscribe",{sub:sub.toJSON(),cars:pushCars(),lang:window.lang||"th"});
  }catch(e){}
}
window.spireSyncPush=syncPush;

let notifBusy=false,notifMsg="";
function notifCard(){
  const on=LG("notifOn",false);
  const perm=("Notification" in window)?Notification.permission:"unsupported";
  const canInstall=!!installEvt&&!isStandalone();
  const iosNeedsInstall=/iP(hone|ad|od)/.test(navigator.userAgent)&&!isStandalone();

  return `<div class="lg-card" id="lgNotif">
    <div class="lg-head"><div class="tx"><small>${T("ไม่ต้องจำเอง","Stop remembering")}</small>
      <b>${T("ให้ SpireONE เตือนคุณ","Let SpireONE remind you")}</b></div></div>
    <p class="lg-sub">${T(
      "เปิดครั้งเดียว แล้วเราจะเตือนก่อนภาษีหรือ พ.ร.บ. หมด ล่วงหน้า 30 วัน 7 วัน และวันครบกำหนด แม้ไม่ได้เปิดเว็บไว้",
      "Turn it on once and we'll warn you 30 days, 7 days and on the day before tax or insurance lapses — even with the site closed")}</p>

    ${iosNeedsInstall?`<div class="lg-tip"><i class="ti ti-device-mobile"></i>${T(
      "บน iPhone ต้องกด แชร์ → เพิ่มไปยังหน้าจอโฮม ก่อน แล้วเปิดจากไอคอนนั้นถึงจะเปิดแจ้งเตือนได้",
      "On iPhone, tap Share → Add to Home Screen first, then open it from that icon to enable notifications")}</div>`:""}

    ${canInstall?`<div class="lg-keep">
      <span><i class="ti ti-download"></i>${T("ติดตั้งลงหน้าจอโฮม","Install to your home screen")}
        <b>${T("เปิดเร็วขึ้น ใช้ได้แม้เน็ตหลุด","Opens faster, works offline")}</b></span>
      <button class="btn primary" id="lgInstall">${T("ติดตั้ง","Install")}</button>
    </div>`:isStandalone()?`<div class="lg-keep"><span><i class="ti ti-check"></i>
      ${T("ติดตั้งไว้แล้ว","Installed")}</span></div>`:""}

    <div class="lg-keep">
      <span><i class="ti ti-bell"></i>${T("แจ้งเตือนก่อนถึงกำหนด","Reminders before things lapse")}
        <b>${on&&perm==="granted"?T("เปิดอยู่","On")
          :perm==="denied"?T("ถูกบล็อกไว้","Blocked"):T("ยังไม่ได้เปิด","Off")}</b></span>
      ${on&&perm==="granted"
        ? `<button class="btn" id="lgNotifOff">${T("ปิด","Turn off")}</button>`
        : `<button class="btn primary" id="lgNotifOn" ${notifBusy?"disabled":""}>${
            notifBusy?T("กำลังเปิด…","Turning on…"):T("เปิดแจ้งเตือน","Turn on")}</button>`}
    </div>

    ${perm==="denied"?`<div class="lg-tip"><i class="ti ti-lock"></i>${T(
      "เบราว์เซอร์บล็อกการแจ้งเตือนของเว็บนี้ไว้ ต้องไปปลดในการตั้งค่าเว็บไซต์ก่อน",
      "Your browser has blocked notifications for this site — unblock it in site settings first")}</div>`:""}
    ${notifMsg?`<div class="lg-err"><i class="ti ti-alert-triangle"></i>${esc(notifMsg)}</div>`:""}
    <p class="lg-note">${T(
      "เราส่งเรื่องที่ด่วนที่สุดวันละไม่เกินหนึ่งครั้ง ไม่มีโฆษณา ปิดเมื่อไหร่ก็ได้",
      "At most one message a day, always the most urgent thing. No marketing. Turn it off any time.")}</p>
  </div>`;
}
function renderNotifCard(){
  const box=$("lgNotifBox"); if(!box)return;
  box.innerHTML=notifCard();
  const i=$("lgInstall");
  if(i)i.onclick=async()=>{
    if(!installEvt)return;
    installEvt.prompt();
    try{ await installEvt.userChoice }catch(e){}
    installEvt=null; renderNotifCard();
  };
  const on=$("lgNotifOn"); if(on)on.onclick=enableNotif;
  const off=$("lgNotifOff"); if(off)off.onclick=disableNotif;
}

/* ══════════ ทางเข้า ══════════ */
function openQuote(which){
  if(which&&TOOLS.some(x=>x.k===which))tool=which;
  try{ window.switchView("quote") }catch(e){}
  renderTool();
  const v=$("v-quote"); if(v){const s=v.querySelector(".scroll"); if(s)s.scrollTop=0}
}
window.openQuote=openQuote;
window.openTool=openQuote;

function mountView(){
  if($("v-quote"))return;
  const main=D.querySelector(".main"); if(!main)return;
  const t=D.createElement("template"); t.innerHTML=quoteView().trim();
  main.appendChild(t.content.firstChild);
}
/* ปุ่มเข้าใช้งานทั้งหมดย้ายไปอยู่ในจอเลื่อนของห้องนักบินและปุ่ม + ข้างช่องพิมพ์
   เลิกยัดซ้ำเข้า .qa-grid เพราะเคยมีสองที่แล้วผู้ใช้งงว่าอันไหนคืออันเดียวกัน */
function mountEntry(){}
D.addEventListener("click",e=>{
  const b=e.target.closest("[data-lgopen]");
  if(b){e.preventDefault();openQuote(b.dataset.lgopen!=="1"?b.dataset.lgopen:null)}
});

/* เตือนบนหน้าแรกเมื่อใกล้ครบกำหนด — เป็นเหตุผลให้เปิดแอปแม้รถไม่มีปัญหา */
window.spireRenewChips=()=>{
  const c=car(); if(!c)return [];
  return dueSoon(c).slice(0,2).map(x=>({
    t:x.left<0?T(`${x.th}เลยกำหนด`,`${x.en} overdue`)
      :T(`${x.th}อีก ${x.left} วัน`,`${x.en} in ${x.left}d`),
    hot:x.left<=7}));
};
window.spireRenewList=()=>{const c=car(); return c?renewals(c):[]};

function boot(){
  swReg(); syncPush();
  mountView(); mountEntry(); renewWidget(false); renderNext();
  if($("v-quote")&&$("v-quote").classList.contains("active"))renderTool();
}
if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",boot); else boot();
setTimeout(boot,700);
setInterval(()=>{ mountEntry(); addRenewToggle(); renewWidget(true); renderNext() },5000);
})();
