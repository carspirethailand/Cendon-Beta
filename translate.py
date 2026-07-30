# -*- coding: utf-8 -*-
"""เติมคำแปลที่เหลือทั้งหมดด้วย Gemini แล้วเขียนพจนานุกรมออกมาเป็น i18n_dict.js

ทำไมต้องมีสคริปต์นี้
  ข้อความในแอปมีมากกว่าหนึ่งพันชิ้น คูณสิบสองภาษาก็เกินหมื่นคำแปล
  การนั่งพิมพ์เองทั้งหมดใช้เวลานานและพลาดง่ายกว่ามาก สคริปต์นี้จึงส่งไปให้
  โมเดลแปลเป็นชุด ๆ แล้วเก็บผลไว้ ทำงานซ้ำได้โดยไม่แปลของเดิมใหม่

วิธีใช้
  export GEMINI_KEY=<กุญแจของคุณ>
  python3 translate.py            # แปลทุกภาษาที่ยังขาด
  python3 translate.py ja ko      # เจาะเฉพาะบางภาษา

  เสร็จแล้วได้ i18n_dict.js เอาไปวางแทนของเดิมแล้ว build ใหม่

หมายเหตุ
  ผลลัพธ์ถูกเก็บใน cache_translations.json ระหว่างทาง ถ้าสคริปต์หยุดกลางคัน
  รันซ้ำได้เลย มันจะแปลต่อจากที่ค้างไว้ ไม่เริ่มใหม่ทั้งหมด
"""
import json, os, sys, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
STRINGS = os.path.join(HERE, "strings.json")          # {ไทย: อังกฤษ}
CACHE   = os.path.join(HERE, "cache_translations.json")
OUT     = os.path.join(HERE, "i18n_dict.js")

MODEL = "gemini-2.0-flash"
BATCH = 40          # ต่อคำขอหนึ่งครั้ง — ใหญ่กว่านี้โมเดลเริ่มตกบรรทัด

LANGS = {
    "en": "English", "zh": "Simplified Chinese", "ja": "Japanese",
    "ko": "Korean", "id": "Indonesian", "vi": "Vietnamese",
    "ms": "Malay", "de": "German", "fr": "French",
    "es": "Spanish", "pt": "Portuguese", "ar": "Arabic",
}

PROMPT = """You are translating the user interface of SpireONE, a car-care app.

Translate each string into {lang}. Rules:
- Keep it short — these are buttons, labels and one-line hints in a UI.
- Use the natural wording a native speaker would expect in a car app,
  not a literal word-for-word rendering.
- Keep placeholders, numbers, units and brand names exactly as they are
  (SpireONE, AI, km, ฿, %, and anything inside ${{}} or {{}}).
- Keep the same punctuation style, including the middot ·  and arrows →.
- Never translate into any language other than {lang}.

Return ONLY a JSON object mapping each input id to its translation.
"""


def gemini(key, prompt, payload):
    url = ("https://generativelanguage.googleapis.com/v1beta/models/"
           f"{MODEL}:generateContent?key={key}")
    body = {
        "contents": [{"role": "user",
                      "parts": [{"text": prompt + "\n\n" + json.dumps(payload, ensure_ascii=False)}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2},
    }
    req = urllib.request.Request(
        url, data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.loads(r.read().decode("utf-8"))
    txt = data["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(txt)


def main():
    key = os.environ.get("GEMINI_KEY", "").strip()
    if not key:
        print("ต้องตั้ง GEMINI_KEY ก่อน:  export GEMINI_KEY=...")
        return 1
    if not os.path.exists(STRINGS):
        print("ไม่เจอ strings.json — รัน build.py ก่อนเพื่อสร้างรายการข้อความ")
        return 1

    strings = json.load(open(STRINGS, encoding="utf-8"))
    cache = json.load(open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}
    want = [c for c in (sys.argv[1:] or LANGS.keys()) if c in LANGS]

    # ภาษาอังกฤษมีอยู่ในโค้ดแล้ว ไม่ต้องเสียโควตาแปลซ้ำ
    cache.setdefault("en", {})
    for th, en in strings.items():
        if en:
            cache["en"][th] = en

    for code in want:
        if code == "en":
            continue
        done = cache.setdefault(code, {})
        todo = [th for th in strings if th not in done]
        if not todo:
            print(f"{code}: ครบแล้ว ({len(done)})")
            continue
        print(f"{code}: ต้องแปลอีก {len(todo)}")
        for i in range(0, len(todo), BATCH):
            chunk = todo[i:i + BATCH]
            # ส่งเป็น id → ข้อความ เพื่อให้จับคู่กลับได้แน่นอนแม้คำแปลจะซ้ำกัน
            payload = {str(n): {"th": th, "en": strings[th] or th}
                       for n, th in enumerate(chunk)}
            for attempt in range(4):
                try:
                    got = gemini(key, PROMPT.format(lang=LANGS[code]), payload)
                    for n, th in enumerate(chunk):
                        v = got.get(str(n))
                        if isinstance(v, str) and v.strip():
                            done[th] = v.strip()
                    break
                except urllib.error.HTTPError as e:
                    wait = 5 * (attempt + 1)
                    print(f"   HTTP {e.code} — รออีก {wait}s แล้วลองใหม่")
                    time.sleep(wait)
                except Exception as e:
                    print("   พลาด:", str(e)[:90])
                    time.sleep(4)
            json.dump(cache, open(CACHE, "w", encoding="utf-8"),
                      ensure_ascii=False, indent=0)
            print(f"   {min(i + BATCH, len(todo))}/{len(todo)}")

    # ── เขียนพจนานุกรมออกมา ──
    out = {c: {k: v for k, v in cache.get(c, {}).items() if v} for c in LANGS}
    js = ('<script id="i18ndict">\n'
          "/* พจนานุกรมหลายภาษา — สร้างจาก translate.py อย่าแก้ไฟล์นี้ตรง ๆ\n"
          "   กุญแจคือข้อความไทยที่เขียนอยู่ในโค้ด ภาษาที่ยังไม่มีคำแปลจะถอยไปอังกฤษ */\n"
          "window.__SPIRE_DICT__=" +
          json.dumps(out, ensure_ascii=False, separators=(",", ":")) +
          ";\n</script>\n")
    open(OUT, "w", encoding="utf-8").write(js)
    total = sum(len(v) for v in out.values())
    print("\nเขียน i18n_dict.js แล้ว ·", len(LANGS), "ภาษา ·", total, "คำแปล")
    for c in LANGS:
        print("  %-3s %5d / %d" % (c, len(out[c]), len(strings)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
