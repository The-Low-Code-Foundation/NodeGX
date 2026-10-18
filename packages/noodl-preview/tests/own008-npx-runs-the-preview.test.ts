/**
 * P112 OWN-008 — P112-OWN008-NPXPREVIEW: `npx @nodegx/preview <app>` runs the preview.
 *
 * Every page a person meets tells them to see their app with `npx @nodegx/preview <app> --open` (create-nodegx's
 * closing lines and README, the folder's CLAUDE.md and AGENTS.md, the editor skill, this package's README). npx runs
 * a package's only bin, or else the bin named after the package without its scope (`preview`). 0.1.0 had one bin;
 * 0.2.0 added `nodegx-deploy` (OWN-016), and from then on npx answered "could not determine executable to run"
 * (measured on 0.2.2 from the registry, 2026-10-18; the map stranger hit it first).
 *
 * Graded on npm itself: a stand-in package carrying this package.json's real bin map, each bin a stub that prints its
 * own name, packed and run through `npx <tarball>`. The control is the same map without `preview`, which is 0.2.2's.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const PKG = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));

/** Pack a stand-in for @nodegx/preview with `bin`, run it through `npx`, and return what ran. */
function npxRuns(bin: Record<string, string>): { status: number | null; out: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'own008-npx-'));
  try {
    const pkgDir = path.join(dir, 'pkg');
    fs.mkdirSync(path.join(pkgDir, 'bin'), { recursive: true });
    for (const [name, file] of Object.entries(bin)) {
      fs.writeFileSync(path.join(pkgDir, file), `#!/usr/bin/env node\nconsole.log('ran ' + ${JSON.stringify(path.basename(file))} + ' as ${name}');\n`);
    }
    fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({ name: PKG.name, version: '0.0.0-npx', bin }));
    const env = { ...process.env, npm_config_cache: path.join(dir, 'cache'), npm_config_update_notifier: 'false' };
    const pack = spawnSync('npm', ['pack', '--silent', '--pack-destination', dir], { cwd: pkgDir, encoding: 'utf8', env });
    const tgz = path.join(dir, pack.stdout.trim().split('\n').pop()!);
    // `file:` makes npx read the tarball as a package spec, as it reads `@nodegx/preview` from the registry.
    const run = spawnSync('npx', ['--yes', `file:${tgz}`], { cwd: dir, encoding: 'utf8', env, timeout: 60_000 });
    return { status: run.status, out: (run.stdout + run.stderr).trim() };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('OWN-008 — npx @nodegx/preview runs the preview', () => {
  test('this package.json: npx runs the preview server', () => {
    const r = npxRuns(PKG.bin);
    expect(r.out).toMatch(/^ran noodl-preview\.js as /m);
    expect(r.status).toBe(0);
  });

  test('control: the bin map without `preview` (0.2.2) leaves npx unable to choose', () => {
    const { preview: _gone, ...without } = PKG.bin;
    expect(Object.keys(without).length).toBeGreaterThan(1);
    const r = npxRuns(without);
    expect(r.out).toMatch(/could not determine executable to run/);
    expect(r.status).not.toBe(0);
  });
});
