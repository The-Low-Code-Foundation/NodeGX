/**
 * A Router's own six inputs (P18-S110-ROUTERSELF; EXP-008, P18 session 112).
 *
 * The export collapses the Router into `App.tsx` (`plan.ts` `routerShellDisposition`): it renders the pages
 * straight into the route table, with no Router element. So one of the six is carried and five are said:
 *
 *   urlPath     — CARRIED. `router.tsx` puts `_trimUrlPart(urlPath) + '/'` in front of every page pattern it
 *                 matches (`matchPageFromUrl`) and every URL it pushes (`getNavigationRelativeURL`), so the
 *                 exported route table and every exported `navigate(…)` carry the same prefix.
 *   mounted     — SAID. Unticked, the runtime keeps the Router out of the tree (`react-component-node.ts`
 *                 `mounted`), so the app shows no page; the export routes every page.
 *   backgroundColor, clip, cssClassName, styleCss — SAID, one sentence naming each authored one. They style
 *                 the Router's own element; the export has none to put them on. A wrapper would change every
 *                 exported page's layout and was not rendered; the corpus has 1 authored value in 227 Routers.
 *
 * Every case has its control: the fixture unvaried says nothing of the kind, and each port at its default
 * leaves the export byte-identical.
 */
import * as path from 'path';

import { loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import type { ExportIR, ParamValue } from '../src/ir/types';

const catalog = loadCatalog();
const FIXTURES = path.join(__dirname, 'fixtures');
const parsed = new Map<string, ExportIR>();
const irOf = (fixture: string): ExportIR => {
  if (!parsed.has(fixture)) parsed.set(fixture, parseProject(path.join(FIXTURES, fixture), catalog));
  return structuredClone(parsed.get(fixture)!);
};

/** cheer's one Router gets `name` = `value`. */
const varied = (name: string, value: ParamValue): ExportIR => {
  const ir = irOf('cheer');
  const router = ir.components.flatMap((c) => c.nodes).find((n) => n.type === 'Router')!;
  router.parameters = [...router.parameters.filter((p) => p.name !== name), { name, value }];
  return ir;
};
const lit = (value: string | number | boolean): ParamValue => ({ kind: 'literal', value });

/** cheer's Router gets a wire into `port`, from the first other node in its component. */
const wired = (port: string): ExportIR => {
  const ir = irOf('cheer');
  const shell = ir.components.find((c) => c.nodes.some((n) => n.type === 'Router'))!;
  const router = shell.nodes.find((n) => n.type === 'Router')!;
  const from = shell.nodes.find((n) => n.id !== router.id) ?? router;
  shell.connections.push({
    key: `${from.id}:value->${router.id}:${port}`,
    fromId: from.id,
    fromProperty: 'value',
    toId: router.id,
    toProperty: port,
    kind: 'value'
  } as (typeof shell.connections)[number]);
  return ir;
};

const base = emitApp(irOf('cheer'), catalog);
const notesOf = (ir: ExportIR): string => emitApp(ir, catalog).notes.join('\n');

describe('urlPath — carried: every route and every navigate wear the prefix', () => {
  it('"shop": the routes are /shop/<page>, and Home navigates to /shop/mood', () => {
    const app = emitApp(varied('urlPath', lit('shop')), catalog);
    const shell = app.files['src/App.tsx'];
    expect(shell).toContain('<Route path="/shop/home" element={<HomePage />} />');
    expect(shell).toContain('<Route path="/shop/mood" element={<MoodPage />} />');
    expect(shell).toContain('<Route path="/shop/notes" element={<NotesPage />} />');
    // The start page still answers the bare origin, as the runtime's does when no pattern matches.
    expect(shell).toContain('<Route path="/" element={<HomePage />} />');
    expect(app.files['src/pages/Home.tsx']).toContain("navigate('/shop/mood')");
    // Control: unvaried, nothing wears it.
    expect(base.files['src/App.tsx']).not.toContain('/shop');
    expect(base.files['src/pages/Home.tsx']).toContain("navigate('/mood')");
  });

  it('trimmed as the runtime trims it: "/shop/" is "shop"', () => {
    expect(emitApp(varied('urlPath', lit('/shop/')), catalog).files).toEqual(emitApp(varied('urlPath', lit('shop')), catalog).files);
  });

  it('a nested prefix keeps its slashes: "a/b" gives /a/b/<page>', () => {
    expect(emitApp(varied('urlPath', lit('a/b')), catalog).files['src/App.tsx']).toContain('<Route path="/a/b/mood"');
  });

  it('blank is none: the export is byte-identical to the unvaried one', () => {
    const blank = emitApp(varied('urlPath', lit('')), catalog);
    expect(blank.files).toEqual(base.files);
    expect(blank.notes).toEqual(base.notes);
  });

  it('wired: the routes carry no prefix, and the export says so', () => {
    const sentence = "its Url Path is wired — the running app puts the value in front of every page's path; the exported routes carry none";
    expect(notesOf(irOf('cheer'))).not.toContain(sentence);
    expect(notesOf(wired('urlPath'))).toContain(sentence);
  });
});

describe('mounted — said', () => {
  const unticked = 'its Mounted is unticked — the running app renders no Router, so it shows no page at all; this export routes every page';
  const wire = 'its Mounted is wired — the running app shows no page while the value is false; this export always routes';

  it('unticked: said by name, against the unvaried control', () => {
    expect(notesOf(irOf('cheer'))).not.toContain(unticked);
    expect(notesOf(varied('mounted', lit(false)))).toContain(unticked);
  });

  it('ticked is the default: the export is byte-identical, notes included', () => {
    const ticked = emitApp(varied('mounted', lit(true)), catalog);
    expect(ticked.files).toEqual(base.files);
    expect(ticked.notes).toEqual(base.notes);
  });

  it('wired: said by name', () => {
    expect(notesOf(irOf('cheer'))).not.toContain(wire);
    expect(notesOf(wired('mounted'))).toContain(wire);
  });
});

describe("the Router's own style — said, one sentence naming each authored port", () => {
  const tail = 'not carried — the export renders the pages with no Router element to put it on';
  const cases: Array<[string, ParamValue, string]> = [
    ['backgroundColor', lit('#ff0000'), 'Background Color'],
    ['backgroundColor', lit('var(--background)'), 'Background Color'],
    ['clip', lit('scroll'), 'Clip Behavior'],
    ['clip', lit('clip'), 'Clip Behavior'],
    ['cssClassName', lit('app-shell'), 'CSS Class'],
    ['styleCss', lit('border: 1px solid red;'), 'CSS Style'],
    ['styleCss', { kind: 'script', source: 'border: 1px solid red;' }, 'CSS Style']
  ];
  it.each(cases)('%s = %j names %s', (port, value, label) => {
    expect(notesOf(irOf('cheer'))).not.toContain(tail);
    const notes = notesOf(varied(port, value));
    expect(notes).toContain(`its own ${label} is ${tail}`);
  });

  const defaults: Array<[string, ParamValue]> = [
    ['backgroundColor', lit('transparent')],
    ['backgroundColor', lit('')],
    ['clip', lit('contentHeight')],
    ['cssClassName', lit('')],
    ['cssClassName', lit('   ')],
    // The port's own default is a comment: it declares nothing.
    ['styleCss', lit('/* background-color: red; */')],
    ['styleCss', { kind: 'script', source: '  ' }]
  ];
  it.each(defaults)('%s = %j paints nothing: the export is byte-identical', (port, value) => {
    const app = emitApp(varied(port, value), catalog);
    expect(app.files).toEqual(base.files);
    expect(app.notes).toEqual(base.notes);
  });

  it('several authored at once are one sentence, in panel order', () => {
    const ir = varied('styleCss', lit('border: 0;'));
    const router = ir.components.flatMap((c) => c.nodes).find((n) => n.type === 'Router')!;
    router.parameters.push({ name: 'backgroundColor', value: lit('#fff') }, { name: 'clip', value: lit('clip') });
    const notes = notesOf(ir);
    expect(notes).toContain(`its own Background Color, Clip Behavior and CSS Style are not carried`);
    expect(notes.split('not carried — the export renders the pages with no Router element').length - 1).toBe(1);
  });

  it('a wired style port is authored too', () => {
    expect(notesOf(wired('backgroundColor'))).toContain(`its own Background Color is ${tail}`);
  });
});
