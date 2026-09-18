/**
 * Icon-font gate (CHR-010).
 *
 * The editor shipped two icon systems. Font Awesome 4.7 was linked on every
 * window — a 1.1 MB vendored directory and a `<link>` ahead of the launcher's
 * first paint — to draw 23 glyphs, 16 of them in the property panel, beside
 * core-ui's `Icon` set drawing everything else. Two systems in one column means
 * two stroke weights, two grids and two colour mechanisms: an FA glyph is TEXT,
 * sized by the inherited `font-size` and coloured by `color`, while an `Icon`
 * is an inlined SVG on a 16 grid at a named `IconSize`. They never matched, and
 * nothing measured that they didn't.
 *
 * CHR-010 converted all 23 and deleted the font. This gate keeps it deleted.
 *
 * **A gate at zero, not a ratchet.** There is no legacy tail left to burn down,
 * so a reintroduction is a straight regression and should fail rather than
 * quietly raise a number — the same call `css-icon-url-ratchet.js` makes.
 *
 * ## What it counts, and why that population
 *
 * Comments are stripped first. This is not tidiness, it is the difference
 * between a gate and a grep: at the moment CHR-010 landed, the only two
 * `FontAwesome` strings left under `packages/*​/src` were both PROSE — a note in
 * `ListInputRow.module.scss` about the 33px buttons the icons replaced, and one
 * in `variantseditor.tsx` about the bar that used to carry an FA plus. A gate
 * that reddens on its own changelog is a gate someone switches off. (CHR-008
 * §10.4 hit this exact failure from the other side: an AC whose `grep -rl
 * createRoot` counted files that merely *discussed* `createRoot`.)
 *
 * The patterns are deliberately wider than "the string `fa fa-`", because the
 * dependency this task actually found hardest was not written that way:
 *
 *   - `popuplayer.ts` held FA through `classList.add('fa-share')` — a quoted
 *     glyph token, never adjacent to the word `fa`.
 *   - `PortGroup.tsx` wrote ``className={`fa ${x ? 'fa-caret-up' : …}`}`` — the
 *     two classes split by an interpolation, so a `fa fa-` regex never saw it.
 *
 * A gate's population is exactly what its regex matches, so it matches four
 * things: the canonical `fa fa-` pair, a class attribute opening with the bare
 * `fa` class, a quoted `fa-<glyph>` token, and the `font-awesome`/`FontAwesome`
 * names (the stylesheet and the `font-family`).
 *
 * Build output is skipped: `index.bundle.js` and its map are gitignored webpack
 * artefacts that go on holding the old strings until the next rebuild, so
 * counting them would make the gate report the build's age, not the source's.
 *
 * Out of scope by design — the user's apps, not the editor's chrome:
 *   - `library/modules/font-awesome-{brands,solid}` — Font Awesome 6 Free,
 *     shipped INTO a user's project as a `noodl_modules` library. A different
 *     system for a different document, correctly separate, and outside
 *     `packages/*​/src` anyway.
 *
 *   node scripts/icon-font-gate.js          # check (exit 1 on any hit)
 *   node scripts/icon-font-gate.js --list   # list every scanned file
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/** Every `packages/<name>/src`, discovered rather than listed. */
function targets() {
  return fs
    .readdirSync(path.join(ROOT, 'packages'), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => `packages/${e.name}/src`)
    .filter((rel) => fs.existsSync(path.join(ROOT, rel)))
    .sort();
}

const SKIP_DIRS = new Set(['node_modules', 'dist', 'out', 'coverage', '.git', '.cache', 'storybook-static']);

/** Webpack output checked in beside the source it was built from (gitignored). */
const SKIP_FILE = /\.bundle\.js(\.map)?$/;

const SCAN_EXT = /\.(ts|tsx|js|jsx|css|scss|html)$/;

const BLOCK_COMMENT_RE = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT_RE = /(^|[^:'"`])\/\/.*$/gm;
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g;

/**
 * The four shapes an editor-side Font Awesome dependency takes. Each carries the
 * sentence a reader needs, because a gate that names only a file makes the next
 * person re-derive what it objected to.
 */
const PATTERNS = [
  { name: 'fa-class-pair', re: /\bfa\s+fa-[a-z0-9-]+/g, what: 'the canonical `fa fa-<glyph>` class pair' },
  { name: 'fa-class-attr', re: /\bclass(?:Name)?\s*=\s*(?:"|'|\{`)fa\b/g, what: 'a class attribute opening with the bare `fa` class' },
  { name: 'fa-glyph-token', re: /(['"`])fa-[a-z0-9-]+\1/g, what: 'a quoted `fa-<glyph>` token (a class set from code)' },
  { name: 'font-awesome-name', re: /font-awesome|FontAwesome/g, what: 'the Font Awesome stylesheet or font-family name' }
];

function findFiles() {
  const files = [];

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full);
      } else if (entry.isFile() && SCAN_EXT.test(entry.name) && !SKIP_FILE.test(entry.name)) {
        files.push(path.relative(ROOT, full).split(path.sep).join('/'));
      }
    }
  }

  for (const target of targets()) walk(path.join(ROOT, target));
  return files.sort();
}

/**
 * Blank comments while preserving newlines, so the line numbers reported still
 * match the file on disk.
 */
function stripComments(raw) {
  const blank = (match) => match.replace(/[^\n]/g, ' ');
  return raw
    .replace(HTML_COMMENT_RE, blank)
    .replace(BLOCK_COMMENT_RE, blank)
    .replace(LINE_COMMENT_RE, (m, p1) => p1 + blank(m.slice(p1.length)));
}

function findHits(relPath) {
  const stripped = stripComments(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));

  const hits = [];
  for (const { name, re, what } of PATTERNS) {
    for (const match of stripped.matchAll(re)) {
      const line = stripped.slice(0, match.index).split('\n').length;
      hits.push({ line, rule: name, what, text: match[0] });
    }
  }
  return hits.sort((a, b) => a.line - b.line);
}

function main() {
  const list = process.argv.includes('--list');
  const files = findFiles();

  const offenders = [];
  for (const file of files) {
    for (const hit of findHits(file)) offenders.push({ file, ...hit });
  }

  if (list) for (const file of files) console.log(file);

  console.log(`Scanned ${files.length} source files under ${targets().join(', ')}`);
  console.log('(comments stripped; webpack bundles skipped)\n');

  if (offenders.length === 0) {
    console.log('✓ 0 Font Awesome references. The editor draws every glyph from one icon set.\n');
    return 0;
  }

  console.error(`✗ ${offenders.length} Font Awesome reference(s):\n`);
  for (const { file, line, what, text } of offenders) {
    console.error(`  ${file}:${line}\t${text.trim()}\n\t\t${what}`);
  }
  console.error('');
  console.error('Font Awesome was deleted by CHR-010 — the stylesheet, the webfont and the');
  console.error('<link> are all gone, so this glyph will not render at all. It is also a');
  console.error('second icon system: an FA glyph is text, sized by the inherited font-size,');
  console.error('while the rest of the editor draws inlined SVG on a 16 grid at a named size.');
  console.error('');
  console.error("  import { Icon, IconName, IconSize } from '@noodl-core-ui/components/common/Icon';");
  console.error('  <Icon icon={IconName.Foo} size={IconSize.Small} />');
  console.error('');
  console.error('If the glyph is missing from the set, add it to');
  console.error('packages/noodl-core-ui/src/assets/icons/icon-component/ (currentColor, 16x16,');
  console.error('per dev-docs/guidelines/ICONOGRAPHY.md) and give it an IconName entry.');
  console.error('');
  console.error('For imperative DOM, host an <Icon> in a detached React root — see');
  console.error("`iconHost` in editor/src/views/popuplayer.ts. Note that <Icon> is `display:");
  console.error('block`, so a host replacing an inline <i> on a text line needs inline-flex.');
  console.error('');
  return 1;
}

try {
  process.exit(main());
} catch (err) {
  console.error(err);
  process.exit(1);
}
