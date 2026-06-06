# Apuntes Chino — Contexto para Claude

## 📖 PRIMERO: lee CONTEXT.md
Antes de explorar archivos, lee `CONTEXT.md` en la raíz del proyecto.
Tiene toda la info clave: estructura, convenciones HTML, sistema de audio (ElevenLabs),
deploy, preferencias del usuario, etc. **Ahorra muchísimos tokens.**

## Estado actual
Clase en curso: **Clase 03 — Básico 3** (6 de junio, 2026).

Archivo: `chino/basico3/clase03.html`. La clase se va armando en vivo: Basti dicta
temas en pinyin y se agregan secciones una a una. Próxima clase será la 04.

Básico 3 hasta ahora: Clase 01 (la hora: 点/分/半), Clase 02 (la rutina del día:
醒来→睡觉, comidas, 上班/上课, partes del día, 两点, 轻声).

## Flujo de trabajo
- Basti dicta cada tema en pinyin → se arma la sección HTML siguiendo el formato.
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
