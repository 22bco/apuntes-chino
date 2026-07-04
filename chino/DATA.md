# DATA.md — El ecosistema de datos (JSON) de Apuntes Chino

> Mapa de los 10 archivos JSON del sitio: qué guarda cada uno, quién lo lee, quién
> lo escribe y dónde se solapan. Verificado contra los archivos y con `grep` sobre
> `.html`/`.js`/`.py`. Complementa el árbol de estructura de `CONTEXT.md`.

## Tabla resumen

| Archivo | Registros | Esquema (campos) | Consumido por | Actualizado cuándo / por quién |
|---|---|---|---|---|
| `chino/vocab.json` | 399 | lista de `{hz, py, es, src}` | `buscador-core.js`, `index.html`, `hsk1/curso.html`, `radicales.html` | A mano al cerrar cada clase (corpus del buscador). Sin generador. |
| `chino/vocab_hsk1.json` | 300 | lista de `{hz, py, es, cat, banda(150/300), audio}` | `buscador-core.js`, `index.html`, `hsk1/vocab300.html`, `hsk1/curso.html`, `lluvia.html`, `typing.html` | A mano (dataset del nivel HSK 1 3.0). Playbook "niveles HSK". |
| `chino/vocab_hsk2.json` | 198 | lista de `{hz, py, es, cat, banda:500, audio}` | `buscador-core.js`, `index.html`, `hsk2/index.html`, `radicales.html` | A mano (adelanto HSK 2). |
| `chino/vocab_hsk3.json` | 500 | lista de `{hz, py, es, cat, banda:1000, audio}` | `buscador-core.js`, `index.html`, `hsk3/index.html`, `radicales.html` | A mano (adelanto HSK 3). |
| `chino/hsk1/hsk1-data.json` | 150 | lista de `{hz, py, es, tema(01-14), clases[]}` | `hsk1/index.html`, `hsk1/quiz.html`, `hsk1/examen.html`, `hsk1/repaso.html`, `hsk1/curso.html`, `index.html`, `scripts/check_site.py` | A mano al publicar clase que toque HSK 1 (campo `clases`). Dato MAESTRO del sílabo 2.0. |
| `chino/hsk1/hsk30-lessons.json` | 15 lecciones (≈202 palabras) | dict `"1".."15"` → lista de `{hz, py, es, audio}` | `hsk1/curso30.html` (único) | A mano (mapeo palabra→lección del 新HSK教程1). |
| `chino/audio/vocab_listening.json` | 346 | lista de `{hanzi, pinyin, espanol, audio, clase}` | `listening.html`, `hsk1/examen.html`, `index.html` | A mano (frases para la herramienta de listening). Sin generador. |
| `chino/audio/mapping.json` | 3200+ | dict `texto_chino → filename.mp3` | `scripts/gen_audio.py` (escribe), `scripts/check_site.py` (valida), `buscador-core.js`, `index.html`, y todas las `hsk1/*.html` con audio | Automático por `scripts/gen_audio.py`. FUENTE DE VERDAD del audio. |
| `chino/radicales.json` | `radicales`:107, `charRads`:746, `gloss`:323, `cats`:11 | dict `{cats, radicales[], charRads, gloss}` | `buscador-core.js`, `index.html` | Extraído a mano desde `radicales.html` (que conserva copia inline). Derivado. |
| `chino/sinonimos.json` | 95 grupos | lista de listas de strings (español) | `buscador-core.js`, `index.html` | A mano (expansión de consultas del buscador). |

---

## Detalle por archivo

### `chino/vocab.json`
Corpus de vocabulario visto en las clases regulares, que alimenta el buscador general.
- **Esquema:** `{"hz":"妈妈","py":"māma","es":"Mamá","src":"Clase 01"}`
- **`src` observados:** `Clase 01`–`Clase 07` (Básico 2) + `B3 Clase 01`, `B3 Clase 02`.
- **Consumo:** `buscador-core.js` (corpus de búsqueda), `index.html`, `hsk1/curso.html`, `radicales.html`.
- **Solapa:** `hz/py/es` con TODOS los demás datasets de vocabulario.

### `chino/vocab_hsk1.json`
Las 300 palabras del HSK 1 (versión 3.0), por categoría y banda.
- **Esquema:** `{"hz":"爱","py":"ài","es":"amar, querer","cat":"verbos","banda":150,"audio":"zh_8f743c2c68.mp3"}`
- **`banda`:** 150 (núcleo) ≈ 149 palabras, 300 (ampliación) ≈ 151.
- **`cat` (12):** verbos, pronombres, particulas, tiempo, objetos, lugares, adjetivos, numeros, personas, comida, familia, expresiones.
- **`audio`:** los 300 valores coinciden con valores de `mapping.json` (copia denormalizada del nombre de MP3).
- **Consumo:** buscador, dashboard, `vocab300.html`, `curso.html`, y los juegos `lluvia.html`/`typing.html`.

### `chino/vocab_hsk2.json` y `chino/vocab_hsk3.json`
Mismo esquema que `vocab_hsk1` (`hz,py,es,cat,banda,audio`), palabras NUEVAS de cada nivel.
- **HSK 2:** 198 registros, `banda:500`.
- **HSK 3:** 500 registros, `banda:1000`.
- **Consumo:** su `hskN/index.html`, más buscador + dashboard + `radicales.html`.

### `chino/hsk1/hsk1-data.json` — dato MAESTRO del sílabo 2.0
Las 150 palabras oficiales HSK 1 (2.0) con su tema dueño y trazabilidad de clases.
- **Esquema:** `{"hz":"爱","py":"ài","es":"amar / encantar","tema":"12","clases":["basico3/clase03","basico3/clase04"]}`
- **NO tiene** campo `audio` (a diferencia de `vocab_hskN`).
- **`tema` (01-14):** dueño de la página temática.
- **`clases[]`:** dónde se vio la palabra (rutas relativas a `chino/`, SIN `.html`); `check_site.py` valida que cada ref apunte a una clase existente. El tracker de cobertura del hub y el % del dashboard se calculan de aquí.
- **Actualización:** al publicar una clase que toque HSK 1, se edita `clases` (regla en CLAUDE.md/CONTEXT.md).

### `chino/hsk1/hsk30-lessons.json`
Vocabulario del libro 新HSK教程1 (FLTRP, 3.0) agrupado por lección.
- **Esquema:** dict `"1".."15"` → lista de `{hz, py, es, audio}`.
- **Consumo:** ÚNICO — `hsk1/curso30.html`.
- **Solapa:** `hz/py/es` con `vocab_hsk1.json` y `hsk1-data.json`; `audio` con `mapping.json`.

### `chino/audio/vocab_listening.json`
Frases completas para la herramienta de comprensión auditiva.
- **⚠️ Nombres de campo DISTINTOS** al resto: `hanzi/pinyin/espanol` (no `hz/py/es`).
- **Esquema:** `{"hanzi":"我会说汉语","pinyin":"Wǒ huì shuō Hànyǔ","espanol":"Yo sé hablar chino","audio":"zh_624aa515a6.mp3","clase":"clase01"}`
- **Contenido:** oraciones, no palabras sueltas.
- **Consumo:** `listening.html`, `hsk1/examen.html`, `index.html`.

### `chino/audio/mapping.json` — FUENTE DE VERDAD del audio
- **Esquema:** dict plano `texto_chino → nombre_archivo.mp3`. Coexisten dos convenciones de nombre: `zh_{md5[:10]}.mp3` (dominante) y `{texto}_{md5[:10]}.mp3` (83 archivos antiguos).
- **Escritor:** `scripts/gen_audio.py` (extrae `hz` del HTML, genera MP3 con ElevenLabs Lily, agrega la entrada). **Validador:** `scripts/check_site.py`.
- Todo campo `audio` de los otros JSON es una copia de un valor de este mapa.

### `chino/radicales.json` — derivado de `radicales.html`
- **Esquema:** dict con 4 claves:
  - `radicales` (107): `{hz, variant, py, es, strokes, cat, level, note, ej[]}`
  - `charRads` (746): `carácter → [radicales]`
  - `gloss` (323): `carácter → [pinyin, español]`
  - `cats` (11): `clave → {emoji, label, color}`
- **Consumo:** `buscador-core.js`, `index.html`. `radicales.html` mantiene su propia copia inline → si cambia el HTML hay que regenerar el JSON (fuente real = el HTML). Ver PLAN-MEJORAS 1.3.

### `chino/sinonimos.json`
Grupos de sinónimos en español para expandir consultas del buscador.
- **Esquema:** lista de listas de strings. Ej.: `["bonito","lindo","hermoso","guapo","bello","precioso"]` (95 grupos).
- **Consumo:** `buscador-core.js`, `index.html`. No contiene chino.

---

## Solapamientos y riesgos de sincronía

Una misma palabra HSK 1 puede vivir en **hasta 5 archivos a la vez**, cada uno con su propia glosa:

**Ejemplo real — 爱 (`ài`):**
| Archivo | Glosa `es` | Campos propios |
|---|---|---|
| `hsk1-data.json` | **"amar / encantar"** | `tema`, `clases` |
| `vocab_hsk1.json` | **"amar, querer"** | `cat`, `banda`, `audio` |
| `vocab.json` | (si visto en clase) | `src` |
| `hsk30-lessons.json` | (si en lección 3.0) | agrupado por lección, `audio` |
| `mapping.json` | — | `texto → mp3` |

➡️ Las dos glosas de 爱 **ya divergieron** ("encantar" vs "querer"). No hay proceso que las reconcilie: cada edición manual puede aumentar la deriva.

**Solapamientos concretos:**
- **`hz/py/es`** se repite en `vocab.json`, `vocab_hsk1/2/3.json`, `hsk1-data.json`, `hsk30-lessons.json` (y como `hanzi/pinyin/espanol` en `vocab_listening.json`). Overlaps medidos: `vocab_hsk1 ∩ hsk1-data` = 144/150; `vocab.json ∩ vocab_hsk1` = 137; `vocab.json ∩ hsk1-data` = 83.
- **`audio`** (nombre de MP3) está denormalizado en `vocab_hsk1/2/3.json` y `hsk30-lessons.json`, y también inline en los `audioMap` de cada HTML. Todos son copias de `mapping.json`.
- **Nombres de campo inconsistentes:** `vocab_listening.json` usa `hanzi/pinyin/espanol`; todo lo demás usa `hz/py/es`.

**Fuente de verdad por responsabilidad (a respetar al editar):**
| Concepto | Fuente única | Los demás copian |
|---|---|---|
| Texto chino → archivo MP3 | **`mapping.json`** (via `gen_audio.py`) | campos `audio` de vocab_hskN, hsk30-lessons, audioMaps inline |
| Cobertura del sílabo HSK 1 (2.0) + trazabilidad de clases | **`hsk1-data.json`** | tracker del hub, % del dashboard |
| Listas por banda + categoría (HSK 1 300 / 2 / 3) | **`vocab_hsk1/2/3.json`** | `vocab300.html`, juegos, buscador |
| Vocabulario cronológico de clases (buscador) | **`vocab.json`** | — |
| Frases de listening | **`vocab_listening.json`** | — |
| Radicales / glosas / char→radical | **`radicales.html` (inline)** → derivado `radicales.json` | buscador, dashboard |
| Sinónimos de búsqueda | **`sinonimos.json`** | — |

**Riesgo principal:** no existe una capa que sincronice `py/es` entre `hsk1-data.json` y `vocab_hsk1.json` (144 palabras compartidas). Mejora futura: elegir uno como maestro de glosa HSK 1 y derivar el otro, o añadir un validador en `check_site.py` que marque divergencias `py/es` para el mismo `hz`.
