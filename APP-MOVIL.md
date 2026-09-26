# APP-MOVIL.md — Plan de la app de práctica (idea futura)

> Decisión de arquitectura pensada el 4 de julio de 2026. Estado: **idea planificada,
> sin fecha**. Separada a propósito de PLAN-MEJORAS.md (que es del sitio web).
>
> 📐 **Documentación de ingeniería completa** (C4, casos de uso, dominio, ER,
> secuencias, estados, ADRs — 13 diagramas Mermaid):
> **[docs/app-movil/INDEX.md](docs/app-movil/INDEX.md)**

## Decisión

**App nativa Android en Kotlin + Jetpack Compose**, con alcance de **compañera de
práctica** (no un port del sitio).

Contexto de la decisión (respuestas de Basti):
- Objetivo principal: **aprender desarrollo mobile** (el esfuerzo extra es feature).
- Plataforma: **Android primero** (Basti usa Android; iOS puede esperar).
- Alcance: compañera de práctica — decidido por razonamiento de scope (abajo).

## Alcance de la v1 (qué SÍ y qué NO)

**SÍ (el loop de práctica):**
- Repaso SRS Leitner (portar la lógica de `chino/hsk1/repaso.html` — 5 cajas,
  intervalos 1/3/7/21 días, formato `{hz: {box, due}}`)
- Quiz de vocabulario (hz→es, es→hz, audio→hz)
- Reproducción de audio con caché offline (los 3200+ MP3)
- Notificación diaria: "N palabras por repasar" (WorkManager)
- Widget de pantalla de inicio: palabra del día (Glance)
- Palabra del día + búsqueda simple del vocabulario

**NO (se queda en la web, la app enlaza):**
- Las clases (30 HTML que se arman en vivo cada sábado) → Custom Tabs al sitio
- Las guías HSK, radicales con HanziWriter, herramientas web
- Cuentas de usuario / social / nada que requiera backend nuevo

**Regla de oro:** la app NUNCA duplica contenido del sitio. Si una clase nueva
requiere tocar la app, el diseño está mal.

## Arquitectura

```
Android (Kotlin + Jetpack Compose + Material 3)
  Patrón: MVVM — ViewModel + StateFlow + Repository
  ├── Remote: Ktor Client → https://chino.basti.cl (API de facto, solo lectura)
  │     vocab_hsk1.json (300 palabras {hz,py,es,cat,banda,audio})
  │     hsk1-data.json  (150 palabras del sílabo {hz,py,es,tema,clases})
  │     audio/mapping.json (texto → mp3)
  │     stats.json (agregados del dashboard)
  ├── Local: Room (vocab cacheado + estado SRS) · DataStore (ajustes)
  ├── Audio: Media3/ExoPlayer con SimpleCache
  │     Los MP3 tienen nombre hasheado INMUTABLE → cache-first sin invalidación.
  ├── WorkManager: chequeo diario del SRS → notificación local
  └── Glance: widget palabra del día
```

**Principios:**
1. **El sitio es el backend.** Cero servidor nuevo en v1. Los JSON del sitio son
   el contrato de datos — `chino/DATA.md` es su documentación y el CI del repo
   los valida. No renombrar campos sin pensar en la app.
2. **Progreso:** v1 usa export/import de JSON compatible con el de la web
   (tarea 5.4 de PLAN-MEJORAS — diseñar ambos con el MISMO formato).
   v2 (si duele): endpoint mínimo de sync en el VPS (FastAPI, un JSON por
   usuario, token simple). Es la primera pieza de servidor real del proyecto.
3. **Deep links al sitio** para todo el contenido (clases, guías).

## Qué se descartó y por qué

| Opción | Por qué no |
|---|---|
| PWA / Capacitor como camino principal | No enseñan la plataforma (objetivo = aprender). La PWA sigue en PLAN-MEJORAS 3.4 como complemento para iOS. |
| Flutter / React Native | Enseñan un framework paralelo, no Android; cierran la puerta a Kotlin Multiplatform. |
| Kotlin + Swift (doble nativo) | Dos codebases para una persona = insostenible. |
| Portar todo el sitio a la app | Doble mantenimiento de contenido cada sábado → el proyecto muere. |

**Puerta abierta a iOS:** al ser Kotlin, el día que se quiera iOS el camino es
Kotlin Multiplatform (mover data/domain a un módulo compartido, UI SwiftUI).
Mientras tanto, la PWA cubre iPhone.

## Ruta de aprendizaje sugerida (hitos chicos, cada uno usable)

1. **Kotlin + Compose básico** — codelabs oficiales de Android (Compose camp).
2. **MVP lista de vocabulario**: Ktor trae `vocab_hsk1.json`, lista con búsqueda,
   tap → reproduce el MP3 (ExoPlayer). *Primera app real funcionando.*
3. **Room + SRS**: persistir vocab + portar la lógica Leitner de repaso.html.
   Pantalla de repaso con las 5 cajas.
4. **WorkManager**: notificación diaria con el conteo de vencidas.
5. **Quiz** (3 modos) + rachas.
6. **Widget Glance** palabra del día + pulido (haptics, animaciones, dark mode).
7. (v2) Export/import de progreso compatible con la web → luego sync por VPS.

## Cuándo y cómo usar nWave (evaluado 4 jul 2026)

Consultado el concierge de nWave contra este repo. Veredicto:
- **Para el sitio: NO** — PLAN-MEJORAS.md ya es la metodología y funciona; las
  waves formales serían ceremonia sobre refactors acotados.
- **Para la app: sí, pero quirúrgico y recién en el hito 3** (Room + SRS):
  - `/nw-distill` apuntando a `docs/app-movil/02-casos-de-uso.md` (UC-01) para
    traducir los casos de uso a escenarios Given-When-Then.
  - `/nw-deliver` para implementar `domain/Leitner.kt` con TDD (RED→GREEN→COMMIT)
    — calza con ADR-007 (dominio en Kotlin puro, testeable sin emulador).
  - **Evitar**: `/nw-discover`, `/nw-discuss` (duplicarían APP-MOVIL.md y
    docs/app-movil/), `/nw-devops` (v1 no tiene backend ni CI).
- Piloto reversible: si el flujo no convence, docs/app-movil/ sigue siendo la
  fuente de verdad y no se pierde nada.

## Prerequisitos del lado del sitio (ya planificados, ayudan a la app)

- PLAN-MEJORAS **4.5**: `Cache-Control: immutable` para `/audio/` (la app cachea mejor).
- PLAN-MEJORAS **5.4**: formato de export/import de progreso (compartirlo con la app).
- Tratar los JSON como API estable (ya protegidos por `check_site.py` en CI).
