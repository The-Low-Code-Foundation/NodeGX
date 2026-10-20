/**
 * P112-OWN021-NOSHARP: stage `sharp`, with this platform's prebuild, as a `node_modules` tree the packaged editor
 * ships beside `nodegx-backend/cli.js`.
 *
 * `dist/cli.js` is one bundle, but `sharp` is not in it and cannot be (transform.ts: native bindings behind its own
 * dynamic requires). The bundle leaves `require('sharp')` to plain Node resolution, so on a packaged app it looks in
 * `Resources/nodegx-backend/node_modules` and up. Until 0.4.3 nothing was there, and every `?thumb=` on a backend the
 * editor runs answered 501 — every marketplace photo drew broken on 0.4.2.
 *
 * What this copies, from the repo's own install (the lockfile pins it; `npm ci` on each CI runner installs that
 * runner's prebuild):
 *   - `sharp` and what it `dependencies` on, transitively, at the same relative paths they have under `node_modules`
 *     (so `sharp/node_modules/semver` stays nested and resolution is unchanged);
 *   - of the `optionalDependencies`, only the target's: `@img/sharp-<platform>-<arch>` (the `.node`) and, on macOS and
 *     Linux, `@img/sharp-libvips-<platform>-<arch>` (libvips, found by the `.node` through a relative rpath — which is
 *     why the layout must be kept and not flattened). On Windows the `.node` package carries its DLLs itself.
 *
 * The target's packages are required: a staging that would ship without them throws, naming them, instead of producing a
 * tree that loads `sharp` and then fails on its binding.
 *
 * Linux means glibc here (`linux-x64`), which is what the AppImage, .deb and .rpm run on.
 *
 * Also runnable by hand: node packages/nodegx-backend/scripts/stage-sharp.js <outDir>
 */
'use strict';

const fs = require('fs');
const path = require('path');

const pkgRoot = path.resolve(__dirname, '..');

/**
 * The optional packages a `<platform>-<arch>` target needs, as sharp's own manifest lists them: the `.node` package,
 * and libvips where it is a package of its own. Windows has none: `@img/sharp-win32-x64` carries its DLLs itself.
 */
function targetPackages(sharpManifest, platform, arch) {
  const listed = sharpManifest.optionalDependencies || {};
  const binding = `@img/sharp-${platform}-${arch}`;
  if (!(binding in listed)) {
    throw new Error(
      `[stage-sharp] sharp ${sharpManifest.version} has no prebuild for ${platform}-${arch} (no ${binding})`
    );
  }
  return [binding, `@img/sharp-libvips-${platform}-${arch}`].filter((name) => name in listed);
}

const readManifest = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));

/** Node's lookup, by hand: the nearest `node_modules/<name>` from `fromDir` up. `exports` maps don't apply to a dir. */
function findPackageDir(name, fromDir) {
  let dir = fromDir;
  for (;;) {
    const candidate = path.join(dir, 'node_modules', name);
    if (fs.existsSync(path.join(candidate, 'package.json'))) return fs.realpathSync(candidate);
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** `/repo/node_modules/sharp/node_modules/color` → `sharp/node_modules/color`: the path under the first node_modules. */
function layoutPath(packageDir) {
  const parts = packageDir.split(path.sep);
  const at = parts.indexOf('node_modules');
  if (at < 0) throw new Error(`[stage-sharp] ${packageDir} is not inside a node_modules folder`);
  return parts.slice(at + 1).join('/');
}

/**
 * Copy sharp and its runtime closure for one target into `outDir` (emptied first).
 * @returns {{ target: string, packages: string[] }} the layout paths written, sorted
 */
function stageSharp({ outDir, platform = process.platform, arch = process.arch, fromDir = pkgRoot }) {
  const sharpDir = findPackageDir('sharp', fromDir);
  if (!sharpDir) throw new Error(`[stage-sharp] cannot find sharp from ${fromDir}. Run npm ci at the repo root.`);
  const wanted = new Set(targetPackages(readManifest(sharpDir), platform, arch));
  const staged = new Map(); // layout path → source dir
  const queue = [{ name: 'sharp', fromDir }];

  while (queue.length) {
    const { name, fromDir: from, optional } = queue.shift();
    const dir = findPackageDir(name, from);
    if (!dir && optional) continue; // the target check below names it
    if (!dir) throw new Error(`[stage-sharp] cannot find ${name} from ${from}. Run npm ci at the repo root.`);
    const rel = layoutPath(dir);
    if (staged.has(rel)) {
      if (staged.get(rel) !== dir)
        throw new Error(`[stage-sharp] two installs of ${rel}: ${staged.get(rel)} and ${dir}`);
      continue;
    }
    staged.set(rel, dir);
    const manifest = readManifest(dir);
    for (const dep of Object.keys(manifest.dependencies || {})) queue.push({ name: dep, fromDir: dir });
    for (const dep of Object.keys(manifest.optionalDependencies || {})) {
      if (wanted.has(dep)) queue.push({ name: dep, fromDir: dir, optional: true });
    }
  }

  const target = `${platform}-${arch}`;
  const missing = [...wanted].filter(
    (name) => ![...staged.keys()].some((rel) => rel === name || rel.endsWith(`/node_modules/${name}`))
  );
  if (missing.length) {
    throw new Error(
      `[stage-sharp] the ${target} prebuild is not installed: ${missing.join(', ')}. ` +
        'The packaged backend would answer 501 to every ?thumb=. Install on the target platform (npm ci), ' +
        'from a lockfile that lists every platform (memory: a lockfile made on a Mac drops other platforms).'
    );
  }

  fs.rmSync(outDir, { recursive: true, force: true });
  for (const [rel, dir] of staged) {
    fs.cpSync(dir, path.join(outDir, ...rel.split('/')), {
      recursive: true,
      dereference: true,
      // A nested node_modules is staged as its own package, or not needed at all.
      filter: (src) => !path.relative(dir, src).split(path.sep).includes('node_modules')
    });
  }
  return { target, packages: [...staged.keys()].sort() };
}

module.exports = { stageSharp, targetPackages };

if (require.main === module) {
  const outDir = process.argv[2];
  if (!outDir) {
    console.error('usage: node stage-sharp.js <outDir>');
    process.exit(2);
  }
  try {
    const { target, packages } = stageSharp({ outDir: path.resolve(outDir) });
    console.log(`[stage-sharp] ${target}: ${packages.join(', ')} → ${outDir}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
