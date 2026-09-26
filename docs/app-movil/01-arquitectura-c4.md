# 01 — Arquitectura del sistema (C4)

> App de práctica de chino · Kotlin + Jetpack Compose · [Volver al índice](INDEX.md)
> Fuente de decisiones: [APP-MOVIL.md](../../APP-MOVIL.md) y [07-decisiones-adr.md](07-decisiones-adr.md)

## Nivel 1 — Contexto

Quién usa el sistema y con qué habla. La clave: **no hay backend nuevo** — el
sitio estático existente ES el proveedor de datos (solo lectura).

```mermaid
flowchart TB
    B(["👤 Basti\n(estudiante)"])

    subgraph telefono["📱 Teléfono Android"]
        APP["App de práctica\nKotlin + Compose"]
    end

    SITE["🌐 chino.basti.cl\nSitio estático (nginx + VPS)\nJSON de vocabulario + MP3"]
    WEB["🌐 Sitio web (navegador)\nclases, guías, herramientas"]
    SYNC["☁️ Endpoint de sync\n(FUTURO v2, FastAPI en el VPS)"]

    B -->|"estudia, repasa,\nrecibe notificaciones"| APP
    B -->|"lee las clases del sábado"| WEB
    APP -->|"HTTPS GET (solo lectura):\nvocab_hsk1.json · hsk1-data.json\nmapping.json · stats.json · *.mp3"| SITE
    APP -.->|"abre clases/guías\n(Custom Tabs)"| WEB
    APP -.->|"v2: sync de progreso"| SYNC

    style SYNC stroke-dasharray: 5 5
```

## Nivel 2 — Contenedores

Dentro del teléfono. La app es un solo contenedor Android; el "backend" son
archivos estáticos servidos por nginx.

```mermaid
flowchart TB
    subgraph android["📱 App Android (un APK)"]
        UI["UI · Jetpack Compose\nMaterial 3 · pantallas + navegación"]
        VM["ViewModels\nestado de pantalla (StateFlow)\nlógica de sesión SRS/quiz"]
        REPO["Repositories\núnica puerta a los datos"]
        ROOM[("Room (SQLite)\ncatálogo cacheado + progreso SRS")]
        KTOR["Ktor Client\nHTTP hacia el sitio"]
        EXO["Media3 / ExoPlayer\n+ SimpleCache de MP3"]
        WM["WorkManager\nchequeo diario → notificación"]
        GLANCE["Glance\nwidget palabra del día"]
        DS[("DataStore\najustes")]
    end

    subgraph vps["🌐 chino.basti.cl"]
        JSON["/vocab_hsk1.json\n/hsk1/hsk1-data.json\n/audio/mapping.json\n/stats.json"]
        MP3["/audio/zh_*.mp3\n(nombres hasheados inmutables)"]
    end

    UI --> VM --> REPO
    REPO --> ROOM
    REPO --> KTOR
    REPO --> DS
    UI --> EXO
    EXO -->|"cache miss"| MP3
    KTOR --> JSON
    WM --> REPO
    GLANCE --> REPO
```

**Reglas de dependencia (las flechas solo apuntan hacia adentro/abajo):**
- La UI no conoce Room ni Ktor; solo observa ViewModels.
- Los ViewModels no saben si un dato vino de la red o del disco; solo llaman al Repository.
- El Repository es el único que decide *de dónde* sale cada dato (política cache-first).
- WorkManager y Glance entran por el Repository igual que la UI — sin atajos.

## Nivel 3 — Componentes del contenedor app

Organización en paquetes Kotlin (módulo único en v1; la separación en módulos
`data`/`domain` queda para cuando se explore Kotlin Multiplatform).

```mermaid
flowchart LR
    subgraph ui["ui/"]
        direction TB
        NAV["AppNavHost\n(navegación)"]
        S1["RepasoScreen"]
        S2["QuizScreen"]
        S3["VocabScreen"]
        S4["HoyScreen\n(palabra del día + resumen)"]
    end

    subgraph vm["viewmodel/"]
        direction TB
        VM1["RepasoViewModel"]
        VM2["QuizViewModel"]
        VM3["VocabViewModel"]
        VM4["HoyViewModel"]
    end

    subgraph data["data/"]
        direction TB
        R1["VocabRepository"]
        R2["SrsRepository"]
        DAO["Room: PalabraDao · TarjetaSrsDao"]
        API["ChinoApi (Ktor)\nGET a los JSON del sitio"]
        AUD["AudioPlayer\n(ExoPlayer + SimpleCache)"]
    end

    subgraph dominio["domain/"]
        direction TB
        LEITNER["Leitner.kt\nlógica pura del SRS\n(portada de repaso.html)"]
        MODELS["Palabra · TarjetaSrs\n(modelos)"]
    end

    S1 --> VM1 --> R2
    S2 --> VM2 --> R2
    S3 --> VM3 --> R1
    S4 --> VM4 --> R1
    R1 --> DAO
    R1 --> API
    R2 --> DAO
    VM1 --> LEITNER
    R2 --> LEITNER
```

**Nota pedagógica:** `domain/Leitner.kt` es Kotlin puro (sin imports de Android).
Eso lo hace testeable con JUnit a secas y portable a KMP el día de iOS.

## El contrato de datos (la "API")

| Recurso | Método | Qué trae | Usado por |
|---|---|---|---|
| `/vocab_hsk1.json` | GET | 300 palabras `{hz, py, es, cat, banda, audio}` | catálogo principal |
| `/hsk1/hsk1-data.json` | GET | 150 del sílabo `{hz, py, es, tema, clases[]}` | temas + trazabilidad |
| `/audio/mapping.json` | GET | `texto → archivo.mp3` | resolver audio de frases |
| `/stats.json` | GET | agregados (última clase, conteos) | pantalla Hoy |
| `/audio/zh_*.mp3` | GET | audio (inmutable por nombre) | ExoPlayer, cache-first |

⚠️ Estos archivos son un **contrato**: renombrar un campo rompe la app.
Están documentados en [`chino/DATA.md`](../../chino/DATA.md) y validados por CI.
