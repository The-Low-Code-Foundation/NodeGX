/**
 * P109 ISL-008 — which stylesheet rule decides a node's style, and where that rule lives.
 *
 * Richard's request with the ruling (2026-10-05): *"warn someone visually in the node props when a style value is
 * being overridden by a stylesheet and where it lives if it's a custom CSS node or some custom CSS in a visual node"*.
 * Since ISL-008 an author's class beats a node's defaults, so the property panel can now show "Start" for Align Items
 * while the canvas draws it centred. This module is the canvas's half of the answer: for one node's element, for each
 * panel port that writes a CSS property, does a rule from the author's own CSS decide what is drawn, and whose rule
 * is it? The editor asks through `NoodlEditorHighlightAPI.explainStyle` and marks the rows.
 *
 * ## Deciding "decides"
 *
 * Every author rule that matches the element is collected (`@media` and `@supports` blocks that apply are entered).
 * Per property, the winner is the cascade's: `!important` first, then specificity, then later source order. It is
 * then set against what the node itself wrote:
 *
 *  - an INLINE value (a panel value the author set, or the node's own CSS Style): the rule wins only with `!important`;
 *  - a DEFAULT (the node's `ndl-d-…` class, first in `<head>`): the rule wins at class specificity or above, because it
 *    comes later. An element selector (`button { … }`) still loses, as it does on the page;
 *  - nothing at all (a port whose default is never written, like Justify Content): the rule decides.
 *
 * A rule whose value equals the node's own is not reported. Nothing is visible to explain.
 *
 * The node's own CSS Style is reported too, when it is what sets a property a panel port also sets: that is "some
 * custom CSS in a visual node", and it is inline, so it beats the port's own value whenever it was applied later.
 *
 * ## Where a rule lives
 *
 * From `rule.parentStyleSheet.ownerNode`: a CSS Definition's `<style id="style_<nodeId>">` names its node, a `<link>`
 * names its file (a kit's sheet), and any other `<style>` is the project's head code. The defaults sheet and the design
 * token sheet are never an author's rule and are skipped.
 */

export type StyleSource =
  | { kind: 'css-definition'; nodeId: string }
  | { kind: 'css-style' }
  | { kind: 'link'; href: string }
  | { kind: 'head' };

export interface StyleSourceFinding {
  /** The node's input the property belongs to (`alignItems`, `width`). */
  port: string;
  /** The CSS property, as CSS spells it (`align-items`). */
  property: string;
  /** The value the rule gives, which is what the canvas draws. */
  value: string;
  /** The rule's selector, as written (empty for CSS Style). */
  selector: string;
  important: boolean;
  source: StyleSource;
  /** What the rule beat: a value the author set, the node's default, or nothing the node wrote. */
  beats: 'author' | 'default' | 'nothing';
  /** The node's own value for the property, when it had one. */
  nodeValue?: string;
}

export interface ExplainInput {
  element: Element;
  /** Port name → CSS property (kebab-case). */
  styleTargets: Readonly<Record<string, string>>;
  /** The node's default declarations, CSS names (from its `ndl-d-…` class), if it has any. */
  defaults?: Readonly<Record<string, string>>;
  /** The node's own CSS Style, CSS names → values. */
  customCss?: Readonly<Record<string, string>>;
}

/** Sheets that are never an author's rule. */
const SKIPPED_SHEET_IDS = new Set(['noodl-default-styles', 'noodl-design-tokens']);

type Specificity = [number, number, number];

interface Declaration {
  property: string;
  value: string;
  important: boolean;
  specificity: Specificity;
  order: number;
  selector: string;
  source: StyleSource;
}

function compareSpecificity(a: Specificity, b: Specificity): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/** Split at commas that are not inside brackets or parentheses. */
function splitTopLevel(selector: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(selector.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(selector.slice(start).trim());
  return parts.filter(Boolean);
}

/**
 * Selectors Level 4 specificity of ONE complex selector. `:where()` counts nothing; `:is()`, `:not()` and `:has()`
 * count their most specific argument; a pseudo-element and the legacy one-colon forms count as a type.
 */
export function specificityOf(selector: string): Specificity {
  const s: Specificity = [0, 0, 0];
  let i = 0;
  const add = (t: Specificity) => {
    s[0] += t[0];
    s[1] += t[1];
    s[2] += t[2];
  };
  const readParen = (): string => {
    let depth = 0;
    const from = i;
    for (; i < selector.length; i++) {
      if (selector[i] === '(') depth++;
      else if (selector[i] === ')') {
        depth--;
        if (depth === 0) {
          i++;
          return selector.slice(from + 1, i - 1);
        }
      }
    }
    return selector.slice(from + 1);
  };
  const readName = (): string => {
    const from = i;
    while (i < selector.length && /[A-Za-z0-9_\-\\ -￿]/.test(selector[i])) i++;
    return selector.slice(from, i);
  };
  while (i < selector.length) {
    const ch = selector[i];
    if (ch === '#') {
      i++;
      readName();
      s[0]++;
    } else if (ch === '.') {
      i++;
      readName();
      s[1]++;
    } else if (ch === '[') {
      while (i < selector.length && selector[i] !== ']') i++;
      i++;
      s[1]++;
    } else if (ch === ':') {
      const doubled = selector[i + 1] === ':';
      i += doubled ? 2 : 1;
      const name = readName().toLowerCase();
      const args = selector[i] === '(' ? readParen() : undefined;
      if (doubled || ['before', 'after', 'first-line', 'first-letter'].includes(name)) {
        s[2]++;
      } else if (name === 'where') {
        // nothing
      } else if ((name === 'is' || name === 'not' || name === 'has' || name === 'matches') && args !== undefined) {
        let best: Specificity = [0, 0, 0];
        for (const part of splitTopLevel(args)) {
          const t = specificityOf(part);
          if (compareSpecificity(t, best) > 0) best = t;
        }
        add(best);
      } else {
        s[1]++;
      }
    } else if (ch === '*' || /[\s>+~]/.test(ch)) {
      i++;
    } else if (/[A-Za-z]/.test(ch)) {
      readName();
      s[2]++;
    } else {
      i++;
    }
  }
  return s;
}

function sourceOf(sheet: CSSStyleSheet, owners: Map<CSSStyleSheet, Element>): StyleSource | null {
  const owner = ((sheet.ownerNode as Element | null) || owners.get(sheet) || null) as (Element & { id?: string }) | null;
  if (!owner) return { kind: 'head' };
  if (owner.id && SKIPPED_SHEET_IDS.has(owner.id)) return null;
  if (owner.tagName === 'LINK') return { kind: 'link', href: owner.getAttribute('href') || '' };
  if (owner.id && owner.id.startsWith('style_')) return { kind: 'css-definition', nodeId: owner.id.slice('style_'.length) };
  return { kind: 'head' };
}

function mediaApplies(text: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  try {
    return window.matchMedia(text).matches;
  } catch {
    return false;
  }
}

/** Every declaration of every author rule that matches `element`, in source order. */
export function matchingDeclarations(element: Element): Declaration[] {
  const out: Declaration[] = [];
  const doc = element.ownerDocument;
  if (!doc) return out;
  let order = 0;

  const visit = (rules: CSSRuleList, source: StyleSource) => {
    for (let r = 0; r < rules.length; r++) {
      const rule = rules[r] as CSSRule & {
        selectorText?: string;
        style?: CSSStyleDeclaration;
        cssRules?: CSSRuleList;
        media?: MediaList;
        conditionText?: string;
      };
      if (rule.selectorText !== undefined && rule.style) {
        let best: Specificity | null = null;
        for (const part of splitTopLevel(rule.selectorText)) {
          let matches = false;
          try {
            matches = element.matches(part);
          } catch {
            matches = false;
          }
          if (!matches) continue;
          const t = specificityOf(part);
          if (!best || compareSpecificity(t, best) > 0) best = t;
        }
        order++;
        if (!best) continue;
        for (let d = 0; d < rule.style.length; d++) {
          // Indexed rather than `item(d)`: the same in a browser, and the only form jsdom's CSSOM has.
          const property = (rule.style as unknown as Record<number, string>)[d];
          out.push({
            property,
            value: rule.style.getPropertyValue(property).trim(),
            important: rule.style.getPropertyPriority(property) === 'important',
            specificity: best,
            order,
            selector: rule.selectorText,
            source
          });
        }
      } else if (rule.cssRules) {
        const condition = rule.media ? rule.media.mediaText : rule.conditionText;
        // `@supports` is answered by the browser that parsed it; an @media is asked again for THIS viewport.
        if (rule.media && condition && !mediaApplies(condition)) continue;
        visit(rule.cssRules, source);
      }
    }
  };

  // `ownerNode` is the browser's way to the element; jsdom leaves it null, so the elements are asked for their sheet.
  const owners = new Map<CSSStyleSheet, Element>();
  doc.querySelectorAll('style, link[rel~="stylesheet"]').forEach((el) => {
    const sheet = (el as HTMLStyleElement).sheet as CSSStyleSheet | null;
    if (sheet) owners.set(sheet, el);
  });

  const sheets = doc.styleSheets;
  for (let s = 0; s < sheets.length; s++) {
    const sheet = sheets[s] as CSSStyleSheet;
    const source = sourceOf(sheet, owners);
    if (!source) continue;
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // a cross-origin sheet: not readable, and not the author's project CSS either
    }
    visit(rules, source);
  }
  return out;
}

const CLASS_SPECIFICITY: Specificity = [0, 1, 0];

const same = (a: string | undefined, b: string | undefined) =>
  (a || '').replace(/\s+/g, ' ').trim().toLowerCase() === (b || '').replace(/\s+/g, ' ').trim().toLowerCase();

/** The findings for one element. See the module note for the rules. */
export function explainStyleSources(input: ExplainInput): StyleSourceFinding[] {
  const { element, styleTargets, defaults, customCss } = input;
  const declarations = matchingDeclarations(element);
  const inlineStyle = (element as HTMLElement).style;
  const findings: StyleSourceFinding[] = [];

  for (const port of Object.keys(styleTargets)) {
    const property = styleTargets[port];
    const inline = inlineStyle ? inlineStyle.getPropertyValue(property).trim() : '';
    const inlineImportant = inlineStyle ? inlineStyle.getPropertyPriority(property) === 'important' : false;
    const fromCustomCss = customCss && customCss[property] !== undefined;

    let winner: Declaration | undefined;
    for (const d of declarations) {
      if (d.property !== property) continue;
      if (
        !winner ||
        (d.important && !winner.important) ||
        (d.important === winner.important && compareSpecificity(d.specificity, winner.specificity) > 0) ||
        (d.important === winner.important && compareSpecificity(d.specificity, winner.specificity) === 0 && d.order > winner.order)
      ) {
        winner = d;
      }
    }

    if (winner) {
      let beats: StyleSourceFinding['beats'] | null = null;
      let nodeValue: string | undefined;
      if (inline) {
        nodeValue = inline;
        if (winner.important && !inlineImportant) beats = 'author';
      } else if (defaults && defaults[property] !== undefined) {
        nodeValue = defaults[property];
        if (winner.important || compareSpecificity(winner.specificity, CLASS_SPECIFICITY) >= 0) beats = 'default';
      } else {
        beats = 'nothing';
      }
      if (beats && !same(winner.value, nodeValue)) {
        findings.push({
          port,
          property,
          value: winner.value,
          selector: winner.selector,
          important: winner.important,
          source: winner.source,
          beats,
          nodeValue
        });
        continue;
      }
    }

    // No rule decides it; the node's own CSS Style might, over the port's own value.
    if (fromCustomCss && inline && same(inline, customCss![property])) {
      findings.push({
        port,
        property,
        value: inline,
        selector: '',
        important: inlineImportant,
        source: { kind: 'css-style' },
        beats: 'author'
      });
    }
  }
  return findings;
}
