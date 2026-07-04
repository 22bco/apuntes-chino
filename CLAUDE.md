# Apuntes Chino — Contexto para Claude

## 📖 PRIMERO: lee CONTEXT.md
Antes de explorar archivos, lee `CONTEXT.md` en la raíz del proyecto.
Tiene toda la info clave: estructura, convenciones HTML, sistema de audio (ElevenLabs),
deploy, preferencias del usuario, etc. **Ahorra muchísimos tokens.**

## Estado actual
Hoy, sábado 4 de julio de 2026, se está armando la **Clase 07 — Básico 3** EN VIVO
(Basti dicta temas en pinyin y se agregan secciones una a una). Archivo:
`chino/basico3/clase07.html`. Patrón de audio: script reusable que extrae hz,
filtra contra mapping.json, genera MP3 y reconstruye el `audioMap` del HTML.

**Clase 06 (sábado 27 de junio) ✅ COMPLETA** — Basti había faltado por una prueba
en la universidad, pero consiguió las diapositivas de la profe (Centro Cultural
Chino) y se reconstruyó el apunte desde ahí (avisar siempre que el origen es
"diapositivas de la profe", no notas manuscritas de Basti). Cubre los tres usos
de 了 (final de oración, pegado al verbo con cantidad, y su negación con 没),
el sustantivo 后 ("después de"), y dos diálogos (看见张先生/开车/回来 · 去商店/
买东西/苹果). Ojo: parte del diálogo de Clase 06 (去哪儿了/买东西/苹果) es
**idéntico** al de Clase 07 §1 y §3 — la profe repasó ese contenido en vivo el
mismo 4 de julio antes de seguir avanzando, por eso coincide a propósito.

Clase 07 hasta ahora (en progreso): §1 昨天上午你去哪儿了 (去+哪儿+了), §2 早上
vs 上午 en la pregunta, §3 我去商店买东西了 (买 + dónde va 了 según haya o no
cantidad en el objeto).

Básico 3 hasta ahora: Clase 01 (la hora: 点/分/半), Clase 02 (la rutina del día:
醒来→睡觉, comidas, 上班/上课, partes del día, 两点, 轻声), Clase 03 (el clima:
天气怎么样, 冷/热, 会 futuro, 主谓谓语句, 些, 变调), Clase 04 (salud + clima a
fondo + 在…呢), Clase 05 (进行时 en presente/pasado, teléfono, 给, negación
没/不), Clase 06 (了 en sus tres formas, 后, 看见/回来/车/分钟, reconstruida de
diapositivas), Clase 07 (去哪儿了, 早上/上午, 买东西 — en vivo, incompleta).

**Nota de infraestructura**: hay un `PLAN-MEJORAS.md` en la raíz del repo con un
refactor de arquitectura en curso (CSS/JS compartido en `chino/assets/clase.css`
y `clase.js`, en vez de `<style>`/`<script>` inline por archivo). Las clases
01-05 y 07 de Básico 3 ya están migradas a ese patrón — usarlo también para
archivos nuevos (`<link rel="stylesheet" href="/assets/clase.css">` +
`<script>window.audioMap = {...};</script><script src="/assets/clase.js"></script>`
al final del body). El plan pide esperar a que cierre la Clase 07 antes de tocar
más archivos de clase — coordinar si hay otra sesión ejecutándolo en paralelo.

## Flujo de trabajo
- Basti dicta cada tema en pinyin → se arma la sección HTML siguiendo el formato.
- **Checklist al cerrar una clase**: ¿toca palabras/temas HSK 1? → actualizar
  `chino/hsk1/hsk1-data.json` (campo `clases`) y la página del tema en `chino/hsk1/`
  si aporta contenido nuevo. Ver sección "HSK 1 por temas" en CONTEXT.md.
- **Generar audio ElevenLabs (voz Lily) automáticamente para cada vocabulario nuevo,
  sin preguntar.** Script reusable: ejecutar desde la raíz del repo
  (`cd /Users/bchavez/Trabajos/apuntes-chino-1`). Extrae los `hz`, filtra contra
  `chino/audio/mapping.json`, genera los MP3 y actualiza el `audioMap` del HTML.
- **Regenerar el dashboard**: si la clase cambió `vocab.json`, `mapping.json`,
  `hsk1-data.json` o agregó una clase → correr `python3 scripts/gen_stats.py`
  (recalcula `chino/stats.json`, que alimenta el dashboard). El validador
  `check_site.py` avisa si quedó desactualizado.

## Formato
- Seguir el mismo estilo HTML de clase05.html (ver `CONTEXT.md` para detalles)
- Cada hanzi con link a dong-chinese.com
- Tablas con columnas: Hanzi | Pinyin | Español
- Pinyin toggle funcional
- Clases de color para h2: rojo default, .green, .blue, .gold, .gray
- Audio ElevenLabs (voz Lily) → ver script en CONTEXT.md

## Deploy
- Push a main despliega automáticamente a chino.basti.cl via GitHub Actions
- Los links absolutos en HTML usan `/` no `/chino/` (el root del nginx ya apunta a chino/)
