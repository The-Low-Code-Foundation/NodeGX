import * as path from 'path';

import { Catalog, loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';

/**
 * STY-004 — export carries Looks.
 *
 * A variant and a text style on an ordinary leaf `Text` node both vanished from a React export,
 * **silently**, with `variant` appearing **0 times in a 1,059-line report** — while the identical
 * values written inline on the same kind of node exported perfectly
 * (`dev-docs/tasks/phase-94-one-styles-panel/STY-001-FINDINGS.md` §8.4b). The exporter read four
 * files and `nodegx.styles.json` was not one of them, so every colour style, text style and Look
 * was a name pointing at a dictionary it did not hold. `variant` is a **top-level field on the
 * node**, not a parameter, which is why it never even reached the `dropped, reported` path that
 * catches unmapped parameters.
 *
 * Under the Look model (`STY-DESIGN-THE-LOOK-MODEL.md`) every styled thing becomes a link, so this
 * had to close before that design could ship: otherwise the more correctly someone builds, the more
 * of their app disappears when they publish it.
 *
 * ## How this file is armed
 *
 * 🔴 **Every claim here is a PAIR in the same run** — the styled node and a control node of the
 * same type, in the same component, carrying the same values written inline. A pass that came from
 * a dead assertion or a resolver that ate everything shows up as the control moving too
 * ([[a-negative-arm-needs-its-control-in-the-same-run]]). The pairs are built into the fixture:
 *
 * | styled | control | what only the pair proves |
 * |---|---|---|
 * | `lookCard` | `plainCard` | the Look's values arrived, and nothing else about a Group changed |
 * | `lookHeading` | `plainHeading` | the text style's values arrived — the two rules differ in exactly one declaration, and that one is the one reached through a second indirection |
 * | `styleSwatch` | `tokenSwatch`, `hexSwatch` | a style NAME resolves while a token and a hex pass through untouched |
 * | `lookButton` | `plainButton` | a node with no style parameters of its own still gets a class |
 * | `Card` (Group) | `Card` (Text) | a Look is keyed by name AND typename — the fixture defines both |
 *
 * `ground-desk` is the second project throughout: it has no `nodegx.styles.json`, which is the
 * state of all 48 fixtures in this package and all seven shipped templates, so the absent-dictionary
 * arm is graded rather than assumed.
 */

const catalog: Catalog = loadCatalog();
const parse = (fixture: string) => parseProject(path.join(__dirname, 'fixtures', fixture), catalog);

const looksIr = parse('look-desk');
const looks = emitApp(looksIr, catalog);
const groundIr = parse('ground-desk');
const ground = emitApp(groundIr, catalog);

const CSS = 'src/pages/Looks.module.css';
const REPORT = 'EXPORT-REPORT.md';

/** One class's declarations, in emitted order, without the braces. */
function rule(css: string, className: string): string[] {
  const match = css.match(new RegExp(`\\.${className} \\{\\n([^}]*)\\n\\}`));
  if (!match) throw new Error(`no rule for .${className} in the emitted CSS`);
  return match[1].split('\n').map((line) => line.trim().replace(/;$/, ''));
}

const nodeOf = (ir: ReturnType<typeof parse>, id: string) => {
  const node = ir.components.flatMap((c) => c.nodes).find((n) => n.id === id);
  if (!node) throw new Error(`no node ${id}`);
  return node;
};

// ---------------------------------------------------------------------------------------------------
describe('§AC1 the style dictionary is read', () => {
  test('AC1.1 colours, text styles and Looks all arrive on the IR', () => {
    expect(looksIr.project.styles).toBeDefined();
    expect(looksIr.project.styles!.colors).toEqual({
      'Brand Ink': '#1b2a4a',
      'Brand Paper': '#fdfdfb',
      'Brand Wash': '#eef2ff'
    });
    expect(Object.keys(looksIr.project.styles!.textStyles)).toEqual(['Heading']);
    expect(looksIr.project.styles!.variants).toHaveLength(3);
  });

  test('AC1.2 a Look keeps the state parameters this export does not draw, rather than dropping them', () => {
    const button = looksIr.project.styles!.variants.find((v) => v.name === 'Primary Button')!;
    expect(button.stateParameters).toEqual({ hover: { backgroundColor: 'Brand Wash' } });
  });

  test('AC1.3 the control: a project with no styles file parses to an absent dictionary, not a throw', () => {
    expect(groundIr.project.styles).toBeUndefined();
  });

  test('AC1.4 …and that project still exports — the arm 48 of 48 fixtures take', () => {
    expect(Object.keys(ground.files).length).toBeGreaterThan(5);
    expect(ground.files[REPORT]).not.toContain('Your named styles');
  });
});

// ---------------------------------------------------------------------------------------------------
describe('§AC2 the node carries its Look', () => {
  test('AC2.1 `variant` reaches NodeIR verbatim — the field that was never copied', () => {
    expect(nodeOf(looksIr, 'lookCard').variant).toBe('Card');
    expect(nodeOf(looksIr, 'lookButton').variant).toBe('Primary Button');
  });

  test('AC2.2 a node wearing no Look has no `variant` — absent, not empty string', () => {
    expect(nodeOf(looksIr, 'plainCard').variant).toBeUndefined();
    expect('variant' in nodeOf(looksIr, 'plainCard')).toBe(false);
  });

  test('AC2.3 `parameters` stays the file as written — what a Look lends is a separate pile', () => {
    // The whole point of the split: the report can still say which values a person typed.
    expect(nodeOf(looksIr, 'lookCard').parameters.map((p) => p.name)).toEqual(['borderRadius']);
    expect(nodeOf(looksIr, 'lookCard').inheritedParameters!.map((p) => p.name)).toEqual([
      'backgroundColor',
      'paddingTop'
    ]);
  });

  test('AC2.4 a Look is keyed by name AND typename — the fixture defines `Card` for Group and for Text', () => {
    // Were the key the name alone, the Text `Card` (color #00ff00) would reach the Group node.
    const inherited = nodeOf(looksIr, 'lookCard').inheritedParameters!;
    expect(inherited.find((p) => p.name === 'color')).toBeUndefined();
    expect(rule(looks.files[CSS], 'lookCard')).not.toContain('color: #00ff00');
  });
});

// ---------------------------------------------------------------------------------------------------
describe('§AC3 a Look reaches the CSS, and the node still wins', () => {
  const look = rule(looks.files[CSS], 'lookCard');
  const plain = rule(looks.files[CSS], 'plainCard');

  test('AC3.1 the Look’s values are in the class', () => {
    expect(look).toContain('background-color: #eef2ff'); // the Look's `Brand Wash`, resolved
    expect(look).toContain('padding-top: var(--space-6)'); // the Look's token, passed through
  });

  test('AC3.2 the node’s own parameter beats the Look’s — 24px over the Look’s 12px', () => {
    expect(look).toContain('border-radius: 24px');
    expect(look).not.toContain('border-radius: 12px');
  });

  test('AC3.3 the control: the same Group with the same values typed in emits the same rule but for the colour', () => {
    // Identical but for the one declaration the two nodes genuinely differ on. A resolver that
    // dropped or invented declarations moves this control, not just the arm above.
    expect(plain).toEqual(look.map((d) => (d.startsWith('background-color') ? 'background-color: var(--surface)' : d)));
  });

  test('AC3.4 the control that fires the other way: ground-desk, with no dictionary, is untouched', () => {
    expect(ground.files['src/pages/Ground.module.css']).toContain('background-color: var(--surface)');
  });
});

// ---------------------------------------------------------------------------------------------------
describe('§AC4 a text style reaches the CSS', () => {
  const look = rule(looks.files[CSS], 'lookHeading');
  const plain = rule(looks.files[CSS], 'plainHeading');

  test('AC4.1 the bundle’s declarations are all there — the ones that were silently absent before', () => {
    expect(look).toContain('font-family: Georgia');
    expect(look).toContain('font-weight: 700');
    expect(look).toContain('letter-spacing: 1px');
  });

  test('AC4.2 an individual font port on the node beats the bundle — the port’s own documented rule', () => {
    // The bundle says 32px; the node says var(--text-6xl). `{...textStyle, ...style}`, Text.tsx:48.
    expect(look).toContain('font-size: var(--text-6xl)');
    expect(look).not.toContain('font-size: 32px');
  });

  test('AC4.3 a text style’s colour is itself resolved through the colour dictionary', () => {
    // Two indirections chained: textStyle `Heading` → color `Brand Paper` → #fdfdfb.
    expect(look).toContain('color: #fdfdfb');
  });

  test('AC4.4 an empty field in the bundle is dropped, not emitted as an empty declaration', () => {
    expect(looksIr.project.styles!.textStyles.Heading.textTransform).toBe('');
    expect(look.join('\n')).not.toContain('text-transform');
  });

  test('AC4.5 the control: the same Text with the same values typed in differs in exactly one declaration', () => {
    expect(plain).toEqual(look.map((d) => (d.startsWith('color') ? 'color: #1b2a4a' : d)));
  });

  test('AC4.6 a resolved `textStyle` is no longer reported unmapped…', () => {
    expect(looks.files[REPORT]).not.toContain('parameter textStyle on lookHeading');
  });

  test('AC4.7 …but one naming a style the project does not define still is — silence is the defect', () => {
    // `lostHeading` names `Subheading`, which nothing defines. Consuming that name unconditionally
    // would hide the loss, which is precisely the old behaviour this task closed.
    expect(looks.files[REPORT]).toContain('parameter textStyle on lostHeading');
    expect(rule(looks.files[CSS], 'lostHeading')).toEqual(['margin: 0']);
  });
});

// ---------------------------------------------------------------------------------------------------
describe('§AC5 a colour style name resolves, and nothing else is touched', () => {
  test('AC5.1 a bare style name becomes the colour it stands for', () => {
    expect(rule(looks.files[CSS], 'styleSwatch')).toContain('background-color: #1b2a4a');
  });

  test('AC5.2 the control: a token passes through, exactly as it did before the resolver existed', () => {
    expect(rule(looks.files[CSS], 'tokenSwatch')).toContain('background-color: var(--surface)');
  });

  test('AC5.3 the control: a hex passes through', () => {
    expect(rule(looks.files[CSS], 'hexSwatch')).toContain('background-color: #ff00aa');
  });

  test('AC5.4 a name the dictionary does not hold falls through unchanged — the runtime’s `colors[v] ?? v`', () => {
    // ⚠️ Faithful, and not pretty: this reaches the browser as invalid CSS. It did before this task
    // too — the runtime sets exactly the same string — so it is transcribed rather than fixed here.
    expect(rule(looks.files[CSS], 'unknownSwatch')).toContain('background-color: Brand Fog');
  });

  test('AC5.5 resolution is asked of the catalog, not guessed from the string', () => {
    // `Brand Ink` is also the value of no non-colour port in the fixture; the guard that matters is
    // that the lookup is gated on the catalog's declared port type at all.
    expect(catalog.nodes.find((n) => n.typeName === 'Group')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------------------------------
describe('§AC6 the report says what it carried', () => {
  const report = looks.files[REPORT];

  test('AC6.1 the paragraph exists at all — its absence was the whole defect', () => {
    expect(report).toContain('Your named styles');
  });

  test('AC6.2 every Look is named, with what wore it', () => {
    expect(report).toContain('Look `Card` (Group) — 1 node');
    expect(report).toContain('Look `Primary Button` (net.noodl.controls.button) — 1 node');
  });

  test('AC6.3 a Look nothing wears is not claimed — `Card` (Text) has no wearer in this project', () => {
    expect(report).not.toContain('Look `Card` (Text)');
  });

  test('AC6.4 text styles and colour styles are named too', () => {
    expect(report).toContain('Text style `Heading` — 2 nodes');
    expect(report).toContain('Colour style `Brand Ink`');
  });

  test('AC6.5 🔴 the honest half: states are carried in the file and NOT drawn, and the report says so', () => {
    expect(report).toContain('Hover, pressed and disabled states are not exported yet');
    expect(report).toContain('`Primary Button`');
  });

  test('AC6.6 `variant` is no longer a word the report has never heard — the old signature was 0 mentions', () => {
    expect(report.toLowerCase()).toContain('look');
  });
});

// ---------------------------------------------------------------------------------------------------
describe('§AC7 a node with no style parameters of its own still gets its Look', () => {
  test('AC7.1 the button wearing a Look has a class built entirely from borrowed values', () => {
    // Its own `parameters` hold only `text`. Every declaration below came through the Look, and one
    // of them came through the Look's own text style — two hops.
    expect(nodeOf(looksIr, 'lookButton').parameters.map((p) => p.name)).toEqual(['text']);
    const look = rule(looks.files[CSS], 'lookButton');
    expect(look).toContain('background-color: #1b2a4a');
    expect(look).toContain('border-radius: 8px');
    expect(look).toContain('font-family: Georgia');
    expect(look).toContain('font-size: 32px');
  });

  test('AC7.2 the control: the identical button without the Look gets no class at all', () => {
    expect(looks.files[CSS]).not.toContain('.plainButton');
  });
});
