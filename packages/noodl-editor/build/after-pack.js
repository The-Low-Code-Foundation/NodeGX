// electron-builder `afterPack`: the packed app, before signing, the installer and the upload.
//   1. every module the bundles require is in the asar (check-packaged-modules.js);
//   2. the backend it ships can make a thumbnail (check-packaged-backend.js, P112-OWN021-NOSHARP).
const checkPackagedModules = require('./check-packaged-modules');
const { checkPackagedBackend } = require('./check-packaged-backend');

module.exports = async function afterPack(context) {
  await checkPackagedModules(context);
  await checkPackagedBackend(context, 'afterPack');
};
