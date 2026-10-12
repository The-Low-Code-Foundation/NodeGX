/**
 * OWN-005: the look is a projection, and a gate says so.
 *   1. look.ts is what the generator produces today (`--check`), so a CanvasTheme, structureLane,
 *      NodeGraphEditorNode or colors.css change without a regeneration is a red test in the fast suite.
 *   2. The runtime's second palette (nodelibraryexport.ts `colors.nodes`) is within 16 per channel of the
 *      dark schemes — the same tolerance CanvasThemeNodeSchemes.test.ts grades in the Electron suite,
 *      here where it runs on every `test:packages`.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..', '..');
const generate = path.join(root, 'scripts', 'canvas-look', 'generate.js');

function loadLook() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'look.ts'), 'utf8');
  const json = src.slice(src.indexOf('export const look = ') + 'export const look = '.length, src.lastIndexOf(' as const;'));
  return JSON.parse(json);
}
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const rgb = (c) => {
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : hex(c);
};

test('look.ts is what the generator produces now (nothing drifted since it was written)', () => {
  const out = execFileSync(process.execPath, [generate, '--check'], { encoding: 'utf8' });
  expect(out).toContain('up to date');
});

test('every scheme has every field in both themes, and the dark identities hold', () => {
  const look = loadLook();
  for (const theme of ['dark', 'light']) {
    for (const name of ['component', 'visual', 'data', 'logic', 'javascript', 'default']) {
      const s = look.colors[theme].nodeSchemes[name];
      for (const k of ['base', 'baseHighlighted', 'header', 'headerHighlighted', 'outline', 'outlineHighlighted', 'text']) expect(typeof s[k]).toBe('string');
      expect(s.headerHighlighted).toBe(s.base);
      expect(s.outline).toBe(s.header);
    }
  }
});

test("the runtime's second palette (nodelibraryexport.ts) is within 16 per channel of the dark schemes", () => {
  const look = loadLook();
  const src = fs.readFileSync(path.join(root, 'packages', 'noodl-runtime', 'src', 'nodelibraryexport.ts'), 'utf8');
  const blob = src.slice(src.indexOf('nodes: {', src.indexOf('colors: {')), src.indexOf('connections: {'));
  const re = /(\w+): \{\s*base: '(#[0-9a-f]{6})',\s*baseHighlighted: '(#[0-9a-f]{6})',\s*header: '(#[0-9a-f]{6})'/gi;
  let m;
  let seen = 0;
  while ((m = re.exec(blob))) {
    const scheme = look.colors.dark.nodeSchemes[m[1]];
    expect(scheme).toBeDefined();
    for (const [field, value] of [['base', m[2]], ['header', m[4]]]) {
      const a = rgb(scheme[field]);
      const b = hex(value);
      for (let i = 0; i < 3; i++) expect(Math.abs(a[i] - b[i])).toBeLessThanOrEqual(16);
    }
    seen++;
  }
  expect(seen).toBe(5);
});
