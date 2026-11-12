/**
 * The member arm of `tests/the-noodl-api-travels.test.ts` (P18 session 134, EXP-020): one call at a time on a script's
 * `Noodl` — `Records.query`, `CloudFunctions.run`, `Files.sign`, `Users.Current` — and what it answers, in a child process.
 *
 * - `mode: 'runtime'` — the running app's own members: `noodl-runtime/src/api/records.js` (its `convertFilterOp`, the store,
 *   `ParseWireAdapter`), the viewer's `api/cloudfunctions.ts`, `api/files.ts` and `api/users.ts`, against the project's
 *   `cloudservices` and `dbCollections` as `NoodlRuntime.instance` hands them, over `XMLHttpRequest`.
 * - `mode: 'export'` — the emitted app's `src/lib/noodl.ts` (and the `src/api/client.ts` beside it), bundled as the app's
 *   bundler would and run in a jsdom window, over `fetch`.
 *
 * Both talk to `fake-parse-backend.js`, a fresh one per call. stdin: `{ mode, dir?, backend: { spec, appId, endpoint,
 * collections, session? } | null, calls: [{ member, args }] }` (`dir` the emitted app's root, export mode; `backend: null`
 * is a project with no backend). An argument `{ $date: iso }` is a Date, `{ $getName: n }` an object whose `getName()` is
 * `n`. stdout: `{ outcomes, requests }`: per call `{ ok: value }`, `{ Error: message }`, `{ string: s }` or
 * `{ thrown: value }` (an `undefined` value is `{ $undefined: true }`), and every request that call sent.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..', '..');
const { JSDOM } = require(require.resolve('jsdom', { paths: [ROOT] }));
const { createFakeBackend } = require('./fake-parse-backend');
console.log = (...args) => process.stderr.write(args.map(String).join(' ') + '\n');

/** One call, in whichever realm the members live in: evaluated there, so `instanceof Error` is that realm's. */
const EXEC = `
async function __exec(api, call) {
  const decode = (v) =>
    Array.isArray(v)
      ? v.map(decode)
      : v && typeof v === 'object'
        ? '$date' in v
          ? new Date(v.$date)
          : '$getName' in v
            ? { getName: () => v.$getName }
            : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, decode(x)]))
        : v;
  const args = (call.args || []).map(decode);
  const clone = (v) => (v === undefined ? { $undefined: true } : JSON.parse(JSON.stringify(v)));
  try {
    let value;
    if (call.member === 'query') value = await api.Records.query(...args);
    else if (call.member === 'run') value = await api.CloudFunctions.run(...args);
    else if (call.member === 'sign') value = await api.Files.sign(...args);
    else if (call.member === 'current') {
      const u = api.Users.Current;
      value =
        u === undefined
          ? undefined
          : { email: u.email, username: u.username, id: u.id, emailVerified: u.emailVerified, propertiesType: typeof u.Properties, propertiesEmail: u.Properties ? u.Properties.email : null };
    }
    return { ok: clone(value) };
  } catch (e) {
    if (e instanceof Error) return { Error: e.message };
    if (typeof e === 'string') return { string: e };
    return { thrown: clone(e) };
  }
}
`;

/** The emitted `noodl.ts`, bundled with the client beside it; `import.meta.env` empty, so the project's endpoint is read. */
function bundle(dir) {
  const esbuild = require(require.resolve('esbuild', { paths: [ROOT] }));
  const entry = path.join(dir, '__noodl_harness.ts');
  fs.writeFileSync(entry, "import { noodl } from './src/lib/noodl';\n(window as any).__noodl = noodl;\n");
  const out = esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    write: false,
    outdir: fs.mkdtempSync(path.join(os.tmpdir(), 'noodl-member-arm-')),
    format: 'iife',
    platform: 'browser',
    define: { 'import.meta.env': '{}' },
    logLevel: 'silent'
  });
  return out.outputFiles.find((f) => f.path.endsWith('.js')).text;
}

async function exportArm({ dir, backend, calls }) {
  const code = bundle(dir);
  const outcomes = [];
  const requests = [];
  for (const call of calls) {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'http://localhost/' });
    const w = dom.window;
    const fake = createFakeBackend(backend ? backend.spec : {});
    w.fetch = fake.fetch;
    if (backend && backend.session) w.localStorage.setItem(`Parse/${backend.appId}/currentUser`, JSON.stringify(backend.session));
    w.eval(code);
    w.eval(EXEC + '\nwindow.__exec = __exec;');
    outcomes.push(await w.__exec(w.__noodl, call));
    requests.push(fake.log);
    w.close();
  }
  return { outcomes, requests };
}

async function runtimeArm({ backend, calls }) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
  const g = globalThis;
  g.window = dom.window;
  g.document = dom.window.document;
  g.localStorage = dom.window.localStorage;
  g.Noodl = { deployed: true, baseUrl: '/' };
  require(require.resolve('ts-node', { paths: [ROOT] })).register({
    transpileOnly: true,
    compilerOptions: { module: 'CommonJS', allowJs: false, esModuleInterop: true, jsx: 'react', target: 'ES2019' }
  });
  const LIB = path.join(ROOT, 'packages', 'noodl-runtime', 'src');
  const VIEWER = path.join(ROOT, 'packages', 'noodl-viewer-react', 'src');
  const def = (m) => (m && m.default ? m.default : m);
  const runtimeModule = require(require.resolve('@noodl/runtime', { paths: [path.join(ROOT, 'packages', 'noodl-viewer-react')] }));
  const NoodlRuntime = def(runtimeModule);
  const cloudservices = backend ? { endpoint: backend.endpoint, appId: backend.appId } : undefined;
  NoodlRuntime.instance = {
    getProjectSettings: () => ({}),
    getMetaData: (key) => (key === 'cloudservices' ? cloudservices : key === 'dbCollections' ? (backend ? backend.collections : []) : undefined)
  };
  if (backend && backend.session) dom.window.localStorage.setItem(`Parse/${backend.appId}/currentUser`, JSON.stringify(backend.session));
  const api = {
    Records: require(path.join(LIB, 'api', 'records'))(),
    CloudFunctions: def(require(path.join(VIEWER, 'api', 'cloudfunctions'))),
    Users: def(require(path.join(VIEWER, 'api', 'users'))),
    Files: def(require(path.join(VIEWER, 'api', 'files')))
  };
  // eslint-disable-next-line no-new-func
  const exec = new Function(EXEC + '\nreturn __exec;')();
  const outcomes = [];
  const requests = [];
  for (const call of calls) {
    const fake = createFakeBackend(backend ? backend.spec : {});
    g.XMLHttpRequest = fake.FakeXMLHttpRequest;
    outcomes.push(await exec(api, call));
    // A request the call left in flight (the runtime's query after a refused filter) lands before the next call.
    await new Promise((resolve) => setTimeout(resolve, 5));
    requests.push(fake.log);
  }
  return { outcomes, requests };
}

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  const job = JSON.parse(input);
  (job.mode === 'export' ? exportArm(job) : runtimeArm(job))
    .then((out) => process.stdout.write(JSON.stringify(out), () => process.exit(0)))
    .catch((e) => {
      process.stderr.write(String(e && e.stack ? e.stack : e));
      process.exit(1);
    });
});
