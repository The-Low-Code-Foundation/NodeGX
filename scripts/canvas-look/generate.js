#!/usr/bin/env node
/**
 * canvas-look — the NodeGX canvas look as data, PROJECTED from the editor, never written by hand.
 * Phase 112 (your own NodeGX), OWN-005. Writes packages/nodegx-canvas-look/src/look.ts.
 *
 * What it reads, and how (so nobody has to trust it):
 *   colours      the editor's own `CanvasTheme` (views/nodegrapheditor/canvas/CanvasTheme.ts), RUN, not parsed:
 *                this script bundles it with esbuild, gives it a fake `document` whose `getComputedStyle` answers
 *                from the real token CSS (noodl-core-ui/src/styles/custom-properties/colors.css, `:root` for dark,
 *                `:root[data-theme='light']` over it for light, `var()` resolved), and records `instance.colors`
 *                per theme, plus `connectionColors()` for data, signal and error wires. A third pass with no
 *                document records the headless fallbacks; if they differ from the dark CSS the script FAILS,
 *                because that is the drift the fallback table exists to not have.
 *   card         `NodeGraphEditorNode`'s `public static readonly` metrics, parsed from the source text (the class
 *                imports half the editor, so it is read, not run); `headerTextInset` recomputed from its formula.
 *   lane         `StructureLane` from structureLane.ts, imported (it imports nothing).
 *   fonts, wire label chip, grid cell   `CanvasFonts`, `WireLabel`, `GRID_CELL_SIZE`, `WIRE_TYPE_ERROR` from CanvasTheme.
 * Not projected: the category glyph inside the header chip is drawn with strokes in NodeGraphEditorNodePainter
 * (`paintCategoryGlyph`), code rather than data; a home-made editor draws its own.
 *
 * Usage:   node scripts/canvas-look/generate.js            # regenerate look.ts
 *          node scripts/canvas-look/generate.js --check    # exit 1 if look.ts on disk is stale
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const CHECK = process.argv.includes('--check');
const root = path.join(__dirname, '..', '..');
const rel = (p) => path.relative(root, p).split(path.sep).join('/');
const canvasDir = path.join(root, 'packages', 'noodl-editor', 'src', 'editor', 'src', 'views', 'nodegrapheditor');
const themePath = path.join(canvasDir, 'canvas', 'CanvasTheme.ts');
const lanePath = path.join(canvasDir, 'canvas', 'structureLane.ts');
const nodePath = path.join(canvasDir, 'NodeGraphEditorNode.ts');
const cssPath = path.join(root, 'packages', 'noodl-core-ui', 'src', 'styles', 'custom-properties', 'colors.css');
const outPath = path.join(root, 'packages', 'nodegx-canvas-look', 'src', 'look.ts');

// ---- the token CSS, both themes, var() resolved
function parseTokens(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const dark = {};
  const light = {};
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = blockRe.exec(text))) {
    const selector = m[1].trim();
    const target = selector === ':root' ? dark : selector === ":root[data-theme='light']" ? light : undefined;
    if (!target) continue;
    for (const decl of m[2].split(';')) {
      const i = decl.indexOf(':');
      if (i < 0) continue;
      const name = decl.slice(0, i).trim();
      if (name.startsWith('--')) target[name] = decl.slice(i + 1).trim();
    }
  }
  const resolve = (map, fallbackMap) => {
    const out = {};
    const get = (name, seen = new Set()) => {
      if (seen.has(name)) throw new Error(`colors.css: ${name} refers to itself`);
      seen.add(name);
      const raw = name in map ? map[name] : fallbackMap[name];
      if (raw === undefined) return undefined;
      return raw.replace(/var\((--[a-z0-9-]+)(?:\s*,\s*([^)]*))?\)/gi, (_, ref, fb) => get(ref, new Set(seen)) ?? (fb ?? '').trim());
    };
    for (const name of new Set([...Object.keys(fallbackMap), ...Object.keys(map)])) out[name] = get(name);
    return out;
  };
  const darkResolved = resolve(dark, {});
  const lightResolved = resolve(light, dark);
  return { dark: darkResolved, light: lightResolved };
}

// ---- the card metrics, from the class's statics
function parseCard(src) {
  const card = {};
  const re = /public static readonly (\w+) = (\{ width: (\d+), height: (\d+) \}|[\d.]+);/g;
  let m;
  while ((m = re.exec(src))) card[m[1]] = m[3] ? { width: Number(m[3]), height: Number(m[4]) } : Number(m[2]);
  for (const k of ['size', 'childMargin', 'childSpacing', 'borderSize', 'propertyConnectionHeight', 'verticalSpacing', 'cornerRadius', 'headerChipSize', 'headerChipInset', 'commentStripeWidth', 'stackedCardEdgeOffset']) {
    if (card[k] === undefined) throw new Error(`${rel(nodePath)}: static ${k} not found — the regex in generate.js needs updating`);
  }
  if (!/headerTextInset =\s*NodeGraphEditorNode\.headerChipInset \+ NodeGraphEditorNode\.headerChipSize \+ 8/.test(src)) throw new Error(`${rel(nodePath)}: headerTextInset's formula moved`);
  card.headerTextInset = card.headerChipInset + card.headerChipSize + 8;
  return card;
}

// ---- CanvasTheme, run
function probe(tokens) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-look-'));
  const entry = path.join(dir, 'probe.ts');
  fs.writeFileSync(entry, `
import { CanvasTheme, CanvasFonts, WireLabel, GRID_CELL_SIZE, WIRE_TYPE_ERROR } from ${JSON.stringify(themePath)};
import { StructureLane } from ${JSON.stringify(lanePath)};
const tokens = JSON.parse(process.env.CANVAS_LOOK_TOKENS as string) as { dark: Record<string, string>; light: Record<string, string> };
let current: Record<string, string> = {};
const g = globalThis as Record<string, unknown>;
g.document = { documentElement: {} };
g.getComputedStyle = () => ({ getPropertyValue: (n: string) => current[n] ?? '' });
const theme = CanvasTheme.instance;
const snap = () => JSON.parse(JSON.stringify(theme.colors));
const wires = () => ({ data: theme.connectionColors('number'), signal: theme.connectionColors('signal'), error: theme.connectionColors(WIRE_TYPE_ERROR) });
const fallback = snap();
current = tokens.dark; theme.refresh(); const dark = snap(); const darkWires = wires();
current = tokens.light; theme.refresh(); const light = snap(); const lightWires = wires();
process.stdout.write(JSON.stringify({ fallback, dark, light, wires: { dark: darkWires, light: lightWires }, fonts: CanvasFonts, wireLabel: WireLabel, gridCellSize: GRID_CELL_SIZE, wireTypeError: WIRE_TYPE_ERROR, lane: StructureLane }));
`);
  const bundle = path.join(dir, 'probe.cjs');
  execFileSync(path.join(root, 'node_modules', '.bin', 'esbuild'), [entry, '--bundle', '--platform=node', '--format=cjs', `--outfile=${bundle}`, '--log-level=warning'], { stdio: ['ignore', 'ignore', 'inherit'] });
  try {
    return JSON.parse(execFileSync(process.execPath, [bundle], { encoding: 'utf8', env: { ...process.env, CANVAS_LOOK_TOKENS: JSON.stringify(tokens) } }));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const tokens = parseTokens(fs.readFileSync(cssPath, 'utf8'));
const p = probe(tokens);
const card = parseCard(fs.readFileSync(nodePath, 'utf8'));

// the headless fallbacks must be the dark CSS: that is what they are for
const drift = Object.keys(p.fallback)
  .filter((k) => typeof p.fallback[k] === 'string' && p.fallback[k] !== p.dark[k])
  .map((k) => `${k}: fallback ${p.fallback[k]} but colors.css dark gives ${p.dark[k]}`);
if (drift.length) {
  console.error(`canvas-look: CanvasTheme's headless fallbacks have drifted from colors.css (${drift.length}):\n  ${drift.join('\n  ')}`);
  process.exit(1);
}

const look = {
  sources: [rel(themePath), rel(lanePath), rel(nodePath), rel(cssPath)],
  colors: { dark: p.dark, light: p.light },
  wires: p.wires,
  fonts: p.fonts,
  wireLabel: p.wireLabel,
  gridCellSize: p.gridCellSize,
  wireTypeError: p.wireTypeError,
  card,
  lane: p.lane
};
const ts = `/**
 * GENERATED by scripts/canvas-look/generate.js — do not edit; \`npm run canvas-look\` regenerates it and
 * \`npm run canvas-look:check\` (in this package's test) fails when it is stale. The NodeGX canvas look, projected
 * from the editor: CanvasTheme run against the real token CSS in both themes, the card statics, the structure lane.
 * Sources: ${look.sources.join(', ')}.
 */
export const look = ${JSON.stringify(look, null, 2)} as const;
`;
if (CHECK) {
  const onDisk = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : '';
  if (onDisk !== ts) {
    console.error(`canvas-look: ${rel(outPath)} is stale — run \`node scripts/canvas-look/generate.js\``);
    process.exit(1);
  }
  console.log('canvas-look: up to date');
  process.exit(0);
}
fs.writeFileSync(outPath, ts);
console.log(`canvas-look: wrote ${rel(outPath)} (${Object.keys(p.dark.nodeSchemes).length} schemes × 2 themes, ${Object.keys(card).length} card metrics, ${Object.keys(p.lane).length} lane constants)`);
