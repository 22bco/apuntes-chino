/* clase.js — lógica compartida de las clases (basico2/basico3).
   Extraído de basico3/clase05.html. Ver PLAN-MEJORAS.md Fase 1.1/1.2.

   Cada página define `window.audioMap = {texto: "archivo.mp3"}` en un <script>
   ANTES de cargar este archivo. Si no lo define, se hace fallback a
   /audio/mapping.json (mapa completo). Coloca este <script src> al final del body. */
(function () {
  'use strict';
  const AUDIO_BASE = '/audio/';
  let audioMap = window.audioMap || {};

  // Fallback Fase 1.2: si la página no trae audioMap inline, cargar el mapa completo.
  if (!window.audioMap) {
    fetch(AUDIO_BASE + 'mapping.json')
      .then(r => r.json())
      .then(m => { audioMap = m; })
      .catch(() => {});
  }

  window.speak = function (text) {
    const file = audioMap[text];
    if (file) { new Audio(AUDIO_BASE + file).play(); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN'; u.rate = 0.8;
    speechSynthesis.speak(u);
  };

  // Botón 🔊 en cada celda/fragmento chino (td.hz en tablas, .hz dentro de diálogos).
  document.querySelectorAll('td.hz, .dialog .hz').forEach(el => {
    const text = el.textContent.trim();
    if (!text) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '🔊';
    btn.setAttribute('aria-label', 'Escuchar ' + text);
    btn.style.cssText = 'background:none;border:none;cursor:pointer;margin-left:6px;font-size:0.9em;opacity:0.5;';
    btn.onmouseover = () => btn.style.opacity = '1';
    btn.onmouseout = () => btn.style.opacity = '0.5';
    btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); speak(text); };
    el.appendChild(btn);
  });
})();
