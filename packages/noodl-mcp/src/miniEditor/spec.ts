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
}

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

/** The project's colour tokens, resolved to literals so a swatch can be painted. */
export function colourSwatches(store: ProjectStore): Swatch[] {
  let effective: Map<string, { name: string; value: string; category?: string }>;
  try {
    effective = buildEffectiveTokens(readStoredTokens(store.designTokenMetaSource())) as typeof effective;
  } catch {
    return [];
  }
  const resolve = (value: string, depth = 0): string => {
    const m = /^var\((--[\w-]+)\)$/.exec(value.trim());
    if (!m || depth > 8) return value;
    const next = effective.get(m[1]);
    return next ? resolve(next.value, depth + 1) : value;
  };
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

export function controlFor(
  store: ProjectStore,
  located: Located,
  node: NodeV2,
  input: SettingInput,
  swatches: () => Swatch[]
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
  const value = node.parameters?.[port.name] ?? port.default;
  const base = {
    key: `${located.key}:${node.id}.${port.name}`,
    component: located.key,
    legacyName: legacyNameOf(located),
    node: node.id,
    nodeName: nodeName(node),
    port: port.name,
    label: input.label ?? port.displayName ?? port.name,
    value,
    ...(port.default !== undefined ? { default: port.default } : {}),
    ...(port.description ? { description: port.description } : {})
  };
  const range = {
    ...(input.min !== undefined ? { min: input.min } : port.name === 'opacity' ? { min: 0 } : {}),
    ...(input.max !== undefined ? { max: input.max } : port.name === 'opacity' ? { max: 1 } : {}),
    ...(input.step !== undefined ? { step: input.step } : port.name === 'opacity' ? { step: 0.01 } : {})
  };

  if (name === 'color') {
    const given = input.choices?.filter((c): c is string => typeof c === 'string');
    const all = swatches();
    const list = given
      ? given.map((v) => all.find((s) => s.value === v) ?? { value: v, css: v, label: choiceLabel(v) })
      : all;
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
  let tokens: Swatch[] | undefined;
  const swatches = () => (tokens ??= colourSwatches(store));
  const controls: Control[] = [];
  const refs = new Map<string, string>();
  for (const s of input.settings) {
    const located = s.component !== undefined ? locateComponent(store, s.component) : s.node !== undefined ? named : stageAt;
    const node = s.node !== undefined ? locateNode(located, s.node) : stageNode;
    const control = controlFor(store, located, node, s, swatches);
    if (controls.some((c) => c.key === control.key)) {
      throw new ToolError('invalid-argument', `"${s.port}" on ${nodeName(node)} is listed twice.`);
    }
    controls.push(control);
    refs.set(`${s.node ?? ''}.${s.port}`, control.key);
    refs.set(`${node.id}.${control.port}`, control.key);
    if (node.label) refs.set(`${node.label}.${control.port}`, control.key);
    refs.set(control.port, refs.has(control.port) ? '' : control.key);
  }
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
  return { stage, controls, variants };
}

/** The controls again, with the values the files hold now (the person or the agent may have changed them). */
export function currentValues(store: ProjectStore, controls: Control[]): Control[] {
  const cache = new Map<string, Located>();
  return controls.map((c) => {
    try {
      const located = cache.get(c.component) ?? locateComponent(store, c.component);
      cache.set(c.component, located);
      const node = nodesOf(located.files).find((n) => n.id === c.node);
      if (!node) return c;
      return { ...c, value: node.parameters?.[c.port] ?? c.default };
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
