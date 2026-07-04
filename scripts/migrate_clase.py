#!/usr/bin/env python3
"""Migra clases al CSS/JS compartido (/assets/clase.css + /assets/clase.js).

Uso:
    python3 scripts/migrate_clase.py chino/basico3/clase02.html [más.html ...]

SEGURIDAD: solo migra archivos cuyo <style> sea byte-idéntico al canónico
(basico3/clase05) y que tengan exactamente 1 <style> y 1 <script> inline con la
lógica speak+audioMap. Los que no cumplen se SALTAN con aviso (special cases →
a mano: clock widget de clase01, 5 <style> de clase06, familia basico1, etc.).

Reemplaza:
  <style>…</style>                          →  <link rel="stylesheet" href="/assets/clase.css">
  <script>…audioMap…speak…</script>         →  <script>window.audioMap = {…};</script>
                                               <script src="/assets/clase.js"></script>
Preserva el audioMap de cada página verbatim. git es el respaldo.
"""
import hashlib
import re
import sys

CANON = "chino/basico3/clase05.html"
STYLE_RE = re.compile(r"<style[^>]*>(.*?)</style>", re.DOTALL)
SCRIPT_RE = re.compile(r"<script>(.*?)</script>", re.DOTALL)  # inline (sin src)
AUDIOMAP_RE = re.compile(r"const audioMap = (\{.*?\});", re.DOTALL)


def canon_hash():
    html = open(CANON, encoding="utf-8").read()
    return hashlib.md5(STYLE_RE.findall(html)[0].encode()).hexdigest()


CANON_HASH = canon_hash()


def migrate(path):
    html = open(path, encoding="utf-8").read()
    if "/assets/clase.css" in html:
        print(f"SKIP {path}: ya migrado")
        return False
    styles = STYLE_RE.findall(html)
    if len(styles) != 1:
        print(f"SKIP {path}: {len(styles)} bloques <style> (a mano)")
        return False
    if hashlib.md5(styles[0].encode()).hexdigest() != CANON_HASH:
        print(f"SKIP {path}: <style> difiere del canónico (a mano)")
        return False
    logic = [s for s in SCRIPT_RE.findall(html) if "function speak" in s and "audioMap" in s]
    if len(logic) != 1:
        print(f"SKIP {path}: {len(logic)} scripts con lógica speak+audioMap (a mano)")
        return False
    m = AUDIOMAP_RE.search(logic[0])
    if not m:
        print(f"SKIP {path}: no se encontró 'const audioMap = {{...}}'")
        return False

    new = STYLE_RE.sub('<link rel="stylesheet" href="/assets/clase.css">', html, count=1)
    logic_block = "<script>" + logic[0] + "</script>"
    replacement = (
        "<script>window.audioMap = " + m.group(1) + ";</script>\n"
        '<script src="/assets/clase.js"></script>'
    )
    new = new.replace(logic_block, replacement, 1)
    if new == html:
        print(f"ERROR {path}: no cambió (bloque no encontrado)")
        return False
    open(path, "w", encoding="utf-8").write(new)
    print(f"OK   {path}: migrado")
    return True


if __name__ == "__main__":
    ok = sum(migrate(p) for p in sys.argv[1:])
    print(f"\n{ok}/{len(sys.argv) - 1} migrados")
