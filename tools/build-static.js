// Builds dist/index.html: the whole app (code, data, styles and engine worker)
// in one file that runs from disk (double-click) or any static host.
import fs from 'node:fs';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8');

const worker = await build({
  entryPoints: [fileURLToPath(new URL('js/engine/worker.js', root))],
  bundle: true, format: 'iife', minify: true, write: false, target: 'es2020',
});
const app = await build({
  entryPoints: [fileURLToPath(new URL('js/main.js', root))],
  bundle: true, format: 'iife', minify: true, write: false, target: 'es2020',
  // import.meta.url only feeds the dev-mode worker branch, which the build never runs.
  define: { __WORKER_SOURCE__: JSON.stringify(worker.outputFiles[0].text), 'import.meta.url': '""' },
  logLevel: 'warning',
});

// Keep a literal "</script" inside the code from closing the inline <script> tag.
const js = app.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = read('css/style.css');
let html = read('index.html')
  .replace('<link rel="stylesheet" href="css/style.css">', () => `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="js/main.js"></script>', () => `<script>\n${js}\n</script>`);
if (html.includes('js/main.js') || html.includes('css/style.css')) throw new Error('index.html markers not found');

fs.mkdirSync(new URL('dist/', root), { recursive: true });
fs.writeFileSync(new URL('dist/index.html', root), html);
console.log(`dist/index.html written (${(html.length / 1024).toFixed(0)} KB)`);
