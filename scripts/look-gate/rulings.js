/**
 * CHR-004 — the look gate's ruled exceptions, as data.
 *
 * ## Why this file exists, and the line it must not cross
 *
 * 🔴 **`audit.js` says: do not relax a number to turn a red green.** That rule is about the
 * session doing the work. It is not about the person who owns the look: when Richard looks at a
 * finding and rules the thing he sees CORRECT, the gate has done its job and the answer is a
 * recorded exception — not a lowered threshold. `NAT_001.controlEdge` is still 3. Nothing here can
 * change a threshold, and nothing here can except a rule wholesale.
 *
 * Without this file the alternative was worse in both directions: a hand-run check that reports 82
 * findings every session is a check nobody reads, and the next session to read them would "fix"
 * exactly what was declined — at full price, twice.
 *
 * ## What makes an exception honest
 *
 * 1. **It matches the MEASUREMENT, not the element.** A ruling names the two colours a person
 *    looked at (`ink` on `ground`, as the gate's own hex). It cannot be written as "ignore the
 *    fields" or "ignore this class" — those would keep matching after the colour moved, which is
 *    the one case that must red again. Change `border-default`'s value and these stop matching.
 * 2. **It is counted in its own bucket.** A ruled exception is never folded into `graded` as
 *    though it had passed. `result.ruledExceptions` lists every one, with the ruling behind it, and
 *    `population.ruled` counts them per ruling.
 * 3. **An exception that matched nothing is REPORTED.** A stale ruling is a rule quietly switched
 *    off, and it looks exactly like a clean run. `unmatchedRulings` names them.
 * 4. **It carries who ruled it, when, and what they were shown.** A reading with no provenance is
 *    the thing a later session cannot re-derive, so it re-derives the whole question instead.
 * 5. **It can be turned off.** `run.js --no-rulings` reports the raw picture. Any claim about the
 *    surface as a whole should be taken at least once without them.
 *
 * @module scripts/look-gate/rulings
 */

/**
 * @typedef {object} Ruling
 * @property {string} id           Stable slug, quoted in the report.
 * @property {string} rule         The finding rule this excepts — one rule, never a list.
 * @property {string[][]} pairs    `[inkHex, groundHex]` pairs, lower-case, one per theme.
 * @property {string} what         What the person was looking at, in plain words.
 * @property {string} ruledBy      Who ruled it.
 * @property {string} ruledOn      ISO date.
 * @property {string} shown        The artefact they were shown — a later session can re-open it.
 * @property {string} [note]       Anything a later session would otherwise have to re-derive.
 */

/** @type {Ruling[]} */
const RULINGS = [
  {
    id: 'panel-field-edge-stays-quiet',
    rule: 'control-edge-contrast',
    // dark: `border-default` #33323d on the panel ground #232129 → 1.260:1
    // light: `border-default` #e0e5eb on the panel ground #ffffff → 1.267:1
    pairs: [
      ['#33323d', '#232129'],
      ['#e0e5eb', '#ffffff']
    ],
    what:
      'The property panel\'s fields are separated from the panel by about 1.26:1 in both themes, ' +
      'where NAT-001 ruled a control edge at 3:1. The fields paint `border-default`; the token that ' +
      'meets the ruling, `border-control`, reads 3.719:1 light and 4.512:1 dark on that same ground.',
    ruledBy: 'Richard',
    ruledOn: '2026-09-17',
    shown:
      'dev-docs/tasks/phase-92-dreamweaver-called/verdicts/CHR-004/2026-09-17-head/pair/' +
      'field-edge-{before,after}-{dark,light}.png — the same crop of the Group panel, the only ' +
      'difference being every field edge armed to `border-control`.',
    note:
      'He first ruled "fix it", saw the armed picture and took it back: "no outlines like in the ' +
      'after pic, I don\'t like it". So the quiet edge is the RULED look for panel fields, not an ' +
      'unexamined leftover — CHR-009\'s Group pair was ruled WORTHY with this edge in it. 🔴 Do not ' +
      're-propose `border-control` on panel fields. If a field ever needs a stronger edge, it is a ' +
      'question for him about THAT field, not a compliance fix for all 40.'
  },
  {
    id: 'unset-field-placeholder-stays-greyed',
    rule: 'text-contrast',
    // dark:  `fg-disabled` #7d8a98 on the field fill `bg-2` #2e2c36 → 3.897:1
    // light: `fg-disabled` #7a8691 on the field fill `bg-2` #f2f4f6 → 3.373:1
    pairs: [
      ['#7d8a98', '#2e2c36'],
      ['#7a8691', '#f2f4f6']
    ],
    what:
      'The word an unset field shows in place of a value — `None` in `IconInput`, the greyed tone ' +
      '\u00a716 gave every placeholder — reads 3.897:1 dark and 3.373:1 light where NAT-001 asks ' +
      '4.5:1 of text. It is not a value a person reads; it is the field saying it is empty, and it ' +
      'is deliberately quieter than the values around it.',
    ruledBy: 'Richard',
    ruledOn: '2026-09-18',
    shown:
      'https://claude.ai/artifact/UgyGxHTS9A1vp9ozw7E4cz — the `Icon Source` row photographed in ' +
      'both themes, beside the numbers; also ' +
      'dev-docs/tasks/phase-92-dreamweaver-called/verdicts/CHR-010/2026-09-18-surfaces/' +
      'iconinput-none-placeholder-{dark,light}.png',
    note:
      'Asked as a straight choice — darken it to the AA token, or rule it as placeholder text. He ' +
      'ruled placeholder text. \ud83d\udd34 This excepts the PLACEHOLDER tone only: it matches ' +
      '`fg-disabled` on the field fill, so a real value drawn in this tone, or this tone moving, ' +
      'reds again. CHR-009 \u00a724 was the finding that owed this ruling.'
  }
];

const norm = (value) => String(value || '').trim().toLowerCase();

/**
 * The ruling that excepts a finding, or `null`.
 *
 * 🔴 Matches on the finding's measured `ink`/`ground`, which `audit.js` puts on every contrast
 * finding. **A finding with no measured pair can never be excepted**, which is what stops one
 * ruling deleting a whole rule (`font-size-off-scale` and `text-cut` carry no pair at all).
 *
 * ⚠️ That property is held by the pair comparison below — `norm(undefined)` is `''` and every pair
 * is six hex digits — and NOT by a guard here. An explicit `!finding.ink || !finding.ground` guard
 * was written first and no mutant of it could be made red, because it was unreachable: the
 * comparison already refuses. It was deleted rather than left as an ungraded branch. The invariant
 * it was defending is instead pinned where it can be broken — `rulings.test.ts` asserts every pair
 * in the table matches `/^#[0-9a-f]{6}$/`, so a pair can never be the empty string this would
 * otherwise have to guard against.
 *
 * @param {{rule: string, ink?: string, ground?: string}} finding
 * @param {Ruling[]} [rulings]
 */
function rulingFor(finding, rulings) {
  if (!finding) return null;
  for (const ruling of rulings || RULINGS) {
    if (ruling.rule !== finding.rule) continue;
    for (const pair of ruling.pairs) {
      if (norm(pair[0]) === norm(finding.ink) && norm(pair[1]) === norm(finding.ground)) return ruling;
    }
  }
  return null;
}

/**
 * Split findings into the ones that stand and the ones a person has ruled on.
 *
 * Returns the ruled ones AND the rulings that matched nothing, because a ruling nobody matched is
 * indistinguishable from a clean surface unless it is named.
 *
 * @param {object[]} findings
 * @param {Ruling[]} [rulings]
 */
function applyRulings(findings, rulings) {
  const active = rulings || RULINGS;
  const standing = [];
  const ruledExceptions = [];
  const matched = new Set();

  for (const finding of findings) {
    const ruling = rulingFor(finding, active);
    if (!ruling) {
      standing.push(finding);
      continue;
    }
    matched.add(ruling.id);
    ruledExceptions.push(Object.assign({}, finding, { ruledBy: ruling.id }));
  }

  return {
    findings: standing,
    ruledExceptions,
    ruled: ruledExceptions.reduce((acc, entry) => {
      acc[entry.ruledBy] = (acc[entry.ruledBy] || 0) + 1;
      return acc;
    }, {}),
    unmatchedRulings: active.filter((ruling) => !matched.has(ruling.id)).map((ruling) => ruling.id)
  };
}

module.exports = { RULINGS, rulingFor, applyRulings };
