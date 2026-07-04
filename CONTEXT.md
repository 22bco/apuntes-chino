# Apuntes Chino — Contexto completo del proyecto

> Este archivo es el índice maestro del proyecto. Léelo primero para ahorrar tokens
> antes de explorar. Si algo no está aquí, explora con Glob/Grep puntuales.

---

## 🎯 Propósito
Sitio web de apuntes de chino mandarín de **Basti** (estudiante del Centro Cultural Chino).
Publicado en **chino.basti.cl** vía GitHub Actions.

---

## 📁 Estructura de archivos

```
chino/
├── index.html              # Dashboard principal (cards con todas las clases + herramientas)
├── flashcards.html         # Herramienta: flashcards interactivas
├── buscador.html           # Herramienta: buscador por hanzi/pinyin/español
├── listening.html          # Herramienta: práctica de comprensión auditiva
│
├── basico1/                # Básico 1 (diciembre 2025) — 10 capítulos + apéndice
│   ├── index.html          # Índice con cards
│   ├── index_completo.html # Versión monolítica original (backup)
│   ├── cap01.html .. cap10.html
│   └── capapendice.html
│
├── basico2/                # Básico 2 (marzo-abril 2026)
│   ├── index.html          # Índice con cards
│   ├── clase01.html .. clase09.html
│   └── clase**.pdf         # PDFs generados para imprimir/compartir
│
├── basico3/                # Básico 3 (mayo-junio 2026, en curso)
│   ├── index.html
│   └── clase01.html .. clase03.html
│
├── hsk1/                   # ⭐ HSK 1 POR TEMAS (jun 2026) — contenido reorganizado por sílabo
│   ├── index.html          # Hub con tracker de cobertura (150 chips) + "mi progreso" (SRS)
│   ├── hsk1-data.json      # DATO MAESTRO: 150 palabras {hz, py, es, tema, clases}
│   ├── hsk1.css            # CSS compartido de las 14 páginas (única sección con CSS externo)
│   ├── hsk1.js             # JS compartido (speak + botones 🔊 + toggle pinyin)
│   ├── quiz.html           # Quiz opción múltiple (hz→es, es→hz, audio→hz; por tema)
│   ├── repaso.html         # SRS Leitner 5 cajas (localStorage 'hsk1-srs') + export Anki TSV
│   ├── examen.html         # Simulacro: 30 preguntas, 3 secciones, 15 min, fallos→SRS
│   ├── guia-examen.html    # Guía de estrategia del examen HSK 1 (2.0 vs 3.0)
│   ├── curso.html          # ⭐ Guía 2.0: las 15 lecciones del HSK Standard Course 1 (clásico, 150)
│   │                       #   (sílabo factual + glosas de datos propios + links a temas/clases;
│   │                       #   contenido original, NO copia del libro con copyright)
│   ├── curso30.html        # ⭐ Guía 3.0: las 15 lecciones del 《新HSK教程1》 (FLTRP 2026, 300, azul)
│   │                       #   gramática + VOCABULARIO por lección (con audio) + links
│   ├── hsk30-lessons.json  # DATO: lección → [{hz,py,es,audio}] (mapeo palabra→lección del libro 3.0,
│   │                       #   glosado con datos del sitio; lo carga curso30.html)
│   ├── vocab300.html       # ⭐ Las 300 palabras del HSK 1 (3.0) por categoría (carga vocab_hsk1.json):
│   │                       #   12 temas, filtro núcleo-150/ampliación, audio por palabra
│   └── 01-*.html .. 14-*.html  # 14 páginas temáticas autocontenidas
│
├── hsk2/                   # HSK 2 (adelanto, jun 2026) — guía del examen + vocab nuevo
│   └── index.html          # Estructura examen 2.0/3.0, gramática nueva, ~200 palabras (carga vocab_hsk2.json)
├── hsk3/                   # HSK 3 (adelanto, jun 2026) — guía del examen + vocab nuevo
│   └── index.html          # Estructura examen (con escritura), gramática nueva, 500 palabras (carga vocab_hsk3.json)
│
├── vocab_hsk1.json         # 300 palabras HSK 1 (3.0) {hz,py,es,cat,banda 150/300,audio} — typing/lluvia
├── vocab_hsk2.json         # 198 palabras nuevas HSK 2 (banda 500)
├── vocab_hsk3.json         # 500 palabras nuevas HSK 3 (banda 1000)
│
├── radicales.html          # Herramienta: ~105 radicales con HanziWriter (trazos animados)
├── radicales.json          # ⭐ DATO COMPARTIDO: {radicales[], charRads, gloss, cats}
│                           #   extraído de radicales.html. Lo consumen buscador.html e index.html.
│                           #   ⚠️ radicales.html aún tiene su copia inline (regenerar el JSON si cambia).
├── material/               # 📚 Material de estudio HSK 1 (~230 MB, se despliega)
│   ├── index.html          # Página de material: libros + simulacros con audio
│   └── hsk1/
│       ├── libros/         # 4 PDF (Textbook, Workbook, Course, Answers)
│       └── simulacros/     # 4 mock-tests (exam.pdf + answer.pdf + audios MP3)
│
└── audio/                  # 2000+ archivos MP3 (voz Lily de ElevenLabs)
    ├── mapping.json        # Mapa texto_chino → filename.mp3
    ├── vocab_listening.json # Vocab con pinyin/español para listening tool
    └── zh_XXXXXXXXXX.mp3   # Nombres hasheados MD5 de los textos
```

---

## 📚 Clases y contenido

### Básico 1 (diciembre 2025) — 11 archivos
| Cap | Título | Tema principal |
|-----|--------|----------------|
| 01 | Introducción y Fonética | 4 tonos, iniciales, finales |
| 02 | Iniciales y Cortesía | Trazos, respeto, 3 caras del NO |
| 03 | Gramática Básica | Pronombres, 要, 吗/呢, saludos, 再见 |
| 04 | Nombres y Nacionalidades | 叫, 是, países, profesiones |
| 05 | Demostrativos y Cantidad | 这/那/哪, clasificadores, familia |
| 06 | Identidad y Cultura | 想, clasificador 本, 谁 |
| 07 | Posesión y Verbos de Estado | 的, 很, 在, 了 |
| 08 | Frases, Números y Cultura | números 0-99, 万/亿, superstición |
| 09 | La Gran Familia | árbol genealógico, edad, formalidad |
| 10 | Repaso | iniciales + vocabulario |
| apéndice | Hoja de Trucos | estructuras, partículas, clasificadores |

### Básico 2 (marzo-abril 2026) — 7 clases
| Clase | Fecha | Temas principales |
|-------|-------|-------------------|
| 01 | 7 mar 2026 | 会, 有, 的, 很 — familia, adjetivos |
| 02 | 14 mar 2026 | 怎么, 好/难, 好看/好吃, vocabulario clase |
| 03 | 21 mar 2026 | 今天几号, 星期, 去+lugar, nombres chinos, tonos, radicales |
| 04 | 28 mar 2026 | 生日, 去+lugar+verbo, 回家, 逛, tipos de lugares |
| 05 | 11 abr 2026 | 和, 想, 哪儿/做什么, 周 vs 星期, bebidas, 杯子 vs 杯 |
| 06 | 18 abr 2026 | 想 vs 要, 这/那, 多少, 块/元/人民币, números |
| 07 | 25 abr 2026 | 在+lugar+verbo, 这儿/那儿/哪儿, preposiciones (上下前后里外中旁), 正在, 的 (humanos vs cosas), profesiones, sistema educativo |

---

## 🎯 Sección HSK 1 por temas (chino/hsk1/)

Reorganización del contenido de TODAS las clases según el sílabo oficial HSK 1
(versión 2.0, 150 palabras), en 14 páginas temáticas autocontenidas:

| # | Tema | # | Tema |
|---|------|---|------|
| 01 | Pronombres y saludos | 08 | Partículas 的/了/吗/呢 |
| 02 | Identidad: 是 y 叫 | 09 | Adverbios y 和 |
| 03 | Familia y personas | 10 | Interrogativos |
| 04 | Números y dinero | 11 | Existencia y ubicación |
| 05 | Fechas y días | 12 | Verbos modales y gustos |
| 06 | La hora | 13 | Acciones y rutina |
| 07 | Clasificadores y demostrativos | 14 | Clima, comida y cosas |

**Reglas de mantenimiento:**
- `hsk1-data.json` es el dato maestro: 150 palabras con `tema` (página dueña) y
  `clases` (dónde se vieron). El tracker del hub y el % del dashboard se calculan de ahí.
- **Al publicar una clase nueva**: revisar si toca palabras/temas HSK 1 → actualizar el
  campo `clases` en hsk1-data.json y, si aporta contenido nuevo, la página del tema.
- Dirección de sincronía única: las clases son la fuente cronológica; las páginas hsk1
  son la referencia canónica. Las cajas `.seen-in` dan la trazabilidad.
- Contenido que excede el sílabo → badge `<span class="beyond">más allá de HSK 1</span>`.
- Las 14 páginas comparten `hsk1.css` y `hsk1.js` (audioMap inline por página).

---

## 🎨 Convenciones de formato HTML (clase**.html)

### Estructura fija
```html
<header> título + fecha + link a índice </header>
<nav> índice con anchor links #s1, #s2, ... </nav>
<h2 id="sX" [class="green|blue|gold|gray"]> sección </h2>
...secciones con tablas, .box, .dialog...
<div> nav previo/siguiente </div>
<button class="pinyin-toggle"> toggle pinyin </button>
<script> audioMap + function speak() + botones dinámicos </script>
```

### Cajas de contenido
- `.box.grammar` (naranja) — explicación gramatical
- `.box.structure` (rojo) — fórmula/estructura (con `<code>`)
- `.box.note` (verde) — nota / aclaración
- `.box.tip` (azul) — tip o consejo
- `.box.warn` (rosa) — advertencia o error común

### Elementos chinos
- Cada hanzi DEBE ir envuelto en `<a href="https://www.dong-chinese.com/wiki/X" target="_blank">X</a>`
- Usar `<td class="hz">` en tablas y `<span class="hz">` en prosa
- Las tablas típicas tienen columnas: **Hanzi | Pinyin | Español**
- La columna Pinyin debe tener `class="pinyin-col"` para el toggle

### Diálogos
```html
<div class="dialog">
  <div class="da"><strong>A:</strong> <span class="hz">...</span><br><em>pinyin — traducción</em></div>
  <div class="db"><strong>B:</strong> <span class="hz">...</span><br><em>...</em></div>
</div>
```

### Encabezados h2 con colores
- rojo (default), `.green`, `.blue`, `.gold`, `.gray`, `.purple`
- Alternar colores entre secciones consecutivas para variedad visual

### Emojis
- Usar emojis en las traducciones al español (🍵 té, 💴 dinero, 🇨🇳, etc.) para dar contexto visual
- No abusar ni poner en el HTML estructural

---

## 🔊 Sistema de audio (ElevenLabs)

### Credenciales
- **API Key**: en la variable de entorno `ELEVENLABS_API_KEY`.
  - ⚠️ **NUNCA** escribir la key literal en ningún archivo del repo (es público).
    Definirla en `~/.zshenv`: `export ELEVENLABS_API_KEY="sk_..."`.
  - El validador `scripts/check_site.py` falla el CI si detecta una key `sk_...`
    en cualquier archivo versionado.
- **Voice ID**: `pFZP5JQG7iQjIQuC4Bku` (Lily)
- **Model**: `eleven_turbo_v2_5`
- **Settings**: `{"stability": 0.5, "similarity_boost": 0.75}`

### Flujo para generar audios nuevos
Usar el script versionado **`scripts/gen_audio.py`** (stdlib, sin dependencias):

```bash
export ELEVENLABS_API_KEY="sk_..."          # nunca hardcodear la key en el repo
python3 scripts/gen_audio.py chino/basico3/claseXX.html [más.html ...]
```

El script hace todo el flujo automáticamente:
1. Extrae los textos de `<td class="hz">` y `<span class="hz">`
2. Filtra los que ya están en `chino/audio/mapping.json`
3. Genera el MP3 que falte con nombre `zh_{md5(text)[:10]}.mp3` (reintentos con backoff)
4. Actualiza `mapping.json`
5. Reconstruye el bloque `const audioMap = {...}` del HTML

Flag `--no-audiomap`: omite el paso 5 (usar cuando el sitio cargue el audioMap
por fetch desde mapping.json — ver PLAN-MEJORAS.md fase 1.2).

Tras generar, correr `python3 scripts/check_site.py` para validar integridad.

### JavaScript inyectado en cada clase (patrón)
```javascript
const AUDIO_BASE = '/audio/';
const audioMap = { ... };

function speak(text) {
  const file = audioMap[text];
  if (file) { new Audio(AUDIO_BASE + file).play(); return; }
  const u = new SpeechSynthesisUtterance(text); // fallback
  u.lang = 'zh-CN'; u.rate = 0.8;
  speechSynthesis.speak(u);
}

// Agrega botones 🔊 a cada td.hz y .da .hz / .db .hz
// Marca columnas pinyin con class="pinyin-col" para el toggle
```

---

## 🚀 Deploy

### GitHub Actions (`.github/workflows/deploy.yml`)
Al hacer push a `main`:
1. SSH al VPS
2. `git pull origin main`
3. `rsync -a --delete /opt/apuntes-chino/chino/ /opt/TransportesMarDelSur/static/chino/`

### nginx en el VPS
- `chino.basti.cl` apunta a `/opt/TransportesMarDelSur/static/chino/`
- Por eso los links absolutos son `/flashcards.html`, `/audio/X.mp3`, NO `/chino/...`

### URLs importantes
- Dashboard: https://chino.basti.cl/
- Listening: https://chino.basti.cl/listening.html
- Flashcards: https://chino.basti.cl/flashcards.html
- Buscador: https://chino.basti.cl/buscador.html

---

## 👤 Perfil de Basti

- Estudiante del **Centro Cultural Chino** (clases los sábados)
- Nombre chino (transliteración): **巴斯帝** (Bāsīdì)
- Cumpleaños: 22 de abril
- Sitio principal: basti.cl (apuntes en apuntes.basti.cl)

---

## 💬 Preferencias de comunicación

- **Siempre en español** (sin inglés salvo casos muy puntuales)
- **Pinyin entre paréntesis** junto a cada carácter chino en chat: `明天 (míngtiān)`
- **Links a dong-chinese.com** en los caracteres del chat cuando sea útil
- Respuestas concisas, no sobre-explicar
- Evitar jergas de programación cuando se habla del contenido de chino

---

## 📖 Referencias externas

- **Libro**: HSK Standard Course 1 (Principiante 2) — lecciones 6-7 ≈ Básico 2 clases 02-03
- **dong-chinese.com**: para ver trazos de cada carácter
- **ElevenLabs**: API key en `CONTEXT.md` (sección audio)

---

## 🛠️ Herramientas internas del sitio

### `flashcards.html`
- Tarjetas interactivas de vocabulario
- Modo práctica (voltear + clasificar) + modo imprimible

### `buscador.html`
- Busca por hanzi, pinyin o español
- Indexa **vocab.json (clases) + vocab_hsk1/2/3.json + radicales.json** → ~1250 entradas,
  deduplicadas por hanzi (una palabra fusiona su clase de origen + su banda HSK + si es radical).
- Ranking por tiers: hanzi exacto > prefijo > substring > pinyin (exacto/prefijo/sub) >
  español (palabra exacta/prefijo/sub); a igual score, lo más básico primero (clase < HSK1 < HSK2 < HSK3 < radical).
- Filtros: Todo / Clases / HSK / Radicales. Cada palabra muestra su descomposición en
  radicales (chips clicables con 🔊). Los radicales aparecen también como resultado propio.
- **Sinónimos + género/plural** (`sinonimos.json`, ~95 grupos): busca por significado equivalente
  (lindo→bonito, plata→dinero, auto→车, empleo→trabajo) y tolera plurales/género (perros, contenta).
  Tiers español: palabra exacta (6) › sinónimo (7, badge ≈) › prefijo/plural (8) › substring (9).
- **Motor compartido `buscador-core.js`** (`window.ChinoSearch`): una sola fuente de verdad para
  fuentes, índice, ranking, sinónimos y resaltado. Lo usan **`buscador.html`** (página completa,
  `engine.load()`) e **`index.html`** (desplegable top-8, `engine.build({...})` con datos ya cargados).
  API: `create()` → `{ build, load, search(q,{filter,limit}), decompose, radInfo, audioFile, counts }`.
  Tocar el ranking o `sinonimos.json` ahora cambia ambos buscadores a la vez (sin duplicación).

### `listening.html`
- Reproduce audio MP3 y el usuario escribe lo que escucha
- Usa `vocab_listening.json` como fuente

### `typing.html`
- Juego estilo TypeChinese en español: lee la palabra en español y la escribe
  en pinyin (sin tonos) o hanzi (IME); modo "opciones" inverso (hanzi → español)
- Fuente: `chino/vocab_hsk1.json` — las 300 palabras oficiales del nuevo
  HSK 3.0 nivel 1 (2026), con `cat` (12 categorías), `banda` (150 = núcleo
  clásico) y `audio` (todas tienen MP3)
- Gamificación: puntaje con combos (x2/x3), timer opcional 15 s, récords y
  repaso de errores persistentes en `localStorage.typing_hsk1`
- v3: modo ⚡ sprint 60 s, SRS ligero (intervalos 1/3/7/21 días, vencidas
  primero en la ronda) y botón compartir

### `lluvia.html`
- Arcade: palabras en español caen y se "revientan" escribiendo su pinyin
  (sin tonos) antes de que toquen el piso; 3 vidas, velocidad sube cada
  8 palabras, récord en `localStorage.lluvia_hsk1`
- Misma fuente: `vocab_hsk1.json` (núcleo 150 o las 300)

### `material/` (carpeta)
- Página de material de estudio HSK 1: libros/cuadernos oficiales (4 PDF) y 4 simulacros
  de examen (examen + respuestas + audio). Pensado para analizarlo y nutrir las páginas
  HSK 1 del sitio. ~230 MB → ojo con el tamaño del deploy.

### `hsk1/` (carpeta)
- Página de cobertura HSK1: las 150 palabras clásicas cruzadas con las clases
  donde se vieron (`hsk1-data.json`) + páginas temáticas

---

## ⚡ Tips para sesiones nuevas

1. Lee este `CONTEXT.md` primero (ahorra tokens vs explorar)
2. Lee `CLAUDE.md` para saber en qué clase estamos ahora
3. Si el usuario dice "seguimos con apuntes", mira el archivo `clase0X.html` más reciente
4. Para agregar audio, usa el patrón Python del script arriba
5. Para commit/push, Basti usa GitHub Actions → hace deploy solo
6. Si algo da 404 en chino.basti.cl → revisar que los links NO tengan prefijo `/chino/`
