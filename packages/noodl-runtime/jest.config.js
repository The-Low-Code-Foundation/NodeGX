/**
 * The runtime is framework-neutral and touches no DOM APIs, so the default
 * node environment is correct for every suite here.
 *
 * PLAT-003 converts this package to TypeScript incrementally, so both .js and
 * .ts sources must run side by side: ts-jest handles the converted files,
 * babel-jest passes the plain CommonJS .js through as before.
 */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
    // NSP-016 s52 — the Group's component imports three better-scroll plugins written as ES modules (Group.tsx :7-12); the
    // node-spec runtime target loads the viewer's nodes from source, so their `export default` needs the CommonJS transform
    '/noodl-viewer-react/src/.+\\.js$': ['babel-jest', { plugins: ['@babel/plugin-transform-modules-commonjs'] }],
    '^.+\\.jsx?$': 'babel-jest'
  },
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/']
};
