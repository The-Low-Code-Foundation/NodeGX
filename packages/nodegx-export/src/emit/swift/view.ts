/**
 * EXP-022. One component's plan as one SwiftUI `View`.
 *
 * Reads the same {@link ComponentPlan} the React printer reads — `roleOf`, `childrenOf`, `bindings`, `handlers`,
 * `repeaters`, `stateVars`, `statesMachines`, `instanceLifted` — and prints each decision in SwiftUI's spelling. It decides
 * nothing the plan did not: a binding or a handler of a kind this slice does not print is a named loss in `losses`, which
 * the preflight lists, and the view draws without it.
 *
 * S1 is the visual tier (EXP-022 §9): the stack, the text, the controls, a prop-fed repeater, a page's state rows and
 * its States values, navigation, and an instance's props and callbacks. Logic components (`plan.hook`), Functions and
 * the record verbs are S2–S3.
 *
 * @module emit/swift/view
 */

import type { NodeIR } from '../../ir/types';
import type { CatalogIndex } from '../../catalog';
import type { ComponentPlan, ProjectPlan } from '../../analyze/plan';
import { computeNodeStyle } from '../style';
import { camelCase } from '../naming';
import { swiftStyle, type StackLayout } from './modifiers';
import type { Theme } from './theme';

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
  /** Legacy component path → the Swift struct that draws it, for an instance. */
  structOf: (legacyPath: string) => string | undefined;
  /** A navigate action's `to` (the page's url path) → the `Route` case. */
  routeOf: (urlPath: string) => string | undefined;
  styles: Parameters<typeof computeNodeStyle>[3];
}

export interface PrintedView {
  struct: string;
  source: string;
  losses: SwiftLoss[];
  /** `node: prop: value` the style table does not carry (web-only looks). */
  webOnly: Array<{ component: string; nodeId: string; decl: string }>;
  usesRouter: boolean;
}

/** A Swift string literal. */
export function swiftString(s: string): string {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"';
}

/** Names a View already has, so a prop or state row of that name would collide with SwiftUI's own. */
const VIEW_MEMBERS = new Set(['body', 'router']);
const SWIFT_KEYWORDS = new Set(['default', 'switch', 'case', 'class', 'struct', 'protocol', 'extension', 'func', 'var', 'let', 'in', 'repeat', 'return', 'self', 'Self', 'init', 'operator', 'where', 'is', 'as', 'some', 'any', 'true', 'false', 'nil', 'if', 'else', 'for', 'while', 'guard', 'do', 'try', 'catch', 'throw', 'import', 'enum', 'static', 'public', 'private', 'internal', 'subscript', 'Type', 'Protocol']);

/** A plan name (a port name may hold spaces: "Show Label") as a Swift member name. */
function ident(name: string): string {
  const base = /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : camelCase(name);
  if (VIEW_MEMBERS.has(base)) return `${base}_`;
  return SWIFT_KEYWORDS.has(base) ? `\`${base}\`` : base;
}

/** A plan's TypeScript type as the Swift property type and its default. */
function swiftType(tsType: string): { type: string; initial: string } {
  const t = tsType.replace(/\s+/g, '');
  if (t === 'string') return { type: 'String', initial: '""' };
  if (t === 'string|undefined') return { type: 'String?', initial: 'nil' };
  if (t === 'boolean') return { type: 'Bool', initial: 'false' };
  if (t === 'boolean|undefined') return { type: 'Bool?', initial: 'nil' };
  if (t === 'number') return { type: 'Double', initial: '0' };
  if (t === 'number|undefined') return { type: 'Double?', initial: 'nil' };
  if (t.endsWith('[]') || t.startsWith('Array<') || t.startsWith('readonly')) return { type: '[Any]', initial: '[]' };
  return { type: 'Any?', initial: 'nil' };
}

function literalParam(node: NodeIR, name: string): string | number | boolean | undefined {
  const p = node.parameters.find((q) => q.name === name) ?? node.inheritedParameters?.find((q) => q.name === name);
  return p?.value.kind === 'literal' ? p.value.value : undefined;
}

/** A value handed to an input of `type`, converted by JavaScript's rules as the runtime's input would read it. */
function coerce(value: string, type: string): string {
  if (type === 'String') return `JS.show(${value})`;
  if (type === 'Bool') return `JS.truthy(${value})`;
  if (type === 'Double') return `JS.number(${value})`;
  if (type === '[Any]') return `JS.rows(${value})`;
  return value;
}

export function structNameOf(plan: ComponentPlan): string {
  return `${plan.file!.symbol}View`;
}

export function printView(plan: ComponentPlan, ctx: SwiftViewContext): PrintedView {
  const struct = structNameOf(plan);
  const nodes = ctx.nodesOf(plan.path);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const losses: SwiftLoss[] = [];
  const webOnly: PrintedView['webOnly'] = [];
  let usesRouter = false;
  const lose = (nodeId: string, what: string) => {
    losses.push({ component: plan.path, nodeId, label: nodeById.get(nodeId)?.authoredLabel, what });
  };

  const stateNames = new Set(plan.stateVars.map((s) => s.name));
  const machineByNode = new Map(plan.statesMachines.map((m) => [m.nodeId, m]));

  /** A plan expression as Swift; undefined where this slice does not print it (the caller names the loss). */
  const expr = (e: any): string | undefined => {
    switch (e?.kind) {
      case 'prop':
        return ident(e.name);
      case 'literal':
        return typeof e.value === 'string' ? swiftString(e.value) : String(e.value);
      case 'state-get':
        return stateNames.has(e.name) ? ident(e.name) : undefined;
      case 'states-out': {
        const m = machineByNode.get(e.nodeId);
        if (!m || e.field !== 'value') return undefined;
        return `Self.${m.constName}[${ident(m.local)}]?[${swiftString(e.name)}]`;
      }
      case 'not': {
        const inner = expr(e.operand ?? e.expr);
        return inner === undefined ? undefined : `!JS.truthy(${inner})`;
      }
      case 'truthy': {
        const inner = expr(e.operand ?? e.expr);
        return inner === undefined ? undefined : `JS.truthy(${inner})`;
      }
      default:
        return undefined;
    }
  };

  /** A binding source as Swift, or the loss. */
  const binding = (nodeId: string, port: string, b: any): string | undefined => {
    if (b.kind === 'prop') return ident(b.name);
    if (b.kind === 'computed') {
      const s = expr(b.expr);
      if (s === undefined) lose(nodeId, `its ${port} is computed from a ${b.expr?.kind} expression, which the Swift target does not print yet`);
      return s;
    }
    lose(nodeId, `its ${port} reads a ${b.kind}${b.variableName ? ` (${b.variableName}${b.untyped ? ', untyped' : ''})` : ''}, which the Swift target does not carry yet`);
    return undefined;
  };

  const actions = (nodeId: string, list: any[]): string[] => {
    const out: string[] = [];
    for (const a of list) {
      if (a.kind === 'navigate' && a.pathParams.length === 0 && a.query.length === 0 && !a.newTab) {
        const route = ctx.routeOf(a.to);
        if (route) {
          usesRouter = true;
          out.push(`router.go(.${route})`);
          continue;
        }
      }
      if (a.kind === 'output-signal') {
        out.push(`${ident(a.prop)}()`);
        continue;
      }
      lose(nodeId, `a ${a.kind} action on its press is not carried yet`);
    }
    return out;
  };

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
        modifiers.push(`.onTapGesture { ${actions(id, press).join('; ')} }`);
      }
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
      out = mods(out, [...content, ...(canBeEmpty ? [`.collapsedWhenEmpty(${value})`] : []), ...s.box], pad);
    } else if (role === 'button') {
      const s = styleOf(id, role);
      const label = bound.label ? binding(id, 'label', bound.label) : undefined;
      const press = actions(id, plan.handlers[id]?.onClick ?? []);
      for (const port of Object.keys(plan.handlers[id] ?? {})) if (port !== 'onClick') lose(id, `its ${port} handler is not carried yet`);
      out = [
        `${pad}Button {`,
        ...(press.length ? press.map((a) => `${pad}  ${a}`) : [`${pad}  // Nothing is wired to this press.`]),
        `${pad}} label: {`,
        `${pad}  Text(verbatim: ${label !== undefined ? `JS.show(${label})` : swiftString(String(literalParam(node, 'label') ?? ''))})`,
        ...s.modifiers.map((m) => `${pad}    ${m}`),
        `${pad}}`,
        `${pad}.buttonStyle(.plain)`
      ];
    } else if (role === 'input') {
      const s = styleOf(id, role);
      const state = plan.stateVars.find((v) => v.originNodeId === id && v.origin === 'control');
      const placeholder = String(literalParam(node, 'placeholder') ?? '');
      const multiline = literalParam(node, 'type') === 'textArea';
      if (!state) lose(id, 'its text has no state row in the plan, so the field is drawn read-only');
      const textBinding = state ? `$${ident(state.name)}` : '.constant("")';
      out = [`${pad}TextField(${swiftString(placeholder)}, text: ${textBinding}${multiline ? ', axis: .vertical' : ''})`];
      out = mods(out, [...(multiline ? ['.lineLimit(nil)'] : []), '.textFieldStyle(.plain)', ...s.modifiers], pad);
      for (const port of Object.keys(plan.handlers[id] ?? {})) lose(id, `its ${port} handler is not carried yet`);
    } else if (role === 'instance') {
      const target = ctx.project.byLegacyPath.get(node.type);
      const targetStruct = ctx.structOf(node.type);
      if (!target || !targetStruct) {
        if (target?.hook) lose(id, `${node.type} is a logic component; it runs in S2 (the JavaScriptCore host), not in this slice`);
        else lose(id, `${node.type} draws nothing in the plan (${target?.skipReason ?? 'no plan'})`);
        return [];
      }
      const args: string[] = [];
      const propNames = new Set(target.props.map((p) => p.name));
      for (const p of target.props) {
        const b = bound[p.name];
        if (b) {
          const v = binding(id, p.name, b);
          if (v !== undefined) args.push(`${ident(p.name)}: ${coerce(v, swiftType(p.tsType).type)}`);
          continue;
        }
        const lit = literalParam(node, p.name);
        if (lit !== undefined) args.push(`${ident(p.name)}: ${coerce(typeof lit === 'string' ? swiftString(lit) : String(lit), swiftType(p.tsType).type)}`);
      }
      for (const port of Object.keys(bound)) if (!propNames.has(port)) lose(id, `its ${port} is bound, but ${node.type} has no such input`);
      const outputs = new Map(target.outputProps.map((o) => [o.port, o.prop]));
      for (const [port, list] of Object.entries(plan.handlers[id] ?? {})) {
        const prop = outputs.get(port);
        if (!prop) {
          lose(id, `its ${port} handler names no output of ${node.type}`);
          continue;
        }
        args.push(`${ident(prop)}: { ${actions(id, list).join('; ')} }`);
      }
      // A memberwise init takes its arguments in declaration order: props, then output callbacks, then lifted ones.
      const order = [...target.props.map((p) => p.name), ...target.outputProps.map((o) => o.prop), ...target.liftedOutputProps.map((o) => o.prop)].map(ident);
      const rank = (arg: string) => order.indexOf(arg.slice(0, arg.indexOf(':')));
      args.sort((a, b) => rank(a) - rank(b));
      out = [`${pad}${targetStruct}(${args.join(', ')})`];
    } else if (role === 'repeater') {
      const r = plan.repeaters[id];
      const templateStruct = r?.templatePath ? ctx.structOf(r.templatePath) : undefined;
      const template = r?.templatePath ? ctx.project.byLegacyPath.get(r.templatePath) : undefined;
      const items = r?.itemsExpr ? expr(r.itemsExpr) : undefined;
      if (!r || !templateStruct || !template || items === undefined || r.mapping !== 'template-inputs') {
        lose(id, `the For Each's rows are not drawn: ${!r ? 'the plan keeps no repeater' : items === undefined ? 'its items come from a source the Swift target does not read yet' : `mapping ${r.mapping} is not printed yet`}`);
        return [`${pad}// For Each ${id}: not drawn in this slice (see the preflight).`];
      }
      const args = template.props.map((p) => `${ident(p.name)}: ${coerce(`JS.field(row, ${swiftString(p.name)})`, swiftType(p.tsType).type)}`);
      out = [`${pad}ForEach(Array(JS.rows(${items}).enumerated()), id: \\.offset) { _, row in`, `${pad}  ${templateStruct}(${args.join(', ')})`, `${pad}}`];
    } else {
      lose(id, `a ${role} node is not drawn by the Swift target yet`);
      return [];
    }

    if (parent?.stretch && parent.axis === 'column' && role !== 'repeater') out.push(`${pad}  .frame(maxWidth: .infinity, alignment: .leading)`);
    if (bound.mounted) {
      const m = binding(id, 'mounted', bound.mounted);
      if (m !== undefined) out = [`${pad}if JS.truthy(${m}) {`, ...out.map((l) => '  ' + l), `${pad}}`];
    }
    return out;
  };

  // The struct's members: props, callbacks, state rows, States machines.
  const members: string[] = [];
  if (plan.docComment) members.push(`  // ${plan.docComment.split('\n')[0]}`);
  for (const p of plan.props) {
    const t = swiftType(p.tsType);
    members.push(`  var ${ident(p.name)}: ${t.type} = ${t.initial}`);
  }
  for (const o of plan.outputProps) members.push(`  var ${ident(o.prop)}: () -> Void = {}`);
  for (const o of plan.liftedOutputProps) members.push(`  var ${ident(o.prop)}: (Any?) -> Void = { _ in }`);
  for (const s of plan.stateVars) {
    const t = swiftType(s.tsType);
    const initial = s.boot === null ? t.initial : typeof s.boot === 'string' ? swiftString(s.boot) : String(s.boot);
    members.push(`  @State var ${ident(s.name)}: ${t.type} = ${initial}`);
    if (s.origin === 'lifted') lose(s.originNodeId ?? plan.rootId ?? '', `${s.name} is lifted from a child that does not run in this slice, so it stays ${s.boot === null ? 'empty' : JSON.stringify(s.boot)}`);
  }
  const statics: string[] = [];
  for (const m of plan.statesMachines) {
    members.push(`  @State var ${ident(m.local)}: String = ${swiftString(m.start ?? m.states[0] ?? '')}`);
    const rows = m.states.map((state) => {
      const cells = m.values.map((v) => {
        const value = String(v.byState[state] ?? '');
        if (v.type === 'color') ctx.theme.read(value);
        return `${swiftString(v.name)}: ${swiftString(value)}`;
      });
      return `    ${swiftString(state)}: [${cells.join(', ') || ':'}]`;
    });
    statics.push(`  /// ${m.comment.split('\n')[0]}`, `  static let ${m.constName}: [String: [String: String]] = [`, rows.join(',\n'), '  ]');
    const transitions = Object.keys(m.transitions ?? {}).length + m.values.filter((v) => Object.keys(v.transitions ?? {}).length > 0).length;
    if (m.useTransitions || transitions > 0) lose(m.nodeId, 'its transitions are not animated yet (withAnimation is S2)');
  }
  for (const call of plan.hookCalls) lose(call, `the logic component it places (${nodeById.get(call)?.type ?? call}) is not run in this slice; it runs in S2`);

  const body = plan.rootId ? print(plan.rootId, '    ') : ['    EmptyView()'];
  const page = plan.role === 'page';
  // A page scrolls, and its background reaches the screen's edges as the browser's body does.
  const bgDecl = page && plan.rootId ? styleCache.get(plan.rootId)?.decls.find((d) => d.prop === 'background-color') : undefined;
  const bg = bgDecl ? ctx.theme.read(bgDecl.value) : undefined;
  const bodyLines = page
    ? [
        '    ScrollView {',
        ...body.map((l) => '  ' + l),
        '      .frame(maxWidth: .infinity)',
        '    }',
        ...(bg?.kind === 'color' ? [`    .background(${bg.swift}.ignoresSafeArea())`] : [])
      ]
    : body;

  const source = [
    `// @nodegx:generated (EXP-022) — ${plan.path}, printed from the same plan as the React export.`,
    'import SwiftUI',
    '',
    `struct ${struct}: View {`,
    ...(usesRouter ? ['  @EnvironmentObject var router: AppRouter'] : []),
    ...members,
    ...(statics.length ? ['', ...statics] : []),
    '',
    '  var body: some View {',
    ...bodyLines,
    '  }',
    '}',
    ''
  ].join('\n');

  return { struct, source, losses, webOnly, usesRouter };
}
