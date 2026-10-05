/**
 * FIX-007 — a wire to the name the script uses, on a node that does not use it.
 *
 * ## The failure this exists to catch
 *
 * A Function node's connectable port **name** is prefixed and its script name is
 * not: `simplejavascript.ts` mints ports through `JavascriptNodeParser` with
 * `inputPrefix: 'in-'` / `outputPrefix: 'out-'`, and the parser stores
 * `{ name: prefix + p, displayName: p }`. So a script reading `Inputs.amount`
 * gives a port **named** `in-amount` and **labelled** `amount`.
 *
 * The panel shows the label. Both catalogs used to document the label as if it
 * were the name, and all three worked examples wired it. A connection written
 * `toProperty: "amount"` then passes every gate we own — MCP's zod (four plain
 * strings), the semantic validator's port rule (which skips `runtime-discovered`
 * types **by design**, and must keep doing so), the structural schema — and
 * fails only later, on the canvas, as the health warning `con-no-target-port`
 * ("Target port doesn't exist"). The user redraws what looks like the identical
 * connection by hand, gets `in-amount` because the drag reads the port not the
 * label, and it works. The AI looks broken and nothing can say why.
 *
 * ## Why it is safe to error where the port rule must not
 *
 * The port rule sees a node type whose ports are runtime-determined and stops,
 * correctly. This check does not guess either — it reads the **same parameter
 * the runtime reads** (`functionScript`) with the **same regexes**, and speaks
 * only when the mined set proves the intent: the bare name is a port this very
 * script creates, so the author meant that port and wrote its label. Anything
 * else — a name the script does not mention, a correctly prefixed name, a name
 * that is also one of the node's declared ports — falls through silently.
 *
 * That last exclusion matters more than it looks. `Outputs.done()` mines `done`,
 * and `done` is *also* a declared signal output of the node (as are `success`,
 * `failure`, `completed`, `unchanged`, `error`, and the `run` input). Wiring
 * `done` is legitimate — it is the built-in — so the mined-name test alone would
 * report working graphs. The declared-port test is what keeps this at zero false
 * positives, and it is the reason the prefix exists at all: `out-done` and
 * `done` are two different ports on one node.
 *
 * ## Calibration
 *
 * Measured over the 44-project test corpus: **124 endpoints on 71 Function
 * nodes, 80 of them correctly prefixed, and 12 hits** — every one a dead wire,
 * and every one in a graph an agent wrote. Not a single hand-drawn or prefab
 * connection is affected, which is the split the mechanism predicts: a drag
 * reads the port, only a writer reads the label. The canonical hit is `Puppy
 * test 3`'s "Format Puppy List" — script reads `Inputs.items`, writes
 * `Outputs.text`, wired `items` → `text`, `ports: []`, so the page's list has
 * never rendered under a clean report.
 *
 * ## The grammar
 *
 * The mining regexes are `@noodl/runtime`'s `javascriptnodeparser.js` families,
 * not imported, for the reason `CatalogIndex`'s `runOnChange-` prefix is copied:
 * this layer runs in the editor, in the MCP server and in a CLI, and must not
 * pull the runtime in. Since P109 ISL-006 this file holds no copy of its own. It
 * reads them through `cloudDynamicPorts.ts`'s `scriptPortsFromSource`, the
 * door's port derivation, so the check and the ports the door writes share one
 * grammar. `tests-unit/fix-007/function-ports.test.ts` and `tests-unit/sb-017`
 * run it against the real parser over a corpus and fail when they disagree.
 *
 * Note the parser does **not** strip comments before mining (the commented-out
 * `scriptWithoutComments` line in its source is the record of that decision), so
 * a commented `Inputs.x` really does create a port. This mirrors it.
 *
 * Pure — the caller supplies the nodes, the wires and the catalog.
 *
 * @module noodl-editor/validation/functionPorts
 */

import { scriptPortsFromSource } from '../models/nodelibrary/cloudDynamicPorts';
import { nearest, type CatalogIndex } from './CatalogIndex';
import { DiagnosticCode, type Diagnostic, type Severity } from './diagnostics';

/** The Function node. `Javascript2` (Script) declares its ports and does not prefix them. */
export const FUNCTION_NODE_TYPE = 'JavaScriptFunction';

/** The Script node, whose ports are runtime-discovered by parsing its `code`. */
export const SCRIPT_NODE_TYPE = 'Javascript2';

/**
 * The members of the injected `Node` object the parser actually reads back.
 *
 * ⚠️ **Hand-kept against `javascriptnodeparser.js`, like the regexes above**, and
 * the line references are there so drift is checkable rather than assumed:
 * `Inputs`/`Outputs` `:165-166`, `setOutputs` `:171`, `OnInit` `:178`,
 * `OnDestroy` `:181`, `Setters` `:184`, `OnInputsChanged` `:189`,
 * `Signals` `:203`. Touching one of those lines should bring you here.
 */
export const SCRIPT_NODE_API_MEMBERS = [
  'Inputs',
  'Outputs',
  'Signals',
  'Setters',
  'OnInputsChanged',
  'OnInit',
  'OnDestroy',
  'setOutputs'
] as const;

/**
 * Does this body declare anything the runtime can call after load?
 *
 * Three generations, all live, and the third is the one the shipped library
 * actually uses — see {@link DiagnosticCode.UnrunnableScriptNode} for the census
 * that made counting all three non-optional. `Script` is the parser's own alias
 * for `Node` (`getCodePrefix`), so both spellings count; the lowercase `script(`
 * is the unrelated 2nd-generation call, and the distinction is case-sensitive.
 */
const SCRIPT_DECLARATION = new RegExp(
  ['\\bdefine\\s*\\(', '\\bscript\\s*\\(', `\\b(?:Node|Script)\\s*\\.\\s*(?:${SCRIPT_NODE_API_MEMBERS.join('|')})\\b`].join(
    '|'
  )
);

/**
 * Whether a Script node's body declares a surface the runtime can re-enter.
 *
 * Exported for the specs and for anything else that needs the question without
 * the diagnostic — the predicate is the interesting half of this rule.
 */
export function scriptDeclaresRunnableSurface(code: unknown): boolean {
  if (typeof code !== 'string' || code.trim().length === 0) return false;
  return SCRIPT_DECLARATION.test(code);
}

export interface CheckScriptNodeRunnableOptions {
  /** Component identifier for the diagnostic's location. */
  component: string;
  /** Severity for these findings. Defaults to `warning` — see the code's note. */
  severity?: Severity;
}

/**
 * FIX-006 §3 — a Script node whose body runs once and can never be triggered.
 *
 * The shape the report described: Function-shaped code in a `Javascript2` node.
 * It mints ports from its `Inputs.`/`Outputs.` mentions, so the graph looks
 * wired, and it has no `run` signal to wire, so nothing can ever re-enter it.
 */
export function checkScriptNodeRunnable(
  nodes: readonly ScriptCarryingNode[],
  options: CheckScriptNodeRunnableOptions
): Diagnostic[] {
  const { component, severity = 'warning' } = options;
  const diagnostics: Diagnostic[] = [];

  for (const node of nodes) {
    if (node.type !== SCRIPT_NODE_TYPE) continue;
    const parameters = node.parameters ?? {};
    // The body is elsewhere, so `code` is not evidence of anything.
    if (parameters['useExternalFile'] === 'yes') continue;
    const code = parameters['code'];
    // Unfinished, not wrong.
    if (typeof code !== 'string' || code.trim().length === 0) continue;
    if (scriptDeclaresRunnableSurface(code)) continue;

    const label = node.label ? `"${node.label}"` : node.type;
    diagnostics.push({
      code: DiagnosticCode.UnrunnableScriptNode,
      severity,
      message:
        `The Script node ${label} declares nothing the runtime can call. Its body runs once, when ` +
        'the project loads, and never again — a Script node has no `run` signal and no static ' +
        'outputs, so there is no port that could re-enter it. Any ports it appears to have were ' +
        'mined from its `Inputs.`/`Outputs.` mentions, which is what makes the graph look wired.',
      location: { component, nodeId: node.id, nodeType: SCRIPT_NODE_TYPE },
      suggestion:
        'If this is one-off code that should run on a signal, use a Function node ' +
        `(\`${FUNCTION_NODE_TYPE}\`) instead — it has a \`run\` input and declares outputs you can ` +
        'wire. If it belongs in a Script node, declare a surface the runtime can re-enter: ' +
        '`Node.Signals.Go = function () { … }` for a signal input, `Node.Inputs` / `Node.Outputs` ' +
        'for typed ports, or `Node.OnInit` for load-time setup you meant to be load-time.'
    });
  }

  return diagnostics;
}

/** `simplejavascript.ts:736-739`. */
export const FUNCTION_INPUT_PREFIX = 'in-';
export const FUNCTION_OUTPUT_PREFIX = 'out-';

/** The *display* names a Function script creates — unprefixed, as the panel shows them. */
export interface MinedFunctionPorts {
  inputs: Set<string>;
  outputs: Set<string>;
}

/**
 * The ports a Function script creates, by display name.
 *
 * Returns empty sets for a script that is not a string, so a node whose
 * `functionScript` is absent or wrongly shaped simply produces no findings.
 */
export function mineFunctionScriptPorts(script: unknown): MinedFunctionPorts {
  const mined: MinedFunctionPorts = { inputs: new Set(), outputs: new Set() };
  if (typeof script !== 'string' || script.length === 0) return mined;
  // P109 ISL-006 AC6: the grammar is `cloudDynamicPorts`' copy, not a fourth one. `Inputs["x"]` comes back
  // with the runtime's own `plug: 'inputs'` typo, and still names an input here.
  for (const port of scriptPortsFromSource(script)) {
    const name = String(port.displayName ?? '');
    if (name.length === 0) continue;
    (port.plug === 'output' ? mined.outputs : mined.inputs).add(name);
  }
  return mined;
}

/** A connection as this check reads it. */
export interface FunctionWireLike {
  fromId: string;
  fromProperty: string;
  toId: string;
  toProperty: string;
}

/** The nodes this check reads — the same shape the other value checks take. */
export interface ScriptCarryingNode {
  id: string;
  type: string;
  label?: string;
  parameters?: Record<string, unknown> | null;
  ports?: readonly { name?: unknown }[] | null;
}

export interface CheckFunctionNodePortsOptions {
  /** Component identifier for the diagnostic's location. */
  component: string;
  /**
   * The candidate's connections. **Omitted means "do not check"** — the same
   * convention `urlPaths`, `backend` and `interfaces` follow in this layer. A
   * caller that cannot supply wires has nothing for this check to read.
   */
  wires?: readonly FunctionWireLike[];
  /** Read to tell a mined name that is also a declared port from one that is not. */
  catalog: CatalogIndex;
  /** Severity for these findings. Defaults to `error` — see the module note above. */
  severity?: Severity;
}

/**
 * Connections that name a Function node's port by its display label instead of
 * its name.
 */
export function checkFunctionNodePorts(
  nodes: readonly ScriptCarryingNode[],
  options: CheckFunctionNodePortsOptions
): Diagnostic[] {
  const { component, wires, catalog, severity = 'error' } = options;
  if (!wires || wires.length === 0) return [];

  const mined = new Map<string, MinedFunctionPorts>();
  const declared = new Map<string, Set<string>>();
  const listed = new Map<string, MinedFunctionPorts>();
  const labels = new Map<string, string>();
  for (const node of nodes) {
    if (node.type !== FUNCTION_NODE_TYPE) continue;
    mined.set(node.id, mineFunctionScriptPorts(node.parameters?.['functionScript']));
    listed.set(node.id, {
      inputs: listedLabels(node.parameters?.['scriptInputs']),
      outputs: listedLabels(node.parameters?.['scriptOutputs'])
    });
    labels.set(node.id, node.label ? `"${node.label}"` : node.type);
    const own = new Set<string>();
    if (Array.isArray(node.ports)) {
      for (const port of node.ports) {
        if (port && typeof port === 'object' && typeof port.name === 'string') own.add(port.name);
      }
    }
    declared.set(node.id, own);
  }
  if (mined.size === 0) return [];

  const diagnostics: Diagnostic[] = [];

  for (const wire of wires) {
    const endpoints = [
      { id: wire.toId, port: wire.toProperty, plug: 'input' as const, prefix: FUNCTION_INPUT_PREFIX },
      { id: wire.fromId, port: wire.fromProperty, plug: 'output' as const, prefix: FUNCTION_OUTPUT_PREFIX }
    ];

    for (const { id, port, plug, prefix } of endpoints) {
      const ports = mined.get(id);
      if (!ports) continue; // not a Function node in this candidate
      if (typeof port !== 'string' || port.length === 0) continue;
      if (port.startsWith(prefix)) {
        const unknown = unknownPrefixedPort({ id, port, plug, prefix, wire, component, severity }, ports, listed.get(id)!, declared.get(id)!, labels.get(id)!);
        if (unknown) diagnostics.push(unknown);
        continue;
      }
      if (!(plug === 'input' ? ports.inputs : ports.outputs).has(port)) continue; // not a name we can prove
      // A declared port of the node, or one the instance serialises, really is
      // connectable under this exact name — `done` beside `Outputs.done()`.
      if (catalog.hasPort(FUNCTION_NODE_TYPE, plug, port)) continue;
      if (declared.get(id)?.has(port)) continue;

      const correct = prefix + port;
      const reference = plug === 'input' ? `Inputs.${port}` : `Outputs.${port}`;
      diagnostics.push({
        code: DiagnosticCode.UnprefixedFunctionPort,
        severity,
        message:
          `Connection names ${plug === 'input' ? 'input' : 'output'} "${port}" on the Function node ` +
          `${labels.get(id)}, but that port is named "${correct}". A Function node's ports are prefixed ` +
          `and its script names are not — \`${reference}\` creates the port "${correct}", displayed as ` +
          `"${port}". A wire to the display name connects to nothing and the canvas reports ` +
          `"Target port doesn't exist".`,
        location: {
          component,
          nodeId: id,
          nodeType: FUNCTION_NODE_TYPE,
          port,
          plug,
          connection: {
            fromId: wire.fromId,
            fromProperty: wire.fromProperty,
            toId: wire.toId,
            toProperty: wire.toProperty
          }
        },
        suggestion:
          `Write ${plug === 'input' ? 'toProperty' : 'fromProperty'}: "${correct}". The node's own declared ` +
          'ports — run, done, success, failure, completed, unchanged, error — are not prefixed; only the ' +
          'ports mined from the script are.'
      });
    }
  }

  return diagnostics;
}

/** The labels of a `scriptInputs` / `scriptOutputs` proplist (`[{ id, label }]`), as the runtime reads them. */
function listedLabels(value: unknown): Set<string> {
  const labels = new Set<string>();
  if (!Array.isArray(value)) return labels;
  for (const row of value) {
    const label = row && typeof row === 'object' ? (row as { label?: unknown }).label : undefined;
    if (typeof label === 'string' && label.length > 0) labels.add(label);
  }
  return labels;
}

/** How many names the refusal lists before it stops being readable. */
const MAX_LISTED_PORTS = 24;

/**
 * P109 ISL-006 AC4 — a prefixed endpoint naming a port the node does not have.
 *
 * The node has exactly what the editor's `NodeGraphNode.getPorts` would give it: the written list, the
 * names the code mines (comments included, as the runtime mines them), and the ports saved on the node.
 * Anything else is painted "Target port doesn't exist" and deleted from the build, so this is never a
 * guess. `Outputs[key]` mints nothing, which is the case the list exists for.
 */
function unknownPrefixedPort(
  at: {
    id: string;
    port: string;
    plug: 'input' | 'output';
    prefix: string;
    wire: FunctionWireLike;
    component: string;
    severity: Severity;
  },
  mined: MinedFunctionPorts,
  listed: MinedFunctionPorts,
  saved: Set<string>,
  label: string
): Diagnostic | undefined {
  const { id, port, plug, prefix, wire, component, severity } = at;
  const bare = port.slice(prefix.length);
  const fromList = plug === 'input' ? listed.inputs : listed.outputs;
  const fromCode = plug === 'input' ? mined.inputs : mined.outputs;
  if (fromList.has(bare) || fromCode.has(bare) || saved.has(port)) return undefined;

  const list = plug === 'input' ? 'scriptInputs' : 'scriptOutputs';
  const typeParam = (plug === 'input' ? 'intype-' : 'outtype-') + bare;
  const reference = plug === 'input' ? `Inputs.${bare}` : `Outputs.${bare}`;
  const real = [
    ...new Set([...fromList, ...fromCode].map((n) => prefix + n).concat([...saved].filter((n) => n.startsWith(prefix))))
  ];
  const has =
    real.length === 0
      ? `it has no ${plug} ports of that kind`
      : `its ${plug}s are ${real
          .slice(0, MAX_LISTED_PORTS)
          .map((n) => `"${n}"`)
          .join(', ')}`;
  const closest = nearest(port, real);

  return {
    code: DiagnosticCode.UnknownFunctionPort,
    severity,
    message:
      `Connection names ${plug} "${port}" on the Function node ${label}, but the node has no such port: ` +
      `a Function's ports are the names on its list (${list}) and the ${reference.split('.')[0]}.<name> its code ` +
      `uses, and "${bare}" is in neither — ${has}. The editor paints this wire "${
        plug === 'input' ? 'Target' : 'Source'
      } port doesn't exist" and leaves it out of the app it builds.`,
    location: {
      component,
      nodeId: id,
      nodeType: FUNCTION_NODE_TYPE,
      port,
      plug,
      connection: {
        fromId: wire.fromId,
        fromProperty: wire.fromProperty,
        toId: wire.toId,
        toProperty: wire.toProperty
      }
    },
    suggestion:
      (closest ? `Did you mean "${closest}"? ` : '') +
      `If the node should have "${bare}", add it to ${list} — { "id": "${bare}", "label": "${bare}" }, with its type in ` +
      `the "${typeParam}" parameter — or use ${reference} in the script. The list is the way when the code reaches the ` +
      `port through a variable (${plug === 'input' ? 'Inputs' : 'Outputs'}[key]) or never reads it at all.`,
    alternatives: real.slice(0, MAX_LISTED_PORTS)
  };
}
