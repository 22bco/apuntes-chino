/* ═══════════════════════════════════════════════════════════
   HSK 1 — JS compartido de las páginas temáticas.
   Cada página define su propio `audioMap` ANTES de incluir este
   script:  <script>const audioMap = {...};</script>
            <script src="hsk1.js"></script>
   ═══════════════════════════════════════════════════════════ */
const AUDIO_BASE = '/audio/';

function speak(text) {
  const file = (typeof audioMap !== 'undefined') ? audioMap[text] : null;
  if (file) { new Audio(AUDIO_BASE + file).play(); return; }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN'; u.rate = 0.8;
  speechSynthesis.speak(u);
}

/* Botones 🔊 en cada celda/burbuja con hanzi */
document.querySelectorAll('td.hz, .dialog .hz').forEach(el => {
  const text = el.textContent.trim();
  if (!text) return;
  const btn = document.createElement('button');
  btn.textContent = '🔊';
  btn.style.cssText = 'background:none;border:none;cursor:pointer;margin-left:6px;font-size:0.9em;opacity:0.5;';
  btn.onmouseover = () => btn.style.opacity = '1';
  btn.onmouseout = () => btn.style.opacity = '0.5';
  btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); speak(text); };
  el.appendChild(btn);
});

/* Toggle de pinyin (botón flotante) */
(function () {
  const btn = document.createElement('button');
  btn.className = 'pinyin-toggle';
  btn.textContent = '🙈 Ocultar pinyin';
  btn.onclick = () => {
    document.body.classList.toggle('hide-pinyin');
    btn.textContent = document.body.classList.contains('hide-pinyin') ? '👁 Mostrar pinyin' : '🙈 Ocultar pinyin';
  };
  document.body.appendChild(btn);
})();
