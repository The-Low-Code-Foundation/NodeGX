// The leaf module, not the `@noodl-models/sidebar` barrel, for the same reason `TokenCategorySection`
// reaches for leaf modules: the plain-Node runner grades this file (`tests-unit/cmg-005`).
import { SidebarModel } from '@noodl-models/sidebar/sidebarmodel';
import { groupForTokenCategory, TokenCategoryGroup } from '@noodl-models/StyleTokensModel/TokenCategories';

/**
 * P103 CMG-005 — the Styles panel's sections, and how the rest of the editor points at a row in
 * one of them.
 *
 * Same pattern as `settingsPanelRoute.ts` and `provenanceRequest.ts`: the request is **stashed and
 * emitted**, then the sidebar switches. The panel claims the stash on mount (its first showing)
 * and hears the event every time after (it stays mounted behind `display: none` once shown —
 * `SidePanel.tsx` keeps every panel it has built). Emitting alone loses the first request of a
 * session; switching alone loses every later one.
 */

/** The registered panel id. `StylesPanel.tsx` re-exports it as `StylesPanel_ID`. */
export const STYLES_PANEL_ID = 'styles';

/**
 * The seven sections, in the order the panel draws them (CMG-005 §3.1). Colours first; Type next,
 * because it is what people change first; Looks last, where P94 put it, so a person who learned
 * the panel before this task finds their Looks where they were.
 *
 * No *Other*: Richard, 2026-09-24: *"The typography and animation bits are important, they're not
 * 'Other'."* Plain words for the titles — *Type*, *Motion* — never the category's internal name.
 */
export type StylesSectionId = 'colours' | 'type' | 'spacing' | 'borders' | 'effects' | 'motion' | 'looks';

export interface StylesSectionSpec {
  id: StylesSectionId;
  title: string;
  /** The token group this section draws, for the five that draw one. */
  group?: TokenCategoryGroup;
  /** What the section holds, in a sentence, for someone who has never met the distinction. */
  subtitle: string;
  /** Open on a first visit, before the person has touched anything. */
  openByDefault: boolean;
}

export const STYLES_SECTIONS: readonly StylesSectionSpec[] = [
  {
    id: 'colours',
    title: 'Colours',
    group: 'Colors',
    subtitle: 'Named colours this project uses. A style is yours to change; a token comes from the design token set.',
    openByDefault: true
  },
  {
    id: 'type',
    title: 'Type',
    group: 'Typography',
    subtitle: 'Fonts, text sizes, weights, line heights and letter spacing.',
    openByDefault: true
  },
  {
    id: 'spacing',
    title: 'Spacing',
    group: 'Spacing',
    subtitle: 'The steps padding, margins and gaps are set in.',
    openByDefault: false
  },
  {
    id: 'borders',
    title: 'Borders',
    group: 'Borders',
    subtitle: 'Corner radii and border widths.',
    openByDefault: false
  },
  {
    id: 'effects',
    title: 'Effects',
    group: 'Effects',
    subtitle: 'Shadows and gradients.',
    openByDefault: false
  },
  {
    id: 'motion',
    title: 'Motion',
    group: 'Animation',
    subtitle: 'How fast things move, and how they ease into place.',
    openByDefault: false
  },
  {
    id: 'looks',
    title: 'Looks',
    subtitle: 'A named set of styles a node can wear. Change the Look and everything wearing it changes.',
    openByDefault: false
  }
];

export type SectionOpenState = Record<StylesSectionId, boolean>;

/**
 * The open state to start from, given whatever the person's settings hold. Anything that is not a
 * boolean per known section falls back to the table's default, so a stale or hand-edited settings
 * file can never hide a section for good.
 */
export function readSectionOpenState(stored: unknown): SectionOpenState {
  const record = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
  const state = {} as SectionOpenState;
  for (const section of STYLES_SECTIONS) {
    const value = record[section.id];
    state[section.id] = typeof value === 'boolean' ? value : section.openByDefault;
  }
  return state;
}

/** The section a token group is drawn in, read off the table rather than restated. */
export function sectionForTokenGroup(group: TokenCategoryGroup): StylesSectionId | null {
  return STYLES_SECTIONS.find((s) => s.group === group)?.id ?? null;
}

/** The section a token of this category is drawn in, or `null` for a category no section holds. */
export function sectionForTokenCategory(category: string): StylesSectionId | null {
  const group = groupForTokenCategory(category);
  return group ? sectionForTokenGroup(group) : null;
}

// ─── The reveal request ────────────────────────────────────────────────────────

export type RevealStyleKind = 'token' | 'look' | 'colourStyle';

export interface RevealStyleRequest {
  kind: RevealStyleKind;
  /** A token's `--name`, a Look's name, or a colour style's name. */
  name: string;
  /** For a Look: its node type, because two Looks may share a name across types. */
  typename?: string;
}

export const STYLES_REVEAL_EVENT = 'nodegx:styles-reveal-requested';

let pendingReveal: RevealStyleRequest | null = null;

/**
 * Switch the sidebar to Styles, open the section holding this style, scroll its row into view
 * and highlight it. Safe to call from a devtools console, a property-panel button, or a toast.
 */
export function revealStyle(request: RevealStyleRequest): void {
  pendingReveal = request;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STYLES_REVEAL_EVENT));
  }
  SidebarModel.instance.switch(STYLES_PANEL_ID);
}

/** Consumed once, by the panel, on mount or on the event. */
export function takePendingReveal(): RevealStyleRequest | null {
  const request = pendingReveal;
  pendingReveal = null;
  return request;
}

/** The selector for a row, shared by every section so one reveal finds any of them. */
export function styleRowSelector(name: string): string {
  // Inside a double-quoted attribute value only the quote and the backslash need escaping —
  // `CSS.escape` would also work but does not exist in the plain-Node runner that grades this.
  return `[data-style-row="${name.replace(/["\\]/g, '\\$&')}"]`;
}

/** How long the highlight stays on a revealed row. */
export const REVEAL_HIGHLIGHT_MS = 1600;
