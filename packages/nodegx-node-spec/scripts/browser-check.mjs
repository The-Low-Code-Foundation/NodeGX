/**
 * OWN-002 AC1: a page imports the browser entry, mounts Counter, signals Increase, settles — and
 * hashes "abc" through the Hash node — in headless Chrome, with no aliases, defines or stubs.
 * The page writes its verdict into <title>; Chrome's --dump-dom hands it back.
 *
 * Needs Chrome: /Applications/Google Chrome.app on a Mac, or `CHROME=<path>`. Exits 2 without it,
 * 1 on a FAIL, 0 on PASS, and prints the verdict either way.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import esbuild from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!existsSync(chrome)) {
  console.log(`browser-check: no Chrome at ${chrome} (set CHROME=<path>)`);
  process.exit(2);
}
const dir = mkdtempSync(join(tmpdir(), 'node-spec-browser-'));
await esbuild.build({
  entryPoints: ['src/browser.ts'],
  absWorkingDir: `${here}/..`,
  bundle: true,
  platform: 'browser',
  format: 'iife',
  globalName: 'NGX',
  target: 'es2020',
  outfile: join(dir, 'ngx.js'),
  logLevel: 'warning'
});
writeFileSync(
  join(dir, 'page.html'),
  `<!doctype html><meta charset="utf-8"><title>pending</title><script src="ngx.js"></script><script>
try {
  const counter = NGX.mount(NGX.specFor('Counter'), { startValue: 0 });
  NGX.settle(counter);
  NGX.signal(counter, 'increase');
  NGX.settle(counter);
  const count = counter.trace.filter((e) => e.t === 'value' && e.port === 'currentCount').pop();
  const hash = NGX.mount(NGX.specFor('net.noodl.Hash'), {});
  NGX.set(hash, 'value', 'abc');
  NGX.signal(hash, 'hash');
  NGX.settle(hash);
  const digest = hash.trace.filter((e) => e.t === 'value' && e.port === 'digest').pop();
  const ok = count && count.value === 1 && digest && digest.value === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  document.title = (ok ? 'PASS' : 'FAIL') + ' specs=' + Object.keys(NGX.specs).length + ' currentCount=' + (count && count.value) + ' digest=' + (digest && digest.value);
} catch (e) { document.title = 'FAIL ' + (e && e.stack || e); }
</script>`
);
const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=5000', '--dump-dom', `file://${join(dir, 'page.html')}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const title = (dom.match(/<title>([^<]*)<\/title>/) || [])[1] || 'FAIL no title';
console.log(`browser-check: ${title}`);
process.exit(title.startsWith('PASS') ? 0 : 1);
