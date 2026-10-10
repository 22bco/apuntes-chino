#!/usr/bin/env python3
"""Genera chino/intermedio1/escritura-data.json para la página de escritura.

Recorre las clases de Intermedio 1 y toma cada fila de tabla
<td class="hz">…</td><td class="pinyin-col">…</td><td>…</td> que sea una palabra
(solo hanzi, 1-4 caracteres; se saltan las frases). Guarda la primera aparición
de cada palabra con su clase y sección.

Uso (desde la raíz del repo): python3 scripts/gen_escritura.py
"""
import glob, html, json, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', 'chino')
# cada celda no puede cruzar un </td> (así se ignoran tablas de 4 columnas, como la de «Todos los 一»)
CELL = r'((?:(?!</td>).)*)'
ROW = re.compile(rf'<tr><td class="hz">{CELL}</td><td class="pinyin-col">{CELL}</td><td>{CELL}</td></tr>', re.S)
H2 = re.compile(r'<h2 id="(s\d+)"[^>]*>(.*?)</h2>', re.S)
HAN = re.compile(r'^[㐀-鿿]{1,4}$')
TAG = re.compile(r'<[^>]+>')
BADGE = re.compile(r'<span class="(?:hsk1|hsk2|beyond)">.*?</span>')
EMOJI = re.compile('[\U0001F000-\U0001FAFF☀-➿⬀-⯿️‍⃣]')


def clean(t):
    t = BADGE.sub('', t)
    t = html.unescape(TAG.sub('', t))
    t = EMOJI.sub('', t)
    return re.sub(r'\s+', ' ', t).strip(' ·')


def main():
    seen, slides, cats = set(), [], []
    for path in sorted(glob.glob(os.path.join(ROOT, 'intermedio1', 'clase*.html'))):
        name = os.path.basename(path)
        num = re.search(r'clase(\d+)', name).group(1)
        cat = 'Clase ' + num
        src = open(path, encoding='utf-8').read()
        heads = [(m.start(), m.group(1), clean(m.group(2))) for m in H2.finditer(src)]
        n0 = len(slides)
        for m in ROW.finditer(src):
            w = clean(m.group(1))
            if not HAN.match(w) or w in seen:
                continue
            seen.add(w)
            sec = next(((sid, t) for pos, sid, t in reversed(heads) if pos < m.start()), (None, ''))
            slides.append({
                'cat': cat, 'w': w, 'py': clean(m.group(2)), 'es': clean(m.group(3)),
                'href': f'/intermedio1/{name}' + (f'#{sec[0]}' if sec[0] else ''),
                'sec': f'{cat} · §{sec[0][1:]} {sec[1]}' if sec[0] else cat,
            })
        if len(slides) > n0:
            cats.append([cat, f'{cat} ({len(slides) - n0})'])
    out = os.path.join(ROOT, 'intermedio1', 'escritura-data.json')
    chars = list(dict.fromkeys(c for s in slides for c in s['w']))  # orden de aparición, estable
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'cats': cats, 'slides': slides, 'chars': ''.join(chars)}, f, ensure_ascii=False, indent=1)
    print(f'{len(slides)} palabras, {len(chars)} caracteres distintos → {os.path.relpath(out)}')


if __name__ == '__main__':
    main()
