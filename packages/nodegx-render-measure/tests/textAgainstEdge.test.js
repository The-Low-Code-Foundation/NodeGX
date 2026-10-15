/**
 * P112-OWN019-LETTEREDGE (s7, Richard 2026-10-15) — words hard against the edge of the box that frames them.
 *
 * Richard on TL2's laptop hero: "a weird artifact for the weekday repeater". Seven outlined day chips, each letter
 * pressed to its chip's left edge: the chip Group centres its child, but the Text stretches to the Group's width and
 * sets its letter left. The grader passed TL2 19/19 and render_report said nothing — no reading looked at a text
 * inside its own frame. The boxes below are a TL2 chip's shape (1 px glass border, 48 px tall).
 *
 * The in-page half runs on a fake DOM, as `alignmentDriftOneTallPart.test.js` does.
 */
const fs = require('fs');
const path = require('path');

const HEAD_SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.js'), 'utf8');
const FIXED = '      if (Math.min(left, right) < EDGE_TEXT_MAX_GAP) layout.edgeTexts.push(';
const BEFORE = '      if (false) layout.edgeTexts.push(';

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
  fontSize: '14px', fontFamily: 'Inter, sans-serif', display: 'block', paddingLeft: '0px', paddingRight: '0px'
};
const OUTLINED = { ...STYLE, borderTopWidth: '1px', borderLeftWidth: '1px', borderRightWidth: '1px', borderStyle: 'solid' };
const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

/** An element at a measured box; `ink` = its words' own extent (left, width) when it holds text. */
function el(box, { text, ink, style = STYLE, kids = [] } = {}) {
  const node = {
    tagName: 'DIV', className: '', children: [], childNodes: [], parentElement: null, __style: style,
    classList: { contains: () => false },
    get textContent() { return node.childNodes.map((c) => c.textContent).join(''); },
    get offsetParent() { return node.parentElement; },
    clientWidth: box[2], scrollWidth: box[2],
    getBoundingClientRect: () => rect(...box),
    getAttribute: () => null, querySelector: () => null, querySelectorAll: () => [],
    contains(x) { for (let p = x; p; p = p.parentElement || p.parentNode) if (p === node) return true; return false; }
  };
  if (text) node.childNodes.push({ nodeType: 3, textContent: text, parentElement: node, parentNode: node, __rect: rect(ink[0], box[1], ink[1], 12) });
  for (const k of kids) { k.parentElement = node; node.children.push(k); node.childNodes.push(k); }
  return node;
}

function measure(armName, page, width = 1280) {
  const mod = arm(armName);
  const body = el([0, 0, width, 2000], { kids: [page] });
  const all = [];
  const walk = (n) => n.children.forEach((c) => (all.push(c), walk(c)));
  walk(body);
  const texts = [];
  const walkText = (n) => n.childNodes.forEach((c) => (c.nodeType === 3 ? texts.push(c) : walkText(c)));
  walkText(body);
  const document = {
    documentElement: { clientWidth: width, clientHeight: 900, scrollHeight: 2000, scrollWidth: width },
    body,
    querySelectorAll: () => all,
    createRange: () => { let t = null; return { selectNodeContents: (n) => (t = n), getBoundingClientRect: () => t.__rect }; },
    createTreeWalker: () => { let i = -1; return { nextNode: () => texts[++i] || null }; }
  };
  const getComputedStyle = (e, pseudo) => (pseudo ? { content: 'none' } : e.__style);
  const window = { innerWidth: width, innerHeight: 900, projectData: undefined };
  const run = new Function('document', 'getComputedStyle', 'window', 'NodeFilter', `return (${mod.measureExpression([], [])});`);
  return run(document, getComputedStyle, window, { SHOW_TEXT: 4 });
}
const edges = (armName, page, width) => measure(armName, page, width).layout.edgeTexts.map((e) => [e.text, e.left, e.right]);

/** A strip of chips 64 px wide; `inkAt(left)` = where each letter's ink starts. */
const strip = (inkAt, letters = ['M', 'T', 'W']) =>
  el([400, 300, 64 * letters.length, 48], {
    kids: letters.map((l, i) => {
      const left = 400 + 64 * i;
      // The Text stretches to the chip's inner width (62 px); its ink is the letter's own 8 px.
      return el([left, 300, 64, 48], { style: OUTLINED, kids: [el([left + 1, 318, 62, 12], { text: l, ink: [inkAt(left), 8] })] });
    })
  });

describe('P112-OWN019-LETTEREDGE — words hard against the edge of their frame', () => {
  it("🔴 TL2's chip letters, set left in a stretched Text, are named on HEAD — the reverted arm is silent", () => {
    const tl2 = strip((left) => left + 1);
    expect(edges('head', tl2)).toEqual([['M', 0, 54], ['T', 0, 54], ['W', 0, 54]]);
    expect(edges('before', tl2)).toEqual([]);
  });

  it('the same chips with the letter centred (textAlignX: center) say nothing', () => {
    expect(edges('head', strip((left) => left + 28))).toEqual([]);
  });

  it('a chip on a phone is a chip too — the reading is not desktop-only', () => {
    expect(edges('head', strip((left) => left + 1), 390).length).toBe(3);
  });

  it('a padded card with left-set words, a page-wide band and an inline highlight are not frames to press against', () => {
    const card = el([100, 100, 400, 200], { style: { ...STYLE, backgroundColor: 'rgb(255, 255, 255)' }, kids: [el([124, 124, 352, 20], { text: 'A calmer week', ink: [124, 120] })] });
    const band = el([0, 400, 1280, 300], { style: { ...STYLE, backgroundColor: 'rgb(20, 20, 20)' }, kids: [el([0, 420, 1280, 20], { text: 'Full bleed', ink: [0, 90] })] });
    const mark = el([600, 800, 60, 16], { style: { ...STYLE, display: 'inline', backgroundColor: 'rgb(255, 230, 0)' }, text: 'note', ink: [600, 60] });
    expect(edges('head', el([0, 0, 1280, 1000], { kids: [card, band, mark] }))).toEqual([]);
  });

  it('summarise names the frames once per viewport and says what to set', () => {
    const v = measure('head', strip((left) => left + 1));
    const mod = arm('head');
    const out = mod.summarise({ desktop: { ...v, requested: { width: 1280, height: 900 }, consoleErrors: [] } });
    const found = out.findings.filter((f) => f.code === mod.RenderFinding.TextAgainstEdge);
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('"M" 0px from the left edge of its 64×48px box');
    expect(found[0].message).toContain('textAlignX: center');
  });
});
