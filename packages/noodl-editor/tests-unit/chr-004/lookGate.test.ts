/**
 * CHR-004 — the look gate's judgement, graded.
 *
 * The gate itself measures a running editor (`scripts/look-gate/collect.js` inside the renderer,
 * `audit.js` over what it collects). This spec grades the half that decides, with hand-written
 * records, because three of the cases that matter most cannot be staged on demand in a drive:
 *
 *  - a ground that never resolves to an opaque colour (the gate must REFUSE, not score it),
 *  - a label cut by a fraction of a pixel (`scrollWidth` cannot see it; two of the property
 *    panel's labels were cut for the whole of CHR-009 because of that),
 *  - a control the user cannot reach, which computes the same colours as the one they can.
 *
 * And it grades the person sentence directly: moving a fill one token step, with the contrast
 * Richard ruled intact, must stay green.
 */
import * as path from 'path';

const LIB = path.join(__dirname, '../../../../scripts/look-gate/lib');

const { parseColorAlpha, composite, flattenGround, contrastRatio, toHex } = require(path.join(LIB, 'color.js'));
const { scalesFromDisk, readScale, stripComments, onScale } = require(path.join(LIB, 'scale.js'));
const { auditElements, summarise, NAT_001 } = require(path.join(LIB, 'audit.js'));

/** The ramps as the repo currently defines them — read once, used by every audit case below. */
const SCALES = scalesFromDisk();

/** A record with every field the audit looks at, so each case varies exactly one thing. */
function record(overrides: Record<string, unknown> = {}) {
  return Object.assign(
    {
      id: 'div.Row',
      role: 'text',
      fill: 'rgba(0, 0, 0, 0)',
      grounds: ['#232129'],
      fontSize: '12px',
      radius: '4px'
    },
    overrides
  );
}

describe('CHR-004 colour arithmetic', () => {
  it('parses the spellings a stylesheet and getComputedStyle produce between them', () => {
    expect(parseColorAlpha('#abc')).toEqual([170, 187, 204, 1]);
    expect(parseColorAlpha('#aabbcc')).toEqual([170, 187, 204, 1]);
    expect(parseColorAlpha('rgb(1, 2, 3)')).toEqual([1, 2, 3, 1]);
    expect(parseColorAlpha('rgba(1, 2, 3, 0.5)')).toEqual([1, 2, 3, 0.5]);
    expect(parseColorAlpha('rgb(1 2 3 / 40%)')).toEqual([1, 2, 3, 0.4]);
    expect(parseColorAlpha('transparent')).toEqual([0, 0, 0, 0]);
    expect(parseColorAlpha('not a colour')).toBeNull();
    expect(parseColorAlpha(undefined)).toBeNull();
  });

  it('keeps the alpha of an 8-digit hex — the spelling a stored shadow colour arrives in', () => {
    // CHR-009 §20: the colour field's own display dropped `#RRGGBBAA`'s alpha, and a 20% shadow
    // read opaque. A gate that did the same would score a made-up number.
    expect(parseColorAlpha('#11223344')).toEqual([17, 34, 51, 68 / 255]);
    expect(parseColorAlpha('#1234')).toEqual([17, 34, 51, 68 / 255]);
  });

  it('composites a translucent layer onto what is under it', () => {
    expect(composite([255, 255, 255, 0.5], [0, 0, 0])).toEqual([128, 128, 128]);
    expect(composite([255, 255, 255, 1], [0, 0, 0])).toEqual([255, 255, 255]);
  });

  it('flattens a ground stack, stopping at the first opaque layer', () => {
    // Nearest first: a 50% white wash over opaque black, with a second opaque colour below that
    // nothing can see.
    expect(flattenGround(['rgba(255, 255, 255, 0.5)', '#000000', '#ff0000'])).toEqual([128, 128, 128]);
    // A fully transparent layer paints nothing at all and must not end the walk.
    expect(flattenGround(['rgba(0, 0, 0, 0)', '#ffffff'])).toEqual([255, 255, 255]);
  });

  it('REFUSES a ground stack that never reaches an opaque colour', () => {
    // 🔴 The answer is "I cannot tell", not a number. CHR-012's first drive graded an `rgba` wash
    // as opaque and read `primary` against `primary-bg` at 1:1.
    expect(flattenGround([])).toBeNull();
    expect(flattenGround(['rgba(255, 255, 255, 0.5)'])).toBeNull();
    expect(flattenGround(['rgba(0, 0, 0, 0)'])).toBeNull();
  });

  it('scores WCAG contrast, and names the colour it graded', () => {
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 5);
    expect(contrastRatio([0, 0, 0], [0, 0, 0])).toBeCloseTo(1, 5);
    expect(toHex([12, 34, 56])).toBe('#0c2238');
  });
});

describe('CHR-004 scales, read from the files that define them', () => {
  it('reads R1 off fonts.css rather than holding a copy of it', () => {
    // R1 (2026-09-15): 11 / 12 / 13 / 15 / 20 and a 26px display size.
    for (const size of [11, 12, 13, 15, 20, 26]) expect(SCALES.fontSizes).toContain(size);
    // The sizes CHR-002 converted away from must NOT be allowed — this is the half that reddens.
    for (const size of [9, 9.5, 10, 10.5, 12.5, 13.333]) expect(SCALES.fontSizes).not.toContain(size);
    expect(SCALES.source.fontSizes.file).toContain('fonts.css');
  });

  it('reads the radius ramp off spacing.css, without CHR-003’s deleted steps', () => {
    for (const radius of [0, 2, 4, 6, 8]) expect(SCALES.radii).toContain(radius);
    for (const radius of [5, 7, 10]) expect(SCALES.radii).not.toContain(radius);
  });

  it('refuses to build an allowed set from nothing', () => {
    // A ramp whose selector or prefix was renamed would otherwise allow every value on screen.
    expect(() => readScale(':root { --something-else: 4px; }', '--radius-')).toThrow(/would allow everything/);
  });

  it('resolves a token defined as another token', () => {
    const scale = readScale(':root { --font-size-sm: 12px; --font-size-base: var(--font-size-sm); }', '--font-size-');
    expect(scale.values).toEqual([12]);
    expect(scale.tokenCount).toBe(2);
  });

  it('reports a ramp value it cannot grade instead of dropping it', () => {
    const scale = readScale(':root { --radius-a: 4px; --radius-b: 50%; }', '--radius-');
    expect(scale.values).toEqual([4]);
    expect(scale.ungradeable).toEqual(['--radius-b: 50%']);
  });

  it('strips comments before reading, so a commented-out step is not allowed', () => {
    const scale = readScale(stripComments(':root { --radius-a: 4px; /* --radius-old: 7px; */ }'), '--radius-');
    expect(scale.values).toEqual([4]);
  });

  it('separates "off the ramp" from "not a px length at all"', () => {
    expect(onScale('4px', [0, 4])).toEqual({ on: true, value: 4 });
    expect(onScale('7px', [0, 4])).toEqual({ on: false, value: 7 });
    expect(onScale('50%', [0, 4])).toEqual({ skip: 'percentage' });
    expect(onScale('normal', [0, 4])).toEqual({ skip: 'not-a-px-length' });
    expect(onScale('', [0, 4])).toEqual({ skip: 'empty' });
    expect(onScale('0', [0, 4])).toEqual({ on: true, value: 0 });
  });
});

describe('CHR-004 the gate', () => {
  it('needs an allowed set — it will not run without one', () => {
    expect(() => auditElements([], {} as never)).toThrow(/would pass everything/);
  });

  it('THE PERSON SENTENCE: a hover fill moved one token step, contrast intact, stays green', () => {
    // `LauncherButton.module.scss` used to carry a comment naming the test that reddened if this
    // fill moved to `bg-4`. bg-3 → bg-4 is exactly that move, and the ink still clears 4.5:1.
    const bg3 = '#2d2b35';
    const bg4 = '#383641';
    const before = auditElements([record({ id: 'button.LauncherButton:hover', fill: bg3, ownText: 'Open', textColor: '#e8ecf1' })], { scales: SCALES });
    const after = auditElements([record({ id: 'button.LauncherButton:hover', fill: bg4, ownText: 'Open', textColor: '#e8ecf1' })], { scales: SCALES });

    expect(before.findings).toEqual([]);
    expect(after.findings).toEqual([]);
    // …and both were actually graded. A green from a gate that measured nothing is not a green.
    expect(before.population.graded['text-contrast']).toBe(1);
    expect(after.population.graded['text-contrast']).toBe(1);
  });

  it('…and reddens, naming the element, when that same fill drops the ink below the ruling', () => {
    const { findings } = auditElements(
      [record({ id: 'button.LauncherButton:hover', fill: '#6b7682', ownText: 'Open', textColor: '#7c8894' })],
      { scales: SCALES }
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('text-contrast');
    expect(findings[0].element).toBe('button.LauncherButton:hover');
    expect(findings[0].threshold).toBe(`${NAT_001.text}:1`);
    // The failure says which two colours it graded, in the theme it graded them in.
    expect(findings[0].detail).toMatch(/^#[0-9a-f]{6} on #[0-9a-f]{6}$/);
  });

  it('reddens on a 9px label and on a 7px radius, naming the value and the ramp', () => {
    const { findings } = auditElements(
      [record({ id: 'span.LauncherCard__meta', fontSize: '9px', radius: '7px' })],
      { scales: SCALES }
    );

    const rules = findings.map((f: { rule: string }) => f.rule).sort();
    expect(rules).toEqual(['font-size-off-scale', 'radius-off-scale']);
    expect(findings.find((f: { rule: string }) => f.rule === 'font-size-off-scale').value).toBe('9px');
    expect(findings.find((f: { rule: string }) => f.rule === 'font-size-off-scale').allowed).toContain('11px');
    expect(findings.every((f: { element: string }) => f.element === 'span.LauncherCard__meta')).toBe(true);
  });

  it('catches Chromium’s unstyled-button 13.333px, which a whole-number check would pass', () => {
    const { findings } = auditElements([record({ fontSize: '13.3333px' })], { scales: SCALES });
    expect(findings.map((f: { rule: string }) => f.rule)).toEqual(['font-size-off-scale']);
  });

  it('grades a control edge against the ground AROUND it, not the fill inside it', () => {
    const dim = auditElements(
      [record({ id: 'input.Field', role: 'control', fill: '#141318', grounds: ['#232129'], edgeColor: '#2d2b35', edgeWidth: 1, edgeStyle: 'solid' })],
      { scales: SCALES }
    );
    expect(dim.findings.map((f: { rule: string }) => f.rule)).toEqual(['control-edge-contrast']);
    expect(dim.findings[0].threshold).toBe(`${NAT_001.controlEdge}:1`);

    const clear = auditElements(
      [record({ id: 'input.Field', role: 'control', fill: '#141318', grounds: ['#232129'], edgeColor: '#a9b4c0', edgeWidth: 1, edgeStyle: 'solid' })],
      { scales: SCALES }
    );
    expect(clear.findings).toEqual([]);
    expect(clear.population.graded['control-edge']).toBe(1);
  });

  it('does not grade a TRANSPARENT edge — it paints nothing, so it scores its own ground', () => {
    // 🔴 The first live drive reported seven failing buttons at exactly 1.000:1. `border: 1px solid
    // transparent` is how a control reserves the space its focus ring will need; composited onto
    // the ground it IS the ground, and a ratio of a colour against itself is 1.
    const { findings, population } = auditElements(
      [
        record({
          id: 'button.LauncherButton.is-ghost',
          role: 'control',
          grounds: ['#161c24'],
          edgeColor: 'rgba(0, 0, 0, 0)',
          edgeWidth: 1,
          edgeStyle: 'solid'
        })
      ],
      { scales: SCALES }
    );
    expect(findings).toEqual([]);
    expect(population.skipped['edge:transparent']).toBe(1);
    expect(population.graded['control-edge']).toBeUndefined();
  });

  it('leaves a control with no edge alone, and does not count it as graded', () => {
    // A control may be defined by its fill. "No border" is not this rule's business — but it must
    // not read as a pass either, or the gate reports coverage it does not have.
    const { findings, population } = auditElements(
      [record({ id: 'button.Chip', role: 'control', edgeColor: '#000000', edgeWidth: 0, edgeStyle: 'none' })],
      { scales: SCALES }
    );
    expect(findings).toEqual([]);
    expect(population.graded['control-edge']).toBeUndefined();
  });

  it('REFUSES a pair whose ground it cannot name, and says so in the population', () => {
    const { findings, population } = auditElements(
      [record({ id: 'div.Overlay', fill: 'rgba(0, 0, 0, 0.4)', grounds: [], ownText: 'Loading', textColor: '#ffffff' })],
      { scales: SCALES }
    );
    expect(findings).toEqual([]);
    expect(population.skipped['text:ground-unknown']).toBe(1);
    expect(population.graded['text-contrast']).toBeUndefined();
  });

  it('skips an element the user cannot reach, whole', () => {
    // 🔴 `BaseDialog` renders every dialog twice; the invisible copy computes the same colours as
    // the visible one. A finding about it is a finding about nothing.
    const { findings, population } = auditElements(
      [record({ id: 'div.BaseDialog--measuring', reachable: false, fontSize: '9px', ownText: 'x', textColor: '#111111', fill: '#101010' })],
      { scales: SCALES }
    );
    expect(findings).toEqual([]);
    expect(population.skipped['not-reachable']).toBe(1);
    expect(population.graded).toEqual({});
  });

  it('sees a SUB-PIXEL cut, which scrollWidth cannot', () => {
    // Live: `Background Position` measured 116.2px of text in a 116px box; `clientWidth` and
    // `scrollWidth` both read 116, so `scrollWidth > clientWidth` was false while Chromium drew
    // the ellipsis. Both labels had been cut for the whole task.
    const cut = auditElements(
      [record({ id: 'label "Background Position"', ownText: 'Background Position', textColor: '#c4cedb', textWidth: 116.2, boxWidth: 116 })],
      { scales: SCALES }
    );
    expect(cut.findings.map((f: { rule: string }) => f.rule)).toEqual(['text-cut']);
    expect(cut.findings[0].value).toBe('116.2px of text in a 116.0px box');

    const fits = auditElements(
      [record({ id: 'label "Duration"', ownText: 'Duration', textColor: '#c4cedb', textWidth: 48.4, boxWidth: 116 })],
      { scales: SCALES }
    );
    expect(fits.findings).toEqual([]);
    expect(fits.population.graded.fit).toBe(1);
  });

  it('reports the population beside the verdict, with the scales it used', () => {
    // 🔴 A reading with no population is what let nine slices report "one label edge" from 12 of
    // 71 labels. `summarise` cannot produce a verdict without one.
    const result = auditElements(
      [
        record({ id: 'a', ownText: 'ok', textColor: '#ffffff' }),
        record({ id: 'b', fontSize: '9px' }),
        record({ id: 'c', reachable: false })
      ],
      { scales: SCALES, meta: { surface: 'property-panel', theme: 'dark', width: 312 } }
    );
    const summary = summarise(result);

    expect(summary.ok).toBe(false);
    expect(summary.byRule).toEqual({ 'font-size-off-scale': 1 });
    expect(summary.elements).toBe(3);
    expect(summary.skipped).toBe(1);
    expect(summary.line).toContain('on 3 element(s)');
    expect(result.population.meta).toEqual({ surface: 'property-panel', theme: 'dark', width: 312 });
    expect(result.population.scales.fontSizes).toEqual(SCALES.fontSizes);
  });
});
