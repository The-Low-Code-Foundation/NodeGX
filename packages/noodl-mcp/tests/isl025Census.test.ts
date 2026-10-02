/**
 * P109 ISL-025 AC1/AC5 — the census of the island's workarounds.
 *
 * Every workaround Olive's Island carries for a product defect (ISL-025 §2, W1–W22) is listed here with the pattern
 * that finds it at its location and the state the task has recorded for it: `present` (the product fix has not landed,
 * or its row has not been ruled), `removed` (the row landed: the pattern must be GONE), or `kept` (ruled to stay, with
 * the reason that must sit beside it as a comment). The spec is red whenever a row's recorded state disagrees with the
 * tree, so a workaround cannot leave silently and a "removed" row cannot creep back.
 *
 * 🔴 Two known-firing controls sit beside the census (the memory "assert an absence with a known-firing signal beside
 * it"): the `Repeat` node exists in the viewer's node library, and `nodegx deploy` has its `engine: 11` exit code. A
 * row reading `removed` because a path moved, not because the workaround went, would read the same as a real removal —
 * the controls are read from the same tree with the same reader, so a moved tree reddens them first.
 *
 * At HEAD `68b1549f5` (2026-10-02, before session 2 changed anything) every row read `present`: recorded in ISL-025 §8.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO = path.join(__dirname, '..', '..', '..');
const TESTS = path.join(REPO, 'packages', 'noodl-mcp', 'tests');

type State = 'present' | 'removed' | { kept: string };

interface Row {
  w: string;
  what: string;
  /** Repo-relative file(s) whose text is searched; a row is present when ANY file matches. */
  files: string[];
  pattern: RegExp;
  state: State;
}

const t = (f: string) => path.join('packages', 'noodl-mcp', 'tests', f);

export const WORKAROUNDS: Row[] = [
  {
    w: 'W1',
    what: 'the two loops hand-built from Timers (the Runner’s rnTimer, the island’s iwTimer)',
    files: [t('cg003Components.ts')],
    pattern: /logic\('(rnTimer|iwTimer)', TIMER_NODE/,
    state: 'removed'
  },
  {
    w: 'W2',
    what: 'the drives call the internal deploy bundle and guard on index.html’s mtime',
    files: [
      'dev-docs/tasks/phase-108-the-island-works/drives/drive-all.sh',
      'dev-docs/tasks/phase-105-the-coding-garden/drives/drive-pages.sh',
      'dev-docs/tasks/phase-105-the-coding-garden/drives/drive-olive.sh',
      'scripts/devtools/drive-cg003-pages.js',
      'scripts/devtools/drive-cg001-kit.js',
      'scripts/devtools/drive-ig007-3d.js'
    ],
    pattern: /nodegx-deploy\.cjs|-nt \$\S*\.before|exits 0 (EVEN )?when it refuses/i,
    state: 'removed'
  },
  {
    w: 'W3',
    what: 'a 120 ms Timer plus a Logic/Latch in front of every list given twice',
    files: [t('cg003Components.ts')],
    pattern: /TIMER_NODE, '[^']*once (it|they) stops? changing', \{ duration: PAD_SETTLE_MS \}/,
    state: 'present'
  },
  {
    w: 'W4',
    what: 'record sent as yes/no strings instead of a boolean',
    files: [t('cg003Components.ts')],
    pattern: /record: \{ type: 'string', by: \{ drive: 'no', teach: 'yes', play: 'no' \} \}/,
    state: 'present'
  },
  {
    w: 'W5',
    what: 'hand-made row-id prefixes so two lists do not share a row',
    files: [t('cg003Scripts.ts')],
    pattern: /id: '(padkey|jobline)-' \+/,
    state: 'present'
  },
  {
    w: 'W6',
    what: 'a signal-only `kept` input on Island world, because state is global by name',
    files: [t('cg003Components.ts')],
    pattern: /'Logic\/Island world': \['kept'\]/,
    state: 'present'
  },
  {
    w: 'W7',
    what: 'copies of one engine interpolated into each Function script',
    files: [t('cg002Scripts.ts'), t('cg003Scripts.ts'), t('ig004Island.ts'), t('iw006Shop.ts')],
    pattern: /\$\{(ENGINE|ISLAND_ENGINE)\}/,
    state: 'present'
  },
  {
    w: 'W8',
    what: 'a generated one-output-per-word Translate Function and a portsOf regex mirroring the runtime',
    files: [t('cg002Scripts.ts')],
    pattern: /export function portsOf\(script: string\)/,
    state: 'present'
  },
  {
    w: 'W9',
    what: 'a Static Data table of every word, fed to that Function',
    files: [t('cg003Components.ts')],
    pattern: /source\('Data\/Words', /,
    state: 'present'
  },
  {
    w: 'W10',
    what: '!important on every rule that must beat a node’s inline layout',
    files: [t('cg007Look.ts')],
    pattern: /!important/,
    state: 'present'
  },
  {
    w: 'W11',
    what: 'DOM access from a Function (scrollIntoView, a reflow hack)',
    files: [t('ig004Island.ts')],
    pattern: /scrollIntoView\(|void box\.offsetWidth/,
    state: 'present'
  },
  {
    w: 'W12',
    what: 'a loopback fetch from a Function to the shell’s Olive route',
    files: [t('cg005Olive.ts')],
    pattern: /export const OLIVE_URL = /,
    state: 'present'
  },
  {
    w: 'W13',
    what: 'the kit forces display:grid after the bridge’s merge',
    files: ['library/modules/garden-kit/src/kit.js'],
    pattern: /worldStyle\.display = 'grid'/,
    state: 'present'
  },
  {
    w: 'W14',
    what: 'three.js pinned to the last UMD build; a shim keeps Blockly’s FR and EN messages apart',
    files: ['library/modules/garden-3d-kit/src/kit3d.js'],
    pattern: /0\.158\.0/,
    state: 'present'
  },
  {
    w: 'W15',
    what: 'JOB_VOCABULARY copied into both kits, pinned equal by a test',
    files: ['library/modules/garden-3d-kit/src/kit3d.js', 'library/modules/garden-kit/src/kit.js'],
    pattern: /var JOB_VOCABULARY = \[/,
    state: 'present'
  },
  {
    w: 'W16',
    what: 'NODEGX_KIT_EXTRACT set by hand in a spec; make-worktree.sh links noodl-mcp/dist',
    files: [t('ig007Garden3d.test.ts')],
    pattern: /process\.env\.NODEGX_KIT_EXTRACT = await buildKitExtractor/,
    state: 'present'
  },
  {
    w: 'W17',
    what: 'raw fs writes around the door: the skeleton, module copies, the root node pin',
    files: [t('cg003Template.ts')],
    pattern: /function writeSkeleton\(|fs\.cpSync\(/,
    state: 'present'
  },
  {
    w: 'W18',
    what: 'the run-on-value-change settle, run from test code after authoring',
    files: [t('cg003Template.ts')],
    pattern: /^\s*pinRunOnValueChangeDefaultsInDirectory\(built\.projectDir\);/m,
    state: 'present'
  },
  {
    w: 'W19',
    what: 'id and timestamp pins for byte-identical regeneration',
    files: [t('templatePins.ts')],
    pattern: /function pinComponentDirectory\(/,
    state: 'present'
  },
  {
    w: 'W20',
    what: 'apply_plan with render off, and external CDP drives for what a render cannot do',
    files: [t('cg003Template.ts')],
    pattern: /render: 'off'/,
    state: 'present'
  },
  {
    w: 'W21',
    what: 'the uncollapsible-multi-column warnings pinned as expected noise',
    files: [t('cg003Template.test.ts')],
    pattern: /toEqual\(\['uncollapsible-multi-column'\]\)/,
    state: 'present'
  },
  {
    w: 'W22',
    what: 'kit gates run in a two-module project (D41)',
    files: [t('ig007Garden3d.test.ts')],
    pattern: /the two-module fixture yields/,
    state: 'present'
  }
];

function read(rel: string): string {
  const file = path.join(REPO, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

/** Which of a row's files match, by name — the reading a §8 table records. */
function hits(row: Row): string[] {
  return row.files.filter((f) => row.pattern.test(read(f)));
}

describe('ISL-025 — the census of the island’s workarounds', () => {
  it('known-firing control: the Repeat node is in the viewer’s library, and nodegx deploy has its engine exit code', () => {
    const repeat = read('packages/noodl-viewer-react/src/nodes/std-library/repeat.ts');
    const exitCodes = read('packages/nodegx-export/src/cli/exitCodes.ts');
    expect(/name: 'Repeat'/.test(repeat)).toBe(true);
    expect(/engine: 11/.test(exitCodes)).toBe(true);
    // The same reader over the same tree: every census file exists.
    const missing = WORKAROUNDS.flatMap((r) => r.files).filter((f) => !fs.existsSync(path.join(REPO, f)));
    expect(missing).toEqual([]);
  });

  it('the census lists W1–W22, each once', () => {
    expect(WORKAROUNDS.map((r) => r.w)).toEqual(Array.from({ length: 22 }, (_, i) => `W${i + 1}`));
  });

  it.each(WORKAROUNDS.map((r) => [r.w, r] as const))('%s reads as recorded', (_w, row) => {
    const found = hits(row);
    const state = row.state;
    if (state === 'present') {
      expect({ w: row.w, what: row.what, found }).toEqual({ w: row.w, what: row.what, found: expect.arrayContaining([row.files[0]]) });
      expect(found.length).toBeGreaterThan(0);
    } else if (state === 'removed') {
      expect({ w: row.w, what: row.what, stillIn: found }).toEqual({ w: row.w, what: row.what, stillIn: [] });
    } else {
      // Kept on a ruling: the workaround is there AND the reason sits in the same file.
      const reason = state.kept;
      expect(found.length).toBeGreaterThan(0);
      expect(found.some((f) => read(f).includes(reason))).toBe(true);
    }
  });

  it('W10 counts its !important occurrences, so a later row can show the count falling', () => {
    const count = (read(t('cg007Look.ts')).match(/!important/g) ?? []).length;
    // Read 199 at HEAD 68b1549f5 (the audit's 195 and ISL-025’s 197 were earlier readings of the same stylesheet).
    expect(count).toBeGreaterThan(0);
  });
});

/** The census as a table, for a §8 record: `npx jest tests/isl025Census.test.ts` prints it on a red. */
export function censusTable(): string[] {
  return WORKAROUNDS.map((r) => `${r.w}\t${typeof r.state === 'string' ? r.state : 'kept'}\t${hits(r).length}/${r.files.length}\t${r.what}`);
}
