/**
 * CHR-004 — the ruled exceptions, graded.
 *
 * ## What is at stake in this file
 *
 * `audit.js` carries the instruction *"do not relax a number to turn a red green"*, and a ruled
 * exception is the one legitimate way past it: the person who owns the look looked at the thing the
 * gate named and ruled it correct. That is also the single most dangerous facility in the gate,
 * because an exception written one notch too wide silently deletes a rule — and a deleted rule
 * looks exactly like a clean surface.
 *
 * So these are not tests that the mechanism works. They are tests that it **cannot be widened**:
 *
 *  - an exception matches the MEASUREMENT (two colours), never an element, a class or a rule;
 *  - it cannot except a finding that carries no measurement;
 *  - it cannot leak across rules, across themes, or onto a neighbouring colour;
 *  - a ruled exception is never counted as a reading that passed;
 *  - a ruling that matched nothing is REPORTED, because a stale ruling is a rule switched off.
 *
 * 🔴 The live pair behind the one ruling in the table: with rulings active the property panel reads
 * 0 findings / 7 ruled exceptions per theme and the gate exits 0; with `--no-rulings` it reads 7
 * findings per theme and exits 1, each naming its element. An identical reading across those two
 * arms would have been indistinguishable from a facility that was never wired up.
 */
import * as path from 'path';

const GATE = path.join(__dirname, '../../../../scripts/look-gate');

const { RULINGS, rulingFor, applyRulings } = require(path.join(GATE, 'rulings.js'));
const { auditElements, summarise } = require(path.join(GATE, 'lib/audit.js'));
const { scalesFromDisk } = require(path.join(GATE, 'lib/scale.js'));

const SCALES = scalesFromDisk();

/** The ruling the panel's quiet field edge is excepted by, looked up rather than retyped. */
const PANEL_EDGE = RULINGS.find((r: TSFixme) => r.id === 'panel-field-edge-stays-quiet');

/** A control whose edge is the ruled `border-default` on the ruled panel ground. */
function quietField(overrides: Record<string, unknown> = {}) {
  return Object.assign(
    {
      id: 'input.PropertyPanelBaseInput.Root',
      role: 'control',
      fill: '#2e2c36',
      grounds: ['#232129'],
      edgeColor: '#33323d',
      edgeWidth: 1,
      edgeStyle: 'solid'
    },
    overrides
  );
}

describe('CHR-004 — every ruling in the table is answerable later', () => {
  // A ruling with no provenance is the thing a later session cannot re-derive, so it re-derives the
  // whole question instead — which is exactly what this facility exists to prevent.
  it.each(RULINGS.map((r: TSFixme) => [r.id, r]))('%s says who ruled it, when, and what they saw', (_id, ruling: TSFixme) => {
    expect(typeof ruling.rule).toBe('string');
    expect(ruling.rule.length).toBeGreaterThan(0);
    expect(ruling.ruledBy).toBeTruthy();
    expect(ruling.ruledOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(String(ruling.what).length).toBeGreaterThan(40);
    expect(String(ruling.shown).length).toBeGreaterThan(20);
  });

  it.each(RULINGS.map((r: TSFixme) => [r.id, r]))('%s names concrete colour pairs, not a wildcard', (_id, ruling: TSFixme) => {
    expect(Array.isArray(ruling.pairs)).toBe(true);
    expect(ruling.pairs.length).toBeGreaterThan(0);
    for (const pair of ruling.pairs) {
      // 🔴 Six hex digits each, both sides. An exception can only ever be as wide as two colours:
      // there is deliberately no syntax for "any ground", a class name or a regex, because each of
      // those would keep matching after the colour moved.
      expect(pair).toHaveLength(2);
      expect(pair[0]).toMatch(/^#[0-9a-f]{6}$/);
      expect(pair[1]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('covers both themes — a ruling on a look is a ruling on both', () => {
    // The panel was shown to Richard in dark and in light. A one-pair ruling would have excepted
    // one theme and left the other red, which reads as a half-applied fix.
    expect(PANEL_EDGE.pairs.length).toBe(2);
  });
});

describe('CHR-004 — an exception matches the measurement and nothing else', () => {
  const finding = { rule: 'control-edge-contrast', ink: '#33323d', ground: '#232129' };

  it('excepts the pair a person actually looked at', () => {
    expect(rulingFor(finding)).toBe(PANEL_EDGE);
  });

  it('is case-insensitive about the hex a browser hands back', () => {
    expect(rulingFor({ ...finding, ink: '#33323D', ground: '#232129' })).toBe(PANEL_EDGE);
  });

  it('🔴 does NOT except the same colours under a different rule', () => {
    // The ruling is about a control EDGE. The identical two colours as text on that ground is a
    // different question and nobody has ruled on it.
    expect(rulingFor({ ...finding, rule: 'text-contrast' })).toBeNull();
  });

  it('🔴 does NOT except a neighbouring colour — one token step and it reds again', () => {
    // This is the property that makes the exception safe to keep. `border-default` moving, or a
    // field reaching for a different token, produces a pair nobody ruled on.
    expect(rulingFor({ ...finding, ink: '#33323e' })).toBeNull();
    expect(rulingFor({ ...finding, ink: '#2a2932' })).toBeNull(); // border-subtle
    expect(rulingFor({ ...finding, ground: '#2e2c36' })).toBeNull(); // the field fill, not the panel
  });

  it('🔴 does NOT except the ruled ink on an UNRULED ground', () => {
    // The same edge token against the canvas, a dialog or a launcher card was never shown to him.
    expect(rulingFor({ ...finding, ground: '#101014' })).toBeNull();
  });

  it('🔴 cannot except a finding that carries no measurement', () => {
    // `font-size-off-scale` and `text-cut` have no ink/ground. If a missing pair matched, one
    // ruling would except every finding of its rule — the rule deleted, reported as clean.
    expect(rulingFor({ rule: 'control-edge-contrast' } as TSFixme)).toBeNull();
    expect(rulingFor({ rule: 'control-edge-contrast', ink: '#33323d' } as TSFixme)).toBeNull();
    expect(rulingFor({ rule: 'control-edge-contrast', ground: '#232129' } as TSFixme)).toBeNull();
    expect(rulingFor(undefined as TSFixme)).toBeNull();
  });

  it('honours an explicitly empty table — the raw picture --no-rulings asks for', () => {
    expect(rulingFor(finding, [])).toBeNull();
  });
});

describe('CHR-004 — applyRulings keeps the books', () => {
  const edge = { rule: 'control-edge-contrast', ink: '#33323d', ground: '#232129', element: 'input.A' };
  const other = { rule: 'control-edge-contrast', ink: '#404040', ground: '#232129', element: 'input.B' };
  const size = { rule: 'font-size-off-scale', element: 'span.C' };

  it('moves the ruled ones aside and leaves every other finding standing', () => {
    const split = applyRulings([edge, other, size]);

    expect(split.findings).toEqual([other, size]);
    expect(split.ruledExceptions).toHaveLength(1);
    expect(split.ruledExceptions[0].element).toBe('input.A');
    expect(split.ruledExceptions[0].ruledBy).toBe('panel-field-edge-stays-quiet');
  });

  it('counts the exceptions per ruling, so the number is visible not implied', () => {
    expect(applyRulings([edge, edge, other]).ruled).toEqual({ 'panel-field-edge-stays-quiet': 2 });
  });

  it('🔴 names a ruling that matched NOTHING — a stale ruling is a rule switched off', () => {
    // On a surface the ruling does not apply to this is expected and harmless. On the surface it
    // was written for it means the thing it excepted has moved, and the report must say so rather
    // than read as a clean run.
    expect(applyRulings([]).unmatchedRulings).toContain('panel-field-edge-stays-quiet');
    expect(applyRulings([edge]).unmatchedRulings).not.toContain('panel-field-edge-stays-quiet');
  });

  it('does not mutate the findings it was handed', () => {
    const findings = [{ ...edge }];
    applyRulings(findings);
    expect(findings[0]).not.toHaveProperty('ruledBy');
  });
});

describe('CHR-004 — the ruling reaches auditElements without touching a threshold', () => {
  it('🔴 the SAME record reds without the ruling and is excepted with it', () => {
    // The control pair the live drive took, as a unit test: one record, one varied thing. A facility
    // that reported the same thing in both arms would be one that was never wired up.
    const raw = auditElements([quietField()], { scales: SCALES, rulings: [] });
    const ruled = auditElements([quietField()], { scales: SCALES, rulings: RULINGS });

    expect(raw.findings).toHaveLength(1);
    expect(raw.findings[0].rule).toBe('control-edge-contrast');
    expect(raw.ruledExceptions).toHaveLength(0);

    expect(ruled.findings).toHaveLength(0);
    expect(ruled.ruledExceptions).toHaveLength(1);
    expect(ruled.ruledExceptions[0].value).toBe(raw.findings[0].value);
  });

  it('🔴 a ruled exception is NOT counted as a reading that passed', () => {
    const ruled = auditElements([quietField()], { scales: SCALES, rulings: RULINGS });

    // It was graded — the rule ran and produced a number — and the number is still below the
    // ruling. What changed is who is answerable for it, not whether it complies.
    expect(ruled.population.graded['control-edge']).toBe(1);
    expect(ruled.population.ruled).toEqual({ 'panel-field-edge-stays-quiet': 1 });
    expect(summarise(ruled).ruled).toBe(1);
    expect(summarise(ruled).line).toContain('1 ruled exception(s)');
  });

  it('🔴 a control edge that is NOT the ruled pair still reds, on the same surface', () => {
    // The whole point: the rule is alive. A field reaching for `border-subtle` (1.106:1 on this
    // ground) is a new decision and the gate must name it.
    const worse = auditElements([quietField({ edgeColor: '#2a2932' })], { scales: SCALES, rulings: RULINGS });

    expect(worse.ruledExceptions).toHaveLength(0);
    expect(worse.findings).toHaveLength(1);
    expect(worse.findings[0].element).toBe('input.PropertyPanelBaseInput.Root');
  });

  it('defaults to the real table when no rulings option is passed', () => {
    // `run.js` passes them explicitly, but a caller that forgot must not silently get the raw
    // picture and report it as the gate's verdict.
    const implied = auditElements([quietField()], { scales: SCALES });
    expect(implied.ruledExceptions).toHaveLength(1);
  });

  it('🔴 text and radius findings are untouched by the edge ruling', () => {
    const mixed = auditElements(
      [
        quietField(),
        { id: 'span.Label', role: 'text', ownText: 'None', textColor: '#7d8a98', grounds: ['#2e2c36'] },
        { id: 'div.Odd', role: 'text', grounds: ['#232129'], radius: '7px' }
      ],
      { scales: SCALES, rulings: RULINGS }
    );

    expect(mixed.ruledExceptions).toHaveLength(1);
    expect(mixed.findings.map((f: TSFixme) => f.rule).sort()).toEqual(['radius-off-scale', 'text-contrast']);
  });
});

describe('CHR-004 — every contrast finding carries the pair it was measured from', () => {
  // The structured `ink`/`ground` are what a ruling matches on. Before they existed the only record
  // of the two colours was the display string, and matching on a display string is how an exception
  // survives a change to how the number is printed.
  it('puts ink and ground on a control-edge finding', () => {
    const [finding] = auditElements([quietField()], { scales: SCALES, rulings: [] }).findings;
    expect(finding.ink).toBe('#33323d');
    expect(finding.ground).toBe('#232129');
    expect(finding.detail).toBe('#33323d on #232129');
  });

  it('puts ink and ground on a text finding, composited', () => {
    const [finding] = auditElements(
      [{ id: 'span.Ghost', role: 'text', ownText: 'None', textColor: 'rgba(255,255,255,0.4)', grounds: ['#232129'] }],
      { scales: SCALES, rulings: [] }
    ).findings;

    // A translucent ink is reported as the colour a person sees, which is also the only colour a
    // ruling could honestly be written about.
    expect(finding.ink).toMatch(/^#[0-9a-f]{6}$/);
    expect(finding.ink).not.toBe('#ffffff');
    expect(finding.ground).toBe('#232129');
  });
});
