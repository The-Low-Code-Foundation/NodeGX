#!/usr/bin/env node
/**
 * Node catalog generator (SUB-004).
 *
 * Bundles extractor-entry.js with esbuild (the viewer packages ship TS/JSX
 * that assumes a browser), runs it headlessly in a child Node process, and
 * writes:
 *
 *   packages/noodl-types/src/node-catalog.json  — the catalog artifact
 *   packages/noodl-types/src/node-catalog.d.ts  — types generated from it
 *
 * Modes:
 *   node scripts/node-catalog/generate.js           regenerate artifacts
 *   node scripts/node-catalog/generate.js --check   fail if committed
 *                                                   artifacts are stale
 *   node scripts/node-catalog/generate.js --out-dir <dir>
 *                                                   write elsewhere, leaving the
 *                                                   committed artifacts untouched
 *
 * `--out-dir` exists because regeneration is a whole-file rewrite of an artifact other work may
 * be holding: it folds in every uncommitted node-source edit in the tree, so a generator change
 * cannot be validated by running it in place without also publishing whatever else is dirty.
 *
 * Output is deterministic; the generator runs the extraction twice and
 * asserts byte-identical results before writing anything.
 *
 * NSP-018 (phase 107): for a node with an executable spec, port descriptions are taken from the spec
 * (scripts/node-spec/load-specs.js), and a runtime description that differs from it fails both modes; its
 * reducers' branches give the node's `rules` (scripts/node-spec/rules.js).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { bundleEntry } = require('./lib/bundle');
const { loadSpecs } = require('../node-spec/load-specs');
const { rulesFor } = require('../node-spec/rules');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT_JSON = path.join(REPO_ROOT, 'packages/noodl-types/src/node-catalog.json');
const OUT_DTS = path.join(REPO_ROOT, 'packages/noodl-types/src/node-catalog.d.ts');

function runExtractor(bundlePath, workDir, label) {
  const outPath = path.join(workDir, `catalog-${label}.json`);
  const result = spawnSync(process.execPath, [bundlePath], {
    env: { ...process.env, NODE_CATALOG_OUT: outPath },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    throw new Error(`Extractor run "${label}" failed with exit code ${result.status}`);
  }
  return fs.readFileSync(outPath, 'utf8');
}

function emitTypes(catalog) {
  const union = (values) => values.map((v) => `  | '${v.replace(/'/g, "\\'")}'`).join('\n');

  const typeNames = catalog.nodes.map((n) => n.typeName);
  const categories = [...new Set(catalog.nodes.map((n) => n.category).filter(Boolean))].sort();

  return `/* GENERATED FILE — do not edit.
 * Regenerate with: npm run catalog:generate
 * Source of truth: the live node registries (see scripts/node-catalog/).
 * Field semantics: docs/node-catalog/SCHEMA.md
 */

/** Canonical node type strings as they appear in project files (\`node.type\`). */
export type NodeTypeName =
${union(typeNames)};

/** Node palette categories present in the registries. */
export type NodeCategory =
${union(categories)};

/** Port value type names present in the registries. */
export type PortTypeName =
${union(catalog.portTypeNames)};

export type RuntimeEnvironment = 'browser' | 'cloud';

export type DynamicPortMechanism =
  | 'declared-port-groups'
  | 'numbered-inputs'
  | 'component-ports'
  | 'runtime-discovered'
  | 'runtime-narrowed'
  | 'editor-adapter';

export interface PortType {
  name: PortTypeName | string;
  enums?: Array<{ label: string; value: string } | string>;
  /** Present when the enum list is computed at runtime and not statically known. */
  enumsAreDynamic?: boolean;
  units?: string[];
  defaultUnit?: string;
  allowConnectionsOnly?: boolean;
  allowEditOnly?: boolean;
  [extra: string]: unknown;
}

export interface CatalogPort {
  name: string;
  displayName?: string;
  editorName?: string;
  group?: string;
  plug: 'input' | 'output';
  type: PortType;
  isSignal: boolean;
  default?: unknown;
  description?: string;
  index?: number;
  allowVisualStates?: boolean;
  /** True for ports the editor UI does not expose; avoid authoring against them. */
  hiddenInEditor?: boolean;
}

export interface NumberedInputSpec {
  nameBase: string;
  displayPrefix?: string;
  group?: string;
  type?: PortType;
  index?: number;
}

export interface DynamicPortInfo {
  mechanisms: DynamicPortMechanism[];
  description: string;
  declaredPortGroups?: unknown[];
  numberedInputs?: NumberedInputSpec[];
  editorAdapter?: string;
}

/**
 * One key formula in a node's \`parameters\` object (SUB-013).
 *
 * Every field is observed, not written by hand: the generator drives the node's real
 * dynamic-port hook with seed parameters and records what it emits. \`example\` is a name the
 * runtime actually produced.
 */
export interface ParameterPattern {
  /** The key formula, with \`<variable>\` placeholders. E.g. \`value-<state>-<value>\`. */
  pattern: string;
  plug: 'input' | 'output' | 'input/output';
  /** What each \`<variable>\` stands for, and which parameter it is drawn from. */
  variables?: Record<string, string>;
  /** The editor property group these ports appear under; may itself be templated. */
  group?: string;
  /**
   * The port's value type. A literal type name when it is fixed, \`"varies"\` when it is not,
   * or a sentence naming the parameter it follows — for \`States\`, the value type of
   * \`value-<state>-<value>\` is chosen by the matching \`type-<value>\` parameter.
   */
  valueType?: string;
  /**
   * Parameters these ports need, set as given, to exist at all — observed by driving the hook with
   * them unset. The Component Stack's \`pagePath-<pageId>\` needs \`{ useRoutes: true }\` (P107-C127).
   */
  when?: Record<string, unknown>;
  /** A real emitted port name, preferring one that shows verbatim interpolation. */
  example: string;
}

/**
 * How to write the keys of this node's \`parameters\` object (SUB-013).
 *
 * \`known: false\` is a deliberate statement, not a gap: the node's port names could not be
 * determined without project context (a live component, a backend schema, user code), and
 * \`reason\` says which. It is the same reasoning as the validator's \`DynamicPortSkipped\` —
 * a check that was knowingly not performed beats silent absence.
 *
 * \`known: true\` with an empty \`patterns\` array means the node computes no names at all: its
 * dynamism is visibility only, and every port it can have is already in \`inputs\`/\`outputs\`.
 */
export type ParameterEncoding =
  | {
      known: true;
      /** Parameters whose values the keys are derived from. Empty when they are not. */
      seededBy: string[];
      /** Project metadata the keys come from instead, e.g. \`dbCollections\`. */
      seededByProjectMetadata?: string[];
      patterns: ParameterPattern[];
      notes?: string;
    }
  | { known: false; reason: string };

export interface CatalogNode {
  typeName: NodeTypeName;
  displayName: string;
  category?: NodeCategory;
  isVisual: boolean;
  isDeprecated: boolean;
  /** For a deprecated type: the type that replaced it, from its definition (P107 R25). Absent when nothing did. */
  replacedBy?: NodeTypeName;
  /** False for legacy/superseded types or ones created only through specialised flows; avoid authoring these. */
  inNodePicker: boolean;
  availableIn: RuntimeEnvironment[];
  providedBy: 'noodl-runtime' | 'noodl-viewer-react' | 'noodl-viewer-cloud' | 'noodl-editor';
  /**
   * Server-side-rendering compatibility (RUN-002). Present on every
   * browser-available type; absent for cloud-only types, where it does not
   * apply. "safe" runs fully server-side; "partial" runs but with the caveat
   * in note; "client-only" is created inert on the SSR server (ports exist,
   * logic deferred to the browser after hydration).
   */
  ssr?: { compat: 'safe' | 'partial' | 'client-only'; note?: string };
  docs?: string;
  searchTags?: string[];
  module?: string;
  shortDesc?: string;
  singleton?: boolean;
  allowAsChild?: boolean;
  allowChildrenWithCategory?: string[];
  /** Set on \`Component Children\`: a component that holds one holds children of these categories. */
  haveComponentChildren?: string[];
  allowAsExportRoot?: boolean;
  /** The port whose value titles an unlabelled node's card (\`@nodegx/project-contract/node-title\`, P107 R24). */
  usePortAsLabel?: string;
  /** \`filename\` or \`length\`: how that title is cut. */
  portLabelTruncationMode?: string;
  useVariants?: boolean;
  visualStates?: Array<{ name: string; label: string }>;
  inputs: CatalogPort[];
  outputs: CatalogPort[];
  dynamicPorts: DynamicPortInfo | null;
  /**
   * How to write the keys of this node's \`parameters\` object. Non-null for exactly the nodes
   * with a \`dynamicPorts\` block — \`dynamicPorts\` says the ports exist, this says what they
   * are called.
   */
  parameterEncoding: ParameterEncoding | null;
  /**
   * NSP-018 (phase 107) — for a node with an executable spec, what it does in words: for each input port, one line
   * per case, \`<the case> → <what the wire carries>\`. Generated from the spec; a port is absent until its cases
   * have been given their words.
   */
  rules?: Record<string, string[]>;
  /**
   * NSP-019 (phase 107, R35) — for a node with an executable spec, what it can warn the editor about: each warning's key
   * (the one the editor shows it under) and, in words, when it holds. Generated from the spec's \`diagnostics\`.
   */
  warnings?: Record<string, string>;
}

export interface Typecast {
  from: string;
  to: string[];
}

export interface NodeCatalog {
  catalogFormatVersion: string;
  generatedBy: string;
  schemaDocs: string;
  packages: Record<string, string>;
  portTypeNames: string[];
  typecasts: Typecast[];
  nodes: CatalogNode[];
}
`;
}

/**
 * NSP-018 (phase 107) — for a node with a spec, a port's description is the SPEC's: the catalog takes it from
 * `packages/nodegx-node-spec/src/nodes`, where it is edited, and the runtime's registration keeps its own copy only because
 * the editor reads it there. Returns every port whose runtime description differs from its spec's — each one is a
 * description edited in the wrong place, or a spec that has not been told. Outcome ports (`done`, `unchanged`, …) are drawn
 * from the spec's `outcomes`, not declared, and keep the runtime's words.
 */
function takeDescriptionsFromSpecs(catalog, specs) {
  const disagreements = [];
  const byName = new Map(catalog.nodes.map((n) => [n.typeName, n]));
  for (const [typeName, spec] of Object.entries(specs)) {
    const node = byName.get(typeName);
    if (!node) continue; // the catalog-parity gate (packages/nodegx-node-spec) fails a spec with no catalog node
    for (const [plug, ports, declared] of [
      ['input', node.inputs, spec.inputs],
      ['output', node.outputs, spec.outputs]
    ]) {
      for (const port of ports) {
        if (!Object.prototype.hasOwnProperty.call(declared, port.name)) continue;
        const fromSpec = declared[port.name].description;
        if (port.description !== fromSpec) {
          disagreements.push({ typeName, plug, port: port.name, runtime: port.description, spec: fromSpec, source: spec.source });
        }
        if (fromSpec === undefined) delete port.description;
        else port.description = fromSpec;
      }
    }
  }
  return disagreements;
}

function describeDisagreements(disagreements) {
  const lines = disagreements.map(
    (d) =>
      `  ${d.typeName} · ${d.plug} "${d.port}" (${d.source || 'no source named'})\n` +
      `    the runtime says: ${JSON.stringify(d.runtime)}\n` +
      `    the spec says:    ${JSON.stringify(d.spec)}`
  );
  return (
    `${disagreements.length} port description(s) differ from the node's spec (NSP-018):\n${lines.join('\n')}\n` +
    'A specced node\'s descriptions are edited in its spec (packages/nodegx-node-spec/src/nodes). Make the runtime\'s ' +
    'registration say the same words, or change the spec if the runtime\'s are the better ones.'
  );
}

async function main() {
  const checkMode = process.argv.includes('--check');
  const outDirIndex = process.argv.indexOf('--out-dir');
  const outDir = outDirIndex === -1 ? null : process.argv[outDirIndex + 1];
  if (outDirIndex !== -1 && !outDir) throw new Error('--out-dir needs a directory');
  const targetJson = outDir ? path.join(outDir, path.basename(OUT_JSON)) : OUT_JSON;
  const targetDts = outDir ? path.join(outDir, path.basename(OUT_DTS)) : OUT_DTS;

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-catalog-'));
  try {
    const bundlePath = await bundleEntry(path.join(__dirname, 'extractor-entry.js'), workDir);

    const first = runExtractor(bundlePath, workDir, 'run1');
    const second = runExtractor(bundlePath, workDir, 'run2');
    if (first !== second) {
      throw new Error('Non-deterministic output: two extractor runs differed. Fix the generator before publishing.');
    }

    const catalog = JSON.parse(first);
    const specs = loadSpecs();
    const disagreements = takeDescriptionsFromSpecs(catalog, specs);
    if (disagreements.length) throw new Error(describeDisagreements(disagreements));
    // NSP-018 — a specced node's rules in words, from its reducers' `says` (scripts/node-spec/rules.js)
    const rules = rulesFor(specs);
    for (const node of catalog.nodes) if (rules[node.typeName]) node.rules = rules[node.typeName];
    // NSP-019 (R35, s104) — what a specced node can warn the editor about, in the spec's words: each declared diagnostic's
    // `says`, by key, in the spec's order
    for (const node of catalog.nodes) {
      const diagnostics = specs[node.typeName] && specs[node.typeName].diagnostics;
      if (diagnostics) node.warnings = Object.fromEntries(Object.entries(diagnostics).map(([key, d]) => [key, d.says]));
    }
    const json = JSON.stringify(catalog, null, 2) + '\n';
    const dts = emitTypes(catalog);

    const dynamic = catalog.nodes.filter((n) => n.dynamicPorts);
    console.log(
      `Catalog: ${catalog.nodes.length} node types, ` +
        `${dynamic.length} with dynamic ports, ` +
        `${catalog.portTypeNames.length} port value types.`
    );

    // SUB-013 criterion 1 — no silent gaps. Every node with dynamic ports carries an encoding,
    // either with patterns or with an explicit reason it has none. Asserted rather than
    // reported: a missing block would otherwise read to a consumer exactly like "no encoding
    // needed", which is the ambiguity the field exists to remove.
    const missing = dynamic.filter((n) => !n.parameterEncoding).map((n) => n.typeName);
    if (missing.length) {
      throw new Error(`Nodes with dynamic ports but no parameterEncoding: ${missing.join(', ')}`);
    }
    const withPatterns = dynamic.filter((n) => n.parameterEncoding.known && n.parameterEncoding.patterns.length);
    const visibilityOnly = dynamic.filter((n) => n.parameterEncoding.known && !n.parameterEncoding.patterns.length);
    console.log(
      `Parameter encodings: ${withPatterns.length} with key formulas, ` +
        `${visibilityOnly.length} that compute no names, ` +
        `${dynamic.length - withPatterns.length - visibilityOnly.length} recorded as not statically knowable.`
    );

    if (checkMode) {
      const stale = [];
      // --check always compares against the committed artifacts; --out-dir is a write option.
      const current = { [OUT_JSON]: json, [OUT_DTS]: dts };
      for (const [file, expected] of Object.entries(current)) {
        const committed = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
        if (committed !== expected) stale.push(path.relative(REPO_ROOT, file));
      }
      if (stale.length) {
        console.error(
          `Stale node catalog: ${stale.join(', ')} does not match the registries.\n` +
            'Run "npm run catalog:generate" and commit the result.'
        );
        process.exit(1);
      }
      console.log('Committed catalog is up to date.');
    } else {
      if (outDir) fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(targetJson, json);
      fs.writeFileSync(targetDts, dts);
      console.log(`Wrote ${targetJson} and ${targetDts}.`);
    }
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
