/**
 * P112-OWN019-LOOKBLIND (open since 2026-10-16; OWN-026's Mistral rounds) — text nobody can read against what is behind it.
 *
 * Large 4's number pad set white digits on a #FAF5FF button (1.07:1; the lab's note said about 1.05) and kept them through five changes: it tapped
 * the keys, read "Correct!", and nothing in render_report or drive_page measured contrast. The buttons below are that
 * pad's shape. The in-page half runs on a fake DOM, as `textAgainstEdge.test.js` does.
 */
const fs = require('fs');
const path = require('path');

const HEAD_SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.js'), 'utf8');
const FIXED = '      if (ratio >= CONTRAST_FLOOR) continue;';
const BEFORE = '      if (true) continue;';

function compile(src) {
  const module_ = { exports: {} };
  new Function('module', 'exports', `${src}\nreturn module.exports;`)(module_, module_.exports);
  return module_.exports;
}
function arm(name) {
  if (name === 'head') return compile(HEAD_SRC);
  if (HEAD_SRC.split(FIXED).length !== 2) throw new Error('the reverted arm found no single fixed clause: it would grade nothing');
  return compile(HEAD_SRC.replace(FIXED, BEFORE));
}

const STYLE = {
  opacity: '1', visibility: 'visible', position: 'static', backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'none',
  borderTopWidth: '0px', borderLeftWidth: '0px', borderRightWidth: '0px', borderStyle: 'none', fontWeight: '400',
  fontSize: '24px', fontFamily: 'Inter, sans-serif', display: 'block', paddingLeft: '0px', paddingRight: '0px',
  color: 'rgb(17, 17, 17)', textShadow: 'none'
};
const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

function el(box, { text, style = STYLE, kids = [], attrs = {}, disabled } = {}) {
  const node = {
    tagName: 'DIV', className: '', children: [], childNodes: [], parentElement: null, __style: style, disabled,
    classList: { contains: () => false },
    get textContent() { return node.childNodes.map((c) => c.textContent).join(''); },
    get offsetParent() { return node.parentElement; },
    clientWidth: box[2], scrollWidth: box[2],
    getBoundingClientRect: () => rect(...box),
    getAttribute: (k) => (k in attrs ? attrs[k] : null), querySelector: () => null, querySelectorAll: () => [],
    contains(x) { for (let p = x; p; p = p.parentElement || p.parentNode) if (p === node) return true; return false; }
  };
  if (text) node.childNodes.push({ nodeType: 3, textContent: text, parentElement: node, parentNode: node, __rect: rect(box[0], box[1], 8, 12) });
  for (const k of kids) { k.parentElement = node; node.children.push(k); node.childNodes.push(k); }
  return node;
}

function measure(armName, page, { width = 1280, bodyStyle = STYLE } = {}) {
  const mod = arm(armName);
  const body = el([0, 0, width, 2000], { kids: [page], style: bodyStyle });
  const all = [];
  const walk = (n) => n.children.forEach((c) => (all.push(c), walk(c)));
  walk(body);
  const document = {
    documentElement: { clientWidth: width, clientHeight: 900, scrollHeight: 2000, scrollWidth: width },
    body,
    querySelectorAll: () => all
  };
  const getComputedStyle = (e, pseudo) => (pseudo ? { content: 'none' } : e.__style);
  const window = { innerWidth: width, innerHeight: 900, projectData: undefined };
  const run = new Function('document', 'getComputedStyle', 'window', 'NodeFilter', `return (${mod.measureExpression([], [])});`);
  return run(document, getComputedStyle, window, { SHOW_TEXT: 4 });
}
const low = (armName, page, opts) => measure(armName, page, opts).layout.lowContrast.map((c) => [c.text, c.fg, c.bg, c.ratio, c.count]);

const WHITE_INK = { ...STYLE, color: 'rgb(255, 255, 255)' };
const key = (digit, buttonStyle, inkStyle = WHITE_INK, extra = {}) =>
  el([100 + 60 * Number(digit), 300, 56, 56], { style: buttonStyle, ...extra, kids: [el([110 + 60 * Number(digit), 316, 36, 24], { text: digit, style: inkStyle })] });
const pad = (buttonStyle, inkStyle, extra) => el([80, 280, 700, 100], { kids: ['7', '8', '9'].map((d) => key(d, buttonStyle, inkStyle, extra)) });
const PALE = { ...STYLE, backgroundColor: 'rgb(250, 245, 255)' };

describe('P112-OWN019-LOOKBLIND — text under 3:1 against what is behind it', () => {
  it("🔴 OWN-026's number pad (white digits on #FAF5FF) is named once on HEAD — the reverted arm is silent", () => {
    expect(low('head', pad(PALE))).toEqual([['7', '#ffffff', '#faf5ff', 1.07, 3]]);
    expect(low('before', pad(PALE))).toEqual([]);
  });

  it('the same digits on a dark button say nothing, and are counted as checked', () => {
    const v = measure('head', pad({ ...STYLE, backgroundColor: 'rgb(76, 29, 149)' }));
    expect(v.layout.lowContrast).toEqual([]);
    expect(v.layout.contrastChecked).toBe(3);
  });

  it('a translucent overlay is composited onto the dark page under it, not read as the ground on its own', () => {
    // 10% white over near-black: the ground is dark, so pale grey ink reads; reading the overlay alone would call it white.
    const overlay = { ...STYLE, backgroundColor: 'rgba(255, 255, 255, 0.1)' };
    const ink = { ...STYLE, color: 'rgb(230, 230, 230)' };
    expect(low('head', pad(overlay, ink), { bodyStyle: { ...STYLE, backgroundColor: 'rgb(10, 10, 20)' } })).toEqual([]);
    // Control: the same ink on the same overlay over a white page IS unreadable.
    expect(low('head', pad(overlay, ink)).length).toBe(1);
  });

  it('abstains, counted, on a picture behind the text and on a text shadow — never guesses', () => {
    const v = measure('head', pad({ ...PALE, backgroundImage: 'url("hero.jpg")' }));
    expect(v.layout.lowContrast).toEqual([]);
    expect(v.layout.contrastAbstained).toBe(3);
    const shadowed = measure('head', pad(PALE, { ...WHITE_INK, textShadow: 'rgb(0, 0, 0) 0px 1px 2px' }));
    expect(shadowed.layout.lowContrast).toEqual([]);
    expect(shadowed.layout.contrastAbstained).toBe(3);
  });

  it('a disabled or aria-hidden control is exempt (WCAG 1.4.3)', () => {
    expect(low('head', pad(PALE, WHITE_INK, { disabled: true }))).toEqual([]);
    expect(low('head', pad(PALE, WHITE_INK, { attrs: { 'aria-hidden': 'true' } }))).toEqual([]);
  });

  it('summarise reports the pair once for the whole report, with the digits, the colours and what to change', () => {
    const mod = arm('head');
    const v = measure('head', pad(PALE));
    const phone = measure('head', pad(PALE), { width: 390 });
    const out = mod.summarise({
      desktop: { ...v, requested: { width: 1280, height: 900 }, consoleErrors: [] },
      phone: { ...phone, requested: { width: 390, height: 844 }, consoleErrors: [] }
    });
    const found = out.findings.filter((f) => f.code === mod.RenderFinding.LowContrastText);
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe('warning');
    expect(found[0].message).toContain('"7" #ffffff on #faf5ff, 1.07:1 (and 2 more like it)');
    expect(found[0].message).toContain('differ in lightness');
  });

  it('a recorded report without the reading says nothing (an absent field is unknown, never zero)', () => {
    const mod = arm('head');
    const v = measure('head', pad(PALE));
    delete v.layout.lowContrast;
    const out = mod.summarise({ desktop: { ...v, requested: { width: 1280, height: 900 }, consoleErrors: [] } });
    expect(out.findings.filter((f) => f.code === mod.RenderFinding.LowContrastText)).toEqual([]);
  });
});
