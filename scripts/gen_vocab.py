#!/usr/bin/env python3
"""Extrae el vocabulario de una o más clases a chino/vocab.json (corpus del buscador y de la pizarra).

Toma las filas de las tablas Hanzi | Pinyin | Español cuyo hanzi es una PALABRA
(1 a 4 caracteres, sin puntuación de frase), con la sección donde aparece
(anchor = id del <h2> anterior). Reemplaza las entradas previas de esa misma clase,
así que se puede correr de nuevo sin duplicar.

  python3 scripts/gen_vocab.py chino/intermedio1/clase07.html [más clases…]
  python3 scripts/gen_vocab.py --dry chino/intermedio1/clase03.html   # solo muestra
"""
import html
import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'chino')
LEVELS = {'basico1': 'B1', 'basico2': 'B2', 'basico3': 'B3', 'intermedio1': 'I1'}
HAN = re.compile(r'[㐀-鿿]')
PUNCT = re.compile(r'[。？！，、；：…?!,]')


def text(frag):
    frag = re.sub(r'<span class="(hsk\d|beyond)">.*?</span>', '', frag)   # badges de nivel
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', frag))).strip()


def extract(path):
    rel = os.path.relpath(os.path.abspath(path), ROOT)
    base, fname = rel.split(os.sep)[0], os.path.basename(rel)
    num = re.search(r'(\d+)', fname).group(1)
    src = f'{LEVELS[base]} Clase {num}'
    page = open(path, encoding='utf-8').read()
    heads = [(m.start(), m.group(1), text(m.group(2))) for m in re.finditer(r'<h2 id="(s\d+)"[^>]*>(.*?)</h2>', page, re.S)]
    out, seen = [], set()
    for m in re.finditer(r'<tr><td class="hz"[^>]*>(.*?)</td><td class="pinyin-col">(.*?)</td><td>(.*?)</td></tr>', page, re.S):
        hz, py, es = text(m.group(1)), text(m.group(2)), text(m.group(3))
        if not (1 <= len(HAN.findall(hz)) <= 4) or PUNCT.search(hz) or ' ' in hz or '/' in hz or '=' in hz or hz in seen:
            continue
        seen.add(hz)
        sec = next(((sid, t) for pos, sid, t in reversed(heads) if pos < m.start()), (None, ''))
        section = re.sub(r'^[^\w㐀-鿿«¿¡]+', '', sec[1]).strip()   # sin los emojis del inicio
        out.append({'hz': hz, 'py': py, 'es': es, 'src': src, 'base': base,
                    **({'anchor': sec[0], 'section': section} if sec[0] else {})})
    return src, out


def main():
    args = [a for a in sys.argv[1:] if a != '--dry']
    dry = '--dry' in sys.argv
    vpath = os.path.join(ROOT, 'vocab.json')
    vocab = json.load(open(vpath, encoding='utf-8'))
    for path in args:
        src, entries = extract(path)
        old = sum(1 for e in vocab if e.get('src') == src)
        print(f'{src}: {len(entries)} entradas (antes {old})')
        if dry:
            for e in entries[:12]:
                print('  ', e['hz'], e['py'], '·', e['es'][:50], '·', e.get('anchor'))
            continue
        vocab = [e for e in vocab if e.get('src') != src] + entries
    if not dry:
        with open(vpath, 'w', encoding='utf-8') as f:   # mismo formato del archivo: una entrada por línea
            f.write('[\n' + ',\n'.join(json.dumps(e, ensure_ascii=False, separators=(',', ':')) for e in vocab) + '\n]\n')
        print(f'vocab.json: {len(vocab)} entradas')


if __name__ == '__main__':
    main()
