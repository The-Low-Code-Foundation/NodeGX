/**
 * GAM-018 AC4 — a kit registers in the extractor the same whatever is installed beside it.
 *
 * ## What this grades
 *
 * The extractor's `Noodl` used to be a catch-all Proxy answering every missing member with a
 * noop function. A shipped kit that feature-tests `typeof Noodl.defineNode === "function"` was
 * told yes, skipped installing its SDK, and handed `defineModule` a Proxy for a node:
 * `registration failed: Cannot convert object to primitive value`. 10 shipped kits registered
 * nothing alone, and registered only when an unguarded kit that installs a real `defineNode`
 * happened to be **scanned first**. R2 (Richard, 2026-09-16): shape it like the page.
 *
 * Every arm uses the shipped kits from `library/modules`, not fixtures, because the guard is the
 * SDK shape those kits share. `keyboard-shortcuts` never feature-tests `defineNode` and registers
 * in every arm, before and after: it is the known-firing signal beside each reading.
 *
 * ## The arms that were red at HEAD `42ba09e24`
 *
 * - confetti alone: 0 nodes, the Proxy message.
 * - confetti scanned BEFORE an unguarded kit (`zz-` prefix): 0 of confetti's. The same unguarded
 *   kit scanned first rescued it, which is what made the defect depend on neighbours.
 * - `noodl-validation-module` alone: 0 nodes and **no failure at all**, a silent zero.
 * - keyboard + confetti: keyboard's one node only.
 *
 * Reverted arm (s17): `entry.js`'s old Proxy restored, the four `it`s above go red with exactly
 * those readings and the keyboard control stays green. See GAM-018 §8.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { clearProjectOverlay, extractProjectOverlay } from '../src/kitOverlay';
import type { ProjectInfoResponse } from '../src/tools/responses';
import { buildKitExtractor, connect, copyFixture } from './helpers';

const LIBRARY = path.resolve(__dirname, '..', '..', '..', 'library', 'modules');

/** [module folder under library/modules, kit folder under its noodl_modules] */
const KIT = {
  keyboard: ['keyboard-shortcuts', 'keyboard-shortcuts'],
  confetti: ['confetti', 'nodegx-confetti'],
  customHtml: ['custom-html', 'custom-html-module'],
  validation: ['form-validation', 'noodl-validation-module']
} as const;

let tempDir: string;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gam018-'));
  process.env.NODEGX_KIT_EXTRACT = await buildKitExtractor(tempDir);
}, 120_000);

afterEach(() => {
  clearProjectOverlay();
});

afterAll(() => {
  delete process.env.NODEGX_KIT_EXTRACT;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

/** A project holding only these kits, each copied under the folder name given (scan order is name order). */
function project(name: string, kits: Array<{ kit: readonly [string, string]; as?: string }>): string {
  const dir = path.join(tempDir, name);
  fs.mkdirSync(path.join(dir, 'noodl_modules'), { recursive: true });
  for (const { kit, as } of kits) {
    fs.cpSync(path.join(LIBRARY, kit[0], 'project', 'noodl_modules', kit[1]), path.join(dir, 'noodl_modules', as ?? kit[1]), {
      recursive: true
    });
  }
  return dir;
}

function read(dir: string) {
  const overlay = extractProjectOverlay(dir);
  return {
    unavailable: overlay.unavailable,
    failures: overlay.failures,
    types: overlay.nodes.map((n) => n.typeName).sort()
  };
}

describe('a guarded kit registers without a neighbour', () => {
  it('known-firing: keyboard-shortcuts alone registers its node', () => {
    expect(read(project('keyboard', [{ kit: KIT.keyboard }]))).toEqual({
      unavailable: undefined,
      failures: [],
      types: ['keyboard-shortcuts.KeyboardShortcut']
    });
  });

  it('confetti alone registers its node', () => {
    expect(read(project('confetti', [{ kit: KIT.confetti }]))).toEqual({
      unavailable: undefined,
      failures: [],
      types: ['nodegx.confetti']
    });
  });

  it('confetti beside a kit that does not rescue it still registers', () => {
    expect(read(project('keyboard-confetti', [{ kit: KIT.keyboard }, { kit: KIT.confetti }]))).toEqual({
      unavailable: undefined,
      failures: [],
      types: ['keyboard-shortcuts.KeyboardShortcut', 'nodegx.confetti']
    });
  });

  it('confetti registers whether an unguarded kit scans before it or after it', () => {
    const before = read(project('html-first', [{ kit: KIT.customHtml, as: 'aa-custom-html-module' }, { kit: KIT.confetti }]));
    const after = read(project('html-after', [{ kit: KIT.confetti }, { kit: KIT.customHtml, as: 'zz-custom-html-module' }]));
    expect({ before, after }).toEqual({
      before: { unavailable: undefined, failures: [], types: ['module.inlineHtml', 'nodegx.confetti'] },
      after: { unavailable: undefined, failures: [], types: ['module.inlineHtml', 'nodegx.confetti'] }
    });
  });
});

describe('a kit that tested the catch-all for truthiness', () => {
  it('noodl-validation-module alone registers its node (it was a silent zero, no failure named)', () => {
    expect(read(project('validation', [{ kit: KIT.validation }]))).toEqual({
      unavailable: undefined,
      failures: [],
      types: ['noodl.net.validate']
    });
  });
});

describe('AC6 — a kit that runs and registers nothing is named', () => {
  /**
   * The shape confetti takes in a page without its SDK shim: a guard that returns, and no throw.
   * CN-015's `failures` cannot see it, and before this `get_project_info` listed it only as an empty
   * `nodeTypes`, the same as a kit with nothing wrong that happens to be empty on purpose.
   * keyboard-shortcuts registering in the same project is the known-firing signal.
   *
   * Reverted arm (s17): the `registeredNothing` spread removed from `kitsReport`, this goes red with
   * `registeredNothing: undefined` while `modules` still reads the same.
   */
  it('get_project_info names it with the reason, beside a kit that registered', async () => {
    const dir = copyFixture();
    const kits = path.join(dir, 'noodl_modules');
    fs.mkdirSync(kits, { recursive: true });
    fs.cpSync(path.join(LIBRARY, KIT.keyboard[0], 'project', 'noodl_modules', KIT.keyboard[1]), path.join(kits, KIT.keyboard[1]), {
      recursive: true
    });
    fs.mkdirSync(path.join(kits, 'silent-kit'));
    fs.writeFileSync(
      path.join(kits, 'silent-kit', 'manifest.json'),
      JSON.stringify({ name: 'Silent Kit', main: 'index.js', runtimes: ['browser'], dependencies: [] })
    );
    fs.writeFileSync(
      path.join(kits, 'silent-kit', 'index.js'),
      "(function () {\n  if (typeof Noodl.defineNode !== 'function') return;\n  Noodl.defineModule({ nodes: [Noodl.defineNode({ name: 'silent.kit.Never' })] });\n})();\n"
    );

    const session = await connect(dir, false);
    try {
      const result = await session.client.callTool({ name: 'get_project_info', arguments: {} });
      const payload = JSON.parse((result.content as Array<{ text: string }>)[0].text) as ProjectInfoResponse;
      expect({
        modules: payload.kits?.modules,
        failures: payload.kits?.failures,
        registeredNothing: payload.kits?.registeredNothing
      }).toEqual({
        modules: [
          { name: 'Keyboard Shortcuts', dirPath: 'noodl_modules/keyboard-shortcuts', nodeTypes: ['keyboard-shortcuts.KeyboardShortcut'] },
          { name: 'Silent Kit', dirPath: 'noodl_modules/silent-kit', nodeTypes: [] }
        ],
        failures: undefined,
        registeredNothing: [
          {
            kitModule: 'Silent Kit',
            message: expect.stringContaining('kit "Silent Kit" loaded without error but registered no nodes.')
          }
        ]
      });
    } finally {
      await session.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
