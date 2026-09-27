/**
 * CHR-009 slice 7 — the `Border Style` and `Corner Radius` pickers as rows of the label column.
 *
 * Was an unlabelled strip of 32px icons, right-aligned off the column (~50px each). The strip is a
 * SCOPE picker, not a value: each icon is a tab of one `TabGroup`, and the tab decides which side's
 * ports the rows below it edit (`borderLeftStyle`/`Width`/`Color`, `borderTopLeftRadius`, …). It
 * writes nothing.
 *
 * Now it is a row like the align rows (slice 5): a label (`Edge`, `Corner`), then one 26px segmented
 * track, a segment per tab in CSS's clockwise order, the selected tab pressed. A segment whose ports
 * hold an explicit value carries a mark — the strip hid a per-side override until you opened its tab,
 * while `all` read `0` over a corner that was visibly rounded. Pure, so `tests-unit` can grade it.
 */

export interface ScopeTabView {
  /** The tab this port's row belongs to (`port.tab.tab`). */
  tab: string;
  /** The port's name, to look up its explicit value. */
  portName: string;
}

export interface ScopeSegment {
  tab: string;
  /** The segment's tooltip and accessible name. */
  title: string;
  pressed: boolean;
  /** One of the tab's ports holds an explicit value. */
  isSet: boolean;
  /** 14×14 `currentColor` markup, or null for a tab this module does not know (drawn as its name). */
  glyph: string | null;
}

export interface ScopeRow {
  label: string;
  segments: ScopeSegment[];
}

/** The row's label per `port.tab.group`; an unknown group reads as its own name. */
export const SCOPE_ROW_LABEL: Record<string, string> = {
  'border-styles': 'Edge',
  corners: 'Corner'
};

/** CSS's clockwise order (`border-width: top right bottom left`), `all` first. */
export const SCOPE_TAB_ORDER: string[] = [
  'borders-all',
  'borders-top',
  'borders-right',
  'borders-bottom',
  'borders-left',
  'corners-all',
  'corners-top-left',
  'corners-top-right',
  'corners-bottom-right',
  'corners-bottom-left'
];

const SCOPE_TITLE: Record<string, string> = {
  'borders-all': 'All edges',
  'borders-top': 'Top edge',
  'borders-right': 'Right edge',
  'borders-bottom': 'Bottom edge',
  'borders-left': 'Left edge',
  'corners-all': 'All corners',
  'corners-top-left': 'Top left corner',
  'corners-top-right': 'Top right corner',
  'corners-bottom-right': 'Bottom right corner',
  'corners-bottom-left': 'Bottom left corner'
};

// A 10×10 box at (2,2) in a 14px square. The edge or corner in scope draws solid at full strength;
// the rest of the box draws faint, so the four sides read as one shape at 14px (the old SVGs' dotted
// 1.5/31 strokes do not survive the scale-down).
const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">${body}</svg>`;
const FAINT_BOX = '<rect x="2.75" y="2.75" width="8.5" height="8.5" rx="0" stroke-opacity="0.35"/>';
const FAINT_ROUND_BOX = '<rect x="2.75" y="2.75" width="8.5" height="8.5" rx="3" stroke-opacity="0.35"/>';

const SCOPE_GLYPH: Record<string, string> = {
  'borders-all': svg('<rect x="2.75" y="2.75" width="8.5" height="8.5"/>'),
  'borders-top': svg(`${FAINT_BOX}<path d="M2.75 2.75H11.25"/>`),
  'borders-right': svg(`${FAINT_BOX}<path d="M11.25 2.75V11.25"/>`),
  'borders-bottom': svg(`${FAINT_BOX}<path d="M2.75 11.25H11.25"/>`),
  'borders-left': svg(`${FAINT_BOX}<path d="M2.75 2.75V11.25"/>`),
  'corners-all': svg('<rect x="2.75" y="2.75" width="8.5" height="8.5" rx="3"/>'),
  'corners-top-left': svg(`${FAINT_ROUND_BOX}<path d="M2.75 7V5.75A3 3 0 0 1 5.75 2.75H7"/>`),
  'corners-top-right': svg(`${FAINT_ROUND_BOX}<path d="M7 2.75H8.25A3 3 0 0 1 11.25 5.75V7"/>`),
  'corners-bottom-right': svg(`${FAINT_ROUND_BOX}<path d="M11.25 7V8.25A3 3 0 0 1 8.25 11.25H7"/>`),
  'corners-bottom-left': svg(`${FAINT_ROUND_BOX}<path d="M7 11.25H5.75A3 3 0 0 1 2.75 8.25V7"/>`)
};

function orderOf(tab: string): number {
  const i = SCOPE_TAB_ORDER.indexOf(tab);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

/**
 * The row for one tab group. `tabs` in arrival (port index) order; `selectedTab` as the panel
 * remembers it; `parameters` the node's explicit values (unset = `undefined`).
 */
export function scopeRowOf(
  group: string,
  tabs: string[],
  views: ScopeTabView[],
  selectedTab: string,
  parameters: Record<string, unknown>
): ScopeRow {
  const ordered = tabs.map((tab, index) => ({ tab, index }));
  ordered.sort((a, b) => orderOf(a.tab) - orderOf(b.tab) || a.index - b.index);

  return {
    label: SCOPE_ROW_LABEL[group] || group,
    segments: ordered.map(({ tab }) => ({
      tab,
      title: SCOPE_TITLE[tab] || tab,
      pressed: tab === selectedTab,
      isSet: views.some((v) => v.tab === tab && parameters[v.portName] !== undefined),
      glyph: SCOPE_GLYPH[tab] || null
    }))
  };
}
