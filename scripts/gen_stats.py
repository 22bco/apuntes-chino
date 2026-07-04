#!/usr/bin/env python3
"""Genera chino/stats.json: agregados precalculados para el dashboard.

Permite que chino/index.html cargue ~3 KB (solo stats.json) en vez de ~435 KB
(9 JSON crudos). Reejecutar cuando cambien los datos que alimentan el dashboard:
vocab.json, audio/mapping.json, hsk1/hsk1-data.json, audio/vocab_listening.json,
o al agregar/quitar clases.

Uso (desde la raíz del repo):
    python3 scripts/gen_stats.py

Solo stdlib. El validador check_site.py avisa si stats.json quedó desactualizado.
"""
import glob
import json
import os
import re

CHINO = "chino"


def load(rel):
    with open(os.path.join(CHINO, rel), encoding="utf-8") as f:
        return json.load(f)


def build_stats():
    vocab = load("vocab.json")
    mapping = load("audio/mapping.json")
    hsk = load("hsk1/hsk1-data.json")

    clase_files = (
        glob.glob(os.path.join(CHINO, "basico1", "cap*.html"))
        + glob.glob(os.path.join(CHINO, "basico2", "clase*.html"))
        + glob.glob(os.path.join(CHINO, "basico3", "clase*.html"))
    )

    # Última clase de básico 3 (curso en curso) para "seguir estudiando"
    b3 = sorted(glob.glob(os.path.join(CHINO, "basico3", "clase*.html")))
    ultima = None
    if b3:
        last = os.path.basename(b3[-1]).replace(".html", "")
        num = re.sub(r"\D", "", last)
        ultima = {"href": f"/basico3/{last}.html", "label": f"Básico 3 · Clase {num}"}

    vistas = sum(1 for w in hsk if w.get("clases"))
    total = len(hsk)
    pct = round(vistas / total * 100) if total else 0

    # Palabras de vocabulario por curso (para las tarjetas de Niveles)
    words = {"b2": 0, "b3": 0}
    for w in vocab:
        words["b3" if str(w.get("src", "")).startswith("B3") else "b2"] += 1

    # Palabra del día: lista compacta con nombre de audio ya resuelto
    wod = [
        {"h": w["hz"], "p": w["py"], "e": w["es"], "a": mapping.get(w["hz"], "")}
        for w in hsk
    ]

    return {
        "clases": len(clase_files),
        "palabras": len(vocab),
        "audios": len(mapping),
        "hsk": {"vistas": vistas, "total": total, "pct": pct},
        "ultima": ultima,
        "words": words,
        "wod": wod,
    }


def main():
    stats = build_stats()
    path = os.path.join(CHINO, "stats.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, separators=(",", ":"))
    print(
        f"stats.json: {stats['clases']} clases, {stats['palabras']} palabras, "
        f"{stats['audios']} audios, HSK {stats['hsk']['pct']}%, "
        f"{len(stats['wod'])} wod → {os.path.getsize(path)} bytes"
    )


if __name__ == "__main__":
    main()
