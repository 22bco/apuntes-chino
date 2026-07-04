# PLAN-MEJORAS — Refactor de seguridad, arquitectura y orden del sitio

> Playbook para ejecutar en sesiones futuras (cualquier modelo). Diagnóstico hecho
> el 4 de julio de 2026 revisando CONTEXT.md, CLAUDE.md, deploy.yml, estructura
> completa y estado de git. Ejecutar EN ORDEN: cada fase es independiente pero
> P0 es urgente. Marcar `[x]` al completar cada ítem y commitear este archivo.

## 📊 Progreso (actualizado 4 jul 2026)

- ✅ **Fase 2 completa** — `scripts/gen_audio.py`, `scripts/check_site.py`,
  `.github/workflows/check.yml`, `.gitignore` (.env, __pycache__). Commit `ed65dc5`.
- ✅ **Fase 0.2** — key fuera de CONTEXT.md (→ `$ELEVENLABS_API_KEY`).
- ✅ **Fase 0.4** — PDFs de `material/` ya gitignorados (fuera del repo). Falta solo
  decidir el historial (0.3).
- ✅ **Fase 1.4** — `chino/DATA.md` creado (mapa del ecosistema de datos).
- ✅ **Fase 3.1** — CONTEXT.md sincronizado con la realidad (Básico 2 = 9 clases,
  Básico 3 hasta clase07, herramientas y scripts/ agregados). CLAUDE.md ya estaba al día.
- ✅ **Fase 3.2** — `chino/404.html` on-brand creado. Falta solo activarlo en nginx
  (`error_page 404 /404.html;`, config del VPS).
- ✅ **Fase 1.1/1.2 COMPLETA** — las 26 clases usan CSS/JS compartido:
  `/assets/clase.css`+`clase.js` (basico2/3) y `/assets/clase-b1.css`+`clase-b1.js`
  (basico1). Cada página conserva solo su `window.audioMap` + delta CSS específico.
  clase.js añade fallback a mapping.json (1.2) y aria-label (3.3). Migrador
  `scripts/migrate_clase.py`. **Cada archivo verificado con Playwright: estilos
  computados idénticos al original, botones/toggle sin regresión, 0 errores.**
  Special cases resueltos a mano: basico3/clase01 (reloj preservado), basico2/clase06
  (5 <style>, migra solo la base), basico2/clase01,02 (solo-CSS, conservan su marcado
  dinámico de pinyin-col).
- ✅ **Fase 1.5 (parcial)** — pinyin-react (v3) eliminado del repo + gitignorado.
- ⏳ **Fase 1.3 (radicales) — OJO, más complejo de lo pensado**: los datos SÍ están
  en sync (CHAR_RADS=746 y GLOSS=323 idénticos inline vs json). PERO `radicales.html`
  accede a `RADICALES` **posicionalmente** (`r[0]`=hz, `r[2]`=py, `r[3]`=es, `r[5]`=cat)
  mientras `radicales.json` guarda **objetos con claves** (`{hz,py,es,cat,...}`). No es
  un swap de fuente: hay que reescribir los accesos posicionales a claves + fetch +
  verificar en navegador (HanziWriter). Tarea de código, no de datos.
- ⏳ **PENDIENTE de Basti**: 0.1 (rotar key — CRÍTICO), 0.3 (historial git),
  1.5 restante (portal raíz + otras materias; consolidar pinyin v1/v2 — decisiones).
- ⏳ Correcciones del análisis: `basico1/index_completo.html` NO es huérfano
  (enlazado en index.html:248); `pinyin.html`(v1) y `pinyinv2.html`(v2) ambas
  vivas y enlazadas (consolidar = decisión).
- 📝 Clases NUEVAS (clase06, clase07 en adelante): si se copian de una plantilla
  con `<style>`/`<script>` inline, pasarles `scripts/migrate_clase.py` al cerrarlas.
- ✅ **Fase 0.1 CERRADA** — Basti rotó la API key de ElevenLabs (4 jul 2026).
  El frente de seguridad del repo queda completo.
- 🆕 **FASE 4 agregada** (revisión post-refactor, 4 jul 2026): rendimiento del
  dashboard (435 KB de JSON eager → lazy), "continuar donde quedaste" + favicon,
  clases.json (mata el mantenimiento manual del árbol Niveles), validador v2
  (deriva py/es), y la visita única al nginx del VPS (cache immutable de audio,
  404, headers). Ver sección FASE 4 abajo.

## ⚠️ Reglas de ejecución (leer antes de empezar)

1. **NUNCA leer los HTML de clases completos** (46-172 KB c/u, hay 31+). Toda
   transformación masiva se hace con scripts Python/Bash que editan los archivos
   sin pasarlos por el contexto. Leer solo fragmentos con Grep/offset para verificar.
2. **No tocar el contenido pedagógico** (texto de las clases, tablas, diálogos).
   Este plan es solo infraestructura.
3. Después de cada fase: commit con conventional commits + push (el push despliega
   a chino.basti.cl automáticamente). Verificar el sitio tras cada deploy.
4. Los links absolutos en HTML usan `/` NO `/chino/` (nginx apunta a chino/).
5. Si algo de este plan contradice el estado real del repo, el repo manda:
   verificar antes de ejecutar.

---

## 🔴 FASE 0 — Seguridad (URGENTE, ~1 sesión corta)

### 0.1 Rotar la API key de ElevenLabs — [REQUIERE A BASTI]
- [ ] La key vive en `CONTEXT.md:189` y **el repo es PÚBLICO** (github.com/22bco/apuntes-chino).
      Pedirle a Basti que entre a https://elevenlabs.io → Profile → API Keys,
      revoque la key actual y genere una nueva. **No continuar la fase sin esto.**

### 0.2 Mover la key a variable de entorno
- [ ] Basti agrega a `~/.zshenv`: `export ELEVENLABS_API_KEY="sk_...nueva"`
      (sugerirle el comando; el modelo no debe ver ni escribir la key en ningún
      archivo versionado ni en el chat si es evitable).
- [ ] Editar `CONTEXT.md` sección "Sistema de audio": borrar la key literal y
      reemplazar por: «API Key: en la variable de entorno `ELEVENLABS_API_KEY`
      (nunca escribirla en archivos del repo)». Mantener Voice ID, model y settings
      (no son secretos).
- [ ] Actualizar el script tipo de CONTEXT.md para que use
      `os.environ["ELEVENLABS_API_KEY"]` (se reemplaza del todo en la fase 2.1).

### 0.3 Limpiar el historial de git — [DESTRUCTIVO, confirmar con Basti antes]
- [ ] La key actual y una anterior están en commits históricos de `CONTEXT.md`.
      Tras rotar (0.1), decidir con Basti: (a) no limpiar — la key revocada ya no
      sirve (opción válida y simple), o (b) reescribir historial con
      `git filter-repo --replace-text` y force-push. Si (b): avisar que invalida
      clones existentes y que el VPS hace `git pull` — habrá que resetear el clone
      del VPS (`git fetch && git reset --hard origin/main`).
- Recomendación: (a) si la key fue revocada; el historial limpio es cosmético.

### 0.4 Decidir el destino de `chino/material/` (230 MB de PDFs con copyright) — [DECISIÓN DE BASTI]
- [ ] Contiene libros oficiales HSK (FLTRP) y simulacros, en repo público Y
      servidos sin auth en chino.basti.cl/material/. Riesgo de DMCA contra el
      repo entero. Presentar opciones a Basti:
      (a) sacarlos del repo y de la web (quedan solo locales) — más seguro;
      (b) sacarlos del repo, subirlos al VPS por rsync manual fuera de git,
          y proteger `/material/` en nginx con auth básica + `robots.txt`;
      (c) dejarlos (riesgo asumido).
- [ ] Si (a) o (b): `git rm -r --cached chino/material/` + agregar a `.gitignore`
      + ajustar el rsync del deploy si hace falta `--exclude material/`.
      Nota: quedan en el historial de git → mismo dilema que 0.3 (filter-repo
      opcional; aquí sí reduce ~230 MB del repo).

### 0.5 Endurecer deploy y nginx (menor)
- [ ] En `.github/workflows/deploy.yml`: las rutas `/opt/apuntes-chino/` y
      `/opt/TransportesMarDelSur/static/chino/` están hardcodeadas. Moverlas a
      secrets/vars del repo (`VPS_REPO_PATH`, `VPS_DEPLOY_PATH`) y documentar en
      CONTEXT.md por qué el sitio vive dentro del static de TransportesMarDelSur.
- [ ] Sugerir a Basti (config del VPS, fuera de este repo): cabeceras nginx
      `X-Content-Type-Options: nosniff` y una CSP básica que permita
      dong-chinese.com (links) y el CDN de HanziWriter (radicales.html la usa).

---

## 🟠 FASE 1 — Arquitectura y deduplicación (~1-2 sesiones)

### 1.1 Extraer CSS/JS compartido de las clases (la tarea más grande)
Contexto: 31+ HTML en `basico1/ basico2/ basico3/` repiten inline el mismo
`<style>` y el mismo `<script>` (función `speak()`, botones 🔊, toggle pinyin).
La carpeta `hsk1/` ya usa el patrón correcto (`hsk1.css` + `hsk1.js` compartidos).

- [ ] Paso 1 — inventario: script Python que extraiga el bloque `<style>...</style>`
      y el `<script>` final de CADA clase a archivos temporales en scratchpad, y
      los compare (difflib) para detectar variantes. Esperable: 2-4 variantes
      (basico1 vs basico2 vs basico3 evolucionaron).
- [ ] Paso 2 — crear `chino/assets/clase.css` y `chino/assets/clase.js` con la
      versión más completa (la de basico3/clase05.html, la más reciente). El JS
      debe leer un `window.audioMap` que cada página define inline ANTES de
      cargar el script, y mantener el fallback speechSynthesis.
- [ ] Paso 3 — script de migración por archivo: reemplaza el `<style>` inline por
      `<link rel="stylesheet" href="/assets/clase.css">`, y el `<script>` por un
      bloque mínimo `<script>window.audioMap = {...}</script><script src="/assets/clase.js"></script>`,
      PRESERVANDO el audioMap existente de cada página. Correrlo primero sobre
      UNA clase de cada curso, verificar en navegador local
      (`python3 -m http.server` en `chino/` + revisar toggle pinyin, botones 🔊,
      colores h2, cajas .box), y recién entonces correrlo sobre el resto.
- [ ] Paso 4 — si el inventario del paso 1 mostró diferencias reales de estilo
      entre cursos (colores, fuentes), resolver con clases CSS por curso
      (`body.b1 / body.b2 / body.b3`) dentro del mismo clase.css, no con 3 archivos.
- [ ] Verificación final: `grep -L 'assets/clase.css'` sobre las 31 clases debe
      devolver vacío; peso de cada HTML debería bajar 30-60%.
- [ ] Actualizar CONTEXT.md (sección "Convenciones de formato HTML") y el patrón
      de audio para reflejar el nuevo layout.

### 1.2 Derivar el audioMap desde mapping.json (elimina la doble contabilidad)
Contexto: cada página lleva una copia parcial de `chino/audio/mapping.json` que
un script regenera con regex. Es frágil y es EL paso manual del flujo de clases.

- [ ] Opción recomendada (simple, estático): en `clase.js`, si no existe
      `window.audioMap`, hacer `fetch('/audio/mapping.json')` (cachearlo en el
      objeto; el JSON pesa poco, los MP3 se cargan on-demand igual que hoy).
      Mantener `window.audioMap` inline como override opcional.
- [ ] Migración: script que borre los `audioMap` inline de las 31 clases (dejando
      solo el `<script src>`), una vez confirmado que TODOS los textos hz de cada
      página existen en mapping.json (usar el validador de 2.2 antes).
- [ ] Con esto, el flujo de clase nueva queda: generar MP3 + actualizar
      mapping.json y NADA más (se elimina el paso "reconstruir audioMap del HTML").
      Actualizar CLAUDE.md y CONTEXT.md con el flujo nuevo.

### 1.3 Radicales: una sola fuente
- [ ] `radicales.json` fue extraído de `radicales.html`, pero el HTML conserva su
      copia inline (ver nota ⚠️ en CONTEXT.md). Invertir: que `radicales.html`
      haga fetch de `/radicales.json` como ya hacen buscador.html e index.html,
      y borrar la copia inline. Verificar en navegador (HanziWriter + chips).
- [ ] Borrar la advertencia de doble copia en CONTEXT.md.

### 1.4 Documentar y validar el ecosistema de datos (no unificar todavía)
Contexto: vocab.json, vocab_hsk1/2/3.json, hsk1-data.json, hsk30-lessons.json,
vocab_listening.json, radicales.json, sinonimos.json se solapan con esquemas
distintos y sincronía manual.

- [ ] Crear `chino/DATA.md`: tabla con cada JSON → esquema, quién lo consume,
      quién lo actualiza y cuándo, y qué campos se solapan con otros.
- [ ] NO fusionar los JSON en esta fase (riesgo alto, beneficio incierto para un
      sitio que funciona). La protección real es el validador de 2.2.

### 1.5 Limpiar la raíz del repo
- [ ] `4b/`, `usm/`, `programacion/`, `robotica/`, `pinyin-react/` no son parte
      del sitio de chino (el deploy solo rsynca `chino/`). Preguntar a Basti si
      se mueven a otro repo o se quedan; como mínimo: agregar `pinyin-react/dist/`
      a un build reproducible o documentar en CONTEXT.md qué es cada carpeta.
- [ ] Decidir el destino de `pinyin.html` vs `pinyinv2.html` vs `pinyin-react/`
      (tres generaciones de la misma herramienta) y de
      `basico1/index_completo.html` (backup monolítico). Propuesta: borrar los
      obsoletos (git los recuerda); si Basti prefiere, moverlos a `attic/`.

### 1.6 Binarios en git (decisión, no urgente)
- [ ] 3.056+ MP3 (68 MB) + material (230 MB si sigue) en git. Presentar a Basti:
      (a) status quo consciente (válido, repo personal);
      (b) Git LFS para `*.mp3 *.pdf`;
      (c) audio fuera de git con rsync directo al VPS.
      Recomendación: (a) si material/ sale del repo en 0.4 — 68 MB de MP3 es manejable.

---

## 🟡 FASE 2 — Tooling e integración (~1 sesión)

### 2.1 Script de audio real y versionado
- [ ] Crear `scripts/gen_audio.py` a partir del patrón que hoy vive en CONTEXT.md:
      - Uso: `python3 scripts/gen_audio.py chino/basico3/claseXX.html [más.html...]`
      - Key desde `os.environ["ELEVENLABS_API_KEY"]` (error claro si falta).
      - Extrae textos de `td.hz` y `span.hz`, filtra contra mapping.json, genera
        `zh_{md5[:10]}.mp3`, actualiza mapping.json. Si la fase 1.2 ya se hizo,
        ELIMINAR la parte que reescribe el audioMap del HTML; si no, mantenerla.
      - Reintentos con backoff ante 429/5xx; resumen final (N nuevos, N ya existían, N fallos).
- [ ] Reemplazar el bloque de código de CONTEXT.md por una referencia al script.
- [ ] Actualizar CLAUDE.md (flujo de trabajo) para apuntar al script.

### 2.2 Validador de integridad + CI
- [ ] Crear `scripts/check_site.py` que valide y salga con código ≠0 si falla algo:
      1. Todo texto en `td.hz`/`span.hz` de cada HTML tiene entrada en mapping.json
         y el MP3 referenciado existe en `chino/audio/` (warning, no error, para
         textos largos >40 chars que nunca llevan audio).
      2. Ningún HTML contiene links con prefijo `/chino/` (causa #1 histórica de 404).
      3. `hsk1-data.json`: los valores del campo `clases` apuntan a archivos que existen.
      4. Todos los JSON del repo parsean.
      5. Ningún archivo versionado contiene el patrón `sk_[a-zA-Z0-9]{20,}` (secretos).
- [ ] Crear `.github/workflows/check.yml`: corre `scripts/check_site.py` en cada
      push/PR (NO despliega; el deploy sigue en deploy.yml). Python stdlib only,
      sin dependencias.
- [ ] Correr el validador sobre el repo actual y arreglar lo que reporte ANTES de
      activar el workflow (probablemente haya audios/links huérfanos históricos).

### 2.3 Higiene de git
- [ ] Revisar `git status`: si hay cambios sin commitear (audios, mapping.json,
      HTML de la última clase), commitearlos con mensaje descriptivo ANTES de
      cualquier transformación masiva de este plan. Nunca mezclar en un mismo
      commit contenido de clases con refactor de infraestructura.
- [ ] Agregar `.gitignore` para: `.env`, `*.pyc`, `__pycache__/`, `.DS_Store`,
      y lo que se decida en 0.4/1.5.

---

## 🟢 FASE 3 — Orden y pulido (~1 sesión corta, oportunista)

### 3.1 Sincronizar documentación con la realidad
- [ ] CONTEXT.md: Básico 2 lista 7 clases pero hay 9 archivos (clase08, clase09);
      Básico 3 va en clase05 (y clase06 NO debe crearse aún — ver CLAUDE.md);
      faltan en la estructura: typing.html, lluvia.html, pinyin.html, pinyinv2.html,
      buscador-core.js, sinonimos.json, vocab.json. Actualizar el árbol y las tablas.
- [ ] Regla nueva en CLAUDE.md (checklist de cierre de clase): «actualizar
      CONTEXT.md si la clase agregó archivos o herramientas nuevas».

### 3.2 Página 404
- [ ] Crear `chino/404.html` con el estilo del sitio y links al dashboard.
      Pedirle a Basti agregar `error_page 404 /404.html;` en nginx (fuera del repo).

### 3.3 Accesibilidad (barato una vez hecho 1.1)
- [ ] En `clase.js` y `hsk1.js`: los botones 🔊 generados deben llevar
      `aria-label="Escuchar {texto}"` y `type="button"`; el toggle pinyin,
      `aria-pressed`. Un solo cambio en los JS compartidos cubre todo el sitio.

### 3.4 PWA / offline (opcional, solo si Basti lo pide)
- [ ] Service worker con cache-first para `/audio/*.mp3` (los nombres zh_{md5}
      son inmutables → candidatos perfectos) y network-first para HTML/JSON.
      + `manifest.json` para instalar el sitio en el teléfono. Es la mejora de
      mayor valor de uso real (estudiar sin señal), pero requiere probar bien
      la invalidación de mapping.json.

---

## 🚀 FASE 4 — Rendimiento y UX del dashboard (diagnóstico 4 jul 2026, post-refactor)

> Hallazgos de la revisión hecha tras completar las fases 1-3. Datos medidos, no
> estimados. Orden recomendado: 4.1 → 4.2 → 4.3 → 4.4 (impacto/riesgo decreciente).

### 4.1 Lazy-load del buscador del dashboard (el hallazgo principal)
Contexto medido: `chino/index.html` hace `Promise.all` de **9 fetches = 435 KB de
JSON** (~150 KB gzip) en CADA visita (línea ~420: vocab.json, vocab_hsk1/2/3,
radicales, sinonimos, hsk1-data, mapping, vocab_listening). Solo alimentan:
los stats del hero (countUp), la palabra del día y el buscador top-8.

- [ ] Diferir la carga del corpus: mover el `Promise.all` a una función
      `ensureLoaded()` que se dispare en el PRIMER `focus` (o primer `input`)
      de la caja de búsqueda, con un flag para no cargar dos veces. Mientras
      carga, placeholder "cargando…" en el desplegable.
- [ ] Stats del hero: dejar los números estáticos del HTML como fuente (ya
      existen: líneas 220-223) y eliminar el countUp dependiente de fetch, O
      generar un `chino/stats.json` diminuto (~200 bytes) con
      `scripts/check_site.py` (que ya cuenta todo) y hacer 1 solo fetch chico.
- [ ] Palabra del día: solo necesita `vocab_hsk1.json` (41 KB) + `mapping.json`
      para el 🔊. Opciones: (a) cargar solo esos 2 (83% de ahorro igual), o
      (b) precalcular en `stats.json` la palabra del día (determinista por fecha:
      `dayOfYear % 300`) y el nombre de su mp3 → 0 fetches extra.
- [ ] Verificar con Playwright (patrón de la Fase 1): red de la página al cargar
      SIN tocar el buscador = 0 fetches de JSON grandes; buscador funciona igual
      tras el primer focus; palabra del día visible.
- Resultado esperado: carga inicial del dashboard ~150 KB gzip → ~5 KB.

### 4.2 "Continuar donde quedaste" + favicon (UX de estudio)
- [ ] Bloque nuevo arriba del dashboard (bajo el hero): "→ Seguir estudiando":
      * Última clase: link directo a la clase más reciente (leer de `clases.json`
        si ya existe 4.3, o hardcodear el link y actualizarlo con cada clase).
      * Repaso pendiente: leer `localStorage['hsk1-srs']` (formato del SRS Leitner
        de `hsk1/repaso.html` — revisar su estructura antes) y mostrar "N palabras
        vencidas" con link a /hsk1/repaso.html. Si no hay datos, ocultar la línea.
      * Récords de typing/lluvia (`localStorage.typing_hsk1`, `.lluvia_hsk1`) como
        detalle menor opcional.
      OJO: localStorage es por-dispositivo; el bloque debe degradar elegante
      (display:none) si está vacío. Sin cuentas ni sync — fuera de alcance.
- [ ] Favicon: crear `chino/favicon.svg` (un 中 o 汉 rojo #c0392b sobre fondo
      transparente, SVG de ~300 bytes) + `<link rel="icon" href="/favicon.svg">`
      en dashboard, índices de curso y herramientas (script sed simple para
      inyectarlo en los <head> que no lo tengan; las clases lo heredan si se
      agrega también en ellas — opcional, empezar por dashboard y herramientas).

### 4.3 `clases.json` — matar el mantenimiento manual del árbol "Niveles"
Contexto: cada clase nueva exige editar a mano su entrada (id, conceptos,
descripción) en `chino/index.html` (árbol Niveles, líneas ~283-340) Y en
`basicoN/index.html`. Es el paso manual más caro del flujo de cierre de clase.

- [ ] Crear `chino/clases.json`: lista de cursos → clases con
      `{id, href, titulo, conceptos_html, descripcion_html, fecha}`. Poblarlo
      extrayendo las entradas ACTUALES del dashboard con un script one-shot
      (las descripciones ya escritas son la fuente; no reescribirlas).
- [ ] `chino/index.html`: renderizar el árbol Niveles desde `clases.json`
      (fetch pequeño ~15 KB, o inline en un <script> si se prefiere 0 fetches;
      decidir según 4.1). Mantener el HTML actual como fallback <noscript> o
      borrar tras verificar.
- [ ] `basico1/2/3/index.html`: renderizar sus cards desde el mismo JSON
      (filtrado por curso). OJO: sus cards tienen más detalle (fecha, secciones);
      ampliar el esquema si hace falta en vez de perder información.
- [ ] Actualizar CLAUDE.md (checklist de cierre de clase): "agregar la entrada
      en chino/clases.json" reemplaza "editar 2 índices a mano".
- [ ] Validador: chequear que todo `claseNN.html`/`capNN.html` en disco tenga
      entrada en clases.json y viceversa (mata el problema de clases huérfanas).

### 4.4 Validador v2 — atrapar la deriva de datos
- [ ] `check_site.py`: nuevo chequeo (WARNING, no error, al principio) de
      divergencia `py`/`es` para el mismo `hz` entre `hsk1-data.json` y
      `vocab_hsk1.json` (144 palabras compartidas; divergencia real ya conocida:
      爱 "amar / encantar" vs "amar, querer"). Reportar lista completa una vez
      y decidir con Basti cuál es la glosa canónica antes de promoverlo a error.
- [ ] Chequeo de huérfanas (si no se hizo en 4.3): toda clase en disco enlazada
      desde su índice de curso.

### 4.5 Config del VPS (una sola visita SSH, [REQUIERE A BASTI] o pedirle acceso)
Juntar en una sola sesión de nginx todo lo que quedó pendiente del plan:
- [ ] `location /audio/ { add_header Cache-Control "public, max-age=31536000, immutable"; }`
      (los MP3 tienen nombre hasheado inmutable — nunca cambian de contenido).
      Igual para `/assets/` pero con max-age menor (86400) porque clase.css/js
      SÍ cambian sin cambiar de nombre.
- [ ] `error_page 404 /404.html;` (la página ya está desplegada desde Fase 3.2).
- [ ] Cabeceras: `add_header X-Content-Type-Options nosniff;` + CSP básica
      (permitir 'self', dong-chinese.com para links no hace falta —es <a>—, sí
      el CDN de HanziWriter que usa radicales.html: verificar cuál es antes).

---

## Orden de ejecución sugerido y esfuerzo estimado

| Sesión | Contenido | Tokens aprox. | Estado |
|--------|-----------|---------------|--------|
| 1 | Fase 0 completa (0.1 y 0.4 requieren a Basti) + 2.3 | 50-100k | ✅ hecha |
| 2 | 2.1 + 2.2 (script audio + validador + CI) | 60-100k | ✅ hecha |
| 3 | 1.1 + 1.2 (CSS/JS compartido + audioMap por fetch) | 150-300k | ✅ hecha |
| 4 | 1.3 + 1.4 + 1.5 + Fase 3 | 100-150k | ✅ hecha (1.3 y parte de 1.5 pendientes) |
| 5 | **4.1 + 4.2** (lazy-load buscador + continuar/favicon) | 60-100k | ⏳ |
| 6 | **4.3 + 4.4** (clases.json + validador v2) | 80-120k | ⏳ |
| 7 | **4.5** (nginx: cache/404/headers — sesión SSH con Basti) + 1.3 radicales | 40-80k | ⏳ |

Notas para el modelo ejecutor:
- Las fases 2.1/2.2 van ANTES del refactor 1.1/1.2 a propósito: el validador es
  la red de seguridad del refactor masivo.
- Cada `[REQUIERE A BASTI]` / `[DECISIÓN DE BASTI]` es un punto de parada real:
  no asumir la respuesta.
- Al terminar cada fase: marcar los checkboxes de este archivo, commit y push.
