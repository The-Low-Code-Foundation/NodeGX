import { isTokenReference, readNumberFieldEdit } from '../DataTypes/NumberWithUnits';

/**
 * REL-014 — what a typed edit to the margin/padding widget *means*, and how a
 * stored side is displayed.
 *
 * ## 🔴 Why this is the copy that mattered most
 *
 * The eight margin/padding ports are `{ name: 'number', units: ['px','%'] }` —
 * indistinguishable from Width to a naive check — and `isOfMarginPaddingType`
 * claims them **four branches ahead** of the numeric rows in
 * `Ports.viewClassForPort`. So they never reach `NumberWithUnits`, and the fix
 * that landed there did not reach them. Meanwhile `TextInputConfig` stamps
 * `paddingTop/Bottom: 'var(--space-2)'` and `paddingLeft/Right: 'var(--space-3)'`
 * onto **every new Text Input**, and `ButtonConfig` stamps four more per size
 * variant: this widget is where most of the tokens the editor authors actually
 * live.
 *
 * What it did with them was worse than the twins did. `commitEdit` was
 * `parseFloat(text)` → `isNaN ? undefined`, and `undefined` here does not merely
 * fail to store — it is the value that clears the parameter. And before any edit,
 * a token stored on a side rendered as `0` (a raw string has no `.value`) and
 * opened its edit box showing the literal text `undefined`, so the value was
 * already invisible and already looked like a zero somebody had typed.
 *
 * ## Lifted out of the component on purpose
 *
 * `MarginPaddingInput.tsx` imports `common/Icon`, which this checkout's
 * plain-Node runner cannot load at all (`Icon.tsx` uses webpack's
 * `require.context`), and the component is a hook-calling function so no runner
 * here can evaluate it either. Everything below is a pure function of its
 * arguments, so the disposition of a typed edit and the text each side shows are
 * gradeable rather than read.
 *
 * 🔴 **Not a fourth parser.** `readMarginPaddingEdit` is an adapter: it asks
 * `readNumberFieldEdit` — the one the dimension and number-with-units rows share
 * — and maps its four answers onto this widget's payload. The token rule lives in
 * exactly one place for all four fields.
 *
 * @module views/panels/propertyeditor/components/marginPaddingEdit
 */

/** One side's value: a magnitude and the unit it is in. */
export interface MarginPaddingValue {
  value: number;
  unit: string;
}

/**
 * What one side can hold. A design-token reference is kept **verbatim as a bare
 * string** — the same shape `ElementConfigRegistry.applyDefaults` writes and the
 * same shape the runtime's `isTokenReference` guard already reads back, so it
 * round-trips through the field it is typed into.
 */
export type MarginPaddingParam = MarginPaddingValue | string;

/** The two independently lockable groups inside the one widget. */
export type MarginPaddingSide = 'margin' | 'padding';

/**
 * Which group a comp belongs to.
 *
 * The eight ports share one port *group* (`'Margin and padding'`) and therefore
 * one view, so the split has to come from the comp name. It is the only thing
 * that distinguishes them.
 */
export function sideOf(comp: string): MarginPaddingSide {
  return comp.startsWith('padding') ? 'padding' : 'margin';
}

/** Whether a stored side is a design-token reference rather than a magnitude. */
export function isMarginPaddingToken(value: unknown): value is string {
  return isTokenReference(value);
}

/** What one typed edit to a margin/padding field means. */
export type MarginPaddingEdit =
  /** An emptied field. Deleting on purpose is untouched. */
  | { kind: 'clear'; value: undefined }
  /** A design-token reference, kept verbatim. */
  | { kind: 'token'; value: string }
  /** A magnitude, in the unit the widget's own dropdown is showing. */
  | { kind: 'number'; value: MarginPaddingValue }
  /** None of the above. Nothing is written — see AC4. */
  | { kind: 'refuse' };

/**
 * Read one typed edit to a margin/padding field.
 *
 * `typedUnits` — the units a trailing suffix may name. With none (REL-014's shape: the old
 * box had a unit dropdown), the unit always comes from `unit`, so `50px` typed while the field
 * says `%` commits 50%. The CHR-009 rows have no dropdown and pass {@link MARGIN_PADDING_UNITS}:
 * a typed `50%` switches the unit, a bare `8` keeps the field's. REL-014 changes what happens to
 * text that is **not** a number, and nothing else.
 */
export function readMarginPaddingEdit(text: string, unit: string, typedUnits: string[] = []): MarginPaddingEdit {
  const edit = readNumberFieldEdit(text, typedUnits);

  switch (edit.kind) {
    case 'clear':
      return { kind: 'clear', value: undefined };
    case 'token':
      return { kind: 'token', value: edit.token };
    case 'number':
      return { kind: 'number', value: { value: edit.value, unit: edit.unit || unit } };
    default:
      return { kind: 'refuse' };
  }
}

/**
 * CHR-009 §2 "paired values" — the two axes one collapsed row edits.
 *
 * `↕` is top + bottom, `↔` is left + right: the pairs a symmetric box actually has. This
 * replaces POL-012's per-group "set all four" lock, which the paired row makes redundant —
 * all four is `↕` then `↔`, and the lock was a hidden mode that changed what typing one
 * field did.
 */
export type MarginPaddingAxis = 'vertical' | 'horizontal';

/**
 * The units a margin/padding port accepts, as its ports declare them. Typed as a suffix to switch:
 * the rows have no unit control — a click-toggle that appeared on hover took clicks meant for the
 * value (measured: `120` + Enter stored `0%`).
 */
export const MARGIN_PADDING_UNITS = ['px', '%'];

export const MARGIN_PADDING_AXES: readonly MarginPaddingAxis[] = ['vertical', 'horizontal'];

/** The two comps an axis covers, in the order the expanded fields draw them. */
export function axisComps(side: MarginPaddingSide, axis: MarginPaddingAxis): [string, string] {
  return axis === 'vertical' ? [`${side}-top`, `${side}-bottom`] : [`${side}-left`, `${side}-right`];
}

/** `padding-top` → `Top`, for a field's tooltip and the mixed state's description. */
export function edgeNameOf(comp: string): string {
  const edge = comp.slice(comp.indexOf('-') + 1);
  return edge.charAt(0).toUpperCase() + edge.slice(1);
}

/** What one side is *in effect*: its own value, or the default it inherits. */
export function effectiveValueOf(
  comp: string,
  values: Record<string, MarginPaddingParam | undefined>,
  defaults: Record<string, MarginPaddingParam | undefined>
): MarginPaddingParam | undefined {
  return values[comp] !== undefined ? values[comp] : defaults[comp];
}

/**
 * How two effective values compare for "does this pair read as one value?".
 *
 * A token compares as itself, so the four `var(--space-2)`s `TextInputConfig` stamps
 * on every new Text Input read as one value. "No explicit value" is **not** separated from
 * an explicit 0: a side inheriting 0 beside a side set to 0 draws one `0`, not `mixed`.
 */
function displayKeyOf(value: MarginPaddingParam | undefined, fallbackUnit: string): string {
  if (typeof value === 'string') return `token|${value}`;
  return `${Number((value && value.value) || 0)}|${(value && value.unit) || fallbackUnit}`;
}

/** What the collapsed `↕` or `↔` field shows. */
export type MarginPaddingPairDisplay =
  /** Both sides read alike: show that value. */
  | { kind: 'same'; value: MarginPaddingParam | undefined }
  /** They differ. The field is empty with a `mixed` marker; `description` names both. */
  | { kind: 'mixed'; description: string };

/**
 * Read one axis for its collapsed field.
 *
 * **The mixed display (AC4), decided:** an empty field with a muted `mixed` placeholder, and
 * the two values in its tooltip (`Top 8px · Bottom 0px`). `↕ 8 · 0` was the other candidate —
 * at 328px a pair field is ~70px wide including its glyph and unit, and two values plus a
 * separator do not fit without an ellipsis that would hide the one that differs. Typing into
 * a mixed field sets both sides, which is what the empty field invites.
 */
export function pairDisplayOf(
  side: MarginPaddingSide,
  axis: MarginPaddingAxis,
  values: Record<string, MarginPaddingParam | undefined>,
  defaults: Record<string, MarginPaddingParam | undefined>,
  fallbackUnit = 'px'
): MarginPaddingPairDisplay {
  const [a, b] = axisComps(side, axis);
  const va = effectiveValueOf(a, values, defaults);
  const vb = effectiveValueOf(b, values, defaults);
  if (displayKeyOf(va, fallbackUnit) === displayKeyOf(vb, fallbackUnit)) return { kind: 'same', value: va };

  // `labelTextOf` already suffixes a non-px unit and leaves px bare; a tooltip names px too.
  const describe = (comp: string, v: MarginPaddingParam | undefined) =>
    `${edgeNameOf(comp)} ${
      typeof v === 'string' ? v : `${labelTextOf(v)}${!v || !v.unit || v.unit === fallbackUnit ? fallbackUnit : ''}`
    }`;
  return { kind: 'mixed', description: `${describe(a, va)} · ${describe(b, vb)}` };
}

/** Everything one commit needs, so the component's own commit is a hand-off. */
export interface MarginPaddingCommit {
  /** The side being edited, e.g. `padding-top`. */
  comp: string;
  /** What is in the box. */
  text: string;
  /** The unit the field is showing. */
  unit: string;
  /** What each side currently holds. */
  values: Record<string, MarginPaddingParam | undefined>;
  onUpdate: (comp: string, value: MarginPaddingParam | undefined) => void;
  /**
   * AC4 — put `text` back in the box, because nothing was written and therefore
   * nothing upstream will re-seed it.
   */
  onRefuse: (text: string) => void;
}

/**
 * Commit one typed edit to one side (the expanded, per-edge fields).
 *
 * 🔴 **This is the whole of the commit, deliberately.** The component around it
 * cannot be loaded by any runner in this checkout (see the module note), so a
 * decision left inside it is a decision graded by reading. What stays there is a
 * hand-off; what a revert of REL-014 would have to undo is here.
 */
export function commitMarginPaddingEdit(commit: MarginPaddingCommit): 'committed' | 'refused' {
  const edit = readMarginPaddingEdit(commit.text, commit.unit, MARGIN_PADDING_UNITS);

  if (edit.kind === 'refuse') {
    commit.onRefuse(editTextOf(commit.values[commit.comp]));
    return 'refused';
  }

  commit.onUpdate(commit.comp, edit.value);
  return 'committed';
}

/** One typed edit to a collapsed `↕` / `↔` field. */
export interface MarginPaddingPairCommit {
  side: MarginPaddingSide;
  axis: MarginPaddingAxis;
  text: string;
  unit: string;
  values: Record<string, MarginPaddingParam | undefined>;
  defaults: Record<string, MarginPaddingParam | undefined>;
  /** Both comps, as **one** undo step. */
  onUpdateComps: (comps: string[], value: MarginPaddingParam | undefined) => void;
  onRefuse: (text: string) => void;
}

/**
 * Commit one typed edit to a paired field: both sides of the axis get the value.
 *
 * ⚠️ The unit goes with the value on both sides. Two sides in different units is a real
 * state (it reads `mixed`), and typing resolves it to the unit the field shows — a visible
 * action, not a silent reinterpretation of the other number under a new unit.
 */
export function commitMarginPaddingPairEdit(commit: MarginPaddingPairCommit): 'committed' | 'refused' {
  const edit = readMarginPaddingEdit(commit.text, commit.unit, MARGIN_PADDING_UNITS);

  if (edit.kind === 'refuse') {
    const shown = pairDisplayOf(commit.side, commit.axis, commit.values, commit.defaults);
    commit.onRefuse(shown.kind === 'same' ? editTextOf(shown.value) : '');
    return 'refused';
  }

  commit.onUpdateComps(axisComps(commit.side, commit.axis), edit.value);
  return 'committed';
}

/** `var(--space-2)` → `--space-2`; `var(--space-2, 16px)` → `--space-2`. */
const TOKEN_NAME = /^var\(\s*(--[A-Za-z0-9_-]+)/;

/**
 * The compact label a token gets in the box.
 *
 * ⚠️ The eight value labels are ~40px of a 150px widget and `var(--space-2)` does
 * not fit in one. The name alone does, it is the form the design-token panel and
 * the style vocabulary both use, and it cannot be mistaken for a magnitude. The
 * full text is still what the edit box seeds with and what a `title` carries, so
 * nothing about the stored value is hidden — see {@link editTextOf}.
 */
export function tokenLabel(token: string): string {
  const match = TOKEN_NAME.exec(token.trim());
  return match ? match[1] : token;
}

/** What one side shows on the widget. */
export function labelTextOf(value: MarginPaddingParam | undefined): string {
  if (value === undefined) return '0';
  if (typeof value === 'string') return tokenLabel(value);

  // No "- px" wireframe placeholder: show the numeric value (zeros read muted),
  // and only surface a non-px unit inline.
  const num = value.value === undefined ? '0' : value.value;
  return value.unit && value.unit !== 'px' ? `${num}${value.unit}` : `${num}`;
}

/**
 * What a CHR-009 field shows at rest: the magnitude alone, because the field draws a non-px unit
 * as its own suffix (`labelTextOf` would give `50%` beside a `%` — `50%%`). A token shows its name.
 */
export function fieldTextOf(value: MarginPaddingParam | undefined): string {
  if (value === undefined) return '0';
  if (typeof value === 'string') return tokenLabel(value);
  return value.value === undefined ? '0' : String(value.value);
}

/** What the inline edit box is seeded with — a token in full, so it round-trips. */
export function editTextOf(value: MarginPaddingParam | undefined): string {
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  return value.value === undefined ? '' : String(value.value);
}

/** The unit the edit box's dropdown opens on. */
export function unitOf(value: MarginPaddingParam | undefined, fallbackUnit: string): string {
  if (value === undefined || typeof value === 'string') return fallbackUnit;
  return value.unit || fallbackUnit;
}

/** Whether a side reads as zero, for the muted styling. A token never does. */
export function isZeroValue(value: MarginPaddingParam | undefined): boolean {
  if (value === undefined) return true;
  if (typeof value === 'string') return false;
  return Number(value.value || 0) === 0;
}

/**
 * The magnitude a drag on this side starts from.
 *
 * ⚠️ **A token has no magnitude, and this is the one gesture that still replaces
 * one with a number.** That is unchanged by REL-014 and arguably correct — a drag
 * is a deliberate statement about size — but before this the fallback was
 * `start.value || 0` on a bare string, which meant a drag from a token began at
 * **0 with no unit** and wrote `{value: n, unit: undefined}`. Falling back to the
 * side's default keeps the unit real. Registered as the remaining gesture that
 * removes a token without saying so.
 */
export function scrubStartOf(
  value: MarginPaddingParam | undefined,
  fallback: MarginPaddingParam | undefined,
  fallbackUnit: string
): MarginPaddingValue {
  if (value !== undefined && typeof value !== 'string') {
    return { value: value.value || 0, unit: value.unit || fallbackUnit };
  }
  if (fallback !== undefined && typeof fallback !== 'string') {
    return { value: fallback.value || 0, unit: fallback.unit || fallbackUnit };
  }
  return { value: 0, unit: fallbackUnit };
}
