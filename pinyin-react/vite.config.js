import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa para que el build sirva desde cualquier subruta (ej. /pinyin-react/)
export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    // Excalidraw chequea esta variable en runtime; con Vite hay que definirla.
    'process.env.IS_PREACT': JSON.stringify('false'),
  },
});
