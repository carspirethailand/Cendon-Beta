#!/usr/bin/env python3
"""ฟอนต์ไอคอนเฉพาะที่แอปใช้ (Tabler Icons 3.31.0, MIT) → icons/ti.woff2 + icons/ti.css

ทำไม: เดิมโหลดฟอนต์ไอคอนเต็มชุด (820KB + CSS 248KB) จาก CDN แบบไม่รอ ทุกครั้งที่เปลี่ยนหน้า
ไอคอน (กระดิ่ง เมนู) จึงหายแวบแล้วค่อยโผล่ และข้อความเลื่อน — ชุดนี้เล็ก (~85KB) โหลดจากเว็บเราเองก่อนวาดเฟรมแรก

ใช้เมื่อเพิ่มไอคอนใหม่ในโค้ด (เทสต์ icons-subset จะฟ้องถ้าลืม):
  pip install fonttools brotli
  npm pack @tabler/icons-webfont@3.31.0 && tar xzf tabler-icons-webfont-3.31.0.tgz   (นอกโฟลเดอร์ repo)
  python3 tools/icons-subset.py /path/to/package/dist [/path/to/spireone-backend/src]
แล้วเปลี่ยน ?v= ของ icons/ti.css และ icons/ti.woff2 ในหน้าเว็บ + sw.js ตามที่สคริปต์บอก (เป็นแฮชของไฟล์)
"""
import hashlib, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dist = sys.argv[1]
extra = sys.argv[2:]  # โฟลเดอร์อื่นที่ส่งชื่อไอคอนมาให้หน้าเว็บ เช่น หลังบ้าน
css = open(os.path.join(dist, 'tabler-icons.css'), encoding='utf8').read()
names = dict(re.findall(r'\.ti-([a-z0-9-]+):before\s*\{\s*content:\s*"\\([0-9a-f]+)"', css))

def used_in(text):
    found = set()
    # ti-ชื่อ (ตัดส่วนที่ต่อท้ายด้วย template ออก) + ชื่อเปล่าในเครื่องหมายคำพูด (เช่น ti-${ok?"check":"x"})
    for m in re.finditer(r'(?<![A-Za-z0-9_-])ti-([a-z0-9]+(?:-[a-z0-9]+)*)', text):
        parts = m.group(1).split('-')
        for k in range(len(parts), 0, -1):
            if '-'.join(parts[:k]) in names:
                found.add('-'.join(parts[:k])); break
    found |= {m.group(1) for m in re.finditer(r'["\'`]([a-z0-9]+(?:-[a-z0-9]+)*)["\'`]', text) if m.group(1) in names}
    return found

def files(top, deep):
    for d, sub, fs in os.walk(top):
        sub[:] = [s for s in sub if deep and s not in ('node_modules', '.git', 'test', 'tools', 'icons', 'fonts')]
        for f in fs:
            if f.endswith(('.html', '.js', '.mjs', '.css')) and f != 'ti.css':
                yield os.path.join(d, f)

use = set()
for f in list(files(ROOT, False)) + [p for e in extra for p in files(e, True)]:
    use |= used_in(open(f, encoding='utf8', errors='ignore').read())
use = sorted(use)
cps = sorted({names[n] for n in use})
src = os.path.join(dist, 'fonts', 'tabler-icons.ttf')
out = os.path.join(ROOT, 'icons')
subprocess.run(['pyftsubset', src, '--unicodes=' + ','.join('U+' + c for c in cps), '--flavor=woff2',
                '--output-file=' + os.path.join(out, 'ti.woff2'), '--no-hinting', '--layout-features=', '--desubroutinize'], check=True)
ver = hashlib.sha256(open(os.path.join(out, 'ti.woff2'), 'rb').read()).hexdigest()[:8]
rules = ''.join('.ti-%s:before{content:"\\%s"}' % (n, names[n]) for n in use)
head = ('/* Tabler Icons 3.31.0 (MIT, https://tabler.io) — เฉพาะไอคอนที่แอปใช้ %d ตัว สร้างด้วย tools/icons-subset.py\n'
        '   โหลดจากเว็บเราเองก่อนวาดเฟรมแรก: ไอคอนไม่หายแวบตอนเปลี่ยนหน้า */\n') % len(use)
open(os.path.join(out, 'ti.css'), 'w', encoding='utf8').write(
    head + '@font-face{font-family:"tabler-icons";font-style:normal;font-weight:400;font-display:block;src:url("ti.woff2?v=' + ver + '") format("woff2")}'
    '.ti{font-family:"tabler-icons"!important;speak:none;font-style:normal;font-weight:normal;font-variant:normal;text-transform:none;line-height:1;'
    '-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}' + rules + '\n')
json.dump(use, open(os.path.join(out, 'icons.json'), 'w'), separators=(',', ':'))
css_ver = hashlib.sha256(open(os.path.join(out, 'ti.css'), 'rb').read()).hexdigest()[:8]
print('ใส่ในหน้าเว็บ + sw.js: /icons/ti.css?v=%s และ preload /icons/ti.woff2?v=%s' % (css_ver, ver))
print('icons', len(use), 'woff2', os.path.getsize(os.path.join(out, 'ti.woff2')), 'css', os.path.getsize(os.path.join(out, 'ti.css')))
