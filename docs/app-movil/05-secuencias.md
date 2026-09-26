# 05 — Diagramas de secuencia

> App de práctica de chino · [Volver al índice](INDEX.md)
> Los 4 flujos que definen la app. Cada uno cruza las capas de
> [01-arquitectura-c4.md](01-arquitectura-c4.md): UI → ViewModel → Repository → fuentes.

## S1 · Sesión de repaso SRS (UC-01, el flujo estrella)

```mermaid
sequenceDiagram
    actor E as Estudiante
    participant UI as RepasoScreen
    participant VM as RepasoViewModel
    participant SR as SrsRepository
    participant L as Leitner (domain)
    participant DB as Room

    E->>UI: abre "Repaso"
    UI->>VM: init
    VM->>SR: armarSesion(ahora)
    SR->>DB: tarjetas con due <= ahora
    SR->>DB: palabras sin tarjeta (nuevas, máx N)
    SR->>L: armarCola(vencidas, nuevas)
    L-->>SR: cola ordenada
    SR-->>VM: SesionRepaso
    VM-->>UI: state: tarjeta actual (hanzi)
    E->>UI: destapa la tarjeta
    UI-->>E: pinyin + español + 🔊
    E->>UI: "✅ la sabía"
    UI->>VM: responder(correcta = true)
    VM->>L: responder(tarjeta, true, ahora)
    L-->>VM: tarjeta' (caja+1, nuevo due)
    VM->>SR: guardar(tarjeta')
    SR->>DB: UPSERT tarjeta_srs
    VM-->>UI: state: siguiente tarjeta
    Note over VM,UI: ...repite hasta agotar la cola...
    VM-->>UI: state: resumen (correctas/incorrectas)
```

**Punto didáctico:** la UI nunca decide nada — cada tap se traduce en un evento
al ViewModel, y la pantalla solo pinta el estado que este publica. Si esto queda
claro, Compose + MVVM ya está entendido.

## S2 · Refresh del catálogo al abrir la app (UC-09)

```mermaid
sequenceDiagram
    participant APP as App start
    participant VR as VocabRepository
    participant K as Ktor Client
    participant SITE as chino.basti.cl
    participant DB as Room
    participant UI as Pantallas (observan Flow)

    APP->>VR: refreshSiCorresponde()
    alt pasó < 24 h del último refresh
        VR-->>APP: skip (throttle)
    else hay que refrescar
        VR->>K: GET /vocab_hsk1.json
        K->>SITE: HTTPS
        alt sin red / error HTTP
            SITE--xK: falla
            K--xVR: excepción
            VR-->>APP: silencioso — la app vive de Room
        else 200 OK
            SITE-->>K: JSON (300 palabras)
            K-->>VR: List~Palabra~
            VR->>DB: UPSERT solo tabla palabra
            Note over VR,DB: JAMÁS toca tarjeta_srs
            DB-->>UI: los Flow emiten → UI se repinta sola
        end
    end
```

**Punto didáctico:** la UI ni se entera de que hubo red. Observa Room con
`Flow`, y Room "avisa" cuando cambian filas. Offline-first sale de este dibujo.

## S3 · Notificación diaria (UC-06 — sin servidor)

```mermaid
sequenceDiagram
    participant OS as Android OS
    participant W as RepasoWorker (WorkManager)
    participant SR as SrsRepository
    participant DB as Room
    participant N as NotificationManager
    actor E as Estudiante

    OS->>W: ~09:00 (periodic work)
    W->>SR: conteoVencidas(ahora)
    SR->>DB: COUNT tarjetas due <= ahora
    DB-->>SR: 12
    alt conteo == 0
        W-->>OS: done (no molestar)
    else conteo > 0
        W->>N: notificar("12 palabras por repasar · 加油!")
        N-->>E: 🔔
        E->>OS: tap en la notificación
        OS->>OS: deep link → RepasoScreen (S1)
    end
```

## S4 · Audio con caché (UC-03 — por qué los nombres hasheados son oro)

```mermaid
sequenceDiagram
    actor E as Estudiante
    participant UI as Pantalla
    participant AP as AudioPlayer (ExoPlayer)
    participant C as SimpleCache (disco)
    participant SITE as chino.basti.cl

    E->>UI: tap 🔊 en 你好
    UI->>AP: play("zh_7eca689f0d.mp3")
    AP->>C: ¿está en caché?
    alt HIT (ya se escuchó alguna vez)
        C-->>AP: bytes locales
        AP-->>E: ▶ suena al instante, offline OK
    else MISS (primera vez)
        AP->>SITE: GET /audio/zh_7eca689f0d.mp3
        SITE-->>AP: MP3
        AP->>C: guardar (para siempre)
        AP-->>E: ▶ suena
    end
    Note over C: El nombre = hash del texto ⇒ el contenido<br/>NUNCA cambia ⇒ caché sin invalidación, sin TTL,<br/>sin ETags. La política más simple posible.
```
