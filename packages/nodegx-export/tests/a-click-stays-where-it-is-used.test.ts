/**
 * P134-S13-CLICKBUBBLES (Richard's R9, 2026-11-04: "Yes please fix it that drives me nuts"). The running app keeps a click
 * where it is used (`noodl-viewer-react/src/pointerlisteners.ts` `stopsClickPropagation`, FH-015 slice 2): with Click
 * Bubbling on its default, "Automatic", a node whose Click is connected stops the click, so a button inside a clickable
 * card runs the button and not the card; "Never" stops every click, wired or not; "Always" lets it through. Before this,
 * both exports let every click through: planning's Save on the block sheet also ran the backdrop's close.
 *
 * The plan says where (`clickStops`, `clickStopsOf`); the React printer stops the click first in the node's handler, and a
 * "Never" node with no Click of its own gets one that only stops; the HTML printer the same in its listener.
 *
 * Graded on a Click Desk pressed in all three arms with the same hand (`click:<words>`, `helpers/drag-steps.js`): the
 * runtime's own nodes, the React export under StrictMode and the HTML export in jsdom. A card whose Click is wired holds a
 * wired button, plain words, words set to Never, words set to Always with their own Click wired, and a clickable inner
 * group holding plain words. Each Click writes its own Variable "yes"; Reset (outside the card) writes them all "no".
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CatalogIndex, loadCatalog } from '../src/catalog';
import { clickStopsOf, planProject } from '../src/analyze/plan';
import { parseProject } from '../src/parse/parseProject';
import { emitApp } from '../src/emit/emitApp';
import { emitHtmlApp } from '../src/emit/html/emitHtml';
import { htmlArm } from './helpers/export-html-arm';
import { placeAll, writeDeskProject, type RawNode } from './helpers/root-desk';

const catalog = loadCatalog();

const TARGETS = ['card', 'button', 'shared', 'inner'] as const;
const nodes: RawNode[] = [
  { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Click Desk', urlPath: 'home' }, children: ['shell'] },
  { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: ['card', 'reset', ...TARGETS.map((t) => `${t}Text`)], parameters: {} },
  { id: 'card', type: 'Group', label: 'Card', parent: 'shell', children: ['innerButton', 'plainWords', 'keptWords', 'sharedWords', 'innerGroup'], parameters: {} },
  { id: 'innerButton', type: 'net.noodl.controls.button', label: 'Inner button', parent: 'card', parameters: { label: 'Inner button' } },
  { id: 'plainWords', type: 'Text', label: 'Plain words', parent: 'card', parameters: { text: 'Plain words' } },
  { id: 'keptWords', type: 'Text', label: 'Kept words', parent: 'card', parameters: { text: 'Kept words', clickBubbling: 'never' } },
  { id: 'sharedWords', type: 'Text', label: 'Shared words', parent: 'card', parameters: { text: 'Shared words', clickBubbling: 'always' } },
  { id: 'innerGroup', type: 'Group', label: 'Inner group', parent: 'card', children: ['deepWords'], parameters: {} },
  { id: 'deepWords', type: 'Text', label: 'Deep words', parent: 'innerGroup', parameters: { text: 'Deep words' } },
  { id: 'reset', type: 'net.noodl.controls.button', label: 'Reset', parent: 'shell', parameters: { label: 'Reset' } },
  ...TARGETS.map((t): RawNode => ({ id: `${t}Text`, type: 'Text', label: `${t} ran`, parent: 'shell', parameters: {} })),
  ...TARGETS.map((t): RawNode => ({ id: `${t}Var`, type: 'Variable2', label: t, parameters: { name: t, value: 'no' } })),
  ...TARGETS.map((t): RawNode => ({ id: `${t}Yes`, type: 'Set Variable', label: `${t} yes`, parameters: { name: t, value: 'yes' } })),
  ...TARGETS.map((t): RawNode => ({ id: `${t}No`, type: 'Set Variable', label: `${t} no`, parameters: { name: t, value: 'no' } }))
];
const SOURCES: Record<(typeof TARGETS)[number], string> = { card: 'card', button: 'innerButton', shared: 'sharedWords', inner: 'innerGroup' };
const connections = [
  ...TARGETS.map((t) => ({ fromId: SOURCES[t], fromProperty: 'onClick', toId: `${t}Yes`, toProperty: 'do' })),
  ...TARGETS.map((t) => ({ fromId: 'reset', fromProperty: 'onClick', toId: `${t}No`, toProperty: 'do' })),
  ...TARGETS.map((t) => ({ fromId: `${t}Var`, fromProperty: 'value', toId: `${t}Text`, toProperty: 'text' }))
];
const dir = writeDeskProject({ components: { 'Pages/Home': { nodes: placeAll(nodes), connections } } }, { name: 'Click Desk', idBase: 'c0d1a000-0000-4000-8000-0000000016', prefix: 'click-desk-' });
const ir = parseProject(dir, catalog);
const html = emitHtmlApp(ir, catalog);

const STEPS = ['click:Plain words', 'Reset', 'Inner button', 'Reset', 'click:Kept words', 'Reset', 'click:Shared words', 'Reset', 'click:Deep words', 'Reset'];
/** The words on the card, then card · button · shared · inner: predicted from `stopsClickPropagation` before any arm ran. */
const row = (card: string, button: string, shared: string, inner: string): string[] => ['Plain words', 'Kept words', 'Shared words', 'Deep words', card, button, shared, inner];
const NO = row('no', 'no', 'no', 'no');
const EXPECTED = [
  NO,
  row('yes', 'no', 'no', 'no'), // plain words: no Click of their own, so the click reaches the card
  NO,
  row('no', 'yes', 'no', 'no'), // the button's Click is connected: kept there ("Automatic")
  NO,
  NO, // Never: kept, wired or not
  NO,
  row('yes', 'no', 'yes', 'no'), // Always: its own Click, and the card's
  NO,
  row('no', 'no', 'no', 'yes'), // deep words reach the inner group, whose Click is connected: kept there
  NO
];

const run = (script: string, input: unknown): string[][] => {
  try {
    return JSON.parse(
      execFileSync(process.execPath, [path.join(__dirname, 'helpers', script)], {
        input: JSON.stringify(input),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 180000,
        maxBuffer: 16 * 1024 * 1024
      })
    )[0][0];
  } catch (e) {
    return [[`${script} threw: ${String((e as { stderr?: unknown }).stderr ?? e).split('\n')[0]}`]];
  }
};

describe('P134-S13-CLICKBUBBLES — a click stays where it is used, in every export', () => {
  let fromRuntime: string[][];
  let fromReact: string[][];
  let fromHtml: string[][];
  beforeAll(async () => {
    fromRuntime = run('runtime-mounted-arm.js', [{ dir, scenarios: [STEPS] }]);
    const reactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'click-desk-react-'));
    for (const [file, text] of Object.entries(emitApp(ir, catalog).files)) {
      fs.mkdirSync(path.dirname(path.join(reactDir, file)), { recursive: true });
      fs.writeFileSync(path.join(reactDir, file), text);
    }
    fromReact = run('export-react-arm.js', [{ dir: reactDir, scenarios: [STEPS], settled: true }]);
    fromHtml = (await htmlArm(html.files, [STEPS], {}))[0];
  }, 300000);

  it('C0. nothing on the desk is left out, and the plan refuses nothing', () => {
    expect(html.preflight.htmlLosses).toEqual([]);
    expect(html.preflight.planRefusals).toEqual([]);
  });

  it('C1. the running app keeps the click at the card, the button, the inner group, the Never words and Reset; not at the plain words, the Always words or the shell', () => {
    const plan = planProject(ir, new CatalogIndex(catalog)).plans.find((p) => p.path === 'Pages/Home')!;
    const component = ir.components.find((c) => c.path === 'Pages/Home')!;
    expect([...clickStopsOf(component, plan.roleOf)].sort()).toEqual(['card', 'innerButton', 'innerGroup', 'keptWords', 'reset']);
  });

  it('C1b. R10: the export prints a stop only where something above listens — the button, the inner group and the Never words sit in the card; the card and Reset have nothing above them', () => {
    const plan = planProject(ir, new CatalogIndex(catalog)).plans.find((p) => p.path === 'Pages/Home')!;
    expect([...plan.clickStops].sort()).toEqual(['innerButton', 'innerGroup', 'keptWords']);
    // The printed page says the same: three stops, one per kept node (the absence of the card's and Reset's read beside them).
    expect(html.files['pages/Home.js'].match(/event\.stopPropagation\(\)/g)).toHaveLength(3);
    expect(Object.values(emitApp(ir, catalog).files).join('\n').match(/event\.stopPropagation\(\)/g)).toHaveLength(3);
  });

  it('C2. the running app reads the prediction at every press (the reference, read first)', () => {
    expect(fromRuntime).toEqual(EXPECTED);
  });

  it('C3. the React export reads what the running app reads at every press', () => {
    expect(fromReact).toEqual(fromRuntime);
  });

  it('C4. the HTML export reads what the running app reads at every press', () => {
    expect(fromHtml).toEqual(fromRuntime);
  });

  it('C6. R10 follows a component to where it is placed: under a wired Click as an instance or as a For Each row, the stop is kept; placed where nothing listens, it is not', () => {
    const button = (id: string, parent: string): RawNode => ({ id, type: 'net.noodl.controls.button', label: id, parent, parameters: { label: id } });
    const done = (id: string): RawNode => ({ id, type: 'Set Variable', label: `${id} ran`, parameters: { name: id, value: 'yes' } });
    const graph = (nodes: RawNode[], clicks: string[]) => ({
      nodes: placeAll([...nodes, ...clicks.map((c) => done(`${c}Ran`))]),
      connections: clicks.map((c) => ({ fromId: c, fromProperty: 'onClick', toId: `${c}Ran`, toProperty: 'do' }))
    });
    const placedDir = writeDeskProject(
      {
        components: {
          'Pages/Home': graph(
            [
              { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Placed', urlPath: 'home' }, children: ['card', 'lone'] },
              { id: 'card', type: 'Group', label: 'Card', parent: 'page', children: ['row', 'list'], parameters: {} },
              { id: 'row', type: '/Row', label: 'Row', parent: 'card', parameters: {} },
              { id: 'list', type: 'For Each', label: 'List', parent: 'card', parameters: { template: '/Item', items: [{ id: 'a' }] } },
              { id: 'lone', type: '/Lone', label: 'Lone', parent: 'page', parameters: {} }
            ],
            ['card']
          ),
          Row: graph([{ id: 'rowRoot', type: 'Group', label: 'Row root', children: ['rowButton'], parameters: {} }, button('rowButton', 'rowRoot')], ['rowButton']),
          Item: graph([{ id: 'itemRoot', type: 'Group', label: 'Item root', children: ['itemButton'], parameters: {} }, button('itemButton', 'itemRoot')], ['itemButton']),
          Lone: graph([{ id: 'loneRoot', type: 'Group', label: 'Lone root', children: ['loneButton'], parameters: {} }, button('loneButton', 'loneRoot')], ['loneButton'])
        }
      },
      { name: 'Placed Desk', idBase: 'c0d1a000-0000-4000-8000-0000000017', prefix: 'placed-desk-' }
    );
    const placedIr = parseProject(placedDir, catalog);
    const plans = planProject(placedIr, new CatalogIndex(catalog)).plans;
    const stops = (p: string) => plans.find((x) => x.path === p)!.clickStops;
    // The running app's rule names every wired button (the control: the rule is not what drops Lone's).
    expect(clickStopsOf(placedIr.components.find((c) => c.path === 'Lone')!, plans.find((x) => x.path === 'Lone')!.roleOf)).toEqual(['loneButton']);
    expect(stops('Row')).toEqual(['rowButton']);
    expect(stops('Item')).toEqual(['itemButton']);
    expect(stops('Lone')).toEqual([]);
    expect(stops('Pages/Home')).toEqual([]);
  });

  it('C5. a mutant that lets the button\'s click through runs the card too (killed, in the HTML export)', async () => {
    const home = html.files['pages/Home.js'];
    const stop = /(innerButton\.addEventListener\('click', function \(event\) \{\n\s*)event\.stopPropagation\(\);\n/;
    expect(home).toMatch(stop);
    const readings = (await htmlArm({ ...html.files, 'pages/Home.js': home.replace(stop, '$1') }, [STEPS.slice(2, 3)], {}))[0];
    expect(readings[1]).toEqual(row('yes', 'yes', 'no', 'no'));
  }, 120000);
});
