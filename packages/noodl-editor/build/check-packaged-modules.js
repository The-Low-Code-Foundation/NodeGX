// electron-builder `afterPack` hook: every module a shipped bundle requires is in the app.
//
// The renderer and main bundles leave every package in node_modules external
// (webpackconfigs/helpers/get-externals-modules.js), so `require("x")` stays in the
// bundle and is resolved at runtime from the asar's /node_modules. electron-builder
// only packs the dependencies noodl-editor's package.json declares (and theirs), so
// a package the bundle needs that the editor never declared builds clean, packs
// clean, signs, notarises and publishes — and the app opens to a blank window.
// 0.4.0's first draft did exactly that with `fast-xml-parser` (Parse XML / Parse
// Feed, declared by noodl-runtime and nodegx-node-spec only).
//
// This runs after the asar is assembled and before signing, the .dmg and the
// upload, so a missing module fails the build instead of reaching the draft. It
// reads the asar itself: the only honest list of what ships is the one in the app.
//
// Also runnable by hand against any built app:
//   node packages/noodl-editor/build/check-packaged-modules.js <path/to/app.asar>

const path = require('path');
const { builtinModules } = require('module');
const asar = require('@electron/asar');

// The bundles the app loads. A path missing from the asar is itself a failure.
const BUNDLES = [
  'src/editor/index.bundle.js',
  'src/frames/viewer-frame/index.bundle.js',
  'src/main/main.bundle.js'
];

const BUILTINS = new Set(builtinModules);

function packageNameOf(specifier) {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function isBareExternal(specifier) {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return false;
  if (specifier.startsWith('node:') || specifier === 'electron') return false;
  return !BUILTINS.has(packageNameOf(specifier));
}

/** @returns {{ bundle: string, missing: string[] }[]} one row per bundle that is absent or requires an unshipped package */
function findMissingModules(asarPath) {
  const files = new Set(asar.listPackage(asarPath, { isPack: false }).map((f) => f.split(path.sep).join('/')));
  const shipped = (name) => files.has(`/node_modules/${name}/package.json`);
  const problems = [];

  for (const bundle of BUNDLES) {
    if (!files.has(`/${bundle}`)) {
      problems.push({ bundle, missing: ['(the bundle itself is not in the app)'] });
      continue;
    }
    const source = asar.extractFile(asarPath, bundle).toString('utf8');
    const missing = new Set();
    for (const match of source.matchAll(/require\("([^"]+)"\)/g)) {
      const specifier = match[1];
      if (isBareExternal(specifier) && !shipped(packageNameOf(specifier))) missing.add(specifier);
    }
    if (missing.size) problems.push({ bundle, missing: [...missing].sort() });
  }
  return problems;
}

function asarPathFor(context) {
  const { appOutDir, electronPlatformName, packager } = context;
  if (electronPlatformName === 'darwin' || electronPlatformName === 'mas') {
    return path.join(appOutDir, `${packager.appInfo.productFilename}.app`, 'Contents', 'Resources', 'app.asar');
  }
  return path.join(appOutDir, 'resources', 'app.asar');
}

function report(asarPath, problems) {
  if (!problems.length) {
    console.log(`[check-packaged-modules] every module the bundles require is in ${asarPath}`);
    return;
  }
  const lines = problems.map((p) => `  ${p.bundle}: ${p.missing.join(', ')}`);
  throw new Error(
    `[check-packaged-modules] the app would not start — these bundles require packages that are not in ${asarPath}:\n` +
      `${lines.join('\n')}\n` +
      `Add each package to "dependencies" in packages/noodl-editor/package.json.`
  );
}

module.exports = async function checkPackagedModules(context) {
  const asarPath = asarPathFor(context);
  report(asarPath, findMissingModules(asarPath));
};

module.exports.findMissingModules = findMissingModules;

if (require.main === module) {
  const asarPath = process.argv[2];
  if (!asarPath) {
    console.error('usage: node check-packaged-modules.js <path/to/app.asar>');
    process.exit(2);
  }
  try {
    report(asarPath, findMissingModules(asarPath));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
