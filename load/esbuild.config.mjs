import { build } from 'esbuild';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Bundles each TypeScript scenario in load/scenarios/ into a single
 * k6-compatible JS file in load/dist/. k6 runtime modules (k6, k6/http, ...)
 * and remote jslib imports are marked external so k6 resolves them itself.
 *
 * Run:  npm run k6:build
 */
const here = dirname(fileURLToPath(import.meta.url));
const scenariosDir = join(here, 'scenarios');
const outDir = join(here, 'dist');

const entryPoints = readdirSync(scenariosDir)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => join(scenariosDir, f));

await build({
  entryPoints,
  outdir: outDir,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2017',
  external: ['k6', 'k6/*', 'https://*'],
  logLevel: 'info',
});

// eslint-disable-next-line no-console
console.log(`Bundled ${entryPoints.length} scenario(s) into load/dist/`);
