/**
 * P112-OWN019-DRIFTTALLPART (s6, Richard 2026-10-14) — `alignment-drift` skipped a section holding ONE tall part.
 *
 * Richard on RL1's laptop page: "the 'waitlist' heading is too far left … out of sync with the vertical alignment of
 * the 'Join the waitlist' block". render_report said nothing: RL1's waitlist is eyebrow, heading, line and a 290 px
 * form card in one group, and the drift rule skipped any group with a part over 240 px (meant for a page whose
 * children are whole sections). RL2b's identical eyebrow was named — its form sits one level up. The numbers below are
 * RL1's, measured in the browser at 1280 px (s6); the gallery corpus moved by exactly this one finding (15 apps).
 *
 * The in-page half runs on a fake DOM, as `textWiderThanItsBox.test.js` does: elements with measured rects, text
 * nodes whose Range is their ink.
 */
const fs = require('fs');
const path = require('path');

const HEAD_SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.js'), 'utf8');
const FIXED = '      if (byTop.filter((k) => k.height > 240).length > 1) continue;';
const BEFORE = '      if (byTop.some((k) => k.height > 240)) continue;';

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
  borderTopWidth: '0px', borderStyle: 'none', fontWeight: '400', fontSize: '14px', fontFamily: 'Inter, sans-serif',
  display: 'block', paddingLeft: '0px', paddingRight: '0px'
};
const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

/** An element at a measured box; `ink` = its words' own extent (left, width) when it holds text. */
function el(box, { text, ink, painted, kids = [] } = {}) {
  const node = {
    tagName: 'DIV', className: '', children: [], childNodes: [], parentElement: null,
    __style: painted ? { ...STYLE, backgroundColor: 'rgb(255, 250, 240)' } : STYLE,
    classList: { contains: () => false },
    get textContent() { return node.childNodes.map((c) => c.textContent).join(''); },
    get offsetParent() { return node.parentElement; },
    clientWidth: box[2], scrollWidth: box[2],
    getBoundingClientRect: () => rect(...box),
    getAttribute: () => null, querySelector: () => null, querySelectorAll: () => [],
    contains(x) { for (let p = x; p; p = p.parentElement || p.parentNode) if (p === node) return true; return false; }
  };
  if (text) node.childNodes.push({ nodeType: 3, textContent: text, parentElement: node, parentNode: node, __rect: rect(ink[0], box[1], ink[1], box[3]) });
  for (const k of kids) { k.parentElement = node; node.children.push(k); node.childNodes.push(k); }
  return node;
}

function measure(armName, page) {
  const mod = arm(armName);
  const body = el([0, 0, 1280, 3200], { kids: [page] });
  const all = [];
  const walk = (n) => n.children.forEach((c) => (all.push(c), walk(c)));
  walk(body);
  const texts = [];
  const walkText = (n) => n.childNodes.forEach((c) => (c.nodeType === 3 ? texts.push(c) : walkText(c)));
  walkText(body);
  const document = {
    documentElement: { clientWidth: 1280, clientHeight: 900, scrollHeight: 3200, scrollWidth: 1280 },
    body,
    querySelectorAll: () => all,
    createRange: () => { let t = null; return { selectNodeContents: (n) => (t = n), getBoundingClientRect: () => t.__rect }; },
    createTreeWalker: () => { let i = -1; return { nextNode: () => texts[++i] || null }; }
  };
  const getComputedStyle = (e, pseudo) => (pseudo ? { content: 'none' } : e.__style);
  const window = { innerWidth: 1280, innerHeight: 900, projectData: undefined };
  const run = new Function('document', 'getComputedStyle', 'window', 'NodeFilter', `return (${mod.measureExpression([], [])});`);
  return run(document, getComputedStyle, window, { SHOW_TEXT: 4 }).layout.drifts.map((d) => [d.text, d.offBy, d.centredText]);
}

// RL1's waitlist group, as the browser measured it (s6): 280+720 wide, its centre at 640.
const waitlist = (card) =>
  el([280, 2400, 720, 483], {
    kids: [
      el([304, 2400, 672, 14], { text: 'WAITLIST', ink: [304, 70] }),
      el([304, 2430, 672, 72], { text: 'Join the waitlist', ink: [475, 330] }),
      el([360, 2518, 560, 59], { text: 'Be first in line when Driftwood opens.', ink: [380, 520] }),
      el([360, 2593, 560, card], { painted: true })
    ]
  });

describe('P112-OWN019-DRIFTTALLPART — a section with one tall part is still one section', () => {
  it("🔴 RL1's waitlist eyebrow, beside a 290 px form card, is named (HEAD) — the rule before skipped it", () => {
    expect(measure('head', waitlist(290))).toEqual([['WAITLIST', -301, 'Join the waitlist']]);
    expect(measure('before', waitlist(290))).toEqual([]);
  });

  it('the same eyebrow beside a short card was named before too — the card height was the whole difference', () => {
    expect(measure('before', waitlist(200))).toEqual([['WAITLIST', -301, 'Join the waitlist']]);
  });

  it('a page whose children are whole sections is still not compared section against section', () => {
    const section = (top, inkLeft, text) => el([0, top, 1280, 600], { kids: [el([64, top + 40, 1152, 400], { text, ink: [inkLeft, 300] })] });
    // A centred hero, then a left-set section: two tall parts → the page column is skipped, as before.
    const page = el([0, 0, 1280, 1800], { kids: [el([0, 0, 1280, 60], { text: 'Driftwood', ink: [590, 100] }), section(60, 490, 'A calmer week'), section(660, 64, 'Planning, minus the noise')] });
    expect(measure('head', page).filter(([t]) => t === 'Planning, minus the noise')).toEqual([]);
  });

  it('a centred section with one tall card and nothing off-centre says nothing', () => {
    const centred = el([280, 2400, 720, 483], {
      kids: [
        el([304, 2400, 672, 14], { text: 'WAITLIST', ink: [605, 70] }),
        el([304, 2430, 672, 72], { text: 'Join the waitlist', ink: [475, 330] }),
        el([360, 2593, 560, 290], { painted: true })
      ]
    });
    expect(measure('head', centred)).toEqual([]);
  });
});
