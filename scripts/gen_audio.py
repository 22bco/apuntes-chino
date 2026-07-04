#!/usr/bin/env python3
"""Genera audios ElevenLabs (voz Lily) para el vocabulario nuevo de una o más
clases HTML y actualiza chino/audio/mapping.json + el audioMap inline del HTML.

Uso:
    export ELEVENLABS_API_KEY="sk_..."          # nunca hardcodear la key
    python3 scripts/gen_audio.py chino/basico3/clase05.html [más.html ...]

Extrae los textos de <td class="hz"> y <span class="hz">, filtra los que ya
están en mapping.json, genera los MP3 que falten y reconstruye el bloque
`const audioMap = {...}` de cada HTML.

Ejecutar desde la raíz del repo. Solo usa la stdlib (sin dependencias).
"""
import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

VOICE_ID = "pFZP5JQG7iQjIQuC4Bku"  # Lily
MODEL = "eleven_turbo_v2_5"
VOICE_SETTINGS = {"stability": 0.5, "similarity_boost": 0.75}
OUTPUT_DIR = os.path.join("chino", "audio")
MAPPING_PATH = os.path.join(OUTPUT_DIR, "mapping.json")
MAX_LEN = 40  # textos más largos casi nunca son vocabulario con audio

HZ_RE = re.compile(r'<(?:td|span) class="hz">(.*?)</(?:td|span)>', re.DOTALL)
TAG_RE = re.compile(r"<[^>]+>")
AUDIOMAP_RE = re.compile(r"const audioMap = \{[^}]*\};", re.DOTALL)


def load_mapping():
    with open(MAPPING_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_mapping(mapping):
    with open(MAPPING_PATH, "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)


def extract_texts(html):
    texts = set()
    for raw in HZ_RE.findall(html):
        clean = TAG_RE.sub("", raw).strip()
        if clean and len(clean) <= MAX_LEN:
            texts.add(clean)
    return texts


def filename_for(text):
    # Esquema ASCII-safe dominante en el repo: zh_{md5[:10]}.mp3
    return f"zh_{hashlib.md5(text.encode()).hexdigest()[:10]}.mp3"


def synth(api_key, text, dest, retries=4):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    payload = json.dumps(
        {"text": text, "model_id": MODEL, "voice_settings": VOICE_SETTINGS}
    ).encode()
    for attempt in range(retries):
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"xi-api-key": api_key, "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req) as resp:
                data = resp.read()
            with open(dest, "wb") as out:
                out.write(data)
            return True
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt < retries - 1:
                wait = 2 ** attempt
                print(f"    [{e.code}] reintento en {wait}s ({text!r})")
                time.sleep(wait)
                continue
            print(f"    [FAIL {e.code}] {text!r}: {e.reason}")
            return False
        except Exception as e:  # noqa: BLE001
            print(f"    [FAIL] {text!r}: {e}")
            return False
    return False


def rewrite_audiomap(path, html, mapping):
    """Reconstruye el bloque audioMap del HTML con los textos de esa página."""
    file_texts = sorted(
        {
            t
            for raw in HZ_RE.findall(html)
            if (t := TAG_RE.sub("", raw).strip()) and t in mapping
        }
    )
    lines = ",\n".join(f'  "{t}": "{mapping[t]}"' for t in file_texts)
    new_block = "const audioMap = {\n" + lines + "\n};"
    if AUDIOMAP_RE.search(html):
        return AUDIOMAP_RE.sub(lambda _: new_block, html, count=1)
    print(f"    [WARN] {path}: no se encontró bloque audioMap; no se modifica")
    return html


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("html", nargs="+", help="Archivo(s) HTML de clase")
    ap.add_argument(
        "--no-audiomap",
        action="store_true",
        help="No reescribir el audioMap inline (usar cuando el sitio lo cargue por fetch)",
    )
    args = ap.parse_args()

    api_key = os.environ.get("ELEVENLABS_API_KEY")

    mapping = load_mapping()

    # 1) Recolectar todos los textos nuevos de todas las páginas
    per_file = {}
    all_new = set()
    for path in args.html:
        with open(path, encoding="utf-8") as f:
            html = f.read()
        texts = extract_texts(html)
        per_file[path] = html
        all_new |= texts - set(mapping)

    new_texts = sorted(all_new)
    print(f"Textos nuevos a generar: {len(new_texts)}")

    generated = failed = 0
    if new_texts:
        if not api_key:
            print(
                "ERROR: falta ELEVENLABS_API_KEY en el entorno.\n"
                "  export ELEVENLABS_API_KEY=\"sk_...\"  (nunca hardcodear en el repo)",
                file=sys.stderr,
            )
            sys.exit(1)
        for text in new_texts:
            fname = filename_for(text)
            dest = os.path.join(OUTPUT_DIR, fname)
            print(f"  → {text!r}")
            if synth(api_key, text, dest):
                mapping[text] = fname
                generated += 1
            else:
                failed += 1
            time.sleep(0.25)
        save_mapping(mapping)

    # 2) Reescribir el audioMap de cada HTML (salvo --no-audiomap)
    if not args.no_audiomap:
        for path, html in per_file.items():
            new_html = rewrite_audiomap(path, html, mapping)
            if new_html != html:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_html)
                print(f"  audioMap actualizado: {path}")

    print(
        f"\nResumen: {generated} generados, {failed} fallos, "
        f"{len(mapping)} entradas totales en mapping.json"
    )
    if failed:
        sys.exit(2)


if __name__ == "__main__":
    main()
