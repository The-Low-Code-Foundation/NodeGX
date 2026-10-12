/**
 * NSP-013 — the node test environment, plus the REAL `process.env`.
 *
 * Jest hands every test file a COPY of `process.env` (jest-util `createProcessObject`): a write
 * to `process.env.TZ` inside a test lands in that copy, and V8 — which re-reads its zone only when
 * Node's real `process.env` setter runs — never hears of it. The world's TIME ZONE rule (world.ts
 * `installTimeZone`) needs the real one, so this environment hands it over on a global the helper
 * looks for first. Measured 2026-10-01: a write to the sandbox copy leaves `getHours()` on the
 * machine's zone; a write through this global moves it.
 *
 * Used per file, by the docblock `@jest-environment ./tests/jest-env-real-process.js` (the
 * runtime's node-spec conformance test names its own copy of this path).
 */
const { TestEnvironment } = require('jest-environment-node');

class RealProcessEnvEnvironment extends TestEnvironment {
  constructor(config, context) {
    super(config, context);
    this.global.__nodeSpecRealProcessEnv = process.env;
  }
}

module.exports = RealProcessEnvEnvironment;
