/**
 * The export arm of `tests/the-ticked-input-runs-it-again.test.ts` (P18-S119-TICKEDRUN, P18-S121-DIDMOUNT): an emitted
 * app's Home page, bundled as the app's own bundler would (esbuild, development mode, so React's StrictMode mounts twice)
 * and rendered by real React into a jsdom document, in a child process. The page is what is graded: its effects, its
 * refs, its handlers, the emitted `src/lib/functionRun.ts` and stores, all running, none stood in for.
 *
 * stdin: `[{ dir, scenarios }]`: per app, the emitted app's root on disk, and lists of button labels to press, one press
 * per step. stdout: per app, per scenario, one reading after load and one after each press: every `<p>`'s text, in
 * document order (an exported Text is a `<p>`).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..', '..');
const esbuild = require(require.resolve('esbuild', { paths: [ROOT] }));
const { JSDOM } = require(require.resolve('jsdom', { paths: [ROOT] }));
console.log = (...args) => process.stderr.write(args.map(String).join(' ') + '\n');

const HARNESS = `
import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { HomePage } from './src/pages/Home';
const w = window as any;
w.__mount = () => {
  const root = createRoot(document.getElementById('root')!);
  act(() => root.render(<StrictMode><HomePage /></StrictMode>));
};
w.__press = (label: string) => {
  const button = [...document.querySelectorAll('button')].find((b) => (b.textContent ?? '').trim() === label);
  if (!button) throw new Error('no button "' + label + '"');
  act(() => button.click());
};
w.__read = () => [...document.querySelectorAll('p')].map((p) => (p.textContent ?? '').trim());
`;

function bundle(dir) {
  const entry = path.join(dir, '__harness.tsx');
  fs.writeFileSync(entry, HARNESS);
  const out = esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    write: false,
    outdir: fs.mkdtempSync(path.join(os.tmpdir(), 'ticked-arm-')),
    format: 'iife',
    platform: 'browser',
    jsx: 'automatic',
    loader: { '.module.css': 'local-css', '.css': 'css' },
    define: { 'process.env.NODE_ENV': '"development"' },
    nodePaths: [path.join(ROOT, 'node_modules')],
    logLevel: 'silent'
  });
  return out.outputFiles.find((f) => f.path.endsWith('.js')).text;
}

function run({ dir, scenarios }) {
  const code = bundle(dir);
  return scenarios.map((presses) => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window;
    w.IS_REACT_ACT_ENVIRONMENT = true;
    const errors = [];
    w.console.error = (...args) => errors.push(args.map(String).join(' '));
    w.eval(code);
    w.__mount();
    const readings = [w.__read()];
    for (const label of presses) {
      w.__press(label);
      readings.push(w.__read());
    }
    if (errors.length > 0) throw new Error(`the page logged errors: ${errors.join(' | ').slice(0, 600)}`);
    w.close();
    return readings;
  });
}

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  try {
    process.stdout.write(JSON.stringify(JSON.parse(input).map(run)));
  } catch (e) {
    process.stderr.write(String(e && e.stack ? e.stack : e));
    process.exit(1);
  }
});
