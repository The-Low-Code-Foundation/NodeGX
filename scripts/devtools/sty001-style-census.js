#!/usr/bin/env node
/**
 * STY-001 — the style census.
 *
 * Phase 94 asks "what decides the look of an app today, and which of those routes does
 * anyone actually take?". This counts the second half over the corpus we ship, so the
 * reach numbers in STY-001's page are a measurement and not an estimate
 * (STY-001 AC3, [[rank-by-the-product-surface-not-by-a-corpus]]).
 *
 * A node's colour parameter is ONE string that can mean three different things, and
 * `ProjectModel.resolveColor` (projectmodel.ts:716) decides which in this order:
 *
 *   1. a name in `metadata.styles.colors`      → a project colour style
 *   2. `var(--x)` resolved against the tokens  → a design token
 *   3. anything else                           → the literal itself
 *
 * So a colour style named `--primary` SHADOWS the token `--primary`, silently. This
 * script reports that collision as its own row because nothing in the product does.
 *
 * Usage:  node scripts/devtools/sty001-style-census.js [--json] [templates|<dir>...]
 *
 * Reads only. Writes nothing. Takes no editor and no dev stack.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const DEFAULT_TOKENS_SRC = path.join(REPO, 'packages', 'nodegx-project-contract', 'tokens.ts');

/* ── the shipped token vocabulary ────────────────────────────────────────────── */

/**
 * The default tokens are TypeScript, and this script is plain Node run without a
 * build step, so the names are read out of the source rather than imported. If the
 * shape of `tokens.ts` changes this returns fewer names and the census says so
 * instead of silently reporting every reference as dangling.
 */
function readDefaultTokenNames() {
  let src;
  try {
    src = fs.readFileSync(DEFAULT_TOKENS_SRC, 'utf8');
  } catch (err) {
    return { names: new Set(), error: `could not read ${DEFAULT_TOKENS_SRC}: ${err.message}` };
  }
  const names = new Set();
  const re = /name:\s*['"](--[A-Za-z0-9-]+)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) names.add(m[1]);
  return {
    names,
    error: names.size === 0 ? `parsed 0 token names out of ${DEFAULT_TOKENS_SRC} — the file's shape changed` : null
  };
}

/* ── classification ──────────────────────────────────────────────────────────── */

const VAR_REF = /^var\(\s*(--[A-Za-z0-9-]+)\s*\)$/;
const HEX = /^#[0-9a-fA-F]{3,8}$/;
const FUNC_COLOR = /^(rgba?|hsla?)\(/i;

const ROUTES = [
  'project colour style',
  'project text style',
  'design token — project override',
  'design token — shipped default',
  'design token — DANGLING (no such token)',
  'literal typed on the node',
  'other / not a colour'
];

function classify(value, ctx) {
  if (typeof value !== 'string' || value === '') return null;

  // 1. resolveColor checks styles.colors FIRST, so a style name wins over everything.
  if (ctx.styleColors.has(value)) return 'project colour style';
  if (ctx.styleText.has(value)) return 'project text style';

  const ref = value.match(VAR_REF);
  if (ref) {
    const name = ref[1];
    if (ctx.customTokens.has(name)) return 'design token — project override';
    if (ctx.defaultTokens.has(name)) return 'design token — shipped default';
    return 'design token — DANGLING (no such token)';
  }

  if (HEX.test(value) || FUNC_COLOR.test(value)) return 'literal typed on the node';
  return 'other / not a colour';
}

/* ── walking a project ───────────────────────────────────────────────────────── */

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return { __error: `${file}: ${err.message}` };
  }
}

function findNodeFiles(componentsDir) {
  const out = [];
  if (!fs.existsSync(componentsDir)) return out;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'nodes.json') out.push(full);
    }
  };
  walk(componentsDir);
  return out;
}

function censusOne(projectDir, defaultTokens) {
  const projectFile = path.join(projectDir, 'nodegx.project.json');
  if (!fs.existsSync(projectFile)) return null;

  const project = readJson(projectFile);
  if (project.__error) return { name: path.basename(projectDir), error: project.__error };

  const metadata = project.metadata || {};

  // 🔴 v2 does NOT keep styles in `metadata.styles` — it writes a separate project-level
  // file, `nodegx.styles.json` ({colors, text, variants}), and that is where the editor's
  // pickers land what they create (measured by driving, 2026-09-18: creating one colour
  // style and one variant produced exactly that file and left nodegx.project.json alone).
  // `metadata.styles` is the legacy/in-memory shape. Read BOTH, or a v2 project reports
  // zero styles it actually has.
  const stylesFile = path.join(projectDir, 'nodegx.styles.json');
  const sidecar = fs.existsSync(stylesFile) ? readJson(stylesFile) : {};
  // 🔴 The sidecar's text-style key is `textStyles`, NOT `text` (the legacy metadata shape uses
  // `text`). Measured 2026-09-18 by creating one in the editor and grepping the project for it —
  // reading the wrong key reports an empty project as confidently as a real absence, and did:
  // a first pass over 90 real projects said "0 text styles anywhere" when the true count is 22.
  const styles = {
    colors: { ...((metadata.styles || {}).colors || {}), ...(sidecar.colors || {}) },
    text: {
      ...((metadata.styles || {}).text || {}),
      ...(sidecar.textStyles || sidecar.text || {})
    }
  };
  const sidecarVariants = Array.isArray(sidecar.variants) ? sidecar.variants : null;
  const tokensBlock = metadata.designTokens || {};
  const customTokens = Array.isArray(tokensBlock.customTokens) ? tokensBlock.customTokens : [];

  const ctx = {
    styleColors: new Set(Object.keys(styles.colors || {})),
    styleText: new Set(Object.keys(styles.text || {})),
    customTokens: new Set(customTokens.map((t) => t && t.name).filter(Boolean)),
    defaultTokens
  };

  const result = {
    name: path.basename(projectDir),
    declared: {
      'styles.colors': ctx.styleColors.size,
      'styles.text': ctx.styleText.size,
      'designTokens.customTokens': ctx.customTokens.size,
      // Variants live in the styles sidecar in v2, and as a top-level project key in the
      // legacy shape. Absent and empty are different facts, so report which one this is.
      variants:
        sidecarVariants !== null
          ? sidecarVariants.length
          : Array.isArray(project.variants)
            ? project.variants.length
            : 'key absent',
      stylesSidecar: fs.existsSync(stylesFile) ? 'present' : 'absent'
    },
    tokenCategories: {},
    routes: Object.fromEntries(ROUTES.map((r) => [r, 0])),
    components: 0,
    nodes: 0,
    nodesCarryingOwnLook: {},
    variantFieldsOnNodes: 0,
    cssDefinitionNodes: 0,
    danglingTokenRefs: [],
    // The collision resolveColor makes possible and nothing warns about.
    styleShadowsToken: []
  };

  for (const t of customTokens) {
    if (!t || !t.category) continue;
    result.tokenCategories[t.category] = (result.tokenCategories[t.category] || 0) + 1;
  }

  for (const name of ctx.styleColors) {
    if (ctx.customTokens.has(name) || defaultTokens.has(name)) result.styleShadowsToken.push(name);
  }

  const LOOK_KEYS = ['backgroundColor', 'cornerRadius', 'borderRadius', 'color', 'textStyle'];

  for (const file of findNodeFiles(path.join(projectDir, 'components'))) {
    const doc = readJson(file);
    if (doc.__error) continue;
    result.components += 1;

    for (const node of doc.nodes || []) {
      result.nodes += 1;

      const type = node.type || '?';
      if (typeof type === 'string' && /css.?definition/i.test(type)) result.cssDefinitionNodes += 1;

      // A variant reference on a node. Counted by presence of the field, whatever
      // it is called, so an absent count is an absence of the FIELD and not of a
      // spelling this script guessed.
      if (node.variant || (node.parameters && node.parameters.variant)) result.variantFieldsOnNodes += 1;

      const params = node.parameters || {};
      if (LOOK_KEYS.some((k) => k in params)) {
        result.nodesCarryingOwnLook[type] = (result.nodesCarryingOwnLook[type] || 0) + 1;
      }

      for (const [key, value] of Object.entries(params)) {
        const route = classify(value, ctx);
        if (!route) continue;
        result.routes[route] += 1;
        if (route === 'design token — DANGLING (no such token)' && result.danglingTokenRefs.length < 25) {
          result.danglingTokenRefs.push({
            token: value,
            node: node.label || node.id,
            port: key,
            file: path.relative(REPO, file)
          });
        }
      }
    }
  }

  return result;
}

/* ── output ──────────────────────────────────────────────────────────────────── */

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}
function padLeft(s, n) {
  s = String(s);
  return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}

function report(rows, defaults) {
  console.log('');
  console.log('STY-001 STYLE CENSUS');
  console.log('shipped default tokens: ' + defaults.names.size + (defaults.error ? '  ⚠️  ' + defaults.error : ''));
  console.log('');

  console.log('DECLARED PER PROJECT');
  console.log(
    '  ' + pad('project', 18) + padLeft('colours', 9) + padLeft('text', 7) +
    padLeft('tokens', 8) + padLeft('variants', 11) + padLeft('styles file', 12)
  );
  for (const r of rows) {
    if (r.error) { console.log('  ' + pad(r.name, 18) + ' ERROR ' + r.error); continue; }
    console.log(
      '  ' + pad(r.name, 18) +
      padLeft(r.declared['styles.colors'], 9) +
      padLeft(r.declared['styles.text'], 7) +
      padLeft(r.declared['designTokens.customTokens'], 8) +
      padLeft(r.declared.variants, 11) +
      padLeft(r.declared.stylesSidecar, 12)
    );
  }

  console.log('');
  console.log('REACH — which route each node parameter actually takes');
  const totals = Object.fromEntries(ROUTES.map((x) => [x, 0]));
  let nodes = 0, comps = 0, variantFields = 0, cssNodes = 0;
  for (const r of rows) {
    if (r.error) continue;
    for (const k of ROUTES) totals[k] += r.routes[k];
    nodes += r.nodes; comps += r.components;
    variantFields += r.variantFieldsOnNodes; cssNodes += r.cssDefinitionNodes;
  }
  const grand = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  for (const k of ROUTES) {
    const pct = ((totals[k] / grand) * 100).toFixed(1);
    console.log('  ' + pad(k, 42) + padLeft(totals[k], 7) + padLeft(pct + '%', 9));
  }

  console.log('');
  console.log('  components ' + comps + ' · nodes ' + nodes +
    ' · nodes carrying a variant field ' + variantFields +
    ' · CSS Definition nodes ' + cssNodes);

  const shadow = rows.filter((r) => !r.error && r.styleShadowsToken.length);
  console.log('');
  console.log('COLLISIONS — a colour style whose name shadows a token (resolveColor prefers the style)');
  if (!shadow.length) console.log('  none in this corpus');
  for (const r of shadow) console.log('  ' + pad(r.name, 18) + r.styleShadowsToken.join(', '));

  const dangling = rows.filter((r) => !r.error && r.danglingTokenRefs.length);
  console.log('');
  console.log('DANGLING — var(--x) pointing at a token that does not exist');
  if (!dangling.length) console.log('  none in this corpus');
  for (const r of dangling) {
    console.log('  ' + r.name + ':');
    for (const d of r.danglingTokenRefs) {
      console.log('    ' + pad(d.token, 28) + pad(d.node, 22) + d.port + '  ' + d.file);
    }
  }

  console.log('');
  console.log('NODES CARRYING THEIR OWN LOOK (backgroundColor / radius / color / textStyle)');
  for (const r of rows) {
    if (r.error) continue;
    const entries = Object.entries(r.nodesCarryingOwnLook).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!entries.length) { console.log('  ' + pad(r.name, 18) + 'none'); continue; }
    console.log('  ' + pad(r.name, 18) + entries.map(([t, c]) => t + ' ×' + c).join(', '));
  }
  console.log('');
}

/* ── main ────────────────────────────────────────────────────────────────────── */

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const targets = args.filter((a) => !a.startsWith('--'));

  const defaults = readDefaultTokenNames();

  let dirs;
  if (targets.length === 0 || (targets.length === 1 && targets[0] === 'templates')) {
    const root = path.join(REPO, 'templates');
    dirs = fs.readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => path.join(root, e.name))
      .filter((d) => fs.existsSync(path.join(d, 'nodegx.project.json')));
  } else {
    dirs = targets.map((t) => path.resolve(t));
  }

  const rows = dirs.map((d) => censusOne(d, defaults.names)).filter(Boolean);

  if (asJson) {
    console.log(JSON.stringify({ defaultTokenCount: defaults.names.size, projects: rows }, null, 2));
  } else {
    report(rows, defaults);
  }
}

main();
