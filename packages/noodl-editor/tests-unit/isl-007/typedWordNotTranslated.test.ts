/**
 * P109 ISL-007 AC6 — a word typed straight onto a page in an app that translates is named.
 *
 * "Warn if app translates" (Richard, 2026-10-03): the opt-in is a PLACED `Translation` node anywhere in the project,
 * not the add-on being installed (two hsseq copies carry it and translate nothing); a word is a typed string with a
 * letter; a port with a wire into it is skipped.
 *
 * Every silent arm sits beside the firing arm, built from the same candidate, so a silence cannot be a rule that never
 * runs. The census at the end pins what the rule says about the translating projects this repository carries.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  authoredPreconditionDiagnostics,
  connectedInputs,
  isBlockingForAuthoredOutput
} from '../../src/editor/src/validation/authoredCandidate';
import { defaultCatalog, loadDefaultCatalog } from '../../src/editor/src/validation/catalog';
import { DiagnosticCode } from '../../src/editor/src/validation/diagnostics';
import {
  checkTypedWordNotTranslated,
  TRANSLATION_NODE_TYPE,
  WORD_PORTS,
  type TypedWordNode
} from '../../src/editor/src/validation/typedWordNotTranslated';

const COMPONENT = '/Pages/Login';
const REPO = path.join(__dirname, '..', '..', '..', '..');

/** The candidate: a typed "Password" heading, as in Tailr's login page. */
const heading = (text: string, type = 'Text', port = 'text'): TypedWordNode => ({ id: 'hd', type, parameters: { [port]: text } });

/** The app: one component elsewhere places a Translation node (the opt-in). */
const translating = [{ nodes: [{ type: TRANSLATION_NODE_TYPE }] }];
/** The hsseq shape: the add-on is installed, its nodes are in no component. */
const notTranslating = [{ nodes: [{ type: 'Text' }, { type: 'Group' }] }];

const run = (nodes: TypedWordNode[], views = translating as never, wired: string[] = []) =>
  checkTypedWordNotTranslated(nodes, { component: COMPONENT, views, connectedInputs: new Set(wired) });

describe('ISL-007 AC6 — a typed word in an app that translates', () => {
  test('fires: "Password" typed into a Text, in an app that places a Translation node', () => {
    const found = run([heading('Password')]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      code: DiagnosticCode.TypedWordNotTranslated,
      severity: 'warning',
      location: { component: COMPONENT, nodeId: 'hd', nodeType: 'Text', port: 'text', plug: 'input' },
      suggestion: 'Translation'
    });
    expect(found[0].message).toContain('"Password" is typed into this node\'s Text');
    expect(found[0].message).toContain('Language Bundle');
  });

  test('the candidate placing the first Translation node opts the app in by itself', () => {
    expect(run([heading('Password'), { id: 'tr', type: TRANSLATION_NODE_TYPE }], notTranslating as never)).toHaveLength(1);
  });

  test('silent: the same word in an app that carries the add-on but places no Translation node', () => {
    expect(run([heading('Password')], notTranslating as never)).toEqual([]);
  });

  test('silent: the same word with a wire into the port', () => {
    expect(run([heading('Password')], translating as never, ['hd::text'])).toEqual([]);
    // the wire is to THAT port: a wire into another port of the node leaves the word typed
    expect(run([heading('Password')], translating as never, ['hd::color'])).toHaveLength(1);
  });

  test('silent: a typed string with no letter (symbols, numbers, an age band)', () => {
    for (const s of ['→', '—', '+', '7–9', '10–12', '42', '  ']) expect({ s, n: run([heading(s)]).length }).toEqual({ s, n: 0 });
    // any script's letters count
    expect(run([heading('Français')])).toHaveLength(1);
    expect(run([heading('こんにちは')])).toHaveLength(1);
  });

  test("silent: a kit's label port, and a data node's text port", () => {
    expect(run([heading('The island', 'garden-kit.Garden', 'label')])).toEqual([]);
    expect(run([heading('a,b\n1,2', 'net.noodl.ParseCSV', 'text')])).toEqual([]);
    expect(run([heading('Hello', 'noodl.cloud.sendemail', 'text')])).toEqual([]);
  });

  test('silent: views omitted means "do not check"', () => {
    expect(checkTypedWordNotTranslated([heading('Password')], { component: COMPONENT })).toEqual([]);
  });

  test('every word port fires: labels, placeholders, the page title, the deprecated originals', () => {
    for (const [type, ports] of Object.entries(WORD_PORTS)) {
      for (const port of Object.keys(ports)) {
        expect({ type, port, n: run([heading('Sign in', type, port)]).length }).toEqual({ type, port, n: 1 });
      }
    }
  });

  test('a long text is quoted short', () => {
    const [d] = run([heading('Please click the link in the verification email you were sent. If you cannot find it, look in spam.')]);
    const quoted = /^"([^"]*)" is typed/.exec(d.message)?.[1];
    expect(quoted).toBe('Please click the link in the verification email you were se…');
    expect(quoted).toHaveLength(60);
  });
});

describe('ISL-007 AC6 — through the shared pipeline both doors run', () => {
  const composed = (views: unknown, wires: Array<{ toId: string; toProperty: string }> = []) =>
    authoredPreconditionDiagnostics({
      component: COMPONENT,
      nodes: [{ id: 'hd', type: 'Text', parameters: { text: 'Password' } }],
      components: [COMPONENT],
      catalog: loadDefaultCatalog(),
      connections: connectedInputs(wires),
      views
    } as never).filter((d) => d.code === DiagnosticCode.TypedWordNotTranslated);

  test('fires with the views, and is a warning that blocks nothing', () => {
    const found = composed([{ name: '/App', nodes: [{ type: TRANSLATION_NODE_TYPE }] }]);
    expect(found).toHaveLength(1);
    expect(isBlockingForAuthoredOutput(found[0])).toBe(false);
  });

  test('silent without the views, without a Translation node, and with a wire', () => {
    expect(composed(undefined)).toEqual([]);
    expect(composed([{ name: '/App', nodes: [{ type: 'Text' }] }])).toEqual([]);
    expect(composed([{ name: '/App', nodes: [{ type: TRANSLATION_NODE_TYPE }] }], [{ toId: 'hd', toProperty: 'text' }])).toEqual([]);
  });
});

describe('ISL-007 AC6 — the port table is the shipped catalog', () => {
  const catalog = defaultCatalog() as unknown as {
    nodes: Array<{ typeName: string; isVisual?: boolean; inputs?: Array<{ name: string; type?: { name?: string } }> }>;
  };
  const nodes = Array.isArray(catalog) ? (catalog as never as typeof catalog.nodes) : catalog.nodes;

  test('every port in the table is a string input of that built-in', () => {
    for (const [type, ports] of Object.entries(WORD_PORTS)) {
      const node = nodes.find((n) => n.typeName === type);
      for (const port of Object.keys(ports)) {
        const input = node?.inputs?.find((i) => i.name === port);
        expect({ type, port, string: input?.type?.name === 'string' }).toEqual({ type, port, string: true });
      }
    }
  });

  test('no visual built-in has a text / label / placeholder / title input the table leaves out', () => {
    const missing: string[] = [];
    for (const n of nodes) {
      if (!n.isVisual) continue;
      for (const i of n.inputs ?? []) {
        if (['text', 'label', 'placeholder', 'title'].includes(i.name) && !WORD_PORTS[n.typeName]?.[i.name]) missing.push(`${n.typeName}.${i.name}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

/**
 * The census, on the translating projects this repository carries (ISL-007 §8 s11). The island is the control: it has
 * 12 typed, unwired words on these kinds of port and kit nodes, and places no Translation node, so it reads 0.
 */
describe('ISL-007 AC6 — what the rule says about the repository\'s projects', () => {
  const census = (rel: string) => {
    const root = path.join(REPO, rel, 'components');
    const comps: Array<{ name: string; nodes: TypedWordNode[]; wired: string[] }> = [];
    const walk = (d: string) => {
      for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, f.name);
        if (f.isDirectory()) walk(p);
        else if (f.name === 'nodes.json') {
          const j = JSON.parse(fs.readFileSync(p, 'utf8'));
          const c = fs.existsSync(path.join(d, 'connections.json')) ? JSON.parse(fs.readFileSync(path.join(d, 'connections.json'), 'utf8')) : {};
          comps.push({
            name: path.relative(root, d),
            nodes: Array.isArray(j) ? j : j.nodes ?? [],
            wired: (c.connections ?? []).map((x: { toId: string; toProperty: string }) => `${x.toId}::${x.toProperty}`)
          });
        }
      }
    };
    walk(root);
    const views = comps.map((c) => ({ nodes: c.nodes }));
    const by: Record<string, number> = {};
    for (const c of comps) {
      for (const d of checkTypedWordNotTranslated(c.nodes, { component: c.name, views, connectedInputs: new Set(c.wired) })) {
        const k = `${d.location.nodeType}.${d.location.port}`;
        by[k] = (by[k] ?? 0) + 1;
      }
    }
    return by;
  };

  test("AC2's fixture: the two language buttons and the page title", () => {
    expect(census('dev-docs/tasks/phase-109-the-defects-the-island-found/isl007-two-languages')).toEqual({
      'net.noodl.controls.button.label': 2,
      'Page.title': 1
    });
  });

  // Was `{ 'Page.title': 11 }`: each page named its tab through a JavaScript node because the Router ignored a wired
  // Title. Since P109-S45-WIREDTITLE the title Translations are wired into the Page nodes (P109-S11-DBTPAGETITLES).
  test('the DBT template: every page title is wired, so it reads nothing', () => {
    expect(census('templates/digital-bricks-training')).toEqual({});
  });

  test('control: the island types words but places no Translation node, so it reads nothing', () => {
    expect(census('templates/bot-garden')).toEqual({});
  });
});
