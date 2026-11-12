/**
 * HST-006 §7: the backend package's own jest config, with ONE change: `../src/service` is the remote stand-in
 * (BackendService.js), so every suite that only starts, stops and talks HTTP grades a service in a Durable Object.
 * No globalSetup: the admin app build it makes is not graded here.
 *
 *   cd packages/nodegx-backend
 *   nice -n 19 npx jest -c ../../dev-docs/tasks/phase-115-online-on-your-own-account/spike-backend/remote/jest.remote.config.js \
 *     --runInBand tests/isl040-sessions.test.ts …
 */
const path = require('path');
const base = require('../../../../../packages/nodegx-backend/jest.config.js');

const { globalSetup: _skip, ...rest } = base;

module.exports = {
  ...rest,
  rootDir: path.resolve(__dirname, '../../../../../packages/nodegx-backend'),
  setupFilesAfterEnv: [...(base.setupFilesAfterEnv || []), path.join(__dirname, 'slow-network.js')],
  moduleNameMapper: {
    '^\\.\\./src/service$': path.join(__dirname, 'BackendService.js'),
    ...base.moduleNameMapper
  }
};
