# 06 — Diagrama de estados: la vida de una palabra en el SRS

> App de práctica de chino · [Volver al índice](INDEX.md)
> El ciclo Leitner completo de una palabra, de desconocida a dominada.
> Es la máquina de estados que implementa `domain/Leitner.kt`.

## Ciclo de vida de una palabra

```mermaid
stateDiagram-v2
    direction LR

    [*] --> Nueva : entra al catálogo (refresh)

    Nueva --> Caja1 : 1ª vez, incorrecta
    Nueva --> Caja2 : 1ª vez, correcta

    Caja1 --> Caja2 : ✅ (due +1 día)
    Caja2 --> Caja3 : ✅ (due +3 días)
    Caja3 --> Caja4 : ✅ (due +7 días)
    Caja4 --> Caja5 : ✅ (due +21 días)
    Caja5 --> Caja5 : ✅ (due +21 días)

    Caja2 --> Caja1 : ❌ incorrecta
    Caja3 --> Caja1 : ❌ incorrecta
    Caja4 --> Caja1 : ❌ incorrecta
    Caja5 --> Caja1 : ❌ incorrecta

    note right of Caja1
        Fallar SIEMPRE devuelve a Caja 1,
        sin importar dónde estaba.
        (invariante 3 del dominio)
    end note

    note right of Caja5
        "Dominada": se sigue repasando
        cada 21 días para siempre.
        No hay estado terminal.
    end note
```

## Estados dentro de una sesión de repaso (RepasoViewModel)

La otra máquina de estados: la de la **pantalla** durante una sesión (S1 de
[05-secuencias.md](05-secuencias.md)).

```mermaid
stateDiagram-v2
    [*] --> Cargando : abrir Repaso
    Cargando --> SinPendientes : cola vacía
    Cargando --> MostrandoFrente : hay cola

    MostrandoFrente --> MostrandoReverso : destapar
    MostrandoReverso --> MostrandoFrente : responder (quedan tarjetas)
    MostrandoReverso --> Resumen : responder (era la última)

    SinPendientes --> [*] : "🎉 nada por hoy"
    Resumen --> [*] : cerrar sesión

    note right of MostrandoReverso
        Aquí (y solo aquí) se llama a
        Leitner.responder() y se persiste.
        Estado de UI y estado de dominio
        cambian en el mismo evento.
    end note
```

## Por qué modelar esto como máquinas de estados

1. **Cada `state` es una data class de Kotlin** (`sealed interface RepasoUiState`)
   y Compose pinta por `when` exhaustivo — el compilador te obliga a dibujar
   todas las pantallas posibles. Los diagramas de arriba SON el código.
2. Los tests del dominio se leen directo del primer diagrama:
   `caja5 + incorrecta → caja1`, `nueva + correcta → caja2`, etc. Una fila de
   la tabla de transiciones = un test unitario.
3. Si un estado no está en el diagrama, no existe en la app — no hay "pantalla
   rara" alcanzable por un camino no dibujado.
