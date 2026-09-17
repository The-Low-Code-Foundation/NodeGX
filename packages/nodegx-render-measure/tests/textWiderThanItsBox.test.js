/**
 * P88 GAM-020 (P78 D58) — `text-wider-than-its-box`: a Text wider than its parent's content box.
 *
 * Rocket School's French sentences ran off their cards at 390×844 with zero console errors, and every
 * page-level finding stayed quiet. The trap this suite holds shut is RKT-001's: a `white-space: pre`
 * Text grows to its words, so comparing it with ITSELF (`scrollWidth > clientWidth`) cannot fail. That
 * clause read 60/60 green on the build Richard complained about. The reverted arm below is that clause.
 *
 * ## Why a fake DOM
 *
 * The same reason as `emptyDecoratedBox.test.js`: the expression reads DOM APIs only, so the predicate can
 * be graded by handing it the numbers a browser measured. The browser readings are in GAM-020 §8
 * (pixel-game's footer, 429px in a 358px box at 390×844, cut at both ends in the screenshot); this suite
 * is the half that runs on every PR.
 */
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'src', 'index.js');
const HEAD_SRC = fs.readFileSync(SOURCE, 'utf8');

const PARENT_CLAUSE = '    .filter((x) => x.box > 0 && x.width > x.box + 1)';
const SELF_CLAUSE = '    .filter((x) => x.el.scrollWidth > x.el.clientWidth + 1)';

function compile(src) {
  const module_ = { exports: {} };
  new Function('module', 'exports', `${src}\nreturn module.exports;`)(module_, module_.exports);
  return module_.exports;
}

function arm(name) {
  if (name === 'head') return compile(HEAD_SRC);
  const occurrences = HEAD_SRC.split(PARENT_CLAUSE).length - 1;
  if (occurrences !== 1) {
    throw new Error(`the reverted arm expected one parent clause in src/index.js, found ${occurrences}: it would grade nothing`);
  }
  return compile(HEAD_SRC.replace(PARENT_CLAUSE, SELF_CLAUSE));
}

function element(tag, opts = {}) {
  const style = {
    opacity: '1',
    visibility: 'visible',
    position: 'static',
    backgroundColor: 'rgba(0, 0, 0, 0)',
    borderStyle: 'none',
    fontWeight: '400',
    fontSize: '14px',
    fontFamily: 'Inter, sans-serif',
    display: 'block',
    paddingLeft: '0px',
    paddingRight: '0px',
    ...(opts.style || {})
  };
  const node = {
    tagName: tag.toUpperCase(),
    className: opts.cls || '',
    classList: { contains: (c) => String(opts.cls || '').split(/\s+/).indexOf(c) !== -1 },
    children: [],
    parentElement: null,
    __style: style,
    __text: opts.text || '',
    // What a browser reports. A `pre` Text's client and scroll widths are its own laid-out width.
    clientWidth: opts.clientWidth != null ? opts.clientWidth : opts.w || 0,
    scrollWidth: opts.scrollWidth != null ? opts.scrollWidth : opts.w || 0,
    get textContent() {
      return node.__text + node.children.map((c) => c.textContent).join('');
    },
    get offsetParent() {
      return node.parentElement || FAKE_BODY;
    },
    getBoundingClientRect() {
      const w = opts.w || 0;
      const h = opts.h || 20;
      return { width: w, height: h, top: 0, left: 0, right: w, bottom: h };
    },
    getAttribute: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    append(...kids) {
      for (const k of kids) {
        k.parentElement = node;
        node.children.push(k);
      }
      return node;
    }
  };
  return node;
}

let FAKE_BODY = null;

function measure(armName, roots) {
  const mod = arm(armName);
  const body = element('body');
  FAKE_BODY = body;
  body.append(...roots);
  const all = [];
  const walk = (n) => n.children.forEach((c) => (all.push(c), walk(c)));
  walk(body);
  const document = {
    documentElement: { clientWidth: 390, clientHeight: 844, scrollHeight: 844 },
    body,
    querySelectorAll: () => all
  };
  const getComputedStyle = (el, pseudo) => (pseudo ? { content: 'none' } : el.__style);
  const window = { innerWidth: 390, innerHeight: 844, projectData: undefined };
  const run = new Function('document', 'getComputedStyle', 'window', `return (${mod.measureExpression([], [])});`);
  return { mod, measured: run(document, getComputedStyle, window) };
}

const SENTENCE = 'The five rooms are one Static Data node — open it and add a sixth.';

/** pixel-game's footer at 390×844, as the browser measured it: a 390px column with 16px padding each side. */
function footer(textWidth) {
  const text = element('div', { cls: 'ndl-visual-text', w: textWidth, text: SENTENCE });
  // Beside it, a text that fits: the known-silent half on the same page.
  const fits = element('div', { cls: 'ndl-visual-text', w: 120, text: 'Room 1 — First steps' });
  const column = element('div', { w: 390, clientWidth: 390, style: { paddingLeft: '16px', paddingRight: '16px' } });
  return [column.append(fits, text)];
}

function findings(armName, roots) {
  const { mod, measured } = measure(armName, roots);
  const viewport = { ...measured, requested: { width: 390, height: 844 }, consoleErrors: [] };
  return {
    measured,
    found: mod.summarise({ phone: viewport }).findings.filter((f) => f.code === mod.RenderFinding.TextWiderThanItsBox)
  };
}

describe('GAM-020 — text-wider-than-its-box', () => {
  it('🔴 the clipped footer is named, with its width and its box, and the text that fits is not', () => {
    const { measured, found } = findings('head', footer(429));
    expect(measured.textsWiderThanBox).toEqual([
      { text: SENTENCE, width: 429, parentWidth: 358, cls: 'ndl-visual-text' }
    ]);
    expect(found.map((f) => ({ severity: f.severity, viewport: f.viewport }))).toEqual([
      { severity: 'warning', viewport: 'phone' }
    ]);
    expect(found[0].message).toContain('429px in a 358px box');
  });

  it('silent when the text wraps inside its box (contentHeight: the same sentence, 358px wide)', () => {
    expect(findings('head', footer(358)).found).toEqual([]);
  });

  it('🔴 reverted arm: the text compared with itself cannot see the clip (RKT-001 trap)', () => {
    expect(findings('self', footer(429)).found).toEqual([]);
  });

  it('an inline parent has no content box and is skipped, not judged', () => {
    const text = element('span', { cls: 'ndl-visual-text', w: 429, text: SENTENCE });
    const inline = element('span', { w: 429, clientWidth: 0, style: { display: 'inline' } });
    expect(findings('head', [inline.append(text)]).measured.textsWiderThanBoxCount).toBe(0);
  });
});
