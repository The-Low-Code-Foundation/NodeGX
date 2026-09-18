/**
 * v2 files → Graph IR. The faithful half of the pipeline: this stage records what the project
 * says, resolves it against the catalog, and refuses to guess. Decisions (dispositions, names,
 * file plans) belong to analysis, not here.
 *
 * Parsing never drops and never fails on content: unknown node types get catalogRef null,
 * statically-unknowable port sets get portKnowledge 'unknown'/'partial', script parameters are
 * captured verbatim. See EXP-002-IR-DESIGN.md.
 */

import * as fs from 'fs';
import * as path from 'path';

// The shipped default token set, read from the package that owns it (the Rise lesson: never
// restate content the artifact already carries). HLS-001 moved it out of the editor: this package
// has to be installable on its own, and a relative path into `noodl-editor/src` made that
// impossible. Pure data, no editor runtime involved.
import { DEFAULT_TOKENS } from '@nodegx/project-contract/tokens';
// HLS-003 — the graph the author saw. `applyPatches` runs NDA-017's migration on every editor
// open, rewriting stored parameters; `parseProject` reads the files as written, so without this
// the exporter reads a graph the canvas never showed. The migration lives in the shared contract
// package for exactly this reason: one copy, both readers. See `settleComponent`.
import {
  applyRunOnValueChangeMigration,
  type MigrationComponentLike,
  type MigrationConnectionLike,
  type MigrationNodeLike,
  type RunOnChangeWrite
} from '@nodegx/project-contract/run-on-value-change-migration';
import {
  Catalog,
  CatalogIndex,
  EXECUTION_REVEALED_TYPES,
  isCodeEditorType,
  isJavaScriptCodeEditorType,
  isSignalPort,
  portTypeName
} from '../catalog';
import {
  AuthoringIntent,
  CloudServicesIR,
  ComponentIR,
  ConnectionIR,
  ExportIR,
  NodeIR,
  ParamIR,
  ParamValue,
  PortIR,
  ProjectIR,
  RouterIR,
  StylesIR,
  VariantIR
} from '../ir/types';
import { parseModules } from './parseModules';

export const EXPORTER_VERSION = '0.0.1';

interface RawPort {
  name: string;
  plug?: 'input' | 'output';
  type?: string | { name?: string; codeeditor?: string };
  default?: unknown;
}

interface RawNode {
  id: string;
  /** Absent on rare editor debris (a node with only an id and canvas position) — see parseNode. */
  type?: string;
  label?: string;
  parameters?: Record<string, unknown>;
  dynamicports?: RawPort[];
  /** Component Inputs/Outputs declare their interface here, not under dynamicports. */
  ports?: RawPort[];
  metadata?: { comment?: string };
  parent?: string;
  children?: string[];
  /** STY-004. The Look this node wears — a top-level field, not a parameter. */
  variant?: string;
}

export function parseProject(projectDir: string, catalog: Catalog): ExportIR {
  const index = new CatalogIndex(catalog);
  const projectFile = readJson(path.join(projectDir, 'nodegx.project.json'));
  const componentsDir = path.join(projectDir, projectFile.structure?.componentsDir ?? 'components');

  // Cloud functions live under components/__cloud__ and run on the backend's interpreter —
  // they are not browser components and must not be walked as if they were.
  const cloudDir = path.join(componentsDir, '__cloud__');
  const cloudComponents = fs.existsSync(cloudDir)
    ? findComponentDirs(cloudDir).map((dir) => path.relative(componentsDir, dir).split(path.sep).join('/'))
    : [];

  // HLS-003. Filled by `settleComponent` as each component is read; carried into the IR so the
  // report can say what the file did not, rather than the export quietly reading a better graph.
  const settled: RunOnChangeWrite[] = [];

  // STY-004. Read before the components, because every node that wears a Look resolves against it.
  const styles = parseStyles(projectDir, projectFile);

  const components = findComponentDirs(componentsDir)
    .filter((dir) => !path.relative(componentsDir, dir).split(path.sep).includes('__cloud__'))
    .map((dir) => parseComponent(dir, index, settled, styles))
    // D1: components sort by path, codepoint order.
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const project: ProjectIR = {
    name: projectFile.name ?? path.basename(projectDir),
    catalogFormatVersion: index.catalogFormatVersion,
    exporterVersion: EXPORTER_VERSION,
    settledRunOnValueChange: settled,
    designTokens: effectiveTokens(projectFile.metadata?.designTokens?.customTokens ?? []),
    collections: (projectFile.metadata?.dbCollections ?? []).map((c: any) => ({
      name: c.name,
      columns: (c.columns ?? []).map((col: any) => ({ name: col.name, type: col.type }))
    })),
    routers: collectRouters(components),
    cloudComponents,
    // EXP-010. ⚠️ This line runs the project's own kit code (`kitSource.ts`) — a custom node's
    // ports are declared nowhere else. Never throws: a broken kit is a row with a status.
    modules: parseModules(projectDir)
  };
  const cloudservices = parseCloudServices(projectFile.metadata?.cloudservices);
  if (cloudservices !== undefined) project.cloudservices = cloudservices;

  if (styles !== undefined) project.styles = styles;

  return { project, components };
}

/**
 * STY-004 AC1 — the project's style dictionary, from whichever of the two shapes is on disk.
 *
 * 🔴 **This file was never opened before.** `parseProject` read four files and `nodegx.styles.json`
 * was not one of them, so every colour style, text style and Look was a name pointing at a
 * dictionary the exporter did not hold — and the export dropped all three without a word
 * (STY-001-FINDINGS §8.4b).
 *
 * The two shapes, and which field is which, are transcribed from the editor's own reader
 * (`ProjectImporter.reconstructMetadata` / `reconstructVariants`,
 * `noodl-editor/src/editor/src/io/ProjectImporter.ts:422-455`) rather than inferred from a sample:
 *
 * - **v2** — `nodegx.styles.json`, `{ colors, textStyles, variants[] }`.
 * - **legacy** — `nodegx.project.json`, `{ metadata: { styles: { colors, text } }, variants[] }`.
 *   The text-preset map is named `text` there and `textStyles` in v2; the importer maps exactly
 *   that pair, so this reads `text` into `textStyles` and nothing else changes name.
 *
 * Returns undefined when the project declares no styles at all — which is every fixture in this
 * package and all seven shipped templates, so that arm is the one carrying the load. An *empty*
 * dictionary and an *absent* one are deliberately the same answer: neither can resolve anything,
 * and a present-but-empty `styles` on the IR would make every downstream `if (styles)` lie.
 */
function parseStyles(projectDir: string, projectFile: any): StylesIR | undefined {
  const stylesPath = path.join(projectDir, 'nodegx.styles.json');
  const v2 = fs.existsSync(stylesPath) ? readJson(stylesPath) : undefined;
  const legacy = projectFile.metadata?.styles;

  const colors: Record<string, string> = {};
  for (const [name, value] of Object.entries((v2?.colors ?? legacy?.colors ?? {}) as Record<string, unknown>)) {
    if (typeof value === 'string') colors[name] = value;
  }

  const textStyles: Record<string, Record<string, unknown>> = {};
  for (const [name, value] of Object.entries(
    (v2?.textStyles ?? legacy?.text ?? {}) as Record<string, unknown>
  )) {
    if (value !== null && typeof value === 'object') textStyles[name] = value as Record<string, unknown>;
  }

  // The v2 file carries the Looks; the legacy shape carries them on the project file's own
  // `variants` key. Same array either way.
  const rawVariants: unknown[] = Array.isArray(v2?.variants)
    ? v2.variants
    : Array.isArray(projectFile.variants)
      ? projectFile.variants
      : [];
  const variants: VariantIR[] = [];
  for (const raw of rawVariants as any[]) {
    // A Look is addressed by the pair. One without either half can never be the answer to a
    // node's `variant`, so it is not a row — it would only widen every lookup.
    if (typeof raw?.name !== 'string' || typeof raw?.typename !== 'string') continue;
    variants.push({
      name: raw.name,
      typename: raw.typename,
      parameters: raw.parameters ?? {},
      stateParameters: raw.stateParameters ?? {},
      stateTransitions: raw.stateTransitions ?? {}
    });
  }

  if (Object.keys(colors).length === 0 && Object.keys(textStyles).length === 0 && variants.length === 0) {
    return undefined;
  }
  return { colors, textStyles, variants };
}

/**
 * The deployed backend's address (EXP-009). Exactly four fields are copied — everything in the
 * IR is presumed emittable into a browser bundle, so a privileged credential pasted into project
 * metadata (a master key, an admin token) is dropped here, by construction rather than by grep.
 * Absent unless both endpoint and appId are non-empty strings; a half-declared backend is no
 * backend, and the api modules stay stubs with the reason named in the report.
 */
function parseCloudServices(raw: unknown): CloudServicesIR | undefined {
  if (raw === null || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const { endpoint, appId, instanceId, type } = record;
  if (typeof endpoint !== 'string' || endpoint.length === 0) return undefined;
  if (typeof appId !== 'string' || appId.length === 0) return undefined;
  return {
    endpoint,
    appId,
    ...(typeof instanceId === 'string' ? { instanceId } : {}),
    ...(typeof type === 'string' ? { type } : {})
  };
}

/**
 * The effective token set — shipped defaults merged with the project's overrides, in shipped
 * order, custom extras appended in source order. The runtime resolves `var()` against exactly
 * this merge (editor `ProjectTokenCss.buildEffectiveTokens`, REV-009); emitting only the
 * overrides left every default reference (`--space-4`, `--text-xl`, …) unresolved — found by
 * the first fixture with no overrides at all (EXP-002-STEP5-TARGET-OUTPUT.md §6).
 */
function effectiveTokens(custom: any[]): ProjectIR['designTokens'] {
  const overrides = new Map<string, any>(
    custom.filter((t: any) => typeof t?.name === 'string').map((t: any) => [t.name, t])
  );
  const defaultNames = new Set(DEFAULT_TOKENS.map((t) => t.name));
  const merged = [
    ...DEFAULT_TOKENS.map((d) => overrides.get(d.name) ?? d),
    ...custom.filter((t: any) => typeof t?.name === 'string' && !defaultNames.has(t.name))
  ];
  return merged.map((t: any) => ({
    name: t.name,
    value: t.value,
    ...(t.category !== undefined ? { category: t.category } : {}),
    ...(t.description !== undefined ? { description: t.description } : {})
  }));
}

/** Recursively finds every directory under `root` holding a component.json. */
function findComponentDirs(root: string): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (!entry.isDirectory()) continue;
      const child = path.join(dir, entry.name);
      if (fs.existsSync(path.join(child, 'component.json'))) found.push(child);
      walk(child);
    }
  };
  walk(root);
  return found;
}

/**
 * HLS-003 — settle one component's stored parameters the way an editor load would.
 *
 * ## Why the exporter has to do this at all
 *
 * `applyPatches` runs NDA-017's migration immediately before `ProjectModel.fromJSON`, and
 * `fromJSON` does not apply patches. So the graph on the canvas is the migrated one, while every
 * reader that goes to the files — this one, and the editor's own export, which reaches
 * `parseProject` rather than the loaded model — sees the file as written. On a node whose control
 * signal is wired and whose governed input is unstated, those two readings disagree: absence means
 * *ticked* to a file reader and *false* to the editor, because the migration wrote it.
 *
 * 🔴 **The disagreement costs translation, not just fidelity.** Measured on the `cheer` fixture:
 * with `runOnChange-condition` absent, two `Condition` nodes report "Run On Value Change is
 * ticked", which the analyser has no rule for, and the export drops from *nothing left over (9)*
 * to *(7)* — two pages and four cascade nodes refused over a parameter the author never chose.
 * Reading the file as written does not ship a subtly different app; it refuses work it could do.
 *
 * ## Why the flat node list can be handed over as `roots`
 *
 * The migration walks `roots`, recursing into `children` only when the child is an object. In the
 * v2 files `children` is an array of **id strings**, and every node in the component is already in
 * the flat `nodes` array — so passing that array as `roots` visits each node exactly once and
 * recurses into nothing. No unflattening, and no second opinion about the tree shape.
 *
 * ## What this deliberately does not do
 *
 * ⚠️ **Nothing is written back to the project.** The settle is in memory, for this read only. A
 * reader that repaired the user's files as a side effect of exporting them would be a far worse
 * defect than the one this closes.
 *
 * ⚠️ It is the migration's own population and no wider — `applyRunOnValueChangeMigration` is
 * imported, not reimplemented, so a family added there is settled here on the same day.
 */
function settleComponent(
  componentName: string,
  rawNodes: RawNode[],
  connections: unknown[]
): RunOnChangeWrite[] {
  // `RawNode` and `MigrationNodeLike` overlap in every field the migration reads — id, type,
  // parameters, ports, dynamicports — without either being assignable to the other (`children`
  // is ids here, nodes there). One cast at the seam, rather than widening `RawNode` to suit a
  // consumer of it.
  const component: MigrationComponentLike = {
    name: componentName,
    graph: {
      roots: rawNodes as unknown as MigrationNodeLike[],
      connections: connections as MigrationConnectionLike[]
    }
  };
  return applyRunOnValueChangeMigration({ components: [component] }).writes;
}

function parseComponent(
  dir: string,
  catalog: CatalogIndex,
  settled: RunOnChangeWrite[],
  styles: StylesIR | undefined
): ComponentIR {
  const meta = readJson(path.join(dir, 'component.json'));
  const nodesFile = readJson(path.join(dir, 'nodes.json'));
  const connectionsPath = path.join(dir, 'connections.json');
  const connectionsFile = fs.existsSync(connectionsPath) ? readJson(connectionsPath) : { connections: [] };

  const rawNodes: RawNode[] = nodesFile.nodes ?? [];

  // 🔴 Before anything reads a parameter. `parseNode` copies the bag into the IR, so a settle
  // after this line would be invisible to every consumer of it.
  settled.push(
    ...settleComponent(String(meta.path ?? meta.name ?? ''), rawNodes, connectionsFile.connections ?? [])
  );

  const nodes = rawNodes.map((raw) => parseNode(raw, catalog, styles));
  const nodeById = new Map(rawNodes.map((raw) => [raw.id, raw]));

  const connections: ConnectionIR[] = (connectionsFile.connections ?? []).map((raw: any) => {
    const kind = resolveSourcePortKind(nodeById.get(raw.fromId), catalog, raw.fromProperty);
    return {
      // The GraphSnapshot.connectionKey format, adopted verbatim (EXP-006 keys wire labels by it).
      key: `${raw.fromId}:${raw.fromProperty}->${raw.toId}:${raw.toProperty}`,
      fromId: raw.fromId,
      fromProperty: raw.fromProperty,
      toId: raw.toId,
      toProperty: raw.toProperty,
      kind,
      ...(typeof raw.label === 'string' ? { label: raw.label } : {})
    };
  });

  const intent: AuthoringIntent = {
    nodeComments: rawNodes
      .filter((n) => typeof n.metadata?.comment === 'string' && n.metadata.comment.length > 0)
      .map((n) => ({ nodeId: n.id, text: n.metadata!.comment! })),
    wireLabels: connections.filter((c) => c.label !== undefined).map((c) => ({ connectionKey: c.key, text: c.label! })),
    // v2 files do not yet serialise comment boxes; EXP-006 owns wiring these through.
    regions: [],
    ...(typeof meta.description === 'string' ? { componentDescription: meta.description } : {})
  };

  return {
    id: meta.id,
    path: String(meta.path ?? meta.name).replace(/^\//, ''),
    role: meta.type === 'page' ? 'page' : 'component',
    nodes,
    connections,
    // Carried verbatim, including the empty array: `visualRoots: []` means "this component draws
    // nothing", which is a different statement from the field being absent (an older file, where
    // the planner must fall back to its own rule). Collapsing the two would turn a component the
    // author emptied into one the planner guesses a root for.
    ...(Array.isArray(nodesFile.visualRoots) ? { visualRoots: nodesFile.visualRoots as string[] } : {}),
    intent
  };
}

function parseNode(raw: RawNode, catalog: CatalogIndex, styles: StylesIR | undefined): NodeIR {
  // The fixture corpus contains real editor debris: a node with only an id and a position.
  // Parse never fails on content — an empty type parses to catalogRef null and analysis
  // dispositions it as unknown-type (and the report says so).
  const type = typeof raw.type === 'string' ? raw.type : '';
  const isComponentInstance = type.startsWith('/');
  const catalogEntry = isComponentInstance ? undefined : catalog.get(type);

  // Component Inputs/Outputs serialise their interface under `ports`; everything else declares
  // instance-specific ports under `dynamicports`. Both are the node's own declarations.
  const rawPorts = [...(raw.dynamicports ?? []), ...(raw.ports ?? [])];
  const declaredPorts: PortIR[] = rawPorts.map((p) => ({
    name: p.name,
    plug: p.plug ?? 'input',
    kind: isSignalPort(p) ? 'signal' : 'value',
    ...(portTypeName(p.type) !== undefined ? { type: portTypeName(p.type) } : {}),
    ...(p.default !== undefined ? { default: p.default } : {})
  }));

  // A script parameter is declared codeeditor either on the node's own dynamic ports or on the
  // node type's static catalog inputs (`functionScript`, `expression`, `code` — the IR contract
  // promises sourceText for script-bearing nodes, and those three are static ports).
  const scriptParamNames = new Set(rawPorts.filter((p) => isCodeEditorType(p.type)).map((p) => p.name));
  for (const port of catalogEntry?.inputs ?? []) {
    if (isCodeEditorType(port.type)) scriptParamNames.add(port.name);
  }

  /**
   * 🔴 The **narrower** set, and `sourceText` is the only thing that wants it. Every codeeditor
   * port classifies as a `script` parameter, which is honest — it is what the editor opens a code
   * editor for. But 29 of the catalog's 36 are `styleCss`, and a Text node with authored CSS was
   * filling `sourceText` with that CSS, under a contract promising author-written *code*. The
   * language is in the catalog, so ask it. See `isJavaScriptCodeEditorType`.
   */
  const jsScriptParamNames = new Set(rawPorts.filter((p) => isJavaScriptCodeEditorType(p.type)).map((p) => p.name));
  for (const port of catalogEntry?.inputs ?? []) {
    if (isJavaScriptCodeEditorType(port.type)) jsScriptParamNames.add(port.name);
  }

  const parameters: ParamIR[] = Object.entries(raw.parameters ?? {})
    .map(([name, value]) => ({ name, value: classifyParam(value, scriptParamNames.has(name)) }))
    // D3: parameters sort by name; the source JSON's object key order is not trusted.
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const scriptSources = parameters.filter((p) => p.value.kind === 'script' && jsScriptParamNames.has(p.name));
  const inherited = inheritedParametersOf(raw, type, styles);

  return {
    id: raw.id,
    type,
    catalogRef: catalogEntry ? catalogEntry.typeName : null,
    ...('label' in raw && typeof raw.label === 'string' ? { authoredLabel: raw.label } : {}),
    parameters,
    declaredPorts,
    portKnowledge: portKnowledgeOf(type, isComponentInstance, catalogEntry?.dynamicPorts ?? null),
    ...(scriptSources.length > 0 ? { sourceText: (scriptSources[0].value as { source: string }).source } : {}),
    ...(raw.parent !== undefined ? { parent: raw.parent } : {}),
    ...(raw.children !== undefined ? { children: raw.children } : {}),
    // STY-004 AC2. Verbatim, and only when the file said so — an absent field must stay absent, so
    // that "wears no Look" and "wears a Look named empty string" are different states downstream.
    ...(typeof raw.variant === 'string' && raw.variant.length > 0 ? { variant: raw.variant } : {}),
    ...(inherited.length > 0 ? { inheritedParameters: inherited } : {})
  };
}

/** The `textStyle` port's nine child ports, in the order `node-shared-port-definitions.ts:2122-2133`
 * declares them. A text style's stored object holds exactly these keys. */
const TEXT_STYLE_CHILD_PORTS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'color',
  'letterSpacing',
  'lineHeight',
  'textTransform',
  'fontVariantNumeric'
] as const;

/**
 * STY-004 AC3/AC4 — everything this node's Look and text style lend it, beneath its own parameters.
 *
 * 🔴 **Transcribed from three runtime sites, not designed here.** Getting this order wrong produces
 * an export that renders differently from the editor, which is worse than the silent drop it
 * replaces, so each layer names where it comes from:
 *
 * 1. **the text style, lowest** — `Text.tsx:48-51` and `Button.tsx:41-44` both build the element's
 *    style as `{...props.textStyle, ...props.style}`. `props.style` is what the individual font
 *    ports wrote. So the bundle loses to any individual port, **whichever layer supplied it** —
 *    which is why the text style is expanded first and the Look's parameters are laid over it,
 *    rather than each being resolved independently.
 * 2. **the Look** — `react-component-node.ts:1817-1822` does `mergeDeep(params, variant.parameters)`
 *    then `mergeDeep(params, this.model.parameters)`.
 * 3. **the node's own** — not here; they stay in `parameters` and win at the style layer.
 *
 * A `<prefix>textStyle` parameter expands to `<prefix>`-prefixed child ports: the ports are
 * declared as `portPrefix + 'fontSize'` beside `portPrefix + 'textStyle'`, so a control's
 * `labeltextStyle` lends `labelfontSize`, not `fontSize`. Reading the prefix off the parameter name
 * keeps one rule for every prefix the library declares instead of a list of known ones.
 */
function inheritedParametersOf(
  raw: RawNode,
  type: string,
  styles: StylesIR | undefined
): ParamIR[] {
  if (styles === undefined) return [];

  const own = raw.parameters ?? {};
  const look =
    typeof raw.variant === 'string' && raw.variant.length > 0
      ? styles.variants.find((v) => v.name === raw.variant && v.typename === type)
      : undefined;

  const merged = new Map<string, unknown>();

  // 1. Every text style named by either layer, expanded under its own prefix. The Look's choice of
  //    text style is read from the same merged view the runtime would see — the node's own name for
  //    a given port wins, exactly as it does for any other parameter.
  const textStyleNames = new Map<string, string>(); // prefix -> style name
  for (const source of [look?.parameters ?? {}, own]) {
    for (const [name, value] of Object.entries(source)) {
      if (!name.endsWith('textStyle') || typeof value !== 'string' || value.length === 0) continue;
      textStyleNames.set(name.slice(0, -'textStyle'.length), value);
    }
  }
  for (const [prefix, styleName] of textStyleNames) {
    const bundle = styles.textStyles[styleName];
    if (bundle === undefined) continue; // an unresolvable name stays unhandled and gets reported
    for (const child of TEXT_STYLE_CHILD_PORTS) {
      if (bundle[child] === undefined || bundle[child] === '') continue;
      merged.set(prefix + child, bundle[child]);
    }
  }

  // 2. The Look's own parameters, over the bundle.
  for (const [name, value] of Object.entries(look?.parameters ?? {})) merged.set(name, value);

  // 3. Anything the node states itself is not inherited — it already lives in `parameters`, and
  //    leaving a duplicate here would make the report claim a Look lent a value the person typed.
  for (const name of Object.keys(own)) merged.delete(name);

  return [...merged]
    .map(([name, value]) => ({ name, value: classifyParam(value, false) }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

function portKnowledgeOf(
  type: string,
  isComponentInstance: boolean,
  dynamicPorts: { mechanisms?: string[] } | null
): NodeIR['portKnowledge'] {
  // A component instance's interface is its Component Inputs/Outputs declarations — knowable.
  if (isComponentInstance) return 'complete';
  if (EXECUTION_REVEALED_TYPES.has(type)) return 'unknown';
  return dynamicPorts ? 'partial' : 'complete';
}

function classifyParam(value: unknown, declaredAsScript: boolean): ParamValue {
  if (declaredAsScript && typeof value === 'string') return { kind: 'script', source: value };
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return { kind: 'literal', value };
  }
  if (isDimension(value)) return { kind: 'dimension', value: value.value, unit: value.unit };
  return { kind: 'json', value };
}

function isDimension(value: unknown): value is { value: number; unit: string } {
  if (typeof value !== 'object' || value === null) return false;
  const keys = Object.keys(value);
  return (
    keys.length === 2 &&
    typeof (value as any).value === 'number' &&
    typeof (value as any).unit === 'string'
  );
}

/**
 * The kind of a connection's source port. Checks the node's own declared ports first, then the
 * catalog. Falls back to 'value' when neither knows — never guesses 'signal', because EXP-003's
 * equivalence rules count signals and a phantom one is worse than a missed one.
 */
function resolveSourcePortKind(
  fromNode: RawNode | undefined,
  catalog: CatalogIndex,
  portName: string
): 'value' | 'signal' {
  if (fromNode) {
    const declared = [...(fromNode.dynamicports ?? []), ...(fromNode.ports ?? [])].find((p) => p.name === portName);
    if (declared) return isSignalPort(declared) ? 'signal' : 'value';
    const fromType = fromNode.type ?? '';
    if (fromType && !fromType.startsWith('/')) {
      const kind = catalog.portKind(fromType, portName, 'output');
      if (kind) return kind;
    }
  }
  return 'value';
}

function collectRouters(components: ComponentIR[]): RouterIR[] {
  const routers: RouterIR[] = [];
  for (const component of components) {
    for (const node of component.nodes) {
      if (node.type !== 'Router') continue;
      const nameParam = node.parameters.find((p) => p.name === 'name')?.value;
      const pagesParam = node.parameters.find((p) => p.name === 'pages')?.value;
      const pages =
        pagesParam?.kind === 'json' ? (pagesParam.value as { startPage?: string; routes?: string[] }) : undefined;
      routers.push({
        name: nameParam?.kind === 'literal' ? String(nameParam.value) : 'Main',
        componentPath: component.path,
        nodeId: node.id,
        ...(pages?.startPage !== undefined ? { startPage: pages.startPage } : {}),
        routes: pages?.routes ?? []
      });
    }
  }
  return routers;
}

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
