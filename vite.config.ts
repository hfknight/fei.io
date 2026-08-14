import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import babel from '@rolldown/plugin-babel';

// https://vite.dev/config/
export default defineConfig(async ({ command }) => ({
  plugins: [
    react(),
    /* Readable class names in the inspector. babel-plugin-styled-components names every styled
       component after the variable and the file it was declared in, so the DOM reads
       `About__ProjectsSection-sc-a1b2c3-0` instead of `sc-hiCkJs`.

       Routed through @rolldown/plugin-babel because @vitejs/plugin-react dropped Babel in v6 —
       it transforms with Oxc now and its options no longer carry a `babel` key. This is the
       escape hatch the plugin's own README documents (it is how React Compiler is wired in),
       not a workaround.

       Dev only, for two reasons: the long names would ship in both the JS and the emitted CSS
       for no benefit to a reader of the site, and this is a whole extra Babel parse/print pass
       over every module that production has no use for. Nothing selects on a generated class —
       styled's own `${Component}` interpolation resolves through componentId, not the class
       name — so the two builds are free to differ. */
    ...(command === 'serve'
      ? [
          await babel({
            plugins: [['babel-plugin-styled-components', { displayName: true, fileName: true }]],
          }),
        ]
      : []),
    svgr(),
  ],
  server: {
    // PORT lets a launcher (e.g. the Claude preview) assign a free port when 9921 is taken.
    port: Number(process.env.PORT) || 9921,
    host: true,
    hmr: {
      overlay: true
    }
  },
}))
