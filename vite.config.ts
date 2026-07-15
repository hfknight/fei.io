import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  server: {
    // PORT lets a launcher (e.g. the Claude preview) assign a free port when 9921 is taken.
    port: Number(process.env.PORT) || 9921,
    host: true,
    hmr: {
      overlay: true
    }
  },
})
// export default defineConfig({
//   plugins: [
//     react({
//       jsxImportSource: '@emotion/react',
//       babel: {
//         plugins: ['@emotion/babel-plugin'],
//       },
//     }),
//   ],
// })