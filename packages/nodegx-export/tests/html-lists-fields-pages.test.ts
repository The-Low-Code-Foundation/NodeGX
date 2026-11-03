/**
 * P134 HTX-003 — the jobs React did without anyone writing them: a text field told what to do, a part that mounts and
 * unmounts, a list that keeps each row with its item.
 *
 * §A a text field's Set, Clear, Focus, Blur, Enter, its typing chain and its announcement at mount (P18-S128-FIELDSET,
 * P18-S127-CLEAROUT, P18-S116-FIELDMOUNT), graded the way the React export was (`the-field-does-what-it-is-told.test.ts`):
 * the Field Desk and its three variants, driven step by step in the HTML export (`helpers/export-html-arm.ts`, jsdom)
 * against the runtime's own nodes (`helpers/runtime-mounted-arm.js`), predicted in
 * `phase-18-code-export-v2/s129-fieldset/EXPECTED.md`.
 *
 * §B a root and an element a value mounts, and a Did Mount each time it mounts (P18 session 126, EXP-011 §93): the Root
 * Desk and its two variants, as `the-root-is-mounted-when-it-says.test.ts` grades React, predicted in `s126-mounted/EXPECTED.md`.
 *
 * §C `lib/dom.js` on its own, in jsdom: a keyed list (add three, delete the middle one, reorder: no row is made again
 * for an item that stayed) and the effects a part makes, all stopped when it goes (the same count after a hundred
 * shows and hides, rows and nested parts in it).
 *
 * §D the cursor: a field whose text round-trips through state keeps the focus and the caret while a person types.
 */

import { execFileSync } from 'child_process';
import * as path from 'path';

import { loadCatalog } from '../src/catalog';
import { parseProject } from '../src/parse/parseProject';
import { emitHtmlApp } from '../src/emit/html/emitHtml';
import { CORE_JS } from '../src/emit/html/coreJs';
import { DOM_JS } from '../src/emit/html/libJs';
import { htmlArm } from './helpers/export-html-arm';
import { openHtmlExport } from './helpers/html-in-jsdom';
import { writeFieldDesk } from './helpers/field-desk';
import { writeDesk as writeRootDesk, type Desk } from './helpers/root-desk';

const catalog = loadCatalog();

const runtimeArm = (projects: Array<{ dir: string; scenarios: string[][]; fields?: boolean }>): string[][][][] => {
  try {
    return JSON.parse(
      execFileSync(process.execPath, [path.join(__dirname, 'helpers', 'runtime-mounted-arm.js')], {
        input: JSON.stringify(projects),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 180000,
        maxBuffer: 16 * 1024 * 1024
      })
    );
  } catch (e) {
    const said = String((e as { stderr?: unknown }).stderr ?? e).split('\n')[0];
    return projects.map((p) => p.scenarios.map(() => [[`the runtime arm threw: ${said}`]]));
  }
};
const htmlOf = async (dir: string, steps: string[], fields: boolean): Promise<string[][] | string> => {
  try {
    return (await htmlArm(emitHtmlApp(parseProject(dir, catalog), catalog).files, [steps], { fields }))[0];
  } catch (e) {
    return String(e);
  }
};
const lossesOf = (dir: string): string[] => emitHtmlApp(parseProject(dir, catalog), catalog).preflight.htmlLosses.map((l) => `${l.component} ${l.label ?? l.nodeId}: ${l.what}`);

/** The variants `the-field-does-what-it-is-told.test.ts` drives React through, with its steps. */
const untick = (d: Desk): void => {
  d.components['Pages/Home'].nodes.find((n) => n.id === 'nameField')!.parameters['runOnChange-startValue'] = false;
};
const FIELD_VARIANTS: Array<{ name: string; edit?: (d: Desk) => void; steps: string[] }> = [
  { name: 'the desk', steps: ['Fill', 'type:name:Zed', 'Reset', 'Wipe', 'Focus', 'Reset', 'Blur', 'Reset', 'Fill', 'Focus title', 'enter:title', 'Form fill', 'type:form:Dee', 'Form fill', 'Form focus'] },
  { name: 'the name field unticked: only its Set puts the Value in', edit: untick, steps: ['Fill', 'type:name:Zed', 'Reset', 'Wipe', 'Reset', 'Fill Eve', 'Reset', 'Focus', 'Fill', 'Reset', 'Blur', 'Reset'] },
  {
    name: 'the control: unticked, and no wire into any Set',
    edit: (d) => {
      untick(d);
      for (const graph of Object.values(d.components)) graph.connections = graph.connections.filter((c) => c.toProperty !== 'set');
    },
    steps: ['Fill', 'Reset', 'type:form:Dee', 'Form fill']
  },
  {
    name: 'a typed-in Value under a wire nothing has written',
    edit: (d) => {
      const home = d.components['Pages/Home'];
      home.nodes.push(
        { id: 'seedField', type: 'net.noodl.controls.textinput', label: 'seed', parent: 'shell', parameters: { placeholder: 'seed', startValue: 'seed text', 'runOnChange-startValue': true }, x: 100, y: 2000 },
        { id: 'seedBtn', type: 'net.noodl.controls.button', label: 'Seed', parent: 'shell', parameters: { label: 'Seed' }, x: 100, y: 2080 },
        { id: 'unsetVar', type: 'Variable2', label: 'unset', parameters: { name: 'unset' }, x: 700, y: 2000 }
      );
      home.nodes.find((n) => n.id === 'shell')!.children!.push('seedField', 'seedBtn');
      home.connections.push({ fromId: 'unsetVar', fromProperty: 'value', toId: 'seedField', toProperty: 'startValue' }, { fromId: 'seedBtn', fromProperty: 'onClick', toId: 'seedField', toProperty: 'set' });
    },
    steps: ['type:seed:typed over', 'Seed']
  }
];

describe('§A a text field does what it is told, as the runtime\'s does (the Field Desk, in jsdom)', () => {
  const dirs = FIELD_VARIANTS.map((v) => writeFieldDesk(v.edit).dir);
  let runtime: string[][][] = [];
  const html: Array<string[][] | string> = [];
  beforeAll(async () => {
    runtime = runtimeArm(dirs.map((dir, i) => ({ dir, scenarios: [FIELD_VARIANTS[i].steps], fields: true }))).map((p) => p[0]);
    for (const [i, dir] of dirs.entries()) html.push(await htmlOf(dir, FIELD_VARIANTS[i].steps, true));
  }, 240000);

  it.each(FIELD_VARIANTS.map((v, i) => [v.name, i] as const))('A1 %s: the HTML export reads exactly what the runtime reads, at every step', (_name, i) => {
    expect(runtime[i]).toHaveLength(FIELD_VARIANTS[i].steps.length + 1);
    expect(html[i]).toEqual(runtime[i]);
  });

  it('A2 the desk graded what it names: a Set over typing, a Clear sending its text on, Focus and Blur, a focused field taking no Set, a Did Mount Clear and Focus, Enter blurring', () => {
    const d = html[0] as string[][];
    const at = (step: number) => d[step + 1];
    expect(at(2).slice(0, 6)).toEqual(['Bob', 'changed yes', '', 'blurred never', 'Cleo', '[name]=Bob']); // Reset over 'Zed'
    expect(at(3)[0]).toBe(''); // Wipe: the empty text goes on
    expect([at(4)[9], at(6)[9]]).toEqual(['focus=[name]', 'focus=none']);
    expect([at(7)[5], at(8)[5]]).toEqual(['[name]=', '[name]=Bob']); // a Set after a Clear writes nothing until the Value is written again
    expect(d[0][9]).toBe('focus=[note]'); // the note's own Did Mount
    expect(at(10)[3]).toBe('title blurred');
    expect([at(13)[8], at(14)[9]]).toEqual(['[form]=Cleo', 'focus=[form]']);
    const unticked = html[1] as string[][];
    expect([unticked[8][5], unticked[9][5], unticked[10][5]]).toEqual(['[name]=Eve', '[name]=Eve', '[name]=Eve']); // focused: no Set
  });

  it('A3 nothing about a field is left out but the parameter React reports too', () => {
    expect(lossesOf(dirs[0])).toEqual(['Components/Form form: its runOnChange-startValue is not carried (no style the export knows for it)', 'Pages/Home name: its runOnChange-startValue is not carried (no style the export knows for it)']);
  });

  it('A4 what is printed: the Set behind the focus test, the Clear with its chain, the field held while it is on the page', () => {
    const home = emitHtmlApp(parseProject(dirs[0], catalog), catalog).files['pages/Home.js'];
    expect(home).toContain(
      [
        '    if (nameFieldRef.current !== document.activeElement) {',
        '      const nameValue = variables.draft.get();',
        "      const nameText = nameCleared.current ? '' : String(nameValue ?? '');",
        '      state.name.set(nameText);',
        "      variables.changed.set('changed yes');",
        '      variables.typed.set(nameText);',
        '    }'
      ].join('\n')
    );
    expect(home).toContain(["    state.name.set('');", '    nameCleared.current = true;', "    variables.changed.set('changed yes');", "    variables.typed.set('');"].join('\n'));
    expect(home).toContain('  l.add(variables.draft.subscribe(function () {\n    nameCleared.current = false;\n  }));');
    expect(home).toContain('if (nameFieldRef.current) nameFieldRef.current.focus();');
    expect(home).toMatch(/nameFieldRef\.current = nameField;\n {2}l\.add\(function \(\) \{\n {4}nameFieldRef\.current = null;/);
    expect(home).toContain("  nameField.addEventListener('input', function () {\n    state.name.set(nameField.value);\n    variables.changed.set('changed yes');\n    variables.typed.set(nameField.value);\n  });");
  });
});

const ROOT_STEPS = ['Open', 'Inside', 'Close', 'Reset', 'Open', 'Close'];
const ROOT_VARIANTS: Array<{ name: string; edit?: (d: Desk) => void; steps: string[] }> = [
  { name: 'the desk', steps: ROOT_STEPS },
  {
    name: 'the Mounted wire on an element inside the root',
    edit: (d) => {
      const sheet = d.components['Components/Sheet'];
      const root = sheet.nodes.find((n) => n.id === 'shRoot')!;
      const inside = root.children!;
      root.children = ['shBody'];
      root.parameters = {};
      sheet.nodes.push({ id: 'shBody', type: 'Group', label: 'Sheet body', parent: 'shRoot', children: inside, parameters: { mounted: false } });
      for (const id of inside) sheet.nodes.find((n) => n.id === id)!.parent = 'shBody';
      sheet.connections.find((c) => c.toId === 'shRoot' && c.toProperty === 'mounted')!.toId = 'shBody';
    },
    steps: ROOT_STEPS
  },
  {
    name: 'the control: no root and no element has a Mounted wire',
    edit: (d) => {
      for (const graph of Object.values(d.components)) graph.connections = graph.connections.filter((c) => c.toProperty !== 'mounted');
    },
    steps: ['Open', 'Close', 'Reset', 'Open']
  }
];

describe('§B a part a value mounts, and its Did Mount each time it mounts (the Root Desk, in jsdom)', () => {
  const dirs = ROOT_VARIANTS.map((v) => writeRootDesk(v.edit).dir);
  let runtime: string[][][] = [];
  const html: Array<string[][] | string> = [];
  beforeAll(async () => {
    runtime = runtimeArm(dirs.map((dir, i) => ({ dir, scenarios: [ROOT_VARIANTS[i].steps] }))).map((p) => p[0]);
    for (const [i, dir] of dirs.entries()) html.push(await htmlOf(dir, ROOT_VARIANTS[i].steps, false));
  }, 240000);

  it.each(ROOT_VARIANTS.map((v, i) => [v.name, i] as const))('B1 %s: the HTML export reads exactly what the runtime reads, at every step', (_name, i) => {
    expect(runtime[i]).toHaveLength(ROOT_VARIANTS[i].steps.length + 1);
    expect(html[i]).toEqual(runtime[i]);
  });

  it('B2 the sheet\'s Did Mount ran again when it mounted again (seen nothing on Close, seen the sheet on the next Open)', () => {
    expect((html[0] as string[][]).map((r) => r[1])).toEqual(['seen nothing', 'seen the sheet', 'seen the sheet', 'seen the sheet', 'seen nothing', 'seen the sheet', 'seen the sheet']);
  });

  it('B3 nothing is left out', () => {
    expect(lossesOf(dirs[0])).toEqual([]);
    expect(lossesOf(dirs[1])).toEqual([]);
  });
});

/**
 * §C. `lib/dom.js` as an export ships it, over `lib/core.js` with its `effect` counted: an app.js of the spec's own that
 * draws through `list`, `when` and `place`, and hands the spec its handles on `window.desk`.
 */
const COUNTED_CORE = [
  "import * as real from './core-real.js';",
  "export * from './core-real.js';",
  'let live = 0;',
  'export function liveEffects() {',
  '  return live;',
  '}',
  'export function effect(fn) {',
  '  live++;',
  '  const stop = real.effect(fn);',
  '  let stopped = false;',
  '  return function () {',
  '    if (!stopped) {',
  '      stopped = true;',
  '      live--;',
  '    }',
  '    stop();',
  '  };',
  '}'
].join('\n');
const DESK_JS = `
import { bindText, el, keep, life, list, place, when } from './lib/dom.js';
import { liveEffects } from './lib/core.js';

const root = document.getElementById('app');
const l = life();
const made = [];
const gone = [];

// A row: its own life, a text bound to its item, a field.
function mountRow(parent, item, index, before) {
  const rl = life();
  const held = keep(item);
  const row = el(parent, 'div', 'row', undefined, before);
  row.dataset.id = item.id;
  const label = el(row, 'p');
  bindText(rl, label, function () { return held.get().title; });
  el(row, 'input');
  made.push(item.id);
  return {
    update(next) { held.set(next); },
    destroy() { gone.push(item.id); rl.destroy(); row.remove(); }
  };
}
const items = keep([]);
list(l, root, function () { return items.get(); }, function (item) { return item.id; }, mountRow);

// A part shown while 'open' is true: a text, a nested part, a placed component, a list by place.
const open = keep(false);
const inner = keep(true);
const count = keep(0);
function mountCard(parent, inputs, before) {
  const cl = life();
  const card = el(parent, 'section', 'card', undefined, before);
  const n = keep(inputs.n);
  bindText(cl, el(card, 'p'), function () { return 'card ' + n.get(); });
  return { update(next) { n.set(next.n); }, destroy() { cl.destroy(); card.remove(); } };
}
when(l, root, function () { return open.get(); }, function (into, at, pl) {
  const box = el(into, 'div', 'box', undefined, at);
  bindText(pl, el(box, 'p'), function () { return 'count ' + count.get(); });
  when(pl, box, function () { return inner.get(); }, function (into2, at2, il) {
    const p = el(into2, 'p', undefined, undefined, at2);
    bindText(il, p, function () { return 'inner ' + count.get(); });
    return p;
  });
  place(pl, mountCard, box, {}, function () { return { n: count.get() }; });
  list(pl, box, function () { return [count.get(), count.get() + 1]; }, null, function (into3, item, index, at3) {
    const q = el(into3, 'p', undefined, undefined, at3);
    const v = keep(item);
    const ql = life();
    bindText(ql, q, function () { return 'item ' + v.get(); });
    return { update(next) { v.set(next); }, destroy() { ql.destroy(); q.remove(); } };
  });
  return box;
});

window.desk = { items: items, open: open, inner: inner, count: count, made: made, gone: gone, live: liveEffects, end: function () { l.destroy(); } };
`;
const deskFiles = (): Record<string, string> => ({
  'index.html': '<!doctype html><html><body><div id="app"></div></body></html>',
  'app.js': DESK_JS,
  'lib/core.js': COUNTED_CORE,
  'lib/core-real.js': CORE_JS,
  'lib/dom.js': DOM_JS
});

describe('§C lib/dom.js: a keyed list, and nothing left running when a part goes', () => {
  it('C1 a keyed list: add three, delete the middle one, reorder, add one; a row is made once for its item and moved with it', async () => {
    const page = await openHtmlExport(deskFiles());
    try {
      const desk = page.window.desk;
      const rows = () => [...page.document.querySelectorAll('.row')].map((r: any) => `${r.dataset.id}:${r.querySelector('p').textContent}`);
      const t = (id: string, title: string) => ({ id, title });
      desk.items.set([t('a', 'Milk'), t('b', 'Bread'), t('c', 'Eggs')]);
      await page.settle();
      expect(rows()).toEqual(['a:Milk', 'b:Bread', 'c:Eggs']);
      const elementOf = (id: string) => page.document.querySelector(`.row[data-id="${id}"]`);
      const [a, c] = [elementOf('a'), elementOf('c')];
      const field = c.querySelector('input');
      field.focus();
      desk.items.set([t('a', 'Milk'), t('c', 'Eggs')]);
      await page.settle();
      expect(rows()).toEqual(['a:Milk', 'c:Eggs']);
      expect(desk.gone).toEqual(['b']);
      expect(page.document.activeElement).toBe(field); // the row left alone keeps the field someone is in
      desk.items.set([t('c', 'Eggs, a dozen'), t('a', 'Milk')]);
      await page.settle();
      expect(rows()).toEqual(['c:Eggs, a dozen', 'a:Milk']);
      expect([elementOf('a'), elementOf('c')]).toEqual([a, c]); // the same elements, moved
      desk.items.set([t('c', 'Eggs, a dozen'), t('d', 'Tea'), t('a', 'Milk')]);
      await page.settle();
      expect(rows()).toEqual(['c:Eggs, a dozen', 'd:Tea', 'a:Milk']);
      expect(desk.made).toEqual(['a', 'b', 'c', 'd']);
      // Nothing but the rows between the list's markers: no stray node from a move.
      expect(page.document.getElementById('app').querySelectorAll(':scope > div').length).toBe(3);
    } finally {
      page.close();
    }
  });

  it('C2 a part shown and hidden a hundred times, with a nested part, a placed component and a list in it, leaves the same live effects as before', async () => {
    const page = await openHtmlExport(deskFiles());
    try {
      const desk = page.window.desk;
      await page.settle();
      const before = desk.live();
      desk.open.set(true);
      await page.settle();
      const shown = desk.live();
      expect(shown).toBeGreaterThan(before + 5); // the part's own: two texts, the nested part, the placement, the list, its rows
      expect(page.window.document.getElementById('app').textContent).toContain('card 0');
      for (let i = 0; i < 100; i++) {
        desk.open.set(false);
        await page.settle();
        desk.inner.set(i % 2 === 0);
        desk.count.set(i);
        desk.open.set(true);
        await page.settle();
      }
      desk.inner.set(true);
      await page.settle();
      expect(desk.live()).toBe(shown);
      desk.open.set(false);
      await page.settle();
      expect(desk.live()).toBe(before);
      expect(page.document.querySelectorAll('.box, .card').length).toBe(0);
      desk.end();
      expect(desk.live()).toBe(0);
    } finally {
      page.close();
    }
  });
});

describe('§D the cursor stays where the person put it', () => {
  it('D1 typing into a field whose text round-trips through state keeps its focus and its caret', async () => {
    const page = await openHtmlExport(emitHtmlApp(parseProject(writeFieldDesk().dir, catalog), catalog).files);
    try {
      const w = page.window;
      const field = page.document.querySelector('input[placeholder="name"]');
      field.focus();
      Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value')!.set!.call(field, 'Zxed');
      field.setSelectionRange(2, 2);
      field.dispatchEvent(new w.Event('input', { bubbles: true }));
      await page.settle();
      expect([page.document.activeElement === field, field.value, field.selectionStart, field.selectionEnd]).toEqual([true, 'Zxed', 2, 2]);
      expect(page.text()).toContain('Zxed'); // the typing chain ran: the typed Text reads it
    } finally {
      page.close();
    }
  });
});

/**
 * §E. Pages (HTX-001 decided the address after `#`, so any static server serves every page). A press opens a page, the
 * browser's Back opens the one before, and the page that went leaves nothing running: story-engine, with its
 * `lib/core.js` counting effects as §C's does.
 */
describe('§E a page, and Back', () => {
  it('E1 Read, Write your own story, Back: the Read page again, with the live effects it had before', async () => {
    const story = emitHtmlApp(parseProject(path.join(__dirname, '..', '..', '..', 'templates', 'story-engine'), catalog), catalog).files;
    const counted = { ...story, 'lib/core.js': COUNTED_CORE, 'lib/core-real.js': CORE_JS, 'app.js': `${story['app.js']}\nimport { liveEffects } from './lib/core.js';\nwindow.liveEffects = liveEffects;\n` };
    const page = await openHtmlExport(counted);
    try {
      const press = async (words: string) => {
        ([...page.document.querySelectorAll('button')] as any[]).find((b) => b.textContent === words).click();
        await page.settle();
      };
      const atRead = page.window.liveEffects();
      expect(page.document.title).toBe('Read');
      await press('Write your own story');
      expect([page.document.title, page.window.location.hash]).toEqual(['Remix', '#/remix']);
      page.window.history.back();
      await page.settle();
      expect([page.document.title, page.window.location.hash]).toEqual(['Read', '']);
      expect(page.text()).toContain('The story this template ships with — 7 passages');
      expect(page.window.liveEffects()).toBe(atRead);
      // And again, ten times: a page's effects end with it.
      for (let i = 0; i < 10; i++) {
        await press('Write your own story');
        page.window.history.back();
        await page.settle();
      }
      expect(page.window.liveEffects()).toBe(atRead);
    } finally {
      page.close();
    }
  });
});
