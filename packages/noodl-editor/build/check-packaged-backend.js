// electron-builder hook half: the backend the app ships can make a thumbnail (P112-OWN021-NOSHARP).
//
// 0.4.2 shipped `Resources/nodegx-backend/cli.js` with no `sharp` beside it. Uploads worked, every `?thumb=` answered
// 501, and every marketplace photo drew broken. Nothing could see it before the release: every drive ran the backend
// from the repo, where `node_modules/sharp` is always within reach.
//
// Two checks on the packed app, both failing the build before the installer is made or uploaded:
//
//   1. the target's own prebuild is in `nodegx-backend/node_modules` — `@img/sharp-<platform>-<arch>` and its libvips.
//      The tree is staged on the build machine (packages/nodegx-backend/scripts/stage-sharp.js), so an app packaged
//      for another arch carries the wrong one; this names it.
//   2. the live smoke (packages/nodegx-backend/scripts/thumb-smoke.js): start the packed `cli.js` with the app's own
//      binary and ELECTRON_RUN_AS_NODE=1, as ServiceSupervisor does, upload a photo, ask for `?thumb=md`, expect a
//      256 px PNG.
//
// afterPack runs it on every platform. On macOS the app is not signed yet at afterPack, so the smoke runs the packed
// tree under this build's Node there, and afterSign runs it again with the signed app's binary: hardened runtime
// refuses a native library the signature doesn't cover, and only a signed app can show that.
//
// The live smoke needs a binary this machine can execute. When the target is another platform or arch it is
// skipped, loudly; every CI leg builds its own platform.
//
// Also runnable by hand against any built app:
//   node packages/noodl-editor/build/check-packaged-backend.js <resources dir> [executable]

const fs = require('fs');
const path = require('path');
const { thumbSmoke } = require('../../nodegx-backend/scripts/thumb-smoke');

// electron-builder's `Arch` enum (builder-util), by value.
const ARCH_NAMES = { 0: 'ia32', 1: 'x64', 2: 'armv7l', 3: 'arm64', 4: 'universal' };

function layoutFor(context) {
  const { appOutDir, electronPlatformName, packager } = context;
  if (electronPlatformName === 'darwin' || electronPlatformName === 'mas') {
    const app = path.join(appOutDir, `${packager.appInfo.productFilename}.app`);
    return {
      resourcesDir: path.join(app, 'Contents', 'Resources'),
      executable: path.join(app, 'Contents', 'MacOS', packager.appInfo.productFilename)
    };
  }
  const name = electronPlatformName === 'win32' ? `${packager.appInfo.productFilename}.exe` : packager.executableName;
  return { resourcesDir: path.join(appOutDir, 'resources'), executable: path.join(appOutDir, name) };
}

/** Check 1. @returns {string[]} the missing packages, empty when the target's prebuild is there */
function missingPrebuild(resourcesDir, platform, arch) {
  const modules = path.join(resourcesDir, 'nodegx-backend', 'node_modules');
  return ['sharp', `@img/sharp-${platform}-${arch}`, `@img/sharp-libvips-${platform}-${arch}`].filter(
    (name) => !fs.existsSync(path.join(modules, name, 'package.json'))
  );
}

async function checkPackagedBackend(context, hook) {
  const platform = context.electronPlatformName === 'mas' ? 'darwin' : context.electronPlatformName;
  const arch = ARCH_NAMES[context.arch];
  const { resourcesDir, executable } = layoutFor(context);

  const missing = missingPrebuild(resourcesDir, platform, arch);
  if (missing.length) {
    throw new Error(
      `[check-packaged-backend] the ${platform}-${arch} app's backend has no ${missing.join(', ')} in ` +
        `${path.join(resourcesDir, 'nodegx-backend', 'node_modules')}. Every ?thumb= would answer 501. ` +
        'It is staged by `npm run build:sidecars` on the build machine, for that machine: package on the target.'
    );
  }

  if (platform !== process.platform || arch !== process.arch) {
    console.log(
      `[check-packaged-backend] ⚠️ SKIPPED the live ?thumb= smoke at ${hook}: this ${process.platform}-${process.arch} ` +
        `machine cannot run the ${platform}-${arch} app. The prebuild is present; whether it loads is NOT checked.`
    );
    return;
  }

  const unsignedMac = platform === 'darwin' && hook === 'afterPack';
  const runner = unsignedMac ? process.execPath : executable;
  const result = await thumbSmoke({ resourcesDir, executable: runner });
  console.log(
    `[check-packaged-backend] ${hook}: ?thumb=md → ${result.status}, ${result.width} × ${result.height} PNG, ` +
      `from the packed backend under ${
        unsignedMac ? "this build's Node (the app is not signed yet)" : 'the app binary'
      }`
  );
}

module.exports = { checkPackagedBackend, missingPrebuild };

if (require.main === module) {
  const [resourcesDir, executable] = process.argv.slice(2);
  if (!resourcesDir) {
    console.error('usage: node check-packaged-backend.js <resources dir> [executable]');
    process.exit(2);
  }
  const missing = missingPrebuild(path.resolve(resourcesDir), process.platform, process.arch);
  if (missing.length) {
    console.error(`[check-packaged-backend] missing: ${missing.join(', ')}`);
    process.exit(1);
  }
  thumbSmoke({ resourcesDir: path.resolve(resourcesDir), executable: executable && path.resolve(executable) })
    .then((r) => console.log(`[check-packaged-backend] ?thumb=md → ${r.status}, ${r.width} × ${r.height} PNG`))
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
