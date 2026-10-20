/**
 * P112-OWN020-OFFSYSTEM — `control-off-scale`: a control drawn at the runtime's own size beside a page on its scale.
 *
 * Richard on OpenTune's Browse page (2026-10-19): "some chunky weird ones like the 'Sort By' choice circles and
 * font". Measured in the real page: three Radio Buttons, each a 32px box with a 2px black ring beside a 16px label,
 * on a page whose type scale is the default tokens (12/14/16/18/20/24/30/36/48/60px). With element styles: 16px
 * boxes beside 14px labels. Both readings are graded here, in a fake DOM, plus a reverted arm that removes the
 * oversize predicate so the spec cannot pass on the scaffolding alone.
 */
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'src', 'index.js');
const HEAD_SRC = fs.readFileSync(SOURCE, 'utf8');
const OVERSIZE = "c.box > Math.max(20, 1.5 * (c.textSize > 0 ? c.textSize : 0))";

function compile(src) {
  const module_ = { exports: {} };
  new Function('module', 'exports', `${src}\nreturn module.exports;`)(module_, module_.exports);
  return module_.exports;
}
function arm(name) {
  if (name === 'head') return compile(HEAD_SRC);
  if (HEAD_SRC.split(OVERSIZE).length - 1 !== 1) throw new Error('the reverted arm expected one oversize predicate: it would grade nothing');
  return compile(HEAD_SRC.replace(OVERSIZE, 'false'));
}

const TOKENS = { '--text-xs': '0.75rem', '--text-sm': '0.875rem', '--text-base': '1rem', '--text-lg': '1.125rem', '--text-xl': '1.25rem', '--text-2xl': '1.5rem' };

let BODY = null;
function el(tag, opts = {}) {
  const style = { opacity: '1', visibility: 'visible', position: 'static', backgroundColor: 'rgba(0, 0, 0, 0)', borderStyle: 'none', fontWeight: '400', fontSize: '14px', fontFamily: 'Inter', display: 'block', paddingLeft: '0px', paddingRight: '0px', ...(opts.style || {}) };
  const node = {
    tagName: tag.toUpperCase(), className: opts.cls || '', id: opts.id || '', type: opts.type || '', htmlFor: opts.for || '',
    classList: { contains: () => false }, children: [], parentElement: null, __style: style, __text: opts.text || '',
    clientWidth: opts.w || 0, scrollWidth: opts.w || 0,
    get textContent() { return node.__text + node.children.map((c) => c.textContent).join(''); },
    get offsetParent() { return node.parentElement || BODY; },
    getBoundingClientRect() { const w = opts.w || 0, h = opts.h || 20; return { width: w, height: h, top: 0, left: 0, right: w, bottom: h }; },
    getAttribute: () => null, querySelector: () => null, querySelectorAll: () => [],
    append(...kids) { for (const k of kids) { k.parentElement = node; node.children.push(k); } return node; }
  };
  return node;
}

/** A Radio Button as the runtime draws it: an opacity-0 input inside the visible ring, a <label for> beside it. */
function radio(id, box, labelPx) {
  const input = el('input', { id, type: 'radio', w: box, h: box, style: { opacity: '0' } });
  const ring = el('div', { w: box, h: box }).append(input);
  const label = el('label', { for: id, w: 60, h: labelPx, text: 'Newest', style: { fontSize: labelPx + 'px' } });
  return el('div', { w: 200, h: box }).append(ring, label);
}

function findings(armName, roots) {
  const mod = arm(armName);
  BODY = el('body');
  BODY.append(...roots);
  const all = [];
  const walk = (n) => n.children.forEach((c) => (all.push(c), walk(c)));
  walk(BODY);
  const root = { clientWidth: 390, clientHeight: 844, scrollHeight: 844, __style: { fontSize: '16px', getPropertyValue: (n) => TOKENS[n] || '' } };
  const document = {
    documentElement: root, body: BODY, querySelectorAll: () => all,
    querySelector: (sel) => { const m = /label\[for="([^"]+)"\]/.exec(sel); return m ? all.find((e) => e.tagName === 'LABEL' && e.htmlFor === m[1]) || null : null; }
  };
  const getComputedStyle = (e, pseudo) => (pseudo ? { content: 'none' } : e.__style);
  const window = { innerWidth: 390, innerHeight: 844, projectData: undefined };
  const measured = new Function('document', 'getComputedStyle', 'window', `return (${mod.measureExpression([], [])});`)(document, getComputedStyle, window);
  const viewport = { ...measured, requested: { width: 390, height: 844 }, consoleErrors: [] };
  return { measured, found: mod.summarise({ phone: viewport, desktop: viewport }).findings.filter((f) => f.code === mod.RenderFinding.ControlOffScale) };
}

describe('control-off-scale (P112-OWN020-OFFSYSTEM)', () => {
  it("reads the project's type scale off :root and each radio's box on the ring a person sees", () => {
    const { measured } = findings('head', [radio('r1', 32, 16)]);
    expect(measured.controls.textScale).toEqual([12, 14, 16, 18, 20, 24]);
    expect(measured.controls.items).toEqual([{ kind: 'Radio Button', box: 32, textSize: 16 }]);
  });

  it("names Richard's Sort-by radios — 32px boxes beside 16px labels — once for the app, not once per width", () => {
    const { found } = findings('head', [radio('r1', 32, 16), radio('r2', 32, 16), radio('r3', 32, 16)]);
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe('warning');
    expect(found[0].message).toContain('Radio Button x3: 32px box beside a 16px label');
    expect(found[0].message).toContain('set_element_style');
  });

  it('is silent on the element-styled radios: 16px boxes beside 14px labels (the known-silent half)', () => {
    expect(findings('head', [radio('r1', 16, 14), radio('r2', 16, 14)]).found).toEqual([]);
  });

  it("names a native select left at the browser's 13.33px text, off the scale", () => {
    const select = el('select', { w: 120, h: 24, style: { fontSize: '13.3333px' } });
    // with a heading beside it: a page of nothing but a select is a blank render, judged before any control is
    const heading = el('div', { w: 200, text: 'Sort by', style: { fontSize: '14px' } });
    const { found } = findings('head', [el('div', { w: 300 }).append(heading, select)]);
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('Dropdown x1: 13.33px text, off the type scale (12/14/16/18/20/24px)');
  });

  it('reverted arm: without the oversize predicate the chunky radios pass — so the spec grades it', () => {
    expect(findings('reverted', [radio('r1', 32, 16)]).found).toEqual([]);
  });

  it('a recorded viewport with no controls field (older recordings) is judged as before', () => {
    const mod = arm('head');
    expect(mod.controlsOffScale({ textScale: [], items: [] })).toEqual([]);
  });
});
