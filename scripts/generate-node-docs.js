/**
 * ALPHA-006 §3 — the generated node reference.
 *
 * One page per node in `node-catalog-enriched.json`, grouped by the picker's own
 * `category` field (not the old `opennoodl-docs` site's tree, which disagreed
 * with the picker — e.g. `Button` was `ui-controls` there and `Visual` here).
 * Reads the same artifact `nodeDocs.ts` reads for the in-editor help panel, so
 * the site and the editor render two views of one document and cannot drift
 * apart the way the old fetched-markdown pages could.
 *
 * `docs-site/docs/nodes/` is entirely generated output: this script deletes and
 * rewrites it from scratch every run rather than diffing in place, so a node
 * that's renamed or removed can't leave an orphaned page behind.
 *
 *   node scripts/generate-node-docs.js          # regenerate docs-site/docs/nodes
 *   node scripts/generate-node-docs.js --check   # fail if the committed pages are stale
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'packages/noodl-types/src/node-catalog-enriched.json');
const STRUCTURAL_CATALOG_PATH = path.join(ROOT, 'packages/noodl-types/src/node-catalog.json');
const OUT_DIR = path.join(ROOT, 'docs-site/docs/nodes');
const SPEC_NODES_DIR = path.join(ROOT, 'packages/nodegx-node-spec/src/nodes');
const EXPORT_LEDGER_PATH = path.join(ROOT, 'packages/nodegx-export/coverage-ledger.json');

/**
 * 🔴 FB-025 lane, 2026-08-27 — **this script grades an input it does not produce, and nothing
 * here used to notice when that input was stale.**
 *
 * The pipeline is two steps: `catalog:generate` writes `node-catalog.json` from the live
 * registries, and `catalog:merge` folds the authored enrichment into
 * `node-catalog-enriched.json`. This script reads only the **second** file. So a sweep that ran
 * `catalog:generate` and not `catalog:merge` left the enriched catalog describing the *previous*
 * registries, and `docs:nodes:check` compared pages generated from that stale artifact against
 * pages generated from the same stale artifact and reported **clean** — a green tick on a
 * question it had not asked.
 *
 * ⚠️ Measured rather than argued, 2026-08-27: mutating a `docs` field of one node in
 * `node-catalog.json` and re-running `docs:nodes:check` printed *"clean. 194 generated files
 * match 175 catalog nodes"*. `catalog:merge:check` caught the same mutation — so the sweep as a
 * whole was not blind — but a docs gate that cannot see its own input is stale is one that only
 * works while somebody remembers to run a different one beside it.
 *
 * The comparison below is exact rather than a heuristic, because `merge.js` copies the
 * structural nodes through verbatim: `nodes: catalog.nodes.map((n) => ({ ...n, enrichment }))`.
 * Stripping `enrichment` therefore has to give back `node-catalog.json` exactly, and any
 * difference at all means the merge has not been run since the catalog moved.
 *
 * ⚠️ A missing `node-catalog.json` is an **error, not a skip**. A guard that quietly stands down
 * when it cannot run reinstates precisely the green-on-an-unasked-question this exists to stop.
 */
class StaleCatalogError extends Error {}

function assertEnrichedCatalogIsFresh(enriched, structuralPath = STRUCTURAL_CATALOG_PATH) {
  const rel = path.relative(ROOT, structuralPath);
  if (!fs.existsSync(structuralPath)) {
    throw new StaleCatalogError(
      `${rel} is missing, so the enriched catalog's freshness cannot be checked. ` +
        'Run `npm run catalog:generate`.'
    );
  }

  let structural;
  try {
    structural = JSON.parse(fs.readFileSync(structuralPath, 'utf8'));
  } catch (err) {
    throw new StaleCatalogError(
      `${rel} could not be parsed, so the enriched catalog's freshness cannot be checked: ${err.message}`
    );
  }

  // Key order differs harmlessly between the two files, so compare canonically by sorted keys.
  const canonical = (value) =>
    JSON.stringify(value, (_key, v) =>
      v && typeof v === 'object' && !Array.isArray(v)
        ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
        : v
    );

  const enrichedByType = new Map((enriched.nodes || []).map((n) => [n.typeName, n]));
  const structuralByType = new Map((structural.nodes || []).map((n) => [n.typeName, n]));

  const missing = [...structuralByType.keys()].filter((t) => !enrichedByType.has(t));
  const extra = [...enrichedByType.keys()].filter((t) => !structuralByType.has(t));
  const changed = [];
  for (const [typeName, structuralNode] of structuralByType) {
    const enrichedNode = enrichedByType.get(typeName);
    if (!enrichedNode) continue;
    // eslint-disable-next-line no-unused-vars
    const { enrichment, ...withoutEnrichment } = enrichedNode;
    if (canonical(withoutEnrichment) !== canonical(structuralNode)) changed.push(typeName);
  }

  if (!missing.length && !extra.length && !changed.length) return;

  const detail = [
    missing.length ? `${missing.length} node(s) absent from it (${missing.slice(0, 5).join(', ')})` : null,
    extra.length ? `${extra.length} node(s) it still lists (${extra.slice(0, 5).join(', ')})` : null,
    changed.length ? `${changed.length} node(s) differing (${changed.slice(0, 5).join(', ')})` : null
  ]
    .filter(Boolean)
    .join('; ');

  throw new StaleCatalogError(
    `Stale enriched catalog: ${path.relative(ROOT, CATALOG_PATH)} does not match ${rel} — ${detail}. ` +
      'The docs are generated from the enriched catalog, so generating or checking them now would ' +
      'grade the previous registries. Run `npm run catalog:merge` and commit the result.'
  );
}

function slugify(text) {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()
    .replace(/^-+|-+$/g, '');
}

/**
 * 🔴 HLT-013 — catalog prose is text, and markdown reads a `<tag>` in it as markup.
 *
 * 15 of the 199 generated pages carried something shaped like a tag in an
 * ordinary sentence, outside any code span: `<p>` and `<tag>` as placeholders,
 * and real element names where the node's subject *is* markup — `<item>` and
 * `<!ENTITY>` on Parse XML. (47 pages mention a tag at all; the other 32 already
 * had it in backticks, which is the form that renders.)
 * CommonMark passes raw HTML straight through, so every one of them was being
 * rendered as an element instead of shown as the word the sentence needs: the
 * reader of Parse XML's own description could not see the `<item>` it is
 * telling them about.
 *
 * It surfaced as a build failure rather than a reading problem, which is the
 * only reason it was found: `<a href="x"/>` in Parse XML's description became a
 * real anchor, and `onBrokenLinks: 'throw'` refused the whole site over a link
 * to `x` that nobody had written. That description landed on 2026-09-18 and the
 * last `deploy-docs.yml` run was 2026-09-11 — so no deploy had tried it yet, and
 * **the next merge to `main` would have failed the docs deploy**. No PR gate
 * builds the site, so nothing earlier would have said so.
 *
 * Applied field by field, and `tests-unit/hlt-013` scans every generated page
 * for a raw tag outside code — so a new prose field that forgets it is caught
 * by the corpus, not by a reader.
 *
 * Only `<` needs escaping — `&lt;` is the literal `<` again in the rendered page
 * — and only outside code, where a `<tag>` is already shown verbatim and an
 * entity would be displayed as the five characters `&lt;`.
 */
function escapeAngles(text) {
  const parts = String(text ?? '').split(/(```[\s\S]*?```|`[^`\n]*`)/g);
  return parts
    .map((part, i) => (i % 2 === 1 ? part : part.replace(/<(?=[a-zA-Z!/])/g, '&lt;')))
    .join('');
}

function escapeMd(text) {
  return escapeAngles(text).replace(/\|/g, '\\|');
}

function formatType(type) {
  if (!type) return '—';
  if (type.name === 'enum' && Array.isArray(type.enums)) {
    return `Enum (${type.enums.map((e) => `\`${e.value}\``).join(', ')})`;
  }
  if (type.name === 'signal') return 'Signal';
  const label = type.name.charAt(0).toUpperCase() + type.name.slice(1);
  if (type.identifierOf) return `${label} (${type.identifierOf} id)`;
  return label;
}

function formatDefault(port) {
  if (port.default === undefined) return '—';
  if (typeof port.default === 'object') return `\`${JSON.stringify(port.default)}\``;
  return `\`${port.default}\``;
}

function isFailurePort(port) {
  return port.group === 'Error' || /error|failure|fail\b/i.test(port.name);
}

function portTable(ports) {
  if (!ports.length) return '_None._\n';
  const rows = ports.map(
    (p) => `| \`${escapeMd(p.name)}\` | ${formatType(p.type)} | ${formatDefault(p)} | ${escapeMd(p.description || '—')} |`
  );
  return ['| Name | Type | Default | Description |', '|---|---|---|---|', ...rows].join('\n') + '\n';
}

function renderPortsSection(title, ports) {
  if (!ports.length) return '';
  const values = ports.filter((p) => !p.isSignal && !isFailurePort(p));
  const signals = ports.filter((p) => p.isSignal && !isFailurePort(p));
  const failures = ports.filter((p) => isFailurePort(p));

  const parts = [`## ${title}\n`];
  if (values.length) parts.push(`### Values\n\n${portTable(values)}`);
  if (signals.length) parts.push(`### Signals\n\n${portTable(signals)}`);
  if (failures.length) parts.push(`### Failure outputs\n\n${portTable(failures)}`);
  return parts.join('\n');
}

/**
 * NSP-018 §2 "Rules in words" — what each input does, read off the spec's reducers.
 *
 * `catalog:generate` writes `rules: { [inputPortName]: string[] }` on every specced node, one
 * line per reducer branch in the form `<case> → <what the wire carries>`, and `catalog:merge`
 * carries it through verbatim. This is the "docs" half of the task's person sentence: the same
 * lines the property panel and `get_node_type` serve, so the page cannot say one thing while
 * the node does another.
 *
 * Rendered as a subsection of `## Inputs`, after the port tables, because every line is about
 * an input. Each port is headed by its display name — the words the lines themselves use
 * ("at Max Value with Limits Enabled") — with the port's code name beside it, which is what the
 * table above lists and what tells two inputs with one display name apart (Filter Collection's
 * `items` and `runOnChange-items` are both shown as "Items").
 *
 * A node without `rules` gets nothing — not an empty section. Port order and line order are the
 * catalog's own, so the output is a deterministic function of the catalog and `--check` can stay
 * a byte comparison.
 */
function renderRulesSection(node) {
  const rules = node.rules;
  if (!rules || typeof rules !== 'object') return '';
  const entries = Object.entries(rules).filter(([, lines]) => Array.isArray(lines) && lines.length);
  if (!entries.length) return '';

  const inputsByName = new Map((node.inputs || []).map((p) => [p.name, p]));
  const blocks = entries.map(([portName, lines]) => {
    const port = inputsByName.get(portName);
    const label = escapeAngles((port && port.displayName) || portName);
    return `**${label}** (\`${portName}\`)\n\n${lines.map((line) => `- ${escapeAngles(line)}`).join('\n')}\n`;
  });
  return `### What each input does\n\n${blocks.join('\n')}`;
}

function renderDynamicPorts(dynamicPorts) {
  if (!dynamicPorts) return '';
  const parts = [
    '## Dynamic ports\n',
    `_This node's port list changes at runtime (${dynamicPorts.mechanisms.join(', ')}); the tables above may be incomplete for a given instance._\n`
  ];
  if (dynamicPorts.description) parts.push(`${escapeAngles(dynamicPorts.description)}\n`);
  if (Array.isArray(dynamicPorts.declaredPortGroups) && dynamicPorts.declaredPortGroups.length) {
    const rows = dynamicPorts.declaredPortGroups.map(
      (g) =>
        `| ${escapeMd(g.condition || '—')} | ${(g.inputs || []).map((n) => `\`${n}\``).join(', ') || '—'} | ${
          (g.outputs || []).map((n) => `\`${n}\``).join(', ') || '—'
        } |`
    );
    parts.push(
      ['| Condition | Inputs shown | Outputs shown |', '|---|---|---|', ...rows].join('\n') + '\n'
    );
  }
  return parts.join('\n');
}

/**
 * The low half of each page: what the node's executable spec (`@nodegx/node-spec`) and the export ledger
 * (`nodegx-export/coverage-ledger.json`) say about it, for a reader who wants more than the ports.
 *
 * The specs are read from source with the loader `catalog:generate` already uses (scripts/node-spec/load-specs.js),
 * so no build of the package is needed and a stale `dist/` cannot answer. Each spec's file is found by identity in
 * `require.cache` after the load — the module whose exports hold that very spec object — rather than by guessing a
 * file name from the type name (`Group` lives in group.ts, `net.noodl.controls.textinput` in text-input.ts).
 */
function loadSpecSources() {
  const { loadSpecs, registryPath } = require('./node-spec/load-specs');
  const specs = loadSpecs();
  // The registry is skipped because it exports every spec it collects. Any other module exporting a spec it did not
  // define would make two candidates, and that is refused below rather than settled by load order.
  const filesBySpec = new Map();
  for (const [file, mod] of Object.entries(require.cache)) {
    if (!file.startsWith(SPEC_NODES_DIR + path.sep) || file === registryPath || !mod || !mod.exports) continue;
    for (const value of Object.values(mod.exports)) {
      if (!value || typeof value !== 'object') continue;
      if (!filesBySpec.has(value)) filesBySpec.set(value, []);
      filesBySpec.get(value).push(file);
    }
  }
  const byType = new Map();
  for (const [typeName, spec] of Object.entries(specs)) {
    const candidates = filesBySpec.get(spec) || [];
    if (candidates.length !== 1) {
      throw new Error(
        `generate-node-docs: the spec of ${typeName} is exported by ${candidates.length} files (${candidates
          .map((f) => path.basename(f))
          .join(', ')}); expected exactly one`
      );
    }
    const file = candidates[0];
    const source = fs.readFileSync(file, 'utf8');
    // The page fences the source with ``` and the HLT-013 scan pairs fences the same way, so a triple backtick inside
    // the source would end the block early and turn the rest of the file into prose. Refuse rather than mis-render.
    if (source.includes('```')) throw new Error(`generate-node-docs: ${file} contains a triple backtick`);
    byType.set(typeName, { spec, source, rel: path.relative(ROOT, file).split(path.sep).join('/') });
  }
  return byType;
}

/** What a spec's `needs` mean, in words (spec.ts `WorldNeed`). */
const WORLD_NEEDS = {
  clock: 'time: timers, delays and the frame clock',
  random: 'random numbers',
  network: 'the network',
  registry: 'the shared store of Objects and Arrays, looked up by id',
  timezone: 'the local time zone',
  digest: "the browser's SHA-2 hashing",
  viewport: "the browser window's size",
  location: 'the page URL, and whether a person caused the action',
  project: "the project's settings",
  stack: 'a Component Stack',
  router: 'the page Router',
  popup: 'popups',
  backend: 'a backend: records, users and cloud functions',
  picker: "the browser's file picker",
  socket: 'WebSockets',
  person: "a person's pointer and keyboard",
  group: 'the Radio Button Group it sits in',
  host: 'services of the backend process a cloud function runs in'
};

/** What each input conversion does, in words (coerce.ts `COERCIONS`). `none` is not listed: the value arrives as sent. */
const COERCION_WORDS = {
  'js-number': 'converted with `Number(value)`, so text that is not a number becomes `NaN`',
  'js-string': 'converted with `String(value)`, so no value becomes the text `"undefined"`',
  'js-boolean': 'any truthy value is `true`, anything else `false`',
  'typed-number': 'a number; no value, or one that is not a number, keeps the default',
  'typed-string': 'converted to text; no value keeps the default',
  'typed-boolean': 'converted with `!!value`; no value keeps the default',
  'typed-color': 'kept when it is `#RGB`, `#RRGGBB`, `rgb(…)` or `rgba(…)`; anything else keeps the default',
  'not-false': 'only an explicit `false` turns it off; no value, `0` and `""` leave it on',
  'array-literal': 'text is evaluated as a JavaScript array literal; text that does not evaluate becomes `[]`',
  'object-literal': 'text is evaluated as a JavaScript object literal; text that does not evaluate becomes `{}`'
};

/** What the export ledger's statuses mean (scripts/export-ledger/check.js). */
const EXPORT_STATUS_WORDS = {
  translated: 'Exports to React. A project that uses it exports this node as React code.',
  stubbed: 'Exports to React as a typed stub by design: the generated code has the shape, and you connect it to your own backend.',
  deferred: 'Does not export to React yet. A project that uses it exports with this node named in the export report.',
  'backend-only': 'Runs only on the backend, inside cloud functions, so it has no React form.'
};

function inlineCode(text) {
  const s = String(text);
  const longest = Math.max(0, ...(s.match(/`+/g) || []).map((run) => run.length));
  const fence = '`'.repeat(longest + 1);
  return longest ? `${fence} ${s} ${fence}` : `${fence}${s}${fence}`;
}

/** Lower-cases a sentence's first letter to follow a colon (not an acronym's), and ends it with a full stop. */
function sentence(text) {
  const s = String(text).trim();
  const lowered = /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  return /[.!?]$/.test(lowered) ? lowered : lowered + '.';
}

/** `a`, `a or b`, `a, b or c`. */
function orList(items) {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}

function migrationWords(migration) {
  if (!migration) return '';
  if (migration.none) return `Existing projects are not migrated: ${escapeAngles(sentence(migration.none))}`;
  if (migration.project) return `Existing projects are migrated by \`${migration.project}\` when they are opened.`;
  if (migration.parameter) return `A project that sets \`${migration.parameter}\` keeps the old behaviour.`;
  return '';
}

/** The node types in the export page's worked example (scripts/export-doc/example.js). */
const EXAMPLE_TYPES = new Set(require('./export-doc/example').BECAME.map(([typeName]) => typeName));

function renderExportSection(entry) {
  if (!entry) return '';
  const words = EXPORT_STATUS_WORDS[entry.status];
  if (!words) throw new Error(`generate-node-docs: unknown export status "${entry.status}" for ${entry.typeName}`);
  const why = entry.status !== 'translated' && entry.exemption ? `\n\nWhy: ${escapeAngles(entry.exemption)}.` : '';
  // Pages sit at nodes/<category>/<slug>.md, two levels below the export page.
  const more = EXAMPLE_TYPES.has(entry.typeName)
    ? 'This node is in the worked example on [How export works](../../how-export-works.md): see [what it became](../../how-export-works.md#what-each-node-became) in the generated React.'
    : '[How export works](../../how-export-works.md) shows what an export writes, with a worked example.';
  return `## Code export\n\n${words}${why}\n\n${more}\n`;
}

function renderSpecSection(node, specEntry) {
  if (!specEntry) return '';
  const { spec, source, rel } = specEntry;
  const parts = [
    '## Under the hood\n',
    `This node's behaviour is written down as an executable spec in \`@nodegx/node-spec\`, version ${spec.version}. ` +
      'The spec is the reference the conformance tests grade the runtime against. ' +
      'Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.\n'
  ];

  const needs = (spec.needs || []).filter((n) => WORLD_NEEDS[n]);
  if (needs.length) {
    parts.push(
      `### What it depends on outside the node\n\n${needs.map((n) => `- ${WORLD_NEEDS[n]} (\`${n}\`)`).join('\n')}\n`
    );
  } else {
    parts.push('### What it depends on outside the node\n\nNothing. Its outputs depend only on its inputs and its own state.\n');
  }

  if (spec.state && typeof spec.state === 'object' && Object.keys(spec.state).length) {
    parts.push(`### Starting state\n\n\`\`\`json\n${JSON.stringify(spec.state, null, 2)}\n\`\`\`\n`);
  }

  const inputsByName = new Map((node.inputs || []).map((p) => [p.name, p]));
  const converted = Object.entries(spec.inputs || {}).filter(([, decl]) => decl && COERCION_WORDS[decl.coerce]);
  if (converted.length) {
    const rows = converted.map(([name, decl]) => {
      const label = (inputsByName.get(name) && inputsByName.get(name).displayName) || decl.displayName || name;
      return `| ${escapeMd(label)} (\`${escapeMd(name)}\`) | \`${decl.coerce}\` | ${escapeMd(COERCION_WORDS[decl.coerce])} |`;
    });
    parts.push(
      `### How inputs are converted\n\nInputs not listed arrive as sent.\n\n| Input | Conversion | What it does |\n|---|---|---|\n${rows.join('\n')}\n`
    );
  }

  // spec.ts `Outcome`: exactly one per invocation of an `outcome: true` input.
  const outcomes = Array.isArray(spec.outcomes) ? spec.outcomes : [];
  const actions = Object.entries(spec.inputs || {}).filter(([, decl]) => decl && decl.outcome);
  if (outcomes.length && actions.length) {
    const label = ([name, decl]) =>
      `${escapeAngles((inputsByName.get(name) && inputsByName.get(name).displayName) || decl.displayName || name)}`;
    const named = outcomes.map((o) => `**${o.charAt(0).toUpperCase() + o.slice(1)}**`);
    parts.push(
      `### How actions report back\n\nEach time ${orList(actions.map(label))} is triggered, the node reports exactly one of ${orList(named)}.\n`
    );
  }

  const diagnostics = Object.entries(spec.diagnostics || {});
  if (diagnostics.length) {
    const rows = diagnostics.map(
      ([id, d]) =>
        `| ${escapeMd(d.says || id)} | ${(d.settings || []).map((s) => `\`${escapeMd(s)}\``).join(', ') || '—'} | \`${escapeMd(id)}\` |`
    );
    parts.push(
      `### Warnings it shows in the editor\n\n| Warning | Settings it points at | Id |\n|---|---|---|\n${rows.join('\n')}\n`
    );
  }

  const acts = Object.entries(spec.acts || {});
  if (acts.length) {
    parts.push(
      `### What a person can do to it\n\nThe conformance tests play these acts against it:\n\n${acts
        .map(([name, a]) => `- \`${name}\`: ${escapeAngles((a && a.description) || '')}`)
        .join('\n')}\n`
    );
  }

  const changes = Array.isArray(spec.changes) ? spec.changes : [];
  if (changes.length) {
    const lines = changes.map((c) => {
      const commit = c.commit ? ` (runtime commit \`${c.commit}\`)` : '';
      return `- **Version ${c.version}**${commit}: ${escapeAngles(c.says)}. ${migrationWords(c.migration)}`;
    });
    parts.push(`### Version history\n\n${lines.join('\n')}\n`);
  }

  const idioms = Array.isArray(spec.idioms) ? spec.idioms : [];
  if (idioms.length) {
    parts.push(
      `### The code it replaces\n\nWhat you would write by hand instead:\n\n${idioms
        .map((i) => `- ${escapeAngles(i.says)}: ${inlineCode(i.example)}`)
        .join('\n')}\n`
    );
  }

  parts.push(
    `## The full spec {#spec-source}\n\nThe spec's source, as the docs were generated. Helpers it imports live beside it in \`packages/nodegx-node-spec/src\`.\n\n\`\`\`ts title="${rel}"\n${source.replace(/\n$/, '')}\n\`\`\`\n`
  );
  return parts.join('\n');
}

function main() {
  const check = process.argv.includes('--check');
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const specSources = loadSpecSources();
  const exportLedger = JSON.parse(fs.readFileSync(EXPORT_LEDGER_PATH, 'utf8')).entries || {};
  const exportByType = new Map(Object.values(exportLedger).map((e) => [e.typeName, e]));

  // Both modes, deliberately: writing pages from a stale enriched catalog is the worse half of
  // the defect, because it bakes the staleness into the committed pages and `--check` then
  // agrees with them.
  assertEnrichedCatalogIsFresh(catalog);

  const nodesByTypeName = new Map(catalog.nodes.map((n) => [n.typeName, n]));
  const examplesById = new Map((catalog.examples || []).map((e) => [e.id, e]));

  // typeName -> { category, slug } so "related nodes" can link across categories.
  const linkIndex = new Map();
  for (const node of catalog.nodes) {
    linkIndex.set(node.typeName, { categorySlug: slugify(node.category || 'uncategorised'), slug: slugify(node.typeName) });
  }

  const categories = new Map(); // categorySlug -> { label, nodes: [] }
  for (const node of catalog.nodes) {
    const label = node.category || 'Uncategorised';
    const catSlug = slugify(label);
    if (!categories.has(catSlug)) categories.set(catSlug, { label, nodes: [] });
    categories.get(catSlug).nodes.push(node);
  }
  for (const cat of categories.values()) {
    cat.nodes.sort((a, b) => (a.displayName || a.typeName).localeCompare(b.displayName || b.typeName));
  }
  const sortedCategorySlugs = [...categories.keys()].sort((a, b) =>
    categories.get(a).label.localeCompare(categories.get(b).label)
  );

  /** @type {Map<string, string>} relative path (posix) -> file content */
  const files = new Map();

  const GENERATED_NOTE =
    '\n:::info Generated\nThis page is generated from `node-catalog-enriched.json`, the node\'s spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.\n:::\n';

  files.set('_category_.json', JSON.stringify({ label: 'Node reference', position: 3, link: { type: 'doc', id: 'index' } }, null, 2) + '\n');

  const indexLines = [
    '---',
    'title: Node reference',
    '---',
    '',
    `Every node in the catalog — ${catalog.nodes.length} in total — generated from the same`,
    'enriched catalog the editor reads for its own in-editor help. Grouped by picker category.',
    '',
    `${catalog.nodes.filter((n) => specSources.has(n.typeName)).length} of them also have an executable behaviour spec,`,
    'shown on the node\'s page under **Under the hood**: what it depends on, its starting state, how it',
    'converts its inputs, its version history and the full spec source. Every page also says whether the node',
    'exports to React.',
    GENERATED_NOTE,
    ''
  ];
  for (const catSlug of sortedCategorySlugs) {
    const cat = categories.get(catSlug);
    indexLines.push(`## ${cat.label}\n`);
    for (const node of cat.nodes) {
      const deprecated = node.isDeprecated ? ' _(deprecated)_' : '';
      indexLines.push(`- [${node.displayName || node.typeName}](./${catSlug}/${slugify(node.typeName)}.md)${deprecated}`);
    }
    indexLines.push('');
  }
  files.set('index.md', indexLines.join('\n'));

  for (const catSlug of sortedCategorySlugs) {
    const cat = categories.get(catSlug);
    files.set(
      `${catSlug}/_category_.json`,
      JSON.stringify({ label: cat.label, position: sortedCategorySlugs.indexOf(catSlug) + 1 }, null, 2) + '\n'
    );

    for (const node of cat.nodes) {
      const e = node.enrichment || {};
      const slug = slugify(node.typeName);
      const parts = [];

      parts.push('---');
      parts.push(`title: ${JSON.stringify(node.displayName || node.typeName)}`);
      parts.push('---');
      parts.push('');

      if (node.isDeprecated) {
        parts.push(
          ':::warning Deprecated\nThis node is deprecated and kept only so existing projects keep working. It is not offered in the node picker for new use.\n:::\n'
        );
      } else if (!node.inNodePicker) {
        parts.push(':::note\nThis node is not offered directly in the node picker.\n:::\n');
      }

      if (e.summary) parts.push(`${escapeAngles(e.summary)}\n`);
      if (e.description) parts.push(`${escapeAngles(e.description)}\n`);
      if (e.whenToUse) parts.push(`## When to use it\n\n${escapeAngles(e.whenToUse)}\n`);

      const meta = [
        `| | |`,
        `|---|---|`,
        `| Category | ${escapeMd(cat.label)} |`,
        `| Type name | \`${node.typeName}\` |`,
        `| Available in | ${(node.availableIn || []).join(', ') || '—'} |`,
        `| SSR compatibility | ${node.ssr ? node.ssr.compat + (node.ssr.note ? ` — ${escapeMd(node.ssr.note)}` : '') : '—'} |`,
        `| Provided by | \`${node.providedBy || '—'}\` |`,
        `| Behaviour spec | ${
          specSources.has(node.typeName)
            ? `version ${specSources.get(node.typeName).spec.version} ([under the hood](#under-the-hood))`
            : 'not written yet'
        } |`
      ];
      parts.push(`## At a glance\n\n${meta.join('\n')}\n`);

      parts.push(renderPortsSection('Inputs', node.inputs || []));
      parts.push(renderRulesSection(node));
      parts.push(renderPortsSection('Outputs', node.outputs || []));
      parts.push(renderDynamicPorts(node.dynamicPorts));

      if (e.runtimeBehavior) parts.push(`## Ports at runtime\n\n${escapeAngles(e.runtimeBehavior)}\n`);
      if (Array.isArray(e.patterns) && e.patterns.length) {
        parts.push(`## Patterns\n\n${e.patterns.map((p) => `- ${escapeAngles(p)}`).join('\n')}\n`);
      }
      if (Array.isArray(e.antiPatterns) && e.antiPatterns.length) {
        parts.push(`## Watch out for\n\n${e.antiPatterns.map((p) => `- ${escapeAngles(p)}`).join('\n')}\n`);
      }
      if (Array.isArray(e.examples) && e.examples.length) {
        const examples = e.examples.map((id) => examplesById.get(id)).filter(Boolean);
        if (examples.length) {
          parts.push(
            `## Examples\n\n${examples.map((ex) => `**${escapeAngles(ex.title)}**\n\n${escapeAngles(ex.description)}`).join('\n\n')}\n`
          );
        }
      }
      if (Array.isArray(e.relatedNodes) && e.relatedNodes.length) {
        const links = e.relatedNodes
          .map((typeName) => {
            const target = nodesByTypeName.get(typeName);
            const loc = linkIndex.get(typeName);
            if (!target || !loc) return null;
            const rel = loc.categorySlug === catSlug ? `./${loc.slug}.md` : `../${loc.categorySlug}/${loc.slug}.md`;
            return `[${target.displayName || typeName}](${rel})`;
          })
          .filter(Boolean);
        if (links.length) parts.push(`## Related nodes\n\n${links.join(', ')}\n`);
      }

      parts.push(renderExportSection(exportByType.get(node.typeName)));
      parts.push(renderSpecSection(node, specSources.get(node.typeName)));

      parts.push(GENERATED_NOTE);

      files.set(`${catSlug}/${slug}.md`, parts.filter((p) => p !== '').join('\n'));
    }
  }

  if (check) {
    const problems = [];
    const existing = listExistingFiles(OUT_DIR);
    for (const [rel, content] of files) {
      const onDisk = path.join(OUT_DIR, rel);
      if (!fs.existsSync(onDisk)) {
        problems.push(`missing: ${rel}`);
      } else if (fs.readFileSync(onDisk, 'utf8') !== content) {
        problems.push(`stale: ${rel}`);
      }
      existing.delete(rel);
    }
    for (const rel of existing) problems.push(`orphaned: ${rel}`);

    if (problems.length) {
      console.error(`docs:nodes:check — ${problems.length} problem(s). Run \`npm run docs:nodes\` and commit the result.`);
      for (const p of problems.slice(0, 50)) console.error(`  ${p}`);
      if (problems.length > 50) console.error(`  … and ${problems.length - 50} more`);
      process.exit(1);
    }
    console.log(`docs:nodes:check — clean. ${files.size} generated files match ${catalog.nodes.length} catalog nodes.`);
    return;
  }

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  for (const [rel, content] of files) {
    const dest = path.join(OUT_DIR, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
  }
  console.log(`docs:nodes — wrote ${files.size} files for ${catalog.nodes.length} nodes across ${categories.size} categories.`);
}

function listExistingFiles(dir) {
  const out = new Set();
  if (!fs.existsSync(dir)) return out;
  const walk = (current, prefix) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(current, entry.name), rel);
      else out.add(rel);
    }
  };
  walk(dir, '');
  return out;
}

if (require.main === module) {
  runCli();
}

module.exports = { assertEnrichedCatalogIsFresh, StaleCatalogError, renderRulesSection, slugify, escapeAngles };

function runCli() {
  try {
    main();
  } catch (err) {
  // Only this one is reported as a message: anything else is a defect in this script and keeps
  // its stack trace.
    if (!(err instanceof StaleCatalogError)) throw err;
    console.error(err.message);
    process.exit(1);
  }
}
