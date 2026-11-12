// Runs backend.ts under ts-node with the backend's own `@cloud-runtime` alias and text loaders (as its build does).
const Module = require('module');
const path = require('path');
const R = '/Users/richardosborne/vscode_projects/OpenNoodl';
const CLOUD = path.join(R, 'packages/noodl-viewer-cloud/src');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === '@cloud-runtime') request = path.join(CLOUD, 'index.ts');
  else if (request.startsWith('@cloud-runtime/')) request = path.join(CLOUD, request.slice('@cloud-runtime/'.length));
  return resolve.call(this, request, ...rest);
};
for (const ext of ['.html', '.css', '.txt', '.md']) require.extensions[ext] = (m, f) => { m.exports = require('fs').readFileSync(f, 'utf8'); };
require(path.join(R, 'node_modules/ts-node')).register({ transpileOnly: true, compilerOptions: { module: 'commonjs', esModuleInterop: true } });
require('./backend.ts');
