/**
 * P134 HTX-001. One component's plan as one plain ES module: `mount<Name>(element, inputs, before)` draws it with
 * `document.createElement` once, keeps each value the plan binds written into its element by an `effect`
 * (`lib/core.js`), and returns `{ update(inputs), outputs, destroy() }`.
 *
 * It reads the same {@link ComponentPlan} the React and Swift printers read (`roleOf`, `childrenOf`, `bindings`,
 * `handlers`, `stateVars`, `statesMachines`) and the shared style layer (`computeNodeStyle`, `computeRoleCss`). It
 * decides nothing the plan did not: what it does not print yet is a named loss, which the preflight lists, and the part
 * draws without it.
 *
 * | React (the web export) | plain JavaScript (this printer) |
 * |---|---|
 * | a prop | a `value()` the parent's `update(inputs)` sets |
 * | `useState`, a States machine | a `value()` |
 * | JSX, rendered again on change | the element made once; one `effect` per bound property writes that property |
 * | `{cond && <X/>}` | `when(...)`: mounted while true, its effects stopped and its element removed when false |
 * | `<Child a={x} />` | `mountChild(parent, { a }, before)` and an effect that calls its `update` |
 * | a CSS module | one stylesheet per component, its classes named `<Component>-<node>` |
 *
 * HTX-002 adds the logic, read off the plan the way the React printer prints it, construct for construct, so the timing
 * is React's (which the plan's rules were measured against):
 *
 * | React | plain JavaScript |
 * |---|---|
 * | `useState` (a set of the same value changes nothing) | `keep()` |
 * | `useEffect(fn, [deps])` | `l.watch(() => [deps], fn)` |
 * | `useMemo(() => Fn(inputs), [inputs])` (a Function with no Run) | `derived(() => Fn(inputs))` |
 * | `use<Name>(props)`, a logic component | `place(l, mount<Name>, null, …)`: a component that draws nothing |
 * | a Function's body | `functions/<component>/<Name>.js`, the body verbatim, run by `lib/functionRun.js` |
 *
 * @module emit/html/printComponent
 */

import type { NodeIR } from '../../ir/types';
import type { CatalogIndex } from '../../catalog';
import { INPUT_PULSE_TS_TYPE, type BindingSource, type ComponentPlan, type HandlerAction, type JsFunctionPlan, type ProjectPlan, type ValueExpr } from '../../analyze/plan';
import { computeNodeStyle, computeRoleCss, WIRED_STYLE_SINKS, type Decl, type StyleRole } from '../style';
import { assignClassNames, camelCase, isReservedWord, lowerFirst, type ClassCandidate } from '../naming';
// 🔴 A decision the React printer holds, not the plan (P134-HTX001-PRINTERDECIDES): which element a node's `as` names.
import { authoredTag, PRESET_MARKERS } from '../component';

export interface HtmlLoss {
  component: string;
  nodeId: string;
  label?: string;
  what: string;
}

export interface HtmlComponentContext {
  project: ProjectPlan;
  catalog: CatalogIndex;
  nodesOf: (path: string) => NodeIR[];
  styles: Parameters<typeof computeNodeStyle>[3];
  /** A placed component's legacy path → its module (relative to the output root) and its mount function. */
  moduleOf: (legacyPath: string) => { file: string; mount: string } | undefined;
  /** A Variable's name → its export in `variables.js`, or undefined where the plan does not keep it. */
  variableOf: (name: string) => string | undefined;
  /** A navigate action's `to` (a page's url path) → the router path it shows, or undefined for no such page. */
  routeOf: (urlPath: string) => string | undefined;
}

export interface PrintedComponent {
  mount: string;
  /** It moves a States node: the export carries `lib/states.js` and `lib/animate.js`. */
  usesStates: boolean;
  js: string;
  css: string;
  /** Each Function the component runs, as its own file (path relative to the output root → text). */
  functions: Record<string, string>;
  losses: HtmlLoss[];
}

/** A chain step the HTML target does not print: the whole chain is then named as a loss, never half printed. */
class Unprinted extends Error {}

/** Where an expression is read: in the drawing (`top`, tracked), or inside a chain, with the runs and pulses in scope. */
interface Scope {
  top: boolean;
  runs: Map<string, string>;
  pulses: Map<string, string>;
  /** The locals a chain has declared, shared by everything printed into one function body. */
  declared: Set<string>;
}

/**
 * The element each role draws when the author chose none — the React printer's own table (`component.ts` `TAGS`),
 * copied for the roles this printer draws (P134-HTX001-PRINTERDECIDES).
 */
const TAGS: Record<string, string> = { group: 'div', page: 'div', text: 'p', button: 'button', input: 'input' };

/** Parameters the render handles itself, not style: never a loss. */
const NOT_STYLE = new Set(['visible', 'mounted', 'cssClassName', ...PRESET_MARKERS]);

/** A JavaScript literal; a string in single quotes, as the library is written. */
export const js = (value: unknown): string => {
  if (value === undefined) return 'undefined';
  if (typeof value !== 'string') return JSON.stringify(value);
  return `'${JSON.stringify(value).slice(1, -1).replace(/\\"/g, '"').replace(/'/g, "\\'")}'`;
};

/** `obj.name` when the name is an identifier, `obj["a b"]` otherwise. */
const member = (obj: string, name: string): string => (/^[A-Za-z_$][\w$]*$/.test(name) ? `${obj}.${name}` : `${obj}[${js(name)}]`);

/** A key in an object literal. */
const key = (name: string): string => (/^[A-Za-z_$][\w$]*$/.test(name) ? name : js(name));

function literalParam(node: NodeIR, name: string): string | number | boolean | undefined {
  const v = node.parameters.find((p) => p.name === name)?.value;
  return v?.kind === 'literal' ? v.value : undefined;
}

/**
 * P18-S120-TEXTAREA, as the React printer reads it (`component.ts` `isTextArea`): a Text Input of Type Text Area is a
 * `<textarea>`. Copied (P134-HTX001-PRINTERDECIDES).
 */
const isTextArea = (node: NodeIR): boolean => literalParam(node, 'type') === 'textArea';

/** A component's mount function: `mountReadPage`; a logic component's file symbol is its React hook's (`useSource`). */
export function mountNameOf(plan: ComponentPlan): string {
  return `mount${plan.file!.symbol.replace(/^use(?=[A-Z])/, (m) => (plan.hook ? '' : m))}`;
}

export function printComponent(plan: ComponentPlan, ctx: HtmlComponentContext): PrintedComponent {
  const file = plan.file!;
  const mount = mountNameOf(plan);
  const nodes = ctx.nodesOf(plan.path);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const losses: HtmlLoss[] = [];
  const lose = (nodeId: string, what: string) => losses.push({ component: plan.path, nodeId, label: nodeById.get(nodeId)?.authoredLabel, what });
  const imports = { core: new Set<string>(), dom: new Set<string>(['life']), router: new Set<string>(), run: new Set<string>(), states: new Set<string>() };
  const childImports = new Map<string, Set<string>>();
  const machineByNode = new Map(plan.statesMachines.map((m) => [m.nodeId, m]));
  const stateNames = new Set(plan.stateVars.map((s) => s.name));
  const valueProps = plan.props.map((p) => p.name);
  const callbackProps = new Set([...plan.outputProps.map((o) => o.prop), ...plan.liftedOutputProps.map((o) => o.prop)]);
  const stateByName = new Map(plan.stateVars.map((v) => [v.name, v]));
  const stateBySetter = new Map(plan.stateVars.map((v) => [v.setterName, v]));
  const fnByNode = plan.jsFunctions;
  const tickedRunIds = new Set(plan.tickedRuns.map((t) => t.nodeId));
  /** A Function that keeps a node: one run per trigger, its values and its `this` kept across runs (EXP-019, §86). */
  const keptNode = (id: string): boolean => {
    const def = fnByNode[id];
    return def !== undefined && def.kind === 'function' && (def.pulsed === true || (def.host?.length ?? 0) > 0 || def.awaits === true);
  };
  const functions: Record<string, string> = {};
  /** The Functions this component calls, by node: the import, and each one's file. */
  const usedFunctions = new Map<string, JsFunctionPlan>();
  /** The module-level lines: an Expression's function. */
  const moduleHead: string[] = [];
  /** Lines inside the mount, before the drawing: the kept nodes, the render runs. */
  const nodeLines: string[] = [];
  const memoOf = new Map<string, string>();
  /** The app's Variables this component reads or writes: imported from `variables.js`. */
  const variableImports = new Set<string>();
  const variable = (name: string): string | undefined => {
    const exported = ctx.variableOf(name);
    if (exported === undefined) return undefined;
    variableImports.add(exported);
    return member('variables', exported);
  };

  // ---- the styles: one class per styled node, named the way the React export names its classes ------------------

  const order: string[] = [];
  const walk = (id: string) => {
    order.push(id);
    for (const c of plan.childrenOf[id] ?? []) walk(c);
  };
  if (plan.rootId) walk(plan.rootId);
  const styled = order.filter((id) => ['page', 'group', 'text', 'button', 'input'].includes(plan.roleOf[id]));
  const declsOf = new Map<string, Decl[]>();
  const roleCssOf = new Map<string, ReturnType<typeof computeRoleCss>>();
  for (const id of styled) {
    const node = nodeById.get(id)!;
    const role = plan.roleOf[id] as StyleRole;
    const style = computeNodeStyle(node, role, ctx.catalog, ctx.styles);
    let decls = style.decls;
    const unhandled = [...style.unhandled];
    // The page collapse: the merged Group's style is the page's. The React printer's own rule (`component.ts`, "The page
    // collapse"), copied as the Swift printer copies it (P18-EXP022-S1-COLLAPSE).
    if (id === plan.rootId && plan.collapsedGroupId) {
      const group = nodeById.get(plan.collapsedGroupId)!;
      const groupStyle = computeNodeStyle(group, 'group', ctx.catalog, ctx.styles);
      const own = new Set(groupStyle.decls.map((d) => d.prop));
      decls = [...groupStyle.decls, ...decls.filter((d) => !own.has(d.prop))];
      unhandled.push(...groupStyle.unhandled);
    }
    if (literalParam(node, 'visible') === false) decls = [...decls, { prop: 'visibility', value: 'hidden' }];
    for (const name of unhandled) if (!NOT_STYLE.has(name)) lose(id, `its ${name} is not carried (no style the export knows for it)`);
    declsOf.set(id, decls);
    const roleCss = computeRoleCss(node, role, ctx.catalog, ctx.styles);
    if (roleCss.wrapper) lose(id, `its ${roleCss.wrapper.role} wrapper is not drawn by the HTML target yet`);
    if (roleCss.containerQueries.length > 0) lose(id, 'its breakpoints are not carried by the HTML target yet');
    roleCssOf.set(id, roleCss);
  }
  const candidates: ClassCandidate[] = [];
  const classed: string[] = [];
  for (const id of styled) {
    if (declsOf.get(id)!.length === 0 && roleCssOf.get(id)!.blocks.length === 0) continue;
    candidates.push({ nodeIds: [id], label: nodeById.get(id)!.authoredLabel, role: plan.roleOf[id] });
    classed.push(id);
  }
  const names = assignClassNames(candidates);
  const classOf = new Map(classed.map((id, i) => [id, `${file.symbol}-${names[i]}`]));
  const cssBlocks: string[] = [];
  for (const id of classed) {
    const cls = classOf.get(id)!;
    const label = nodeById.get(id)!.authoredLabel;
    const body = declsOf.get(id)!.map((d) => `  ${d.prop}: ${d.value};`).join('\n');
    cssBlocks.push(`${label ? `/* ${label.replace(/\*\//g, '* /')} */\n` : ''}.${cls} {\n${body}\n}`);
    for (const block of roleCssOf.get(id)!.blocks) cssBlocks.push(`.${cls}${block.suffix} {\n${block.decls.map((d) => `  ${d.prop}: ${d.value};`).join('\n')}\n}`);
  }
  /** The class attribute: the node's own class, then what the author typed in CSS Class. */
  const classAttr = (id: string): string => {
    const own = classOf.get(id);
    const nodes = [nodeById.get(id)!];
    if (id === plan.rootId && plan.collapsedGroupId) nodes.push(nodeById.get(plan.collapsedGroupId)!);
    const authored = nodes.map((n) => literalParam(n, 'cssClassName')).filter((c): c is string => typeof c === 'string' && c.trim() !== '').map((c) => c.trim());
    return [...(own ? [own] : []), ...authored].join(' ');
  };

  // ---- names ---------------------------------------------------------------------------------------------------

  const taken = new Set(['variables', 'input', 'state', 'given', 'element', 'inputs', 'before', 'l', 'into', 'at', 'item', 'index', 'row', 'batch', 'life', 'el', 'show', 'truthy', 'keep', 'bindText', 'bindAttr', 'bindStyle', 'when', 'place', 'list', 'navigate', 'value', 'derived', 'functionNode', 'runFunction', 'tickedArrival', 'pulse', mount]);
  /** A fresh local name, `base` or `base2`, `base3`… */
  const fresh = (base: string): string => {
    let name = base.replace(/[^\w$]/g, '_');
    if (!/^[A-Za-z_$]/.test(name)) name = `n${name}`;
    if (isReservedWord(name)) name = `${name}_`;
    let n = 2;
    const first = name;
    while (taken.has(name)) name = `${first}${n++}`;
    taken.add(name);
    return name;
  };
  // A States node is one local, named as the React export names its `useStates` handle.
  for (const m of plan.statesMachines) taken.add(m.local);
  const fnNames = new Map<string, { base: string; node: string; held: string; loaded: string }>();
  /** A Function's names: its import (the wrapper's own name) and the locals that keep its node. */
  const useFunction = (def: JsFunctionPlan): { base: string; node: string; held: string; loaded: string } => {
    const known = fnNames.get(def.nodeId);
    if (known) return known;
    usedFunctions.set(def.nodeId, def);
    taken.add(def.fnName);
    const base = lowerFirst(camelCase(def.fnName)) || 'fn';
    const names = { base, node: fresh(`${base}Node`), held: fresh(`${base}Held`), loaded: fresh(`${base}Loaded`) };
    fnNames.set(def.nodeId, names);
    if (def.kind === 'function') {
      if (keptNode(def.nodeId)) {
        imports.run.add('functionNode');
        nodeLines.push(`  const ${names.node} = functionNode(${JSON.stringify(def.signals).replace(/"/g, "'")});`);
      }
      if (tickedRunIds.has(def.nodeId)) {
        nodeLines.push(`  const ${names.held} = [];`);
        if (plan.tickedRuns.find((t) => t.nodeId === def.nodeId)?.atLoad) nodeLines.push(`  let ${names.loaded} = false;`);
      }
      if (def.noodl !== undefined) lose(def.nodeId, `the Function "${def.fnName}" reads Noodl (${[...def.noodl.members, ...def.noodl.variables].join(', ')}), which the HTML target does not hand it yet (HTX-004)`);
      if (def.late) lose(def.nodeId, `the Function "${def.fnName}" writes or signals after its run has returned (a timer or a listener); those late writes are not carried yet`);
      if (def.component) lose(def.nodeId, `the Function "${def.fnName}" reads Component.Object, which the HTML target does not hand it yet`);
      if (def.scripts?.length) lose(def.nodeId, `the Function "${def.fnName}" uses script files, which the HTML target does not carry yet`);
    }
    return names;
  };

  // ---- values ---------------------------------------------------------------------------------------------------

  const TOP: Scope = { top: true, runs: new Map(), pulses: new Map(), declared: new Set() };
  const chainScope = (): Scope => ({ top: false, runs: new Map(), pulses: new Map(), declared: new Set() });
  /** `x?.name`: an output of a run that may not have happened yet. */
  const maybe = (obj: string, name: string): string => (/^[A-Za-z_$][\w$]*$/.test(name) ? `${obj}?.${name}` : `${obj}?.[${js(name)}]`);
  const fold = (code: string, how: 'string' | 'number' | 'boolean' | undefined): string =>
    how === 'string' ? `String(${code} ?? '')` : how === 'number' ? `(Number(${code}) || 0)` : how === 'boolean' ? `!!${code}` : code;

  /** A Function's argument record, `{ x: … }`; undefined where an input reads a value this printer does not print. */
  const jsArgs = (def: JsFunctionPlan, scope: Scope, atRun?: Array<{ name: string; expr: ValueExpr }>): string | undefined => {
    const entries: string[] = [];
    for (const i of def.inputs) {
      const read = i.atRun === true ? atRun?.find((a) => a.name === i.name)?.expr : i.expr;
      if (read === undefined) continue;
      const v = expr(read, scope);
      if (v === undefined) return undefined;
      entries.push(`${key(i.name)}: ${v}`);
    }
    return entries.length ? `{ ${entries.join(', ')} }` : '{}';
  };

  /** A plan expression as JavaScript; undefined where this printer does not print it yet. */
  const expr = (e: ValueExpr, scope: Scope = TOP): string | undefined => {
    switch (e.kind) {
      case 'prop':
        if (valueProps.includes(e.name)) return `${member('input', e.name)}.get()`;
        return undefined;
      case 'literal':
        return js(e.value);
      case 'undefined':
        return 'undefined';
      case 'state-get':
        if (stateNames.has(e.name)) return `${member('state', e.name)}.get()`;
        if (plan.statesMachines.some((m) => m.local === e.name)) return `${e.name}.get().state`;
        return undefined;
      case 'states-out': {
        const m = machineByNode.get(e.nodeId);
        if (!m) return undefined;
        if (e.field === 'state') return `${m.local}.get().state`;
        if (e.field === 'error') return `${m.local}.get().error`;
        if (e.field === 'at') return `(${m.local}.get().state === ${js(e.name ?? '')})`;
        if (e.field === 'value') return member(`${m.local}.get().values`, e.name ?? '');
        return undefined;
      }
      case 'not': {
        const inner = expr(e.operand, scope);
        if (inner === undefined) return undefined;
        imports.dom.add('truthy');
        return `!truthy(${inner})`;
      }
      case 'truthy': {
        const inner = expr(e.operand, scope);
        if (inner === undefined) return undefined;
        imports.dom.add('truthy');
        return `truthy(${inner})`;
      }
      case 'logical': {
        const parts = e.operands.map((o) => expr(o, scope));
        if (parts.some((p) => p === undefined)) return undefined;
        imports.dom.add('truthy');
        return `(${parts.map((p) => `truthy(${p})`).join(e.op === 'and' ? ' && ' : ' || ')})`;
      }
      case 'format': {
        const parts: string[] = [];
        for (const part of e.parts) {
          if (typeof part === 'string') {
            parts.push(js(part));
            continue;
          }
          const v = expr(part, scope);
          if (v === undefined) return undefined;
          imports.dom.add('show');
          parts.push(`show(${v})`);
        }
        return parts.length ? parts.join(' + ') : "''";
      }
      case 'store-get': {
        const v = variable(e.variableName);
        return v === undefined ? undefined : `${v}.get()`;
      }
      case 'static-rows':
        // The authored rows, a constant above the component (STATIC-DATA-TARGET §3): `allowEditOnly`, so nothing changes them.
        return plan.staticData.some((d) => d.constName === e.constName) ? e.constName : undefined;
      case 'jsfun-out': {
        const def = fnByNode[e.nodeId];
        if (!def || def.kind === 'visual') return undefined;
        const names = useFunction(def);
        if (def.kind === 'expression') {
          const args = jsArgs(def, scope);
          if (args === undefined) return undefined;
          if (!scope.top) return fold(`${def.fnName}(${args})`, e.fold);
          return fold(`${memo(def, args)}.get()`, e.fold);
        }
        const pulse = scope.pulses.get(e.nodeId);
        if (pulse !== undefined) return fold(member(`${pulse}.values`, e.output), e.fold);
        const run = scope.runs.get(e.nodeId);
        if (run !== undefined) return fold(member(`${run}.outputs`, e.output), e.fold);
        if (e.viaState !== undefined) {
          // In a chain, a kept node's values as its wires delivered them (current within the press that ran it).
          if (!scope.top && keptNode(e.nodeId)) return fold(member(`${names.node}.delivered`, e.output), e.fold);
          if (!stateByName.has(e.viaState)) return undefined;
          return fold(maybe(`${member('state', e.viaState)}.get()`, e.output), e.fold);
        }
        // A kept node runs only when something runs it, never where it is read.
        if (keptNode(e.nodeId)) return undefined;
        const args = jsArgs(def, scope);
        if (args === undefined) return undefined;
        if (!scope.top) return fold(member(`${def.fnName}(${args})`, e.output), e.fold);
        return fold(member(`${memo(def, args)}.get()`, e.output), e.fold);
      }
      default:
        return undefined;
    }
  };

  /**
   * A Function with no Run, read as the page draws: computed again only when what it reads changes (React's `useMemo`,
   * P18-S138-LIFTLOOP's rule).
   */
  const memo = (def: JsFunctionPlan, args: string): string => {
    const known = memoOf.get(def.nodeId);
    if (known) return known;
    const name = fresh(`${lowerFirst(camelCase(def.fnName)) || 'fn'}Out`);
    memoOf.set(def.nodeId, name);
    imports.core.add('derived');
    nodeLines.push(`  // ${def.fnName}: no Run is wired, so it runs again whenever what it reads changes.`, `  const ${name} = derived(function () {`, `    return ${def.fnName}(${args});`, '  });');
    return name;
  };

  /** What a binding reads, as JavaScript; undefined (and a named loss) where this printer does not print it yet. */
  const binding = (id: string, port: string, source: BindingSource): string | undefined => {
    if (source.kind === 'prop') {
      const code = expr({ kind: 'prop', name: source.name });
      if (code === undefined) lose(id, `its ${port} reads the input "${source.name}", which this component does not declare`);
      return code;
    }
    if (source.kind === 'computed') {
      const code = expr(source.expr);
      if (code === undefined) lose(id, `its ${port} reads ${describe(source.expr)}, which the HTML target does not print yet`);
      return code;
    }
    if (source.kind === 'store') {
      const v = variable(source.variableName);
      if (v !== undefined) return `${v}.get()`;
      lose(id, `its ${port} reads the Variable "${source.variableName}", which the plan does not keep`);
    }
    else if (source.kind === 'store-key') lose(id, `its ${port} reads the Global Store "${source.storeName}" (HTX-002)`);
    else lose(id, `its ${port} has no source the plan could read`);
    return undefined;
  };

  // ---- actions --------------------------------------------------------------------------------------------------

  /** The React printer's `expandActions`: chains that are following statements, flattened (copied, as Swift copies it). */
  const expand = (list: HandlerAction[]): HandlerAction[] =>
    list.flatMap((a): HandlerAction[] => {
      if (a.kind === 'store-set' && a.then !== undefined) return [{ ...a, then: undefined }, ...expand(a.then)];
      if (a.kind === 'log' && a.then.length > 0) return [{ ...a, then: [] }, ...expand(a.then)];
      if (a.kind === 'jsfun-run') {
        if (a.awaitsAt !== undefined) return [a];
        const own = a.materialize !== undefined || keptNode(a.nodeId) || (a.ticked !== true && tickedRunIds.has(a.nodeId));
        return own ? [{ ...a, then: [] }, ...expand(a.then)] : expand(a.then);
      }
      if (a.kind === 'branch' && a.flat === true) return expand(a.whenTrue);
      return [a];
    });

  /** A chain as statements. Throws {@link Unprinted} at the first step this printer does not print. */
  const block = (list: HandlerAction[], pad: string, scope: Scope): string[] => {
    const out: string[] = [];
    let inScope = scope;
    for (const a of expand(list)) {
      const printed = statement(a, pad, inScope);
      out.push(...printed.lines);
      inScope = printed.scope;
    }
    return out;
  };

  const statement = (a: HandlerAction, pad: string, scope: Scope): { lines: string[]; scope: Scope } => {
    const one = (line: string) => ({ lines: [`${pad}${line}`], scope });
    switch (a.kind) {
      case 'navigate': {
        const path = ctx.routeOf(a.to);
        if (path === undefined || a.pathParams.length > 0 || a.query.length > 0 || a.newTab) throw new Unprinted(`a navigate to ${a.to} with parameters or a new tab, which the HTML target does not carry yet`);
        imports.router.add('navigate');
        return one(`navigate(${js(path)});`);
      }
      case 'store-set': {
        const target = variable(a.variableName);
        const v = expr(a.expr, scope);
        if (target === undefined || v === undefined) throw new Unprinted(`a Set Variable of "${a.variableName}" from ${describe(a.expr)}, which the HTML target does not print yet`);
        return one(`${target}.set(${a.fallback !== undefined ? `${v} ?? ${js(a.fallback)}` : v});`);
      }
      case 'output-signal':
        if (!callbackProps.has(a.prop)) throw new Unprinted(`a signal out through ${a.prop}, which this component does not declare`);
        return one(`if (${member('given', a.prop)}) ${member('given', a.prop)}();`);
      case 'state-set': {
        const row = stateByName.get(a.name);
        if (!row) throw new Unprinted(`a write to ${a.name}, a value the plan does not keep`);
        const s = member('state', a.name);
        if (a.field !== undefined) throw new Unprinted(`a ${a.field.port === 'set' ? 'Set' : 'Clear'} on a text field (HTX-003)`);
        if (a.op === 'toggle') return one(`${s}.set(!${s}.peek());`);
        if (a.op === 'inc') return one(`${s}.set(${s}.peek() + 1);`);
        if (a.op === 'dec') return one(`${s}.set(${s}.peek() - 1);`);
        const v = a.expr === undefined ? 'undefined' : expr(a.expr, scope);
        if (v === undefined) throw new Unprinted(`a write to ${a.name} from ${describe(a.expr!)}, which the HTML target does not print yet`);
        return one(`${s}.set(${v});`);
      }
      case 'jsfun-run': {
        const def = fnByNode[a.nodeId];
        if (!def || def.kind !== 'function') throw new Unprinted(`a run of a ${def?.kind ?? 'missing'} node`);
        if (a.awaitsAt !== undefined || def.awaits) throw new Unprinted(`a run of "${def.fnName}", which awaits (HTX-004)`);
        if (def.noodl !== undefined) throw new Unprinted(`a run of "${def.fnName}", which reads Noodl (HTX-004)`);
        if (def.component) throw new Unprinted(`a run of "${def.fnName}", which reads Component.Object`);
        const names = useFunction(def);
        const args = jsArgs(def, scope, a.inputsAtRun);
        if (args === undefined) throw new Unprinted(`a run of "${def.fnName}" whose inputs read a value the HTML target does not print yet`);
        const lines: string[] = [];
        // A Run records what it read on the ticked inputs, so the arrival effect does not run it again for them.
        if (a.ticked !== true && tickedRunIds.has(a.nodeId)) {
          const t = plan.tickedRuns.find((x) => x.nodeId === a.nodeId)!;
          const watch = t.watch.map((w) => expr(w, scope));
          if (watch.some((w) => w === undefined)) throw new Unprinted(`the inputs "${def.fnName}" runs again on, which the HTML target does not print yet`);
          imports.run.add('tickedArrival');
          lines.push(`${pad}tickedArrival(${names.held}, [${watch.join(', ')}]);`);
        }
        if (keptNode(a.nodeId)) {
          let run = `${names.base}Run`;
          for (let n = 2; scope.declared.has(run) || taken.has(run); n++) run = `${names.base}Run${n}`;
          scope.declared.add(run);
          imports.run.add('runFunction');
          lines.push(`${pad}const ${run} = runFunction(${def.fnName}, ${args}, ${names.node});`);
          if (a.materialize !== undefined) lines.push(`${pad}${member('state', a.materialize)}.set({ ...${run}.outputs });`);
          const runs = new Map(scope.runs);
          runs.set(a.nodeId, run);
          return { lines, scope: { ...scope, runs } };
        }
        if (a.materialize !== undefined) lines.push(`${pad}${member('state', a.materialize)}.set(${def.fnName}(${args}));`);
        return { lines, scope };
      }
      case 'jsfun-pulses': {
        const run = scope.runs.get(a.nodeId);
        if (run === undefined) throw new Unprinted('the signals of a Function, outside its run');
        const arms = a.then.filter((x): x is Extract<HandlerAction, { kind: 'jsfun-pulse' }> => x.kind === 'jsfun-pulse');
        const pulse = run.replace(/Run(\d*)$/, 'Pulse$1');
        const pulses = new Map(scope.pulses);
        pulses.set(a.nodeId, pulse);
        const inner: Scope = { ...scope, pulses };
        const lines = [`${pad}for (const ${pulse} of ${run}.pulses) {`];
        arms.forEach((arm, i) => {
          lines.push(`${pad}  ${i === 0 ? '' : '} else '}if (${pulse}.signal === ${js(arm.signal)}) {`);
          const body = block(arm.then, pad + '    ', inner);
          lines.push(...(body.length ? body : [`${pad}    // Nothing is wired to "${arm.signal}".`]));
        });
        if (arms.length) lines.push(`${pad}  }`);
        lines.push(`${pad}}`);
        return { lines, scope };
      }
      case 'jsfun-pulse':
        return { lines: block(a.then, pad, scope), scope };
      case 'states-go': {
        const m = machineByNode.get(a.nodeId);
        if (!m) throw new Unprinted('a States move on a States node the plan does not keep');
        return one(a.verb === 'toggle' ? `${m.local}.toggle();` : `${m.local}.goTo(${js(a.state ?? '')});`);
      }
      case 'branch': {
        const cond = expr(a.cond, scope);
        if (cond === undefined) throw new Unprinted(`a Condition on ${describe(a.cond)}, which the HTML target does not print yet`);
        imports.dom.add('truthy');
        const yes = block(a.whenTrue, pad + '  ', scope);
        const no = block(a.whenFalse, pad + '  ', scope);
        if (yes.length === 0) return { lines: no.length ? [`${pad}if (!truthy(${cond})) {`, ...no, `${pad}}`] : [], scope };
        return { lines: [`${pad}if (truthy(${cond})) {`, ...yes, ...(no.length ? [`${pad}} else {`, ...no] : []), `${pad}}`], scope };
      }
      default:
        throw new Unprinted(`a ${a.kind} step, which the HTML target does not print yet`);
    }
  };

  /** A chain from its start (a press, a callback, an effect), or undefined and a named loss: never half a chain. */
  const chain = (id: string, port: string, list: HandlerAction[], pad: string): string[] | undefined => {
    try {
      return block(list, pad, chainScope());
    } catch (e) {
      if (!(e instanceof Unprinted)) throw e;
      lose(id, `its ${port} runs ${e.message}; the chain is left out whole`);
      return undefined;
    }
  };

  /** A callback whose body is a chain: `function () { … }`, or undefined when the chain is not printed. */
  const callback = (id: string, port: string, list: HandlerAction[], pad: string, before: string[] = []): string | undefined => {
    const body = chain(id, port, list, pad + '  ');
    if (body === undefined) return undefined;
    return ['function () {', ...before.map((b) => `${pad}  ${b}`), ...body, `${pad}}`].join('\n');
  };

  /** The node signals a DOM event carries (the React printer's `EVENT_ATTRS`, as DOM event names). */
  const EVENTS: Record<string, string> = { onClick: 'click', pointerDown: 'pointerdown', pointerUp: 'pointerup', hoverStart: 'mouseenter', hoverEnd: 'mouseleave', onFocus: 'focus', onBlur: 'blur' };
  /**
   * P18-S121-DIDMOUNT. The Did Mount chains, run once the part is drawn: children before the element that holds them, as
   * the React printer walks them. One under a Mounted that a value decides is named, not run (its gate is not printed).
   */
  const mounted: string[] = [];
  const mountGated = (id: string): boolean => {
    for (let at: string | undefined = id; at !== undefined; at = nodeById.get(at)?.parent) {
      if (plan.bindings[at]?.mounted !== undefined) return true;
      if (at === plan.rootId) break;
    }
    return false;
  };
  const listen = (id: string, local: string, pad: string, known: Record<string, string>): string[] => {
    const out: string[] = [];
    for (const [port, list] of Object.entries(plan.handlers[id] ?? {})) {
      if (port === 'didMount') {
        if (mountGated(id)) {
          lose(id, 'its Did Mount sits under a Mounted a value decides, which the HTML target does not gate yet');
          continue;
        }
        const body = chain(id, 'Did Mount', list, '  ');
        if (body !== undefined) mounted.push(`  // ${nodeById.get(id)?.authoredLabel ?? id}: Did Mount.`, ...body);
        continue;
      }
      // P18-S128-FIELDSET. A text field's On Enter is its Enter key.
      if (port === 'onEnter' && plan.roleOf[id] === 'input') {
        const body = chain(id, port, list, `${pad}  `);
        if (body !== undefined) out.push(`${pad}${local}.addEventListener('keydown', function (event) {`, `${pad}  if (event.key !== 'Enter') return;`, ...body, `${pad}});`);
        continue;
      }
      const event = known[port] ?? EVENTS[port];
      if (event === undefined) {
        lose(id, `its ${port} is not carried by the HTML target yet`);
        continue;
      }
      const body = chain(id, port, list, `${pad}  `);
      if (body === undefined) continue;
      out.push(`${pad}${local}.addEventListener(${js(event)}, function () {`, ...body, `${pad}});`);
    }
    return out;
  };

  // ---- placements -----------------------------------------------------------------------------------------------

  /**
   * What a placement hands the component it places, drawn or logic: `fixed`, set once (the callbacks: its signals' chains
   * and the values it sends out), and `live`, the inputs that follow a value.
   */
  const placementArgs = (node: NodeIR, target: ComponentPlan, pad: string): { fixed: string[]; live: string[] } => {
    const fixed: string[] = [];
    const live: string[] = [];
    const bound = plan.bindings[node.id] ?? {};
    for (const p of target.props) {
      if (p.tsType.replace(/\s+/g, '') === INPUT_PULSE_TS_TYPE.replace(/\s+/g, '')) {
        const pulse = plan.instancePulses.find((x) => x.nodeId === node.id && x.port === p.name);
        if (pulse) live.push(`${key(p.name)}: { sent: ${member('state', pulse.delivered?.name ?? pulse.stateName)}.get(), taken: ${pulse.takenLocal} }`);
        continue;
      }
      const b = bound[p.name];
      if (b) {
        const v = binding(node.id, p.name, b);
        if (v !== undefined) live.push(`${key(p.name)}: ${v}`);
        continue;
      }
      const lit = literalParam(node, p.name);
      if (lit !== undefined) fixed.push(`${key(p.name)}: ${js(lit)}`);
    }
    const outputs = new Map(target.outputProps.map((o) => [o.port, o.prop]));
    for (const [port, list] of Object.entries(plan.handlers[node.id] ?? {})) {
      const prop = outputs.get(port);
      if (!prop) {
        lose(node.id, `its ${port} names no output of ${node.type}`);
        continue;
      }
      const fn = callback(node.id, port, list, `${pad}  `);
      if (fn !== undefined) fixed.push(`${key(prop)}: ${fn}`);
    }
    // A value the placed component sends out, written where it lands (React's `combinedLifted` when it lands twice).
    const lifts = new Map<string, string[]>();
    for (const lift of plan.instanceLifted[node.id] ?? []) {
      const row = lift.forward ? undefined : stateBySetter.get(lift.setterName);
      if (!lift.forward && !row) {
        lose(node.id, `its ${lift.prop} lifts into ${lift.setterName}, a value the plan does not keep`);
        continue;
      }
      const writes = lifts.get(lift.prop) ?? [];
      writes.push(lift.forward ? `if (${member('given', lift.setterName)}) ${member('given', lift.setterName)}(value);` : `${member('state', row!.name)}.set(value);`);
      lifts.set(lift.prop, writes);
    }
    for (const [prop, writes] of lifts) fixed.push(`${key(prop)}: function (value) {\n${writes.map((w) => `${pad}    ${w}`).join('\n')}\n${pad}  }`);
    if (target.childSlot) lose(node.id, `${node.type} takes placed children, which the HTML target does not pass yet`);
    return { fixed, live };
  };

  /** `place(l, mountX, parent, { fixed }, function () { return { live }; }, before)`. */
  const placeCall = (mountName: string, parent: string, args: { fixed: string[]; live: string[] }, before: string | undefined, pad: string): string => {
    imports.dom.add('place');
    const fixed = args.fixed.length ? `{\n${args.fixed.map((f) => `${pad}  ${f}`).join(',\n')}\n${pad}}` : '{}';
    const live = args.live.length ? `function () {\n${pad}  return { ${args.live.join(', ')} };\n${pad}}` : 'null';
    return `place(l, ${mountName}, ${parent}, ${fixed}, ${live}${before ? `, ${before}` : ''})`;
  };

  const importMount = (file: string, mountName: string) => {
    const names = childImports.get(file) ?? new Set<string>();
    names.add(mountName);
    childImports.set(file, names);
  };

  // ---- the tree -------------------------------------------------------------------------------------------------

  const localOf = new Map<string, string>();
  const local = (id: string): string => {
    const known = localOf.get(id);
    if (known) return known;
    let name = lowerFirst(camelCase(id)).replace(/[^\w$]/g, '_');
    if (!/^[A-Za-z_$]/.test(name) || name === '') name = `node${name}`;
    if (isReservedWord(name) || taken.has(name)) name = `${name}El`;
    let n = 2;
    const base = name;
    while (taken.has(name)) name = `${base}${n++}`;
    taken.add(name);
    localOf.set(id, name);
    return name;
  };

  /** Lines that draw `id` into `parent` (before `before`, when given), with effects added to `l`. Returns the lines. */
  const draw = (id: string, parent: string, before: string | undefined, pad: string): string[] => {
    const role = plan.roleOf[id];
    const node = nodeById.get(id);
    if (!node || role === undefined) return [];
    const bound = plan.bindings[id] ?? {};
    // Authored Mounted false with no wire the plan carries: not on the page, as the React printer removes it
    // (`component.ts`, copied as the Swift printer copies it, P134-HTX001-PRINTERDECIDES).
    if (!bound.mounted && literalParam(node, 'mounted') === false) return [`${pad}// ${id}: Mounted is off, so it is not drawn.`];
    if (bound.mounted) {
      const test = binding(id, 'mounted', bound.mounted);
      if (test !== undefined) {
        imports.dom.add('when');
        imports.dom.add('truthy');
        // The runtime's rule, as the React printer holds it (`component.ts` `mountedCondOf`, P18 s126; copied,
        // P134-HTX001-PRINTERDECIDES): a wire never delivers undefined, so while the source has no value the element keeps
        // its own authored Mounted (true unless the author turned it off).
        const keeps = literalParam(node, 'mounted') === false ? 'false' : 'true';
        const inner = drawNode(id, role, node, bound, 'into', 'at', `${pad}  `);
        const outer = role === 'instance' ? 'null' : local(id);
        return [
          `${pad}// ${node.authoredLabel ?? id}: on the page while its Mounted is true.`,
          `${pad}when(l, ${parent}, function () {`,
          `${pad}  const on = ${test};`,
          `${pad}  return on === undefined ? ${keeps} : truthy(on);`,
          `${pad}}, function (into, at, l) {`,
          ...inner,
          `${pad}  return ${outer};`,
          `${pad}}${before ? `, ${before}` : ''});`
        ];
      }
    }
    return drawNode(id, role, node, bound, parent, before, pad);
  };

  const elLine = (id: string, tag: string, parent: string, text: string | undefined, before: string | undefined, pad: string): string => {
    imports.dom.add('el');
    const cls = classAttr(id);
    const args = [parent, js(tag), cls ? js(cls) : 'undefined', text !== undefined ? js(text) : undefined, before].filter((a, i, all) => a !== undefined || all.slice(i + 1).some((b) => b !== undefined));
    return `${pad}const ${local(id)} = el(${args.map((a) => a ?? 'undefined').join(', ')});`;
  };

  const tagOf = (id: string, node: NodeIR, role: string): string => {
    if (role === 'input' && isTextArea(node)) return 'textarea';
    const fallback = TAGS[role];
    const candidates = [node, ...(id === plan.rootId && plan.collapsedGroupId ? [nodeById.get(plan.collapsedGroupId)!] : [])];
    for (const n of candidates) {
      const chosen = authoredTag(n, fallback, ctx.catalog);
      if (chosen.refusal) lose(id, `its Tag ${chosen.refusal.reason}`);
      if (chosen.tag !== fallback) return chosen.tag;
    }
    return fallback;
  };

  /**
   * A For Each over a list the plan names (`itemsExpr`): one row of its template per item, kept by its place in the list,
   * as the React export keys its rows by index. A row's signal sets the relayed values from the row's item first, then
   * runs its chain (`foreach.tsx` `itemOutputSignalTriggered`, EXP-011 §99).
   */
  const drawList = (id: string, node: NodeIR, parent: string, before: string | undefined, pad: string): string[] => {
    const rep = plan.repeaters[id];
    const target = rep?.templatePath ? ctx.project.byLegacyPath.get(rep.templatePath) : undefined;
    const module = rep?.templatePath ? ctx.moduleOf(rep.templatePath) : undefined;
    const items = rep?.itemsExpr ? expr(rep.itemsExpr) : undefined;
    if (!rep || !target || !module || target.hook || items === undefined || rep.mapping === null) {
      lose(id, rep?.itemsStaticId || rep?.itemsQueryId || rep?.itemsCollectionName ? 'a For Each over Static Data, a query or a named list, which the HTML target does not draw yet (HTX-003)' : 'a For Each whose rows the HTML target does not draw yet (HTX-003)');
      return [`${pad}// ${node.authoredLabel ?? id}: a For Each, not drawn by this export yet (see EXPORT-PREFLIGHT.md).`];
    }
    importMount(module.file, module.mount);
    imports.dom.add('list');
    const pairs =
      rep.mapping === 'template-inputs'
        ? target.props.filter((p) => p.tsType.replace(/\s+/g, '') !== INPUT_PULSE_TS_TYPE.replace(/\s+/g, '')).map((p) => `${key(p.name)}: ${member('item', p.name)}`)
        : rep.mapping.map((m) => `${key(m.input)}: ${member('item', m.field)}`);
    const callbacks: string[] = [];
    const outputs = new Map(target.outputProps.map((o) => [o.port, o.prop]));
    const relays = plan.rowRelays.filter((r) => r.repeaterId === id && stateByName.has(r.stateName));
    for (const [port, list] of Object.entries(plan.handlers[id] ?? {})) {
      const signal = /^itemOutputSignal-(.+)$/.exec(port)?.[1];
      const prop = signal !== undefined ? outputs.get(signal) : undefined;
      if (prop === undefined) {
        lose(id, `its ${port} is not carried by the HTML target yet`);
        continue;
      }
      const fn = callback(id, port, list, `${pad}    `, relays.map((r) => `${member('state', r.stateName)}.set(${member('item', r.input)});`));
      if (fn !== undefined) callbacks.push(`${key(prop)}: ${fn}`);
    }
    const label = node.authoredLabel ?? id;
    return [
      `${pad}// ${label}: one ${target.file?.symbol ?? 'row'} for each item, kept by its place in the list.`,
      `${pad}list(l, ${parent}, function () {`,
      `${pad}  return ${items};`,
      `${pad}}, function (into, item, index, at) {`,
      `${pad}  const inputs = function () {`,
      `${pad}    return { ${pairs.join(', ')} };`,
      `${pad}  };`,
      `${pad}  const row = ${module.mount}(into, Object.assign(inputs(), {${callbacks.length ? `\n${callbacks.map((c) => `${pad}    ${c}`).join(',\n')}\n${pad}  ` : ''}}), at);`,
      `${pad}  return {`,
      `${pad}    update(next) {`,
      `${pad}      item = next;`,
      `${pad}      row.update(inputs());`,
      `${pad}    },`,
      `${pad}    destroy() {`,
      `${pad}      row.destroy();`,
      `${pad}    }`,
      `${pad}  };`,
      `${pad}}${before ? `, ${before}` : ''});`
    ];
  };

  const drawNode = (id: string, role: string, node: NodeIR, bound: Record<string, BindingSource>, parent: string, before: string | undefined, pad: string): string[] => {
    const out: string[] = [];
    const extra = (handled: string[]) => {
      for (const [port, source] of Object.entries(bound)) {
        if (handled.includes(port) || port === 'mounted') continue;
        // EXP-011 §49. The style ports the React export follows from a wire (`WIRED_STYLE_SINKS`), the same three here.
        const sink = WIRED_STYLE_SINKS[port];
        if (sink !== undefined) {
          if (source.kind === 'computed' && source.expr.kind === 'undefined') continue;
          const v = binding(id, port, source);
          if (v === undefined) continue;
          imports.dom.add('bindStyle');
          out.push(`${pad}bindStyle(l, ${local(id)}, ${js(sink.css.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`))}, function () { return ${v}; });`);
          continue;
        }
        if (port === 'visible') {
          const v = binding(id, port, source);
          if (v === undefined) continue;
          imports.dom.add('bindStyle');
          imports.dom.add('truthy');
          out.push(`${pad}bindStyle(l, ${local(id)}, 'visibility', function () { return truthy(${v}) ? '' : 'hidden'; });`);
          continue;
        }
        lose(id, `its ${port} is bound, which the HTML target does not print yet`);
      }
    };
    if (role === 'page' || role === 'group') {
      out.push(elLine(id, tagOf(id, node, role), parent, undefined, before, pad));
      for (const child of plan.childrenOf[id] ?? []) out.push(...draw(child, local(id), undefined, pad));
      out.push(...listen(id, local(id), pad, { onClick: 'click' }));
      extra([]);
    } else if (role === 'text') {
      const text = bound.text ? binding(id, 'text', bound.text) : undefined;
      out.push(elLine(id, tagOf(id, node, role), parent, text === undefined ? String(literalParam(node, 'text') ?? '') : undefined, before, pad));
      if (text !== undefined) {
        imports.dom.add('bindText');
        out.push(`${pad}bindText(l, ${local(id)}, function () { return ${text}; });`);
      }
      if (bound.color) {
        const c = binding(id, 'color', bound.color);
        if (c !== undefined) {
          imports.dom.add('bindStyle');
          out.push(`${pad}bindStyle(l, ${local(id)}, 'color', function () { return ${c}; });`);
        }
      }
      out.push(...listen(id, local(id), pad, { onClick: 'click' }));
      extra(['text', 'color']);
    } else if (role === 'button') {
      const label = bound.label ? binding(id, 'label', bound.label) : undefined;
      out.push(elLine(id, 'button', parent, label === undefined ? String(literalParam(node, 'label') ?? '') : undefined, before, pad));
      out.push(`${pad}${local(id)}.type = 'button';`);
      if (label !== undefined) {
        imports.dom.add('bindText');
        out.push(`${pad}bindText(l, ${local(id)}, function () { return ${label}; });`);
      }
      if (!plan.handlers[id]?.onClick) out.push(`${pad}// Nothing is wired to this press.`);
      out.push(...listen(id, local(id), pad, { onClick: 'click' }));
      extra(['label']);
    } else if (role === 'input') {
      const tag = tagOf(id, node, role);
      out.push(elLine(id, tag, parent, undefined, before, pad));
      const type = literalParam(node, 'type');
      if (tag === 'input' && typeof type === 'string' && ['password', 'email', 'number', 'url', 'tel', 'search'].includes(type)) out.push(`${pad}${local(id)}.type = ${js(type)};`);
      const placeholder = bound.placeholder ? binding(id, 'placeholder', bound.placeholder) : undefined;
      if (placeholder !== undefined) {
        imports.dom.add('bindAttr');
        out.push(`${pad}bindAttr(l, ${local(id)}, 'placeholder', function () { return ${placeholder}; });`);
      } else if (typeof literalParam(node, 'placeholder') === 'string' && literalParam(node, 'placeholder') !== '') {
        out.push(`${pad}${local(id)}.placeholder = ${js(literalParam(node, 'placeholder'))};`);
      }
      const row = plan.stateVars.find((v) => v.originNodeId === id && v.origin === 'control');
      if (row) {
        // The field's text is a value: written into the field when it changes, and set from the field as a person types.
        out.push(
          `${pad}l.run(function () {`,
          `${pad}  const text = ${member('state', row.name)}.get();`,
          `${pad}  if (${local(id)}.value !== text) ${local(id)}.value = text;`,
          `${pad}});`,
          `${pad}${local(id)}.addEventListener('input', function () {`,
          `${pad}  ${member('state', row.name)}.set(${local(id)}.value);`,
          `${pad}});`
        );
      } else lose(id, 'its text has no state row in the plan, so nothing reads what is typed');
      if ((plan.changeHandlers[id] ?? []).length > 0) lose(id, 'its Changed chain is not printed yet (HTX-003)');
      out.push(...listen(id, local(id), pad, {}));
      extra(['placeholder', 'value']);
    } else if (role === 'instance') {
      const target = ctx.project.byLegacyPath.get(node.type);
      const module = ctx.moduleOf(node.type);
      if (!target || !module || target.hook) {
        lose(id, target?.hook ? `${node.type} is a logic component placed where it draws, which the HTML target does not run yet` : `${node.type} draws nothing in the plan (${target?.skipReason ?? 'no plan'})`);
        return [`${pad}// ${node.authoredLabel ?? id}: ${node.type} is not drawn in this export yet (see EXPORT-PREFLIGHT.md).`];
      }
      importMount(module.file, module.mount);
      out.push(`${pad}const ${local(id)} = ${placeCall(module.mount, parent, placementArgs(node, target, pad), before, pad)};`);
    } else if (role === 'repeater') {
      out.push(...drawList(id, node, parent, before, pad));
    } else {
      lose(id, `a ${role} node is not drawn by the HTML target yet`);
      return [`${pad}// ${node.authoredLabel ?? id}: a ${role}, not drawn by this export yet.`];
    }
    return out;
  };

  // ---- the logic: React's effects, in the order the React printer writes them ----------------------------------

  const logic: string[] = [];
  // P18-S127-SIBLINGVALUE. A pulse handed on one update after it is sent, so the values lifted with it land first.
  for (const p of plan.instancePulses) {
    if (!p.delivered || !stateByName.has(p.delivered.name)) continue;
    const label = nodeById.get(p.nodeId)?.authoredLabel ?? p.nodeId;
    logic.push(
      `  // "${p.port}" is handed to ${label} one update after it is sent: the values lifted with it arrive first, as the running app delivers them.`,
      `  l.watch(function () {`,
      `    return [${member('state', p.stateName)}.get()];`,
      `  }, function (sent) {`,
      `    ${member('state', p.delivered.name)}.set(sent);`,
      `  });`
    );
  }
  // A logic component, placed where the graph places it: it draws nothing, so it has no element.
  const hookLines: string[] = [];
  for (const id of plan.hookCalls) {
    const node = nodeById.get(id);
    const target = node ? ctx.project.byLegacyPath.get(node.type) : undefined;
    const module = node ? ctx.moduleOf(node.type) : undefined;
    if (!node || !target || !module) {
      lose(id, `${node?.type ?? id} is a logic component the HTML target does not print`);
      continue;
    }
    importMount(module.file, module.mount);
    hookLines.push(`  // ${node.authoredLabel ?? id} (${node.type}): a logic component, run where the graph places it.`, `  const ${local(id)} = ${placeCall(module.mount, 'null', placementArgs(node, target, '  '), undefined, '  ')};`);
  }
  // A value this component sends out: now, and again whenever it changes (React's push effect, CONTROLLED-STATE-TARGET §3.5).
  for (const push of plan.pushEffects) {
    const v = expr(push.expr);
    if (v === undefined) {
      lose(plan.rootId ?? '', `the value it sends out through ${push.prop} reads ${describe(push.expr)}, which the HTML target does not print yet`);
      continue;
    }
    const port = plan.liftedOutputProps.find((o) => o.prop === push.prop)?.port ?? push.prop;
    logic.push(
      `  // "${port}", sent out to the component that places this one: now, and whenever it changes.`,
      `  l.watch(function () {`,
      `    return [${v}];`,
      `  }, function (value) {`,
      `    if (${member('given', push.prop)}) ${member('given', push.prop)}(value);`,
      `  });`
    );
  }
  // EXP-011 §67. A Variable's authored Value: stored each time this component is placed, as the running app stores it when
  // the node is made; before the values that follow a wire, so one that reads the Variable sees it.
  for (const seed of plan.variableSeeds) {
    const target = variable(seed.variableName);
    if (target === undefined) {
      lose(seed.nodeId, `its starting value for "${seed.variableName}", a Variable the plan does not keep`);
      continue;
    }
    logic.push(`  // ${seed.comment}`, `  ${target}.set(${js(seed.value)});`);
  }
  // A value wired into a field or a Variable: written with the input's own rule (CONTROLLED-STATE-TARGET §3.4); its
  // Changed never fires for it. The React printer's five bodies, the same five.
  for (const sync of plan.syncEffects) {
    const src = expr(sync.source);
    if (src === undefined || !stateByName.has(sync.stateName)) {
      lose(plan.rootId ?? '', `a value wired into ${sync.stateName} reads ${describe(sync.source)}, which the HTML target does not print yet`);
      continue;
    }
    const set = `${member('state', sync.stateName)}.set`;
    const empty = js(sync.empty === undefined ? null : sync.empty);
    const bodies: Record<string, { say: string; lines: string[] }> = {
      checkbox: { say: 'a checkbox: true or false, always', lines: [`${set}(!!arrival);`] },
      slider: {
        say: `a slider: nothing for an empty value, kept between ${sync.min} and ${sync.max}`,
        lines: ["if (arrival === undefined || arrival === null || arrival === '') return;", 'const next = Number(arrival);', 'if (!Number.isFinite(next)) return;', `${set}(Math.min(${sync.max}, Math.max(${sync.min}, next)));`]
      },
      dropdown: { say: 'a dropdown: no value picks nothing, null changes nothing', lines: ['if (arrival === null) return;', `${set}(arrival === undefined ? '' : String(arrival));`] },
      textinput: { say: 'a text field: no value changes nothing, null empties it', lines: ['if (arrival === undefined) return;', `${set}(arrival === null ? '' : String(arrival));`] }
    };
    const cast = sync.coerce === 'variable-string' ? 'String(arrival)' : sync.coerce === 'variable-boolean' ? 'Boolean(arrival)' : 'arrival';
    const body =
      bodies[sync.coerce] ??
      (sync.coerce === 'variable-number'
        ? { say: `a Variable: no value changes nothing, null stores ${empty}`, lines: ['if (arrival === undefined) return;', `if (arrival === null) return ${set}(${empty});`, 'const next = Number(arrival);', `${set}(Number.isNaN(next) ? ${empty} : next);`] }
        : { say: `a Variable: no value changes nothing, null stores ${empty}`, lines: ['if (arrival === undefined) return;', `${set}(arrival === null ? ${empty} : ${cast});`] });
    logic.push(`  // ${sync.stateName} follows its wire, as ${body.say}. Its Changed does not fire.`, '  l.watch(function () {', `    return [${src}];`, '  }, function (arrival) {', ...body.lines.map((b) => `    ${b}`), '  });');
  }
  // A Value Changed: its chain runs whenever its Input becomes a different value, the first arrival too (EXP-011 §39).
  for (const vc of plan.valueChangedEffects) {
    const watched = expr(vc.watch);
    const body = watched === undefined ? undefined : chain(vc.nodeId, 'Changed', vc.actions, '    ');
    if (watched === undefined) lose(vc.nodeId, `its Input reads ${describe(vc.watch)}, which the HTML target does not print yet`);
    if (body === undefined) continue;
    logic.push(`  // ${vc.comment}`, '  let ' + vc.lastLocal + ';', '  l.watch(function () {', `    return [${watched}];`, '  }, function (arrival) {', `    if (${vc.lastLocal} === arrival) return;`, `    ${vc.lastLocal} = arrival;`, ...body, '  });');
  }
  // A signal the parent sends in: its chain runs once for each pulse sent, never twice (P18-S126-INSIGNAL).
  for (const pulse of plan.inputPulses) {
    if (!valueProps.includes(pulse.port)) continue;
    const body = chain(plan.rootId ?? '', `signal input "${pulse.port}"`, pulse.actions, '    ');
    if (body === undefined) continue;
    const read = member('input', pulse.port);
    logic.push(
      `  // "${pulse.port}", a signal the parent sends in: its chain runs once for each pulse sent, never twice.`,
      `  l.watch(function () {`,
      `    return [${read}.get()?.sent];`,
      `  }, function () {`,
      `    const pulse = ${read}.get();`,
      `    if (pulse === undefined || pulse.taken.current === pulse.sent) return;`,
      `    pulse.taken.current = pulse.sent;`,
      ...body,
      `  });`
    );
  }
  // P18-S119-TICKEDRUN. A Function that runs when a ticked input gets a new value (and, with nothing sending its Run, at load).
  for (const t of plan.tickedRuns) {
    const def = fnByNode[t.nodeId];
    const watch = t.watch.map((w) => expr(w));
    const body = def ? chain(t.nodeId, 'ticked inputs', [t.action], t.atLoad ? '      ' : '      ') : undefined;
    if (!def || body === undefined || watch.some((w) => w === undefined)) {
      if (def && body !== undefined) lose(t.nodeId, 'the inputs it runs again on read a value the HTML target does not print yet');
      continue;
    }
    const names = useFunction(def);
    imports.run.add('tickedArrival');
    const values = `[${watch.join(', ')}]`;
    logic.push(`  // ${t.comment}`, `  l.watch(function () {`, `    return ${values};`, `  }, function () {`);
    if (t.atLoad) {
      logic.push(
        `    const runNow = function () {`,
        `      ${names.loaded} = true;`,
        ...body,
        `    };`,
        `    if (tickedArrival(${names.held}, ${values})) {`,
        `      runNow();`,
        `      return;`,
        `    }`,
        `    if (${names.loaded}) return;`,
        `    const atLoad = setTimeout(function () {`,
        `      if (!${names.loaded}) runNow();`,
        `    });`,
        `    return function () {`,
        `      clearTimeout(atLoad);`,
        `    };`
      );
    } else {
      logic.push(`    if (!tickedArrival(${names.held}, ${values})) return;`, ...body.map((b) => b.slice(2)));
    }
    logic.push(`  });`);
  }

  // ---- the module ---------------------------------------------------------------------------------------------

  const tree = plan.rootId ? draw(plan.rootId, 'element', 'before', '  ') : [];
  const rootLocal = plan.rootId ? localOf.get(plan.rootId) : undefined;
  const rootIsConditional = plan.rootId !== null && plan.bindings[plan.rootId]?.mounted !== undefined;

  // What this printer reads in the plan and does not print yet: each a named loss, never a silent drop.
  const UNPRINTED: Array<[keyof ComponentPlan, string]> = [
    ['branchEffects', 'a Condition that tests again on every change (HTX-002)'],
    ['queries', 'a backend query (HTX-004)'],
    ['mutations', 'a record write (HTX-004)'],
    ['receivers', 'an Event Receiver'],
    ['streams', 'a streaming node'],
    ['styleSheets', 'a CSS Definition'],
    ['popups', 'a popup slot']
  ];
  for (const [field, what] of UNPRINTED) {
    const v = plan[field] as unknown;
    const count = Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0;
    if (count > 0) lose(plan.rootId ?? '', `${count} × ${what}, not printed by the HTML target yet`);
  }
  // A States node: its machine (the React export's own, `lib/states.js`), its signal outputs' chains, its wired State.
  const machines: string[] = [];
  const follows: string[] = [];
  for (const m of plan.statesMachines) {
    imports.states.add('statesNode');
    const listeners: string[] = [];
    const { stateChanged, reached, done, unchanged, failure } = m.listeners;
    const arm = (port: string, list: HandlerAction[] | undefined, pad: string): string | undefined => (list === undefined ? undefined : callback(m.nodeId, port, list, pad));
    const one = (name: string, list: HandlerAction[] | undefined) => {
      const fn = arm(name, list, '    ');
      if (fn !== undefined) listeners.push(`    ${name}: ${fn}`);
    };
    one('stateChanged', stateChanged);
    const reachedArms = Object.entries(reached)
      .map(([st, list]) => [st, arm(`Has Reached ${st}`, list, '      ')] as const)
      .filter((x): x is readonly [string, string] => x[1] !== undefined);
    if (reachedArms.length) listeners.push(`    reached: {\n${reachedArms.map(([st, fn]) => `      ${key(st)}: ${fn}`).join(',\n')}\n    }`);
    one('done', done);
    one('unchanged', unchanged);
    one('failure', failure);
    const start = m.start !== undefined ? js(m.start) : 'undefined';
    machines.push(
      `  // ${m.comment}`,
      `  const ${m.local} = statesNode(${m.constName}, ${start}${listeners.length ? `, {\n${listeners.join(',\n')}\n  }` : ''});`,
      `  l.add(${m.local}.stop);`
    );
    if (m.follow) {
      const v = expr(m.follow);
      if (v === undefined) lose(m.nodeId, `its State is wired from ${describe(m.follow)}, which the HTML target does not print yet`);
      else follows.push(`  // ${nodeById.get(m.nodeId)?.authoredLabel ?? m.local}: in the state its wired value names.`, '  l.watch(function () {', `    return [${v}];`, '  }, function (named) {', `    ${m.local}.follow(named);`, '  });');
    }
  }

  // The Expressions it reads, as functions of their inputs (the React printer's wrapper, its types taken out).
  for (const def of usedFunctions.values()) if (def.kind === 'expression') moduleHead.push(...expressionJs(def), '');

  const head: string[] = [];
  for (const sd of plan.staticData) {
    head.push(`/** ${nodeById.get(sd.nodeId)?.authoredLabel ?? sd.constName}: the rows as they were written in NodeGX. */`, `const ${sd.constName} = Object.freeze(${JSON.stringify(sd.rows, null, 2).replace(/\n/g, '\n')});`, '');
  }
  const curve = (c: { curve: number[]; dur: number; delay: number }): string => `{ curve: [${c.curve.join(', ')}], dur: ${c.dur}, delay: ${c.delay} }`;
  const curves = (cs: Record<string, { curve: number[]; dur: number; delay: number }>): string => `{ ${Object.entries(cs).map(([st, c]) => `${key(st)}: ${curve(c)}`).join(', ')} }`;
  for (const m of plan.statesMachines) {
    imports.states.add('defineStates');
    head.push(`/** ${m.comment.replace(/\*\//g, '* /')} */`, `const ${m.constName} = defineStates({`, `  states: [${m.states.map(js).join(', ')}],`, '  values: {');
    m.values.forEach((v, i) => {
      const byState = `{ ${m.states.map((st) => `${key(st)}: ${js(v.byState[st])}`).join(', ')} }`;
      const transitions = Object.keys(v.transitions).length > 0 ? `, transitions: ${curves(v.transitions)}` : '';
      head.push(`    ${key(v.name)}: { type: ${js(v.type)}, byState: ${byState}${transitions} }${i < m.values.length - 1 ? ',' : ''}`);
    });
    head.push('  },');
    if (Object.keys(m.transitions).length > 0) head.push(`  transitions: ${curves(m.transitions)},`);
    head.push(`  useTransitions: ${m.useTransitions}`, '});', '');
  }

  const state: string[] = [];
  for (const s of plan.stateVars) {
    imports.dom.add('keep');
    state.push(`    ${key(s.name)}: keep(${s.boot === null ? 'undefined' : js(s.boot)}), // ${s.comment.split('\n')[0]}`);
  }
  if (valueProps.length > 0) {
    imports.dom.add('keep');
    imports.core.add('batch');
  }
  const pulsesTaken = plan.instancePulses.map((p) => `  const ${p.takenLocal} = { current: 0 }; // how many "${p.port}" pulses ${nodeById.get(p.nodeId)?.authoredLabel ?? p.nodeId} has acted on`);

  // Each Function it runs, in its own file: the body as written, in the wrapper every export gives it (EXP-019).
  const fnImports: string[] = [];
  for (const def of usedFunctions.values()) {
    if (def.kind !== 'function') continue;
    const path = `functions/${file.dir ? `${file.dir}/` : ''}${file.fileBase}/${def.fnName}.js`;
    functions[path] = functionFileJs(plan.path, def);
    fnImports.push(`import { ${def.fnName} } from '${relative(file.dir, path)}';`);
  }

  const lines: string[] = [];
  lines.push(`// @nodegx:generated by \`nodegx export --target html\` — ${plan.path}.`);
  if (imports.core.size) lines.push(`import { ${[...imports.core].sort().join(', ')} } from '${relative(file.dir, 'lib/core.js')}';`);
  lines.push(`import { ${[...imports.dom].sort().join(', ')} } from '${relative(file.dir, 'lib/dom.js')}';`);
  if (imports.run.size) lines.push(`import { ${[...imports.run].sort().join(', ')} } from '${relative(file.dir, 'lib/functionRun.js')}';`);
  if (imports.router.size) lines.push(`import { ${[...imports.router].sort().join(', ')} } from '${relative(file.dir, 'lib/router.js')}';`);
  if (imports.states.size) lines.push(`import { ${[...imports.states].sort().join(', ')} } from '${relative(file.dir, 'lib/states.js')}';`);
  for (const [mod, names] of [...childImports].sort(([a], [b]) => a.localeCompare(b))) lines.push(`import { ${[...names].sort().join(', ')} } from '${relative(file.dir, mod)}';`);
  if (variableImports.size) lines.push(`import * as variables from '${relative(file.dir, 'variables.js')}';`);
  lines.push(...fnImports.sort());
  lines.push('');
  lines.push(...moduleHead);
  lines.push(...head);
  lines.push('/**');
  lines.push(` * ${plan.docComment ?? (plan.role === 'page' ? `The page "${plan.head?.title ?? file.fileBase}".` : `${file.symbol}.`)}`);
  lines.push(' *');
  lines.push(plan.hook ? ' * It draws nothing: `element` is not used. `inputs` are what the component that places it sets:' : ' * Draws into `element` (before `before`, when given). `inputs` are what the parent sets:');
  lines.push(` * ${valueProps.length ? valueProps.map((p) => `\`${p}\``).join(', ') : 'none'}${callbackProps.size ? `, and the callbacks ${[...callbackProps].map((p) => `\`${p}\``).join(', ')}` : ''}.`);
  lines.push(' * Returns `update(inputs)` to change them, `outputs`, and `destroy()` to take it off the page.');
  lines.push(' */');
  lines.push(`export function ${mount}(element, inputs = {}, before) {`);
  lines.push('  const l = life();');
  lines.push('  const given = Object.assign({}, inputs);');
  if (valueProps.length) lines.push(`  const input = { ${valueProps.map((p) => `${key(p)}: keep(inputs[${js(p)}])`).join(', ')} };`);
  if (state.length) lines.push('  const state = {', ...state, '  };');
  lines.push(...pulsesTaken);
  if (plan.role === 'page' && plan.head?.title) lines.push(`  document.title = ${js(plan.head.title)};`);
  lines.push(...nodeLines);
  lines.push(...machines);
  lines.push('');
  lines.push(...hookLines);
  lines.push(...logic);
  if (hookLines.length || logic.length) lines.push('');
  lines.push(...follows);
  if (follows.length) lines.push('');
  lines.push(...tree);
  if (mounted.length) lines.push('', ...mounted);
  lines.push('');
  lines.push('  return {');
  lines.push('    update(next) {');
  lines.push('      Object.assign(given, next);');
  if (valueProps.length) {
    lines.push('      batch(function () {');
    for (const p of valueProps) lines.push(`        if (${js(p)} in next) ${member('input', p)}.set(next[${js(p)}]);`);
    lines.push('      });');
  }
  lines.push('    },');
  lines.push('    outputs: {},');
  lines.push('    destroy() {');
  lines.push('      l.destroy();');
  if (rootLocal && !rootIsConditional) lines.push(`      ${rootLocal}.remove();`);
  lines.push('    }');
  lines.push('  };');
  lines.push('}');
  lines.push('');
  const css = `/* @nodegx:generated — ${plan.path}: one class per node, named <Component>-<node>. */\n\n${cssBlocks.join('\n\n')}\n`;
  return { mount, usesStates: imports.states.size > 0, js: lines.join('\n'), css, functions, losses };
}

/**
 * A Function node's file: its body verbatim inside the wrapper the React and Swift exports give it (EXP-019): `Inputs`,
 * `Outputs` (its signals are functions on it), `this` (what it keeps across runs), and `Component`.
 */
export function functionFileJs(component: string, def: JsFunctionPlan): string {
  const signals = def.signals.length ? `{ ${def.signals.map((sig) => `${key(sig)}() {}`).join(', ')} }` : '{}';
  return [
    `// @nodegx:generated by \`nodegx export --target html\` — the Function node "${def.fnName}" (node ${def.nodeId}) of ${component}.`,
    '// The body is as it was written in NodeGX. It reads `Inputs`, writes `Outputs`, and keeps what it puts on `this`.',
    `export function ${def.fnName}(Inputs, Outputs = ${signals}, self = {}, Component) {`,
    '  try {',
    '    (function () {',
    ...def.body.split('\n'),
    '    }).call(self);',
    '  } catch (e) {',
    `    console.error(${js(`Function node ${def.fnName} threw:`)}, e);`,
    '  }',
    '  return Outputs;',
    '}',
    ''
  ].join('\n');
}

/** An Expression node as a function of its inputs: the React printer's wrapper (`component.ts`), its types taken out. */
function expressionJs(def: JsFunctionPlan): string[] {
  const lines = [`// The Expression "${def.fnName}", as it was written.`, `function ${def.fnName}(${def.inputs.length ? 'inputs' : ''}) {`];
  if (def.inputs.length) lines.push(`  const { ${def.inputs.map((i) => i.name).join(', ')} } = inputs;`);
  for (const alias of def.mathAliases) lines.push(alias === 'pi' ? '  const pi = Math.PI;' : `  const ${alias} = Math.${alias};`);
  const gate = def.loadGate;
  const unsetTest = gate !== undefined ? gate.unset.map((n) => `${n} === undefined`).join(' && ') : '';
  if (gate?.atLoad === 'wait') lines.push('  // Evaluate At Load is unticked: no answer until an input arrives.', `  if (${unsetTest}) return null;`);
  if (gate?.atLoad === 'evaluate' && gate.unset.length === 0) {
    lines.push('  // Nothing feeds its inputs: the load evaluation over them, which keeps null for a throw or a NaN.', '  try {', `    const value = (${def.body});`, '    return Number.isNaN(value) ? null : value;', '  } catch (e) {', '    return null;', '  }');
  } else if (gate?.atLoad === 'evaluate') {
    lines.push(
      '  // Until an input arrives this is the load evaluation, which keeps null for a throw or a NaN.',
      `  const unset = ${unsetTest};`,
      '  try {',
      `    const value = (${def.body});`,
      '    return unset && Number.isNaN(value) ? null : value;',
      '  } catch (e) {',
      '    if (unset) return null;',
      `    console.error(${js(`Expression node ${def.fnName} threw:`)}, e);`,
      '    return 0;',
      '  }'
    );
  } else {
    lines.push('  try {', `    return (${def.body});`, '  } catch (e) {', `    console.error(${js(`Expression node ${def.fnName} threw:`)}, e);`, '    return 0;', '  }');
  }
  lines.push('}');
  return lines;
}

/** A path from a module in `dir` to `target`, both relative to the output root. */
export function relative(dir: string, target: string): string {
  const depth = dir === '' ? 0 : dir.split('/').length;
  return `${depth === 0 ? './' : '../'.repeat(depth)}${target}`;
}

/** An expression in a few words, for a loss. */
function describe(e: ValueExpr): string {
  return `a ${e.kind} value`;
}
