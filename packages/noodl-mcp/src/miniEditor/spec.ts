/**
 * P125 CCN-008 — what a mini editor shows: the part on its stage and the controls for the settings the agent chose.
 *
 * The agent names a part and some of its settings; it never writes the editor. Every control here is built from the
 * settings list the part already declares — the catalog's ports for a built-in or kit node, the `Component Inputs`
 * ports for a placed component — which is the homepage's claim made literal: the list comes with the part. A setting
 * the part does not have is refused with the ones it does have, so the agent's next call can be right.
 *
 * Resolution reads the files fresh (`ProjectStore` over the folder, never the agent's own store: a read here must not
 * count as the agent having seen the component, or `what_changed_since` would miss what the person changes).
 *
 * @module miniEditor/spec
 */

import type { NodeV2 } from '../editor-deps';
import { buildEffectiveTokens, isComponentRef, readStoredTokens, refToPath } from '../editor-deps';
import { getNodeTypeDetail, type PortDetail } from '../catalog';
import { ToolError } from '../errors';
import type { ComponentFiles } from '../graph';
import type { ProjectStore } from '../project/ProjectStore';
import { toPathForm } from '../paths';

export type ControlKind = 'text' | 'textarea' | 'number' | 'units' | 'enum' | 'toggle' | 'color';

export interface Swatch {
  value: string;
  /** What to paint the swatch with: the token resolved to a literal, or the value itself. */
  css: string;
  label: string;
}

export interface Control {
  /** `<component key>:<node id>.<port>` — unique across components, whose node ids may repeat. */
  key: string;
  component: string;
  /** The component's runtime name (`/Pages/Home`), for `getComponentWithName` in the running app. */
  legacyName: string;
  node: string;
  nodeName: string;
  port: string;
  label: string;
  control: ControlKind;
  value: unknown;
  default?: unknown;
  enums?: Array<{ value: unknown; label: string }>;
  units?: string[];
  min?: number;
  max?: number;
  step?: number;
  swatches?: Swatch[];
  /** Colour only: whether a value outside the swatches may be typed. False when the agent gave `choices`. */
  custom?: boolean;
  description?: string;
  /** A visual state's value (`hover`, …) instead of the normal one; `null` as a value = "as normal". */
  state?: VisualState;
  /**
   * `style`: the change is written to the project's style for this node type (the variant the node wears, else the
   * type's element style in `nodegx.styles.json`, which Studio's Styles tab edits) and the node's own value is dropped,
   * so every node of the type that sets nothing itself follows. Absent: the node's own setting.
   */
  scope?: 'style';
  /** Style scope: the node type, and the named style the node wears (absent = the type's element style). */
  styleType?: string;
  styleName?: string;
  /** A normal-state control: what each visual state shows for this setting instead, when one changes it. */
  states?: Partial<Record<VisualState, unknown>>;
}

/** The visual states a control (Button, Checkbox, Text Input …) is drawn in (`nodes/controls/utils.ts`). */
export const VISUAL_STATES = ['hover', 'pressed', 'focused', 'disabled'] as const;
export type VisualState = (typeof VISUAL_STATES)[number];
const hasVisualStates = (type: string) => type.startsWith('net.noodl.controls.');

export interface Stage {
  /** The component rendered as the app's root (the runtime renders the root node's whole component). */
  component: string;
  legacyName: string;
  /** That component's visual root: the project's `rootNodeId` on the stage. */
  node: string;
  /** What the person is shown, in words: the part. */
  nodeName: string;
  /** 2D: the node whose elements are the only ones drawn; absent = the whole component. */
  target?: string;
  /** `3d`: a three-kit part, staged in its Scene with everything else hidden. */
  kind: '2d' | '3d';
  /** 3D: the ids of the target's subtree, the only objects left visible. */
  focus?: string[];
  /** 3D: the Scene node. */
  scene?: string;
  /** 2D, a control: the visual states the person can see it in beside normal (Hover, Pressed, Disabled …). */
  states?: VisualState[];
}

export interface Variant {
  name: string;
  values: Record<string, unknown>;
}

export interface SettingInput {
  component?: string;
  node?: string;
  port: string;
  label?: string;
  choices?: unknown[];
  min?: number;
  max?: number;
  step?: number;
  state?: VisualState;
  scope?: 'node' | 'style';
}

export interface MiniEditorInput {
  title: string;
  ask: string;
  kind?: 'approve' | 'tweak';
  show: { component: string; node?: string };
  settings: SettingInput[];
  variants?: Array<{ name: string; values: Record<string, unknown> }>;
}

export interface Resolved {
  stage: Stage;
  controls: Control[];
  variants: Variant[];
  /** For the agent: what the person would not see or could not tell apart, as the call stands. */
  warnings: string[];
}

const SCENE = 'three-kit.Scene';
const isThreeKit = (type: string) => type.startsWith('three-kit.');

interface Located {
  key: string;
  files: ComponentFiles;
}

/** A component by key, path or legacy name; refused with the nearest names when it is not there. */
export function locateComponent(store: ProjectStore, input: string): Located {
  const hit = store.resolve(input) ?? store.resolve(toPathForm(input));
  if (!hit) {
    const all = store.listComponents().map((c) => c.legacyName);
    throw new ToolError('not-found', `No component "${input}" in this project. Components: ${all.slice(0, 30).join(', ')}.`, {
      components: all
    });
  }
  const stored = store.format.readComponent(hit.key);
  return { key: stored.key, files: stored.files };
}

export function legacyNameOf(located: Located): string {
  return located.files.component.path ?? `/${located.key}`;
}

function nodesOf(files: ComponentFiles): NodeV2[] {
  return files.nodes.nodes as NodeV2[];
}

export function nodeName(node: NodeV2): string {
  return node.label ? `${node.label} (${node.type})` : node.type;
}

/** A node by id, then by label (exact, then any case). Two nodes with the label is a refusal naming their ids. */
export function locateNode(located: Located, ref: string): NodeV2 {
  const nodes = nodesOf(located.files);
  const byId = nodes.find((n) => n.id === ref);
  if (byId) return byId;
  let byLabel = nodes.filter((n) => n.label === ref);
  if (byLabel.length === 0) byLabel = nodes.filter((n) => n.label?.toLowerCase() === ref.toLowerCase());
  if (byLabel.length === 1) return byLabel[0];
  if (byLabel.length > 1) {
    throw new ToolError(
      'invalid-argument',
      `${byLabel.length} nodes in ${legacyNameOf(located)} are labelled "${ref}": name one by id (${byLabel.map((n) => n.id).join(', ')}).`
    );
  }
  const named = nodes.map((n) => `${n.id}${n.label ? ` "${n.label}"` : ''}`);
  throw new ToolError('not-found', `No node "${ref}" in ${legacyNameOf(located)}. Its nodes: ${named.slice(0, 40).join(', ')}.`);
}

function parentOf(located: Located, node: NodeV2): NodeV2 | undefined {
  if (!node.parent) return undefined;
  return nodesOf(located.files).find((n) => n.id === node.parent);
}

function subtreeIds(located: Located, root: NodeV2): string[] {
  const nodes = nodesOf(located.files);
  const out: string[] = [];
  const walk = (n: NodeV2) => {
    out.push(n.id);
    for (const id of n.children ?? []) {
      const c = nodes.find((x) => x.id === id);
      if (c) walk(c);
    }
  };
  walk(root);
  return out;
}

function visualRoot(located: Located): NodeV2 {
  const nodes = nodesOf(located.files);
  const roots = (located.files.nodes as { visualRoots?: string[] }).visualRoots ?? [];
  const first = roots.map((id) => nodes.find((n) => n.id === id)).find(Boolean) ?? nodes.find((n) => !n.parent && n.children?.length);
  if (!first) throw new ToolError('invalid-argument', `${legacyNameOf(located)} draws nothing: it has no visual root to show.`);
  return first;
}

/**
 * The stage: what the panel renders, and which of it the person sees.
 *
 * 🔴 Measured in the first drive (2026-10-24): the runtime takes `rootNodeId` to choose the root COMPONENT and renders
 * that component from its top. Pointing it at the hero inside a page drew the whole page, nav first. So the stage
 * renders the component that holds the part, and the panel draws only the part's elements (`target`).
 *
 * - A node named in a page, or in a component placed nowhere: that component, the node as the target.
 * - A node named inside a component placed on a page: the page holding its first copy (its inputs carry real values,
 *   as Studio's reusable canvas reads the first copy), the node as the target (the runtime finds a copy's inner node
 *   from the page).
 * - A component and no node: a page shows whole; a placed component is the target of its first copy.
 * - A three-kit part: its Scene's component, the Scene filling the stage, everything outside the part hidden.
 */
export function resolveStage(
  store: ProjectStore,
  show: { component: string; node?: string }
): { located: Located; named: Located; node: NodeV2; stage: Stage } {
  const named = locateComponent(store, show.component);
  const isPage = named.files.component.type === 'page';
  const usage = isPage ? undefined : store.findUsages(legacyNameOf(named))[0];
  const host = usage ? locateComponent(store, usage.component) : named;

  let located = named;
  let node: NodeV2;
  let target: string | undefined;
  if (show.node !== undefined) {
    node = locateNode(named, show.node);
    target = node.id;
  } else if (usage) {
    located = host;
    node = locateNode(host, usage.nodeId);
    target = node.id;
  } else {
    node = visualRoot(named);
    target = isPage ? undefined : node.id;
  }
  // 🔴 Measured (drive 2): a placed copy draws no element of its own — `elementsOf("sec_hero")` is empty while its
  // component's root `hero_band` is the band on the page. So a copy is targeted by its component's visual root.
  if (target !== undefined && isComponentRef(node.type)) {
    try {
      target = visualRoot(locateComponent(store, refToPath(node.type))).id;
    } catch {
      /* a component that draws nothing: the whole stage is shown */
    }
  }
  const rendered = host;
  const root = visualRoot(rendered);
  const base = { component: rendered.key, legacyName: legacyNameOf(rendered), node: root.id, nodeName: nodeName(node) };

  if (isThreeKit(node.type)) {
    let scene: NodeV2 | undefined = node.type === SCENE ? node : parentOf(located, node);
    while (scene && scene.type !== SCENE) scene = parentOf(located, scene);
    if (!scene) {
      throw new ToolError('invalid-argument', `${nodeName(node)} is not inside a 3D Scene, so it draws nothing to show.`);
    }
    return {
      located,
      named,
      node,
      stage: { ...base, kind: '3d', scene: scene.id, ...(node.type === SCENE ? {} : { focus: subtreeIds(located, node) }) }
    };
  }
  return { located, named, node, stage: { ...base, kind: '2d', ...(target !== undefined && target !== root.id ? { target } : {}) } };
}

interface PortLike {
  name: string;
  displayName?: string;
  type: unknown;
  isSignal?: boolean;
  default?: unknown;
  description?: string;
  group?: string;
}

/** The settings a node declares: a placed component's `Component Inputs`, otherwise the catalog's inputs. */
function portsOfNode(store: ProjectStore, node: NodeV2): PortLike[] {
  if (isComponentRef(node.type)) {
    let child: Located;
    try {
      child = locateComponent(store, refToPath(node.type));
    } catch {
      return [];
    }
    const out: PortLike[] = [];
    for (const n of nodesOf(child.files)) {
      if (n.type !== 'Component Inputs') continue;
      for (const p of n.ports ?? []) {
        if (p.plug === 'output' || p.plug === undefined) out.push({ name: p.name, displayName: p.displayName, type: p.type ?? 'string', default: p.default });
      }
    }
    return out;
  }
  const detail = getNodeTypeDetail(node.type);
  if ('error' in detail) return [];
  return detail.inputs.map((p: PortDetail) => ({
    name: p.name,
    displayName: p.displayName,
    type: p.type,
    isSignal: p.isSignal,
    default: p.default,
    description: p.description,
    group: p.group
  }));
}

function typeName(type: unknown): string {
  if (typeof type === 'string') return type;
  if (type && typeof type === 'object' && typeof (type as { name?: unknown }).name === 'string') return (type as { name: string }).name;
  return 'unknown';
}

/** Enough for a row or two of swatches; the custom colour stays for anything else. */
const MAX_SWATCHES = 18;

type TokenMap = Map<string, { name: string; value: string; category?: string }>;

/** The project's tokens as the app paints them: the shipped defaults with the project's own on top. */
export interface Tokens {
  map: TokenMap;
  /** `var(--x)` → the literal it paints (followed through references); anything else as it is. */
  resolve(value: string): string;
  /** Whether `var(--x)` names a token this project has. A value that is not a token reference is not asked about. */
  has(value: string): boolean;
}

export function projectTokens(store: ProjectStore): Tokens {
  let map: TokenMap;
  try {
    map = buildEffectiveTokens(readStoredTokens(store.designTokenMetaSource())) as TokenMap;
  } catch {
    map = new Map();
  }
  const resolve = (value: string, depth = 0): string => {
    const m = TOKEN_REF.exec(value.trim());
    if (!m || depth > 8) return value;
    const next = map.get(m[1]);
    return next ? resolve(next.value, depth + 1) : value;
  };
  return { map, resolve: (v) => resolve(v), has: (v) => !TOKEN_REF.test(v.trim()) || map.has(TOKEN_REF.exec(v.trim())![1]) };
}

const TOKEN_REF = /^var\((--[\w-]+)\)$/;

/** The project's colour tokens, resolved to literals so a swatch can be painted. */
export function colourSwatches(store: ProjectStore, tokens: Tokens = projectTokens(store)): Swatch[] {
  const { map: effective, resolve } = tokens;
  // The semantic colours first (primary, accent, foreground: what a design is made of), then the palette's.
  // Several neutrals resolve to the same white: one swatch per colour painted, the first token that paints it.
  const out: Swatch[] = [];
  const painted = new Set<string>();
  for (const category of ['color-semantic', 'color-palette']) {
    for (const t of effective.values()) {
      if (t.category !== category) continue;
      const css = resolve(t.value);
      const key = css.trim().toLowerCase();
      if (painted.has(key)) continue;
      painted.add(key);
      out.push({ value: `var(${t.name})`, css, label: t.name.replace(/^--/, '') });
    }
  }
  return out.slice(0, MAX_SWATCHES);
}

function choiceLabel(v: unknown): string {
  if (typeof v === 'string') return v.replace(/^var\(--([\w-]+)\)$/, '$1');
  return JSON.stringify(v);
}

/** A style in `nodegx.styles.json`: the named one a node wears, or its type's element style (no name). */
export interface StyleVariant {
  typename: string;
  name?: string;
  parameters?: Record<string, unknown>;
  stateParameters?: Record<string, Record<string, unknown>>;
}

export function styleOf(styles: StyleVariant[], node: NodeV2): StyleVariant | undefined {
  const wanted = typeof node.variant === 'string' && node.variant !== '' ? node.variant : undefined;
  return styles.find((v) => v.typename === node.type && (wanted === undefined ? v.name === undefined || v.name === null || v.name === '' : v.name === wanted));
}

export function readStyleVariants(store: ProjectStore): StyleVariant[] {
  try {
    return ((store.readStyles()?.variants ?? []) as StyleVariant[]).filter((v) => v && typeof v.typename === 'string');
  } catch {
    return [];
  }
}

const own = (o: Record<string, unknown> | undefined, k: string) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/** What the part shows for a setting in its normal state: the node's own value, else its style's, else the default. */
export function normalValue(node: NodeV2, style: StyleVariant | undefined, port: string, fallback: unknown): unknown {
  if (own(node.parameters, port)) return node.parameters![port];
  if (own(style?.parameters, port)) return style!.parameters![port];
  return fallback;
}

/**
 * What the part shows for a setting in a visual state, or `null` when the state leaves it as normal. The runtime's
 * order (`react-component-node.ts` `getParametersForStates`): the style's state value, then the node's own NORMAL
 * value over it (a colour set on the node beats its style's hover), then the node's own state value over both.
 */
export function stateValue(node: NodeV2, style: StyleVariant | undefined, state: VisualState, port: string): unknown {
  const nodeState = node.stateParameters?.[state];
  if (own(nodeState, port)) return nodeState![port];
  const styleState = style?.stateParameters?.[state];
  if (own(styleState, port) && !own(node.parameters, port)) return styleState![port];
  return null;
}

export function controlFor(
  store: ProjectStore,
  located: Located,
  node: NodeV2,
  input: SettingInput,
  swatches: () => Swatch[],
  tokens: Tokens = projectTokens(store),
  styles: StyleVariant[] = readStyleVariants(store)
): Control {
  const ports = portsOfNode(store, node);
  const port = ports.find((p) => p.name === input.port) ?? ports.find((p) => p.displayName?.toLowerCase() === input.port.toLowerCase());
  if (!port || port.isSignal) {
    const settable = ports.filter((p) => !p.isSignal && typeName(p.type) !== 'signal');
    const names = settable.map((p) => (p.displayName && p.displayName !== p.name ? `${p.name} (${p.displayName})` : p.name));
    throw new ToolError(
      'invalid-argument',
      port?.isSignal
        ? `"${input.port}" on ${nodeName(node)} is a signal, not a setting: a mini editor shows settings.`
        : `${nodeName(node)} has no setting "${input.port}". Its settings: ${names.slice(0, 60).join(', ')}.`,
      { node: node.id, settings: settable.map((p) => p.name) }
    );
  }
  const t = port.type as { name?: string; enums?: Array<{ value: unknown; label?: string } | string>; units?: string[]; defaultUnit?: string; multiline?: boolean };
  const name = typeName(port.type);
  const state = input.state;
  if (state !== undefined && !hasVisualStates(node.type)) {
    throw new ToolError(
      'invalid-argument',
      `${nodeName(node)} is not drawn in visual states (${VISUAL_STATES.join(', ')}): only controls are (Button, Checkbox, Text Input …). Drop "state".`
    );
  }
  const scope: 'style' | undefined = input.scope === 'style' ? 'style' : undefined;
  if (scope && (isComponentRef(node.type) || isThreeKit(node.type))) {
    throw new ToolError(
      'invalid-argument',
      `${nodeName(node)} has no project style to change: scope "style" is for an element (a Button, a Text, a Group …), whose style every element of its type wears.`
    );
  }
  const style = styleOf(styles, node);
  for (const c of input.choices ?? []) {
    if (typeof c === 'string' && !tokens.has(c)) {
      const kind = name === 'color' ? (tk: { category?: string }) => (tk.category ?? '').startsWith('color') : () => true;
      const prefix = /^var\(--([a-z]+)/.exec(c)?.[1] ?? '';
      const near = [...tokens.map.values()].filter((tk) => kind(tk) && (name === 'color' || tk.name.startsWith(`--${prefix}`))).map((tk) => tk.name.replace(/^--/, ''));
      throw new ToolError(
        'invalid-argument',
        `${c} is not a token in this project, so the person would see nothing change when they pick it. ` +
          `${name === 'color' ? 'Its colour tokens' : 'Tokens like it'}: ${near.slice(0, 40).join(', ') || '(none)'}.`,
        { choice: c, tokens: near }
      );
    }
  }
  const value = state !== undefined ? stateValue(node, style, state, port.name) : normalValue(node, style, port.name, port.default);
  const states: Partial<Record<VisualState, unknown>> = {};
  if (state === undefined && hasVisualStates(node.type)) {
    for (const s of VISUAL_STATES) {
      const v = stateValue(node, style, s, port.name);
      if (v !== null) states[s] = v;
    }
  }
  const base = {
    key: `${located.key}:${node.id}.${port.name}${state !== undefined ? `@${state}` : ''}`,
    component: located.key,
    legacyName: legacyNameOf(located),
    node: node.id,
    nodeName: nodeName(node),
    port: port.name,
    label: input.label ?? (state !== undefined ? `${port.displayName ?? port.name} (${state})` : (port.displayName ?? port.name)),
    value,
    ...(port.default !== undefined ? { default: port.default } : {}),
    ...(port.description ? { description: port.description } : {}),
    ...(state !== undefined ? { state } : {}),
    ...(scope ? { scope, styleType: node.type, ...(style?.name ? { styleName: style.name } : {}) } : {}),
    ...(Object.keys(states).length > 0 ? { states } : {})
  };
  const range = {
    ...(input.min !== undefined ? { min: input.min } : port.name === 'opacity' ? { min: 0 } : {}),
    ...(input.max !== undefined ? { max: input.max } : port.name === 'opacity' ? { max: 1 } : {}),
    ...(input.step !== undefined ? { step: input.step } : port.name === 'opacity' ? { step: 0.01 } : {})
  };

  if (name === 'color') {
    const given = input.choices?.filter((c): c is string => typeof c === 'string');
    const all = swatches();
    // 🔴 P125-CCN008-WHITESWATCH: the agent's own choices are painted with what each one resolves to, never looked up
    // in the deduplicated list (`all` keeps one token per colour, so a second token for the same white had no swatch
    // and was painted with its own `var(--…)`, which means nothing in the panel: an empty circle).
    const list = given ? given.map((v) => ({ value: v, css: tokens.resolve(v), label: choiceLabel(v) })) : all;
    return { ...base, control: 'color', swatches: list, custom: !given };
  }
  if (input.choices && input.choices.length > 0) {
    return { ...base, control: 'enum', enums: input.choices.map((v) => ({ value: v, label: choiceLabel(v) })) };
  }
  if (name === 'enum' && Array.isArray(t?.enums)) {
    return {
      ...base,
      control: 'enum',
      enums: t.enums.map((e) => (typeof e === 'object' && e !== null ? { value: e.value, label: e.label ?? String(e.value) } : { value: e, label: String(e) }))
    };
  }
  if (name === 'boolean') return { ...base, control: 'toggle' };
  if ((name === 'number' || name === 'dimension') && Array.isArray(t?.units) && t.units.length > 0) {
    const units = t.defaultUnit && t.units.includes(t.defaultUnit) ? [t.defaultUnit, ...t.units.filter((u) => u !== t.defaultUnit)] : t.units;
    return { ...base, control: 'units', units, ...range };
  }
  if (name === 'number') return { ...base, control: 'number', ...range };
  if (name === 'string' && (t?.multiline || port.name === 'text')) return { ...base, control: 'textarea' };
  return { ...base, control: 'text' };
}

/** Everything a mini editor needs, from the agent's arguments and the files as they are now. */
export function resolveMiniEditor(store: ProjectStore, input: MiniEditorInput): Resolved {
  // A setting's node is looked for in the component the agent named (`show.component`), even when the stage is that
  // component's placed copy on another page; a setting with no node is the node shown.
  const { located: stageAt, named, node: stageNode, stage } = resolveStage(store, input.show);
  const tokens = projectTokens(store);
  const styles = readStyleVariants(store);
  let painted: Swatch[] | undefined;
  const swatches = () => (painted ??= colourSwatches(store, tokens));
  const controls: Control[] = [];
  const nodesOfControls = new Map<string, NodeV2>();
  const refs = new Map<string, string>();
  for (const s of input.settings) {
    const located = s.component !== undefined ? locateComponent(store, s.component) : s.node !== undefined ? named : stageAt;
    const node = s.node !== undefined ? locateNode(located, s.node) : stageNode;
    const control = controlFor(store, located, node, s, swatches, tokens, styles);
    if (controls.some((c) => c.key === control.key)) {
      throw new ToolError('invalid-argument', `"${s.port}"${s.state ? ` (${s.state})` : ''} on ${nodeName(node)} is listed twice.`);
    }
    controls.push(control);
    nodesOfControls.set(control.key, node);
    const at = control.state ? `@${control.state}` : '';
    refs.set(`${s.node ?? ''}.${s.port}${at}`, control.key);
    refs.set(`${node.id}.${control.port}${at}`, control.key);
    if (node.label) refs.set(`${node.label}.${control.port}${at}`, control.key);
    refs.set(`${control.port}${at}`, refs.has(`${control.port}${at}`) ? '' : control.key);
  }
  // A control is shown in its visual states too (P125-CCN008-NOSTATES): Normal, Hover, Pressed, Disabled, and Focused
  // when something gives it a focused look.
  const target = nodesOfControls.size > 0 && stage.kind === '2d' ? stageNode : undefined;
  if (target && hasVisualStates(target.type)) {
    const style = styleOf(styles, target);
    const focusedLook = Object.keys(target.stateParameters?.focused ?? {}).length + Object.keys(style?.stateParameters?.focused ?? {}).length > 0;
    stage.states = VISUAL_STATES.filter((s) => s !== 'focused' || focusedLook || controls.some((c) => c.state === 'focused'));
  }
  const warnings = warningsFor(store, controls, nodesOfControls);
  const variants: Variant[] = (input.variants ?? []).map((v) => {
    const values: Record<string, unknown> = {};
    for (const [ref, value] of Object.entries(v.values)) {
      const key = refs.get(ref) ?? refs.get(ref.replace(/^\./, ''));
      if (!key) {
        throw new ToolError(
          'invalid-argument',
          `Variant "${v.name}" sets "${ref}", which is not one of this editor's settings. Key each value "<node>.<port>" ` +
            `(or the port alone when only one node has it): ${controls.map((c) => `${c.node}.${c.port}`).join(', ')}.`
        );
      }
      values[key] = value;
    }
    return { name: v.name, values };
  });
  return { stage, controls, variants, warnings };
}

const show = (v: unknown) => (typeof v === 'string' ? v.replace(TOKEN_REF, (_m, n: string) => n.replace(/^--/, '')) : JSON.stringify(v));

/**
 * What the agent is told before the person sees the editor. Each line is a thing the person would not see or could
 * not tell apart (Richard's Muddy Paws run, 2026-10-25: three text colours that all painted white, and a hover the
 * editor did not show).
 */
function warningsFor(store: ProjectStore, controls: Control[], nodes: Map<string, NodeV2>): string[] {
  const out: string[] = [];
  for (const c of controls) {
    // Choices that paint the same.
    if (c.control === 'color' && !c.custom && c.swatches) {
      const byPaint = new Map<string, string[]>();
      for (const s of c.swatches) {
        const k = s.css.trim().toLowerCase();
        byPaint.set(k, [...(byPaint.get(k) ?? []), s.label]);
      }
      for (const [paint, labels] of byPaint) {
        if (labels.length > 1) out.push(`${c.label}: ${labels.join(' and ')} all paint ${paint}, so the person sees no difference between them. Offer colours that differ.`);
      }
    }
    // A visual state that hides the person's change.
    if (c.state === undefined && c.states && !controls.some((x) => x.node === c.node && x.port === c.port && x.state)) {
      for (const [s, v] of Object.entries(c.states)) {
        out.push(
          `${c.label}: when ${s}, ${c.nodeName} shows ${show(v)} instead, so the person's choice is not what it shows ${s}. ` +
            `Add { port: "${c.port}", state: "${s}" } so they choose that too, or it keeps ${show(v)}.`
        );
      }
    }
  }
  // Node settings on an element whose type others share: the agent should know a style exists for "every button".
  const nodeScoped = controls.filter((c) => !c.scope && !isComponentRef(nodes.get(c.key)?.type ?? '/'));
  const types = new Set(nodeScoped.map((c) => nodes.get(c.key)!.type));
  for (const type of types) {
    let others = 0;
    for (const row of store.listComponents()) {
      try {
        others += nodesOf(store.peekComponent(row.path).files).filter((n) => n.type === type).length;
      } catch {
        /* unreadable: not counted */
      }
    }
    if (others > 1) {
      const detail = getNodeTypeDetail(type);
      const display = 'error' in detail ? type : detail.displayName;
      out.push(
        `These settings change this one ${display} only; the project has ${others}. If the person is choosing the look of ` +
          `every ${display}, give the settings scope: "style" (the project's ${display} style, Studio's Styles tab).`
      );
    }
  }
  return out;
}

/** The controls again, with the values the files hold now (the person or the agent may have changed them). */
export function currentValues(store: ProjectStore, controls: Control[]): Control[] {
  const cache = new Map<string, Located>();
  const styles = readStyleVariants(store);
  return controls.map((c) => {
    try {
      const located = cache.get(c.component) ?? locateComponent(store, c.component);
      cache.set(c.component, located);
      const node = nodesOf(located.files).find((n) => n.id === c.node);
      if (!node) return c;
      const style = styleOf(styles, node);
      if (c.state) return { ...c, value: stateValue(node, style, c.state, c.port) };
      const states: Partial<Record<VisualState, unknown>> = {};
      if (hasVisualStates(node.type)) {
        for (const s of VISUAL_STATES) {
          const v = stateValue(node, style, s, c.port);
          if (v !== null) states[s] = v;
        }
      }
      const { states: _old, ...rest } = c;
      void _old;
      return { ...rest, value: normalValue(node, style, c.port, c.default), ...(Object.keys(states).length ? { states } : {}) };
    } catch {
      return c;
    }
  });
}

/** Whether `value` is one this control accepts; a reason when not. */
export function refuseValue(control: Control, value: unknown): string | null {
  if (value === null || value === undefined) return null; // back to the default
  switch (control.control) {
    case 'toggle':
      return typeof value === 'boolean' ? null : 'an on/off setting takes true or false';
    case 'enum':
      return control.enums?.some((e) => JSON.stringify(e.value) === JSON.stringify(value)) ? null : 'not one of its choices';
    case 'color':
      if (typeof value !== 'string') return 'a colour is a string';
      if (!control.custom && !control.swatches?.some((s) => s.value === value)) return 'not one of its colours';
      return null;
    case 'number':
    case 'units': {
      const n =
        typeof value === 'number'
          ? value
          : typeof value === 'string'
            ? /^var\(--[\w-]+\)$/.test(value)
              ? NaN
              : parseFloat(value)
            : typeof value === 'object' && value !== null && typeof (value as { value?: unknown }).value === 'number'
              ? (value as { value: number }).value
              : NaN;
      if (typeof value === 'string' && /^var\(--[\w-]+\)$/.test(value)) return null; // a token is always allowed
      if (!Number.isFinite(n)) return 'not a number';
      if (control.min !== undefined && n < control.min) return `below ${control.min}`;
      if (control.max !== undefined && n > control.max) return `above ${control.max}`;
      return null;
    }
    default:
      return typeof value === 'string' ? null : 'text is a string';
  }
}
