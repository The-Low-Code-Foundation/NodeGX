/**
 * The export arm of `tests/the-failure-runs-its-chain.test.ts` (EXP-011 §90): `export-react-arm.js` with requests that
 * answer when the test says. The emitted app's Home page is bundled as the app's own bundler would (esbuild, development
 * mode, so React's StrictMode mounts twice) and rendered by real React into a jsdom document, in a child process.
 *
 * Every exported function of the app's `src/api/*.ts` is replaced, in the bundle only, by one that hands back a promise
 * the test settles: a step `answer:ok` resolves the oldest call still out, `answer:fail:<message>` rejects it with that
 * message (nothing, where none is out), inside an async `act` so its chains and renders land before the reading. A call
 * that throws before its first await (the `Missing Record Id` guard) never reaches the stub.
 *
 * stdin: `[{ dir, scenarios }]`: per app, the emitted app's root on disk, and lists of steps: a button's label to press, or
 * `answer:…`. stdout: per app, per scenario, one reading after load and one after each step: every `<p>`'s text, in
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
w.__out = [];
w.__call = () => new Promise((resolve, reject) => w.__out.push({ resolve, reject }));
w.__mount = () => {
  const root = createRoot(document.getElementById('root')!);
  act(() => root.render(<StrictMode><HomePage /></StrictMode>));
};
w.__press = (label: string) => {
  const button = [...document.querySelectorAll('button')].find((b) => (b.textContent ?? '').trim() === label);
  if (!button) throw new Error('no button "' + label + '"');
  act(() => button.click());
};
w.__answer = async (how: string) => {
  const call = w.__out.shift();
  await act(async () => {
    if (call === undefined) return;
    if (how === 'ok') call.resolve(undefined);
    else call.reject(new Error(how.slice('fail:'.length)));
  });
};
w.__read = () => [...document.querySelectorAll('p')].map((p) => (p.textContent ?? '').trim());
`;

/** Each `export async function name(…) {` in an api module answers through the harness instead. */
const API_STUB = {
  name: 'answerable-api',
  setup(build) {
    build.onLoad({ filter: /[\\/]src[\\/]api[\\/][^\\/]+\.ts$/ }, (args) => ({
      contents: fs
        .readFileSync(args.path, 'utf-8')
        .replace(/(export async function \w+\([^)]*\)[^{]*\{)/g, '$1\n  return (window as any).__call();'),
      loader: 'ts'
    }));
  }
};

async function bundle(dir) {
  const entry = path.join(dir, '__harness.tsx');
  fs.writeFileSync(entry, HARNESS);
  const out = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    outdir: fs.mkdtempSync(path.join(os.tmpdir(), 'answer-arm-')),
    format: 'iife',
    platform: 'browser',
    jsx: 'automatic',
    loader: { '.module.css': 'local-css', '.css': 'css' },
    define: { 'process.env.NODE_ENV': '"development"' },
    nodePaths: [path.join(ROOT, 'node_modules')],
    plugins: [API_STUB],
    logLevel: 'silent'
  });
  return out.outputFiles.find((f) => f.path.endsWith('.js')).text;
}

async function run({ dir, scenarios }) {
  const code = await bundle(dir);
  const out = [];
  for (const steps of scenarios) {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window;
    w.IS_REACT_ACT_ENVIRONMENT = true;
    // An async `act` queues its flush on a MessageChannel, which jsdom's window has not got: Node's.
    w.MessageChannel = MessageChannel;
    const errors = [];
    // The app's own raise (`src/lib/errors.ts`) logs "<type> (<component>): <message> [<code>]"; that is a failure the
    // graph reported, not an error of the page's.
    w.console.error = (...args) => {
      const line = args.map(String).join(' ');
      if (!/^\S+ \(\/[^)]*\): .* \[[\w./-]+\]/.test(line)) errors.push(line);
    };
    w.eval(code);
    w.__mount();
    const readings = [w.__read()];
    for (const step of steps) {
      if (step.startsWith('answer:')) await w.__answer(step.slice('answer:'.length));
      else w.__press(step);
      readings.push(w.__read());
    }
    if (errors.length > 0) throw new Error(`the page logged errors: ${errors.join(' | ').slice(0, 600)}`);
    w.close();
    out.push(readings);
  }
  return out;
}

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  (async () => {
    const out = [];
    for (const app of JSON.parse(input)) out.push(await run(app));
    return out;
  })()
    // Node's MessageChannel (the async act's) holds the process open after the last page closes: exit once written.
    .then((out) => process.stdout.write(JSON.stringify(out), () => process.exit(0)))
    .catch((e) => {
      process.stderr.write(String(e && e.stack ? e.stack : e));
      process.exit(1);
    });
});
