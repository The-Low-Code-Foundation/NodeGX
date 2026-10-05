/**
 * P109 ISL-008 — the property panel says when the author's CSS, not the panel, decides what a row shows.
 *
 * Richard, with the ruling "Stylesheet beats defaults" (2026-10-05): *"maybe we can make a way to warn someone visually
 * in the node props when a style value is being overridden by a stylesheet and where it lives if it's a custom CSS
 * node or some custom CSS in a visual node?"*
 *
 * Since ISL-008 an author's class beats a node's defaults, so a Group's panel can say Align Items: Start while the
 * canvas draws it centred. The canvas knows why: `NoodlEditorHighlightAPI.explainStyle` (noodl-viewer-react
 * `style-sources.ts`) answers, for the selected node, which ports a rule decides and where the rule lives. This module
 * turns one answer into one note under the row, the way FB-017's structural hint does (`portHint.ts`), and for the
 * same reason: the answer arrives after the row is drawn, and must be re-applied in place, never by rebuilding a row
 * under a focused field.
 *
 * The note is its own class, not FB-017's: `applyPortHint` removes every `.property-structural-hint` it finds in a row
 * before drawing its own, and the two must not erase each other.
 */
import type { HintElementLike } from './portHint';

/** The ports a rendered row speaks for, recorded so a later pass can find the row without a re-render. */
export const STYLE_PORTS_ATTRIBUTE = 'data-style-ports';
/** Class on the note. */
export const STYLE_SOURCE_NOTE_CLASS = 'property-style-source';
/** Class added to a row that carries a note. */
export const STYLE_SOURCE_HOST_CLASS = 'property-style-source-host';

/** What the canvas answers about one port. The shape of noodl-viewer-react's `StyleSourceFinding`. */
export interface StyleSourceFinding {
  port: string;
  property: string;
  value: string;
  selector: string;
  important: boolean;
  source: { kind: 'css-definition'; nodeId: string } | { kind: 'css-style' } | { kind: 'link'; href: string } | { kind: 'head' };
  beats: 'author' | 'default' | 'nothing';
  nodeValue?: string;
}

/** Where a CSS Definition is, in words: its label and the component holding it. `undefined` when it cannot be found. */
export type NameCssDefinition = (nodeId: string) => { label: string; component?: string } | undefined;

function whereItLives(finding: StyleSourceFinding, nameCssDefinition: NameCssDefinition): string {
  const source = finding.source;
  if (source.kind === 'css-definition') {
    const named = nameCssDefinition(source.nodeId);
    if (!named) return 'in a CSS Definition';
    return named.component
      ? `in the CSS Definition “${named.label}” (${named.component})`
      : `in the CSS Definition “${named.label}”`;
  }
  if (source.kind === 'link') {
    const file = source.href.split('/').filter(Boolean).pop() || source.href;
    return `in the stylesheet ${file}`;
  }
  if (source.kind === 'head') return 'in the project’s head code';
  return '';
}

/** The sentence under a row. Plain words: what the canvas shows, which rule says so, and where that rule is. */
export function describeStyleSource(finding: StyleSourceFinding, nameCssDefinition: NameCssDefinition): string {
  if (finding.source.kind === 'css-style') {
    return `This node’s CSS Style sets this to ${finding.value}.`;
  }
  const rule = `${finding.selector} ${whereItLives(finding, nameCssDefinition)}`.trim();
  if (finding.beats === 'author') {
    return `Your CSS overrides this with !important: ${finding.value}, from ${rule}.`;
  }
  return `Your CSS sets this to ${finding.value}, from ${rule}.`;
}

/** The port names a marked row speaks for. */
export function stylePortsOf(attribute: string | null | undefined): string[] {
  return (attribute || '').split(',').filter(Boolean);
}

function setHostClass(element: HintElementLike, on: boolean): void {
  const current = (element.className || '').split(' ').filter(Boolean);
  const has = current.indexOf(STYLE_SOURCE_HOST_CLASS) !== -1;
  if (on && !has) element.className = [...current, STYLE_SOURCE_HOST_CLASS].join(' ');
  if (!on && has) element.className = current.filter((c) => c !== STYLE_SOURCE_HOST_CLASS).join(' ');
}

/**
 * Bring one row's note into line with `findings`: add, replace or remove it. Idempotent, so the render path and every
 * later refresh are the same call. One note per row, for the first of its ports that has a finding.
 */
export function applyStyleSourceNote<T extends HintElementLike | null | undefined>(
  element: T,
  portNames: string[],
  findings: ReadonlyMap<string, StyleSourceFinding>,
  nameCssDefinition: NameCssDefinition,
  createElement: (tag: string) => TSFixme = (tag) => document.createElement(tag)
): T {
  if (!element) return element;

  const existing = element.querySelector(`.${STYLE_SOURCE_NOTE_CLASS}`);
  if (existing) {
    if (existing.remove) existing.remove();
    else element.removeChild(existing);
  }

  const port = portNames.find((name) => findings.has(name));
  if (port === undefined) {
    setHostClass(element, false);
    return element;
  }

  const finding = findings.get(port)!;
  const message = describeStyleSource(finding, nameCssDefinition);
  const note = createElement('div');
  note.className = STYLE_SOURCE_NOTE_CLASS;
  note.setAttribute('data-test', `property-style-source-${port}`);
  // `textContent`, never `innerHTML`: the selector and the value are the author's own text.
  note.textContent = message;
  note.title = message;
  setHostClass(element, true);
  element.appendChild(note);
  return element;
}
