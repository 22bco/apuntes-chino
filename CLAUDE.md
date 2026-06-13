# Apuntes Chino — Contexto para Claude

## 📖 PRIMERO: lee CONTEXT.md
Antes de explorar archivos, lee `CONTEXT.md` en la raíz del proyecto.
Tiene toda la info clave: estructura, convenciones HTML, sistema de audio (ElevenLabs),
deploy, preferencias del usuario, etc. **Ahorra muchísimos tokens.**

## Estado actual
Última clase: **Clase 04 — Básico 3** (13 de junio, 2026) ✅ COMPLETA (14 secciones).
Próxima clase será la 05.

Archivo: `chino/basico3/clase04.html`. La clase se arma en vivo: Basti dicta
temas en pinyin y se agregan secciones una a una (patrón de audio: script
reusable que extrae hz, filtra contra mapping.json, genera MP3 y reconstruye
el `audioMap` del HTML).

Clase 04 (14 secciones): salud (你身体怎么样, 舒服/不舒服, 生病, 你怎么了), la
lluvia (会下雨吗, 会不会), 能 vs 想 + 会 vs 能 + 但是, 些 (这些/那些), clima en
el tiempo (昨天北京天气很好, 的 vs sin 的, ayer/hoy/mañana), 5 preguntas de la
profe, cuándo va 会, 爱+comida, vocabulario del clima (下雨/下雪/下冰雹/刮风/
晴天/阴天/多云/有雾 + intensidad 大/小), banco de preguntas y respuestas, rincón
de tonos (变调 de 不, 3+3), frases útiles (我能去上厕所吗, 课间/干吗), 学习, y
el progresivo 在…呢. Cobertura HSK1 ahora 144/150.

Básico 3 hasta ahora: Clase 01 (la hora: 点/分/半), Clase 02 (la rutina del día:
醒来→睡觉, comidas, 上班/上课, partes del día, 两点, 轻声), Clase 03 (el clima:
天气怎么样, 冷/热, 会 futuro, 主谓谓语句, 些, 变调), Clase 04 (salud + clima a
fondo + 在…呢).

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
