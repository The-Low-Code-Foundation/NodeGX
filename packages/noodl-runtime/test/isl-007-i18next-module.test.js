/**
 * P109 ISL-007 — the i18next add-on shows a word as typed, and names what it cannot show.
 *
 * Ruled "Adopt the add-on" (2026-10-02). This loads the module's BUILT `index.js` — the file a project installs —
 * through `NoodlRuntime.registerModule`, the way a page does, with a stub editor connection that records warnings.
 * What it grades, each a person's sentence:
 *
 *  - AC5: a word or a value with `&`, `<` or an apostrophe shows as typed in both languages. The add-on as imported
 *    escaped interpolations, so "Tom & Jerry" read "Tom &amp; Jerry" on screen (TPL-011).
 *  - AC3: a `{{name}}` with no value shows nothing in its place (never braces) and the editor names the word AND the
 *    variable. A word missing from every bundle shows nothing (not the previous word) and the editor names it.
 *  - An emptied key clears the word with no warning (P78-TPL011-TRANSLATION: the last word stayed on screen).
 *  - A word missing in French falls back to English, with no warning.
 *  - AC7: each node's `docs` is a sentence an agent reads (`get_node_type`'s summary, CN-009), not the dead
 *    docs.noodl.net URL it carried, and the Translation sentence says the three things TPL-011 met the hard way.
 *
 * Sabotage: `ISL007_MODULE=<the module as imported>` points this at another build; the escaping and warning cases go
 * red (measured 2026-10-03 against the 1.0.4 bundle at HEAD `4017a9922`).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const NoodlRuntime = require('../noodl-runtime');

const MODULE =
  process.env.ISL007_MODULE ||
  path.join(__dirname, '..', '..', '..', 'library', 'modules', 'i18next-translation', 'project', 'noodl_modules', 'i18next-noodl', 'index.js');

const EN = { greet: 'Hello {{name}}', isle: 'the island & <sea>', onlyEnglish: 'Only in English' };
const FR = { greet: 'Bonjour {{name}}', isle: "l'île & <mer>" };

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

let rt;
let warnings;
let loaded;

/** Load the module once: i18next is a singleton inside it, as it is on a page. */
beforeAll(async () => {
  warnings = [];
  rt = new NoodlRuntime({
    type: 'browser',
    platform: { requestUpdate: () => undefined, getCurrentTime: () => 0, objectToString: (o) => JSON.stringify(o) }
  });
  rt.context.editorConnection = {
    isRunningLocally: () => false,
    isConnected: () => false, // read by the runtime on every signal (nodecontext.ts); a throw there ate the switch
    sendWarning: (component, nodeId, name, payload) => warnings.push({ nodeId, name, message: payload.message }),
    clearWarnings: (component, nodeId) => {
      warnings = warnings.filter((w) => w.nodeId !== nodeId);
    }
  };
  let module;
  const Noodl = { defineModule: (m) => rt.registerModule((module = Object.assign({ name: 'i18next-noodl' }, m))) };
  vm.runInNewContext(fs.readFileSync(MODULE, 'utf8'), { Noodl, console, setTimeout, clearTimeout, Promise });
  loaded = module;
  // The runtime runs a module's setup when it loads the graph (`noodl-runtime.ts`, "Run setup on all modules").
  module.setup.apply(module);
  await settle();

  for (const [lang, bundle] of [['en', EN], ['fr', FR]]) {
    const b = make('Language Bundle', 'bundle-' + lang);
    b.setInputValue('Language', lang);
    b.setInputValue('Namespace', 'common');
    b.setInputValue('Bundle', JSON.stringify(bundle));
  }
  await switchTo('en');
});

function make(type, id) {
  const node = rt.context.nodeRegister.createNode(type, id);
  node.nodeScope = { componentOwner: { name: 'Pages/Home' } };
  return node;
}

async function switchTo(lang) {
  const n = make('i18next', 'switch-' + lang + '-' + Math.random());
  n.setInputValue('Language', lang);
  n.setInputValue('ChangeLanguage', true);
  // The switch lands a few frames later (i18next's own async); wait for the node to say so, then one more frame for
  // every word to re-translate.
  for (let i = 0; i < 50 && n.getOutput('CurrentLanguage').value !== lang; i++) await flush();
  expect(n.getOutput('CurrentLanguage').value).toBe(lang);
  await flush();
}

/** A Translation node, its variables registered the way a wire registers them, run to a settled output. */
async function word(id, key, variables = {}) {
  const node = make('Translation', id);
  node.setInputValue('Namespace', 'common');
  node.setInputValue('Key', key);
  for (const [name, value] of Object.entries(variables)) {
    node.registerInputIfNeeded(name);
    node.setInputValue(name, value);
  }
  await flush();
  return node;
}

async function flush() {
  rt.context.update();
  await settle();
  rt.context.update();
}

const shown = (node) => node.getOutput('Translation').value;
const warned = (node) => warnings.filter((w) => w.nodeId === node.id);

describe('ISL-007 — the i18next add-on', () => {
  afterAll(() => switchTo('en'));

  it('AC5: shows "&", "<" and an apostrophe as typed, in a word and in a value, in both languages', async () => {
    const greet = await word('greet', 'greet', { name: 'Tom & <Jerry>' });
    const isle = await word('isle', 'isle');
    expect([shown(greet), shown(isle)]).toEqual(['Hello Tom & <Jerry>', 'the island & <sea>']);

    await switchTo('fr');
    expect([shown(greet), shown(isle)]).toEqual(['Bonjour Tom & <Jerry>', "l'île & <mer>"]);
    expect([...warned(greet), ...warned(isle)]).toEqual([]);
    await switchTo('en');
  });

  it('AC3: a {{name}} with no value shows nothing in its place, and the editor names the word and the variable', async () => {
    const greet = await word('greet-bare', 'greet');
    expect(shown(greet)).toBe('Hello ');
    expect(shown(greet)).not.toMatch(/[{}]/);
    expect(warned(greet).map((w) => w.message)).toEqual([expect.stringMatching(/"common:greet".*\{\{name\}\}/)]);
  });

  it('AC3: a word in no bundle shows nothing (not the word it showed before), and the editor names it', async () => {
    const node = await word('missing', 'isle');
    expect(shown(node)).toBe('the island & <sea>');
    node.setInputValue('Key', 'no.such.word');
    await flush();
    expect(shown(node)).toBe('');
    expect(warned(node).map((w) => w.message)).toEqual([expect.stringContaining('"common:no.such.word"')]);

    // …and the warning goes when the word is found again.
    node.setInputValue('Key', 'isle');
    await flush();
    expect(warned(node)).toEqual([]);
  });

  it('P78-TPL011-TRANSLATION: an emptied key clears the word, with no warning (that is how an app clears a message)', async () => {
    const node = await word('cleared', 'isle');
    expect(shown(node)).toBe('the island & <sea>');
    node.setInputValue('Key', '');
    await flush();
    expect(shown(node)).toBe('');
    expect(warned(node)).toEqual([]);
  });

  it('falls back to English for a word French does not have, without a warning', async () => {
    await switchTo('fr');
    const node = await word('fallback', 'onlyEnglish');
    expect(shown(node)).toBe('Only in English');
    expect(warned(node)).toEqual([]);
  });
});

test('AC7: each node says what it does in a sentence, and Translation names {{name}}, escaping and the warning', () => {
  const docs = Object.fromEntries(loaded.nodes.map((n) => n.node || n).map((n) => [n.name, n.docs]));
  expect(Object.keys(docs).sort()).toEqual(['Language Bundle', 'Translation', 'i18next']);
  for (const sentence of Object.values(docs)) expect(sentence).not.toMatch(/^https?:/);
  expect(docs.Translation).toMatch(/^Translates/); // `list_node_types` query "translate" matched nothing before
  expect(docs.Translation).toContain('{{name}}');
  expect(docs.Translation).toMatch(/not escaped/);
  expect(docs.Translation).toMatch(/warning/);
  expect(docs.i18next).toContain('<html lang>');
});
