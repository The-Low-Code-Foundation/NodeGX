/**
 * Builds the npm package `@nodegx/project-contract` into `dist/publish/` (P112 OWN-011, R2), and nothing else:
 *
 *   node build-publish.mjs               then   npm publish packages/nodegx-project-contract/dist/publish
 *
 * Why a separate folder: inside this repository the package is consumed as TypeScript, by name, from its root
 * (`main: index.ts`, subpaths such as `@nodegx/project-contract/tokens` resolving to `tokens.ts`; README "Shape"), by
 * every webpack, jest and tsconfig that imports it. Pointing `main` at a gitignored build would break each of them in a
 * fresh checkout. So this folder's `package.json` stays `private`, and the published one is written here.
 *
 * The published package keeps the same flat shape, compiled: `tokens.js` + `tokens.d.ts` at the root, `format/`,
 * `world/`, `editor-suite/`, `token-codecs/` and `schemas/` beside them, so every subpath an in-repo importer uses
 * resolves the same way for an outside one, under classic and bundler resolution alike, with no `exports` map.
 *
 * One edit on the way: `editor-suite-node.ts` reaches the spec package by relative path (`../nodegx-node-spec/src`),
 * which only exists in this repository. The staged copy imports `@nodegx/node-spec/node` instead, a declared
 * dependency, and tsc reads its types from node-spec's own build (rebuilt first).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const stage = path.join(here, 'dist', 'stage');
const out = path.join(here, 'dist', 'publish');
const SKIP = new Set(['tests', 'node_modules', 'dist', 'jest.config.js', 'tsconfig.json', 'tsconfig.tests.json', 'build-publish.mjs', 'package.json']);
const NODE_SPEC_RELATIVE = "'../nodegx-node-spec/src'";
const NODE_SPEC_PACKAGE = "'@nodegx/node-spec/node'";

fs.rmSync(path.join(here, 'dist'), { recursive: true, force: true });
for (const entry of fs.readdirSync(here)) {
  if (!SKIP.has(entry)) fs.cpSync(path.join(here, entry), path.join(stage, entry), { recursive: true });
}

const suiteNode = path.join(stage, 'editor-suite-node.ts');
const text = fs.readFileSync(suiteNode, 'utf8');
if (!text.includes(NODE_SPEC_RELATIVE)) throw new Error(`editor-suite-node.ts no longer imports ${NODE_SPEC_RELATIVE}: update build-publish.mjs`);
fs.writeFileSync(suiteNode, text.split(NODE_SPEC_RELATIVE).join(NODE_SPEC_PACKAGE));

const nodeSpec = path.join(root, 'packages', 'nodegx-node-spec');
const nodeSpecTypes = path.join(nodeSpec, 'dist', 'types', 'nodegx-node-spec', 'src', 'index.d.ts');
// Always rebuilt: a node-spec `dist/` left from an earlier build types this package against the spec package as it was.
execFileSync(process.execPath, [path.join(nodeSpec, 'build.mjs')], { stdio: 'inherit', cwd: nodeSpec });

fs.writeFileSync(
  path.join(stage, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        module: 'CommonJS',
        moduleResolution: 'node',
        target: 'ES2019',
        lib: ['ES2020'],
        strict: true,
        noImplicitAny: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        skipLibCheck: true,
        declaration: true,
        rootDir: '.',
        outDir: out,
        types: ['node'],
        typeRoots: [path.join(root, 'node_modules', '@types')],
        baseUrl: '.',
        paths: { '@nodegx/node-spec/node': [nodeSpecTypes] }
      },
      include: ['**/*.ts']
    },
    null,
    2
  )
);
// The staged copy never outlives the compile: P116's import gate (tests/project.test.ts) walks this whole folder, and a
// stage left by a failed build would read as an outside import of `@nodegx/node-spec/node`.
try {
  execFileSync(path.join(root, 'node_modules', '.bin', 'tsc'), ['--project', path.join(stage, 'tsconfig.json'), '--noEmitOnError'], { stdio: 'inherit' });
} finally {
  fs.rmSync(stage, { recursive: true, force: true });
}

// `format.d.ts` re-exports the schemas from their JSON files, which makes every consumer turn on `resolveJsonModule`
// (measured: TS2732 under classic resolution without it). The .d.ts declares them as JSON Schema objects instead; the
// .js still hands over the files themselves.
const formatTypes = path.join(out, 'format.d.ts');
const jsonReexport = /export \{ default as (\w+) \} from '\.\/schemas\/[\w.-]+\.json';/g;
const formatText = fs.readFileSync(formatTypes, 'utf8');
if ((formatText.match(jsonReexport) || []).length !== 8) throw new Error('format.d.ts no longer re-exports the eight schemas this build rewrites: update build-publish.mjs');
fs.writeFileSync(formatTypes, formatText.replace(jsonReexport, 'export declare const $1: { [keyword: string]: unknown };'));

// The schemas tsc did not copy (world.schema.json is read by tools, not imported) ship too.
fs.cpSync(path.join(here, 'schemas'), path.join(out, 'schemas'), { recursive: true });
fs.copyFileSync(path.join(here, 'README.md'), path.join(out, 'README.md'));
fs.copyFileSync(path.join(root, 'LICENSE'), path.join(out, 'LICENSE'));

const own = JSON.parse(fs.readFileSync(path.join(here, 'package.json'), 'utf8'));
const version = (name) => '^' + JSON.parse(fs.readFileSync(path.join(root, 'node_modules', name, 'package.json'), 'utf8')).version;
const nodeSpecVersion = JSON.parse(fs.readFileSync(path.join(nodeSpec, 'package.json'), 'utf8')).version;
const manifest = {
  name: own.name,
  version: own.version,
  description: 'The NodeGX project format outside the editor: the v2 file types, JSON Schemas and validator, design tokens and their codecs, the world files, and the editor suite that grades any editor against the format.',
  license: 'GPL-3.0-only',
  homepage: 'https://nodegx.io',
  repository: { type: 'git', url: 'git+https://github.com/The-Low-Code-Foundation/NodeGX.git', directory: 'packages/nodegx-project-contract' },
  main: './index.js',
  types: './index.d.ts',
  dependencies: { '@nodegx/node-spec': `^${nodeSpecVersion}`, ajv: version('ajv'), 'ajv-formats': version('ajv-formats') },
  publishConfig: { access: 'public' }
};
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`@nodegx/project-contract ${own.version} → ${path.relative(root, out)}`);
