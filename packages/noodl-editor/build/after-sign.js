// electron-builder `afterSign` (only when signing happened): the signed app's backend can make a thumbnail, under the
// app's own binary — on macOS that is the first point the hardened runtime can refuse a native library
// (check-packaged-backend.js, P112-OWN021-NOSHARP) — then notarisation (macos-notarize.js).
const { checkPackagedBackend } = require('./check-packaged-backend');
const notarize = require('./macos-notarize');

module.exports = async function afterSign(context) {
  await checkPackagedBackend(context, 'afterSign');
  await notarize(context);
};
