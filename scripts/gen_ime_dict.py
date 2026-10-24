#!/usr/bin/env python3
"""Genera chino/ime-dict.txt: el diccionario del predictor pinyin→hanzi de la pizarra v6.

Cruza CC-CEDICT (palabra + pinyin + glosa en inglés, CC BY-SA 4.0) con las
frecuencias del diccionario de jieba (MIT) y deja las ~N palabras más usadas.

    curl -LO https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.zip && unzip cedict_1_0_ts_utf-8_mdbg.zip
    curl -LO https://raw.githubusercontent.com/fxsjy/jieba/master/jieba/dict.txt
    python3 scripts/gen_ime_dict.py cedict_ts.u8 dict.txt [--max 60000]

Formato (una palabra por línea, ordenado por frecuencia descendente):
    hanzi \t pinyin numerado (sílabas con espacio, ü = v) \t frecuencia \t glosa inglesa corta
"""
import argparse, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'chino' / 'ime-dict.txt'
HAN = re.compile(r'^[㐀-鿿]+$')
LINE = re.compile(r'^(\S+) (\S+) \[([^\]]+)\] /(.+)/$')
# Lectura principal de los polífonos de uso gramatical (casi nunca forman palabras, así que
# el reparto por palabras compuestas los subestima). Las otras lecturas quedan al 5 %.
PRIMARY = {'的': 'de5', '了': 'le5', '得': 'de5', '着': 'zhe5', '地': 'di4', '么': 'me5', '吗': 'ma5',
           '呢': 'ne5', '吧': 'ba5', '啊': 'a5', '和': 'he2', '还': 'hai2', '都': 'dou1', '要': 'yao4',
           '会': 'hui4', '没': 'mei2', '为': 'wei4', '长': 'chang2', '行': 'xing2', '只': 'zhi3',
           '觉': 'jue2', '好': 'hao3', '看': 'kan4', '说': 'shuo1', '个': 'ge4', '一': 'yi1', '不': 'bu4',
           '少': 'shao3', '大': 'da4', '中': 'zhong1', '处': 'chu4', '便': 'bian4', '乐': 'le4', '重': 'zhong4'}
# Frases muy comunes de clase que jieba no trae como palabra (y el predictor partiría mal).
EXTRA = [('你好吗', 'ni3 hao3 ma5', 'how are you?'), ('您好', 'nin2 hao3', 'hello (polite)'),
         ('好吧', 'hao3 ba5', 'OK then'), ('好的', 'hao3 de5', 'OK'), ('是吗', 'shi4 ma5', 'really?'),
         ('对吧', 'dui4 ba5', 'right?'), ('走吧', 'zou3 ba5', "let's go"), ('接电话', 'jie1 dian4 hua4', 'to answer the phone'),
         ('打电话', 'da3 dian4 hua4', 'to make a phone call'), ('回电话', 'hui2 dian4 hua4', 'to call back'),
         ('你呢', 'ni3 ne5', 'and you?'), ('我也是', 'wo3 ye3 shi4', 'me too'), ('不客气', 'bu4 ke4 qi5', "you're welcome"),
         ('没关系', 'mei2 guan1 xi5', "it doesn't matter"), ('不用了', 'bu4 yong4 le5', 'no need'),
         ('接朋友', 'jie1 peng2 you5', 'to pick up a friend'), ('接人', 'jie1 ren2', 'to pick sb up')]
SKIP_GLOSS = re.compile(r'^(old |archaic |)variant of|^see [^ ]+$|^used in |^Japanese variant|^erhua variant', re.I)


def short_gloss(defs):
    keep = [d for d in defs if not SKIP_GLOSS.search(d) and not d.startswith('CL:')]
    if not keep:
        return None
    g = '; '.join(keep[:2])
    g = re.sub(r'\[[^\]]*\]', '', g)          # quitar pinyin entre corchetes de las referencias
    g = re.sub(r'\s+', ' ', g).strip()
    return g[:40]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cedict'); ap.add_argument('jieba')
    ap.add_argument('--max', type=int, default=40000)
    a = ap.parse_args()

    freq = {}
    for ln in open(a.jieba, encoding='utf-8'):
        p = ln.split()
        if len(p) >= 2 and p[1].isdigit():
            freq[p[0]] = max(freq.get(p[0], 0), int(p[1]))

    rows = {}   # (hz, py) → [freq, gloss]
    for ln in open(a.cedict, encoding='utf-8'):
        if ln.startswith('#'):
            continue
        m = LINE.match(ln.strip())
        if not m:
            continue
        _, hz, py, defs = m.groups()
        n = len(hz)
        if not HAN.match(hz) or n > 6:
            continue
        g = short_gloss(defs.split('/'))
        if g is None:
            continue
        sylls = py.split()
        if len(sylls) != n or not all(re.match(r'^[a-zA-Z:]+[1-5]$', s) for s in sylls):
            continue
        proper = py[0].isupper()
        py = py.lower().replace('u:', 'v')
        f = freq.get(hz, 0)
        if n == 1:
            f = max(f, 1)                          # todos los caracteres sueltos entran
        if f == 0:
            continue
        if proper:
            f = f // 4                             # nombres propios / apellidos: abajo
        if g.lower().startswith('surname'):
            f = max(1, f // 20)
        k = (hz, py)
        if k not in rows or rows[k][0] < f:
            rows[k] = [f, g]

    for hz, py, g in EXTRA:
        rows[(hz, py)] = [max(40000, rows.get((hz, py), [0])[0]), g]

    # Polifonía: jieba da una sola frecuencia por palabra (的 de5 = 的 di1). Se reparte según
    # cuánto aparece cada lectura del carácter dentro de palabras de 2+ caracteres.
    share = {}   # (carácter, sílaba) → peso
    for (hz, py), (f, _) in rows.items():
        if len(hz) > 1:
            for ch, sy in zip(hz, py.split()):
                share[(ch, sy)] = share.get((ch, sy), 0) + f
    by_hz = {}
    for (hz, py) in rows:
        by_hz.setdefault(hz, []).append(py)
    for hz, pys in by_hz.items():
        if len(pys) < 2:
            continue
        if hz in PRIMARY and PRIMARY[hz] in pys:
            for py in pys:
                if py != PRIMARY[hz]:
                    rows[(hz, py)][0] = max(1, rows[(hz, py)][0] // 20)
            continue
        w = {py: 1 + sum(share.get((ch, sy), 0) for ch, sy in zip(hz, py.split())) for py in pys}
        tot = sum(w.values())
        for py in pys:
            rows[(hz, py)][0] = max(1, int(rows[(hz, py)][0] * w[py] / tot))

    out = sorted(rows.items(), key=lambda kv: -kv[1][0])[:a.max]
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write('# CC-CEDICT (CC BY-SA 4.0, mdbg.net) + frecuencias de jieba (MIT) · scripts/gen_ime_dict.py\n')
        for (hz, py), (f, g) in out:
            fh.write(f'{hz}\t{py}\t{f}\t{g}\n')
    print(f'{OUT.relative_to(ROOT)}: {len(out)} palabras, {OUT.stat().st_size // 1024} KB', file=sys.stderr)


if __name__ == '__main__':
    main()
