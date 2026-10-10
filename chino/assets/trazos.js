/* trazos.js — diapositivas de escritura de caracteres (HanziWriter).
   Uso:
     <link rel="stylesheet" href="/assets/trazos.css">
     <div id="deck" class="deck"></div>
     <script src="https://cdn.jsdelivr.net/npm/hanzi-writer@3.5.0/dist/hanzi-writer.min.js"></script>
     <script src="/assets/trazos.js"></script>
     <script>TrazosDeck(document.getElementById('deck'), { slides, cats, chars, key });</script>

   slides: [{ cat, w, py, es, how?, ex?: [hanzi, español], href?, sec? }]
   cats:   [[cat, etiqueta]]  (botones para saltar al primer slide de cada grupo)
   chars:  { 字: [pinyin, cómo se arma] }  (opcional; si falta, se usa /radicales.json)
   key:    prefijo para localStorage (apuntes y última diapositiva). */
(function () {
  'use strict';
  const RAD_URL = '/radicales.json';
  let radData = null;
  const radReady = fetch(RAD_URL).then(r => r.json()).then(d => { radData = d; }).catch(() => {});

  function radInfo(hz) {
    if (!radData) return '';
    const rads = (radData.charRads || {})[hz] || [];
    const byHz = {};
    (radData.radicales || []).forEach(r => { byHz[r.hz] = r; });
    return rads.map(h => {
      const r = byHz[h]; if (!r) return h;
      return (r.variant || r.hz) + ' ' + r.es;
    }).join(' · ');
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

  window.TrazosDeck = function (deck, opts) {
    if (!deck || !window.HanziWriter) return;
    const S = opts.slides || [], CATS = opts.cats || [], C = opts.chars || {}, KEY = opts.key || 'dk';
    const store = {
      get(k) { try { return localStorage.getItem(KEY + '-' + k) || ''; } catch (e) { return ''; } },
      set(k, v) { try { localStorage.setItem(KEY + '-' + k, v); } catch (e) {} }
    };
    deck.classList.add('deck');
    deck.tabIndex = 0;
    deck.innerHTML = `<div class="deck-find"><span class="deck-find-ico">🔍</span>
        <input type="search" class="deck-search" placeholder="Buscar por hanzi, pinyin o español: 馆 · fangjian · biblioteca" autocomplete="off">
        <div class="deck-results" hidden></div></div>
      <div class="deck-bar"><div class="deck-chips"></div>
        <div class="deck-tools">
        <button type="button" class="deck-btn" data-a="print" title="Imprimir hoja de práctica de esta diapositiva">🖨️</button>
        <button type="button" class="deck-btn" data-a="fs" title="Pantalla completa">⛶</button></div></div>
      <div class="deck-slide"></div>
      <div class="deck-nav"><button type="button" class="deck-btn" data-a="prev">◀ Anterior</button>
        <span class="deck-count"></span><button type="button" class="deck-btn" data-a="next">Siguiente ▶</button></div>`;
    const q = sel => deck.querySelector(sel);
    const slideEl = q('.deck-slide'), chips = q('.deck-chips');
    let idx = 0;

    CATS.forEach(([c, label]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'deck-chip'; b.dataset.cat = c; b.textContent = label;
      b.onclick = () => go(S.findIndex(s => s.cat === c));
      chips.appendChild(b);
    });

    function strip(hz, card) {
      const box = card.querySelector('.dk-strip');
      HanziWriter.loadCharacterData(hz).then(data => {
        const n = data.strokes.length, rad = new Set(data.radStrokes || []);
        card.querySelector('.dk-n').textContent = n + ' trazos';
        const t = HanziWriter.getScalingTransform(44, 44, 3).transform;
        for (let i = 0; i < n; i++) {
          let paths = '';
          for (let j = 0; j <= i; j++) {
            const col = j === i ? '#c0392b' : rad.has(j) ? '#7fa7d6' : '#bbb';
            paths += `<path d="${data.strokes[j]}" fill="${col}"/>`;
          }
          const d = document.createElement('div');
          d.className = 'dk-step';
          d.innerHTML = `<span>${i + 1}</span><svg width="44" height="44"><g transform="${t}">${paths}</g></svg>`;
          box.appendChild(d);
        }
        // hoja de práctica (solo al imprimir): el carácter tenue para calcar + cuadros vacíos
        const pt = HanziWriter.getScalingTransform(64, 64, 4).transform;
        const all = data.strokes.map(s => `<path d="${s}"/>`).join('');
        let paper = '';
        for (let k = 0; k < 9; k++) {
          const g = k < 3 ? `<svg width="64" height="64"><g transform="${pt}" fill="${k === 0 ? '#999' : '#e3e3e3'}">${all}</g></svg>` : '';
          paper += `<div class="dk-grid">${g}</div>`;
        }
        card.querySelector('.dk-paper').innerHTML = paper;
      }).catch(() => { card.querySelector('.dk-n').textContent = 'sin datos de trazos'; });
    }

    function card(hz, parent) {
      const [py, how] = C[hz] || ['', ''];
      const el = document.createElement('div');
      el.className = 'dk-card';
      el.innerHTML = `<div class="dk-card-top"><div class="dk-sw" title="Toca para animar"></div>
        <div class="dk-info"><div class="dk-big">${hz} <span class="dk-cpy">${esc(py)}</span></div>
        <span class="dk-how-c">${esc(how)}</span><br><span class="dk-n" style="color:#888"></span>
        <div class="dk-acts"><button type="button" data-a="anim">▶ Ver</button><button type="button" data-a="quiz">✍️ Practicar</button>
        <a href="https://www.dong-chinese.com/wiki/${hz}" target="_blank" rel="noopener">dong-chinese ↗</a></div></div></div>
        <div class="dk-strip" title="Orden de trazos: rojo = trazo nuevo · azul = radical"></div>
        <div class="dk-paper"></div>`;
      parent.appendChild(el);
      if (!how) radReady.then(() => { const r = radInfo(hz); if (r) el.querySelector('.dk-how-c').textContent = 'Radical: ' + r; });
      const sw = el.querySelector('.dk-sw');
      const size = sw.offsetWidth || 150;
      const w = HanziWriter.create(sw, hz, { width: size, height: size, padding: 8,
        showOutline: true, strokeAnimationSpeed: 1, delayBetweenStrokes: 220, strokeColor: '#c0392b',
        outlineColor: '#eee', drawingColor: '#333', highlightColor: '#f5b7b1', showHintAfterMisses: 2 });
      const quizBtn = el.querySelector('[data-a="quiz"]');
      const anim = () => { quizBtn.classList.remove('on'); w.cancelQuiz(); w.showCharacter(); w.animateCharacter(); };
      sw.onclick = () => { if (!quizBtn.classList.contains('on')) anim(); };
      el.querySelector('[data-a="anim"]').onclick = anim;
      quizBtn.onclick = () => {
        quizBtn.classList.add('on'); w.hideCharacter();
        w.quiz({ onComplete: () => quizBtn.classList.remove('on') });
      };
      strip(hz, el);
    }

    function render() {
      const s = S[idx];
      const tag = s.tag || s.cat;
      slideEl.innerHTML = `<div class="dk-head">
          <span class="dk-tag">${esc(tag)}</span>
          <div class="dk-word">${s.w}<button type="button" aria-label="Escuchar ${s.w}">🔊</button></div>
          <div class="dk-py">${esc(s.py || '')}</div><div class="dk-es">${esc(s.es || '')}</div>
          ${s.how ? `<div class="dk-how">🧩 ${esc(s.how)}</div>` : ''}
          ${s.ex ? `<div class="dk-ex">💬 ${s.ex[0]} <span class="dk-cpy" style="color:#888">— ${esc(s.ex[1])}</span></div>` : ''}
          ${s.href ? `<div class="dk-src"><a href="${s.href}">${esc(s.sec || 'Ver en la clase')} →</a></div>` : ''}
        </div><div class="dk-chars"></div>
        <textarea class="dk-notes" placeholder="📝 Mis apuntes sobre ${s.w}…"></textarea>`;
      slideEl.querySelector('.dk-word button').onclick = () => window.speak && window.speak(s.w);
      const chars = slideEl.querySelector('.dk-chars');
      [...s.w].filter(ch => /[㐀-鿿]/.test(ch)).forEach(hz => card(hz, chars));
      const ta = slideEl.querySelector('.dk-notes');
      ta.value = store.get('notes-' + s.w);
      ta.oninput = () => store.set('notes-' + s.w, ta.value);
      q('.deck-count').textContent = (idx + 1) + ' / ' + S.length;
      q('[data-a="prev"]').disabled = idx === 0;
      q('[data-a="next"]').disabled = idx === S.length - 1;
      chips.querySelectorAll('.deck-chip').forEach(b => b.classList.toggle('on', b.dataset.cat === s.cat));
      store.set('idx', idx);
    }
    function go(i) { if (i < 0 || i >= S.length) return; idx = i; render(); }

    // búsqueda en vivo: hanzi (palabra o carácter), pinyin sin tonos/espacios, o español
    const norm = t => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s']+/g, '').toLowerCase();
    const searchEl = q('.deck-search'), resEl = q('.deck-results');
    let hits = [], sel = 0;
    function search(v) {
      const vn = norm(v);
      if (!vn) return [];
      const score = s => {
        if (s.w === v) return 0;
        if (norm(s.py) === vn) return 1;
        if (s.w.includes(v)) return 2;
        if (norm(s.py).startsWith(vn)) return 3;
        if (norm(s.py).includes(vn)) return 4;
        if (norm(s.es).includes(vn)) return 5;
        return -1;
      };
      return S.map((s, i) => [score(s), i]).filter(x => x[0] >= 0).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[1]);
    }
    function showResults() {
      hits = search(searchEl.value.trim()); sel = 0;
      if (!searchEl.value.trim()) { resEl.hidden = true; return; }
      resEl.hidden = false;
      resEl.innerHTML = hits.length
        ? hits.slice(0, 40).map((i, k) => `<button type="button" data-i="${i}" class="${k === 0 ? 'sel' : ''}">
            <span class="r-w">${S[i].w}</span> <span class="r-py dk-cpy">${esc(S[i].py || '')}</span>
            <span class="r-es">${esc(S[i].es || '')}</span><span class="r-cat">${esc(S[i].cat)}</span></button>`).join('')
          + (hits.length > 40 ? `<div class="r-more">… y ${hits.length - 40} más</div>` : '')
        : '<div class="r-more">Sin resultados</div>';
    }
    function pick(i) { go(i); resEl.hidden = true; searchEl.blur(); slideEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    searchEl.addEventListener('input', showResults);
    searchEl.addEventListener('focus', () => { if (searchEl.value.trim()) showResults(); });
    resEl.addEventListener('mousedown', e => { const b = e.target.closest('button'); if (b) { e.preventDefault(); pick(+b.dataset.i); } });
    searchEl.addEventListener('keydown', e => {
      const btns = resEl.querySelectorAll('button');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); if (!btns.length) return;
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length;
        btns.forEach((b, k) => b.classList.toggle('sel', k === sel)); btns[sel].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault(); if (btns[sel]) pick(+btns[sel].dataset.i);
      } else if (e.key === 'Escape') { resEl.hidden = true; }
    });
    searchEl.addEventListener('blur', () => setTimeout(() => { resEl.hidden = true; }, 150));

    q('[data-a="prev"]').onclick = () => go(idx - 1);
    q('[data-a="next"]').onclick = () => go(idx + 1);
    q('[data-a="fs"]').onclick = () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (deck.requestFullscreen) deck.requestFullscreen();
    };
    q('[data-a="print"]').onclick = () => {
      document.body.classList.add('dk-printing');
      deck.classList.add('dk-print-me');
      // afterprint, no setTimeout: en iOS/Android window.print() no bloquea
      addEventListener('afterprint', () => { document.body.classList.remove('dk-printing'); deck.classList.remove('dk-print-me'); }, { once: true });
      window.print();
    };
    deck.addEventListener('keydown', e => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
    });

    const saved = parseInt(store.get('idx'), 10);
    go(saved >= 0 && saved < S.length ? saved : 0);
    return { go, find: f => S.findIndex(f) };
  };
})();
