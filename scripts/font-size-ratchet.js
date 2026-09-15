/**
 * Raw-px font-size ratchet (CHR-002).
 *
 * R1 (phase 92, ruled 2026-09-15) gives the chrome five sizes, 11 / 12 / 13 /
 * 15 / 20, plus a display size of 26, as the `--font-size-*` tokens in
 * `packages/noodl-core-ui/src/styles/custom-properties/fonts.css`. That file
 * has said "do not hardcode px sizes" since phase 23, and the launcher's 141
 * `font-size` declarations used the tokens 0 times. A comment is not a gate.
 *
 * Same shape as `hex-color-ratchet.js`: per-package counts may fall but never
 * rise, so a drop in one package cannot mask a rise in the other.
 *
 * What counts, in `.css`/`.scss` source text with comments stripped:
 *   - a `font-size:` declaration whose value is a px literal (`font-size: 13px`)
 *   - a `font:` shorthand carrying a px size (`font: 600 11px/1 var(--font-family)`),
 *     which a `font-size` regex cannot see
 * Custom-property definitions (`--font-size-xs: 11px`) do not count; neither
 * does `var(...)`, `inherit`, or an em/rem/% size.
 *
 * `scopes` in the baseline are the three directories CHR-001 counted statically
 * (`verdicts/CHR-001/2026-09-15/numbers.json` → `static.fontSizeDeclarations`).
 * They are reported, not gated, so a converted surface can be read off directly.
 *
 *   node scripts/font-size-ratchet.js             # check against the baseline
 *   node scripts/font-size-ratchet.js --update    # rewrite the baseline from reality
 *   node scripts/font-size-ratchet.js --report    # list every file that still has one
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BASELINE_PATH = path.join(ROOT, '.font-size-baseline.json');

/** Directory names never descended into, anywhere under the roots. */
const SKIP_DIRS = new Set(['node_modules', 'dist', 'out', 'coverage', '.git', '.cache', 'storybook-static']);

// `(^|[^\w-])` keeps `--font-size-xs:` and `-webkit-font-size:` out.
const FONT_SIZE_RE = /(^|[^\w-])font-size\s*:\s*-?\d*\.?\d+px\b/g;
const FONT_SHORTHAND_RE = /(^|[^\w-])font\s*:[^;{}]*?\d*\.?\d+px\b/g;
const COMMENT_RE = /\/\*[\s\S]*?\*\//g;
// SCSS line comments; the guard keeps `url(http://…)` and quoted `//` intact.
const LINE_COMMENT_RE = /(^|[^:'"`])\/\/.*$/gm;

// -- discovery ---------------------------------------------------------------

function findStylesheets(roots, exclude) {
  const excluded = new Set(exclude);
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
      const rel = path.relative(ROOT, full).split(path.sep).join('/');
      if (excluded.has(rel)) continue;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full);
      } else if (entry.isFile() && /\.(css|scss)$/.test(entry.name)) {
        files.push(rel);
      }
    }
  }

  for (const root of roots) walk(path.join(ROOT, root));
  return files.sort();
}

// -- counting ----------------------------------------------------------------

function countFile(relPath) {
  let text = fs.readFileSync(path.join(ROOT, relPath), 'utf8').replace(COMMENT_RE, '');
  if (relPath.endsWith('.scss')) text = text.replace(LINE_COMMENT_RE, '$1');
  const sizes = (text.match(FONT_SIZE_RE) || []).length;
  const shorthands = (text.match(FONT_SHORTHAND_RE) || []).length;
  return sizes + shorthands;
}

function packageOf(relPath) {
  const segments = relPath.split('/');
  return segments[0] === 'packages' ? segments[1] : segments[0];
}

function countAll(baseline) {
  const files = findStylesheets(baseline.targets, baseline.exclude);
  const byFile = {};
  const byPackage = {};
  for (const file of files) {
    const count = countFile(file);
    if (count === 0) continue;
    byFile[file] = count;
    const pkg = packageOf(file);
    byPackage[pkg] = (byPackage[pkg] || 0) + count;
  }
  const byScope = {};
  for (const scope of Object.keys(baseline.scopes || {})) {
    byScope[scope] = Object.entries(byFile)
      .filter(([file]) => file.startsWith(scope + '/'))
      .reduce((acc, [, count]) => acc + count, 0);
  }
  return { scanned: files.length, byFile, byPackage, byScope };
}

// -- reporting ---------------------------------------------------------------

function formatTable(rows, headers) {
  const widths = headers.map((header, i) => Math.max(header.length, ...rows.map((row) => String(row[i]).length)));
  const line = (cells) => '| ' + cells.map((cell, i) => String(cell).padEnd(widths[i])).join(' | ') + ' |';
  return [line(headers), '|' + widths.map((w) => '-'.repeat(w + 2)).join('|') + '|', ...rows.map(line)].join('\n');
}

function delta(count, max) {
  const d = count - max;
  return d > 0 ? `+${d}` : d < 0 ? String(d) : '=';
}

function git(command) {
  try {
    return execSync(command, { cwd: ROOT }).toString().trim();
  } catch {
    return '';
  }
}

// -- main ----------------------------------------------------------------

function main() {
  const update = process.argv.includes('--update');
  const report = process.argv.includes('--report');
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  const result = countAll(baseline);
  const packages = Array.from(new Set([...Object.keys(baseline.max), ...Object.keys(result.byPackage)])).sort();

  console.log(`Scanned ${result.scanned} .css/.scss files under ${baseline.targets.join(', ')}\n`);
  console.log(
    formatTable(
      packages.map((pkg) => {
        const count = result.byPackage[pkg] || 0;
        const max = baseline.max[pkg] ?? 0;
        return [pkg, count, max, delta(count, max)];
      }),
      ['Package', 'Raw px sizes', 'Baseline', 'Delta']
    )
  );
  console.log('');

  const scopes = Object.keys(baseline.scopes || {});
  if (scopes.length) {
    console.log(
      formatTable(
        scopes.map((scope) => [scope, result.byScope[scope], baseline.scopes[scope]]),
        ['Surface (reported, not gated)', 'Now', 'At baseline']
      )
    );
    console.log('');
  }

  if (report) {
    const files = Object.entries(result.byFile).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    console.log(formatTable(files, ['File', 'Raw px sizes']));
    console.log('');
  }

  if (update) {
    const dirty = git('git status --porcelain -- "*.css" "*.scss"').split('\n').filter(Boolean).length;
    if (dirty > 0) {
      console.warn(`! ${dirty} uncommitted .css/.scss file(s) are being written into the baseline`);
      console.warn(`  as if they were part of ${git('git rev-parse --short HEAD')}. Commit first if that is wrong.\n`);
    }
    const next = {
      ...baseline,
      commit: git('git rev-parse --short HEAD') || 'unknown',
      max: result.byPackage,
      scopes: result.byScope,
      byFile: result.byFile
    };
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(next, null, 2) + '\n');
    console.log(`Baseline updated to ${Object.values(result.byPackage).reduce((a, b) => a + b, 0)} total.`);
    return 0;
  }

  const risen = packages.filter((pkg) => (result.byPackage[pkg] || 0) > (baseline.max[pkg] ?? 0));
  if (risen.length) {
    console.error(
      `✗ ${risen.map((p) => `${p} rose by ${(result.byPackage[p] || 0) - (baseline.max[p] ?? 0)}`).join(', ')}.`
    );
    console.error('  These counts may go down, never up.\n');
    const worse = Object.entries(result.byFile)
      .map(([file, count]) => [file, count - (baseline.byFile[file] || 0)])
      .filter(([, d]) => d > 0)
      .sort((a, b) => b[1] - a[1]);
    if (worse.length) {
      console.error('Files that grew since the baseline:');
      for (const [file, d] of worse.slice(0, 20)) console.error(`  +${d}\t${file}`);
      console.error('');
    }
    console.error('Use a --font-size-* token from noodl-core-ui/src/styles/custom-properties/fonts.css');
    console.error('(xs 11 · sm 12 · md 13 · lg 15 · xl 20 · display 26; R1, phase 92). If a size genuinely');
    console.error('cannot be a token, say why at the call site, run `npm run type:baseline`, and commit the');
    console.error('raised baseline so a reviewer sees the decision.\n');
    return 1;
  }

  const fallen = packages.reduce((acc, pkg) => acc + Math.max(0, (baseline.max[pkg] ?? 0) - (result.byPackage[pkg] || 0)), 0);
  console.log(
    fallen > 0
      ? `✓ ${fallen} fewer raw px size(s) than the baseline. Lower it with \`npm run type:baseline\`.\n`
      : '✓ Holding the line.\n'
  );
  return 0;
}

try {
  process.exit(main());
} catch (err) {
  console.error(err);
  process.exit(1);
}
