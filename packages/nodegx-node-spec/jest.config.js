/**
 * Pure TypeScript — no DOM, no Electron, no server.
 *
 * ⚠️ `isolatedModules` is deliberately NOT set (neither here nor in tsconfig.json): with it on,
 * ts-jest transpiles only and reports no type errors, and tests/types.test.ts grades the spec
 * format's TYPE rules through `@ts-expect-error` lines (an unused one is TS2578 and fails the
 * suite). Turning it on would make that file pass vacuously.
 *
 * @type {import('ts-jest/dist/types').InitialOptionsTsJest}
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }]
  }
};
