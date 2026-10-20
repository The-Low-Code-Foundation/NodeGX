import * as fs from 'fs';
import * as path from 'path';

/**
 * P78-D82 — `@nodegx/export` and `@nodegx/core` did not build on Windows: both `build.mjs` files ran
 * `execFileSync('npx', ['tsc', …])`, and on Windows npm's launcher is `npx.cmd`, which `execFileSync`
 * cannot start without a shell (`spawnSync npx ENOENT`). The MCP server imports this package's built
 * `dist/index.cjs`, so nothing that loads the MCP door ran on Windows.
 *
 * ⚠️ **This grades the source text; the behaviour was measured separately.** Running either build with
 * `PATH=/nonexistent` reproduces the Windows failure on any machine — a launcher spawned by bare name is
 * not found — and it did: `spawnSync npx ENOENT`, exit 1, on HEAD's `nodegx-core/build.mjs`; exit 0 on
 * both files after the fix. A spec that rebuilt `dist/` would rewrite a shared artefact a peer's drive
 * may be reading, so the run stays a measurement and this file pins what it measured.
 */

const PACKAGES = path.join(__dirname, '..', '..');
const BUILDS = ['nodegx-export/build.mjs', 'nodegx-core/build.mjs'];

/** A child process started by a bare launcher name: `npx`, `npm`, `tsc`, `pnpm`, `yarn`. */
const BARE_LAUNCHER = /\b(?:execFileSync|execFile|spawnSync|spawn)\(\s*['"](?:npx|npm|tsc|pnpm|yarn)['"]/;

describe('P78-D82 — the package builds start tsc through Node, never through a bare launcher', () => {
  test.each(BUILDS)('%s spawns no bare launcher', (file) => {
    const source = fs.readFileSync(path.join(PACKAGES, file), 'utf8');
    expect(source).not.toMatch(BARE_LAUNCHER);
  });

  test.each(BUILDS)('%s runs tsc as this Node with the resolved tsc script', (file) => {
    const source = fs.readFileSync(path.join(PACKAGES, file), 'utf8');
    expect(source).toContain("execFileSync(process.execPath, [createRequire(import.meta.url).resolve('typescript/bin/tsc'), '--project', 'tsconfig.build.json']");
  });

  /** The control: the pattern finds the line the defect was, so a pass above is not a pattern that matches nothing. */
  test('the pattern matches the spawn that broke the Windows build', () => {
    expect("execFileSync('npx', ['tsc', '--project', 'tsconfig.build.json'], { stdio: 'inherit' });").toMatch(BARE_LAUNCHER);
    expect("execFileSync(process.execPath, [tscPath])").not.toMatch(BARE_LAUNCHER);
  });
});
