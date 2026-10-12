module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/?(*.)+(spec|test).js'],
  testPathIgnorePatterns: ['/node_modules/'],
  // the check bundles CanvasTheme with esbuild and runs it
  testTimeout: 30000
};
