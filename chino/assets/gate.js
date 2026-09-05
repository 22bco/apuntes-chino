/* gate.js — puerta simple con código de acceso para una página.
 *
 * Uso: en el <head>, antes del contenido:
 *   <script src="/assets/gate.js" data-hash="<sha256 del código>"></script>
 *
 * - Pide el código una vez y lo recuerda en localStorage (por navegador).
 * - En el repo solo vive el hash SHA-256 del código, nunca el código.
 *   Para cambiarlo: python3 -c "import hashlib;print(hashlib.sha256('nuevo'.encode()).hexdigest())"
 * - No es seguridad real (es un sitio estático): sirve para que solo quien tenga el código lo vea a simple vista.
 */
(function () {
  const me = document.currentScript;
  const HASH = (me && me.dataset.hash || '').toLowerCase();
  if (!HASH) return;
  const KEY = 'gate-ok';

  // ocultar el contenido hasta validar (sin destello)
  const root = document.documentElement;
  root.classList.add('gate-lock');
  const css = document.createElement('style');
  css.textContent = `
    html.gate-lock body > :not(.gate) { visibility: hidden; }
    .gate { position: fixed; inset: 0; z-index: 99999; display: flex; align-items: center; justify-content: center;
            background: linear-gradient(135deg, #1a1a2e 0%, #2b2b4a 100%); font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; }
    .gate .card { background: #fff; border-radius: 16px; padding: 28px 30px; width: min(360px, 90vw); box-shadow: 0 20px 60px rgba(0,0,0,.35); text-align: center; }
    .gate .lock { font-size: 2.2em; margin-bottom: 6px; }
    .gate h2 { all: unset; display: block; margin: 0 0 4px; font-size: 1.15em; font-weight: 700; color: #1a1a2e; text-align: center; }
    .gate p { margin: 0 0 16px; font-size: .88em; color: #777; }
    .gate input { width: 100%; box-sizing: border-box; font-size: 1.1em; padding: 10px 12px; border: 2px solid #ddd; border-radius: 10px; text-align: center; letter-spacing: 2px; outline: none; }
    .gate input:focus { border-color: #c0392b; }
    .gate button { margin-top: 12px; width: 100%; padding: 10px; border: 0; border-radius: 10px; background: #c0392b; color: #fff; font-size: 1em; font-weight: 600; cursor: pointer; }
    .gate button:hover { background: #a93226; }
    .gate .err { min-height: 1.2em; margin-top: 8px; font-size: .85em; color: #c0392b; }
    .gate .zh { font-family: 'Noto Sans SC', sans-serif; color: #c0392b; }
  `;
  document.head.appendChild(css);

  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function unlock() { root.classList.remove('gate-lock'); const g = document.querySelector('.gate'); if (g) g.remove(); }

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved === HASH) { unlock(); return; }

  document.addEventListener('DOMContentLoaded', () => {
    const g = document.createElement('div');
    g.className = 'gate';
    g.innerHTML = `
      <form class="card">
        <div class="lock">🔒</div>
        <h2>Apuntes de chino <span class="zh">中文笔记</span></h2>
        <p>Escribe el código para entrar</p>
        <input type="password" autocomplete="off" autocapitalize="none" placeholder="código" aria-label="código de acceso">
        <button type="submit">Entrar →</button>
        <div class="err"></div>
      </form>`;
    document.body.appendChild(g);
    const input = g.querySelector('input'), err = g.querySelector('.err');
    input.focus();
    g.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const h = await sha256(input.value.trim().toLowerCase());
      if (h === HASH) {
        try { localStorage.setItem(KEY, HASH); } catch (e2) {}
        unlock();
      } else {
        err.textContent = 'Código incorrecto. 加油！';
        input.select();
      }
    });
  });
})();
