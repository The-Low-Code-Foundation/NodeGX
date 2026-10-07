/**
 * P109 ISL-015 — a kit author reads the traps before meeting them.
 *
 * Building the island's block editor and tile worlds met the same traps again and again, and each answer was written
 * into a task file, a commit body or a session's memory: places the next kit author never reads. Richard's rulings
 * (2026-10-03): the traps go where an author already reads (the custom-nodes docs page and the README the scaffold
 * writes, which `create_node_kit`'s reply points at); the token advice keeps its exception in the same paragraph; and
 * this gate checks each trap by phrase, with ONE runnable sample, for the trap a sentence cannot teach (T3).
 *
 * 🔴 A phrase gate grades words, not understanding. ISL-015 AC5 (a stranger agent given only these pages) is what
 * tests whether the words work. Green here says the words are still there.
 *
 * The README is read as the scaffold GENERATES it (`scaffoldKitFiles`), not from the template literal in its source.
 *
 * A trap whose route is not ruled yet is PENDING (`pending: '<task>'`): writing today's workaround would read as tomorrow's
 * advice. It stays in the table, by name, so the table cannot lose it; a pending row that a surface already carries fails, so
 * the row is moved the day the words land. T7 went live with ISL-012's ruling and T6 with ISL-013's slice 1; none is pending.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.join(__dirname, '..', '..', '..');
const DOCS_RAW = fs.readFileSync(path.join(REPO, 'docs-site', 'docs', 'custom-nodes.md'), 'utf8');
const { scaffoldKitFiles } = require(path.join(REPO, 'packages', 'nodegx-kit-scaffold', 'src', 'index.js'));
const scaffold = scaffoldKitFiles({ name: 'Trap Kit' });
const README = scaffold.ok ? scaffold.files.find((f) => f.path.endsWith('README.md')).contents : '';
const KIT_TOOLS = fs.readFileSync(path.join(REPO, 'packages', 'noodl-mcp', 'src', 'tools', 'kitTools.ts'), 'utf8');

/** The README's traps section, by its heading; the docs page's library section, by its heading. */
const README_SECTION = 'Traps you will meet';
const DOCS_SECTION = 'Wrapping a library';
const sectionOf = (text, heading) => {
  const m = new RegExp(`^(#{2,3}) ${heading}\\s*$`, 'm').exec(text);
  if (!m) return '';
  const rest = text.slice(m.index + m[0].length);
  const next = new RegExp(`^#{2,${m[1].length}} `, 'm').exec(rest);
  return next ? rest.slice(0, next.index) : rest;
};
const norm = (s) => s.replace(/\s+/g, ' ');
/** Phrases are read with line breaks folded: a sentence wraps wherever the page's line width puts it. */
const DOCS = norm(DOCS_RAW);

/**
 * Each trap: what a person would notice, and the phrase each surface must carry. `docs` is read on the whole page
 * (T2 and T8 live in their own sections since GAM-017 and ISL-011); `readme` inside the README's traps section, except
 * T8, whose README home is the Ports section ISL-011's gate already slices.
 */
const TRAPS = [
  {
    id: 'T1',
    trap: 'a kit node may be a component’s only visual node, no wrapper',
    docs: /kit node can be (a|the) component['’]s only visual node/i,
    readme: /can be (a|the) component['’]s only visual node/i
  },
  {
    id: 'T2',
    trap: 'a signal input arrives as a count, and two pulses in one frame can count as one',
    docs: /signal port hands your component a count[\s\S]*?same frame can count as one/i,
    readme: /signal input arrives as a count[\s\S]{0,400}?same frame can count as one/i
  },
  {
    id: 'T3',
    trap: 'an imperative widget must not reload on its own echo',
    docs: /edits vanish when the page re-renders[\s\S]{0,1600}?only when the graph sends a new value[\s\S]{0,300}?never your own/i,
    readme: /edits vanish when the page re-renders[^]*?only when the graph sends a new value[^]*?never your own/i,
    section: true
  },
  {
    id: 'T4',
    trap: "a wrapped library's global CSS reaches the whole page (not the editor)",
    docs: /reaches the whole page[\s\S]{0,600}?does not reach the editor/i,
    readme: /reaches the whole page/i,
    section: true
  },
  {
    id: 'T5',
    trap: 'a colour handed to anything that is not CSS needs the real colour, looked up first',
    docs: /anything that is not CSS[\s\S]{0,400}?look/i,
    readme: /anything that is not CSS/i,
    section: true,
    tokenParagraph: /Default to design tokens, not to hex[\s\S]{0,1400}?exception is a colour your component hands to anything that is not CSS/i
  },
  // Live since P109 ISL-013 slice 1 (2026-10-07, ruled "A kit says what it needs"): `requires`, then `Noodl.getModule`.
  {
    id: 'T6',
    trap: "another kit's code: name it in requires and read it with Noodl.getModule, never through window.__noodl_modules",
    docs: /"requires": \["garden-kit"\][\s\S]{0,400}?Noodl\.getModule\('garden-kit'\)[\s\S]{0,1600}?Don't walk `window\.__noodl_modules`/,
    readme: /name the kit in `requires`[\s\S]{0,300}?Noodl\.getModule\('garden-kit'\)[\s\S]{0,200}?Never walk `window\.__noodl_modules`/
  },
  // Live since P109 ISL-012 ruled "Recipe now, loader later" (2026-10-05): the route is "read the global at mount".
  {
    id: 'T7',
    trap: "a dependency's global is not there when the catalog reads the kit",
    docs: /read the global when your node mounts[\s\S]{0,600}?loading your own file alone, without its dependencies/i,
    readme: /global is not there when your file first runs[\s\S]{0,300}?loading `?index\.js`? alone[\s\S]{0,200}?inside an effect/i,
    section: true
  },
  {
    id: 'T8',
    trap: 'defaultCss is an inline style that beats the stylesheet',
    docs: /defaultCss[\s\S]{0,420}?inline style[\s\S]{0,260}?beats any\s+rule/i,
    readme: /defaultCss[\s\S]{0,420}?inline style[\s\S]{0,260}?beats any\s+rule/i
  }
];

describe('ISL-015 — every kit trap is written where an author reads', () => {
  test('the table holds eight traps, all live (a shrinking table is a diff)', () => {
    expect(TRAPS.map((t) => t.id)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8']);
    expect(TRAPS.filter((t) => t.pending).map((t) => `${t.id} ${t.pending}`)).toEqual([]);
  });

  test('known-firing control: the scaffold generates a README, and the docs page carries T2 (GAM-017) and T8 (ISL-011)', () => {
    expect(scaffold.ok).toBe(true);
    expect(README).toMatch(/^# Trap Kit/m);
    expect(TRAPS[1].docs.test(DOCS)).toBe(true);
    expect(TRAPS[7].docs.test(DOCS)).toBe(true);
  });

  test.each(TRAPS.filter((t) => !t.pending).map((t) => [t.id, t.trap, t]))('%s on the docs page: %s', (id, _trap, t) => {
    const where = t.section ? norm(sectionOf(DOCS_RAW, DOCS_SECTION)) : DOCS;
    expect({ id, section: t.section ? DOCS_SECTION : 'page', present: t.docs.test(where) }).toEqual({
      id,
      section: t.section ? DOCS_SECTION : 'page',
      present: true
    });
  });

  test('T5 sits in the token advice itself, in the same paragraph (ruling 2: "Advice + exception")', () => {
    expect(TRAPS[4].tokenParagraph.test(DOCS)).toBe(true);
  });

  test.each(TRAPS.filter((t) => !t.pending).map((t) => [t.id, t.trap, t]))("%s in the scaffold's README: %s", (id, _trap, t) => {
    const where = t.id === 'T8' ? README : norm(sectionOf(README, README_SECTION));
    expect({ id, present: t.readme.test(where) }).toEqual({ id, present: true });
  });

  // jest refuses an empty table, and none is pending since ISL-013 — the block stays for the next one
  const PENDING = TRAPS.filter((t) => t.pending).map((t) => [t.id, t.pending, t]);
  (PENDING.length ? test.each(PENDING) : () => () => undefined)('%s is pending %s: no surface carries its route yet', (id, _owner, t) => {
    expect({ id, docs: t.phrase.test(DOCS), readme: t.phrase.test(README) }).toEqual({ id, docs: false, readme: false });
  });

  test(`create_node_kit's reply sends the agent to the README's "${README_SECTION}"`, () => {
    const next = /next:\s*([\s\S]*?)\n\s*\};/.exec(KIT_TOOLS);
    expect(next && next[1].includes(README_SECTION)).toBe(true);
  });
});

/**
 * T3, run. The docs page's note-kit sample is pulled off the page, loaded the way the runtime loads a kit (React as a
 * global, `Noodl.defineModule`), and rendered in a DOM: a person types, then the page re-renders three times with the
 * graph's OLD value (and a new style), then the node's own text comes back as an echo, then the graph sends a new value.
 * The typed text must survive the first two; the third must show.
 *
 * Sabotage arm: the same sample with its guard replaced by "load whatever the graph says" (the island's first cut) loses
 * the typed text on the first re-render. Without that arm a green here could mean the harness never typed.
 */
describe('ISL-015 T3 — the docs page sample keeps an edit across re-renders', () => {
  const SAMPLE_TITLE = 'noodl_modules/note-kit/index.js';
  const sampleSource = () => {
    const m = new RegExp('```js title="' + SAMPLE_TITLE.replace(/[/.]/g, '\\$&') + '"\\n([\\s\\S]*?)\\n```').exec(DOCS_RAW);
    return m ? m[1] : null;
  };
  const GUARD = /\/\/ Load only a NEW value[\s\S]*?\}\);/;

  const run = async (source) => {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!doctype html><body><div id="root"></div></body>', { pretendToBeVisual: true });
    const saved = {};
    for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'Event']) {
      saved[k] = global[k];
      global[k] = k === 'window' ? dom.window : dom.window[k];
    }
    global.IS_REACT_ACT_ENVIRONMENT = true;
    jest.resetModules();
    const React = require('react');
    const { createRoot } = require('react-dom/client');
    try {
      let defined = null;
      vm.runInNewContext(source, {
        React,
        document: dom.window.document,
        Noodl: { defineModule: (m) => { defined = m; } }
      });
      const Node = defined.reactNodes[0];
      const Component = Node.getReactComponent();
      const emitted = [];
      const root = createRoot(dom.window.document.getElementById('root'));
      const render = (props) => React.act(() => root.render(React.createElement(Component, { onChange: (v) => emitted.push(v), ...props })));
      const area = () => dom.window.document.querySelector('textarea');
      const type = (text) => React.act(() => {
        const el = area();
        el.value = text;
        el.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      });

      const read = {};
      await render({ text: 'from the graph', style: { color: 'red' } });
      read.first = area().value;
      await type('typed by a person');
      read.emitted = emitted.slice();
      for (let i = 0; i < 3; i++) await render({ text: 'from the graph', style: { color: i % 2 ? 'red' : 'blue' } });
      read.afterThreeRenders = area().value;
      await render({ text: 'typed by a person', style: { color: 'red' } });
      read.afterEcho = area().value;
      await render({ text: 'a new value', style: { color: 'red' } });
      read.afterNewValue = area().value;
      read.textareas = dom.window.document.querySelectorAll('textarea').length;
      await React.act(() => root.unmount());
      return read;
    } finally {
      for (const k of Object.keys(saved)) global[k] = saved[k];
      delete global.IS_REACT_ACT_ENVIRONMENT;
    }
  };

  test('the sample is on the page, registers a module and carries the guard this arm replaces', () => {
    const src = sampleSource();
    expect(src).not.toBeNull();
    expect(src).toMatch(/Noodl\.defineModule\(/);
    expect(GUARD.test(src)).toBe(true);
  });

  test('treatment: the typed text survives three re-renders and its own echo; a new value from the graph shows', async () => {
    const read = await run(sampleSource());
    expect(read).toEqual({
      first: 'from the graph',
      emitted: ['typed by a person'],
      afterThreeRenders: 'typed by a person',
      afterEcho: 'typed by a person',
      afterNewValue: 'a new value',
      textareas: 1
    });
  });

  test('sabotage: the same sample loading whatever the graph says loses the typed text on the first re-render', async () => {
    const naive = sampleSource().replace(
      GUARD,
      "React.useEffect(function () { if (editor.current) editor.current.load(props.text || ''); });"
    );
    const read = await run(naive);
    expect(read.emitted).toEqual(['typed by a person']);
    expect(read.afterThreeRenders).toBe('from the graph');
  });
});
