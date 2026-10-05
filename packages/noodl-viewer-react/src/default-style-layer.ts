/**
 * P109 ISL-008 — a node's DEFAULTS are the weakest rule on the page.
 *
 * A visual node used to write every style it had inline: its `defaultCss`, every `inputCss` default, and whatever
 * `Layout.size/align` derived from default sizes. An inline style outranks every stylesheet rule, so an author who gave
 * a Group a class and wrote `.win { position: fixed; align-items: center }` saw nothing happen. Five templates in a row
 * paid for that with `!important` (Olive's Island carries 196 of them).
 *
 * Richard's ruling (2026-10-05, "Stylesheet beats defaults"): a node writes inline only what the AUTHOR set. A default
 * moves into a class rule. An author-set panel value stays inline and still wins (ruling 2).
 *
 * ## The mechanism
 *
 * The values do not change, only where they are written. After a component has run `Layout.size/align` and added its
 * own keys, it calls {@link layerDefaults} on the style object it is about to render. Each key that is a default comes
 * off the object and into one declaration block. The block is registered once as `.ndl-d-<hash>{…}` in a single
 * `<style id="noodl-default-styles">`, and the class goes on the same element.
 *
 * 🔴 **The defaults sheet is the FIRST child of `<head>`, and that is the whole precedence model.** `.ndl-d-…` and the
 * author's `.win` are both one class: equal specificity, so source order decides, and every author sheet comes later.
 * A CSS Definition, a control's class sheet, the font loader and drag-drop all APPEND to `<head>`. Project head code
 * sits mid-head. Kit `<link>`s are in `<body>`. An element or universal selector (`button { … }`, `* { … }`) is less
 * specific than a class and still loses to a default, as it always lost to the inline style. That keeps a reset sheet
 * from undoing a Button's own background. A cascade `@layer` would have let it through, and would have dropped every
 * default on a browser older than Safari 15.4.
 *
 * ## What counts as a default (and what never does)
 *
 * The node carries a {@link DefaultLayerInfo} on its style object under the {@link DEFAULT_LAYER} symbol. Spread and
 * `Object.assign` copy it, so it survives each component's `{ ...props.style }`. React's style writer and the server
 * serialiser enumerate with `for…in`, which skips symbols, so it never reaches the DOM. A key is layered when the
 * author has not written it and either:
 *
 *  - it is in the type's start style (`defaultCss` + applied `inputCss` defaults) with the start value still on it, or
 *  - `Layout` derives it (width, height, flex-grow, flex-shrink, position, the align offsets) and none of the inputs
 *    it is derived from was set by the author ({@link LAYOUT_SOURCES}).
 *
 * Everything else stays inline, as it was: what the author set, what a wire set, a variant's values, `CSS Style`, and
 * every key a component adds after Layout from its own props (`overflow` from Clip, `pointer-events` from opacity 0).
 * "Authored" means a setter ran on this instance. A parameter stored in the project, a connection, a variant and a
 * visual state all run setters, and a default the runtime seeds never does. So a panel value equal to the default
 * (Align Items = Start, set in the panel) is authored and stays inline. That is AC3.
 *
 * Kit components never call this, so a kit node's `defaultCss` stays inline, as ISL-011 ruled. Tagged styles
 * (`props.styles[tag]`, an inner element's style) are not passed through it either. The author's class is on the
 * root, so an inner element's default has no author rule to lose to.
 */

/** Where the node's {@link DefaultLayerInfo} rides on its style object. `Symbol.for` so two bundles agree. */
export const DEFAULT_LAYER: unique symbol = Symbol.for('noodl.defaultStyleLayer') as never;

export interface DefaultLayerInfo {
  /** The type's start style — `defaultCss` plus every applied `inputCss` default — by key. */
  readonly start: Readonly<Record<string, unknown>>;
  /** Style keys a setter, a wire, a variant or `CSS Style` has written on this instance. */
  readonly authoredStyle: Set<string>;
  /** Input names (props and css) the author has set on this instance. */
  readonly authoredInputs: Set<string>;
}

/** A style object that may carry the layer info. Indexing by the symbol is what TypeScript needs spelled out. */
export type LayerableStyle = Record<string, any> & { [DEFAULT_LAYER]?: DefaultLayerInfo };

/**
 * The inputs each `Layout`-derived key is computed from. A key here is a default only while none of these is
 * authored: an author who set Width keeps the whole width computation inline, margins included.
 *
 * Read from `layout.ts` (`size`, `align`). `position` is here because `size` writes `absolute` under a parent with no
 * layout, and that is structure rather than something the author said.
 */
const SIZE_SOURCES = ['sizeMode', 'width', 'height', 'fixedWidth', 'fixedHeight', 'position'];
const ALIGN_SOURCES = ['alignX', 'alignY', 'position'];
export const LAYOUT_SOURCES: Readonly<Record<string, readonly string[]>> = {
  position: ['position'],
  width: [...SIZE_SOURCES, 'marginLeft', 'marginRight'],
  height: [...SIZE_SOURCES, 'marginTop', 'marginBottom'],
  flexGrow: SIZE_SOURCES,
  flexShrink: SIZE_SOURCES,
  left: ALIGN_SOURCES,
  right: ALIGN_SOURCES,
  top: ALIGN_SOURCES,
  bottom: ALIGN_SOURCES,
  transform: [...ALIGN_SOURCES, 'transform'],
  alignSelf: ALIGN_SOURCES,
  marginLeft: [...ALIGN_SOURCES, 'marginLeft'],
  marginRight: [...ALIGN_SOURCES, 'marginRight'],
  marginTop: [...ALIGN_SOURCES, 'marginTop'],
  marginBottom: [...ALIGN_SOURCES, 'marginBottom']
};

/**
 * Take the defaults off `style` and return the class that carries them, or `undefined` when nothing was layered
 * (no info on the object, or every key authored). `extraSources` names, for a component that computes keys of its
 * own (Columns' container), the inputs each of those keys comes from. An empty list means the key is a constant.
 *
 * ⚠️ Call it LAST, just before the element is returned. A component that reads a layered key after this sees it gone.
 */
export function layerDefaults(
  style: LayerableStyle,
  extraSources?: Readonly<Record<string, readonly string[]>>
): string | undefined {
  const info = style[DEFAULT_LAYER];
  if (!info) return undefined;

  const declarations: Array<[string, unknown]> = [];
  for (const key of Object.keys(style)) {
    if (info.authoredStyle.has(key) || info.authoredInputs.has(key)) continue;
    const value = style[key];
    if (value === undefined || value === null || value === '') continue;

    const sources = (extraSources && extraSources[key]) || LAYOUT_SOURCES[key];
    let layered: boolean;
    if (sources) {
      layered = !sources.some((s) => info.authoredInputs.has(s) || info.authoredStyle.has(s));
    } else {
      layered = Object.prototype.hasOwnProperty.call(info.start, key) && info.start[key] === value;
    }
    if (!layered) continue;

    declarations.push([key, value]);
    delete style[key];
  }

  return declarations.length > 0 ? classForDeclarations(declarations) : undefined;
}

/** `a b` without a stray space or the string `undefined`. */
export function withDefaultsClass(className: string | undefined, defaultsClass: string | undefined): string | undefined {
  if (!defaultsClass) return className;
  return className ? `${className} ${defaultsClass}` : defaultsClass;
}

// --- serialising, as React does -------------------------------------------------------------------------------------

/**
 * React's list of properties a bare number is written to without `px` (`isUnitlessNumber`, react-dom 18). A default
 * written here must read exactly as React would have written it inline, or moving it changes the page.
 */
const UNITLESS = new Set([
  'animationIterationCount', 'aspectRatio', 'borderImageOutset', 'borderImageSlice', 'borderImageWidth', 'boxFlex',
  'boxFlexGroup', 'boxOrdinalGroup', 'columnCount', 'columns', 'flex', 'flexGrow', 'flexPositive', 'flexShrink',
  'flexNegative', 'flexOrder', 'gridArea', 'gridRow', 'gridRowEnd', 'gridRowSpan', 'gridRowStart', 'gridColumn',
  'gridColumnEnd', 'gridColumnSpan', 'gridColumnStart', 'fontWeight', 'lineClamp', 'lineHeight', 'opacity', 'order',
  'orphans', 'scale', 'tabSize', 'widows', 'zIndex', 'zoom', 'fillOpacity', 'floodOpacity', 'stopOpacity',
  'strokeDasharray', 'strokeDashoffset', 'strokeMiterlimit', 'strokeOpacity', 'strokeWidth'
]);

export function cssPropertyName(key: string): string {
  if (key.startsWith('--')) return key;
  return key
    .replace(/^(Webkit|Moz|O)(?=[A-Z])/, (m) => '-' + m.toLowerCase())
    .replace(/^ms(?=[A-Z])/, '-ms')
    .replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
}

export function cssValue(key: string, value: unknown): string {
  if (typeof value === 'number' && value !== 0 && !UNITLESS.has(key) && !key.startsWith('--')) return `${value}px`;
  return String(value).trim();
}

// --- the registry ---------------------------------------------------------------------------------------------------

export const DEFAULT_STYLES_ELEMENT_ID = 'noodl-default-styles';

/** Body → class. The class is a content hash, so a server render and the client name the same block the same. */
const classByBody = new Map<string, string>();
const bodyByClass = new Map<string, string>();
const declarationsByClass = new Map<string, Readonly<Record<string, string>>>();

/**
 * Every rule registered in this process, in order. A server render has no `document`: `server-core.js` reads this
 * after `renderToString` and writes it as the first element of `<head>` (AC7 — the first paint carries the defaults).
 */
const rules: string[] = [];
(globalThis as { __noodlDefaultStyleRules?: string[] }).__noodlDefaultStyleRules = rules;

/** cyrb53 — 53 bits, so two different blocks sharing a name would need ~10^8 distinct blocks on one page. */
function hash(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function classForDeclarations(declarations: Array<[string, unknown]>): string {
  const pairs = declarations.map(([key, value]) => [cssPropertyName(key), cssValue(key, value)] as const);
  const body = pairs.map(([name, value]) => `${name}:${value}`).join(';');

  const known = classByBody.get(body);
  if (known) return known;

  let name = 'ndl-d-' + hash(body);
  // A collision is all but impossible, and a wrong default on an element is not something to leave to "all but".
  while (bodyByClass.has(name) && bodyByClass.get(name) !== body) name += 'x';
  classByBody.set(body, name);
  bodyByClass.set(name, body);
  declarationsByClass.set(name, Object.freeze(Object.fromEntries(pairs)));

  const rule = `.${name}{${body}}`;
  rules.push(rule);
  insertRule(rule);
  return name;
}

/** The declarations a default class carries, as CSS names and values — for the box-model overlay's "specified" read. */
export function defaultDeclarationsOf(element: Element): Readonly<Record<string, string>> | undefined {
  for (const cls of Array.from(element.classList)) {
    if (cls.startsWith('ndl-d-')) return declarationsByClass.get(cls);
  }
  return undefined;
}

let sheetElement: HTMLStyleElement | null = null;

function defaultsSheet(): CSSStyleSheet | null {
  if (typeof document === 'undefined' || !document.head) return null;
  if (!sheetElement || !sheetElement.isConnected) {
    // A server render left one: adopt it (its rules are duplicates of what this process will register; harmless).
    sheetElement = document.getElementById(DEFAULT_STYLES_ELEMENT_ID) as HTMLStyleElement | null;
    if (!sheetElement) {
      sheetElement = document.createElement('style');
      sheetElement.id = DEFAULT_STYLES_ELEMENT_ID;
      document.head.insertBefore(sheetElement, document.head.firstChild);
    }
  }
  // 🔴 First in `<head>` is the precedence model (see the module note). Something prepended later is put back behind.
  if (document.head.firstChild !== sheetElement) document.head.insertBefore(sheetElement, document.head.firstChild);
  return sheetElement.sheet;
}

function insertRule(rule: string): void {
  const sheet = defaultsSheet();
  if (!sheet) return;
  try {
    sheet.insertRule(rule, sheet.cssRules.length);
  } catch {
    // A block the browser cannot parse as a rule. Its declarations are the same ones the inline style held, which
    // would have been dropped there too; nothing is lost that was there before.
  }
}

/** For specs: forget every class (the sheet element is left to the test's document). */
export function resetDefaultStyleLayerForTests(): void {
  classByBody.clear();
  bodyByClass.clear();
  declarationsByClass.clear();
  rules.length = 0;
  sheetElement = null;
}
