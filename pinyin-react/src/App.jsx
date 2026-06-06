import { useState, useRef } from 'react';
import { Excalidraw, convertToExcalidrawElements } from '@excalidraw/excalidraw';
// En @excalidraw/excalidraw 0.17.x el CSS se inyecta solo desde el bundle (no hay .css aparte).
import { pinyin } from 'pinyin-pro';

const HAN = /[㐀-鿿豈-﫿]/;

export default function App() {
  const [api, setApi] = useState(null);
  const [pinyinMode, setPinyinMode] = useState(false); // ← interruptor del "modo pinyin"
  const [text, setText] = useState('你好');
  const [tone, setTone] = useState('symbol'); // symbol | num | none
  const [hzSize, setHzSize] = useState(48);

  // IDs de textos a los que ya les pusimos pinyin (para no duplicar)
  const processedRef = useRef(new Set());

  const pyOf = (line) =>
    pinyin(line, { toneType: tone === 'num' ? 'num' : 'symbol' });

  // ───────── inserción manual (panel del modo) ─────────
  function buildSkeleton(originX, originY) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const skeleton = [];
    const pySize = Math.round(hzSize * 0.42);
    let y = originY;
    for (const line of lines) {
      const hasHan = HAN.test(line);
      const mainSize = hasHan ? hzSize : Math.round(hzSize * 0.5);
      skeleton.push({
        type: 'text', x: originX, y, text: line,
        fontSize: mainSize, fontFamily: 2, strokeColor: '#1a1a2e',
      });
      y += mainSize * 1.25 + 4;
      if (hasHan && tone !== 'none') {
        skeleton.push({
          type: 'text', x: originX, y, text: pyOf(line),
          fontSize: pySize, fontFamily: 2, strokeColor: '#c0392b',
        });
        y += pySize * 1.3 + 16;
      } else {
        y += 16;
      }
    }
    return skeleton;
  }

  function insertCard() {
    if (!api || !text.trim()) return;
    const st = api.getAppState();
    const originX = st.width / 2 / st.zoom.value - st.scrollX - 80;
    const originY = st.height / 2 / st.zoom.value - st.scrollY - 60;
    const skeleton = buildSkeleton(originX, originY);
    if (!skeleton.length) return;
    const newEls = convertToExcalidrawElements(skeleton);
    // marcamos estos hanzi como ya procesados para que el auto-pinyin no los duplique
    newEls.forEach((e) => processedRef.current.add(e.id));
    const existing = api.getSceneElements();
    api.updateScene({ elements: [...existing, ...newEls] });
    api.scrollToContent(newEls, { fitToContent: true, animate: true });
  }

  // ───────── auto-pinyin al escribir con doble clic (solo si modo activo) ─────────
  function addPinyinForMany(els) {
    if (!api) return;
    const skeletons = els.map((el) => {
      const lines = (el.text || '').split('\n');
      const pyText = lines.map((l) => (HAN.test(l) ? pyOf(l) : l)).join('\n');
      const pySize = Math.max(12, Math.round((el.fontSize || 20) * 0.42));
      return {
        type: 'text',
        x: el.x,
        y: el.y + (el.height || el.fontSize * 1.25) + 4,
        text: pyText,
        fontSize: pySize,
        fontFamily: el.fontFamily || 2,
        strokeColor: '#c0392b',
      };
    });
    const newEls = convertToExcalidrawElements(skeletons);
    const current = api.getSceneElements();
    api.updateScene({ elements: [...current, ...newEls] });
  }

  function handleChange(elements, appState) {
    // solo actúa si el MODO PINYIN está activado
    if (!api || !pinyinMode || tone === 'none') return;
    const editingId = appState.editingElement?.id;
    const pending = elements.filter(
      (e) =>
        !e.isDeleted &&
        e.type === 'text' &&
        HAN.test(e.text || '') &&
        e.id !== editingId && // no mientras se está escribiendo
        !processedRef.current.has(e.id)
    );
    if (!pending.length) return;
    pending.forEach((e) => processedRef.current.add(e.id));
    setTimeout(() => addPinyinForMany(pending), 0); // fuera del propio onChange
  }

  const seg = (value, label) => (
    <button
      onClick={() => setTone(value)}
      style={{
        flex: 1, padding: '6px 4px', border: 'none', borderRadius: 6,
        cursor: 'pointer', fontSize: 12,
        background: tone === value ? '#1a1a2e' : 'transparent',
        color: tone === value ? '#fff' : '#555',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
      <Excalidraw
        excalidrawAPI={(a) => setApi(a)}
        langCode="es-ES"
        initialData={{ appState: { viewBackgroundColor: '#ffffff' } }}
        onChange={handleChange}
        renderTopRightUI={() => (
          <button
            onClick={() => setPinyinMode((o) => !o)}
            title="Modo pinyin: al escribir con doble clic, agrega el pinyin solo"
            style={{
              height: 36, padding: '0 12px', borderRadius: 10,
              border: pinyinMode ? '1px solid #1a1a2e' : '1px solid var(--button-gray-2, #e0e0e0)',
              background: pinyinMode ? '#1a1a2e' : '#fff',
              color: pinyinMode ? '#fff' : '#1a1a2e',
              cursor: 'pointer', fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
            }}
          >
            拼 Modo pinyin
            <span
              style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                background: pinyinMode ? '#27ae60' : '#e0e0e0',
                color: pinyinMode ? '#fff' : '#888',
              }}
            >
              {pinyinMode ? 'ON' : 'OFF'}
            </span>
          </button>
        )}
      />

      {/* aviso de uso */}
      <div
        style={{
          position: 'fixed', bottom: 12, left: '50%', transform: 'translateX(-50%)',
          fontSize: 12, color: pinyinMode ? '#1a7a40' : '#aaa',
          background: 'rgba(255,255,255,.8)',
          padding: '4px 14px', borderRadius: 20, pointerEvents: 'none',
        }}
      >
        {pinyinMode
          ? '✍️ Modo pinyin ON · doble clic en el lienzo, escribe chino y el pinyin aparece solo'
          : 'Activa “拼 Modo pinyin” (arriba a la derecha) para que el pinyin se agregue solo'}
      </div>

      {/* panel de opciones — visible cuando el modo está activo */}
      {pinyinMode && (
        <div
          style={{
            position: 'fixed', top: 62, right: 14, width: 286,
            background: '#fff', border: '1px solid #e6e6e2', borderRadius: 12,
            boxShadow: '0 8px 30px rgba(0,0,0,.16)', padding: 14, zIndex: 50,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 13, color: '#c0392b' }}>拼 Modo pinyin</strong>
            <button
              onClick={() => setPinyinMode(false)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#999' }}
              aria-label="Desactivar modo pinyin"
            >
              ✕
            </button>
          </div>

          <div style={{ fontSize: 11, color: '#888', lineHeight: 1.5, background: '#f3faf5', padding: '8px 10px', borderRadius: 8 }}>
            Haz <strong>doble clic</strong> en el lienzo, escribe chino y al terminar el pinyin aparece debajo.
            O escribe abajo e inserta al centro 👇
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                insertCard();
              }
            }}
            rows={2}
            placeholder="你好&#10;现在几点？"
            style={{
              width: '100%', padding: 10, border: '1px solid #ddd',
              borderRadius: 8, fontSize: 18, fontFamily: 'inherit', resize: 'vertical',
            }}
          />

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#999', minWidth: 38 }}>Tono</span>
            <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: 7, padding: 3, flex: 1 }}>
              {seg('symbol', 'nǐ')}
              {seg('num', 'ni3')}
              {seg('none', 'sin')}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#999', minWidth: 38 }}>Tamaño</span>
            <input
              type="range" min="28" max="96" value={hzSize}
              onChange={(e) => setHzSize(+e.target.value)} style={{ flex: 1 }}
            />
            <span style={{ fontSize: 11, color: '#999', minWidth: 32, textAlign: 'right' }}>{hzSize}px</span>
          </div>

          <button
            onClick={insertCard}
            style={{
              padding: '10px', border: 'none', borderRadius: 9,
              background: '#1a1a2e', color: '#fff', fontSize: 14, cursor: 'pointer',
            }}
          >
            ➕ Insertar al centro
          </button>
          <span style={{ fontSize: 10, color: '#bbb', textAlign: 'center' }}>
            Atajo: Ctrl/⌘ + Enter
          </span>
        </div>
      )}
    </div>
  );
}
