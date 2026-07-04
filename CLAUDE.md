# Apuntes Chino — Contexto para Claude

## 📖 PRIMERO: lee CONTEXT.md
Antes de explorar archivos, lee `CONTEXT.md` en la raíz del proyecto.
Tiene toda la info clave: estructura, convenciones HTML, sistema de audio (ElevenLabs),
deploy, preferencias del usuario, etc. **Ahorra muchísimos tokens.**

## Estado actual
Última clase: **Clase 05 — Básico 3** (20 de junio, 2026) ✅ COMPLETA (12 secciones).

**Clase 06 (sábado 27 de junio) NO existe y no debe crearse todavía**: Basti faltó
por una prueba en la universidad. Va a conseguir el apunte con ayuda de la profe
más adelante — no inventar contenido de esa clase mientras tanto.

Hoy, sábado 4 de julio de 2026, toca la **Clase 07** (en vivo).

Archivo: `chino/basico3/clase05.html`. La clase se arma en vivo: Basti dicta
temas en pinyin y se agregan secciones una a una (patrón de audio: script
reusable que extrae hz, filtra contra mapping.json, genera MP3 y reconstruye
el `audioMap` del HTML).

Clase 05 (12 secciones): el progresivo 在 presente/pasado (他在学中文 / 他学中文),
el teléfono (喂, 打电话, 号码, el 1 = 幺), los dos 在 (estar en un lugar vs hacer
algo) + 去…了, 什么呢 vs 吗, negar con 没 vs 不, una conversación completa, 给
(dar / a alguien), dar números de teléfono, torpedo de números, 吧 (sugerencias),
banco de preguntas y un diálogo final con todo.

Básico 3 hasta ahora: Clase 01 (la hora: 点/分/半), Clase 02 (la rutina del día:
醒来→睡觉, comidas, 上班/上课, partes del día, 两点, 轻声), Clase 03 (el clima:
天气怎么样, 冷/热, 会 futuro, 主谓谓语句, 些, 变调), Clase 04 (salud + clima a
fondo + 在…呢), Clase 05 (进行时 en presente/pasado, teléfono, 给, negación
没/不). Clase 06 pendiente (falta el apunte). Clase 07 es la próxima a tomar.

## Flujo de trabajo
- Basti dicta cada tema en pinyin → se arma la sección HTML siguiendo el formato.
- **Checklist al cerrar una clase**: ¿toca palabras/temas HSK 1? → actualizar
  `chino/hsk1/hsk1-data.json` (campo `clases`) y la página del tema en `chino/hsk1/`
  si aporta contenido nuevo. Ver sección "HSK 1 por temas" en CONTEXT.md.
- **Generar audio ElevenLabs (voz Lily) automáticamente para cada vocabulario nuevo,
  sin preguntar.** Script reusable: ejecutar desde la raíz del repo
  (`cd /Users/bchavez/Trabajos/apuntes-chino-1`). Extrae los `hz`, filtra contra
  `chino/audio/mapping.json`, genera los MP3 y actualiza el `audioMap` del HTML.

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
