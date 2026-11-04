/**
 * P134 session 12 — the smaller kinds the HTML printer left out after session 11, each the React printer's way:
 *
 * - §A **Animate To Value** (EXP-011 §49; rocket-school's and star-class's Countdown bar): React's `useAnimatedValue` as
 *   a value and an `l.watch` over the same engine (`lib/animate.js`). On the React work's Glow Desk (copied with its page
 *   at Home and the Fade's Duration 0, `helpers/glow-home-desk.ts`), the HTML export reads what the React export reads
 *   at every step before a tween has run a frame, then settles on the target and says "arrived" once — the node's own
 *   rule at Duration 0. The React arm reads before a frame has run (it does not wait for two readings to agree), so its
 *   Fade stays where the tween began: the harness's, pinned, not a printed difference. The runtime arm mounts no Animate
 *   To Value.
 * - §B **the small utilities** (EXP-011 Tier 2.7, HiveClip's Boolean To String ×3): `lib/util.js` is React's `util.ts`
 *   with its types out (generated, made again here), and the call is printed as React prints it.
 * - §C **External Link** (DEF-016, EXP-011 §14; marketplace ×4, landing-pages): run in jsdom against a prediction from
 *   the runtime's `externallink.ts` — an empty link refused before the browser is asked, with "No link to open" in the
 *   failure arm; a new tab opened `noopener,noreferrer`; `_self` with no features; Done after each.
 * - **A failed sign-in's Error** (planning ×3) and **a Record's Fetch and columns** (members-area ×8) are graded by
 *   the census and the printed code here; a backend desk for them is owed (README §10 session 12).
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadCatalog } from '../src/catalog';
import { parseProject } from '../src/parse/parseProject';
import { emitApp } from '../src/emit/emitApp';
import { emitHtmlApp } from '../src/emit/html/emitHtml';
import { UTIL_JS } from '../src/emit/html/utilJs';
import { utilLibSource } from '../src/emit/utilLib';
import { htmlArm } from './helpers/export-html-arm';
import { htmlUtilJs } from './helpers/html-core-js';
import { openHtmlExport } from './helpers/html-in-jsdom';
import { writeGlowHomeDesk } from './helpers/glow-home-desk';
import { placeAll, writeDeskProject, type RawNode } from './helpers/root-desk';

const catalog = loadCatalog();

describe('§A Animate To Value, on the Glow Desk', () => {
  const STEPS = ['Level high', 'Level low', 'Toggle', 'Bright', 'Dim', 'Want on', 'Want bad', 'Level high'];
  const FADE = 9;
  const ARRIVED = 10;
  const dir = writeGlowHomeDesk();
  const ir = parseProject(dir, catalog);
  const html = emitHtmlApp(ir, catalog);
  let fromReact: string[][];
  let fromHtml: string[][];
  beforeAll(async () => {
    const reactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glow-home-react-'));
    for (const [file, text] of Object.entries(emitApp(ir, catalog).files)) {
      fs.mkdirSync(path.dirname(path.join(reactDir, file)), { recursive: true });
      fs.writeFileSync(path.join(reactDir, file), text);
    }
    try {
      fromReact = JSON.parse(
        execFileSync(process.execPath, [path.join(__dirname, 'helpers', 'export-react-arm.js')], {
          input: JSON.stringify([{ dir: reactDir, scenarios: [STEPS], settled: true }]),
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 180000,
          maxBuffer: 16 * 1024 * 1024
        })
      )[0][0];
    } catch (e) {
      fromReact = [[`the React arm threw: ${String((e as { stderr?: unknown }).stderr ?? e).split('\n')[0]}`]];
    }
    fromHtml = (await htmlArm(html.files, [STEPS]))[0];
  }, 300000);

  it('A0. nothing on the desk is left out', () => {
    expect(html.preflight.htmlLosses).toEqual([]);
  });

  it('A1. before a tween has run a frame, the HTML export reads what the React export reads, cell for cell (the first target taken at once: 0 → 1)', () => {
    expect(fromHtml.slice(0, 4)).toEqual(fromReact.slice(0, 4));
    expect(fromHtml[1][FADE]).toBe('1');
  });

  it('A2. every other cell equals React at every step (the States, the follower, the outcomes)', () => {
    const others = (rows: string[][]) => rows.map((r) => r.filter((_, i) => i !== FADE && i !== ARRIVED));
    expect(others(fromHtml)).toEqual(others(fromReact));
  });

  it('A3. once a frame has run, the HTML export is at Level low’s target and has said "arrived" (Duration 0, the node’s rule)', () => {
    expect(fromHtml.some((r) => r[FADE] === '0' && r[ARRIVED] === 'arrived')).toBe(true);
    // The React arm reads before a frame has run: its Fade stays at the target the tween began from (the harness's).
    expect(fromReact.slice(2).every((r) => r[FADE] === '1' && r[ARRIVED] === '')).toBe(true);
  });

  it('A4. printed over the engine React’s hook runs, made once and stopped when the part goes', () => {
    const page = Object.entries(html.files).find(([f]) => /Home\.js$/.test(f))?.[1] ?? '';
    expect(page).toMatch(/= createAnimatedValue\(untracked\(function \(\) \{/);
    expect(page).toMatch(/animateTo\(\w+, target, function \(now\) \{/);
    expect(page).toMatch(/stopRun\(\w+\.run\);/);
    expect(html.files['lib/animate.js']).toBeDefined();
  });
});

describe('§B the small utilities', () => {
  it('B1. lib/util.js is React’s util.ts with its types out (generated; made again here)', () => {
    expect(UTIL_JS).toBe(htmlUtilJs());
    expect(utilLibSource()).toContain('export function booleanToString(');
  });

  it('B2. booleanToString answers as React’s does, value for value', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ts = require('typescript') as typeof import('typescript');
    const load = (text: string, isTs: boolean) => {
      const js = isTs ? ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText : ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, allowJs: true } }).outputText;
      const module = { exports: {} as Record<string, any> };
      // eslint-disable-next-line no-new-func
      new Function('exports', 'module', 'document', js)(module.exports, module, undefined);
      return module.exports;
    };
    const ours = load(UTIL_JS, false);
    const react = load(utilLibSource(), true);
    for (const v of [true, false, 'true', 'false', '', 'x', 0, 1, null, undefined, [], {}]) {
      expect(ours.booleanToString(v, 'Pause', 'Play')).toBe(react.booleanToString(v, 'Pause', 'Play'));
    }
  });

  it('B3. HiveClip’s three Boolean To String labels are printed, nothing named for them', () => {
    const hive = '/Users/richardosborne/vscode_projects/hiveclip/ui';
    if (!fs.existsSync(hive)) return; // HiveClip is Richard's, on this machine only.
    const out = emitHtmlApp(parseProject(hive, catalog), catalog);
    expect(out.preflight.htmlLosses.filter((l) => /util-call/.test(l.what))).toEqual([]);
    const calls = Object.entries(out.files).filter(([f, t]) => f.endsWith('.js') && !f.startsWith('lib/') && t.includes('booleanToString('));
    expect(calls.length).toBeGreaterThanOrEqual(3);
    expect(out.files['lib/util.js']).toBe(UTIL_JS);
  });
});

describe('§C External Link', () => {
  const nodes: RawNode[] = [
    { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Link Desk', urlPath: 'home' }, children: ['shell'] },
    { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: ['saidText', 'b0', 'b1', 'b2'], parameters: {} },
    { id: 'saidText', type: 'Text', label: 'Said', parent: 'shell', parameters: {} },
    { id: 'b0', type: 'net.noodl.controls.button', label: 'Open', parent: 'shell', parameters: { label: 'Open' } },
    { id: 'b1', type: 'net.noodl.controls.button', label: 'Open empty', parent: 'shell', parameters: { label: 'Open empty' } },
    { id: 'b2', type: 'net.noodl.controls.button', label: 'Open here', parent: 'shell', parameters: { label: 'Open here' } },
    { id: 'saidVar', type: 'Variable2', label: 'Said', parameters: { name: 'said', value: 'said nothing' } },
    { id: 'whereVar', type: 'Variable2', label: 'Where', parameters: { name: 'where', value: '' } },
    { id: 'linkA', type: 'net.noodl.externallink', label: 'Open the site', parameters: { link: 'https://example.com/a', openInNewTab: true } },
    { id: 'linkB', type: 'net.noodl.externallink', label: 'Open where', parameters: { openInNewTab: true } },
    { id: 'linkC', type: 'net.noodl.externallink', label: 'Open here', parameters: { link: 'https://example.com/c', openInNewTab: false } },
    { id: 'sayA', type: 'Set Variable', label: 'Say opened', parameters: { name: 'said', value: 'opened a' } },
    { id: 'sayB', type: 'Set Variable', label: 'Say opened b', parameters: { name: 'said', value: 'opened b' } },
    { id: 'sayErr', type: 'Set Variable', label: 'Say why', parameters: { name: 'said' } },
    { id: 'sayC', type: 'Set Variable', label: 'Say opened here', parameters: { name: 'said', value: 'opened here' } }
  ];
  const connections = [
    { fromId: 'b0', fromProperty: 'onClick', toId: 'linkA', toProperty: 'do' },
    { fromId: 'b1', fromProperty: 'onClick', toId: 'linkB', toProperty: 'do' },
    { fromId: 'b2', fromProperty: 'onClick', toId: 'linkC', toProperty: 'do' },
    { fromId: 'whereVar', fromProperty: 'value', toId: 'linkB', toProperty: 'link' },
    { fromId: 'linkA', fromProperty: 'done', toId: 'sayA', toProperty: 'do' },
    { fromId: 'linkB', fromProperty: 'done', toId: 'sayB', toProperty: 'do' },
    { fromId: 'linkB', fromProperty: 'failure', toId: 'sayErr', toProperty: 'do' },
    { fromId: 'linkB', fromProperty: 'error', toId: 'sayErr', toProperty: 'value' },
    { fromId: 'linkC', fromProperty: 'done', toId: 'sayC', toProperty: 'do' },
    { fromId: 'saidVar', fromProperty: 'value', toId: 'saidText', toProperty: 'text' }
  ];
  const dir = writeDeskProject({ components: { 'Pages/Home': { nodes: placeAll(nodes), connections } } }, { name: 'Link Desk', idBase: 'c0d1a000-0000-4000-8000-0000000015', prefix: 'link-desk-' });
  const html = emitHtmlApp(parseProject(dir, catalog), catalog);

  it('C0. nothing on the desk is left out, and the plan refuses nothing', () => {
    expect(html.preflight.htmlLosses).toEqual([]);
    expect(html.preflight.planRefusals).toEqual([]);
  });

  it('C1. the runtime’s rules, step by step: a new tab opened bare, an empty link refused unasked, `_self` with no features', async () => {
    const opened: unknown[][] = [];
    const page = await openHtmlExport(html.files, '', {}, { prepare: (w) => (w.open = (...args: unknown[]) => (opened.push(args), null)) });
    const press = async (label: string) => {
      const button = [...page.document.querySelectorAll('button')].find((b: any) => b.textContent.trim() === label) as any;
      button.click();
      await page.settle();
      return [page.text(), opened.length];
    };
    expect(page.text()).toContain('said nothing');
    expect(await press('Open')).toEqual([expect.stringContaining('opened a'), 1]);
    expect(opened[0]).toEqual(['https://example.com/a', '_blank', 'noopener,noreferrer']);
    // No user activation to read in jsdom: no claim, so Done (the runtime's degradation). An empty link is never asked.
    expect(await press('Open empty')).toEqual([expect.stringContaining('No link to open'), 1]);
    expect(await press('Open here')).toEqual([expect.stringContaining('opened here'), 2]);
    expect(opened[1]).toEqual(['https://example.com/c', '_self', '']);
    page.close();
  });

  it('C2. the activation is read before the call (DEF-016: the call consumes it)', () => {
    const home = Object.entries(html.files).find(([f]) => /Home\.js$/.test(f))?.[1] ?? '';
    const read = home.indexOf('navigator.userActivation?.isActive === false');
    expect(read).toBeGreaterThan(-1);
    expect(home.indexOf("window.open(", read)).toBeGreaterThan(read);
  });
});
