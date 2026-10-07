/**
 * NSP-023 AC4 — THE PAGE MODEL, and the guard that keeps React-made state out of a visual spec.
 *
 * R11 / R12 (README §7): a visual spec says what a person sees and what the wire carries, in words any renderer can
 * honour. The sort (NSP-023 §3) asked of every state field: *would a renderer that writes the element directly, at once,
 * still keep this?* This file is that question as something that fails. Every visual spec (one with `acts` or a
 * `world.place`) has a model here, hand-kept like `scripts/node-spec/tiers.json`, that puts each of its state keys in
 * one class:
 *
 *   - `node` — what the node's code holds (its `_internal`, its props as written, its outputs).
 *   - `attr` — what the paint writes onto the element from the node: after every paint it equals its projection of
 *     the node's keys (`follows`). `KEEP` from a projection means "not drawn now" (off the page): no check.
 *   - `element` — which element is on the page (a counter): it changes only in a paint where one of `changesWith` does.
 *   - `held` — what the BROWSER holds on the element and a person moves: the keyboard, the caret, a select's selection,
 *     a range's handle. The paint may move it (the browser's own rules), but something other than a paint must move it
 *     too — a person's act, or the node writing the element at once. Each says what it is: either it `shows` a node value
 *     (the selection shows the Value wherever the list offers it — R14, "show whatever the last value it received was"),
 *     checked after every paint like an attribute, or it `keeps` one of the few things only the browser has.
 *
 * The rules (`checkSpec`), each measured on the interpreter over the spec's scenarios and its generated sequences:
 *
 *   G1  the model classifies every state key exactly once, and every visual spec has a model.
 *   G2  THE PAINT WRITES NO NODE KEY except the spec's `frameEnd` list — the node's own frame-end work, each with its
 *       line. (A copy of a node value "as last rendered", or a value waiting for a commit, is written only by the paint.)
 *   G3  THE NODE READS NO PAGE KEY: an input, a signal or a world event does not depend on an `attr`, `element` or `held`
 *       key — measured by perturbing the key and comparing the reducer's patch — except the `elementCalls` a node makes
 *       on its element (a Focus action meets the element's `disabled`), each with its line.
 *   G4  AN ATTRIBUTE FOLLOWS, WHAT IS SHOWN SHOWS, and an element changes with its element: after every paint, each
 *       `attr` equals its projection and each held key that `shows` equals its; an `element` key changes only beside one
 *       of its `changesWith`. (A component's own copy of a value the node holds is a held key that stops showing it.)
 *   G5  THE PAINT HAS NO MEMORY: the paint run on the state with every `attr` already drawn (preset to its projection)
 *       leaves the same node keys, sends the same outputs and fires the same pulses, Did Mount and Will Unmount aside.
 *       (React's effect keyed on "the value it last rendered" is exactly a paint that remembers.)
 *   G6  A HELD KEY IS HELD: something other than a paint moves it, somewhere in the run. A copy only the paint writes
 *       is an attribute, and must say what it follows.
 *   G7  A PERSON'S EVENTS FIRE FROM THE PERSON: the paint fires Did Mount, Will Unmount and the spec's `framePulses`
 *       (the node's own frame-end pulses) and nothing else. ("Who made it", read at a paint, is how React decided.)
 *   G8  THE WORLD'S KINDS ARE THE FORMAT'S: each spec's world handlers are among the format's, and the format's list is
 *       pinned here — a new kind (a `turn`, "React commits") has to be sorted before it lands.
 *
 * "The paint" is what the interpreter runs at a frame's end (`afterInputs`) and at the placing (`world.place`). An act
 * paints first too; the act's own writes are told from its paint by playing the paint alone beside it (G6).
 */

import { interpreterAdapter, runConformance } from '../src';
import type { AnyNodeSpec } from '../src';

export const KEEP = Symbol('not drawn now');

/** The few things a browser keeps on an element that show no node value. A held key that is none of these `shows` one. */
export type Keeps = 'the keyboard' | 'the caret' | 'what a module put on the element' | 'a drag from outside the page' | 'where the pointer is';
export type Held = { shows: (s: Readonly<Record<string, unknown>>) => unknown } | { keeps: Keeps };

export interface PageModel {
  node: readonly string[];
  attr: Readonly<Record<string, { follows: (s: Readonly<Record<string, unknown>>) => unknown; preset?: false; why?: string }>>;
  element?: Readonly<Record<string, { changesWith: readonly string[] }>>;
  held: Readonly<Record<string, Held>>;
  /** node keys the paint (or the placing) may write: the node's own frame-end work, or what the placing hands it */
  frameEnd?: readonly string[];
  /** a node-side reducer (`on.<port>`, `world.<kind>`) that calls its element → the page keys it may depend on */
  elementCalls?: Readonly<Record<string, readonly string[]>>;
  /** pulses beyond Did Mount / Will Unmount the paint may fire: the node's own frame-end pulses */
  framePulses?: readonly string[];
}

/** never preset: an element appearing or leaving is the element's lifecycle — Did Mount, a node announcing itself (G5) */
const onPage = { follows: (s: Readonly<Record<string, unknown>>) => s.mounted, preset: false as const };
const pageEnabled = { follows: (s: Readonly<Record<string, unknown>>) => s.enabled };
const pageVisible = { follows: (s: Readonly<Record<string, unknown>>) => s.visible };
/** utils.ts :340-364 — the Focus and Blur actions call the element: they meet what is on the page */
const keyboard = { keeps: 'the keyboard' } as const;
const FOCUS_CALLS = {
  'on.focus': ['onPage', 'pageEnabled', 'pageVisible', 'elementFocused'],
  'on.blur': ['onPage', 'pageEnabled', 'pageVisible', 'elementFocused']
};
const FIELD_CALL = ['onPage', 'elementFocused', 'field', 'pageType', 'caret', 'hadCaret'];
const CONTROL_NODE = ['enabled', 'hover', 'pressed', 'focused', 'mounted', 'visible'];

export const PAGE_MODELS: Readonly<Record<string, PageModel>> = {
  'net.noodl.controls.button': {
    node: CONTROL_NODE,
    attr: { onPage, pageEnabled, pageVisible },
    held: { elementFocused: keyboard },
    elementCalls: FOCUS_CALLS
  },
  'net.noodl.controls.checkbox': {
    node: [...CONTROL_NODE, 'checked'],
    attr: { onPage, pageEnabled, pageVisible },
    held: { elementFocused: keyboard },
    elementCalls: FOCUS_CALLS
  },
  'net.noodl.visual.icon': {
    node: ['mounted'],
    attr: { onPage },
    held: {}
  },
  Text: {
    node: ['mounted', 'tag', 'chain', 'visible', 'opacityZero', 'peStyle', 'peEnabled', 'draggable', 'dragValue', 'holdToDrag', 'holdTime', 'acceptDrops', 'acceptKind', 'dragKind', 'phase', 'input', 'inZone', 'carry', 'carryBy', 'swallow', 'isLifted', 'isDropTarget', 'droppedValue', 'dropIndex', 'acceptFileDrops', 'acceptedFileTypes', 'dragDepth', 'isDragOver', 'droppedFiles', 'droppedFile'],
    attr: {
      onPage,
      // an element's type cannot change: presetting it would claim an element the page does not have
      shownTag: { follows: (s) => (s.onPage ? s.tag : KEEP), preset: false }
    },
    element: { elem: { changesWith: ['onPage', 'shownTag'] } },
    // s50 — a file dragged from the desktop: the files it carries and the element it is over are the browser's drag, moved by a person
    held: { elementFocused: keyboard, attrsOn: { keeps: 'what a module put on the element' }, fileCarry: { keeps: 'a drag from outside the page' }, fileOn: { keeps: 'a drag from outside the page' },
      // s51 — the zone side: a card beside it holds the keyboard; the element the pointer is over; the element its own pointer drag started on
      cardFocused: keyboard,
      pointerAt: { keeps: 'where the pointer is' },
      sourceElem: { keeps: 'what a module put on the element' }
    },
    // drag-drop.ts :136-145 `whenMounted` counts frame starts until the node has an element
    frameEnd: ['chain'],
    elementCalls: { 'on.draggable': ['onPage', 'elem', 'attrsOn'], 'on.acceptDrops': [], 'world.timer': ['onPage', 'elem', 'pointerAt', 'sourceElem'] }
  },
  // s53 — the Text's model with no Tag: the element is always a `<div>`, so only a mount makes a new one
  Circle: {
    node: ['mounted', 'chain', 'visible', 'opacityZero', 'peStyle', 'peEnabled', 'draggable', 'dragValue', 'holdToDrag', 'holdTime', 'acceptDrops', 'acceptKind', 'dragKind', 'phase', 'input', 'inZone', 'carry', 'carryBy', 'swallow', 'isLifted', 'isDropTarget', 'droppedValue', 'dropIndex', 'acceptFileDrops', 'acceptedFileTypes', 'dragDepth', 'isDragOver', 'droppedFiles', 'droppedFile'],
    attr: { onPage },
    element: { elem: { changesWith: ['onPage'] } },
    held: { elementFocused: keyboard, attrsOn: { keeps: 'what a module put on the element' }, fileCarry: { keeps: 'a drag from outside the page' }, fileOn: { keeps: 'a drag from outside the page' },
      cardFocused: keyboard,
      pointerAt: { keeps: 'where the pointer is' },
      sourceElem: { keeps: 'what a module put on the element' }
    },
    frameEnd: ['chain'],
    elementCalls: { 'on.draggable': ['onPage', 'elem', 'attrsOn'], 'on.acceptDrops': [], 'world.timer': ['onPage', 'elem', 'pointerAt', 'sourceElem'] }
  },
  // s53 — the Shape's model, and the picture: the element's source and Source Set as written (node), the last failure's reason
  Image: {
    node: ['mounted', 'chain', 'visible', 'opacityZero', 'peStyle', 'peEnabled', 'draggable', 'dragValue', 'holdToDrag', 'holdTime', 'acceptDrops', 'acceptKind', 'dragKind', 'phase', 'input', 'inZone', 'carry', 'carryBy', 'swallow', 'isLifted', 'isDropTarget', 'droppedValue', 'dropIndex', 'acceptFileDrops', 'acceptedFileTypes', 'dragDepth', 'isDragOver', 'droppedFiles', 'droppedFile', 'src', 'srcSet', 'imageError'],
    attr: { onPage },
    element: { elem: { changesWith: ['onPage'] } },
    held: { elementFocused: keyboard, attrsOn: { keeps: 'what a module put on the element' }, fileCarry: { keeps: 'a drag from outside the page' }, fileOn: { keeps: 'a drag from outside the page' },
      cardFocused: keyboard,
      pointerAt: { keeps: 'where the pointer is' },
      sourceElem: { keeps: 'what a module put on the element' }
    },
    frameEnd: ['chain'],
    elementCalls: { 'on.draggable': ['onPage', 'elem', 'attrsOn'], 'on.acceptDrops': [], 'world.timer': ['onPage', 'elem', 'pointerAt', 'sourceElem'] }
  },
  // s52 — the Text's model with the Group's additions: the focus tracker's list (the viewer's, moved by Focus and by clicks), the
  // element the component mounted with (the tracker finds the node on it, C86), the gesture's index, Block Pointer Events, the scrolls
  Group: {
    node: ['mounted', 'tag', 'chain', 'visible', 'opacityZero', 'peStyle', 'peEnabled', 'blocks', 'draggable', 'dragValue', 'holdToDrag', 'holdTime', 'acceptDrops', 'acceptKind', 'dragKind', 'phase', 'input', 'inZone', 'index', 'carry', 'carryBy', 'swallow', 'isLifted', 'isDropTarget', 'droppedValue', 'dropIndex', 'acceptFileDrops', 'acceptedFileTypes', 'dragDepth', 'isDragOver', 'droppedFiles', 'droppedFile', 'scrollIndex', 'scrollElement', 'scheduled', 'waiting', 'ran'],
    attr: {
      onPage,
      shownTag: { follows: (s) => (s.onPage ? s.tag : KEEP), preset: false }
    },
    // Group.tsx componentDidMount puts the node on the element it mounted with: a mount makes it, a new Tag does not (C86)
    element: { elem: { changesWith: ['onPage', 'shownTag'] }, stampOn: { changesWith: ['onPage'] } },
    held: { elementFocused: keyboard, attrsOn: { keeps: 'what a module put on the element' }, fileCarry: { keeps: 'a drag from outside the page' }, fileOn: { keeps: 'a drag from outside the page' },
      cardFocused: keyboard,
      pointerAt: { keeps: 'where the pointer is' },
      sourceElem: { keeps: 'what a module put on the element' },
      // focus-tracker.ts — the viewer's list of focused nodes: a Group is not focusable, so this is its keyboard focus
      listed: keyboard
    },
    // `whenMounted`'s chain; the frame's scrolls (`scheduleAfterInputsHaveUpdated`), the ones waiting for the component, and the
    // outcomes the frame resolved before its end (reported there, in order)
    frameEnd: ['chain', 'scheduled', 'waiting', 'ran'],
    // the Focus action asks the tracker's list, and (v2, R16) whether the Group is on the page; the hold timer's lift meets the page
    // and drains the frame's scrolls
    elementCalls: { 'on.draggable': ['onPage', 'elem', 'attrsOn'], 'on.acceptDrops': [], 'on.focus': ['listed', 'onPage'], 'world.timer': ['onPage', 'elem', 'pointerAt', 'sourceElem'] }
  },
  'net.noodl.controls.textinput': {
    node: ['fieldType', 'runOnChange', 'maxLength', 'textToInsert', 'text', 'startValue', 'out', 'wire', 'announced', 'hasAnnounced', 'queue', 'blocksPointer', 'opacityZero', ...CONTROL_NODE],
    attr: { onPage, pageEnabled, pageVisible, pageOpacityZero: { follows: (s) => s.opacityZero }, pageType: { follows: (s) => (s.onPage ? s.fieldType : KEEP) } },
    held: {
      elementFocused: keyboard,
      // the field shows the Value (a Number field's text is the person's, which the Value only converts)
      field: { shows: (s) => (s.onPage && s.fieldType !== 'number' ? (s.out === null || s.out === undefined ? '' : String(s.out)) : KEEP) },
      caret: { keeps: 'the caret' },
      hadCaret: { keeps: 'the caret' }
    },
    // text-input.ts :190, :263 — the frame-end callbacks a Set or an Insert schedules (node.ts :1276-1279)
    frameEnd: ['startValue', 'out', 'wire', 'announced', 'hasAnnounced', 'queue'],
    framePulses: ['textChanged'],
    // Clear, Backspace and a Start Value write the field at once when there is one (text-input.ts :423, :431
    // `innerReactComponentRef`; the spec's `componentSetText`): they meet its text, its type and its cursor
    elementCalls: { ...FOCUS_CALLS, 'on.clear': FIELD_CALL, 'on.backspace': FIELD_CALL, 'on.startValue': FIELD_CALL }
  },
  'net.noodl.controls.range': {
    node: [...CONTROL_NODE, 'min', 'max', 'step', 'authorValue', 'out', 'percent', 'pending'],
    attr: { onPage, pageEnabled, pageVisible },
    // the handle shows the Value (R14: the last word, a person's or the graph's)
    held: { elementFocused: keyboard, shown: { shows: (s) => (s.onPage ? s.out : KEEP) } },
    // slider.ts :39-54, :220-236 — the graph's word reaches the node's value at the next paint (v2, D36)
    frameEnd: ['out', 'percent', 'pending'],
    elementCalls: FOCUS_CALLS
  },
  'net.noodl.controls.options': {
    node: [...CONTROL_NODE, 'value', 'items'],
    attr: { onPage, pageEnabled, pageVisible },
    // the selection shows the Value wherever the list offers it (v3, R14); otherwise it is the browser's (dropdown.ts `painted`)
    held: { elementFocused: keyboard, domSelected: { shows: (s) => (s.onPage && offers(s.items, s.value) ? s.value : KEEP) } },
    elementCalls: FOCUS_CALLS
  },
  'net.noodl.controls.radiobutton': {
    node: [...CONTROL_NODE, 'checked', 'value', 'inGroup', 'gValue'],
    attr: { onPage, pageEnabled, pageVisible },
    held: { elementFocused: keyboard },
    // radiobutton.ts :37 — Checked is what the button shows of the group's selection, at its paint (v2, R15 C76); the
    // placing hands the button its group (world.ts GROUP)
    frameEnd: ['checked', 'inGroup', 'gValue'],
    elementCalls: FOCUS_CALLS
  },
  'Radio Button Group': {
    node: ['value', 'mounted', 'visible'],
    attr: { onPage, pageVisible },
    held: {}
  }
};

/** A list of options (dropdown.ts `optionsOf`, read leniently: a stored-text list is not checked) offers this value. */
function offers(items: unknown, value: unknown): boolean {
  if (typeof value !== 'string' || !Array.isArray(items)) return false;
  return items.some((item) => {
    if (item === null || typeof item !== 'object') return false;
    const o = item as { Value?: unknown; Label?: unknown };
    const v = o.Value === undefined || o.Value === null || typeof o.Value === 'boolean' ? o.Label : String(o.Value);
    return v === value;
  });
}

/** A visual spec: one a person acts on, or one placed on the page. */
export const isVisual = (spec: AnyNodeSpec) => !!spec.acts || !!spec.world?.place;

/** The format's world kinds (spec.ts `WorldHandlers`), pinned: a new one is sorted (NSP-023 §3) before it lands. */
export const WORLD_KINDS = ['timer', 'response', 'change', 'resize', 'page', 'popup', 'backend', 'store', 'auth', 'authReturn', 'mount', 'place', 'picker', 'realtime', 'socket', 'stream', 'group'] as const;

const LIFECYCLE = new Set(['didMount', 'willUnmount']);

type Patch = { set?: Record<string, unknown>; send?: unknown[]; emit?: string[] } & Record<string, unknown>;
type S = Record<string, unknown>;

const canon = (v: unknown) =>
  JSON.stringify(v, (_k, x) => (x === undefined ? '$undefined' : typeof x === 'number' && !Number.isFinite(x) ? `$${x}` : Object.is(x, -0) ? '$-0' : typeof x === 'symbol' ? String(x) : x));

function perturb(v: unknown): unknown {
  if (typeof v === 'boolean') return !v;
  if (typeof v === 'number') return Number.isNaN(v) ? 0 : v + 1;
  if (typeof v === 'string') return `${v}~`;
  return '~';
}

export interface Finding {
  rule: string;
  key: string;
  where: string;
  count: number;
  example?: string;
}

/**
 * The spec, wrapped: every reducer is played as before (the trace is unchanged), and each call is checked against the
 * model. Findings collect in `findings`.
 */
export function guarded(spec: AnyNodeSpec, model: PageModel, findings: Map<string, Finding>): { spec: AnyNodeSpec; heldMoved: Set<string> } {
  const page = new Set([...Object.keys(model.attr), ...Object.keys(model.element ?? {}), ...Object.keys(model.held)]);
  const node = new Set(model.node);
  const frameEnd = new Set(model.frameEnd ?? []);
  const pulses = new Set([...LIFECYCLE, ...(model.framePulses ?? [])]);
  const heldMoved = new Set<string>();
  const find = (rule: string, key: string, where: string, example?: () => string) => {
    const id = `${rule} ${key} ${where}`;
    const f = findings.get(id);
    if (f) f.count++;
    else findings.set(id, { rule, key, where, count: 1, example: example?.() });
  };
  const after = (s: S, r: Patch | undefined): S => ({ ...s, ...(r?.set ?? {}) });

  const paint =
    (where: string, f: (...a: unknown[]) => unknown) =>
    (s: S, ...rest: unknown[]) => {
      const r = f(s, ...rest) as Patch | undefined;
      const next = after(s, r);
      // G2
      for (const k of Object.keys(r?.set ?? {})) if (node.has(k) && !frameEnd.has(k) && !Object.is(next[k], s[k])) find('G2', k, where, () => `${canon(s[k])} → ${canon(next[k])}`);
      // G4
      for (const [k, a] of Object.entries(model.attr)) {
        const v = a.follows(next);
        if (v !== KEEP && !Object.is(next[k], v)) find('G4', k, where, () => `${canon(next[k])}, follows ${canon(v)}`);
      }
      for (const [k, h] of Object.entries(model.held)) {
        if (!('shows' in h)) continue;
        const v = h.shows(next);
        if (v !== KEEP && !Object.is(next[k], v)) find('G4', k, where, () => `${canon(next[k])}, shows ${canon(v)}`);
      }
      for (const [k, e] of Object.entries(model.element ?? {})) if (!Object.is(next[k], s[k]) && !e.changesWith.some((c) => !Object.is(next[c], s[c]))) find('G4', k, where, () => 'changed alone');
      // G5
      const drawn: S = { ...s };
      for (const [k, a] of Object.entries(model.attr)) {
        if (a.preset === false) continue;
        const v = a.follows(s);
        if (v !== KEEP) drawn[k] = v;
      }
      const r2 = f(drawn, ...rest) as Patch | undefined;
      const next2 = after(drawn, r2);
      for (const k of node) if (canon(next[k]) !== canon(next2[k])) find('G5', k, where, () => `${canon(next[k])} vs ${canon(next2[k])} with the page already drawn`);
      const emits = (p: Patch | undefined) => (p?.emit ?? []).filter((e) => !LIFECYCLE.has(e));
      if (canon(r?.send ?? []) !== canon(r2?.send ?? [])) find('G5', 'send', where, () => `${canon(r?.send)} vs ${canon(r2?.send)}`);
      if (canon(emits(r)) !== canon(emits(r2))) find('G5', 'emit', where, () => `${canon(emits(r))} vs ${canon(emits(r2))}`);
      // G7
      for (const e of r?.emit ?? []) if (!pulses.has(e)) find('G7', e, where);
      return r;
    };

  const nodeSide =
    (where: string, f: (...a: unknown[]) => unknown) =>
    (s: S, ...rest: unknown[]) => {
      const r = f(s, ...rest) as Patch | undefined;
      const allowed = new Set(model.elementCalls?.[where] ?? []);
      for (const k of page) {
        if (!Object.is(after(s, r)[k], s[k])) heldMoved.add(k);
        if (allowed.has(k)) continue;
        const strip = (p: Patch | undefined) => {
          if (!p?.set || !(k in p.set)) return p;
          const { [k]: _drop, ...set } = p.set;
          return { ...p, set };
        };
        let r2: Patch | undefined;
        let threw = false;
        try {
          r2 = f({ ...s, [k]: perturb(s[k]) }, ...rest) as Patch | undefined;
        } catch {
          threw = true;
        }
        if (threw || canon(strip(r)) !== canon(strip(r2))) find('G3', k, where, () => (threw ? 'threw on a perturbed value' : `${canon(strip(r))} vs ${canon(strip(r2))}`));
      }
      return r;
    };

  const ownAfterInputs = spec.afterInputs as unknown as ((s: S, inputs: unknown, world: unknown) => Patch | undefined) | undefined;
  const act =
    (where: string, f: (...a: unknown[]) => unknown) =>
    (s: S, inputs: unknown, value: unknown, world: unknown) => {
      const r = f(s, inputs, value, world) as Patch | undefined;
      const painted = ownAfterInputs ? after(s, ownAfterInputs(s, inputs, world)) : s;
      const next = after(s, r);
      for (const k of Object.keys(model.held)) if (!Object.is(next[k], painted[k])) heldMoved.add(k);
      return r;
    };

  const on: AnyNodeSpec['on'] = {};
  for (const [port, f] of Object.entries(spec.on)) on[port] = f && (nodeSide(`on.${port}`, f as never) as never);
  const person: Record<string, never> = {};
  for (const [name, f] of Object.entries(spec.person ?? {})) person[name] = act(`act.${name}`, f as never) as never;
  const world: Record<string, unknown> = {};
  for (const [k, f] of Object.entries(spec.world ?? {})) world[k] = f && (k === 'place' ? paint('world.place', f as never) : nodeSide(`world.${k}`, f as never));
  return {
    spec: { ...spec, on, person: spec.person && person, world: spec.world && (world as never), afterInputs: spec.afterInputs && (paint('afterInputs', spec.afterInputs as never) as never) },
    heldMoved
  };
}

/** G1 and G8 — what is read from the spec's shape alone. */
export function staticFindings(spec: AnyNodeSpec, model: PageModel | undefined): string[] {
  const out: string[] = [];
  if (!model) return [`G1 ${spec.type} is a visual spec with no page model`];
  const classes = [model.node, Object.keys(model.attr), Object.keys(model.element ?? {}), Object.keys(model.held)].flat();
  for (const k of Object.keys(spec.state)) {
    const n = classes.filter((c) => c === k).length;
    if (n !== 1) out.push(`G1 ${k}: classified ${n} times`);
  }
  for (const k of classes) if (!(k in spec.state)) out.push(`G1 ${k}: not a state key`);
  for (const k of model.frameEnd ?? []) if (!model.node.includes(k)) out.push(`G1 frameEnd ${k}: not a node key`);
  for (const k of Object.keys(spec.world ?? {})) if (!(WORLD_KINDS as readonly string[]).includes(k)) out.push(`G8 world.${k}: not a kind of the format`);
  return out;
}

/** The format's world kinds, read from spec.ts's `WorldHandlers` (its text, so a copy of it can be planted). */
export function formatWorldKinds(specTs: string): string[] {
  const body = /export interface WorldHandlers<[^>]*>[^{]*\{([\s\S]*?)\n\}/.exec(specTs)?.[1] ?? '';
  return [...body.matchAll(/^ {2}(\w+)\?:/gm)].map((m) => m[1]);
}

/** Every finding the guard has for one spec under one model: the static ones, then what the plays measured. */
export async function guardFindings(spec: AnyNodeSpec, model: PageModel | undefined, seeds: readonly number[], sequences: number): Promise<string[]> {
  const out = staticFindings(spec, model);
  if (!model || out.length > 0) return out;
  const findings = new Map<string, Finding>();
  const { spec: wrapped, heldMoved } = guarded(spec, model, findings);
  for (const seed of seeds) await runConformance(wrapped, interpreterAdapter({ resolve: () => wrapped }), { sequences, seed, mutants: false });
  for (const f of findings.values()) out.push(`${f.rule} ${f.key} in ${f.where} ×${f.count}${f.example ? `: ${f.example}` : ''}`);
  for (const k of Object.keys(model.held)) if (!heldMoved.has(k)) out.push(`G6 ${k}: held, but only a paint ever moved it — an attribute: say what it follows`);
  return out;
}
