/**
 * EXP-022. One component's plan as one SwiftUI `View`.
 *
 * Reads the same {@link ComponentPlan} the React printer reads — `roleOf`, `childrenOf`, `bindings`, `handlers`,
 * `repeaters`, `stateVars`, `statesMachines`, `instanceLifted`, and since S2 the logic: `jsFunctions`, `pushEffects`,
 * `inputPulses`, `instancePulses`, `tickedRuns`, `hookCalls` — and prints each decision in SwiftUI's spelling. It decides
 * nothing the plan did not: a binding, an action or an effect of a kind this target does not print is a named loss in
 * `losses`, which the preflight lists, and the view draws without it.
 *
 * React's model maps one to one, which is why the plan prints here unchanged (EXP-022 §7):
 *
 * | React (the web export) | SwiftUI (this printer) |
 * |---|---|
 * | `useState` | `@State` |
 * | `useRef` | a `Ref` kept in `@State` |
 * | `useEffect(…, [deps])` | `.onChange(of: Same(deps), initial: true)` |
 * | `useMemo` (a render run) | a `Memo` kept in `@State`, read in `body` |
 * | a logic component, `use<Name>(props)` | `<Name>Logic`, a view that draws nothing, placed in `.background` |
 * | a Function's body | the body verbatim in the app's `JSContext` (`Scripts`), run through the same runner |
 *
 * @module emit/swift/view
 */

import type { NodeIR } from '../../ir/types';
import type { CatalogIndex } from '../../catalog';
import { INPUT_PULSE_TS_TYPE, type ComponentPlan, type HandlerAction, type JsFunctionPlan, type ProjectPlan, type StateVarPlan, type ValueExpr } from '../../analyze/plan';
import { computeNodeStyle } from '../style';
import { camelCase } from '../naming';
import { swiftStyle, type StackLayout } from './modifiers';
import type { Theme } from './theme';
import { functionId } from './scripts';

export interface SwiftLoss {
  component: string;
  nodeId: string;
  label?: string;
  what: string;
}

export interface SwiftViewContext {
  project: ProjectPlan;
  catalog: CatalogIndex;
  theme: Theme;
  nodesOf: (path: string) => NodeIR[];
  /** Legacy component path → the Swift struct that draws it (a View) or runs it (a logic component's `…Logic`). */
  structOf: (legacyPath: string) => string | undefined;
  /** A navigate action's `to` (the page's url path) → the `Route` case. */
  routeOf: (urlPath: string) => string | undefined;
  /** An app-wide Variable's name → its member on `Variables`. */
  variableOf: (name: string) => string | undefined;
  styles: Parameters<typeof computeNodeStyle>[3];
}

export interface PrintedView {
  struct: string;
  source: string;
  losses: SwiftLoss[];
  /** `node: prop: value` the style table does not carry (web-only looks). */
  webOnly: Array<{ component: string; nodeId: string; decl: string }>;
  usesRouter: boolean;
  /** The Functions this component runs, so the package carries their files. */
  functions: JsFunctionPlan[];
}

/** A Swift string literal. */
export function swiftString(s: string): string {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"';
}

/** A JavaScript number as a Swift `Double` literal: `2` would be an `Int` in an `Any?`, and JavaScript has no ints. */
export function swiftNumber(n: number): string {
  if (Number.isNaN(n)) return 'Double.nan';
  if (!Number.isFinite(n)) return n > 0 ? 'Double.infinity' : '-Double.infinity';
  const text = String(n);
  return /[.eE]/.test(text) ? text : `${text}.0`;
}

/** A plan literal as a Swift value. */
export function swiftLiteral(value: string | number | boolean | null | undefined): string {
  if (value === undefined) return 'nil';
  if (value === null) return 'NSNull()';
  if (typeof value === 'string') return swiftString(value);
  if (typeof value === 'number') return swiftNumber(value);
  return String(value);
}

/** A JSON value (a Static Data row) as a Swift literal, typed so the compiler need not infer a large literal's type. */
export function swiftJson(value: unknown, pad: string): string {
  if (value === null || value === undefined) return 'NSNull()';
  if (typeof value === 'string') return swiftString(value);
  if (typeof value === 'number') return swiftNumber(value);
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[] as [Any]';
    return `[\n${value.map((v) => `${pad}  ${swiftJson(v, pad + '  ')}`).join(',\n')}\n${pad}] as [Any]`;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return '[:] as [String: Any]';
  return `[${entries.map(([k, v]) => `${swiftString(k)}: ${swiftJson(v, pad)}`).join(', ')}] as [String: Any]`;
}

/** Names a View already has, so a prop or state row of that name would collide with SwiftUI's own. */
const VIEW_MEMBERS = new Set(['body', 'router', 'variables']);
const SWIFT_KEYWORDS = new Set(['default', 'switch', 'case', 'class', 'struct', 'protocol', 'extension', 'func', 'var', 'let', 'in', 'repeat', 'return', 'self', 'Self', 'init', 'operator', 'where', 'is', 'as', 'some', 'any', 'true', 'false', 'nil', 'if', 'else', 'for', 'while', 'guard', 'do', 'try', 'catch', 'throw', 'import', 'enum', 'static', 'public', 'private', 'internal', 'subscript', 'Type', 'Protocol']);

/** A plan name (a port name may hold spaces: "Show Label") as a Swift member name. */
export function ident(name: string): string {
  const base = /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : camelCase(name);
  if (VIEW_MEMBERS.has(base)) return `${base}_`;
  return SWIFT_KEYWORDS.has(base) ? `\`${base}\`` : base;
}

/** A state row's Swift type: a field's text and a counter keep their types (a binding and `+= 1` need them); the rest hold any graph value. */
function stateSwiftType(s: StateVarPlan): { type: string; initial: string } {
  const t = s.tsType.replace(/\s+/g, '');
  const boot = s.boot === null ? undefined : s.boot;
  if (s.origin === 'control' && (t === 'string' || t === 'string|undefined')) return { type: 'String', initial: swiftString(String(boot ?? '')) };
  if ((s.origin === 'control' || s.origin === 'switch') && t.startsWith('boolean')) return { type: 'Bool', initial: String(boot === true) };
  if (s.origin === 'counter' && t === 'number') return { type: 'Double', initial: swiftNumber(Number(boot ?? 0)) };
  return { type: 'Any?', initial: swiftLiteral(boot) };
}

function literalParam(node: NodeIR, name: string): string | number | boolean | undefined {
  const p = node.parameters.find((q) => q.name === name) ?? node.inheritedParameters?.find((q) => q.name === name);
  return p?.value.kind === 'literal' ? p.value.value : undefined;
}

/** EXP-011 §86. The locals a kept Function's run prints, off its wrapper's name, as the React printer names them. */
function runNamesOf(def: JsFunctionPlan): { run: string; node: string; pulse: string; held: string; memo: string; out: string } {
  const camel = def.fnName.replace(/_+([A-Za-z0-9])/g, (_m, c: string) => c.toUpperCase()).replace(/_+$/, '');
  const base = camel.charAt(0).toLowerCase() + camel.slice(1);
  return { run: `${base}Run`, node: `${base}Node`, pulse: `${base}Pulse`, held: `${base}Held`, memo: `${base}Memo`, out: `${base}Out` };
}

export function structNameOf(plan: ComponentPlan): string {
  return plan.hook ? `${plan.file!.symbol.replace(/^use(?=[A-Z])/, "")}Logic` : `${plan.file!.symbol}View`;
}

/** Where a chain is printed: the pulses and the runs whose locals are in scope, and the row a row callback closes over. */
interface Scope {
  pulses: Map<string, string>;
  runs: Set<string>;
  row?: { repeaterId: string; local: string };
}
/** Render mode: what `body` reads. */
const TOP: Scope = { pulses: new Map(), runs: new Set() };
/** Handler mode: a press, a callback or an effect's chain (a kept Function reads as its wires delivered it). */
const chain = (): Scope => ({ pulses: new Map(), runs: new Set() });

/** Plan fields this target does not print yet: a non-empty one is a named loss, never a silent drop. */
const UNPRINTED: Array<[keyof ComponentPlan, string]> = [
  ['branchEffects', 'a reactive Condition'],
  ['recordEffects', 'a Record bound by its Id'],
  ['variableSeeds', 'a Variable seeded on mount'],
  ['objectSeeds', 'an Object seeded on mount'],
  ['fieldMounts', 'a field announcing its Value as it mounts'],
  ['receivers', 'an Event Receiver'],
  ['queries', 'a record query (S3, the backend)'],
  ['animations', 'an Animate To Value'],
  ['scripts', 'a Script node'],
  ['streams', 'a streaming node'],
  ['popups', 'a popup slot'],
  ['drags', 'a Drag'],
  ['pageStacks', 'a Component Stack'],
  ['runTasks', 'a Run Tasks'],
  ['appErrors', 'an On App Error boundary'],
  ['screenResolutions', 'a Screen Resolution'],
  ['repeaterItems', "a Repeater Item's Added chain"],
  ['styleSheets', 'a CSS Definition']
];

export function printView(plan: ComponentPlan, ctx: SwiftViewContext): PrintedView {
  const struct = structNameOf(plan);
  const nodes = ctx.nodesOf(plan.path);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const losses: SwiftLoss[] = [];
  const webOnly: PrintedView['webOnly'] = [];
  let usesRouter = false;
  let usesVariables = false;
  const lose = (nodeId: string, what: string) => {
    losses.push({ component: plan.path, nodeId, label: nodeById.get(nodeId)?.authoredLabel, what });
  };

  const stateByName = new Map(plan.stateVars.map((s) => [s.name, s]));
  const stateBySetter = new Map(plan.stateVars.map((s) => [s.setterName, s]));
  const machineByNode = new Map(plan.statesMachines.map((m) => [m.nodeId, m]));
  const fnByNode = plan.jsFunctions;
  const tickedRunIds = new Set(plan.tickedRuns.map((t) => t.nodeId));
  /** A Function that keeps a node: one run per trigger, its values and its `this` kept across runs (EXP-019, §86). */
  const keptNode = (id: string): boolean => {
    const def = fnByNode[id];
    return def !== undefined && def.kind === 'function' && (def.pulsed === true || (def.host?.length ?? 0) > 0);
  };
  /**
   * P18-S128-FIELDSET. The fields a chain focuses, blurs or writes (a Set is not written into a focused field), and those
   * with a Blur chain: they take part in the view's one `@FocusState`.
   */
  const focusIds = new Set<string>();
  {
    const visit = (value: unknown): void => {
      if (value === null || typeof value !== 'object') return;
      if (Array.isArray(value)) return value.forEach(visit);
      const v = value as { kind?: unknown; inputId?: unknown; field?: { inputId?: unknown } };
      if (v.kind === 'field-focus' && typeof v.inputId === 'string') focusIds.add(v.inputId);
      if (v.kind === 'state-set' && typeof v.field?.inputId === 'string') focusIds.add(v.field.inputId);
      Object.values(value).forEach(visit);
    };
    visit([plan.handlers, plan.inputPulses, plan.tickedRuns, plan.valueChangedEffects, plan.statesMachines, plan.branchEffects]);
    for (const [id, ports] of Object.entries(plan.handlers)) if (ports.onBlur && plan.roleOf[id] === 'input') focusIds.add(id);
  }
  const usedFunctions = new Map<string, JsFunctionPlan>();
  const useFunction = (def: JsFunctionPlan) => usedFunctions.set(def.nodeId, def);
  /** Render runs read in `body`: one memoised local each, printed above the tree. */
  const renderLocals = new Map<string, string>();

  // ---- values ---------------------------------------------------------------------------------------------------

  /** A Function's argument record, as a Swift dictionary literal. */
  const jsArgs = (def: JsFunctionPlan, scope: Scope): string | undefined => {
    const entries: string[] = [];
    for (const input of def.inputs) {
      if (input.expr === undefined) continue;
      const v = expr(input.expr, scope);
      if (v === undefined) return undefined;
      entries.push(`${swiftString(input.name)}: ${v}`);
    }
    return entries.length ? `[${entries.join(', ')}]` : '[:]';
  };

  const fold = (code: string, how: 'string' | 'number' | 'boolean' | undefined): string =>
    how === 'string' ? `JS.string(JS.nullish(${code}, ""))` : how === 'number' ? `JS.numberFold(${code})` : how === 'boolean' ? `JS.truthy(${code})` : code;

  /** A plan expression as Swift; undefined where this target does not print it (the caller names the loss). */
  const expr = (e: ValueExpr, scope: Scope): string | undefined => {
    switch (e.kind) {
      case 'prop':
        return ident(e.name);
      case 'literal':
        return swiftLiteral(e.value);
      case 'undefined':
        return 'nil';
      case 'state-get':
        if (stateByName.has(e.name)) return ident(e.name);
        if (plan.statesMachines.some((m) => m.local === e.name)) return ident(e.name);
        return undefined;
      case 'states-out': {
        const m = machineByNode.get(e.nodeId);
        if (!m) return undefined;
        if (e.field === 'state') return ident(m.local);
        if (e.field === 'at') return `(${ident(m.local)} == ${swiftString(e.name ?? '')})`;
        if (e.field === 'value') return `Self.${m.constName}[${ident(m.local)}]?[${swiftString(e.name ?? '')}]`;
        return undefined;
      }
      case 'not': {
        const inner = expr(e.operand, scope);
        return inner === undefined ? undefined : `!JS.truthy(${inner})`;
      }
      case 'truthy': {
        const inner = expr(e.operand, scope);
        return inner === undefined ? undefined : `JS.truthy(${inner})`;
      }
      case 'logical': {
        const parts = e.operands.map((o) => expr(o, scope));
        if (parts.some((p) => p === undefined)) return undefined;
        return `(${parts.map((p) => `JS.truthy(${p})`).join(e.op === 'and' ? ' && ' : ' || ')})`;
      }
      case 'format': {
        let text = '';
        for (const part of e.parts) {
          if (typeof part === 'string') {
            text += swiftString(part).slice(1, -1);
            continue;
          }
          const v = expr(part, scope);
          if (v === undefined) return undefined;
          text += `\\(JS.show(${v}))`;
        }
        return `"${text}"`;
      }
      case 'store-get': {
        const member = ctx.variableOf(e.variableName);
        if (member === undefined) return undefined;
        usesVariables = true;
        return `variables.${member}`;
      }
      case 'static-rows':
        return plan.staticData.some((d) => d.constName === e.constName) ? `Self.${e.constName}` : undefined;
      case 'row-relay':
        return scope.row?.repeaterId === e.repeaterId ? `JS.field(${scope.row.local}, ${swiftString(e.input)})` : 'nil';
      case 'jsfun-out': {
        const def = fnByNode[e.nodeId];
        if (!def || def.kind !== 'function') return undefined;
        useFunction(def);
        const names = runNamesOf(def);
        const pulse = scope.pulses.get(e.nodeId);
        if (pulse !== undefined) return fold(`JS.field(${pulse}.values, ${swiftString(e.output)})`, e.fold);
        if (scope.runs.has(e.nodeId)) return fold(`JS.field(${names.run}.outputs, ${swiftString(e.output)})`, e.fold);
        if (e.viaState !== undefined) {
          // In a chain, a kept node's values as its wires delivered them (current within the press that ran it).
          if (scope !== TOP && keptNode(e.nodeId)) return fold(`JS.field(${names.node}.delivered, ${swiftString(e.output)})`, e.fold);
          return fold(`JS.field(${ident(e.viaState)}, ${swiftString(e.output)})`, e.fold);
        }
        const args = jsArgs(def, scope);
        if (args === undefined) return undefined;
        const call = `Scripts.shared.call(${swiftString(functionId(plan, def))}, ${args}${def.signals.length ? `, signals: [${def.signals.map(swiftString).join(', ')}]` : ''})`;
        if (scope === TOP) {
          // A render run: computed again only when its inputs change (P18-S138-LIFTLOOP's rule, kept for every one).
          if (!renderLocals.has(e.nodeId)) {
            const deps = def.inputs.filter((i) => i.expr !== undefined).map((i) => expr(i.expr!, scope)!);
            renderLocals.set(e.nodeId, `${names.memo}.value(Same(${deps.join(', ')})) { ${call} }`);
          }
          return fold(`JS.field(${names.out}, ${swiftString(e.output)})`, e.fold);
        }
        return fold(`JS.field(${call}, ${swiftString(e.output)})`, e.fold);
      }
      default:
        return undefined;
    }
  };

  /** A binding source as Swift, or the loss. */
  const binding = (nodeId: string, port: string, b: any, scope: Scope = TOP): string | undefined => {
    if (b.kind === 'prop') return ident(b.name);
    if (b.kind === 'computed') {
      const s = expr(b.expr, scope);
      if (s === undefined) lose(nodeId, `its ${port} is computed from a ${b.expr?.kind} expression, which the Swift target does not print yet`);
      return s;
    }
    if (b.kind === 'store') {
      const member = ctx.variableOf(b.variableName);
      if (member !== undefined) {
        usesVariables = true;
        return `variables.${member}`;
      }
    }
    lose(nodeId, `its ${port} reads a ${b.kind}${b.variableName ? ` (${b.variableName}${b.untyped ? ', untyped' : ''})` : ''}, which the Swift target does not carry yet`);
    return undefined;
  };

  // ---- actions --------------------------------------------------------------------------------------------------

  /** The React printer's `expandActions`: chains that are following statements, flattened. */
  const expand = (list: HandlerAction[]): HandlerAction[] =>
    list.flatMap((a): HandlerAction[] => {
      if (a.kind === 'store-set' && a.then !== undefined) return [{ ...a, then: undefined }, ...expand(a.then)];
      if (a.kind === 'jsfun-run') {
        if (a.awaitsAt !== undefined) return [a];
        const own = a.materialize !== undefined || keptNode(a.nodeId) || (a.ticked !== true && tickedRunIds.has(a.nodeId));
        return own ? [{ ...a, then: [] }, ...expand(a.then)] : expand(a.then);
      }
      if (a.kind === 'branch' && a.flat === true) return expand(a.whenTrue);
      return [a];
    });

  /** A chain as Swift statements, at `pad`. `nodeId` names the node a loss is reported against. */
  const statements = (nodeId: string, list: HandlerAction[], pad: string, scope: Scope): string[] => {
    const out: string[] = [];
    let inScope = scope;
    for (const a of expand(list)) {
      const printed = statement(nodeId, a, pad, inScope);
      out.push(...printed.lines);
      inScope = printed.scope;
    }
    return out;
  };

  const statement = (nodeId: string, a: HandlerAction, pad: string, scope: Scope): { lines: string[]; scope: Scope } => {
    const one = (line: string) => ({ lines: [`${pad}${line}`], scope });
    const lost = (what: string) => {
      lose(nodeId, what);
      return one(`// Not carried yet: ${what} (see the preflight).`);
    };
    switch (a.kind) {
      case 'navigate': {
        const route = a.pathParams.length === 0 && a.query.length === 0 && !a.newTab ? ctx.routeOf(a.to) : undefined;
        if (route === undefined) return lost(`a navigate to ${a.to} with parameters or a new tab`);
        usesRouter = true;
        return one(`router.go(.${route})`);
      }
      case 'output-signal':
        return one(`${ident(a.prop)}()`);
      case 'store-set': {
        const member = ctx.variableOf(a.variableName);
        const v = expr(a.expr, scope);
        if (member === undefined || v === undefined) return lost(`a store-set of ${a.variableName}`);
        usesVariables = true;
        return one(`variables.${member} = ${a.fallback !== undefined ? `JS.nullish(${v}, ${swiftLiteral(a.fallback)})` : v}`);
      }
      case 'state-set': {
        const row = stateByName.get(a.name);
        if (!row) return lost(`a state-set of ${a.name}, a row the plan does not keep`);
        const name = ident(a.name);
        if (a.field !== undefined) {
          const chained = [...(plan.changeHandlers[a.field.inputId] ?? []), ...((plan.handlers[a.field.inputId] ?? {}).onChange ?? [])];
          if (chained.length) lose(a.field.inputId, `a ${a.field.port === 'set' ? 'Set' : 'Clear'} on the field runs its change chain, which is not carried yet`);
          if (a.field.port === 'clear') return one(`${name} = ""`);
          const v = a.expr === undefined ? 'nil' : expr(a.expr, scope);
          if (v === undefined) return lost(`a Set on ${a.field.inputId} from a ${a.expr?.kind} expression`);
          // A Set is not written into the focused field (the runtime's `setText` tests `hasFocus()`).
          return one(`if focusedField != ${swiftString(a.field.inputId)} { ${name} = JS.fieldText(${v}, start: ${swiftString(a.field.start ?? '')}) }`);
        }
        const type = stateSwiftType(row).type;
        if (a.op === 'toggle') return one(type === 'Bool' ? `${name}.toggle()` : `${name} = !JS.truthy(${name})`);
        if (a.op === 'inc') return one(type === 'Double' ? `${name} += 1` : `${name} = JS.number(${name}) + 1`);
        if (a.op === 'dec') return one(type === 'Double' ? `${name} -= 1` : `${name} = JS.number(${name}) - 1`);
        const v = expr(a.expr!, scope);
        if (v === undefined) return lost(`a state-set of ${a.name} from a ${a.expr?.kind} expression`);
        if (type === 'String') return one(`${name} = JS.show(${v})`);
        if (type === 'Bool') return one(`${name} = JS.truthy(${v})`);
        if (type === 'Double') return one(`${name} = JS.number(${v})`);
        return one(`${name} = ${v}`);
      }
      case 'states-go': {
        const m = machineByNode.get(a.nodeId);
        if (!m) return lost('a States move on a States node the plan does not keep');
        return one(a.verb === 'toggle' ? `${ident(m.local)}Toggle()` : `${ident(m.local)}Go(${swiftString(a.state ?? '')}, invoked: true)`);
      }
      case 'jsfun-run': {
        const def = fnByNode[a.nodeId];
        if (!def || def.kind !== 'function') return lost(`a run of a ${def?.kind ?? 'missing'} node`);
        if (a.awaitsAt !== undefined || def.awaits) return lost(`a run of ${def.fnName}, whose body awaits`);
        if (def.noodl !== undefined) lose(a.nodeId, `${def.fnName} reads Noodl (${[...def.noodl.members, ...def.noodl.variables].join(', ')}); the Noodl API reaches the JavaScriptCore host in S3`);
        useFunction(def);
        const names = runNamesOf(def);
        const args = jsArgs(def, scope);
        if (args === undefined) return lost(`a run of ${def.fnName} whose inputs read a value this target does not print`);
        const lines: string[] = [];
        // A Run records what it read on the ticked inputs, so the arrival effect does not run it again for them.
        if (a.ticked !== true && tickedRunIds.has(a.nodeId)) {
          const ticked = plan.tickedRuns.find((t) => t.nodeId === a.nodeId)!;
          const watch = ticked.watch.map((w) => expr(w, scope) ?? 'nil');
          lines.push(`${pad}_ = JS.tickedArrival(${names.held}, [${watch.join(', ')}])`);
        }
        const id = swiftString(functionId(plan, def));
        if (keptNode(a.nodeId)) {
          lines.push(`${pad}let ${names.run} = ${names.node}.run(${id}, ${args})`);
          if (a.materialize !== undefined) lines.push(`${pad}${ident(a.materialize)} = ${names.run}.outputs`);
          const runs = new Set(scope.runs);
          runs.add(a.nodeId);
          return { lines, scope: { ...scope, runs } };
        }
        if (a.materialize !== undefined) {
          lines.push(`${pad}${ident(a.materialize)} = Scripts.shared.call(${id}, ${args}${def.signals.length ? `, signals: [${def.signals.map(swiftString).join(', ')}]` : ''})`);
        }
        return { lines, scope };
      }
      case 'jsfun-pulses': {
        const def = fnByNode[a.nodeId]!;
        const names = runNamesOf(def);
        if (!scope.runs.has(a.nodeId)) return lost(`the pulses of ${def.fnName}, outside its run`);
        const arms = a.then.filter((x): x is Extract<HandlerAction, { kind: 'jsfun-pulse' }> => x.kind === 'jsfun-pulse');
        const pulses = new Map(scope.pulses);
        pulses.set(a.nodeId, names.pulse);
        const inner: Scope = { ...scope, pulses };
        const lines = [`${pad}for ${names.pulse} in ${names.run}.pulses {`];
        arms.forEach((arm, i) => {
          lines.push(`${pad}  ${i === 0 ? '' : '} else '}if ${names.pulse}.signal == ${swiftString(arm.signal)} {`);
          const body = statements(nodeId, arm.then, pad + '    ', inner);
          lines.push(...(body.length ? body : [`${pad}    // Nothing is wired to "${arm.signal}".`]));
        });
        if (arms.length) lines.push(`${pad}  }`);
        lines.push(`${pad}}`);
        return { lines, scope };
      }
      case 'jsfun-pulse':
        return { lines: statements(nodeId, a.then, pad, scope), scope };
      case 'field-focus':
        return one(a.focus ? `focusedField = ${swiftString(a.inputId)}` : `if focusedField == ${swiftString(a.inputId)} { focusedField = nil }`);
      case 'branch': {
        const cond = expr(a.cond, scope);
        if (cond === undefined) return lost(`a Condition on a ${a.cond.kind} expression`);
        const yes = statements(nodeId, a.whenTrue, pad + '  ', scope);
        const no = statements(nodeId, a.whenFalse, pad + '  ', scope);
        if (yes.length === 0) return { lines: [`${pad}if !JS.truthy(${cond}) {`, ...no, `${pad}}`], scope };
        return { lines: [`${pad}if JS.truthy(${cond}) {`, ...yes, ...(no.length ? [`${pad}} else {`, ...no] : []), `${pad}}`], scope };
      }
      default:
        return lost(`a ${a.kind} action`);
    }
  };

  /** A callback's body: a closure of the chain, on one line where it is one statement. */
  const closure = (nodeId: string, list: HandlerAction[], pad: string, scope: Scope = chain(), param = ''): string => {
    const body = statements(nodeId, list, pad + '  ', scope);
    if (body.length === 0) return `{${param ? ` ${param} in` : ''} }`;
    if (body.length === 1 && !body[0].trimStart().startsWith('//')) return `{ ${param ? `${param} in ` : ''}${body[0].trim()} }`;
    return [`{${param ? ` ${param} in` : ''}`, ...body, `${pad}}`].join('\n');
  };

  // ---- placements -----------------------------------------------------------------------------------------------

  /** The arguments a placement passes, drawn or logic: its inputs, its pulses, its signal outputs' chains, its lifts. */
  const placementArgs = (node: NodeIR, target: ComponentPlan, pad: string): string[] => {
    const args: Array<{ name: string; code: string }> = [];
    const bound = plan.bindings[node.id] ?? {};
    const propNames = new Set(target.props.map((p) => p.name));
    for (const p of target.props) {
      if (p.tsType.replace(/\s+/g, '') === INPUT_PULSE_TS_TYPE.replace(/\s+/g, '')) {
        const pulse = plan.instancePulses.find((x) => x.nodeId === node.id && x.port === p.name);
        if (pulse) args.push({ name: ident(p.name), code: `Pulse(sent: ${ident(pulse.delivered?.name ?? pulse.stateName)}, taken: ${ident(pulse.takenLocal)})` });
        continue;
      }
      const b = bound[p.name];
      if (b) {
        const v = binding(node.id, p.name, b);
        if (v !== undefined) args.push({ name: ident(p.name), code: v });
        continue;
      }
      const lit = literalParam(node, p.name);
      if (lit !== undefined) args.push({ name: ident(p.name), code: swiftLiteral(lit) });
    }
    for (const port of Object.keys(bound)) if (!propNames.has(port)) lose(node.id, `its ${port} is bound, but ${node.type} has no such input`);
    const outputs = new Map(target.outputProps.map((o) => [o.port, o.prop]));
    for (const [port, list] of Object.entries(plan.handlers[node.id] ?? {})) {
      const prop = outputs.get(port);
      if (!prop) {
        lose(node.id, `its ${port} handler names no output of ${node.type}`);
        continue;
      }
      args.push({ name: ident(prop), code: closure(node.id, list, pad) });
    }
    // A lifted output with more than one place to land is one callback that writes each (React's `combinedLifted`).
    const lifts = new Map<string, string[]>();
    for (const lift of plan.instanceLifted[node.id] ?? []) {
      const row = lift.forward ? undefined : stateBySetter.get(lift.setterName);
      if (!lift.forward && !row) {
        lose(node.id, `its ${lift.prop} lifts into ${lift.setterName}, a row the plan does not keep`);
        continue;
      }
      const writes = lifts.get(lift.prop) ?? [];
      writes.push(lift.forward ? `${ident(lift.setterName)}(value)` : `${ident(row!.name)} = value`);
      lifts.set(lift.prop, writes);
    }
    for (const [prop, writes] of lifts) {
      const forward = /^(\S+)\(value\)$/.exec(writes[0]);
      const code =
        writes.length === 1 && forward ? forward[1] : writes.length === 1 ? `{ ${writes[0].replace(/ = value$/, ' = $0')} }` : `{ value in ${writes.join('; ')} }`;
      args.push({ name: ident(prop), code });
    }
    if (target.childSlot) lose(node.id, `${node.type} takes placed children (a Component Children slot), which the Swift target does not pass yet`);
    // A memberwise init takes its arguments in declaration order: props, then output callbacks, then lifted ones.
    const order = [...target.props.map((p) => p.name), ...target.outputProps.map((o) => o.prop), ...target.liftedOutputProps.map((o) => o.prop)].map(ident);
    args.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
    return args.map((a) => `${a.name}: ${a.code}`);
  };

  // ---- the tree -------------------------------------------------------------------------------------------------

  const styleCache = new Map<string, { style: ReturnType<typeof swiftStyle>; decls: Array<{ prop: string; value: string }> }>();
  const styleOf = (id: string, role: string): ReturnType<typeof swiftStyle> => {
    const cached = styleCache.get(id);
    if (cached) return cached.style;
    const node = nodeById.get(id)!;
    const styleRole = role as Parameters<typeof computeNodeStyle>[1];
    const computed = computeNodeStyle(node, styleRole, ctx.catalog, ctx.styles);
    let decls = computed.decls;
    // The page collapse (the React printer's own rule, component.ts): the merged Group's style is the page's.
    if (id === plan.rootId && plan.collapsedGroupId) {
      const group = nodeById.get(plan.collapsedGroupId)!;
      const groupDecls = computeNodeStyle(group, 'group', ctx.catalog, ctx.styles).decls;
      const own = new Set(groupDecls.map((d) => d.prop));
      decls = [...groupDecls, ...decls.filter((d) => !own.has(d.prop))];
    }
    const s = swiftStyle(decls, role, ctx.theme);
    for (const u of s.unmapped) webOnly.push({ component: plan.path, nodeId: id, decl: u });
    for (const name of computed.unhandled) {
      if (name === 'visible' || name === 'mounted') continue;
      const v = literalParam(node, name);
      webOnly.push({ component: plan.path, nodeId: id, decl: `${name}${v !== undefined ? `: ${v}` : ''}` });
    }
    styleCache.set(id, { style: s, decls });
    return s;
  };

  const mods = (lines: string[], modifiers: string[], pad: string): string[] => [...lines, ...modifiers.map((m) => `${pad}  ${m}`)];
  /** Each drawn Text, Button, placement and For Each, numbered in the order the page draws them (the probe's path). */
  let ordinal = 0;
  /** Press handlers, printed as methods so the Button and its probe share one. */
  const pressMethods: string[] = [];
  const pressName = (id: string, port: string): string => `${camelCase(id).replace(/^[A-Z]/, (c) => c.toLowerCase())}${port === 'onClick' ? 'Pressed' : camelCase(port)}`;

  const otherHandlers = (id: string, pad: string, known: string[]): string[] => {
    const out: string[] = [];
    for (const [port, list] of Object.entries(plan.handlers[id] ?? {})) {
      if (known.includes(port)) continue;
      if (port === 'didMount') out.push(`.onAppear ${closure(id, list, pad + '  ')}`);
      else if (port === 'onEnter') out.push(`.onSubmit ${closure(id, list, pad + '  ')}`);
      else if (port === 'onBlur' && focusIds.has(id)) {
        const body = statements(id, list, pad + '    ', chain());
        out.push([`.onChange(of: focusedField) { was, _ in`, `${pad}    guard was == ${swiftString(id)}, focusedField != ${swiftString(id)} else { return }`, ...body, `${pad}  }`].join('\n'));
      }
      else lose(id, `its ${port} handler is not carried yet`);
    }
    return out;
  };

  /** One node and its subtree. `parent` is the stack it sits in, for `align-items: stretch`. */
  const print = (id: string, pad: string, parent?: StackLayout): string[] => {
    const role = plan.roleOf[id];
    const node = nodeById.get(id);
    if (!node || role === undefined) return [];
    const bound = plan.bindings[id] ?? {};
    let out: string[];

    if (role === 'page' || role === 'group') {
      const s = styleOf(id, role);
      const st = s.stack!;
      const head = st.wrap
        ? `WrapStack(spacing: ${st.axis === 'row' ? st.spacing : st.crossSpacing}, lineSpacing: ${st.axis === 'row' ? st.crossSpacing : st.spacing}) {`
        : st.axis === 'row'
          ? `HStack(alignment: ${st.alignment}, spacing: ${st.spacing}) {`
          : `VStack(alignment: ${st.alignment}, spacing: ${st.spacing}) {`;
      out = [`${pad}${head}`];
      for (const child of plan.childrenOf[id] ?? []) out.push(...print(child, pad + '  ', st));
      out.push(`${pad}}`);
      const press = plan.handlers[id]?.onClick;
      const modifiers = [...s.modifiers];
      if (press) {
        modifiers.push('.contentShape(Rectangle())');
        modifiers.push(`.onTapGesture ${closure(id, press, pad + '  ')}`);
      }
      modifiers.push(...otherHandlers(id, pad, ['onClick']));
      out = mods(out, modifiers, pad);
    } else if (role === 'text') {
      const s = styleOf(id, role);
      const text = bound.text ? binding(id, 'text', bound.text) : undefined;
      const literal = String(literalParam(node, 'text') ?? '');
      const value = text !== undefined ? `JS.show(${text})` : swiftString(literal);
      out = [`${pad}Text(verbatim: ${value})`];
      let content = s.content;
      if (bound.color) {
        const c = binding(id, 'color', bound.color);
        // Replaces the static color: SwiftUI's innermost foregroundStyle wins, CSS's later declaration does.
        if (c !== undefined) content = content.map((m) => (m === s.colorModifier ? `.foregroundStyle(Theme.color(JS.show(${c})) ?? Color.primary)` : m));
        if (c !== undefined && !s.colorModifier) content = [...content, `.foregroundStyle(Theme.color(JS.show(${c})) ?? Color.primary)`];
      }
      // An empty block draws no line in CSS but keeps its gap; Text("") draws a line. Zero height keeps the gap only.
      const canBeEmpty = text !== undefined || literal === '';
      out = mods(out, [...content, ...(canBeEmpty ? [`.collapsedWhenEmpty(${value})`] : []), ...s.box, `.node(${ordinal++}, ${swiftString(id)}, text: ${value})`], pad);
    } else if (role === 'button') {
      const s = styleOf(id, role);
      const label = bound.label ? binding(id, 'label', bound.label) : undefined;
      const labelCode = label !== undefined ? `JS.show(${label})` : swiftString(String(literalParam(node, 'label') ?? ''));
      const press = plan.handlers[id]?.onClick;
      let action = '{}';
      if (press) {
        const method = pressName(id, 'onClick');
        const body = statements(id, press, '    ', chain());
        pressMethods.push(`  func ${method}() {`, ...(body.length ? body : ['    // Nothing the press runs is carried yet.']), '  }');
        action = method;
      }
      out = [
        `${pad}Button(action: ${action}) {`,
        `${pad}  Text(verbatim: ${labelCode})`,
        ...s.modifiers.map((m) => `${pad}    ${m}`),
        `${pad}}`,
        `${pad}.buttonStyle(.plain)`,
        ...(press ? [] : [`${pad}// Nothing is wired to this press.`]),
        ...otherHandlers(id, pad, ['onClick']).map((m) => `${pad}${m}`),
        `${pad}.node(${ordinal++}, ${swiftString(id)}, label: ${labelCode}, press: ${action})`
      ];
    } else if (role === 'input') {
      const s = styleOf(id, role);
      const state = plan.stateVars.find((v) => v.originNodeId === id && v.origin === 'control');
      const placeholder = String(literalParam(node, 'placeholder') ?? '');
      const multiline = literalParam(node, 'type') === 'textArea';
      if (!state) lose(id, 'its text has no state row in the plan, so the field is drawn read-only');
      const textBinding = state ? `$${ident(state.name)}` : '.constant("")';
      out = [`${pad}TextField(${swiftString(placeholder)}, text: ${textBinding}${multiline ? ', axis: .vertical' : ''})`];
      const focus = focusIds.has(id) ? [`.focused($focusedField, equals: ${swiftString(id)})`] : [];
      out = mods(out, [...(multiline ? ['.lineLimit(nil)'] : []), '.textFieldStyle(.plain)', ...s.modifiers, ...focus, ...otherHandlers(id, pad, [])], pad);
      for (const _ of plan.changeHandlers[id] ?? []) {
        lose(id, 'its onChange chain is not carried yet');
        break;
      }
    } else if (role === 'instance') {
      const target = ctx.project.byLegacyPath.get(node.type);
      const targetStruct = ctx.structOf(node.type);
      if (!target || !targetStruct || target.hook) {
        lose(id, `${node.type} draws nothing in the plan (${target?.skipReason ?? 'no plan'})`);
        return [];
      }
      const args = placementArgs(node, target, pad);
      out = [`${pad}${targetStruct}(${args.join(', ')})`, `${pad}  .node(${ordinal++})`];
    } else if (role === 'repeater') {
      const r = plan.repeaters[id];
      const templateStruct = r?.templatePath ? ctx.structOf(r.templatePath) : undefined;
      const template = r?.templatePath ? ctx.project.byLegacyPath.get(r.templatePath) : undefined;
      const items = r?.itemsExpr ? expr(r.itemsExpr, TOP) : undefined;
      if (!r || !templateStruct || !template || items === undefined || r.mapping !== 'template-inputs') {
        const why = !r
          ? 'the plan keeps no repeater'
          : !r.itemsExpr
            ? 'the plan feeds it no items, so the React export does not draw its rows either'
            : items === undefined
              ? `its items are a ${r.itemsExpr.kind} expression, which the Swift target does not read yet`
              : `mapping ${r.mapping} is not printed yet`;
        lose(id, `the For Each's rows are not drawn: ${why}`);
        return [`${pad}// For Each ${id}: not drawn in this slice (see the preflight).`];
      }
      const scope: Scope = { ...chain(), row: { repeaterId: id, local: 'row' } };
      const args = template.props.map((p) => `${ident(p.name)}: JS.field(row, ${swiftString(p.name)})`);
      // A row's signal: the row's relayed values first, then the chain, as `itemOutputSignalTriggered` does.
      const outputs = new Map(template.outputProps.map((o) => [o.port, o.prop]));
      for (const [port, list] of Object.entries(plan.handlers[id] ?? {})) {
        const signal = port.startsWith('itemOutputSignal-') ? port.slice('itemOutputSignal-'.length) : undefined;
        const prop = signal !== undefined ? outputs.get(signal) : undefined;
        if (!prop) {
          lose(id, `its ${port} handler names no output of ${r.templatePath}`);
          continue;
        }
        const relays = plan.rowRelays.filter((x) => x.repeaterId === id).map((x) => `${pad}    ${ident(x.stateName)} = JS.field(row, ${swiftString(x.input)})`);
        const chain = statements(id, list, pad + '    ', scope);
        args.push(`${ident(prop)}: {\n${[...relays, ...chain].join('\n')}\n${pad}  }`);
      }
      const order = [...template.props.map((p) => p.name), ...template.outputProps.map((o) => o.prop)].map(ident);
      args.sort((a, b) => order.indexOf(a.slice(0, a.indexOf(':'))) - order.indexOf(b.slice(0, b.indexOf(':'))));
      out = [
        `${pad}ForEach(Array(JS.rows(${items}).enumerated()), id: \\.offset) { index, row in`,
        `${pad}  ${templateStruct}(${args.join(', ')})`,
        `${pad}    .node(${ordinal}, row: index)`,
        `${pad}}`
      ];
      ordinal++;
    } else {
      lose(id, `a ${role} node is not drawn by the Swift target yet`);
      return [];
    }

    if (parent?.stretch && parent.axis === 'column' && role !== 'repeater') out.push(`${pad}  .frame(maxWidth: .infinity, alignment: .leading)`);
    // A multi-line argument (a callback's chain) is lines too, so an enclosing block indents all of it.
    out = out.flatMap((l) => l.split('\n'));
    if (bound.mounted) {
      const m = binding(id, 'mounted', bound.mounted);
      if (m !== undefined) out = [`${pad}if JS.truthy(${m}) {`, ...out.map((l) => '  ' + l), `${pad}}`];
    }
    return out;
  };

  // ---- effects --------------------------------------------------------------------------------------------------

  /** `.onChange` modifiers, in the order React runs the component's effects. Lines at four spaces. */
  const effectsBefore: string[] = [];
  const effects: string[] = [];
  for (const pulse of plan.instancePulses) {
    if (pulse.delivered === undefined) continue;
    // "take" is handed on one update after it is sent: the values lifted with it arrive first, as the running app delivers them.
    effectsBefore.push(`.onChange(of: ${ident(pulse.stateName)}) { _, sent in ${ident(pulse.delivered.name)} = sent }`);
  }
  // Graph-path syncs (CONTROLLED-STATE §3.4): a wired value into a field or a Variable, with the input setter's coercion;
  // undefined abstains, and Changed never fires.
  for (const sync of plan.syncEffects) {
    const v = expr(sync.source, TOP);
    const row = stateByName.get(sync.stateName);
    if (v === undefined || !row) {
      lose(plan.rootId ?? '', `the sync into ${sync.stateName} reads a ${sync.source.kind} expression, which the Swift target does not print yet`);
      continue;
    }
    const name = ident(sync.stateName);
    const type = stateSwiftType(row).type;
    const set = (code: string) => (type === 'String' ? `JS.show(${code})` : type === 'Bool' ? `JS.truthy(${code})` : type === 'Double' ? `JS.number(${code})` : code);
    const empty = swiftLiteral(sync.empty === undefined ? null : sync.empty);
    const body =
      sync.coerce === 'textinput'
        ? `guard let arrival = value.value else { return }; ${name} = arrival is NSNull ? "" : JS.string(arrival)`
        : sync.coerce === 'checkbox'
          ? `${name} = JS.truthy(value.value)`
          : sync.coerce === 'variable-string'
            ? `guard let arrival = value.value else { return }; ${name} = ${set(`arrival is NSNull ? ${empty} : JS.string(arrival)`)}`
            : sync.coerce === 'variable-boolean'
              ? `guard let arrival = value.value else { return }; ${name} = ${set(`arrival is NSNull ? ${empty} : JS.truthy(arrival)`)}`
              : sync.coerce === 'variable-number'
                ? `guard let arrival = value.value else { return }; ${name} = ${set(`arrival is NSNull || JS.number(arrival).isNaN ? ${empty} : JS.number(arrival)`)}`
                : sync.coerce === 'variable-none'
                  ? `guard let arrival = value.value else { return }; ${name} = ${set(`arrival is NSNull ? ${empty} : arrival`)}`
                  : undefined;
    if (body === undefined) {
      lose(plan.rootId ?? '', `the ${sync.coerce} sync into ${sync.stateName} is not printed yet`);
      continue;
    }
    effects.push(`.onChange(of: Same(${v}), initial: true) { _, value in ${body} }`);
  }
  for (const push of plan.pushEffects) {
    const v = expr(push.expr, TOP);
    if (v === undefined) {
      lose(plan.rootId ?? '', `its output ${push.prop} is pushed from a ${push.expr.kind} expression, which the Swift target does not print yet`);
      continue;
    }
    effects.push(`.onChange(of: Same(${v}), initial: true) { _, value in ${ident(push.prop)}(value.value) }`);
  }
  for (const effect of plan.valueChangedEffects) {
    const v = expr(effect.watch, TOP);
    if (v === undefined) {
      lose(effect.nodeId, `a Value Changed on a ${effect.watch.kind} expression`);
      continue;
    }
    effects.push(
      [
        `.onChange(of: Same(${v}), initial: true) { _, arrival in`,
        `      if JS.same(${ident(effect.lastLocal)}.current, arrival.value) { return }`,
        `      ${ident(effect.lastLocal)}.current = arrival.value`,
        ...statements(effect.nodeId, effect.actions, '      ', chain()),
        '    }'
      ].join('\n')
    );
  }
  for (const pulse of plan.inputPulses) {
    const p = ident(pulse.port);
    effects.push(
      [
        `// "${pulse.port}", a signal the parent sends in: its chain runs once for each pulse sent, never twice.`,
        `    .onChange(of: ${p}?.sent, initial: true) { _, _ in`,
        `      guard let ${p}, ${p}.taken.current != ${p}.sent else { return }`,
        `      ${p}.taken.current = ${p}.sent`,
        ...statements(plan.rootId ?? '', pulse.actions, '      ', chain()),
        '    }'
      ].join('\n')
    );
  }
  for (const ticked of plan.tickedRuns) {
    const def = fnByNode[ticked.nodeId]!;
    const names = runNamesOf(def);
    const watch = ticked.watch.map((w) => expr(w, TOP));
    if (watch.some((w) => w === undefined)) {
      lose(ticked.nodeId, `${def.fnName} runs when a ticked input changes, and an input reads a value this target does not print`);
      continue;
    }
    const run = statements(ticked.nodeId, [ticked.action], '        ', chain());
    if (ticked.atLoad === true) {
      // EXP-019 slice 2: nothing sends its Run, so it runs once at load (one turn later, after the mount effects above
      // it), then once per arrival; an arrival in that time is the load run instead.
      effects.push(
        [
          `// ${ticked.comment}`,
          `    .onChange(of: Same(${watch.join(', ')}), initial: true) { _, _ in`,
          `      let ${names.run}Now = {`,
          `        ${names.run}Loaded.current = true`,
          ...run,
          '      }',
          `      if JS.tickedArrival(${names.held}, [${watch.join(', ')}]) {`,
          `        ${names.run}Now()`,
          '        return',
          '      }',
          `      if ${names.run}Loaded.current { return }`,
          `      DispatchQueue.main.async { if !${names.run}Loaded.current { ${names.run}Now() } }`,
          '    }'
        ].join('\n')
      );
      continue;
    }
    effects.push(
      [
        `// ${ticked.comment}`,
        `    .onChange(of: Same(${watch.join(', ')}), initial: true) { _, _ in`,
        `      guard JS.tickedArrival(${names.held}, [${watch.join(', ')}]) else { return }`,
        ...run.map((l) => l.slice(2)),
        '    }'
      ].join('\n')
    );
  }
  for (const m of plan.statesMachines) {
    if (m.follow === undefined) continue;
    const v = expr(m.follow, TOP);
    if (v === undefined) {
      lose(m.nodeId, `its State is wired from a ${m.follow.kind} expression, which the Swift target does not print yet`);
      continue;
    }
    effects.push(`.onChange(of: Same(${v}), initial: true) { _, state in ${ident(m.local)}Go(state.value, invoked: false) }`);
  }
  for (const [field, what] of UNPRINTED) {
    const list = plan[field] as unknown[] | undefined;
    if (Array.isArray(list) && list.length > 0) lose(plan.rootId ?? '', `${list.length} × ${what}, not printed by the Swift target yet`);
  }

  // The logic components it places: one view each, drawing nothing, in the order React calls their hooks.
  const hookViews: string[][] = [];
  for (const id of plan.hookCalls) {
    const node = nodeById.get(id)!;
    const target = ctx.project.byLegacyPath.get(node.type);
    const targetStruct = ctx.structOf(node.type);
    if (!target || !targetStruct) {
      lose(id, `${node.type} is a logic component with no plan`);
      continue;
    }
    const args = placementArgs(node, target, '    ');
    hookViews.push([`    // ${node.authoredLabel ?? id} (${node.type}): a logic component, placed where the graph places it.`, `    ${targetStruct}(${args.join(', ')})`]);
  }

  // ---- the struct -----------------------------------------------------------------------------------------------

  const tree = plan.rootId ? print(plan.rootId, '    ') : [];

  const members: string[] = [];
  if (plan.docComment) members.push(`  // ${plan.docComment.split('\n')[0]}`);
  else if (plan.hook) members.push(`  // ${plan.path} — a logic component: it draws nothing, and every component that places it runs it.`);
  for (const p of plan.props) {
    const pulse = p.tsType.replace(/\s+/g, '') === INPUT_PULSE_TS_TYPE.replace(/\s+/g, '');
    members.push(pulse ? `  var ${ident(p.name)}: Pulse? = nil` : `  var ${ident(p.name)}: Any? = nil`);
  }
  for (const o of plan.outputProps) members.push(`  var ${ident(o.prop)}: () -> Void = {}`);
  for (const o of plan.liftedOutputProps) members.push(`  var ${ident(o.prop)}: (Any?) -> Void = { _ in }`);
  for (const s of plan.stateVars) {
    const t = stateSwiftType(s);
    members.push(`  @State var ${ident(s.name)}: ${t.type} = ${t.initial}`);
  }
  if (focusIds.size > 0) members.push('  @FocusState var focusedField: String?');
  for (const pulse of plan.instancePulses) members.push(`  @State var ${ident(pulse.takenLocal)} = Ref(0.0)`);
  for (const effect of plan.valueChangedEffects) members.push(`  @State var ${ident(effect.lastLocal)} = Ref<Any?>(nil)`);
  for (const id of Object.keys(fnByNode)) {
    if (!keptNode(id) || !usedFunctions.has(id)) continue;
    const def = fnByNode[id];
    members.push(`  @State var ${runNamesOf(def).node} = FunctionNode(signals: [${def.signals.map(swiftString).join(', ')}])`);
  }
  for (const ticked of plan.tickedRuns) {
    const names = runNamesOf(fnByNode[ticked.nodeId]!);
    members.push(`  @State var ${names.held} = Ref<[Any?]>([])`);
    if (ticked.atLoad === true) members.push(`  @State var ${names.run}Loaded = Ref(false)`);
  }
  for (const id of renderLocals.keys()) members.push(`  @State var ${runNamesOf(fnByNode[id]).memo} = Memo()`);

  const statics: string[] = [];
  // Static Data (STATIC-DATA-TARGET §3): its rows, verbatim, as a constant of the component, as React hoists them.
  for (const data of plan.staticData) statics.push(`  static let ${data.constName}: [Any] = ${swiftJson(data.rows, '  ')}`);
  const machineMethods: string[] = [];
  for (const m of plan.statesMachines) {
    members.push(`  @State var ${ident(m.local)}: String = ${swiftString(m.start ?? m.states[0] ?? '')}`);
    const rows = m.states.map((state) => {
      const cells = m.values.map((v) => {
        const value = v.byState[state];
        if (v.type === 'color') ctx.theme.read(String(value ?? ''));
        const typed = v.type === 'number' ? swiftNumber(Number(value ?? 0)) : v.type === 'boolean' ? String(value === true || value === 'true') : swiftString(String(value ?? ''));
        return `${swiftString(v.name)}: ${typed}`;
      });
      return `    ${swiftString(state)}: [${cells.join(', ') || ':'}]`;
    });
    statics.push(`  /// ${m.comment.split('\n')[0]}`, `  static let ${m.constName}: [String: [String: Any]] = [`, rows.join(',\n'), '  ]');
    const transitions = Object.keys(m.transitions ?? {}).length + m.values.filter((v) => Object.keys(v.transitions ?? {}).length > 0).length;
    if (m.useTransitions || transitions > 0) lose(m.nodeId, 'its transitions are not animated yet (withAnimation)');
    // The States library's moves: a request drained after the handler that asked, then its listeners.
    const local = ident(m.local);
    const listener = (list: HandlerAction[] | undefined, pad: string) => (list?.length ? statements(m.nodeId, list, pad, chain()) : []);
    const reached = Object.entries(m.listeners.reached ?? {}).filter(([, l]) => l.length > 0);
    machineMethods.push(
      `  /// ${m.comment.split('\n')[0].replace(/\.$/, '')}: a To <state> or a Toggle, drained after the press that asked.`,
      `  func ${local}Go(_ requested: Any?, invoked: Bool) {`,
      '    DispatchQueue.main.async {',
      `      let state = JS.truthy(requested) ? JS.string(requested) : ${swiftString(m.states[0] ?? '')}`,
      `      if ${local} == state {`,
      ...(m.listeners.unchanged?.length ? ['        if invoked {', ...listener(m.listeners.unchanged, '          '), '        }'] : []),
      '        return',
      '      }',
      `      guard Self.${m.constName}[state] != nil else {`,
      ...(m.listeners.failure?.length ? ['        if invoked {', ...listener(m.listeners.failure, '          '), '        }'] : []),
      '        return',
      '      }',
      `      ${local} = state`,
      ...listener(m.listeners.stateChanged, '      '),
      ...reached.flatMap(([state, list]) => [`      if state == ${swiftString(state)} {`, ...listener(list, '        '), '      }']),
      ...(m.listeners.done?.length ? ['      if invoked {', ...listener(m.listeners.done, '        '), '      }'] : []),
      '    }',
      '  }',
      `  func ${local}Toggle() {`,
      `    let states = [${m.states.map(swiftString).join(', ')}]`,
      `    let i = states.firstIndex(of: ${local}) ?? 0`,
      `    ${local}Go(states[(i + 1) % states.count], invoked: true)`,
      '  }'
    );
  }

  // The body, in stages a type checker (and a reader) can take one at a time: the tree, the placed logic components in
  // groups, then the effects in short chains on it, in the order React runs them.
  const page = plan.role === 'page';
  const bgDecl = page && plan.rootId ? styleCache.get(plan.rootId)?.decls.find((d) => d.prop === 'background-color') : undefined;
  const bg = bgDecl ? ctx.theme.read(bgDecl.value) : undefined;
  const chunk = <T>(list: T[], size: number): T[][] => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));
  const parts: string[] = [];
  for (const [id, code] of renderLocals) {
    const names = runNamesOf(fnByNode[id]);
    parts.push(`  /// ${fnByNode[id].fnName}'s outputs, run again only when its inputs change.`, `  var ${names.out}: Any? {`, `    ${code}`, '  }', '');
  }
  const groups = chunk(hookViews, 6);
  groups.forEach((group, i) => parts.push('  @ViewBuilder var logic' + i + ': some View {', ...group.flat(), '  }', ''));
  const logicView = groups.length ? `Logic { ${groups.map((_, i) => `logic${i}`).join('; ')} }` : undefined;
  const drawn = plan.hook
    ? [`    ${logicView ?? 'Logic {}'}`]
    : page && plan.rootId
      ? ['    ScrollView {', ...tree.map((l) => '  ' + l), '      .frame(maxWidth: .infinity)', '    }', ...(bg?.kind === 'color' ? [`    .background(${bg.swift}.ignoresSafeArea())`] : [])]
      : tree.length
        ? tree
        : ['    EmptyView()'];
  const modifiers = [...effectsBefore, ...(!plan.hook && logicView ? [`.background { ${logicView} }`] : []), ...effects];
  // EXP-019 (session 133). What a kept Function's body writes or sends after its run has returned (a timer, a listener)
  // arrives as the running app's does: into its row, and its signals' chains. Set at every render, as React's is.
  const lateLines: string[] = [];
  for (const id of Object.keys(fnByNode)) {
    const def = fnByNode[id];
    if (def.late !== true || !keptNode(id) || !usedFunctions.has(id)) continue;
    let pulses: Extract<HandlerAction, { kind: 'jsfun-pulses' }> | undefined;
    let materialize: string | undefined;
    const visit = (value: unknown): void => {
      if (value === null || typeof value !== 'object') return;
      if (Array.isArray(value)) return value.forEach(visit);
      const v = value as { kind?: unknown; nodeId?: unknown; materialize?: unknown };
      if (v.nodeId === id && v.kind === 'jsfun-pulses' && pulses === undefined) pulses = value as Extract<HandlerAction, { kind: 'jsfun-pulses' }>;
      if (v.nodeId === id && v.kind === 'jsfun-run' && typeof v.materialize === 'string' && materialize === undefined) materialize = v.materialize;
      Object.values(value).forEach(visit);
    };
    visit([plan.handlers, plan.inputPulses, plan.tickedRuns, plan.valueChangedEffects, plan.statesMachines]);
    if (pulses === undefined && materialize === undefined) continue;
    const names = runNamesOf(def);
    const scope: Scope = { ...chain(), runs: new Set([id]) };
    lateLines.push(
      `    // ${nodeById.get(id)?.authoredLabel ?? def.fnName}: what its body writes or sends after a run has returned arrives as the running app's does.`,
      `    let _ = ${names.node}.late = { ${names.run} in`,
      ...(materialize !== undefined ? [`      ${ident(materialize)} = ${names.run}.outputs`] : []),
      ...(pulses !== undefined ? statements(id, [pulses], '      ', scope) : []),
      '    }'
    );
  }
  let bodyLines: string[];
  if (modifiers.length === 0) {
    bodyLines = drawn;
  } else {
    parts.push('  @ViewBuilder var content: some View {', ...drawn, '  }', '');
    let current = 'content';
    chunk(modifiers, 6).forEach((stage, i) => {
      const name = `stage${i + 1}`;
      const indented = stage.flatMap((m) => m.split('\n').map((l, j) => (j === 0 ? `      ${l}` : `  ${l}`)));
      parts.push(`  var ${name}: some View {`, `    ${current}`, ...indented, '  }', '');
      current = name;
    });
    bodyLines = [`    ${current}`];
  }
  const source = [
    `// @nodegx:generated (EXP-022) — ${plan.path}, printed from the same plan as the React export.`,
    'import SwiftUI',
    '',
    `struct ${struct}: View {`,
    ...(usesRouter ? ['  @EnvironmentObject var router: AppRouter'] : []),
    ...(usesVariables ? ['  @ObservedObject var variables = Variables.shared'] : []),
    ...members,
    ...(statics.length ? ['', ...statics] : []),
    '',
    '  var body: some View {',
    ...lateLines,
    ...bodyLines,
    '  }',
    ...(parts.length ? ['', ...parts.slice(0, -1)] : []),
    ...(pressMethods.length ? ['', ...pressMethods] : []),
    ...(machineMethods.length ? ['', ...machineMethods] : []),
    '}',
    ''
  ].join('\n');

  return { struct, source, losses, webOnly, usesRouter, functions: [...usedFunctions.values()] };
}
