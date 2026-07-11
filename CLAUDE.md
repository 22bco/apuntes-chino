# Apuntes Chino — Contexto para Claude

## 📖 PRIMERO: lee CONTEXT.md
Antes de explorar archivos, lee `CONTEXT.md` en la raíz del proyecto.
Tiene toda la info clave: estructura, convenciones HTML, sistema de audio (ElevenLabs),
deploy, preferencias del usuario, etc. **Ahorra muchísimos tokens.**

## Estado actual
**Clase 08 (sábado 11 de julio de 2026) ✅ COMPLETA** — armada en vivo (Basti
dictó en pinyin, sección a sección). Archivo: `chino/basico3/clase08.html`.
Cubre: §1 上个星期/这个星期/下个星期 (la lógica 上/下 del tiempo que "cae"),
§2 上上个星期 (duplicar 上/下, escalera de 5 semanas, viaje a Curicó), §3
你在商场买什么了/我买了一杯咖啡 (在+lugar en pasado, 了 pegado con cantidad),
§4 我是坐飞机来的 (construcción 是…的 para enfatizar el cómo, 坐+vehículo),
§5 认识 vs 了解 (y la doble lectura de 了: le/liǎo), §6 el año dígito por
dígito con 年 (二零二六年, fecha completa 年→月→号→星期 con 星期六, nota 生日,
y 满: 明年我满十八岁), §7 你和李小姐是什么时候认识的 (是…的 con cuándo/dónde,
是 omitible en la pregunta, 小姐/什么时候/大学/同学, 这是在北京买的, negación
不是…的 con corrección, más práctica: 昨天下午/坐地铁/高楼), §8 这个汉字怎么写/
你会写吗 (会 de habilidad vs 会 futuro, escalera 认识→会读→会写). Al final hay
un `<details>` escondido con una grosería que enseñaron en broma (sin .hz a
propósito, para que no entre al pipeline de audio/buscador).

⚠️ **AUDIO PENDIENTE Clase 08**: Basti pidió "de momento sin audios". Hay ~84
textos sin MP3 (el audioMap tiene ~74 existentes). La `ELEVENLABS_API_KEY` no
estaba en el entorno de esa sesión (no existe `~/.zshenv`). Cuando haya key:
`python3 scripts/gen_audio.py chino/basico3/clase08.html`. Ojo: el regex del
script busca `const audioMap` pero las clases migradas usan `window.audioMap`
— en la sesión del 11 jul se rellenó el audioMap con un snippet Python aparte
(mismo patrón del script, apuntando a `window.audioMap`).

**Clase 07 (4 de julio) ✅ COMPLETA** (去哪儿了, 早上/上午, 买东西 y dónde va 了
con cantidad, 太…了, 啊 y sus 6 sonidos, 后 con hora exacta, 我饿了 de cambio de
estado, 16 palabras con mapa de tonos). **Clase 06 (27 de junio) ✅ COMPLETA** —
reconstruida de las diapositivas de la profe (Basti faltó; avisar siempre que el
origen es "diapositivas de la profe"). Su diálogo coincide a propósito con
Clase 07 §1/§3 (la profe repasó en vivo).

Básico 3: Clase 01 (la hora), Clase 02 (rutina del día), Clase 03 (clima, 会
futuro, 变调), Clase 04 (salud + 在…呢), Clase 05 (进行时, teléfono, 给, 没/不),
Clase 06 (了 en 3 formas, 后), Clase 07 (去哪儿了, 买东西), Clase 08 (semanas
上/下, 是…的, 认识/了解, 年, 满…岁). Próxima: Clase 09.

**Pendiente menor**: `chino/vocab.json` (corpus del buscador) quedó sin entradas
de B3 Clases 03-08 (la última src es "B3 Clase 02") — backfill pendiente si se
quiere que el buscador indexe ese vocabulario por clase.

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
