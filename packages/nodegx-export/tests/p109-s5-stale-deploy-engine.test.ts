/**
 * P109-S5 — in a checkout, `nodegx deploy` runs an engine built from today's source.
 *
 * The deploy engine (`noodl-preview/dist/nodegx-deploy.cjs`) is a gitignored esbuild bundle carrying its own copy of the
 * node catalog, the validator and the kit injector. Bundled on Sep 17, it refused a valid project ("Group has no input
 * named scrollIntoView", exit 2, blaming the project) while every other check passed it; bundled on Oct 5, it loaded
 * kits in the wrong order on Oct 9. Now `noodl-preview/build.mjs` writes the files it read beside the engine
 * (`nodegx-deploy.inputs.json`), and the CLI rebuilds an engine older than any of them before running it: the ISL-014
 * rule and ruling ("Build it automatically") for the MCP's kit reader.
 *
 * The checkout here is made in a temporary folder: a `build.mjs` that writes an engine and its list, as the real one
 * does, so the specs never touch the shared engine.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ENGINE_ENV, ENGINE_INPUTS, RUNTIME_INPUTS, engineStaleness, refreshEngine, runtimeWarning } from '../src/cli/deployEngine';

/**
 * The catalog's stand-in in the temporary checkout: an input the engine was built from, the Sep 17 case.
 *
 * ⚠️ **Not given the real artefact's file name, on purpose** (P18-S102-CATALOGNAME), and this comment does not spell
 * it either, because the gate is a text search. HLS-001 AC4 counts the files in this package that name the real
 * catalog artefact and allows exactly one, `src/catalog.ts`, so that nothing computes its own path to it. This file
 * never reads the catalog. Staleness is a comparison of mtimes over whatever names the inputs list carries, so a
 * stand-in under another name is the same regression, and it keeps AC4's count honest.
 */
const CATALOG_INPUT = 'node-catalog.stand-in.json';

const FAKE_BUILD = `
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (!process.argv.includes('--deploy-only')) process.exit(3);
if (fs.existsSync(path.join(__dirname, 'FAIL'))) { process.stderr.write('esbuild: the source does not compile'); process.exit(1); }
fs.writeFileSync(path.join(__dirname, 'dist', ${JSON.stringify(ENGINE_INPUTS)}), JSON.stringify({ inputs: ['src/deploy-cli.ts', ${JSON.stringify('../noodl-types/' + CATALOG_INPUT)}] }));
fs.writeFileSync(path.join(__dirname, 'dist', 'nodegx-deploy.cjs'), '// rebuilt');
`;

describe('P109-S5 — a checkout deploys with an engine built from its own source', () => {
  let packages: string;
  let preview: string;
  let engine: string;
  const at = (file: string, secondsAgo: number) => {
    const t = new Date(Date.now() - secondsAgo * 1000);
    fs.utimesSync(file, t, t);
  };
  const write = (file: string, text: string, secondsAgo: number) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    at(file, secondsAgo);
  };

  beforeEach(() => {
    packages = fs.mkdtempSync(path.join(os.tmpdir(), 'p109-s5-'));
    preview = path.join(packages, 'noodl-preview');
    engine = path.join(preview, 'dist', 'nodegx-deploy.cjs');
    write(path.join(preview, 'build.mjs'), FAKE_BUILD, 100);
    write(path.join(preview, 'src', 'deploy-cli.ts'), '// source', 100);
    write(path.join(packages, 'noodl-types', CATALOG_INPUT), '{}', 100);
    write(path.join(preview, 'dist', ENGINE_INPUTS), JSON.stringify({ inputs: ['src/deploy-cli.ts', '../noodl-types/' + CATALOG_INPUT] }), 50);
    write(engine, '// built', 50);
  });
  afterEach(() => fs.rmSync(packages, { recursive: true, force: true }));

  it('an engine newer than every file it was built from is current, and nothing is rebuilt', () => {
    expect(engineStaleness(engine)).toBeNull();
    expect(refreshEngine({ entry: engine, probed: [] }, {})).toEqual({});
    expect(fs.readFileSync(engine, 'utf8')).toBe('// built');
  });

  it('names the file that changed after it was built — the node catalog, the Sep 17 case — and rebuilds it', () => {
    at(path.join(packages, 'noodl-types', CATALOG_INPUT), 10);
    expect(engineStaleness(engine)).toBe(`../noodl-types/${CATALOG_INPUT} changed after it was built`);

    const refreshed = refreshEngine({ entry: engine, probed: [] }, {});
    expect(refreshed.rebuilt).toMatch(
      /^The deploy engine was out of date \(\.\.\/noodl-types\/node-catalog\.stand-in\.json changed after it was built\); rebuilt it in \d+\.\d s\.\n$/
    );
    expect(fs.readFileSync(engine, 'utf8')).toBe('// rebuilt');
    expect(engineStaleness(engine)).toBeNull();
  });

  it('an engine with no list beside it — every engine built before this fix — is rebuilt once', () => {
    fs.rmSync(path.join(preview, 'dist', ENGINE_INPUTS));
    expect(engineStaleness(engine)).toBe(`it has no ${ENGINE_INPUTS} beside it to say what it was built from`);
    expect(refreshEngine({ entry: engine, probed: [] }, {}).rebuilt).toBeDefined();
    expect(engineStaleness(engine)).toBeNull();
  });

  it('a file on the list that is gone makes it out of date too', () => {
    fs.rmSync(path.join(preview, 'src', 'deploy-cli.ts'));
    expect(engineStaleness(engine)).toBe('src/deploy-cli.ts is gone');
  });

  it('a rebuild that fails is a refusal naming why and the command, not a deploy on the old engine', () => {
    at(path.join(preview, 'src', 'deploy-cli.ts'), 10);
    fs.writeFileSync(path.join(preview, 'FAIL'), '');
    const refreshed = refreshEngine({ entry: engine, probed: [] }, {});
    expect(refreshed.rebuilt).toBeUndefined();
    expect(refreshed.failed).toContain('The deploy engine is out of date (src/deploy-cli.ts changed after it was built) and rebuilding it failed:');
    expect(refreshed.failed).toContain('esbuild: the source does not compile');
    expect(refreshed.failed).toContain('npm run build --workspace @nodegx/preview');
  });

  it(`leaves an engine named by ${ENGINE_ENV} alone — choosing one is deliberate`, () => {
    at(path.join(preview, 'src', 'deploy-cli.ts'), 10);
    expect(refreshEngine({ entry: engine, probed: [] }, { [ENGINE_ENV]: engine })).toEqual({});
    expect(fs.readFileSync(engine, 'utf8')).toBe('// built');
  });

  it('leaves an engine with no build.mjs beside its folder alone — not a checkout, nothing to build with', () => {
    at(path.join(preview, 'src', 'deploy-cli.ts'), 10);
    fs.rmSync(path.join(preview, 'build.mjs'));
    expect(refreshEngine({ entry: engine, probed: [] }, {})).toEqual({});
  });
});

describe('P109-S5 (s34) — a deploy says when the viewer runtime it copies is older than its source', () => {
  let packages: string;
  let engine: string;
  let runtimeDir: string;
  const at = (file: string, secondsAgo: number) => {
    const t = new Date(Date.now() - secondsAgo * 1000);
    fs.utimesSync(file, t, t);
  };
  const write = (file: string, text: string, secondsAgo: number) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    at(file, secondsAgo);
  };

  beforeEach(() => {
    packages = fs.mkdtempSync(path.join(os.tmpdir(), 'p109-s5-runtime-'));
    engine = path.join(packages, 'noodl-preview', 'dist', 'nodegx-deploy.cjs');
    runtimeDir = path.join(packages, 'noodl-editor', 'src', 'external', 'deploy');
    write(engine, '// engine', 50);
    write(path.join(packages, 'noodl-viewer-react', 'package.json'), '{}', 100);
    write(path.join(packages, 'noodl-viewer-react', 'src', 'nodes', 'navigation', 'router-handler.ts'), '// source', 100);
    write(path.join(runtimeDir, RUNTIME_INPUTS), JSON.stringify({ inputs: ['../../../../noodl-viewer-react/src/nodes/navigation/router-handler.ts'] }), 50);
    write(path.join(runtimeDir, 'noodl.deploy.js'), '// runtime', 50);
  });
  afterEach(() => fs.rmSync(packages, { recursive: true, force: true }));

  it('says nothing when the runtime is newer than every file it was built from', () => {
    expect(runtimeWarning({ entry: engine, probed: [] }, {})).toBeNull();
  });

  it('names the source file that changed after the runtime was built, and the command', () => {
    at(path.join(packages, 'noodl-viewer-react', 'src', 'nodes', 'navigation', 'router-handler.ts'), 10);
    expect(runtimeWarning({ entry: engine, probed: [] }, {})).toBe(
      'Warning: the viewer runtime this site carries may be older than its source (../../../../noodl-viewer-react/src/nodes/navigation/router-handler.ts changed after it was built), so the site may not\n' +
        'run the code in this checkout. Rebuild it with:\n' +
        '  npm run build:editor:_viewer\n'
    );
  });

  it('says it cannot tell for a runtime built before the list existed', () => {
    fs.rmSync(path.join(runtimeDir, RUNTIME_INPUTS));
    expect(runtimeWarning({ entry: engine, probed: [] }, {})).toContain(`it has no ${RUNTIME_INPUTS} beside it to say what it was built from`);
  });

  it(`says nothing for an engine named by ${ENGINE_ENV}, or outside a checkout`, () => {
    at(path.join(packages, 'noodl-viewer-react', 'src', 'nodes', 'navigation', 'router-handler.ts'), 10);
    expect(runtimeWarning({ entry: engine, probed: [] }, { [ENGINE_ENV]: engine })).toBeNull();
    fs.rmSync(path.join(packages, 'noodl-viewer-react', 'package.json'));
    expect(runtimeWarning({ entry: engine, probed: [] }, {})).toBeNull();
  });
});
