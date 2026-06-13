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
│   └── 01-*.html .. 14-*.html  # 14 páginas temáticas autocontenidas
│
├── radicales.html          # Herramienta: 30 radicales con HanziWriter (trazos animados)
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
- **API Key**: `sk_0f789f0b9a6f5a985540d067b3f767f23d392d0338238d4c`
  - ⚠️ Rotar al terminar. La anterior `c3549...` ya fue rotada.
- **Voice ID**: `pFZP5JQG7iQjIQuC4Bku` (Lily)
- **Model**: `eleven_turbo_v2_5`
- **Settings**: `{"stability": 0.5, "similarity_boost": 0.75}`

### Flujo para generar audios nuevos
1. Extraer texto de `<td class="hz">` y `<span class="hz">` del HTML
2. Filtrar los que ya están en `chino/audio/mapping.json`
3. Generar MP3 con nombre `zh_{md5(text)[:10]}.mp3`
4. Actualizar `mapping.json` con `{"texto": "filename.mp3"}`
5. Actualizar `const audioMap = {...}` en `<script>` del HTML

### Script tipo para generar audios (patrón reutilizable)
```python
import re, json, urllib.request, hashlib, os, time

API_KEY = "sk_..."
VOICE_ID = "pFZP5JQG7iQjIQuC4Bku"
MODEL = "eleven_turbo_v2_5"
OUTPUT_DIR = "chino/audio"

with open(os.path.join(OUTPUT_DIR, "mapping.json")) as f:
    mapping = json.load(f)

# Extraer textos del HTML
with open("chino/basico2/claseXX.html") as f:
    html = f.read()
td_texts = re.findall(r'<td class="hz">(.*?)</td>', html)
span_texts = re.findall(r'<span class="hz">(.*?)</span>', html)
texts = set()
for raw in td_texts + span_texts:
    clean = re.sub(r'<[^>]+>', '', raw).strip()
    if clean and len(clean) <= 40:
        texts.add(clean)
new_texts = sorted(texts - set(mapping.keys()))

def text_to_filename(t):
    return f"zh_{hashlib.md5(t.encode()).hexdigest()[:10]}.mp3"

for text in new_texts:
    fname = text_to_filename(text)
    fpath = os.path.join(OUTPUT_DIR, fname)
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    payload = json.dumps({
        "text": text, "model_id": MODEL,
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
    }).encode()
    req = urllib.request.Request(url, data=payload, headers={
        "xi-api-key": API_KEY, "Content-Type": "application/json"
    })
    try:
        with urllib.request.urlopen(req) as resp:
            with open(fpath, "wb") as out: out.write(resp.read())
        mapping[text] = fname
    except Exception as e:
        print(f"[FAIL] {text}: {e}")
    time.sleep(0.25)

with open(os.path.join(OUTPUT_DIR, "mapping.json"), "w") as f:
    json.dump(mapping, f, ensure_ascii=False, indent=2)

# Actualizar audioMap en HTML
file_texts = set()
for raw in td_texts + span_texts:
    clean = re.sub(r'<[^>]+>', '', raw).strip()
    if clean and clean in mapping: file_texts.add(clean)
map_lines = [f'  "{t}": "{mapping[t]}"' for t in sorted(file_texts)]
map_js = ',\n'.join(map_lines)
html = re.sub(r'const audioMap = \{[^}]*\};',
              f'const audioMap = {{\n{map_js}\n}};',
              html, flags=re.DOTALL)
with open("chino/basico2/claseXX.html", "w") as f:
    f.write(html)
```

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
- Indexa todas las clases

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
