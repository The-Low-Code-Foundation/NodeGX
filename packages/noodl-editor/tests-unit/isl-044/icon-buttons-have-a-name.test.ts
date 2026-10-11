/**
 * P109 ISL-044 · P101-INS003-ICONBTN — every icon button in the editor has a name a screen reader says.
 *
 * `IconButton` draws an icon and nothing else unless it is given `label`, so a screen reader read every
 * icon-only button as "button". It now takes `ariaLabel`, and its props make an icon-only button without
 * one a type error. The compiler cannot see a `.jsx` caller, so this reads every `<IconButton` in the
 * editor's and core-ui's source and asks each one for `ariaLabel` or `label`.
 *
 * `IconButton` cannot be rendered here (it imports `Icon`, whose `require.context` ts-jest refuses), so
 * the rendering half is one source assertion. The person half was read in the running editor (ISL-044 §8).
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const ROOTS = [path.join(REPO, 'packages/noodl-core-ui/src'), path.join(REPO, 'packages/noodl-editor/src/editor/src')];
const ICON_BUTTON = path.join(REPO, 'packages/noodl-core-ui/src/components/inputs/IconButton/IconButton.tsx');

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') sources(p, out);
    } else if (/\.(tsx|jsx)$/.test(entry.name) && !/\.bundle\./.test(entry.name)) out.push(p);
  }
  return out;
}

/** The opening tag from `<IconButton` to its closing `>`, skipping braces and strings inside it. */
function openingTag(text: string, from: number): string {
  let depth = 0;
  let quote = '';
  for (let i = from + 1; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote && text[i - 1] !== '\\') quote = '';
    } else if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (ch === '>' && depth === 0) return text.slice(from, i + 1);
  }
  return text.slice(from);
}

interface Placement {
  at: string;
  tag: string;
}

function placements(): Placement[] {
  const out: Placement[] = [];
  for (const file of ROOTS.flatMap((r) => sources(r))) {
    if (file === ICON_BUTTON) continue;
    const text = fs.readFileSync(file, 'utf8');
    const re = /<IconButton[\s/>]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const line = text.slice(0, m.index).split('\n').length;
      out.push({ at: `${path.relative(REPO, file)}:${line}`, tag: openingTag(text, m.index) });
    }
  }
  return out;
}

describe('P101-INS003-ICONBTN — every icon button has a name', () => {
  const all = placements();

  it('🔴 control: the census finds the editor’s icon buttons (the top bar alone has ten)', () => {
    expect(all.length).toBeGreaterThan(60);
    expect(all.filter((p) => p.at.includes('EditorTopbar.tsx')).length).toBe(10);
  });

  it('every <IconButton> says what it does: ariaLabel, or words drawn beside it in label', () => {
    // A spread (`{...args}`, the story's own playground) cannot be read here: counted, not passed.
    const unnamed = all.filter((p) => !/\bariaLabel=/.test(p.tag) && !/\blabel=/.test(p.tag) && !/\{\.\.\./.test(p.tag));
    expect(unnamed.map((p) => p.at)).toEqual([]);
  });

  it('the button renders the name as aria-label', () => {
    const src = fs.readFileSync(ICON_BUTTON, 'utf8');
    expect(src).toMatch(/aria-label=\{ariaLabel\}/);
    expect(src).toMatch(/\{ label\?: undefined; ariaLabel: string \}/);
  });
});
