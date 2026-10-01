/**
 * The ease curves — read from `packages/noodl-viewer-react/src/easecurves.ts` on 2026-10-01
 * (NSP-013), for Animate To Value. From :1 on, the viewer's file verbatim except the default
 * export, which is a named one here (`EaseCurves`).
 *
 * THE RULE (:1-6): a curve maps `t` in [0, 1] onto `start`..`end` with the endpoints baked in;
 * `easeIn` / `easeOut` / `easeInOut` are the cubic ones (:86-88). A name not in the set looks up
 * `undefined` — the object is indexed by whatever string a project's enum port carries (:28-33).
 */

/**
 * Interpolation curves, all of the same shape: map `t` in [0,1] onto the range
 * `start`..`end`. They are not normalised easing functions returning [0,1] — the
 * start/end interpolation is baked in, which is why callers pass the endpoints
 * rather than multiplying afterwards.
 */
export type EaseCurve = (start: number, end: number, t: number) => number;

/**
 * The curve names a project can name. `easeIn`/`easeOut`/`easeInOut` are the
 * defaults, aliased onto the cubic variants below.
 */
export type EaseCurveName =
  | 'easeOutQuartic'
  | 'easeInQuartic'
  | 'easeInOutQuartic'
  | 'easeOutCubic'
  | 'easeInCubic'
  | 'easeInOutCubic'
  | 'easeOutQuadratic'
  | 'easeInQuadratic'
  | 'easeInOutQuadratic'
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut';

/**
 * Indexed as well as named: `animation`, `transition` and `numberblend` look
 * curves up by a string coming from a project's enum port, so the index
 * signature is honest about how this object is really used.
 */
export type EaseCurveSet = Record<EaseCurveName, EaseCurve> & Record<string, EaseCurve>;

export const EaseCurves = {
  easeOutQuartic: function (start: number, end: number, t: number): number {
    t--;
    return -(end - start) * (t * t * t * t - 1.0) + start;
  },
  easeInQuartic: function (start: number, end: number, t: number): number {
    return (end - start) * (t * t * t * t) + start;
  },
  easeInOutQuartic: function (start: number, end: number, t: number): number {
    t *= 2.0;
    if (t < 1.0) {
      return ((end - start) / 2.0) * t * t * t * t + start;
    }
    t -= 2.0;
    return (-(end - start) / 2.0) * (t * t * t * t - 2.0) + start;
  },
  easeOutCubic: function (start: number, end: number, t: number): number {
    t--;
    return (end - start) * (t * t * t + 1.0) + start;
  },
  easeInCubic: function (start: number, end: number, t: number): number {
    return (end - start) * (t * t * t) + start;
  },
  easeInOutCubic: function (start: number, end: number, t: number): number {
    t *= 2.0;
    if (t < 1.0) {
      return ((end - start) / 2.0) * t * t * t + start;
    }
    t -= 2.0;
    return ((end - start) / 2.0) * (t * t * t + 2.0) + start;
  },
  easeOutQuadratic: function (start: number, end: number, t: number): number {
    return -(end - start) * t * (t - 2.0) + start;
  },
  easeInQuadratic: function (start: number, end: number, t: number): number {
    return (end - start) * (t * t) + start;
  },
  easeInOutQuadratic: function (start: number, end: number, t: number): number {
    t *= 2.0;
    if (t < 1.0) {
      return ((end - start) / 2.0) * t * t + start;
    }
    t -= 1.0;
    return (-(end - start) / 2.0) * (t * (t - 2) - 1.0) + start;
  },
  linear: function (start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }
} as EaseCurveSet;

//default interpolation curves
EaseCurves.easeIn = EaseCurves.easeInCubic;
EaseCurves.easeOut = EaseCurves.easeOutCubic;
EaseCurves.easeInOut = EaseCurves.easeInOutCubic;
