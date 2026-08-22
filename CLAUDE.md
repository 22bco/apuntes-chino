# Apuntes Chino — Contexto para Claude

## 📖 PRIMERO: lee CONTEXT.md
Antes de explorar archivos, lee `CONTEXT.md` en la raíz del proyecto.
Tiene toda la info clave: estructura, convenciones HTML, sistema de audio (ElevenLabs),
deploy, preferencias del usuario, etc. **Ahorra muchísimos tokens.**

## Estado actual
**🆕 INTERMEDIO 1 (中级一) — arrancó el sábado 8 de agosto de 2026.**
Nivel nuevo en `chino/intermedio1/`. **Clase 02 ✅ (22 de agosto de 2026; el 15 no
hubo clase) — 11 secciones en `chino/intermedio1/clase02.html`**, armada en vivo (Basti
dictó en pinyin) y ordenada en dos partes a pedido suyo: **Parte 1 · Repaso de la Clase
01** (§1 觉得 para opinar: 这件衣服好看 / 拉面很好吃 / 面包 / 九月去北京旅游最好, §2 想去北京
y 想 vs 觉得, §4 什么运动 con 功夫/足球 踢 vs 看/攀岩 y la escala 最喜欢›很›不太喜欢, §9
他叫什么名字 + 眼睛) y **Parte 2 · Lo nuevo** (§3 星期日有时间/没有/也没有, §5 一起 con
读课文/看书/去学校/运动/看电视/聚会 y el diálogo 下午我们一起踢足球吧→好啦, §6 我在家里, §7
要不要/不要, 要去旅游/上学 con 要 = «querer», 要不要买几把/一把新椅子 y el 几 de «unos
cuantos», §8 新的/旧的/二手, 很新/不太新, 旧 vs 老, §10 课文 del gato 桌子下面有一只猫 con
有 de existencia, 它, 漂亮, 多大了, 两个多月), §11 mapa de tonos + práctica. Los ids #s1-#s11
no siguen el orden visual (se reordenó después). `hsk1-data.json` (+46) y `hsk2-data.json`
(+29) ya tienen `intermedio1/clase02` en `clases`. **Audio pendiente** (sin
`ELEVENLABS_API_KEY` en el entorno): `python3 scripts/gen_audio.py chino/intermedio1/clase02.html`
— la clase no define `window.audioMap` (fallback a mapping.json). Próxima: Clase 03.

**Clase 01 ✅ (12 secciones)**: §1 旅游 en
pasado (了/没) y deseo (想去…旅游, cadena deseo→movimiento→propósito), §3 el
superlativo 最 a fondo (es adverbio, no adjetivo; 最+adj / 最+verbo / 最…的+sust;
最好 = «más vale que»), 觉得 para opinar, los 12 meses (一月 vs 一个月, 上/这/下
个月) y el molde `[mes]去[lugar]旅游最好`, §7 la misma palabra como verbo y
sustantivo (我在旅游 / 旅游很好玩儿), §2 你们什么时候要孩子 (要/生/有孩子,
以后再说吧), §4 deportes con 踢 (pie) vs 打 (mano), §5 眼睛 con el clasificador
只 (el del gato) y el par 眼睛/眼镜, §6 手套 con 双 y 戴 vs 穿, §8 椅子 con 把 y
el resumen de clasificadores (只/双/把/张/件), §11 el 也 en sus dos usos
(«también», y 也不…也不… «ni… ni…»), §10 为什么…？→ 因为…所以 (gramática HSK 2),
§12 los radicales de cada carácter, §9 mapa de tonos + ejercicios. Lleva un
`<details>` escondido con la anécdota de 一般 → *jība* (sin `.hz`, para que no
entre al pipeline de audio/buscador).

La Clase 01 **no** define `window.audioMap` a propósito: `clase.js` hace fallback
a `/audio/mapping.json`, así el 🔊 funciona sin generar audio. Pendiente al
cerrar el nivel: `python3 scripts/gen_audio.py chino/intermedio1/clase01.html`
(faltan MP3 de ~15 palabras sueltas: 帽子 外套 眼镜 袜子 故宫 玩儿 戴 最贵
乒乓球 马马虎虎 紫禁城 国球…; la `ELEVENLABS_API_KEY` no está en el entorno). `scripts/gen_stats.py` ya incluye `intermedio1/` (glob de
clases, "última clase" y `words.i1` para vocab con `src` que empiece con `I1`).
Básico 3 quedó cerrado (9/9) en el dashboard.

**Básico 3 — Clase 08 (sábado 11 de julio de 2026) ✅ COMPLETA** — armada en vivo (Basti
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
