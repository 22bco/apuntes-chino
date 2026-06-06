# 🎓 Reorganizar una clase en bloques pedagógicos


**Para Claude:** cuando Basti diga *"reorganiza la clase según REORGANIZAR-CLASE.md"* (o
similar), aplica este procedimiento al archivo de la clase actual
(`chino/basicoX/claseYY.html`). Sirve para ordenar secciones que se fueron creando "en
vivo" y dejarlas en una progresión clara, separando lo **principal** de lo **secundario**.

> 💡 Durante la clase en vivo se agregan secciones **al final** (rápido). Esta
> reorganización se corre **al cerrar la clase** o cuando Basti lo pida.

---

## 1. Filosofía pedagógica

Ordenar de lo más concreto/central a lo más fino, agrupando por tema. Regla mental:
**núcleo del día → gramática que apareció → pronunciación/fonética → repaso de apoyo.**

- **Principal** = el tema nuevo central de la clase (lo que da nombre a la clase).
- **Secundario** = matices, notas finas, pronunciación, datos culturales, excepciones.
- El **repaso** va al inicio (calentamiento) o se marca como tal.

## 2. Estructura de bloques estándar

Agrupar las secciones en **bloques temáticos** (ajustar nombres según la clase):

| Bloque | Contenido típico |
|--------|------------------|
| 🔁 **Repaso para entrar en calor** | Lo de clases anteriores que se reactivó |
| 🌤️ **[Tema central]** | El tema nuevo: preguntar/responder, vocabulario, diálogos |
| 🧩 **La gramática del día** | Estructuras gramaticales (partículas, patrones, oraciones) |
| 🗣️ **Rincón de pronunciación** | Sonidos difíciles, diagramas, cambios de tono (变调) |

Dentro de cada bloque: primero lo más usado/central, después los matices.

## 3. Estilo visual (mantener la estética roja + mono)

- **Divisor de bloque** (banda oscura antes de cada bloque):
  ```html
  <!-- ░░░ BLOQUE n ░░░ -->
  <div style="margin:48px 0 10px; padding:16px 20px; background:linear-gradient(135deg,#1a1a2e 0%,#2a2a4a 60%,#3a1a28 100%); color:#fff; border-radius:14px; box-shadow:0 4px 14px rgba(26,26,46,.18);">
    <div style="font-size:0.7em; letter-spacing:2.5px; text-transform:uppercase; color:#f1948a; font-weight:700;">Bloque {n}</div>
    <div style="font-size:1.2em; font-weight:700; margin-top:3px;">{emoji} {título}</div>
    <div style="font-size:0.84em; color:#c9c9dc; margin-top:5px;">{descripción corta}</div>
  </div>
  ```
- **Índice (`<nav>`) agrupado por bloque**: una etiqueta + un `<ol start="N">` por bloque.
  ```html
  <div style="margin:12px 0 4px; font-weight:700; color:#c0392b; font-size:0.88em;">🌤️ El clima</div>
  <ol start="3"> ... </ol>
  ```
- **Nota intro "🧭 En esta clase"** arriba: resume el tema central y lista los bloques.
- Marcador de sección antes de cada `<h2>`: `<!-- ═══ SECCIÓN n ═══ -->`.
- Colores de `<h2>`: rojo (default), `.green`, `.blue`, `.gold`, `.gray`, `.purple`. No
  repetir el mismo color en dos secciones adyacentes dentro del mismo bloque.

## 4. Proceso técnico (seguro)

Reordenar a mano es propenso a errores. **Usar un script de Python** que reconstruye el
cuerpo y deja intactos el `<head>/<style>` y el `<script>/audioMap`:

1. **Leer** el archivo; identificar las secciones por sus `<h2 id="sN">` (o por los
   marcadores `<!-- ═══ SECCIÓN n ═══ -->`).
2. **Extraer** el cuerpo de cada sección (de su `<h2>` hasta antes del siguiente),
   quitando divisores de bloque viejos y comentarios sobrantes.
3. **Reordenar** según el plan de bloques. Si una sección "creció" mezclando temas (p. ej.
   pronunciación dentro de la sección del clima), **dividirla** por su `<h3>`.
4. **Renumerar** todo: `id="sN"`, el número visible `N.` del `<h2>`, y el `<nav>`.
   Reasignar `s1..sN` de corrido en el nuevo orden.
5. **Corregir referencias cruzadas**: toda mención `Sección N` y todo `href="#sN"` debe
   apuntar al **número nuevo** de la sección destino (mapear por contenido, no por número
   viejo). Hacerlo en una sola pasada para no re-reemplazar.
6. **Reensamblar**: `head` + `<nav>` nuevo + intro + (divisor + secciones) por bloque +
   navegación inferior + `<script>`. No tocar el `audioMap`.
7. **Escribir** y **validar** (ver checklist).

> El `audioMap` no depende del orden; los botones 🔊 se enganchan por `td.hz`/`.dialog .hz`.
> No hace falta regenerar audio salvo que se agregue vocabulario nuevo.

## 5. Checklist de validación (con grep)

```bash
grep -c "BLOQUE [0-9] ░░░" archivo.html      # nº de bloques esperado
grep -c '<h2 id="s'        archivo.html      # nº de secciones
grep -c "AQUÍ VAN"         archivo.html      # debe ser 0 (sin marcadores sobrantes)
grep -o '<div'  archivo.html | wc -l          # balance de <div>...
grep -o '</div>' archivo.html | wc -l         #   ...debe coincidir
grep -n 'Sección [0-9]\|href="#s[0-9]' archivo.html   # revisar refs apunten bien
```
Luego abrir en el navegador (`python3 -m http.server` desde `chino/`) y revisar
visualmente: índice agrupado, divisores, y que ninguna caja quedó en el bloque equivocado.

## 6. Errores típicos a vigilar

- **Cajas atrapadas en el bloque equivocado** al dividir una sección (revisar qué quedó
  entre el `<h3>` extraído y el siguiente `<h3>`).
- **Referencias cruzadas rotas** tras renumerar (paso 5).
- Doble reemplazo de números (usar mapeo viejo→nuevo en una pasada o placeholders).
- Dejar marcadores `<!-- AQUÍ VAN LAS SECCIONES -->` u otros sobrantes.
