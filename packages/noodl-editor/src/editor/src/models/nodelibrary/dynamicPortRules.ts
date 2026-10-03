/**
 * Value-derived port rules — WFA-009.
 *
 * A node library entry can say "for each name in this string-list parameter,
 * offer a port built from this template". The editor evaluates it locally, so
 * the ports exist with nothing running — which is the whole point: the cloud
 * runtime that used to push them over `sendDynamicPorts` has had no editor
 * connection since WF-007, and WFA-001 replaced it with a generated library
 * that never executes node code (see WFA-009-ASSESSMENT.md §1).
 *
 * ```jsonc
 * {
 *   "name": "namedports/list",
 *   "condition": "status = success OR status NOT SET",   // optional
 *   "parameter": "params",
 *   "port": { "name": "pm-{{*}}", "displayName": "{{*}}", "type": "*",
 *             "typeFromParameter": "ptype-{{*}}",        // optional, CWF-014
 *             "plug": "input", "group": "Parameters" }
 * }
 * ```
 *
 * `typeFromParameter` (CWF-014) names a *sibling* parameter holding this port's
 * declared type — `ptype-total: "number"` makes `pm-total` a `number` port. It
 * is a second question about parameters, not a computation: the value is used
 * verbatim as the port type, and anything falsy or `'*'` leaves the template's
 * own type in place. The whole of it is one lookup, which is the line below.
 *
 * **Where the line is.** A rule may ask a *question* about parameters (the
 * `condition`, evaluated by the same code `conditionalports/*` uses) and expand
 * *one list parameter* into one port per name. It may not compute anything. A
 * node whose ports depend on a database schema, on another component, or on a
 * parsed script writes a `NodeTypeAdapters` class instead — which is what
 * `PageInputs`, `RouterNavigate` and `Router` already do. Growing this rule an
 * escape hatch until it is code in JSON is the failure mode to avoid.
 *
 * **Not related to the four commented-out managers** at `nodelibrary.ts:117`
 * (`numbered`, `portchannel`, `conditionalports`, `expand`) — their classes no
 * longer exist in the repo and reviving them is explicitly out of WFA-009's
 * scope. `conditionalports/*` in particular is a FILTER over statically declared
 * ports and cannot express `pm-<name>`; this is a generator and does not filter.
 *
 * This module has **no imports on purpose**: it is reached from `tests-unit/`
 * (plain Node, no renderer, no Electron, no editor singletons), which is the
 * only place the editor can test this kind of logic without starting Electron.
 *
 * @module models/nodelibrary/dynamicPortRules
 */

/** A port as the node library, `getPorts()` and `setDynamicPorts()` all speak it. */
export interface GeneratedPort {
  name: string;
  displayName?: string;
  plug?: string;
  type?: unknown;
  group?: string;
  index?: number;
  [extra: string]: unknown;
}

/**
 * The slice of a node this module reads. Structural rather than
 * `NodeGraphNode`, so nothing here imports the renderer — a `ModelProxy` and a
 * plain test double satisfy it just as well.
 */
export interface RuleNodeLike {
  type?: { dynamicports?: unknown[] };
  parameters?: Record<string, unknown>;
  getParameter(name: string, args?: unknown): unknown;
}

/** One `namedports/list` entry, after it has been recognised. */
interface NamedPortsListRule {
  name: string;
  parameter: string;
  condition?: string;
  port: GeneratedPort;
}

/** The only rule name this module answers to. Unknown names are left alone. */
export const NAMED_PORTS_LIST = 'namedports/list';

/** The placeholder a template substitutes each name into. Already this codebase's idiom. */
const PLACEHOLDER = '{{*}}';

const _condFuncCache: Record<string, (params: unknown) => unknown> = {};

/**
 * Split a `<param> <op> <value> [AND|OR …]` condition into its words.
 *
 * Exported so {@link evaluateDynamicPortsCondition} and FB-021's
 * `portGateReason.ts` read one condition the same way. They ask different
 * questions of it — *"is this true?"* and *"what would make it true?"* — and a
 * port whose row explains itself with a clause the evaluator never saw is worse
 * than no explanation at all. One tokenizer is the cheapest way to make that
 * disagreement impossible; the header above says the same thing about
 * `conditionalports/*` and `namedports/list` sharing one evaluator.
 *
 * Whitespace-separated, single quotes respected.
 */
export function tokenizeCondition(cond: string): string[] {
  return cond.match(/(?:[^\s']+|'[^']*')+/g) || [];
}

/**
 * Evaluate a `dynamicports` condition against a node's parameters.
 *
 * Moved here verbatim from `nodelibrary.ts` so `conditionalports/*` and
 * `namedports/list` cannot drift into two dialects of the same tiny language —
 * `NodeLibrary` now imports it from this module. Two forms:
 *
 *   - `#js <expression>` — evaluated with `params` bound to a proxy that reads
 *     through `getParameter`.
 *   - `<param> <op> <value> [AND|OR …]`, where `op` is `=`, `!=`, or
 *     `NOT SET`. Whitespace-separated, single quotes respected.
 */
export function evaluateDynamicPortsCondition(cond: string, node: RuleNodeLike): boolean {
  if (cond.startsWith('#js')) {
    // This is a JS expression
    if (_condFuncCache[cond] === undefined)
      // eslint-disable-next-line no-new-func
      _condFuncCache[cond] = new Function('params', 'return ' + cond.substring('#js'.length)) as (
        params: unknown
      ) => unknown;

    return !!_condFuncCache[cond](
      new Proxy(node.parameters || {}, {
        get: (_target, prop) => {
          return node.getParameter(prop as string);
        }
      })
    );
  }

  const tokens = tokenizeCondition(cond);

  function evalCond(i: number) {
    if (tokens.length < i + 3) return true;

    const paramName = tokens[i + 0].replace(/'/g, ''); // Trim any quotes
    const op = tokens[i + 1];
    const value = tokens[i + 2].replace(/'/g, '');

    let res;
    switch (op) {
      case '=':
        res = '' + node.getParameter(paramName) === value;
        break;
      case '!=':
        res = '' + node.getParameter(paramName) !== value;
        break;
      case 'NOT':
        res = node.getParameter(paramName) === undefined;
        break;
    }

    if (tokens.length > i + 3) {
      const logic = tokens[i + 3];
      switch (logic) {
        case 'AND':
          return res && evalCond(i + 4);
        case 'OR':
          return res || evalCond(i + 4);
      }
    }

    return res;
  }

  return evalCond(0);
}

/**
 * The names held by a `stringlist` parameter.
 *
 * Deliberately identical to `decodeStringList` in core-ui's `listValueCodec` —
 * ERG-003's single definition of the format — without importing it: this module
 * stays import-free (see the header), and the runtime's own `setup()` functions,
 * which must agree with this one port for port, cannot reach core-ui at all.
 * `split(',').filter(Boolean)`: no trimming (a name may legitimately contain
 * spaces, and the property panel refuses commas), and empty entries dropped so
 * an emptied list does not mint a port with a blank label.
 */
export function namesFromListParameter(value: unknown): string[] {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value !== 'string') return [];
  return value.split(',').filter(Boolean);
}

/** `{{*}}` → `name`, in every string-valued field of a port template. */
function instantiate(template: GeneratedPort, name: string): GeneratedPort {
  const port: GeneratedPort = {} as GeneratedPort;
  for (const key of Object.keys(template)) {
    const value = template[key];
    port[key] = typeof value === 'string' ? value.split(PLACEHOLDER).join(name) : value;
  }
  return port;
}

function namedPortsRules(type: RuleNodeLike['type']): NamedPortsListRule[] {
  const entries = type && type.dynamicports;
  if (!Array.isArray(entries)) return [];

  const rules: NamedPortsListRule[] = [];
  for (const entry of entries) {
    const rule = entry as Partial<NamedPortsListRule>;
    if (!rule || rule.name !== NAMED_PORTS_LIST) continue;
    if (typeof rule.parameter !== 'string' || !rule.port || typeof rule.port.name !== 'string') continue;
    rules.push(rule as NamedPortsListRule);
  }
  return rules;
}

/**
 * Does this node type generate ports from its parameter values?
 *
 * The adapter asks this of every node it hears about, so it is a cheap array
 * scan and nothing more.
 */
export function typeGeneratesNamedPorts(type: RuleNodeLike['type']): boolean {
  return namedPortsRules(type).length > 0;
}

/**
 * The ports a node's current parameter values imply.
 *
 * Order is declaration order, then list order — the same order the runtime's
 * `setup()` pushes them in, which matters because `getPorts()` assigns an index
 * by position when a port does not carry one. A name that appears twice yields
 * one port (the runtime would register the input once either way).
 */
export function generatedPortsForNode(node: RuleNodeLike): GeneratedPort[] {
  const ports: GeneratedPort[] = [];
  const taken: Record<string, boolean> = {};

  for (const rule of namedPortsRules(node.type)) {
    if (rule.condition !== undefined && !evaluateDynamicPortsCondition(rule.condition, node)) continue;

    for (const name of namesFromListParameter(node.getParameter(rule.parameter))) {
      const port = instantiate(rule.port, name);
      if (taken[port.name]) continue;
      taken[port.name] = true;

      // CWF-014 — the declared type, if the rule asked for one. `instantiate`
      // has already turned `ptype-{{*}}` into `ptype-total`, so this is a
      // lookup and nothing else. The meta field never reaches the port: a port
      // carrying an unknown key would be compared, exported and rendered with
      // it, and `portsEqual` would start reporting a difference the editor
      // cannot show.
      const typeFrom = port.typeFromParameter;
      delete port.typeFromParameter;
      if (typeof typeFrom === 'string') {
        const declared = node.getParameter(typeFrom);
        if (declared && declared !== '*') port.type = declared;
      }

      ports.push(port);
    }
  }

  return ports;
}

/** The rule name {@link derivedPortsForNode} answers to. */
export const NAMED_PORTS_DERIVED = 'namedports/derived';

/**
 * The names a `namedports/derived` rule takes, and the sentence that says so.
 *
 * Carried on the rule as data, so the runtime that writes the ports, the catalog, the editor and
 * the door all read one definition: `pattern` is a regular-expression source, `rule` the words a
 * refusal quotes.
 */
export interface DerivedNameRule {
  pattern: string;
  rule: string;
}

/** One `namedports/derived` entry, after it has been recognised. */
export interface NamedPortsDerivedRule {
  name: string;
  parameter: string;
  accept?: DerivedNameRule;
  port: GeneratedPort;
}

/**
 * P109 ISL-009 — the `namedports/derived` rules a type declares.
 *
 * The same template as `namedports/list`, delivered differently. A `list` rule's ports are pushed
 * by {@link NamedPortsAdapter} through `setDynamicPorts`, which REPLACES a node's dynamic ports: on
 * a node whose runtime also pushes ports (Page Stack, Router, Text Input) the two writers would
 * erase each other on every parameter change. A `derived` rule is read by `getPorts()` itself, from
 * the type and the node's own parameters, so it has no writer to compete with. That is what lets one
 * rule sit on every visual node.
 *
 * Takes the type's `dynamicports` array, so the editor (a node's type) and the validator (the
 * catalog's `declaredPortGroups`, which is the same array) ask the same function.
 */
export function namedPortsDerivedRules(dynamicports: unknown): NamedPortsDerivedRule[] {
  if (!Array.isArray(dynamicports)) return [];
  const rules: NamedPortsDerivedRule[] = [];
  for (const entry of dynamicports) {
    const rule = entry as Partial<NamedPortsDerivedRule>;
    if (!rule || rule.name !== NAMED_PORTS_DERIVED) continue;
    if (typeof rule.parameter !== 'string' || !rule.port || typeof rule.port.name !== 'string') continue;
    rules.push(rule as NamedPortsDerivedRule);
  }
  return rules;
}

const _acceptCache: Record<string, RegExp> = {};

/** Whether a rule takes this name. A rule with no `accept` takes every name. */
export function derivedRuleAccepts(rule: NamedPortsDerivedRule, name: string): boolean {
  if (!rule.accept || typeof rule.accept.pattern !== 'string') return true;
  const re = _acceptCache[rule.accept.pattern] || (_acceptCache[rule.accept.pattern] = new RegExp(rule.accept.pattern));
  return re.test(name);
}

/**
 * The ports a node's `namedports/derived` rules imply, from its own parameters.
 *
 * A name the rule's `accept` refuses mints no port: the runtime would not write it, and a port the
 * runtime ignores is worse than none. The validator reports those names instead
 * ({@link refusedDerivedNames}).
 */
export function derivedPortsForNode(dynamicports: unknown, parameters: Record<string, unknown> | undefined): GeneratedPort[] {
  const ports: GeneratedPort[] = [];
  const taken: Record<string, boolean> = {};
  for (const rule of namedPortsDerivedRules(dynamicports)) {
    for (const name of namesFromListParameter(parameters ? parameters[rule.parameter] : undefined)) {
      if (!derivedRuleAccepts(rule, name)) continue;
      const port = instantiate(rule.port, name);
      if (taken[port.name]) continue;
      taken[port.name] = true;
      ports.push(port);
    }
  }
  return ports;
}

/** Every name a node lists that its rule refuses, with the rule that refused it. */
export function refusedDerivedNames(
  dynamicports: unknown,
  parameters: Record<string, unknown> | undefined
): Array<{ parameter: string; name: string; rule: string }> {
  const out: Array<{ parameter: string; name: string; rule: string }> = [];
  for (const rule of namedPortsDerivedRules(dynamicports)) {
    for (const name of namesFromListParameter(parameters ? parameters[rule.parameter] : undefined)) {
      if (!derivedRuleAccepts(rule, name)) out.push({ parameter: rule.parameter, name, rule: rule.accept?.rule ?? '' }); // refused ⇒ `accept` is set
    }
  }
  return out;
}
