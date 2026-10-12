/**
 * `bezier-easing` 1.1.1 (`node_modules/bezier-easing/index.js`, the version
 * `noodl-viewer-react` depends on, `^1.1.1`) — verbatim in behaviour, typed. The States node builds
 * one per animated value from its transition's `curve` (states.ts :811) and reads it at
 * `(ms − delay) / dur` (:237). Copied, as ease-curves.ts is, because a target owes the same NUMBERS:
 * the sample table is a `Float32Array` (single precision), four Newton steps, a ten-step bisection.
 *
 * BezierEasing — use bezier curve for transition easing function, by Gaëtan Renaudeau 2014 – 2015,
 * MIT License. Based on Firefox's nsSMILKeySpline.cpp.
 *
 * THE RULE for a curve it is handed (:63-79 of the library): exactly four entries, each a finite
 * `number` (not a numeric string), x1 and x2 within [0, 1] — anything else THROWS. States builds
 * the curve inside its frame-end callback, so a curve the library refuses throws there (NSP-013 §6
 * row C21).
 */

const NEWTON_ITERATIONS = 4;
const NEWTON_MIN_SLOPE = 0.001;
const SUBDIVISION_PRECISION = 0.0000001;
const SUBDIVISION_MAX_ITERATIONS = 10;

const kSplineTableSize = 11;
const kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

function A(aA1: number, aA2: number) {
  return 1.0 - 3.0 * aA2 + 3.0 * aA1;
}
function B(aA1: number, aA2: number) {
  return 3.0 * aA2 - 6.0 * aA1;
}
function C(aA1: number) {
  return 3.0 * aA1;
}
function calcBezier(aT: number, aA1: number, aA2: number) {
  return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT;
}
function getSlope(aT: number, aA1: number, aA2: number) {
  return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1);
}
function binarySubdivide(aX: number, aA: number, aB: number, mX1: number, mX2: number) {
  let currentX: number,
    currentT: number,
    i = 0;
  do {
    currentT = aA + (aB - aA) / 2.0;
    currentX = calcBezier(currentT, mX1, mX2) - aX;
    if (currentX > 0.0) aB = currentT;
    else aA = currentT;
  } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
  return currentT;
}
function newtonRaphsonIterate(aX: number, aGuessT: number, mX1: number, mX2: number) {
  for (let i = 0; i < NEWTON_ITERATIONS; ++i) {
    const currentSlope = getSlope(aGuessT, mX1, mX2);
    if (currentSlope === 0.0) return aGuessT;
    const currentX = calcBezier(aGuessT, mX1, mX2) - aX;
    aGuessT -= currentX / currentSlope;
  }
  return aGuessT;
}

/** Whether the library would accept `points` (:66-79) — the spec asks before it builds, where the runtime throws. */
export function bezierAccepts(points: unknown): boolean {
  if (!points || (points as { length?: unknown }).length !== 4) return false;
  const p = points as unknown[];
  for (let i = 0; i < 4; ++i) {
    if (typeof p[i] !== 'number' || isNaN(p[i] as number) || !isFinite(p[i] as number)) return false;
  }
  const n = p as number[];
  return !(n[0] < 0 || n[0] > 1 || n[2] < 0 || n[2] > 1);
}

/** `BezierEasing(points).get` — `points` must be accepted (`bezierAccepts`). */
export function bezierEasing(points: readonly number[]): (x: number) => number {
  const [mX1, mY1, mX2, mY2] = points;
  const samples = new Float32Array(kSplineTableSize);
  let precomputed = false;
  const getTForX = (aX: number) => {
    let intervalStart = 0.0;
    let currentSample = 1;
    const lastSample = kSplineTableSize - 1;
    for (; currentSample !== lastSample && samples[currentSample] <= aX; ++currentSample) intervalStart += kSampleStepSize;
    --currentSample;
    const dist = (aX - samples[currentSample]) / (samples[currentSample + 1] - samples[currentSample]);
    const guessForT = intervalStart + dist * kSampleStepSize;
    const initialSlope = getSlope(guessForT, mX1, mX2);
    if (initialSlope >= NEWTON_MIN_SLOPE) return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
    else if (initialSlope === 0.0) return guessForT;
    return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
  };
  return (x: number) => {
    if (!precomputed) {
      precomputed = true;
      if (mX1 !== mY1 || mX2 !== mY2) for (let i = 0; i < kSplineTableSize; ++i) samples[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
    }
    if (mX1 === mY1 && mX2 === mY2) return x; // linear
    if (x === 0) return 0;
    if (x === 1) return 1;
    return calcBezier(getTForX(x), mY1, mY2);
  };
}
