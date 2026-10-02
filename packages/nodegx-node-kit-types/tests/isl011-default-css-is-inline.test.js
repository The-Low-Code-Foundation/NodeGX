/**
 * P109 ISL-011 AC2 (ruling 1a) — everything a kit author reads says that `defaultCss` is an INLINE style.
 *
 * The garden kit's world drew as one flat rectangle because its stylesheet said `display: grid` on the root's class
 * while `defaultCss` said `display: block`, and the inline value won. Nothing an author read said that `defaultCss`
 * and `inputCss` arrive as `props.style`, inline, and beat the kit's own stylesheet. This gate reads the four
 * surfaces an author meets — the docs page, the types, the scaffold's example node and the scaffold's generated
 * README — and fails by name for each one that lost the sentence. ISL-015's trap gate will fold this row in.
 *
 * 🔴 Known-firing control: each surface still names `defaultCss` at all, so a surface that moved or lost the field
 * reads as its own row, not as "the sentence is missing".
 */
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..', '..', '..');
const read = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');

/** The sentence, as a shape, in either order: `defaultCss` near the words that say it is inline and wins. */
const SAYS_INLINE =
  /(defaultCss[\s\S]{0,420}?inline style[\s\S]{0,260}?(beats|wins over) any\s+(\/\/\s*)?rule)|(inline style[\s\S]{0,260}?(beats|wins over) any\s+(\/\/\s*)?rule[\s\S]{0,420}?defaultCss)/;

const SURFACES = [
  { name: 'the docs page', file: 'docs-site/docs/custom-nodes.md' },
  { name: 'the types', file: 'packages/nodegx-node-kit-types/src/index.d.ts' },
  { name: "the scaffold's example node (its comment)", file: 'packages/nodegx-kit-scaffold/src/index.js', slice: /Structure, not decisions[\s\S]{0,900}?defaultCss: \{/ },
  { name: "the scaffold's generated README", file: 'packages/nodegx-kit-scaffold/src/index.js', slice: /## Ports[\s\S]{0,2000}?## Adding a node/ }
];

describe('ISL-011 — a kit author reads that defaultCss is an inline style that beats the stylesheet', () => {
  test('known-firing control: every surface names defaultCss', () => {
    const missing = SURFACES.filter((s) => !/defaultCss/.test(read(s.file)));
    expect(missing.map((s) => s.name)).toEqual([]);
  });

  test.each(SURFACES.map((s) => [s.name, s]))('%s says so', (_name, surface) => {
    let text = read(surface.file);
    if (surface.slice) {
      const m = surface.slice.exec(text);
      expect({ surface: surface.name, sliceFound: !!m }).toEqual({ surface: surface.name, sliceFound: true });
      text = m[0];
    }
    expect({ surface: surface.name, saysInline: SAYS_INLINE.test(text) }).toEqual({ surface: surface.name, saysInline: true });
  });

  test('the docs page says the same object draws in the canvas, on a deployed page and in an exported app (ruling 2a)', () => {
    const docs = read('docs-site/docs/custom-nodes.md');
    expect(/defaultCss[\s\S]{0,700}?editor canvas, on a deployed page and in\s+an exported app/.test(docs)).toBe(true);
  });
});
