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
 * HTX-001 is the visual tier: Functions, logic components, Variables, lists and most actions are HTX-002 and HTX-003.
 *
 * @module emit/html/printComponent
 */

import type { NodeIR } from '../../ir/types';
import type { CatalogIndex } from '../../catalog';
import type { BindingSource, ComponentPlan, HandlerAction, ProjectPlan, ValueExpr } from '../../analyze/plan';
import { computeNodeStyle, computeRoleCss, type Decl, type StyleRole } from '../style';
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
  /** A navigate action's `to` (a page's url path) → the router path it shows, or undefined for no such page. */
  routeOf: (urlPath: string) => string | undefined;
}

export interface PrintedComponent {
  mount: string;
  js: string;
  css: string;
  losses: HtmlLoss[];
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

export function printComponent(plan: ComponentPlan, ctx: HtmlComponentContext): PrintedComponent {
  const file = plan.file!;
  const mount = `mount${file.symbol}`;
  const nodes = ctx.nodesOf(plan.path);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const losses: HtmlLoss[] = [];
  const lose = (nodeId: string, what: string) => losses.push({ component: plan.path, nodeId, label: nodeById.get(nodeId)?.authoredLabel, what });
  const imports = { core: new Set<string>(), dom: new Set<string>(['life', 'el']), router: new Set<string>() };
  const childImports = new Map<string, Set<string>>();
  const machineByNode = new Map(plan.statesMachines.map((m) => [m.nodeId, m]));
  const stateNames = new Set(plan.stateVars.map((s) => s.name));
  const valueProps = plan.props.map((p) => p.name);
  const callbackProps = new Set(plan.outputProps.map((o) => o.prop));

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

  // ---- values ---------------------------------------------------------------------------------------------------

  /** A plan expression as JavaScript read inside an effect; undefined where this printer does not print it yet. */
  const expr = (e: ValueExpr): string | undefined => {
    switch (e.kind) {
      case 'prop':
        if (valueProps.includes(e.name)) return `${member('input', e.name)}.get()`;
        return undefined;
      case 'literal':
        return js(e.value);
      case 'undefined':
        return 'undefined';
      case 'state-get':
        if (stateNames.has(e.name) || plan.statesMachines.some((m) => m.local === e.name)) return `${member('state', e.name)}.get()`;
        return undefined;
      case 'states-out': {
        const m = machineByNode.get(e.nodeId);
        if (!m) return undefined;
        const at = `${member('state', m.local)}.get()`;
        if (e.field === 'state') return at;
        if (e.field === 'at') return `(${at} === ${js(e.name ?? '')})`;
        if (e.field === 'value') return member(`${m.constName}[${at}]`, e.name ?? '');
        return undefined;
      }
      case 'not': {
        const inner = expr(e.operand);
        if (inner === undefined) return undefined;
        imports.dom.add('truthy');
        return `!truthy(${inner})`;
      }
      case 'truthy': {
        const inner = expr(e.operand);
        if (inner === undefined) return undefined;
        imports.dom.add('truthy');
        return `truthy(${inner})`;
      }
      case 'logical': {
        const parts = e.operands.map(expr);
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
          const v = expr(part);
          if (v === undefined) return undefined;
          imports.dom.add('show');
          parts.push(`show(${v})`);
        }
        return parts.length ? parts.join(' + ') : "''";
      }
      default:
        return undefined;
    }
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
    if (source.kind === 'store') lose(id, `its ${port} reads the Variable "${source.variableName}" (HTX-002)`);
    else if (source.kind === 'store-key') lose(id, `its ${port} reads the Global Store "${source.storeName}" (HTX-002)`);
    else lose(id, `its ${port} has no source the plan could read`);
    return undefined;
  };

  // ---- actions --------------------------------------------------------------------------------------------------

  /** A chain as statements, or undefined (and a named loss) when any step of it is not printed yet: never half a chain. */
  const statements = (id: string, port: string, list: HandlerAction[]): string[] | undefined => {
    const out: string[] = [];
    for (const action of list) {
      if (action.kind === 'navigate') {
        const path = ctx.routeOf(action.to);
        if (path === undefined || action.pathParams.length > 0 || action.query.length > 0) {
          lose(id, `its ${port} navigates to ${action.to} with parameters, which the HTML target does not carry yet`);
          return undefined;
        }
        imports.router.add('navigate');
        out.push(`navigate(${js(path)});`);
      } else if (action.kind === 'output-signal' && callbackProps.has(action.prop)) {
        out.push(`if (${member('given', action.prop)}) ${member('given', action.prop)}();`);
      } else {
        lose(id, `its ${port} runs a ${action.kind} step, which the HTML target does not print yet (HTX-002)`);
        return undefined;
      }
    }
    return out;
  };

  const listen = (id: string, local: string, pad: string, known: Record<string, string>): string[] => {
    const out: string[] = [];
    for (const [port, list] of Object.entries(plan.handlers[id] ?? {})) {
      const event = known[port];
      if (event === undefined) {
        lose(id, `its ${port} is not carried by the HTML target yet`);
        continue;
      }
      const body = statements(id, port, list);
      if (body === undefined) continue;
      out.push(`${pad}${local}.addEventListener(${js(event)}, function () {`, ...body.map((s) => `${pad}  ${s}`), `${pad}});`);
    }
    return out;
  };

  // ---- the tree -------------------------------------------------------------------------------------------------

  const taken = new Set(['input', 'state', 'given', 'element', 'inputs', 'before', 'l', 'into', 'at', 'batch', 'life', 'el', 'show', 'truthy', 'bindText', 'bindAttr', 'bindStyle', 'when', 'place', 'navigate', mount]);
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

  const drawNode = (id: string, role: string, node: NodeIR, bound: Record<string, BindingSource>, parent: string, before: string | undefined, pad: string): string[] => {
    const out: string[] = [];
    const extra = (handled: string[]) => {
      for (const [port, source] of Object.entries(bound)) {
        if (handled.includes(port) || port === 'mounted') continue;
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
        lose(id, target?.hook ? `${node.type} is a logic component, which the HTML target does not run yet (HTX-002)` : `${node.type} draws nothing in the plan (${target?.skipReason ?? 'no plan'})`);
        return [`${pad}// ${node.authoredLabel ?? id}: ${node.type} is not drawn in this export yet (see EXPORT-PREFLIGHT.md).`];
      }
      const names = childImports.get(module.file) ?? new Set<string>();
      names.add(module.mount);
      childImports.set(module.file, names);
      imports.dom.add('place');
      const fixed: string[] = [];
      const live: string[] = [];
      for (const p of target.props) {
        const b = bound[p.name];
        if (b) {
          const v = binding(id, p.name, b);
          if (v !== undefined) live.push(`${key(p.name)}: ${v}`);
          continue;
        }
        const lit = literalParam(node, p.name);
        if (lit !== undefined) fixed.push(`${key(p.name)}: ${js(lit)}`);
      }
      const outputs = new Map(target.outputProps.map((o) => [o.port, o.prop]));
      for (const [port, list] of Object.entries(plan.handlers[id] ?? {})) {
        const prop = outputs.get(port);
        if (!prop) {
          lose(id, `its ${port} names no output of ${node.type}`);
          continue;
        }
        const body = statements(id, port, list);
        if (body === undefined) continue;
        fixed.push(`${key(prop)}: function () {\n${body.map((s) => `${pad}    ${s}`).join('\n')}\n${pad}  }`);
      }
      if ((plan.instanceLifted[id] ?? []).length > 0) lose(id, `what ${node.type} sends out as values is not lifted yet (HTX-002)`);
      if (target.childSlot) lose(id, `${node.type} takes placed children, which the HTML target does not pass yet`);
      const name = local(id);
      out.push(`${pad}const ${name} = place(l, ${module.mount}(${parent}, ${fixed.length ? `{ ${fixed.join(', ')} }` : '{}'}${before ? `, ${before}` : ''}));`);
      if (live.length > 0) out.push(`${pad}l.run(function () {`, `${pad}  ${name}.update({ ${live.join(', ')} });`, `${pad}});`);
    } else if (role === 'repeater') {
      lose(id, 'a For Each is not drawn by the HTML target yet (HTX-003)');
      return [`${pad}// ${node.authoredLabel ?? id}: a For Each, drawn from HTX-003 on (see EXPORT-PREFLIGHT.md).`];
    } else {
      lose(id, `a ${role} node is not drawn by the HTML target yet`);
      return [`${pad}// ${node.authoredLabel ?? id}: a ${role}, not drawn by this export yet.`];
    }
    return out;
  };

  // ---- the module ---------------------------------------------------------------------------------------------

  const tree = plan.rootId ? draw(plan.rootId, 'element', 'before', '  ') : [];
  const rootLocal = plan.rootId ? localOf.get(plan.rootId) : undefined;
  const rootIsConditional = plan.rootId !== null && plan.bindings[plan.rootId]?.mounted !== undefined;

  // What this printer reads in the plan and does not print yet: each a named loss, never a silent drop.
  const UNPRINTED: Array<[keyof ComponentPlan, string]> = [
    ['jsFunctions', 'a Function (HTX-002)'],
    ['pushEffects', 'a value it sends out (HTX-002)'],
    ['syncEffects', 'a value wired into a field or a Variable (HTX-002)'],
    ['valueChangedEffects', 'a Value Changed (HTX-002)'],
    ['inputPulses', 'a signal input (HTX-002)'],
    ['instancePulses', 'a signal sent into a placed component (HTX-002)'],
    ['hookCalls', 'a logic component it runs (HTX-002)'],
    ['variableSeeds', "a Variable's starting value (HTX-002)"],
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
  const follows: string[] = [];
  for (const m of plan.statesMachines) {
    if (m.follow) {
      const v = expr(m.follow);
      if (v === undefined) lose(m.nodeId, `its State is wired from ${describe(m.follow)}, which the HTML target does not print yet`);
      else {
        // The runtime's goToState: no value is the first state, a name it does not have changes nothing.
        follows.push(
          `  // ${nodeById.get(m.nodeId)?.authoredLabel ?? m.local}: in the state its wired value names.`,
          '  l.run(function () {',
          `    const named = ${v};`,
          `    const next = named ? String(named) : ${js(m.states[0])};`,
          `    if (Object.prototype.hasOwnProperty.call(${m.constName}, next)) ${member('state', m.local)}.set(next);`,
          '  });'
        );
      }
    }
    if (m.useTransitions && m.values.some((v) => v.type === 'number' || v.type === 'color')) lose(m.nodeId, 'a move between its states jumps; the transition is not printed yet (HTX-002)');
    if (Object.keys(m.listeners.reached).length > 0 || m.listeners.stateChanged || m.listeners.done) lose(m.nodeId, 'what runs when its state changes is not printed yet (HTX-002)');
  }

  const head: string[] = [];
  for (const m of plan.statesMachines) {
    head.push(`/** ${nodeById.get(m.nodeId)?.authoredLabel ?? m.local}: its values in each state. */`, `const ${m.constName} = {`);
    for (const s of m.states) head.push(`  ${key(s)}: { ${m.values.map((v) => `${key(v.name)}: ${js(v.byState[s])}`).join(', ')} },`);
    head.push('};', '');
  }

  const state: string[] = [];
  for (const s of plan.stateVars) {
    imports.core.add('value');
    const why = s.origin === 'lifted' ? ` // ${s.comment.split(' — ')[0]}; nothing sets it until HTX-002 runs that component.` : ` // ${s.comment.split('\n')[0]}`;
    state.push(`    ${key(s.name)}: value(${s.boot === null ? 'undefined' : js(s.boot)}),${why}`);
  }
  for (const m of plan.statesMachines) {
    imports.core.add('value');
    state.push(`    ${key(m.local)}: value(${js(m.start ?? m.states[0])}), // the state of "${nodeById.get(m.nodeId)?.authoredLabel ?? m.local}"`);
  }
  if (valueProps.length > 0) {
    imports.core.add('value');
    imports.core.add('batch');
  }

  const lines: string[] = [];
  lines.push(`// @nodegx:generated by \`nodegx export --target html\` — ${plan.path}.`);
  if (imports.core.size) lines.push(`import { ${[...imports.core].sort().join(', ')} } from '${relative(file.dir, 'lib/core.js')}';`);
  lines.push(`import { ${[...imports.dom].sort().join(', ')} } from '${relative(file.dir, 'lib/dom.js')}';`);
  if (imports.router.size) lines.push(`import { ${[...imports.router].sort().join(', ')} } from '${relative(file.dir, 'lib/router.js')}';`);
  for (const [mod, names] of [...childImports].sort(([a], [b]) => a.localeCompare(b))) lines.push(`import { ${[...names].sort().join(', ')} } from '${relative(file.dir, mod)}';`);
  lines.push('');
  lines.push(...head);
  lines.push('/**');
  lines.push(` * ${plan.docComment ?? (plan.role === 'page' ? `The page "${plan.head?.title ?? file.fileBase}".` : `${file.symbol}.`)}`);
  lines.push(' *');
  lines.push(' * Draws into `element` (before `before`, when given). `inputs` are what the parent sets:');
  lines.push(` * ${valueProps.length ? valueProps.map((p) => `\`${p}\``).join(', ') : 'none'}${callbackProps.size ? `, and the callbacks ${[...callbackProps].map((p) => `\`${p}\``).join(', ')}` : ''}.`);
  lines.push(' * Returns `update(inputs)` to change them, `outputs`, and `destroy()` to take it off the page.');
  lines.push(' */');
  lines.push(`export function ${mount}(element, inputs = {}, before) {`);
  lines.push('  const l = life();');
  lines.push('  const given = Object.assign({}, inputs);');
  if (valueProps.length) lines.push(`  const input = { ${valueProps.map((p) => `${key(p)}: value(inputs[${js(p)}])`).join(', ')} };`);
  if (state.length) lines.push('  const state = {', ...state, '  };');
  if (plan.role === 'page' && plan.head?.title) lines.push(`  document.title = ${js(plan.head.title)};`);
  lines.push('');
  lines.push(...follows);
  if (follows.length) lines.push('');
  lines.push(...tree);
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
  return { mount, js: lines.join('\n'), css, losses };
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
