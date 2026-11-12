/**
 * P112 OWN-028 — the gates a small model found (OWN-027's Gemma 4 / LFM3 pages), the render half.
 *
 *   overlapping-sections   P112-OWN027-IMAGEGROUNDSPILL  a fixed-height band packed to its foot, its cards drawn up over the hero
 *   text-at-viewport-edge  P112-OWN027-NOSHELLGATE       a band with no shell: words from x = 0 of a 1280 px window
 *   competing-headlines    P112-OWN027-MANYHEADLINES     five sections, each opening at 72 px
 *
 * The in-page half runs on a fake DOM, as `textAgainstEdge.test.js` does. Each reading has a reverted arm (its push
 * clause switched off), so a green here is the clause grading the fixture and not a fixture that cannot fail.
 */
const fs = require('fs');
const path = require('path');

const HEAD_SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.js'), 'utf8');
const CLAUSES = {
  overlaps: ['      if (prev && top < prev.r.bottom - OVERLAP_SLACK_PX) {', '      if (false) {'],
  edge: ['      if (Math.min(left, right) >= VIEWPORT_EDGE_MAX_GAP) continue;', '      continue;'],
  display: ['    .filter((x) => x.px >= DISPLAY_SIZE_MIN_PX);', '    .filter(() => false);']
};

function compile(src) {
  const module_ = { exports: {} };
  new Function('module', 'exports', `${src}\nreturn module.exports;`)(module_, module_.exports);
  return module_.exports;
}
function arm(name) {
  if (name === 'head') return compile(HEAD_SRC);
  const [fixed, before] = CLAUSES[name];
  if (HEAD_SRC.split(fixed).length !== 2) throw new Error(`the reverted arm "${name}" found no single fixed clause: it would grade nothing`);
  return compile(HEAD_SRC.replace(fixed, before));
}

const STYLE = {
  opacity: '1', visibility: 'visible', position: 'static', backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'none',
  borderTopWidth: '0px', borderLeftWidth: '0px', borderRightWidth: '0px', borderStyle: 'none', fontWeight: '400',
  fontSize: '16px', fontFamily: 'Inter, sans-serif', display: 'block', paddingLeft: '0px', paddingRight: '0px'
};
const DISPLAY = { ...STYLE, fontSize: '72px', fontWeight: '700' };
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
  if (text) node.childNodes.push({ nodeType: 3, textContent: text, parentElement: node, parentNode: node, __rect: rect(ink ? ink[0] : box[0], box[1], ink ? ink[1] : box[2], 12) });
  for (const k of kids) { k.parentElement = node; node.children.push(k); node.childNodes.push(k); }
  return node;
}
const text = (box, words, opts = {}) => el(box, { text: words, ink: opts.ink, style: opts.style });

function measure(armName, page, width = 1280) {
  const mod = arm(armName);
  const body = el([0, 0, width, 3000], { kids: [page] });
  const all = [];
  const walk = (n) => n.children.forEach((c) => (all.push(c), walk(c)));
  walk(body);
  const texts = [];
  const walkText = (n) => n.childNodes.forEach((c) => (c.nodeType === 3 ? texts.push(c) : walkText(c)));
  walkText(body);
  const document = {
    documentElement: { clientWidth: width, clientHeight: 900, scrollHeight: 3000, scrollWidth: width },
    body,
    querySelectorAll: () => all,
    createRange: () => { let t = null; return { selectNodeContents: (n) => (t = n), getBoundingClientRect: () => t.__rect }; },
    createTreeWalker: () => { let i = -1; return { nextNode: () => texts[++i] || null }; }
  };
  const getComputedStyle = (e, pseudo) => (pseudo ? { content: 'none' } : e.__style);
  const window = { innerWidth: width, innerHeight: 900, projectData: undefined };
  const run = new Function('document', 'getComputedStyle', 'window', 'NodeFilter', `return (${mod.measureExpression([], [])});`);
  return { mod, v: run(document, getComputedStyle, window, { SHOW_TEXT: 4 }) };
}
const findings = (mod, v, code, width = 1280) =>
  mod.summarise({ desktop: { ...v, requested: { width, height: 900 }, consoleErrors: [] } }).findings.filter((f) => f.code === code);

// ── A shelled band: content inside a 1200 px shell with 24 px padding, centred in the 1280 px window. ─────────────
const SHELL_LEFT = 64;
const shelledBand = (top, height, words) =>
  el([0, top, 1280, height], { kids: [el([40, top + 40, 1200, height - 80], { kids: [text([SHELL_LEFT, top + 60, 1152, 24], words, { ink: [SHELL_LEFT, 400] })] })] });

describe('overlapping-sections (P112-OWN027-IMAGEGROUNDSPILL)', () => {
  /**
   * v2b-e4b's shape: a hero (0–520), then an imageGround fixed at 520 px whose headline, line and four-card grid are
   * 900 px tall, packed to its foot, so they start 380 px ABOVE the band's own top and sit on the hero.
   */
  function spilled(heldHeight) {
    const top = 520, height = 520;
    const inkTop = top + height - heldHeight;
    return el([0, 0, 1280, 2000], {
      kids: [
        shelledBand(0, 520, 'Find the puppy who has been waiting'),
        el([0, top, 1280, height], {
          kids: [el([40, inkTop, 1200, heldHeight], { kids: [text([SHELL_LEFT, inkTop, 1152, 40], 'Meet our happy pack', { ink: [SHELL_LEFT, 300] }), el([SHELL_LEFT, inkTop + 80, 1152, heldHeight - 80], { style: { ...STYLE, backgroundColor: 'rgb(248, 250, 252)' } })] })]
        }),
        shelledBand(1040, 400, 'How adoption works')
      ]
    });
  }

  it('fires when a band draws its content up over the band above, naming both and by how much', () => {
    const { mod, v } = measure('head', spilled(900));
    expect(v.layout.overlaps).toEqual([
      expect.objectContaining({ direction: 'up', by: 380, text: 'Meet our happy pack', over: 'Find the puppy who has been waiting', bandHeight: 520, inkHeight: 900 })
    ]);
    const found = findings(mod, v, mod.RenderFinding.OverlappingSections);
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe('warning');
    expect(found[0].message).toContain('drawn 380px up over the section above');
    expect(found[0].message).toContain('sizeMode contentHeight and a minHeight');
  });

  it('is silent when what the band holds fits inside it (the same band holding a headline)', () => {
    const { mod, v } = measure('head', spilled(200));
    expect(v.layout.overlaps).toEqual([]);
    expect(findings(mod, v, mod.RenderFinding.OverlappingSections)).toEqual([]);
  });

  it("is silent on a Columns container's transparent box poking up by its own negative marginY (nothing drawn there)", () => {
    // OWN-028 gates-off v1 run at 390 px: the gallery's Columns container sits 16 px above its band (marginTop: -marginY)
    // and pads its items back down; only the transparent box crosses, so a person sees nothing over the band above.
    const page = el([0, 0, 1280, 1400], {
      kids: [
        shelledBand(0, 520, 'Start by filling out our simple online form'),
        el([0, 520, 1280, 600], {
          kids: [el([40, 504, 1200, 580], { kids: [text([SHELL_LEFT, 540, 1152, 40], 'Meet Sparky the playful pup', { ink: [SHELL_LEFT, 300] }), el([SHELL_LEFT, 600, 1152, 400], { style: { ...STYLE, backgroundColor: 'rgb(248, 250, 252)' } })] })]
        })
      ]
    });
    expect(measure('head', page).v.layout.overlaps).toEqual([]);
  });

  it('control: the reverted arm does not see the spill — the clause is what grades it', () => {
    const { v } = measure('overlaps', spilled(900));
    expect(v.layout.overlaps).toEqual([]);
  });
});

describe('text-at-viewport-edge (P112-OWN027-NOSHELLGATE)', () => {
  /** r2's shape: a band whose Text is its direct child, so a left-set paragraph starts at x = 0. */
  const noShell = () =>
    el([0, 0, 1280, 1000], {
      kids: [
        el([0, 0, 1280, 400], { kids: [text([0, 40, 1280, 48], 'Step 1: Fill out our fun application', { ink: [0, 620] })] }),
        // A centred headline in a full-width box is not against anything: its ink is in the middle.
        el([0, 400, 1280, 300], { kids: [text([0, 440, 1280, 48], 'Meet our happy pack', { ink: [440, 400] })] })
      ]
    });

  it('fires on words that start at the window edge, and not on a centred headline in the same kind of box', () => {
    const { mod, v } = measure('head', noShell());
    expect(v.layout.viewportEdgeTextCount).toBe(1);
    expect(v.layout.viewportEdgeTexts[0]).toEqual(expect.objectContaining({ text: 'Step 1: Fill out our fun application', left: 0 }));
    const found = findings(mod, v, mod.RenderFinding.TextAtViewportEdge);
    expect(found).toHaveLength(1);
    expect(found[0].relatedDiagnostic).toBe('band-without-shell');
    expect(found[0].message).toContain('0px from the window\'s left edge');
    expect(found[0].message).toContain('inside a shell');
  });

  it('is silent on a page whose bands hold a shell', () => {
    const { mod, v } = measure('head', el([0, 0, 1280, 800], { kids: [shelledBand(0, 400, 'Find the puppy'), shelledBand(400, 400, 'Meet the puppies')] }));
    expect(v.layout.viewportEdgeTextCount).toBe(0);
    expect(findings(mod, v, mod.RenderFinding.TextAtViewportEdge)).toEqual([]);
  });

  it('is not read on a phone, where a shell\'s padding is the whole gutter', () => {
    const { v } = measure('head', el([0, 0, 390, 400], { kids: [text([0, 40, 390, 48], 'Step 1', { ink: [0, 80] })] }), 390);
    expect(v.layout.viewportEdgeTextCount).toBe(0);
  });

  it('control: the reverted arm does not see the edge', () => {
    const { v } = measure('edge', noShell());
    expect(v.layout.viewportEdgeTextCount).toBe(0);
  });
});

describe('competing-headlines (P112-OWN027-MANYHEADLINES)', () => {
  const page = (displayCount) =>
    el([0, 0, 1280, 3000], {
      kids: Array.from({ length: 5 }, (_, i) =>
        el([0, i * 600, 1280, 600], {
          kids: [el([40, i * 600 + 40, 1200, 520], { kids: [text([SHELL_LEFT, i * 600 + 60, 1152, 80], `Section ${i + 1} headline`, { ink: [SHELL_LEFT, 500], style: i < displayCount ? DISPLAY : { ...STYLE, fontSize: '36px' } })] })]
        })
      )
    });

  it('fires when five sections open at 72px, quoting them', () => {
    const { mod, v } = measure('head', page(5));
    expect(v.layout.displayTextCount).toBe(5);
    const found = findings(mod, v, mod.RenderFinding.CompetingHeadlines);
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('5 texts on this page are set at display size');
    expect(found[0].message).toContain('"Section 1 headline" (72px)');
    expect(found[0].message).toContain('sectionHeading');
  });

  it('is silent on one display headline (the hero) and section headings below it', () => {
    const { mod, v } = measure('head', page(1));
    expect(v.layout.displayTextCount).toBe(1);
    expect(findings(mod, v, mod.RenderFinding.CompetingHeadlines)).toEqual([]);
  });

  it('control: the reverted arm counts none', () => {
    const { v } = measure('display', page(5));
    expect(v.layout.displayTextCount).toBe(0);
  });
});

describe('a recorded report without these readings', () => {
  it('says nothing (an absent field is unknown, never zero)', () => {
    const { mod, v } = measure('head', page2());
    const old = { ...v, layout: { rowGaps: [], drifts: [] } };
    const out = mod.summarise({ desktop: { ...old, requested: { width: 1280, height: 900 }, consoleErrors: [] } });
    const codes = [mod.RenderFinding.OverlappingSections, mod.RenderFinding.TextAtViewportEdge, mod.RenderFinding.CompetingHeadlines];
    expect(out.findings.filter((f) => codes.includes(f.code))).toEqual([]);
  });
  function page2() {
    return el([0, 0, 1280, 400], { kids: [text([0, 40, 1280, 48], 'At the edge', { ink: [0, 300], style: DISPLAY }), text([0, 100, 1280, 48], 'Also display', { ink: [0, 300], style: DISPLAY })] });
  }
});
