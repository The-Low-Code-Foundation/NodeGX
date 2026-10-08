/**
 * P116 ONT-001 — the first tests this package has: `world/`. Plain data and pure functions; no DOM.
 *
 * @type {import('ts-jest/dist/types').InitialOptionsTsJest}
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.tests.json' }]
  }
};
