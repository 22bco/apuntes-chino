/* ============================================================
   buscador-core.js — motor de búsqueda compartido
   Lo usan /buscador.html (página completa) e /index.html (desplegable).
   Una sola fuente de verdad para fuentes, índice, ranking y sinónimos.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- helpers de texto ---------- */
  const stripDia = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const normalize = s => stripDia(s).replace(/[üǖǘǚǜ]/g, 'u').replace(/v/g, 'u');
  const normNoSpace = s => normalize(s).replace(/\s+/g, '');
  const hasHan = s => /[㐀-鿿]/.test(s);
  /* raíz solo-plural (segura): autos≈auto, perros≈perro */
  const stemPl = w => { w = normalize(w).trim(); return w.length > 4 ? w.replace(/(es|s)$/, '') : w; };
  /* raíz plural+género (para sinónimos): contenta/guapa → su grupo */
  const stemEs = w => { w = stemPl(w); return w.length > 4 ? w.replace(/[oa]$/, '') : w; };

  /* resaltado insensible a tildes/tonos */
  const HL = { a:'aáàâäāǎ', e:'eéèêëēě', i:'iíìîïīǐ', o:'oóòôöōǒ', u:'uúùûüūǔǖǘǚǜv', n:'nñ', c:'cç' };
  function buildRe(query) {
    const q = stripDia(String(query).trim());
    if (!q) return null;
    let pat = '';
    for (const ch of q) {
      if (ch === 'v') pat += '[' + HL.u + ']';
      else if (HL[ch]) pat += '[' + HL[ch] + ']';
      else if (hasHan(ch)) pat += ch;
      else pat += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    try { return new RegExp(pat, 'gi'); } catch (e) { return null; }
  }
  const highlight = (escaped, re) => re ? escaped.replace(re, m => '<mark>' + m + '</mark>') : escaped;

  /* URL a la clase de origen (Básico 2/3) */
  function srcToUrl(src) {
    if (!src) return null;
    const m = src.match(/Clase\s*(\d+)/i);
    if (!m) return null;
    const dir = /B3/i.test(src) ? 'basico3' : 'basico2';
    return `/${dir}/clase${m[1].padStart(2, '0')}.html`;
  }

  /* ---------- motor ---------- */
  function create() {
    let INDEX = [], audioMap = {}, CHAR_RADS = {}, RAD_BY_HZ = {}, SYN = new Map();

    /* construye el índice a partir de datos ya cargados */
    function build(data) {
      data = data || {};
      audioMap = data.map || {};
      const byHz = new Map();
      const addWord = (w, src) => {
        if (!w || !w.hz) return;
        let e = byHz.get(w.hz);
        if (!e) { e = { type:'word', hz:w.hz, py:w.py||'', es:w.es||'', clase:null, hsk:null, audio:null, esList:[] }; byHz.set(w.hz, e); }
        if (src.clase && !e.clase) e.clase = src.clase;
        if (src.hsk && !e.hsk) e.hsk = src.hsk;
        if (w.audio && !e.audio) e.audio = w.audio;
        if (!e.py && w.py) e.py = w.py;
        if (!e.es && w.es) e.es = w.es;
        if (w.es && !e.esList.includes(w.es)) e.esList.push(w.es);
      };
      (data.clase||[]).forEach(w => addWord(w, { clase: w.src }));
      (data.h1||[]).forEach(w => addWord(w, { hsk: 1 }));
      (data.h2||[]).forEach(w => addWord(w, { hsk: 2 }));
      (data.h3||[]).forEach(w => addWord(w, { hsk: 3 }));

      CHAR_RADS = {}; RAD_BY_HZ = {};
      if (data.rad) {
        CHAR_RADS = data.rad.charRads || {};
        (data.rad.radicales||[]).forEach(r => {
          RAD_BY_HZ[r.hz] = r;
          const e = byHz.get(r.hz);
          if (e) e.radInfo = r;                       // palabra que además es radical
          else byHz.set(r.hz, { type:'radical', hz:r.hz, py:r.py||'', es:r.es||'', esList:[r.es||''], radInfo:r });
        });
      }
      INDEX = [...byHz.values()];

      // precomputar glosas (texto normalizado, palabras enteras y raíces)
      INDEX.forEach(e => {
        const list = (e.esList && e.esList.length) ? e.esList : [e.es];
        e.esNorm = list.map(s => normalize(s || ''));
        e.esWords = new Set(); e.esStems = new Set();
        for (const ne of e.esNorm) for (const w of ne.split(/[^a-z0-9ñ]+/)) {
          if (!w) continue; e.esWords.add(w); e.esStems.add(stemEs(w));
        }
      });

      // tesauro: raíz → conjunto de raíces sinónimas
      SYN = new Map();
      (data.syn || []).forEach(group => {
        const stems = group.map(stemEs).filter(Boolean);
        stems.forEach(st => {
          let cur = SYN.get(st); if (!cur) { cur = new Set(); SYN.set(st, cur); }
          stems.forEach(x => { if (x !== st) cur.add(x); });
        });
      });
      return engine;
    }

    /* carga las fuentes por su cuenta (para páginas que no las tengan ya) */
    function load() {
      const J = (u, fb) => fetch(u).then(r => r.json()).catch(() => fb);
      return Promise.all([
        J('/vocab.json', []), J('/vocab_hsk1.json', []), J('/vocab_hsk2.json', []),
        J('/vocab_hsk3.json', []), J('/radicales.json', null), J('/audio/mapping.json', {}),
        J('/sinonimos.json', []),
      ]).then(([clase, h1, h2, h3, rad, map, syn]) => build({ clase, h1, h2, h3, rad, map, syn }));
    }

    /* ranking: hanzi exacto(0)>prefijo(1)>sub(2) > pinyin(3/4/5) >
       español palabra-exacta(6)>sinónimo(7)>prefijo/plural(8)>substring(9); -1 sin match */
    function score(e, raw) {
      let best = Infinity;
      if (raw && hasHan(raw)) {
        if (e.hz === raw) best = 0;
        else if (e.hz.startsWith(raw)) best = Math.min(best, 1);
        else if (e.hz.includes(raw)) best = Math.min(best, 2);
      }
      const qpy = normNoSpace(raw);
      if (qpy) {
        const py = normNoSpace(e.py);
        if (py === qpy) best = Math.min(best, 3);
        else if (py.startsWith(qpy)) best = Math.min(best, 4);
        else if (py.includes(qpy)) best = Math.min(best, 5);
      }
      const qes = normalize(raw).trim();
      if (qes && e.esWords) {
        const qpl = stemPl(qes), qst = stemEs(qes);
        let esb = Infinity;
        if (e.esWords.has(qes)) esb = 6;
        if (esb > 7) { const grp = SYN.get(qst); if (grp) { for (const s of grp) if (e.esStems.has(s)) { esb = 7; break; } } }
        if (esb > 8) { for (const w of e.esWords) { if (w.startsWith(qes) || stemPl(w) === qpl) { esb = 8; break; } } }
        if (esb === Infinity) { for (const ne of e.esNorm) if (ne.includes(qes)) { esb = 9; break; } }
        best = Math.min(best, esb);
      }
      e.__s = best;
      return best === Infinity ? -1 : best;
    }

    function commonness(e) {
      if (e.type === 'radical') return 10 + (e.radInfo && e.radInfo.level != null ? e.radInfo.level : 5);
      if (e.clase) return 0;
      return e.hsk || 4;
    }
    function passFilter(e, filter) {
      if (filter === 'clase') return e.type === 'word' && !!e.clase;
      if (filter === 'hsk')   return e.type === 'word' && !!e.hsk;
      if (filter === 'rad')   return e.type === 'radical' || !!e.radInfo;
      return true;
    }

    /* devuelve { total, results } — results limitado a opts.limit */
    function search(raw, opts) {
      opts = opts || {};
      const filter = opts.filter || 'all';
      const limit = opts.limit || Infinity;
      raw = String(raw == null ? '' : raw).trim();
      if (!raw) return { total: 0, results: [], query: '' };
      const scored = [];
      for (const e of INDEX) {
        if (!passFilter(e, filter)) continue;
        const s = score(e, raw);
        if (s >= 0) scored.push({ s, e });
      }
      scored.sort((a, b) =>
        a.s - b.s ||
        commonness(a.e) - commonness(b.e) ||
        ((a.e.type === 'radical') - (b.e.type === 'radical')) ||
        (a.e.py || '').length - (b.e.py || '').length ||
        a.e.hz.length - b.e.hz.length
      );
      return { total: scored.length, results: scored.slice(0, limit).map(x => x.e), query: raw };
    }

    function decompose(hz) {
      const seen = new Set(), out = [];
      for (const ch of hz) (CHAR_RADS[ch] || []).forEach(r => { if (!seen.has(r)) { seen.add(r); out.push(r); } });
      return out;
    }
    function counts() {
      return {
        all: INDEX.length,
        clase: INDEX.filter(e => e.type==='word' && e.clase).length,
        hsk: INDEX.filter(e => e.type==='word' && e.hsk).length,
        rad: INDEX.filter(e => e.type==='radical' || e.radInfo).length,
      };
    }

    var engine = {
      build, load, search, decompose, counts,
      radInfo: hz => RAD_BY_HZ[hz],
      audioFile: (hz, audio) => audio || audioMap[hz],
      get index() { return INDEX; },
      get audioMap() { return audioMap; },
    };
    return engine;
  }

  /* API global */
  window.ChinoSearch = { create, normalize, stripDia, hasHan, buildRe, highlight, srcToUrl };
})();
