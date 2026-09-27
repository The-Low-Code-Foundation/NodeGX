/**
 * Node-environment jest for the standalone backend service. TypeScript via
 * ts-jest; no DOM, no Electron.
 */
module.exports = {
  testEnvironment: 'node',
  transform: {
    // BMG-001: ONE ts-jest entry for .ts and .tsx. jest caches transformers by module path, so
    // two ts-jest entries with different options race (the last one loaded wins for both
    // patterns) — the composer specs parsed alone and failed under `npm test`. The service
    // tsconfig carries the Preact JSX options; they touch nothing that is not .tsx.
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', isolatedModules: true }],
    // BAK-005: mirrors esbuild's `text` loader so the served dashboard's markup
    // and stylesheet load identically under jest and in the built bundle.
    // BMG-001: `.txt` is the app bundle, build/admin/app.js.txt.
    '^.+\\.(html|css|txt)$': '<rootDir>/tests/text-transformer.js'
  },
  // BMG-001: the bundle and the token sheet are build products; make them before grading them.
  globalSetup: '<rootDir>/tests/global-setup.js',
  moduleNameMapper: {
    // Mirrors the esbuild alias in scripts/build.js: the cloud runtime +
    // execution history are consumed from noodl-viewer-cloud/src.
    '^@cloud-runtime$': '<rootDir>/../noodl-viewer-cloud/src/index.ts',
    '^@cloud-runtime/(.*)$': '<rootDir>/../noodl-viewer-cloud/src/$1',
    // BRG-003: the conformance suite is TypeScript and lives OUTSIDE the
    // contract package's `src/`. Reached through the `@noodl` symlink it would
    // resolve inside node_modules, where jest's default transformIgnorePatterns
    // declines to transform it — so it is mapped to the real path, exactly as
    // the cloud runtime above is. The suite is imported at RUNTIME (it runs),
    // unlike every other contract import in this package, which is type-only
    // and erased before jest ever sees it.
    '^@noodl/backend-contract/conformance$': '<rootDir>/../nodegx-backend-contract/conformance/index.ts',
    '^@noodl/backend-contract/conformance/(.*)$': '<rootDir>/../nodegx-backend-contract/conformance/$1.ts'
  },
  setupFiles: ['<rootDir>/tests/setup-logging.js'],
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/']
};
