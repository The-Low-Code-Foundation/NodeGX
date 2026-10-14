/**
 * `dimensions/wired-dimension-becomes-grow` — what a wired size along the parent's axis tells the editor (NSP-019 R38). Nine
 * nodes say it, each from the render every framed visual node shares (react-component-node.ts :1128 `Layout.size`, then
 * layout.ts :314-336 `reportMainAxisGrow`): Group, Text, Image, Video, Button, Text Input, Dropdown, Slider and Radio Button
 * Group. Checkbox and Radio Button have a Width and a Height too, but theirs are the box's, in px, vw or vh (checkbox.ts
 * :114-141): no percent reaches the layout, so they never say it.
 *
 * THE RULE (layout.ts `Layout.size` :138-156, `reportMainAxisGrow`). The parent stacks its children in a row or a column
 * (`WorldView.parent`). Along that axis, Width in a row and Height in a column, a size that is a percent becomes a share of
 * the room: `flex-grow` the percent. The node says so when that port is wired, because a bare number sent over a wire is read
 * in the unit the port holds, and a person wiring a Number in usually meant pixels. Nothing becomes a share when:
 *   - the Size Mode does not assign that size (Explicit assigns both, Content Height the width, Content Width the height);
 *   - the Position is not Relative (an absolute node is laid over its parent, not stacked in it);
 *   - the size is marked fixed (`isFixed`, node-shared-port-definitions.ts :1449 / :1466);
 *   - what reaches the style is not a percent: pixels, a token, or nothing.
 *
 * WHAT A SIZE PORT HOLDS (node.ts `setInputValue` :446-458). A number, or anything `isNaN` reads as one (`null`, `''`, `true`,
 * a numeric string), is merged into the `{ value, unit }` the port holds, if it holds one. On a port that holds no size, a
 * finite number or numeric text is read in the port's default unit, `%`. Anything else is held as sent. The port starts
 * holding its default, `{ value: 100, unit: '%' }` (:131-151).
 *
 * WHAT REACHES THE STYLE (react-component-node.ts `defineRegularInputProp` :706-753). A token is written as it is. A
 * `{ value, unit }` whose value is a finite number or numeric text (or that has no unit) becomes `value + unit`. `undefined`,
 * `null`, `NaN` and an empty magnitude clear it. Anything else is refused and the style keeps what it had.
 *
 * WHEN IT IS SAID. In the render, so at a paint, and only while the node is on the page: a node off the page is not rendered,
 * and the editor keeps the sentence it last had (`_lastMainAxisGrowDiagnostic`, the memo that also keeps a render from
 * repeating it). Each spec keeps the sizes in `sizes` (written by the size ports) and the sentence in `grow` (written by its
 * paint).
 */

import type { WorldView } from '../spec';

export const WIRED_GROW = 'dimensions/wired-dimension-becomes-grow';

/** One size port: what it holds (node.ts `_inputValues`), what reaches the style (the prop), and its fixed mark. */
export interface SizePort {
  readonly held: unknown;
  readonly prop: unknown;
  readonly fixed: unknown;
}

/** The size ports a node has: both, or the Slider's Width alone. */
export type Sizes = { readonly width?: SizePort; readonly height?: SizePort };

/** A port holding its default (node.ts :131-151): `{ value, unit: '%' }`, written to the style as `100%`. */
export function sizeAtDefault(value = 100): SizePort {
  return { held: { value, unit: '%' }, prop: `${value}%`, fixed: undefined };
}

/** react-component-node.ts :624-626 */
function isToken(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('var(');
}

/** node.ts :467-470 `isBareMagnitude` */
function isBareMagnitude(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value));
}

/** react-component-node.ts :647-653 `dimensionIsUsable` */
function usable(value: { value?: unknown; unit?: unknown }): boolean {
  if (!value.unit) return true;
  const magnitude = value.value;
  if (typeof magnitude === 'number') return Number.isFinite(magnitude);
  if (typeof magnitude === 'string') return magnitude.trim() !== '' && Number.isFinite(Number(magnitude));
  return false;
}

/** react-component-node.ts :664-669 `isEmptyMagnitude` */
function isEmpty(value: unknown): boolean {
  if (typeof value === 'number') return Number.isNaN(value);
  if (!value || typeof value !== 'object' || !('value' in value)) return false;
  const magnitude = (value as { value?: unknown }).value;
  return magnitude === null || (typeof magnitude === 'number' && Number.isNaN(magnitude));
}

/** A value reaching a size port (WHAT A SIZE PORT HOLDS, then WHAT REACHES THE STYLE, then the fixed mark). */
export function sizeWritten(p: SizePort, value: unknown): SizePort {
  const cur = p.held as { unit?: unknown } | null | undefined;
  let held: unknown = value;
  if (isNaN(value as number) === false && cur && typeof cur === 'object' && cur.unit) held = { ...cur, value };
  else if (isBareMagnitude(value)) held = { value, unit: '%' };
  const v = held as { value?: unknown; unit?: unknown; isFixed?: unknown } | null | undefined;
  let prop: unknown = p.prop;
  if (isToken(held)) prop = held;
  else if (v && v.value !== undefined && usable(v)) prop = (v.value as string) + (v.unit as string);
  else if (held === undefined || held === null || isEmpty(held)) prop = undefined;
  // node-shared-port-definitions.ts :1449 / :1466 — every value the port is handed, the refused ones too
  return { held, prop, fixed: v ? v.isFixed : undefined };
}

/**
 * A size port's reducer: what it holds now, drawn at the next paint. Nothing on the wire. `marksFixed`: whether the port reads a
 * Fixed mark — the shared Width and Height do (node-shared-port-definitions.ts :1449 / :1466); the Slider's own Width does not
 * (slider.ts :145-157, no `onChange`), so a fixed percent there still becomes a share.
 */
export function sizeReducer(port: 'width' | 'height', marksFixed = true) {
  return (s: { readonly sizes: Sizes }, v: unknown) => {
    const written = sizeWritten(s.sizes[port] ?? sizeAtDefault(), v);
    return {
      // one literal for both ports: the rules are read from the source (scripts/node-spec/rules.js), through this call
      says: 'always: the size it holds now, a bare number read in the unit it held; drawn at the next paint',
      set: { sizes: { ...s.sizes, [port]: marksFixed ? written : { ...written, fixed: undefined } } as Sizes },
      send: [] as never[]
    };
  };
}

/** layout.ts :42-44 */
function isPercentage(size: unknown): size is string {
  return Boolean(size) && typeof size === 'string' && size[size.length - 1] === '%';
}

/** layout.ts :325-330 — `port` and the share it became */
export function growSentence(port: 'width' | 'height', grow: number): string {
  return (
    `"${port}" is wired, and the parent stacks its children along that same axis, so the value arrived as a ` +
    `PERCENTAGE (dimension ports default to "%") and became flex-grow ${grow} — a ratio against the ` +
    `siblings that also grow, not a ${port}. Send a {value, unit} object instead ` +
    'of a bare number, or give this port a px value in the property panel first: a bare number arriving over a ' +
    'wire is merged into the unit the port is already holding.'
  );
}

/**
 * What a render says (THE RULE): the sentence, or `null`. `sizeMode` is the node's Size Mode, `undefined` for a node with none
 * (the Slider, whose Width is always assigned); `position` its Position.
 */
export function growSaid(sizes: Sizes, sizeMode: unknown, position: unknown, world: WorldView): string | null {
  const port = world.parent() === 'row' ? 'width' : 'height';
  const size = sizes[port];
  if (!size || !world.wired(port)) return null;
  const assigned = sizeMode === undefined || sizeMode === 'explicit' || sizeMode === (port === 'width' ? 'contentHeight' : 'contentWidth');
  if (!assigned || position !== 'relative' || size.fixed || !isPercentage(size.prop)) return null;
  return growSentence(port, Number(size.prop.slice(0, -1)));
}

/**
 * A paint's `grow`: what the render says while the node is on the page after the paint; off it, the sentence the editor last
 * had (WHEN IT IS SAID). Written at every paint, on the page or off it: a paint that wrote it only on the page split each of the
 * frame end's branches in two, and a swap between the twins (s105, the Text Input's Set and Insert) moved nothing a play shows.
 */
export function growPainted(s: { readonly sizes: Sizes; readonly grow: string | null }, onPage: boolean, sizeMode: unknown, position: unknown, world: WorldView): { grow: string | null } {
  return { grow: onPage ? growSaid(s.sizes, sizeMode, position, world) : s.grow };
}

/** A paint with its `grow` added (`growPainted`): `s` is the state the paint was run on. */
export function withGrow<P extends { set?: object }>(s: { readonly sizes: Sizes; readonly grow: string | null; readonly onPage: boolean }, p: P, sizeMode: unknown, position: unknown, world: WorldView): P {
  const onPage = ({ ...s, ...p.set } as { onPage: boolean }).onPage;
  return { ...p, set: { ...p.set, ...growPainted(s, onPage, sizeMode, position, world) } } as P;
}

/** The spec's `diagnostics` entry. */
export const wiredGrowDiagnostic = {
  [WIRED_GROW]: {
    says: 'a wired Width in a row, or a wired Height in a column, is a percent, so it shares out the space instead of setting a size',
    message: (_i: unknown, s: { readonly grow: string | null }) => s.grow
  }
};

/** The version note each of the nine carries for this change (NSP-010). */
export function growChange(version: number) {
  return {
    version,
    says: 'A wired Width in a row, or a wired Height in a column, that is a percent now shows as its warning in this spec: it became a share of the room, not a size. The runtime has always shown it',
    row: 'NSP-019 R38 (P107 s105)',
    migration: { none: 'Only the editor is told, and the runtime already told it. Nothing a wire carries changes' }
  };
}
