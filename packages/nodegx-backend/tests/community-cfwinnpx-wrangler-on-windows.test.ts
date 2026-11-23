/**
 * COMMUNITY-CFWINNPX: `deploy cloudflare` on Windows ran wrangler as a bare `npx`, which spawnSync cannot start there
 * (`npx.cmd`), so the bucket step failed with an empty reason and an R2 hint. These pin which command each machine gets,
 * and that a launcher that never started is a sentence, not a blank.
 */
import { spawnSync } from 'child_process';
import * as path from 'path';

import { spawnFailure, wranglerCommandFor, type WranglerHost } from '../cloudflare/wranglerSpawn';

const WIN_NODE = 'C:\\Program Files\\nodejs\\node.exe';
const WIN_NPX_CLI = 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js';
const notInstalled = () => {
  throw new Error('Cannot find module');
};

function host(over: Partial<WranglerHost>): WranglerHost {
  return { env: {}, platform: 'win32', execPath: WIN_NODE, from: ['D:\\marketplace'], resolve: notInstalled, exists: () => false, ...over };
}

describe('wranglerCommandFor', () => {
  it('on Windows with no wrangler installed, runs npm’s npx-cli.js through node, never a bare npx', () => {
    const cmd = wranglerCommandFor(host({ exists: (f) => f === WIN_NPX_CLI }));
    expect(cmd).toEqual([WIN_NODE, WIN_NPX_CLI, '--yes', 'wrangler@4']);
  });

  it('on Windows, finds npx-cli.js beside the npm that is running us when node’s folder has none (nvm, volta)', () => {
    const npm = 'C:\\Users\\a\\AppData\\Roaming\\nvm\\v20\\node_modules\\npm\\bin\\npm-cli.js';
    const want = path.win32.join(path.win32.dirname(npm), 'npx-cli.js');
    const cmd = wranglerCommandFor(host({ env: { npm_execpath: npm }, exists: (f) => f === want }));
    expect(cmd).toEqual([WIN_NODE, want, '--yes', 'wrangler@4']);
  });

  it('elsewhere, keeps `npx wrangler@4`', () => {
    expect(wranglerCommandFor(host({ platform: 'darwin', execPath: '/usr/local/bin/node' }))).toEqual(['npx', '--yes', 'wrangler@4']);
  });

  it('NODEGX_WRANGLER and an installed wrangler still win, through node', () => {
    expect(wranglerCommandFor(host({ env: { NODEGX_WRANGLER: 'C:\\w\\wrangler.js' } }))).toEqual([WIN_NODE, 'C:\\w\\wrangler.js']);
    expect(wranglerCommandFor(host({ resolve: () => 'D:\\marketplace\\node_modules\\wrangler\\bin\\wrangler.js' }))).toEqual([
      WIN_NODE,
      'D:\\marketplace\\node_modules\\wrangler\\bin\\wrangler.js'
    ]);
  });
});

describe('spawnFailure', () => {
  it('names the launcher and the code when spawnSync could not start it (the blank the user saw)', () => {
    const run = spawnSync('nodegx-no-such-launcher', ['--yes', 'wrangler@4'], { encoding: 'utf8' });
    expect(`${run.stdout || ''}${run.stderr || ''}`).toBe(''); // what the old code printed as the reason
    const said = spawnFailure(['nodegx-no-such-launcher', '--yes', 'wrangler@4'], run.error);
    expect(said).toMatch(/wrangler could not be started \(nodegx-no-such-launcher --yes wrangler@4: ENOENT\)/);
    expect(said).toMatch(/NODEGX_WRANGLER/);
  });

  it('says nothing when the process started', () => {
    expect(spawnFailure(['node'], spawnSync(process.execPath, ['-e', '0']).error)).toBeNull();
  });
});
