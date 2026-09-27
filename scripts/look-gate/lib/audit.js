/**
 * CHR-004 — the look gate's judgement, as a pure function of collected element records.
 *
 * ## The person sentence this serves
 *
 * *A session that moves a hover fill one token step, keeping the contrast Richard ruled, gets a
 * green suite — and a session that ships a 9px label or a 2.5:1 control gets a red one that names
 * the element.*
 *
 * Twenty-eight specs under `tests-unit/` open stylesheets as text and assert which token a fill
 * uses. They stop a regression and they also stop a redesign, because a token name is not what a
 * person sees. Nothing here knows a token name: every rule is about the number that reaches the
 * screen, and every finding carries the element it is about.
 *
 * ## Pure on purpose
 *
 * The DOM half is `collect.js`, which runs inside the renderer and produces the records this
 * takes. Splitting them is what lets the judgement be graded in a plain-Node runner with
 * hand-written records — including the cases a drive cannot stage on demand (a ground that never
 * resolves, a sub-pixel cut, a control nobody can reach).
 *
 * ## Refusals are counted, not hidden
 *
 * `population` is part of the result, not a debug aid. Nine slices of CHR-009 reported "one label
 * edge" from a census that silently measured 12 of 71 labels, because the other 59 were inside
 * collapsed sections. A reading without the size of the set it came from is not a measurement, so
 * every caller that reports a verdict must report `population` beside it.
 */
const { parseColorAlpha, flattenGround, contrastRatio, toHex } = require('./color');
const { onScale } = require('./scale');
const { applyRulings } = require('../rulings');

/**
 * NAT-001's ruling (phase 72), which this gate enforces and does not restate in its own words.
 *
 * 🔴 Do not relax a number to turn a red green. If the gate reddens on a control that shipped,
 * that control was below the ruling all along: fix it, or file it with an owner.
 */
const NAT_001 = Object.freeze({
  /** Text against the ground it is painted on. */
  text: 4.5,
  /** A control's edge against the ground around it. */
  controlEdge: 3
});

const FIT_EPSILON = 0.05;

/**
 * @typedef {object} ElementRecord
 * @property {string} id              A human name for the element — what a failure has to say.
 * @property {string} [role]          `'control'` arms the edge rule; anything else does not.
 * @property {boolean} [reachable]    `false` skips every rule. See the trap below.
 * @property {string} [fill]          The element's own `background-color`, computed.
 * @property {string[]} [grounds]     Ancestor `background-color`s, nearest first.
 * @property {string} [fontSize]      Computed `font-size`.
 * @property {string} [radius]        Computed `border-top-left-radius`.
 * @property {string} [textColor]     Computed `color`, when the element carries its own text.
 * @property {string} [ownText]       The text, when it has some of its own.
 * @property {number} [textWidth]     `canvas.measureText` in the element's computed font.
 * @property {number} [boxWidth]      The content box the text has to fit in.
 * @property {string} [edgeColor]     Computed `border-top-color`.
 * @property {number} [edgeWidth]     Computed `border-top-width`, in px.
 * @property {string} [edgeStyle]     Computed `border-top-style`.
 */

function skip(population, reason) {
  population.skipped[reason] = (population.skipped[reason] || 0) + 1;
}

function count(population, rule) {
  population.graded[rule] = (population.graded[rule] || 0) + 1;
}

/**
 * Grade a collected surface.
 *
 * @param {ElementRecord[]} records
 * @param {{ scales: {fontSizes: number[], radii: number[]}, meta?: object,
 *          rulings?: import('../rulings').Ruling[] }} options
 *   `rulings` are the exceptions a person has ruled on (`../rulings.js`). Pass `[]` for the raw
 *   picture. 🔴 They move a finding into `ruledExceptions`; they never change a threshold, and a
 *   finding with no measured `ink`/`ground` pair can never be excepted.
 */
function auditElements(records, options) {
  const scales = options && options.scales;
  if (!scales || !scales.fontSizes || !scales.radii) {
    throw new Error('auditElements needs the scales; a gate with no allowed set would pass everything');
  }

  const findings = [];
  const population = {
    elements: records.length,
    graded: {},
    skipped: {},
    scales: { fontSizes: scales.fontSizes, radii: scales.radii },
    meta: (options && options.meta) || {}
  };

  const fail = (rule, record, detail) => findings.push(Object.assign({ rule, element: record.id }, detail));

  for (const record of records) {
    // 🔴 A number about a control nobody can reach is a number about nothing. `BaseDialog` renders
    // every dialog twice, and the invisible copy computes exactly the colours the visible one does.
    if (record.reachable === false) {
      skip(population, 'not-reachable');
      continue;
    }

    // -- the scales ----------------------------------------------------------
    if (record.fontSize !== undefined) {
      const verdict = onScale(record.fontSize, scales.fontSizes);
      if (verdict.skip) skip(population, `font-size:${verdict.skip}`);
      else {
        count(population, 'font-size');
        if (!verdict.on) {
          fail('font-size-off-scale', record, {
            value: `${verdict.value}px`,
            allowed: scales.fontSizes.map((step) => `${step}px`).join(', ')
          });
        }
      }
    }

    if (record.radius !== undefined) {
      const verdict = onScale(record.radius, scales.radii);
      if (verdict.skip) skip(population, `radius:${verdict.skip}`);
      else {
        count(population, 'radius');
        if (!verdict.on) {
          fail('radius-off-scale', record, {
            value: `${verdict.value}px`,
            allowed: scales.radii.map((step) => `${step}px`).join(', ')
          });
        }
      }
    }

    // -- does the text fit ---------------------------------------------------
    //
    // 🔴 `scrollWidth`, `clientWidth` and a `Range` are all integers and none of them can see an
    // overflow under 1px: a 116.2px label in a 116px box reads 116 = 116 while Chromium draws the
    // ellipsis. Two of the panel's labels were cut for the whole of CHR-009 because of it. The
    // collector measures the text with `canvas.measureText` in the element's own computed font,
    // and this compares the two floats.
    if (typeof record.textWidth === 'number' && typeof record.boxWidth === 'number') {
      count(population, 'fit');
      if (record.textWidth > record.boxWidth + FIT_EPSILON) {
        fail('text-cut', record, {
          value: `${record.textWidth.toFixed(1)}px of text in a ${record.boxWidth.toFixed(1)}px box`,
          text: record.ownText
        });
      }
    }

    // -- the ground everything else is measured against ----------------------
    const behind = record.grounds || [];
    const groundBehind = flattenGround(behind);
    const groundUnder = flattenGround([record.fill].concat(behind).filter((entry) => entry != null));

    // -- text contrast -------------------------------------------------------
    if (record.ownText && record.textColor) {
      const ink = parseColorAlpha(record.textColor);
      if (!ink) skip(population, 'text:unparseable-colour');
      // A gradient or an image under the text is a ground this gate cannot read, and compositing
      // over the colour BEHIND it grades a colour nothing is painted on — the launcher's
      // gradient-and-initial placeholder was reported at 1.08:1 that way. Refused, and counted.
      else if (record.groundUnreadable) skip(population, 'text:ground-is-an-image');
      else if (!groundUnder) skip(population, 'text:ground-unknown');
      else {
        count(population, 'text-contrast');
        const flattened = ink[3] === 1 ? [ink[0], ink[1], ink[2]] : compositeInk(ink, groundUnder);
        const ratio = contrastRatio(flattened, groundUnder);
        if (ratio < NAT_001.text) {
          fail('text-contrast', record, {
            value: `${ratio.toFixed(3)}:1`,
            threshold: `${NAT_001.text}:1`,
            // `ink`/`ground` are the measurement, structured. `detail` is the same two values for a
            // person to read; a ruled exception matches on THESE, never on the display string.
            ink: toHex(flattened),
            ground: toHex(groundUnder),
            detail: `${toHex(flattened)} on ${toHex(groundUnder)}`,
            text: record.ownText
          });
        }
      }
    }

    // -- control edges -------------------------------------------------------
    //
    // The edge is what tells a person where a control starts, so it is graded against the ground
    // AROUND the control, not the fill inside it. A zero-width or `none` edge is not a failure —
    // a control may be defined by its fill — it is simply not this rule's business.
    if (record.role === 'control' && record.edgeWidth > 0 && record.edgeStyle && record.edgeStyle !== 'none') {
      const edge = parseColorAlpha(record.edgeColor);
      if (!edge) skip(population, 'edge:unparseable-colour');
      // 🔴 `border: 1px solid transparent` is a common way to reserve the space a focus ring will
      // need. It paints NOTHING, so compositing it onto its ground yields the ground and scores
      // 1.00:1 — which the first drive reported as seven failing buttons. A transparent edge is
      // not a failing edge; it is not an edge.
      else if (edge[3] === 0) skip(population, 'edge:transparent');
      // Same refusal as the text rule: an edge drawn over a gradient is measured against a ground
      // this gate cannot read.
      else if (record.groundUnreadable) skip(population, 'edge:ground-is-an-image');
      else if (!groundBehind) skip(population, 'edge:ground-unknown');
      else {
        count(population, 'control-edge');
        const flattened = edge[3] === 1 ? [edge[0], edge[1], edge[2]] : compositeInk(edge, groundBehind);
        const ratio = contrastRatio(flattened, groundBehind);
        if (ratio < NAT_001.controlEdge) {
          fail('control-edge-contrast', record, {
            value: `${ratio.toFixed(3)}:1`,
            threshold: `${NAT_001.controlEdge}:1`,
            ink: toHex(flattened),
            ground: toHex(groundBehind),
            detail: `${toHex(flattened)} on ${toHex(groundBehind)}`
          });
        }
      }
    }
  }

  // -- the exceptions a person has ruled on ----------------------------------
  //
  // Applied LAST, over findings the rules produced without knowing anything about them, so the
  // measurement in the task file is always the unruled one. `population.ruled` keeps the count
  // visible: a ruled exception is not a reading that passed.
  const ruled = applyRulings(findings, options && options.rulings);
  population.ruled = ruled.ruled;
  population.unmatchedRulings = ruled.unmatchedRulings;

  return {
    findings: ruled.findings,
    ruledExceptions: ruled.ruledExceptions,
    population
  };
}

/** A translucent ink over a known ground is the colour a person actually sees. */
function compositeInk(ink, ground) {
  return [0, 1, 2].map((i) => Math.round(ink[i] * ink[3] + ground[i] * (1 - ink[3])));
}

/**
 * The one-line verdict, with its population beside it.
 *
 * Deliberately not `findings.length === 0`: a caller that printed only the count would be the
 * instrument this task exists to replace.
 */
function summarise(result) {
  const { findings, population } = result;
  const graded = Object.values(population.graded).reduce((sum, n) => sum + n, 0);
  const skipped = Object.values(population.skipped).reduce((sum, n) => sum + n, 0);
  const ruled = Object.values(population.ruled || {}).reduce((sum, n) => sum + n, 0);
  const byRule = {};
  for (const finding of findings) byRule[finding.rule] = (byRule[finding.rule] || 0) + 1;

  return {
    ok: findings.length === 0,
    findings: findings.length,
    byRule,
    graded,
    skipped,
    ruled,
    elements: population.elements,
    line:
      `${findings.length} finding(s) over ${graded} graded reading(s) on ${population.elements} element(s)` +
      `; ${skipped} refused` +
      // 🔴 Always on the verdict line when non-zero. An exception nobody can see on the one line
      // they read is an exception that has quietly become the rule.
      (ruled ? `; ${ruled} ruled exception(s)` : '')
  };
}

module.exports = { auditElements, summarise, NAT_001, FIT_EPSILON };
