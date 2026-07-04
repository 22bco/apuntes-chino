#!/usr/bin/env python3
"""Validador de integridad del sitio de apuntes de chino.

Chequea invariantes que históricamente rompían en producción y sale con código
distinto de 0 si algo falla (para usarse en CI). Solo stdlib.

Uso:
    python3 scripts/check_site.py            # desde la raíz del repo

Chequeos:
  1. AUDIO   — cada texto en td.hz/span.hz con audio en mapping.json apunta a un
               MP3 que existe. (Textos sin entrada en mapping.json solo avisan.)
  2. LINKS   — ningún HTML usa el prefijo /chino/ (nginx sirve desde chino/).
  3. HSK1    — el campo `clases` de hsk1-data.json apunta a clases existentes.
  4. JSON    — todos los .json del repo parsean.
  5. SECRETS — ningún archivo versionado contiene una API key (sk_...).
"""
import glob
import json
import os
import re
import subprocess
import sys

HZ_RE = re.compile(r'<(?:td|span) class="hz">(.*?)</(?:td|span)>', re.DOTALL)
TAG_RE = re.compile(r"<[^>]+>")
CHINO_LINK_RE = re.compile(r'(?:href|src)="/chino/')
SECRET_RE = re.compile(r"sk_[A-Za-z0-9]{20,}")
MAX_LEN = 40

AUDIO_DIR = os.path.join("chino", "audio")
MAPPING_PATH = os.path.join(AUDIO_DIR, "mapping.json")

errors = []
warnings = []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def tracked_files():
    """Archivos versionados por git (para no escanear audios/venv/etc.)."""
    try:
        out = subprocess.check_output(
            ["git", "ls-files"], text=True, stderr=subprocess.DEVNULL
        )
        return [f for f in out.splitlines() if f]
    except Exception:
        # Fallback: recorrer el árbol
        res = []
        for root, _dirs, files in os.walk("."):
            if "/.git" in root:
                continue
            for fn in files:
                res.append(os.path.join(root, fn).lstrip("./"))
        return res


def html_files(files):
    return [f for f in files if f.endswith(".html")]


def check_audio(html_paths, mapping):
    missing_files = 0
    for path in html_paths:
        try:
            html = open(path, encoding="utf-8").read()
        except OSError:
            continue
        for raw in HZ_RE.findall(html):
            text = TAG_RE.sub("", raw).strip()
            if not text or len(text) > MAX_LEN:
                continue
            fname = mapping.get(text)
            if fname is None:
                continue  # sin audio aún: no es error duro
            if not os.path.exists(os.path.join(AUDIO_DIR, fname)):
                err(f"AUDIO: {path}: {text!r} → {fname} no existe en {AUDIO_DIR}/")
                missing_files += 1
    return missing_files


def check_links(html_paths):
    # La regla "sin prefijo /chino/" solo aplica a archivos DENTRO de chino/,
    # que se despliegan a chino.basti.cl (donde el root del nginx = chino/).
    # El portal raíz (index.html) y otras carpetas sí usan /chino/ legítimamente.
    for path in html_paths:
        if not path.startswith("chino/"):
            continue
        try:
            html = open(path, encoding="utf-8").read()
        except OSError:
            continue
        for m in CHINO_LINK_RE.finditer(html):
            line = html[: m.start()].count("\n") + 1
            err(f"LINK: {path}:{line}: usa prefijo /chino/ (debe ser / a secas)")


def check_hsk1(files):
    path = os.path.join("chino", "hsk1", "hsk1-data.json")
    if not os.path.exists(path):
        return
    data = json.load(open(path, encoding="utf-8"))
    words = data.get("palabras") if isinstance(data, dict) else data
    if not isinstance(words, list):
        return
    referenced = set()
    for w in words:
        clases = w.get("clases") if isinstance(w, dict) else None
        if isinstance(clases, list):
            referenced.update(str(c) for c in clases)
        elif isinstance(clases, str):
            referenced.add(clases)
    # Las referencias son rutas relativas a chino/ SIN extensión, p.ej.
    # "basico3/clase03" → chino/basico3/clase03.html
    for ref in sorted(referenced):
        if "/" not in ref:
            continue  # no tiene pinta de ruta de clase
        base = ref[:-5] if ref.endswith(".html") else ref
        cand = os.path.join("chino", base + ".html")
        if not os.path.exists(cand):
            err(f"HSK1: hsk1-data.json referencia clase inexistente: {ref!r}")


def check_json(files):
    for path in files:
        if not path.endswith(".json"):
            continue
        try:
            json.load(open(path, encoding="utf-8"))
        except Exception as e:  # noqa: BLE001
            err(f"JSON: {path}: no parsea ({e})")


def check_secrets(files):
    for path in files:
        if path.endswith((".mp3", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".woff", ".woff2")):
            continue
        try:
            content = open(path, encoding="utf-8", errors="ignore").read()
        except OSError:
            continue
        for m in SECRET_RE.finditer(content):
            # Ignorar el placeholder "sk_..." de la doc
            if content[m.start():m.start() + 6] == "sk_...":
                continue
            line = content[: m.start()].count("\n") + 1
            err(f"SECRET: {path}:{line}: posible API key expuesta ({m.group()[:8]}...)")


def main():
    files = tracked_files()
    htmls = html_files(files)

    mapping = {}
    if os.path.exists(MAPPING_PATH):
        try:
            mapping = json.load(open(MAPPING_PATH, encoding="utf-8"))
        except Exception as e:  # noqa: BLE001
            err(f"JSON: {MAPPING_PATH}: no parsea ({e})")

    check_audio(htmls, mapping)
    check_links(htmls)
    check_hsk1(files)
    check_json(files)
    check_secrets(files)

    print(f"Revisados {len(htmls)} HTML, {len(files)} archivos versionados.")
    for w in warnings:
        print(f"  WARN  {w}")
    for e in errors:
        print(f"  ERROR {e}")

    if errors:
        print(f"\n❌ {len(errors)} error(es), {len(warnings)} aviso(s).")
        sys.exit(1)
    print(f"\n✅ Sin errores ({len(warnings)} aviso(s)).")


if __name__ == "__main__":
    main()
