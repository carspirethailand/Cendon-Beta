/* ==========================================================================
   CONFIGURATION & DATA CONSTANTS (js/config.js)
   ========================================================================== */

// Firebase Configuration
export const fbConfig = {
  apiKey: "AIzaSyDDtvz4d4FRG_KOq5EQHmlDijU-x1FDZlQ",
  authDomain: "sp1p-82396.firebaseapp.com",
  databaseURL: "https://sp1p-82396-default-rtdb.firebaseio.com",
  projectId: "sp1p-82396",
  storageBucket: "sp1p-82396.appspot.com",
  messagingSenderId: "924479207020",
  appId: "1:924479207020:web:ec64428a61403e1ad48a49"
};

// Admin users emails
export const ADMINS = ["anapatmaliwong@gmail.com", "carspirethailand@gmail.com"];

// Google Gemini API Configuration
export const GEMINI_KEY = "AIzaSyB1P_3zw1f27UqavxyW4WW_yhFWWUJAo8c";
export const GEMINI_MODEL = "gemini-2.5-flash";

// Daily Briefing news list (fallback / default)
export const briefs = [
  {
    pill: "p-hot",
    tag: "ข่าวเด่น",
    time: "2 ชม.",
    title: "ยอดขายรถ EV ในไทยพุ่ง 40% ต้นปี 2026",
    body: "แรงหนุนจากมาตรการรัฐและรุ่นใหม่ราคาเข้าถึงง่าย"
  },
  {
    pill: "p-tech",
    tag: "เทคโนโลยี",
    time: "5 ชม.",
    title: "ระบบ ADAS รุ่นใหม่ลดอุบัติเหตุได้ถึง 27%",
    body: "งานวิจัยล่าสุดชี้ระบบช่วยขับขั้นสูงช่วยลดการชนท้าย"
  },
  {
    pill: "p-tip",
    tag: "เคล็ดลับ",
    time: "เมื่อวาน",
    title: "5 สัญญาณบอกว่าผ้าเบรกใกล้หมด",
    body: "เสียงเอี๊ยด แป้นเบรกลึก ระยะเบรกยาวขึ้น"
  },
  {
    pill: "p-ev",
    tag: "EV",
    time: "เมื่อวาน",
    title: "สถานีชาร์จทะลุ 12,000 หัวจ่ายทั่วประเทศ",
    body: "ครอบคลุมทุกจังหวัด พร้อมหัวจ่ายเร็ว 150kW"
  }
];

// Car magazines list
export const mags = [
  {
    ic: "ti-car-4wd",
    bg: "linear-gradient(135deg,#3a8c52,#1f6b32)",
    pill: "p-hot",
    tag: "รีวิว",
    title: "สปอร์ตซีดานสายพันธุ์ใหม่",
    body: "ทดสอบสมรรถนะรอบสนาม",
    issue: "ฉบับ 142"
  },
  {
    ic: "ti-battery-charging",
    bg: "linear-gradient(135deg,#2f9e7a,#1a7a5e)",
    pill: "p-ev",
    tag: "EV",
    title: "แบตเตอรี่ Solid-State มาแล้ว",
    body: "เปลี่ยนระยะทางและเวลาชาร์จไปตลอดกาล",
    issue: "ฉบับ 142"
  },
  {
    ic: "ti-tools",
    bg: "linear-gradient(135deg,#c98a2e,#9e6a1a)",
    pill: "p-tip",
    tag: "DIY",
    title: "ดูแลรถหน้าฝนด้วยตัวเอง",
    body: "เช็กลิสต์ 10 จุดก่อนลุยฝน",
    issue: "ฉบับ 142"
  },
  {
    ic: "ti-car-suv",
    bg: "linear-gradient(135deg,#3a7ce6,#2f5fd6)",
    pill: "p-tech",
    tag: "SUV",
    title: "เทียบ SUV ครอบครัว 2026",
    body: "5 รุ่นยอดนิยม คันไหนคุ้มสุด",
    issue: "ฉบับ 141"
  },
  {
    ic: "ti-engine",
    bg: "linear-gradient(135deg,#8c5a3a,#6b3f2f)",
    pill: "p-tech",
    tag: "เครื่องยนต์",
    title: "ไฮบริดยังน่าซื้อไหมปี 2026?",
    body: "เทียบต้นทุนกับ EV เต็มรูปแบบ",
    issue: "ฉบับ 141"
  },
  {
    ic: "ti-circle-dot",
    bg: "linear-gradient(135deg,#555,#333)",
    pill: "p-tip",
    tag: "ยาง",
    title: "เลือกยางให้ถูกการใช้งาน",
    body: "ยางเงียบ ยางลุย ยางประหยัด",
    issue: "ฉบับ 141"
  }
];

// Billboard Slide Data
export const bbSlides = [
  {
    tag: "TODAY'S BRIEF",
    icon: "ti-news",
    acc: "gold",
    title: "ยอดขายรถ EV ในไทยพุ่ง 40% ต้นปี 2026",
    body: "แรงหนุนจากมาตรการรัฐและรุ่นใหม่ราคาเข้าถึงง่าย ค่ายจีน-ญี่ปุ่นแข่งเดือด"
  },
  {
    tag: "NEWS",
    icon: "ti-broadcast",
    acc: "cyan",
    title: "ระบบ ADAS รุ่นใหม่ลดอุบัติเหตุได้ถึง 27%",
    body: "งานวิจัยล่าสุดชี้ระบบช่วยขับขั้นสูงช่วยลดการชนท้ายอย่างมีนัยสำคัญ"
  },
  {
    tag: "TRAFFIC",
    icon: "ti-map-2",
    acc: "green",
    title: "การจราจรวันนี้คล่องตัว · เส้นทางหลักโล่ง",
    body: "เลี่ยงทางด่วนช่วง 17:00–19:00 · มีฝนเล็กน้อยช่วงเย็น ขับระวัง"
  },
  {
    tag: "TIP",
    icon: "ti-bulb",
    acc: "gold",
    title: "5 สัญญาณบอกว่าผ้าเบรกใกล้หมด",
    body: "เสียงเอี๊ยด แป้นเบรกลึก ระยะเบรกยาวขึ้น — เช็กก่อนเป็นอันตราย"
  }
];

// Supported Car Brands List
export const BRANDS = [
  "Toyota", "Honda", "Isuzu", "Mazda", "Mitsubishi", "Nissan", "Suzuki", "Subaru", "Daihatsu", "Lexus",
  "Ford", "Chevrolet", "BMW", "Mercedes-Benz", "Audi", "Volkswagen", "Porsche", "Volvo", "MG", "BYD",
  "Tesla", "Hyundai", "Kia", "Peugeot", "Citroen", "Renault", "Fiat", "Jeep", "Land Rover", "Jaguar",
  "Mini", "Aston Martin", "Bentley", "Rolls-Royce", "Ferrari", "Lamborghini", "Maserati", "Alfa Romeo",
  "Bugatti", "McLaren", "Lotus", "Opel", "Skoda", "SEAT", "Dacia", "Chery", "Great Wall", "Haval",
  "GWM", "GAC", "Geely", "Ora", "Neta", "Aion", "Wuling", "Changan", "Dongfeng", "FAW", "Hongqi",
  "Nio", "Xpeng", "Li Auto", "Zeekr", "Polestar", "Genesis", "Acura", "Infiniti", "Cadillac", "GMC",
  "Buick", "Chrysler", "Dodge", "Ram", "Lincoln", "Tata", "Mahindra", "Proton", "Perodua", "VinFast",
  "Smart", "Saab", "Hummer", "Rivian", "Lucid", "Koenigsegg", "Pagani", "อื่นๆ"
];

// Rotating headline phrases for the Project (AI chat) landing — {th, en}
export const PROJECT_PROMPTS = [
  { th: "วันนี้รถคุณเป็นอย่างไรบ้าง?", en: "How's your car feeling today?" },
  { th: "มีอาการอะไรให้ AI ช่วยดูไหม?", en: "Any problem to solve?" },
  { th: "อยากให้ AI วินิจฉัยอะไร?", en: "What's on your mind?" },
  { th: "ลองอธิบาย ถ่ายรูป หรือส่งเสียงเครื่องมาดูสิ", en: "Describe it, snap a photo, or send a sound" },
  { th: "ให้ SpireONE AI ช่วยดูแลรถของคุณ", en: "Let SpireONE AI take care of your car" }
];

// Theme Definitions & CSS variable maps
export const THEMES = {
  kinpaku: {
    name: "คินปาคุ (ทอง)",
    accent: "oklch(84% 0.19 80.46)",
    vars: {
      "--ks-accent": "oklch(84% 0.19 80.46)",
      "--ks-accent-rich": "oklch(77% 0.13 82)",
      "--ks-accent-pale": "oklch(86% 0.07 84)"
    }
  },
  patina: {
    name: "สนิมเขียว",
    accent: "oklch(70% 0.12 188)",
    vars: {
      "--ks-accent": "oklch(70% 0.12 188)",
      "--ks-accent-rich": "oklch(62% 0.10 188)",
      "--ks-accent-pale": "oklch(82% 0.07 188)"
    }
  }
};

// Background Color Constants
export const BGS = {
  default: ["#f3ecdd", "#d9b25a"],
  sunrise: ["#fbf1e5", "#ff9a5a"],
  ocean: ["#e9f2f4", "#3ab4d6"],
  candy: ["#f7eef6", "#e06ac4"],
  forest: ["#ecf4ea", "#5aa860"],
  aurora: ["#eef0f5", "#8a6ae0"]
};
