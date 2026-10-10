# Dirección — Intermedio 1 · Clase 04

**Tempo** 112 BPM, 4/4 (pulso 0,5357 s · compás 2,1429 s) · **69 compases = 147,86 s** · 60 fps · lienzo 1920×1080.
Fuente de verdad: `timeline.json` (imagen y sonido leen la misma tabla). Todo se ancla a pulsos o corcheas.

## Concepto
«Un día en líneas». Cada escena nace de un trazo de la anterior: la clase va de la mañana (起床) al cansancio de la noche (累了, 休息), y la cámara sigue una sola línea roja (#e74c3c) que se vuelve horizonte, pista, regla, puerta, cuerda. Fondo tinta cálida `#15110f`, papel `#f3ece2` para hanzi, acento rojo `#e74c3c`, apoyo jade `#2a9d8f` (pinyin/tonos) y ámbar `#f2b134` (notas de gramática). Hanzi grande (zh.woff2), pinyin en display latino con tonos (latin.woff2), español en latin-body.woff2.

**Gramática de cada ítem**: hanzi cae en kick (o impact en drops) con overshoot `easeOutBack`; pinyin se teclea en 2-4 fragmentos sobre hats/clicks en corcheas; español entra en whoosh con barrido lateral y desenfoque de movimiento. Los ítems quedan en pantalla: los anteriores se encogen a una columna a la izquierda (escala 0,55, opacidad 0,6); el último queda ≥3,2 s completo antes del cambio de escena. La `nota` aparece con chime en el pulso 20 de cada escena. En las escenas de columna los ítems caen en los pulsos 1 · 6 · 11 · 16, el pinyin se teclea entre +0,5 y +1,5 pulsos y el español entra en +2 (≥1,4 s de héroe completo antes de pasar a la columna; el último, 3,2 s).

**Cambio de escena del texto**: nunca un fundido. La línea roja barre la pantalla de izquierda a derecha y borra el texto anterior (recorte por la barra) durante el primer pulso; en los drops, corte en seco.

## Escenas (compás · transición de entrada)
| # | id | compases | concepto visual |
|---|----|----------|-----------------|
| 1 | intro | 0-3 | Loop: el punto rojo crece a línea y escribe 中级一 / 第四课 por dash offset. |
| 2 | qichuang | 3-9 | El 捺 de 课 se aplana en horizonte; sol rojo sube (早上). Línea de tiempo 每天→早上→几点→起床. |
| 3 | shibushi | 9-15 | El 。 rebota y se vuelve pelota; pista de carriles para 跑步; 是/不是 como bifurcación. |
| 4 | henshao | 15-21 | Carriles → escala 每天›常常›有时候›很少, cursor rojo desliza al extremo. |
| 5 | chuyuan | 21-27 | Cursor gira y morph a cruz roja; 住 cae adentro, 出 flota afuera. Riser en el último compás. |
| 6 | haoduole | 27-33 | **DROP**. Puerta → paneles A/B. Frases B en impact + flash 1 f + shake. |
| 7 | gao | 33-39 | Gancho de 了 → regla de altura; 1,74 medido con marcas en hats. |
| 8 | zhidao | 39-45 | La marca se enrolla en balón 球; 知道/会/认识 como tres órbitas. Riser. |
| 9 | dawei | 45-51 | **DROP**. Balón estalla en partículas que forman 大卫; 二十多 / 一米八几 con dígito «tragamonedas». |
| 10 | mang-xiuxi | 51-57 | 几 gira a reloj saturado; 但是 corta la pantalla en dos. Riser. |
| 11 | zhanglaoshi | 57-63 | **DROP**. Trazo 一 tenso dispara 张; 会…吧 con signo de interrogación suave. |
| 12 | cierre | 63-69 | **BREAK** (1 compás, sin batería): todo se drena a los signos de tono. Outro: retícula 4×2 de las 8 palabras clave, lockup 再见！下次见。 |

## Técnicas
- **Función pura del tiempo**: `render(t)`, sin estado entre cuadros; cada valor = interpolación con easing entre tiempos clave del timeline. PRNG `mulberry32` con semilla fija por escena.
- **Trazos** con `strokeDasharray/dashOffset` (hanzi y líneas guía); **morph** de trazos (línea → cruz, línea → círculo) por interpolación de puntos remuestreados.
- **Partículas que forman texto**: destinos muestreados del glifo en un canvas fuera de pantalla (una vez, determinista); trayectoria analítica `p(t) = lerp(origen, destino, ease(t))` + ruido con semilla.
- **Cámara**: dolly/zoom lento continuo por escena; shake analítico `A·e^(−kΔt)·sin(ωΔt)` solo tras impact/sub_drop.
- **Desenfoque de movimiento**: 6-8 submuestras de `render(t − i·Δ)` acumuladas en whoosh y en el riser.
- **Grano** con semilla por cuadro (`floor(t·fps)`), **viñeta** que respira con el snare.
- **Glitch** (desplazamiento RGB + cortes horizontales) solo 3 cuadros en cada impact; **flashes** de 1-3 cuadros (1 f en frases B, 2 f en transición de drop).

## Loop
El último compás colapsa la retícula del repaso en un único punto rojo centrado sobre un whoosh; ese cuadro es idéntico a t = 0 (punto rojo sobre tinta), así la pieza puede reproducirse en bucle sin corte visible. La progresión del outro termina en Esus4, que resuelve en el Am9 del inicio.

---

## v2 · dirección moderna

La v1 («un día en líneas», fondo tinta casi negro) queda como respaldo en `engine-v1.js` + `index-v1.html`.
La v2 cambia **solo la capa visual**: `timeline.json`, `audio.wav`, `content.json` y la sincronía no se tocaron;
`render(t)` sigue siendo función pura (verificado: render 50 → 10 → 120,3 → 50 da el mismo cuadro, bit a bit;
el cuadro `t = DURATION` es idéntico a `t = 0`).

**Idea**: «un día en tarjetas». Luminoso, de vidrio y con color: cada escena es un tablero *bento* (tarjeta
héroe + widget ilustrado + muelle de tarjetas pequeñas) sobre un degradado de malla que respira con el bombo.
Referencias: widgets de iOS, keynotes de Apple, Stripe/Linear (malla + vidrio), Duolingo 2024 (color por tono).

### Sistema
- **Fondo de malla**: color base + 4 manchas radiales enormes y difusas que derivan como f(t) con períodos enteros
  sobre la duración total (el fondo también hace bucle). Se pinta a 1/8 (256×144) y se escala: suave y barato.
  Marca de agua: un hanzi **serif** gigante por escena (起 跑 少 院 好 高 知 卫 忙 张 见 / 四), a 9-11 % de opacidad.
- **Vidrio** (`glass()`): radio 32-48 px; dentro se dibuja una instantánea del fondo reducida y desenfocada
  (`filter: blur` sobre 240×135), velo blanco 56 % (claras) o del color base 42 % (oscuras), brillo superior,
  borde de 1,6 px con degradado de brillo y sombra suave grande (sprite 9-slice precalculado, sin `shadowBlur` por cuadro).
- **Tipografía**: hanzi protagonista en **Noto Sans SC Black** (`fonts/zh-sans.woff2`, 120 glifos): palabra
  250 px, frase 110-160 px (en 1-2 líneas cortando por la coma). Serif (Noto Serif SC) solo para acentos (marca
  de agua, 张 trazado a pincel). Pinyin en Space Grotesk 600, 46-58 px; español en Inter 38-44 px.
  Mínimo legible: 26 px (etiquetas de widgets y chips).
- **Pinyin por tono**: cada sílaba se colorea según su tono (segmentación de sílabas por programación dinámica):
  1 rojo · 2 naranja · 3 verde · 4 azul · neutro gris, con variante oscura para fondos claros y clara para oscuros.
- **Resaltado**: las palabras clave de cada frase van en rojo de marca `#e74c3c` sobre una píldora rosada que se extiende.

### Movimiento
- **Resortes** (`spring`, overshoot ~8 %) y resorte crítico (`crit`, sin overshoot) en vez de fundidos.
- Hanzi: cada carácter sube desde una máscara con resorte y *stagger* de 45 ms. Español: sube palabra por palabra
  (35 ms). Pinyin: se teclea en los hats/clicks de siempre, con cursor rojo.
- **Muelle**: cuando llega el ítem siguiente, la tarjeta héroe *vuela* (arco + escala) a su ranura en el muelle
  inferior y se transforma en una mini-tarjeta; con la `nota` (chime) el muelle se hunde y sube la tarjeta GRAMÁTICA.
- **Transición de escena**: la tarjeta que cierra la escena (el widget, o la última burbuja en los diálogos)
  **crece hasta llenar la pantalla** y dentro ya está la escena nueva con su paleta; la escena vieja retrocede
  (escala 0,94 + sombra). En los drops, corte en seco + flash + 2 cuadros de glitch RGB (único glitch de la pieza).
- Riser: el widget se agranda 7 % y gana un halo del color de la escena; desenfoque de movimiento moderado en captura.

### Escenas y paleta (base · manchas)
| # | escena | tono | paleta |
|---|--------|------|--------|
| 1 | intro | oscura | ciruela `#1b1036` · rojo, rosa, durazno, violeta. Punto rojo → dos tarjetas (中级一 / 第四课 teñida de rojo) + chips de temas con íconos |
| 2 | 起床 | clara | amanecer `#fff0e6` · coral, durazno, mantequilla, rosa. Widget: sol que sube tras colinas, reloj `-- : --` → `?? : ??` → **07:00**, cadena 每天›早上›几点›起床 |
| 3 | 是不是 · 跑步 | clara | menta `#eafdf3` · menta, lima, turquesa, cielo. Widget: pista con zapatilla que trota al pulso, botones 是 / **不是**, 6:00 tachado → **7:00** |
| 4 | 很少 | clara | lavanda `#f3efff` · lavanda, lila, pervinca, rosa. Widget: barras de frecuencia 每天›常常›有时候›**很少**, corazón con electro → 身体很好 |
| 5 | 出院 | clara | cielo `#eaf8ff` · celeste, turquesa. Widget: hospital con cruz, 住 cae dentro de la puerta, 出 sale flotando; filas 住院 adentro / 出院 afuera |
| 6 | 好多了 (drop) | oscura | azul noche `#0c1840` · azul eléctrico, rojo, cian, violeta. Chat + tarjeta de contacto 医院 con chips 好多了 / 下个星期 |
| 7 | 多高 | clara | girasol `#fff9e6` · girasol, mandarina, crema. Widget: regla 0-2 m con figuras 爸爸 y 我; el escáner busca y se fija en **1,74 m** |
| 8 | 知道 | clara | índigo claro `#edf0ff` · índigo, celeste, lila, amarillo. Widget: balón 3D con órbitas 知道 / 会 / 认识 y leyenda |
| 9 | 大卫 (drop) | oscura | ciruela `#2c0a30` · magenta, naranja, rojo, violeta. El balón estalla en partículas que forman 大卫; chips 二十多岁 / 一米八几 / 同学 |
| 10 | 忙 · 休息 | clara | atardecer `#fbf0ff` · lila, ámbar, rosa, pervinca. Widget: reloj que gira y frena, hora que vuela, batería 95 % → 8 %; 但是 corta la tarjeta |
| 11 | 张老师 (drop) | oscura | carmesí `#3e0c16` · rojo, coral, frambuesa. Chat + avatar con 张 trazado a pincel; «?» flotante para 会…吧 |
| 12 | cierre | oscura | índigo `#141032` · rojo, índigo, turquesa, ámbar. BREAK: 4 tarjetas de tono (ā á ǎ à) que se vuelven la leyenda de la cabecera; bento 4×2 con color propio por tarjeta; lockup 再见！下次见。; colapso al punto rojo sobre la paleta del intro (bucle) |

### UI (index.html)
Pantalla de inicio de vidrio sobre manchas animadas en CSS, botón ▶ Reproducir en degradado coral→rojo, leyenda de
colores de tono; barra de control flotante de vidrio (play/pausa, escena ←/→, tiempo, progreso con marcas por
escena, botón pinyin, pantalla completa). Atajos: espacio, ←/→, F, P, clic en la barra.
