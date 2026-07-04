/* clase-b1.js — lógica compartida de las clases de Básico 1 (cap*).
   Como clase.js pero con el selector .hz (incluye prosa, filtro <=30) y botón
   .audio-btn (estilado en clase-b1.css), fiel al original de basico1. Sin toggle.
   Cada página define window.audioMap antes de cargar este archivo (fallback a
   /audio/mapping.json). Ver PLAN-MEJORAS.md Fase 1.1/1.2. */
(function () {
  'use strict';
  const AUDIO_BASE = '/audio/';
  let audioMap = window.audioMap || {};

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

  document.querySelectorAll('.hz').forEach(el => {
    const text = el.textContent.trim();
    if (text.length > 0 && text.length <= 30) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'audio-btn';
      btn.textContent = '🔊';
      btn.title = 'Escuchar';
      btn.setAttribute('aria-label', 'Escuchar ' + text);
      btn.onclick = (e) => { e.stopPropagation(); speak(text); };
      el.after(btn);
    }
  });
})();
