/**
 * P109 ISL-047 — P78-DBT-DEVSWEEP: starting the editor's dev stack killed a backend somebody started by hand.
 *
 * DBT's START-HERE tells a person to run `node <checkout>/packages/nodegx-backend/bin/nodegx-backend.js serve …`. Its
 * command line holds the checkout path and the word `nodegx-backend`, which is rule 1 of the sweep, so the next
 * `npm run dev` read it as a dev-stack leftover and sent it SIGTERM. Its owner saw the backend stop, with no word why.
 *
 * The editor (`ServiceSupervisor`) and the MCP door (`provision.ts`) spawn `nodegx-backend/dist/cli.js`. Only a person
 * types the `bin/` entry, so that one is never a seed. An editor-spawned backend left behind is still swept: that arm
 * is the control.
 *
 * Graded on the live process table, not on strings: two harmless sleepers whose command lines read like the two
 * backends, and `findDevProcesses`, which lists what a sweep would take and kills nothing.
 */

/* eslint-env jest */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { findDevProcesses, ROOT } = require('../../../../scripts/devtools/dev-processes.js');

const BACKEND = path.join(ROOT, 'packages', 'nodegx-backend');

/**
 * A process that does nothing for a minute, with `args` on its command line where `ps` will read them.
 *
 * Started through a shell that exits at once, so it is re-parented away from this test. A child of the running jest
 * would be spared for the wrong reason: the sweep shields a running suite with its whole tree.
 */
function sleeper(...args: string[]): number {
  const quoted = [process.execPath, '-e', 'setTimeout(() => {}, 60000)', ...args].map((a) => `'${a}'`).join(' ');
  return Number(execFileSync('/bin/sh', ['-c', `${quoted} >/dev/null 2>&1 & echo $!`]).toString().trim());
}

/**
 * A shell that `cd`s into the backend package and runs a suite under it, as an agent's shell does. Its command line
 * holds the repo path and `nodegx-backend`, so rule 1 seeds it. Written to a script so the quoting stays readable.
 * Returns the shell's pid; the suite under it is found with `pgrep -P`.
 */
function shellAroundASuite(dir: string): number {
  const script = path.join(dir, 'shell-around-a-suite.sh');
  fs.writeFileSync(
    script,
    `cd '${BACKEND}' && '${process.execPath}' -e 'setTimeout(() => {}, 60000)' 'npm exec jest -w 3'; true\n`
  );
  return Number(execFileSync('/bin/sh', ['-c', `/bin/sh '${script}' '${BACKEND}' >/dev/null 2>&1 & echo $!`]).toString().trim());
}

describe('a launch sweep spares a backend somebody started by hand', () => {
  let byHand: number;
  let byTheEditor: number;
  let swept: Set<number>;

  beforeAll(async () => {
    byHand = sleeper(path.join(BACKEND, 'bin', 'nodegx-backend.js'), 'serve', '--data-dir', '/tmp/isl047-hand', '--port', '8577');
    byTheEditor = sleeper(path.join(BACKEND, 'dist', 'cli.js'), 'serve', '--data-dir', '/tmp/isl047-editor', '--port', '8578');
    await new Promise((resolve) => setTimeout(resolve, 300));
    swept = new Set(findDevProcesses().map((p: { pid: number }) => p.pid));
  });
  afterAll(() => {
    for (const pid of [byHand, byTheEditor]) {
      try {
        process.kill(pid);
      } catch {
        /* already gone */
      }
    }
  });

  it('the sleepers are running and stand alone (not under this test)', () => {
    for (const pid of [byHand, byTheEditor]) {
      expect(pid).toBeGreaterThan(1);
      expect(() => process.kill(pid, 0)).not.toThrow();
    }
  });

  it('control: an editor-spawned backend (dist/cli.js) left running is still swept', () => {
    expect(swept.has(byTheEditor)).toBe(true);
  });

  it('a backend started by hand from the checkout (bin/nodegx-backend.js) is not', () => {
    expect(swept.has(byHand)).toBe(false);
  });
});

/**
 * Found while measuring the case above (P109-S42-SHELLSEED): the shell wrapping a running suite was a sweep target.
 * The suite itself is shielded, but SIGTERM to its shell loses everything the shell was to do after it (an exit code,
 * a summary line), and that is the suite's owner's reading gone. The immediate parent of a protected suite is now
 * protected with it.
 */
describe('a launch sweep spares the shell a suite is running in', () => {
  let dir: string;
  let shell: number;
  let suite: number;
  let swept: Set<number>;

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl047-shell-'));
    shell = shellAroundASuite(dir);
    await new Promise((resolve) => setTimeout(resolve, 400));
    suite = Number(execFileSync('/usr/bin/pgrep', ['-P', String(shell)]).toString().trim().split('\n')[0]);
    swept = new Set(findDevProcesses().map((p: { pid: number }) => p.pid));
  });
  afterAll(() => {
    for (const pid of [suite, shell]) {
      try {
        process.kill(pid);
      } catch {
        /* already gone */
      }
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('known-firing: the shell is running, with the suite under it', () => {
    expect(shell).toBeGreaterThan(1);
    expect(suite).toBeGreaterThan(1);
  });

  it('control: the suite itself is spared, as before', () => {
    expect(swept.has(suite)).toBe(false);
  });

  it('the shell around it is spared too', () => {
    expect(swept.has(shell)).toBe(false);
  });
});
