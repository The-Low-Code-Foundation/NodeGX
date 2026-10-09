/**
 * The spec registry (`packages/nodegx-node-spec/src/nodes/index.ts`), read from source: every `.ts` under the package is
 * transpiled in memory as it is required, so no build of the package is needed and a stale `dist/` can never answer.
 *
 * Shared by `spec-ledger.js` (which specs exist) and `scripts/node-catalog/generate.js` (NSP-018: what a specced node's
 * ports say). Returns the registry's `specs` object — `{ [typeName]: NodeSpec }`.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const registryPath = path.join(root, 'packages', 'nodegx-node-spec', 'src', 'nodes', 'index.ts');

function loadSpecs() {
  const ts = require(path.join(root, 'node_modules', 'typescript'));
  const prior = require.extensions['.ts'];
  require.extensions['.ts'] = (m, file) => {
    const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      fileName: file,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, esModuleInterop: true }
    }).outputText;
    m._compile(out, file);
  };
  try {
    return require(registryPath).specs;
  } finally {
    if (prior) require.extensions['.ts'] = prior;
    else delete require.extensions['.ts'];
  }
}

module.exports = { loadSpecs, registryPath };
