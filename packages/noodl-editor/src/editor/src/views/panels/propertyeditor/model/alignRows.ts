/**
 * CHR-009 slice 5 — the alignment ports as rows of the label column.
 *
 * Was one unlabelled icon strip per group: `Align X` and `Align Y` drawn as six icons in one track
 * (bottom-first), `Align Items` and `Justify Content` as two stacked tracks. The icon set was the
 * whole vocabulary, so an enum value with no icon could not be picked at all — Group's `Align Items`
 * gained `Stretch` (14815f1e3) and the panel never offered it.
 *
 * Now each port is a row: its own label, one segment per enum value (in a spatial order, not the
 * enum's), and a pressed segment for the value in effect. Pure, so `tests-unit` can grade it.
 */
import { ALIGN_ICONS } from '../components/alignToolsIcons';

export interface AlignPortLike {
  name: string;
  displayName?: string;
  default?: string;
  type: { alignComp: string; enums?: { label: string; value: string }[] };
}

export interface AlignOption {
  value: string;
  label: string;
  /** The value in effect — the explicit one, or the port's default when unset. */
  pressed: boolean;
}

export interface AlignRow {
  comp: string;
  portName: string;
  label: string;
  /** An explicit value is set — the gutter's reset dot. */
  isChanged: boolean;
  options: AlignOption[];
}

/** Start → end on the axis, then the distributions. An enum value not listed keeps its enum place, after these. */
export const ALIGN_VALUE_ORDER: Record<string, string[]> = {
  horizontal: ['left', 'center', 'right'],
  vertical: ['top', 'center', 'bottom'],
  justify: ['left', 'center', 'right'],
  'align-items': ['flex-start', 'center', 'flex-end', 'stretch'],
  'justify-content': ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
  'align-content': ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly']
};

function orderOf(comp: string, value: string): number {
  const i = (ALIGN_VALUE_ORDER[comp] || []).indexOf(value);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

/** One row per port, in the order the ports arrived (the port index order). */
export function alignRowsOf(ports: AlignPortLike[], values: Record<string, string | undefined>): AlignRow[] {
  return ports.map((port) => {
    const comp = port.type.alignComp;
    const explicit = values[comp];
    const effective = explicit !== undefined ? explicit : port.default;
    const enums = (port.type.enums || []).map((e, index) => ({ ...e, index }));
    enums.sort((a, b) => orderOf(comp, a.value) - orderOf(comp, b.value) || a.index - b.index);

    return {
      comp,
      portName: port.name,
      label: port.displayName || port.name,
      isChanged: explicit !== undefined,
      options: enums.map((e) => ({ value: e.value, label: e.label, pressed: e.value === effective }))
    };
  });
}

/**
 * A press sets the value. Pressing the segment already in effect writes nothing: the legacy strip
 * un-set it, which in a segmented control reads as "nothing happened" when the default is the same
 * value. Un-setting is the gutter's reset dot.
 */
export function valueOnPress(row: AlignRow, value: string): string | null {
  const current = row.options.find((o) => o.pressed);
  return current && current.value === value ? null : value;
}

export interface AlignGlyph {
  markup: string;
  rotate: null | 'rotate' | 'rotate2';
}

/**
 * The legacy glyph for a comp + value, sized for a 26px segment and drawn in `currentColor` (the
 * legacy markup is 24–25px and `fill="white"`, repainted by a stylesheet). `null` when there is no
 * glyph — the segment then shows the enum's label.
 */
export function alignGlyphOf(comp: string, value: string): AlignGlyph | null {
  const icon = ALIGN_ICONS.find((i) => i.comp === comp && i.value === value);
  if (!icon) return null;
  const markup = icon.svg.replace(
    /<svg([^>]*)>/,
    (_m, attrs: string) =>
      '<svg' + attrs.replace(/\s(width|height|fill)="[^"]*"/g, '') + ' width="14" height="14" fill="currentColor" aria-hidden="true">'
  );
  return { markup, rotate: icon.rotate };
}
