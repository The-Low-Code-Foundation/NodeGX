/**
 * P109-S39-STALECLIBUNDLE — in a checkout, `nodegx` says when it is older than its own source.
 *
 * On 2026-10-10 the checkout's `dist/cli.mjs` was dated 2026-10-05, so five days of `src/cli` changes did not run when a
 * drive called `nodegx`. The package here is made in a temporary folder, so the shared bin is never touched.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CLI_INPUTS, cliBundleWarning } from '../src/cli/cliBundle';

describe('P109-S39 — a checkout bin older than its source says so', () => {
  let root: string;
  let pkg: string;
  let bin: string;
  const at = (file: string, secondsAgo: number) => {
    const t = new Date(Date.now() - secondsAgo * 1000);
    fs.utimesSync(file, t, t);
  };
  const write = (file: string, text: string, secondsAgo: number) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    at(file, secondsAgo);
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'p109-s39-'));
    pkg = path.join(root, 'nodegx-export');
    bin = path.join(pkg, 'dist', 'cli.mjs');
    write(path.join(pkg, 'build.mjs'), '// build', 100);
    write(path.join(pkg, 'src', 'cli', 'deploy.ts'), '// source', 100);
    write(path.join(pkg, 'dist', CLI_INPUTS), JSON.stringify({ inputs: ['src/cli/deploy.ts'] }), 50);
    write(bin, '#!/usr/bin/env node\n', 50);
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('says nothing when the bin is newer than every file it was built from', () => {
    expect(cliBundleWarning(bin)).toBeNull();
  });

  it('names the file that changed after it was built, and the command', () => {
    at(path.join(pkg, 'src', 'cli', 'deploy.ts'), 10);
    expect(cliBundleWarning(bin)).toBe(
      `Warning: this nodegx command (${fs.realpathSync(bin)}) is older than its source (src/cli/deploy.ts changed after it was built), so a change in this checkout may\n` +
        'not run. Rebuild it with:\n' +
        '  npm run build --workspace @nodegx/export\n'
    );
  });

  it('reads through the node_modules/.bin symlink a person actually runs', () => {
    at(path.join(pkg, 'src', 'cli', 'deploy.ts'), 10);
    const link = path.join(root, 'node_modules', '.bin', 'nodegx');
    fs.mkdirSync(path.dirname(link), { recursive: true });
    fs.symlinkSync(bin, link);
    expect(cliBundleWarning(link)).toContain('src/cli/deploy.ts changed after it was built');
  });

  it('says nothing with no list beside the running file — running from source', () => {
    at(path.join(pkg, 'src', 'cli', 'deploy.ts'), 10);
    expect(cliBundleWarning(path.join(pkg, 'src', 'cli', 'main.ts'))).toBeNull();
  });

  it('says nothing with no build.mjs above it — an installed package', () => {
    at(path.join(pkg, 'src', 'cli', 'deploy.ts'), 10);
    fs.rmSync(path.join(pkg, 'build.mjs'));
    expect(cliBundleWarning(bin)).toBeNull();
    expect(cliBundleWarning(undefined)).toBeNull();
  });
});
