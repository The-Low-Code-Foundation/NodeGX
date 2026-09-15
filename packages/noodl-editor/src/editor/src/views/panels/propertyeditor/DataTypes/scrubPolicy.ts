/**
 * FB-022 AC4 — which ports can be scrubbed, decided from the **port type**.
 *
 * ## Why the decision is here and not in the three views
 *
 * A hand-list of field names is the failure this file exists to prevent. FB-018 reached five
 * of thirty-six rows and stopped, because every row that chipped had been taught to chip one
 * at a time; the fix was to find the one place the decision could be made for all of them.
 * The same shape applies here. A port's type already says whether it holds a number, so
 * `scrubSpecForPortType` answers from the type, and `BasicType`, `NumberWithUnits` and
 * `Dimension` each ask it rather than each deciding. A kit that ships a new `number` port
 * gets a scrubbable field on the day it is installed, with nothing added here.
 *
 * ## 🔴 The precedence trap, which is real and cost a rewrite
 *
 * "Is this a number port" is **not** the same question as "does this port render a number
 * field". The dispatch (`model/widgets.ts`, `WIDGET_RULES`) is an ordered table, and a rule
 * earlier in it takes the port before the numeric rows are ever tried. The margin and padding
 * ports are exactly this: they are `{ name: 'number', units: ['px','%'] }` — indistinguishable
 * from Width to a naive check — and they are claimed by `marginPadding`, earlier in the table,
 * because they carry `marginPaddingComp`. They render inside the margin/padding box widget,
 * which **already has its own drag** (POL-012), so a scrub binding built for them would be a
 * second gesture on a control that is not there.
 *
 * CHR-007 made the table data, so the exclusion is now asked of the table itself rather than
 * restated: see {@link isClaimedByAnEarlierRow}. The prefix is still pinned in
 * {@link WIDGETS_AHEAD_OF_NUMERIC}, and the sweep beside this file compares it with the real
 * order, so a rule inserted above `numberWithUnits` is a red rather than a silent change.
 *
 * ⚠️ The pin used to be parsed out of `Ports.ts`'s `if/else if` chain, and that parse missed the
 * two early `editorType` returns. One of them *can* claim a number port — a `number` declaring
 * `editorType: 'logic-builder-workspace'` renders the Logic Builder row — so the old "only
 * `marginPaddingComp` can steal a number" was false in principle. No shipped port has that shape.
 */
import { scrubStepForUnit } from '@noodl-core-ui/components/property-panel/scrub';

import { nameForPortType } from '@noodl-models/nodelibrary/portTypeName';

import { widgetForPort, type WidgetId } from '../model/widgets';

/** `NodeLibrary.nameForPortType` — now the one import-free definition, not a restated twin. */
export function portTypeName(type: unknown): string | undefined {
  return nameForPortType(type as Parameters<typeof nameForPortType>[0]);
}

/**
 * The widgets the dispatch tries **before** it reaches `numberWithUnits`.
 *
 * Pinned as a literal on purpose: a list derived from the table it constrains grows silently to
 * match it and can never fail. `scrubPolicy.test.ts` compares this against `WIDGET_RULES`.
 */
export const WIDGETS_AHEAD_OF_NUMERIC: readonly WidgetId[] = [
  'logicBuilderWorkspace',
  'logicBuilderHidden',
  'alignTools',
  'sizeMode',
  'enum',
  'color',
  'boolean',
  'textArea',
  'codeEditor',
  'listValue',
  'marginPadding'
];

/** The rows a scrub is for. */
const NUMERIC_WIDGETS: ReadonlySet<WidgetId> = new Set<WidgetId>(['numberWithUnits', 'dimension', 'basic']);

/**
 * Whether a rule ahead of the numeric rows takes this **numeric** port — asked of the dispatch,
 * not restated.
 *
 * 🔴 Only a `number` or `dimension` port can be "claimed earlier"; for any other type the question
 * does not arise, and the answer is `false`. Asking the table about every port would call every
 * enum, colour and boolean "claimed" (40 of the shared mixins' ports, measured) — true of the
 * dispatch, and meaningless for a policy about number fields. Over the shipped mixins this reads
 * exactly the eight margin and padding ports, as the old `marginPaddingComp` check did.
 *
 * @param type the port's **edit** type, as {@link scrubSpecForPortType} receives it.
 */
export function isClaimedByAnEarlierRow(type: unknown): boolean {
  const name = portTypeName(type);
  if (name !== 'number' && name !== 'dimension') return false;

  const widget = widgetForPort({ type });
  return widget !== undefined && !NUMERIC_WIDGETS.has(widget);
}

export interface ScrubSpec {
  /** Units of value per pixel of horizontal travel, before modifiers. */
  step: number;
}

export interface ScrubPortState {
  /**
   * Whether a connection drives this port (AC3).
   *
   * 🔴 **This is the second of two independent mechanisms, on purpose.** `PropertyPanelRow`
   * and `PropertyPanelInput` both replace the entire control with FB-018's binding chip while
   * a connection drives the port, so on a connected row there is already no field to press —
   * structurally, AC3 holds without this flag. It is here anyway because that structure is
   * one edit away from not holding, and the failure it would produce is silent: a scrub on a
   * bound port writes a parameter the connection overwrites on the next frame, so the number
   * moves under the cursor, snaps back, and nothing on screen says why. That is precisely the
   * bug FB-018 was filed about, re-created by a gesture instead of by typing.
   *
   * Either mechanism alone is sufficient; both together mean AC3 cannot regress from a single
   * change, and this half is the one a plain-Node runner can grade.
   */
  isConnected?: boolean;
  /**
   * Whether the row is in expression mode.
   *
   * The stored parameter is then an `{ expression, fallback }` object and the control is an
   * `ExpressionInput`, not a number. A drag would overwrite the expression with a literal —
   * silently destroying what the author wrote, which is a worse version of the doomed write
   * above.
   */
  isExpressionMode?: boolean;
}

/**
 * The scrub spec for a port type, or `null` when that port's field is not a draggable number.
 *
 * @param type the port's **edit** type — `getEditType(port)`, not `port.type`. A port that
 *   declares `editAsType` is edited as that type and must be judged as that type, which is
 *   also what the dispatch chain does.
 * @param unit the unit the field is currently showing, for rows that have one. A `px` field
 *   steps by 1 and an `em` field by 0.1; see `SCRUB_STEP_BY_UNIT`.
 * @param state what the row knows that the type does not — whether the port is driven by a
 *   connection or being edited as an expression. See {@link ScrubPortState}.
 */
export function scrubSpecForPortType(type: unknown, unit?: string | null, state?: ScrubPortState): ScrubSpec | null {
  if (state?.isConnected || state?.isExpressionMode) return null;

  const name = portTypeName(type);
  if (name !== 'number' && name !== 'dimension') return null;
  if (isClaimedByAnEarlierRow(type)) return null;

  // `type.step` if a port ever declares one — nothing in the shipped catalog does today, and
  // saying so is the point: the branch is here because the type is where a step belongs, not
  // because it is currently exercised by anything but its own spec.
  const declared = typeof type === 'object' && type !== null ? (type as { step?: unknown }).step : undefined;
  if (typeof declared === 'number' && Number.isFinite(declared) && declared > 0) {
    return { step: declared };
  }

  return { step: scrubStepForUnit(unit) };
}

/**
 * The number a gesture on this field starts from.
 *
 * ⚠️ **A blank field is not a zero.** An unset port is showing its default — `Width` is
 * `100%`, `Opacity` is `1` — and starting a drag at 0 would snap the element to nothing
 * before moving it a pixel. The stored value wins; failing that the port's declared default;
 * failing that 0, which is the only honest answer left.
 */
export function scrubStartValue(storedValue: unknown, portDefault?: unknown): number {
  const stored = numericPart(storedValue);
  if (stored !== undefined) return stored;
  const fallback = numericPart(portDefault);
  return fallback === undefined ? 0 : fallback;
}

/**
 * The number inside a stored parameter or a port default, whether it is bare, a numeric
 * **string**, or a `{ value, unit }` object.
 *
 * 🔴 **THE STRING BRANCH IS NOT DEFENSIVE PROGRAMMING — IT IS THE CATALOG.** This function
 * originally accepted `number` only, and the first drive caught it: `transformOriginX` declares
 * `default: '50'` — a string — so a scrub on an untouched transform-origin field started from
 * **0** instead of 50, and a 30-pixel drag put 30 in a field that had been showing 50. The
 * field displayed the right number the whole time, because the panel stringifies whatever it
 * gets; only the gesture could tell the difference.
 *
 * Measured across the shipped catalog's 33 scrubbable ports: **14 declare a number, 5 declare a
 * string, 14 declare nothing.**
 *
 * ⚠️ And three of those five strings are `'Auto'` — `fontWeight`, `letterSpacing`, `lineHeight`.
 * So this cannot simply coerce: a value that is not a number must still be rejected, and fall
 * through to 0, because there is no number in `'Auto'` to start a drag from.
 */
function numericPart(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    // `Number('')` is 0, which would turn a blank into a confident zero rather than a miss.
    if (trimmed === '') return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  if (typeof value === 'object' && value !== null) {
    // The inner value goes through the same rules — a stored `{ value: '50', unit: '%' }` is
    // the same shape of trap one level down.
    return numericPart((value as { value?: unknown }).value);
  }

  return undefined;
}
