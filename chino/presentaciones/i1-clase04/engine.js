/* Clase 04 · Motion — motor visual v2 («dirección moderna»).
 * render(t) es función pura del tiempo: no guarda estado entre cuadros.
 * Todo sale de timeline.json (+ content.json para los textos, strokes.json para los trazos).
 * Las únicas memorias son cachés deterministas (medidas de texto, maquetas, partículas muestreadas)
 * y lienzos auxiliares que se reescriben por completo en cada cuadro antes de usarse.
 * La versión anterior («un día en líneas», fondo tinta) quedó en engine-v1.js / index-v1.html.
 */
(() => {
'use strict';

const W = 1920, H = 1080;
const Q = new URLSearchParams(location.search);
const CAPTURE = Q.get('capture') === '1';

const RED = [231, 76, 60];
const GOLD = [255, 204, 92];                                         // resaltado sobre superficies oscuras (rojo sobre rojo no se lee)
const WHITE = [255, 255, 255];
const FZH = "'I1ZH','Noto Serif SC','Songti SC',serif";                 // serif: acentos (marca de agua, 张)
const FZS = "'I1ZHS','Noto Sans SC','PingFang SC',sans-serif";           // sans gruesa: titulares
const FD = "'I1Disp','Space Grotesk','Helvetica Neue','I1ZHS',sans-serif";
const FB = "'I1Body','Inter','Helvetica Neue','I1ZHS',sans-serif";

/* ---------------- utilidades puras ---------------- */
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, t0, d) => clamp((t - t0) / d);
const E = {
  inCubic: t => t * t * t,
  outCubic: t => 1 - (1 - t) ** 3,
  outQuart: t => 1 - (1 - t) ** 4,
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  inOutQuart: t => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outExpo: t => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; },
};
/* resorte amortiguado (overshoot suave ~8 %) y resorte crítico (sin overshoot); u en segundos */
const spring = (u, k = 10, w = 12) => (u <= 0 ? 0 : 1 - Math.exp(-k * u) * (Math.cos(w * u) + (k / w) * Math.sin(w * u)));
const crit = (u, k = 9) => (u <= 0 ? 0 : 1 - (1 + k * u) * Math.exp(-k * u));
const land = (u, k) => { const p = crit(u, k); return p > 0.994 ? 1 : p; };   // crit nunca llega a 1: se asienta
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (c1, c2, p) => [lerp(c1[0], c2[0], p), lerp(c1[1], c2[1], p), lerp(c1[2], c2[2], p)];
const isHan = c => /[㐀-鿿]/.test(c);
const lerpRect = (a, b, p) => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p), r: lerp(a.r ?? 0, b.r ?? 0, p) });
const scaleRect = (R, s, cx, cy) => ({ x: cx + (R.x - cx) * s, y: cy + (R.y - cy) * s, w: R.w * s, h: R.h * s, r: (R.r ?? 0) * s });

/* ---------------- paletas por escena (fondos de malla) ----------------
 * base = color de fondo; blobs = 4 manchas difusas; anchors = dónde flotan; ink = texto principal;
 * acc = acento de la escena (chips, etiquetas); wm = carácter serif de marca de agua. */
const PAL = {
  intro:       { dark: 1, base: [27, 16, 54],   blobs: [[231, 76, 60], [255, 94, 150], [255, 160, 90], [96, 62, 214]],   anchors: [[1560, 180], [360, 900], [1700, 980], [260, 140]], ink: WHITE, acc: [255, 122, 102], wm: '四' },
  qichuang:    { dark: 0, base: [255, 240, 230], blobs: [[255, 138, 107], [255, 196, 155], [255, 222, 128], [255, 160, 196]], anchors: [[1640, 160], [300, 920], [760, 120], [1500, 980]], ink: [46, 22, 14], acc: [226, 86, 50], wm: '起' },
  shibushi:    { dark: 0, base: [234, 253, 243], blobs: [[110, 222, 176], [200, 240, 100], [60, 196, 170], [150, 226, 255]],  anchors: [[300, 160], [1680, 900], [1500, 140], [520, 980]], ink: [10, 44, 34], acc: [12, 140, 104], wm: '跑' },
  henshao:     { dark: 0, base: [243, 239, 255], blobs: [[178, 158, 255], [226, 176, 255], [150, 182, 255], [255, 190, 224]], anchors: [[1600, 200], [260, 860], [700, 100], [1500, 1000]], ink: [30, 20, 70], acc: [108, 76, 232], wm: '少' },
  chuyuan:     { dark: 0, base: [234, 248, 255], blobs: [[118, 196, 255], [86, 222, 212], [176, 226, 255], [154, 176, 255]],  anchors: [[240, 180], [1680, 860], [1400, 120], [640, 1000]], ink: [10, 36, 66], acc: [16, 120, 206], wm: '院' },
  haoduole:    { dark: 1, base: [12, 24, 64],   blobs: [[56, 104, 255], [231, 76, 60], [36, 206, 228], [124, 76, 255]],  anchors: [[1620, 240], [220, 960], [1740, 1000], [400, 120]], ink: WHITE, acc: [120, 176, 255], wm: '好' },
  gao:         { dark: 0, base: [255, 249, 230], blobs: [[255, 206, 84], [255, 156, 66], [255, 232, 160], [255, 182, 140]],  anchors: [[1680, 180], [240, 900], [700, 140], [1400, 1000]], ink: [44, 30, 4], acc: [214, 112, 0], wm: '高' },
  zhidao:      { dark: 0, base: [237, 240, 255], blobs: [[104, 122, 255], [140, 210, 255], [194, 164, 255], [255, 222, 118]], anchors: [[260, 200], [1640, 960], [1560, 140], [620, 1000]], ink: [20, 24, 76], acc: [72, 84, 232], wm: '知' },
  dawei:       { dark: 1, base: [44, 10, 48],   blobs: [[255, 60, 140], [255, 124, 60], [231, 76, 60], [138, 64, 255]],  anchors: [[1600, 220], [260, 940], [1760, 980], [360, 120]], ink: WHITE, acc: [255, 132, 176], wm: '卫' },
  'mang-xiuxi':{ dark: 0, base: [251, 240, 255], blobs: [[198, 160, 255], [255, 184, 80], [255, 144, 172], [122, 150, 255]], anchors: [[1620, 180], [300, 940], [720, 120], [1500, 1000]], ink: [36, 18, 62], acc: [136, 82, 226], wm: '忙' },
  zhanglaoshi: { dark: 1, base: [62, 12, 22],   blobs: [[231, 76, 60], [255, 130, 80], [180, 20, 80], [255, 90, 120]],  anchors: [[1640, 220], [260, 920], [1740, 1000], [420, 120]], ink: WHITE, acc: [255, 160, 130], wm: '张' },
  cierre:      { dark: 1, base: [30, 20, 84],   blobs: [[132, 84, 255], [236, 72, 153], [64, 112, 255], [34, 190, 238]],  anchors: [[1620, 160], [240, 920], [1720, 1000], [360, 120]], ink: WHITE, acc: [255, 122, 102], wm: '见' },
};
/* tonos: 1 rojo · 2 naranja · 3 verde · 4 azul · neutro gris (variante para fondo claro y oscuro) */
const TONE = {
  light: [[112, 112, 130], [214, 44, 36], [222, 116, 0], [18, 146, 76], [36, 96, 232]],
  dark:  [[190, 194, 210], [255, 110, 96], [255, 178, 64], [86, 226, 140], [120, 172, 255]],
};
function mixPal(a, b, p) {
  if (p <= 0) return a; if (p >= 1) return b;
  return {
    dark: p < 0.5 ? a.dark : b.dark, base: mix(a.base, b.base, p), ink: mix(a.ink, b.ink, p), acc: mix(a.acc, b.acc, p), wm: a.wm,
    blobs: a.blobs.map((c, k) => mix(c, b.blobs[k], p)), anchors: a.anchors.map((c, k) => [lerp(c[0], b.anchors[k][0], p), lerp(c[1], b.anchors[k][1], p)]),
  };
}

/* ---------------- estado de carga (inmutable tras ready) ---------------- */
let TL, CT, STK;
let SC = [];
const EV = { kick: [], snare: [], hat: [], click: [], bass: [], pad: [], whoosh: [], impact: [], sub: [], riser: [], chime: [], flash: [] };
let DUR = 147.8571, FPS = 60, BEAT = 0.535714, BAR = 2.142857;
let PARTS = null, GRAIN = [];
window.SHOW_PY = true;

/* ---------------- canvas ---------------- */
const canvas = document.getElementById('stage');
let g = canvas.getContext('2d');
const mainCtx = g;
let BASE = 1;
const sub = document.createElement('canvas');
const scratch = document.createElement('canvas');
const BT = document.createElement('canvas'); BT.width = 480; BT.height = 270;     // fondo reducido
const BD = document.createElement('canvas'); BD.width = 240; BD.height = 135;     // fondo desenfocado (vidrio)
const LAY = document.createElement('canvas');                                   // capa del chat (máscara superior)
let CUR = PAL.intro;          // paleta de la escena que se está dibujando (se fija en cada drawScene)

/* ---------------- medición con caché ---------------- */
const MC = document.createElement('canvas').getContext('2d');
const mcache = new Map();
function mw(font, s) {
  const k = font + '|' + s;
  let v = mcache.get(k);
  if (v === undefined) { MC.font = font; v = MC.measureText(s).width; mcache.set(k, v); }
  return v;
}
const pcache = new Map();
function prefixW(font, s) {
  const k = font + '|' + s;
  let v = pcache.get(k);
  if (!v) { v = [0]; let acc = ''; for (const ch of [...s]) { acc += ch; v.push(mw(font, acc)); } pcache.set(k, v); }
  return v;
}
/* texto "rico": ❌ / ✅ se dibujan como íconos vectoriales */
const ICON_RE = /([❌✅])/;
function measureRich(font, size, s) {
  let w = 0;
  for (const seg of s.split(ICON_RE)) { if (!seg) continue; w += (seg === '❌' || seg === '✅') ? size * 1.05 : mw(font, seg); }
  return w;
}
function drawRich(font, size, s, x, y, color) {
  g.font = font; g.fillStyle = color; g.textBaseline = 'middle'; g.textAlign = 'left';
  for (const seg of s.split(ICON_RE)) {
    if (!seg) continue;
    if (seg === '❌' || seg === '✅') {
      const r = size * 0.42, cx = x + size * 0.5, cy = y;
      g.save();
      g.fillStyle = seg === '❌' ? rgba(RED) : rgba([22, 163, 74]);
      g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = size * 0.1; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
      const q = r * 0.42;
      if (seg === '❌') { g.moveTo(cx - q, cy - q); g.lineTo(cx + q, cy + q); g.moveTo(cx + q, cy - q); g.lineTo(cx - q, cy + q); }
      else { g.moveTo(cx - q * 1.1, cy + q * 0.05); g.lineTo(cx - q * 0.25, cy + q * 0.8); g.lineTo(cx + q * 1.15, cy - q * 0.75); }
      g.stroke(); g.restore();
      g.font = font; g.fillStyle = color;
      x += size * 1.05;
    } else { g.fillText(seg, x, y); x += mw(font, seg); }
  }
}
const wcache = new Map();
function wrapWords(font, size, text, maxW) {
  const k = font + '|' + maxW + '|' + text;
  let v = wcache.get(k); if (v) return v;
  v = [];
  const re = /\S+/g; let m, line = null;
  while ((m = re.exec(text))) {
    if (!line) { line = { s: m[0], o: m.index }; continue; }
    const cand = text.slice(line.o, m.index + m[0].length);
    if (measureRich(font, size, cand) <= maxW) line.s = cand;
    else { v.push(line); line = { s: m[0], o: m.index }; }
  }
  if (line) v.push(line);
  wcache.set(k, v);
  return v;
}
function splitHz(hz) {
  const chars = [...hz];
  let best = -1, bd = 1e9;
  chars.forEach((c, i) => { if ('，。？！'.includes(c) && i < chars.length - 1) { const d = Math.abs(i + 1 - chars.length / 2); if (d < bd) { bd = d; best = i + 1; } } });
  if (best < 0) best = Math.ceil(chars.length / 2);
  return [{ s: chars.slice(0, best).join(''), o: 0 }, { s: chars.slice(best).join(''), o: best }];
}

/* ---------------- pinyin → tono por sílaba ---------------- */
const INI = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w', ''];
const FIN = ['a', 'o', 'e', 'i', 'u', 'v', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong', 'er', 'ia', 'ie', 'iao', 'iu', 'ian', 'in', 'iang', 'ing', 'iong', 'ua', 'uo', 'uai', 'ui', 'uan', 'un', 'uang', 'ueng', 'ue', 've', 'van', 'vn'];
const SYL = new Set(); INI.forEach(a => FIN.forEach(b => SYL.add(a + b)));
const tcache = new Map();
function toneArr(py) {
  let out = tcache.get(py); if (out) return out;
  const chars = [...py]; const base = [], tone = [];
  for (const ch of chars) {
    const d = ch.normalize('NFD'); let b = d[0].toLowerCase(), tn = 0;
    for (const m of d.slice(1)) { if (m === '̄') tn = 1; else if (m === '́') tn = 2; else if (m === '̌') tn = 3; else if (m === '̀') tn = 4; else if (m === '̈' && b === 'u') b = 'v'; }
    base.push(/[a-z]/.test(b) ? b : null); tone.push(tn);
  }
  out = new Array(chars.length).fill(-1);
  let i = 0;
  while (i < chars.length) {
    if (!base[i]) { i++; continue; }
    let j = i; while (j < chars.length && base[j]) j++;
    const s = base.slice(i, j).join(''), n = s.length;
    const best = new Array(n + 1).fill(null); best[0] = [];
    for (let a = 0; a < n; a++) {
      if (!best[a]) continue;
      for (let L = Math.min(6, n - a); L >= 1; L--) if (SYL.has(s.slice(a, a + L))) { const c = best[a].concat([a + L]); if (!best[a + L] || best[a + L].length > c.length) best[a + L] = c; }
    }
    const cuts = best[n] || [n];
    let st = 0;
    for (const c of cuts) { let tn = 0; for (let k = st; k < c; k++) if (tone[i + k]) tn = tone[i + k]; for (let k = st; k < c; k++) out[i + k] = tn; st = c; }
    i = j;
  }
  tcache.set(py, out); return out;
}
const toneCol = (tn, dark, ink) => (tn < 0 ? ink : (dark ? TONE.dark : TONE.light)[tn]);

/* ---------------- eventos ---------------- */
function lastIdx(arr, t) {
  let lo = 0, hi = arr.length - 1, r = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m].t <= t + 1e-6) { r = m; lo = m + 1; } else hi = m - 1; }
  return r;
}
function env(arr, t, decay) { const i = lastIdx(arr, t); if (i < 0) return 0; const e = arr[i]; return e.i * Math.exp(-(t - e.t) * decay); }
function sceneAt(t) { for (let i = SC.length - 1; i >= 0; i--) if (t >= SC[i].start - 1e-6) return i; return 0; }

/* ---------------- preparación (determinista, una vez) ---------------- */
const HL = {
  qichuang: ['每天', '起床'], shibushi: ['是不是', '不是'], henshao: ['很少', '生病'],
  chuyuan: ['出院', '住院', '医院'], haoduole: ['好多了', '能'], gao: ['很高', '不太高', '多高', '一米七四'],
  zhidao: ['知道'], dawei: ['二十多', '八几', '多'], 'mang-xiuxi': ['但是', '忙不忙', '太忙了', '休息一下'],
  zhanglaoshi: ['会', '吧', '这几天'],
};
function prep() {
  DUR = TL.duration; FPS = TL.fps; BEAT = TL.beat; BAR = TL.bar;
  const byId = {};
  TL.scenes.forEach((s, i) => {
    const c = CT.scenes.find(x => x.id === s.id);
    const S = {
      id: s.id, i, start: s.start, end: s.end, tema: c.tema, kind: c.kind, nota: c.nota, pal: PAL[s.id] || PAL.intro,
      items: c.items.map((it, j) => ({ ...it, j, tHz: null, frags: [], tEs: null })),
      tNota: null, tTema: null, tRiser: null, tHit: null, tGrid: null, tCollapse: null,
    };
    SC.push(S); byId[s.id] = S;
  });
  for (const e of TL.events) {
    const S = byId[e.scene]; const tg = e.target || ''; const ev = { t: e.t, i: e.intensity, tg };
    const m = /^(hz|py|es):(\d+) (appear|type|slide|flash)/.exec(tg);
    if (m && S) {
      const it = S.items[+m[2]];
      if (it) {
        if (m[1] === 'hz' && m[3] === 'appear') it.tHz = e.t;
        if (m[1] === 'py') { const f = /«(.*)»/.exec(tg); if (f) it.frags.push({ t: e.t, text: f[1] }); }
        if (m[1] === 'es') it.tEs = e.t;
        if (m[3] === 'flash') EV.flash.push({ t: e.t, f: 1, a: 0.22 });
      }
    }
    if (S) {
      if (/^nota appear/.test(tg)) S.tNota = e.t;
      if (/^tema title/.test(tg)) S.tTema = e.t;
      if (/^transition hit/.test(tg)) { S.tHit = e.t; EV.flash.push({ t: e.t, f: 2, a: 0.5 }); }
      if (/^outro entra/.test(tg)) EV.flash.push({ t: e.t, f: 1, a: 0.25 });
      if (/^retícula de repaso/.test(tg)) S.tGrid = e.t;
      if (/^loop:/.test(tg)) S.tCollapse = e.t;
      if (e.type === 'riser') S.tRiser = e.t;
    }
    const map = { kick: 'kick', snare: 'snare', hat: 'hat', click: 'click', bass: 'bass', pad_chord: 'pad', whoosh: 'whoosh', impact: 'impact', sub_drop: 'sub', riser: 'riser', chime: 'chime' };
    if (map[e.type]) EV[map[e.type]].push(ev);
  }
  for (const k in EV) EV[k].sort((a, b) => a.t - b.t);
  for (const S of SC) {
    S.items.forEach((it, j) => {
      if (it.tHz == null) it.tHz = S.start + 0.5 + j * 1.0;
      if (it.tEs == null) it.tEs = it.tHz + 0.8;
      it.pyT = pyTimes(it);
      it.hl = hlMask(S.id, it.hz);
      it.tones = toneArr(it.py);
    });
    if (S.tTema == null) S.tTema = S.start + 0.27;
  }
}
function pyTimes(it) {
  const s = it.py; const n = [...s].length;
  const times = new Array(n).fill(Infinity);
  let cur = 0; let lastT = it.tHz + 0.27;
  const frags = it.frags.slice().sort((a, b) => a.t - b.t);
  for (const f of frags) {
    const idx = s.indexOf(f.text, cur); if (idx < 0) continue;
    const m = f.text.length; const dur = Math.min(0.24, 0.028 * m);
    for (let k = cur; k < idx + m; k++) times[k] = f.t + dur * Math.max(0, k - idx) / Math.max(1, m);
    cur = idx + m; lastT = f.t + dur;
  }
  if (!frags.length) { for (let k = 0; k < n; k++) times[k] = it.tHz + 0.27 + k * 0.025; }
  else for (let k = cur; k < n; k++) times[k] = lastT + 0.02;
  return times;
}
function hlMask(id, hz) {
  const chars = [...hz]; const mask = new Array(chars.length).fill(false);
  const words = (HL[id] || []).slice().sort((a, b) => b.length - a.length);
  for (const w of words) {
    let i = hz.indexOf(w);
    while (i >= 0) { const ci = [...hz.slice(0, i)].length; for (let k = 0; k < w.length; k++) mask[ci + k] = true; i = hz.indexOf(w, i + w.length); }
  }
  if (chars.filter(isHan).length <= 3) return new Array(chars.length).fill(false);
  return mask;
}

/* ---------------- recursos precalculados (semilla fija) ---------------- */
function buildStatic() {
  GRAIN = [];
  for (let k = 0; k < 4; k++) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'); const img = x.createImageData(256, 256); const r = mulberry32(1000 + k);
    for (let i = 0; i < img.data.length; i += 4) { const v = 128 + ((r() - 0.5) * 255) | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    x.putImageData(img, 0, 0); GRAIN.push(c);
  }
  // partículas para 大卫 (sans gruesa), destinos muestreados del glifo (una vez, determinista)
  const PS = 150, off = document.createElement('canvas'); off.width = PS * 2 + 40; off.height = PS + 40;
  const ox = off.getContext('2d'); ox.fillStyle = '#fff'; ox.font = `900 ${PS}px ${FZS}`; ox.textBaseline = 'middle'; ox.textAlign = 'left';
  ox.fillText('大卫', 20, 20 + PS / 2);
  const data = ox.getImageData(0, 0, off.width, off.height).data; const pts = [];
  for (let y = 0; y < off.height; y += 3) for (let x = 0; x < off.width; x += 3) if (data[(y * off.width + x) * 4 + 3] > 140) pts.push([x - 20 - PS, y - 20 - PS / 2]);
  const r = mulberry32(4);
  for (let i = pts.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [pts[i], pts[j]] = [pts[j], pts[i]]; }
  const N = Math.min(1700, pts.length);
  PARTS = [];
  for (let i = 0; i < N; i++) {
    const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 60;
    PARTS.push({ tx: pts[i][0], ty: pts[i][1], ox: Math.cos(a) * rr, oy: Math.sin(a) * rr, dir: r() * Math.PI * 2, sp: 200 + r() * 520, dl: r() * 0.3, ph: r() * 6.28, hue: r() });
  }
}

/* ---------------- trazos de hanzi (strokes.json) ---------------- */
const GC = new Map();
function glyph(ch) {
  let G = GC.get(ch); if (G) return G;
  const d = STK && STK[ch]; if (!d) return null;
  G = { strokes: d.s.map(p => new Path2D(p)), med: [], total: 0 };
  for (const m of d.m) { let L = 0; for (let i = 1; i < m.length; i++) L += Math.hypot(m[i][0] - m[i - 1][0], m[i][1] - m[i - 1][1]); L = Math.max(L, 30); G.med.push({ pts: m, L }); G.total += L; }
  GC.set(ch, G); return G;
}
function brushChar(ch, cx, cy, size, t0, D, t, fin, active) {
  const G = glyph(ch); if (!G) return;
  const s = size / 1024; let acc = 0;
  g.save(); g.translate(cx - size / 2, cy - size / 2 + 900 * s * 0.98 + size * 0.02); g.scale(s, -s);
  for (let k = 0; k < G.med.length; k++) {
    const m = G.med[k];
    const ta = t0 + D * acc / G.total, tb = t0 + D * (acc + m.L) / G.total; acc += m.L;
    const sp = clamp((t - ta) / Math.max(1e-3, tb - ta)); if (sp <= 0) continue;
    const col = mix(active, fin, prog(t, tb, 0.35));
    if (sp >= 1) { g.fillStyle = rgba(col); g.fill(G.strokes[k]); continue; }
    g.save(); g.clip(G.strokes[k]);
    g.beginPath(); g.moveTo(m.pts[0][0], m.pts[0][1]); for (let i = 1; i < m.pts.length; i++) g.lineTo(m.pts[i][0], m.pts[i][1]);
    g.lineWidth = 170; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash([m.L * E.outCubic(sp), 1e5]);
    g.strokeStyle = rgba(active); g.stroke(); g.restore();
  }
  g.restore(); g.setLineDash([]);
}

/* ---------------- fondo: malla de degradados ---------------- */
const BN = [5, 7, 6, 4], BM = [6, 5, 7, 8];     // períodos enteros sobre DUR → el fondo también hace bucle
const MESH = document.createElement('canvas'); MESH.width = 256; MESH.height = 144;   // 1/8: los degradados son suaves, se escalan sin pérdida visible
function mesh(P, t, kick) {
  const m = MESH.getContext('2d'); m.setTransform(1, 0, 0, 1, 0, 0); m.globalAlpha = 1; m.globalCompositeOperation = 'source-over';
  m.fillStyle = rgba(P.base); m.fillRect(0, 0, 256, 144);
  m.setTransform(1 / 8, 0, 0, 1 / 8, 8, 4.5);    // lógico (-64..1984, -36..1116) → 256×144
  for (let k = 0; k < 4; k++) {
    const c = P.blobs[k], [ax, ay] = P.anchors[k];
    const x = ax + 280 * Math.sin(2 * Math.PI * BN[k] * t / DUR + k * 1.7);
    const y = ay + 210 * Math.cos(2 * Math.PI * BM[k] * t / DUR + k * 2.3);
    const r = (k % 2 ? 860 : 1000) * (1 + 0.035 * kick);
    const a = P.dark ? 0.82 : 0.92;
    const gr = m.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(c, a)); gr.addColorStop(0.42, rgba(c, a * 0.55)); gr.addColorStop(1, rgba(c, 0));
    m.fillStyle = gr; m.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const sh = m.createLinearGradient(0, 0, W, H);
  sh.addColorStop(0, `rgba(255,255,255,${P.dark ? 0.05 : 0.22})`); sh.addColorStop(0.5, 'rgba(255,255,255,0)');
  m.fillStyle = sh; m.fillRect(-64, -36, W + 128, H + 72);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'low';   // 'high' introduce ±1 no determinista entre cuadros
  g.drawImage(MESH, -64, -36, W + 128, H + 72);
}
function watermark(S, t, P, a = 1) {
  const u = t - S.start;
  const p = S.kind === 'intro' ? prog(u, 0.6, 1.2) : 1;
  if (p <= 0 || a <= 0) return;
  g.save();
  g.translate(1590 + 30 * Math.sin(u * 0.35), 640 + 20 * Math.cos(u * 0.28)); g.rotate(-0.06 + 0.02 * Math.sin(u * 0.2));
  g.font = `700 880px ${FZH}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.globalAlpha = p * a * (P.dark ? 0.09 : 0.11);
  g.fillStyle = P.dark ? '#fff' : rgba(P.acc); g.fillText(P.wm, 0, 0);
  g.restore(); g.globalAlpha = 1;
}
/* instantánea del fondo reducida y desenfocada: lo que se ve "detrás" del vidrio */
function snapBackdrop(P) {
  const bt = BT.getContext('2d'); bt.setTransform(1, 0, 0, 1, 0, 0); bt.filter = 'none'; bt.globalAlpha = 1;
  bt.drawImage(g.canvas, 0, 0, BT.width, BT.height);
  const bd = BD.getContext('2d'); bd.setTransform(1, 0, 0, 1, 0, 0); bd.filter = 'none'; bd.globalAlpha = 1;
  bd.fillStyle = rgba(P.base); bd.fillRect(0, 0, BD.width, BD.height);
  bd.filter = 'blur(4px)'; bd.drawImage(BT, -6, -4, BD.width + 12, BD.height + 8); bd.filter = 'none';
}

/* ---------------- vidrio (glassmorphism) ---------------- */
/* sombra suave precalculada (9-slice): mucho más barata que shadowBlur en cada cuadro */
const SHC = new Map(); window.__shc = () => SHC.size;
function shadowSprite(r, blur, col) {
  const key = r + '|' + blur + '|' + col; let S = SHC.get(key); if (S) return S;
  const c = r + blur + 6, size = 2 * c + 2, OFF = size + 20;
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const x = cv.getContext('2d'); x.shadowColor = col; x.shadowBlur = blur; x.shadowOffsetX = OFF; x.fillStyle = '#000';
  x.beginPath(); x.roundRect(c - r - OFF, c - r, 2 * r + 2, 2 * r + 2, r); x.fill();
  S = { cv, c }; SHC.set(key, S); return S;
}
function softShadow(x, y, w, h, r, blur, dy, col, clipOut = true) {
  const rad = Array.isArray(r) ? Math.max(...r) : r;
  // radio y desenfoque cuantizados: la sombra es muy difusa, la diferencia no se ve y la caché de sprites
  // pasa de ~680 lienzos (picos de CPU y ~150 MB) a unas decenas
  const R = Math.max(1, Math.min(Math.floor(Math.min(w, h) / 2), Math.round(Math.min(rad, w / 2, h / 2) / 6) * 6)), B = Math.max(8, Math.round(blur / 12) * 12);
  const { cv, c } = shadowSprite(R, B, col); const e = c - R;
  const X = x - e, Y = y + dy - e, WW2 = w + 2 * e, HH2 = h + 2 * e, m = c, sz = cv.width;
  g.save();
  if (clipOut) { g.beginPath(); g.rect(-600, -600, W + 1200, H + 1200); g.roundRect(x, y, w, h, r); g.clip('evenodd'); }
  const dw = WW2 - 2 * m, dh = HH2 - 2 * m;
  g.drawImage(cv, 0, 0, m, m, X, Y, m, m); g.drawImage(cv, m, 0, 2, m, X + m, Y, dw, m); g.drawImage(cv, m + 2, 0, m, m, X + m + dw, Y, m, m);
  g.drawImage(cv, 0, m, m, 2, X, Y + m, m, dh); g.drawImage(cv, m, m, 2, 2, X + m, Y + m, dw, dh); g.drawImage(cv, m + 2, m, m, 2, X + m + dw, Y + m, m, dh);
  g.drawImage(cv, 0, m + 2, m, m, X, Y + m + dh, m, m); g.drawImage(cv, m, m + 2, 2, m, X + m, Y + m + dh, dw, m); g.drawImage(cv, m + 2, m + 2, m, m, X + m + dw, Y + m + dh, m, m);
  g.restore();
}
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, Math.max(0, w), Math.max(0, h), r); }
function glass(x, y, w, h, r, o = {}) {
  if (w <= 1 || h <= 1) return;
  const P = o.pal || CUR, dark = P.dark;
  const sa = o.shadow ?? 1;
  if (sa > 0) {
    const a0 = g.globalAlpha;
    const col = dark ? 'rgba(0,0,10,0.42)' : `rgba(${(P.ink[0] * 0.6) | 0},${(P.ink[1] * 0.5) | 0},${(P.ink[2] * 0.7 + 30) | 0},0.2)`;
    g.globalAlpha = a0 * sa; softShadow(x, y, w, h, r, o.sb || 64, o.sy || 26, col);
    if (o.glow) { g.globalAlpha = a0 * clamp(o.glow); softShadow(x, y, w, h, r, 90, 0, rgba(o.glowCol || RED, 1)); }
    g.globalAlpha = a0;
  }
  g.save(); rr(x, y, w, h, r); g.clip();
  if (o.backdrop !== false) { const m = g.getTransform(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(BD, 0, 0, g.canvas.width, g.canvas.height); g.setTransform(m); }
  g.fillStyle = o.fill || (dark ? rgba(P.base, 0.6) : 'rgba(255,255,255,0.56)'); g.fillRect(x, y, w, h);
  const shn = g.createLinearGradient(x, y, x, y + Math.min(h, 420));
  shn.addColorStop(0, `rgba(255,255,255,${dark ? 0.12 : 0.4})`); shn.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = shn; g.fillRect(x, y, w, h);
  g.restore();
  const bg = g.createLinearGradient(x, y, x + w * 0.5, y + h);
  bg.addColorStop(0, `rgba(255,255,255,${(dark ? 0.5 : 0.95) * (o.border ?? 1)})`); bg.addColorStop(1, `rgba(255,255,255,${(dark ? 0.1 : 0.4) * (o.border ?? 1)})`);
  g.strokeStyle = bg; g.lineWidth = o.bw || 1.6; rr(x + 0.8, y + 0.8, w - 1.6, h - 1.6, Math.max(0, r - 0.8)); g.stroke();
}
/* pastilla de texto (chip) */
function chip(x, y, h, text, o = {}) {
  const size = o.size || 28; const font = `${o.wt || 700} ${size}px ${o.font || FD}`;
  const tw = mw(font, text); const padX = o.padX ?? h * 0.42; const iw = o.icon ? h * 0.62 : 0;
  const w = tw + padX * 2 + iw; const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  if (o.solid) { g.fillStyle = rgba(o.solid); rr(x0, y, w, h, h / 2); g.fill(); }
  else glass(x0, y, w, h, h / 2, { sb: 30, sy: 12, shadow: o.shadow ?? 0.7 });
  if (o.icon) o.icon(x0 + padX + iw * 0.36, y + h / 2, h * 0.5, o.iconCol || o.color || CUR.ink);
  g.font = font; g.fillStyle = rgba(o.color || CUR.ink); g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText(text, x0 + padX + iw, y + h / 2 + (o.dy || 1));
  return w;
}

/* ---------------- íconos vectoriales (línea redondeada) ---------------- */
function strokeSet(c, lw) { g.strokeStyle = rgba(c); g.fillStyle = rgba(c); g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; }
const IC = {
  sun(x, y, s, c) { strokeSet(c, s * 0.12); g.beginPath(); g.arc(x, y, s * 0.26, 0, 7); g.stroke();
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.beginPath(); g.moveTo(x + Math.cos(a) * s * 0.42, y + Math.sin(a) * s * 0.42); g.lineTo(x + Math.cos(a) * s * 0.54, y + Math.sin(a) * s * 0.54); g.stroke(); } },
  moon(x, y, s, c) { g.save(); g.beginPath(); g.rect(x - s, y - s, s * 2, s * 2); g.arc(x + s * 0.22, y - s * 0.18, s * 0.34, 0, 7); g.clip('evenodd');
    strokeSet(c, s * 0.12); g.beginPath(); g.arc(x, y, s * 0.42, 0, 7); g.fill(); g.restore(); },
  heart(x, y, s, c) { strokeSet(c, s * 0.12); const k = s * 0.5; g.beginPath(); g.moveTo(x, y + k * 0.8);
    g.bezierCurveTo(x - k * 1.25, y - k * 0.05, x - k * 0.62, y - k * 1.05, x, y - k * 0.42); g.bezierCurveTo(x + k * 0.62, y - k * 1.05, x + k * 1.25, y - k * 0.05, x, y + k * 0.8); g.fill(); },
  cross(x, y, s, c) { g.fillStyle = rgba(c); const a = s * 0.18, b = s * 0.5; rr(x - a, y - b, a * 2, b * 2, a * 0.5); g.fill(); rr(x - b, y - a, b * 2, a * 2, a * 0.5); g.fill(); },
  ruler(x, y, s, c) { strokeSet(c, s * 0.1); g.save(); g.translate(x, y); g.rotate(-Math.PI / 4); rr(-s * 0.58, -s * 0.2, s * 1.16, s * 0.4, s * 0.08); g.stroke();
    for (let k = 1; k < 6; k++) { const xx = -s * 0.58 + k * s * 0.193; g.beginPath(); g.moveTo(xx, -s * 0.2); g.lineTo(xx, -s * (k % 2 ? 0.04 : 0.1)); g.stroke(); } g.restore(); },
  bulb(x, y, s, c) { strokeSet(c, s * 0.1); g.beginPath(); g.arc(x, y - s * 0.12, s * 0.3, Math.PI * 0.8, Math.PI * 2.2); g.lineTo(x + s * 0.13, y + s * 0.3); g.lineTo(x - s * 0.13, y + s * 0.3); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(x - s * 0.12, y + s * 0.45); g.lineTo(x + s * 0.12, y + s * 0.45); g.stroke(); },
  bars(x, y, s, c) { g.fillStyle = rgba(c); for (let k = 0; k < 4; k++) { const h = s * (0.8 - k * 0.18); rr(x - s * 0.5 + k * s * 0.27, y + s * 0.4 - h, s * 0.18, h, s * 0.05); g.fill(); } },
  fork(x, y, s, c) { strokeSet(c, s * 0.11); g.beginPath(); g.moveTo(x - s * 0.5, y); g.lineTo(x - s * 0.05, y); g.lineTo(x + s * 0.4, y - s * 0.38); g.moveTo(x - s * 0.05, y); g.lineTo(x + s * 0.4, y + s * 0.38); g.stroke();
    g.beginPath(); g.moveTo(x + s * 0.18, y - s * 0.42); g.lineTo(x + s * 0.42, y - s * 0.4); g.lineTo(x + s * 0.38, y - s * 0.16); g.stroke(); },
  clock(x, y, s, c) { strokeSet(c, s * 0.11); g.beginPath(); g.arc(x, y, s * 0.46, 0, 7); g.stroke(); g.beginPath(); g.moveTo(x, y - s * 0.26); g.lineTo(x, y); g.lineTo(x + s * 0.2, y + s * 0.1); g.stroke(); },
  ball(x, y, s, c) { strokeSet(c, s * 0.1); g.beginPath(); g.arc(x, y, s * 0.46, 0, 7); g.stroke();
    g.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 5; g[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * s * 0.17, y + Math.sin(a) * s * 0.17); } g.closePath(); g.fill(); },
  chat(x, y, s, c) { strokeSet(c, s * 0.1); rr(x - s * 0.48, y - s * 0.36, s * 0.96, s * 0.62, s * 0.2); g.stroke(); g.beginPath(); g.moveTo(x - s * 0.2, y + s * 0.26); g.lineTo(x - s * 0.3, y + s * 0.46); g.lineTo(x + s * 0.02, y + s * 0.26); g.stroke(); },
};
/* zapatilla (un poco más elaborada, para el widget de 跑步) */
function shoe(x, y, s, body, sole, lace) {
  g.save(); g.translate(x, y); g.scale(s / 100, s / 100);
  g.fillStyle = rgba(sole); rr(-62, 18, 128, 18, 9); g.fill();
  g.fillStyle = rgba(body); g.beginPath();
  g.moveTo(-60, 20); g.lineTo(-58, -26); g.quadraticCurveTo(-56, -40, -40, -38); g.lineTo(-22, -34);
  g.quadraticCurveTo(-8, -12, 18, -6); g.quadraticCurveTo(58, 0, 64, 14); g.lineTo(64, 20); g.closePath(); g.fill();
  g.strokeStyle = rgba(lace); g.lineWidth = 5; g.lineCap = 'round';
  for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-18 + k * 12, -26 + k * 6); g.lineTo(-6 + k * 12, -20 + k * 7); g.stroke(); }
  g.fillStyle = rgba(lace, 0.9); rr(-52, 6, 110, 6, 3); g.fill();
  g.restore();
}

/* ---------------- primitivas de texto animado ---------------- */
const hzFont = (size, wt = 900) => `${wt} ${size}px ${FZS}`;
const pyFont = size => `600 ${size}px ${FD}`;
const esFont = (size, wt = 500) => `${wt} ${size}px ${FB}`;

/* hanzi: cada carácter sube desde una máscara con resorte (stagger por carácter) */
function hzRise(line, x, yMid, size, t0, t, o) {
  const font = hzFont(size, o.wt || 900); const pw = prefixW(font, line.s); const w = pw[pw.length - 1];
  const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  const chars = [...line.s]; const a0 = g.globalAlpha; const st = o.stagger ?? 0.045;
  // marcador suave detrás de las palabras resaltadas
  if (o.hl) {
    let k = 0;
    while (k < chars.length) {
      if (!o.hl[line.o + k]) { k++; continue; }
      let e = k; while (e < chars.length && o.hl[line.o + e]) e++;
      const p = crit(t - (t0 + (line.o + k) * st + 0.3), 10);
      if (p > 0) {
        const xa = x0 + pw[k] - size * 0.06, xb = x0 + pw[e] + size * 0.06;
        g.globalAlpha = a0; g.fillStyle = o.dark ? rgba(GOLD, 0.2) : rgba(RED, 0.15);
        rr(xa, yMid - size * 0.56, (xb - xa) * p, size * 1.14, size * 0.2); g.fill();
      }
      k = e;
    }
  }
  g.save(); g.beginPath(); g.rect(x0 - size, yMid - size * 0.72, w + size * 2, size * 1.46); g.clip();
  g.font = font; g.textBaseline = 'middle'; g.textAlign = 'left';
  chars.forEach((ch, k) => {
    const gi = line.o + k; const u = t - (t0 + gi * st); if (u < 0) return;
    const p = spring(u, 11, 13);
    g.globalAlpha = a0 * clamp(u * 7);
    g.fillStyle = rgba(o.hl && o.hl[gi] ? (o.dark ? GOLD : RED) : o.ink);
    if (o.special && o.special.idx === gi) { slotReel(ch, x0 + pw[k], yMid + (1 - p) * size * 0.9, size, o.special.t0, t, pw[k + 1] - pw[k], font, o); return; }
    g.fillText(ch, x0 + pw[k], yMid + (1 - p) * size * 0.9);
  });
  g.restore(); g.globalAlpha = a0;
  return w;
}
function slotReel(finalCh, x, yMid, size, t0, t, cw, font, o) {
  const seq = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', finalCh];
  const r = (seq.length - 1) * E.outCubic(prog(t, t0, 1.25));
  const i = Math.floor(r), f = r - i;
  g.save(); g.beginPath(); g.rect(x - 4, yMid - size * 0.6, cw + 8, size * 1.2); g.clip();
  g.fillStyle = rgba(o.dark ? GOLD : RED); g.font = font;
  for (let k = -1; k <= 1; k++) {
    const idx = i + k; if (idx < 0 || idx >= seq.length) continue;
    const ch = seq[idx]; const yy = yMid + (k - f) * size * 1.1;
    g.fillText(ch, x + (cw - mw(font, ch)) / 2, yy);
  }
  g.restore();
}
/* pinyin tecleado letra a letra, coloreado por tono */
function pyTone(lines, x, yTop, size, times, t, align, tones, dark, ink, a = 1) {
  if (!window.SHOW_PY || !lines.length) return;
  const font = pyFont(size); const lh = size * 1.3;
  g.font = font; g.textBaseline = 'middle'; g.textAlign = 'left';
  const a0 = g.globalAlpha; let caret = null;
  lines.forEach((ln, li) => {
    const pw = prefixW(font, ln.s); const w = pw[pw.length - 1];
    const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    const yMid = yTop + li * lh + lh / 2;
    [...ln.s].forEach((ch, k) => {
      const tk = times[ln.o + k]; if (!(t >= tk)) return;
      const p = prog(t, tk, 0.14);
      g.globalAlpha = a0 * a * p; g.fillStyle = rgba(toneCol(tones[ln.o + k], dark, ink));
      g.fillText(ch, x0 + pw[k], yMid + 12 * (1 - E.outCubic(p)));
      caret = { x: x0 + pw[k + 1], y: yMid };
    });
  });
  g.globalAlpha = a0;
  const tEnd = times[times.length - 1];
  if (caret && t < tEnd + 0.6 && (t < tEnd || Math.floor(t * 6) % 2 === 0)) {
    g.fillStyle = rgba(RED); rr(caret.x + 6, caret.y - size * 0.42, Math.max(4, size * 0.09), size * 0.84, 3); g.fill();
  }
}
/* español: las palabras suben desde una máscara, escalonadas */
function esRise(lines, x, yTop, size, t0, t, align, color, wt = 500, a = 1) {
  if (t < t0) return;
  const font = esFont(size, wt); const lh = size * 1.3;
  const a0 = g.globalAlpha; let wi = 0;
  lines.forEach((ln, li) => {
    const w = measureRich(font, size, ln.s);
    const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    const yMid = yTop + li * lh + lh / 2;
    g.save(); g.beginPath(); g.rect(x0 - 40, yMid - lh * 0.62, w + 80, lh * 1.24); g.clip();
    const re = /\S+/g; let m;
    while ((m = re.exec(ln.s))) {
      const u = t - (t0 + wi * 0.035); wi++;
      if (u < 0) continue;
      const p = spring(u, 12, 13);
      g.globalAlpha = a0 * a * clamp(u * 6);
      drawRich(font, size, m[0], x0 + measureRich(font, size, ln.s.slice(0, m.index)), yMid + (1 - p) * lh * 0.8, color);
    }
    g.restore();
  });
  g.globalAlpha = a0;
}

/* ---------------- maquetas de ítems ---------------- */
const HERO = { x: 96, w: 1140, cy: 494, pad: 58 };
const WID = { x: 1272, y: 180, w: 552, h: 628, r: 44 };
const LC = new Map();
function layoutItem(S, it, mode) {
  const key = S.id + '|' + it.j + '|' + mode; let L = LC.get(key); if (L) return L;
  const chars = [...it.hz]; const n = chars.length; const nH = chars.filter(isHan).length;
  const word = nH <= 3 && n <= 4;
  L = { mode, hzWt: 900, hzLines: [{ s: it.hz, o: 0 }], gap1: 16, gap2: 10, showPy: true };
  if (mode === 'hero') {
    const Wd = HERO.w - HERO.pad * 2; L.w = Wd;
    if (n <= 5) L.hzSize = Math.min(word ? 250 : 210, Wd / (n * 1.02));
    else if (Wd / n >= 128) L.hzSize = Math.min(160, Wd / n);
    else { L.hzLines = splitHz(it.hz); L.hzSize = Math.min(150, Wd / Math.max(...L.hzLines.map(l => [...l.s].length))); }
    L.hzLH = L.hzSize * (L.hzLines.length > 1 ? 1.16 : 1.1);
    L.pySize = word ? 58 : 46; L.esSize = word ? 44 : 38; L.gap1 = 20; L.gap2 = 12;
  } else if (mode === 'mini') {
    const Wd = 560 - 52; L.w = Wd; L.hzSize = Math.min(60, Wd / n); L.hzLH = L.hzSize * 1.22; L.hzWt = 800;
    L.pySize = 0; L.esSize = 28; L.showPy = false; L.gap1 = 6; L.gap2 = 0;
  } else if (mode === 'dlg') {
    const Wd = 980; L.w = Wd; L.hzSize = Math.min(60, Wd / n); L.hzLH = L.hzSize * 1.24; L.hzWt = 700;
    L.pySize = 34; L.esSize = 30; L.gap1 = 6; L.gap2 = 6;
  } else if (mode === 'cell') {
    const Wd = 414 - 56; L.w = Wd; L.hzSize = Math.min(100, 272 / n); L.hzLH = L.hzSize * 1.12;
    L.pySize = 40; L.esSize = 30; L.gap1 = 8; L.gap2 = 4;
  } else if (mode === 'intro') {
    const Wd = 700 - 100; L.w = Wd; L.hzSize = Math.min(190, Wd / n); L.hzLH = L.hzSize * 1.12;
    L.pySize = 54; L.esSize = 40; L.gap1 = 14; L.gap2 = 8;
  }
  L.pyLines = L.showPy ? wrapWords(pyFont(L.pySize), L.pySize, it.py, L.w) : [];
  L.esLines = wrapWords(esFont(L.esSize), L.esSize, it.es, L.w);
  L.hzH = L.hzLines.length * L.hzLH;
  L.pyH = L.pyLines.length * L.pySize * 1.3;
  L.esH = L.esLines.length * L.esSize * 1.3;
  L.h = L.hzH + (L.pyLines.length ? L.gap1 + L.pyH : 0) + L.gap2 + L.esH + (L.pyLines.length ? 0 : L.gap1);
  L.hzW = Math.max(...L.hzLines.map(l => mw(hzFont(L.hzSize, L.hzWt), l.s)));
  L.bw = Math.max(L.hzW, ...L.pyLines.map(l => mw(pyFont(L.pySize), l.s)), ...L.esLines.map(l => measureRich(esFont(L.esSize), L.esSize, l.s)));
  LC.set(key, L); return L;
}
/* dibuja hanzi + pinyin + español de un ítem; o.static = todo ya revelado */
function drawItem(S, it, L, x, yTop, t, o = {}) {
  const tt = o.static ? 1e9 : t;
  const dark = o.dark ?? CUR.dark, ink = o.ink || CUR.ink, align = o.align || 'left';
  const special = (S.id === 'dawei' && it.hz.includes('几') && L.mode === 'dlg') ? { idx: [...it.hz].indexOf('几'), t0: it.tHz + 0.25 } : null;
  L.hzLines.forEach((ln, li) => hzRise(ln, x, yTop + li * L.hzLH + L.hzLH / 2, L.hzSize, it.tHz, tt, { wt: L.hzWt, hl: it.hl, ink, dark, align, special, stagger: L.mode === 'dlg' ? 0.025 : 0.045 }));
  let y = yTop + L.hzH;
  if (L.pyLines.length) { y += L.gap1; pyTone(L.pyLines, x, y, L.pySize, it.pyT, tt, align, it.tones, dark, ink); y += L.pyH; }
  else y += L.gap1;
  y += L.gap2;
  esRise(L.esLines, x, y, L.esSize, it.tEs, tt, align, rgba(o.esCol || ink, o.esA ?? 0.86), L.mode === 'hero' ? 500 : 500);
}

/* ---------------- cabecera, progreso, nota ---------------- */
/* En los drops (corte duro) el título cae enorme al centro con el golpe y luego vuela a la cabecera:
 * el primer medio segundo del drop ya no queda vacío. */
const SLAM = { hold: 0.5, fly: 0.42 };
function slamTitle(S, t, ink) {
  const u = t - S.start; const a0 = g.globalAlpha;
  const f = E.inOutCubic(prog(u, SLAM.hold, SLAM.fly));
  const font = `700 44px ${FD}`; const w44 = mw(font, S.tema);
  const big = Math.min(128 / 44, 1220 / w44);                         // escala del titular grande
  const s = lerp(big, 1, f) * lerp(1.22, 1, spring(u, 14, 16));        // golpe: entra un 22 % más grande
  const cxs = 768;                                                       // centro de la zona libre a la izquierda de la tarjeta de contacto
  const x0 = lerp(cxs - (w44 * big) / 2, 176, f), y0 = lerp(560, 100, f);
  // número de escena: grande sobre el titular, termina en el círculo de la cabecera
  const nx = lerp(cxs, 126, f), ny = lerp(560 - 44 * big * 0.5 - 70, 100, f), ns = lerp(1.5, 1, f) * lerp(1.22, 1, spring(u, 14, 16));
  g.save(); g.translate(nx, ny); g.scale(ns, ns);
  g.fillStyle = rgba(RED); g.beginPath(); g.arc(0, 0, 30, 0, 7); g.fill();
  g.font = `700 26px ${FD}`; g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(S.i + 1).padStart(2, '0'), 0, 1); g.restore();
  g.save(); g.translate(x0, y0); g.scale(s, s);
  g.font = font; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = rgba(ink);
  g.globalAlpha = a0; g.fillText(S.tema, 0, 0);
  // subrayado rojo que se barre con el golpe y se retira al volar
  const ul = E.outCubic(prog(u, 0.04, 0.3)) * (1 - f);
  if (ul > 0.01) { g.fillStyle = rgba(RED); rr(0, 34, w44 * ul, 7, 3.5); g.fill(); }
  g.restore(); g.globalAlpha = a0;
  progressDots(S, t, ink, clamp(f * 1.5));
}
function header(S, t, ink) {
  if (S.tHit != null && Math.abs(S.tHit - S.start) < 0.01 && S.kind !== 'cierre') return slamTitle(S, t, ink);
  const a0 = g.globalAlpha;
  const p = spring(t - (S.tTema - 0.12), 10, 12);
  if (p <= 0) return;
  // número de escena en círculo rojo
  g.save(); g.translate(126, 100); g.scale(p, p);
  g.fillStyle = rgba(RED); g.beginPath(); g.arc(0, 0, 30, 0, 7); g.fill();
  g.font = `700 26px ${FD}`; g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(S.i + 1).padStart(2, '0'), 0, 1); g.restore();
  // tema
  const font = `700 44px ${FD}`; const pw = prefixW(font, S.tema);
  g.font = font; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.save(); g.beginPath(); g.rect(170, 60, 1200, 80); g.clip();
  [...S.tema].forEach((ch, k) => {
    const u = t - (S.tTema + k * 0.014); if (u < 0) return;
    const q = spring(u, 12, 13);
    g.globalAlpha = a0 * clamp(u * 6); g.fillStyle = rgba(ink); g.fillText(ch, 176 + pw[k], 100 + (1 - q) * 40);
  });
  g.restore(); g.globalAlpha = a0;
  if (S.kind !== 'cierre') progressDots(S, t, ink, p);
}
function progressDots(S, t, ink, p) {
  const a0 = g.globalAlpha; let x = 1824;
  for (let i = SC.length - 1; i >= 0; i--) {
    const cur = i === S.i; const w = cur ? 40 : 12;
    g.globalAlpha = a0 * p * (cur ? 1 : i < S.i ? 0.55 : 0.25);
    g.fillStyle = cur ? rgba(RED) : rgba(ink); rr(x - w, 94, w, 12, 6); g.fill();
    x -= w + 10;
  }
  g.globalAlpha = a0;
}
function notaCard(S, t, R, size = 36) {
  if (S.tNota == null || t < S.tNota - 0.05) return;
  const u = t - S.tNota; const p = spring(u, 10, 12);
  const a0 = g.globalAlpha;
  g.save(); g.globalAlpha = a0 * clamp(u * 5);
  g.translate(0, (1 - p) * 60);
  glass(R.x, R.y, R.w, R.h, 32, { fill: CUR.dark ? rgba(CUR.base, 0.5) : 'rgba(255,255,255,0.7)' });
  // barra de acento
  g.fillStyle = rgba(RED); rr(R.x + 22, R.y + 24, 8, R.h - 48, 4); g.fill();
  const lab = S.kind === 'intro' ? 'EN ESTA CLASE' : 'GRAMÁTICA';
  chip(R.x + 50, R.y + 22, 44, lab, { size: 26, solid: RED, color: WHITE, padX: 18 });
  const font = esFont(size, 500); const lines = wrapWords(font, size, S.nota, R.w - 100);
  const lh = size * 1.3; const top = R.y + 76 + Math.max(0, (R.h - 94 - lines.length * lh) / 2);
  esRise(lines, R.x + 50, top, size, S.tNota + 0.12, t, 'left', rgba(CUR.ink), 500);
  g.restore(); g.globalAlpha = a0;
}

/* ---------------- escena: pila (palabra/frase/gramática) ---------------- */
function heroRect(S, it) { const L = layoutItem(S, it, 'hero'); const h = clamp(L.h + HERO.pad * 2, 400, 640); return { x: HERO.x, y: HERO.cy - h / 2, w: HERO.w, h, r: 48 }; }
function slotRect(i) { return { x: 96 + i * 584, y: 828, w: 560, h: 176, r: 32 }; }
function widgetRect(S, t) {
  const e = spring(t - (S.start + 0.1), 9, 11);
  let s = lerp(0.9, 1, e);
  if (S.tRiser != null && t > S.tRiser) s *= 1 + 0.07 * E.inCubic(prog(t, S.tRiser, S.end - S.tRiser));
  const R = scaleRect(WID, s, WID.x + WID.w / 2, WID.y + WID.h / 2);
  R.y += (1 - e) * 50; R.r = WID.r * s; R.e = e;
  return R;
}
function drawMiniCard(S, it, R, a) {
  const L = layoutItem(S, it, 'mini');
  glass(R.x, R.y, R.w, R.h, R.r, { sb: 40, sy: 16 });
  g.save(); rr(R.x, R.y, R.w, R.h, R.r); g.clip();
  const sc = R.w / 560; g.translate(R.x, R.y); g.scale(sc, sc);
  const a0 = g.globalAlpha; g.globalAlpha = a0 * a;
  drawItem(S, it, L, 26, (176 - L.h) / 2, 0, { static: true });
  g.globalAlpha = a0; g.restore();
}
function sceneStack(S, t) {
  const items = S.items, P = CUR;
  header(S, t, P.ink);
  // tarjeta widget (motivo de la escena)
  const WR = widgetRect(S, t);
  if (WR.e > 0.001) {
    const a0 = g.globalAlpha; g.globalAlpha = a0 * clamp(WR.e * 3);
    const riser = S.tRiser != null ? prog(t, S.tRiser, S.end - S.tRiser) : 0;
    const kick = env(EV.kick, t, 8);
    glass(WR.x, WR.y, WR.w, WR.h, WR.r, { glow: 0.12 * kick + 0.5 * riser, glowCol: P.acc, border: 1 + 0.4 * kick });
    g.save(); rr(WR.x, WR.y, WR.w, WR.h, WR.r); g.clip();
    const s = WR.w / WID.w; g.translate(WR.x, WR.y); g.scale(s, s);
    (WIDGET[S.id] || (() => {}))(S, t);
    g.restore(); g.globalAlpha = a0;
  }
  // índice del héroe actual
  let j = -1; items.forEach((it, i) => { if (t >= it.tHz - 0.22) j = i; });
  if (j < 0 && t >= S.start + 0.1) j = 0;
  if (j < 0) return;
  // muelle inferior (ítems anteriores) · se retira cuando entra la nota
  const notaP = S.tNota != null ? t - S.tNota : -1;
  for (let i = 0; i < j; i++) {
    const it = items[i];
    const pf = land(t - (items[i + 1].tHz - 0.22), 8);
    if (pf < 1) continue;               // aún volando (se dibuja más abajo, encima)
    let R = slotRect(i); let a = 1;
    if (notaP > -0.1) { const pe = crit(notaP + 0.1 - i * 0.06, 10); a = 1 - pe; R = scaleRect(R, 1 - 0.12 * pe, R.x + R.w / 2, R.y + R.h / 2); R.y += 50 * pe; }
    if (a <= 0.01) continue;
    const a0 = g.globalAlpha; g.globalAlpha = a0 * a; drawMiniCard(S, it, R, 1); g.globalAlpha = a0;
  }
  // tarjeta héroe
  const it = items[j];
  let R = heroRect(S, it);
  if (j > 0) R = lerpRect(heroRect(S, items[j - 1]), R, crit(t - (it.tHz - 0.22), 10));
  // la tarjeta (vacía) ya se arma durante la transición; el texto sube luego, con su golpe
  const pin = j === 0 ? spring(t - Math.min(it.tHz - 0.3, S.start + 0.1), 9, 11) : 1;
  {
    const a0 = g.globalAlpha;
    g.save();
    if (pin < 1) { const s = lerp(0.88, 1, pin); g.translate(R.x + R.w / 2, R.y + R.h / 2); g.scale(s, s); g.translate(-(R.x + R.w / 2), -(R.y + R.h / 2)); g.globalAlpha = a0 * clamp(pin * 2.5); }
    glass(R.x, R.y, R.w, R.h, R.r);
    // puntos de progreso de ítems dentro de la tarjeta
    items.forEach((_, k) => { g.fillStyle = k === j ? rgba(RED) : rgba(P.ink, 0.2); const w = k === j ? 26 : 10; rr(R.x + R.w - 44 - (items.length - 1 - k) * 18 - (k === j ? 16 : 0), R.y + 30, w, 10, 5); g.fill(); });
    g.save(); rr(R.x, R.y, R.w, R.h, R.r); g.clip();
    const L = layoutItem(S, it, 'hero');
    drawItem(S, it, L, R.x + HERO.pad, R.y + (R.h - L.h) / 2, t, {});
    g.restore();
    g.restore(); g.globalAlpha = a0;
  }
  // 但是 corta la tarjeta (escena mang-xiuxi)
  if (S.id === 'mang-xiuxi') {
    const i1 = items[1]; const ps = prog(t, i1.tHz + 0.35, 0.18);
    if (ps > 0 && ps < 1 || (t > i1.tHz + 0.35 && t < i1.tHz + 1.2)) {
      const fade = prog(t, i1.tHz + 0.55, 0.6);
      const ax = 520, ay = 900, bx = 900, by = 80;
      g.save(); g.globalAlpha = 1 - fade; g.strokeStyle = rgba(RED); g.lineCap = 'round'; g.lineWidth = lerp(14, 3, fade);
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(lerp(ax, bx, E.outCubic(ps)), lerp(ay, by, E.outCubic(ps))); g.stroke(); g.restore();
    }
  }
  // tarjetas volando del héroe al muelle
  for (let i = 0; i < j; i++) {
    const pf = land(t - (items[i + 1].tHz - 0.22), 8);
    if (pf >= 1) continue;
    const A = heroRect(S, items[i]), B = slotRect(i);
    const Rf = lerpRect(A, B, pf); Rf.y -= Math.sin(Math.PI * pf) * 40;
    glass(Rf.x, Rf.y, Rf.w, Rf.h, Rf.r, { sb: lerp(80, 40, pf), sy: lerp(40, 16, pf) });
    g.save(); rr(Rf.x, Rf.y, Rf.w, Rf.h, Rf.r); g.clip();
    const a0 = g.globalAlpha;
    const L1 = layoutItem(S, items[i], 'hero'), L2 = layoutItem(S, items[i], 'mini');
    const s1 = Rf.w / A.w;
    g.save(); g.translate(Rf.x, Rf.y); g.scale(s1, s1); g.globalAlpha = a0 * clamp(1 - pf * 2.2);
    drawItem(S, items[i], L1, HERO.pad, (A.h - L1.h) / 2, 0, { static: true }); g.restore();
    const s2 = Rf.w / B.w;
    g.save(); g.translate(Rf.x, Rf.y); g.scale(s2, s2); g.globalAlpha = a0 * clamp((pf - 0.45) / 0.4);
    drawItem(S, items[i], L2, 26, (176 - L2.h) / 2, 0, { static: true }); g.restore();
    g.globalAlpha = a0; g.restore();
  }
  notaCard(S, t, { x: 96, y: 828, w: 1728, h: 176 });
}

/* ---------------- widgets por escena (coordenadas locales 552×628) ---------------- */
const WW = 552, WH = 628;
function panel(x, y, w, h, r, top, bot) {
  const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, rgba(top)); gr.addColorStop(1, rgba(bot));
  g.fillStyle = gr; rr(x, y, w, h, r); g.fill();
}
function hzText(s, x, y, size, col, align = 'center', wt = 800) { g.font = hzFont(size, wt); g.fillStyle = rgba(col); g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); }
function txt(s, x, y, size, col, align = 'center', wt = 600, font = FD) { g.font = `${wt} ${size}px ${font}`; g.fillStyle = rgba(col); g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); }
function pyText(s, x, y, size, align = 'center', a = 1) {
  if (!window.SHOW_PY) return;
  const font = pyFont(size), pw = prefixW(font, s), tn = toneArr(s), w = pw[pw.length - 1];
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  g.font = font; g.textAlign = 'left'; g.textBaseline = 'middle'; const a0 = g.globalAlpha; g.globalAlpha = a0 * a;
  [...s].forEach((ch, k) => { g.fillStyle = rgba(toneCol(tn[k], CUR.dark, CUR.ink)); g.fillText(ch, x0 + pw[k], y); });
  g.globalAlpha = a0;
}
function pop(t, t0, from = 0.6) { const p = spring(t - t0, 10, 13); return { p, s: lerp(from, 1, p), a: clamp((t - t0) * 6) }; }
function withPop(x, y, pp, fn) { if (pp.a <= 0) return; const a0 = g.globalAlpha; g.save(); g.translate(x, y); g.scale(pp.s, pp.s); g.translate(-x, -y); g.globalAlpha = a0 * pp.a; fn(); g.restore(); g.globalAlpha = a0; }

const WIDGET = {
  /* 起床: amanecer + reloj + cadena temporal */
  qichuang(S, t) {
    const u = t - S.start, [i0, i1, i2, i3] = S.items;
    g.save(); rr(28, 28, WW - 56, 300, 32); g.clip();
    panel(28, 28, WW - 56, 300, 32, [255, 176, 140], [255, 232, 204]);
    const ps = E.outCubic(prog(u, 0.3, 3.2)) + 0.04 * Math.sin(u * 0.8) * prog(u, 3.5, 1);
    const sx = 330, sy = lerp(360, 150, ps);
    const glow = g.createRadialGradient(sx, sy, 20, sx, sy, 230); glow.addColorStop(0, 'rgba(255,236,160,0.9)'); glow.addColorStop(1, 'rgba(255,200,150,0)');
    g.fillStyle = glow; g.fillRect(28, 28, WW, 300);
    g.save(); g.translate(sx, sy); g.rotate(u * 0.25); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 6; g.lineCap = 'round';
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.beginPath(); g.moveTo(Math.cos(a) * 88, Math.sin(a) * 88); g.lineTo(Math.cos(a) * 108, Math.sin(a) * 108); g.stroke(); } g.restore();
    const sg = g.createRadialGradient(sx - 20, sy - 24, 6, sx, sy, 70); sg.addColorStop(0, '#fff6c8'); sg.addColorStop(0.5, '#ffc15a'); sg.addColorStop(1, '#ff7a45');
    g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, 68, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,140,110,0.85)'; g.beginPath(); g.moveTo(28, 280); g.bezierCurveTo(160, 200, 300, 250, 420, 230); g.bezierCurveTo(480, 222, 520, 240, WW, 250); g.lineTo(WW, 340); g.lineTo(28, 340); g.fill();
    g.fillStyle = 'rgba(232,86,60,0.95)'; g.beginPath(); g.moveTo(28, 300); g.bezierCurveTo(140, 250, 260, 300, 360, 290); g.bezierCurveTo(440, 282, 500, 268, WW, 280); g.lineTo(WW, 340); g.lineTo(28, 340); g.fill();
    g.restore();
    // reloj: --:-- → 07:00
    const pt = prog(t, i3.tHz + 0.1, 0.7);
    const font = `700 110px ${FD}`; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (pt <= 0) {
      const q = t >= i2.tHz ? 0.55 + 0.45 * (Math.floor(t * 3) % 2) : 0.35;
      g.fillStyle = rgba(CUR.ink, q); g.fillText(t >= i2.tHz ? '?? : ??' : '-- : --', WW / 2, 420);
    } else {
      const s = lerp(1.25, 1, spring(t - i3.tHz - 0.1, 10, 14));
      g.save(); g.translate(WW / 2, 420); g.scale(s, s); g.fillStyle = rgba(RED); g.fillText('07:00', 0, 0); g.restore();
      txt('qī diǎn · a las siete', WW / 2, 492, 28, CUR.ink, 'center', 600);
    }
    // cadena 每天 → 早上 → 几点 → 起床
    const labs = ['每天', '早上', '几点', '起床'];
    labs.forEach((lb, k) => {
      const x = 28 + k * 130, y = 540;
      const pp = pop(t, S.start + 0.6 + k * BEAT / 2, 0.7);
      const lit = S.tNota != null ? prog(t, S.tNota + k * BEAT / 2, 0.25) : 0;
      withPop(x + 52, y + 36, pp, () => {
        if (lit > 0.5) { g.fillStyle = rgba(RED); rr(x, y, 104, 72, 22); g.fill(); }
        else { g.fillStyle = 'rgba(255,255,255,0.75)'; rr(x, y, 104, 72, 22); g.fill(); }
        hzText(lb, x + 52, y + 37, 34, lit > 0.5 ? WHITE : CUR.ink);
      });
      if (k < 3) { g.strokeStyle = rgba(CUR.ink, 0.45 + 0.55 * lit); g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + 112, y + 28); g.lineTo(x + 119, y + 36); g.lineTo(x + 112, y + 44); g.stroke(); }
    });
  },
  /* 是不是 · 跑步: pista + zapatilla al pulso + elección 是/不是 + corrección de hora */
  shibushi(S, t) {
    const u = t - S.start, [i0, i1, i2, i3] = S.items;
    g.save(); rr(28, 28, WW - 56, 240, 32); g.clip();
    panel(28, 28, WW - 56, 240, 32, [170, 238, 210], [110, 214, 176]);
    const off = (u / BEAT) * 70;
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 5; g.lineCap = 'round';
    for (const yy of [120, 180, 240]) { g.setLineDash([36, 34]); g.lineDashOffset = off * (yy / 120); g.beginPath(); g.moveTo(28, yy); g.lineTo(WW, yy); g.stroke(); }
    g.setLineDash([]);
    const ph = (u / BEAT) % 1; const hop = Math.abs(Math.sin(Math.PI * u / BEAT));
    const sx = 270, sy = 186 - 46 * hop;
    g.fillStyle = 'rgba(10,60,40,0.18)'; g.beginPath(); g.ellipse(sx, 214, 70 * (1 - 0.3 * hop), 10, 0, 0, 7); g.fill();
    for (let k = 0; k < 3; k++) { g.strokeStyle = `rgba(255,255,255,${0.7 - k * 0.2})`; g.lineWidth = 5; g.beginPath(); g.moveTo(sx - 110 - k * 26, sy - 20 + k * 16); g.lineTo(sx - 150 - k * 26 - 30 * ph, sy - 20 + k * 16); g.stroke(); }
    g.save(); g.translate(sx, sy); g.rotate(-0.12 + 0.18 * (1 - hop)); shoe(0, 0, 150, [255, 255, 255], RED, [12, 140, 104]); g.restore();
    g.restore();
    // 是 / 不是
    const pc = pop(t, i0.tHz + 0.35, 0.7); const sel = prog(t, i3.tHz, 0.3);
    withPop(WW / 2, 350, pc, () => {
      g.globalAlpha *= 1 - 0.55 * sel;
      g.fillStyle = 'rgba(255,255,255,0.8)'; rr(28, 300, 230, 96, 30); g.fill();
      hzText('是', 88, 349, 48, CUR.ink); txt('sí', 190, 349, 30, CUR.ink, 'center', 600);
      g.globalAlpha /= (1 - 0.55 * sel) || 1;
      const s2 = 1 + 0.08 * Math.sin(Math.PI * sel);
      g.save(); g.translate(409, 348); g.scale(s2, s2); g.translate(-409, -348);
      g.fillStyle = sel > 0.5 ? rgba(RED) : 'rgba(255,255,255,0.8)'; rr(294, 300, 230, 96, 30); g.fill();
      hzText('不是', 380, 349, 48, sel > 0.5 ? WHITE : CUR.ink); txt('no', 480, 349, 30, sel > 0.5 ? WHITE : CUR.ink, 'center', 600);
      g.restore();
    });
    // 6:00 → 7:00
    const p6 = pop(t, i2.tHz + 0.4, 0.7);
    withPop(150, 490, p6, () => {
      txt('6:00', 150, 480, 76, CUR.ink, 'center', 700); hzText('六点', 150, 552, 32, CUR.ink, 'center', 700);
      const st = E.outCubic(prog(t, i3.tHz + 0.35, 0.3));
      if (st > 0) { g.strokeStyle = rgba(RED); g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(66, 482); g.lineTo(66 + 170 * st, 482); g.stroke(); }
    });
    const p7 = pop(t, i3.tHz + 0.6, 0.5);
    if (p7.a > 0) { g.globalAlpha *= p7.a; g.strokeStyle = rgba(CUR.ink, 0.5); g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(262, 482); g.lineTo(300, 482); g.moveTo(288, 470); g.lineTo(300, 482); g.lineTo(288, 494); g.stroke(); g.globalAlpha /= p7.a; }
    withPop(410, 490, p7, () => { txt('7:00', 410, 480, 76, RED, 'center', 700); hzText('七点', 410, 552, 32, RED, 'center', 800); });
  },
  /* 很少: barras de frecuencia + corazón */
  henshao(S, t) {
    const u = t - S.start, [i0, i1, i2, i3] = S.items;
    const hs = [300, 220, 140, 64], labs = ['每天', '常常', '有时候', '很少'];
    const cur = E.inOutCubic(prog(u, 1.0, 1.3)) * 3;
    labs.forEach((lb, k) => {
      const cx = 28 + (WW - 56) / 4 * (k + 0.5), bw = 88, bot = 372;
      const pb = spring(u - (0.4 + k * BEAT / 2), 9, 12); if (pb <= 0) return;
      const h = hs[k] * pb; const hot = clamp(1 - Math.abs(cur - k));
      const isSel = k === 3 ? prog(u, 2.2, 0.3) : 0;
      const gr = g.createLinearGradient(0, bot - h, 0, bot);
      const c1 = mix(CUR.acc, RED, Math.max(hot * 0.3, isSel)), c2 = mix([200, 186, 255], [255, 170, 150], isSel);
      gr.addColorStop(0, rgba(c1)); gr.addColorStop(1, rgba(c2));
      g.fillStyle = gr; rr(cx - bw / 2, bot - h, bw, h, 24); g.fill();
      hzText(lb, cx, 412, 32, isSel > 0.5 ? RED : CUR.ink);
      if (hot > 0.02) { g.globalAlpha = hot; g.fillStyle = rgba(RED); g.beginPath(); g.arc(cx, bot - h - 26, 11, 0, 7); g.fill(); g.globalAlpha = 1; }
    });
    // flechas › entre etiquetas
    const pS = prog(u, 2.2, 0.4);
    if (pS > 0) { g.globalAlpha = pS; txt('hěn shǎo · casi nunca', WW / 2, 460, 30, RED, 'center', 700); g.globalAlpha = 1; }
    // corazón + pulso
    const kick = env(EV.kick, t, 9);
    const good = prog(t, i3.tHz + 0.2, 0.5);
    const hc = mix(RED, [22, 163, 74], good);
    g.save(); g.translate(84, 556); const hsz = 1 + 0.12 * kick; g.scale(hsz, hsz); IC.heart(0, 0, 90, hc); g.restore();
    g.strokeStyle = rgba(hc); g.lineWidth = 5; g.lineJoin = 'round'; g.lineCap = 'round';
    g.save(); g.beginPath(); g.rect(140, 500, 380, 110); g.clip(); g.beginPath();
    const ph = (u * 160) % 190;
    for (let x = 140; x <= 520; x += 4) {
      const q = ((x - 140 + ph) % 190) / 190; let y = 556;
      if (q > 0.4 && q < 0.46) y -= (q - 0.4) / 0.06 * 40; else if (q >= 0.46 && q < 0.52) y = 516 + (q - 0.46) / 0.06 * 70; else if (q >= 0.52 && q < 0.56) y = 586 - (q - 0.52) / 0.04 * 30;
      g[x === 140 ? 'moveTo' : 'lineTo'](x, y);
    }
    g.stroke(); g.restore();
    if (good > 0) { const pp = pop(t, i3.tHz + 0.2, 0.6); withPop(400, 556, pp, () => chip(400, 530, 56, '身体很好', { size: 30, solid: [22, 163, 74], color: WHITE, align: 'center', font: FZS, wt: 800 })); }
  },
  /* 出院: edificio del hospital; 住 cae adentro, 出 sale flotando */
  chuyuan(S, t) {
    const u = t - S.start, [i0, i1, i2, i3] = S.items;
    g.save(); rr(28, 28, WW - 56, 330, 32); g.clip();
    panel(28, 28, WW - 56, 330, 32, [150, 214, 255], [214, 240, 255]);
    const pb = spring(u - 0.35, 9, 12);
    g.save(); g.translate(WW / 2, 360); g.scale(1, pb); g.translate(-WW / 2, -360);
    g.fillStyle = '#ffffff'; rr(126, 120, 300, 250, 26); g.fill();
    g.fillStyle = 'rgba(16,120,206,0.2)';
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { if (r === 1 && (c === 1 || c === 2)) continue; rr(150 + c * 66, 150 + r * 70, 46, 46, 12); g.fill(); }
    g.fillStyle = 'rgba(16,120,206,0.85)'; rr(236, 262, 80, 108, [40, 40, 0, 0]); g.fill();
    g.restore();
    // cruz roja en círculo sobre el techo
    const pcx = spring(u - 0.6, 9, 13);
    if (pcx > 0) { g.save(); g.translate(WW / 2, 96); g.scale(pcx, pcx); g.rotate((1 - pcx) * 1.2); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 46, 0, 7); g.fill(); IC.cross(0, 0, 60, RED); g.restore(); }
    // 住 cae dentro de la puerta
    const pz = prog(t, i1.tHz + 0.2, 0.8);
    if (pz > 0) {
      g.save(); rr(236, 262, 80, 108, [40, 40, 0, 0]); g.clip();
      const y = lerp(200, 318, E.outBack(pz)); hzText('住', WW / 2, y, 50, WHITE, 'center', 900); g.restore();
    }
    // 出 sale y flota
    const pc = prog(t, i2.tHz + 0.2, 1.1);
    if (pc > 0) {
      const x = lerp(WW / 2, 470, E.outCubic(pc)), y = lerp(318, 190, E.outCubic(pc)) + Math.sin((t - i2.tHz) * 2.6) * 8 * pc;
      g.fillStyle = rgba([22, 163, 74]); g.beginPath(); g.arc(x, y, 38 * clamp(pc * 3), 0, 7); g.fill();
      hzText('出', x, y + 1, 44, WHITE, 'center', 900);
    }
    g.restore();
    // filas 住院 / 出院
    [[i1, '住院', 'adentro', [16, 120, 206], 392], [i2, '出院', 'afuera', [22, 163, 74], 504]].forEach(([it, hz, es, col, y]) => {
      const pp = pop(t, it.tHz + 0.3, 0.8);
      withPop(WW / 2, y + 48, pp, () => {
        g.fillStyle = 'rgba(255,255,255,0.78)'; rr(28, y, WW - 56, 96, 28); g.fill();
        g.fillStyle = rgba(col); g.beginPath(); g.arc(80, y + 48, 26, 0, 7); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
        if (hz === '住院') { g.moveTo(68, y + 48); g.lineTo(92, y + 48); g.moveTo(82, y + 38); g.lineTo(92, y + 48); g.lineTo(82, y + 58); }
        else { g.moveTo(92, y + 48); g.lineTo(68, y + 48); g.moveTo(78, y + 38); g.lineTo(68, y + 48); g.lineTo(78, y + 58); }
        g.stroke();
        hzText(hz, 124, y + 36, 40, CUR.ink, 'left', 900);
        pyText(it.py, 124, y + 74, 28, 'left');
        txt(es, WW - 52, y + 48, 28, col, 'right', 700, FB);
      });
    });
  },
  /* 多高: regla con dos figuras (爸爸 y 我) */
  gao(S, t) {
    const u = t - S.start, [i0, i1, i2, i3] = S.items;
    const y0 = 560, PX = 240; const ry = m => y0 - m * PX;
    const pr = E.outCubic(prog(u, 0.2, 0.8));
    g.fillStyle = 'rgba(255,255,255,0.8)'; rr(40, ry(2.0) - 22, 70, (y0 - ry(2.0) + 44) * pr, 18); g.fill();
    for (let k = 0; k <= 20; k++) {
      const pk = prog(u, 0.4 + k * BEAT / 8, 0.12); if (pk <= 0) continue;
      const y = ry(k / 10); const len = k % 5 === 0 ? 34 : 16;
      g.globalAlpha = pk; g.fillStyle = rgba(CUR.ink, 0.8); rr(110 - len, y - 2, len, 4, 2); g.fill();
      if (k % 5 === 0) txt((k / 10).toFixed(1).replace('.', ','), 132, y, 26, CUR.ink, 'left', 600);
    }
    g.globalAlpha = 1;
    const person = (x, m, col, lab, a, grow) => {
      if (a <= 0) return;
      const h = m * PX * grow; const top = y0 - h;
      g.globalAlpha = a;
      g.setLineDash([6, 10]); g.strokeStyle = rgba(col, 0.7); g.lineWidth = 3; g.beginPath(); g.moveTo(110, top); g.lineTo(x + 30, top); g.stroke(); g.setLineDash([]);
      const hr = 30; const gr = g.createLinearGradient(0, top, 0, y0); gr.addColorStop(0, rgba(col)); gr.addColorStop(1, rgba(mix(col, WHITE, 0.35)));
      g.fillStyle = gr; g.beginPath(); g.arc(x, top + hr, hr, 0, 7); g.fill();
      rr(x - 42, top + hr * 2 + 8, 84, Math.max(0, h - hr * 2 - 8), [34, 34, 12, 12]); g.fill();
      hzText(lab, x, 596, 32, CUR.ink, 'center', 800);
      g.globalAlpha = 1;
    };
    const pb = spring(t - (i0.tHz + 0.25), 8, 11);
    person(270, 1.85, [255, 150, 60], '爸爸', clamp(pb * 3), pb);
    // 我: mide 1,74; mientras se pregunta 多高 el cursor escanea
    const pw = spring(t - (i1.tHz + 0.25), 8, 11);
    let m = 1.74; const q = t >= i2.tHz && t < i3.tHz + 0.1;
    person(430, 1.74, RED, '我', clamp(pw * 3), pw);
    if (t >= i2.tHz) {
      if (q) m = 1.6 + 0.24 * (0.5 + 0.5 * Math.sin((t - i2.tHz) * 4.6));
      else m = lerp(1.6 + 0.24 * (0.5 + 0.5 * Math.sin((i3.tHz + 0.1 - i2.tHz) * 4.6)), 1.74, spring(t - i3.tHz - 0.1, 10, 12));
      const y = ry(m);
      g.fillStyle = rgba(RED); rr(96, y - 4, 400, 8, 4); g.fill();
      g.beginPath(); g.arc(96, y, 12, 0, 7); g.fill();
      const solid = prog(t, i3.tHz + 0.1, 0.3);
      const lab = solid > 0 ? '1,74 m' : '?';
      const cw = solid > 0 ? 200 : 76;
      g.fillStyle = rgba(RED); rr(WW - 40 - cw, y - 96, cw, 72, 24); g.fill();
      txt(lab, WW - 40 - cw / 2, y - 59, 44, WHITE, 'center', 700);
    }
  },
  /* 知道: balón 3D + tres órbitas + leyenda */
  zhidao(S, t) {
    const u = t - S.start, [i0] = S.items;
    const cx = WW / 2, cy = 250; const R0 = 96;
    const pbl = spring(u - 0.3, 9, 12); const riser = S.tRiser != null ? prog(t, S.tRiser, S.end - S.tRiser) : 0;
    const po = E.outCubic(prog(u, 1.0, 1.0));
    const orbs = [{ rx: 132, lab: '知道', col: RED, w: 0.55, a0: 0.3 }, { rx: 176, lab: '会', col: [12, 150, 120], w: -0.42, a0: 2.2 }, { rx: 212, lab: '认识', col: [214, 120, 0], w: 0.32, a0: 4.1 }];
    const labs = [];
    orbs.forEach(o => {
      const ry = o.rx * 0.3;
      g.save(); g.translate(cx, cy); g.rotate(-0.18); g.globalAlpha = po * 0.5; g.strokeStyle = rgba(o.col); g.lineWidth = 2.5; g.setLineDash([2, 10]); g.lineCap = 'round';
      g.beginPath(); g.ellipse(0, 0, o.rx * po, ry * po, 0, 0, 7); g.stroke(); g.restore();
      const th = o.a0 + o.w * u * (1 + 1.2 * riser);
      const lx = Math.cos(th) * o.rx * po, ly = Math.sin(th) * ry * po;
      const c = Math.cos(-0.18), s = Math.sin(-0.18);
      labs.push({ o, x: cx + lx * c - ly * s, y: cy + lx * s + ly * c, front: Math.sin(th) > 0 });
    });
    const lab = L => { const a0 = g.globalAlpha; g.globalAlpha = a0 * po * (L.front ? 1 : 0.55); const w = L.o.lab.length * 36 + 40;
      g.fillStyle = rgba(L.o.col); rr(L.x - w / 2, L.y - 28, w, 56, 28); g.fill(); hzText(L.o.lab, L.x, L.y + 1, 34, WHITE, 'center', 800); g.globalAlpha = a0; };
    labs.filter(L => !L.front).forEach(lab);
    if (pbl > 0) {
      g.save(); g.translate(cx, cy); g.scale(pbl, pbl);
      g.fillStyle = 'rgba(20,24,76,0.16)'; g.beginPath(); g.ellipse(0, R0 + 50, R0 * 0.8, 14, 0, 0, 7); g.fill();
      g.beginPath(); g.arc(0, 0, R0, 0, 7); g.save(); g.clip();
      const sg = g.createRadialGradient(-30, -36, 10, 0, 0, R0 * 1.1); sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.7, '#e8ebff'); sg.addColorStop(1, '#aab2e8');
      g.fillStyle = sg; g.fillRect(-R0, -R0, R0 * 2, R0 * 2);
      g.rotate(u * (0.9 + 1.5 * riser));
      const pent = (x, y, s, a) => { g.beginPath(); for (let k = 0; k < 5; k++) { const th = a + k * Math.PI * 2 / 5; g[k ? 'lineTo' : 'moveTo'](x + Math.cos(th) * s, y + Math.sin(th) * s); } g.closePath(); g.fill(); };
      g.fillStyle = rgba([34, 38, 90]); pent(0, 0, R0 * 0.3, -Math.PI / 2);
      for (let k = 0; k < 5; k++) { const th = -Math.PI / 2 + k * Math.PI * 2 / 5 + Math.PI / 5; pent(Math.cos(th) * R0 * 0.95, Math.sin(th) * R0 * 0.95, R0 * 0.27, th); }
      g.strokeStyle = rgba([34, 38, 90]); g.lineWidth = 3;
      for (let k = 0; k < 5; k++) { const th = -Math.PI / 2 + k * Math.PI * 2 / 5; g.beginPath(); g.moveTo(Math.cos(th) * R0 * 0.3, Math.sin(th) * R0 * 0.3); g.lineTo(Math.cos(th) * R0 * 0.72, Math.sin(th) * R0 * 0.72); g.stroke(); }
      g.restore();
      const hl = g.createRadialGradient(-34, -40, 2, -34, -40, 60); hl.addColorStop(0, 'rgba(255,255,255,0.75)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = hl; g.beginPath(); g.arc(0, 0, R0, 0, 7); g.fill();
      g.restore();
    }
    labs.filter(L => L.front).forEach(lab);
    // leyenda
    const rows = [['知道', 'un dato', RED], ['会', 'saber hacer', [12, 150, 120]], ['认识', 'a alguien', [214, 120, 0]]];
    rows.forEach(([hz, es, col], k) => {
      const t0 = k === 0 ? i0.tHz + 1.0 : (S.tNota ?? S.end) + (k - 1) * BEAT / 2;
      const lit = S.tNota != null ? prog(t, S.tNota + k * BEAT / 2, 0.3) : 0;
      const pp = pop(t, t0, 0.8); const y = 446 + k * 60;
      withPop(WW / 2, y + 26, pp, () => {
        g.fillStyle = `rgba(255,255,255,${0.55 + 0.3 * lit})`; rr(28, y, WW - 56, 52, 26); g.fill();
        g.fillStyle = rgba(col); g.beginPath(); g.arc(58, y + 26, 10, 0, 7); g.fill();
        hzText(hz, 84, y + 27, 32, CUR.ink, 'left', 800);
        txt(es, WW - 52, y + 27, 28, col, 'right', 700, FB);
      });
    });
  },
  /* 忙 / 休息: reloj que gira + batería que se agota */
  'mang-xiuxi'(S, t) {
    const u = t - S.start, [i0, i1, i2, i3] = S.items;
    const RX = WW / 2, RY = 214, R = 150; const stop = i3.tHz - S.start;
    const w = Math.PI * 2 * 0.5, tau = 0.45; /* 0,5 vueltas/s = 30 min por segundo */ const riser = S.tRiser != null ? prog(t, S.tRiser, S.end - S.tRiser) : 0;
    const ang = u < stop ? w * u : w * stop + w * tau * (1 - Math.exp(-(u - stop) / tau));
    const pc = spring(u - 0.3, 9, 12); if (pc <= 0) return;
    const kick = env(EV.kick, t, 9);
    g.save(); g.translate(RX, RY); g.scale(pc, pc);
    g.fillStyle = `rgba(255,255,255,0.85)`; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill();
    g.strokeStyle = rgba(CUR.acc, 0.25 + 0.4 * kick * (u < stop ? 1 : 0.2)); g.lineWidth = 10 + 8 * kick; g.beginPath(); g.arc(0, 0, R + 10, 0, 7); g.stroke();
    for (let k = 0; k < 12; k++) { const th = k * Math.PI / 6; g.strokeStyle = rgba(CUR.ink, k % 3 ? 0.35 : 0.8); g.lineWidth = k % 3 ? 4 : 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(Math.cos(th) * (R - 18), Math.sin(th) * (R - 18)); g.lineTo(Math.cos(th) * (R - (k % 3 ? 32 : 40)), Math.sin(th) * (R - (k % 3 ? 32 : 40))); g.stroke(); }
    const hA = (ang + 9 * Math.PI * 2) / 12;          // la aguja horaria parte en las 9:00, igual que la hora digital
    g.strokeStyle = rgba(CUR.ink); g.lineWidth = 10; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(hA - Math.PI / 2) * (R - 70), Math.sin(hA - Math.PI / 2) * (R - 70)); g.stroke();
    g.strokeStyle = rgba(RED); g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(ang - Math.PI / 2) * (R - 34), Math.sin(ang - Math.PI / 2) * (R - 34)); g.stroke();
    g.fillStyle = rgba(RED); g.beginPath(); g.arc(0, 0, 12, 0, 7); g.fill();
    g.restore();
    // hora digital
    const mins = Math.max(0, ang) / (Math.PI * 2) * 60;   // misma fuente que las agujas: el reloj analógico y el digital siempre coinciden
    const hh = 9 + Math.floor(mins / 60), mm = Math.floor(mins % 60);
    txt(String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'), WW / 2, 418, 60, CUR.ink, 'center', 700);
    // batería
    const lv = [0.95, 0.72, 0.36, 0.08];
    let level = lv[0]; S.items.forEach((it, k) => { if (k > 0) level = lerp(level, lv[k], crit(t - it.tHz - 0.3, 6)); });
    const bx = 60, by = 486, bw = 300, bh = 96;
    g.fillStyle = 'rgba(255,255,255,0.8)'; rr(bx, by, bw, bh, 26); g.fill();
    g.fillStyle = rgba(CUR.ink, 0.35); rr(bx + bw + 8, by + 30, 14, 36, 6); g.fill();
    const col = level > 0.5 ? [22, 163, 74] : level > 0.2 ? [240, 150, 20] : RED;
    g.fillStyle = rgba(col); rr(bx + 12, by + 12, (bw - 24) * level, bh - 24, 16); g.fill();
    txt(Math.round(level * 100) + '%', 470, by + bh / 2, 46, col, 'center', 700);
  },
};

/* ---------------- escena: diálogo (burbujas de chat) ---------------- */
const DLG = { top: 196, gap: 22, vb: 1004, vbNota: 862, ax: 184, bx: 1312, maxW: 1100 };
const GEO = new Map();
function dlgGeom(S) {
  let G = GEO.get(S.id); if (G) return G;
  G = { b: [] }; let y = DLG.top;
  S.items.forEach(it => {
    const L = layoutItem(S, it, 'dlg'); const isB = it.who === 'B';
    const w = Math.min(DLG.maxW, L.bw + 64), h = L.h + 44;
    G.b.push({ x: isB ? DLG.bx - w : DLG.ax, y, w, h, L, isB });
    y += h + DLG.gap;
  });
  const ev = []; let prev = 0;
  S.items.forEach((it, i) => { const b = G.b[i]; const tgt = Math.max(0, b.y + b.h - DLG.vb); ev.push({ t: it.tHz - 0.45, d: tgt - prev }); prev = tgt; });
  const last = G.b[G.b.length - 1]; const tn = Math.max(prev, last.y + last.h - DLG.vbNota);
  ev.push({ t: (S.tNota ?? S.end + 9) - 0.1, d: tn - prev });
  G.ev = ev; GEO.set(S.id, G); return G;
}
function dlgScroll(S, t) { const G = dlgGeom(S); let o = 0; for (const e of G.ev) o += e.d * crit(t - e.t, 10); return o; }
function avatar(x, y, r, who, t0, t) {
  const p = spring(t - t0, 10, 13); if (p <= 0) return;
  g.save(); g.translate(x, y); g.scale(p, p);
  const c1 = who === 'B' ? RED : CUR.acc, c2 = who === 'B' ? [255, 150, 110] : mix(CUR.acc, WHITE, 0.4);
  const gr = g.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, rgba(c2)); gr.addColorStop(1, rgba(c1));
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; g.stroke();
  txt(who, 0, 2, 30, WHITE, 'center', 700); g.restore();
}
function sceneDialog(S, t) {
  const P = CUR;
  contactTile(S, t);
  const G = dlgGeom(S); const off = dlgScroll(S, t);
  // el chat se dibuja en una capa aparte para desvanecer con máscara las burbujas que salen por arriba
  const main = g, cw = main.canvas.width, ch = main.canvas.height;
  if (LAY.width !== cw || LAY.height !== ch) { LAY.width = cw; LAY.height = ch; }
  const lg = LAY.getContext('2d'); lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalAlpha = 1; lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, cw, ch);
  lg.setTransform(main.getTransform()); g = lg;
  g.save(); g.beginPath(); g.rect(40, 130, 1400, 900); g.clip();
  S.items.forEach((it, i) => {
    const b = G.b[i]; const y = b.y - off; const fa = clamp((y + b.h - 150) / 60);
    if (fa <= 0) return;
    const fa0 = g.globalAlpha; g.globalAlpha = fa0 * fa;
    // escribiendo…
    if (t >= it.tHz - 0.45 && t < it.tHz) {
      const pt = spring(t - (it.tHz - 0.45), 12, 14);
      const tw = 128, th = 72, tx = b.isB ? DLG.bx - tw : DLG.ax, ty = y + b.h - th;
      g.save(); const ox = b.isB ? tx + tw : tx, oy = ty + th; g.translate(ox, oy); g.scale(pt, pt); g.translate(-ox, -oy);
      if (b.isB) { g.fillStyle = 'rgba(255,255,255,0.92)'; rr(tx, ty, tw, th, [30, 30, 8, 30]); g.fill(); }
      else glass(tx, ty, tw, th, [30, 30, 30, 8], { sb: 30, sy: 10 });
      for (let k = 0; k < 3; k++) { const bob = Math.max(0, Math.sin((t * 9) - k * 0.9)); g.fillStyle = b.isB ? rgba([40, 30, 60], 0.5 + 0.4 * bob) : `rgba(255,255,255,${0.5 + 0.4 * bob})`; g.beginPath(); g.arc(tx + 38 + k * 26, ty + th / 2 - bob * 7, 8, 0, 7); g.fill(); }
      g.restore();
    }
    if (t < it.tHz) { g.globalAlpha = fa0; return; }
    avatar(b.isB ? 1374 : 124, y + b.h - 32, 32, it.who, it.tHz - 0.05, t);
    const drop = S.tHit != null && b.isB;
    const pp = drop ? spring(t - it.tHz, 8, 16) : spring(t - it.tHz, 11, 13);
    const s = lerp(drop ? 0.55 : 0.7, 1, pp);
    const ox = b.isB ? b.x + b.w : b.x, oy = y + b.h;
    const a0 = g.globalAlpha;
    g.save(); g.translate(ox, oy); g.scale(s, s); g.translate(-ox, -oy); g.globalAlpha = a0 * clamp((t - it.tHz) * 8);
    const rad = b.isB ? [36, 36, 10, 36] : [36, 36, 36, 10];
    if (b.isB) {
      softShadow(b.x, y, b.w, b.h, rad, 50, 18, 'rgba(0,0,20,0.35)');
      g.fillStyle = 'rgba(255,255,255,0.96)'; rr(b.x, y, b.w, b.h, rad); g.fill();
      drawItem(S, it, b.L, b.x + b.w - 32, y + 22, t, { align: 'right', dark: false, ink: [24, 20, 44] });
    } else {
      glass(b.x, y, b.w, b.h, rad, {});
      drawItem(S, it, b.L, b.x + 32, y + 22, t, { align: 'left', dark: true, ink: WHITE });
    }
    g.restore(); g.globalAlpha = a0;
    // 会…吧: signo de pregunta suave
    if (S.id === 'zhanglaoshi' && it.hz.includes('吧')) {
      const p = spring(t - (it.tHz + 0.5), 8, 10);
      if (p > 0) {
        const qx = b.x + b.w + 60, qy = y + b.h / 2 + Math.sin(t * 2.2) * 6;
        g.save(); g.translate(qx, qy); g.scale(p, p); g.rotate(0.12 * Math.sin(t * 1.7));
        glass(-44, -44, 88, 88, 44, { sb: 30, sy: 10 }); txt('?', 0, 3, 60, [255, 200, 90], 'center', 700); g.restore();
      }
    }
    g.globalAlpha = fa0;
  });
  g.restore();
  g.globalCompositeOperation = 'destination-out';
  const mk = g.createLinearGradient(0, 150, 0, 270); mk.addColorStop(0, 'rgba(0,0,0,1)'); mk.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = mk; g.fillRect(0, -300, 1460, 570); g.globalCompositeOperation = 'source-over';
  g = main;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(LAY, 0, 0); g.restore();
  notaCard(S, t, { x: 96, y: 884, w: 1300, h: 120 }, 32);
  header(S, t, P.ink);          // al final: el título del drop cae por encima del chat y de la tarjeta de contacto
}
/* tarjeta de contacto (derecha): contexto del diálogo */
const CT_R = { x: 1464, y: 176, w: 360, h: 828 };
function contactTile(S, t) {
  const u = t - S.start; const e = spring(u - 0.08, 9, 12); if (e <= 0) return;
  const R = CT_R; const a0 = g.globalAlpha;
  g.save(); g.translate(0, (1 - e) * 60); g.globalAlpha = a0 * clamp(e * 3);
  glass(R.x, R.y, R.w, R.h, 44, {});
  const cx = R.x + R.w / 2, ay = R.y + 150;
  const [i0, i1, i2, i3] = S.items;
  let name, py, es, chips;
  if (S.id === 'haoduole') {
    const p = spring(u - 0.2, 9, 13);
    g.save(); g.translate(cx, ay); g.scale(p, p);
    const gr = g.createLinearGradient(-110, -110, 110, 110); gr.addColorStop(0, '#ff9a7a'); gr.addColorStop(1, rgba(RED));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 104, 0, 7); g.fill(); IC.cross(0, 0, 110, WHITE); g.restore();
    name = '医院'; py = 'yīyuàn'; es = 'el hospital';
    chips = [[i1, '好多了', 'mucho mejor', [22, 163, 74]], [i3, '下个星期', 'la próxima semana', [56, 104, 255]]];
  } else if (S.id === 'dawei') {
    // el balón de la escena anterior estalla y sus partículas forman 大卫
    const fb = 1 - prog(u, 0, 0.1);
    if (fb > 0) { g.save(); g.globalAlpha *= fb; g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, ay, 70 * (1 + 0.4 * (1 - fb)), 0, 7); g.fill(); g.restore(); }
    const pe = E.outCubic(prog(u, 0, 0.5));
    // cuando las partículas llegan, se funden en el glifo sólido (antes quedaba granulado toda la escena)
    const solid = E.inOutCubic(prog(u, 1.45, 0.45));
    const pA = 1 - solid;
    if (solid > 0) {
      const sz = 150 * 0.95; g.save(); g.globalAlpha = a0 * clamp(e * 3) * solid;
      g.translate(cx, ay); g.scale(lerp(1.04, 1, solid), lerp(1.04, 1, solid));
      const gr = g.createLinearGradient(0, -sz / 2, 0, sz / 2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#ffc2dc');
      g.font = hzFont(sz, 900); g.fillStyle = gr; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('大卫', -150 * 0.95, 0);
      g.restore();
    }
    if (pA > 0) for (const q of PARTS) {
      const ox = cx + q.ox, oy = ay + q.oy;
      const ex = ox + Math.cos(q.dir) * q.sp * 0.4 * pe, ey = oy + Math.sin(q.dir) * q.sp * 0.4 * pe;
      const pa = E.inOutCubic(prog(u, 0.35 + q.dl, 0.9));
      const tx = cx + q.tx * 0.95 + Math.sin(u * 1.7 + q.ph) * 1.4 * pa, ty = ay + q.ty * 0.95 + Math.cos(u * 1.3 + q.ph) * 1.4 * pa;
      const x = lerp(ex, tx, pa), y = lerp(ey, ty, pa);
      g.globalAlpha = a0 * clamp(e * 3) * (0.6 + 0.4 * pa) * pA;
      g.fillStyle = q.hue < 0.18 ? rgba([255, 150, 190]) : q.hue < 0.3 ? rgba([255, 190, 120]) : '#fff';
      const s = lerp(4, 3.2, pa); g.fillRect(x - s / 2, y - s / 2, s, s);
    }
    g.globalAlpha = a0 * clamp(e * 3);
    name = null; py = 'Dàwèi'; es = 'David';
    chips = [[i1, '二十多岁', 'veintitantos años', [255, 90, 150]], [i1, '一米八几', 'mide 1,8 y algo', [255, 130, 60]], [i3, '同学', 'compañero de clase', [138, 64, 255]]];
  } else {
    const p = spring(u - 0.1, 9, 13);
    g.save(); g.translate(cx, ay); g.scale(p, p);
    const gr = g.createLinearGradient(-110, -110, 110, 110); gr.addColorStop(0, '#ff9a7a'); gr.addColorStop(1, '#b3143c');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 104, 0, 7); g.fill(); g.restore();
    brushChar('张', cx, ay, 150, S.start + 0.2, 1.0, t, WHITE, [255, 214, 190]);
    name = '张老师'; py = 'Zhāng lǎoshī'; es = 'la profesora Zhang';
    chips = [[i1, '这几天很忙', 'ocupada estos días', [255, 130, 80]], [i3, '很累', 'muy cansada', [179, 20, 80]]];
  }
  const pn = spring(u - 0.5, 10, 12);
  if (pn > 0) {
    g.save(); g.globalAlpha *= clamp(pn * 3);
    const yN = R.y + 318;
    if (name) hzText(name, cx, yN + (1 - pn) * 30, 60, CUR.ink, 'center', 900);
    pyText(py, cx, name ? yN + 64 : yN + 10, name ? 34 : 44, 'center');
    txt(es, cx, name ? yN + 108 : yN + 64, 30, CUR.ink, 'center', 500, FB);
    g.restore();
  }
  chips.forEach(([it, hz, esx, col], k) => {
    const pp = pop(t, it.tHz + 0.35 + (k === 1 && S.id === 'dawei' ? 0.5 : 0), 0.6); const y = R.y + 480 + k * 112;
    withPop(cx, y + 48, pp, () => {
      g.fillStyle = rgba(col); rr(R.x + 24, y, R.w - 48, 98, 28); g.fill();
      hzText(hz, R.x + 48, y + 36, 36, WHITE, 'left', 900);
      txt(esx, R.x + 48, y + 74, 26, WHITE, 'left', 600, FB);
    });
  });
  g.restore(); g.globalAlpha = a0;
}

/* ---------------- escena: intro ---------------- */
function introCardRect(k) { return { x: k ? 1020 : 200, y: 196, w: 700, h: 470, r: 48 }; }
const TOPICS = [['Rutina', 'sun'], ['Salud', 'heart'], ['Altura', 'ruler'], ['Saber', 'bulb'], ['Descansar', 'moon']];
function sceneIntro(S, t) {
  const u = t - S.start; const [a, b] = S.items;
  // el punto rojo del bucle se abre en las dos tarjetas
  const dotR = 12 * (1 - prog(u, 0.25, 0.3));
  if (dotR > 0.3) { g.fillStyle = rgba(RED); g.beginPath(); g.arc(960, 540, dotR, 0, 7); g.fill(); }
  [a, b].forEach((it, k) => {
    const R = introCardRect(k); const p = spring(t - (it.tHz - 0.1), 8, 11);
    if (p <= 0) return;
    const from = { x: 960 - 12, y: 540 - 12, w: 24, h: 24, r: 12 };
    const Rc = lerpRect(from, R, p);
    const a0 = g.globalAlpha; g.globalAlpha = a0 * clamp(p * 4);
    if (k === 1) glass(Rc.x, Rc.y, Rc.w, Rc.h, Rc.r, { fill: 'rgba(231,76,60,0.28)', glow: 0.25 });
    else glass(Rc.x, Rc.y, Rc.w, Rc.h, Rc.r);
    g.save(); rr(Rc.x, Rc.y, Rc.w, Rc.h, Rc.r); g.clip();
    const L = layoutItem(S, it, 'intro');
    const s = Rc.w / R.w; g.translate(Rc.x, Rc.y); g.scale(s, s);
    drawItem(S, it, L, R.w / 2, (R.h - L.h) / 2, t, { align: 'center', ink: WHITE, dark: true });
    g.restore(); g.globalAlpha = a0;
  });
  // chips de temas
  if (S.tNota != null && t >= S.tNota - 0.05) {
    const font = `600 34px ${FB}`; const ws = TOPICS.map(([s]) => mw(font, s) + 28 * 2 + 44);
    const total = ws.reduce((x, y) => x + y, 0) + 18 * (TOPICS.length - 1); let x = 960 - total / 2;
    TOPICS.forEach(([s, ic], k) => {
      const pp = pop(t, S.tNota + k * 0.09, 0.6);
      const w = ws[k]; const cx = x + w / 2;
      withPop(cx, 760, pp, () => chip(x, 724, 76, s, { size: 34, font: FB, wt: 600, color: WHITE, icon: IC[ic], iconCol: [255, 160, 140], padX: 28 }));
      x += w + 18;
    });
    const pf = prog(t, S.tNota + 0.6, 0.5);
    if (pf > 0) { g.globalAlpha = pf; txt(CT.title.fecha, 960, 900, 30, WHITE, 'center', 500, FB); g.globalAlpha = 1; }
  }
}

/* ---------------- escena: cierre (tonos → bento) ---------------- */
const CELL_COL = [[255, 138, 107], [178, 158, 255], [118, 196, 255], [110, 222, 176], [255, 206, 84], [104, 122, 255], [255, 144, 172], [150, 226, 255]];
const CELL_IC = ['sun', 'bars', 'cross', 'heart', 'ruler', 'bulb', 'fork', 'moon'];
const TONE_TILES = [{ d: [[-1, -0.1], [1, -0.1]], s: 'ā', n: '1.er tono' }, { d: [[-1, 0.5], [1, -0.6]], s: 'á', n: '2.º tono' }, { d: [[-1, -0.3], [-0.2, 0.55], [1, -0.6]], s: 'ǎ', n: '3.er tono' }, { d: [[-1, -0.6], [1, 0.5]], s: 'à', n: '4.º tono' }];
function cellRect(i) { const c = i % 4, r = (i / 4) | 0; return { x: 96 + c * 438, y: 180 + r * 318, w: 414, h: 294, r: 40 }; }
function sceneCierre(S, t) {
  const u = t - S.start; const tg = (S.tGrid || S.start + 2.14);
  const tc = S.tCollapse || S.end - 0.5; const pc = E.inCubic(prog(t, tc, S.end - tc));
  const a0 = g.globalAlpha;
  g.globalAlpha = a0 * (1 - pc); header(S, t, CUR.ink); g.globalAlpha = a0;
  // fase 1 (BREAK): los cuatro tonos, y luego se vuelven la leyenda de la cabecera
  const pl = crit(t - (tg - 0.4), 8);
  TONE_TILES.forEach((tt, k) => {
    const pin = spring(u - (0.25 + k * 0.12), 9, 12); if (pin <= 0) return;
    const col = TONE.dark[k + 1];
    const A = { x: 960 + (k - 1.5) * 300 - 130, y: 390 + Math.sin(u * 2 + k) * 10, w: 260, h: 300, r: 48 };
    const B = { x: 1476 + k * 88, y: 72, w: 72, h: 56, r: 28 };
    const R = lerpRect(A, B, pl);
    g.save(); g.globalAlpha = a0 * clamp(pin * 3) * (1 - pc);
    const s = lerp(0.8, 1, pin); g.translate(R.x + R.w / 2, R.y + R.h / 2); g.scale(s, s); g.translate(-(R.x + R.w / 2), -(R.y + R.h / 2));
    if (pl < 0.98) glass(R.x, R.y, R.w, R.h, R.r, { glow: 0.3 * (1 - pl), glowCol: col }); else { g.fillStyle = rgba(col); rr(R.x, R.y, R.w, R.h, R.r); g.fill(); }
    const q = 1 - pl;
    if (q > 0.02) {
      g.globalAlpha *= clamp(q * 1.5);
      const cx = R.x + R.w / 2, sz = 70 * (R.w / 260);
      g.strokeStyle = rgba(col); g.lineWidth = 14 * (R.w / 260); g.lineCap = 'round'; g.lineJoin = 'round';
      const dp = E.outCubic(prog(u, 0.45 + k * 0.12, 0.5));
      g.beginPath(); const pts = tt.d; pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](cx + p[0] * sz, R.y + R.h * 0.3 + p[1] * sz));
      g.save(); g.setLineDash([400 * dp, 1e4]); g.stroke(); g.restore();
      txt(tt.s, cx, R.y + R.h * 0.62, 80 * (R.w / 260), col, 'center', 700);
      txt(tt.n, cx, R.y + R.h * 0.86, 28 * (R.w / 260), WHITE, 'center', 600, FB);
      g.globalAlpha /= clamp(q * 1.5) || 1;
    }
    if (pl > 0.5) { g.globalAlpha *= clamp((pl - 0.5) * 2); txt(tt.s, R.x + R.w / 2, R.y + R.h / 2 + 2, 34, [20, 16, 50], 'center', 700); }
    g.restore();
  });
  g.globalAlpha = a0;
  // fase 2: bento de 8 tarjetas
  S.items.forEach((it, i) => {
    if (t < it.tHz - 0.2) return;
    let R = cellRect(i); const p = spring(t - (it.tHz - 0.12), 9, 12);
    const s = lerp(0.7, 1, p) * (1 - pc);
    const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
    const tx = lerp(cx, 960, pc), ty = lerp(cy, 540, pc);
    g.save(); g.translate(tx, ty); g.scale(Math.max(0.001, s), Math.max(0.001, s)); g.translate(-cx, -cy + (1 - p) * 40);
    g.globalAlpha = a0 * clamp((t - it.tHz + 0.2) * 5) * (1 - pc);
    const c = CELL_COL[i];
    softShadow(R.x, R.y, R.w, R.h, R.r, 50, 20, rgba(mix(c, [0, 0, 0], 0.5), 0.45), false);
    const gr = g.createLinearGradient(R.x, R.y, R.x + R.w, R.y + R.h); gr.addColorStop(0, rgba(mix(c, WHITE, 0.62))); gr.addColorStop(1, rgba(mix(c, WHITE, 0.3)));
    g.fillStyle = gr; rr(R.x, R.y, R.w, R.h, R.r); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; rr(R.x + 1, R.y + 1, R.w - 2, R.h - 2, R.r); g.stroke();
    IC[CELL_IC[i]](R.x + R.w - 52, R.y + 50, 44, mix(c, [20, 16, 50], 0.55));
    txt(String(i + 1).padStart(2, '0'), R.x + 32, R.y + 46, 26, mix(c, [20, 16, 50], 0.6), 'left', 700);
    const L = layoutItem(S, it, 'cell');
    drawItem(S, it, L, cx, R.y + 64 + (R.h - 70 - L.h) / 2, t, { align: 'center', dark: false, ink: [20, 16, 50] });
    g.restore(); g.globalAlpha = a0;
  });
  // lockup 再见！下次见。
  if (S.tNota != null && t >= S.tNota) {
    g.save(); g.globalAlpha = a0 * (1 - pc);
    const lk = { hz: S.nota, py: 'zàijiàn! xiàcì jiàn.', es: '¡Adiós! Hasta la próxima.', tHz: S.tNota, tEs: S.tNota + 0.35, j: 99 };
    const pyT = [...lk.py].map((c, k) => S.tNota + 0.15 + k * 0.022);
    // placa de vidrio oscuro: el pinyin azul/rojo se lee sobre cualquier zona de la malla
    const pp = spring(t - (S.tNota - 0.05), 10, 12);
    if (pp > 0) { const pw = lerp(560, 860, pp); glass(960 - pw / 2, 814, pw, 200, 40, { fill: 'rgba(16,10,48,0.55)', sb: 50, sy: 18 }); }
    hzRise({ s: lk.hz, o: 0 }, 960, 868, 76, S.tNota, t, { ink: WHITE, dark: true, align: 'center', stagger: 0.05 });
    pyTone([{ s: lk.py, o: 0 }], 960, 912, 36, pyT, t, 'center', toneArr(lk.py), true, WHITE);
    esRise([{ s: lk.es, o: 0 }], 960, 962, 30, lk.tEs, t, 'center', 'rgba(255,255,255,0.88)');
    g.restore();
  }
  // punto rojo del bucle (idéntico al cuadro t = 0)
  if (pc > 0) { g.fillStyle = rgba(RED); g.beginPath(); g.arc(960, 540, 12 * E.outCubic(pc), 0, 7); g.fill(); }
}

/* ---------------- composición de escena y transiciones ---------------- */
function palAt(S, t) {
  if (S.kind === 'cierre') { const tc = S.tCollapse || S.end - 0.5; return mixPal(PAL.cierre, PAL.intro, E.inOutSine(prog(t, tc - 0.3, S.end - tc + 0.3))); }
  return S.pal;
}
function drawScene(S, t) {
  const P = palAt(S, t); CUR = P;
  const kick = env(EV.kick, t, 10);
  mesh(P, t, kick);
  watermark(S, t, P, S.kind === 'cierre' ? 1 - prog(t, (S.tCollapse || S.end - 0.5) - 0.3, 0.5) : 1);
  snapBackdrop(P);
  if (S.kind === 'intro') sceneIntro(S, t);
  else if (S.kind === 'dialogo') sceneDialog(S, t);
  else if (S.kind === 'cierre') sceneCierre(S, t);
  else sceneStack(S, t);
}
function exitRect(S) {
  const t = S.end;
  if (S.kind === 'intro') return introCardRect(1);
  if (S.kind === 'dialogo') { const G = dlgGeom(S); const off = dlgScroll(S, t); const b = G.b[G.b.length - 1]; return { x: b.x, y: b.y - off, w: b.w, h: b.h, r: 36 }; }
  return widgetRect(S, t);
}
const TR = 0.62;
function drawFrame(t) {
  g.setTransform(BASE, 0, 0, BASE, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.setLineDash([]); g.filter = 'none';
  const k = sceneAt(t); const S = SC[k];
  const [sx, sy, sr] = shake(t);
  g.save(); g.translate(960 + sx, 540 + sy); g.rotate(sr); g.translate(-960, -540);
  const P = k > 0 ? SC[k - 1] : null;
  const hard = S.tHit != null && Math.abs(S.tHit - S.start) < 0.01;
  if (P && !hard && t < S.start + TR) {
    // la tarjeta que cierra la escena anterior crece y se vuelve el fondo de la nueva
    const p = prog(t, S.start, TR); const e = E.inOutQuart(p);
    const sOld = 1 - 0.06 * E.inOutCubic(p);
    g.save(); g.translate(960, 540); g.scale(sOld, sOld); g.translate(-960, -540); drawScene(P, t); g.restore();
    g.fillStyle = `rgba(0,0,0,${0.22 * p})`; g.fillRect(-60, -60, W + 120, H + 120);
    const R0 = scaleRect(exitRect(P), sOld, 960, 540);
    const R = lerpRect(R0, { x: -4, y: -4, w: W + 8, h: H + 8, r: 0 }, e);
    if (R.x > -2) softShadow(R.x, R.y, R.w, R.h, R.r, 80, 30, 'rgba(0,0,0,0.35)');
    g.save(); rr(R.x, R.y, R.w, R.h, R.r); g.clip();
    const sNew = lerp(1.06, 1, e); g.translate(960, 540); g.scale(sNew, sNew); g.translate(-960, -540);
    drawScene(S, t); g.restore();
    g.strokeStyle = `rgba(255,255,255,${0.7 * (1 - p)})`; g.lineWidth = 2; rr(R.x + 1, R.y + 1, R.w - 2, R.h - 2, R.r); g.stroke();
  } else drawScene(S, t);
  g.restore();
}
function shake(t) {
  let x = 0, y = 0, r = 0;
  for (const arr of [EV.impact, EV.sub]) {
    const i = lastIdx(arr, t); if (i < 0) continue;
    for (let j = i; j >= Math.max(0, i - 1); j--) {
      const e = arr[j]; const d = t - e.t; if (d > 1.2) continue;
      const Am = e.i * 12 * Math.exp(-7 * d);
      x += Am * Math.sin(2 * Math.PI * 9 * d); y += Am * 0.8 * Math.sin(2 * Math.PI * 11 * d + 1.1); r += Am * 0.0004 * Math.sin(2 * Math.PI * 7 * d + 2);
    }
  }
  return [x, y, r];
}
function post(t, ctx) {
  g = ctx;
  const cw = g.canvas.width, ch = g.canvas.height;
  const frame = Math.round(t * FPS) % Math.max(1, Math.round(DUR * FPS));
  // glitch mínimo: solo 2 cuadros en los impactos fuertes (drops)
  const ii = lastIdx(EV.impact, t);
  if (ii >= 0) {
    const e = EV.impact[ii]; const fi = Math.floor((t - e.t) * FPS + 1e-4); const nF = e.i >= 1 ? 2 : 0;
    if (fi >= 0 && fi < nF) {
      if (scratch.width !== cw || scratch.height !== ch) { scratch.width = cw; scratch.height = ch; }
      const sx = scratch.getContext('2d'); sx.setTransform(1, 0, 0, 1, 0, 0); sx.clearRect(0, 0, cw, ch); sx.drawImage(g.canvas, 0, 0);
      const r = mulberry32(frame * 7919 + 13);
      g.setTransform(1, 0, 0, 1, 0, 0);
      const n = 4 + ((r() * 4) | 0);
      for (let s = 0; s < n; s++) {
        const y = r() * ch, h = (0.01 + r() * 0.04) * ch, dx = (r() - 0.5) * 0.04 * cw;
        g.drawImage(scratch, 0, y, cw, h, dx, y, cw, h);
        if (r() < 0.4) { g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.25; g.fillStyle = r() < 0.5 ? '#ff4d6d' : '#38e1ff'; g.fillRect(0, y, cw, h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      }
    }
  }
  g.setTransform(BASE, 0, 0, BASE, 0, 0);
  for (const f of EV.flash) {
    const fi = Math.floor((t - f.t) * FPS + 1e-4);
    if (fi >= 0 && fi < f.f) { g.globalAlpha = f.a * (fi === 0 ? 1 : 0.5); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); }
  }
  g.globalAlpha = 1;
  // grano fino con semilla por cuadro
  const r = mulberry32(frame + 1);
  const tile = GRAIN[frame % 4]; const ox = -((r() * 256) | 0), oy = -((r() * 256) | 0);
  let riser = 0; for (const S of SC) if (S.tRiser != null && t >= S.tRiser && t < S.end) riser = prog(t, S.tRiser, S.end - S.tRiser);
  g.globalAlpha = 0.05 + 0.04 * riser; g.globalCompositeOperation = 'overlay';
  for (let y = oy; y < H; y += 256) for (let x = ox; x < W; x += 256) g.drawImage(tile, x, y);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
}
function blurAmount(t) {
  let w = 0;
  for (const e of EV.impact) { const d = t - e.t; if (d >= 0 && d < 0.15) w = Math.max(w, 1 - d / 0.15); }
  for (const S of SC) if (S.tRiser != null && t >= S.tRiser && t < S.end) w = Math.max(w, 0.3 * prog(t, S.tRiser, S.end - S.tRiser));
  return w;
}
function render(t) {
  t = clamp(+t || 0, 0, DUR); if (t >= DUR - 1e-9) t = 0;   // bucle: el cuadro DUR es el cuadro 0
  if (CAPTURE) {
    const w = blurAmount(t);
    const N = w > 0.05 ? (w > 0.5 ? 4 : 3) : 1;
    if (N === 1) { g = mainCtx; drawFrame(t); }
    else {
      if (sub.width !== canvas.width || sub.height !== canvas.height) { sub.width = canvas.width; sub.height = canvas.height; }
      const span = (0.4 + w) / FPS;
      for (let i = 0; i < N; i++) {
        const ti = Math.max(SC[sceneAt(t)].start, t - span * i / (N - 1));
        g = sub.getContext('2d'); drawFrame(ti);
        mainCtx.setTransform(1, 0, 0, 1, 0, 0); mainCtx.globalAlpha = 1 / (i + 1); mainCtx.globalCompositeOperation = 'source-over';
        mainCtx.drawImage(sub, 0, 0);
      }
      mainCtx.globalAlpha = 1;
    }
  } else { g = mainCtx; drawFrame(t); }
  post(t, mainCtx);
}

/* ---------------- carga ---------------- */
const fontList = [['I1ZH', 'fonts/zh.woff2', '200 900'], ['I1ZHS', 'fonts/zh-sans.woff2', '100 900'], ['I1Disp', 'fonts/latin.woff2', '300 700'], ['I1Body', 'fonts/latin-body.woff2', '100 900']];
function loadFonts() {
  return Promise.allSettled(fontList.map(([f, u, w]) => new FontFace(f, `url(${u})`, { weight: w }).load().then(ff => { document.fonts.add(ff); return f; })));
}
const getJSON = u => fetch(u, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); });
window.FPS = 60; window.DURATION = 147.8571;
window.render = () => {};
window.ready = Promise.all([loadFonts(), getJSON('content.json'), getJSON('timeline.json'), getJSON('strokes.json').catch(() => ({}))])
  .then(([fr, ct, tl, stk]) => {
    window.FONTS = fr.map((r, i) => ({ font: fontList[i][0], ok: r.status === 'fulfilled' }));
    CT = ct; TL = tl; STK = stk;
    prep(); mcache.clear(); pcache.clear(); wcache.clear(); LC.clear(); GEO.clear();
    buildStatic();
    window.FPS = FPS; window.DURATION = DUR;
    window.SCENES = SC.map(s => ({ id: s.id, start: s.start, end: s.end, tema: s.tema }));
    window.render = render;
    if (CAPTURE) { canvas.width = W; canvas.height = H; BASE = 1; }
    return true;
  });
window.__setBase = (b) => { BASE = b; };
window.__CAPTURE = CAPTURE;
})();
