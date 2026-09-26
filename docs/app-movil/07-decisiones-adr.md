# 07 — Decisiones de arquitectura (ADR)

> App de práctica de chino · [Volver al índice](INDEX.md)
> Formato corto: contexto → decisión → consecuencias. Decididas el 4 jul 2026
> (sesión de arquitectura con Claude; contexto completo en [APP-MOVIL.md](../../APP-MOVIL.md)).

## ADR-001 · Android nativo con Kotlin + Jetpack Compose
- **Contexto:** el objetivo declarado es **aprender desarrollo mobile**; Basti usa Android; una sola persona mantiene todo.
- **Decisión:** Kotlin + Compose + Material 3, sin frameworks intermedios.
- **Descartado:** PWA/Capacitor (no enseñan plataforma — aunque la PWA sigue viva en PLAN-MEJORAS 3.4 para cubrir iPhone), Flutter/RN (enseñan un framework paralelo y cierran la puerta KMP), doble nativo Kotlin+Swift (dos codebases insostenible).
- **Consecuencias:** (+) aprendizaje de la plataforma real, stack estándar de la industria, camino natural a Kotlin Multiplatform para iOS. (−) iOS no existe en v1; llegar a algo usable toma semanas, no días.

## ADR-002 · El sitio existente es el backend (solo lectura)
- **Contexto:** chino.basti.cl ya sirve JSON de vocabulario + 3200 MP3, documentados en `chino/DATA.md` y validados por CI.
- **Decisión:** la app consume esos archivos vía HTTPS; **cero backend nuevo en v1**.
- **Consecuencias:** (+) nada nuevo que operar/pagar; el contenido se actualiza solo. (−) los JSON se convierten en **contrato**: cambios de esquema en el sitio deben considerar la app (el CI ayuda). Sin datos por-usuario en el servidor (ver ADR-005).

## ADR-003 · Alcance: compañera de práctica, no port del sitio
- **Contexto:** las clases son ~30 HTML que se arman en vivo cada sábado; portarlas duplicaría el pipeline de contenido para siempre.
- **Decisión:** la app cubre SOLO el loop de práctica (SRS, quiz, audio, notificación, widget). Las clases/guías se abren en el navegador (Custom Tabs).
- **Regla de oro:** si publicar una clase nueva obliga a tocar la app, el diseño está mal.
- **Consecuencias:** (+) proyecto terminable por una persona; sin doble mantenimiento. (−) la experiencia de "leer la clase" no es nativa (aceptado: se lee 1 vez/semana; se practica todos los días).

## ADR-004 · Room con catálogo y progreso en tablas separadas
- **Contexto:** la app debe funcionar offline y el refresh del catálogo no puede arriesgar el progreso del usuario.
- **Decisión:** `palabra` (copia del sitio, se upserta) y `tarjeta_srs` (progreso local, solo la toca Leitner) — clave compartida: el hanzi. Detalle en [04-er-room.md](04-er-room.md).
- **Consecuencias:** (+) imposible que un refresh pise cajas; export/import trivial; misma clave (`hz`) que usa la web en localStorage → mapeo 1:1. (−) JOIN para armar la cola (irrelevante con ~300-1000 filas).

## ADR-005 · Progreso: export/import primero, sync después (si duele)
- **Contexto:** con web + app habrá dos silos de progreso; un backend de sync es la primera pieza de servidor "real" del proyecto.
- **Decisión:** v1 = export/import manual de JSON **con el mismo esquema que la web** (diseñar junto con PLAN-MEJORAS 5.4). v2 = endpoint mínimo en el VPS (FastAPI, un JSON por usuario, token simple) **solo si el manual duele en la práctica**.
- **Consecuencias:** (+) cero servidor hasta tener evidencia de necesidad (anti sobre-ingeniería). (−) sincronizar es un paso manual mientras tanto.

## ADR-006 · Audio cache-first apoyado en nombres inmutables
- **Contexto:** los MP3 del sitio se llaman `zh_{md5(texto)[:10]}.mp3` → si el archivo existe, su contenido jamás cambia.
- **Decisión:** ExoPlayer + SimpleCache con política cache-first sin TTL ni invalidación (secuencia S4 en [05-secuencias.md](05-secuencias.md)). Complementa PLAN-MEJORAS 4.5 (`Cache-Control: immutable` en nginx).
- **Consecuencias:** (+) offline casi gratis; cada audio se descarga a lo más una vez. (−) el caché crece con el uso (~68 MB si se escuchara TODO; aceptable — SimpleCache tiene límite LRU configurable).

## ADR-007 · Lógica de dominio en Kotlin puro (sin Android)
- **Contexto:** el SRS Leitner ya existe probado en JS (`repaso.html`); queremos testearlo fácil y dejar abierta la puerta a iOS.
- **Decisión:** `domain/` (Leitner, modelos, invariantes) no importa nada de Android. Los diagramas de [03-modelo-dominio.md](03-modelo-dominio.md) y [06-estados-srs.md](06-estados-srs.md) viven ahí.
- **Consecuencias:** (+) tests JUnit sin emulador; módulo compartible vía KMP el día de iOS. (−) disciplina: resistir la tentación de "un Context chiquito" en el dominio.
