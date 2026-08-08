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
        + glob.glob(os.path.join(CHINO, "intermedio1", "clase*.html"))
    )

    # Última clase del curso en curso (el más avanzado que exista) para "seguir estudiando"
    ultima = None
    for carpeta, etiqueta in (("intermedio1", "Intermedio 1"), ("basico3", "Básico 3")):
        archivos = sorted(glob.glob(os.path.join(CHINO, carpeta, "clase*.html")))
        if archivos:
            last = os.path.basename(archivos[-1]).replace(".html", "")
            num = re.sub(r"\D", "", last)
            ultima = {
                "href": f"/{carpeta}/{last}.html",
                "label": f"{etiqueta} · Clase {num}",
            }
            break

    vistas = sum(1 for w in hsk if w.get("clases"))
    total = len(hsk)
    pct = round(vistas / total * 100) if total else 0

    # HSK 2: objetivo de Intermedio 1 (mismo esquema que hsk1-data.json)
    hsk2_stats = None
    try:
        hsk2 = load("hsk2/hsk2-data.json")
        v2, t2 = sum(1 for w in hsk2 if w.get("clases")), len(hsk2)
        hsk2_stats = {"vistas": v2, "total": t2,
                      "pct": round(v2 / t2 * 100) if t2 else 0}
    except FileNotFoundError:
        pass

    # Palabras de vocabulario por curso (para las tarjetas de Niveles)
    words = {"b2": 0, "b3": 0, "i1": 0}
    for w in vocab:
        src = str(w.get("src", ""))
        if src.startswith("I1"):
            words["i1"] += 1
        elif src.startswith("B3"):
            words["b3"] += 1
        else:
            words["b2"] += 1

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
        "hsk2": hsk2_stats,
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
