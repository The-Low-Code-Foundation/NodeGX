/**
 * P112 OWN-008 — P112-OWN008-ESMADAPTER: the command loads an ES-module adapter on a Node that can't `require()` one.
 *
 * The command promises "CommonJS or ESM", and the brief's example adapter is `my-adapter.mjs`. Built with
 * `"module": "CommonJS"`, `await import(abs)` became `require(abs)`, which loads an ES module only from Node 20.19 /
 * 22.12. The map stranger's second round ran on Node 20.11.1 and read "require() of ES Module … not supported"
 * (measured on the published 0.1.0 too: 20.11.1 refuses, 20.19.6 and 22.22.0 PASS).
 *
 * Graded on the command as the build makes it: the TypeScript source run in a child process by ts-node (CommonJS, as
 * the publish build), with `--no-experimental-require-module`, which gives this Node the older Node's answer. The
 * control is a CommonJS adapter, which loads either way.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const PKG = path.resolve(__dirname, '..');
const FIXTURES = path.join(PKG, 'tests/fixtures/editor-suite');
const SUITE = path.join(PKG, 'editor-suite').replace(/\\/g, '/');

const flagWorks = spawnSync(process.execPath, ['--no-experimental-require-module', '-e', '0']).status === 0;

function runCommand(adapterFile: string): { status: number | null; out: string } {
  const r = spawnSync(
    process.execPath,
    ['--no-experimental-require-module', '-r', 'ts-node/register/transpile-only', path.join(PKG, 'editor-suite-node.ts'),
      adapterFile, path.join(FIXTURES, 'small'), path.join(FIXTURES, 'small.edits.json')],
    { cwd: PKG, encoding: 'utf8', timeout: 120_000, env: { ...process.env, TS_NODE_PROJECT: path.join(PKG, 'tsconfig.json') } }
  );
  return { status: r.status, out: (r.stdout + r.stderr).trim() };
}

(flagWorks ? describe : describe.skip)('OWN-008 — an ES-module adapter, on a Node that cannot require() one', () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'own008-esm-'));
    fs.writeFileSync(path.join(dir, 'adapter.mjs'), [
      "import { createRequire } from 'node:module';",
      'const require = createRequire(import.meta.url);',
      `const { referenceAdapter } = require(${JSON.stringify(SUITE)});`,
      'export default () => referenceAdapter();',
      ''
    ].join('\n'));
    fs.writeFileSync(path.join(dir, 'adapter.cjs'),
      `module.exports = () => require(${JSON.stringify(SUITE)}).referenceAdapter();\n`);
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  test('the command loads an .mjs adapter and says PASS', () => {
    const r = runCommand(path.join(dir, 'adapter.mjs'));
    expect(r.out).not.toMatch(/require\(\) of ES Module/);
    expect(r.out).toMatch(/^PASS — reference/m);
    expect(r.status).toBe(0);
  });

  test('control: a CommonJS adapter loads the same way', () => {
    const r = runCommand(path.join(dir, 'adapter.cjs'));
    expect(r.out).toMatch(/^PASS — reference/m);
    expect(r.status).toBe(0);
  });
});
