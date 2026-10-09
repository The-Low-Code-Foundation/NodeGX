/**
 * P112 OWN-001 AC2 — the in-memory entry is a page's: bundled for the browser it reaches no `fs`,
 * `path` or Node `crypto`, and the bundle runs where there is no `require`, `process` or `Buffer`
 * and edits a project held in memory.
 */
import { build } from 'esbuild';
import * as path from 'path';
import * as vm from 'vm';

const NODE_BUILTINS = /^(node:)?(fs|path|crypto|os|buffer|child_process|stream|util|url)(\/|$)/;

test('the format entry bundles for a browser with no Node built-in and runs in a context without Node', async () => {
  const result = await build({
    entryPoints: [path.resolve(__dirname, '../format.ts')],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    globalName: 'Format',
    write: false,
    metafile: true,
    minify: true,
    logLevel: 'silent'
  });
  // esbuild refuses to resolve a Node built-in for `platform: 'browser'`, so a reached `fs` fails the build above;
  // the metafile says the same thing positively.
  const inputs = Object.keys(result.metafile.inputs);
  expect(inputs.filter((i) => NODE_BUILTINS.test(i))).toEqual([]);
  expect(inputs.some((i) => i.endsWith('format/store.ts'))).toBe(true);
  expect(inputs.some((i) => i.endsWith('schemas/nodes.schema.json'))).toBe(true);

  const code = result.outputFiles[0].text;
  const bytes = Buffer.byteLength(code);
  // Recorded in OWN-001 §6; most of it is Ajv and ajv-formats.
  expect(bytes).toBeLessThan(250 * 1024);

  const sandbox: Record<string, unknown> = { console };
  vm.createContext(sandbox);
  vm.runInContext(`${code}\n;this.Format = Format;`, sandbox);
  vm.runInContext(
    `
    const files = Format.memoryFiles({
      'components/_registry.json': JSON.stringify({ version: 1, lastUpdated: '2026-10-09T00:00:00.000Z',
        components: { Home: { path: 'Home', type: 'visual', nodeCount: 0, connectionCount: 0 } } }, null, 2) + '\\n',
      'components/Home/component.json': JSON.stringify({ id: 'home', name: 'Home', type: 'visual', path: '/Home' }, null, 2),
      'components/Home/nodes.json': JSON.stringify({ componentId: 'home', nodes: [] }, null, 2),
      'components/Home/connections.json': JSON.stringify({ componentId: 'home', connections: [] }, null, 2)
    });
    const store = new Format.V2ProjectStore(files, { now: () => '2026-10-09T00:00:00.000Z' });
    const home = store.readComponent('Home');
    home.files.nodes.nodes.push({ id: 'n1', type: 'Text', label: 'Hello' });
    store.writeComponent('Home', home.files, { ifRevision: home.revision });
    this.nodeCount = store.readRegistry().components.Home.nodeCount;
    this.valid = Format.SchemaValidator.instance.validate(Format.SCHEMA_IDS.NODES, JSON.parse(files.read('components/Home/nodes.json'))).valid;
    this.hasRequire = typeof require !== 'undefined' || typeof process !== 'undefined' || typeof Buffer !== 'undefined';
    `,
    sandbox
  );
  expect(sandbox.hasRequire).toBe(false);
  expect(sandbox.nodeCount).toBe(1);
  expect(sandbox.valid).toBe(true);

  // The size, for §6; never asserted exactly.
  console.log(`format browser bundle: ${bytes} bytes minified`);
});
