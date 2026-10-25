/**
 * The render report's **pure half** — the measurement expression, the findings
 * and the thresholds. No Node, no browser, no filesystem.
 *
 * ## Why this is a package (F22, decided 2026-08-10)
 *
 * LAS-005 shipped `render_report` and descoped its **editor** client with the
 * blocker named: the pure half lived in `scripts/devtools/render-report.js` as
 * plain CJS *precisely* so the CLI runs in a fresh checkout with no build step —
 * and the editor bundle could not import it without dragging `child_process`,
 * `http`, `net` and `ws` into the renderer. `scripts/` is also not shipped in a
 * packaged editor. Three ways out were filed; Richard chose this one.
 *
 * The two rejected, and why:
 *
 * - **A dependency-free file under `scripts/` that both import.** Webpack would
 *   bundle it (the editor's loaders exclude only `node_modules`), but the
 *   editor's `tsconfig.json` sets no `allowJs` and its `include` is limited to
 *   `src/editor`, `src/shared`, `src/main` — so `typecheck:editor`, one of the
 *   phase's four gates, could not see 600 lines of measurement code without a
 *   hand-written declaration anyway. An unwatched typecheck is the `test:main`
 *   shape this repo has already been bitten by.
 * - **Move it into the editor and give the CLI a build step.** That destroys the
 *   property that made the harness useful in the phase-55 audit — *clone and
 *   measure* — and points `noodl-mcp` at the editor package, which is backwards.
 *
 * ## Why plain CJS with a hand-written `.d.ts`, not TypeScript
 *
 * ⚠️ The other no-build packages here (`@noodl/types`, `@noodl/platform`,
 * `@noodl/git`, …) point `main` straight at a `.ts` file, which works because
 * every consumer of those runs through `tsc`, `ts-jest` or webpack. **This
 * package has a consumer that does not**: `scripts/devtools/measure-from-disk.js`
 * is run by bare `node`, and bare `node` cannot `require` a `.ts` file. So the
 * source of truth is `.js` and the types ride alongside in `index.d.ts`.
 *
 * ## What must never appear in this file
 *
 * A `require`. Not `fs`, not `path`, not a workspace sibling. The moment one
 * lands the editor bundle grows a Node dependency and the reason this package
 * exists is gone. There is a spec asserting exactly that.
 *
 * @module @nodegx/render-measure
 */

'use strict';

/** The two viewports phases 54–55 measured at. Phone is device emulation — Chrome will not open a real window under ~500px. */
const DEFAULT_VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900, mobile: false },
  { name: 'phone', width: 390, height: 844, mobile: true }
];

/**
 * Every viewport that has a *name*, which is a longer list than the default.
 *
 * ⚠️ **`tablet` is here and deliberately not in `DEFAULT_VIEWPORTS`.** Richard
 * asked (2026-08-10) for mobile/tablet/desktop to be selectable when building a
 * mobile app, and the name has to be spelled the same way everywhere — the CLI,
 * the MCP tool and the editor's capture control all resolve names from here. But
 * adding it to the *default* set would silently make `render_report` measure a
 * third viewport on every call it has ever been asked to make, changing its cost
 * and its recorded output. **A vocabulary and a default are different things.**
 *
 * 1024×1366 is the portrait iPad Pro, and `mobile: false` because a tablet at
 * that width gets the desktop layout — which is exactly what a user checking
 * "does my app work on a tablet" needs to see.
 */
const NAMED_VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900, mobile: false },
  { name: 'tablet', width: 1024, height: 1366, mobile: false },
  { name: 'phone', width: 390, height: 844, mobile: true }
];

/** A viewport at least this wide is expected to lay content out in more than one column. */
const DESKTOP_WIDTH = 1024;

/**
 * When a stack of look-alike siblings is worth mentioning, and when it is a
 * footer.
 *
 * Calibrated against the three measured builds (2026-08-08), because the first
 * predicate — "≥3 identical siblings sharing one left edge" — fired on every
 * footer link list and every three-line paragraph block: 5 hits on
 * `ecommerce-example` and 4 on the replay this phase calls *correct*, against 2
 * true ones. What separates a grid that failed from a list that is a list is
 * that the items are big enough to have sat side by side:
 *
 * | build | group | verdict |
 * |---|---|---|
 * | haiku | 4 × `.column-item` 1248×450 | the defect |
 * | haiku | 3 × `.column-item` 1248×261 | the defect |
 * | haiku | 3 × 1168×**56** text rows | a paragraph — height |
 * | sonnet | 6 × 240×**17** in a 240px parent | footer links — height |
 * | ecommerce | 5 × 252×**15** in a 252px parent | footer links — height |
 * | sonnet | 3 × 1152×300 category banners | stacked **on purpose** — info only |
 *
 * So a `Columns` node that produced one column is a warning (the author asked
 * for a grid in the one node that makes grids, and did not get one), while
 * look-alike siblings are info at most: full-bleed banners stacked down the page
 * are a real design, and a warning that fires on one is a warning an agent
 * learns to ignore.
 */
const GRID_ITEM_MIN_HEIGHT = 120;
const GRID_ITEM_MIN_WIDTH = 300;
/** An item narrower than this share of its parent was never trying to be a column. */
const GRID_ITEM_PARENT_SHARE = 0.6;
/** A parent narrower than this share of the viewport is itself already a column. */
const GRID_PARENT_VIEWPORT_SHARE = 0.5;

// ── The browser-side measurement ────────────────────────────────────────────

/**
 * One expression, evaluated in the page. Returns raw numbers only — every
 * judgement about what they mean lives in {@link summarise}, on this side, where
 * it can be unit-tested without a browser.
 */
function measureExpression(placeholders, probes = []) {
  return `(() => {
  const PLACEHOLDERS = ${JSON.stringify(placeholders)};
  const PROBES = ${JSON.stringify(probes)};
  const round = (n) => Math.round(n);
  const cls = (el) => String(el.className || '').trim().slice(0, 60);
  const all = [...document.querySelectorAll('body *')];

  // FLD-012 — one computed style per element, reused by every rule below. 'visible' now needs a
  // style for EVERY element rather than only for the ones with no offset parent, and four rules
  // downstream ask for the same element's style again. Without this the change would have paid for
  // a second 'getComputedStyle' per empty box on every page.
  const styles = new Map();
  const styleOf = (el) => {
    let cs = styles.get(el);
    if (cs === undefined) {
      cs = getComputedStyle(el);
      styles.set(el, cs);
    }
    return cs;
  };

  // FLD-012 (#32) — 'visible' is the population every rule below is computed over, and it used to
  // mean "the browser gave it a layout box". That is not the same as "a person can see it":
  // 'offsetParent' is null for 'display: none' but perfectly non-null for 'opacity: 0' and for
  // 'visibility: hidden'. So an invisible element was being reported as a box a person could see —
  // by 'empty-decorated-box', and inherited unchanged by 'elements-overflowing', the accent-area
  // census, the rhythm bands and 'single-column-grid'. This is a correctness fix, not a
  // suppression: nothing that can be seen is dropped.
  //
  // ⚠️ 'visibility' is inherited, so the computed value already accounts for a hidden ancestor.
  // 'opacity' is NOT inherited — a child of an 'opacity: 0' parent computes to 1 — so this catches
  // the element that is itself transparent and not one buried under a faded ancestor. Walking every
  // ancestor would cost a style read per level per element; the shipped false positives are all the
  // first kind ('.ndl-controls-radio-2' is 'opacity: 0' on the input itself).
  // FLD-012 AC3 — declared OUTSIDE the filter below on purpose: a reverted arm replaces only the
  // filter, and a counter declared inside it would make the reverted arm throw a ReferenceError
  // instead of measuring. Left at 0, which is exactly what the old predicate excluded.
  let transparentExcluded = 0;
  const visible = all.filter((el) => {
    const cs = styleOf(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0') {
      transparentExcluded += 1;
      return false;
    }
    return el.offsetParent !== null || cs.position === 'fixed';
  });

  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const overflowing = visible
    .map((el) => ({ el, w: el.getBoundingClientRect().width }))
    .filter((x) => x.w > vw + 1)
    .map((x) => ({ tag: x.el.tagName, cls: cls(x.el), width: round(x.w) }));

  // P88 GAM-020 (D58) — a Text wider than the box it sits in. RKT-001's corrected clause: the text's
  // border box against its PARENT's content box. A 'white-space: pre' Text always fits itself, so its
  // own scrollWidth against its own clientWidth cannot fail (that read 60/60 green on the clipped
  // build). An inline parent has no content box (clientWidth 0) and is skipped, never judged.
  const textsWiderThanBox = visible
    .filter((el) => el.classList.contains('ndl-visual-text') && el.parentElement)
    .map((el) => {
      const parent = el.parentElement;
      const ps = styleOf(parent);
      const box = parent.clientWidth - (parseFloat(ps.paddingLeft) || 0) - (parseFloat(ps.paddingRight) || 0);
      return { el, width: el.getBoundingClientRect().width, box };
    })
    .filter((x) => x.box > 0 && x.width > x.box + 1)
    .map((x) => ({ text: x.el.textContent.trim().slice(0, 80), width: round(x.width), parentWidth: round(x.box), cls: cls(x.el) }));

  // P112-OWN020-OFFSYSTEM — the controls, measured against the project's type scale. A control nobody styled draws
  // the runtime's own look (a Radio Button is a 32px circle with a 2px black ring; a native select or button keeps
  // the browser's 13.33px text), and that is the "chunky" control beside a page on tokens. A radio or checkbox input
  // is opacity 0, so its box is read on the first ancestor a person can see. The scale is the project's --text-*
  // tokens, read off :root; the fake DOMs in the tests have no getPropertyValue, so it is guarded.
  const pxOf = (value) => {
    const s = String(value || '').trim();
    if (!s) return NaN;
    if (s.slice(-3) === 'rem') return parseFloat(s) * (parseFloat(styleOf(document.documentElement).fontSize) || 16);
    return parseFloat(s);
  };
  const textScale = [];
  const rootStyle = styleOf(document.documentElement);
  if (rootStyle && typeof rootStyle.getPropertyValue === 'function') {
    for (const step of ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl']) {
      const px = pxOf(rootStyle.getPropertyValue('--text-' + step));
      if (px > 0) textScale.push(Math.round(px * 100) / 100);
    }
  }
  const controlKind = (el) => {
    const type = String(el.type || '').toLowerCase();
    if (el.tagName === 'INPUT' && type === 'radio') return 'Radio Button';
    if (el.tagName === 'INPUT' && type === 'checkbox') return 'Checkbox';
    if (el.tagName === 'SELECT') return 'Dropdown';
    if (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && ['', 'text', 'email', 'password', 'search', 'number', 'tel', 'url'].indexOf(type) !== -1)) return 'Text Input';
    if (el.tagName === 'BUTTON') return 'Button';
    return null;
  };
  const controls = [];
  for (const el of all) {
    const kind = controlKind(el);
    if (!kind) continue;
    if (kind === 'Radio Button' || kind === 'Checkbox') {
      let shown = el;
      for (let hops = 0; shown && hops < 3 && (parseFloat(styleOf(shown).opacity) < 0.05 || shown.getBoundingClientRect().width < 2); hops++) shown = shown.parentElement;
      if (!shown || shown.offsetParent === null) continue;
      const r = shown.getBoundingClientRect();
      let label = null;
      if (el.id && typeof document.querySelector === 'function') label = document.querySelector('label[for="' + el.id + '"]');
      controls.push({ kind, box: round(Math.max(r.width, r.height)), textSize: label ? pxOf(styleOf(label).fontSize) : NaN });
    } else {
      if (visible.indexOf(el) === -1) continue;
      controls.push({ kind, box: 0, textSize: pxOf(styleOf(el).fontSize) });
    }
  }

  // AWP-004 — what is on screen, as opposed to what is in the DOM. The page is
  // never scrolled when this runs, so a rect is already a document position.
  // Kimi K3's storefront was 83 texts in the DOM and about three on screen, and
  // the report called it clean because every check it had was about content
  // present and wrong rather than content present and unreachable.
  const onScreen = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  };

  // Below the fold is fine — that is what scrolling is for. Below the *scrollable
  // extent* is not: no scroll reaches it, so it is on the page and can never be
  // seen. Measured directly rather than inferred from a visible-count ratio,
  // because a correct 82-text page also shows only ~19 at a time and a ratio
  // cannot tell the two apart.
  const pageBottom = document.documentElement.scrollHeight;
  const unreachable = (el) => el.getBoundingClientRect().top >= pageBottom - 1;

  const textEls = visible.filter((el) => el.children.length === 0 && el.textContent.trim().length > 0);
  const fontWeights = {};
  const fontSizes = {};
  for (const el of textEls) {
    const cs = styleOf(el);
    fontWeights[cs.fontWeight] = (fontWeights[cs.fontWeight] || 0) + 1;
    fontSizes[cs.fontSize] = (fontSizes[cs.fontSize] || 0) + 1;
  }

  const dead = textEls.filter((el) => PLACEHOLDERS.includes(el.textContent.trim()));
  const byText = {};
  for (const el of dead) {
    const t = el.textContent.trim();
    byText[t] = (byText[t] || 0) + 1;
  }

  // FLD-012 (#32) — *"I started ignoring the warning."* Five of ten pages carried this finding
  // purely for containing a control, and noise in a signal this good is a real cost.
  //
  // Two residues survive the 'visible' fix above, because neither is invisible — they are drawn,
  // they are just not the author's boxes:
  //
  //   1. A FORM CONTROL. It has no children and no text by construction, and the runtime styles it
  //      — the deprecated Radio Button is an '<input type="radio">' at 24x24 with a solid border
  //      ('nodes-deprecated/controls/radiobutton.tsx:62', 'assets/style.css:64'). It is not an empty
  //      box; it is a control that happens to be childless.
  //   2. A CONTROL'S OWN FURNITURE — the parts the runtime draws INSIDE a control, beside its
  //      input, as plain unclassed '<div>'s: the Slider's track and thumb ('Slider.tsx:146-176')
  //      and the Radio Button's checked fill dot, which is the one this fixture actually caught —
  //      a 16x16 absolutely-positioned black div whose parent also holds the radio input. Every
  //      one of them is drawn, so no visibility test reaches them, and every one is furniture
  //      rather than a box the author left empty.
  //
  // 🔴 #32's own suggested discriminator does not reach either of them, and the second half of
  // this file's earlier scope note was actively dangerous:
  //   - 'closest('[class*="ndl-controls-"]')' returns null for the track and the thumb — they are
  //     unclassed and so is their parent; only their '<input>' SIBLING carries the class.
  //   - 'appearance: none' is the COMPUTED DEFAULT of an ordinary '<div>' in Chrome, measured on
  //     this fixture. Skipping on it would suppress every finding on every page, including the
  //     author's genuinely empty box — which is exactly the failure mode this rule's presence
  //     control exists to catch. It is not used here.
  //
  // ⚠️ The furniture predicate is deliberately narrow, and it is TWO conditions, not one:
  // absolutely positioned AND a direct sibling of a form control. An author's own empty Group is
  // neither — measured on this fixture it is 'position: relative' with four plain div siblings.
  // It would take positioning a box absolutely AND placing it beside a control in the same parent
  // to be suppressed by this: small, real, and stated here rather than discovered later.
  const FORM_CONTROL_TAGS = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'PROGRESS', 'METER'];
  const CONTROL_SIBLING_SELECTOR = ':scope > input, :scope > select, :scope > textarea, :scope > button';
  const isControlFurniture = (el) => {
    const parent = el.parentElement;
    if (!parent || !parent.querySelector(CONTROL_SIBLING_SELECTOR)) return false;
    return styleOf(el).position === 'absolute';
  };

  const emptyBoxes = visible.filter((el) => {
    if (el.children.length !== 0 || el.textContent.trim() !== '') return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 8 || r.height <= 8) return false;
    if (FORM_CONTROL_TAGS.indexOf(el.tagName) !== -1) return false;
    if (isControlFurniture(el)) return false;
    const cs = styleOf(el);
    return cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.borderStyle !== 'none';
  });

  const images = visible.filter((el) => el.tagName === 'IMG');
  const brokenImages = images.filter((el) => el.complete && el.naturalWidth === 0);

  // VIB-007 M3 — iconography, which no earlier finding needed and which
  // 'no-imagery' cannot be honest without: README section 2's tell is "no
  // imagery AND no iconography", and a page of five Lucide glyphs and no
  // photographs satisfies only half of it.
  //
  // Four shapes, because IconGlyph has four branches and only two of them carry
  // a class this could key on. Measured against the VIB-006 page rather than
  // read off the component: the font branch renders
  // span.lucide.icon-sprout with NO ndl-icon-glyph class on it, so a selector
  // written from that constant would have counted zero on a page with ten.
  //
  //   sprite / inline -> .ndl-icon-glyph
  //   the Icon node   -> .ndl-visual-icon wrapper
  //   an inline svg   -> the svg element itself
  //   a font glyph    -> a ::before whose content is a Private Use Area
  //                      codepoint, which is what an icon font IS. Restricting
  //                      to U+E000..U+F8FF is what keeps a bullet, a quote mark
  //                      or a CSS counter from counting as iconography.
  //
  // A Set of ELEMENTS, so the wrapper and the glyph it holds are not two icons.
  // Over-counting is harmless here and under-counting is not: the predicate is
  // "is there any iconography at all", so a wrapper counted twice still says
  // yes, and a glyph missed entirely says no when the answer is yes.
  const PUA_FIRST = 0xe000;
  const PUA_LAST = 0xf8ff;
  const isGlyphContent = (raw) => {
    if (!raw || raw === 'none' || raw === 'normal') return false;
    const text = raw.replace(/^["']|["']$/g, '');
    if (!text.length) return false;
    for (const ch of text) {
      const pt = ch.codePointAt(0);
      if (pt < PUA_FIRST || pt > PUA_LAST) return false;
    }
    return true;
  };
  const iconEls = new Set();
  for (const el of visible) {
    const list = el.classList;
    if (list && (list.contains('ndl-icon-glyph') || list.contains('ndl-visual-icon'))) {
      iconEls.add(el);
      continue;
    }
    if (String(el.tagName).toLowerCase() === 'svg') {
      iconEls.add(el);
      continue;
    }
    if (isGlyphContent(getComputedStyle(el, '::before').content)) iconEls.add(el);
  }

  // VIB-007 M3 — the page's full-bleed surfaces and what each is painted with.
  //
  // README section 2's first WordPress tell is "one background colour end to
  // end", and the reading it needs is the number of DISTINCT grounds across the
  // bands, not across every element: a page whose sections alternate has a
  // designed rhythm, and a page whose cards and inputs happen to carry three
  // greys does not. The width filter is the one the rhythm block already uses,
  // so "band" means the same thing in both readings.
  //
  // background-image is read BEFORE background-color and wins, because a
  // gradient or a photograph sits on top of the colour and is the ground a
  // person sees. Measured, not assumed: every one of the VIB-006 page's
  // gradient bands reports backgroundColor rgba(0, 0, 0, 0) and its whole
  // identity is in background-image, so a colour-only count read 6 grounds on a
  // page that has 8.
  const groundCounts = {};
  for (const el of visible) {
    const r = el.getBoundingClientRect();
    if (r.width < vw * 0.6 || r.height < 8) continue;
    const cs = styleOf(el);
    const painted =
      cs.backgroundImage && cs.backgroundImage !== 'none'
        ? cs.backgroundImage
        : cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent'
          ? cs.backgroundColor
          : null;
    if (!painted) continue;
    const key = String(painted).slice(0, 120);
    groundCounts[key] = (groundCounts[key] || 0) + 1;
  }

  // DSG-006 §4 — "one accent". A designed page carries one chromatic colour as
  // a background and neutrals for everything else; five accents is decorated
  // rather than designed. Neutral is decided by *chroma* (max minus min
  // channel) rather than by matching a palette, so it holds for any token set
  // and for a project that never adopted one. Area-weighted, because a 4px
  // chromatic rule and a full-bleed hero are not the same claim.
  const parseRgb = (s) => {
    const m = s.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    if (p.length >= 4 && p[3] === 0) return null;
    return [p[0], p[1], p[2]];
  };
  const accentArea = {};
  const neutralArea = {};
  for (const el of visible) {
    const r = el.getBoundingClientRect();
    const area = r.width * r.height;
    if (area < 1000) continue;
    const bg = styleOf(el).backgroundColor;
    const c = parseRgb(bg);
    if (!c) continue;
    const chroma = Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]);
    const bucket = chroma > 12 ? accentArea : neutralArea;
    bucket[bg] = (bucket[bg] || 0) + area;
  }
  // DSG-006/F41 — raw area cannot say whether a chromatic colour is an *accent*
  // or the page's ground, and it is not comparable between viewports: 600k px²
  // is half of a desktop page and four phone screens. "share" is the fraction
  // of the viewport the colour covers, which is the number §4 is actually
  // about. The case that named this: haiku and sonnet paint the SAME hue at the
  // SAME accent count, at 0.524 and 0.013 of the page respectively.
  // ⚠️ No backticks in here — this whole block is a template literal, and one
  // in a comment ends the string. It surfaces as a syntax error hundreds of
  // lines away, which is how it cost a debug cycle the first time.
  const viewportArea = window.innerWidth * window.innerHeight;
  const accents = Object.keys(accentArea)
    .map((color) => ({
      color,
      area: round(accentArea[color]),
      share: viewportArea ? Math.round((1000 * accentArea[color]) / viewportArea) / 1000 : null
    }))
    .sort((a, b) => b.area - a.area);

  // DSG-006 §1/§8 — vertical rhythm. Measured between the full-width bands of
  // the page's main stack, not between every pair of siblings: a designed page
  // repeats two or three spacings, and counting every gap in the DOM would
  // drown that signal in card padding. The widest-stack parent is chosen by
  // how many bands it holds, which is what "the page's sections" means when
  // nothing in the graph labels them as such.
  // ⚠️ Measured as gaps *and* band padding, because in this renderer the two
  // are interchangeable and the first version of this saw nothing: a stack of
  // bands that abut at gap 0 and carry their spacing as internal padding is the
  // normal shape here, so gaps alone reported "1 distinct gap: 0" for a page
  // with perfectly good rhythm. What the doctrine is about is the number of
  // distinct vertical spacings on the page, however they are expressed.
  const bandParents = new Map();
  for (const el of visible) {
    const r = el.getBoundingClientRect();
    if (r.width < vw * 0.6 || r.height < 8) continue;
    const p = el.parentElement;
    if (!p) continue;
    if (!bandParents.has(p)) bandParents.set(p, []);
    bandParents.get(p).push({ el, r });
  }
  let bands = [];
  for (const set of bandParents.values()) if (set.length > bands.length) bands = set;
  bands = bands.slice().sort((a, b) => a.r.top - b.r.top);

  const spacingCounts = {};
  const addSpacing = (v) => {
    const n = round(v);
    // Zero is "these abut", not a spacing; a huge value is a page break.
    if (n <= 0 || n > 400) return;
    spacingCounts[n] = (spacingCounts[n] || 0) + 1;
  };
  for (let i = 1; i < bands.length; i++) addSpacing(bands[i].r.top - bands[i - 1].r.bottom);
  for (const b of bands) {
    const cs = styleOf(b.el);
    addSpacing(parseFloat(cs.paddingTop));
    addSpacing(parseFloat(cs.paddingBottom));
  }
  const spacingValues = Object.keys(spacingCounts)
    .map(Number)
    .sort((a, b) => a - b);

  // Repeated sibling sets — a card grid, seen from the DOM. Two kinds:
  //   'columns' — a Columns node's own item wrappers (.column-item), so the
  //               author asked for a grid explicitly and we know it.
  //   'siblings' — identical-looking children of one parent, which is what a
  //               hand-laid or repeated card row looks like.
  // Grouping by parent, and by an identity signature within the parent, is what
  // separates a grid from an ordinary stack of page sections.
  const byParent = new Map();
  for (const el of visible) {
    const p = el.parentElement;
    if (!p) continue;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p).push(el);
  }
  const groups = [];
  const record = (parent, kids, kind) => {
    if (kids.length < 3) return;
    const rects = kids.map((k) => k.getBoundingClientRect());
    if (rects[0].width < 100) return;
    groups.push({
      kind,
      count: kids.length,
      columns: new Set(rects.map((r) => round(r.left))).size,
      rows: new Set(rects.map((r) => round(r.top))).size,
      itemWidth: round(rects[0].width),
      itemHeight: round(rects[0].height),
      parentWidth: round(parent.getBoundingClientRect().width),
      tag: kids[0].tagName,
      cls: cls(kids[0])
    });
  };
  for (const [parent, kids] of byParent) {
    const items = kids.filter((k) => k.classList && k.classList.contains('column-item'));
    if (items.length >= 3) {
      record(parent, items, 'columns');
      continue;
    }
    const bySignature = new Map();
    for (const k of kids) {
      const sig = k.tagName + '|' + cls(k) + '|' + k.querySelectorAll('*').length;
      if (!bySignature.has(sig)) bySignature.set(sig, []);
      bySignature.get(sig).push(k);
    }
    for (const set of bySignature.values()) record(parent, set, 'siblings');
  }

  // LAS-012 §3. Content the graph declares for a list, looked for on the page.
  //
  // Built from the visible leaf text elements, NOT \`document.body.textContent\`
  // — measured, not assumed: render-from-disk injects the whole project as
  // \`window.projectData\` in a <script> inside <body>, so body text contains
  // every items array verbatim and the first version of this check found all
  // six of haiku's missing strings on a page showing none of them.
  //
  // \`textContent\` is unaffected by text-transform, so an uppercased heading
  // still matches its source string.
  const pageText = textEls.map((el) => el.textContent).join('\\n');
  const lists = PROBES.map((p) => {
    const found = p.strings.filter((s) => pageText.indexOf(s) !== -1);
    return { ...p, found: found.length, missing: p.strings.filter((s) => found.indexOf(s) === -1).slice(0, 3) };
  });

  // How far down the page anything was actually laid out. A page pinned to the
  // viewport height with content laid out past it is clipped; a page that is
  // simply short has nothing past it. That difference is the whole of
  // \`clipped-page\`, and neither number alone can tell them apart.
  // P112-OWN019-LAPTOPGAPS (R39) — where the INK is, not where the boxes are. Richard on RL1's laptop page: a
  // feature number in a Columns "1 4" row had a fifth of the page to itself, ~215 px of nothing before its title;
  // L1's pricing toggle and price sat ~260 px left of their centred heading. Every box there is well-formed — the
  // number's column box abuts the title's — so the measure is each child's ink: the union of its shown text runs
  // (a Range, so a full-width text block counts only as far as its words reach) and its painted boxes. Desktop only:
  // that is where a row has room to open a hole. Raw numbers here; the judgement is summarise's.
  const layout = { rowGaps: [], drifts: [] };
  // (The API guard is for the fake DOMs the unit suites hand this expression; every browser has both.)
  if (vw >= 1024 && typeof document.createRange === 'function' && typeof document.createTreeWalker === 'function') {
    const shown = new Set(visible);
    const textInk = [];
    const range = document.createRange();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim() || !shown.has(n.parentElement)) continue;
      range.selectNodeContents(n);
      const r = range.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) textInk.push({ node: n, r });
    }
    const PAINTED_TAGS = ['IMG', 'SVG', 'CANVAS', 'VIDEO', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'svg'];
    const paintedInk = visible
      .filter((el) => {
        if (PAINTED_TAGS.includes(el.tagName)) return true;
        const cs = styleOf(el);
        const bg = cs.backgroundColor;
        return (bg && bg !== 'transparent' && !/rgba\\([^)]*,\\s*0\\)$/.test(bg)) || cs.backgroundImage !== 'none' || parseFloat(cs.borderTopWidth) > 0;
      })
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter((p) => p.r.width > 0 && p.r.height > 0 && p.r.width < vw * 0.98);
    const inkOf = (el) => {
      let l = Infinity, t = Infinity, rr = -Infinity, b = -Infinity, text = '';
      const take = (r) => { l = Math.min(l, r.left); t = Math.min(t, r.top); rr = Math.max(rr, r.right); b = Math.max(b, r.bottom); };
      for (const x of textInk) if (el.contains(x.node)) { take(x.r); if (!text) text = x.node.textContent.trim().slice(0, 50); }
      for (const p of paintedInk) if (el === p.el || el.contains(p.el)) take(p.r);
      return l === Infinity ? null : { left: l, top: t, right: rr, bottom: b, width: rr - l, height: b - t, text };
    };
    const ROW_GAP_MIN_PX = 160;
    for (const parent of visible) {
      const kids = [...parent.children].filter((k) => shown.has(k));
      if (kids.length < 2) continue;
      const pr = parent.getBoundingClientRect();
      if (pr.width < 600) continue;
      const inks = kids.map(inkOf).filter(Boolean);
      if (inks.length < 2) continue;
      // Side by side: consecutive by left edge, overlapping vertically, the second starting after the first ends.
      const byLeft = [...inks].sort((a, b) => a.left - b.left);
      for (let i = 1; i < byLeft.length; i++) {
        const a = byLeft[i - 1], b = byLeft[i];
        const overlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        const gap = b.left - a.right;
        if (overlap <= 0 || gap < ROW_GAP_MIN_PX) continue;
        layout.rowGaps.push({ cls: cls(parent), gap: round(gap), rowWidth: round(pr.width), tallest: round(Math.max(a.height, b.height)), left: a.text, right: b.text });
      }
      // Stacked, each starting below the one before, and the parts of ONE section: every part under 240 px tall (a
      // page whose children are whole sections compared section against section — measured on L1 and GL1, s5). The
      // section's axis is set by a centred part among its first two (its heading, usually); L1's pricing is just
      // two parts, a centred heading block and a toggle-and-price group ~260 px left of it.
      const byTop = [...inks].sort((a, b) => a.top - b.top);
      if (!byTop.every((k, i) => i === 0 || k.top >= byTop[i - 1].bottom - 2)) continue;
      // Two or more tall parts, not one: RL1's waitlist is eyebrow, heading, line and a 290 px form card in ONE group,
      // and "any part > 240" skipped it — Richard saw the eyebrow off the centred heading (s6). A page of sections
      // has many tall children; a section with one card has one.
      if (byTop.filter((k) => k.height > 240).length > 1) continue;
      const centre = pr.left + pr.width / 2;
      const offOf = (k) => k.left + k.width / 2 - centre;
      const centred = byTop.filter((k) => Math.abs(offOf(k)) <= 12 && k.width < pr.width * 0.9);
      if (!centred.some((k) => byTop.indexOf(k) < 2)) continue;
      for (const k of byTop) {
        if (Math.abs(offOf(k)) > 40 && k.width < pr.width * 0.8) {
          layout.drifts.push({ cls: cls(parent), offBy: round(offOf(k)), sectionWidth: round(pr.width), text: k.text, centredText: centred[0].text });
        }
      }
    }
  }

  // P112-OWN019-LETTEREDGE — words hard against the edge of the box that frames them. Richard on TL2's hero: seven
  // outlined day chips, each letter pressed to its chip's left edge. The chip Group centred its child the way CSS
  // would, but a Text stretches to its Group's width and sets its letters left, so the centring moved nothing. The
  // frame is the nearest of the text's first four ancestors with a border or a fill (a page-wide band is not a frame,
  // nor an inline highlight); the reading is the gap between the words' own ink (a Range) and the frame's inner left
  // and right edges. Every width: a chip is a chip on a phone too. Raw numbers here; the judgement is summarise's.
  layout.edgeTexts = [];
  const EDGE_TEXT_MAX_GAP = 3;
  if (typeof document.createRange === 'function' && typeof document.createTreeWalker === 'function') {
    const shown = new Set(visible);
    const range = document.createRange();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const framed = (el) => {
      const cs = styleOf(el);
      if (cs.display === 'inline') return false;
      const bg = cs.backgroundColor;
      return (bg && bg !== 'transparent' && !/rgba\\([^)]*,\\s*0\\)$/.test(bg)) || cs.backgroundImage !== 'none' ||
        parseFloat(cs.borderLeftWidth) > 0 || parseFloat(cs.borderRightWidth) > 0;
    };
    const frames = new Set();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent.trim();
      if (!text || !shown.has(n.parentElement)) continue;
      let frame = null;
      for (let e = n.parentElement, i = 0; e && e !== document.body && i < 4; e = e.parentElement, i++) {
        if (framed(e)) { frame = e; break; }
      }
      if (!frame || frames.has(frame)) continue;
      const fr = frame.getBoundingClientRect();
      if (fr.width < 16 || fr.width >= vw * 0.98) continue;
      range.selectNodeContents(n);
      const r = range.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) continue;
      const fcs = styleOf(frame);
      const left = r.left - (fr.left + (parseFloat(fcs.borderLeftWidth) || 0));
      const right = fr.right - (parseFloat(fcs.borderRightWidth) || 0) - r.right;
      frames.add(frame);
      if (Math.min(left, right) < EDGE_TEXT_MAX_GAP) layout.edgeTexts.push({ cls: cls(frame), text: text.slice(0, 50), left: round(left), right: round(right), frameWidth: round(fr.width), frameHeight: round(fr.height) });
    }
  }

  // P112-OWN019-LOOKBLIND / OWN-026 — text a person cannot read against what is painted behind it. Large 4's number pad
  // set white digits on a #FAF5FF button (1.07:1) and it survived five changes: the model tapped the keys, read
  // "Correct!" and never saw that nobody could read them, because nothing here measured contrast. The ground is the
  // text's ancestors' background colours composited from the first opaque one (white under them all, as a browser
  // paints), the ink is the text's colour faded by every ancestor's opacity, and the ratio is WCAG's. It abstains,
  // counted, wherever ancestors are not what is painted underneath: a background image or gradient, a text shadow, an
  // SVG text. A disabled or aria-hidden control is exempt (WCAG 1.4.3's inactive components). Known limit: a sibling
  // laid over the text by position is not an ancestor, so it is not seen. Raw pairs here; the judgement is summarise's.
  layout.lowContrast = [];
  layout.contrastChecked = 0;
  layout.contrastAbstained = 0;
  const CONTRAST_FLOOR = 3;
  {
    const parseColor = (c) => {
      const m = String(c || '').match(/rgba?\\(([^)]+)\\)/);
      if (!m) return null;
      const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number);
      if (p.length < 3 || p.some((x) => isNaN(x))) return null;
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
    const lum = (c) => {
      const f = (x) => { const v = x / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const contrastOf = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const hexOf = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    const inactive = (e) => e.disabled === true || (typeof e.getAttribute === 'function' && (e.getAttribute('aria-disabled') === 'true' || e.getAttribute('aria-hidden') === 'true'));
    // What is behind the text, or null to abstain; 'exempt' for an inactive control.
    const groundOf = (el) => {
      const stack = [];
      let opacity = 1;
      for (let e = el; e; e = e.parentElement) {
        if (inactive(e)) return 'exempt';
        const cs = styleOf(e);
        if (!cs) break;
        const image = cs.backgroundImage;
        if (image && image !== 'none' && !/^url\\("data:image\\/svg/.test(image)) return null;
        const bg = parseColor(cs.backgroundColor);
        const o = Number(cs.opacity);
        if (o >= 0 && o <= 1) opacity *= o;
        if (bg && bg.a > 0) {
          stack.push(bg);
          if (bg.a >= 0.999) break;
        }
      }
      let g = { r: 255, g: 255, b: 255, a: 1 };
      while (stack.length) g = over(stack.pop(), g);
      return { ground: g, opacity };
    };
    const pairs = new Map();
    for (const el of textEls) {
      if (el.namespaceURI && el.namespaceURI !== 'http://www.w3.org/1999/xhtml') { layout.contrastAbstained += 1; continue; }
      const cs = styleOf(el);
      const fill = parseColor(cs.webkitTextFillColor);
      const fg = fill || parseColor(cs.color);
      if (!fg || fg.a === 0) continue;
      if (cs.textShadow && cs.textShadow !== 'none') { layout.contrastAbstained += 1; continue; }
      const at = groundOf(el);
      if (at === 'exempt') continue;
      if (at === null) { layout.contrastAbstained += 1; continue; }
      if (at.opacity < 0.05) continue;
      const ink = over({ r: fg.r, g: fg.g, b: fg.b, a: fg.a * at.opacity }, at.ground);
      const ratio = Math.round(contrastOf(ink, at.ground) * 100) / 100;
      layout.contrastChecked += 1;
      if (ratio >= CONTRAST_FLOOR) continue;
      const key = hexOf(ink) + '|' + hexOf(at.ground);
      const seen = pairs.get(key);
      if (seen) seen.count += 1;
      else pairs.set(key, { text: el.textContent.trim().slice(0, 40), fg: hexOf(ink), bg: hexOf(at.ground), ratio, size: round(parseFloat(cs.fontSize) || 0), weight: String(cs.fontWeight || ''), cls: cls(el), count: 1 });
    }
    layout.lowContrast = [...pairs.values()].sort((a, b) => a.ratio - b.ratio).slice(0, 10);
  }

  const contentBottom = visible.reduce((lowest, el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > lowest ? r.bottom : lowest;
  }, 0);

  return {
    lists,
    layout,
    // FLD-012 AC3 — the SIZE of the population every rule below is computed over, and the number of
    // elements the visibility correction took out of it. Reported directly because a rule's finding
    // count can move for several reasons at once, and 'the fix changed what is measured' is a
    // different claim from 'the fix changed what is reported'.
    visibleCount: visible.length,
    transparentExcluded,
    layoutWidth: window.innerWidth,
    clientWidth: vw,
    clientHeight: vh,
    scrollWidth: document.documentElement.scrollWidth,
    pageHeight: document.documentElement.scrollHeight,
    contentBottom: round(contentBottom),
    overflowing: overflowing.slice(0, 10),
    overflowingCount: overflowing.length,
    textsWiderThanBox: textsWiderThanBox.slice(0, 10),
    textsWiderThanBoxCount: textsWiderThanBox.length,
    controls: { textScale, items: controls.slice(0, 60), count: controls.length },
    text: {
      elements: textEls.length,
      onScreen: textEls.filter(onScreen).length,
      unreachable: textEls.filter(unreachable).length,
      fontWeights,
      fontSizes,
      distinctFontSizes: Object.keys(fontSizes).length,
      // VIB-007 M3 — the display-type reading. Derived here rather than in
      // summarise so a client that only keeps the summary still has it.
      largestFontSize: Object.keys(fontSizes).reduce((max, px) => Math.max(max, parseFloat(px) || 0), 0),
      bodyFontFamily: getComputedStyle(document.body).fontFamily.slice(0, 80)
    },
    placeholders: {
      count: dead.length,
      byText,
      samples: dead.slice(0, 8).map((el) => ({ text: el.textContent.trim(), tag: el.tagName, cls: cls(el) }))
    },
    images: {
      total: images.length,
      // VIB-007 M3. Deliberately inside the images block rather than beside it: every
      // consumer that asks "does this page have any pictures" has to ask both
      // halves, and two sibling fields is how one of them gets forgotten.
      icons: iconEls.size,
      onScreen: images.filter(onScreen).length,
      unreachable: images.filter(unreachable).length,
      broken: brokenImages.length,
      brokenSources: brokenImages.slice(0, 8).map((el) => String(el.currentSrc || el.src).slice(0, 160))
    },
    emptyDecoratedBoxes: {
      count: emptyBoxes.length,
      samples: emptyBoxes.slice(0, 6).map((el) => {
        const r = el.getBoundingClientRect();
        return { tag: el.tagName, cls: cls(el), width: round(r.width), height: round(r.height) };
      })
    },
    colors: {
      distinctAccents: accents.length,
      accents: accents.slice(0, 6),
      distinctNeutrals: Object.keys(neutralArea).length,
      // The denominator behind every "share", emitted so a score can be
      // recomputed from the report without knowing which viewport produced it.
      viewportArea: round(viewportArea)
    },
    grounds: {
      distinct: Object.keys(groundCounts).length,
      values: Object.keys(groundCounts)
        .map((ground) => ({ ground, count: groundCounts[ground] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
    },
    rhythm: {
      bands: bands.length,
      distinctSpacings: spacingValues.length,
      spacings: spacingValues.slice(0, 12).map((px) => ({ px, count: spacingCounts[px] }))
    },
    repeatedGroups: groups.sort((a, b) => b.itemWidth * b.count - a.itemWidth * a.count).slice(0, 12)
  };
})()`;
}

// ── Findings: what the numbers mean ─────────────────────────────────────────

/**
 * Render-finding codes.
 *
 * Deliberately **not** `DiagnosticCode` values. Those name what is wrong with a
 * graph; these name what is wrong with a picture, and several have no graph
 * counterpart at all (an image that 404s, a page that will not reflow). Where
 * the two do describe one defect from opposite sides, the finding carries
 * `relatedDiagnostic` so LAS-007's example table can key on the same string
 * rather than on a second vocabulary.
 */
const RenderFinding = {
  BlankRender: 'blank-render',
  /**
   * LAS-012 §3 — a list whose rows the graph spells out, and the page does not
   * contain a single one of them. The one shape this report was structurally
   * unable to see: every other finding is about content present and wrong, and
   * a repeater that instantiates nothing emits no elements to judge.
   */
  EmptyList: 'empty-list',
  DeadPlaceholderText: 'dead-placeholder-text',
  BrokenImage: 'broken-image',
  /**
   * AWP-004 §2 — content on the page that no scroll can reach.
   *
   * The direct check for F45, and the one that generalises the other two: Kimi
   * K3's storefront put 83 texts and 10 images in the DOM and stranded 70 and 9
   * of them below a page that does not scroll, and the report called it
   * *"Rendered clean: 83 texts, 10 images"*.
   */
  ContentNotVisible: 'content-not-visible',
  /** The mechanism behind it: a page pinned to the viewport with content past the fold. */
  ClippedPage: 'clipped-page',
  /** Elements wider than the viewport inside a page that does not itself scroll sideways. */
  ElementsOverflowing: 'elements-overflowing',
  /**
   * P88 GAM-020 (D58) — a Text wider than its parent's content box, so it is cut off or spills. The
   * text is named. Rocket School's French sentences did this with zero console errors, and every
   * page-level finding stayed quiet because the page itself kept its width.
   */
  TextWiderThanItsBox: 'text-wider-than-its-box',
  /**
   * P112-OWN020-OFFSYSTEM — a control drawn at the runtime's own size beside a page on its token scale: a radio or
   * checkbox box much bigger than its label, or control text off the project's --text-* scale (a native select or
   * button keeps the browser's 13.33px). Mistral (SP1) and DeepSeek (OpenTune) both shipped one — the "chunky"
   * Sort-by circles — because a control placed in passing is the one an agent never styles.
   */
  ControlOffScale: 'control-off-scale',
  SingleColumnGrid: 'single-column-grid',
  MinimumLayoutWidth: 'minimum-layout-width',
  HorizontalOverflow: 'horizontal-overflow',
  FlatTypeScale: 'flat-type-scale',
  EmptyDecoratedBox: 'empty-decorated-box',
  ConsoleError: 'console-error',
  /**
   * VIB-007 M3 — the three poverty findings.
   *
   * 🔴 **Every other finding in this list detects EXCESS or BREAKAGE**, which is
   * register V10: a page can pass all thirteen of them, render perfectly clean,
   * and be worth nothing to look at. That is what the entire VIB-001 baseline
   * is — nine pages ruled SHITTY, and the report called every one of them
   * clean.
   *
   * These three are not invented. Each is one of the WordPress-starter tells
   * README section 2 lists verbatim, restricted to the ones a render can see:
   *
   *   "one background colour end to end"          -> SingleGround
   *   "no imagery and no iconography anywhere"    -> NoImagery
   *   "headline under ~48px on desktop"           -> NoDisplayType
   *
   * ⚠️ **They are warnings, not errors, and that is a decision rather than an
   * oversight.** `error` is the severity `noodl-mcp`'s render verdict blocks
   * "done" on (VIB-007 M1), and README section 2 exempts app-chrome pages (forms,
   * lists, settings) from the marketing tells — a settings page needs no 72px
   * headline and refusing to certify one would be the instrument being wrong,
   * loudly, on every honest project. The instrument cannot currently tell a
   * landing page from a settings page; until something can, poverty is reported
   * and does not refuse.
   */
  SingleGround: 'single-ground',
  NoImagery: 'no-imagery',
  NoDisplayType: 'no-display-type',
  /**
   * P112-OWN019-LAPTOPGAPS (R39, Richard 2026-10-14). On a laptop, two things side by side in one row with a hole
   * between their ink — RL1's feature number given a fifth of the page by a Columns "1 4" row, L1's text and card
   * pushed to the row's two edges. A warning: a hole can be meant, and the screenshots are the arbiter.
   */
  RowGap: 'row-gap',
  /** P112-OWN019-LAPTOPGAPS — a section that centres its heading and leaves another part off that centre (L1's price). */
  AlignmentDrift: 'alignment-drift',
  /**
   * P112-OWN019-LETTEREDGE (Richard 2026-10-15, TL2's hero). Words within 3 px of the inner left or right edge of the
   * box that frames them (a border or a fill) — a letter in an outlined chip set left because its Text stretched.
   */
  TextAgainstEdge: 'text-against-edge',
  /**
   * P112-OWN019-LOOKBLIND (OWN-026's number pad: white digits on #FAF5FF, 1.07:1, through five changes). Text under 3:1
   * against the background composited behind it — unreadable to anyone, and invisible to an agent that only reads text.
   */
  LowContrastText: 'low-contrast-text'
};

const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 };

/** P112-OWN019-LAPTOPGAPS — a row gap is reported when its taller side is more than one line … */
const ROW_GAP_MIN_TALLEST = 48;
/** … and the hole is at least this share of the row (the in-page floor is 160 px). RL1's number row: 215 / 1150. */
const ROW_GAP_MIN_SHARE = 0.12;

/**
 * VIB-007 M3 — **the poverty family, as one list, exported.**
 *
 * A client has to be able to ask "did this page measure as a default template?"
 * without knowing which three codes that means today. Two consumers already
 * need it — the render verdict, which must not let a `done: true` say *clean*
 * about a page with nothing on it, and any report that wants to group these
 * apart from the twelve defect detectors.
 *
 * 🔴 Written once because the alternative is the BCN-003 shape this repo has
 * paid for: a second copy of a code list is right the day it is written and
 * silently wrong the first time a fourth poverty finding ships.
 */
const POVERTY_FINDINGS = [RenderFinding.SingleGround, RenderFinding.NoImagery, RenderFinding.NoDisplayType];

/** Is this finding about the page being poor rather than broken? */
function isPovertyFinding(finding) {
  return Boolean(finding) && POVERTY_FINDINGS.indexOf(finding.code) !== -1;
}

/**
 * VIB-007 M3 — the display-type threshold, **quoted from README section 2**:
 * *"Type ramp reading as two sizes; headline under ~48px on desktop"*.
 *
 * 🔴 It is the rubric's number, not one fitted to the two artefacts AC3 names,
 * and the seven measurement fixtures in `noodl-mcp/tests/fixtures/render` are
 * the check on that. Every real build recorded there tops out at **exactly 48
 * or 60px** — haiku, sonnet, kimi and the ecommerce reference, four independent
 * authors — while the two shipped templates the VIB-001 baseline ruled SHITTY
 * top out at **30px**. The threshold falls in a gap the corpus put there.
 *
 * ⚠️ **Desktop only, because that is the only width the rubric gives a number
 * for.** A phone threshold would be invented, and an invented number in a
 * finding that fires on real projects is how a gate teaches a lie. What this
 * cannot see is therefore stated rather than guessed: a page whose desktop
 * headline is fine and whose phone headline collapses is not this finding's.
 */
const DISPLAY_TYPE_MIN_PX = 48;

/**
 * How many distinct full-bleed grounds a page needs before it stops reading as
 * *"one background colour end to end"* (README section 2's first tell).
 *
 * One is the tell exactly. Two is a page with a header or a footer that differs
 * from its body, which is the least a designed page does, so the predicate is
 * `<= 1` rather than a taste threshold: measured, the VIB-001 baseline's two
 * one-ground pages read 1 and the VIB-006 page reads far more.
 */
const MIN_DISTINCT_GROUNDS = 2;

/**
 * A page with fewer visible texts than this is not a page whose *poverty* is
 * the finding — `blank-render` and the placeholder checks own that territory,
 * and a poverty finding on top of them is a second sentence about one defect.
 *
 * ⚠️ Deliberately low. The existing `flat-type-scale` uses 10 and consequently
 * fires on **none** of the nine SHITTY baseline pages (they carry 3 to 10
 * texts) — the concrete case behind VIB-007 section 3's *"the machinery already
 * exists and is set too quiet"*.
 */
const POVERTY_MIN_TEXTS = 3;

/**
 * AWP-004 — how far past its own scrollable extent a page may lay content out
 * before that content is stranded rather than rounded.
 *
 * Measured 2026-08-09: the two builds this phase calls correct put `contentBottom`
 * **exactly** on `pageHeight` (sonnet 3777/3777 and 6482/6482, ecommerce
 * 2373/2373 and 3080/3080), and Kimi's clipped build put it 4,392px past. There is
 * no middle ground in the corpus, so the slack only has to absorb sub-pixel
 * rounding.
 */
const CLIPPED_CONTENT_SLACK = 8;

function plural(n, one, many) {
  return n === 1 ? `1 ${one}` : `${n} ${many}`;
}

/**
 * AWP-003's wider rule, applied to the overflow findings: **name what was
 * measured, not what might be wrong.**
 *
 * Grepping the finding set for messages that enumerate possible causes rather
 * than reporting a determined one — which AWP-003 asks for explicitly, on the
 * grounds that `blank-render` was unlikely to be the only one — turned up
 * `minimum-layout-width` ending on *"Something inside carries a fixed width or a
 * non-collapsing row"*. Both halves of that guess were already answered by
 * `overflowing`, which the finding was attaching as evidence and not reading.
 *
 * Returns the widest offending element as a phrase, or `null` when nothing was
 * captured — in which case the finding says less rather than guessing.
 */
function widestOffender(v) {
  const widest = (v.overflowing || []).slice().sort((a, b) => b.width - a.width)[0];
  if (!widest) return null;
  const named = widest.cls ? `${widest.tag.toLowerCase()}.${widest.cls.split(/\s+/)[0]}` : widest.tag.toLowerCase();
  return `${named} at ${widest.width}px`;
}

/**
 * Turn the raw per-viewport measurements into findings and a one-line summary.
 *
 * Pure: measurements in, report out. Every threshold is a named constant and
 * every finding says what was measured, because a finding an agent cannot act on
 * is a finding it will ignore — the audit's central result was that rejections
 * carrying a concrete fix were self-corrected 100% of the time and prose was
 * dropped.
 */
/**
 * P112-OWN020-OFFSYSTEM — which control kinds are off the page's scale. A radio or checkbox is oversized when its box
 * is more than 1.5x its label's text (or 20px with no label); any control's text is off-scale when the project has a
 * --text-* scale and the size is none of its steps. One entry per kind, with the commonest offending reading.
 */
function controlsOffScale(controls) {
  const scale = controls.textScale || [];
  const onScale = (px) => scale.length === 0 || !(px > 0) || scale.some((s) => Math.abs(s - px) < 0.6);
  const byKind = {};
  for (const c of controls.items || []) {
    const oversized = (c.kind === 'Radio Button' || c.kind === 'Checkbox') && c.box > Math.max(20, 1.5 * (c.textSize > 0 ? c.textSize : 0));
    const offText = !onScale(c.textSize);
    if (!oversized && !offText) continue;
    const k = byKind[c.kind] || (byKind[c.kind] = { kind: c.kind, count: 0, box: c.box, textSize: c.textSize, oversized, offText });
    k.count += 1;
  }
  const fmt = (n) => String(Math.round(n * 100) / 100);
  return Object.keys(byKind).map((kind) => {
    const k = byKind[kind];
    const parts = [];
    if (k.oversized) parts.push(fmt(k.box) + 'px box' + (k.textSize > 0 ? ' beside a ' + fmt(k.textSize) + 'px label' : ''));
    if (k.offText) parts.push(fmt(k.textSize) + 'px text, off the type scale (' + scale.map(fmt).join('/') + 'px)');
    return { kind, count: k.count, box: k.box, textSize: k.textSize, sentence: kind + ' x' + k.count + ': ' + parts.join(', ') };
  });
}

function summarise(viewports, diagnosis, overridden = {}) {
  const findings = [];
  const add = (f) => findings.push(f);
  // P112-OWN020-OFFSYSTEM — one finding for the app, not one per width: an element style is the same at every width.
  let controlsJudged = false;
  // P112-OWN019-LOOKBLIND — one finding for the report, not one per width: a colour pair is the same at every width.
  const contrastPairs = new Map();

  for (const [name, v] of Object.entries(viewports)) {
    if (!v || v.error) continue;
    const isDesktop = v.requested.width >= DESKTOP_WIDTH;

    if (v.text.elements === 0 && v.images.total === 0) {
      // AWP-003 — what was determined, never a list of what might be wrong. The
      // walk has the project; without one there is nothing to say beyond the
      // measurement, and saying less is the point of the task.
      add({
        code: RenderFinding.BlankRender,
        severity: 'error',
        viewport: name,
        message:
          'The page rendered nothing at all — no text and no images. ' +
          (diagnosis
            ? diagnosis.message
            : 'No project was available to diagnose it against, so the cause was not determined.'),
        ...(diagnosis && diagnosis.cause ? { cause: diagnosis.cause } : {}),
        ...(diagnosis && diagnosis.evidence ? { evidence: diagnosis.evidence } : {})
      });
      continue;
    }

    for (const list of v.lists || []) {
      if (list.found > 0) continue;
      add({
        code: RenderFinding.EmptyList,
        severity: 'error',
        viewport: name,
        relatedDiagnostic: 'repeater-without-template',
        message:
          `The Repeater "${list.label}" in ${list.component} has ${plural(list.rows, 'row', 'rows')} of ` +
          `${list.source}, and none of that content is on the page — so it built nothing. A For Each ` +
          'instantiates the component named on its "template" port once per item and inserts each copy as its ' +
          'own next sibling; with no template, or with the item markup nested underneath it instead, it ' +
          `renders nothing at all. Looked for: ${list.missing.map((s) => `"${s}"`).join(', ')}.`,
        evidence: { component: list.component, nodeId: list.nodeId, rows: list.rows, missing: list.missing }
      });
    }

    if (v.placeholders.count > 0) {
      // Two classes, two causes, two sentences. A node-type default on screen
      // means nobody set the port; a component's own hardcoded fallback on screen
      // means an input that *was* wired never arrived. Telling an agent the wrong
      // one aims it at the wrong subsystem, which is AWP-003's lesson applied to
      // the finding next door.
      const entries = Object.entries(v.placeholders.byText);
      const listing = (pairs) => pairs.map(([text, n]) => `${n}× "${text}"`).join(', ');
      const total = (pairs) => pairs.reduce((sum, [, n]) => sum + n, 0);
      const fromInput = entries.filter(([text]) => overridden[text]);
      const fromCatalog = entries.filter(([text]) => !overridden[text]);

      // AWP-004 §3 — the fallback a wired port shows when its input never came.
      if (fromInput.length) {
        const where = fromInput.map(([text]) => `"${text}" is ${describeSites(overridden[text])}`).join('; ');
        add({
          code: RenderFinding.DeadPlaceholderText,
          severity: 'error',
          viewport: name,
          relatedDiagnostic: 'interfaceless-instance',
          message:
            `${plural(total(fromInput), 'element shows', 'elements show')} the fallback hardcoded on a port ` +
            `that a Component Inputs node also feeds: ${listing(fromInput)}. That value is only ever visible ` +
            `when the input does not arrive, so it did not arrive — ${where}.`,
          evidence: v.placeholders.samples.filter((s) => overridden[s.text])
        });
      }

      if (fromCatalog.length) {
        add({
          code: RenderFinding.DeadPlaceholderText,
          severity: 'error',
          viewport: name,
          relatedDiagnostic: 'interfaceless-instance',
          message:
            `${plural(total(fromCatalog), 'element renders', 'elements render')} a node-type default instead ` +
            `of content: ${listing(fromCatalog)}. Nothing set those ports. The usual cause is a component ` +
            'instantiated with parameters its Component Inputs node does not declare, so every value is ' +
            'discarded — the graph-side name for it is interfaceless-instance.',
          evidence: v.placeholders.samples.filter((s) => !overridden[s.text])
        });
      }
    }

    if (v.images.broken > 0) {
      add({
        code: RenderFinding.BrokenImage,
        severity: 'error',
        viewport: name,
        message:
          `${plural(v.images.broken, 'image', 'images')} of ${v.images.total} failed to load — the element is ` +
          'in the DOM with naturalWidth 0. A URL that returns 200 can still be the wrong picture; this is only ' +
          'the half a number can see, so look at the screenshot for the rest.',
        evidence: v.images.brokenSources
      });
    }

    // ── AWP-004 §2 — is what is in the DOM also on screen? ──────────────────
    //
    // Only where it was measured. A recording made before these fields existed
    // cannot answer the question, and LAS-012 established abstention as the
    // honest third state rather than assuming the flattering answer.
    const measuredVisibility = typeof v.contentBottom === 'number' && typeof v.text.unreachable === 'number';

    if (measuredVisibility) {
      const strandedText = v.text.unreachable;
      const strandedImages = v.images.unreachable || 0;

      // The direct check. Deliberately NOT "counted text vastly exceeds visible
      // text" as AWP-004 §2 first proposed: measured on the corpus, a correct
      // 82-text page shows 19 of them at 1280×900 and 11 at 390×844 against
      // Kimi's 13 and 9, so a ratio cannot separate a clipped page from a long
      // one. Content below the page's own scrollable extent can — 70 on Kimi,
      // 0 on both builds this phase calls correct.
      if (strandedText > 0 || strandedImages > 0) {
        const parts = [];
        if (strandedText > 0) parts.push(`${strandedText} of ${v.text.elements} text elements`);
        if (strandedImages > 0) parts.push(`${strandedImages} of ${v.images.total} images`);
        add({
          code: RenderFinding.ContentNotVisible,
          severity: 'error',
          viewport: name,
          message:
            `${parts.join(' and ')} are laid out below ${v.pageHeight}px, which is as far as this page ` +
            `scrolls — no scroll reaches them, so they are on the page and cannot be seen. Content ` +
            `extends to ${v.contentBottom}px. ${v.text.onScreen} of ${v.text.elements} texts are on screen.`,
          evidence: {
            pageHeight: v.pageHeight,
            contentBottom: v.contentBottom,
            textElements: v.text.elements,
            textOnScreen: v.text.onScreen,
            textUnreachable: strandedText,
            imagesUnreachable: strandedImages
          }
        });
      }

      // The mechanism, when the page height is pinned to the viewport it was
      // asked for. The MCP server's own instructions already warn that the
      // default clips every page with no scrollbar and tell planners to pass
      // `scroll`; this is what makes that warning checkable.
      const pinned = Math.abs(v.pageHeight - v.requested.height) <= 1;
      if (pinned && v.contentBottom > v.pageHeight + CLIPPED_CONTENT_SLACK) {
        add({
          code: RenderFinding.ClippedPage,
          severity: 'warning',
          viewport: name,
          message:
            `The page is exactly ${v.pageHeight}px tall — the viewport height — and its content runs to ` +
            `${v.contentBottom}px, so it is clipped at the fold rather than scrolling. A root that clips to ` +
            'the viewport with no scrollbar is the default; a page of this length has to opt into scrolling.',
          evidence: { pageHeight: v.pageHeight, contentBottom: v.contentBottom, viewport: v.requested.height }
        });
      }
    }

    if (isDesktop) {
      for (const g of v.repeatedGroups) {
        if (g.count < 3 || g.columns !== 1) continue;
        if (g.itemWidth < g.parentWidth * GRID_ITEM_PARENT_SHARE) continue;
        if (g.kind !== 'columns') {
          if (g.itemHeight < GRID_ITEM_MIN_HEIGHT || g.itemWidth < GRID_ITEM_MIN_WIDTH) continue;
          if (g.parentWidth < v.requested.width * GRID_PARENT_VIEWPORT_SHARE) continue;
        }
        add({
          code: RenderFinding.SingleColumnGrid,
          severity: g.kind === 'columns' ? 'warning' : 'info',
          viewport: name,
          message:
            `${g.count} repeated items are stacked in one column at ${v.requested.width}px, each ` +
            `${g.itemWidth}×${g.itemHeight}px inside a ${g.parentWidth}px parent` +
            (g.kind === 'columns'
              ? '. They are a Columns node\u2019s items, so the layoutString asked for one column — "1 1 1" is ' +
                'three equal columns, and the count of numbers is the count of columns.'
              : '. If they are meant to be a grid, a Columns node is the only node that lays items out in one ' +
                'and collapses it on small screens; if they are meant to be full-width bands, this is right.'),
          evidence: g
        });
      }
    }

    if (v.layoutWidth > v.requested.width + 1) {
      add({
        code: RenderFinding.MinimumLayoutWidth,
        severity: 'warning',
        viewport: name,
        message:
          `The page cannot lay out below ${v.layoutWidth}px: asked for ${v.requested.width}px, the browser ` +
          `widened the layout viewport to ${v.layoutWidth}px and scaled the whole page down.` +
          (widestOffender(v)
            ? ` The widest element inside it is ${widestOffender(v)}.`
            : ' Nothing wider than the viewport was captured, so the element holding the floor was not identified.'),
        evidence: v.overflowing
      });
    } else if (v.scrollWidth > v.clientWidth + 1) {
      add({
        code: RenderFinding.HorizontalOverflow,
        severity: 'warning',
        viewport: name,
        message:
          `The page scrolls sideways at ${v.requested.width}px — content is ${v.scrollWidth}px wide in a ` +
          `${v.clientWidth}px viewport, with ${plural(v.overflowingCount, 'element', 'elements')} wider than it.`,
        evidence: v.overflowing
      });
    } else if (v.overflowingCount > 0) {
      // AWP-004 §2. `overflowingCount` has been computed since LAS-005 and had no
      // rule attached to it — register note A7, and the reason that note says to
      // check what is already measured before measuring anything new. The two
      // page-level checks above both passed on Kimi's phone render (the document
      // itself does not scroll sideways) while 43 elements overflowed inside it.
      add({
        code: RenderFinding.ElementsOverflowing,
        severity: 'warning',
        viewport: name,
        message:
          `${plural(v.overflowingCount, 'element is', 'elements are')} wider than the ${v.clientWidth}px ` +
          'viewport, while the page itself does not scroll sideways — so each is clipped by an ancestor ' +
          `rather than reachable${widestOffender(v) ? `; the widest is ${widestOffender(v)}` : ''}.`,
        evidence: v.overflowing
      });
    }

    if (v.textsWiderThanBoxCount > 0) {
      const first = v.textsWiderThanBox[0];
      add({
        code: RenderFinding.TextWiderThanItsBox,
        severity: 'warning',
        viewport: name,
        message:
          `${plural(v.textsWiderThanBoxCount, 'text is', 'texts are')} wider than the box ${
            v.textsWiderThanBoxCount === 1 ? 'it sits' : 'they sit'
          } in at ${v.requested.width}px, so the line is cut off or spills: "${first.text}" is ${first.width}px ` +
          `in a ${first.parentWidth}px box. A Text sized to its content (sizeMode "contentSize" or "contentWidth") ` +
          'never wraps; "contentHeight" takes its width from the parent and wraps.',
        evidence: v.textsWiderThanBox
      });
    }

    if (!controlsJudged && v.controls && v.controls.count > 0) {
      controlsJudged = true;
      const off = controlsOffScale(v.controls);
      if (off.length > 0) {
        add({
          code: RenderFinding.ControlOffScale,
          severity: 'warning',
          viewport: name,
          message:
            'Controls drawn at a size the rest of the page is not: ' +
            off.map((o) => o.sentence).join('; ') +
            '. A control nobody styled keeps the runtime\'s own look. Give the type one look for the whole app with ' +
            'set_element_style (find_tools group "theme"), or set_style_preset to add on-system styles for every ' +
            'control; a node that sets the parameter itself keeps its own value.',
          evidence: off.map((o) => ({ kind: o.kind, count: o.count, box: o.box, textSize: o.textSize, textScale: v.controls.textScale }))
        });
      }
    }

    if (v.text.elements >= 10) {
      const weights = Object.keys(v.text.fontWeights);
      if (weights.length <= 1 || v.text.distinctFontSizes <= 2) {
        add({
          code: RenderFinding.FlatTypeScale,
          severity: 'warning',
          viewport: name,
          message:
            `${v.text.elements} text elements render at ${plural(weights.length, 'font weight', 'font weights')} ` +
            `(${weights.join(', ')}) and ${plural(v.text.distinctFontSizes, 'font size', 'font sizes')}. ` +
            'Nothing is emphasised over anything else, which is what an unstyled page measures like.'
        });
      }
    }

    if (v.emptyDecoratedBoxes.count > 0) {
      add({
        code: RenderFinding.EmptyDecoratedBox,
        severity: 'warning',
        viewport: name,
        message:
          `${plural(v.emptyDecoratedBoxes.count, 'box has', 'boxes have')} a background or border and no ` +
          'content — a card whose contents never arrived, or a decorated Group used as a spacer.',
        evidence: v.emptyDecoratedBoxes.samples
      });
    }

    // ── VIB-007 M3 — poverty: the page is whole, and it is a default template ──
    //
    // 🔴 Everything above this line detects excess or breakage. These three ask
    // the opposite question, and a page can answer badly while passing every
    // one of them — which is what all nine VIB-001 baseline pages did.
    //
    // 🔴 **A field this measurement does not carry is UNKNOWN, never zero.**
    // The seven recorded fixtures predate `grounds` and `images.icons`, and a
    // predicate reading `undefined` as "none" would report *"no imagery"* about
    // four builds that ship sixteen photographs. An absence is only assertable
    // beside a signal known to fire, and here the signal is the field existing.
    const poorEnoughToJudge = v.text.elements >= POVERTY_MIN_TEXTS;

    if (poorEnoughToJudge && v.images && typeof v.images.icons === 'number' && v.images.total === 0 && v.images.icons === 0) {
      add({
        code: RenderFinding.NoImagery,
        severity: 'warning',
        viewport: name,
        message:
          `${v.text.elements} text elements and not one picture or glyph — no images, no icons. ` +
          'README §2\'s second WordPress-starter tell is "no imagery and no iconography anywhere on ' +
          'the page", and this page measures as exactly that. The Image and Icon nodes are in the kit ' +
          'and the starter modules ship photographs and 1,998 Lucide glyphs.'
      });
    }

    if (poorEnoughToJudge && isDesktop && typeof v.text.largestFontSize === 'number' && v.text.largestFontSize > 0 && v.text.largestFontSize < DISPLAY_TYPE_MIN_PX) {
      add({
        code: RenderFinding.NoDisplayType,
        severity: 'warning',
        viewport: name,
        message:
          `The largest text on this page renders at ${Math.round(v.text.largestFontSize)}px across ` +
          `${plural(v.text.distinctFontSizes, 'distinct size', 'distinct sizes')}. README §2 calls a headline ` +
          `under ~${DISPLAY_TYPE_MIN_PX}px on desktop a WordPress-starter tell; nothing on this page is ` +
          'operating as display type.',
        evidence: v.text.fontSizes
      });
    }

    if (poorEnoughToJudge && v.grounds && typeof v.grounds.distinct === 'number' && v.grounds.distinct < MIN_DISTINCT_GROUNDS) {
      add({
        code: RenderFinding.SingleGround,
        severity: 'warning',
        viewport: name,
        message:
          `Every full-width band on this page is painted the same — ${plural(v.grounds.distinct, 'distinct ground', 'distinct grounds')} ` +
          'across the whole page. README §2\'s first WordPress-starter tell is "one background colour end to ' +
          'end". A ground can be a colour, a gradient or an image, and alternating them is what makes a page ' +
          'read as sections rather than as one column.',
        evidence: v.grounds.values
      });
    }

    // P112-OWN019-LAPTOPGAPS. A row gap counts when one side is taller than a line (a nav bar, an FAQ question and its
    // "+", a footer are single lines pushed apart on purpose) and the hole is more than an eighth of the row.
    if (isDesktop && v.layout) {
      // …and words on at least one side: RL3's hero drawing (a log on the sand at left, a dot at the right edge) is a
      // picture, not a row with a hole in it (s5).
      const gaps = (v.layout.rowGaps || []).filter((g) => (g.left || g.right) && g.tallest >= ROW_GAP_MIN_TALLEST && g.gap >= g.rowWidth * ROW_GAP_MIN_SHARE);
      const seen = new Set();
      for (const g of gaps) {
        const key = `${g.left}|${g.right}`;
        if (seen.has(key) || seen.size >= 3) continue;
        seen.add(key);
        add({
          code: RenderFinding.RowGap,
          severity: 'warning',
          viewport: name,
          message:
            `"${g.left}" and "${g.right}" sit side by side with ${g.gap}px of empty space between them ` +
            `(${Math.round((g.gap / g.rowWidth) * 100)}% of the ${g.rowWidth}px row). A label or number beside text reads as one ` +
            'thing at its own width with a small gap — a row Group, the label at its natural width and the text growing — ' +
            'not a column given a share of the page (Columns widths are proportions); two parts pushed to a wide ' +
            "row's edges leave the same hole: give the row a max width and a gap. Look at this width's screenshot.",
          evidence: g
        });
      }
      const drifts = (v.layout.drifts || []).slice(0, 3);
      for (const d of drifts) {
        add({
          code: RenderFinding.AlignmentDrift,
          severity: 'warning',
          viewport: name,
          message:
            `This section centres "${d.centredText}", but "${d.text}" sits ${Math.abs(d.offBy)}px ${d.offBy < 0 ? 'left' : 'right'} ` +
            'of that centre. One section, one alignment: centre the rest too, or align everything to the same left edge. ' +
            "Look at this width's screenshot.",
          evidence: d
        });
      }
    }

    // P112-OWN019-LETTEREDGE. Every width; one finding per viewport naming up to three frames, because TL2's seven chips
    // are one defect seven times.
    const edges = ((v.layout && v.layout.edgeTexts) || []);
    if (edges.length) {
      const named = edges.slice(0, 3).map((e) => `"${e.text}" ${Math.max(0, Math.min(e.left, e.right))}px from the ${e.left <= e.right ? 'left' : 'right'} edge of its ${e.frameWidth}×${e.frameHeight}px box`);
      add({
        code: RenderFinding.TextAgainstEdge,
        severity: 'warning',
        viewport: name,
        message:
          `${plural(edges.length, 'text sits', 'texts sit')} hard against the edge of the outlined or filled box that frames ${edges.length === 1 ? 'it' : 'them'}: ` +
          `${named.join('; ')}. Centring a Group does not centre a Text's letters — the Text stretches to the Group's width ` +
          'and sets them left — so give the Text textAlignX: center, or give the box padding. ' +
          "Look at this width's screenshot.",
        evidence: edges.slice(0, 6)
      });
    }

    for (const c of (v.layout && v.layout.lowContrast) || []) {
      const key = c.fg + '|' + c.bg;
      const prev = contrastPairs.get(key);
      if (!prev) contrastPairs.set(key, { ...c, viewport: name });
      else if (c.count > prev.count) prev.count = c.count;
    }

    if (v.consoleErrors && v.consoleErrors.length) {
      add({
        code: RenderFinding.ConsoleError,
        severity: 'warning',
        viewport: name,
        message: `The runtime logged ${plural(v.consoleErrors.length, 'error', 'errors')} while rendering.`,
        evidence: v.consoleErrors.slice(0, 5)
      });
    }
  }

  if (contrastPairs.size) {
    const worst = [...contrastPairs.values()].sort((a, b) => a.ratio - b.ratio);
    const named = worst.slice(0, 3).map((c) => `"${c.text}" ${c.fg} on ${c.bg}, ${c.ratio}:1${c.count > 1 ? ` (and ${c.count - 1} more like it)` : ''}`);
    add({
      code: RenderFinding.LowContrastText,
      severity: 'warning',
      viewport: worst[0].viewport,
      message:
        `${plural(worst.length, 'colour pair', 'colour pairs')} of text ${worst.length === 1 ? 'reads' : 'read'} under 3:1 against what is behind ` +
        `${worst.length === 1 ? 'it' : 'them'}, so a person cannot read ${worst.length === 1 ? 'it' : 'them'}: ${named.join('; ')}. ` +
        "Pressing it still works, so a drive will not notice: set the text's colour or its background from the style " +
        `vocabulary so they differ in lightness, not only in hue. Look at the ${worst[0].viewport} screenshot.`,
      evidence: worst.slice(0, 6)
    });
  }

  // One page can hold three paragraph blocks with identical geometry; three
  // identical sentences is a report an agent skims rather than reads.
  const seen = new Set();
  const unique = findings.filter((f) => {
    const key = `${f.code}|${f.viewport}|${f.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return { findings: unique, summary: summaryLine(viewports, unique) };
}

/**
 * One sentence an agent can act on without reading the JSON.
 *
 * ## AWP-004 \u00a74 \u2014 say what is on screen, not only what is in the DOM
 *
 * This line was *"Rendered clean: desktop 1280\u00d7900px, 83 texts, 10 images"* for a
 * page showing a dialog and nothing else. Every number in it was true and the
 * sentence was false, because "83 texts" is a fact about the DOM and the reader
 * takes it as a fact about the picture. `83 texts, 13 on screen` needs no finding
 * attached to tell a model something is wrong, which is why AWP-004 called this
 * the cheapest change here and probably the highest value.
 *
 * ## AWP-004 \u00a71 \u2014 "clean" is a claim, and it has to be earned
 *
 * *"Rendered clean"* used to mean "no check I own fired", which is how three
 * different broken pages across three sessions were certified. It now means the
 * report **affirmed** that something is on screen. Where visibility was not
 * measured at all \u2014 a recording made before those fields existed \u2014 it says so
 * instead of upgrading silence into a pass.
 */
function summaryLine(viewports, findings) {
  const count = (severity) => findings.filter((f) => f.severity === severity).length;
  const errors = count('error');
  const warnings = count('warning');
  const infos = count('info');
  const live = Object.entries(viewports).filter(([, v]) => v && !v.error);
  const shape = live
    .map(([name, v]) => {
      const counts =
        typeof v.text.onScreen === 'number'
          ? `${v.text.elements} texts, ${v.text.onScreen} on screen, ${v.images.total} images`
          : `${v.text.elements} texts, ${v.images.total} images`;
      return `${name} ${v.requested.width}\u00d7${v.pageHeight}px, ${counts}`;
    })
    .join('; ');
  if (!errors && !warnings) {
    const measured = live.filter(([, v]) => typeof v.text.onScreen === 'number');
    const observations = infos ? ` (${plural(infos, 'observation', 'observations')})` : '';
    if (measured.length !== live.length) {
      return `No findings${observations}, and visibility was not measured \u2014 not a claim the page is on screen: ${shape}.`;
    }
    if (measured.some(([, v]) => v.text.onScreen === 0 && v.images.onScreen === 0)) {
      return `No findings${observations}, but nothing is on screen at the top of the page: ${shape}.`;
    }
    return `Rendered clean${observations}: ${shape}.`;
  }
  const worst = [...new Set(findings.filter((f) => f.severity !== 'info').map((f) => f.code))].slice(0, 4).join(', ');
  return (
    `${plural(errors, 'error', 'errors')}, ${plural(warnings, 'warning', 'warnings')}` +
    `${infos ? `, ${plural(infos, 'observation', 'observations')}` : ''} (${worst}). ${shape}.`
  );
}

/** The sites of one overridden default, as a phrase a finding can end on. */
function describeSites(entry) {
  const sites = entry.sites || [];
  const named = sites.slice(0, 2).map((s) => `${s.port} in ${s.component}`);
  const rest = sites.length - named.length;
  return named.join(' and ') + (rest > 0 ? ` and ${plural(rest, 'other place', 'other places')}` : '');
}

/**
 * Port names whose value is what the user reads on the page.
 *
 * Moved here with {@link placeholderStringsFromCatalog} so the editor derives
 * the same set the CLI does. It sat in `render-report.js` beside a function
 * that reads the catalog off disk; the *rule* is pure, only the reading was not.
 */
const TEXT_BEARING_PORTS = /^(text|label|placeholder|title|caption|heading)$/i;

/**
 * The strings a visual node shows when nobody told it what to say, derived from
 * a catalog **object**.
 *
 * ⚠️ Split from `render-report.js`'s `placeholderStrings(catalogPath)`, which is
 * now just `JSON.parse(fs.readFileSync(...))` around this. The reason is F22 in
 * miniature: the editor already bundles `node-catalog.json` and has no `fs`, so
 * a derivation locked behind a file read would have forced it to hardcode the
 * list — and the harness's own header records what paraphrasing a generated
 * contract cost last time (two phases certifying a page the editor could not
 * render).
 */
function placeholderStringsFromCatalog(catalog) {
  const found = new Set();
  for (const node of (catalog && catalog.nodes) || []) {
    if (!node.isVisual) continue;
    for (const port of node.inputs || []) {
      if (!TEXT_BEARING_PORTS.test(port.name)) continue;
      if (typeof port.default === 'string' && port.default.trim()) found.add(port.default.trim());
    }
  }
  return [...found];
}


module.exports = {
  // Vocabulary — every client must agree on these.
  DEFAULT_VIEWPORTS,
  NAMED_VIEWPORTS,
  DESKTOP_WIDTH,
  RenderFinding,
  SEVERITY_ORDER,
  CLIPPED_CONTENT_SLACK,
  // VIB-007 M3 — exported because a spec that restates 48 is a second copy of
  // README §2's number, and the one that drifts is always the copy.
  DISPLAY_TYPE_MIN_PX,
  MIN_DISTINCT_GROUNDS,
  POVERTY_MIN_TEXTS,
  POVERTY_FINDINGS,
  isPovertyFinding,
  // The two halves of the loop: what to evaluate in the page, and what the
  // numbers that come back mean.
  measureExpression,
  summarise,
  summaryLine,
  // Helpers the callers share.
  plural,
  widestOffender,
  describeSites,
  // P112-OWN020-OFFSYSTEM — exported so its spec grades the judgement on readings, not only through a fake DOM.
  controlsOffScale,
  TEXT_BEARING_PORTS,
  placeholderStringsFromCatalog
};
