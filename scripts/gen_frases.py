#!/usr/bin/env python3
"""Genera chino/frases.json: todas las frases de los apuntes con su traducción hecha a mano.

Lo usa la pizarra (v6) para traducir una tarjeta: si su texto coincide con una frase de
alguna clase, se toma esa traducción antes que la de Chrome. Recorre todas las clases
(basico1-3, intermedio1) y saca:
  - filas de tabla  <td class="hz">…</td><td class="pinyin-col">…</td><td>español</td>
  - líneas de diálogo  <span class="hz">…</span><br><em>pinyin — español</em>

    python3 scripts/gen_frases.py

Formato: {"我给妹妹买新衣服": "Le compro ropa nueva a mi hermana menor.", …}
La clave es solo hanzi (sin puntuación), igual que la normaliza la pizarra.
"""
import glob
import html
import json
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'chino')
OUT = os.path.join(ROOT, 'frases.json')
HAN = re.compile(r'[㐀-鿿]')
EMOJI = re.compile('[\U0001F000-\U0001FAFF☀-➿️‍⬀-⯿]')


def text(frag):
    frag = re.sub(r'<span class="(hsk\d|beyond)">.*?</span>', '', frag, flags=re.S)   # badges de nivel
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', frag))).strip()


def clean_es(es):
    es = EMOJI.sub('', es)
    es = re.sub(r'\s*\([^()]*\)', '', es)        # notas entre paréntesis: (Clase 07 §7), (con 了…)
    es = re.sub(r'\s+', ' ', es).strip(' .;—-')
    return es


def score(es):
    # preferir la que parece oración completa (mayúscula o ¿¡ al inicio), luego la más larga razonable
    return (bool(re.match(r'[¿¡A-ZÁÉÍÓÚÑ]', es)), min(len(es), 90))


def key(hz):
    return ''.join(HAN.findall(hz))


def main():
    files = sorted(glob.glob(os.path.join(ROOT, 'basico*', '*.html')) + glob.glob(os.path.join(ROOT, 'intermedio1', 'clase*.html')))
    out = {}
    for path in files:
        page = open(path, encoding='utf-8').read()
        pairs = []
        for m in re.finditer(r'<td class="hz"[^>]*>(.*?)</td>\s*<td class="pinyin-col"[^>]*>.*?</td>\s*<td[^>]*>(.*?)</td>', page, re.S):
            pairs.append((text(m.group(1)), text(m.group(2))))
        for m in re.finditer(r'<span class="hz">(.*?)</span>\s*<br>\s*<em>(.*?)</em>', page, re.S):
            em = text(m.group(2))
            if ' — ' in em:
                pairs.append((text(m.group(1)), em.split(' — ', 1)[1]))
        for hz, es in pairs:
            k, es = key(hz), clean_es(es)
            # una sola alternativa por frase: «A / B» en el hanzi no es una frase
            if not k or not es or '/' in hz or '…' in hz or '...' in hz:
                continue
            if k not in out or score(es) > score(out[k]):
                out[k] = es
    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
    print(f'chino/frases.json: {len(out)} frases de {len(files)} clases, {os.path.getsize(OUT) // 1024} KB')


if __name__ == '__main__':
    main()
