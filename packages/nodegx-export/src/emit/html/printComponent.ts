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
import { INPUT_PULSE_TS_TYPE, type QueryPlan, type BindingSource, type ComponentPlan, type HandlerAction, type JsFunctionPlan, type ProjectPlan, type ValueExpr } from '../../analyze/plan';
import { computeNodeStyle, computeRoleCss, WIRED_STYLE_SINKS, type Decl, type StyleRole } from '../style';
import { assignClassNames, camelCase, isReservedWord, lowerFirst, type ClassCandidate } from '../naming';
// 🔴 A decision the React printer holds, not the plan (P134-HTX001-PRINTERDECIDES): which element a node's `as` names.
import { authoredTag, PRESET_MARKERS } from '../component';
// 🔴 HTX-004, the same: the query's call, its wired `where`, when it asks, and the code each verb raises its failure under.
import { API_CALL_ERROR_CODES, queryHasEffect, queryParamsLiteral, wiredWhereExpr } from '../component';

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
  /** A Global Store's name → its export in `stores/<export>.js`, or undefined where the plan defers it. */
  storeOf: (name: string) => string | undefined;
  /** A navigate action's `to` (a page's url path) → the router path it shows, or undefined for no such page. */
  routeOf: (urlPath: string) => string | undefined;
  /** HTX-004. The React export writes `src/lib/noodl.ts`, so `lib/noodl.js` is carried: a body's Noodl members travel. */
  noodlClient?: boolean;
  /** HTX-004. A backend collection's declared columns, by its class name (the project's schema snapshot). */
  columnsOf?: (collection: string) => string[];
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
  /** HTX-004. Something printed into this function body awaits (a record verb's answer): the body is then `async`. */
  awaits: { used: boolean };
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
  /**
   * HTX-006. What the component sends out, as a page that is not NodeGX reads it: `outputs.<port>` (the port's name as
   * written), a `value` for a value output (its last value, `subscribe` for each one after) and a `signal` for a signal
   * output (`subscribe` for each pulse). The parent's callbacks in `inputs` are called first, as before.
   */
  const outPort = new Map<string, { port: string; kind: 'value' | 'signal' }>([
    ...plan.outputProps.map((o) => [o.prop, { port: o.port, kind: 'signal' as const }] as const),
    ...plan.liftedOutputProps.map((o) => [o.prop, { port: o.port, kind: 'value' as const }] as const)
  ]);
  const sendOut = (prop: string, arg: string): string => {
    const out = outPort.get(prop);
    const call = `if (${member('given', prop)}) ${member('given', prop)}(${arg});`;
    if (out === undefined) return call;
    return `${call} ${member('outputs', out.port)}.${out.kind === 'signal' ? 'emit()' : `set(${arg})`};`;
  };
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
  /**
   * HTX-004. A body's Noodl is the client's (`lib/noodl.js`, the React export's own) with each Variable it names over the
   * app's: carried where every Variable it names is kept, and the client exists for the members past `Variables`.
   */
  const noodlCarried = (def: JsFunctionPlan): boolean =>
    def.noodl === undefined || (def.noodl.variables.every((v) => ctx.variableOf(v) !== undefined) && (def.noodl.members.every((m) => m === 'Variables') || ctx.noodlClient === true));
  /** The Functions this component calls, by node: the import, and each one's file. */
  const usedFunctions = new Map<string, JsFunctionPlan>();
  /** The module-level lines: an Expression's function. */
  const moduleHead: string[] = [];
  /** Lines inside the mount, before the drawing: the kept nodes, the render runs. */
  const nodeLines: string[] = [];
  const memoOf = new Map<string, string>();
  /** P134 session 10. The Screen Resolution nodes this component reads, by their local: each kept once per part. */
  const screenLocals = new Set<string>();
  /** The app's Variables this component reads or writes: imported from `variables.js`. */
  const variableImports = new Set<string>();
  const variable = (name: string): string | undefined => {
    const exported = ctx.variableOf(name);
    if (exported === undefined) return undefined;
    variableImports.add(exported);
    return member('variables', exported);
  };
  /** The Global Stores this component reads or writes: each imported from its own `stores/<name>.js`, as React's are. */
  const storeImports = new Set<string>();
  const storeOf = (name: string): string | undefined => {
    const exported = ctx.storeOf(name);
    if (exported !== undefined) storeImports.add(exported);
    return exported;
  };
  /**
   * A store key read where the page draws: React's `useStore(desk, (s) => s.app)`, one local per key at the top of the
   * component, which tells its readers only when that key's value is a different one (`storeKey` in `lib/dom.js`).
   */
  const keyLines: string[] = [];
  const keyLocals = new Map<string, string>();
  const storeKeyRead = (storeName: string, k: string, scope: Scope): string | undefined => {
    const store = storeOf(storeName);
    if (store === undefined) return undefined;
    // In a chain, the store as it is now (React's handler reads `desk.get().app`).
    if (!scope.top) return member(`${store}.get()`, k);
    const id = `${storeName}\u0000${k}`;
    let local = keyLocals.get(id);
    if (local === undefined) {
      local = fresh(`${store}${k.charAt(0).toUpperCase()}${camelCase(k).slice(1)}`);
      keyLocals.set(id, local);
      imports.dom.add('storeKey');
      keyLines.push(`  const ${local} = storeKey(l, ${store}, ${js(k)}); // the store "${storeName}"'s ${js(k)}, as this component reads it`);
    }
    return `${local}.get()`;
  };

  // ---- the styles: one class per styled node, named the way the React export names its classes ------------------

  const order: string[] = [];
  const walk = (id: string) => {
    order.push(id);
    for (const c of plan.childrenOf[id] ?? []) walk(c);
  };
  if (plan.rootId) walk(plan.rootId);
  const styled = order.filter((id) => ['page', 'group', 'text', 'button', 'input', 'checkbox', 'range'].includes(plan.roleOf[id]));
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
    // A checkbox's label wrapper is drawn (`drawNode`); the columns' query container is not yet.
    if (roleCss.wrapper && roleCss.wrapper.role !== 'label') lose(id, `its ${roleCss.wrapper.role} wrapper is not drawn by the HTML target yet`);
    if (roleCss.containerQueries.length > 0) lose(id, 'its breakpoints are not carried by the HTML target yet');
    roleCssOf.set(id, roleCss);
  }
  const candidates: ClassCandidate[] = [];
  const classed: string[] = [];
  for (const id of styled) {
    if (declsOf.get(id)!.length === 0 && roleCssOf.get(id)!.blocks.length === 0 && roleCssOf.get(id)!.wrapper === undefined) continue;
    candidates.push({ nodeIds: [id], label: nodeById.get(id)!.authoredLabel, role: plan.roleOf[id] });
    classed.push(id);
  }
  const names = assignClassNames(candidates);
  const classOf = new Map(classed.map((id, i) => [id, `${file.symbol}-${names[i]}`]));
  /*
   * A control's label wrapper, named after the class it accompanies, as the React printer names it (`component.ts`
   * "Companion classes", copied, P134-HTX001-PRINTERDECIDES): `<class>Label`, or `<class>Label2`… when that is taken.
   */
  const wrapperClassOf = new Map<string, string>();
  {
    const used = new Set(classOf.values());
    for (const id of classed) {
      if (roleCssOf.get(id)!.wrapper?.role !== 'label') continue;
      const base = `${classOf.get(id)}Label`;
      let name = base;
      let n = 2;
      while (used.has(name)) name = `${base}${n++}`;
      used.add(name);
      wrapperClassOf.set(id, name);
    }
  }
  const cssBlocks: string[] = [];
  for (const id of classed) {
    const cls = classOf.get(id)!;
    const label = nodeById.get(id)!.authoredLabel;
    const body = declsOf.get(id)!.map((d) => `  ${d.prop}: ${d.value};`).join('\n');
    cssBlocks.push(`${label ? `/* ${label.replace(/\*\//g, '* /')} */\n` : ''}.${cls} {\n${body}\n}`);
    for (const block of roleCssOf.get(id)!.blocks) cssBlocks.push(`.${cls}${block.suffix} {\n${block.decls.map((d) => `  ${d.prop}: ${d.value};`).join('\n')}\n}`);
    const wrapper = wrapperClassOf.get(id);
    if (wrapper !== undefined) cssBlocks.push(`.${wrapper} {\n${roleCssOf.get(id)!.wrapper!.decls.map((d) => `  ${d.prop}: ${d.value};`).join('\n')}\n}`);
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

  const taken = new Set(['session', 'followSession', 'raiseAppError', 'filterValue', 'variables', 'input', 'state', 'given', 'element', 'inputs', 'before', 'l', 'into', 'at', 'item', 'index', 'row', 'batch', 'life', 'el', 'show', 'truthy', 'keep', 'bindText', 'bindAttr', 'bindStyle', 'when', 'place', 'list', 'navigate', 'value', 'derived', 'functionNode', 'runFunction', 'tickedArrival', 'pulse', mount]);
  // A store's module is imported under its own name (React's `import { desk } from '../stores/desk'`): no local takes it.
  for (const st of ctx.project.stores) if (st.deferred === undefined) taken.add(st.exportName);
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
      if (def.noodl !== undefined && !noodlCarried(def)) lose(def.nodeId, `the Function "${def.fnName}" reads Noodl (${[...def.noodl.members, ...def.noodl.variables].join(', ')}), which this export does not carry`);
      if (def.component) lose(def.nodeId, `the Function "${def.fnName}" reads Component.Object, which the HTML target does not hand it yet`);
      if (def.scripts?.length) lose(def.nodeId, `the Function "${def.fnName}" uses script files, which the HTML target does not carry yet`);
    }
    return names;
  };

  // ---- fields ---------------------------------------------------------------------------------------------------

  /*
   * P18-S128-FIELDSET (EXP-011 §97), as the React printer reads it (`component.ts` `fieldRefs`, copied,
   * P134-HTX001-PRINTERDECIDES). A field a Focus, a Blur or a Set acts on is held in a ref, `{ current }`, set while the
   * field is on the page (a Set asks whether it has focus, as the runtime's does). A field that is both Set and Cleared
   * keeps, in a second ref, whether a Clear has run since its Value was last delivered: the runtime's Set writes
   * `_internal.text`, which the Clear empties and the next delivery fills.
   */
  /** HTX-004. Something here reads who is signed in: one `session` value for the component. */
  let usesSession = false;
  const fieldActions: HandlerAction[] = [];
  {
    const seen = new Set<object>();
    const visit = (v: unknown): void => {
      if (v === null || typeof v !== 'object' || seen.has(v)) return;
      seen.add(v);
      if (Array.isArray(v)) return v.forEach(visit);
      const a = v as { kind?: unknown; field?: unknown };
      if (a.kind === 'field-focus' || (a.kind === 'state-set' && a.field !== undefined)) fieldActions.push(v as HandlerAction);
      Object.values(v).forEach(visit);
    };
    visit(plan);
  }
  const fieldRefs = new Map<string, string>();
  const fieldSetSources = new Map<string, ValueExpr>();
  const fieldCleared = new Set<string>();
  for (const a of fieldActions) {
    const inputId = a.kind === 'field-focus' ? a.inputId : a.kind === 'state-set' && a.field?.port === 'set' ? a.field.inputId : undefined;
    if (inputId !== undefined && !fieldRefs.has(inputId)) {
      const named = lowerFirst(camelCase(nodeById.get(inputId)?.authoredLabel ?? ''));
      fieldRefs.set(inputId, fresh(/^[A-Za-z_$]/.test(named) ? `${named}FieldRef` : 'fieldRef'));
    }
    if (a.kind === 'state-set' && a.field?.port === 'set' && a.expr !== undefined) fieldSetSources.set(a.field.inputId, a.expr);
    if (a.kind === 'state-set' && a.field?.port === 'clear') fieldCleared.add(a.field.inputId);
  }
  const fieldClearedLocals = new Map<string, string>();
  for (const inputId of fieldCleared) {
    if (!fieldSetSources.has(inputId)) continue;
    fieldClearedLocals.set(inputId, fresh(`${fieldRefs.get(inputId)!.replace(/FieldRef\d*$/, '')}Cleared`));
  }
  /** The field's own change chain, as its typing runs it. */
  const fieldChainOf = (inputId: string): HandlerAction[] => [...(plan.changeHandlers[inputId] ?? []), ...((plan.handlers[inputId] ?? {})['onChange'] ?? [])];
  /** The fields whose chain is being printed: a chain that Sets or Clears its own field does not run itself again. */
  const printingFieldChains = new Set<string>();
  /**
   * P18-S116-FIELDMOUNT. While a field's chain is printed, a read of the field's text is this code: the text its typing
   * left in the element, or the text a Set, a Clear or the mount announcement writes. Anywhere else it has no value.
   */
  let announced: { inputId: string; code: string } | undefined;
  /** P134 HTX-003. While a checkbox's change chain is printed, its `checked` is this code (the element's own). */
  let controlled: { controlId: string; code: string } | undefined;
  /**
   * EXP-011 §100. While a For Each's row callback is printed, a read of that For Each's relayed value is what the row is
   * handed for the input the value passes through (the React printer's `rowRelayCode`).
   */
  let relayed: { repeaterId: string; read: (input: string) => string } | undefined;

  // ---- values ---------------------------------------------------------------------------------------------------

  const TOP: Scope = { top: true, runs: new Map(), pulses: new Map(), declared: new Set(), awaits: { used: false } };
  const chainScope = (): Scope => ({ top: false, runs: new Map(), pulses: new Map(), declared: new Set(), awaits: { used: false } });
  /**
   * HTX-004. A chain that awaits, as one statement wherever it is printed: React's `async` handler, which runs at once up to
   * its first `await` and the rest when the answer arrives. Printed as `void (async function () { … })();`.
   */
  const asyncBody = (lines: string[], pad: string): string[] => [`${pad}void (async function () {`, ...lines.map((l) => `  ${l}`), `${pad}})();`];
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
      case 'store-key-get':
        return storeKeyRead(e.storeName, e.key, scope);
      case 'input-text':
        return announced?.inputId === e.inputId ? announced.code : undefined;
      // A control's own value, read inside its own change listener (React's `event.target.checked`).
      case 'control-event':
        // HTX-006. A slider's, as a number (React's `Number(event.target.value)`).
        if (controlled?.controlId !== e.controlId) return undefined;
        return e.form === 'number' ? `Number(${controlled.code})` : e.form === 'checked' ? controlled.code : undefined;
      case 'row-relay':
        return relayed?.repeaterId === e.repeaterId ? relayed.read(e.input) : 'undefined';
      // HTX-004. Who is signed in: `lib/session.js`'s value, React's `useSession()` (one per component).
      case 'session-get': {
        usesSession = true;
        return e.field === 'authenticated' ? 'session.get().authenticated' : `session.get().user?.${e.field}`;
      }
      // HTX-004. A Cloud Function's result or Error: its row anywhere, the chain's own answer or message inside it.
      case 'cloud-out': {
        const names = plan.cloudCalls.find((c) => c.nodeId === e.nodeId);
        if (names === undefined) return undefined;
        if (e.output === 'error') return e.viaState !== undefined ? (stateByName.has(e.viaState) ? `${member('state', e.viaState)}.get()` : undefined) : scope.declared.has(names.messageLocal) ? names.messageLocal : undefined;
        const field = e.output.slice('out-'.length);
        if (e.viaState !== undefined) return stateByName.has(e.viaState) ? maybe(`${member('state', e.viaState)}.get()`, field) : undefined;
        return scope.declared.has(names.answerLocal) ? member(names.answerLocal, field) : undefined;
      }
      // HTX-004. A query's rows: the row it last answered, in a chain as in the drawing.
      case 'query-get':
        return plan.queries.some((q) => q.stateName === e.stateName) ? `${member('state', e.stateName)}.get()` : undefined;
      // HTX-004 (P18-EXP022-S4-ADDREFUSED). A Create's Id: its row, or inside its Done chain the answer's own.
      case 'verb-id':
        if (e.viaState !== undefined) return stateByName.has(e.viaState) ? `${member('state', e.viaState)}.get()` : undefined;
        return scope.declared.has(e.local) ? `${e.local}.id` : undefined;
      case 'static-rows':
        // The authored rows, a constant above the component (STATIC-DATA-TARGET §3): `allowEditOnly`, so nothing changes them.
        return plan.staticData.some((d) => d.constName === e.constName) ? e.constName : undefined;
      case 'screen-out': {
        /*
         * P134 session 10. Screen Resolution, as the React export's `lib/screen.ts` reads it: the window in CSS pixels, read
         * when the part is made and again on every resize, the listener removed when the part goes. Found once SELECTREFUSED
         * let todo-list's "One pane or two?" through: its width was the one input this printer could not read.
         */
        if (!screenLocals.has(e.local)) {
          screenLocals.add(e.local);
          imports.dom.add('keep');
          const label = nodeById.get(e.nodeId)?.authoredLabel ?? e.nodeId;
          const resize = fresh(`${e.local}Resize`);
          const read = '{ width: window.innerWidth, height: window.innerHeight, aspectRatio: window.innerWidth / window.innerHeight }';
          nodeLines.push(
            `  // "${label}" (Screen Resolution): the window's size in CSS pixels, read now and again on every resize.`,
            `  const ${e.local} = keep(${read});`,
            `  const ${resize} = function () {`,
            `    ${e.local}.set(${read});`,
            '  };',
            `  window.addEventListener('resize', ${resize});`,
            '  l.add(function () {',
            `    window.removeEventListener('resize', ${resize});`,
            '  });'
          );
        }
        return `${e.local}.get().${e.field}`;
      }
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
    else if (source.kind === 'store-key') {
      const code = storeKeyRead(source.storeName, source.key, TOP);
      if (code !== undefined) return code;
      lose(id, `its ${port} reads the Global Store "${source.storeName}", which the plan defers`);
    }
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

  /** HTX-004. Where each backend function comes from: a record verb's class module, or the one session module. */
  const apiModuleOf = (nodeId: string): string | undefined => {
    const m = plan.mutations.find((x) => x.nodeId === nodeId);
    if (m !== undefined) return `api/${m.moduleBase}.js`;
    if (plan.sessionCalls.some((x) => x.nodeId === nodeId)) return 'api/session.js';
    return undefined;
  };
  const useImport = (file: string, name: string): void => {
    const names = childImports.get(file) ?? new Set<string>();
    names.add(name);
    childImports.set(file, names);
  };
  /** A query's call: `fetchTasks({ sort: ['title'], limit: 100 })`, a wired filter's `where` from `values`. */
  const queryCall = (q: QueryPlan, values: Array<{ name: string; expr: ValueExpr }>, scope: Scope): string => {
    useImport(`api/${q.moduleBase}.js`, q.fetchName);
    const wired = q.params?.wired;
    if (q.params === undefined) return `${q.fetchName}()`;
    if (wired === undefined) return `${q.fetchName}(${queryParamsLiteral(q.params)})`;
    const codes = values.map((v) => {
      const code = expr(v.expr, scope);
      if (code === undefined) throw new Unprinted(`a query filter value from ${describe(v.expr)}, which the HTML target does not print yet`);
      return code;
    });
    const codeOf = (name: string) => codes[values.findIndex((v) => v.name === name)];
    const tested = codes.map((code) => (/^[\w$.]+$/.test(code) ? code : `(${code})`));
    if (q.wiredClient) useImport('api/client.js', 'filterValue');
    const valueCode = (name: string, date: boolean) => (q.wiredClient ? `filterValue(${codeOf(name)}${date ? ', true' : ''})` : codeOf(name));
    return `${q.fetchName}(${queryParamsLiteral(q.params, wiredWhereExpr(wired, tested, valueCode))})`;
  };
  /** The raise a failure arm makes on the error channel, with the provenance the runtime fills in (the React printer's `raiseLine`). */
  const raiseLine = (nodeId: string, code: string, message: string): string => {
    useImport('lib/errors.js', 'raiseAppError');
    return `raiseAppError({ code: ${js(code)}, message: ${message}, nodeId: ${js(nodeId)}, nodeType: ${js(nodeById.get(nodeId)?.type ?? '<runtime>')}, componentName: ${js(plan.legacyPath)} });`;
  };
  const apiCall = (a: Extract<HandlerAction, { kind: 'api-call' }>, pad: string, scope: Scope): string[] => {
    const module = apiModuleOf(a.nodeId);
    if (module === undefined) throw new Unprinted(`a ${a.verb} call the plan names no module for`);
    const errorRow = stateByName.get(a.errorState);
    if (errorRow === undefined) throw new Unprinted(`a ${a.verb} call whose Error the plan does not keep`);
    useImport(module, a.fnName);
    const args = a.args.map((arg) => {
      if (arg.kind === 'expr') {
        const code = expr(arg.expr, scope);
        if (code === undefined) throw new Unprinted(`a ${a.verb} call reading ${describe(arg.expr)}, which the HTML target does not print yet`);
        return code;
      }
      const entries = arg.props.map((p) => {
        const code = expr(p.expr, scope);
        if (code === undefined) throw new Unprinted(`a ${a.verb} call writing ${p.key} from ${describe(p.expr)}, which the HTML target does not print yet`);
        return key(p.key) === code ? code : `${key(p.key)}: ${code}`;
      });
      return entries.length ? `{ ${entries.join(', ')} }` : '{}';
    });
    if (a.coerceId === 'string') args[0] = `String(${args[0]} ?? '')`;
    const inner = `${pad}  `;
    const body: string[] = [];
    // The Id is read once (P18-S113-IDREADTWICE), as the runtime reads the value its setter stored.
    if (a.guardId && a.coerceId !== 'string' && args[0].endsWith(')')) {
      const bound = a.errorState.replace(/Error$/, '') + 'RecordId';
      body.push(`${inner}const ${bound} = ${args[0]};`);
      args[0] = bound;
    }
    // The runtime's "Missing Record Id", thrown so it lands in the catch: no request, no Done.
    if (a.guardId) body.push(`${inner}if (${/^[\w$]+$/.test(args[0]) ? `!${args[0]}` : `!(${args[0]})`}) throw new Error('Missing Record Id');`);
    for (const g of a.guards ?? []) {
      body.push(`${inner}const ${g.local} = ${g.coerce === 'string' ? `String(${args[g.index]} ?? '')` : args[g.index]};`, `${inner}if (!${g.local}) throw new Error(${js(g.message)});`);
      args[g.index] = g.local;
    }
    const inScope: Scope = a.recordLocal !== undefined ? { ...scope, declared: new Set([...scope.declared, a.recordLocal]) } : scope;
    body.push(`${inner}${a.recordLocal !== undefined ? `const ${a.recordLocal} = ` : ''}await ${a.fnName}(${args.join(', ')});`);
    if (a.clearErrorOnDone === true) body.push(`${inner}${member('state', a.errorState)}.set(undefined);`);
    if (a.idState !== undefined) {
      if (!stateByName.has(a.idState)) throw new Unprinted(`a ${a.verb} call whose Id row the plan does not keep`);
      body.push(`${inner}${member('state', a.idState)}.set(${a.recordLocal}.id);`);
    }
    body.push(...block(a.then, inner, inScope));
    const message = `${a.errorState}Message`;
    return [
      `${pad}try {`,
      ...body,
      `${pad}} catch (error) {`,
      `${inner}const ${message} = error instanceof Error ? error.message : String(error);`,
      `${inner}${member('state', a.errorState)}.set(${message});`,
      `${inner}${raiseLine(a.nodeId, API_CALL_ERROR_CODES[nodeById.get(a.nodeId)?.type ?? ''] ?? 'outcome/unspecified-failure', message)}`,
      ...block(a.failThen, inner, scope),
      `${pad}}`
    ];
  };

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
    /*
     * HTX-004 (EXP-011 §90, the React printer's, copied). An awaited step a later wire of the same chain follows: its own
     * async body, so the later wires run before the answer arrives, as the runtime's do (each node acts in its turn; the
     * answer comes later). What it declares stays inside.
     */
    if ('detached' in a && a.detached === true) {
      const own: Scope = { ...scope, declared: new Set(scope.declared), awaits: { used: false } };
      return { lines: asyncBody(statement({ ...a, detached: undefined } as HandlerAction, pad, own).lines, pad), scope };
    }
    switch (a.kind) {
      /**
       * HTX-004. A Query Records' Fetch, as the React printer prints it (`component.ts` `query-fetch`, copied,
       * P134-HTX001-PRINTERDECIDES): the query's own settings, a wired filter's `where` from the values as the chain reads
       * them. Not awaited: the runtime schedules its fetch.
       */
      case 'query-fetch': {
        const q = plan.queries.find((x) => x.nodeId === a.nodeId);
        if (q === undefined) throw new Unprinted('a Fetch of a query the plan does not keep');
        return one(`void ${queryCall(q, a.values, scope)}.then(${member('state', q.stateName)}.set);`);
      }
      /**
       * HTX-004. A record verb or a user verb, awaited, as the React printer prints it (`component.ts` `api-call`,
       * copied): the call in a `try`, the Done chain after the answer, the Error row and the error channel in the `catch`,
       * then the Failure chain. `detached` (a later wire of the same press follows it): its own async body, so the later
       * wires run before the answer arrives, as the runtime's do.
       */
      case 'api-call': {
        scope.awaits.used = true;
        return { lines: apiCall(a, pad, scope), scope };
      }
      /**
       * HTX-004. A Cloud Function's Call, as the React printer prints it (`component.ts` `cloud-call`, copied): one
       * try/catch, the answer merged over the results row where something outside the chain reads a result (the runtime
       * keeps a key the function did not answer this time, EXP-011 §42), the Error row and the error channel on failure.
       */
      case 'cloud-call': {
        const names = plan.cloudCalls.find((c) => c.nodeId === a.nodeId);
        if (names === undefined || !stateByName.has(a.errorState)) throw new Unprinted('a Cloud Function call the plan does not keep');
        if (a.materialize !== undefined && !stateByName.has(a.materialize)) throw new Unprinted('a Cloud Function call whose results row the plan does not keep');
        scope.awaits.used = true;
        useImport('api/functions.js', a.fnName);
        const args = a.args.map((arg) => {
          const code = expr(arg.expr, scope);
          if (code === undefined) throw new Unprinted(`a Cloud Function call reading ${describe(arg.expr)}, which the HTML target does not print yet`);
          return code === arg.param ? code : `${key(arg.param)}: ${code}`;
        });
        const call = `await ${a.fnName}(${args.length ? `{ ${args.join(', ')} }` : ''})`;
        const answer = a.materialize !== undefined ? `{ ...${member('state', a.materialize)}.get(), ...(${call}) }` : call;
        const inner = `${pad}  `;
        const done: Scope = { ...scope, declared: new Set([...scope.declared, names.answerLocal]) };
        const failed: Scope = { ...scope, declared: new Set([...scope.declared, names.messageLocal]) };
        return {
          lines: [
            `${pad}try {`,
            `${inner}const ${names.answerLocal} = ${answer};`,
            ...(a.materialize !== undefined ? [`${inner}${member('state', a.materialize)}.set(${names.answerLocal});`] : []),
            ...block(a.then, inner, done),
            `${pad}} catch (error) {`,
            `${inner}const ${names.messageLocal} = error instanceof Error ? error.message : String(error);`,
            `${inner}${member('state', a.errorState)}.set(${names.messageLocal});`,
            `${inner}${raiseLine(a.nodeId, 'cloud-function/call-failed', names.messageLocal)}`,
            ...block(a.failThen, inner, failed),
            `${pad}}`
          ],
          scope
        };
      }
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
      case 'globalstore-set': {
        // React's `desk.set({ app: … })`: one key patched, the rest kept (the Set's Merge is the plan's to read).
        const store = storeOf(a.storeName);
        const v = expr(a.expr, scope);
        if (store === undefined || v === undefined) throw new Unprinted(`a Set of the Global Store "${a.storeName}"'s ${js(a.key)} from ${describe(a.expr)}, which the HTML target does not print yet`);
        return one(`${store}.set({ ${key(a.key)}: ${a.fallback !== undefined ? `${v} ?? ${js(a.fallback)}` : v} });`);
      }
      case 'output-signal':
        if (!callbackProps.has(a.prop)) throw new Unprinted(`a signal out through ${a.prop}, which this component does not declare`);
        return one(sendOut(a.prop, ''));
      case 'state-set': {
        const row = stateByName.get(a.name);
        if (!row) throw new Unprinted(`a write to ${a.name}, a value the plan does not keep`);
        const s = member('state', a.name);
        if (a.field !== undefined) return { lines: fieldWrite(a, a.field, pad, scope), scope };
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
        if (def.noodl !== undefined && !noodlCarried(def)) throw new Unprinted(`a run of "${def.fnName}", which reads Noodl (${[...def.noodl.members, ...def.noodl.variables].join(', ')}), which this export does not carry`);
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
        /*
         * HTX-004 (EXP-019 slice 1b, the React printer's, copied). A body that awaits: the run returns at its first `await`
         * (what it wrote and sent until then is the run's, and its signals' chains act on it), the rest of the body arrives
         * `late`, and what follows the run waits for the body to finish, as the runtime's `runScript` awaits it.
         */
        if (a.awaitsAt !== undefined) {
          let run = `${names.base}Run`;
          for (let n = 2; scope.declared.has(run) || taken.has(run); n++) run = `${names.base}Run${n}`;
          scope.declared.add(run);
          imports.run.add('runFunction');
          lines.push(`${pad}const ${run} = runFunction(${def.fnName}, ${args}, ${names.node});`);
          if (a.materialize !== undefined) lines.push(`${pad}${member('state', a.materialize)}.set({ ...${run}.outputs });`);
          const runs = new Map(scope.runs);
          runs.set(a.nodeId, run);
          const inner: Scope = { ...scope, runs };
          lines.push(...block(a.then.slice(0, a.awaitsAt), pad, inner));
          scope.awaits.used = true;
          lines.push(`${pad}await ${run}.settled;`, ...block(a.then.slice(a.awaitsAt), pad, inner));
          return { lines, scope: inner };
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
      case 'field-focus': {
        // A call on the field's element; nothing when it is not on the page (the Focus is not held, GAM-012 R13).
        const ref = fieldRefs.get(a.inputId)!;
        return one(`if (${ref}.current) ${ref}.current.${a.focus ? 'focus' : 'blur'}();`);
      }
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

  /**
   * P18-S128-FIELDSET and P18-S127-CLEAROUT (EXP-011 §97), the React printer's `fieldWriteCode` (copied,
   * P134-HTX001-PRINTERDECIDES): the write, then the field's change chain with the text written where the chain reads the
   * field. A Set is not written into a focused field (`setText`'s `hasFocus()`), and writes the Value as text: `undefined`
   * leaves the start value, `null` is `''`, a Clear since the last delivery is `''`.
   */
  const fieldWrite = (a: Extract<HandlerAction, { kind: 'state-set' }>, field: NonNullable<Extract<HandlerAction, { kind: 'state-set' }>['field']>, pad: string, scope: Scope): string[] => {
    const set = `${member('state', a.name)}.set`;
    const cleared = fieldClearedLocals.get(field.inputId);
    const chainLines = (code: string, at: string): string[] => {
      if (printingFieldChains.has(field.inputId)) return [];
      const list = fieldChainOf(field.inputId);
      if (list.length === 0) return [];
      const outer = announced;
      announced = { inputId: field.inputId, code };
      printingFieldChains.add(field.inputId);
      try {
        return block(list, at, scope);
      } finally {
        printingFieldChains.delete(field.inputId);
        announced = outer;
      }
    };
    if (field.port === 'clear') return [`${pad}${set}('');`, ...(cleared !== undefined ? [`${pad}${cleared}.current = true;`] : []), ...chainLines("''", pad)];
    const ref = fieldRefs.get(field.inputId)!;
    const inner = `${pad}  `;
    const body: string[] = [];
    let code: string;
    if (a.expr === undefined || a.expr.kind === 'literal') {
      const literal = js(a.expr?.kind === 'literal' ? String(a.expr.value) : (field.start ?? ''));
      code = cleared !== undefined ? `(${cleared}.current ? '' : ${literal})` : literal;
    } else {
      const v = expr(a.expr, scope);
      if (v === undefined) throw new Unprinted(`a Set on a text field from ${describe(a.expr)}, which the HTML target does not print yet`);
      // Block-scoped, so a name another write's block uses is free here; one the component's scope holds is not.
      const blockLocal = (base: string): string => {
        let candidate = base;
        for (let n = 2; taken.has(candidate) || scope.declared.has(candidate); n++) candidate = `${base}${n}`;
        return candidate;
      };
      const value = blockLocal(`${a.name}Value`);
      code = blockLocal(`${a.name}Text`);
      const asText = `String(${value} ?? '')`;
      const coerced = field.start === undefined || field.start === '' ? asText : `${value} === undefined ? ${js(field.start)} : ${asText}`;
      body.push(`${inner}const ${value} = ${v};`, `${inner}const ${code} = ${cleared !== undefined ? `${cleared}.current ? '' : ${coerced}` : coerced};`);
    }
    body.push(`${inner}${set}(${code});`, ...chainLines(code, inner));
    return [`${pad}if (${ref}.current !== document.activeElement) {`, ...body, `${pad}}`];
  };

  /** A chain from its start (a press, a callback, an effect), or undefined and a named loss: never half a chain. */
  const chain = (id: string, port: string, list: HandlerAction[], pad: string): string[] | undefined => {
    try {
      const scope = chainScope();
      const lines = block(list, pad, scope);
      return scope.awaits.used ? asyncBody(lines, pad) : lines;
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
  /**
   * P18 session 126 (EXP-011 §93). The Did Mount chains of the part `when(…)` is building: under a Mounted a value
   * decides, an element is made each time that part is built, so its Did Mount runs at the end of the build, each time it
   * mounts, children first: the React printer's gated mount effect, with the part's own life in place of its ref.
   */
  const partMounts: string[][] = [];
  const listenFor = (id: string, local: string, pad: string, known: Record<string, string>): string[] => {
    const out: string[] = [];
    for (const [port, list] of Object.entries(plan.handlers[id] ?? {})) {
      if (port === 'didMount') {
        if (partMounts.length > 0) {
          const body = chain(id, 'Did Mount', list, pad);
          if (body !== undefined) partMounts[partMounts.length - 1].push(`${pad}// ${nodeById.get(id)?.authoredLabel ?? id}: Did Mount, each time it mounts.`, ...body);
          continue;
        }
        if (mountGated(id)) {
          lose(id, 'its Did Mount sits under a Mounted whose value the HTML target does not print, so when it mounts is not known');
          continue;
        }
        const body = chain(id, 'Did Mount', list, '  ');
        if (body !== undefined) mounted.push(`  // ${nodeById.get(id)?.authoredLabel ?? id}: Did Mount.`, ...body);
        continue;
      }
      // A text field's Changed runs from its typing, with its own text (drawn with the field).
      if (port === 'onChange' && (plan.roleOf[id] === 'input' || plan.roleOf[id] === 'checkbox' || plan.roleOf[id] === 'range')) continue;
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
      writes.push(lift.forward ? sendOut(lift.setterName, 'value') : `${member('state', row!.name)}.set(value);`);
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

  /** A node whose outermost element is not its own local (a labelled checkbox's `<label>`). */
  const outerOf = new Map<string, string>();
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
        partMounts.push([]);
        const inner = drawNode(id, role, node, bound, 'into', 'at', `${pad}  `);
        inner.push(...partMounts.pop()!);
        const outer = role === 'instance' ? 'null' : (outerOf.get(id) ?? local(id));
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
    // STATIC-DATA §3: the authored rows, the constant above the component, which nothing changes.
    const staticData = rep?.itemsStaticId ? plan.staticData.find((s) => s.nodeId === rep.itemsStaticId) : undefined;
    // HTX-004. A query's rows, kept with their record by its id (React's `key={task.id}`).
    const query = rep?.itemsQueryId ? plan.queries.find((q) => q.nodeId === rep.itemsQueryId) : undefined;
    const items = rep?.itemsExpr ? expr(rep.itemsExpr) : staticData !== undefined ? staticData.constName : query !== undefined ? `${member('state', query.stateName)}.get()` : undefined;
    if (!rep || !target || !module || target.hook || items === undefined || rep.mapping === null) {
      const why = !rep?.templatePath
        ? 'it repeats no component'
        : rep.mapping === null
          ? 'its mapping script is more than a list of names'
          : rep.itemsQueryId
            ? 'its items are a backend query the plan does not keep'
            : rep.itemsCollectionName
              ? `its items are the named list "${rep.itemsCollectionName}", which the HTML target does not keep yet`
              : rep.itemsExpr
                ? `its items read ${describe(rep.itemsExpr)}, which the HTML target does not print yet`
                : target?.hook
                  ? 'its row is a logic component'
                  : 'its items are fed by nothing the plan knows as a list (a Function\'s output, say), which the React export defers too (EXP-003)';
      lose(id, `a For Each not drawn: ${why}`);
      return [`${pad}// ${node.authoredLabel ?? id}: a For Each, not drawn by this export yet (see EXPORT-PREFLIGHT.md).`];
    }
    importMount(module.file, module.mount);
    imports.dom.add('list');
    /*
     * The row's inputs, the React printer's rule (`renderRepeater`, copied, P134-HTX001-PRINTERDECIDES): no script is the
     * template's own inputs by name (`foreach.tsx` maps an item's properties onto same-named inputs by itself); the
     * template's row props (an Object "From repeater") read their own field; over Static Data, a field no authored row
     * carries is dropped, as the row never gets it.
     */
    const isPulse = (tsType: string) => tsType.replace(/\s+/g, '') === INPUT_PULSE_TS_TYPE.replace(/\s+/g, '');
    const rowPropNames = new Set(target.rowProps.map((r) => r.prop));
    const declared = rep.mapping === 'template-inputs' ? target.props.filter((p) => !isPulse(p.tsType) && !rowPropNames.has(p.name)).map((p) => ({ input: p.name, field: p.name })) : rep.mapping.filter((m) => !rowPropNames.has(m.input));
    let mapping: Array<{ input: string; field: string; repeaterItem?: string }> = [...declared, ...target.rowProps.map((r) => ({ input: r.prop, field: r.field, repeaterItem: r.repeaterItem }))];
    if (staticData !== undefined) {
      const carried = new Set(staticData.fields.map((f) => f.name));
      const idOk = staticData.keyField === 'id' && staticData.fields.find((f) => f.name === 'id')?.tsType === 'string';
      for (const m of mapping) {
        if (m.repeaterItem !== undefined && !idOk) lose(id, `its rows' Repeater Item ${m.repeaterItem} reads Item Id, which the authored rows do not carry as a unique text "id"`);
        else if (m.repeaterItem === undefined && !carried.has(m.field)) lose(id, `it maps "${m.input}" from the field "${m.field}", which no authored row carries`);
      }
      mapping = mapping.filter((m) => (m.repeaterItem !== undefined ? idOk : carried.has(m.field)));
    }
    if (query !== undefined) {
      // The React printer's rule (copied): a row carries its record's `id` and the collection's declared columns, and the
      // runtime feeds nothing outside them.
      const allowed = new Set(['id', ...(ctx.columnsOf?.(query.collectionName) ?? [])]);
      for (const m of mapping) if (!allowed.has(m.field)) lose(id, `it maps "${m.input}" from the field "${m.field}", which no row of ${query.collectionName} is known to carry`);
      mapping = mapping.filter((m) => allowed.has(m.field));
    }
    const pairs = mapping.map((m) => `${key(m.input)}: ${member('item', m.field)}`);
    const fieldOfInput = (input: string): string | undefined => mapping.find((m) => m.input === input)?.field;
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
      // EXP-011 §99. The firing row's relayed values first: what this row is handed for the input each passes through.
      const writes = relays.map((r) => {
        const field = fieldOfInput(r.input);
        return `${member('state', r.stateName)}.set(${field === undefined ? 'undefined' : member('item', field)});`;
      });
      const outer = relayed;
      relayed = { repeaterId: id, read: (input) => (fieldOfInput(input) === undefined ? 'undefined' : member('item', fieldOfInput(input)!)) };
      const fn = callback(id, port, list, `${pad}    `, writes);
      relayed = outer;
      if (fn !== undefined) callbacks.push(`${key(prop)}: ${fn}`);
    }
    const label = node.authoredLabel ?? id;
    // STATIC-DATA §3.2: keyed by `id` when every authored row has a unique one, the runtime's own record identity.
    const keyField = staticData !== undefined ? staticData.keyField : query !== undefined ? 'id' : undefined;
    return [
      `${pad}// ${label}: one ${target.file?.symbol ?? 'row'} for each item, ${keyField ? `kept with its item by its ${js(keyField)}` : 'kept by its place in the list'}.`,
      `${pad}list(l, ${parent}, function () {`,
      `${pad}  return ${items};`,
      `${pad}}, ${keyField ? `function (item) {\n${pad}  return ${member('item', keyField)};\n${pad}}` : 'null'}, function (into, item, index, at) {`,
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

  /**
   * A control's Enabled, as the React printer prints it (`contentAttrs`, LOGIC-TARGET §7; copied,
   * P134-HTX001-PRINTERDECIDES): authored false is `disabled`; a wire is `disabled` while its value is not true, so a
   * source with no value yet (`!!undefined`) disables it, the runtime's own coercion.
   */
  const enabledLines = (id: string, node: NodeIR, bound: Record<string, BindingSource>, pad: string, target = local(id)): string[] => {
    if (bound.enabled) {
      const v = binding(id, 'enabled', bound.enabled);
      if (v === undefined) return [];
      imports.dom.add('bindAttr');
      imports.dom.add('truthy');
      return [`${pad}bindAttr(l, ${target}, 'disabled', function () { return !truthy(${v}); });`];
    }
    return literalParam(node, 'enabled') === false ? [`${pad}${target}.disabled = true;`] : [];
  };

  /**
   * A Checkbox, as the React printer draws it (`component.ts` `renderNode`'s `role === 'checkbox'`, `changeAttrs`,
   * CONTROLLED-STATE-TARGET §4c; copied, P134-HTX001-PRINTERDECIDES): an `<input type="checkbox">` with the node's class;
   * with Use Label, inside a `<label>` with the wrapper class and the label's text after it. With a state row (the plan
   * mints one when its Checked is wired, read, or Checked or Unchecked by a chain) the box shows the row, and a person's
   * click writes the row, then runs the box's Changed chain reading the box; with none, the box keeps its own tick from
   * its typed-in Checked, and the click runs the chain only.
   */
  const drawCheckbox = (id: string, node: NodeIR, bound: Record<string, BindingSource>, parent: string, before: string | undefined, pad: string): string[] => {
    imports.dom.add('el');
    const out: string[] = [];
    const useLabel = (literalParam(node, 'useLabel') ?? (node.catalogRef ? ctx.catalog.inputDefault(node.catalogRef, 'useLabel') : undefined)) === true;
    const cls = classAttr(id);
    const at = (parentArg: string, tag: string, c: string | undefined, b: string | undefined) =>
      `el(${[parentArg, js(tag), c ? js(c) : 'undefined', ...(b ? ['undefined', b] : [])].join(', ')})`;
    const box = local(id);
    // With a label, the label is what goes on and off the page (`draw`'s `when` returns it).
    const label = useLabel ? fresh(`${box}Label`) : box;
    if (useLabel) outerOf.set(id, label);
    if (useLabel) {
      out.push(`${pad}const ${label} = ${at(parent, 'label', wrapperClassOf.get(id), before)};`, `${pad}const ${box} = ${at(label, 'input', cls || undefined, undefined)};`);
    } else {
      out.push(`${pad}const ${box} = ${at(parent, 'input', cls || undefined, before)};`);
    }
    out.push(`${pad}${box}.type = 'checkbox';`);
    if (useLabel) {
      const v = bound.label ? binding(id, 'label', bound.label) : undefined;
      if (v !== undefined) {
        imports.dom.add('show');
        const t = fresh(`${box}Text`);
        out.push(`${pad}const ${t} = ${label}.appendChild(document.createTextNode(''));`, `${pad}l.run(function () {`, `${pad}  ${t}.data = show(${v});`, `${pad}});`);
      } else {
        const authored = literalParam(node, 'label') ?? (node.catalogRef ? ctx.catalog.inputDefault(node.catalogRef, 'label') : undefined);
        out.push(`${pad}${label}.append(${js(String(authored ?? 'Label'))});`);
      }
    }
    out.push(...enabledLines(id, node, bound, pad, box));
    const row = plan.stateVars.find((v) => v.originNodeId === id && v.origin === 'control');
    if (row) {
      // The tick is a value: the box shows it whenever it changes (a Check, an Uncheck, its wire, a click).
      out.push(`${pad}l.run(function () {`, `${pad}  ${box}.checked = !!${member('state', row.name)}.get();`, `${pad}});`);
    } else if (literalParam(node, 'checked') === true) {
      // No row: the box keeps its own tick, starting from its typed-in Checked (React's `defaultChecked`).
      out.push(`${pad}${box}.checked = true;`);
    }
    // A person's click: the tick into its row, then the box's own Changed chain, reading the box.
    const own = fieldChainOf(id);
    if (row || own.length > 0) {
      controlled = { controlId: id, code: `${box}.checked` };
      const body = own.length > 0 ? chain(id, 'Changed', own, `${pad}  `) : [];
      controlled = undefined;
      out.push(`${pad}${box}.addEventListener('change', function () {`, ...(row ? [`${pad}  ${member('state', row.name)}.set(${box}.checked);`] : []), ...(body ?? []), `${pad}});`);
    }
    out.push(...listenFor(id, box, pad, {}));
    return out;
  };

  /**
   * HTX-006. A Slider, as the React printer draws it (`component.ts` `renderNode`'s `role === 'range'` and `changeAttrs`;
   * copied, P134-HTX001-PRINTERDECIDES): an `<input type="range">` with the node's class, its typed-in Min, Max and Step
   * (set before the value, which the browser keeps between them). With a state row the slider shows the row, and a
   * person's drag writes the row as a number, then runs its Changed chain; with none, it keeps its own place from its
   * typed-in Value, and the drag runs the chain only. React's `onChange` on a range is the DOM's `input`: every step.
   */
  const drawRange = (id: string, node: NodeIR, bound: Record<string, BindingSource>, parent: string, before: string | undefined, pad: string): string[] => {
    const out: string[] = [elLine(id, 'input', parent, undefined, before, pad)];
    const box = local(id);
    out.push(`${pad}${box}.type = 'range';`);
    for (const param of ['min', 'max', 'step']) {
      if (bound[param]) lose(id, `its ${param[0].toUpperCase()}${param.slice(1)} follows a wire, which the HTML target does not print yet`);
      const v = literalParam(node, param);
      if (typeof v === 'number' || (typeof v === 'string' && v !== '')) out.push(`${pad}${box}.${param} = ${js(String(v))};`);
    }
    out.push(...enabledLines(id, node, bound, pad, box));
    const row = plan.stateVars.find((v) => v.originNodeId === id && v.origin === 'control');
    if (row) {
      // Its place is a value: the slider shows it whenever it changes (its wire, a drag).
      out.push(`${pad}l.run(function () {`, `${pad}  const place = String(${member('state', row.name)}.get());`, `${pad}  if (${box}.value !== place) ${box}.value = place;`, `${pad}});`);
    } else {
      const start = literalParam(node, 'value');
      if (typeof start === 'number' || (typeof start === 'string' && start !== '')) out.push(`${pad}${box}.value = ${js(String(start))};`);
    }
    const own = fieldChainOf(id);
    if (row || own.length > 0) {
      controlled = { controlId: id, code: `${box}.value` };
      const body = own.length > 0 ? chain(id, 'Changed', own, `${pad}  `) : [];
      controlled = undefined;
      out.push(`${pad}${box}.addEventListener('input', function () {`, ...(row ? [`${pad}  ${member('state', row.name)}.set(Number(${box}.value));`] : []), ...(body ?? []), `${pad}});`);
    }
    out.push(...listenFor(id, box, pad, {}));
    return out;
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
      out.push(...listenFor(id, local(id), pad, { onClick: 'click' }));
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
      out.push(...listenFor(id, local(id), pad, { onClick: 'click' }));
      extra(['text', 'color']);
    } else if (role === 'button') {
      const label = bound.label ? binding(id, 'label', bound.label) : undefined;
      out.push(elLine(id, 'button', parent, label === undefined ? String(literalParam(node, 'label') ?? '') : undefined, before, pad));
      out.push(`${pad}${local(id)}.type = 'button';`);
      if (label !== undefined) {
        imports.dom.add('bindText');
        out.push(`${pad}bindText(l, ${local(id)}, function () { return ${label}; });`);
      }
      out.push(...enabledLines(id, node, bound, pad));
      if (!plan.handlers[id]?.onClick) out.push(`${pad}// Nothing is wired to this press.`);
      out.push(...listenFor(id, local(id), pad, { onClick: 'click' }));
      extra(['label', 'enabled']);
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
      // The authored attributes React prints (`CONTENT_PARAMS`): the length, the soft keyboard and its Enter label.
      const maxLength = literalParam(node, 'maxLength');
      if (typeof maxLength === 'number') out.push(`${pad}${local(id)}.maxLength = ${maxLength};`);
      for (const [param, attr] of [['inputMode', 'inputmode'], ['enterKeyHint', 'enterkeyhint']] as const) {
        const v = literalParam(node, param);
        if (typeof v === 'string' && v !== '') out.push(`${pad}${local(id)}.setAttribute(${js(attr)}, ${js(v)});`);
      }
      out.push(...enabledLines(id, node, bound, pad));
      const ref = fieldRefs.get(id);
      if (ref !== undefined) {
        // Held while it is on the page, for the Set's focus test and a Focus or a Blur.
        out.push(`${pad}${ref}.current = ${local(id)};`, `${pad}l.add(function () {`, `${pad}  ${ref}.current = null;`, `${pad}});`);
      }
      const row = plan.stateVars.find((v) => v.originNodeId === id && v.origin === 'control');
      if (row) {
        // The field's text is a value: written into the field when it changes, so typing keeps the cursor where it is.
        out.push(`${pad}l.run(function () {`, `${pad}  const text = ${member('state', row.name)}.get();`, `${pad}  if (${local(id)}.value !== text) ${local(id)}.value = text;`, `${pad}});`);
      } else {
        // No row: the field keeps what is typed into it, starting from its typed-in Value (React's `defaultValue`).
        const start = literalParam(node, 'startValue');
        if (start !== undefined && start !== '') out.push(`${pad}${local(id)}.value = ${js(String(start))};`);
      }
      // As a person types: the text into its value, then the field's own change chain, with what is in the field.
      const own = fieldChainOf(id);
      if (row || own.length > 0) {
        announced = { inputId: id, code: `${local(id)}.value` };
        const body = own.length > 0 ? chain(id, 'Changed', own, `${pad}  `) : [];
        announced = undefined;
        out.push(`${pad}${local(id)}.addEventListener('input', function () {`, ...(row ? [`${pad}  ${member('state', row.name)}.set(${local(id)}.value);`] : []), ...(body ?? []), `${pad}});`);
      }
      out.push(...listenFor(id, local(id), pad, {}));
      extra(['placeholder', 'value', 'enabled']);
    } else if (role === 'checkbox') {
      out.push(...drawCheckbox(id, node, bound, parent, before, pad));
      extra(['label', 'checked', 'enabled']);
    } else if (role === 'range') {
      out.push(...drawRange(id, node, bound, parent, before, pad));
      extra(['value', 'min', 'max', 'step', 'enabled']);
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
  // P18-S128-FIELDSET. A field's element while it is on the page, and whether it has been Cleared since its Value was last
  // delivered: a Variable delivers on every write, the same value too (the Set Variable's forceChange); anything else, on a
  // change. React's `useRef` and its reset effect.
  const fieldLines: string[] = [];
  for (const [inputId, ref] of fieldRefs) fieldLines.push(`  const ${ref} = { current: null }; // the field "${nodeById.get(inputId)?.authoredLabel ?? inputId}", while it is on the page`);
  for (const [inputId, cleared] of fieldClearedLocals) {
    fieldLines.push(`  const ${cleared} = { current: false }; // a Clear has run since its Value was last delivered`);
    const source = fieldSetSources.get(inputId)!;
    if (source.kind === 'literal') continue;
    const v = source.kind === 'store-get' ? variable(source.variableName) : undefined;
    if (v !== undefined) {
      logic.push(`  l.add(${v}.subscribe(function () {`, `    ${cleared}.current = false;`, '  }));');
      continue;
    }
    const read = expr(source);
    if (read === undefined) {
      lose(inputId, `the Value its Set writes reads ${describe(source)}, which the HTML target does not print yet`);
      continue;
    }
    logic.push('  l.watch(function () {', `    return [${read}];`, '  }, function () {', `    ${cleared}.current = false;`, '  });');
  }
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
      `    ${sendOut(push.prop, 'value')}`,
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
  /*
   * P18-S116-FIELDMOUNT, the React printer's mount effect (copied, P134-HTX001-PRINTERDECIDES). A text field announces its
   * Value as it mounts, so the chain its typing runs runs once then, with the start value: '' for an empty field. A wired
   * Value lands first (the runtime delivers it at node creation): `undefined` is never delivered, `null` clears. Under a
   * Mounted a value decides (P18 session 126), the first time the field's own conditions all hold.
   */
  for (const fm of plan.fieldMounts) {
    const list = plan.changeHandlers[fm.inputId] ?? [];
    if (list.length === 0) continue;
    const gates: string[] = [];
    for (const g of fm.gates ?? []) {
      const source = plan.bindings[g]?.mounted;
      const test = source ? binding(g, 'mounted', source) : undefined;
      if (test === undefined) continue;
      imports.dom.add('truthy');
      gates.push(`(${test} === undefined ? ${literalParam(nodeById.get(g)!, 'mounted') === false ? 'false' : 'true'} : truthy(${test}))`);
    }
    const lines: string[] = [];
    let code = js(fm.start);
    if (fm.source !== undefined) {
      const src = expr(fm.source);
      if (src === undefined) {
        lose(fm.inputId, `the Value it announces as it mounts reads ${describe(fm.source)}, which the HTML target does not print yet`);
        continue;
      }
      const arrival = fresh('arrival');
      code = fresh('mountValue');
      lines.push(`    const ${arrival} = ${src};`, `    const ${code} = ${arrival} === undefined ? ${js(fm.start)} : ${arrival} === null ? '' : String(${arrival});`);
    }
    announced = { inputId: fm.inputId, code };
    const body = chain(fm.inputId, 'Changed, as it mounts', list, '    ');
    announced = undefined;
    if (body === undefined) continue;
    if (gates.length === 0) {
      logic.push(`  // ${fm.comment}`, '  l.watch(function () {', '    return [];', '  }, function () {', ...lines, ...body, '  });');
      continue;
    }
    const once = fresh('announced');
    logic.push(
      `  // ${fm.comment}`,
      `  let ${once} = false;`,
      '  l.watch(function () {',
      `    return [${gates.join(' && ')}];`,
      '  }, function (shown) {',
      `    if (${once} || !shown) return;`,
      `    ${once} = true;`,
      ...lines,
      ...body,
      '  });'
    );
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
  /*
   * P134-HTX004-SELECTREFUSED. A placed component's signal whose chain reads a value that component lifts: the press counts,
   * the count is handed on one update later, and the chain runs on the handed-on count, once per pulse, reading the value
   * sent with it — the React printer's two effects.
   */
  for (const late of plan.liftedPulseChains) {
    const label = nodeById.get(late.nodeId)?.authoredLabel ?? late.nodeId;
    const body = chain(late.nodeId, `"${late.port}"`, late.actions, '    ');
    if (body === undefined) continue;
    logic.push(
      `  // "${late.port}" from ${label} runs its chain one update after it is sent: the values it lifts arrive first, as the running app delivers them.`,
      `  l.watch(function () {`,
      `    return [${member('state', late.sent.name)}.get()];`,
      `  }, function (sent) {`,
      `    ${member('state', late.delivered.name)}.set(sent);`,
      `  });`,
      `  l.watch(function () {`,
      `    return [${member('state', late.delivered.name)}.get()];`,
      `  }, function (delivered) {`,
      `    if (${late.takenLocal}.current === delivered) return;`,
      `    ${late.takenLocal}.current = delivered;`,
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

  /*
   * HTX-004. The queries that ask without a Fetch (React's mount effect, `component.ts`, copied): once the part is drawn,
   * so a placed component's ask goes before its parent's, as React runs effects. A query with wired filter values asks
   * again when one changes, unless only its Fetch asks then.
   */
  const asks: string[] = [];
  for (const q of plan.queries) {
    const label = nodeById.get(q.nodeId)?.authoredLabel ?? q.nodeId;
    if (!queryHasEffect(q)) continue;
    try {
      const wired = q.params?.wired !== undefined && q.wiredValues !== undefined;
      const call = queryCall(q, q.wiredValues ?? [], TOP);
      const set = `${member('state', q.stateName)}.set`;
      if (!wired) {
        asks.push(`  // "${label}" asks as it is made.`, `  ${call}.then(${set});`);
        continue;
      }
      const once = q.fetchWired !== undefined && !q.fetchWired.onValues;
      const reads = once ? [] : (q.wiredValues ?? []).map((v) => expr(v.expr, TOP)!);
      asks.push(
        once ? `  // "${label}" asks once as it is made; a new filter value waits for its Fetch.` : `  // "${label}" asks again whenever a filter value it reads changes.`,
        '  l.watch(function () {',
        `    return [${reads.join(', ')}];`,
        '  }, function () {',
        `    ${call}.then(${set});`,
        '  });'
      );
    } catch (e) {
      if (!(e instanceof Unprinted)) throw e;
      lose(q.nodeId, `it asks as it is made with ${e.message}; the ask is left out`);
    }
  }

  /*
   * EXP-019 (session 133), React's `<name>Node.late`: a kept Function whose body may call back after its run has returned
   * (a timer, a listener: `JsFunctionPlan.late`). What it writes then lands in its row, and a signal it sends then runs
   * that signal's chain, as the running app's node delivers them when they happen. The row and the pulse arms are the
   * ones its run is printed with, found where the plan holds them. Printed after the drawing, when every Function the
   * component's chains run is known; it is read only when a late write happens, long after the mount.
   */
  const lateLines: string[] = [];
  for (const def of usedFunctions.values()) {
    if (def.kind !== 'function' || def.late !== true || !keptNode(def.nodeId)) continue;
    let pulses: Extract<HandlerAction, { kind: 'jsfun-pulses' }> | undefined;
    let materialize: string | undefined;
    const seen = new Set<object>();
    const visit = (v: unknown): void => {
      if (v === null || typeof v !== 'object' || seen.has(v)) return;
      seen.add(v);
      if (Array.isArray(v)) return v.forEach(visit);
      const a = v as { kind?: unknown; nodeId?: unknown; materialize?: unknown };
      if (a.nodeId === def.nodeId && a.kind === 'jsfun-pulses' && pulses === undefined) pulses = v as Extract<HandlerAction, { kind: 'jsfun-pulses' }>;
      if (a.nodeId === def.nodeId && a.kind === 'jsfun-run' && typeof a.materialize === 'string' && materialize === undefined) materialize = a.materialize;
      Object.values(v).forEach(visit);
    };
    visit(plan);
    if (pulses === undefined && materialize === undefined) continue;
    const names = useFunction(def);
    const run = `${names.base}Run`;
    const body: string[] = [];
    if (materialize !== undefined && stateByName.has(materialize)) body.push(`    ${member('state', materialize)}.set({ ...${run}.outputs });`);
    if (pulses !== undefined) {
      const scope = chainScope();
      scope.runs.set(def.nodeId, run);
      try {
        const lines = statement(pulses, '    ', scope).lines;
        body.push(...(scope.awaits.used ? asyncBody(lines, '    ') : lines));
      } catch (e) {
        if (!(e instanceof Unprinted)) throw e;
        // The row still lands: the signals' chain is the part left out, whole.
        lose(def.nodeId, `what the Function "${def.fnName}" signals after its run has returned runs ${e.message}; that chain is left out whole (what it writes then still lands)`);
      }
    }
    if (body.length === 0) continue;
    const label = (nodeById.get(def.nodeId)?.authoredLabel ?? def.fnName).replace(/\*\//g, '* /');
    lateLines.push(`  // ${label} — what its body writes or sends after a run has returned (a timer, a listener) arrives as the running app's does.`, `  ${names.node}.late = function (${run}) {`, ...body, '  };');
  }
  const rootLocal = plan.rootId ? localOf.get(plan.rootId) : undefined;
  const rootIsConditional = plan.rootId !== null && plan.bindings[plan.rootId]?.mounted !== undefined;

  // What this printer reads in the plan and does not print yet: each a named loss, never a silent drop.
  const UNPRINTED: Array<[keyof ComponentPlan, string]> = [
    ['branchEffects', 'a Condition that tests again on every change (HTX-002)'],
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
  // HTX-004. A Query Records' rows: what it last answered, empty until then (React's `useState<Task[]>([])`).
  for (const q of plan.queries) {
    imports.dom.add('keep');
    state.push(`    ${key(q.stateName)}: keep([]), // the rows "${nodeById.get(q.nodeId)?.authoredLabel ?? q.nodeId}" last answered`);
  }
  if (valueProps.length > 0) {
    imports.dom.add('keep');
    imports.core.add('batch');
  }
  const pulsesTaken = [
    ...plan.instancePulses.map((p) => `  const ${p.takenLocal} = { current: 0 }; // how many "${p.port}" pulses ${nodeById.get(p.nodeId)?.authoredLabel ?? p.nodeId} has acted on`),
    // P134-HTX004-SELECTREFUSED. How many of a placed component's pulses its late chain has run for.
    ...plan.liftedPulseChains.map((c) => `  const ${c.takenLocal} = { current: 0 }; // how many "${c.port}" pulses from ${nodeById.get(c.nodeId)?.authoredLabel ?? c.nodeId} the chain has run for`)
  ];

  // Each Function it runs, in its own file: the body as written, in the wrapper every export gives it (EXP-019).
  const fnImports: string[] = [];
  for (const def of usedFunctions.values()) {
    if (def.kind !== 'function') continue;
    const path = `functions/${file.dir ? `${file.dir}/` : ''}${file.fileBase}/${def.fnName}.js`;
    functions[path] = functionFileJs(plan.path, def, path, ctx.variableOf);
    fnImports.push(`import { ${def.fnName} } from '${relative(file.dir, path)}';`);
  }

  const lines: string[] = [];
  if (usesSession) useImport('lib/session.js', 'followSession');
  const outRows = [...outPort.values()];
  for (const o of outRows) imports.core.add(o.kind);
  lines.push(`// @nodegx:generated by \`nodegx export --target html\` — ${plan.path}.`);
  if (imports.core.size) lines.push(`import { ${[...imports.core].sort().join(', ')} } from '${relative(file.dir, 'lib/core.js')}';`);
  lines.push(`import { ${[...imports.dom].sort().join(', ')} } from '${relative(file.dir, 'lib/dom.js')}';`);
  if (imports.run.size) lines.push(`import { ${[...imports.run].sort().join(', ')} } from '${relative(file.dir, 'lib/functionRun.js')}';`);
  if (imports.router.size) lines.push(`import { ${[...imports.router].sort().join(', ')} } from '${relative(file.dir, 'lib/router.js')}';`);
  if (imports.states.size) lines.push(`import { ${[...imports.states].sort().join(', ')} } from '${relative(file.dir, 'lib/states.js')}';`);
  for (const [mod, names] of [...childImports].sort(([a], [b]) => a.localeCompare(b))) lines.push(`import { ${[...names].sort().join(', ')} } from '${relative(file.dir, mod)}';`);
  if (variableImports.size) lines.push(`import * as variables from '${relative(file.dir, 'variables.js')}';`);
  for (const st of [...storeImports].sort()) lines.push(`import { ${st} } from '${relative(file.dir, `stores/${st}.js`)}';`);
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
  if (outRows.length) {
    lines.push('  // What it sends out, for a page that is not NodeGX: `outputs.<port>.subscribe(…)`.');
    lines.push(`  const outputs = { ${outRows.map((o) => `${key(o.port)}: ${o.kind}()`).join(', ')} };`);
  }
  if (valueProps.length) lines.push(`  const input = { ${valueProps.map((p) => `${key(p)}: keep(inputs[${js(p)}])`).join(', ')} };`);
  if (state.length) lines.push('  const state = {', ...state, '  };');
  lines.push(...pulsesTaken);
  if (plan.role === 'page' && plan.head?.title) lines.push(`  document.title = ${js(plan.head.title)};`);
  if (usesSession) {
    lines.push('  const session = followSession(l); // who is signed in, followed while this part is on the page');
  }
  lines.push(...keyLines);
  lines.push(...fieldLines);
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
  if (lateLines.length) lines.push('', ...lateLines);
  if (asks.length) lines.push('', ...asks);
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
  lines.push(outRows.length ? '    outputs,' : '    outputs: {},');
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
export function functionFileJs(component: string, def: JsFunctionPlan, path = '', variableOf: (name: string) => string | undefined = () => undefined): string {
  const signals = def.signals.length ? `{ ${def.signals.map((sig) => `${key(sig)}() {}`).join(', ')} }` : '{}';
  const dir = path.split('/').slice(0, -1).join('/');
  const awaits = def.awaits === true;
  // HTX-004. The Noodl the body reads (EXP-020): the client's members, and each Variable it names over the app's own.
  const head: string[] = [];
  const noodl: string[] = [];
  if (def.noodl !== undefined) {
    const backend = def.noodl.members.some((m) => m !== 'Variables');
    if (backend) head.push(`import { noodl } from '${relative(dir, 'lib/noodl.js')}';`);
    if (def.noodl.variables.length > 0) head.push(`import * as variables from '${relative(dir, 'variables.js')}';`);
    const pairs = def.noodl.variables.map((name) => {
      const v = member('variables', variableOf(name) ?? name);
      return `      get ${key(name)}() {\n        return ${v}.get();\n      },\n      set ${key(name)}(value) {\n        ${v}.set(value);\n      }`;
    });
    if (pairs.length === 0) noodl.push('  const Noodl = noodl;');
    else noodl.push('  const Noodl = {', ...(backend ? ['    ...noodl,'] : []), '    Variables: {', pairs.join(',\n'), '    }', '  };');
  }
  return [
    `// @nodegx:generated by \`nodegx export --target html\` — the Function node "${def.fnName}" (node ${def.nodeId}) of ${component}.`,
    '// The body is as it was written in NodeGX. It reads `Inputs`, writes `Outputs`, and keeps what it puts on `this`.',
    ...(awaits ? ['// It awaits: the run returns at its first `await`, and what follows the run waits for the body to finish.'] : []),
    ...head,
    ...(head.length ? [''] : []),
    `export ${awaits ? 'async ' : ''}function ${def.fnName}(Inputs, Outputs = ${signals}, self = {}, Component) {`,
    ...noodl,
    '  try {',
    `    ${awaits ? 'await (async ' : '('}function () {`,
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
