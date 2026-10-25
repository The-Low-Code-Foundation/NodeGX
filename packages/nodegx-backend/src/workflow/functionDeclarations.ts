/**
 * SB-016 — what endpoints a deployed bundle declares, and what each one says
 * about who may call it.
 *
 * **Extracted, not copied.** `WorkflowRunner` has answered both of these
 * questions since WF-004 (`findRequestNodeForFunction`, `getAvailableFunctions`,
 * `functionAllowsNoAuth`), but only over workflows it has already *loaded* —
 * which happens at service step 5, long after the HTTP server is listening.
 * SB-016's deploy interlock has to answer them at step 1.5, beside the
 * `devOpen` one, so it reads the same files off disk instead.
 *
 * 🔴 **Two readers of one predicate is how a gate starts disagreeing with the
 * thing it gates.** If this module said "endpoint" and the runner said
 * "endpoint" and the two definitions drifted, the interlock would refuse a
 * deploy over a name nothing serves, or — worse — wave through one it does. So
 * the predicate itself lives here once (`findRequestNode`, the `/#__cloud__/`
 * prefix, SB-003's has-a-Request-node rule) and `WorkflowRunner` imports it.
 * `sb016-function-gate-interlock.test.ts` asserts the two agree over a real
 * deployed bundle rather than trusting that they must.
 *
 * SB-003's rule is load-bearing here and is stated once more because the
 * interlock inherits it: a `/#__cloud__/` component **without** a Request node
 * is a *helper*, not an endpoint. It cannot be called over HTTP at all, so it
 * has nothing for a `functions` rule to gate and must not appear in a refusal
 * telling somebody to write one.
 *
 * @module nodegx-backend/workflow/functionDeclarations
 */

import * as fs from 'fs';
import * as path from 'path';

export const CLOUD_COMPONENT_PREFIX = '/#__cloud__/';
export const REQUEST_NODE_TYPE = 'noodl.cloud.request';
export const WORKFLOW_FILE_SUFFIX = '.workflow.json';

/** One endpoint a bundle serves, and the only thing its graph says about access. */
export interface FunctionDeclaration {
  /** The name an HTTP caller uses — the component name minus the cloud prefix. */
  name: string;
  /** Which `*.workflow.json` it came from. */
  workflow: string;
  /**
   * The Request node's `Allow Unauthenticated` port, as the graph declares it.
   *
   * ⚠️ Two values, and the policy a real project needs has three — a privileged
   * endpoint wants `role:admin` and this port cannot say it. That gap is the
   * whole of SB-016; see the task file's §3.
   */
  allowNoAuth: boolean;
  /**
   * DEF-009 AC4: does the endpoint's own graph write records?
   *
   * Read here rather than beside the limiter because this is the one place that
   * already opens the bundle, and because the deploy interlock and the request
   * dispatcher have to agree about which endpoints the public-write default
   * applies to.
   */
  writesRecords: boolean;
}

/** A component as it appears inside an exported workflow bundle. */
interface BundleComponent {
  name: string;
  nodes?: Record<string, unknown>[];
}

/**
 * The Request node anywhere in a component's node tree, or null.
 *
 * Recursive because the export nests children rather than flattening them, and
 * a Request node placed inside a Group is still the component's Request node.
 */
export function findRequestNode(nodes: Record<string, unknown>[]): Record<string, unknown> | null {
  for (const node of nodes) {
    if (node.type === REQUEST_NODE_TYPE) return node;
    const children = node.children as Record<string, unknown>[] | undefined;
    if (Array.isArray(children)) {
      const found = findRequestNode(children);
      if (found) return found;
    }
  }
  return null;
}

/** `allowNoAuth` off a Request node — false for anything that is not literally `true`. */
export function requestNodeAllowsNoAuth(requestNode: Record<string, unknown> | null): boolean {
  if (!requestNode) return false;
  const params = requestNode.parameters as Record<string, unknown> | undefined;
  return params?.allowNoAuth === true;
}

/**
 * DEF-009 AC4 — the node types that create, change or delete records.
 *
 * 🔴 **A second copy of a list drifts silently.** The authoring door keeps the
 * same list in `noodl-editor/src/editor/src/validation/publicWriteDoor.ts`, and
 * the two live in packages with no import between them — the editor cannot
 * depend on the backend and the backend must not depend on the editor. So they
 * are held equal by a spec that reads the other file
 * (`def009-public-write-default.test.ts`) rather than by hope: the door WARNS
 * about exactly the population this default LIMITS, and a type renamed on one
 * side would otherwise quietly narrow one of them.
 *
 * Wider than port derivation's list and narrower than DEF-004's `COMMIT_PORTS`,
 * for the reason the door states: `response.send` is an answer, not a row, and a
 * public door that can DELETE rows unmetered is the same standing invitation as
 * one that inserts them.
 */
export const RECORD_WRITE_NODE_TYPES: readonly string[] = [
  'NewDbModelProperties',
  'SetDbModelProperties',
  'DeleteDbModelProperties',
  'AddDbModelRelation',
  'RemoveDbModelRelation'
];

/**
 * P124-S1-WRITESRECORDSJS — the `Noodl.Records` members a script writes with (`noodl-runtime/src/api/records.js`).
 *
 * A function that writes from a JavaScript node read as read-only: measured on the training product, 0 record nodes
 * in 27 functions, every write in a script, `writesRecords: false` for all of them, a public `unsubscribe` among
 * them. 🔴 A second copy again, beside the door's list in `publicWriteDoor.ts`, held equal by the same spec.
 *
 * Read by its text, so it is generous on purpose: a call inside a comment or a string counts, which is the safe
 * direction (the default applies). A call through an alias (`const R = Noodl.Records; R.save(…)`) is not seen.
 */
export const RECORD_WRITE_SCRIPT_MEMBERS: readonly string[] = ['create', 'save', 'delete', 'increment', 'addRelation', 'removeRelation'];

const SCRIPT_WRITE_CALL = new RegExp(`\\bRecords\\s*\\.\\s*(${RECORD_WRITE_SCRIPT_MEMBERS.join('|')})\\s*\\(`);

/** The first `Records.<write>(` call a node's script makes (`Records.save`), or undefined. */
export function scriptRecordWrite(node: Record<string, unknown>): string | undefined {
  const script = (node.parameters as Record<string, unknown> | null | undefined)?.functionScript;
  const m = typeof script === 'string' ? SCRIPT_WRITE_CALL.exec(script) : null;
  return m ? `Records.${m[1]}` : undefined;
}

/**
 * Does this node tree create, change or delete a record?
 *
 * Recursive for `findRequestNode`'s reason: the export nests children rather
 * than flattening them, and a write inside a Group is still the graph's write.
 *
 * P124-S1-WRITESHELPER: given the bundle's other cloud components (`helpers`), a node that PLACES one of them is
 * followed into it, so a function that writes only inside a shared helper reads as writing — measured on the
 * training product, four functions writing a thread row through `/#__cloud__/shared/Thread`. Each helper is followed
 * once (`seen`), so a loop of helpers ends. ⚠️ The editor's door follows the same instances when it is handed the
 * project's views, so the warning and the default still name one population. A helper reached only through
 * `Run Tasks`' template is not followed by either.
 */
export function graphWritesRecords(
  nodes: Record<string, unknown>[],
  helpers?: ReadonlyMap<string, Record<string, unknown>[]>,
  seen: Set<string> = new Set()
): boolean {
  for (const node of nodes) {
    if (typeof node.type === 'string' && RECORD_WRITE_NODE_TYPES.includes(node.type)) return true;
    // P124-S1-WRITESRECORDSJS: a script's `Noodl.Records.save(…)` writes as surely as a node does. The editor's
    // door reads the same list, so the warning and the default still name one population.
    if (scriptRecordWrite(node)) return true;
    if (helpers && typeof node.type === 'string' && node.type.startsWith(CLOUD_COMPONENT_PREFIX) && !seen.has(node.type)) {
      const helper = helpers.get(node.type);
      seen.add(node.type);
      if (helper && graphWritesRecords(helper, helpers, seen)) return true;
    }
    const children = node.children as Record<string, unknown>[] | undefined;
    if (Array.isArray(children) && graphWritesRecords(children, helpers, seen)) return true;
  }
  return false;
}

/** P124-S1-WRITESHELPER — a bundle's cloud components by name, for {@link graphWritesRecords} to follow. */
export function cloudGraphsOf(components: readonly { name?: unknown; nodes?: Record<string, unknown>[] }[]): Map<string, Record<string, unknown>[]> {
  const graphs = new Map<string, Record<string, unknown>[]>();
  for (const c of components) {
    if (typeof c?.name === 'string' && c.name.startsWith(CLOUD_COMPONENT_PREFIX)) graphs.set(c.name, c.nodes || []);
  }
  return graphs;
}

/** Does the cloud component `name` write, its placed helpers included? It is never followed into itself. */
export function componentWritesRecords(name: string, graphs: ReadonlyMap<string, Record<string, unknown>[]>): boolean {
  return graphWritesRecords(graphs.get(name) || [], graphs, new Set([name]));
}

/**
 * Every endpoint one exported bundle declares.
 *
 * `exportData` is the parsed `*.workflow.json`; anything that is not shaped like
 * one yields no endpoints rather than throwing, because a bundle this cannot
 * read is already handled loudly by the loader that reads it for real.
 */
export function declaredFunctionsIn(exportData: unknown, workflowName: string): FunctionDeclaration[] {
  const components = ((exportData as { components?: BundleComponent[] } | null)?.components || []) as BundleComponent[];
  const found: FunctionDeclaration[] = [];
  const graphs = cloudGraphsOf(components);
  for (const component of components) {
    if (typeof component?.name !== 'string') continue;
    if (!component.name.startsWith(CLOUD_COMPONENT_PREFIX)) continue;
    const requestNode = findRequestNode(component.nodes || []);
    // SB-003: no Request node = a helper, not an endpoint.
    if (!requestNode) continue;
    found.push({
      name: component.name.slice(CLOUD_COMPONENT_PREFIX.length),
      workflow: workflowName,
      allowNoAuth: requestNodeAllowsNoAuth(requestNode),
      writesRecords: componentWritesRecords(component.name, graphs)
    });
  }
  return found;
}

/**
 * Every endpoint the bundles in `workflowsPath` declare, read straight off disk.
 *
 * Synchronous and forgiving by design: it runs inside the startup sequence
 * before anything else has opened these files, and a bundle it cannot parse
 * contributes nothing rather than aborting the scan. That direction is the safe
 * one for *this* caller and only this one — an unreadable bundle yields no
 * endpoints, so the interlock has nothing to complain about, and the loader at
 * step 5 is the thing that reports the broken file. The interlock must never be
 * the reason a corrupt workflow is discovered, and it never is.
 *
 * A missing directory is a backend with no functions deployed, which is most of
 * them, and answers `[]`.
 */
export function scanDeployedFunctions(workflowsPath: string): FunctionDeclaration[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(workflowsPath);
  } catch {
    return [];
  }
  const declarations: FunctionDeclaration[] = [];
  for (const file of entries.filter((f) => f.endsWith(WORKFLOW_FILE_SUFFIX)).sort()) {
    const workflowName = file.slice(0, -WORKFLOW_FILE_SUFFIX.length);
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(workflowsPath, file), 'utf-8'));
      declarations.push(...declaredFunctionsIn(parsed, workflowName));
    } catch {
      // See above: the loader reports it, not the gate.
    }
  }
  return declarations;
}
